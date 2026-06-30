import { useEffect, useState } from 'react';
import { useNvrStore } from '../../stores/nvr.store';
import { useStreamStore } from '../../stores/stream.store';
import type { Camera } from '../../types/api';
import { X, Video, ChevronRight, Loader2 } from 'lucide-react';

interface CameraSelectorProps {
  cellIndex: number;
  onClose: () => void;
}

/**
 * Modal overlay to pick an NVR and camera channel to assign to a grid cell.
 */
export function CameraSelector({ cellIndex, onClose }: CameraSelectorProps) {
  const { nvrs, cameras, fetchNvrs, fetchCameras } = useNvrStore();
  const { assignCamera } = useStreamStore();
  const [selectedNvrId, setSelectedNvrId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (nvrs.length === 0) fetchNvrs();
  }, [nvrs.length, fetchNvrs]);

  const handleNvrSelect = async (nvrId: number) => {
    setSelectedNvrId(nvrId);
    if (!cameras.get(nvrId)) {
      setLoading(true);
      await fetchCameras(nvrId);
      setLoading(false);
    }
  };

  const handleCameraSelect = (cam: Camera) => {
    assignCamera(cellIndex, cam.nvr_id, cam.channel, cam.name);
    onClose();
  };

  const nvrCameras = selectedNvrId ? cameras.get(selectedNvrId) ?? [] : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h3 className="text-base font-semibold">
            Assign Camera to Cell {cellIndex + 1}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex min-h-[320px] max-h-[480px]">
          {/* NVR List */}
          <div className="w-1/2 border-r border-[var(--color-border)] overflow-y-auto">
            <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-dim)]">
              NVR Devices
            </div>
            {nvrs.map((nvr) => (
              <button
                key={nvr.id}
                onClick={() => handleNvrSelect(nvr.id)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                  selectedNvrId === nvr.id
                    ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                    : 'hover:bg-[var(--color-surface-raised)]'
                }`}
              >
                <div>
                  <div className="text-sm font-medium">{nvr.name}</div>
                  <div className="text-xs text-[var(--color-text-dim)]">
                    {nvr.ip} ({nvr.max_channels} ch)
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`status-dot status-dot--${nvr.status}`} />
                  <ChevronRight className="w-4 h-4 text-[var(--color-text-dim)]" />
                </div>
              </button>
            ))}
            {nvrs.length === 0 && (
              <p className="px-4 py-8 text-sm text-center text-[var(--color-text-dim)]">
                No NVR devices registered
              </p>
            )}
          </div>

          {/* Camera List */}
          <div className="w-1/2 overflow-y-auto">
            <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-dim)]">
              Cameras
            </div>

            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-[var(--color-accent)]" />
              </div>
            )}

            {!loading && !selectedNvrId && (
              <p className="px-4 py-8 text-xs text-center text-[var(--color-text-dim)]">
                Select an NVR to see cameras
              </p>
            )}

            {!loading &&
              nvrCameras.map((cam) => (
                <button
                  key={cam.id}
                  onClick={() => handleCameraSelect(cam)}
                  disabled={!cam.enabled}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--color-surface-raised)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Video className="w-4 h-4 text-[var(--color-text-dim)] flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{cam.name}</div>
                    <div className="text-xs text-[var(--color-text-dim)]">
                      Ch {cam.channel} - {cam.resolution} {cam.codec}
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
