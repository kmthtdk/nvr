import React, { useCallback, useEffect, useState } from 'react';
import { VideoPlayer } from '../video/VideoPlayer';
import { useStreamStore } from '../../stores/stream.store';
import { useNvrStore } from '../../stores/nvr.store';
import type { GridLayout, StreamUrls } from '../../types/api';
import { Grid2x2, Grid3x3, LayoutGrid, Square, Plus, ChevronDown, Loader2 } from 'lucide-react';

interface CameraGridProps {
  onCellClick?: (cellIndex: number) => void;
}

const LAYOUT_OPTIONS: Array<{ value: GridLayout; label: string; icon: React.ReactNode }> = [
  { value: '1x1', label: '1x1', icon: <Square className="w-4 h-4" /> },
  { value: '2x2', label: '2x2', icon: <Grid2x2 className="w-4 h-4" /> },
  { value: '3x3', label: '3x3', icon: <Grid3x3 className="w-4 h-4" /> },
  { value: '4x4', label: '4x4', icon: <LayoutGrid className="w-4 h-4" /> },
];

function gridCols(layout: GridLayout): string {
  const map: Record<GridLayout, string> = {
    '1x1': 'grid-cols-1',
    '2x2': 'grid-cols-2',
    '3x3': 'grid-cols-3',
    '4x4': 'grid-cols-4',
  };
  return map[layout];
}

export function CameraGrid({ onCellClick }: CameraGridProps) {
  const { layout, grid, setLayout, activeStreams, selectedNvrId, selectNvr, hydrate } =
    useStreamStore();
  const { nvrs, fetchNvrs } = useNvrStore();
  const [isSelecting, setIsSelecting] = useState(false);

  useEffect(() => {
    if (nvrs.length === 0) fetchNvrs();
  }, [nvrs.length, fetchNvrs]);

  // Reconnect streams for the persisted grid on mount → cameras auto-reload
  // after a browser refresh with no manual interaction.
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const handleSelectNvr = useCallback(
    async (id: number) => {
      if (!id) return;
      setIsSelecting(true);
      try {
        await selectNvr(id);
      } finally {
        setIsSelecting(false);
      }
    },
    [selectNvr],
  );

  const getStreamUrls = useCallback(
    (nvrId: number | null, channel: number | null): StreamUrls | null => {
      if (!nvrId || !channel) return null;
      return activeStreams.get(`${nvrId}_${channel}`) ?? null;
    },
    [activeStreams],
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header: NVR selector + layout selector */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)] gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-sm font-semibold text-[var(--color-text-muted)] shrink-0">
            Live View
          </h2>
          <div className="relative">
            <select
              value={selectedNvrId ?? ''}
              onChange={(e) => handleSelectNvr(Number(e.target.value))}
              disabled={isSelecting}
              aria-label="Select NVR to load all its cameras"
              className="appearance-none w-52 max-w-[40vw] pl-3 pr-8 py-1.5 text-xs font-medium bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md focus:outline-none focus:border-[var(--color-accent)] cursor-pointer disabled:opacity-50"
            >
              <option value="">Select NVR — load all cameras…</option>
              {nvrs.map((nvr) => (
                <option key={nvr.id} value={nvr.id}>
                  {nvr.name} ({nvr.max_channels} ch)
                </option>
              ))}
            </select>
            {isSelecting ? (
              <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-[var(--color-accent)] pointer-events-none" />
            ) : (
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-dim)] pointer-events-none" />
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 bg-[var(--color-surface)] rounded-lg p-0.5 shrink-0">
          {LAYOUT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setLayout(opt.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                layout === opt.value
                  ? 'bg-[var(--color-accent)] text-white shadow-sm'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)]'
              }`}
              aria-label={`${opt.label} grid`}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Video grid */}
      <div className={`flex-1 grid ${gridCols(layout)} gap-1 p-1 min-h-0`}>
        {grid.map((cell) => {
          const streamUrls = getStreamUrls(cell.nvrId, cell.channel);
          const hasCamera = cell.nvrId !== null && cell.channel !== null;

          if (!hasCamera) {
            return (
              <button
                key={cell.index}
                onClick={() => onCellClick?.(cell.index)}
                className="video-cell flex items-center justify-center bg-[var(--color-surface)] hover:bg-[var(--color-surface-raised)] transition-colors cursor-pointer"
                aria-label={`Assign camera to cell ${cell.index + 1}`}
              >
                <div className="text-center text-[var(--color-text-dim)]">
                  <Plus className="w-6 h-6 mx-auto mb-1 opacity-30" />
                  <p className="text-[10px]">Click to assign</p>
                </div>
              </button>
            );
          }

          return (
            <VideoPlayer
              key={cell.index}
              streamUrls={streamUrls}
              cameraName={cell.cameraName}
            />
          );
        })}
      </div>
    </div>
  );
}
