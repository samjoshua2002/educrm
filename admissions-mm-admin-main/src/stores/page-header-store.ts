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
  customLeftNode?: React.ReactNode | null;
  customRightNode?: React.ReactNode | null;
  setHeader: (opts: {
    title?: string | null;
    description?: string | null;
    action?: PageHeaderAction | null;
    customLeftNode?: React.ReactNode | null;
    customRightNode?: React.ReactNode | null;
  }) => void;
  clearHeader: () => void;
}

export const usePageHeaderStore = create<PageHeaderState>((set) => ({
  title: null,
  description: null,
  action: null,
  customLeftNode: null,
  customRightNode: null,
  setHeader: (opts) =>
    set((state) => ({
      title: opts.title !== undefined ? opts.title : state.title,
      description:
        opts.description !== undefined ? opts.description : state.description,
      action: opts.action !== undefined ? opts.action : state.action,
      customLeftNode:
        opts.customLeftNode !== undefined
          ? opts.customLeftNode
          : state.customLeftNode,
      customRightNode:
        opts.customRightNode !== undefined
          ? opts.customRightNode
          : state.customRightNode,
    })),
  clearHeader: () =>
    set({
      title: null,
      description: null,
      action: null,
      customLeftNode: null,
      customRightNode: null,
    }),
}));
