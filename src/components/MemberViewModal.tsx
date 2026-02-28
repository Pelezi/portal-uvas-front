"use client";

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Member } from '@/types';
import { memberService } from '@/services/memberService';
import { FiX, FiExternalLink } from 'react-icons/fi';
import { MapPin, Users, Network, BookOpen, Church } from 'lucide-react';

const CelulaViewModal = dynamic(() => import('./CelulaViewModal'), { ssr: false });
const DiscipuladoViewModal = dynamic(() => import('./DiscipuladoViewModal'), { ssr: false });
const RedeViewModal = dynamic(() => import('./RedeViewModal'), { ssr: false });
const CongregacaoViewModal = dynamic(() => import('./CongregacaoViewModal'), { ssr: false });

interface MemberViewModalProps {
  memberId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function MemberViewModal({ memberId, isOpen, onClose }: MemberViewModalProps) {
  const [member, setMember] = useState<Member | null>(null);
  const [loadingMember, setLoadingMember] = useState(false);
  
  // States para modais aninhados - apenas IDs
  const [viewingMemberId, setViewingMemberId] = useState<number | null>(null);
  const [viewingCelulaId, setViewingCelulaId] = useState<number | null>(null);
  const [viewingDiscipuladoId, setViewingDiscipuladoId] = useState<number | null>(null);
  const [viewingRedeId, setViewingRedeId] = useState<number | null>(null);
  const [viewingCongregacaoId, setViewingCongregacaoId] = useState<number | null>(null);

  // ESC key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !memberId) {
      setMember(null);
      // Reset nested modal states when closing
      setViewingMemberId(null);
      setViewingCelulaId(null);
      setViewingDiscipuladoId(null);
      setViewingRedeId(null);
      setViewingCongregacaoId(null);
      return;
    }
    setLoadingMember(true);
    memberService.getById(memberId)
      .then(setMember)
      .catch(err => console.error('Erro ao carregar membro:', err))
      .finally(() => setLoadingMember(false));
  }, [isOpen, memberId]);

  // Helper function to get social media URL
  const getSocialMediaUrl = (type: string, username: string): string => {
    const cleanUsername = username.replace(/[@\s]/g, '');
    
    switch (type.toUpperCase()) {
      case 'INSTAGRAM':
        return `https://instagram.com/${cleanUsername}`;
      case 'FACEBOOK':
        return `https://facebook.com/${cleanUsername}`;
      case 'TWITTER':
      case 'X':
        return `https://twitter.com/${cleanUsername}`;
      case 'LINKEDIN':
        return cleanUsername.startsWith('http') ? cleanUsername : `https://linkedin.com/in/${cleanUsername}`;
      case 'TIKTOK':
        return `https://tiktok.com/@${cleanUsername}`;
      case 'YOUTUBE':
        return cleanUsername.startsWith('http') ? cleanUsername : `https://youtube.com/@${cleanUsername}`;
      case 'TELEGRAM':
        return `https://t.me/${cleanUsername}`;
      default:
        // If username looks like a URL, return it; otherwise return empty
        return cleanUsername.startsWith('http') ? cleanUsername : '';
    }
  };

  // Helper function to get social media icon emoji
  const getSocialMediaIcon = (type: string): string => {
    switch (type.toUpperCase()) {
      case 'INSTAGRAM': return '📷';
      case 'FACEBOOK': return '👥';
      case 'TWITTER':
      case 'X': return '🐦';
      case 'LINKEDIN': return '💼';
      case 'TIKTOK': return '🎵';
      case 'YOUTUBE': return '📺';
      case 'TELEGRAM': return '✈️';
      default: return '🔗';
    }
  };

  if (!isOpen) return null;

  if (loadingMember || !member) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" onClick={(e) => e.stopPropagation()} />
      </div>
    );
  }

  // Check if contact data is censored based on privacy settings
  // The API censors ALL contact/address fields when privacy restrictions apply:
  // phone, email, zipCode, street, streetNumber, neighborhood, city, complement, state, country, socialMedia
  const isContactDataCensored = 
    member.contactPrivacyLevel && // Member has a privacy level set
    member.contactPrivacyLevel !== 'ALL' && // It's not public to all
    // Check that all contact and address fields are null/empty (API censors all of them)
    !member.phone && 
    !member.email && 
    !member.street && 
    !member.streetNumber &&
    !member.neighborhood &&
    !member.city && 
    !member.state &&
    !member.zipCode &&
    !member.country &&
    !member.complement &&
    (!member.socialMedia || member.socialMedia.length === 0);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatPhone = (phone?: string | null) => {
    if (!phone) return '-';
    // Format: (XX) XXXXX-XXXX or (XX) XXXX-XXXX
    // Strip Brazil DDI (55) if present before formatting
    const cleaned = phone.replace(/\D/g, '');
    const local =
      cleaned.startsWith('55') && (cleaned.length === 12 || cleaned.length === 13)
        ? cleaned.slice(2)
        : cleaned;
    if (local.length === 11) {
      return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
    } else if (local.length === 10) {
      return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
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

  const formatAddress = (member: Member) => {
    const parts = [];
    if (member.street) {
      let streetPart = member.street;
      if (member.streetNumber) streetPart += `, ${member.streetNumber}`;
      parts.push(streetPart);
    }
    if (member.neighborhood) parts.push(member.neighborhood);
    if (member.city) parts.push(member.city);
    if (member.state) parts.push(member.state);
    
    return parts.length > 0 ? parts.join(' - ') : '—';
  };

  // Determina qual hierarquia mostrar baseado na liderança do membro
  const getLeadershipHierarchy = (member: Member): Array<{
    title: string;
    celula?: string;
    celulaId?: number;
    discipulado?: string;
    discipuladoId?: number;
    rede?: string;
    redeId?: number;
    congregacao?: string;
    congregacaoId?: number;
  }> => {
    const hierarchies: Array<{
      title: string;
      celula?: string;
      celulaId?: number;
      discipulado?: string;
      discipuladoId?: number;
      rede?: string;
      redeId?: number;
      congregacao?: string;
      congregacaoId?: number;
    }> = [];

    // Congregações - Pastor de Governo
    if (member.congregacoesPastorGoverno && member.congregacoesPastorGoverno.length > 0) {
      member.congregacoesPastorGoverno.forEach(cong => {
        hierarchies.push({
          title: `Pastor de Governo - ${cong.name}`,
          congregacao: cong.name,
          congregacaoId: cong.id
        });
      });
    }
    
    // Congregações - Vice-Presidente
    if (member.congregacoesVicePresidente && member.congregacoesVicePresidente.length > 0) {
      member.congregacoesVicePresidente.forEach(cong => {
        hierarchies.push({
          title: `Vice-Presidente - ${cong.name}`,
          congregacao: cong.name,
          congregacaoId: cong.id
        });
      });
    }
    
    // Redes - Pastor de Rede
    if (member.redes && member.redes.length > 0) {
      member.redes.forEach(rede => {
        hierarchies.push({
          title: `Pastor de Rede - ${rede.name}`,
          rede: rede.name,
          redeId: rede.id,
          congregacao: rede.congregacao?.name,
          congregacaoId: rede.congregacao?.id
        });
      });
    }
    
    // Discipulados - Discipulador
    if (member.discipulados && member.discipulados.length > 0) {
      member.discipulados.forEach(disc => {
        hierarchies.push({
          title: `Discipulador - ${disc.discipulador?.name || 'Discipulado'}`,
          discipulado: disc.discipulador?.name,
          discipuladoId: disc.id,
          rede: disc.rede?.name,
          redeId: disc.rede?.id,
          congregacao: disc.rede?.congregacao?.name,
          congregacaoId: disc.rede?.congregacao?.id
        });
      });
    }
    
    // Células - Líder
    if (member.ledCelulas && member.ledCelulas.length > 0) {
      member.ledCelulas.forEach(cel => {
        hierarchies.push({
          title: `Líder - ${cel.name}`,
          celula: cel.name,
          celulaId: cel.id,
          discipulado: cel.discipulado?.discipulador?.name,
          discipuladoId: cel.discipulado?.id,
          rede: cel.discipulado?.rede?.name,
          redeId: cel.discipulado?.rede?.id,
          congregacao: cel.discipulado?.rede?.congregacao?.name,
          congregacaoId: cel.discipulado?.rede?.congregacao?.id
        });
      });
    }
    
    // Células - Líder em Treinamento
    if (member.leadingInTrainingCelulas && member.leadingInTrainingCelulas.length > 0) {
      member.leadingInTrainingCelulas.forEach(cl => {
        hierarchies.push({
          title: `Líder em Treinamento - ${cl.celula.name}`,
          celula: cl.celula.name,
          celulaId: cl.celula.id,
          discipulado: cl.celula.discipulado?.discipulador?.name,
          discipuladoId: cl.celula.discipulado?.id,
          rede: cl.celula.discipulado?.rede?.name,
          redeId: cl.celula.discipulado?.rede?.id,
          congregacao: cl.celula.discipulado?.rede?.congregacao?.name,
          congregacaoId: cl.celula.discipulado?.rede?.congregacao?.id
        });
      });
    }
    
    return hierarchies;
  };

  // Retorna as tags de liderança do membro
  const getLeadershipInfo = (member: Member): { label: string; color: string; onClick?: () => void }[] => {
    const tags: { label: string; color: string; onClick?: () => void }[] = [];
    
    // Pastor de Governo de Congregação
    if (member.congregacoesPastorGoverno && member.congregacoesPastorGoverno.length > 0) {
      member.congregacoesPastorGoverno.forEach(cong => {
        tags.push({ 
          label: `Pastor de Governo - ${cong.name}`, 
          color: 'text-purple-400',
          onClick: () => setViewingCongregacaoId(cong.id)
        });
      });
    }
    
    // Vice-Presidente de Congregação
    if (member.congregacoesVicePresidente && member.congregacoesVicePresidente.length > 0) {
      member.congregacoesVicePresidente.forEach(cong => {
        tags.push({ 
          label: `Vice-Presidente - ${cong.name}`, 
          color: 'text-purple-400',
          onClick: () => setViewingCongregacaoId(cong.id)
        });
      });
    }
    
    // Responsável Kids de Congregação
    if (member.congregacoesKidsLeader && member.congregacoesKidsLeader.length > 0) {
      member.congregacoesKidsLeader.forEach(cong => {
        tags.push({ 
          label: `Responsável Kids - ${cong.name}`, 
          color: 'text-pink-400',
          onClick: () => setViewingCongregacaoId(cong.id)
        });
      });
    }
    
    // Pastor de Rede
    if (member.redes && member.redes.length > 0) {
      member.redes.forEach(rede => {
        tags.push({ 
          label: `Pastor de Rede - ${rede.name}`, 
          color: 'text-blue-400',
          onClick: () => setViewingRedeId(rede.id)
        });
      });
    }
    
    // Discipulador
    if (member.discipulados && member.discipulados.length > 0) {
      member.discipulados.forEach(disc => {
        tags.push({ 
          label: `Discipulador - Rede: ${disc.rede.name}`, 
          color: 'text-green-400',
          onClick: () => setViewingDiscipuladoId(disc.id)
        });
      });
    }
    
    // Líder de Célula
    if (member.ledCelulas && member.ledCelulas.length > 0) {
      member.ledCelulas.forEach(cel => {
        tags.push({ 
          label: `Líder - ${cel.name}`, 
          color: 'text-yellow-400',
          onClick: () => setViewingCelulaId(cel.id)
        });
      });
    }
    
    // Vice-Líder de Célula
    if (member.leadingInTrainingCelulas && member.leadingInTrainingCelulas.length > 0) {
      member.leadingInTrainingCelulas.forEach(cl => {
        tags.push({ 
          label: `Líder em Treinamento - ${cl.celula.name}`, 
          color: 'text-yellow-400',
          onClick: () => setViewingCelulaId(cl.celula.id)
        });
      });
    }
    
    // Anfitrião de Célula
    if (member.hostedCelulas && member.hostedCelulas.length > 0) {
      member.hostedCelulas.forEach(cel => {
        tags.push({ 
          label: `Anfitrião - ${cel.name}`, 
          color: 'text-orange-400',
          onClick: () => setViewingCelulaId(cel.id)
        });
      });
    }
    
    return tags;
  };

  // Retorna as tags de funções do membro
  const getRoleTags = (member: Member): { label: string; color: string }[] => {
    if (!member.roles || member.roles.length === 0) return [];
    
    return member.roles.map(userRole => ({
      label: userRole.role.name,
      color: 'text-indigo-400'
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold">Visualizar Membro</h2>
            {!member.isActive && (
              <span className="px-3 py-1 bg-red-600 text-white text-sm font-semibold rounded-full">
                Desligado
              </span>
            )}
          </div>
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
            
            {/* Photo and Personal Data Section */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-4">
              {/* Coluna da Foto - 1/4 em desktop */}
              <div className="lg:col-span-1 flex flex-col items-center gap-4">
                {member.photoUrl ? (
                  <img
                    src={member.photoUrl}
                    alt={member.name}
                    className="w-40 h-40 rounded-full object-cover border-4 border-blue-900"
                  />
                ) : (
                  <div className="w-40 h-40 rounded-full bg-gray-800 border-4 border-gray-700 flex items-center justify-center">
                    <span className="text-4xl text-gray-600">👤</span>
                  </div>
                )}
              </div>

              {/* Coluna dos Dados - 3/4 em desktop */}
              <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-400">Nome</label>
                  <p className="text-base mt-1">{member.name}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-400">Email</label>
                  <p className="text-base mt-1">
                    {isContactDataCensored ? (
                      <span className="text-gray-500 italic">🔒 Privado</span>
                    ) : (
                      member.email || '-'
                    )}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-400">Telefone</label>
                  <div className="flex items-center gap-2 mt-1">
                    {isContactDataCensored ? (
                      <span className="text-gray-500 italic">🔒 Privado</span>
                    ) : (
                      <>
                        <span className="text-base">{formatPhone(member.phone) || '-'}</span>
                        {member.phone && (
                          <a
                            href={`https://wa.me/${member.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-500 hover:text-green-400 transition-colors"
                            title="Abrir WhatsApp"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                            </svg>
                          </a>
                        )}
                      </>
                    )}
                  </div>
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
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-400 mb-2 block">Cônjuge</label>
                    <div 
                      className="flex items-center gap-3 cursor-pointer hover:bg-gray-800 rounded-lg p-2 -m-2 transition-colors"
                      onClick={() => setViewingMemberId(member.spouse!.id)}
                      title="Clique para ver detalhes"
                    >
                      {member.spouse.photoUrl ? (
                        <img
                          src={member.spouse.photoUrl}
                          alt={member.spouse.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-red-600"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-700 border-2 border-red-600 flex items-center justify-center">
                          <span className="text-xl">👤</span>
                        </div>
                      )}
                      <div>
                        <p className="text-base font-medium">{member.spouse.name}</p>
                        {member.spouse.phone && (
                          <p className="text-sm text-gray-400">{formatPhone(member.spouse.phone)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tags Section - Below photo and data */}
            {(getLeadershipInfo(member).length > 0 || getRoleTags(member).length > 0) && (
              <div className="mt-4 flex flex-col items-center gap-3">
                <div className="flex flex-wrap gap-6 justify-center">
                  {/* Leadership Tags */}
                  {getLeadershipInfo(member).length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-400 mb-2 block text-center">Posições de Liderança</label>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {getLeadershipInfo(member).map((tag, idx) => (
                          <span 
                            key={idx} 
                            className={`text-sm ${tag.color} bg-gray-800 px-3 py-1 rounded-full font-semibold cursor-pointer hover:bg-gray-700 transition-colors`}
                            onClick={tag.onClick}
                            title="Clique para ver detalhes"
                          >
                            {tag.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Role Tags */}
                  {getRoleTags(member).length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-400 mb-2 block text-center">Funções</label>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {getRoleTags(member).map((tag, idx) => (
                          <span key={idx} className={`text-sm ${tag.color} bg-gray-800 px-3 py-1 rounded-full font-semibold`}>
                            {tag.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
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
                <label className="text-sm font-medium text-gray-400">Trilho do Vencedor</label>
                <p className="text-base mt-1">{member.winnerPath?.name || '-'}</p>
              </div>
            </div>
          </section>

          {/* Associations */}
          <section>
            <h3 className="text-lg font-semibold mb-3 text-blue-400">Associações</h3>
            {(() => {
              const allAssociations = [];
              
              // Se tem célula como membro, mostrar hierarquia da célula
              if (member.celula) {
                allAssociations.push(
                  <div key="member-celula" className="space-y-2">
                    <h4 className="text-xs font-semibold text-gray-400">Como Membro</h4>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <div 
                        className="bg-gray-700/50 rounded-lg p-3 border border-gray-600 text-center cursor-pointer hover:bg-gray-700 hover:border-blue-500 transition-colors"
                        onClick={() => setViewingCelulaId(member.celula!.id)}
                        title="Clique para ver detalhes"
                      >
                        <Users className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                        <p className="text-[10px] text-gray-400">Célula</p>
                        <p className="text-sm font-medium text-white">{member.celula.name}</p>
                      </div>
                      <div 
                        className="bg-gray-700/50 rounded-lg p-3 border border-gray-600 text-center cursor-pointer hover:bg-gray-700 hover:border-blue-500 transition-colors"
                        onClick={() => member.celula?.discipulado && setViewingDiscipuladoId(member.celula.discipulado.id)}
                        title="Clique para ver detalhes"
                      >
                        <BookOpen className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                        <p className="text-[10px] text-gray-400">Discipulado</p>
                        <p className="text-sm font-medium text-white">{member.celula.discipulado?.discipulador?.name || "—"}</p>
                      </div>
                      <div 
                        className="bg-gray-700/50 rounded-lg p-3 border border-gray-600 text-center cursor-pointer hover:bg-gray-700 hover:border-blue-500 transition-colors"
                        onClick={() => member.celula?.discipulado?.rede && setViewingRedeId(member.celula.discipulado.rede.id)}
                        title="Clique para ver detalhes"
                      >
                        <Network className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                        <p className="text-[10px] text-gray-400">Rede</p>
                        <p className="text-sm font-medium text-white">{member.celula.discipulado?.rede?.name || "—"}</p>
                      </div>
                      <div 
                        className="bg-gray-700/50 rounded-lg p-3 border border-gray-600 text-center cursor-pointer hover:bg-gray-700 hover:border-blue-500 transition-colors"
                        onClick={() => member.celula?.discipulado?.rede?.congregacao && setViewingCongregacaoId(member.celula.discipulado.rede.congregacao.id)}
                        title="Clique para ver detalhes"
                      >
                        <Church className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                        <p className="text-[10px] text-gray-400">Congregação</p>
                        <p className="text-sm font-medium text-white">{member.celula.discipulado?.rede?.congregacao?.name || "—"}</p>
                      </div>
                    </div>
                  </div>
                );
              }
              
              // Obter hierarquias de liderança
              const hierarchies = getLeadershipHierarchy(member);
              
              // Se tem liderança, mostrar cada uma
              if (hierarchies.length > 0) {
                hierarchies.forEach((hierarchy, idx) => {
                  const cards = [];
                  
                  if (hierarchy.celula) {
                    cards.push(
                      <div 
                        key={`${idx}-celula`} 
                        className="bg-gray-700/50 rounded-lg p-3 border border-gray-600 text-center cursor-pointer hover:bg-gray-700 hover:border-blue-500 transition-colors"
                        onClick={() => hierarchy.celulaId && setViewingCelulaId(hierarchy.celulaId)}
                        title="Clique para ver detalhes"
                      >
                        <Users className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                        <p className="text-[10px] text-gray-400">Célula</p>
                        <p className="text-sm font-medium text-white">{hierarchy.celula}</p>
                      </div>
                    );
                  }
                  
                  if (hierarchy.discipulado) {
                    cards.push(
                      <div 
                        key={`${idx}-discipulado`} 
                        className="bg-gray-700/50 rounded-lg p-3 border border-gray-600 text-center cursor-pointer hover:bg-gray-700 hover:border-blue-500 transition-colors"
                        onClick={() => hierarchy.discipuladoId && setViewingDiscipuladoId(hierarchy.discipuladoId)}
                        title="Clique para ver detalhes"
                      >
                        <BookOpen className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                        <p className="text-[10px] text-gray-400">Discipulado</p>
                        <p className="text-sm font-medium text-white">{hierarchy.discipulado}</p>
                      </div>
                    );
                  }
                  
                  if (hierarchy.rede) {
                    cards.push(
                      <div 
                        key={`${idx}-rede`} 
                        className="bg-gray-700/50 rounded-lg p-3 border border-gray-600 text-center cursor-pointer hover:bg-gray-700 hover:border-blue-500 transition-colors"
                        onClick={() => hierarchy.redeId && setViewingRedeId(hierarchy.redeId)}
                        title="Clique para ver detalhes"
                      >
                        <Network className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                        <p className="text-[10px] text-gray-400">Rede</p>
                        <p className="text-sm font-medium text-white">{hierarchy.rede}</p>
                      </div>
                    );
                  }
                  
                  if (hierarchy.congregacao) {
                    cards.push(
                      <div 
                        key={`${idx}-congregacao`} 
                        className="bg-gray-700/50 rounded-lg p-3 border border-gray-600 text-center cursor-pointer hover:bg-gray-700 hover:border-blue-500 transition-colors"
                        onClick={() => hierarchy.congregacaoId && setViewingCongregacaoId(hierarchy.congregacaoId)}
                        title="Clique para ver detalhes"
                      >
                        <Church className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                        <p className="text-[10px] text-gray-400">Congregação</p>
                        <p className="text-sm font-medium text-white">{hierarchy.congregacao}</p>
                      </div>
                    );
                  }
                  
                  if (cards.length > 0) {
                    allAssociations.push(
                      <div key={`leadership-${idx}`} className="space-y-2">
                        <h4 className="text-xs font-semibold text-gray-400">{hierarchy.title}</h4>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                          {cards}
                        </div>
                      </div>
                    );
                  }
                });
              }
              
              // Células que o membro hospeda
              if (member.hostedCelulas && member.hostedCelulas.length > 0) {
                member.hostedCelulas.forEach((cel, idx) => {
                  allAssociations.push(
                    <div key={`host-${idx}`} className="space-y-2">
                      <h4 className="text-xs font-semibold text-gray-400">Anfitrião - {cel.name}</h4>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div 
                          className="bg-gray-700/50 rounded-lg p-3 border border-gray-600 text-center cursor-pointer hover:bg-gray-700 hover:border-orange-500 transition-colors"
                          onClick={() => setViewingCelulaId(cel.id)}
                          title="Clique para ver detalhes"
                        >
                          <Users className="h-4 w-4 text-orange-500 mx-auto mb-1" />
                          <p className="text-[10px] text-gray-400">Célula</p>
                          <p className="text-sm font-medium text-white">{cel.name}</p>
                        </div>
                      </div>
                    </div>
                  );
                });
              }
              
              // Se não tem célula e não tem liderança
              if (allAssociations.length === 0) {
                return (
                  <div className="text-center py-4">
                    <span className="text-red-400">Sem célula</span>
                  </div>
                );
              }
              
              return (
                <div className="space-y-4">
                  {allAssociations}
                </div>
              );
            })()}
          </section>

          {/* Social Media */}
          <section>
            <h3 className="text-lg font-semibold mb-3 text-blue-400">Redes Sociais</h3>
            {isContactDataCensored ? (
              <div className="text-center py-8 bg-gray-800/50 rounded-lg border border-gray-700">
                <p className="text-gray-400 text-sm">
                  🔒 As redes sociais deste membro estão privadas
                </p>
                <p className="text-gray-500 text-xs mt-2">
                  Este membro escolheu limitar quem pode ver suas informações de contato
                </p>
              </div>
            ) : (
              <div>
                {member.socialMedia && member.socialMedia.length > 0 ? (
                  <div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {member.socialMedia
                        .map((sm, idx) => {
                          const url = getSocialMediaUrl(sm.type, sm.username);
                          return (
                            <div key={idx} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700 hover:border-blue-500 transition-colors group">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-lg">
                                  {getSocialMediaIcon(sm.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-gray-400">{sm.type}</p>
                                  <p className="text-sm text-white truncate">{sm.username}</p>
                                </div>
                                {url && (
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title={`Abrir ${sm.type}`}
                                  >
                                    <FiExternalLink className="h-4 w-4" />
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-gray-400 text-sm">Nenhuma rede social cadastrada</p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Address */}
          <section>
            <h3 className="text-lg font-semibold mb-3 text-blue-400">Endereço</h3>
            {isContactDataCensored ? (
              <div className="text-center py-8 bg-gray-800/50 rounded-lg border border-gray-700">
                <p className="text-gray-400 text-sm">
                  🔒 Os dados de endereço deste membro estão privados
                </p>
                <p className="text-gray-500 text-xs mt-2">
                  Este membro escolheu limitar quem pode ver suas informações de contato
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-2 text-sm text-gray-200">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                  <span>{formatAddress(member)}</span>
                </div>
                {(member.street || member.city) && (
                  <div className="rounded-lg overflow-hidden border border-gray-600 h-48">
                    <iframe
                      title="Mapa"
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(formatAddress(member))}&output=embed`}
                    />
                  </div>
                )}
              </div>
            )}
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
      
      {/* Modais aninhados */}
      {viewingMemberId !== null && (
        <MemberViewModal
          memberId={viewingMemberId}
          isOpen={true}
          onClose={() => setViewingMemberId(null)}
        />
      )}
      
      {viewingCelulaId !== null && (
        <CelulaViewModal
          celulaId={viewingCelulaId}
          isOpen={true}
          onClose={() => setViewingCelulaId(null)}
        />
      )}
      
      {viewingDiscipuladoId !== null && (
        <DiscipuladoViewModal
          discipuladoId={viewingDiscipuladoId}
          isOpen={true}
          onClose={() => setViewingDiscipuladoId(null)}
        />
      )}
      
      {viewingRedeId !== null && (
        <RedeViewModal
          redeId={viewingRedeId}
          isOpen={true}
          onClose={() => setViewingRedeId(null)}
        />
      )}
      
      {viewingCongregacaoId !== null && (
        <CongregacaoViewModal
          congregacaoId={viewingCongregacaoId}
          isOpen={true}
          onClose={() => setViewingCongregacaoId(null)}
        />
      )}
    </div>
  );
}
