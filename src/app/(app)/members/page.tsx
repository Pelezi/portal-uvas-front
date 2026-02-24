"use client";

import React, { useEffect, useState, useRef } from 'react';
import { celulasService } from '@/services/celulasService';
import { discipuladosService } from '@/services/discipuladosService';
import { redesService } from '@/services/redesService';
import { congregacoesService } from '@/services/congregacoesService';
import { memberService, MemberInput } from '@/services/memberService';
import { Celula, Member, Discipulado, Rede, Congregacao, MemberFilters } from '@/types';
import toast from 'react-hot-toast';
import { createTheme, ThemeProvider, TextField } from '@mui/material';
import { FiEdit2, FiTrash2, FiPlus, FiEye } from 'react-icons/fi';
import { FaFilter, FaFilterCircleXmark } from "react-icons/fa6";
import MemberModal from '@/components/MemberModal';
import MemberViewModal from '@/components/MemberViewModal';
import FilterModal, { FilterConfig } from '@/components/FilterModal';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';

export default function MembersManagementPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [celulas, setCelulas] = useState<Celula[]>([]);
  const [discipulados, setDiscipulados] = useState<Discipulado[]>([]);
  const [congregacoes, setCongregacoes] = useState<Congregacao[]>([]);
  const [redes, setRedes] = useState<Rede[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalMembers, setTotalMembers] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // Filters
  const [filterName, setFilterName] = useState('');
  const [filterMyDisciples, setFilterMyDisciples] = useState(true);
  const [filterInactive, setFilterInactive] = useState(false);
  const [filterCelulaId, setFilterCelulaId] = useState<number | null>(null);
  const [filterDiscipuladoId, setFilterDiscipuladoId] = useState<number | null>(null);
  const [filterCongregacaoId, setFilterCongregacaoId] = useState<number | null>(null);
  const [filterRedeId, setFilterRedeId] = useState<number | null>(null);

  const canSeeAllFilters = !!user?.permission?.isAdmin || !!user?.permission?.pastorPresidente || !filterMyDisciples;

  const [confirmingMember, setConfirmingMember] = useState<Member | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMemberId, setModalMemberId] = useState<number | null>(null);

  // View modal state
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingMemberId, setViewingMemberId] = useState<number | null>(null);

  // Filter modal state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const membersRequestControllerRef = useRef<AbortController | null>(null);

  // Reset to first page when any filter changes
  const prevFiltersRef = useRef({ filterCelulaId, filterDiscipuladoId, filterRedeId, filterCongregacaoId, filterName, filterMyDisciples, filterInactive, pageSize });
  useEffect(() => {
    const prev = prevFiltersRef.current;
    const changed = prev.filterCelulaId !== filterCelulaId || prev.filterDiscipuladoId !== filterDiscipuladoId ||
      prev.filterRedeId !== filterRedeId || prev.filterCongregacaoId !== filterCongregacaoId ||
      prev.filterName !== filterName || prev.filterMyDisciples !== filterMyDisciples || prev.filterInactive !== filterInactive ||
      prev.pageSize !== pageSize;
    if (changed) {
      setCurrentPage(1);
    }
    prevFiltersRef.current = { filterCelulaId, filterDiscipuladoId, filterRedeId, filterCongregacaoId, filterName, filterMyDisciples, filterInactive, pageSize };
  }, [filterCelulaId, filterDiscipuladoId, filterRedeId, filterCongregacaoId, filterName, filterMyDisciples, filterInactive, pageSize]);

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
          celulasService.getCelulas(canSeeAllFilters ? { all: true } : undefined),
          discipuladosService.getDiscipulados(canSeeAllFilters ? { all: true } : undefined),
          redesService.getRedes(canSeeAllFilters ? { all: true } : {}),
          congregacoesService.getCongregacoes(canSeeAllFilters ? { all: true } : undefined)
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
  }, [authLoading, canSeeAllFilters]);

  useEffect(() => {
    const controller = new AbortController();

    const loadMembers = async () => {
      if (authLoading) return;

      membersRequestControllerRef.current?.abort();
      membersRequestControllerRef.current = controller;

      setLoading(true);
      try {
        const filters: MemberFilters = {};
        // filterCelulaId = 0 significa "sem célula", null significa "todas"
        if (filterCelulaId !== null) filters.celulaId = filterCelulaId;
        if (filterDiscipuladoId) filters.discipuladoId = filterDiscipuladoId;
        if (filterRedeId) filters.redeId = filterRedeId;
        if (filterCongregacaoId) filters.congregacaoId = filterCongregacaoId;
        if (filterName) filters.name = filterName;
        if (!filterMyDisciples) filters.all = true;
        // filterInactive: true = apenas inativos, false = apenas ativos
        filters.isActive = !filterInactive;
        filters.page = currentPage;
        filters.pageSize = pageSize;

        const result = await memberService.getAllMembers(filters, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setMembers(result.data);
        setTotalMembers(result.total);
      } catch (e) {
        if ((e as { code?: string; name?: string })?.code === 'ERR_CANCELED' || (e as { code?: string; name?: string })?.name === 'CanceledError') {
          return;
        }
        console.error(e);
        toast.error('Falha ao carregar membros');
      } finally {
        if (!controller.signal.aborted && membersRequestControllerRef.current === controller) {
          setLoading(false);
        }
      }
    };
    loadMembers();

    return () => {
      controller.abort();
      if (membersRequestControllerRef.current === controller) {
        membersRequestControllerRef.current = null;
      }
    };
  }, [filterCelulaId, filterDiscipuladoId, filterRedeId, filterCongregacaoId, filterName, filterMyDisciples, filterInactive, currentPage, pageSize, authLoading]);

  const openEditModal = (m: Member) => {
    setModalMemberId(m.id);
    setIsModalOpen(true);
  };

  const openViewModal = (m: Member) => {
    setViewingMemberId(m.id);
    setIsViewModalOpen(true);
  };

  const openCreateModal = () => {
    setModalMemberId(null);
    setIsModalOpen(true);
  };

  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleModalSave = async (data: Partial<Member>, photo?: File, deletePhoto?: boolean, originalMember?: Member | null): Promise<Member> => {
    let savedMember: Member;
    const wasCreating = !modalMemberId;
    const wasEnablingAccess = !originalMember?.hasSystemAccess && data.hasSystemAccess;

    try {
      if (modalMemberId) {
        // Editing
        savedMember = await memberService.updateMember(0, modalMemberId, data, photo, deletePhoto);
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
        setModalMemberId(null);

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
      if (!filterMyDisciples) filters.all = true;
      filters.isActive = !filterInactive;
      filters.page = currentPage;
      filters.pageSize = pageSize;
      const refreshed = await memberService.getAllMembers(filters);
      setMembers(refreshed.data);
      setTotalMembers(refreshed.total);
      setIsModalOpen(false);
      setModalMemberId(null);

      // Enviar convite em background após fechar o modal
      const shouldSendInvite = data.hasSystemAccess && data.email && data.email.trim() && (
        wasCreating || // Criar novo membro com acesso
        (wasEnablingAccess && originalMember?.hasDefaultPassword !== false && !originalMember?.inviteSent) // Ativando acesso pela primeira vez
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
      if (!filterMyDisciples) filters.all = true;
      filters.isActive = !filterInactive;
      filters.page = currentPage;
      filters.pageSize = pageSize;
      const refreshed = await memberService.getAllMembers(filters);
      setMembers(refreshed.data);
      setTotalMembers(refreshed.total);
      // If current page is now empty and not the first page, go back one page
      if (refreshed.data.length === 0 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
      setConfirmingMember(null);
    } catch (e) {
      console.error(e);
      toast.error('Falha ao remover');
    }
  };

  const cancelDelete = () => setConfirmingMember(null);

  // Verificar se há filtros ativos
  const hasActiveFilters = !!filterName || filterCongregacaoId !== null || filterRedeId !== null || filterDiscipuladoId !== null || filterCelulaId !== null || filterMyDisciples || filterInactive;

  // Limpar todos os filtros
  const clearAllFilters = () => {
    setFilterName('');
    setFilterMyDisciples(false);
    setFilterInactive(false);
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
      switchLabelOn: 'Meus discípulos',
      inline: true
    },
    {
      type: 'switch',
      label: '',
      value: filterInactive,
      onChange: setFilterInactive,
      switchLabelOff: 'Apenas ativos',
      switchLabelOn: 'Apenas inativos'
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

  // Filtro de nome agora é feito pela API
  const filteredMembers = members;
  const totalPages = Math.max(1, Math.ceil(totalMembers / pageSize));

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
            className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${hasActiveFilters
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
            title="Filtros"
          >
            <FaFilter className="h-5 w-5" />
            <span>Filtros</span>
            {hasActiveFilters && (
              <span className="bg-white text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                {[filterName, filterCongregacaoId, filterRedeId, filterDiscipuladoId, filterCelulaId].filter(f => f !== null && f !== '').length + (filterMyDisciples ? 1 : 0) + (filterInactive ? 1 : 0)}
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
          <h3 className="font-medium mb-3">{totalMembers} membro{totalMembers !== 1 ? 's' : ''} encontrado{totalMembers !== 1 ? 's' : ''}</h3>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <ul className="space-y-3">
              {filteredMembers.map((m) => {
                const leadershipTags: { label: string; color: string }[] = (m as any).leadershipTags || [];
                const hasLeadership = leadershipTags.length > 0;
                const showNoCelula = !m.celulaId && !hasLeadership;

                return (
                  <li
                    key={m.id}
                    className={`bg-gray-800 border rounded-lg hover:border-gray-600 transition-colors ${showNoCelula ? 'border-red-700' : 'border-gray-700'}`}
                  >
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {m.photoUrl ? (
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={m.photoUrl} alt={m.name} />
                            <AvatarFallback className="bg-gray-700 text-white text-sm">
                              {getInitials(m.name)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <Avatar className={`w-10 h-10 ${showNoCelula ? 'bg-red-900/30' : ''}`}>
                            <AvatarFallback className={`text-sm ${showNoCelula ? 'text-red-400' : 'bg-gray-700 text-white'}`}>
                              {getInitials(m.name)}
                            </AvatarFallback>
                          </Avatar>
                        )}

                        <div className="flex-1">
                          <h4 className="font-medium text-white">
                            {m.name}
                            {showNoCelula && <span className="text-xs text-red-400 ml-2 font-semibold">(sem célula)</span>}
                            {!m.isActive && <span className="text-xs text-gray-400 ml-2">(desligado)</span>}
                          </h4>
                          <p className="text-sm text-gray-400 mt-1">
                            {m.celula && `${m.celula.name}`}
                            {leadershipTags.map((tag, idx) => (
                              <span key={idx} className={`${tag.color} ml-2 font-semibold`}>
                                • {tag.label}
                              </span>
                            ))}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openViewModal(m)}
                          className="p-2 text-blue-400 hover:bg-blue-900/30 rounded transition-colors"
                          title="Visualizar detalhes"
                        >
                          <FiEye className="h-4 w-4" />
                        </button>
                        {(m as any).canManage && (
                          <button
                            onClick={() => openEditModal(m)}
                            className="p-2 text-gray-400 hover:bg-gray-700 rounded transition-colors"
                            title="Editar"
                          >
                            <FiEdit2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Pagination controls */}
          {!loading && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-300">Itens por página</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-gray-800 border border-gray-700 text-sm rounded px-2 py-1"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1 || totalPages === 1}
                className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-sm transition-colors"
              >
                «
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || totalPages === 1}
                className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-sm transition-colors"
              >
                ‹ Anterior
              </button>
              <span className="px-3 py-2 text-sm text-gray-300">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 1}
                className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-sm transition-colors"
              >
                Próxima ›
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages === 1}
                className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-sm transition-colors"
              >
                »
              </button>
            </div>
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
          memberId={modalMemberId}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setModalMemberId(null);
          }}
          onSave={handleModalSave}
          celulas={celulas}
        />

        {/* Member View Modal */}
        <MemberViewModal
          memberId={viewingMemberId}
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setViewingMemberId(null);
          }}
        />
        {/* FilterModal */}
        <FilterModal
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          onApply={() => { }}
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
