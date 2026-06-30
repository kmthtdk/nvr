import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';
import type { StreamUrls, GridLayout, GridCell } from '../types/api';

function gridSize(layout: GridLayout): number {
  const sizes: Record<GridLayout, number> = { '1x1': 1, '2x2': 4, '3x3': 9, '4x4': 16 };
  return sizes[layout];
}

function createEmptyGrid(layout: GridLayout): GridCell[] {
  const size = gridSize(layout);
  return Array.from({ length: size }, (_, i) => ({
    index: i,
    nvrId: null,
    channel: null,
  }));
}

// Smallest grid that fits N cameras (capped at 4x4 = 16).
function layoutForCount(n: number): GridLayout {
  if (n <= 1) return '1x1';
  if (n <= 4) return '2x2';
  if (n <= 9) return '3x3';
  return '4x4';
}

interface StreamState {
  layout: GridLayout;
  grid: GridCell[];
  activeStreams: Map<string, StreamUrls>; // keyed by "nvrId_channel" (NOT persisted)
  selectedNvrId: number | null; // dropdown UI only; grid is the source of truth

  setLayout: (layout: GridLayout) => void;
  assignCamera: (cellIndex: number, nvrId: number, channel: number, cameraName: string) => void;
  removeCamera: (cellIndex: number) => void;
  fetchStream: (nvrId: number, channel: number) => Promise<StreamUrls>;
  selectNvr: (nvrId: number) => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useStreamStore = create<StreamState>()(
  persist(
    (set, get) => ({
      layout: '2x2',
      grid: createEmptyGrid('2x2'),
      activeStreams: new Map(),
      selectedNvrId: null,

      setLayout: (layout) => {
        const oldGrid = get().grid;
        const newGrid = createEmptyGrid(layout);
        // Preserve existing assignments where possible
        for (let i = 0; i < Math.min(oldGrid.length, newGrid.length); i++) {
          newGrid[i] = { ...oldGrid[i], index: i };
        }
        set({ layout, grid: newGrid });
      },

      assignCamera: (cellIndex, nvrId, channel, cameraName) => {
        set((state) => ({
          grid: state.grid.map((cell) =>
            cell.index === cellIndex ? { ...cell, nvrId, channel, cameraName } : cell,
          ),
        }));
        get().fetchStream(nvrId, channel).catch(() => {});
      },

      removeCamera: (cellIndex) => {
        set((state) => ({
          grid: state.grid.map((cell) =>
            cell.index === cellIndex
              ? { ...cell, nvrId: null, channel: null, cameraName: undefined }
              : cell,
          ),
        }));
      },

      fetchStream: async (nvrId, channel) => {
        const key = `${nvrId}_${channel}`;
        const existing = get().activeStreams.get(key);
        if (existing) return existing;

        const urls = await api.getStreamUrls(nvrId, channel);
        const updated = new Map(get().activeStreams);
        updated.set(key, urls);
        set({ activeStreams: updated });
        return urls;
      },

      // Load ALL enabled cameras of an NVR into the grid and go live, in one
      // round-trip (the backend registers every stream and returns the URLs).
      selectNvr: async (nvrId) => {
        const streams = (await api.getNvrStreams(nvrId)).slice(0, 16);
        const layout = layoutForCount(streams.length);
        const grid = createEmptyGrid(layout);
        const activeStreams = new Map(get().activeStreams);

        streams.forEach((s, i) => {
          grid[i] = { index: i, nvrId, channel: s.channel, cameraName: s.name };
          activeStreams.set(`${nvrId}_${s.channel}`, {
            streamName: s.streamName,
            webrtc: s.webrtc,
            hls: s.hls,
            mse: s.mse,
          });
        });

        set({ layout, grid, activeStreams, selectedNvrId: nvrId });
      },

      // Re-establish streams for whatever is in the (persisted) grid — called on
      // mount so a browser refresh reconnects automatically. Stale cells whose
      // NVR/channel no longer exist are cleared instead of breaking the reload.
      hydrate: async () => {
        const assigned = get().grid.filter(
          (c) => c.nvrId !== null && c.channel !== null,
        );
        await Promise.allSettled(
          assigned.map((c) =>
            get()
              .fetchStream(c.nvrId as number, c.channel as number)
              .catch(() => get().removeCamera(c.index)),
          ),
        );
      },
    }),
    {
      name: 'nvr-stream-grid',
      // Allowlist: persist the grid (source of truth) + layout + dropdown label.
      // activeStreams (a Map) is intentionally excluded and rebuilt via hydrate().
      partialize: (s) => ({
        layout: s.layout,
        grid: s.grid,
        selectedNvrId: s.selectedNvrId,
      }),
    },
  ),
);
