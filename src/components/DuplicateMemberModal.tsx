"use client";

import React, { useState, useEffect } from 'react';
import { Member } from '@/types';
import { FiAlertTriangle, FiUserPlus, FiX, FiChevronRight } from 'react-icons/fi';
import { formatPhoneForDisplay } from '@/lib/phoneUtils';

interface DuplicateMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  duplicateMembers: Member[];
  onAddExisting: (member: Member) => void;
  onCreateNew: () => void;
  currentCelulaId?: number | null;
}

export default function DuplicateMemberModal({
  isOpen,
  onClose,
  duplicateMembers,
  onAddExisting,
  onCreateNew,
  currentCelulaId,
}: DuplicateMemberModalProps) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Reset selected member when modal opens or duplicates change
  useEffect(() => {
    if (isOpen && duplicateMembers.length > 0) {
      // Select first member that is not already in current celula
      const firstAvailable = duplicateMembers.find(
        m => !(m.celulaId === currentCelulaId && m.isActive)
      );
      setSelectedMember(firstAvailable || duplicateMembers[0]);
    } else {
      setSelectedMember(null);
    }
  }, [isOpen, duplicateMembers, currentCelulaId]);

  if (!isOpen || duplicateMembers.length === 0) return null;

  const currentMember = selectedMember || duplicateMembers[0];
  const hasMultipleDuplicates = duplicateMembers.length > 1;
  const isAlreadyInCurrentCelula = currentMember.celulaId === currentCelulaId && currentMember.isActive;

  // Verificar se o membro pode ser adicionado
  const canAddExisting = !isAlreadyInCurrentCelula && (!currentMember.celulaId || !currentMember.isActive);
  const isInAnotherCelulaAndActive = !isAlreadyInCurrentCelula && currentMember.celulaId && currentMember.isActive;

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatPhone = (phone?: string | null) => {
    if (!phone) return '-';
    return formatPhoneForDisplay(phone);
  };

  const getMaritalStatusLabel = (status?: string) => {
    const labels: Record<string, string> = {
      'SINGLE': 'Solteiro(a)',
      'MARRIED': 'Casado(a)',
      'COHABITATING': 'União Estável',
      'DIVORCED': 'Divorciado(a)',
      'WIDOWED': 'Viúvo(a)'
    };
    return status ? labels[status] || status : '-';
  };

  const getGenderLabel = (gender?: string) => {
    const labels: Record<string, string> = {
      'MALE': 'Masculino',
      'FEMALE': 'Feminino',
      'OTHER': 'Outro'
    };
    return gender ? labels[gender] || gender : '-';
  };

  const getLeadershipInfo = (member: Member): { label: string; color: string }[] => {
    const tags: { label: string; color: string }[] = [];
    
    if (member.congregacoesPastorGoverno && member.congregacoesPastorGoverno.length > 0) {
      member.congregacoesPastorGoverno.forEach(cong => {
        tags.push({ label: `Pastor de Governo - ${cong.name}`, color: 'text-purple-400' });
      });
    }
    
    if (member.congregacoesVicePresidente && member.congregacoesVicePresidente.length > 0) {
      member.congregacoesVicePresidente.forEach(cong => {
        tags.push({ label: `Vice-Presidente - ${cong.name}`, color: 'text-purple-400' });
      });
    }
    
    if (member.redes && member.redes.length > 0) {
      member.redes.forEach(rede => {
        tags.push({ label: `Pastor de Rede - ${rede.name}`, color: 'text-blue-400' });
      });
    }
    
    if (member.discipulados && member.discipulados.length > 0) {
      member.discipulados.forEach(disc => {
        tags.push({ label: `Discipulador - Rede: ${disc.rede.name}`, color: 'text-green-400' });
      });
    }
    
    if (member.ledCelulas && member.ledCelulas.length > 0) {
      member.ledCelulas.forEach(cel => {
        tags.push({ label: `Líder - ${cel.name}`, color: 'text-yellow-400' });
      });
    }
    
    if (member.leadingInTrainingCelulas && member.leadingInTrainingCelulas.length > 0) {
      member.leadingInTrainingCelulas.forEach(cl => {
        tags.push({ label: `Líder em Treinamento - ${cl.celula.name}`, color: 'text-yellow-400' });
      });
    }
    
    return tags;
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" 
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 shrink-0">
          <div className="flex items-center gap-3">
            <FiAlertTriangle className="text-yellow-400" size={24} />
            <h2 className="text-xl font-semibold text-gray-100">
              {hasMultipleDuplicates 
                ? `${duplicateMembers.length} Membros Cadastrados Encontrados` 
                : 'Membro já Cadastrado'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Alert Message */}
          {isInAnotherCelulaAndActive ? (
            <div className="flex items-start gap-3 p-4 bg-red-900/20 border border-red-800 rounded-lg">
              <FiAlertTriangle className="text-red-400 shrink-0 mt-0.5" size={24} />
              <div className="flex-1">
                <h3 className="font-semibold text-red-100 mb-2">
                  Membro já associado a outra célula
                </h3>
                <p className="text-sm text-red-200 mb-3">
                  {hasMultipleDuplicates 
                    ? `Encontramos ${duplicateMembers.length} membros cadastrados com o mesmo nome e gênero.`
                    : `Já existe um membro cadastrado com o mesmo nome e gênero: `}
                  {!hasMultipleDuplicates && <strong>{currentMember.name}</strong>}
                </p>
                <p className="text-sm text-red-200">
                  {hasMultipleDuplicates 
                    ? 'O membro selecionado já está associado e ativo em outra célula. Para adicioná-lo aqui, o líder da célula atual deve primeiro removê-lo de lá.'
                    : 'Este membro já está associado e ativo em outra célula. Para adicioná-lo aqui, o líder da célula atual deve primeiro removê-lo de lá.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-4 bg-yellow-900/20 border border-yellow-800 rounded-lg">
              <FiAlertTriangle className="text-yellow-400 shrink-0 mt-0.5" size={24} />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-100 mb-2">
                  {hasMultipleDuplicates 
                    ? 'Encontramos membros com o mesmo nome e gênero' 
                    : 'Encontramos um membro com o mesmo nome e gênero'}
                </h3>
                <p className="text-sm text-yellow-200 mb-3">
                  {hasMultipleDuplicates 
                    ? `Já existem ${duplicateMembers.length} membros cadastrados com esse nome e gênero.`
                    : `Já existe um membro cadastrado: `}
                  {!hasMultipleDuplicates && <strong>{currentMember.name}</strong>}
                </p>
                <p className="text-sm text-yellow-200">
                  {hasMultipleDuplicates 
                    ? 'Selecione um dos membros abaixo para adicionar ou crie um novo cadastro mesmo assim.'
                    : 'Deseja adicionar este membro existente ou criar um novo cadastro?'}
                </p>
              </div>
            </div>
          )}

          {/* Multiple Members Selection */}
          {hasMultipleDuplicates && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-300">Selecione o membro correto:</h3>
              <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto">
                {duplicateMembers.map((member) => {
                  const isSelected = selectedMember?.id === member.id;
                  const memberInCelula = member.celulaId && member.isActive;
                  const isInCurrentCelula = !!(currentCelulaId && member.celulaId === currentCelulaId);
                  
                  return (
                    <button
                      key={member.id}
                      onClick={() => !isInCurrentCelula && setSelectedMember(member)}
                      disabled={isInCurrentCelula}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        isInCurrentCelula
                          ? 'border-yellow-600 bg-yellow-900/20 cursor-not-allowed opacity-70'
                          : isSelected
                          ? 'border-blue-500 bg-blue-900/30'
                          : 'border-gray-600 bg-gray-800 hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          {member.photoUrl && (
                            <img
                              src={member.photoUrl}
                              alt={member.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-100">{member.name}</p>
                              {isInCurrentCelula && (
                                <span className="px-2 py-0.5 bg-yellow-600 text-yellow-100 text-xs rounded-full font-semibold">
                                  Já está nesta célula
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {member.email && (
                                <span className="text-xs text-gray-400">{member.email}</span>
                              )}
                              {member.phone && (
                                <span className="text-xs text-gray-400">• {formatPhone(member.phone)}</span>
                              )}
                            </div>
                            {member.celula && !isInCurrentCelula && (
                              <p className="text-xs text-gray-400 mt-1">
                                Célula: {member.celula.name}
                                {memberInCelula && (
                                  <span className="ml-2 text-red-400 font-semibold">(Ativo)</span>
                                )}
                              </p>
                            )}
                            {!member.celula && (
                              <p className="text-xs text-green-400 mt-1">✓ Sem célula</p>
                            )}
                          </div>
                        </div>
                        {!isInCurrentCelula && (
                          <FiChevronRight className={`${isSelected ? 'text-blue-400' : 'text-gray-500'}`} size={20} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Member Details */}
          <div className="space-y-4">
            {/* Personal Information */}
            <section>
              <h3 className="text-base font-semibold mb-3 text-blue-400">Informações Pessoais</h3>
              
              {/* Photo */}
              {currentMember.photoUrl && (
                <div className="mb-4 flex justify-center">
                  <img
                    src={currentMember.photoUrl}
                    alt={currentMember.name}
                    className="w-24 h-24 rounded-full object-cover border-4 border-blue-900"
                  />
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <label className="text-xs font-medium text-gray-400">Nome</label>
                  <p className="mt-1">{currentMember.name}</p>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-gray-400">Email</label>
                  <p className="mt-1">{currentMember.email || '-'}</p>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-gray-400">Telefone</label>
                  <p className="mt-1">{formatPhone(currentMember.phone)}</p>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-gray-400">Gênero</label>
                  <p className="mt-1">{getGenderLabel(currentMember.gender)}</p>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-gray-400">Data de Nascimento</label>
                  <p className="mt-1">{formatDate(currentMember.birthDate)}</p>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-gray-400">Estado Civil</label>
                  <p className="mt-1">{getMaritalStatusLabel(currentMember.maritalStatus)}</p>
                </div>
                
                {currentMember.maritalStatus === 'MARRIED' && currentMember.spouse && (
                  <div>
                    <label className="text-xs font-medium text-gray-400">Cônjuge</label>
                    <p className="mt-1">{currentMember.spouse.name}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Church Information */}
            <section>
              <h3 className="text-base font-semibold mb-3 text-blue-400">Informações da Igreja</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <label className="text-xs font-medium text-gray-400">Cargo Ministerial</label>
                  <p className="mt-1">{currentMember.ministryPosition?.name || 'Sem cargo ministerial'}</p>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-gray-400">Data de Registro</label>
                  <p className="mt-1">{formatDate(currentMember.registerDate)}</p>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-gray-400">Batizado</label>
                  <p className="mt-1">{currentMember.isBaptized ? 'Sim' : 'Não'}</p>
                </div>
                
                {currentMember.isBaptized && (
                  <div>
                    <label className="text-xs font-medium text-gray-400">Data do Batismo</label>
                    <p className="mt-1">{formatDate(currentMember.baptismDate)}</p>
                  </div>
                )}
                
                <div>
                  <label className="text-xs font-medium text-gray-400">Pode Hospedar Célula</label>
                  <p className="mt-1">{currentMember.canBeHost ? 'Sim' : 'Não'}</p>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-gray-400">Acesso ao Sistema</label>
                  <p className="mt-1">{currentMember.hasSystemAccess ? 'Sim' : 'Não'}</p>
                </div>
              </div>
            </section>

            {/* Associations */}
            <section>
              <h3 className="text-base font-semibold mb-3 text-blue-400">Associações</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <label className="text-xs font-medium text-gray-400">Célula</label>
                  <p className="mt-1">
                    {currentMember.celula?.name || (
                      <>
                        {getLeadershipInfo(currentMember).length > 0 ? (
                          <span className="text-gray-400">-</span>
                        ) : (
                          <span className="text-green-400">✓ Sem célula</span>
                        )}
                      </>
                    )}
                  </p>
                </div>
                
                {currentMember.celula?.leader && (
                  <div>
                    <label className="text-xs font-medium text-gray-400">Líder da Célula</label>
                    <p className="mt-1">{currentMember.celula.leader.name}</p>
                  </div>
                )}
                
                {currentMember.celula?.discipulado && (
                  <div>
                    <label className="text-xs font-medium text-gray-400">Discipulado</label>
                    <p className="mt-1">{currentMember.celula.discipulado.discipulador?.name || '-'}</p>
                  </div>
                )}
                
                {currentMember.celula?.discipulado?.rede && (
                  <div>
                    <label className="text-xs font-medium text-gray-400">Rede</label>
                    <p className="mt-1">{currentMember.celula.discipulado.rede.name}</p>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-gray-400">Status</label>
                  <p className="mt-1">
                    {currentMember.isActive ? (
                      <span className="text-green-400">Ativo</span>
                    ) : (
                      <span className="text-blue-400">Inativo</span>
                    )}
                  </p>
                </div>
              </div>
              
              {/* Leadership Positions */}
              {getLeadershipInfo(currentMember).length > 0 && (
                <div className="mt-4">
                  <label className="text-xs font-medium text-gray-400 mb-2 block">Posições de Liderança</label>
                  <div className="flex flex-wrap gap-2">
                    {getLeadershipInfo(currentMember).map((tag, idx) => (
                      <span key={idx} className={`text-xs ${tag.color} bg-gray-800 px-2 py-1 rounded-full font-semibold`}>
                        {tag.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Address */}
            {(currentMember.zipCode || currentMember.street || currentMember.city || currentMember.state) && (
              <section>
                <h3 className="text-base font-semibold mb-3 text-blue-400">Endereço</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <label className="text-xs font-medium text-gray-400">CEP</label>
                    <p className="mt-1">{currentMember.zipCode || '-'}</p>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-400">Rua</label>
                    <p className="mt-1">{currentMember.street || '-'}</p>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-400">Número</label>
                    <p className="mt-1">{currentMember.streetNumber || '-'}</p>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-400">Complemento</label>
                    <p className="mt-1">{currentMember.complement || '-'}</p>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-400">Bairro</label>
                    <p className="mt-1">{currentMember.neighborhood || '-'}</p>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-400">Cidade</label>
                    <p className="mt-1">{currentMember.city || '-'}</p>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-400">Estado</label>
                    <p className="mt-1">{currentMember.state || '-'}</p>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-400">País</label>
                    <p className="mt-1">{currentMember.country || 'Brasil'}</p>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Footer - Fixed Action Buttons */}
        <div className="p-4 border-t border-gray-700 shrink-0">
          {/* Warning for member already in current célula */}
          {isAlreadyInCurrentCelula && (
            <div className="mb-3 p-3 bg-yellow-900/30 border border-yellow-600 rounded-lg">
              <p className="text-sm text-yellow-200">
                ⚠️ Este membro já faz parte desta célula. Você só pode criar um novo cadastro.
              </p>
            </div>
          )}
          
          {/* Action Buttons */}
          {isInAnotherCelulaAndActive || isAlreadyInCurrentCelula ? (
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  onClose();
                  onCreateNew();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <FiUserPlus size={18} />
                Criar Novo Membro Mesmo Assim
              </button>
            </div>
          ) : (
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onClose();
                  onCreateNew();
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <FiUserPlus size={18} />
                Criar Novo Mesmo Assim
              </button>
              <button
                onClick={() => onAddExisting(currentMember)}
                disabled={!canAddExisting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Adicionar Membro Existente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
