"use client";

import React from 'react';

type Props = {
  open: boolean;
  reportType: 'CELULA' | 'CULTO';
  date: string;
  onReplace: () => void;
  onOtherDate: () => void;
  onCancel: () => void;
};

export default function ReportReplaceModal({ open, reportType, date, onReplace, onOtherDate, onCancel }: Props) {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-60">
      <div className="bg-gray-900 p-6 rounded w-11/12 sm:w-96">
        <h4 className="font-semibold mb-2 text-white">Relatório já preenchido</h4>
        <div className="mb-4 text-sm text-gray-200">
          Já existe um relatório de {reportType === 'CELULA' ? 'célula' : 'culto'} para a data {date}. 
          O que deseja fazer?
        </div>
        <div className="flex flex-col gap-2">
          <button 
            onClick={onReplace} 
            className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Substituir relatório existente
          </button>
          <button 
            onClick={onOtherDate} 
            className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Escolher outra data
          </button>
          <button 
            onClick={onCancel} 
            className="w-full px-3 py-2 border border-gray-600 rounded hover:bg-gray-800"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
