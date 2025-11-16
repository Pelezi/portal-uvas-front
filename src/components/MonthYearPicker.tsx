'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface MonthYearPickerProps {
  year: number;
  month: number;
  onMonthYearChange: (year: number, month: number) => void;
}

export function MonthYearPicker({ year, month, onMonthYearChange }: MonthYearPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempYear, setTempYear] = useState(year);
  const [tempMonth, setTempMonth] = useState(month);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTempYear(year);
    setTempMonth(month);
  }, [year, month]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMonthChange = (direction: number) => {
    let newMonth = month + direction;
    let newYear = year;

    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }

    onMonthYearChange(newYear, newMonth);
  };

  const handleApply = () => {
    onMonthYearChange(tempYear, tempMonth);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempYear(year);
    setTempMonth(month);
    setIsOpen(false);
  };

  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(2000, i, 1);
    return {
      value: i + 1,
      label: date.toLocaleDateString('pt-BR', { month: 'long' })
    };
  });

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 21 }, (_, i) => currentYear + 10 - i);

  const displayText = new Date(year, month - 1).toLocaleDateString(
    'pt-BR',
    { month: 'long', year: 'numeric' }
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Main display bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-2">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => handleMonthChange(-1)}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft size={18} className="text-gray-700 dark:text-gray-300" />
          </button>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors flex-1 justify-center"
          >
            <Calendar size={16} className="text-gray-600 dark:text-gray-400" />
            <span className="font-medium text-sm text-gray-900 dark:text-gray-100 capitalize">
              {displayText}
            </span>
          </button>

          <button
            onClick={() => handleMonthChange(1)}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronRight size={18} className="text-gray-700 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {/* Dropdown picker */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 p-4">
          <div className="space-y-4">
            {/* Year selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ano
              </label>
              <select
                value={tempYear}
                onChange={(e) => setTempYear(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Month grid */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mês
              </label>
              <div className="grid grid-cols-3 gap-2">
                {months.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setTempMonth(m.value)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                      tempMonth === m.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {m.label.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleApply}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
