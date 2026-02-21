"use client";

import React, { useEffect, useState, useRef } from 'react';
import { celulasService } from '@/services/celulasService';
import { discipuladosService } from '@/services/discipuladosService';
import { redesService } from '@/services/redesService';
import { congregacoesService } from '@/services/congregacoesService';
import { memberService, MemberInput } from '@/services/memberService';
import { Celula, Member, Discipulado, Rede, Congregacao, MemberFilters } from '@/types';
import toast from 'react-hot-toast';
import { createTheme, FormControl, InputLabel, MenuItem, Select, ThemeProvider, Button, TextField } from '@mui/material';
import { FiEdit2, FiTrash2, FiPlus } from 'react-icons/fi';
import { FaFilter, FaFilterCircleXmark } from "react-icons/fa6";
import MemberModal from '@/components/MemberModal';
import MemberViewModal from '@/components/MemberViewModal';
import FilterModal, { FilterConfig } from '@/components/FilterModal';
import { useAuth } from '@/contexts/AuthContext';

export default function MembersManagementPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [celulas, setCelulas] = useState<Celula[]>([]);
  const [discipulados, setDiscipulados] = useState<Discipulado[]>([]);
  const [congregacoes, setCongregacoes] = useState<Congregacao[]>([]);
  const [redes, setRedes] = useState<Rede[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterName, setFilterName] = useState('');
  const [filterMyDisciples, setFilterMyDisciples] = useState(true);
  const [filterCelulaId, setFilterCelulaId] = useState<number | null>(null);
  const [filterDiscipuladoId, setFilterDiscipuladoId] = useState<number | null>(null);
  const [filterCongregacaoId, setFilterCongregacaoId] = useState<number | null>(null);
  const [filterRedeId, setFilterRedeId] = useState<number | null>(null);

  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [confirmingMember, setConfirmingMember] = useState<Member | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMember, setModalMember] = useState<Member | null>(null);
  
  // View modal state
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingMember, setViewingMember] = useState<Member | null>(null);
  
  // Filter modal state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const muiTheme = createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: '#ffffffff',
      },
    },
  });

  useEffect(() => {
    const loadFilters = async () => {
      if (authLoading) return;
      try {
        const [c, d, r, cong] = await Promise.all([
          celulasService.getCelulas(),
          discipuladosService.getDiscipulados(),
          redesService.getRedes({}),
          congregacoesService.getCongregacoes()
        ]);
        setCelulas(c);
        setDiscipulados(d);
        setRedes(r);
        setCongregacoes(cong);
      } catch (e) {
        console.error(e);
      }
    };
    loadFilters();
  }, [authLoading]);

  useEffect(() => {
    const loadMembers = async () => {
      if (authLoading) return;
      
      setLoading(true);
      try {
        const filters: MemberFilters = {};
        // filterCelulaId = 0 significa "sem célula", null significa "todas"
        if (filterCelulaId !== null) filters.celulaId = filterCelulaId;
        if (filterDiscipuladoId) filters.discipuladoId = filterDiscipuladoId;
        if (filterRedeId) filters.redeId = filterRedeId;
        if (filterCongregacaoId) filters.congregacaoId = filterCongregacaoId;
        if (!filterMyDisciples) filters.all = true;

        const m = await memberService.getAllMembers(filters);
        setMembers(m);
      } catch (e) {
        console.error(e);
        toast.error('Falha ao carregar membros');
      } finally {
        setLoading(false);
      }
    };
    loadMembers();
  }, [filterCelulaId, filterDiscipuladoId, filterRedeId, filterCongregacaoId, filterMyDisciples, authLoading]);

  const openEditModal = (m: Member) => {
    setModalMember(m);
    setIsModalOpen(true);
  };

  const openViewModal = (m: Member) => {
    setViewingMember(m);
    setIsViewModalOpen(true);
  };

  const openCreateModal = () => {
    setModalMember(null);
    setIsModalOpen(true);
  };

  const handleModalSave = async (data: Partial<Member>, photo?: File, deletePhoto?: boolean): Promise<Member> => {
    let savedMember: Member;
    const wasCreating = !modalMember;
    const wasEnablingAccess = !modalMember?.hasSystemAccess && data.hasSystemAccess;
    
    try {
      if (modalMember) {
        // Editing
        savedMember = await memberService.updateMember(modalMember.celulaId || 0, modalMember.id, data, photo, deletePhoto);
        toast.success('Membro atualizado');
      } else {
        // Creating - name is required
        if (!data.name) {
          toast.error('Nome é obrigatório');
          throw new Error('Nome é obrigatório');
        }
        savedMember = await memberService.create(data as MemberInput, photo);
        toast.success('Membro criado com sucesso');
      }

      // Check if user edited their own photo - if so, reload page to update sidebar
      const isEditingSelf = user && savedMember.id === user.id;
      const photoChanged = photo || deletePhoto;
      
      if (isEditingSelf && photoChanged) {
        // Close modal first for better UX
        setIsModalOpen(false);
        setModalMember(null);
        
        // Reload page to update sidebar picture
        window.location.reload();
        return savedMember;
      }

      // Reload members
      const filters: MemberFilters = {};
      if (filterCelulaId !== null) filters.celulaId = filterCelulaId;
      if (filterDiscipuladoId) filters.discipuladoId = filterDiscipuladoId;
      if (filterRedeId) filters.redeId = filterRedeId;
      if (filterCongregacaoId) filters.congregacaoId = filterCongregacaoId;
      const refreshed = await memberService.getAllMembers(filters);
      setMembers(refreshed);
      setIsModalOpen(false);
      setModalMember(null);

      // Enviar convite em background após fechar o modal
      const shouldSendInvite = data.hasSystemAccess && data.email && data.email.trim() && (
        wasCreating || // Criar novo membro com acesso
        (wasEnablingAccess && modalMember?.hasDefaultPassword !== false && !modalMember?.inviteSent) // Ativando acesso pela primeira vez
      );

      if (shouldSendInvite) {
        // Enviar em background sem bloquear
        memberService.sendInvite(savedMember.id)
          .then((response) => {
            const message = response.whatsappSent 
              ? 'Convite enviado por email e WhatsApp' 
              : 'Convite enviado por email';
            toast.success(message);
          })
          .catch((inviteErr: any) => {
            console.error('Erro ao enviar convite:', inviteErr);
            toast.error(inviteErr.response?.data?.message || 'Erro ao enviar convite, mas o membro foi salvo');
          });
      }

      return savedMember;
    } catch (e) {
      console.error(e);
      toast.error('Falha ao salvar');
      throw e;
    }
  };

  const removeMember = (member: Member) => {
    setConfirmingMember(member);
  };

  // Verifica se o usuário pode editar/deletar um membro específico
  const canManageMember = (member: Member): boolean => {
    if (!user) return false;
    
    // Admin pode gerenciar todos
    const isAdmin = user.roles?.some((r: any) => r.role?.isAdmin);
    
    if (isAdmin) return true;
    
    // Membro sem célula pode ser gerenciado
    if (!member.celulaId) return true;
    
    // Verificar se o membro está na mesma rede/discipulado/célula
    const memberCelula = celulas.find(c => c.id === member.celulaId);
    
    // Verificar se usuário tem célula e é a mesma célula do membro
    if (user.celula?.id === member.celulaId) {
      // Verificar hierarquia ministerial
      return isLowerMinistryLevel(member);
    }
    
    // Verificar se o usuário é discipulador do membro
    if (memberCelula?.discipuladoId) {
      const memberDiscipulado = discipulados.find(d => d.id === memberCelula.discipuladoId);
      if (memberDiscipulado?.discipuladorMemberId === user.id) {
        return isLowerMinistryLevel(member);
      }
      
      // Verificar se está na mesma rede
      if (memberDiscipulado?.redeId) {
        const memberRede = redes.find(r => r.id === memberDiscipulado.redeId);
        if (memberRede?.pastorMemberId === user.id) {
          return isLowerMinistryLevel(member);
        }
      }
    }
    
    return false;
  };

  // Verifica se o membro tem nível ministerial inferior ao usuário logado
  const isLowerMinistryLevel = (member: Member): boolean => {
    if (!user?.ministryPosition?.priority || !member.ministryPosition?.priority) {
      return true; // Se não tem priority definido, permite
    }
    
    // Priority maior = cargo menor na hierarquia
    return member.ministryPosition.priority > user.ministryPosition.priority;
  };

  // Retorna as tags de liderança do membro
  const getLeadershipTags = (member: Member): { label: string; color: string }[] => {
    const tags: { label: string; color: string }[] = [];
    
    // Pastor de Governo de Congregação
    if (member.congregacoesPastorGoverno && member.congregacoesPastorGoverno.length > 0) {
      tags.push({ label: 'Pastor de Governo', color: 'text-purple-400' });
    }
    
    // Vice-Presidente de Congregação
    if (member.congregacoesVicePresidente && member.congregacoesVicePresidente.length > 0) {
      tags.push({ label: 'Vice-Presidente', color: 'text-purple-400' });
    }
    
    // Pastor de Rede
    if (member.redes && member.redes.length > 0) {
      tags.push({ label: 'Pastor de Rede', color: 'text-blue-400' });
    }
    
    // Discipulador
    if (member.discipulados && member.discipulados.length > 0) {
      tags.push({ label: 'Discipulador', color: 'text-green-400' });
    }
    
    // Líder de Célula
    if (member.ledCelulas && member.ledCelulas.length > 0) {
      tags.push({ label: 'Líder de Célula', color: 'text-yellow-400' });
    }
    
    // Vice-Líder de Célula
    if (member.viceLedCelulas && member.viceLedCelulas.length > 0) {
      tags.push({ label: 'Líder em Treinamento', color: 'text-yellow-400' });
    }
    
    return tags;
  };

  const performDeleteMember = async () => {
    const member = confirmingMember;
    if (!member) return;
    try {
      await memberService.deleteMember(member.celulaId || 0, member.id);
      toast.success('Membro removido da célula');

      // Reload members
      const filters: MemberFilters = {};
      if (filterCelulaId !== null) filters.celulaId = filterCelulaId;
      if (filterDiscipuladoId) filters.discipuladoId = filterDiscipuladoId;
      if (filterRedeId) filters.redeId = filterRedeId;
      if (filterCongregacaoId) filters.congregacaoId = filterCongregacaoId;
      const refreshed = await memberService.getAllMembers(filters);
      setMembers(refreshed);
      setConfirmingMember(null);
    } catch (e) {
      console.error(e);
      toast.error('Falha ao remover');
    }
  };

  const cancelDelete = () => setConfirmingMember(null);

  // Verificar se há filtros ativos
  const hasActiveFilters = !!filterName || filterCongregacaoId !== null || filterRedeId !== null || filterDiscipuladoId !== null || filterCelulaId !== null || filterMyDisciples;

  // Limpar todos os filtros
  const clearAllFilters = () => {
    setFilterName('');
    setFilterMyDisciples(false);
    setFilterCongregacaoId(null);
    setFilterRedeId(null);
    setFilterDiscipuladoId(null);
    setFilterCelulaId(null);
  };

  // Configuração dos filtros para o modal
  const filterConfigs: FilterConfig[] = [
    {
      type: 'switch',
      label: '',
      value: filterMyDisciples,
      onChange: setFilterMyDisciples,
      switchLabelOff: 'Todos os membros',
      switchLabelOn: 'Meus discípulos'
    },
    {
      type: 'select',
      label: 'Nome do membro',
      value: filterName,
      onChange: setFilterName,
      renderCustom: () => (
        <ThemeProvider theme={muiTheme}>
          <TextField
            size="small"
            fullWidth
            placeholder="Digite o nome"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            className="bg-gray-700"
            InputProps={{
              className: 'bg-gray-700',
            }}
          />
        </ThemeProvider>
      )
    },
    {
      type: 'select',
      label: 'Congregação',
      value: filterCongregacaoId,
      onChange: (val) => {
        setFilterCongregacaoId(val);
        setFilterRedeId(null);
        setFilterDiscipuladoId(null);
        setFilterCelulaId(null);
      },
      options: congregacoes.map(c => ({ value: c.id, label: c.name }))
    },
    {
      type: 'select',
      label: 'Rede',
      value: filterRedeId,
      onChange: (val) => {
        setFilterRedeId(val);
        setFilterDiscipuladoId(null);
        setFilterCelulaId(null);
        if (val) {
          const rede = redes.find(r => r.id === val);
          if (rede?.congregacaoId) {
            setFilterCongregacaoId(rede.congregacaoId);
          }
        }
      },
      options: redes
        .filter(r => !filterCongregacaoId || r.congregacaoId === filterCongregacaoId)
        .map(r => ({ value: r.id, label: r.name }))
    },
    {
      type: 'select',
      label: 'Discipulado',
      value: filterDiscipuladoId,
      onChange: (val) => {
        setFilterDiscipuladoId(val);
        setFilterCelulaId(null);
        if (val) {
          const discipulado = discipulados.find(d => d.id === val);
          if (discipulado?.redeId) {
            setFilterRedeId(discipulado.redeId);
            const rede = redes.find(r => r.id === discipulado.redeId);
            if (rede?.congregacaoId) {
              setFilterCongregacaoId(rede.congregacaoId);
            }
          }
        }
      },
      options: discipulados
        .filter(d => !filterRedeId || d.redeId === filterRedeId)
        .map(d => ({ value: d.id, label: d.discipulador.name }))
    },
    {
      type: 'select',
      label: 'Célula',
      value: filterCelulaId,
      onChange: (val) => {
        setFilterCelulaId(val);
        if (val === 0) {
          setFilterRedeId(null);
          setFilterDiscipuladoId(null);
          setFilterCongregacaoId(null);
        } else if (val) {
          const celula = celulas.find(c => c.id === val);
          if (celula?.discipuladoId) {
            setFilterDiscipuladoId(celula.discipuladoId);
            const discipulado = discipulados.find(d => d.id === celula.discipuladoId);
            if (discipulado?.redeId) {
              setFilterRedeId(discipulado.redeId);
              const rede = redes.find(r => r.id === discipulado.redeId);
              if (rede?.congregacaoId) {
                setFilterCongregacaoId(rede.congregacaoId);
              }
            }
          }
        }
      },
      options: [
        { value: 0, label: 'Sem célula' },
        ...celulas
          .filter(c => !filterDiscipuladoId || c.discipuladoId === filterDiscipuladoId)
          .map(c => ({ value: c.id, label: c.name }))
      ]
    }
  ];

  const filteredMembers = members.filter(m => !filterName || m.name.toLowerCase().includes(filterName.toLowerCase()));

  return (
    <div className="relative pb-20">
      <ThemeProvider theme={muiTheme}>
        <h2 className="text-2xl font-semibold mb-4">Gestão de Membros</h2>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <TextField
            size="small"
            placeholder="Buscar por nome"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            className="w-64 bg-gray-800"
            InputProps={{
              className: 'bg-gray-800',
            }}
          />
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
              hasActiveFilters
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
            title="Filtros"
          >
            <FaFilter className="h-5 w-5" />
            <span>Filtros</span>
            {hasActiveFilters && (
              <span className="bg-white text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                {[filterName, filterCongregacaoId, filterRedeId, filterDiscipuladoId, filterCelulaId].filter(f => f !== null && f !== '').length + (filterMyDisciples ? 1 : 0)}
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
              title="Limpar filtros"
            >
              <FaFilterCircleXmark className="h-5 w-5" />
            </button>
          )}
        </div>

        <div>
          <h3 className="font-medium mb-3">Exibindo {filteredMembers.length} de {members.length} membros</h3>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
          <ul className="space-y-2">
            {filteredMembers.map((m) => {
              const leadershipTags = getLeadershipTags(m);
              const hasLeadership = leadershipTags.length > 0;
              const showNoCelula = !m.celulaId && !hasLeadership;

              return (
                <li
                  key={m.id}
                  className={`flex items-center gap-3 border p-2 rounded ${showNoCelula ? 'bg-red-900/20 border-red-700' : 'bg-gray-900'}`}
                >
                  <span className="flex-1">
                    <button
                      onClick={() => openViewModal(m)}
                      className="text-left hover:text-blue-400 transition-colors font-medium"
                    >
                      {m.name}
                    </button>
                    {showNoCelula && <span className="text-xs text-red-400 ml-2 font-semibold">(sem célula)</span>}
                    {m.celula && (
                      <span className="text-xs text-gray-400 ml-2">
                        - {m.celula.name}
                      </span>
                    )}
                    {leadershipTags.map((tag, idx) => (
                      <span key={idx} className={`text-xs ${tag.color} ml-2 font-semibold`}>
                        {tag.label}
                      </span>
                    ))}
                    {!m.isActive && <span className="text-xs text-gray-400 ml-2">(desligado)</span>}
                  </span>
                  {canManageMember(m) && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(m)}
                        aria-label="Editar membro"
                        className="p-1 rounded hover:bg-gray-800"
                      >
                        <FiEdit2 className="h-4 w-4 text-yellow-500" aria-hidden />
                      </button>
                      {m.celulaId && (
                        <button
                          onClick={() => removeMember(m)}
                          aria-label="Remover membro da célula"
                          className="p-1 rounded hover:bg-gray-800"
                        >
                          <FiTrash2 className="h-4 w-4 text-red-600" aria-hidden />
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          )}
        </div>

        {/* Floating Action Button */}
        <button
          onClick={openCreateModal}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-40"
          aria-label="Adicionar Membro"
        >
          <FiPlus className="h-6 w-6" />
        </button>

        {/* Member Modal */}
        <MemberModal
          member={modalMember}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setModalMember(null);
          }}
          onSave={handleModalSave}
          celulas={celulas}
        />

        {/* Member View Modal */}
        <MemberViewModal
          member={viewingMember}
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setViewingMember(null);
          }}
        />
        {/* FilterModal */}
        <FilterModal
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          onApply={() => {}}
          onClear={clearAllFilters}
          filters={filterConfigs}
          hasActiveFilters={hasActiveFilters}
        />
        {/* Delete confirmation modal */}
        {confirmingMember && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-gray-900 p-6 rounded w-11/12 sm:w-96">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Confirmação</h3>
                <p className="text-sm text-gray-400">Tem certeza que deseja remover <strong>{confirmingMember.name}</strong> da célula? O membro não será excluído, apenas sua associação com a célula será removida.</p>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={cancelDelete} className="px-3 py-2 border rounded">Cancelar</button>
                <button onClick={performDeleteMember} className="px-3 py-2 bg-red-600 text-white rounded">Remover da célula</button>
              </div>
            </div>
          </div>
        )}
      </ThemeProvider>
    </div>
  );
}
