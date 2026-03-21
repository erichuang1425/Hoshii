import { useState } from 'react';
import clsx from 'clsx';
import { Button, Spinner, Modal } from '@/shared/ui';
import { t } from '@/shared/i18n';
import { useToast } from '@/shared/ui/ToastProvider';
import { useFileManagerStore } from '../model/useFileManagerStore';
import type { Gallery } from '@/shared/types';

interface FileManagerViewProps {
  artistPath: string;
  galleries: Gallery[];
}

export function FileManagerView({ artistPath, galleries }: FileManagerViewProps) {
  const unorganizedFiles = useFileManagerStore((s) => s.unorganizedFiles);
  const selectedFiles = useFileManagerStore((s) => s.selectedFiles);
  const loading = useFileManagerStore((s) => s.loading);
  const moving = useFileManagerStore((s) => s.moving);
  const error = useFileManagerStore((s) => s.error);
  const toggleFileSelection = useFileManagerStore((s) => s.toggleFileSelection);
  const selectAll = useFileManagerStore((s) => s.selectAll);
  const deselectAll = useFileManagerStore((s) => s.deselectAll);
  const moveSelectedToGallery = useFileManagerStore((s) => s.moveSelectedToGallery);
  const createAndMoveToGallery = useFileManagerStore((s) => s.createAndMoveToGallery);
  const toast = useToast();

  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newGalleryName, setNewGalleryName] = useState('');
  const [selectedGalleryPath, setSelectedGalleryPath] = useState('');

  async function handleMove() {
    if (!selectedGalleryPath) return;
    try {
      await moveSelectedToGallery(selectedGalleryPath);
      toast.success(t('fileManager.moved'));
      setMoveModalOpen(false);
    } catch {
      toast.error(t('fileManager.moveError'));
    }
  }

  async function handleCreate() {
    if (!newGalleryName.trim()) return;
    try {
      await createAndMoveToGallery(artistPath, newGalleryName.trim());
      toast.success(t('fileManager.moved'));
      setCreateModalOpen(false);
      setNewGalleryName('');
    } catch {
      toast.error(t('fileManager.moveError'));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <p className="py-4 text-sm text-[var(--error)]">{error}</p>;
  }

  if (unorganizedFiles.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-base font-medium" style={{ color: 'var(--text-secondary)' }}>
          {t('fileManager.noUnorganized')}
        </p>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          {t('fileManager.noUnorganizedHint')}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {selectedFiles.size} / {unorganizedFiles.length} {t('fileManager.files')}
        </span>
        <Button variant="ghost" size="sm" onClick={selectAll}>
          {t('fileManager.selectAll')}
        </Button>
        {selectedFiles.size > 0 && (
          <Button variant="ghost" size="sm" onClick={deselectAll}>
            {t('fileManager.deselectAll')}
          </Button>
        )}
        {selectedFiles.size > 0 && (
          <>
            <Button variant="secondary" size="sm" onClick={() => setMoveModalOpen(true)}>
              {t('fileManager.moveSelected')}
            </Button>
            <Button variant="primary" size="sm" onClick={() => setCreateModalOpen(true)}>
              {t('fileManager.createGallery')}
            </Button>
          </>
        )}
        {moving && <Spinner size="sm" />}
      </div>

      {/* File grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
        {unorganizedFiles.map((file) => {
          const isSelected = selectedFiles.has(file.path);
          const filename = file.filename;
          return (
            <button
              key={file.id}
              onClick={() => toggleFileSelection(file.path)}
              className={clsx(
                'flex flex-col overflow-hidden rounded-[var(--card-radius)] border text-left',
                'transition-all duration-[var(--duration-fast)]',
                isSelected
                  ? 'border-[var(--accent)] bg-[var(--accent-muted)]'
                  : 'border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--border-hover)]',
              )}
            >
              {/* Thumbnail area */}
              <div
                className="flex items-center justify-center bg-[var(--bg-elevated)]"
                style={{ aspectRatio: '1', width: '100%' }}
              >
                {isSelected && (
                  <div className="absolute top-2 left-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)]">
                    <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
                <svg
                  className="h-10 w-10 opacity-30"
                  style={{ color: 'var(--text-muted)' }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>

              {/* File name */}
              <div className="p-2">
                <p
                  className="truncate text-xs"
                  style={{ color: isSelected ? 'var(--accent)' : 'var(--text-secondary)' }}
                  title={filename}
                >
                  {filename}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Move to gallery modal */}
      <Modal
        open={moveModalOpen}
        onClose={() => setMoveModalOpen(false)}
        title={t('fileManager.moveTo')}
      >
        <div className="min-w-[280px] space-y-2">
          {galleries.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {t('shared.noResults')}
            </p>
          ) : (
            galleries.map((g) => (
              <button
                key={g.id}
                onClick={() => setSelectedGalleryPath(g.path)}
                className={clsx(
                  'flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-left',
                  'transition-colors duration-[var(--duration-fast)]',
                  selectedGalleryPath === g.path
                    ? 'bg-[var(--accent-muted)] text-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
                )}
              >
                {g.name}
              </button>
            ))
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setMoveModalOpen(false)}>
              {t('shared.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleMove}
              disabled={!selectedGalleryPath || moving}
            >
              {moving ? <Spinner size="sm" /> : t('fileManager.moveSelected')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create new gallery modal */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={t('fileManager.createGallery')}
      >
        <div className="min-w-[280px] space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {t('fileManager.galleryName')}
            </label>
            <input
              type="text"
              value={newGalleryName}
              onChange={(e) => setNewGalleryName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
              className={clsx(
                'w-full rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-sm',
                'text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
                'focus:border-[var(--accent)] focus:outline-none',
              )}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreateModalOpen(false)}>
              {t('shared.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleCreate}
              disabled={!newGalleryName.trim() || moving}
            >
              {moving ? <Spinner size="sm" /> : t('shared.create')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
