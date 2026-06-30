import { Router, type Request, type Response, type NextFunction } from 'express';
import { NvrService } from '../services/nvr.service.js';
import { HanwhaService } from '../services/hanwha.service.js';
import { Go2rtcService } from '../services/go2rtc.service.js';
import {
  playbackQuerySchema,
  successResponse,
  errorResponse,
} from '../models/schemas.js';
import { authRequired } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authRequired);

/**
 * Parse a route param as a positive integer. Returns null on NaN / non-integer.
 * `Number('abc')` is NaN, and `NaN < 1 || NaN > max` is always false — so an
 * unparsed param would otherwise slip past range checks and reach go2rtc.
 */
function parsePositiveInt(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// ── Fixed paths first ──────────────────────────────────────
// Express matches in registration order; these literal routes MUST be declared
// before the `/:nvrId/:channel` wildcard or they are shadowed (e.g. `status` and
// `all` would bind to :nvrId/:channel and the handler below would never run).

/**
 * GET /api/streams/status/all
 * Get status of all active go2rtc streams.
 */
router.get('/status/all', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const streams = await Go2rtcService.listStreams();
    const healthy = await Go2rtcService.isHealthy();

    res.json(
      successResponse({
        go2rtcHealthy: healthy,
        activeStreams: Object.keys(streams).length,
        streams,
      }),
    );
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/streams/playback/:nvrId/:channel
 * Get the playback stream URL for recorded video.
 * Query params: date (YYYY-MM-DD), time (HH:MM), duration (seconds, default 300).
 */
router.get(
  '/playback/:nvrId/:channel',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const nvrId = parsePositiveInt(req.params.nvrId);
      const channel = parsePositiveInt(req.params.channel);
      if (nvrId === null || channel === null) {
        res.status(400).json(errorResponse('Invalid nvrId or channel'));
        return;
      }

      const nvr = NvrService.findById(nvrId);
      if (!nvr) {
        res.status(404).json(errorResponse('NVR device not found'));
        return;
      }

      if (channel > nvr.max_channels) {
        res
          .status(400)
          .json(errorResponse(`Channel must be between 1 and ${nvr.max_channels}`));
        return;
      }

      const query = playbackQuerySchema.parse(req.query);
      const time = query.time ?? '00:00';

      // Build the playback RTSP URL
      const playbackRtsp = HanwhaService.buildPlaybackRtspUrl(
        nvr,
        channel,
        query.date,
        time,
        query.duration,
      );

      // Register with go2rtc as a playback stream
      const streamName = Go2rtcService.playbackStreamName(nvrId, channel);
      await Go2rtcService.addStream(streamName, playbackRtsp);

      res.json(
        successResponse({
          streamName,
          webrtc: Go2rtcService.getWebRtcUrl(streamName),
          hls: Go2rtcService.getHlsUrl(streamName),
          mse: Go2rtcService.getMseUrl(streamName),
          date: query.date,
          time,
          duration: query.duration,
        }),
      );
    } catch (err) {
      next(err);
    }
  },
);

// ── Wildcard last ──────────────────────────────────────────

/**
 * GET /api/streams/:nvrId/:channel
 * Get the stream URLs (WebRTC, HLS, MSE) for a live camera feed.
 * Ensures the stream is registered with go2rtc before returning URLs.
 */
router.get('/:nvrId/:channel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const nvrId = parsePositiveInt(req.params.nvrId);
    const channel = parsePositiveInt(req.params.channel);
    if (nvrId === null || channel === null) {
      res.status(400).json(errorResponse('Invalid nvrId or channel'));
      return;
    }

    const nvr = NvrService.findById(nvrId);
    if (!nvr) {
      res.status(404).json(errorResponse('NVR device not found'));
      return;
    }

    if (channel > nvr.max_channels) {
      res.status(400).json(errorResponse(`Channel must be between 1 and ${nvr.max_channels}`));
      return;
    }

    // Ensure the stream is registered with go2rtc
    const streamName = Go2rtcService.streamName(nvrId, channel);
    const rtspUrl = HanwhaService.buildRtspUrl(nvr, channel);
    await Go2rtcService.addStream(streamName, rtspUrl);

    // NOTE: the raw RTSP URL embeds the NVR password and must NOT be returned to
    // clients. The browser plays via the go2rtc WebRTC/HLS/MSE URLs only.
    res.json(
      successResponse({
        streamName,
        webrtc: Go2rtcService.getWebRtcUrl(streamName),
        hls: Go2rtcService.getHlsUrl(streamName),
        mse: Go2rtcService.getMseUrl(streamName),
      }),
    );
  } catch (err) {
    next(err);
  }
});

export default router;
