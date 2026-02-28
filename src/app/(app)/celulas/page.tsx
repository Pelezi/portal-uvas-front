"use client";

import React, { useEffect, useState, useRef } from 'react';
import { celulasService } from '@/services/celulasService';
import { discipuladosService } from '@/services/discipuladosService';
import { redesService } from '@/services/redesService';
import { congregacoesService } from '@/services/congregacoesService';
import { Celula, Member, Discipulado, Rede, Congregacao } from '@/types';
import { memberService } from '@/services/memberService';
import { useAuth } from '@/contexts/AuthContext';
import { createTheme, FormControl, InputLabel, MenuItem, Select, ThemeProvider, TextField, Autocomplete, Button } from '@mui/material';
import toast from 'react-hot-toast';
import { ErrorMessages } from '@/lib/errorHandler';

// Ícones
import { FiPlus, FiUsers, FiEdit2, FiCopy, FiTrash2, FiEye } from 'react-icons/fi';
import { FaFilter, FaFilterCircleXmark } from "react-icons/fa6";
import { LuHistory } from 'react-icons/lu';


import Link from 'next/link';
import dynamic from 'next/dynamic';
import CelulaModal from '@/components/CelulaModal';
import FilterModal, { FilterConfig } from '@/components/FilterModal';

const CelulaViewModal = dynamic(() => import('@/components/CelulaViewModal'), { ssr: false });
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

export default function CelulasPage() {
  const [groups, setGroups] = useState<Celula[]>([]);
  // REMOVIDO: cellMembersCount e cellHasInactive - não são mais necessários
  // A validação será feita pelo backend ao tentar deletar
  const [confirmingCelula, setConfirmingCelula] = useState<Celula | null>(null);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [showCelulaModal, setShowCelulaModal] = useState(false);
  const [editingCelula, setEditingCelula] = useState<Celula | null>(null);

  // View modal state
  const [viewingCelulaId, setViewingCelulaId] = useState<number | null>(null);

  // Filter modal state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // listing filters
  const [filterName, setFilterName] = useState('');
  const [filterMyCells, setFilterMyCells] = useState(true);
  const [filterCongregacaoId, setFilterCongregacaoId] = useState<number | null>(null);
  const [filterRedeId, setFilterRedeId] = useState<number | null>(null);
  const [filterDiscipuladoId, setFilterDiscipuladoId] = useState<number | null>(null);
  const [filterLeaderId, setFilterLeaderId] = useState<number | null>(null);

  const [members, setMembers] = useState<Member[]>([]);
  const [discipulados, setDiscipulados] = useState<Discipulado[]>([]);
  const [congregacoes, setCongregacoes] = useState<Congregacao[]>([]);
  const [redes, setRedes] = useState<Rede[]>([]);

  // Multiply: open modal to pick members for the new celula and call backend
  const [multiplyingCelula, setMultiplyingCelula] = useState<Celula | null>(null);
  const [availableMembers, setAvailableMembers] = useState<Member[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [newCelulaNameField, setNewCelulaNameField] = useState('');
  const [newLeaderQuery, setNewLeaderQuery] = useState('');
  const [newLeaderId, setNewLeaderId] = useState<number | null>(null);
  const [newLeaderName, setNewLeaderName] = useState('');
  const [showNewLeaderDropdown, setShowNewLeaderDropdown] = useState(false);
  const newLeaderDropdownRef = useRef<HTMLDivElement>(null);
  const [oldLeaderQuery, setOldLeaderQuery] = useState('');
  const [oldLeaderId, setOldLeaderId] = useState<number | null>(null);
  const [oldLeaderName, setOldLeaderName] = useState('');
  const [showOldLeaderDropdown, setShowOldLeaderDropdown] = useState(false);
  const oldLeaderDropdownRef = useRef<HTMLDivElement>(null);
  const [celulaLeadersInTraining, setCelulaLeadersInTraining] = useState<Member[]>([]);

  const { user, isLoading: authLoading } = useAuth();

  const muiTheme = createTheme({
    palette: {
      mode: 'dark',
    },
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (showNewLeaderDropdown) {
        if (newLeaderDropdownRef.current && !newLeaderDropdownRef.current.contains(target)) {
          setShowNewLeaderDropdown(false);
        }
      }
      if (showOldLeaderDropdown) {
        if (oldLeaderDropdownRef.current && !oldLeaderDropdownRef.current.contains(target)) {
          setShowOldLeaderDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNewLeaderDropdown, showOldLeaderDropdown]);

  const handleToggleIsOk = async (celula: Celula) => {
    try {
      await celulasService.updateCelula(celula.id, { isOk: !celula.isOk });
      // Atualizar o estado local
      setGroups(prev => prev.map(g => g.id === celula.id ? { ...g, isOk: !celula.isOk } : g));
      toast.success('Status atualizado com sucesso!');
    } catch (e) {
      console.error(e);
      toast.error(ErrorMessages.updateCelula(e));
    }
  };

  const load = async () => {
    if (authLoading) return;

    setLoading(true);
    try {
      const filters: any = {};

      if (filterName) filters.name = filterName;
      if (filterLeaderId) filters.leaderMemberId = filterLeaderId;
      if (filterDiscipuladoId) filters.discipuladoId = filterDiscipuladoId;
      if (filterRedeId) filters.redeId = filterRedeId;
      if (filterCongregacaoId) filters.congregacaoId = filterCongregacaoId;
      if (!filterMyCells) filters.all = true;

      const g = await celulasService.getCelulas(filters);

      // Mostrar todas as células, sem filtrar por permissão
      setGroups(g);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    const loadFilters = async () => {
      if (authLoading) return;
      try {
        // Carregar apenas usuários que podem ser líderes (PRESIDENT_PASTOR, PASTOR, DISCIPULADOR, LEADER ou LEADER_IN_TRAINING)
        const isAdmin = user?.permission?.isAdmin || false;
        const u = await memberService.getMembersAutocomplete({ 
          ministryType: 'PRESIDENT_PASTOR,PASTOR,DISCIPULADOR,LEADER,LEADER_IN_TRAINING,MEMBER',
          ...(isAdmin && { all: true })
        });
        setMembers(u || []);

        // load discipulados for select
        const d = await discipuladosService.getDiscipulados(isAdmin ? { all: true } : undefined);
        setDiscipulados(d || []);

        // load redes for select
        const r = await redesService.getRedes(isAdmin ? { all: true } : {});
        setRedes(r || []);

        // load congregacoes for select
        const cong = await congregacoesService.getCongregacoes(isAdmin ? { all: true } : undefined);
        setCongregacoes(cong || []);
      } catch (err) {
        console.error('failed load filters', err);
      }
    };
    loadFilters();
  }, [authLoading]);

  // Re-load when filters change
  useEffect(() => {
    if (!authLoading) {
      load();
    }
  }, [filterName, filterCongregacaoId, filterRedeId, filterDiscipuladoId, filterLeaderId, filterMyCells, authLoading]);

  const handleSaveCelula = async (data: {
    name: string;
    leaderMemberId?: number;
    discipuladoId?: number;
    leaderInTrainingIds?: number[];
    weekday?: number;
    time?: string;
    country?: string;
    zipCode?: string;
    street?: string;
    streetNumber?: string;
    neighborhood?: string;
    city?: string;
    complement?: string;
    state?: string;
    parallelCelulaId?: number | null;
  }) => {
    try {
      const payload = { ...data, parallelCelulaId: data.parallelCelulaId ?? undefined };
      if (editingCelula) {
        // Edit mode
        await celulasService.updateCelula(editingCelula.id, payload);
        toast.success('Célula atualizada com sucesso!');
      } else {
        // Create mode
        await celulasService.createCelula(payload);
        toast.success('Célula criada com sucesso!');
      }
      setShowCelulaModal(false);
      setEditingCelula(null);
      load();
    } catch (e) {
      console.error(e);
      toast.error(editingCelula ? ErrorMessages.updateCelula(e) : ErrorMessages.createCelula(e));
      throw e; // Re-throw to prevent modal from closing
    }
  };

  const handleCloseCelulaModal = () => {
    setShowCelulaModal(false);
    setEditingCelula(null);
  };

  const handleOpenCreateModal = () => {
    setEditingCelula(null);
    setShowCelulaModal(true);
  };

  const handleOpenEditModal = (celula: Celula) => {
    setEditingCelula(celula);
    setShowCelulaModal(true);
  };

  const handleOpenViewModal = (celula: Celula) => {
    setViewingCelulaId(celula.id);
  };

  const handleCloseViewModal = () => {
    setViewingCelulaId(null);
  };

  const duplicate = async (g: Celula) => {
    try {
      await celulasService.createCelula({ name: `${g.name} (cópia)`, leaderMemberId: g.leader?.id });
      toast.success('Célula duplicada com sucesso!');
      load();
    } catch (e) {
      console.error(e);
      toast.error(ErrorMessages.duplicateCelula(e));
    }
  };

  const openMultiply = async (g: Celula) => {
    setMultiplyingCelula(g);
    setNewCelulaNameField(`${g.name} - Nova`);
    setOldLeaderId(g.leader?.id || null);
    setOldLeaderName(g.leader?.name || '');
    setOldLeaderQuery('');
    setNewLeaderId(null);
    setNewLeaderName('');
    setNewLeaderQuery('');
    setSelectedMemberIds([]);
    try {
      const m = await memberService.getMembers(g.id);
      setAvailableMembers(m);

      // Se houver apenas um líder em treinamento, pré-seleciona ele como novo líder
      const leadersInTraining = m.filter(
        member => member.leadingInTrainingCelulas?.some(c => c.celulaId === g.id)
      );
      // Include the current leader as a potential leader for the new celula
      const allPotentialLeaders = g.leader ? [g.leader, ...leadersInTraining] : leadersInTraining;
      setCelulaLeadersInTraining(allPotentialLeaders);
      if (leadersInTraining.length === 1) {
        setNewLeaderId(leadersInTraining[0].id);
        setNewLeaderName(leadersInTraining[0].name);
      }
    } catch (err) {
      console.error(err);
      toast.error(ErrorMessages.loadMembers(err));
    }
  };

  const toggleMemberSelection = (id: number) => {
    setSelectedMemberIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const submitMultiply = async () => {
    if (!multiplyingCelula) return;
    try {
      await celulasService.multiplyCelula(multiplyingCelula.id, {
        memberIds: selectedMemberIds,
        newCelulaName: newCelulaNameField,
        newLeaderMemberId: newLeaderId || undefined,
        oldLeaderMemberId: oldLeaderId || undefined,
      });
      toast.success('Célula multiplicada com sucesso!');
      setMultiplyingCelula(null);
      load();
    } catch (e) {
      console.error(e);
      toast.error(ErrorMessages.multiplyCelula(e));
    }
  };

  // Acompanhamento agora é uma página separada em /celulas/[id]/presence

  // Funções auxiliares de permissão
  const isAdmin = () => !user?.permission || user.permission.isAdmin;
  const isPresidentPastor = () => user?.permission?.ministryType === 'PRESIDENT_PASTOR';
  
  // Verifica se é líder da célula específica
  const isCelulaLeader = (celulaId: number) => user?.id === groups.find(c => c.id === celulaId)?.leader?.id;
  
  // Verifica se é discipulador da célula
  const isDiscipuladorOfCelula = (celula: Celula) => {
    return celula.discipulado?.discipuladorMemberId === user?.id;
  };
  
  // Verifica se é pastor de rede da célula
  const isPastorDeRedeOfCelula = (celula: Celula) => {
    return celula.discipulado?.rede?.pastorMemberId === user?.id;
  };
  
  // Verifica se é pastor da congregação da célula
  const isPastorDaCongregacaoOfCelula = (celula: Celula) => {
    return celula.discipulado?.rede?.congregacao?.pastorGovernoMemberId === user?.id || celula.discipulado?.rede?.congregacao?.vicePresidenteMemberId === user?.id;
  };

  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Permissões para cada ação
  const canEdit = (celula: Celula) => {
    // Admin e Pastor Presidente têm permissão geral
    if (isAdmin() || isPresidentPastor()) return true;
    
    // Líder, Discipulador, Pastor de Rede e Pastor da Congregação podem editar
    return isCelulaLeader(celula.id) || 
           isDiscipuladorOfCelula(celula) || 
           isPastorDeRedeOfCelula(celula) || 
           isPastorDaCongregacaoOfCelula(celula);
  };

  const canMultiply = (celula: Celula) => {
    // Admin e Pastor Presidente têm permissão geral
    if (isAdmin() || isPresidentPastor()) return true;
    
    // Apenas Discipulador, Pastor de Rede e Pastor da Congregação podem multiplicar (LÍDER NÃO PODE)
    return isDiscipuladorOfCelula(celula) || 
           isPastorDeRedeOfCelula(celula) || 
           isPastorDaCongregacaoOfCelula(celula);
  };

  const canDelete = (celula: Celula) => {
    // Admin e Pastor Presidente têm permissão geral
    if (isAdmin() || isPresidentPastor()) return true;
    
    // Apenas Discipulador, Pastor de Rede e Pastor da Congregação podem deletar (LÍDER NÃO PODE)
    return isDiscipuladorOfCelula(celula) || 
           isPastorDeRedeOfCelula(celula) || 
           isPastorDaCongregacaoOfCelula(celula);
  };

  const canViewTracking = (celula: Celula) => {
    // Admin e Pastor Presidente têm permissão geral
    if (isAdmin() || isPresidentPastor()) return true;
    
    // Líder, Discipulador, Pastor de Rede e Pastor da Congregação podem acompanhar
    return isCelulaLeader(celula.id) || 
           isDiscipuladorOfCelula(celula) || 
           isPastorDeRedeOfCelula(celula) || 
           isPastorDaCongregacaoOfCelula(celula);
  };

  // Verificar se há filtros ativos
  const hasActiveFilters = !!filterName || filterCongregacaoId !== null || filterRedeId !== null || filterDiscipuladoId !== null || filterLeaderId !== null || filterMyCells;

  // Limpar todos os filtros
  const clearAllFilters = () => {
    setFilterName('');
    setFilterMyCells(false);
    setFilterCongregacaoId(null);
    setFilterRedeId(null);
    setFilterDiscipuladoId(null);
    setFilterLeaderId(null);
  };

  // Configuração dos filtros para o modal
  const filterConfigs: FilterConfig[] = [
    {
      type: 'switch',
      label: '',
      value: filterMyCells,
      onChange: setFilterMyCells,
      switchLabelOff: 'Todas as células',
      switchLabelOn: 'Minhas células'
    },
    {
      type: 'select',
      label: 'Nome da célula',
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
      },
      options: redes
        .filter(r => !filterCongregacaoId || r.congregacaoId === filterCongregacaoId)
        .map(r => ({ value: r.id, label: r.name }))
    },
    {
      type: 'select',
      label: 'Discipulado',
      value: filterDiscipuladoId,
      onChange: setFilterDiscipuladoId,
      options: discipulados
        .filter(d => !filterRedeId || d.redeId === filterRedeId)
        .map(d => ({ value: d.id, label: d.discipulador?.name || 'Sem discipulador' }))
    },
    {
      type: 'select',
      label: 'Líder',
      value: filterLeaderId,
      onChange: setFilterLeaderId,
      renderCustom: () => (
        <ThemeProvider theme={muiTheme}>
          <Autocomplete
            size="small"
            fullWidth
            options={members.filter(member => {
              const filteredCells = groups.filter(celula => {
                if (filterCongregacaoId) {
                  const discipulado = discipulados.find(d => d.id === celula.discipuladoId);
                  if (!discipulado) return false;
                  const rede = redes.find(r => r.id === discipulado.redeId);
                  if (!rede || rede.congregacaoId !== filterCongregacaoId) return false;
                }
                if (filterRedeId) {
                  const discipulado = discipulados.find(d => d.id === celula.discipuladoId);
                  if (!discipulado || discipulado.redeId !== filterRedeId) return false;
                }
                if (filterDiscipuladoId && celula.discipuladoId !== filterDiscipuladoId) return false;
                return true;
              });
              return filteredCells.some(c => c.leaderMemberId === member.id);
            })}
            getOptionLabel={(option) => option.name}
            value={members.find(m => m.id === filterLeaderId) || null}
            onChange={(event, newValue) => setFilterLeaderId(newValue?.id || null)}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Selecione um líder"
                className="bg-gray-700"
              />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.id}>
                <div>
                  <div className="text-sm font-medium">{option.name}</div>
                  <div className="text-xs text-gray-400">{option.email}</div>
                </div>
              </li>
            )}
          />
        </ThemeProvider>
      )
    }
  ];

  const filteredGroups = groups.filter(g => !filterName || g.name.toLowerCase().includes(filterName.toLowerCase()));

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Gerenciar Células</h2>

      <ThemeProvider theme={muiTheme}>
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
                {[filterName, filterCongregacaoId, filterRedeId, filterDiscipuladoId, filterLeaderId].filter(f => f !== null && f !== '').length + (filterMyCells ? 1 : 0)}
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
      </ThemeProvider>

      <div>
        <h3 className="font-medium mb-2">Exibindo {filteredGroups.length} de {groups.length} células</h3>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <ul className="space-y-3">
            {filteredGroups.map((g) => {
              const leader = g.leader;
              const discipulado = g.discipulado;
              const rede = discipulado?.rede;
              const congregacao = rede?.congregacao;
              
              return (
                <li key={g.id} className={`bg-gray-800 border rounded-lg hover:border-gray-600 transition-colors ${!g.leaderMemberId ? 'border-red-700' : 'border-gray-700'}`}>
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {leader?.photoUrl ? (
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={leader.photoUrl} alt={leader.name} />
                          <AvatarFallback className="bg-gray-700 text-white text-sm">
                            {getInitials(leader.name)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className={!g.leaderMemberId ? "bg-red-900/30 text-red-400 text-sm" : "bg-gray-700 text-white text-sm"}>
                            {leader ? getInitials(leader.name) : '?'}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      
                      <div className="flex-1">
                        <h4 className="font-medium text-white">
                          {g.name}
                          {!g.leaderMemberId && <span className="text-xs text-red-400 ml-2">(sem líder)</span>}
                        </h4>
                        <p className="text-sm text-gray-400 mt-1">
                          Líder: {leader?.name || <span className="text-red-400">Não definido</span>}
                          {rede && ` • Rede: ${rede.name}`}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">ID: {g.id}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 cursor-pointer" title="Marcar como OK">
                        <input
                          type="checkbox"
                          checked={g.isOk || false}
                          onChange={() => handleToggleIsOk(g)}
                          className="w-4 h-4 accent-green-500 cursor-pointer"
                        />
                        <span className="text-xs text-gray-400">OK</span>
                      </label>
                      <button
                        onClick={() => handleOpenViewModal(g)}
                        className="p-2 text-blue-400 hover:bg-blue-900/30 rounded transition-colors"
                        title="Visualizar detalhes"
                      >
                        <FiEye className="h-4 w-4" />
                      </button>
                      {canEdit(g) && (
                        <Link href={`/celulas/${g.id}/members`} className="p-2 text-purple-400 hover:bg-purple-900/30 rounded transition-colors" title="Membros">
                          <FiUsers className="h-4 w-4" />
                        </Link>
                      )}
                      {canEdit(g) && (
                        <button
                          onClick={() => handleOpenEditModal(g)}
                          className="p-2 text-gray-400 hover:bg-gray-700 rounded transition-colors"
                          title="Editar"
                        >
                          <FiEdit2 className="h-4 w-4" />
                        </button>
                      )}
                      {canMultiply(g) && (
                        <button
                          onClick={() => openMultiply(g)}
                          className="p-2 text-indigo-400 hover:bg-indigo-900/30 rounded transition-colors"
                          title="Multiplicar"
                        >
                          <FiCopy className="h-4 w-4" />
                        </button>
                      )}
                      {canDelete(g) && (
                        <button
                          onClick={() => setConfirmingCelula(g)}
                          className="p-2 text-red-400 hover:bg-red-900/30 rounded transition-colors"
                          title="Excluir célula"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      )}
                      {canViewTracking(g) && (
                        <Link
                          href="/report/view"
                          className="p-2 text-teal-400 hover:bg-teal-900/30 rounded transition-colors"
                          title="Acompanhamento"
                        >
                          <LuHistory className="h-4 w-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Floating create button */}
      {(isAdmin() || isPresidentPastor() || user?.permission?.ministryType === 'PASTOR' || user?.permission?.ministryType === 'DISCIPULADOR') && (
        <button aria-label="Criar célula" onClick={handleOpenCreateModal} className="fixed right-6 bottom-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg z-50">
          <FiPlus className="h-7 w-7" aria-hidden />
        </button>
      )}

      {/* CelulaModal */}
      <CelulaModal
        celulaId={editingCelula?.id}
        isOpen={showCelulaModal}
        onClose={handleCloseCelulaModal}
        onSave={handleSaveCelula}
        members={members}
        discipulados={discipulados}
        redes={redes}
      />

      {multiplyingCelula && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-start sm:items-center justify-center pt-20 sm:pt-0 z-50">
          <div className="bg-gray-900 p-4 rounded w-11/12 sm:w-[720px] max-h-[80vh] overflow-auto">
            <h4 className="font-semibold mb-4 text-white">Multiplicar: {multiplyingCelula.name}</h4>

            <div className="mb-4">
              <label className="block text-sm mb-1 text-gray-300">Nome da nova célula</label>
              <input value={newCelulaNameField} onChange={(e) => setNewCelulaNameField(e.target.value)} className="w-full border p-2 rounded bg-gray-800 text-white h-10" />
            </div>

            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1 text-gray-300">Líder da célula atual</label>
                <div ref={newLeaderDropdownRef} className="relative w-full">
                  <input
                    placeholder="Buscar líder"
                    value={newLeaderQuery || newLeaderName}
                    onChange={(e) => {
                      setNewLeaderQuery(e.target.value);
                      setNewLeaderName('');
                      setNewLeaderId(null);
                      setShowNewLeaderDropdown(true);
                    }}
                    onFocus={() => setShowNewLeaderDropdown(true)}
                    className="border p-2 rounded w-full bg-gray-800 text-white h-10"
                  />
                  {showNewLeaderDropdown && (
                    <div className="absolute left-0 right-0 bg-gray-800 border mt-1 rounded max-h-44 overflow-auto z-50">
                      {celulaLeadersInTraining.filter(member => {
                        const q = (newLeaderQuery || '').toLowerCase();
                        if (!q) return true;
                        return (member.name.toLowerCase().includes(q) || (member.email || '').toLowerCase().includes(q));
                      }).map(member => (
                        <div
                          key={member.id}
                          className="px-3 py-2 hover:bg-gray-700 cursor-pointer flex items-center justify-between"
                          onMouseDown={() => {
                            setNewLeaderId(member.id);
                            setNewLeaderName(member.name);
                            setNewLeaderQuery('');
                            setShowNewLeaderDropdown(false);
                          }}
                        >
                          <div>
                            <div className="text-sm font-medium text-white">{member.name}</div>
                            <div className="text-xs text-gray-400">{member.email}</div>
                          </div>
                          <div className="text-xs text-green-600">Selecionar</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1 text-gray-300">Líder da nova célula</label>
                <div ref={oldLeaderDropdownRef} className="relative w-full">
                  <input
                    placeholder="Buscar líder"
                    value={oldLeaderQuery || oldLeaderName}
                    onChange={(e) => {
                      setOldLeaderQuery(e.target.value);
                      setOldLeaderName('');
                      setOldLeaderId(null);
                      setShowOldLeaderDropdown(true);
                    }}
                    onFocus={() => setShowOldLeaderDropdown(true)}
                    className="border p-2 rounded w-full bg-gray-800 text-white h-10"
                  />
                  {showOldLeaderDropdown && (
                    <div className="absolute left-0 right-0 bg-gray-800 border mt-1 rounded max-h-44 overflow-auto z-50">
                      {celulaLeadersInTraining.filter(member => {
                        const q = (oldLeaderQuery || '').toLowerCase();
                        if (!q) return true;
                        return (member.name.toLowerCase().includes(q) || (member.email || '').toLowerCase().includes(q));
                      }).map(member => (
                        <div
                          key={member.id}
                          className="px-3 py-2 hover:bg-gray-700 cursor-pointer flex items-center justify-between"
                          onMouseDown={() => {
                            setOldLeaderId(member.id);
                            setOldLeaderName(member.name);
                            setOldLeaderQuery('');
                            setShowOldLeaderDropdown(false);
                          }}
                        >
                          <div>
                            <div className="text-sm font-medium text-white">{member.name}</div>
                            <div className="text-xs text-gray-400">{member.email}</div>
                          </div>
                          <div className="text-xs text-green-600">Selecionar</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="font-medium text-white mb-2">Membros para a nova célula</div>
              <div className="space-y-2 max-h-64 overflow-auto">
                {availableMembers.filter(m => m.id !== newLeaderId && m.id !== oldLeaderId).length === 0 && <div className="text-sm text-gray-400 text-center py-4">Nenhum membro disponível</div>}
                {availableMembers.filter(m => m.id !== newLeaderId && m.id !== oldLeaderId).map((m) => {
                  const selected = selectedMemberIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleMemberSelection(m.id)}
                      className={`w-full text-left flex items-center justify-between p-3 rounded-lg border transition-colors ${selected
                          ? 'border-green-500 bg-green-900/20'
                          : 'border-gray-700 hover:bg-gray-800'
                        }`}
                    >
                      <span className="truncate font-medium text-white">{m.name}</span>
                      {selected && (
                        <span className="text-xs text-green-400 font-semibold">✓ Selecionado</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-700">
              <button onClick={() => setMultiplyingCelula(null)} className="px-4 py-2 hover:bg-gray-800 rounded">Cancelar</button>
              <button onClick={submitMultiply} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded">Multiplicar</button>
            </div>
          </div>
        </div>
      )}

      {/* CelulaViewModal */}
      <CelulaViewModal
        celulaId={viewingCelulaId}
        isOpen={!!viewingCelulaId}
        onClose={handleCloseViewModal}
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

      {confirmingCelula && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-55">
          <div className="bg-gray-900 p-6 rounded w-11/12 sm:w-96">
            <h4 className="font-semibold mb-2 text-white">Confirmar exclusão</h4>
            <div className="mb-4 text-sm text-gray-300">Tem certeza que deseja excluir a célula <strong>{confirmingCelula.name}</strong>? Esta ação é irreversível.</div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmingCelula(null)} className="px-3 py-1">Cancelar</button>
              <button
                onClick={async () => {
                  try {
                    await celulasService.deleteCelula(confirmingCelula.id);
                    toast.success('Célula excluída');
                    setConfirmingCelula(null);
                    await load();
                  } catch (e: any) {
                    console.error(e);
                    // Mostrar mensagem de erro do backend se disponível
                    const errorMessage = e?.response?.data?.message || ErrorMessages.deleteCelula(e);
                    toast.error(errorMessage);
                    setConfirmingCelula(null);
                  }
                }}
                className="px-3 py-1 bg-red-600 text-white rounded"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
