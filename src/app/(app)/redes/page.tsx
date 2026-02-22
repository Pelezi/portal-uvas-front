"use client";

import React, { useEffect, useState, useRef } from 'react';
import { redesService } from '@/services/redesService';
import { congregacoesService } from '@/services/congregacoesService';
import { memberService } from '@/services/memberService';
import { discipuladosService } from '@/services/discipuladosService';
import toast from 'react-hot-toast';
import { ErrorMessages } from '@/lib/errorHandler';
import { FiTrash2, FiPlus, FiEdit2, FiEye } from 'react-icons/fi';
import { FaFilter, FaFilterCircleXmark } from "react-icons/fa6";
import ModalConfirm from '@/components/ModalConfirm';
import FilterModal, { FilterConfig } from '@/components/FilterModal';
import RedeViewModal from '@/components/RedeViewModal';
import { Discipulado, Member, Rede, Congregacao } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { createTheme, ThemeProvider, FormControl, InputLabel, Select, MenuItem, TextField, Autocomplete, Button } from '@mui/material';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

export default function RedesPage() {
  const { user } = useAuth();
  const [redes, setRedes] = useState<Rede[]>([]);
  const [congregacoes, setCongregacoes] = useState<Congregacao[]>([]);
  const [users, setUsers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);

  // filters
  const [filterName, setFilterName] = useState('');
  const [filterMyNetworks, setFilterMyNetworks] = useState(true);
  const [filterCongregacaoId, setFilterCongregacaoId] = useState<number | null>(null);
  const [filterPastorId, setFilterPastorId] = useState<number | null>(null);
  const [filterIsKids, setFilterIsKids] = useState<boolean | null>(null);

  // create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createCongregacaoId, setCreateCongregacaoId] = useState<number | null>(null);
  const [createPastorUserId, setCreatePastorUserId] = useState<number | null>(null);
  const [createPastorQuery, setCreatePastorQuery] = useState('');
  const [createPastorName, setCreatePastorName] = useState('');
  const [createIsKids, setCreateIsKids] = useState(false);
  const [showCreatePastorsDropdown, setShowCreatePastorsDropdown] = useState(false);
  const createPastorDropdownRef = useRef<HTMLDivElement>(null);

  // confirm modal for deletions
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Rede | null>(null);

  // edit modal state
  const [editRedeModalOpen, setEditRedeModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCongregacaoId, setEditCongregacaoId] = useState<number | null>(null);
  const [editPastorQuery, setEditPastorQuery] = useState('');
  const [editPastorId, setEditPastorId] = useState<number | null>(null);
  const [editPastorName, setEditPastorName] = useState('');
  const [editIsKids, setEditIsKids] = useState(false);
  const editPastorDropdownRef = useRef<HTMLDivElement>(null);
  const [showEditPastorsDropdown, setShowEditPastorsDropdown] = useState(false);
  const editPastorsTimeoutRef = useRef<number | null>(null);
  const [editingRedeId, setEditingRedeId] = useState<number | null>(null);
  
  // Filter modal state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // View modal state
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingRede, setViewingRede] = useState<Rede | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const filters: { congregacaoId?: number; pastorMemberId?: number; all?: boolean } = {};
      if (filterCongregacaoId) filters.congregacaoId = filterCongregacaoId;
      if (filterPastorId) filters.pastorMemberId = filterPastorId;
      if (!filterMyNetworks) filters.all = true;
      
      const r = await redesService.getRedes(filters);
      setRedes(r || []);
    } catch (err) { 
      console.error(err); 
      toast.error(ErrorMessages.loadRedes(err)); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filterCongregacaoId, filterPastorId, filterMyNetworks]);

  useEffect(() => {
    (async () => {
      try { 
        // Carregar apenas usuários que podem ser pastores (PRESIDENT_PASTOR ou PASTOR)
        const u = await memberService.getAllMembers({ ministryType: 'PRESIDENT_PASTOR,PASTOR', all: true }); 
        setUsers(u || []); 
      } catch (err) { console.error(err); }
      
      try {
        const c = await congregacoesService.getCongregacoes();
        setCongregacoes(c || []);
      } catch (err) { console.error(err); }
    })();
  }, []);

  // Permission checks for rede
  const canEditRede = (r: Rede): boolean => {
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

    // Pastor presidente/vice presidente da congregação da rede
    const congregacao = congregacoes.find(c => c.id === r.congregacaoId);
    if (congregacao && (
      congregacao.pastorGovernoMemberId === permission.id ||
      congregacao.vicePresidenteMemberId === permission.id
    )) {
      return true;
    }

    return false;
  };

  const canDeleteRede = (r: Rede): boolean => {
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

    // Pastor presidente/vice presidente da congregação da rede
    const congregacao = congregacoes.find(c => c.id === r.congregacaoId);
    if (congregacao && (
      congregacao.pastorGovernoMemberId === permission.id ||
      congregacao.vicePresidenteMemberId === permission.id
    )) {
      return true;
    }

    return false;
  };

  const canEditRedeCongregacao = (r: Rede): boolean => {
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
    return false;
  };

  const canCreateRede = (): boolean => {
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

    return false;
  };

  const createRede = async () => {
    try {
      if (!createCongregacaoId) {
        toast.error('Selecione uma congregação');
        return;
      }
      if (!createPastorUserId) {
        toast.error('Pastor é obrigatório');
        return;
      }
      // Validar gênero do pastor para redes Kids
      if (createIsKids && createPastorUserId) {
        const selectedPastor = users.find(u => u.id === createPastorUserId);
        if (selectedPastor && selectedPastor.gender !== 'FEMALE') {
          toast.error('Redes Kids devem ter responsável do gênero feminino');
          return;
        }
      }
      await redesService.createRede({ name: createName, congregacaoId: createCongregacaoId, pastorMemberId: createPastorUserId || undefined, isKids: createIsKids });
      setCreateName(''); setCreateCongregacaoId(null); setCreatePastorUserId(null); setCreatePastorQuery(''); setCreateIsKids(false); setShowCreateModal(false);
      await load();
      toast.success('Rede criada com sucesso!');
    } catch (err) { 
      console.error(err); 
      toast.error(ErrorMessages.createRede(err)); 
    }
  };

  const openEditRede = (r: Rede) => {
    setEditingRedeId(r.id);
    setEditName(r.name || '');
    setEditCongregacaoId(r.congregacaoId);
    setEditPastorId(r.pastorMemberId ?? null);
    setEditPastorName(r.pastor ? r.pastor.name : '');
    setEditIsKids(r.isKids || false);
    setEditPastorQuery('');
    setShowEditPastorsDropdown(false);
    setEditRedeModalOpen(true);
  };

  const saveEditRede = async () => {
    try {
      if (!editingRedeId) throw new Error('Rede inválida');
      // Validar gênero do pastor para redes Kids
      if (editIsKids && editPastorId) {
        const selectedPastor = users.find(u => u.id === editPastorId);
        if (selectedPastor && selectedPastor.gender !== 'FEMALE') {
          toast.error('Redes Kids devem ter responsável do gênero feminino');
          return;
        }
      }
      await redesService.updateRede(editingRedeId, { name: editName, congregacaoId: editCongregacaoId || undefined, pastorMemberId: editPastorId || undefined, isKids: editIsKids });
      setEditRedeModalOpen(false);
      toast.success('Rede atualizada com sucesso!');
      await load();
    } catch (err) {
      console.error(err);
      toast.error(ErrorMessages.updateRede(err));
    }
  };

  // request deletion: validate associations and open confirm modal
  const requestDeleteRede = async (r: Rede) => {
    try {
      const allDiscipulados = await discipuladosService.getDiscipulados();
      const children = (allDiscipulados || []).filter((d: Discipulado) => d.redeId === r.id);
      if (children.length > 0) {
        return toast.error('Não é possível apagar rede com discipulados associados');
      }
    } catch (err) {
      console.error(err);
      return toast.error(ErrorMessages.checkAssociations(err));
    }
    setConfirmTarget(r);
    setConfirmOpen(true);
  };

  const deleteRedeConfirmed = async () => {
    if (!confirmTarget) return setConfirmOpen(false);
    try {
      await redesService.deleteRede(confirmTarget.id);
      toast.success('Rede removida com sucesso!');
      setConfirmOpen(false);
      setConfirmTarget(null);
      await load();
    } catch (err) {
      console.error(err);
      toast.error(ErrorMessages.deleteRede(err));
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleOpenViewModal = async (r: Rede) => {
    setViewingRede(r);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setViewingRede(null);
  };

  // Verificar se há filtros ativos
  const hasActiveFilters = !!filterName || filterCongregacaoId !== null || filterPastorId !== null || filterIsKids !== null || filterMyNetworks;

  // Limpar todos os filtros
  const clearAllFilters = () => {
    setFilterName('');
    setFilterMyNetworks(false);
    setFilterCongregacaoId(null);
    setFilterPastorId(null);
    setFilterIsKids(null);
  };

  // Configuração dos filtros para o modal
  const filterConfigs: FilterConfig[] = [
    {
      type: 'switch',
      label: '',
      value: filterMyNetworks,
      onChange: setFilterMyNetworks,
      switchLabelOff: 'Todas as redes',
      switchLabelOn: 'Minhas redes'
    },
    {
      type: 'select',
      label: 'Congregação',
      value: filterCongregacaoId,
      onChange: setFilterCongregacaoId,
      options: congregacoes.map(c => ({ value: c.id, label: c.name }))
    },
    {
      type: 'select',
      label: 'Tipo',
      value: filterIsKids === null ? null : filterIsKids ? 'true' : 'false',
      onChange: (val) => {
        if (val === null) {
          setFilterIsKids(null);
        } else {
          setFilterIsKids(val === 'true');
        }
      },
      options: [
        { value: 'true', label: 'Apenas Kids' },
        { value: 'false', label: 'Apenas Padrão' }
      ]
    },
    {
      type: 'select',
      label: 'Pastor',
      value: filterPastorId,
      onChange: setFilterPastorId,
      renderCustom: () => (
        <ThemeProvider theme={muiTheme}>
          <Autocomplete
            size="small"
            fullWidth
            options={users.filter(u => {
              const filteredRedes = redes.filter(r => {
                if (filterCongregacaoId && r.congregacaoId !== filterCongregacaoId) return false;
                if (filterIsKids !== null && r.isKids !== filterIsKids) return false;
                return true;
              });
              return filteredRedes.some(r => r.pastorMemberId === u.id);
            })}
            getOptionLabel={(option) => option.name}
            value={users.find(u => u.id === filterPastorId) || null}
            onChange={(event, newValue) => setFilterPastorId(newValue?.id || null)}
            renderInput={(params) => (
              <TextField 
                {...params} 
                placeholder="Selecione um pastor"
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

  const filteredRedes = redes
    .filter(r => !filterCongregacaoId || r.congregacaoId === filterCongregacaoId)
    .filter(r => !filterPastorId || r.pastorMemberId === filterPastorId)
    .filter(r => filterIsKids === null || r.isKids === filterIsKids)
    .filter(r => !filterName || r.name.toLowerCase().includes(filterName.toLowerCase()));

  return (
    <ThemeProvider theme={muiTheme}>
      <div>
        <h2 className="text-2xl font-semibold mb-4">Redes</h2>

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
                {[filterName, filterCongregacaoId, filterPastorId, filterIsKids].filter(f => f !== null && f !== '').length + (filterMyNetworks ? 1 : 0)}
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
        <h3 className="font-medium mb-2">Exibindo {filteredRedes.length} de {redes.length} redes</h3>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
        <ul className="space-y-2">
          {filteredRedes.map(r => {
            const discipuladoCount = r.discipulados?.length || 0;
            const canDelete = discipuladoCount === 0;
            const pastor = users.find(u => u.id === r.pastorMemberId);
            
            return (
              <li 
                key={r.id} 
                className={`border rounded-lg p-4 transition-colors ${
                  !r.congregacaoId || !r.pastorMemberId
                    ? 'bg-red-900/20 border-red-700' 
                    : 'bg-gray-800 border-gray-700 hover:bg-gray-750'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {pastor ? (
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={pastor.photoUrl} alt={pastor.name} />
                        <AvatarFallback className="bg-blue-600 text-white text-sm font-semibold">
                          {getInitials(pastor.name)}
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
                      <h4 className="font-medium text-white flex items-center gap-2">
                        {r.name}
                        {r.isKids && <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded">Kids</span>}
                      </h4>
                      <p className="text-sm text-gray-400 mt-1">
                        Congregação: {r.congregacao?.name || (
                          <span className="text-red-400">Sem congregação</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-400">
                        Pastor: {pastor?.name || (
                          <span className="text-red-400">Sem pastor</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {discipuladoCount} {discipuladoCount === 1 ? 'discipulado' : 'discipulados'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenViewModal(r)}
                      className="p-2 text-blue-400 hover:bg-blue-900/30 rounded transition-colors"
                      title="Visualizar detalhes"
                    >
                      <FiEye className="h-4 w-4" />
                    </button>
                    <button
                      disabled={!canEditRede(r)}
                      onClick={() => openEditRede(r)}
                      className={`p-2 rounded transition-colors ${
                        canEditRede(r)
                          ? 'text-gray-400 hover:bg-gray-700'
                          : 'text-gray-600 cursor-not-allowed opacity-50'
                      }`}
                      title={canEditRede(r) ? 'Editar rede' : 'Sem permissão para editar'}
                    >
                      <FiEdit2 className="h-4 w-4" />
                    </button>
                    <button
                      disabled={!canDelete || !canDeleteRede(r)}
                      onClick={() => requestDeleteRede(r)}
                      className={`p-2 rounded transition-colors ${
                        canDelete && canDeleteRede(r)
                          ? 'text-red-400 hover:bg-red-900/30'
                          : 'text-gray-600 cursor-not-allowed opacity-50'
                      }`}
                      title={
                        !canDelete 
                          ? 'Não é possível apagar: possui discipulados associados'
                          : !canDeleteRede(r)
                          ? 'Sem permissão para apagar'
                          : 'Excluir rede'
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

      {/* Floating create button */}
      {canCreateRede() && (
        <button aria-label="Criar rede" onClick={() => setShowCreateModal(true)} className="fixed right-6 bottom-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg z-50">
          <FiPlus className="h-7 w-7" aria-hidden />
        </button>
      )}

      {/* Create modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded w-11/12 sm:w-96">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Criar Rede</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-500">Fechar</button>
            </div>
            <div className="space-y-3">
              <input placeholder="Nome da rede" value={createName} onChange={(e) => setCreateName(e.target.value)} className="border p-2 rounded w-full bg-gray-800 text-white h-10" />
              
              <select 
                value={createCongregacaoId || ''} 
                onChange={(e) => setCreateCongregacaoId(e.target.value ? Number(e.target.value) : null)} 
                className="border p-2 rounded w-full bg-gray-800 text-white h-10"
              >
                <option value="">Selecione uma congregação *</option>
                {congregacoes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <div ref={createPastorDropdownRef} className="relative w-full">
                <input placeholder="Pastor" value={createPastorQuery || createPastorName} onChange={(e) => { setCreatePastorQuery(e.target.value); setShowCreatePastorsDropdown(true); setCreatePastorName(''); setCreatePastorUserId(null); }} onFocus={() => setShowCreatePastorsDropdown(true)} className="border p-2 rounded w-full bg-gray-800 text-white h-10" />
                {showCreatePastorsDropdown && (
                  <div className="absolute left-0 right-0 bg-gray-800 border mt-1 rounded max-h-44 overflow-auto z-50">
                    {users.filter(u => {
                      // Filtrar apenas mulheres se for rede Kids
                      if (createIsKids && u.gender !== 'FEMALE') return false;
                      const q = (createPastorQuery || '').toLowerCase();
                      if (!q) return true;
                      return (u.name.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
                    }).map(u => (
                      <div key={u.id} className="px-3 py-2 hover:bg-gray-700 cursor-pointer flex items-center justify-between" onMouseDown={() => { setCreatePastorUserId(u.id); setCreatePastorName(u.name); setCreatePastorQuery(''); setShowCreatePastorsDropdown(false); }}>
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

              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={createIsKids} 
                  onChange={(e) => {
                    const isKids = e.target.checked;
                    setCreateIsKids(isKids);
                    // Se marcar como Kids e o pastor selecionado não for feminino, limpar seleção
                    if (isKids && createPastorUserId) {
                      const selectedPastor = users.find(u => u.id === createPastorUserId);
                      if (selectedPastor && selectedPastor.gender !== 'FEMALE') {
                        setCreatePastorUserId(null);
                        setCreatePastorName('');
                        toast.loading('Redes Kids devem ter responsável do gênero feminino');
                      }
                    }
                  }} 
                  className="w-4 h-4"
                />
                <span className="text-sm">Rede Kids</span>
              </label>
              {createIsKids && (
                <div className="text-xs text-yellow-400 -mt-2">
                  ⚠️ Apenas membros do gênero feminino podem ser responsáveis por redes Kids
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button onClick={() => setShowCreateModal(false)} className="px-3 py-2 border rounded">Cancelar</button>
                <button onClick={createRede} className="px-3 py-2 bg-green-600 text-white rounded">Criar rede</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit rede modal */}
      {editRedeModalOpen && editingRedeId && (() => {
        const editingRede = redes.find(r => r.id === editingRedeId);
        const canEditCongregacao = editingRede ? canEditRedeCongregacao(editingRede) : false;
        return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded w-11/12 sm:w-96">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Editar Rede</h3>
              <button onClick={() => setEditRedeModalOpen(false)} className="text-gray-500">Fechar</button>
            </div>
            <div className="space-y-3">
              <input placeholder="Nome da rede" value={editName} onChange={(e) => setEditName(e.target.value)} className="border p-2 rounded w-full bg-gray-800 text-white h-10" />
              
              <select 
                disabled={!canEditCongregacao}
                value={editCongregacaoId || ''} 
                onChange={(e) => setEditCongregacaoId(e.target.value ? Number(e.target.value) : null)} 
                className={`border p-2 rounded w-full bg-gray-800 text-white h-10 ${!canEditCongregacao ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <option value="">Selecione uma congregação</option>
                {congregacoes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {!canEditCongregacao && (
                <div className="text-xs text-yellow-400 -mt-2">
                  ⚠️ Você não tem permissão para alterar a congregação desta rede
                </div>
              )}

              <div ref={editPastorDropdownRef} className="relative w-full">
                <input placeholder="Pastor" value={editPastorQuery || editPastorName} onChange={(e) => { setEditPastorQuery(e.target.value); setShowEditPastorsDropdown(true); setEditPastorName(''); setEditPastorId(null); }} onFocus={() => { if (editPastorsTimeoutRef.current) { window.clearTimeout(editPastorsTimeoutRef.current); editPastorsTimeoutRef.current = null; } setShowEditPastorsDropdown(true); }} className="border p-2 rounded w-full bg-gray-800 text-white h-10" />
                {showEditPastorsDropdown && (
                  <div className="absolute left-0 right-0 bg-gray-800 border mt-1 rounded max-h-44 overflow-auto z-50">
                    {users.filter(u => {
                      // Filtrar apenas mulheres se for rede Kids
                      if (editIsKids && u.gender !== 'FEMALE') return false;
                      const q = (editPastorQuery || '').toLowerCase();
                      if (!q) return true;
                      return (u.name.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
                    }).map(u => (
                      <div key={u.id} className="px-3 py-2 hover:bg-gray-700 cursor-pointer flex items-center justify-between" onMouseDown={() => { setEditPastorId(u.id); setEditPastorName(u.name); setEditPastorQuery(''); setShowEditPastorsDropdown(false); }}>
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

              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={editIsKids} 
                  onChange={(e) => {
                    const isKids = e.target.checked;
                    setEditIsKids(isKids);
                    // Se marcar como Kids e o pastor selecionado não for feminino, limpar seleção
                    if (isKids && editPastorId) {
                      const selectedPastor = users.find(u => u.id === editPastorId);
                      if (selectedPastor && selectedPastor.gender !== 'FEMALE') {
                        setEditPastorId(null);
                        setEditPastorName('');
                        toast.loading('Redes Kids devem ter responsável do gênero feminino');
                      }
                    }
                  }} 
                  className="w-4 h-4"
                />
                <span className="text-sm">Rede Kids</span>
              </label>
              {editIsKids && (
                <div className="text-xs text-yellow-400 -mt-2">
                  ⚠️ Apenas membros do gênero feminino podem ser responsáveis por redes Kids
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button onClick={() => setEditRedeModalOpen(false)} className="px-3 py-2 border rounded">Cancelar</button>
                <button onClick={saveEditRede} className="px-3 py-2 bg-green-600 text-white rounded">Salvar</button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* FilterModal */}
      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={() => {}}
        onClear={clearAllFilters}
        filters={filterConfigs}
        hasActiveFilters={hasActiveFilters}
      />

      {/* View Modal */}
      <RedeViewModal
        rede={viewingRede}
        isOpen={isViewModalOpen}
        onClose={handleCloseViewModal}
      />

      {/* Confirm deletion modal */}
      <ModalConfirm
        open={confirmOpen}
        title="Remover rede"
        message={confirmTarget ? `Remover rede ${confirmTarget.name}?` : ''}
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        onConfirm={deleteRedeConfirmed}
        onCancel={() => { setConfirmOpen(false); setConfirmTarget(null); }}
      />
    </div>
    </ThemeProvider>
  );
}
