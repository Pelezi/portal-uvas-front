import { create } from 'zustand';
import { Celula, Member, PermissionUpsertInput } from '@/types';

interface AppState {
  // Celulas (formerly groups)
  celulas: Celula[];
  setCelulas: (celulas: Celula[]) => void;

  // Members of the selected celula
  members: Member[];
  setMembers: (members: Member[]) => void;

  // Current selected celula id (null = personal / none)
  currentCelulaId: number | null;
  setCurrentCelulaId: (celulaId: number | null) => void;

  // Current user (if available)
  currentUser: Member | null;
  setCurrentUser: (user: Member | null) => void;

  // Stored permission upserts (useful for batching UI operations)
  pendingPermissions: PermissionUpsertInput[];
  setPendingPermissions: (perms: PermissionUpsertInput[]) => void;

  // UI state
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  celulas: [],
  setCelulas: (celulas) => set({ celulas }),

  members: [],
  setMembers: (members) => set({ members }),

  currentCelulaId: null,
  setCurrentCelulaId: (celulaId) => set({ currentCelulaId: celulaId }),

  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),

  pendingPermissions: [],
  setPendingPermissions: (perms) => set({ pendingPermissions: perms }),

  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
}));
