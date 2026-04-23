import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type LayoutMode = 'classic' | 'compact' | 'top' | 'focus';

export const LAYOUT_MODES: LayoutMode[] = ['classic', 'compact', 'top', 'focus'];

interface LayoutState {
  layoutMode: LayoutMode;
  sidebarOpen: boolean;
  collapsedSections: Record<string, boolean>;
  setLayoutMode: (mode: LayoutMode) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSection: (section: string) => void;
  isSectionCollapsed: (section: string) => boolean;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set, get) => ({
      layoutMode: 'classic',
      sidebarOpen: true,
      collapsedSections: {},

      setLayoutMode: (layoutMode) => set({ layoutMode }),

      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      toggleSection: (section) =>
        set((s) => ({
          collapsedSections: {
            ...s.collapsedSections,
            [section]: !s.collapsedSections[section],
          },
        })),

      isSectionCollapsed: (section) => get().collapsedSections[section] ?? false,
    }),
    {
      name: 'hoshii-layout',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        layoutMode: s.layoutMode,
        sidebarOpen: s.sidebarOpen,
        collapsedSections: s.collapsedSections,
      }),
    },
  ),
);
