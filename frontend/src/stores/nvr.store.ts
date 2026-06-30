import { create } from 'zustand';
import { api } from '../lib/api';
import type { NvrDevice, Camera, CreateNvrInput } from '../types/api';

interface NvrState {
  nvrs: NvrDevice[];
  cameras: Map<number, Camera[]>; // keyed by nvrId
  isLoading: boolean;
  error: string | null;

  fetchNvrs: () => Promise<void>;
  fetchCameras: (nvrId: number) => Promise<Camera[]>;
  createNvr: (input: CreateNvrInput) => Promise<NvrDevice>;
  updateNvr: (id: number, input: Partial<CreateNvrInput>) => Promise<void>;
  deleteNvr: (id: number) => Promise<void>;
  syncCameras: (nvrId: number) => Promise<void>;
  checkStatus: (nvrId: number) => Promise<void>;
}

export const useNvrStore = create<NvrState>((set, get) => ({
  nvrs: [],
  cameras: new Map(),
  isLoading: false,
  error: null,

  fetchNvrs: async () => {
    set({ isLoading: true, error: null });
    try {
      const nvrs = await api.listNvrs();
      set({ nvrs, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch NVRs',
      });
    }
  },

  fetchCameras: async (nvrId) => {
    try {
      const cameras = await api.getCameras(nvrId);
      const updated = new Map(get().cameras);
      updated.set(nvrId, cameras);
      set({ cameras: updated });
      return cameras;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to fetch cameras' });
      return [];
    }
  },

  createNvr: async (input) => {
    const nvr = await api.createNvr(input);
    set((state) => ({ nvrs: [...state.nvrs, nvr] }));
    return nvr;
  },

  updateNvr: async (id, input) => {
    const updated = await api.updateNvr(id, input);
    set((state) => ({
      nvrs: state.nvrs.map((n) => (n.id === id ? updated : n)),
    }));
  },

  deleteNvr: async (id) => {
    await api.deleteNvr(id);
    set((state) => ({
      nvrs: state.nvrs.filter((n) => n.id !== id),
    }));
  },

  syncCameras: async (nvrId) => {
    const cameras = await api.syncCameras(nvrId);
    const updated = new Map(get().cameras);
    updated.set(nvrId, cameras);
    set({ cameras: updated });
  },

  checkStatus: async (nvrId) => {
    const result = await api.checkNvrStatus(nvrId);
    set((state) => ({
      nvrs: state.nvrs.map((n) =>
        n.id === nvrId ? { ...n, status: result.status as NvrDevice['status'] } : n,
      ),
    }));
  },
}));
