"use client";

import React from 'react';
import { Celula } from '@/types';
import { FiX } from 'react-icons/fi';

interface CelulaViewModalProps {
  celula: Celula | null;
  isOpen: boolean;
  onClose: () => void;
  discipuladorName?: string;
  redeName?: string;
}

export default function CelulaViewModal({ celula, isOpen, onClose, discipuladorName, redeName }: CelulaViewModalProps) {
  if (!isOpen || !celula) return null;

  const getWeekdayLabel = (weekday?: number | null) => {
    if (weekday === null || weekday === undefined) return '-';
    const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    return days[weekday] || '-';
  };

  const formatTime = (time?: string | null) => {
    if (!time) return '-';
    return time;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">Visualizar Célula</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors"
            aria-label="Fechar"
          >
            <FiX className="h-6 w-6 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Basic Information */}
          <section>
            <h3 className="text-lg font-semibold mb-3 text-blue-400">Informações Básicas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-400">Nome da Célula</label>
                <p className="text-base mt-1 text-white">{celula.name}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-400">ID</label>
                <p className="text-base mt-1 text-white">{celula.id}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-400">Líder</label>
                <p className="text-base mt-1 text-white">{celula.leader?.name || '-'}</p>
              </div>
              
              {celula.leadersInTraining && celula.leadersInTraining.length > 0 && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-400">Líderes em Treinamento</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {celula.leadersInTraining.map((lit) => (
                      <span
                        key={lit.id}
                        className="px-3 py-1 bg-blue-900/30 text-blue-200 rounded-full text-sm"
                      >
                        {lit.member.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-gray-400">Dia da Semana</label>
                <p className="text-base mt-1 text-white">{getWeekdayLabel(celula.weekday)}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-400">Horário</label>
                <p className="text-base mt-1 text-white">{formatTime(celula.time)}</p>
              </div>
            </div>
          </section>

          {/* Hierarchy Information */}
          <section>
            <h3 className="text-lg font-semibold mb-3 text-blue-400">Hierarquia</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-400">Rede</label>
                <p className="text-base mt-1 text-white">{redeName || '-'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-400">Discipulador</label>
                <p className="text-base mt-1 text-white">{discipuladorName || '-'}</p>
              </div>
            </div>
          </section>

          {/* Address Information */}
          {(celula.street || celula.city || celula.state) && (
            <section>
              <h3 className="text-lg font-semibold mb-3 text-blue-400">Endereço</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {celula.country && (
                  <div>
                    <label className="text-sm font-medium text-gray-400">País</label>
                    <p className="text-base mt-1 text-white">{celula.country}</p>
                  </div>
                )}
                
                {celula.zipCode && (
                  <div>
                    <label className="text-sm font-medium text-gray-400">CEP</label>
                    <p className="text-base mt-1 text-white">{celula.zipCode}</p>
                  </div>
                )}
                
                {celula.street && (
                  <div>
                    <label className="text-sm font-medium text-gray-400">Rua</label>
                    <p className="text-base mt-1 text-white">{celula.street}</p>
                  </div>
                )}
                
                {celula.streetNumber && (
                  <div>
                    <label className="text-sm font-medium text-gray-400">Número</label>
                    <p className="text-base mt-1 text-white">{celula.streetNumber}</p>
                  </div>
                )}
                
                {celula.neighborhood && (
                  <div>
                    <label className="text-sm font-medium text-gray-400">Bairro</label>
                    <p className="text-base mt-1 text-white">{celula.neighborhood}</p>
                  </div>
                )}
                
                {celula.city && (
                  <div>
                    <label className="text-sm font-medium text-gray-400">Cidade</label>
                    <p className="text-base mt-1 text-white">{celula.city}</p>
                  </div>
                )}
                
                {celula.state && (
                  <div>
                    <label className="text-sm font-medium text-gray-400">Estado</label>
                    <p className="text-base mt-1 text-white">{celula.state}</p>
                  </div>
                )}
                
                {celula.complement && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-400">Complemento</label>
                    <p className="text-base mt-1 text-white">{celula.complement}</p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors text-white"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
