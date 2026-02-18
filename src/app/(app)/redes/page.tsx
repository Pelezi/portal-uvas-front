"use client";

import React, { useEffect, useState, useRef } from 'react';
import Collapse from '@/components/Collapse';
import CollapsibleItem from '@/components/CollapsibleItem';
import { redesService } from '@/services/redesService';
import { congregacoesService } from '@/services/congregacoesService';
import { memberService } from '@/services/memberService';
import { discipuladosService } from '@/services/discipuladosService';
import { celulasService } from '@/services/celulasService';
import toast from 'react-hot-toast';
import { ErrorMessages } from '@/lib/errorHandler';
import { FiTrash2, FiPlus } from 'react-icons/fi';
import ModalConfirm from '@/components/ModalConfirm';
import { Celula, Discipulado, Member, Rede, Congregacao } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { createTheme, ThemeProvider, FormControl, InputLabel, Select, MenuItem, TextField, Autocomplete, Button } from '@mui/material';

export default function RedesPage() {
  const { user } = useAuth();
  const [redes, setRedes] = useState<Rede[]>([]);
  const [congregacoes, setCongregacoes] = useState<Congregacao[]>([]);
  const [users, setUsers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);

  // filters
  const [filterCongregacaoId, setFilterCongregacaoId] = useState<number | null>(null);
  const [filterPastorId, setFilterPastorId] = useState<number | null>(null);
  const [filterIsKids, setFilterIsKids] = useState<boolean | null>(null);

  // expansion & cache maps
  const [expandedRedes, setExpandedRedes] = useState<Record<number, boolean>>({});
  const [redeDiscipuladosMap, setRedeDiscipuladosMap] = useState<Record<number, Discipulado[]>>({});
  const [redeDiscipuladosCount, setRedeDiscipuladosCount] = useState<Record<number, number>>({});
  const [expandedDiscipulados, setExpandedDiscipulados] = useState<Record<number, boolean>>({});
  const [discipuladoCelulasMap, setDiscipuladoCelulasMap] = useState<Record<number, Celula[]>>({});

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

  const load = async () => {
    setLoading(true);
    try {
      const r = await redesService.getRedes();
      setRedes(r || []);
      try {
        const allD = await discipuladosService.getDiscipulados();
        const counts: Record<number, number> = {};
        (allD || []).forEach((d: Discipulado) => { counts[d.redeId] = (counts[d.redeId] || 0) + 1; });
        setRedeDiscipuladosCount(counts);
      } catch (err) {
        console.error('Failed to load discipulados for counts', err);
        setRedeDiscipuladosCount({});
      }
    } catch (err) { 
      console.error(err); 
      toast.error(ErrorMessages.loadRedes(err)); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    (async () => {
      try { 
        // Carregar apenas usuários que podem ser pastores (PRESIDENT_PASTOR ou PASTOR)
        const u = await memberService.list({ ministryType: 'PRESIDENT_PASTOR,PASTOR' }); 
        setUsers(u || []); 
      } catch (err) { console.error(err); }
      
      try {
        const c = await congregacoesService.getCongregacoes();
        setCongregacoes(c || []);
        
        // Selecionar automaticamente a congregação do usuário
        if (user) {
          let userCongregacaoId: number | null = null;
          
          // Verificar se é pastor de governo de alguma congregação
          if (user.congregacoesPastorGoverno && user.congregacoesPastorGoverno.length > 0) {
            userCongregacaoId = user.congregacoesPastorGoverno[0].id;
          }
          // Ou vice presidente de alguma congregação
          else if (user.congregacoesVicePresidente && user.congregacoesVicePresidente.length > 0) {
            userCongregacaoId = user.congregacoesVicePresidente[0].id;
          }
          // Ou pastor de alguma rede (pegar a congregação da rede)
          else if (user.redes && user.redes.length > 0) {
            userCongregacaoId = user.redes[0].congregacaoId;
          }
          // Ou pertence a uma célula (líder, vice-líder ou membro)
          else if ((user.permission?.celulaIds && user.permission.celulaIds.length > 0) || user.celulaId) {
            try {
              const allCelulas = await celulasService.getCelulas();
              const firstCelulaId = user.permission?.celulaIds ? user.permission.celulaIds[0] : user.celulaId;
              const firstCelula = allCelulas.find(cel => cel.id === firstCelulaId);
              
              if (firstCelula?.discipuladoId) {
                console.log('Buscando discipulado com id: ', firstCelula.discipuladoId);
                const allDiscipulados = await discipuladosService.getDiscipulados();
                const discipulado = allDiscipulados.find(d => d.id === firstCelula.discipuladoId);
                console.log('Discipulado encontrado: ', discipulado);
                if (discipulado?.redeId) {
                  console.log('Buscando rede com id: ', discipulado.redeId);
                  const allRedes = await redesService.getRedes();
                  const rede = allRedes.find(r => r.id === discipulado.redeId);
                  console.log('Rede encontrada: ', rede);
                  if (rede?.congregacaoId) {
                    console.log('Congregação da rede: ', rede.congregacaoId);
                    userCongregacaoId = rede.congregacaoId;
                  }
                }
              }
            } catch (err) {
              console.error('Erro ao buscar congregação da célula:', err);
            }
          }
          
          if (userCongregacaoId) {
            setFilterCongregacaoId(userCongregacaoId);
          }
        }
      } catch (err) { console.error(err); }
    })();
  }, [user]);

  const onToggleRede = async (r: Rede) => {
    try {
      const currently = !!expandedRedes[r.id];
      if (!currently && !redeDiscipuladosMap[r.id]) {
        const all = await discipuladosService.getDiscipulados();
        const redeDiscipulados = (all || []).filter((d: Discipulado) => d.redeId === r.id);
        setRedeDiscipuladosMap(prev => ({ ...prev, [r.id]: redeDiscipulados }));
      }
      setExpandedRedes(prev => ({ ...prev, [r.id]: !currently }));
    } catch (err) { 
      console.error(err); 
      toast.error(ErrorMessages.loadDiscipulados(err)); 
    }
  };

  const onToggleDiscipulado = async (d: Discipulado, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const currently = !!expandedDiscipulados[d.id];
      if (!currently && !discipuladoCelulasMap[d.id]) {
        const all = await celulasService.getCelulas();
        const discipuladoCelulas = (all || []).filter((c: Celula) => c.discipuladoId === d.id);
        setDiscipuladoCelulasMap(prev => ({ ...prev, [d.id]: discipuladoCelulas }));
      }
      setExpandedDiscipulados(prev => ({ ...prev, [d.id]: !currently }));
    } catch (err) { 
      console.error(err); 
      toast.error(ErrorMessages.loadCelulas(err)); 
    }
  };

  const createRede = async () => {
    try {
      if (!createCongregacaoId) {
        toast.error('Selecione uma congregação');
        return;
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
    if (!confirm(`Remover discipulado de ${d.discipulador.name}?`)) return;
    try {
      await discipuladosService.deleteDiscipulado(d.id);
      toast.success('Discipulado removido com sucesso!');
      // refresh cached list for this rede
      const all = await discipuladosService.getDiscipulados();
      setRedeDiscipuladosMap(prev => ({ ...prev, [d.redeId]: (all || []).filter((x: Discipulado) => x.redeId === d.redeId) }));
    } catch (err) {
      console.error(err);
      toast.error(ErrorMessages.deleteDiscipulado(err));
    }
  };

  // IDs de usuários que são pastores de alguma rede
  const pastorUserIds = new Set<number>((redes || []).map(r => r.pastorMemberId).filter((id): id is number => id != null));

  const muiTheme = createTheme({
    palette: {
      mode: 'dark',
    },
  });

  return (
    <ThemeProvider theme={muiTheme}>
      <div>
        <h2 className="text-2xl font-semibold mb-4">Redes</h2>

        <div className="mb-6">
          <label className="block mb-2">Filtros</label>
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <div className="w-full sm:w-64">
              <FormControl fullWidth size="small">
                <InputLabel id="filter-congregacao-label">Congregação</InputLabel>
                <Select
                  labelId="filter-congregacao-label"
                  value={filterCongregacaoId || ''}
                  onChange={(e) => setFilterCongregacaoId(e.target.value ? Number(e.target.value) : null)}
                  label="Congregação"
                  className="bg-gray-800"
                >
                  <MenuItem value="">Todas as congregações</MenuItem>
                  {congregacoes.map(c => (
                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>

            <div className="w-full sm:w-48">
              <FormControl fullWidth size="small">
                <InputLabel id="filter-kids-label">Tipo</InputLabel>
                <Select
                  labelId="filter-kids-label"
                  value={filterIsKids === null ? '' : filterIsKids ? 'true' : 'false'}
                  onChange={(e) => {
                    const value = e.target.value as string;
                    setFilterIsKids(value === '' ? null : value === 'true');
                  }}
                  label="Tipo"
                  className="bg-gray-800"
                >
                  <MenuItem value="">Todas</MenuItem>
                  <MenuItem value="true">Apenas Kids</MenuItem>
                  <MenuItem value="false">Apenas Padrão</MenuItem>
                </Select>
              </FormControl>
            </div>

            <div className="w-full sm:w-80">
              <Autocomplete
                size="small"
                options={users.filter(u => {
                  // Filtrar pastores baseado nas redes filtradas
                  const filteredRedes = redes.filter(r => {
                    if (filterCongregacaoId && r.congregacaoId !== filterCongregacaoId) return false;
                    if (filterIsKids !== null && r.isKids !== filterIsKids) return false;
                    return true;
                  });
                  
                  // Mostrar apenas pastores das redes filtradas
                  return filteredRedes.some(r => r.pastorMemberId === u.id);
                })}
                getOptionLabel={(option) => option.name}
                value={users.find(u => u.id === filterPastorId) || null}
                onChange={(event, newValue) => setFilterPastorId(newValue?.id || null)}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Pastor" 
                    placeholder="Selecione um pastor"
                    className="bg-gray-800" 
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
            </div>

            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setFilterCongregacaoId(null);
                setFilterPastorId(null);
                setFilterIsKids(null);
              }}
              className="h-10 whitespace-nowrap"
            >
              Limpar Filtros
            </Button>
          </div>
        </div>

      <div>
        <h3 className="font-medium mb-2">Lista de redes</h3>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
        <ul className="space-y-2">
          {redes
            .filter(r => !filterCongregacaoId || r.congregacaoId === filterCongregacaoId)
            .filter(r => !filterPastorId || r.pastorMemberId === filterPastorId)
            .filter(r => filterIsKids === null || r.isKids === filterIsKids)
            .map(r => (
              <li key={r.id} className={`border p-2 rounded ${!r.congregacaoId || !r.pastorMemberId ? 'bg-red-900/20 border-red-700' : ''}`}>
                <CollapsibleItem
                  isOpen={!!expandedRedes[r.id]}
                  onToggle={() => onToggleRede(r)}
                  onEdit={() => openEditRede(r)}
                  right={
                    (() => {
                      const childCount = (redeDiscipuladosCount[r.id] ?? (redeDiscipuladosMap[r.id]?.length ?? 0));
                      const disabled = childCount > 0;
                      return (
                        <span onMouseDown={(e) => e.stopPropagation()}>
                          <button
                            disabled={disabled}
                            title={disabled ? 'Não é possível apagar: possui discipulados associados' : 'Excluir rede'}
                            onClick={() => requestDeleteRede(r)}
                            className={`p-1 rounded ${disabled ? 'text-gray-400 opacity-60 cursor-not-allowed' : 'text-red-600 hover:bg-red-900'}`}
                          >
                            <FiTrash2 className="h-4 w-4" aria-hidden />
                          </button>
                        </span> 
                      );
                    })()
                  }
                  title={<>{r.name} {r.isKids && <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded ml-2">Kids</span>} <span className="text-sm text-gray-500">({redeDiscipuladosCount[r.id] ?? (redeDiscipuladosMap[r.id]?.length ?? 0)} Discipulados)</span></>}
                  subtitle={<>
                    Congregação: {r.congregacao?.name || <span className="text-red-400">Sem congregação</span>} | 
                    Pastor: {r.pastor ? r.pastor.name : <span className="text-red-400">Sem pastor</span>}
                  </>}
                  duration={300}
                >
                  {(redeDiscipuladosMap[r.id] || []).length === 0 && <div className="text-xs text-gray-500">Nenhum discipulado</div>}
                  <ul className="space-y-1">
                    {(redeDiscipuladosMap[r.id] || []).map((d: Discipulado) => (
                      <li key={d.id}>
                        <CollapsibleItem
                          isOpen={!!expandedDiscipulados[d.id]}
                          onToggle={() => onToggleDiscipulado(d)}
                          right={
                            (() => {
                              const childCount = (discipuladoCelulasMap[d.id]?.length ?? 0);
                              const disabled = childCount > 0;
                              return (
                                <span onMouseDown={(e) => e.stopPropagation()}>
                                  <button
                                    disabled={disabled}
                                    title={disabled ? 'Não é possível apagar: possui células associadas' : 'Excluir discipulado'}
                                    onClick={() => deleteDiscipulado(d)}
                                    className={`text-sm px-2 py-1 border rounded ${disabled ? 'text-gray-400 border-gray-200 opacity-60 cursor-not-allowed' : 'text-red-600'}`}
                                  >Excluir</button>
                                </span>
                              );
                            })()
                          }
                          title={<>{d.discipulador?.name || 'Sem discipulador'}</>}
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
                </CollapsibleItem>
              </li>
            ))}
        </ul>
        )}
      </div>

      {/* Floating create button */}
      <button aria-label="Criar rede" onClick={() => setShowCreateModal(true)} className="fixed right-6 bottom-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg z-50">
        <FiPlus className="h-7 w-7" aria-hidden />
      </button>

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
                  onChange={(e) => setCreateIsKids(e.target.checked)} 
                  className="w-4 h-4"
                />
                <span className="text-sm">Rede Kids</span>
              </label>

              <div className="flex justify-end gap-2">
                <button onClick={() => setShowCreateModal(false)} className="px-3 py-2 border rounded">Cancelar</button>
                <button onClick={createRede} className="px-3 py-2 bg-green-600 text-white rounded">Criar rede</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit rede modal */}
      {editRedeModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded w-11/12 sm:w-96">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Editar Rede</h3>
              <button onClick={() => setEditRedeModalOpen(false)} className="text-gray-500">Fechar</button>
            </div>
            <div className="space-y-3">
              <input placeholder="Nome da rede" value={editName} onChange={(e) => setEditName(e.target.value)} className="border p-2 rounded w-full bg-gray-800 text-white h-10" />
              
              <select 
                value={editCongregacaoId || ''} 
                onChange={(e) => setEditCongregacaoId(e.target.value ? Number(e.target.value) : null)} 
                className="border p-2 rounded w-full bg-gray-800 text-white h-10"
              >
                <option value="">Selecione uma congregação</option>
                {congregacoes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <div ref={editPastorDropdownRef} className="relative w-full">
                <input placeholder="Pastor" value={editPastorQuery || editPastorName} onChange={(e) => { setEditPastorQuery(e.target.value); setShowEditPastorsDropdown(true); setEditPastorName(''); setEditPastorId(null); }} onFocus={() => { if (editPastorsTimeoutRef.current) { window.clearTimeout(editPastorsTimeoutRef.current); editPastorsTimeoutRef.current = null; } setShowEditPastorsDropdown(true); }} className="border p-2 rounded w-full bg-gray-800 text-white h-10" />
                {showEditPastorsDropdown && (
                  <div className="absolute left-0 right-0 bg-gray-800 border mt-1 rounded max-h-44 overflow-auto z-50">
                    {users.filter(u => {
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
                  onChange={(e) => setEditIsKids(e.target.checked)} 
                  className="w-4 h-4"
                />
                <span className="text-sm">Rede Kids</span>
              </label>

              <div className="flex justify-end gap-2">
                <button onClick={() => setEditRedeModalOpen(false)} className="px-3 py-2 border rounded">Cancelar</button>
                <button onClick={saveEditRede} className="px-3 py-2 bg-green-600 text-white rounded">Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}
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
