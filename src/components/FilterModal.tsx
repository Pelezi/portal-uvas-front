import React from 'react';
import { FiX } from 'react-icons/fi';
import { Switch, FormControlLabel } from '@mui/material';

export type FilterConfig = {
  type: 'select' | 'checkbox' | 'switch';
  label: string;
  value: any;
  onChange: (value: any) => void;
  options?: { value: any; label: string }[];
  renderCustom?: () => React.ReactNode;
  switchLabelOff?: string;  // Label quando switch está desligado (à esquerda)
  switchLabelOn?: string;   // Label quando switch está ligado (à direita)
  inline?: boolean;  // Se true, renderiza inline com o próximo filtro
};

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  onClear: () => void;
  filters: FilterConfig[];
  hasActiveFilters?: boolean;
}

export default function FilterModal({ 
  isOpen, 
  onClose, 
  onApply, 
  onClear, 
  filters,
  hasActiveFilters = false 
}: FilterModalProps) {
  if (!isOpen) return null;

  const handleApply = () => {
    onApply();
    onClose();
  };

  const handleClear = () => {
    onClear();
    onClose();
  };

  const renderFilter = (filter: FilterConfig) => (
    <>
      {filter.type !== 'switch' && (
        <label className="block mb-2 text-sm font-medium">{filter.label}</label>
      )}
      
      {filter.renderCustom ? (
        filter.renderCustom()
      ) : filter.type === 'select' && filter.options ? (
        <select
          value={filter.value ?? ''}
          onChange={(e) => {
            const val = e.target.value === '' ? null : 
                       e.target.value === '0' ? 0 :
                       isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value);
            filter.onChange(val);
          }}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos</option>
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : filter.type === 'checkbox' ? (
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!filter.value}
            onChange={(e) => filter.onChange(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm">{filter.label}</span>
        </label>
      ) : filter.type === 'switch' ? (
        <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
          <span className="text-sm font-medium">{filter.switchLabelOff || 'Off'}</span>
          <Switch
            checked={!!filter.value}
            onChange={(e) => filter.onChange(e.target.checked)}
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': {
                color: '#3b82f6',
              },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                backgroundColor: '#3b82f6',
              },
            }}
          />
          <span className="text-sm font-medium">{filter.switchLabelOn || 'On'}</span>
        </div>
      ) : null}
    </>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Filtros</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Fechar"
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          {filters.map((filter, index) => {
            // Skip if previous filter was inline and this is the second one
            if (index > 0 && filters[index - 1].inline) {
              return null;
            }

            // Check if this and next filter should be inline
            const isInline = filter.inline && index < filters.length - 1;
            const nextFilter = isInline ? filters[index + 1] : null;

            return (
              <div key={index}>
                {isInline && nextFilter ? (
                  <div className="flex gap-3">
                    <div className="flex-1">
                      {renderFilter(filter)}
                    </div>
                    <div className="flex-1">
                      {renderFilter(nextFilter)}
                    </div>
                  </div>
                ) : (
                  renderFilter(filter)
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={handleClear}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
          >
            Limpar Filtros
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}
