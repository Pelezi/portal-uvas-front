"use client";

import React from 'react';
import { FiEdit2, FiChevronRight } from 'react-icons/fi';
import Collapse from '@/components/Collapse';

type Props = {
  isOpen?: boolean;
  onToggle?: () => void;
  onEdit?: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  duration?: number;
  right?: React.ReactNode;
};

export default function CollapsibleItem({ isOpen, onToggle, onEdit, title, subtitle, children, className, duration = 250, right }: Props) {
  return (
    <div className={className}>
      <div className="cursor-pointer flex items-center justify-between" onClick={onToggle}>
        <div className="flex-1 flex flex-col justify-center">
          <div className="font-medium">{title}</div>
          {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
        </div>

        <div className="flex items-center gap-2">
          {right}
          {onEdit && (
            <button onClick={(e) => { e.stopPropagation(); onEdit(); }} aria-label="Editar" className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
              <FiEdit2 className="h-4 w-4 text-blue-600" aria-hidden />
            </button>
          )}
          <FiChevronRight className={`h-5 w-5 transform transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} aria-hidden />
        </div>
      </div>

      <Collapse isOpen={!!isOpen} className="mt-2 pl-4" duration={duration}>
        {children}
      </Collapse>
    </div>
  );
}
