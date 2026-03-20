import { create } from 'zustand';

interface LayoutState {
  sidebarOpen: boolean;
  collapsedSections: Record<string, boolean>;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSection: (section: string) => void;
  isSectionCollapsed: (section: string) => boolean;
}

export const useLayoutStore = create<LayoutState>((set, get) => ({
  sidebarOpen: true,
  collapsedSections: {},

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
}));
