"use client";

import React, { useEffect, useState, useRef } from 'react';
import { discipuladosService } from '@/services/discipuladosService';
import { redesService } from '@/services/redesService';
import { congregacoesService } from '@/services/congregacoesService';
import { memberService } from '@/services/memberService';
import { Discipulado, Celula, Rede, Member, Congregacao } from '@/types';
import toast from 'react-hot-toast';
import { ErrorMessages } from '@/lib/errorHandler';
import { createTheme, ThemeProvider, Autocomplete, TextField, Button, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { FiTrash2, FiPlus, FiEdit2, FiEye } from 'react-icons/fi';
import { FaFilter, FaFilterCircleXmark } from "react-icons/fa6";
import FilterModal, { FilterConfig } from '@/components/FilterModal';
import DiscipuladoViewModal from '@/components/DiscipuladoViewModal';
import ModalConfirm from '@/components/ModalConfirm';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';

export default function DiscipuladosPage() {
  const { user } = useAuth();
  const [list, setList] = useState<Discipulado[]>([]);
  const [selected, setSelected] = useState<Discipulado | null>(null);
  const [celulas, setCelulas] = useState<Celula[]>([]);
  const [congregacoes, setCongregacoes] = useState<Congregacao[]>([]);
  const [redes, setRedes] = useState<Rede[]>([]);
  const [users, setUsers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  
  // View modal state
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingDiscipulado, setViewingDiscipulado] = useState<Discipulado | null>(null);
  
  // Confirmation modal state
  const [confirmingDiscipulado, setConfirmingDiscipulado] = useState<Discipulado | null>(null);
  
  // filters
  const [filterName, setFilterName] = useState('');
  const [filterMyDiscipleships, setFilterMyDiscipleships] = useState(true);
  const [filterDiscipuladorId, setFilterDiscipuladorId] = useState<number | null>(null);
  const [filterCongregacaoId, setFilterCongregacaoId] = useState<number | null>(null);
  const [filterRedeId, setFilterRedeId] = useState<number | null>(null);
  // creation
  const [createDiscipuladoModalOpen, setCreateDiscipuladoModalOpen] = useState(false);
  const [createDiscipuladorQuery, setCreateDiscipuladorQuery] = useState('');
  const [createDiscipuladorId, setCreateDiscipuladorId] = useState<number | null>(null);
  const [createDiscipuladorName, setCreateDiscipuladorName] = useState('');
  const [createCongregacaoId, setCreateCongregacaoId] = useState<number | null>(null);
  const [createRedeId, setCreateRedeId] = useState<number | null>(null);
  const [createDiscipleIds, setCreateDiscipleIds] = useState<number[]>([]);
  const createDiscipuladorDropdownRef = useRef<HTMLDivElement>(null);
  const createDiscipuladorTimeoutRef = useRef<number | null>(null);
  const [showCreateDiscipuladoresDropdown, setShowCreateDiscipuladoresDropdown] = useState(false);

  // edit modal state
  const [editDiscipuladoModalOpen, setEditDiscipuladoModalOpen] = useState(false);
  const [editDiscipuladorQuery, setEditDiscipuladorQuery] = useState('');
  const [editDiscipuladorId, setEditDiscipuladorId] = useState<number | null>(null);
  const [editDiscipuladorName, setEditDiscipuladorName] = useState('');
  const editDiscipuladorDropdownRef = useRef<HTMLDivElement>(null);
  const editDiscipuladorTimeoutRef = useRef<number | null>(null);
  const [showEditDiscipuladoresDropdown, setShowEditDiscipuladoresDropdown] = useState(false);
  const [editDiscipuladoId, setEditDiscipuladoId] = useState<number | null>(null);
  const [editCongregacaoId, setEditCongregacaoId] = useState<number | null>(null);
  const [editRedeId, setEditRedeId] = useState<number | null>(null);
  const [editDiscipleIds, setEditDiscipleIds] = useState<number[]>([]);
  const [editingDiscipulado, setEditingDiscipulado] = useState<Discipulado | null>(null);

  // Kids validation
  const [createGenderError, setCreateGenderError] = useState('');
  const [editGenderError, setEditGenderError] = useState('');
  
  // Filter modal state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const filters: { congregacaoId?: number; redeId?: number; discipuladorMemberId?: number; all?: boolean } = {};
      if (filterCongregacaoId) filters.congregacaoId = filterCongregacaoId;
      if (filterRedeId) filters.redeId = filterRedeId;
      if (filterDiscipuladorId) filters.discipuladorMemberId = filterDiscipuladorId;
      if (!filterMyDiscipleships) filters.all = true;
      
      const d = await discipuladosService.getDiscipulados(filters);
      setList(d || []);
      // compute counts from células already included in discipulados
      const counts: Record<number, number> = {};
      (d || []).forEach((disc) => {
        counts[disc.id] = disc.celulas?.length ?? 0;
      });
      setDiscipuladoCellCountMap(counts);
    } catch (err) {
      console.error(err);
      toast.error(ErrorMessages.loadDiscipulados(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filterCongregacaoId, filterRedeId, filterDiscipuladorId, filterMyDiscipleships]);

  useEffect(() => {
    const loadAux = async () => {
      try {
        const [c, r, u] = await Promise.all([
          congregacoesService.getCongregacoes(),
          redesService.getRedes({}),
          memberService.getAllMembers({ all: true })
        ]);
        setCongregacoes(c || []);
        setRedes(r || []);
        setUsers(u || []);
      } catch (err) { console.error('failed loading congregacoes/redes/users', err); }
    };
    loadAux();
  }, []);

  // Validar gênero quando rede Kids é selecionada no modo de criação
  useEffect(() => {
    if (!createRedeId) {
      setCreateGenderError('');
      return;
    }
    
    const selectedRede = redes.find(r => r.id === createRedeId);
    if (selectedRede?.isKids && createDiscipuladorId) {
      const selectedMember = users.find(u => u.id === createDiscipuladorId);
      if (selectedMember && selectedMember.gender !== 'FEMALE') {
        setCreateDiscipuladorId(null);
        setCreateDiscipuladorName('');
        setCreateDiscipuladorQuery('');
        setCreateGenderError('Redes Kids só podem ter líderes do gênero feminino');
      }
    } else {
      setCreateGenderError('');
    }
  }, [createRedeId, createDiscipuladorId, redes, users]);

  // Validar gênero quando rede Kids é selecionada no modo de edição
  useEffect(() => {
    if (!editRedeId) {
      setEditGenderError('');
      return;
    }
    
    const selectedRede = redes.find(r => r.id === editRedeId);
    if (selectedRede?.isKids && editDiscipuladorId) {
      const selectedMember = users.find(u => u.id === editDiscipuladorId);
      if (selectedMember && selectedMember.gender !== 'FEMALE') {
        setEditDiscipuladorId(null);
        setEditDiscipuladorName('');
        setEditDiscipuladorQuery('');
        setEditGenderError('Redes Kids só podem ter líderes do gênero feminino');
      }
    } else {
      setEditGenderError('');
    }
  }, [editRedeId, editDiscipuladorId, redes, users]);

  const [discipuladoCellCountMap, setDiscipuladoCellCountMap] = useState<Record<number, number>>({});

  const create = async () => {
    try {
      if (!createRedeId) throw new Error('Selecione uma rede');
      if (!createDiscipuladorId) {
        toast.error('Discipulador é obrigatório');
        return;
      }
      const discipulador = users.find(u => u.id === createDiscipuladorId);
      const nameForApi = discipulador ? discipulador.name : 'Sem discipulador';
      const created = await discipuladosService.createDiscipulado({ 
        name: nameForApi, 
        redeId: createRedeId, 
        discipuladorMemberId: createDiscipuladorId || undefined,
        discipleIds: createDiscipleIds.length > 0 ? createDiscipleIds : undefined
      });
      setCreateDiscipuladorId(null); setCreateDiscipuladorName(''); setCreateRedeId(null); setCreateDiscipleIds([]); setCreateDiscipuladoModalOpen(false);
      toast.success('Discipulado criado');
      await load();
    } catch (err) {
      console.error(err);
      toast.error(ErrorMessages.createDiscipulado(err));
    }
  };

  const openEditModal = (d: Discipulado) => {
    setEditingDiscipulado(d);
    setEditDiscipuladoId(d.id);
    setEditRedeId(d.redeId ?? null);
    setEditDiscipuladorId(d.discipuladorMemberId ?? null);
    setEditDiscipuladorName(getUserName(d.discipuladorMemberId));
    setEditDiscipuladorQuery('');
    setShowEditDiscipuladoresDropdown(false);
    setEditDiscipleIds(d.disciples?.map(disc => disc.member.id) || []);
    // Encontrar congregação através da rede
    if (d.redeId) {
      const rede = redes.find(r => r.id === d.redeId);
      if (rede) {
        setEditCongregacaoId(rede.congregacaoId);
      }
    }
    setEditDiscipuladoModalOpen(true);
  };

  const saveEdit = async () => {
    try {
      if (!editDiscipuladoId) throw new Error('Selecione um discipulado');
      if (!editRedeId) throw new Error('Selecione uma rede');
      const discipulador = users.find(u => u.id === editDiscipuladorId);
      const nameForApi = discipulador ? discipulador.name : 'Sem discipulador';
      await discipuladosService.updateDiscipulado(editDiscipuladoId, { 
        name: nameForApi, 
        redeId: editRedeId, 
        discipuladorMemberId: editDiscipuladorId || undefined,
        discipleIds: editDiscipleIds.length > 0 ? editDiscipleIds : undefined
      });
      setEditDiscipuladoModalOpen(false);
      toast.success('Discipulado atualizado');
      await load();
    } catch (err) {
      console.error(err);
      toast.error(ErrorMessages.updateDiscipulado(err));
    }
  };

  const handleOpenViewModal = (d: Discipulado) => {
    setViewingDiscipulado(d);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setViewingDiscipulado(null);
  };

  const handleConfirmDelete = (d: Discipulado) => {
    setConfirmingDiscipulado(d);
  };

  const handleCancelDelete = () => {
    setConfirmingDiscipulado(null);
  };

  const deleteDiscipulado = async (d: Discipulado) => {
    const cellCount = d.celulas?.length ?? 0;
    if (cellCount > 0) {
      return toast.error('Não é possível apagar discipulado com células associadas');
    }
    try {
      await discipuladosService.deleteDiscipulado(d.id);
      toast.success('Discipulado removido com sucesso!');
      setConfirmingDiscipulado(null);
      await load();
    } catch (err) {
      console.error(err);
      toast.error(ErrorMessages.deleteDiscipulado(err));
    }
  };

  const getUserName = (id?: number | null) => {
    if (!id) return '';
    const u = users.find(x => x.id === id);
    return u ? u.name : '';
  };

  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Permission checks for discipulado
  const canEditDiscipulado = (d: Discipulado): boolean => {
    if (!user?.permission) return false;
    const permission = user.permission;

    // Admin pode editar tudo
    if (permission.isAdmin) return true;

    // Pastor presidente da congregação principal da cidade pode editar tudo
    const mainCongregacao = congregacoes.find(c => c.isPrincipal);
    if (mainCongregacao && (
      mainCongregacao.pastorGovernoMemberId === permission.id ||
      mainCongregacao.vicePresidenteMemberId === permission.id
    )) {
      return true;
    }

    // Pastor presidente/vice presidente da congregação do discipulado
    const congregacao = congregacoes.find(c => c.id === d.rede.congregacaoId);
    if (congregacao && (
      congregacao.pastorGovernoMemberId === permission.id ||
      congregacao.vicePresidenteMemberId === permission.id
    )) {
      return true;
    }

    // Pastor da rede do discipulado
    if (d.rede.pastorMemberId === permission.id) {
      return true;
    }

    // Discipulador do discipulado (e discipulado é da rede kids) - apenas pode editar disciples
    if (d.discipuladorMemberId === permission.id && d.rede.isKids) {
      return true;
    }

    return false;
  };

  const canDeleteDiscipulado = (d: Discipulado): boolean => {
    if (!user?.permission) return false;
    const permission = user.permission;

    // Admin pode apagar tudo
    if (permission.isAdmin) return true;

    // Pastor presidente da congregação principal da cidade
    const mainCongregacao = congregacoes.find(c => c.isPrincipal);
    if (mainCongregacao && (
      mainCongregacao.pastorGovernoMemberId === permission.id ||
      mainCongregacao.vicePresidenteMemberId === permission.id
    )) {
      return true;
    }

    // Pastor presidente/vice presidente da congregação do discipulado
    const congregacao = congregacoes.find(c => c.id === d.rede.congregacaoId);
    if (congregacao && (
      congregacao.pastorGovernoMemberId === permission.id ||
      congregacao.vicePresidenteMemberId === permission.id
    )) {
      return true;
    }

    // Pastor da rede do discipulado
    if (d.rede.pastorMemberId === permission.id) {
      return true;
    }

    // Discipulador NÃO pode apagar
    return false;
  };

  const canEditDiscipuladoCongregacao = (d: Discipulado): boolean => {
    if (!user?.permission) return false;
    const permission = user.permission;

    // Admin pode editar tudo
    if (permission.isAdmin) return true;

    // Pastor presidente da congregação principal da cidade
    const mainCongregacao = congregacoes.find(c => c.isPrincipal);
    if (mainCongregacao && (
      mainCongregacao.pastorGovernoMemberId === permission.id ||
      mainCongregacao.vicePresidenteMemberId === permission.id
    )) {
      return true;
    }

    // Pastor presidente/vice da congregação NÃO pode alterar congregação
    // Pastor da rede NÃO pode alterar congregação
    // Discipulador NÃO pode alterar congregação
    return false;
  };

  const canEditDiscipuladoRede = (d: Discipulado): boolean => {
    if (!user?.permission) return false;
    const permission = user.permission;

    // Admin pode editar tudo
    if (permission.isAdmin) return true;

    // Pastor presidente da congregação principal da cidade
    const mainCongregacao = congregacoes.find(c => c.isPrincipal);
    if (mainCongregacao && (
      mainCongregacao.pastorGovernoMemberId === permission.id ||
      mainCongregacao.vicePresidenteMemberId === permission.id
    )) {
      return true;
    }

    // Pastor presidente/vice presidente da congregação do discipulado
    const congregacao = congregacoes.find(c => c.id === d.rede.congregacaoId);
    if (congregacao && (
      congregacao.pastorGovernoMemberId === permission.id ||
      congregacao.vicePresidenteMemberId === permission.id
    )) {
      return true;
    }

    // Pastor da rede NÃO pode alterar a rede
    // Discipulador NÃO pode alterar a rede
    return false;
  };

  const canEditOnlyDisciples = (d: Discipulado): boolean => {
    if (!user?.permission) return false;
    const permission = user.permission;

    // Se for discipulador do discipulado e for rede kids, pode editar apenas disciples
    if (d.discipuladorMemberId === permission.id && d.rede.isKids) {
      // Não pode editar outros campos
      return !canEditDiscipuladoCongregacao(d) && !canEditDiscipuladoRede(d);
    }

    return false;
  };

  const canCreateDiscipulado = (): boolean => {
    if (!user?.permission) return false;
    const permission = user.permission;

    // Admin pode criar tudo
    if (permission.isAdmin) return true;

    // Pastor presidente da congregação principal da cidade
    const mainCongregacao = congregacoes.find(c => c.isPrincipal);
    if (mainCongregacao && (
      mainCongregacao.pastorGovernoMemberId === permission.id ||
      mainCongregacao.vicePresidenteMemberId === permission.id
    )) {
      return true;
    }

    // Pastor presidente/vice presidente de qualquer congregação
    const isCongregacaoLeader = congregacoes.some(c => 
      c.pastorGovernoMemberId === permission.id || 
      c.vicePresidenteMemberId === permission.id
    );
    if (isCongregacaoLeader) {
      return true;
    }

    // Pastor de qualquer rede
    const isRedePastor = redes.some(r => r.pastorMemberId === permission.id);
    if (isRedePastor) {
      return true;
    }

    return false;
  };

  // users that are discipuladores in the current list
  const discipuladorIds = new Set<number>(list.map(d => d.discipuladorMemberId).filter(Boolean) as number[]);

  // Verificar se há filtros ativos
  const hasActiveFilters = !!filterName || filterDiscipuladorId !== null || filterCongregacaoId !== null || filterRedeId !== null || filterMyDiscipleships;

  // Limpar todos os filtros
  const clearAllFilters = () => {
    setFilterName('');
    setFilterMyDiscipleships(false);
    setFilterDiscipuladorId(null);
    setFilterCongregacaoId(null);
    setFilterRedeId(null);
  };

  // Configuração dos filtros para o modal
  const filterConfigs: FilterConfig[] = [
    {
      type: 'switch',
      label: '',
      value: filterMyDiscipleships,
      onChange: setFilterMyDiscipleships,
      switchLabelOff: 'Todos os discipulados',
      switchLabelOn: 'Meus discipulados'
    },
    {
      type: 'select',
      label: 'Congregação',
      value: filterCongregacaoId,
      onChange: (val) => {
        setFilterCongregacaoId(val);
        setFilterRedeId(null);
      },
      options: congregacoes.map(c => ({ value: c.id, label: c.name }))
    },
    {
      type: 'select',
      label: 'Rede',
      value: filterRedeId,
      onChange: (val) => {
        setFilterRedeId(val);
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
      label: 'Discipulador',
      value: filterDiscipuladorId,
      onChange: setFilterDiscipuladorId,
      renderCustom: () => (
        <ThemeProvider theme={muiTheme}>
          <Autocomplete
            size="small"
            fullWidth
            options={users.filter(u => discipuladorIds.has(u.id))}
            getOptionLabel={(option) => option.name}
            value={users.find(u => u.id === filterDiscipuladorId) || null}
            onChange={(event, newValue) => setFilterDiscipuladorId(newValue?.id || null)}
            renderInput={(params) => (
              <TextField 
                {...params} 
                placeholder="Selecione um discipulador"
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
    },
    {
      type: 'select',
      label: 'Nome',
      value: filterName,
      onChange: setFilterName,
      renderCustom: () => (
        <ThemeProvider theme={muiTheme}>
          <TextField
            size="small"
            fullWidth
            placeholder="Buscar por nome"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            className="bg-gray-700"
          />
        </ThemeProvider>
      )
    }
  ];

  const muiTheme = createTheme({
    palette: {
      mode: 'dark',
    },
  });

  const filteredList = list.filter(d => !filterName || d.discipulador?.name.toLowerCase().includes(filterName.toLowerCase()));

  return (
    <>
      <ThemeProvider theme={muiTheme}>
        <div>
          <h2 className="text-2xl font-semibold mb-4">Discipulados</h2>

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
                  {[filterName, filterCongregacaoId, filterRedeId, filterDiscipuladorId].filter(f => f !== null && f !== '').length + (filterMyDiscipleships ? 1 : 0)}
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
            <h3 className="font-medium mb-2">Exibindo {filteredList.length} de {list.length} discipulados</h3>
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
            <ul className="space-y-2">
              {filteredList.map(d => {
                const cellCount = discipuladoCellCountMap[d.id] ?? 0;
                const canDelete = cellCount === 0;
                const discipulador = users.find(u => u.id === d.discipuladorMemberId);
                
                return (
                  <li 
                    key={d.id} 
                    className={`border rounded-lg p-4 transition-colors ${
                      !d.discipuladorMemberId 
                        ? 'bg-red-900/20 border-red-700' 
                        : 'bg-gray-800 border-gray-700 hover:bg-gray-750'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {discipulador ? (
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={discipulador.photoUrl} alt={discipulador.name} />
                            <AvatarFallback className="bg-blue-600 text-white text-sm font-semibold">
                              {getInitials(discipulador.name)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-red-600 text-white text-sm font-semibold">
                              ?
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        <div className="flex-1">
                          <h4 className="font-medium text-white">
                            {discipulador?.name || (
                              <span className="text-red-400">Sem discipulador</span>
                            )}
                          </h4>
                          <p className="text-sm text-gray-400 mt-1">
                            Rede: {d.rede.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {cellCount} {cellCount === 1 ? 'célula' : 'células'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenViewModal(d)}
                          className="p-2 text-blue-400 hover:bg-blue-900/30 rounded transition-colors"
                          title="Visualizar detalhes"
                        >
                          <FiEye className="h-4 w-4" />
                        </button>
                        <button
                          disabled={!canEditDiscipulado(d)}
                          onClick={() => openEditModal(d)}
                          className={`p-2 rounded transition-colors ${
                            canEditDiscipulado(d)
                              ? 'text-gray-400 hover:bg-gray-700'
                              : 'text-gray-600 cursor-not-allowed opacity-50'
                          }`}
                          title={canEditDiscipulado(d) ? 'Editar discipulado' : 'Sem permissão para editar'}
                        >
                          <FiEdit2 className="h-4 w-4" />
                        </button>
                        <button
                          disabled={!canDelete || !canDeleteDiscipulado(d)}
                          onClick={() => handleConfirmDelete(d)}
                          className={`p-2 rounded transition-colors ${
                            canDelete && canDeleteDiscipulado(d)
                              ? 'text-red-400 hover:bg-red-900/30'
                              : 'text-gray-600 cursor-not-allowed opacity-50'
                          }`}
                          title={
                            !canDelete 
                              ? 'Não é possível apagar: possui células associadas'
                              : !canDeleteDiscipulado(d)
                              ? 'Sem permissão para apagar'
                              : 'Excluir discipulado'
                          }
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            )}
          </div>
        </div>

        {/* Floating create button */}
        {canCreateDiscipulado() && (
          <button aria-label="Criar discipulado" onClick={() => setCreateDiscipuladoModalOpen(true)} className="fixed right-6 bottom-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg z-50">
            <FiPlus className="h-7 w-7" aria-hidden />
          </button>
        )}

        {/* Create discipulado modal */}
        {createDiscipuladoModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-gray-900 p-6 rounded w-11/12 sm:w-96">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Criar Discipulado</h3>
                <button onClick={() => setCreateDiscipuladoModalOpen(false)} className="text-gray-500">Fechar</button>
              </div>
              <div className="space-y-3">
                <div className="w-full">
                  <FormControl className="w-full">
                    <InputLabel id="create-congregacao-label" size='small'>Congregação</InputLabel>
                    <Select
                      labelId="create-congregacao-label"
                      value={createCongregacaoId ?? ''}
                      onChange={(e) => {
                        setCreateCongregacaoId(e.target.value ? Number(e.target.value) : null);
                        setCreateRedeId(null);
                      }}
                      label="Congregação"
                      size="small"
                      className="bg-gray-800 w-full">
                      <MenuItem value="">Selecione congregação</MenuItem>
                      {congregacoes.map((c) => (
                        <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>

                <div className="w-full">
                  <FormControl className="w-full">
                    <InputLabel id="create-rede-label" size='small'>Rede</InputLabel>
                    <Select
                      labelId="create-rede-label"
                      value={createRedeId ?? ''}
                      onChange={(e) => {
                        const redeId = e.target.value ? Number(e.target.value) : null;
                        setCreateRedeId(redeId);
                        // Auto-preencher congregação quando rede é selecionada
                        if (redeId) {
                          const rede = redes.find(r => r.id === redeId);
                          if (rede?.congregacaoId) {
                            setCreateCongregacaoId(rede.congregacaoId);
                          }
                        }
                      }}
                      label="Rede"
                      size="small"
                      className="bg-gray-800 w-full">
                      <MenuItem value="">Selecione rede</MenuItem>
                      {redes.filter(r => !createCongregacaoId || r.congregacaoId === createCongregacaoId).map((r) => (
                        <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>

                <div ref={createDiscipuladorDropdownRef} className="relative w-full">
                  <input
                    placeholder="Discipulador"
                    value={createDiscipuladorQuery || createDiscipuladorName}
                    onChange={(e) => { setCreateDiscipuladorQuery(e.target.value); setCreateDiscipuladorName(''); setCreateDiscipuladorId(null); }}
                    onFocus={() => {
                      if (createDiscipuladorTimeoutRef.current) { window.clearTimeout(createDiscipuladorTimeoutRef.current); createDiscipuladorTimeoutRef.current = null; }
                      setShowCreateDiscipuladoresDropdown(true);
                    }}
                    onBlur={() => {
                      createDiscipuladorTimeoutRef.current = window.setTimeout(() => { setShowCreateDiscipuladoresDropdown(false); createDiscipuladorTimeoutRef.current = null; }, 150);
                    }}
                    className="border p-2 rounded w-full bg-gray-800 text-white h-10"
                  />
                  {createGenderError && <div className="text-red-500 text-xs mt-1">{createGenderError}</div>}
                  {showCreateDiscipuladoresDropdown && (
                    <div className="absolute left-0 right-0 bg-gray-800 border mt-1 rounded max-h-44 overflow-auto z-50">
                      {users.filter(u => {
                        // Se a rede selecionada for Kids, filtrar apenas membros do gênero feminino
                        const selectedRede = redes.find(r => r.id === createRedeId);
                        if (selectedRede?.isKids && u.gender !== 'FEMALE') {
                          return false;
                        }
                        
                        const q = (createDiscipuladorQuery || '').toLowerCase();
                        if (!q) return true;
                        return (u.name.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
                      }).map(u => (
                        <div key={u.id} className="px-3 py-2 hover:bg-gray-700 cursor-pointer flex items-center justify-between" onMouseDown={() => { setCreateDiscipuladorId(u.id); setCreateDiscipuladorName(u.name); setCreateDiscipuladorQuery(''); setShowCreateDiscipuladoresDropdown(false); }}>

                          <div>
                            <div className="text-sm font-medium text-white">{u.name}</div>
                            <div className="text-xs text-gray-400">{u.email}</div>
                          </div>
                          <div className="text-xs text-green-600">Selecionar</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Discípulas - apenas para redes Kids */}
                {redes.find(r => r.id === createRedeId)?.isKids && (
                  <div className="w-full">
                    <FormControl className="w-full">
                      <InputLabel id="create-disciples-label" size='small'>Discípulas</InputLabel>
                      <Select
                        labelId="create-disciples-label"
                        multiple
                        value={createDiscipleIds}
                        onChange={(e) => {
                          const value = e.target.value as number[];
                          setCreateDiscipleIds(value);
                        }}
                        label="Discípulas"
                        size="small"
                        className="bg-gray-800 w-full"
                        renderValue={(selected) => {
                          const selectedMembers = users.filter(m => selected.includes(m.id));
                          return selectedMembers.map(m => m.name).join(', ');
                        }}
                      >
                        {users
                          .filter(u => {
                            // Apenas membros femininos
                            if (u.gender !== 'FEMALE') return false;
                            // Verificar se já está associada a outro discipulado Kids
                            const alreadyInKidsDiscipulado = list.some(d => {
                              const rede = redes.find(r => r.id === d.redeId);
                              return rede?.isKids && d.disciples?.some(disc => disc.member.id === u.id);
                            });
                            return !alreadyInKidsDiscipulado;
                          })
                          .map((user) => (
                            <MenuItem key={user.id} value={user.id}>
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={createDiscipleIds.includes(user.id)}
                                  readOnly
                                  className="h-4 w-4"
                                />
                                <span>{user.name}</span>
                              </div>
                            </MenuItem>
                          ))}
                      </Select>
                    </FormControl>
                    <p className="text-xs text-gray-400 mt-1">
                      Apenas membros femininos que não estejam em outro discipulado Kids
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button onClick={() => setCreateDiscipuladoModalOpen(false)} className="px-3 py-2 border rounded">Cancelar</button>
                  <button onClick={create} className="px-3 py-2 bg-green-600 text-white rounded">Criar discipulado</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit discipulado modal */}
        {editDiscipuladoModalOpen && editingDiscipulado && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-gray-900 p-6 rounded w-11/12 sm:w-96">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Editar Discipulado</h3>
                <button onClick={() => setEditDiscipuladoModalOpen(false)} className="text-gray-500">Fechar</button>
              </div>
              <div className="space-y-3">
                <div className="w-full">
                  <FormControl className="w-full">
                    <InputLabel id="edit-congregacao-label" size='small'>Congregação</InputLabel>
                    <Select
                      labelId="edit-congregacao-label"
                      value={editCongregacaoId ?? ''}
                      onChange={(e) => {
                        setEditCongregacaoId(e.target.value ? Number(e.target.value) : null);
                        setEditRedeId(null);
                      }}
                      label="Congregação"
                      size="small"
                      className="bg-gray-800 w-full"
                      disabled={!canEditDiscipuladoCongregacao(editingDiscipulado)}
                    >
                      <MenuItem value="">Selecione congregação</MenuItem>
                      {congregacoes.map((c) => (
                        <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {!canEditDiscipuladoCongregacao(editingDiscipulado) && (
                    <p className="text-xs text-gray-500 mt-1">Você não tem permissão para alterar a congregação</p>
                  )}
                </div>

                <div className="w-full">
                  <FormControl className="w-full">
                    <InputLabel id="edit-rede-label" size='small'>Rede</InputLabel>
                    <Select
                      labelId="edit-rede-label"
                      value={editRedeId ?? ''}
                      onChange={(e) => {
                        const redeId = e.target.value ? Number(e.target.value) : null;
                        setEditRedeId(redeId);
                        // Auto-preencher congregação quando rede é selecionada
                        if (redeId) {
                          const rede = redes.find(r => r.id === redeId);
                          if (rede?.congregacaoId) {
                            setEditCongregacaoId(rede.congregacaoId);
                          }
                        }
                      }}
                      label="Rede"
                      size="small"
                      className="bg-gray-800 w-full"
                      disabled={!canEditDiscipuladoRede(editingDiscipulado)}
                    >
                      <MenuItem value="">Selecione rede</MenuItem>
                      {redes.filter(r => !editCongregacaoId || r.congregacaoId === editCongregacaoId).map((r) => (
                        <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {!canEditDiscipuladoRede(editingDiscipulado) && (
                    <p className="text-xs text-gray-500 mt-1">Você não tem permissão para alterar a rede</p>
                  )}
                </div>

                <div ref={editDiscipuladorDropdownRef} className="relative w-full">
                  <input
                    placeholder="Discipulador"
                    value={editDiscipuladorQuery || editDiscipuladorName}
                    onChange={(e) => { setEditDiscipuladorQuery(e.target.value); setEditDiscipuladorName(''); setEditDiscipuladorId(null); }}
                    onFocus={() => {
                      if (editDiscipuladorTimeoutRef.current) { window.clearTimeout(editDiscipuladorTimeoutRef.current); editDiscipuladorTimeoutRef.current = null; }
                      setShowEditDiscipuladoresDropdown(true);
                    }}
                    onBlur={() => {
                      editDiscipuladorTimeoutRef.current = window.setTimeout(() => { setShowEditDiscipuladoresDropdown(false); editDiscipuladorTimeoutRef.current = null; }, 150);
                    }}
                    className="border p-2 rounded w-full bg-gray-800 text-white h-10"
                    disabled={canEditOnlyDisciples(editingDiscipulado)}
                  />
                  {canEditOnlyDisciples(editingDiscipulado) && (
                    <p className="text-xs text-gray-500 mt-1">Você só pode editar as discípulas</p>
                  )}
                  {editGenderError && <div className="text-red-500 text-xs mt-1">{editGenderError}</div>}
                  {showEditDiscipuladoresDropdown && (
                    <div className="absolute left-0 right-0 bg-gray-800 border mt-1 rounded max-h-44 overflow-auto z-50">
                      {users.filter(u => {
                        // Se a rede selecionada for Kids, filtrar apenas membros do gênero feminino
                        const selectedRede = redes.find(r => r.id === editRedeId);
                        if (selectedRede?.isKids && u.gender !== 'FEMALE') {
                          return false;
                        }
                        
                        const q = (editDiscipuladorQuery || '').toLowerCase();
                        if (!q) return true;
                        return (u.name.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
                      }).map(u => (
                        <div key={u.id} className="px-3 py-2 hover:bg-gray-700 cursor-pointer flex items-center justify-between" onMouseDown={() => { setEditDiscipuladorId(u.id); setEditDiscipuladorName(u.name); setEditDiscipuladorQuery(''); setShowEditDiscipuladoresDropdown(false); }}>
                          <div>
                            <div className="text-sm font-medium text-white">{u.name}</div>
                            <div className="text-xs text-gray-400">{u.email}</div>
                          </div>
                          <div className="text-xs text-green-600">Selecionar</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Discípulas - apenas para redes Kids */}
                {redes.find(r => r.id === editRedeId)?.isKids && (
                  <div className="w-full">
                    <FormControl className="w-full">
                      <InputLabel id="edit-disciples-label" size='small'>Discípulas</InputLabel>
                      <Select
                        labelId="edit-disciples-label"
                        multiple
                        value={editDiscipleIds}
                        onChange={(e) => {
                          const value = e.target.value as number[];
                          setEditDiscipleIds(value);
                        }}
                        label="Discípulas"
                        size="small"
                        className="bg-gray-800 w-full"
                        renderValue={(selected) => {
                          const selectedMembers = users.filter(m => selected.includes(m.id));
                          return selectedMembers.map(m => m.name).join(', ');
                        }}
                      >
                        {users
                          .filter(u => {
                            // Apenas membros femininos
                            if (u.gender !== 'FEMALE') return false;
                            // Verificar se já está associada a outro discipulado Kids (exceto o atual)
                            const alreadyInKidsDiscipulado = list.some(d => {
                              if (d.id === editDiscipuladoId) return false; // Ignorar o discipulado atual
                              const rede = redes.find(r => r.id === d.redeId);
                              return rede?.isKids && d.disciples?.some(disc => disc.member.id === u.id);
                            });
                            return !alreadyInKidsDiscipulado;
                          })
                          .map((user) => (
                            <MenuItem key={user.id} value={user.id}>
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={editDiscipleIds.includes(user.id)}
                                  readOnly
                                  className="h-4 w-4"
                                />
                                <span>{user.name}</span>
                              </div>
                            </MenuItem>
                          ))}
                      </Select>
                    </FormControl>
                    <p className="text-xs text-gray-400 mt-1">
                      Apenas membros femininos que não estejam em outro discipulado Kids
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button onClick={() => setEditDiscipuladoModalOpen(false)} className="px-3 py-2 border rounded">Cancelar</button>
                  <button onClick={saveEdit} className="px-3 py-2 bg-green-600 text-white rounded">Salvar</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DiscipuladoViewModal */}
        <DiscipuladoViewModal
          discipulado={viewingDiscipulado}
          isOpen={isViewModalOpen}
          onClose={handleCloseViewModal}
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

        {/* ModalConfirm */}
        <ModalConfirm
          open={!!confirmingDiscipulado}
          title="Confirmar remoção"
          message={confirmingDiscipulado ? `Remover discipulado de ${getUserName(confirmingDiscipulado.discipuladorMemberId)}?` : ''}
          confirmLabel="Remover"
          cancelLabel="Cancelar"
          onConfirm={() => confirmingDiscipulado && deleteDiscipulado(confirmingDiscipulado)}
          onCancel={handleCancelDelete}
        />
      </ThemeProvider>
    </>
  );
}
