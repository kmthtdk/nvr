import type { NvrDevice } from '../../types/api';
import {
  Server,
  RefreshCw,
  Trash2,
  Edit2,
} from 'lucide-react';

interface NVRStatusCardProps {
  nvr: NvrDevice;
  cameraCount?: number;
  onEdit: (nvr: NvrDevice) => void;
  onDelete: (nvr: NvrDevice) => void;
  onCheckStatus: (nvr: NvrDevice) => void;
}

const STATUS_LABELS: Record<NvrDevice['status'], string> = {
  online: 'Online',
  offline: 'Offline',
  error: 'Error',
};

export function NVRStatusCard({
  nvr,
  cameraCount,
  onEdit,
  onDelete,
  onCheckStatus,
}: NVRStatusCardProps) {
  return (
    <div className="group relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 hover:border-[var(--color-accent)]/30 transition-all duration-200">
      {/* Status indicator strip */}
      <div
        className={`absolute top-0 left-4 right-4 h-[2px] rounded-b-full ${
          nvr.status === 'online'
            ? 'bg-[var(--color-success)]'
            : nvr.status === 'error'
              ? 'bg-[var(--color-danger)]'
              : 'bg-[var(--color-text-dim)]'
        }`}
      />

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--color-surface-raised)]">
            <Server className="w-5 h-5 text-[var(--color-accent)]" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{nvr.name}</h3>
            <p className="text-xs text-[var(--color-text-dim)]">{nvr.model}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <span className={`status-dot status-dot--${nvr.status}`} />
          <span className="text-xs text-[var(--color-text-muted)]">
            {STATUS_LABELS[nvr.status]}
          </span>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="space-y-0.5">
          <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)]">IP Address</span>
          <p className="text-xs font-mono">{nvr.ip}:{nvr.http_port}</p>
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)]">RTSP Port</span>
          <p className="text-xs font-mono">{nvr.rtsp_port}</p>
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)]">Channels</span>
          <p className="text-xs">
            {cameraCount !== undefined ? `${cameraCount} / ` : ''}
            {nvr.max_channels}
          </p>
        </div>
        <div className="space-y-0.5">
          <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)]">Last Check</span>
          <p className="text-xs">
            {nvr.last_checked_at
              ? new Date(nvr.last_checked_at).toLocaleTimeString()
              : 'Never'}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-[var(--color-border-subtle)]">
        <button
          onClick={() => onCheckStatus(nvr)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] bg-[var(--color-surface-raised)] hover:bg-[var(--color-surface-overlay)] rounded-md transition-colors"
          title="Check connectivity"
        >
          <RefreshCw className="w-3 h-3" />
          Check
        </button>
        <button
          onClick={() => onEdit(nvr)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] bg-[var(--color-surface-raised)] hover:bg-[var(--color-surface-overlay)] rounded-md transition-colors"
          title="Edit device"
        >
          <Edit2 className="w-3 h-3" />
          Edit
        </button>
        <div className="flex-1" />
        <button
          onClick={() => onDelete(nvr)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors"
          title="Delete device"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
