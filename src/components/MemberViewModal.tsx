"use client";

import React from 'react';
import { Member } from '@/types';
import { FiX } from 'react-icons/fi';

interface MemberViewModalProps {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function MemberViewModal({ member, isOpen, onClose }: MemberViewModalProps) {
  if (!isOpen || !member) return null;

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatPhone = (phone?: string | null) => {
    if (!phone) return '-';
    // Format: (XX) XXXXX-XXXX or (XX) XXXX-XXXX
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    } else if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
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

  // Retorna as tags de liderança do membro
  const getLeadershipInfo = (member: Member): { label: string; color: string }[] => {
    const tags: { label: string; color: string }[] = [];
    
    // Pastor de Governo de Congregação
    if (member.congregacoesPastorGoverno && member.congregacoesPastorGoverno.length > 0) {
      member.congregacoesPastorGoverno.forEach(cong => {
        tags.push({ label: `Pastor de Governo - ${cong.name}`, color: 'text-purple-400' });
      });
    }
    
    // Vice-Presidente de Congregação
    if (member.congregacoesVicePresidente && member.congregacoesVicePresidente.length > 0) {
      member.congregacoesVicePresidente.forEach(cong => {
        tags.push({ label: `Vice-Presidente - ${cong.name}`, color: 'text-purple-400' });
      });
    }
    
    // Pastor de Rede
    if (member.redes && member.redes.length > 0) {
      member.redes.forEach(rede => {
        tags.push({ label: `Pastor de Rede - ${rede.name}`, color: 'text-blue-400' });
      });
    }
    
    // Discipulador
    if (member.discipulados && member.discipulados.length > 0) {
      member.discipulados.forEach(disc => {
        tags.push({ label: `Discipulador - Rede: ${disc.rede.name}`, color: 'text-green-400' });
      });
    }
    
    // Líder de Célula
    if (member.ledCelulas && member.ledCelulas.length > 0) {
      member.ledCelulas.forEach(cel => {
        tags.push({ label: `Líder - ${cel.name}`, color: 'text-yellow-400' });
      });
    }
    
    // Vice-Líder de Célula
    if (member.viceLedCelulas && member.viceLedCelulas.length > 0) {
      member.viceLedCelulas.forEach(cel => {
        tags.push({ label: `Líder em Treinamento - ${cel.name}`, color: 'text-yellow-400' });
      });
    }
    
    return tags;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Visualizar Membro</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors"
            aria-label="Fechar"
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Personal Information */}
          <section>
            <h3 className="text-lg font-semibold mb-3 text-blue-400">Informações Pessoais</h3>
            
            {/* Photo */}
            {member.photoUrl && (
              <div className="mb-4 flex justify-center">
                <img
                  src={member.photoUrl}
                  alt={member.name}
                  className="w-32 h-32 rounded-full object-cover border-4 border-blue-900"
                />
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-400">Nome</label>
                <p className="text-base mt-1">{member.name}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-400">Email</label>
                <p className="text-base mt-1">{member.email || '-'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-400">Telefone</label>
                <p className="text-base mt-1">{formatPhone(member.phone)}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-400">Gênero</label>
                <p className="text-base mt-1">{getGenderLabel(member.gender)}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-400">Data de Nascimento</label>
                <p className="text-base mt-1">{formatDate(member.birthDate)}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-400">Estado Civil</label>
                <p className="text-base mt-1">{getMaritalStatusLabel(member.maritalStatus)}</p>
              </div>
              
              {member.maritalStatus === 'MARRIED' && member.spouse && (
                <div>
                  <label className="text-sm font-medium text-gray-400">Cônjuge</label>
                  <p className="text-base mt-1">{member.spouse.name}</p>
                </div>
              )}
            </div>
          </section>

          {/* Church Information */}
          <section>
            <h3 className="text-lg font-semibold mb-3 text-blue-400">Informações da Igreja</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-400">Cargo Ministerial</label>
                <p className="text-base mt-1">{member.ministryPosition?.name || 'Sem cargo ministerial'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-400">Data de Registro</label>
                <p className="text-base mt-1">{formatDate(member.registerDate)}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-400">Batizado</label>
                <p className="text-base mt-1">{member.isBaptized ? 'Sim' : 'Não'}</p>
              </div>
              
              {member.isBaptized && (
                <div>
                  <label className="text-sm font-medium text-gray-400">Data do Batismo</label>
                  <p className="text-base mt-1">{formatDate(member.baptismDate)}</p>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-gray-400">Pode Hospedar Célula</label>
                <p className="text-base mt-1">{member.canBeHost ? 'Sim' : 'Não'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-400">Acesso ao Sistema</label>
                <p className="text-base mt-1">{member.hasSystemAccess ? 'Sim' : 'Não'}</p>
              </div>
            </div>
          </section>

          {/* Associations */}
          <section>
            <h3 className="text-lg font-semibold mb-3 text-blue-400">Associações</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-400">Célula</label>
                <p className="text-base mt-1">
                  {member.celula?.name || (
                    <>
                      {getLeadershipInfo(member).length > 0 ? (
                        <span className="text-gray-400">-</span>
                      ) : (
                        <span className="text-red-400">Sem célula</span>
                      )}
                    </>
                  )}
                </p>
              </div>
              
              {member.celula?.discipulado && (
                <div>
                  <label className="text-sm font-medium text-gray-400">Discipulado</label>
                  <p className="text-base mt-1">{member.celula.discipulado.discipulador?.name || '-'}</p>
                </div>
              )}
              
              {member.celula?.discipulado?.rede && (
                <div>
                  <label className="text-sm font-medium text-gray-400">Rede</label>
                  <p className="text-base mt-1">{member.celula.discipulado.rede.name}</p>
                </div>
              )}
            </div>
            
            {/* Leadership Positions */}
            {getLeadershipInfo(member).length > 0 && (
              <div className="mt-4">
                <label className="text-sm font-medium text-gray-400 mb-2 block">Posições de Liderança</label>
                <div className="flex flex-wrap gap-2">
                  {getLeadershipInfo(member).map((tag, idx) => (
                    <span key={idx} className={`text-sm ${tag.color} bg-gray-800 px-3 py-1 rounded-full font-semibold`}>
                      {tag.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Address */}
          <section>
            <h3 className="text-lg font-semibold mb-3 text-blue-400">Endereço</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-400">CEP</label>
                <p className="text-base mt-1">{member.zipCode || '-'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-400">Rua</label>
                <p className="text-base mt-1">{member.street || '-'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-400">Número</label>
                <p className="text-base mt-1">{member.streetNumber || '-'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-400">Complemento</label>
                <p className="text-base mt-1">{member.complement || '-'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-400">Bairro</label>
                <p className="text-base mt-1">{member.neighborhood || '-'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-400">Cidade</label>
                <p className="text-base mt-1">{member.city || '-'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-400">Estado</label>
                <p className="text-base mt-1">{member.state || '-'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-400">País</label>
                <p className="text-base mt-1">{member.country || '-'}</p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
