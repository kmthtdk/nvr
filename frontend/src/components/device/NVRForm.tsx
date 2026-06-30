import React, { useState } from 'react';
import type { NvrDevice, CreateNvrInput } from '../../types/api';
import { X, Save, Loader2 } from 'lucide-react';

interface NVRFormProps {
  nvr?: NvrDevice | null;
  onSubmit: (input: CreateNvrInput) => Promise<void>;
  onClose: () => void;
}

export function NVRForm({ nvr, onSubmit, onClose }: NVRFormProps) {
  const [formData, setFormData] = useState<CreateNvrInput>({
    name: nvr?.name ?? '',
    ip: nvr?.ip ?? '',
    http_port: nvr?.http_port ?? 80,
    rtsp_port: nvr?.rtsp_port ?? 554,
    username: '',
    password: '',
    model: nvr?.model ?? 'XRN-1620SB1',
    max_channels: nvr?.max_channels ?? 16,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof CreateNvrInput, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // On edit, omit blank credential fields so the backend keeps the existing
      // ones. Sending '' fails `z.string().min(1)` and returns an opaque 400.
      const payload: CreateNvrInput = { ...formData };
      if (nvr) {
        if (!payload.username) delete (payload as Partial<CreateNvrInput>).username;
        if (!payload.password) delete (payload as Partial<CreateNvrInput>).password;
      }
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h3 className="text-base font-semibold">
            {nvr ? 'Edit NVR Device' : 'Add NVR Device'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="px-3 py-2 text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Name */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">
                Device Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Building A NVR"
                required
                className="w-full px-3 py-2 text-sm bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30 transition-colors"
              />
            </div>

            {/* IP */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">
                IP Address
              </label>
              <input
                type="text"
                value={formData.ip}
                onChange={(e) => handleChange('ip', e.target.value)}
                placeholder="192.168.1.100"
                required
                pattern="^(\d{1,3}\.){3}\d{1,3}$"
                className="w-full px-3 py-2 text-sm font-mono bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30 transition-colors"
              />
            </div>

            {/* Model */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">
                Model
              </label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => handleChange('model', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30 transition-colors"
              />
            </div>

            {/* HTTP Port */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">
                HTTP Port
              </label>
              <input
                type="number"
                value={formData.http_port}
                onChange={(e) => handleChange('http_port', parseInt(e.target.value, 10))}
                min={1}
                max={65535}
                className="w-full px-3 py-2 text-sm font-mono bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30 transition-colors"
              />
            </div>

            {/* RTSP Port */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">
                RTSP Port
              </label>
              <input
                type="number"
                value={formData.rtsp_port}
                onChange={(e) => handleChange('rtsp_port', parseInt(e.target.value, 10))}
                min={1}
                max={65535}
                className="w-full px-3 py-2 text-sm font-mono bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30 transition-colors"
              />
            </div>

            {/* Max Channels */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">
                Max Channels
              </label>
              <input
                type="number"
                value={formData.max_channels}
                onChange={(e) => handleChange('max_channels', parseInt(e.target.value, 10))}
                min={1}
                max={128}
                className="w-full px-3 py-2 text-sm bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30 transition-colors"
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">
                Username
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => handleChange('username', e.target.value)}
                placeholder="admin"
                required={!nvr}
                className="w-full px-3 py-2 text-sm bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30 transition-colors"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder={nvr ? '(unchanged)' : ''}
                required={!nvr}
                className="w-full px-3 py-2 text-sm bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/30 transition-colors"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {nvr ? 'Update' : 'Add Device'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
