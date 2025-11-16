import { create } from 'zustand';
import { Category, Subcategory, Expense, Transaction, Group, GroupPermissions } from '@/types';

interface AppState {
  // Categories
  categories: Category[];
  setCategories: (categories: Category[]) => void;
  
  // Subcategories
  subcategories: Subcategory[];
  setSubcategories: (subcategories: Subcategory[]) => void;
  
  // Expenses
  expenses: Expense[];
  setExpenses: (expenses: Expense[]) => void;
  
  // Transactions
  transactions: Transaction[];
  setTransactions: (transactions: Transaction[]) => void;
  
  // Selected year for budget management
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  
  // Groups
  groups: Group[];
  setGroups: (groups: Group[]) => void;
  
  // Current context (null = personal, number = group id)
  currentGroupId: number | null;
  setCurrentGroupId: (groupId: number | null) => void;
  
  // Current group permissions
  currentGroupPermissions: GroupPermissions | null;
  setCurrentGroupPermissions: (permissions: GroupPermissions | null) => void;
  
  // UI state
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  categories: [],
  setCategories: (categories) => set({ categories }),
  
  subcategories: [],
  setSubcategories: (subcategories) => set({ subcategories }),
  
  expenses: [],
  setExpenses: (expenses) => set({ expenses }),
  
  transactions: [],
  setTransactions: (transactions) => set({ transactions }),
  
  selectedYear: new Date().getFullYear(),
  setSelectedYear: (year) => set({ selectedYear: year }),
  
  groups: [],
  setGroups: (groups) => set({ groups }),
  
  currentGroupId: null,
  setCurrentGroupId: (groupId) => set({ currentGroupId: groupId }),
  
  currentGroupPermissions: null,
  setCurrentGroupPermissions: (permissions) => set({ currentGroupPermissions: permissions }),
  
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
}));
