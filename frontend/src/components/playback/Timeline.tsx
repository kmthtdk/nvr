import React, { useCallback, useRef, useState } from 'react';

interface TimelineProps {
  /** Currently selected time in minutes from midnight (0-1440) */
  currentTime: number;
  /** Callback when user scrubs to a new time */
  onTimeChange: (minutes: number) => void;
  /** Duration of the playback window in minutes */
  duration?: number;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const TIMELINE_WIDTH_PER_HOUR = 60; // px per hour

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function Timeline({ currentTime, onTimeChange, duration = 5 }: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const totalWidth = 24 * TIMELINE_WIDTH_PER_HOUR;

  const getTimeFromX = useCallback(
    (clientX: number): number => {
      if (!trackRef.current) return 0;
      const rect = trackRef.current.getBoundingClientRect();
      const scrollLeft = trackRef.current.scrollLeft;
      const x = clientX - rect.left + scrollLeft;
      const minutes = Math.round((x / totalWidth) * 1440);
      return Math.max(0, Math.min(1440, minutes));
    },
    [totalWidth],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      const time = getTimeFromX(e.clientX);
      onTimeChange(time);
    },
    [getTimeFromX, onTimeChange],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const time = getTimeFromX(e.clientX);
      setHoverTime(time);

      if (isDragging) {
        onTimeChange(time);
      }
    },
    [isDragging, getTimeFromX, onTimeChange],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    setHoverTime(null);
  }, []);

  const scrubberPosition = (currentTime / 1440) * 100;

  return (
    <div className="space-y-2">
      {/* Time display */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-mono text-[var(--color-text-muted)]">
          {formatTime(currentTime)}
        </span>
        {hoverTime !== null && (
          <span className="text-xs font-mono text-[var(--color-accent)]">
            {formatTime(hoverTime)}
          </span>
        )}
        <span className="text-xs text-[var(--color-text-dim)]">
          Duration: {duration}min
        </span>
      </div>

      {/* Timeline track */}
      <div
        ref={trackRef}
        className="timeline-track overflow-x-auto cursor-crosshair select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        role="slider"
        aria-label="Playback timeline"
        aria-valuemin={0}
        aria-valuemax={1440}
        aria-valuenow={currentTime}
        aria-valuetext={formatTime(currentTime)}
        tabIndex={0}
      >
        <div className="relative h-full" style={{ width: `${totalWidth}px`, minWidth: '100%' }}>
          {/* Hour markers */}
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="absolute top-0 bottom-0 flex flex-col justify-end"
              style={{ left: `${(hour / 24) * 100}%` }}
            >
              <div className="w-px h-3 bg-[var(--color-border)]" />
              <span className="text-[9px] font-mono text-[var(--color-text-dim)] ml-1">
                {String(hour).padStart(2, '0')}
              </span>
            </div>
          ))}

          {/* Scrubber */}
          <div
            className="timeline-scrubber"
            style={{ left: `${scrubberPosition}%` }}
          />

          {/* Hover indicator */}
          {hoverTime !== null && (
            <div
              className="absolute top-0 bottom-0 w-px bg-[var(--color-accent)]/30 pointer-events-none"
              style={{ left: `${(hoverTime / 1440) * 100}%` }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
