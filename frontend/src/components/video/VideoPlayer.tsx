import { memo } from 'react';
import { useWebRTC } from '../../hooks/useWebRTC';
import type { StreamUrls } from '../../types/api';
import {
  MonitorOff,
  RefreshCw,
  Wifi,
  WifiOff,
  Loader2,
  Maximize2,
} from 'lucide-react';

interface VideoPlayerProps {
  streamUrls: StreamUrls | null;
  cameraName?: string;
}

/**
 * Video player component that connects to go2rtc via WebRTC
 * with automatic HLS fallback.
 */
export const VideoPlayer = memo(function VideoPlayer({
  streamUrls,
  cameraName,
}: VideoPlayerProps) {
  const { videoRef, status, error, retry } = useWebRTC({
    webrtcUrl: streamUrls?.webrtc ?? null,
    hlsFallbackUrl: streamUrls?.hls ?? null,
  });

  // Fullscreen this player's own <video> via its ref. Doing it here (instead of
  // the parent indexing into the DOM) is robust to empty grid cells.
  const handleFullscreen = () => {
    videoRef.current?.requestFullscreen?.().catch(() => {});
  };

  if (!streamUrls) {
    return (
      <div className="video-cell flex items-center justify-center h-full bg-black/40">
        <div className="text-center text-[var(--color-text-dim)]">
          <MonitorOff className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-xs">No camera assigned</p>
        </div>
      </div>
    );
  }

  return (
    <div className="video-cell relative group h-full">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-contain bg-black"
      />

      {/* Overlay: camera name + status */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-3 py-1.5 bg-gradient-to-b from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <span className="text-xs font-medium text-white/90 truncate">
          {cameraName ?? streamUrls.streamName}
        </span>
        <div className="flex items-center gap-2">
          {status === 'connected' && <Wifi className="w-3.5 h-3.5 text-green-400" />}
          {status === 'hls-fallback' && (
            <span className="text-[10px] text-yellow-400 font-mono">HLS</span>
          )}
          {status === 'connecting' && (
            <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
          )}
          {status === 'failed' && <WifiOff className="w-3.5 h-3.5 text-red-400" />}
        </div>
      </div>

      {/* Bottom control bar */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-end px-2 py-1.5 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={handleFullscreen}
          className="p-1 text-white/70 hover:text-white transition-colors"
          aria-label="Fullscreen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Error / retry overlay */}
      {status === 'failed' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center">
            <WifiOff className="w-8 h-8 mx-auto mb-2 text-red-400" />
            <p className="text-xs text-red-300 mb-3">{error ?? 'Connection failed'}</p>
            <button
              onClick={retry}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[var(--color-accent)] rounded-md hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
