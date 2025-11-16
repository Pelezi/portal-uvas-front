'use client';

import { X } from 'lucide-react';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: {
    type: string;
    categoryId?: number;
    subcategoryId?: number;
    accountId?: number;
  };
  onFiltersChange: (filters: {
    type: string;
    categoryId?: number;
    subcategoryId?: number;
    accountId?: number;
  }) => void;
  accounts: Array<{ id: number; name: string }>;
  categories: Array<{ id: number; name: string; type: string }>;
  subcategories: Array<{ id: number; name: string; categoryId: number; type: string }>;
    showCategoryFilter?: boolean;
}

export function TransactionFilterModal({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  categories,
  subcategories,
  accounts,
  showCategoryFilter = true,
}: FilterModalProps) {

  if (!isOpen) return null;

  const filteredSubcategories = subcategories.filter(
    (sub) =>
      (!filters.type || sub.type === filters.type) &&
      (!filters.categoryId || sub.categoryId === filters.categoryId)
  );

  const handleTypeChange = (type: string) => {
    onFiltersChange({
      ...filters,
      type,
      categoryId: undefined,
      subcategoryId: undefined,
    });
  };

  const handleCategoryChange = (categoryId: number | undefined) => {
    onFiltersChange({
      ...filters,
      categoryId,
      subcategoryId: undefined,
    });
  };

  const handleSubcategoryChange = (subcategoryId: number | undefined) => {
    onFiltersChange({
      ...filters,
      subcategoryId,
    });
  };

  const handleAccountChange = (accountId: number | undefined) => {
    onFiltersChange({
      ...filters,
      accountId,
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      type: '',
      categoryId: undefined,
      subcategoryId: undefined,
      accountId: undefined,
    });
  };

  const hasActiveFilters = filters.type || filters.categoryId || filters.subcategoryId || filters.accountId;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Filtrar
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Type filter */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Filtrar por Tipo
            </label>
            <select
              value={filters.type}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os Tipos</option>
              <option value="EXPENSE">Despesa</option>
              <option value="INCOME">Renda</option>
            </select>
          </div>

          {/* Account filter - move above category */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Filtrar por Conta
            </label>
            <select
              value={filters.accountId || ''}
              onChange={(e) => handleAccountChange(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas as Contas</option>
              {accounts.map((acc: { id: number; name: string }) => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>

          {/* Category filter - only show if enabled */}
          {showCategoryFilter && (
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Filtrar por Categoria
              </label>
              <select
                value={filters.categoryId || ''}
                onChange={(e) =>
                  handleCategoryChange(e.target.value ? Number(e.target.value) : undefined)
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas as Categorias</option>
                {categories
                  .filter((cat) => !filters.type || cat.type === filters.type)
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Subcategory filter */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Filtrar por Subcategoria
            </label>
            <select
              value={filters.subcategoryId || ''}
              onChange={(e) =>
                handleSubcategoryChange(e.target.value ? Number(e.target.value) : undefined)
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas as Subcategorias</option>
              {filteredSubcategories.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Limpar
            </button>
          )}
          <button
            onClick={() => {
              onFiltersChange(filters);
              onClose();
            }}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Aplicar
          </button>
        </div>
      </div>
    </>
  );
}
