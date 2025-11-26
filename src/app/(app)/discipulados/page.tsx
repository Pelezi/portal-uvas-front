"use client";

import React, { useEffect, useState, useRef } from 'react';
import Collapse from '@/components/Collapse';
import CollapsibleItem from '@/components/CollapsibleItem';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import { discipuladosService } from '@/services/discipuladosService';
import { redesService } from '@/services/redesService';
import { userService } from '@/services/userService';
import { celulasService } from '@/services/celulasService';
import { Discipulado, Celula } from '@/types';
import toast from 'react-hot-toast';
import CreateUserModal from '@/components/CreateUserModal';
import { createTheme, ThemeProvider } from '@mui/material';
import { FiTrash2, FiPlus } from 'react-icons/fi';

export default function DiscipuladosPage() {
  const [list, setList] = useState<Discipulado[]>([]);
  const [selected, setSelected] = useState<Discipulado | null>(null);
  const [celulas, setCelulas] = useState<Celula[]>([]);
  const [redes, setRedes] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  // filters
  const [filterDiscipuladorQuery, setFilterDiscipuladorQuery] = useState('');
  const [filterDiscipuladorId, setFilterDiscipuladorId] = useState<number | null>(null);
  const [filterRedeId, setFilterRedeId] = useState<number | null>(null);
  const [showFilterDiscipuladoresDropdown, setShowFilterDiscipuladoresDropdown] = useState(false);
  const filterDiscipuladorDropdownRef = useRef<any>(null);
  const filterDiscipuladorTimeoutRef = useRef<number | null>(null);
  // creation
  const [createDiscipuladoModalOpen, setCreateDiscipuladoModalOpen] = useState(false);
  const [createDiscipuladorQuery, setCreateDiscipuladorQuery] = useState('');
  const [createDiscipuladorId, setCreateDiscipuladorId] = useState<number | null>(null);
  const [createDiscipuladorName, setCreateDiscipuladorName] = useState('');
  const [createRedeId, setCreateRedeId] = useState<number | null>(null);
  const createDiscipuladorDropdownRef = useRef<any>(null);
  const createDiscipuladorTimeoutRef = useRef<number | null>(null);
  const [showCreateDiscipuladoresDropdown, setShowCreateDiscipuladoresDropdown] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserFirstName, setNewUserFirstName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');

  // edit modal state
  const [editDiscipuladoModalOpen, setEditDiscipuladoModalOpen] = useState(false);
  const [editDiscipuladorQuery, setEditDiscipuladorQuery] = useState('');
  const [editDiscipuladorId, setEditDiscipuladorId] = useState<number | null>(null);
  const [editDiscipuladorName, setEditDiscipuladorName] = useState('');
  const editDiscipuladorDropdownRef = useRef<any>(null);
  const editDiscipuladorTimeoutRef = useRef<number | null>(null);
  const [showEditDiscipuladoresDropdown, setShowEditDiscipuladoresDropdown] = useState(false);
  const [editDiscipuladoId, setEditDiscipuladoId] = useState<number | null>(null);
  const [editRedeId, setEditRedeId] = useState<number | null>(null);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const load = async () => {
    try {
      const d = await discipuladosService.getDiscipulados();
      setList(d || []);
      // also load all células to compute counts per discipulado
      try {
        const allCells = await celulasService.getCelulas();
        const counts: Record<number, number> = {};
        (allCells || []).forEach((c: any) => {
          if (!c.discipuladoId) return;
          counts[c.discipuladoId] = (counts[c.discipuladoId] || 0) + 1;
        });
        setDiscipuladoCellCountMap(counts);
      } catch (err) {
        console.error('failed loading celulas for counts', err);
      }
    } catch (err) {
      console.error(err);
      toast.error('Falha ao carregar discipulados');
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const loadAux = async () => {
      try {
        const r = await redesService.getRedes();
        setRedes(r || []);
        const u = await userService.list();
        setUsers(u || []);
      } catch (err) { console.error('failed loading redes/users', err); }
    };
    loadAux();
  }, []);

  const [expandedDiscipulados, setExpandedDiscipulados] = useState<Record<number, boolean>>({});
  const [discipuladoCelulasMap, setDiscipuladoCelulasMap] = useState<Record<number, Celula[]>>({});
  const [discipuladoCellCountMap, setDiscipuladoCellCountMap] = useState<Record<number, number>>({});

  const create = async () => {
    try {
      if (!createRedeId) throw new Error('Selecione uma rede');
      if (!createDiscipuladorId) throw new Error('Selecione um discipulador');
      const discipulador = users.find(u => u.id === createDiscipuladorId);
      const nameForApi = discipulador ? `${discipulador.firstName} ${discipulador.lastName}` : '';
      const created = await discipuladosService.createDiscipulado({ name: nameForApi, redeId: createRedeId, discipuladorUserId: createDiscipuladorId });
      setCreateDiscipuladorId(null); setCreateDiscipuladorName(''); setCreateRedeId(null); setCreateDiscipuladoModalOpen(false);
      toast.success('Discipulado criado');
      await load();
      // load celulas for created discipulado and update counts
      const all = await celulasService.getCelulas();
      const cellsForCreated = (all || []).filter(c => c.discipuladoId === created.id);
      setDiscipuladoCelulasMap(prev => ({ ...prev, [created.id]: cellsForCreated }));
      setDiscipuladoCellCountMap(prev => ({ ...prev, [created.id]: cellsForCreated.length }));
    } catch (err) {
      console.error(err);
      toast.error('Falha ao criar discipulado');
    }
  };

  const openEditModal = (d: Discipulado) => {
    setEditDiscipuladoId(d.id);
    setEditRedeId(d.redeId ?? null);
    setEditDiscipuladorId(d.discipuladorUserId ?? null);
    setEditDiscipuladorName(getUserName(d.discipuladorUserId));
    setEditDiscipuladorQuery('');
    setShowEditDiscipuladoresDropdown(false);
    setEditDiscipuladoModalOpen(true);
  };

  const saveEdit = async () => {
    try {
      if (!editDiscipuladoId) throw new Error('Selecione um discipulado');
      if (!editRedeId) throw new Error('Selecione uma rede');
      if (!editDiscipuladorId) throw new Error('Selecione um discipulador');
      const discipulador = users.find(u => u.id === editDiscipuladorId);
      const nameForApi = discipulador ? `${discipulador.firstName} ${discipulador.lastName}` : '';
      await discipuladosService.updateDiscipulado(editDiscipuladoId, { name: nameForApi, redeId: editRedeId, discipuladorUserId: editDiscipuladorId });
      setEditDiscipuladoModalOpen(false);
      toast.success('Discipulado atualizado');
      await load();
    } catch (err) {
      console.error(err);
      toast.error('Falha ao atualizar discipulado');
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
    } catch (err) { console.error(err); toast.error('Falha ao carregar células'); }
  };

  const deleteDiscipulado = async (d: Discipulado) => {
    try {
      const allCelulas = await celulasService.getCelulas();
      const children = (allCelulas || []).filter((c:any) => c.discipuladoId === d.id);
      if (children.length > 0) {
        return toast.error('Não é possível apagar discipulado com células associadas');
      }
    } catch (err) {
      console.error(err);
      return toast.error('Falha ao verificar associações');
    }
    if (!confirm(`Remover discipulado de ${getUserName(d.discipuladorUserId)}?`)) return;
    try {
      await discipuladosService.deleteDiscipulado(d.id);
      toast.success('Discipulado removido');
      await load();
    } catch (err) {
      console.error(err);
      toast.error('Falha ao remover discipulado');
    }
  };

  const getUserName = (id?: number | null) => {
    if (!id) return '';
    const u = users.find(x => x.id === id);
    return u ? `${u.firstName} ${u.lastName}` : '';
  };

  // users that are discipuladores in the current list
  const discipuladorIds = new Set<number>(list.map(d => d.discipuladorUserId).filter(Boolean) as number[]);

  const muiTheme = createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
    },
  });

  return (
    <>
      <div>
        <h2 className="text-2xl font-semibold mb-4">Discipulados</h2>

        <div className="mb-6">
          <label className="block mb-2">Filtros</label>
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <div className="relative w-full sm:w-80" ref={filterDiscipuladorDropdownRef}>
              <input
                placeholder="Discipulador"
                value={filterDiscipuladorQuery || (filterDiscipuladorId ? getUserName(filterDiscipuladorId) : '')}
                onChange={(e) => { setFilterDiscipuladorQuery(e.target.value); setShowFilterDiscipuladoresDropdown(true); setFilterDiscipuladorId(null); }}
                onFocus={() => { if (filterDiscipuladorTimeoutRef.current) { window.clearTimeout(filterDiscipuladorTimeoutRef.current); filterDiscipuladorTimeoutRef.current = null; } setShowFilterDiscipuladoresDropdown(true); }}
                onBlur={() => { filterDiscipuladorTimeoutRef.current = window.setTimeout(() => { setShowFilterDiscipuladoresDropdown(false); filterDiscipuladorTimeoutRef.current = null; }, 150); }}
                className="border p-2 rounded w-full bg-white dark:bg-gray-800 dark:text-white h-10"
              />
              {showFilterDiscipuladoresDropdown && (
                <div className="absolute left-0 right-0 bg-white dark:bg-gray-800 border mt-1 rounded max-h-44 overflow-auto z-50">
                  {users.filter(u => discipuladorIds.has(u.id)).filter(u => {
                    const q = (filterDiscipuladorQuery || '').toLowerCase();
                    if (!q) return true;
                    return (`${u.firstName} ${u.lastName}`.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
                  }).map(u => (
                    <div key={u.id} className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center justify-between" onMouseDown={() => { setFilterDiscipuladorId(u.id); setFilterDiscipuladorQuery(''); setShowFilterDiscipuladoresDropdown(false); }}>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{u.firstName} {u.lastName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{u.email}</div>
                      </div>
                      <div className="text-xs text-green-600">Selecionar</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <ThemeProvider theme={muiTheme}>
              <FormControl className="w-48">
                <InputLabel id="rede-filter-label" size='small'>Rede</InputLabel>
                <Select
                  labelId="rede-filter-label"
                  value={filterRedeId ?? ''}
                  onChange={(e: any) => setFilterRedeId(e.target.value ? Number(e.target.value) : null)}
                  label="Rede"
                  size="small"
                  className="bg-white dark:bg-gray-800"
                >
                  <MenuItem value="">Todas redes</MenuItem>
                  {redes.map((r: any) => (<MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>))}
                </Select>
              </FormControl>
            </ThemeProvider>
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-2">Lista de discipulados</h3>
          <ul className="space-y-2">
            {list
              .filter(d => !filterRedeId || d.redeId === filterRedeId)
              .filter(d => !filterDiscipuladorId || d.discipuladorUserId === filterDiscipuladorId)
              .map(d => (
                <li key={d.id} className="border p-2 rounded">
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
                                    className={`p-1 rounded ${disabled ? 'text-gray-400 opacity-60 cursor-not-allowed' : 'text-red-600 hover:bg-red-100 dark:hover:bg-red-900'}`}
                                  >
                                    <FiTrash2 className="h-4 w-4" aria-hidden />
                                  </button>
                                </span>
                              );
                      })()
                    }
                    title={<>{(users.find(u => u.id === d.discipuladorUserId)?.firstName || '')} {(users.find(u => u.id === d.discipuladorUserId)?.lastName || '')} <span className="text-sm text-gray-500 ml-2">({discipuladoCellCountMap[d.id] ?? (discipuladoCelulasMap[d.id]?.length ?? 0)} células)</span></>}
                    subtitle={<>{`rede: ${d.rede.name}`}</>}
                    duration={250}
                  >
                    {(discipuladoCelulasMap[d.id] || []).length === 0 && <div className="text-xs text-gray-500">Nenhuma célula</div>}
                    <ul className="space-y-1">
                      {(discipuladoCelulasMap[d.id] || []).map((c:any) => (
                        <li key={c.id} className="text-sm border p-1 rounded">{c.name} (id: {c.id})</li>
                      ))}
                    </ul>
                  </CollapsibleItem>
                </li>
              ))}
          </ul>
        </div>
      </div>

      {/* Floating create button */}
      <button aria-label="Criar discipulado" onClick={() => setCreateDiscipuladoModalOpen(true)} className="fixed right-6 bottom-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg z-50">
        <FiPlus className="h-7 w-7" aria-hidden />
      </button>

      {/* Create discipulado modal */}
      {createDiscipuladoModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 p-6 rounded w-11/12 sm:w-96">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Criar Discipulado</h3>
              <button onClick={() => setCreateDiscipuladoModalOpen(false)} className="text-gray-500">Fechar</button>
            </div>
            <div className="space-y-3">
              <div className="w-full">

                <ThemeProvider theme={muiTheme}>
                  <FormControl className="w-full">
                    <InputLabel id="create-rede-label" size='small'>Rede</InputLabel>
                    <Select 
                    labelId="create-rede-label" 
                    value={createRedeId ?? ''} 
                    onChange={(e: any) => setCreateRedeId(e.target.value ? Number(e.target.value) : null)} 
                    label="Rede" 
                    size="small" 
                    className="bg-white dark:bg-gray-800 w-full">
                      <MenuItem value="">Selecione rede</MenuItem>
                      {redes.map((r: any) => (<MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>))}
                    </Select>
                  </FormControl>
                </ThemeProvider>
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
                  className="border p-2 rounded w-full bg-white dark:bg-gray-800 dark:text-white h-10"
                />
                {showCreateDiscipuladoresDropdown && (
                  <div className="absolute left-0 right-0 bg-white dark:bg-gray-800 border mt-1 rounded max-h-44 overflow-auto z-50">
                    {users.filter(u => {
                      const q = (createDiscipuladorQuery || '').toLowerCase();
                      if (!q) return true;
                      return (`${u.firstName} ${u.lastName}`.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
                    }).map(u => (
                      <div key={u.id} className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center justify-between" onMouseDown={() => { setCreateDiscipuladorId(u.id); setCreateDiscipuladorName(`${u.firstName} ${u.lastName}`); setCreateDiscipuladorQuery(''); setShowCreateDiscipuladoresDropdown(false); }}>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{u.firstName} {u.lastName}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{u.email}</div>
                        </div>
                        <div className="text-xs text-green-600">Selecionar</div>
                      </div>
                    ))}
                    <div className="px-3 py-2 border-t text-center sticky bottom-0 bg-white dark:bg-gray-800">
                      <button onMouseDown={(e) => { e.preventDefault(); setShowCreateUserModal(true); }} className="text-sm text-blue-600">Criar novo usuário</button>
                    </div>
                  </div>
                )}
              </div>

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
          <div className="bg-white dark:bg-gray-900 p-6 rounded w-11/12 sm:w-96">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Editar Discipulado</h3>
              <button onClick={() => setEditDiscipuladoModalOpen(false)} className="text-gray-500">Fechar</button>
            </div>
            <div className="space-y-3">
              <div className="w-full">
                <ThemeProvider theme={muiTheme}>
                  <FormControl className="w-full">
                    <InputLabel id="edit-rede-label" size='small'>Rede</InputLabel>
                    <Select 
                    labelId="edit-rede-label" 
                    value={editRedeId ?? ''} 
                    onChange={(e: any) => setEditRedeId(e.target.value ? Number(e.target.value) : null)} 
                    label="Rede" 
                    size="small" 
                    className="bg-white dark:bg-gray-800 w-full">
                      <MenuItem value="">Selecione rede</MenuItem>
                      {redes.map((r: any) => (<MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>))}
                    </Select>
                  </FormControl>
                </ThemeProvider>
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
                  className="border p-2 rounded w-full bg-white dark:bg-gray-800 dark:text-white h-10"
                />
                {showEditDiscipuladoresDropdown && (
                  <div className="absolute left-0 right-0 bg-white dark:bg-gray-800 border mt-1 rounded max-h-44 overflow-auto z-50">
                    {users.filter(u => {
                      const q = (editDiscipuladorQuery || '').toLowerCase();
                      if (!q) return true;
                      return (`${u.firstName} ${u.lastName}`.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
                    }).map(u => (
                      <div key={u.id} className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center justify-between" onMouseDown={() => { setEditDiscipuladorId(u.id); setEditDiscipuladorName(`${u.firstName} ${u.lastName}`); setEditDiscipuladorQuery(''); setShowEditDiscipuladoresDropdown(false); }}>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{u.firstName} {u.lastName}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{u.email}</div>
                        </div>
                        <div className="text-xs text-green-600">Selecionar</div>
                      </div>
                    ))}
                    <div className="px-3 py-2 border-t text-center sticky bottom-0 bg-white dark:bg-gray-800">
                      <button onMouseDown={(e) => { e.preventDefault(); setShowCreateUserModal(true); }} className="text-sm text-blue-600">Criar novo usuário</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={() => setEditDiscipuladoModalOpen(false)} className="px-3 py-2 border rounded">Cancelar</button>
                <button onClick={saveEdit} className="px-3 py-2 bg-green-600 text-white rounded">Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CreateUserModal open={showCreateUserModal} onClose={() => setShowCreateUserModal(false)} onCreated={(created) => {
        setUsers((prev) => [created, ...prev]);
        // prefer editing selection if edit modal open
        if (editDiscipuladoModalOpen) {
          setEditDiscipuladorId(created.id);
          setEditDiscipuladorName(`${created.firstName} ${created.lastName}`);
        } else {
          setCreateDiscipuladorId(created.id);
          setCreateDiscipuladorName(`${created.firstName} ${created.lastName}`);
        }
        setShowCreateUserModal(false);
      }} />
    </>
  );
}
