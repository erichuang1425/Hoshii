import { create } from 'zustand';
import type { Gallery } from '@/shared/types';
import type { UnorganizedFile } from '@/shared/types/media';
import { logger } from '@/shared/lib/logger';
import * as api from '../api/fileManagerApi';

interface FileManagerState {
  unorganizedFiles: UnorganizedFile[];
  selectedFiles: Set<string>;
  loading: boolean;
  moving: boolean;
  error: string | null;
  currentArtistId: number | null;

  fetchUnorganizedFiles: (artistId: number) => Promise<void>;
  toggleFileSelection: (filePath: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  moveSelectedToGallery: (galleryPath: string) => Promise<void>;
  createAndMoveToGallery: (artistPath: string, galleryName: string) => Promise<Gallery>;
  clearError: () => void;
}

let fetchRequestCounter = 0;

export const useFileManagerStore = create<FileManagerState>((set, get) => ({
  unorganizedFiles: [],
  selectedFiles: new Set(),
  loading: false,
  moving: false,
  error: null,
  currentArtistId: null,

  fetchUnorganizedFiles: async (artistId) => {
    const requestId = ++fetchRequestCounter;
    set({ loading: true, error: null, currentArtistId: artistId, selectedFiles: new Set() });
    try {
      const files = await api.getUnorganizedFiles(artistId);
      // Only apply result if this is still the latest request
      if (fetchRequestCounter === requestId) {
        set({ unorganizedFiles: files, loading: false });
      }
    } catch (err) {
      if (fetchRequestCounter === requestId) {
        const message = String(err);
        logger.error('Failed to fetch unorganized files', { artistId, error: message });
        set({ error: message, loading: false });
      }
    }
  },

  toggleFileSelection: (filePath) => {
    set((s) => {
      const next = new Set(s.selectedFiles);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return { selectedFiles: next };
    });
  },

  selectAll: () => {
    set((s) => ({
      selectedFiles: new Set(s.unorganizedFiles.map((f) => f.path)),
    }));
  },

  deselectAll: () => {
    set({ selectedFiles: new Set() });
  },

  moveSelectedToGallery: async (galleryPath) => {
    const { selectedFiles, currentArtistId } = get();
    if (selectedFiles.size === 0) return;

    set({ moving: true, error: null });
    try {
      await api.moveFilesToGallery(Array.from(selectedFiles), galleryPath);
      // Remove moved files from list
      set((s) => ({
        unorganizedFiles: s.unorganizedFiles.filter((f) => !selectedFiles.has(f.path)),
        selectedFiles: new Set(),
        moving: false,
      }));
    } catch (err) {
      const message = String(err);
      logger.error('Failed to move files', { galleryPath, error: message });
      set({ error: message, moving: false });
      // Re-fetch to ensure consistency
      if (currentArtistId !== null) {
        await get().fetchUnorganizedFiles(currentArtistId);
      }
    }
  },

  createAndMoveToGallery: async (artistPath, galleryName) => {
    const { selectedFiles } = get();
    set({ moving: true, error: null });
    try {
      const gallery = await api.createGalleryFolder(artistPath, galleryName);
      if (selectedFiles.size > 0) {
        await api.moveFilesToGallery(Array.from(selectedFiles), gallery.path);
        set((s) => ({
          unorganizedFiles: s.unorganizedFiles.filter((f) => !selectedFiles.has(f.path)),
          selectedFiles: new Set(),
        }));
      }
      set({ moving: false });
      return gallery;
    } catch (err) {
      const message = String(err);
      logger.error('Failed to create gallery and move files', { artistPath, galleryName, error: message });
      set({ error: message, moving: false });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
