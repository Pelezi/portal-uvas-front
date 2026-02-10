"use client";

import React, { useState, useEffect } from 'react';
import { Member } from '@/types';
import { formatPhoneForDisplay } from '@/lib/phoneUtils';
import { memberService } from '@/services/memberService';
import { membersService } from '@/services/membersService';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { FiSearch, FiUserPlus, FiX, FiAlertCircle } from 'react-icons/fi';

interface AddMemberChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateNew: () => void;
  onAddExisting: (memberId: number) => Promise<void>;
  currentCelulaId: number | null;
}

export default function AddMemberChoiceModal({
  isOpen,
  onClose,
  onCreateNew,
  onAddExisting,
  currentCelulaId,
}: AddMemberChoiceModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'choice' | 'search'>('choice');
  const [searchQuery, setSearchQuery] = useState('');
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningType, setWarningType] = useState<'celula' | 'hierarchy'>('celula');

  useEffect(() => {
    if (isOpen && step === 'search') {
      loadAllMembers();
    }
  }, [isOpen, step]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = allMembers.filter((m) =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.phone?.includes(searchQuery)
      );
      setFilteredMembers(filtered);
    } else {
      setFilteredMembers(allMembers);
    }
  }, [searchQuery, allMembers]);

  const loadAllMembers = async () => {
    setLoading(true);
    try {
      const members = await memberService.list();
      setAllMembers(members);
      setFilteredMembers(members);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar membros');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMember = (member: Member) => {
    setSelectedMember(member);
    
    // Verificar se o membro tem cargo ministerial maior que Líder
    // Tipos com prioridade menor que LEADER (4): PRESIDENT_PASTOR (1), PASTOR (2), DISCIPULADOR (3)
    const memberMinistryType = member.ministryPosition?.type;
    const higherThanLeader = ['PRESIDENT_PASTOR', 'PASTOR', 'DISCIPULADOR'];
    
    if (memberMinistryType && higherThanLeader.includes(memberMinistryType)) {
      setWarningType('hierarchy');
      setShowWarning(true);
      return;
    }
    
    // Verificar se o membro já está em uma célula
    if (member.celulaId && member.celulaId !== currentCelulaId) {
      setWarningType('celula');
      setShowWarning(true);
    } else {
      // Membro não está em célula ou está na mesma célula, pode adicionar
      confirmAddMember(member);
    }
  };

  const confirmAddMember = async (member: Member) => {
    try {
      setLoading(true);
      await onAddExisting(member.id);
      toast.success(`${member.name} adicionado(a) à célula`);
      handleClose();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao adicionar membro');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('choice');
    setSearchQuery('');
    setSelectedMember(null);
    setShowWarning(false);
    setWarningType('celula');
    onClose();
  };

  const handleChoiceClick = (choice: 'new' | 'existing') => {
    if (choice === 'new') {
      handleClose();
      onCreateNew();
    } else {
      setStep('search');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={handleClose}>
      <div
        className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-gray-100">
            {step === 'choice' ? 'Adicionar Membro' : 'Buscar Membro Existente'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-200"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'choice' && !showWarning && (
            <div className="space-y-4">
              <p className="text-gray-400 mb-6">
                Como deseja adicionar o membro?
              </p>
              
              <button
                onClick={() => handleChoiceClick('existing')}
                className="w-full flex items-center gap-4 p-4 border-2 border-gray-600 rounded-lg hover:border-blue-400 hover:bg-blue-900/20 transition-colors"
              >
                <FiSearch className="text-blue-400" size={24} />
                <div className="text-left">
                  <div className="font-semibold text-gray-100">
                    Adicionar pessoa existente
                  </div>
                  <div className="text-sm text-gray-400">
                    Buscar por alguém já cadastrado no sistema
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleChoiceClick('new')}
                className="w-full flex items-center gap-4 p-4 border-2 border-gray-600 rounded-lg hover:border-green-400 hover:bg-green-900/20 transition-colors"
              >
                <FiUserPlus className="text-green-400" size={24} />
                <div className="text-left">
                  <div className="font-semibold text-gray-100">
                    Criar nova pessoa
                  </div>
                  <div className="text-sm text-gray-400">
                    Cadastrar uma pessoa que ainda não está no sistema
                  </div>
                </div>
              </button>
            </div>
          )}

          {step === 'search' && !showWarning && (
            <div className="space-y-4">
              {/* Search input */}
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar por nome, email ou telefone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 focus:ring-2 focus:ring-blue-400"
                  autoFocus
                />
              </div>

              {/* Members list */}
              <div className="max-h-96 overflow-y-auto space-y-2">
                {loading ? (
                  <div className="text-center py-8 text-gray-400">
                    Carregando...
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    Nenhum membro encontrado
                  </div>
                ) : (
                  filteredMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => handleSelectMember(member)}
                      disabled={loading}
                      className="w-full text-left p-3 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                      <div className="font-medium text-gray-100">
                        {member.name}
                      </div>
                      <div className="text-sm text-gray-400 space-y-1">
                        {member.email && <div>Email: {member.email}</div>}
                        {member.phone && <div>Telefone: {formatPhoneForDisplay(member.phone)}</div>}
                        {member.celula && (
                          <div className="text-orange-400">
                            ⚠️ Já está em: {member.celula.name}
                          </div>
                        )}
                        {!member.celulaId && (
                          <div className="text-green-400">
                            ✓ Sem célula
                          </div>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>

              <button
                onClick={() => setStep('choice')}
                className="w-full px-4 py-2 text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-700"
              >
                Voltar
              </button>
            </div>
          )}

          {showWarning && selectedMember && (
            <div className="space-y-4">
              {warningType === 'hierarchy' ? (
                <div className="flex items-start gap-3 p-4 bg-red-900/20 border border-red-800 rounded-lg">
                  <FiAlertCircle className="text-red-400 shrink-0 mt-0.5" size={24} />
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-100 mb-2">
                      Não é possível adicionar à célula
                    </h3>
                    <p className="text-sm text-red-200 mb-3">
                      <strong>{selectedMember.name}</strong> não pode ser adicionado(a) a uma célula pois possui um cargo ministerial acima de Líder.
                    </p>
                    
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-red-100">Cargo do membro: </span>
                        <span className="text-red-200">
                          {selectedMember.ministryPosition?.type || 'Não definido'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-4 bg-orange-900/20 border border-orange-800 rounded-lg">
                  <FiAlertCircle className="text-orange-400 shrink-0 mt-0.5" size={24} />
                  <div className="flex-1">
                    <h3 className="font-semibold text-orange-100 mb-2">
                      Membro já associado a outra célula
                    </h3>
                    <p className="text-sm text-orange-200 mb-3">
                      <strong>{selectedMember.name}</strong> já está associado(a) a outra célula. 
                      Por favor, solicite à liderança que remova este membro da célula original antes de adicioná-lo aqui.
                    </p>
                    
                    <div className="space-y-2 text-sm">
                      {selectedMember.celula && (
                        <div>
                          <span className="font-medium text-orange-100">Célula: </span>
                          <span className="text-orange-200">{selectedMember.celula.name}</span>
                        </div>
                      )}
                      {selectedMember.celula?.leader && (
                        <div>
                          <span className="font-medium text-orange-100">Líder: </span>
                          <span className="text-orange-200">{selectedMember.celula.leader.name}</span>
                        </div>
                      )}
                      {selectedMember.celula?.discipulado && (
                        <div>
                          <span className="font-medium text-orange-100">Discipulado: </span>
                          <span className="text-orange-200">{selectedMember.celula.discipulado.discipulador?.name}</span>
                        </div>
                      )}
                      {selectedMember.celula?.discipulado?.rede && (
                        <div>
                          <span className="font-medium text-orange-100">Rede: </span>
                          <span className="text-orange-200">{selectedMember.celula.discipulado.rede.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowWarning(false);
                    setSelectedMember(null);
                  }}
                  className="flex-1 px-4 py-2 text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-700"
                >
                  Voltar à busca
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Entendi
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
