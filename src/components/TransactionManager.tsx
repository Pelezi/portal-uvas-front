'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@/services/transactionService';
import { accountService } from '@/services/accountService';
import { categoryService } from '@/services/categoryService';
import { subcategoryService } from '@/services/subcategoryService';
import { groupService } from '@/services/groupService';
import { Transaction, EntityType } from '@/types';
import { Plus, Filter } from 'lucide-react';
import { MonthYearPicker } from '@/components/MonthYearPicker';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import { TransactionFilterModal } from '@/components/TransactionFilterModal';
import { TransactionsTable } from '@/components/TransactionsTable';
import { createInUserTimezone, toUserTimezone } from '@/lib/timezone';
import TransactionForm from '@/components/TransactionForm';


interface TransactionManagerProps {
  groupId?: number;
  canManage?: boolean;
  canView?: boolean;
  title?: string;
  showUser?: boolean;
  initialAccountId?: number;
}

export default function TransactionManager({
  groupId,
  canManage = true,
  canView = true,
  title = 'Transações',
  showUser = false,
  initialAccountId
}: TransactionManagerProps) {
  const queryClient = useQueryClient();

  // Current balance for account history (used to compute running balances)
  const { data: currentAccountBalance } = useQuery({
    queryKey: initialAccountId ? ['accountBalance', initialAccountId] : ['accountBalance', 'none'],
    queryFn: () => accountService.getCurrentBalance(initialAccountId!),
    enabled: !!initialAccountId,
  });

  // Buscar contas disponíveis
  const { data: accounts = [] } = useQuery({
    queryKey: groupId ? ['accounts', groupId] : ['accounts'],
    queryFn: () => accountService.getAll(groupId ? { groupId } : undefined),
    enabled: canView,
  });

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [filters, setFilters] = useState({
    year: currentYear,
    month: currentMonth,
    type: '',
    categoryId: undefined as number | undefined,
    subcategoryId: undefined as number | undefined,
    accountId: initialAccountId ?? undefined as number | undefined,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });
  const [formData, setFormData] = useState({
    categoryId: 0,
    subcategoryId: 0,
    accountId: 0,
    toAccountId: 0,
    title: '',
    amount: '0,00',
    description: '',
    dateTime: createInUserTimezone(), // Dayjs object for date and time in user's timezone
    type: 'EXPENSE' as EntityType,
    ...(groupId && { groupId }),
    ...(groupId && { userId: undefined as number | undefined }),
  });

  // Listen for changes to Tailwind's dark mode class
  useEffect(() => {
    const updateDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    updateDarkMode();
    window.addEventListener('storage', updateDarkMode);
    const observer = new MutationObserver(updateDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => {
      window.removeEventListener('storage', updateDarkMode);
      observer.disconnect();
    };
  }, []);

  const getDateRange = () => {
    const startDate = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`;
    const lastDay = new Date(filters.year, filters.month, 0).getDate();
    const endDate = `${filters.year}-${String(filters.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { startDate, endDate };
  };

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: groupId ? ['transactions', filters, groupId] : ['transactions', filters],
    queryFn: () => {
      const { startDate, endDate } = getDateRange();
      return transactionService.getAll({
        startDate,
        endDate,
        type: filters.type || undefined,
        categoryId: filters.categoryId,
        subcategoryId: filters.subcategoryId,
        accountId: filters.accountId,
        ...(groupId && { groupId }),
      });
    },
    enabled: canView,
  });

  const { data: categories = [] } = useQuery({
    queryKey: groupId ? ['categories', groupId] : ['categories'],
    queryFn: () => categoryService.getAll(groupId),
    enabled: canView,
  });

  const { data: subcategories = [] } = useQuery({
    queryKey: groupId ? ['subcategories', groupId] : ['subcategories'],
    queryFn: () => subcategoryService.getAll(groupId),
    enabled: canView,
  });

  const { data: groupMembers = [] } = useQuery({
    queryKey: ['groupMembers', groupId],
    queryFn: () => groupService.getMembers(groupId!),
    enabled: !!groupId && canView,
  });

  const createMutation = useMutation({
    mutationFn: transactionService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setIsModalOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Transaction> }) =>
      transactionService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setIsModalOpen(false);
      setEditingTransaction(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: transactionService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const resetForm = () => {
    setFormData({
      categoryId: 0,
      subcategoryId: 0,
      accountId: 0,
      toAccountId: 0,
      title: '',
      amount: '0,00',
      description: '',
      dateTime: createInUserTimezone(), // Current date and time in user's timezone
      type: 'EXPENSE',
      ...(groupId && { groupId }),
      ...(groupId && { userId: undefined as number | undefined }),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Convert to UTC for sending to backend
    const dateInUtc = formData.dateTime.utc();
    const dateStr = dateInUtc.format('YYYY-MM-DD');
    const timeStr = dateInUtc.format('HH:mm:ss');

    const amountNumber = Number(formData.amount.replace(/\./g, '').replace(',', '.'));

    const data = {
      subcategoryId: formData.subcategoryId,
      accountId: formData.accountId,
      toAccountId: formData.toAccountId,
      title: formData.title,
      amount: amountNumber,
      description: formData.description,
      date: dateStr,
      time: timeStr,
      type: formData.type,
      ...(groupId && { groupId }),
      ...(groupId && formData.userId && { userId: formData.userId }),
    };

    if (editingTransaction) {
      updateMutation.mutate({ id: editingTransaction.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    if (!canManage) return;
    setEditingTransaction(transaction);
    const subcategory = subcategories.find((s) => s.id === transaction.subcategoryId);
    // Convert UTC date from backend to user's timezone
    const transactionDate = toUserTimezone(transaction.date);
    setFormData({
      categoryId: subcategory?.categoryId || 0,
      subcategoryId: transaction.subcategoryId,
      accountId: transaction.accountId || 0,
      toAccountId: transaction.toAccountId || 0,
      title: transaction.title,
      amount: Number(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      description: transaction.description || '',
      dateTime: transactionDate,
      type: transaction.type,
      ...(groupId && { groupId }),
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (!canManage) return;
    if (confirm('Tem certeza que deseja excluir esta transação?')) {
      deleteMutation.mutate(id);
    }
  };



  const formatBRLfromCents = (cents: number) =>
    (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const normalizeToBRL = (value: string) => {
    const digits = value.replace(/\D/g, ''); // só números
    const cents = Number(digits || '0');
    return formatBRLfromCents(cents);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = normalizeToBRL(e.target.value);
    setFormData((f) => ({ ...f, amount: formatted }));
  };

  const handleAmountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
    if (allowed.includes(e.key)) return;
    if (!/^\d$/.test(e.key)) e.preventDefault(); // apenas dígitos
  };



  return (
    <div className="space-y-4">
      {/* Desktop Title - Only visible on desktop */}
      <div className="hidden lg:block">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
      </div>

      {/* Sticky Header - Mobile and Desktop */}
      <div className="bg-gray-50 dark:bg-gray-900 pb-3 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 shadow-sm lg:shadow-none">
        <div className="pt-3 lg:pt-0 space-y-3">
          {/* Mobile: Compact header with all controls */}
          <div className="lg:hidden flex items-center gap-2">
            <div className="flex-1">
              <MonthYearPicker
                year={filters.year}
                month={filters.month}
                onMonthYearChange={(year, month) => setFilters({ ...filters, year, month })}
              />
            </div>
            <button
              onClick={() => setIsFilterModalOpen(true)}
              className="flex items-center justify-center p-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
            >
              <Filter size={18} />
            </button>
          </div>

          {/* Desktop: Month picker with filter button */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="flex-1">
              <MonthYearPicker
                year={filters.year}
                month={filters.month}
                onMonthYearChange={(year, month) => setFilters({ ...filters, year, month })}
              />
            </div>
            <button
              onClick={() => setIsFilterModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Filter size={20} />
              <span>Filtrar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Modal */}
      <TransactionFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        filters={{
          type: filters.type,
          categoryId: filters.categoryId,
          subcategoryId: filters.subcategoryId,
          accountId: filters.accountId,
        }}
        onFiltersChange={(newFilters) =>
          setFilters({
            ...filters,
            type: newFilters.type,
            categoryId: newFilters.categoryId,
            subcategoryId: newFilters.subcategoryId,
            accountId: newFilters.accountId,
          })
        }
        categories={categories}
        subcategories={subcategories}
        accounts={accounts}
        showCategoryFilter={!groupId}
      />

      {/* Table */}
      <div className="mb-24">
        <TransactionsTable
          transactions={transactions}
          accounts={accounts}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          canManage={canManage}
            showUser={showUser}
            groupId={groupId}
            initialAccountId={initialAccountId}
            currentAccountBalanceAmount={currentAccountBalance?.amount}
        />
      </div>

      {/* Floating Add Button */}
      {canManage && (
        <button
          onClick={() => {
            setEditingTransaction(null);
            resetForm();
            setIsModalOpen(true);
          }}
          className="fixed bottom-6 right-6 z-40 p-4 bg-blue-600 dark:bg-blue-700 text-white rounded-full shadow-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-all hover:scale-110 active:scale-95"
          aria-label="Adicionar transação"
        >
          <Plus size={24} />
        </button>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 pt-6 sm:pt-10 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
            {/* Cabeçalho + selector de tipo */}
            <div className="sticky top-0 z-10 p-4 border-b border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {editingTransaction ? 'Editar Transação' : 'Adicionar Transação'}
                </h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingTransaction(null);
                    resetForm();
                  }}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Fechar
                </button>
              </div>
            </div>

            {/* Conteúdo rolável */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto pb-28 sm:pb-32" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px))' }}>
              <TransactionForm
                groupId={groupId}
                accounts={accounts}
                categories={categories}
                subcategories={subcategories}
                groupMembers={groupMembers}
                initialValues={formData}
                submitting={createMutation.isPending || updateMutation.isPending}
                onCancel={() => {
                  setIsModalOpen(false);
                  setEditingTransaction(null);
                  resetForm();
                }}
                onSave={(data: any) => {
                  if (editingTransaction) {
                    updateMutation.mutate({ id: editingTransaction.id, data });
                  } else {
                    createMutation.mutate(data);
                  }
                }}
              />
            </div>

          </div>
        </div>
      )}
    </div >
  );
}
