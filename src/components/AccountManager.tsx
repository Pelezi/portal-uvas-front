"use client";

import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import { createInUserTimezone, getUserTimezone } from '@/lib/timezone';
dayjs.extend(timezone);

import { useEffect, useState, useRef } from 'react';
import { accountService } from '@/services/accountService';
import { groupService } from '@/services/groupService';
import { categoryService } from '@/services/categoryService';
import { subcategoryService } from '@/services/subcategoryService';
import { Account, AccountBalance, AccountType } from '@/types';
import { GroupMember } from '@/types';
import { Category, Subcategory } from '@/types';
import { Plus, Pencil, Trash2, Wallet, CreditCard, DollarSign, X, Info, Settings } from 'lucide-react';
import Popover from '@mui/material/Popover';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';

interface AccountManagerProps {
  groupId?: number;
  canManage?: boolean;
  canView?: boolean;
  title?: string;
  currentUserId?: number;
  canManageOwn?: boolean;
  canManageAll?: boolean;
}

export default function AccountManager({
  groupId,
  canManage = true,
  canView = true,
  title,
  currentUserId,
  canManageOwn = false,
  canManageAll = false,
}: AccountManagerProps) {
  const router = useRouter();
  const [infoAnchorEl, setInfoAnchorEl] = useState<HTMLElement | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const handleInfoClick = (e: React.MouseEvent<HTMLElement>) => {
    setInfoAnchorEl(e.currentTarget);
  };
  const handleInfoClose = () => setInfoAnchorEl(null);
  const infoOpen = Boolean(infoAnchorEl);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [balances, setBalances] = useState<Record<number, AccountBalance | null>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [deleteTxCount, setDeleteTxCount] = useState<number>(0);
  const [deleteTargetAccountId, setDeleteTargetAccountId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'CASH' as AccountType,
    initialBalance: '0,00',
    initialBalanceDateTime: createInUserTimezone(),
    userId: currentUserId || undefined,
    // Prepaid fields
    prepaidCategoryId: undefined as number | undefined,
    prepaidSubcategoryId: undefined as number | undefined,
    // Credit fields
    creditDueDay: 1 as number | undefined,
    creditClosingDay: 1 as number | undefined,
    debitMethod: 'INVOICE', // 'INVOICE' | 'PER_PURCHASE'
  });

  const [balanceFormData, setBalanceFormData] = useState({
    amount: 0,
    dateTime: createInUserTimezone(), // Dayjs object
  });

  const formRef = useRef<HTMLFormElement | null>(null);


  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    if (canView) {
      loadAccounts();
    }
    if (groupId) {
      groupService.getMembers(groupId).then((members: GroupMember[]) => setGroupMembers(members));
    }
  }, [canView, groupId]);

  // Load categories for prepaid selection
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await categoryService.getAll(groupId ? groupId : undefined);
        setCategories(cats);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    loadCategories();
  }, [groupId]);

  // Load all subcategories (then filter client-side like TransactionForm)
  useEffect(() => {
    const loadSubcategories = async () => {
      try {
        const subs = await subcategoryService.getAll(groupId ? groupId : undefined);
        setSubcategories(subs);
      } catch (err) {
        console.error('Failed to load subcategories:', err);
      }
    };
    loadSubcategories();
  }, [groupId]);

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

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const data = await accountService.getAll(groupId ? { groupId } : undefined);
      setAccounts(data);

      // Load balances for all accounts
      const balancePromises = data.map(async (account) => {
        const balance = await accountService.getCurrentBalance(account.id);
        return { accountId: account.id, balance };
      });

      const balanceResults = await Promise.all(balancePromises);
      const balanceMap: Record<number, AccountBalance | null> = {};
      balanceResults.forEach(({ accountId, balance }) => {
        balanceMap[accountId] = balance;
      });
      setBalances(balanceMap);
    } catch (error) {
      console.error('Failed to load accounts:', error);
      toast.error('Erro ao carregar contas');
    } finally {
      setLoading(false);
    }
  };

  const canEditAccount = (account: Account): boolean => {
    if (!groupId) return canManage; // Personal accounts

    // Group accounts
    if (canManageAll) return true;
    if (canManageOwn && currentUserId && account.userId === currentUserId) return true;
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAccount) {
        const updatePayload: any = {
          name: formData.name,
          type: formData.type,
        };

        // If PREPAID, send selected subcategory id (or null to disconnect)
        if (formData.type === 'PREPAID') {
          updatePayload.subcategoryId = formData.prepaidSubcategoryId ?? null;
          updatePayload.creditDueDay = null;
          updatePayload.creditClosingDay = null;
          updatePayload.debitMethod = null;
        }

        // If CREDIT, send creditDueDay and debitMethod (if present)
        if (formData.type === 'CREDIT') {
          if (formData.creditDueDay !== undefined) updatePayload.creditDueDay = formData.creditDueDay;
          if (formData.creditClosingDay !== undefined) updatePayload.creditClosingDay = formData.creditClosingDay;
          if (formData.debitMethod !== undefined) updatePayload.debitMethod = formData.debitMethod;
          // If debit method is INVOICE, allow assigning a subcategory (invoice categorization)
          if (formData.debitMethod === 'INVOICE') {
            updatePayload.subcategoryId = formData.prepaidSubcategoryId ?? null;
          } else {
            updatePayload.subcategoryId = null;
          }
        }

        await accountService.update(editingAccount.id, updatePayload);
        toast.success('Conta atualizada com sucesso!');
      } else {
        // Build payload carefully (avoid sending Dayjs objects directly)
        const amountNumber = Number(formData.initialBalance.replace(/\./g, '').replace(',', '.'));
        const basePayload: any = {
          name: formData.name,
          type: formData.type,
          initialBalance: amountNumber,
        };

        if (groupId) basePayload.groupId = groupId;
        if (groupId && formData.userId) basePayload.userId = formData.userId;

        // Include initial balance datetime if supported
        if (formData.initialBalanceDateTime && typeof formData.initialBalanceDateTime.toDate === 'function') {
          basePayload.initialBalanceDate = (formData.initialBalanceDateTime as Dayjs).toDate();
        }

        // PREPAID: include subcategory id
        if (formData.type === 'PREPAID' && formData.prepaidSubcategoryId) {
          basePayload.subcategoryId = formData.prepaidSubcategoryId;
        }

        // CREDIT: include due day and debit method
        if (formData.type === 'CREDIT') {
          if (formData.creditDueDay) {
            basePayload.creditDueDay = formData.creditDueDay;
          }
          if (formData.creditClosingDay) {
            basePayload.creditClosingDay = formData.creditClosingDay;
          }
          if (formData.debitMethod) {
            basePayload.debitMethod = formData.debitMethod;
          }
          // If invoice debit method, allow category/subcategory to be set for invoice accounting
          if (formData.debitMethod === 'INVOICE' && formData.prepaidSubcategoryId) {
            basePayload.subcategoryId = formData.prepaidSubcategoryId;
          }
        }

        await accountService.create(basePayload);
        toast.success('Conta criada com sucesso!');
      }
      setShowModal(false);
      resetForm();
      loadAccounts();
    } catch (error) {
      console.error('Failed to save account:', error);
      toast.error('Erro ao salvar conta');
    }
  };

  const handleBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId) return;

    try {
      await accountService.addBalance({
        accountId: selectedAccountId,
        amount: balanceFormData.amount,
        date: balanceFormData.dateTime.toDate(),
      });
      toast.success('Saldo atualizado com sucesso!');
      setShowBalanceModal(false);
      resetBalanceForm();
      loadAccounts();
    } catch (error) {
      console.error('Failed to update balance:', error);
      toast.error('Erro ao atualizar saldo');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const count = await accountService.getTransactionCount(id);
      if (count === 0) {
        if (!confirm('Tem certeza que deseja excluir esta conta?')) return;
        await accountService.delete(id);
        toast.success('Conta excluída com sucesso!');
        loadAccounts();
        return;
      }

      // Has transactions -> show modal with options
      const acc = accounts.find(a => a.id === id) || null;
      setAccountToDelete(acc);
      setDeleteTxCount(count);
      setDeleteTargetAccountId(null);
      setShowDeleteModal(true);
    } catch (error) {
      console.error('Failed to delete account:', error);
      toast.error('Erro ao excluir conta');
    }
  };

  const performForceDelete = async () => {
    if (!accountToDelete) return;
    try {
      await accountService.deleteWithForce(accountToDelete.id);
      toast.success('Conta e transações excluídas com sucesso!');
      setShowDeleteModal(false);
      setAccountToDelete(null);
      loadAccounts();
    } catch (error) {
      console.error('Failed to force delete account:', error);
      toast.error('Erro ao excluir conta');
    }
  };

  const performMoveAndDelete = async () => {
    if (!accountToDelete || !deleteTargetAccountId) {
      toast.error('Selecione uma conta destino para mover as transações');
      return;
    }
    try {
      await accountService.moveTransactions(accountToDelete.id, deleteTargetAccountId);
      // After moving, delete account (no need to force but use force to ensure clean deletion)
      await accountService.deleteWithForce(accountToDelete.id);
      toast.success('Transações movidas e conta excluída com sucesso!');
      setShowDeleteModal(false);
      setAccountToDelete(null);
      loadAccounts();
    } catch (error) {
      console.error('Failed to move transactions and delete account:', error);
      toast.error('Erro ao mover transações ou excluir conta');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'CASH',
      initialBalance: '0,00',
      initialBalanceDateTime: createInUserTimezone(),
      userId: currentUserId || undefined,
      prepaidCategoryId: undefined,
      prepaidSubcategoryId: undefined,
      creditDueDay: 1,
      creditClosingDay: 1,
      debitMethod: 'INVOICE',
    });
    setEditingAccount(null);
  };

  const resetBalanceForm = () => {
    setBalanceFormData({
      amount: 0,
      dateTime: createInUserTimezone(),
    });
    setSelectedAccountId(null);
  };

  const openEditModal = (account: Account) => {
    setEditingAccount(account);
    // Determine prepaid category from account.subcategoryId (if any)
    let prepaidCategoryId: number | undefined = undefined;
    if (account.subcategoryId) {
      const found = subcategories.find(s => s.id === account.subcategoryId);
      if (found) prepaidCategoryId = found.categoryId;
    }

    setFormData({
      name: account.name,
      type: account.type,
      initialBalance: '0,00',
      initialBalanceDateTime: createInUserTimezone(),
      userId: account.userId,
      prepaidCategoryId: prepaidCategoryId,
      prepaidSubcategoryId: account.subcategoryId ?? undefined,
      creditDueDay: account.creditDueDay ?? 1,
      creditClosingDay: account.creditClosingDay ?? 1,
      debitMethod: account.debitMethod ?? 'INVOICE',
    });
    setShowModal(true);
  };

  const openBalanceModal = (accountId: number) => {
    const currentBalance = balances[accountId];
    setSelectedAccountId(accountId);
    setBalanceFormData({
      amount: currentBalance?.amount || 0,
      dateTime: createInUserTimezone(),
    });
    setShowBalanceModal(true);
  };

  const getAccountIcon = (type: AccountType) => {
    switch (type) {
      case 'CREDIT':
        return <CreditCard className="w-6 h-6" />;
      case 'CASH':
        return <DollarSign className="w-6 h-6" />;
      case 'PREPAID':
        return <Wallet className="w-6 h-6" />;
      default:
        return <Wallet className="w-6 h-6" />;
    }
  };

  const getAccountTypeLabel = (type: AccountType) => {
    switch (type) {
      case 'CREDIT':
        return 'Crédito';
      case 'CASH':
        return 'Dinheiro';
      case 'PREPAID':
        return 'Pré-pago';
      default:
        return type;
    }
  };

  const getAccountTypeEmoji = (type: AccountType) => {
    switch (type) {
      case 'CREDIT':
        return '💳';
      case 'CASH':
        return '💵';
      case 'PREPAID':
        return '💰';
      default:
        return '🏦';
    }
  };

  if (!canView) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200">
            Você não tem permissão para visualizar as contas{groupId ? ' deste grupo' : ''}.
          </p>
        </div>
      </div>
    );
  }

  const showCreateButton = groupId ? (canManageOwn || canManageAll) : canManage;

  const muiTheme = createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
      primary: {
        main: isDarkMode ? '#ffffffff' : '#000000ff',
      },
    },
  });


  return (
    <div className="p-6 max-w-7xl mx-auto pb-24">
      <div className="mb-6 relative">
        <div className="absolute top-0 right-0 flex items-center gap-2">
          <button
            onClick={handleInfoClick}
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Ajuda sobre tipos de conta"
          >
            <Info size={18} />
          </button>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Configurações"
          >
            <Settings size={18} />
          </button>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {title || 'Minhas Contas'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Gerencie suas contas e acompanhe seus saldos
        </p>
      </div>

      <Popover
        open={infoOpen}
        anchorEl={infoAnchorEl}
        onClose={handleInfoClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <div style={{ padding: 12, maxWidth: 340, whiteSpace: 'pre-line' }}>
          <strong>Tipos de conta</strong>
          <div style={{ marginTop: 8 }}>
            {/* Dinheiro (padrão): gastos e ganhos são registrados imediatamente, no momento em que acontecem.
Crédito: você pode escolher se os gastos serão contabilizados conforme as compras acontecem ou apenas quando a fatura for paga.
Pré-pago: o valor é descontado ao transferir dinheiro para a conta; as transações de gasto não entram no total de gastos. */}
            Dinheiro (padrão): gastos e ganhos são descontados imediatamente.
          </div>
          <div style={{ marginTop: 8 }}>
            Crédito: Os gastos podem ser contabilizados conforme as compras acontecem ou apenas quando a fatura for paga.
          </div>
          <div style={{ marginTop: 8 }}>
            Pré-pago: O valor é descontado ao transferir dinheiro para a conta.
          </div>
        </div>
      </Popover>

      {/* Settings modal (placeholder) */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Configurações</h3>
              <button onClick={() => setShowSettingsModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <X size={18} />
              </button>
            </div>
            <p className="text-gray-600 dark:text-gray-400">Configurações da conta — implementação futura.</p>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setShowSettingsModal(false)} className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Carregando contas...</p>
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Nenhuma conta cadastrada
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Comece criando sua primeira conta para gerenciar seu dinheiro
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((account) => {
            const balance = balances[account.id];
            const canEdit = canEditAccount(account);

            // Buscar nome do dono
            let ownerFirstName = '';
            if (groupId) {
              const owner = groupMembers.find(m => m.userId === account.userId);
              ownerFirstName = owner?.user?.firstName || '';
            }
            return (
              <div
                key={account.id}
                onClick={(e) => {
                  // avoid navigating when clicking action buttons
                  if ((e.target as HTMLElement).closest('button')) return;
                  if (groupId) {
                    router.push(`/groups/${groupId}/accounts/${account.id}/history`);
                  } else {
                    router.push(`/accounts/${account.id}/history`);
                  }
                }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{getAccountTypeEmoji(account.type)}</div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {account.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {getAccountTypeLabel(account.type)}
                      </p>
                      {groupId && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Dono: {ownerFirstName}
                        </p>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(account)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                        title="Editar conta"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(account.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Excluir conta"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Saldo Atual</span>
                    {canEdit && (
                      <button
                        onClick={() => openBalanceModal(account.id)}
                        className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Atualizar
                      </button>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    R$ {balance?.amount?.toFixed(2) || '0.00'}
                  </div>
                  {balance && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Atualizado em {new Date(balance.date).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Add Button */}
      {showCreateButton && (
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="fixed bottom-6 right-6 z-40 p-4 bg-blue-600 dark:bg-blue-700 text-white rounded-full shadow-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-all hover:scale-110 active:scale-95"
          title="Criar nova conta"
        >
          <Plus size={24} />
        </button>
      )}

      {/* Create/Edit Account Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur">
              <div className="flex items-center justify-between mb-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingAccount ? 'Editar Conta' : 'Nova Conta'}
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="p-6 overflow-y-auto">
              <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                <ThemeProvider theme={muiTheme}>
                  <FormControl fullWidth required margin="normal">
                    <TextField
                      label="Nome da Conta"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Carteira, Nubank, Conta Corrente"
                      required
                      focused
                    />
                  </FormControl>

                  <FormControl focused fullWidth required margin="normal">
                    <InputLabel id="account-type-label">Tipo de Conta</InputLabel>
                    <Select
                      labelId="account-type-label"
                      value={formData.type}
                      label="Tipo de Conta"
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as AccountType })}
                    >
                      <MenuItem value="CASH">💵 Dinheiro</MenuItem>
                      <MenuItem value="CREDIT">💳 Crédito</MenuItem>
                      <MenuItem value="PREPAID">💰 Pré-pago</MenuItem>
                    </Select>
                  </FormControl>

                  {formData.type === 'CREDIT' && (
                    <>
                      <FormControl focused fullWidth required margin="normal">
                        <InputLabel id="debit-method-label">Forma de débito</InputLabel>
                        <Select
                          labelId="debit-method-label"
                          value={formData.debitMethod}
                          label="Forma de débito"
                          onChange={e => setFormData({ ...formData, debitMethod: String(e.target.value) })}
                        >
                          <MenuItem value="INVOICE">Débito no pagamento da fatura</MenuItem>
                          <MenuItem value="PER_PURCHASE">Débito em cada compra</MenuItem>
                        </Select>
                      </FormControl>

                      <div className="grid grid-cols-2 gap-3">
                        <FormControl fullWidth required margin="normal">
                          <TextField
                            label="Dia de Fechamento da Fatura"
                            type="number"
                            slotProps={{ htmlInput: { min: 1, max: 31 } }}
                            value={formData.creditClosingDay ?? ''}
                            onChange={(e) => {
                              const v = e.target.value ? Number(e.target.value) : undefined;
                              const clamped = v ? Math.max(1, Math.min(31, v)) : undefined;
                              setFormData({ ...formData, creditClosingDay: clamped });
                            }}
                            placeholder="1"
                            required
                            focused
                          />
                        </FormControl>

                        <FormControl fullWidth required margin="normal">
                          <TextField
                            label="Dia de Vencimento da Fatura"
                            type="number"
                            slotProps={{ htmlInput: { min: 1, max: 31 } }}
                            value={formData.creditDueDay ?? ''}
                            onChange={(e) => {
                              const v = e.target.value ? Number(e.target.value) : undefined;
                              const clamped = v ? Math.max(1, Math.min(31, v)) : undefined;
                              setFormData({ ...formData, creditDueDay: clamped });
                            }}
                            placeholder="1"
                            required
                            focused
                          />
                        </FormControl>
                      </div>
                    </>
                  )}

                  {/* Conditional fields based on account type */}
                  {(formData.type === 'PREPAID' || (formData.type === 'CREDIT' && formData.debitMethod === 'INVOICE')) && (
                    <div className="grid grid-cols-2 gap-2">
                      <FormControl focused fullWidth required margin="normal">
                        <InputLabel id="prepaid-category-label">{formData.type === 'PREPAID' ? 'Categoria (Pré-pago)' : 'Categoria (Fatura)'}</InputLabel>
                        <Select
                          labelId="prepaid-category-label"
                          value={formData.prepaidCategoryId ?? ''}
                          label={formData.type === 'PREPAID' ? 'Categoria (Pré-pago)' : 'Categoria (Fatura)'}
                          onChange={(e) => {
                            const val = e.target.value ? Number(e.target.value) : undefined;
                            setFormData({ ...formData, prepaidCategoryId: val, prepaidSubcategoryId: undefined });
                          }}
                        >
                          <MenuItem value="">-- Escolha uma categoria --</MenuItem>
                          {categories.map(c => (
                            <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl focused fullWidth required margin="normal" disabled={!formData.prepaidCategoryId}>
                        <InputLabel id="prepaid-subcategory-label">{formData.type === 'PREPAID' ? 'Subcategoria (Pré-pago)' : 'Subcategoria (Fatura)'}</InputLabel>
                        <Select
                          labelId="prepaid-subcategory-label"
                          value={formData.prepaidSubcategoryId ?? ''}
                          label={formData.type === 'PREPAID' ? 'Subcategoria (Pré-pago)' : 'Subcategoria (Fatura)'}
                          onChange={(e) => setFormData({ ...formData, prepaidSubcategoryId: e.target.value ? Number(e.target.value) : undefined })}
                        >
                          <MenuItem value="">-- Escolha uma subcategoria --</MenuItem>
                          {subcategories
                            .filter(s => s.categoryId === (formData.prepaidCategoryId ?? 0))
                            .map(s => (
                              <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                            ))}
                        </Select>
                      </FormControl>
                    </div>
                  )}

                  {groupId && (
                    <FormControl focused fullWidth required margin="normal">
                      <InputLabel id="account-owner-label">Dono da Conta</InputLabel>
                      {canManageAll ? (
                        <Select
                          labelId="account-owner-label"
                          value={formData.userId ?? ''}
                          label="Dono da Conta"
                          onChange={e => setFormData({ ...formData, userId: Number(e.target.value) })}
                        // focused removido
                        >
                          {groupMembers.map(member => (
                            <MenuItem key={member.userId} value={member.userId}>
                              {member.user?.firstName ? `${member.user.firstName} ${member.user.lastName}` : member.user?.email}
                            </MenuItem>
                          ))}
                        </Select>
                      ) : (
                        <TextField
                          label="Dono da Conta"
                          value={groupMembers.find(m => m.userId === currentUserId)?.user?.firstName ? `${groupMembers.find(m => m.userId === currentUserId)?.user?.firstName} ${groupMembers.find(m => m.userId === currentUserId)?.user?.lastName}` : groupMembers.find(m => m.userId === currentUserId)?.user?.email || ''}
                          disabled
                          fullWidth
                          focused
                        />
                      )}
                    </FormControl>
                  )}

                  {!editingAccount && (
                    <FormControl focused fullWidth required margin="normal">
                      <TextField
                        label="Saldo Inicial"
                        type="text"
                        inputMode="numeric"
                        value={formData.initialBalance}
                        onChange={(e) => {
                          const raw = e.target.value || '';
                          const negative = raw.trim().startsWith('-');
                          const digits = raw.replace(/\D/g, '');
                          const cents = Number(digits || '0');
                          const formattedNumber = (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                          const formatted = negative ? `-${formattedNumber}` : formattedNumber;
                          setFormData({ ...formData, initialBalance: formatted });
                        }}
                        onKeyDown={(e) => {
                          const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
                          if (allowed.includes(e.key)) return;
                          if (e.key === '-' || e.key === 'Subtract') return;
                          if (!/^\d$/.test(e.key)) e.preventDefault();
                        }}
                        placeholder="0,00"
                        required
                        focused
                      />
                    </FormControl>
                  )}

                  {!editingAccount && (
                    <FormControl fullWidth required margin="normal">
                      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
                        <DateTimePicker
                          label="Data e Hora do Saldo Inicial"
                          value={formData.initialBalanceDateTime}
                          onChange={(newValue: Dayjs | null) => {
                            if (newValue) {
                              setFormData({ ...formData, initialBalanceDateTime: newValue });
                            }
                          }}
                          format="DD/MM/YYYY HH:mm"
                          ampm={false}
                          slotProps={{
                            textField: {
                              focused: true,
                              required: true,
                              fullWidth: true,
                            },
                          }}
                        />
                      </LocalizationProvider>
                    </FormControl>
                  )}

                </ThemeProvider>
              </form>
            </div>
            {/* Sticky footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 z-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => formRef.current?.requestSubmit()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingAccount ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )
      }

      {/* Update Balance Modal */}
      {
        showBalanceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Atualizar Saldo
                  </h3>
                  <button
                    onClick={() => {
                      setShowBalanceModal(false);
                      resetBalanceForm();
                    }}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <X size={20} />
                  </button>
                </div>


                <form onSubmit={handleBalanceSubmit} className="space-y-4">
                  <ThemeProvider theme={muiTheme}>
                    <FormControl focused fullWidth required margin="normal">
                      <TextField
                        label="Novo Saldo"
                        type="number"
                        value={balanceFormData.amount}
                        onChange={(e) => setBalanceFormData({ ...balanceFormData, amount: parseFloat(e.target.value) })}
                        placeholder="0.00"
                        required
                        focused
                      />
                    </FormControl>
                    <FormControl fullWidth required margin="normal">
                      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
                        <DateTimePicker
                          label="Data e Hora"
                          value={balanceFormData.dateTime}
                          onChange={(newValue: Dayjs | null) => {
                            if (newValue) {
                              setBalanceFormData({ ...balanceFormData, dateTime: newValue });
                            }
                          }}
                          format="DD/MM/YYYY HH:mm"
                          ampm={false}
                          slotProps={{
                            textField: {
                              focused: true,
                              required: true,
                              fullWidth: true,
                            },
                          }}
                        />
                      </LocalizationProvider>
                    </FormControl>
                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowBalanceModal(false);
                          resetBalanceForm();
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Atualizar
                      </button>
                    </div>
                  </ThemeProvider>
                </form>
              </div>
            </div>
          </div>
        )
      }
      {/* Delete Account Modal (move or delete transactions) */}
      {showDeleteModal && accountToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Conta possui transações vinculadas
                </h3>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setAccountToDelete(null);
                  }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <X size={20} />
                </button>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                A conta "{accountToDelete.name}" possui {deleteTxCount} transação(ões) vinculada(s).
                Você pode deletar todas as transações ou movê-las para outra conta.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Selecionar conta destino</label>
                  <select
                    value={deleteTargetAccountId ?? ''}
                    onChange={(e) => setDeleteTargetAccountId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full border rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">-- Escolha uma conta --</option>
                    {accounts.filter(a => a.id !== accountToDelete.id).map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({getAccountTypeLabel(a.type)})</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setAccountToDelete(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={performForceDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Deletar todas as transações
                  </button>
                  <button
                    type="button"
                    onClick={performMoveAndDelete}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Mover e deletar conta
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div >
  );
}
