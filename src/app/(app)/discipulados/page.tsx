"use client";

import React, { useEffect, useState, useRef } from 'react';
import Collapse from '@/components/Collapse';
import CollapsibleItem from '@/components/CollapsibleItem';
import { discipuladosService } from '@/services/discipuladosService';
import { redesService } from '@/services/redesService';
import { congregacoesService } from '@/services/congregacoesService';
import { memberService } from '@/services/memberService';
import { celulasService } from '@/services/celulasService';
import { Discipulado, Celula, Rede, Member, Congregacao } from '@/types';
import toast from 'react-hot-toast';
import { ErrorMessages } from '@/lib/errorHandler';
import { createTheme, ThemeProvider, Autocomplete, TextField, Button, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { FiTrash2, FiPlus } from 'react-icons/fi';
import { FaFilter, FaFilterCircleXmark } from "react-icons/fa6";
import FilterModal, { FilterConfig } from '@/components/FilterModal';
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
      // also load all células to compute counts per discipulado
      try {
        const allCells = await celulasService.getCelulas();
        const counts: Record<number, number> = {};
        (allCells || []).forEach((c) => {
          if (!c.discipuladoId) return;
          counts[c.discipuladoId] = (counts[c.discipuladoId] || 0) + 1;
        });
        setDiscipuladoCellCountMap(counts);
      } catch (err) {
        console.error('failed loading celulas for counts', err);
      }
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

  const [expandedDiscipulados, setExpandedDiscipulados] = useState<Record<number, boolean>>({});
  const [discipuladoCelulasMap, setDiscipuladoCelulasMap] = useState<Record<number, Celula[]>>({});
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
      // load celulas for created discipulado and update counts
      const all = await celulasService.getCelulas();
      const cellsForCreated = (all || []).filter(c => c.discipuladoId === created.id);
      setDiscipuladoCelulasMap(prev => ({ ...prev, [created.id]: cellsForCreated }));
      setDiscipuladoCellCountMap(prev => ({ ...prev, [created.id]: cellsForCreated.length }));
    } catch (err) {
      console.error(err);
      toast.error(ErrorMessages.createDiscipulado(err));
    }
  };

  const openEditModal = (d: Discipulado) => {
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

  const onToggleDiscipulado = async (d: Discipulado, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const currently = !!expandedDiscipulados[d.id];
      if (!currently && !discipuladoCelulasMap[d.id]) {
        const all = await celulasService.getCelulas();
        const cells = (all || []).filter(c => c.discipuladoId === d.id);
        setDiscipuladoCelulasMap(prev => ({ ...prev, [d.id]: cells }));
        setDiscipuladoCellCountMap(prev => ({ ...prev, [d.id]: cells.length }));
      }
      setExpandedDiscipulados(prev => ({ ...prev, [d.id]: !currently }));
    } catch (err) {
      console.error(err);
      toast.error(ErrorMessages.loadCelulas(err));
    }
  };

  const deleteDiscipulado = async (d: Discipulado) => {
    try {
      const allCelulas = await celulasService.getCelulas();
      const children = (allCelulas || []).filter((c: Celula) => c.discipuladoId === d.id);
      if (children.length > 0) {
        return toast.error('Não é possível apagar discipulado com células associadas');
      }
    } catch (err) {
      console.error(err);
      return toast.error(ErrorMessages.checkAssociations(err));
    }
    if (!confirm(`Remover discipulado de ${getUserName(d.discipuladorMemberId)}?`)) return;
    try {
      await discipuladosService.deleteDiscipulado(d.id);
      toast.success('Discipulado removido com sucesso!');
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
              {filteredList.map(d => (
                  <li key={d.id} className={`border p-2 rounded ${!d.discipuladorMemberId ? 'bg-red-900/20 border-red-700' : ''}`}>
                    <CollapsibleItem
                      isOpen={!!expandedDiscipulados[d.id]}
                      onToggle={() => onToggleDiscipulado(d)}
                      onEdit={() => openEditModal(d)}
                      right={
                        (() => {
                          const childCount = (discipuladoCellCountMap[d.id] ?? (discipuladoCelulasMap[d.id]?.length ?? 0));
                          const disabled = childCount > 0;
                          return (
                            <span onMouseDown={(e) => e.stopPropagation()}>
                              <button
                                disabled={disabled}
                                title={disabled ? 'Não é possível apagar: possui células associadas' : 'Excluir discipulado'}
                                onClick={() => deleteDiscipulado(d)}
                                className={`p-1 rounded ${disabled ? 'text-gray-400 opacity-60 cursor-not-allowed' : 'text-red-600 hover:bg-red-900'}`}
                              >
                                <FiTrash2 className="h-4 w-4" aria-hidden />
                              </button>
                            </span>
                          );
                        })()
                      }
                      title={<>{(users.find(u => u.id === d.discipuladorMemberId)?.name || <span className="text-red-400">Sem discipulador</span>)} <span className="text-sm text-gray-500 ml-2">({discipuladoCellCountMap[d.id] ?? (discipuladoCelulasMap[d.id]?.length ?? 0)} células)</span></>}
                      subtitle={<>{`rede: ${d.rede.name}`}</>}
                      duration={250}
                    >
                      {(discipuladoCelulasMap[d.id] || []).length === 0 && <div className="text-xs text-gray-500">Nenhuma célula</div>}
                      <ul className="space-y-1">
                        {(discipuladoCelulasMap[d.id] || []).map((c: Celula) => (
                          <li key={c.id} className="text-sm border p-1 rounded">{c.name} (id: {c.id})</li>
                        ))}
                      </ul>
                    </CollapsibleItem>
                  </li>
                ))}
            </ul>
            )}
          </div>
        </div>

        {/* Floating create button */}
        <button aria-label="Criar discipulado" onClick={() => setCreateDiscipuladoModalOpen(true)} className="fixed right-6 bottom-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg z-50">
          <FiPlus className="h-7 w-7" aria-hidden />
        </button>

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
        {editDiscipuladoModalOpen && (
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
                      className="bg-gray-800 w-full">
                      <MenuItem value="">Selecione rede</MenuItem>
                      {redes.filter(r => !editCongregacaoId || r.congregacaoId === editCongregacaoId).map((r) => (
                        <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
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
                  />
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

        {/* FilterModal */}
        <FilterModal
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          onApply={() => {}}
          onClear={clearAllFilters}
          filters={filterConfigs}
          hasActiveFilters={hasActiveFilters}
        />
      </ThemeProvider>
    </>
  );
}
