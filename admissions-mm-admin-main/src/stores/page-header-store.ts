import { create } from "zustand";

export interface PageHeaderAction {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
}

interface PageHeaderState {
  title: string | null;
  description: string | null;
  action: PageHeaderAction | null;
  setHeader: (opts: {
    title?: string;
    description?: string;
    action?: PageHeaderAction | null;
  }) => void;
  clearHeader: () => void;
}

export const usePageHeaderStore = create<PageHeaderState>((set) => ({
  title: null,
  description: null,
  action: null,
  setHeader: (opts) =>
    set((state) => ({
      title: opts.title !== undefined ? opts.title : state.title,
      description:
        opts.description !== undefined ? opts.description : state.description,
      action: opts.action !== undefined ? opts.action : state.action,
    })),
  clearHeader: () => set({ title: null, description: null, action: null }),
}));
