import { useEffect, useState } from 'react';
import { useNvrStore } from '../stores/nvr.store';
import { NVRStatusCard } from '../components/device/NVRStatusCard';
import { NVRForm } from '../components/device/NVRForm';
import type { NvrDevice, CreateNvrInput } from '../types/api';
import { Plus, Server, RefreshCw } from 'lucide-react';

export function DeviceManager() {
  const {
    nvrs,
    cameras,
    isLoading,
    error,
    fetchNvrs,
    fetchCameras,
    createNvr,
    updateNvr,
    deleteNvr,
    checkStatus,
  } = useNvrStore();

  const [showForm, setShowForm] = useState(false);
  const [editingNvr, setEditingNvr] = useState<NvrDevice | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<NvrDevice | null>(null);

  useEffect(() => {
    fetchNvrs();
  }, [fetchNvrs]);

  // Fetch cameras for each NVR on load
  useEffect(() => {
    for (const nvr of nvrs) {
      if (!cameras.get(nvr.id)) {
        fetchCameras(nvr.id);
      }
    }
  }, [nvrs, cameras, fetchCameras]);

  const handleCreate = async (input: CreateNvrInput) => {
    await createNvr(input);
  };

  const handleUpdate = async (input: CreateNvrInput) => {
    if (!editingNvr) return;
    await updateNvr(editingNvr.id, input);
    setEditingNvr(null);
  };

  const handleDelete = async (nvr: NvrDevice) => {
    await deleteNvr(nvr.id);
    setConfirmDelete(null);
  };

  const handleCheckStatus = async (nvr: NvrDevice) => {
    await checkStatus(nvr.id);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold">Device Manager</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            {nvrs.length} NVR device{nvrs.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchNvrs()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add NVR
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 px-4 py-3 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg">
          {error}
        </div>
      )}

      {/* Device grid */}
      {nvrs.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] mb-4">
            <Server className="w-10 h-10 text-[var(--color-text-dim)]" />
          </div>
          <h2 className="text-base font-semibold mb-1">No NVR devices</h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            Register your first Hanwha NVR to get started
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add NVR Device
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {nvrs.map((nvr) => (
            <NVRStatusCard
              key={nvr.id}
              nvr={nvr}
              cameraCount={cameras.get(nvr.id)?.length}
              onEdit={(n) => {
                setEditingNvr(n);
                setShowForm(true);
              }}
              onDelete={(n) => setConfirmDelete(n)}
              onCheckStatus={handleCheckStatus}
            />
          ))}
        </div>
      )}

      {/* Add / Edit Form Modal */}
      {showForm && (
        <NVRForm
          nvr={editingNvr}
          onSubmit={editingNvr ? handleUpdate : handleCreate}
          onClose={() => {
            setShowForm(false);
            setEditingNvr(null);
          }}
        />
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="w-full max-w-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold mb-2">Delete NVR Device</h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-5">
              Are you sure you want to remove <strong>{confirmDelete.name}</strong> ({confirmDelete.ip})?
              All associated cameras and stream sessions will be deleted.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
