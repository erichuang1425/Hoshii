import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { Modal, Button, Spinner } from '@/shared/ui';
import { t } from '@/shared/i18n';
import { useToast } from '@/shared/ui/ToastProvider';
import { useTagStore } from '../model/useTagStore';

interface TagModalProps {
  galleryId: number;
  galleryName: string;
  open: boolean;
  onClose: () => void;
}

export function TagModal({ galleryId, galleryName, open, onClose }: TagModalProps) {
  const tags = useTagStore((s) => s.getGalleryTags(galleryId));
  const fetchGalleryTags = useTagStore((s) => s.fetchGalleryTags);
  const addTag = useTagStore((s) => s.addTag);
  const removeTag = useTagStore((s) => s.removeTag);
  const toast = useToast();

  const [newTagName, setNewTagName] = useState('');
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load tags when modal opens
  useEffect(() => {
    if (open) fetchGalleryTags(galleryId);
  }, [open, galleryId, fetchGalleryTags]);

  async function handleAddTag() {
    const name = newTagName.trim();
    if (!name || adding) return;
    setAdding(true);
    try {
      await addTag(galleryId, name);
      setNewTagName('');
      toast.success(t('tags.added'));
      inputRef.current?.focus();
    } catch {
      toast.error(t('tags.addError'));
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveTag(tagId: number) {
    try {
      await removeTag(galleryId, tagId);
      toast.success(t('tags.removed'));
    } catch {
      toast.error(t('tags.removeError'));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${t('tags.manage')} — ${galleryName}`}
    >
      <div className="min-w-[320px]">
        {/* Existing tags */}
        <div className="mb-4 flex flex-wrap gap-2">
          {tags.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {t('tags.noTags')}
            </p>
          )}
          {tags.map((tag) => (
            <span
              key={tag.id}
              className={clsx(
                'flex items-center gap-1 rounded-full px-3 py-1 text-sm',
                'bg-[var(--bg-active)] text-[var(--text-secondary)]',
              )}
            >
              {tag.name}
              <button
                onClick={() => handleRemoveTag(tag.id)}
                className="ml-1 text-[var(--text-muted)] transition-colors hover:text-[var(--error)]"
                aria-label={`${t('tags.remove')} ${tag.name}`}
              >
                &times;
              </button>
            </span>
          ))}
        </div>

        {/* Add new tag */}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
            placeholder={t('tags.addPlaceholder')}
            className={clsx(
              'flex-1 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-sm',
              'text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
              'focus:border-[var(--accent)] focus:outline-none',
            )}
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleAddTag}
            disabled={!newTagName.trim() || adding}
          >
            {adding ? <Spinner size="sm" /> : t('tags.add')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
