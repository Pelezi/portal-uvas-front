'use client';

import { useState, Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryService } from '@/services/categoryService';
import { subcategoryService } from '@/services/subcategoryService';
import { budgetService } from '@/services/budgetService';
import { transactionService } from '@/services/transactionService';
import { useAppStore } from '@/lib/store';
import { EntityType, Budget } from '@/types';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

interface BudgetGridProps {
  groupId?: number;
  canManage?: boolean;
  canView?: boolean;
  title?: string;
}

export default function BudgetGrid({
  groupId,
  canManage = true,
  canView = true,
  title = 'Planilha de Orçamento'
}: BudgetGridProps) {
  const queryClient = useQueryClient();
  const { selectedYear, setSelectedYear } = useAppStore();

  const [activeTab, setActiveTab] = useState<EntityType>('EXPENSE');
  const [editingCell, setEditingCell] = useState<{ subcategoryId: number; month: number } | null>(null);
  const [editValue, setEditValue] = useState('0,00');

  const centsToBRL = (cents: number) =>
    (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const brlMask = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    const cents = Number(digits || '0');
    return centsToBRL(cents);
  };

  const brlToCents = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits ? Number(digits) : 0;
  };

  const brlToNumber = (value: string) => brlToCents(value) / 100;

  const handleEditValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(brlMask(e.target.value));
  };

  const handleEditValueKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
    if (allowed.includes(e.key)) return;
    if (!/^\d$/.test(e.key)) e.preventDefault();
  };

  // Queries
  const { data: categories = [] } = useQuery({
    queryKey: ['categories', groupId],
    queryFn: () => categoryService.getAll(groupId),
    enabled: canView,
  });

  const { data: subcategories = [] } = useQuery({
    queryKey: ['subcategories', groupId],
    queryFn: () => subcategoryService.getAll(groupId),
    enabled: canView,
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets', selectedYear, groupId],
    queryFn: () => budgetService.getAll({ year: selectedYear.toString(), groupId }),
    enabled: canView,
  });

  const { data: aggregatedTransactions = [] } = useQuery({
    queryKey: ['transactions-aggregated', selectedYear, groupId],
    queryFn: () => transactionService.getAggregated(selectedYear, undefined, groupId),
    enabled: canView,
  });

  // Mutations
  const updateBudgetMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Budget> }) => budgetService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });

  const createBudgetMutation = useMutation({
    mutationFn: budgetService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });

  // Permission check
  if (!canView) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200">Você não tem permissão para visualizar o orçamento{groupId ? ' deste grupo' : ''}.</p>
        </div>
      </div>
    );
  }

  // Filter data
  const filteredCategories = categories.filter((cat) => cat.type === activeTab);
  const filteredSubcategories = subcategories.filter((sub) => sub.type === activeTab);

  // Helper functions
  const getBudget = (subcategoryId: number, month: number) => {
    return budgets.find(
      (budget) => budget.subcategoryId === subcategoryId && budget.month === month && budget.year === selectedYear
    );
  };

  const getActualAmount = (subcategoryId: number, month: number) => {
    if (groupId !== undefined) {
      // For groups, sum all transactions for this subcategory/month (may be multiple entries if group has multiple users)
      const total = aggregatedTransactions
        .filter((trans) => trans.subcategoryId === subcategoryId && trans.month === month && trans.year === selectedYear)
        .reduce((sum, trans) => sum + trans.total, 0);
      return total;
    } else {
      // For personal, there should be only one entry
      const transaction = aggregatedTransactions.find(
        (trans) => trans.subcategoryId === subcategoryId && trans.month === month && trans.year === selectedYear
      );
      return transaction?.total || 0;
    }
  };

  const getBudgetStatus = (budgeted: number, actual: number, type: EntityType = 'EXPENSE') => {
    if (budgeted == 0 && actual == 0) return '';    
    const percentage = (actual / (budgeted || 1)) * 100;
    if (type === 'INCOME') {
      if (percentage >= 100) return 'bg-green-200/40 dark:bg-green-900/40';
      if (percentage >= 85) return 'bg-yellow-200/40 dark:bg-yellow-900/40';
      return 'bg-red-200/40 dark:bg-red-900/40';
    } else {
      if (percentage <= 100) return 'bg-green-200/40 dark:bg-green-900/40';
      if (percentage < 120) return 'bg-yellow-200/40 dark:bg-yellow-900/40';
      return 'bg-red-200/40 dark:bg-red-900/40';
    }
  };

  const handleCellClick = (subcategoryId: number, month: number) => {
    if (!canManage) return;

    const budget = getBudget(subcategoryId, month);
    setEditingCell({ subcategoryId, month });

    // Show "X.XXX,YY" instead of raw number/string
    const initial = budget?.amount ?? 0;
    setEditValue(
      typeof initial === 'number'
        ? initial.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '0,00'
    );
  };


  const handleCellBlur = async () => {
    if (!editingCell) return;

    // Locale-safe parse:
    const value = brlToNumber(editValue); // "4.300,00" -> 4300
    const budget = getBudget(editingCell.subcategoryId, editingCell.month);
    const subcategory = subcategories.find((sub) => sub.id === editingCell.subcategoryId);
    if (!subcategory) return;

    if (budget) {
      await updateBudgetMutation.mutateAsync({ id: budget.id, data: { amount: value } });
    } else {
      await createBudgetMutation.mutateAsync({
        name: `${subcategory.name} - ${editingCell.month}/${selectedYear}`,
        subcategoryId: editingCell.subcategoryId,
        amount: value,
        month: editingCell.month,
        year: selectedYear,
        type: subcategory.type,
        groupId,
      });
    }

    setEditingCell(null);
    setEditValue('0,00');
  };


  const getCategoryTotal = (categoryId: number, month: number) => {
    const categorySubs = filteredSubcategories.filter((sub) => sub.categoryId === categoryId);
    return categorySubs.reduce((sum, sub) => {
      const budget = getBudget(sub.id, month);
      return sum + (budget?.amount || 0);
    }, 0);
  };

  const getMonthTotal = (month: number) => {
    return filteredSubcategories.reduce((sum, sub) => {
      const budget = getBudget(sub.id, month);
      return sum + (budget?.amount || 0);
    }, 0);
  };

  const getMonthActualTotal = (month: number) => {
    return filteredSubcategories.reduce((sum, sub) => {
      return sum + getActualAmount(sub.id, month);
    }, 0);
  };

  const getSubcategoryYearTotal = (subcategoryId: number) => {
    let total = 0;
    for (let month = 1; month <= 12; month++) {
      const budget = getBudget(subcategoryId, month);
      total += budget?.amount || 0;
    }
    return total;
  };

  const getSubcategoryAverage = (subcategoryId: number) => {
    const total = getSubcategoryYearTotal(subcategoryId);
    return total / 12;
  };

  const getSubcategoryActualTotal = (subcategoryId: number) => {
    let total = 0;
    for (let month = 1; month <= 12; month++) {
      total += getActualAmount(subcategoryId, month);
    }
    return total;
  };

  const getSubcategoryActualAverage = (subcategoryId: number) => {
    const total = getSubcategoryActualTotal(subcategoryId);
    return total / 12;
  };

  const getCategoryActualTotal = (categoryId: number) => {
    const categorySubs = filteredSubcategories.filter((sub) => sub.categoryId === categoryId);
    return categorySubs.reduce((sum, sub) => sum + getSubcategoryActualTotal(sub.id), 0);
  };

  const getCategoryActualForMonth = (categoryId: number, month: number) => {
    const categorySubs = filteredSubcategories.filter((sub) => sub.categoryId === categoryId);
    return categorySubs.reduce((sum, sub) => sum + getActualAmount(sub.id, month), 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>

        {/* Year Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedYear(selectedYear - 1)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-900 dark:text-gray-100"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100">
            <Calendar size={20} />
            <span className="font-medium">{selectedYear}</span>
          </div>
          <button
            onClick={() => setSelectedYear(selectedYear + 1)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-900 dark:text-gray-100"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('EXPENSE')}
          className={`px-4 py-2 font-medium ${activeTab === 'EXPENSE'
            ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
            : 'text-gray-800 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
        >
          Despesa
        </button>
        <button
          onClick={() => setActiveTab('INCOME')}
          className={`px-4 py-2 font-medium ${activeTab === 'INCOME'
            ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
            : 'text-gray-800 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
        >
          Renda
        </button>
      </div>

      {/* Budget Spreadsheet */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700">
              <th className="sticky left-0 bg-gray-50 dark:bg-gray-700 px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase border-r border-gray-200 dark:border-gray-600 w-40">
                Categoria
              </th>
              {MONTHS.map((month) => (
                <th
                  key={month}
                  className="px-2 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase border-r border-gray-200 dark:border-gray-600 min-w-[100px]"
                >
                  {month}
                </th>
              ))}
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase border-r border-gray-200 dark:border-gray-600 min-w-[100px]">
                Total
              </th>
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase min-w-[100px]">
                Média
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredCategories.map((category) => {
              const categorySubs = filteredSubcategories.filter(
                (sub) => sub.categoryId === category.id
              );
              if (categorySubs.length === 0) return null;

              return (
                <Fragment key={category.id}>
                  {/* Category Row */}
                  <tr className="bg-blue-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-600">
                    <td className="sticky left-0 bg-blue-50 dark:bg-gray-900 px-2 py-1.5 font-semibold text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600 break-words whitespace-pre-line max-w-[120px]">
                      {category.name}
                    </td>
                    {MONTHS.map((_, index) => {
                      const total = getCategoryTotal(category.id, index + 1);
                      const actualTotal = getCategoryActualForMonth(category.id, index + 1);
                      const status = getBudgetStatus(total, actualTotal, category.type);
                      return (
                        <td
                          key={index}
                          className={`px-2 py-1.5 text-center font-medium text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600 ${status}`}
                        >
                          <div>${total.toFixed(2)}</div>
                          {actualTotal > 0 && (
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              ${actualTotal.toFixed(2)}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className={`px-2 py-1.5 text-center font-semibold text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600 ${getCategoryActualTotal(category.id) > 0
                      ? getBudgetStatus(
                        categorySubs.reduce((sum, sub) => sum + getSubcategoryYearTotal(sub.id), 0),
                        getCategoryActualTotal(category.id),
                        category.type
                      )
                      : ''
                      }`}>
                      <div>
                        $
                        {categorySubs
                          .reduce((sum, sub) => sum + getSubcategoryYearTotal(sub.id), 0)
                          .toFixed(2)}
                      </div>
                      {getCategoryActualTotal(category.id) > 0 && (
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          ${getCategoryActualTotal(category.id).toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-center font-semibold text-gray-900 dark:text-gray-100">
                      <div className="font-semibold">
                        $
                        {(categorySubs
                          .reduce((sum, sub) => sum + getSubcategoryYearTotal(sub.id), 0) / 12)
                          .toFixed(2)}
                      </div>
                      {getCategoryActualTotal(category.id) > 0 && (
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          ${(getCategoryActualTotal(category.id) / 12).toFixed(2)}
                        </div>
                      )}
                    </td>
                  </tr>

                  {/* Subcategory Rows */}
                  {categorySubs.map((subcategory) => (
                    <tr key={subcategory.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="sticky left-0 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 px-2 py-1.5 pl-6 text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600 break-words whitespace-pre-line max-w-[120px]">
                        {subcategory.name}
                      </td>
                      {MONTHS.map((_, index) => {
                        const month = index + 1;
                        const budget = getBudget(subcategory.id, month);
                        const budgeted = budget?.amount || 0;
                        const actual = getActualAmount(subcategory.id, month);
                        const isEditing =
                          editingCell?.subcategoryId === subcategory.id &&
                          editingCell?.month === month;
                        const status = getBudgetStatus(budgeted, actual, subcategory.type);

                        return (
                          <td
                            key={index}
                            className={`px-1.5 py-1.5 text-center border-r border-gray-200 dark:border-gray-600 ${status}`}
                            onClick={() => !isEditing && handleCellClick(subcategory.id, month)}
                            title={`Budgeted: $${budgeted.toFixed(2)}, Actual: $${actual.toFixed(2)}`}
                          >
                            {isEditing ? (
                              <input
                                type="text"
                                inputMode="numeric"
                                value={editValue}
                                onChange={handleEditValueChange}
                                onBlur={handleCellBlur}
                                onKeyDown={(e) => {
                                  handleEditValueKeyDown(e);
                                  if (e.key === 'Enter') handleCellBlur();
                                  if (e.key === 'Escape') {
                                    setEditingCell(null);
                                    setEditValue('0,00');
                                  }
                                }}
                                autoFocus
                                className="w-full px-1.5 py-0.5 text-sm text-center border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              />
                            ) : (
                              <div className={canManage ? 'cursor-pointer hover:bg-opacity-80' : ''}>
                                <div className="font-medium text-gray-900 dark:text-gray-100">${budgeted.toFixed(2)}</div>
                                {actual > 0 && (
                                  <div className="text-xs text-gray-600 dark:text-gray-400">
                                    ${actual.toFixed(2)}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-2 py-1.5 text-center font-medium text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600">
                        ${getSubcategoryYearTotal(subcategory.id).toFixed(2)}
                      </td>
                      <td className="px-2 py-1.5 text-center font-medium text-gray-900 dark:text-gray-100">
                        <div className="font-medium">${getSubcategoryAverage(subcategory.id).toFixed(2)}</div>
                        {getSubcategoryActualTotal(subcategory.id) > 0 && (
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            ${getSubcategoryActualAverage(subcategory.id).toFixed(2)}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              );
            })}

            {/* Total Row */}
            <tr className="bg-gray-100 dark:bg-gray-700 border-t-2 border-gray-300 dark:border-gray-600 font-semibold">
              <td className="sticky left-0 bg-gray-100 dark:bg-gray-700 px-2 py-2 text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600">
                Total
              </td>
              {MONTHS.map((_, index) => {
                const total = getMonthTotal(index + 1);
                const actualTotal = getMonthActualTotal(index + 1);
                const status = getBudgetStatus(total, actualTotal, activeTab);
                return (
                  <td key={index} className={`px-2 py-2 text-center text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600 ${status}`}>
                    <div>${total.toFixed(2)}</div>
                    {actualTotal > 0 && (
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        ${actualTotal.toFixed(2)}
                      </div>
                    )}
                  </td>
                );
              })}
              <td className={`px-2 py-2 text-center text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600 ${MONTHS.some((_, index) => getMonthActualTotal(index + 1) > 0)
                ? getBudgetStatus(
                  MONTHS.reduce((sum, _, index) => sum + getMonthTotal(index + 1), 0),
                  MONTHS.reduce((sum, _, index) => sum + getMonthActualTotal(index + 1), 0),
                  activeTab
                )
                : ''
                }`}>
                <div>
                  $
                  {MONTHS.reduce((sum, _, index) => sum + getMonthTotal(index + 1), 0).toFixed(2)}
                </div>
                {MONTHS.some((_, index) => getMonthActualTotal(index + 1) > 0) && (
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    ${MONTHS.reduce((sum, _, index) => sum + getMonthActualTotal(index + 1), 0).toFixed(2)}
                  </div>
                )}
              </td>
              <td className="px-2 py-2 text-center text-gray-900 dark:text-gray-100">
                <div className="font-semibold">
                  $
                  {(MONTHS.reduce((sum, _, index) => sum + getMonthTotal(index + 1), 0) / 12).toFixed(2)}
                </div>
                {MONTHS.some((_, index) => getMonthActualTotal(index + 1) > 0) && (
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    ${(MONTHS.reduce((sum, _, index) => sum + getMonthActualTotal(index + 1), 0) / 12).toFixed(2)}
                  </div>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex gap-4 items-center text-sm text-gray-900 dark:text-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-200 dark:bg-green-900 border border-green-300 dark:border-green-700 rounded"></div>
          <span className="font-medium">Dentro do orçamento</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-200 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 rounded"></div>
          <span className="font-medium">Próximo ao limite</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-200 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded"></div>
          <span className="font-medium">Acima do orçamento</span>
        </div>
      </div>
    </div>
  );
}
