'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@/services/transactionService';
import { categoryService } from '@/services/categoryService';
import { subcategoryService } from '@/services/subcategoryService';
import { groupService } from '@/services/groupService';
import { Transaction, EntityType } from '@/types';
import { accountService } from '@/services/accountService';
import { ArrowLeft, Edit2, Trash2, Calendar, Tag, FileText, DollarSign, User } from 'lucide-react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/pt-br';
import { toUserTimezone, formatInUserTimezone, createInUserTimezone } from '@/lib/timezone';
import TransactionForm from '@/components/TransactionForm';

dayjs.extend(utc);
dayjs.extend(timezone);

type Props = {
  transactionId: number | null;
  backUrl?: string;
  groupId?: number | null;
};

export default function TransactionDetails({ transactionId, backUrl = '/transactions', groupId = null }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [formData, setFormData] = useState({
    categoryId: 0,
    subcategoryId: 0,
    title: '',
    amount: '',
    description: '',
    dateTime: createInUserTimezone(),
    type: 'EXPENSE' as EntityType,
    accountId: 0,
    toAccountId: 0,
    userId: undefined as number | undefined,
  });

  // Detect dark mode
  useEffect(() => {
    const updateDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };

    updateDarkMode();

    const observer = new MutationObserver(updateDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  const { data: transaction, isLoading } = useQuery({
    queryKey: ['transaction', transactionId],
    queryFn: () => transactionService.getById(transactionId!),
    enabled: !!transactionId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', groupId],
    queryFn: () => categoryService.getAll(groupId ?? undefined),
  });

  const { data: subcategories = [] } = useQuery({
    queryKey: ['subcategories', groupId],
    queryFn: () => subcategoryService.getAll(groupId ?? undefined),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', groupId],
    queryFn: () => accountService.getAll(groupId ? { groupId } : undefined),
  });

  const { data: groupMembers = [] } = useQuery({
    queryKey: ['groupMembers', groupId],
    queryFn: () => groupService.getMembers(groupId!),
    enabled: !!groupId,
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Transaction> }) =>
      transactionService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction', transactionId] });
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey as any[];
          if (!key || key.length === 0) return false;
          if (key[0] !== 'transactions') return false;
          if (groupId == null) return true;
          return key.includes(groupId);
        },
      });
      setIsEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: transactionService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey as any[];
          if (!key || key.length === 0) return false;
          if (key[0] !== 'transactions') return false;
          if (groupId == null) return true;
          return key.includes(groupId);
        },
      });
      router.push(backUrl);
    },
  });

  useEffect(() => {
    if (transaction) {
      const subcategory = subcategories.find((s) => s.id === transaction.subcategoryId);
      // Convert UTC date from backend to user's timezone
      const transactionDate = toUserTimezone(transaction.date);
      setFormData({
        categoryId: subcategory?.categoryId || 0,
        subcategoryId: transaction.subcategoryId,
        title: transaction.title,
        amount: Number(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        description: transaction.description || '',
        accountId: transaction.accountId || 0,
        toAccountId: transaction.toAccountId || 0,
        userId: transaction.user?.id,
        dateTime: transactionDate,
        type: transaction.type,
      });
    }
  }, [transaction, subcategories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Convert to UTC for sending to backend
    const dateInUtc = formData.dateTime.utc();
    const dateStr = dateInUtc.format('YYYY-MM-DD');
    const timeStr = dateInUtc.format('HH:mm:ss');

    const data = {
      subcategoryId: formData.subcategoryId,
      title: formData.title,
      amount: parseFloat(formData.amount),
      description: formData.description,
      date: dateStr,
      time: timeStr,
      type: formData.type,
    };

    if (transactionId) {
      updateMutation.mutate({ id: transactionId, data });
    }
  };

  const handleDelete = () => {
    if (transactionId && confirm('Tem certeza que deseja excluir esta transação?')) {
      deleteMutation.mutate(transactionId);
    }
  };

  const formatDate = (dateString: string) => {
    return formatInUserTimezone(dateString, 'dddd, D [de] MMMM [de] YYYY');
  };

  const formatTime = (dateString: string) => {
    return formatInUserTimezone(dateString, 'HH:mm');
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const availableSubcategories = subcategories.filter(
    (sub) => sub.categoryId === formData.categoryId
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500 dark:text-gray-400">Carregando...</p>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-gray-500 dark:text-gray-400">Transação não encontrada</p>
        <button
          onClick={() => router.push(backUrl)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Voltar
        </button>
      </div>
    );
  }

  const muiTheme = createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
      primary: {
        main: isDarkMode ? '#ffffffff' : '#000000ff',
      },
    },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push(backUrl)}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Voltar</span>
        </button>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit2 size={16} />
                <span>Editar</span>
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 size={16} />
                <span>Excluir</span>
              </button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 pt-6 sm:pt-10 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
            <div className="sticky top-0 z-10 p-4 border-b border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                   Editar Transação
                </h2>
                <button
                  onClick={() => { setIsEditing(false); }}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Fechar
                </button>
              </div>
            </div>            <div
              className="flex-1 p-4 space-y-4 overflow-y-auto pb-28 sm:pb-32"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px))' }}
            >
              <TransactionForm
                groupId={groupId ?? undefined}
                accounts={accounts}
                categories={categories}
                subcategories={subcategories}
                groupMembers={groupMembers}
                initialValues={formData}
                submitting={updateMutation.isPending}
                onCancel={() => setIsEditing(false)}
                onSave={(data: any) => {
                  if (transactionId) updateMutation.mutate({ id: transactionId, data });
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        /* Details View */
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {/* Header with amount */}
          <div
            className={`p-6 ${transaction.type === 'INCOME'
              ? 'bg-green-50 dark:bg-green-900/20'
              : transaction.type === 'EXPENSE'
                ? 'bg-red-50 dark:bg-red-900/20'
                : 'bg-gray-50 dark:bg-gray-700/20'
              }`}
          >
            <div className="text-center">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {transaction.type === 'INCOME'
                  ? 'Renda' : transaction.type === 'EXPENSE'
                    ? 'Despesa' : 'Transferência'}
              </div>
              <div
                className={`text-4xl font-bold ${transaction.type === 'INCOME'
                  ? 'text-green-600 dark:text-green-400'
                  : transaction.type === 'EXPENSE'
                    ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
                  }`}
              >
                {transaction.type === 'INCOME' ? '+' : transaction.type === 'EXPENSE' ? '-' : ''}
                {formatCurrency(transaction.amount)}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {transaction.title}
              </h3>
              {transaction.description && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">
                        Descrição
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {transaction.description}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Conta */}
              {transaction.accountId && (
                (() => {
                  const account = accounts.find(acc => acc.id === transaction.accountId);
                  return account ? (
                    <div className="flex items-start gap-3">
                      <DollarSign className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Conta</div>
                        <div className="text-base font-medium text-gray-900 dark:text-gray-100">
                          {account.name}
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()
              )}
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Data e Horário</div>
                  <div className="text-base font-medium text-gray-900 dark:text-gray-100 capitalize">
                    {formatDate(transaction.date)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    às {formatTime(transaction.date)}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Tag className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Categoria</div>
                  <div className="text-base font-medium text-gray-900 dark:text-gray-100">
                    {transaction.subcategory?.category?.name || '-'}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {transaction.subcategory?.name || '-'}
                  </div>
                </div>
              </div>

              {transaction.user && (
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Criado por</div>
                    <div className="text-base font-medium text-gray-900 dark:text-gray-100">
                      {transaction.user.firstName} {transaction.user.lastName}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Valor</div>
                  <div
                    className={`text-base font-medium ${transaction.type === 'INCOME'
                      ? 'text-green-600 dark:text-green-400'
                      : transaction.type === 'EXPENSE'
                        ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
                      }`}
                  >
                    {formatCurrency(transaction.amount)}
                  </div>
                </div>
              </div>
            </div>

            {transaction.createdAt && (
              <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Criado em: {new Date(transaction.createdAt).toLocaleString('pt-BR')}
                </div>
                {transaction.updatedAt && transaction.updatedAt !== transaction.createdAt && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Atualizado em: {new Date(transaction.updatedAt).toLocaleString('pt-BR')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
