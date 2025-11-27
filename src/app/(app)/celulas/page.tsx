"use client";

import React, { useEffect, useState, useRef } from 'react';
import { celulasService } from '@/services/celulasService';
import { membersService } from '@/services/membersService';
import { discipuladosService } from '@/services/discipuladosService';
import { redesService } from '@/services/redesService';
import { Celula } from '@/types';
import { userService } from '@/services/userService';
import { useAuth } from '@/contexts/AuthContext';
import { createTheme, FormControl, InputLabel, MenuItem, Select, ThemeProvider } from '@mui/material';
import toast from 'react-hot-toast';
import CreateUserModal from '@/components/CreateUserModal';
import { FiPlus, FiUsers, FiEdit2, FiCopy, FiTrash2 } from 'react-icons/fi';
import { LuHistory } from 'react-icons/lu';
import Link from 'next/link';

export default function CelulasPage() {
  const [groups, setGroups] = useState<Celula[]>([]);
  const [cellMembersCount, setCellMembersCount] = useState<Record<number, number>>({});
  const [cellHasInactive, setCellHasInactive] = useState<Record<number, boolean>>({});
  const [confirmingCelula, setConfirmingCelula] = useState<Celula | null>(null);
  const [name, setName] = useState('');
  // leader selection via autocomplete
  const [leaderName, setLeaderName] = useState('');
  const [leaderUserId, setLeaderUserId] = useState<number | null>(null);
  // listing filters
  const [filterName, setFilterName] = useState('');
  const [filterRedeId, setFilterRedeId] = useState<number | null>(null);
  const [filterDiscipuladoId, setFilterDiscipuladoId] = useState<number | null>(null);
  const [filterLeaderQuery, setFilterLeaderQuery] = useState('');
  const [filterLeaderId, setFilterLeaderId] = useState<number | null>(null);
  const [showFilterLeaderDropdown, setShowFilterLeaderDropdown] = useState(false);
  const filterLeaderDropdownRef = useRef<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [discipulados, setDiscipulados] = useState<any[]>([]);
  const [redes, setRedes] = useState<any[]>([]);
  // create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createRedeId, setCreateRedeId] = useState<number | null>(null);
  const [createDiscipuladoId, setCreateDiscipuladoId] = useState<number | null>(null);
  const [createLeaderQuery, setCreateLeaderQuery] = useState('');
  const [createLeaderId, setCreateLeaderId] = useState<number | null>(null);
  const [createLeaderName, setCreateLeaderName] = useState('');
  const [showCreateLeaderDropdown, setShowCreateLeaderDropdown] = useState(false);
  const [selectedDiscipuladoId, setSelectedDiscipuladoId] = useState<number | null>(null);
  const [leaderQuery, setLeaderQuery] = useState('');
  const [showUsersDropdown, setShowUsersDropdown] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserFirstName, setNewUserFirstName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingLeaderUserId, setEditingLeaderUserId] = useState<number | null>(null);
  const [editingLeaderName, setEditingLeaderName] = useState('');
  const [editingLeaderQuery, setEditingLeaderQuery] = useState('');
  const [editingShowUsersDropdown, setEditingShowUsersDropdown] = useState(false);
  const { user } = useAuth();

  const leaderDropdownRef = useRef<any>(null);
  const editingLeaderDropdownRef = useRef<any>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    const updateDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    updateDarkMode();
    window.addEventListener('storage', updateDarkMode);
    const observer = new MutationObserver(updateDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => {
      window.removeEventListener('storage', updateDarkMode);
      observer.disconnect();
    };
  }, []);

  const muiTheme = createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
    },
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (showUsersDropdown) {
        if (leaderDropdownRef.current && !leaderDropdownRef.current.contains(target)) {
          setShowUsersDropdown(false);
        }
      }
      if (editingShowUsersDropdown) {
        if (editingLeaderDropdownRef.current && !editingLeaderDropdownRef.current.contains(target)) {
          setEditingShowUsersDropdown(false);
        }
      }
      if (showFilterLeaderDropdown) {
        if (filterLeaderDropdownRef.current && !filterLeaderDropdownRef.current.contains(target)) {
          setShowFilterLeaderDropdown(false);
        }
      }
      if (showCreateLeaderDropdown) {
        if (leaderDropdownRef.current && !leaderDropdownRef.current.contains(target)) {
          setShowCreateLeaderDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUsersDropdown, editingShowUsersDropdown, showFilterLeaderDropdown, showCreateLeaderDropdown]);

  const load = async () => {
    try {
      const g = await celulasService.getCelulas();
      const permission = user?.permission;

      if (permission && !permission.admin) {
        const allowed = permission.celulaIds || [];
        setGroups(g.filter((c) => allowed.includes(c.id)));
      } else {
        setGroups(g);
      }
      // load member counts per célula
        try {
          const counts: Record<number, number> = {};
          const inactiveMap: Record<number, boolean> = {};
          await Promise.all((g || []).map(async (c: any) => {
            try {
              const m = await membersService.getMembers(c.id);
              counts[c.id] = (m || []).length;
              inactiveMap[c.id] = (m || []).some((mm: any) => mm.status === 'INACTIVE');
            } catch (err) {
              counts[c.id] = 0;
              inactiveMap[c.id] = false;
            }
          }));
          setCellMembersCount(counts);
          setCellHasInactive(inactiveMap);
      } catch (err) {
        console.error('failed loading member counts', err);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const run = async () => { await load(); };
    run();
  }, []);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const u = await userService.list();
        setUsers(u || []);
      } catch (err) {
        console.error('failed load users', err);
      }
    };
    loadUsers();
    // load discipulados for select
    const loadD = async () => {
      try {
        const d = await discipuladosService.getDiscipulados();
        setDiscipulados(d || []);
      } catch (err) {
        console.error('failed load discipulados', err);
      }
    };
    loadD();
    // load redes for select
    const loadR = async () => {
      try {
        const r = await redesService.getRedes();
        setRedes(r || []);
      } catch (err) {
        console.error('failed load redes', err);
      }
    };
    loadR();
  }, []);

  // Re-load when user/permission changes
  useEffect(() => {
    load();
  }, [user?.permission]);

  const create = async () => {
    try {
      await celulasService.createCelula({ name: createName, leaderUserId: createLeaderId || undefined, discipuladoId: createDiscipuladoId || undefined });
      setCreateName(''); setCreateRedeId(null); setCreateDiscipuladoId(null); setCreateLeaderId(null); setCreateLeaderName(''); setCreateLeaderQuery('');
      setShowCreateModal(false);
      toast.success('Célula criada');
      load();
    } catch (e) { console.error(e); toast.error('Falha ao criar célula'); }
  };

  const startEdit = (g: Celula) => {
    setEditingId(g.id);
    setEditingName(g.name);
    setEditingLeaderUserId(g.leader?.id ?? null);
    setEditingLeaderName(g.leader ? `${g.leader.firstName} ${g.leader.lastName}` : '');
    setEditingLeaderQuery('');
  };
  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await celulasService.updateCelula(editingId, { name: editingName, leaderUserId: editingLeaderUserId || undefined });
      setEditingId(null); setEditingName('');
      setEditingLeaderUserId(null); setEditingLeaderName(''); setEditingLeaderQuery(''); setEditingShowUsersDropdown(false);
      toast.success('Atualizado'); load();
    } catch (e) { console.error(e); toast.error('Falha'); }
  };

  const duplicate = async (g: Celula) => {
    try {
      await celulasService.createCelula({ name: `${g.name} (cópia)`, leaderUserId: g.leader?.id });
      toast.success('Célula duplicada'); load();
    } catch (e) { console.error(e); toast.error('Falha'); }
  };

  // Multiply: open modal to pick members for the new celula and call backend
  const [multiplyingCelula, setMultiplyingCelula] = useState<Celula | null>(null);
  const [availableMembers, setAvailableMembers] = useState<any[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [newCelulaNameField, setNewCelulaNameField] = useState('');
  const [newLeaderNameField, setNewLeaderNameField] = useState('');
  const [oldLeaderNameField, setOldLeaderNameField] = useState('');

  const openMultiply = async (g: Celula) => {
    setMultiplyingCelula(g);
    setNewCelulaNameField(`${g.name} - Nova`);
    setOldLeaderNameField((g.leader && g.leader.name) || '');
    setNewLeaderNameField('');
    setSelectedMemberIds([]);
    try {
      const m = await membersService.getMembers(g.id);
      setAvailableMembers(m);
    } catch (err) {
      console.error(err);
      toast.error('Falha ao carregar membros');
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
        newLeaderUserId: undefined,
        oldLeaderUserId: undefined,
      });
      toast.success('Célula multiplicada');
      setMultiplyingCelula(null);
      load();
    } catch (e) { console.error(e); toast.error('Falha ao multiplicar'); }
  };

  // Acompanhamento agora é uma página separada em /celulas/[id]/presence

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Gerenciar Células</h2>

      <div className="mb-6">
        <label className="block mb-2">Filtros</label>
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <input placeholder="Nome da célula" value={filterName} onChange={(e) => setFilterName(e.target.value)} className="border p-2 rounded flex-1 bg-white dark:bg-gray-800 dark:text-white h-10" />

          <div className="w-full sm:w-48">
            <ThemeProvider theme={muiTheme}>
              <FormControl fullWidth>
                <InputLabel
                  id="filter-rede-label"
                  size='small'
                >Rede</InputLabel>
                <Select
                  labelId="filter-rede-label" value={filterRedeId ?? ''} label="Rede" onChange={(e: any) => { setFilterRedeId(e.target.value ? Number(e.target.value) : null); setFilterDiscipuladoId(null); }} size="small" className="bg-white dark:bg-gray-800">
                  <MenuItem value="">Todas redes</MenuItem>
                  {redes.map(r => (<MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>))}
                </Select>
              </FormControl>
            </ThemeProvider>
          </div>

          <div className="w-full sm:w-48">
            <ThemeProvider theme={muiTheme}>
              <FormControl fullWidth>
                <InputLabel id="filter-discipulado-label" size='small'>Discipulado</InputLabel>
                <Select labelId="filter-discipulado-label" value={filterDiscipuladoId ?? ''} label="Discipulado" onChange={(e: any) => setFilterDiscipuladoId(e.target.value ? Number(e.target.value) : null)} size="small" className="bg-white dark:bg-gray-800">
                  <MenuItem value="">Todos</MenuItem>
                  {discipulados.filter(d => !filterRedeId || d.redeId === filterRedeId).map(d => (<MenuItem key={d.id} value={d.id}>{d.discipulador.firstName} {d.discipulador.lastName}</MenuItem>))}
                </Select>
              </FormControl>
            </ThemeProvider>
          </div>

          <div ref={filterLeaderDropdownRef} className="relative w-full sm:w-64">
            <input placeholder="Líder" value={filterLeaderQuery || (filterLeaderId ? (users.find(u => u.id === filterLeaderId)?.firstName + ' ' + users.find(u => u.id === filterLeaderId)?.lastName) : '')} onChange={(e) => { setFilterLeaderQuery(e.target.value); setShowFilterLeaderDropdown(true); setFilterLeaderId(null); }} onFocus={() => setShowFilterLeaderDropdown(true)} className="border p-2 rounded w-full bg-white dark:bg-gray-800 dark:text-white h-10" />
            {showFilterLeaderDropdown && (
              <div className="absolute left-0 right-0 bg-white dark:bg-gray-800 border mt-1 rounded max-h-44 overflow-auto z-50">
                {users.filter(u => {
                  const q = (filterLeaderQuery || '').toLowerCase();
                  if (!q) return true;
                  return (`${u.firstName} ${u.lastName}`.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
                }).map(u => (
                  <div key={u.id} className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center justify-between" onMouseDown={() => { setFilterLeaderId(u.id); setFilterLeaderQuery(''); setShowFilterLeaderDropdown(false); }}>
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
        </div>
      </div>

      <CreateUserModal open={showCreateUserModal} onClose={() => setShowCreateUserModal(false)} onCreated={(created) => {
        setUsers((prev) => [created, ...prev]);
        // if creating from the create modal, prefer that selection
        if (showCreateModal) {
          setCreateLeaderId(created.id);
          setCreateLeaderName(`${created.firstName} ${created.lastName}`);
        } else {
          // legacy: main inline create flow
          setLeaderUserId(created.id);
          setLeaderName(`${created.firstName} ${created.lastName}`);
        }
        // if creating while editing a celula, select there as well
        if (editingId) {
          setEditingLeaderUserId(created.id);
          setEditingLeaderName(`${created.firstName} ${created.lastName}`);
          setEditingLeaderQuery('');
          setEditingShowUsersDropdown(false);
        }
        setShowCreateUserModal(false);
      }} />

      <div>
        <h3 className="font-medium mb-2">Células existentes</h3>
        <ul className="space-y-3">
          {groups
            .filter(g => !filterName || (g.name || '').toLowerCase().includes(filterName.toLowerCase()))
            .filter(g => {
              if (!filterRedeId) return true;
              const d = discipulados.find(x => x.id === g.discipuladoId);
              return d ? d.redeId === filterRedeId : false;
            })
            .filter(g => !filterDiscipuladoId || g.discipuladoId === filterDiscipuladoId)
            .filter(g => !filterLeaderId || g.leader?.id === filterLeaderId)
            .map((g) => (
              <li key={g.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between border p-3 rounded bg-white dark:bg-gray-900">
                <div className="mb-3 sm:mb-0">
                  <div className="font-medium text-gray-900 dark:text-white">{g.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">id: {g.id}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/celulas/${g.id}/members`} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800" title="Membros" aria-label={`Membros ${g.name}`}>
                    <FiUsers className="h-4 w-4 text-blue-600" aria-hidden />
                  </Link>
                  {(!user?.permission || user.permission.admin) && (
                    <>
                      <button onClick={() => startEdit(g)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800" title="Editar" aria-label={`Editar ${g.name}`}>
                        <FiEdit2 className="h-4 w-4 text-yellow-500" aria-hidden />
                      </button>
                      <button onClick={() => openMultiply(g)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800" title="Multiplicar" aria-label={`Multiplicar ${g.name}`}>
                        <FiCopy className="h-4 w-4 text-indigo-600" aria-hidden />
                      </button>
                      {/* delete célula - only if no members associated */}
                      {(() => {
                        const memberCount = cellMembersCount[g.id] ?? 0;
                        const disabled = memberCount > 0;
                        return (
                          <button
                            onClick={() => {
                              const memberCountLocal = cellMembersCount[g.id] ?? 0;
                              const hasInactive = cellHasInactive[g.id] ?? false;
                              const disabledLocal = memberCountLocal > 0 || hasInactive;
                              if (disabledLocal) {
                                if (hasInactive) return toast.error('Não é possível apagar célula: possui membros inativos');
                                return toast.error('Não é possível apagar célula com membros associados');
                              }
                              setConfirmingCelula(g);
                            }}
                            title={(cellHasInactive[g.id] ?? false) ? 'Não é possível apagar: possui membros inativos' : (disabled ? 'Não é possível apagar: possui membros associados' : 'Excluir célula')}
                            disabled={(cellMembersCount[g.id] ?? 0) > 0 || (cellHasInactive[g.id] ?? false)}
                            className={`p-1 rounded ${((cellMembersCount[g.id] ?? 0) > 0 || (cellHasInactive[g.id] ?? false)) ? 'text-gray-400 opacity-60 cursor-not-allowed' : 'text-red-600 hover:bg-red-100 dark:hover:bg-red-900'}`}
                            aria-label={`Excluir ${g.name}`}
                          >
                            <FiTrash2 className="h-4 w-4" aria-hidden />
                          </button>
                        );
                      })()}
                    </>
                  )}
                  <Link href={`/celulas/${g.id}/presence?from=celulas`} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800" title="Acompanhamento" aria-label={`Acompanhamento ${g.name}`}>
                    <LuHistory className="h-4 w-4 text-teal-600" aria-hidden />
                  </Link>
                </div>
              </li>
            ))}
        </ul>
      </div>

      {/* Floating create button */}
      <button aria-label="Criar célula" onClick={() => setShowCreateModal(true)} className="fixed right-6 bottom-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg z-50">
        <FiPlus className="h-7 w-7" aria-hidden />
      </button>

      {/* Create modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-55">
          <div className="bg-white dark:bg-gray-900 p-6 rounded w-11/12 sm:w-96">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Criar Célula</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-500">Fechar</button>
            </div>
            <div className="space-y-3">
              <input placeholder="Nome da célula" value={createName} onChange={(e) => setCreateName(e.target.value)} className="border p-2 rounded w-full bg-white dark:bg-gray-800 dark:text-white h-10" />

              <ThemeProvider theme={muiTheme}>
                <FormControl className="w-full">
                  <InputLabel id="create-rede-label" size='small'>Rede</InputLabel>
                  <Select
                    labelId="create-rede-label"
                    value={createRedeId ?? ''}
                    onChange={(e: any) => { setCreateRedeId(e.target.value ? Number(e.target.value) : null); setCreateDiscipuladoId(null); }}
                    label="Rede"
                    size="small"
                    className="bg-white dark:bg-gray-800 w-full">
                    <MenuItem value="">Selecione rede</MenuItem>
                    {redes.map((r: any) => (<MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>))}
                  </Select>
                </FormControl>
              </ThemeProvider>

              <div>
                <ThemeProvider theme={muiTheme}>
                  <FormControl className="w-full">
                    <InputLabel id="create-discipulado-label" size='small'>Discipulado</InputLabel>
                    <Select
                      labelId="create-discipulado-label"
                      value={createDiscipuladoId ?? ''}
                      onChange={(e: any) => setCreateDiscipuladoId(e.target.value ? Number(e.target.value) : null)}
                      label="Discipulado"
                      size="small"
                      className="bg-white dark:bg-gray-800 w-full">
                      <MenuItem value="">Selecione discipulado</MenuItem>
                      {discipulados.filter(d => !createRedeId || d.redeId === createRedeId).map((d: any) => (<MenuItem key={d.id} value={d.id}>{d.discipulador.firstName} {d.discipulador.lastName}</MenuItem>))}
                    </Select>
                  </FormControl>
                </ThemeProvider>
              </div>

              <div ref={leaderDropdownRef} className="relative w-full">
                <input
                  placeholder="Líder"
                  value={createLeaderQuery || createLeaderName}
                  onChange={(e) => { setCreateLeaderQuery(e.target.value); setCreateLeaderName(''); setCreateLeaderId(null); setShowCreateLeaderDropdown(true); }}
                  onFocus={() => setShowCreateLeaderDropdown(true)}
                  className="border p-2 rounded w-full bg-white dark:bg-gray-800 dark:text-white h-10"
                />
                {showCreateLeaderDropdown && (
                  <div className="absolute left-0 right-0 bg-white dark:bg-gray-800 border mt-1 rounded max-h-44 overflow-auto z-50">
                    {users.filter(u => {
                      const q = (createLeaderQuery || '').toLowerCase();
                      if (!q) return true;
                      return (`${u.firstName} ${u.lastName}`.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
                    }).map(u => (
                      <div key={u.id} className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center justify-between" onMouseDown={() => { setCreateLeaderId(u.id); setCreateLeaderName(`${u.firstName} ${u.lastName}`); setCreateLeaderQuery(''); setShowCreateLeaderDropdown(false); }}>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{u.firstName} {u.lastName}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{u.email}</div>
                        </div>
                        <div className="text-xs text-green-600">Selecionar</div>
                      </div>
                    ))}
                    <div className="px-3 py-2 border-t text-center sticky bottom-0 bg-white dark:bg-gray-800">
                      <button onMouseDown={(e) => { e.preventDefault(); setShowCreateLeaderDropdown(false); setShowCreateUserModal(true); }} className="text-sm text-blue-600">Criar novo usuário</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={() => setShowCreateModal(false)} className="px-3 py-2 border rounded">Cancelar</button>
                <button onClick={create} className="px-3 py-2 bg-green-600 text-white rounded">Criar célula</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingId && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 p-6 rounded w-11/12 sm:w-96">
            <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">Editar célula</h4>
            <input value={editingName} onChange={(e) => setEditingName(e.target.value)} className="border p-2 rounded w-full mb-4 bg-white dark:bg-gray-700 dark:text-white" />

            <div className="mb-4">
              <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Líder</label>
              <div ref={editingLeaderDropdownRef} className="relative w-full">
                <input placeholder="Líder" value={editingLeaderQuery || editingLeaderName} onChange={(e) => { setEditingLeaderQuery(e.target.value); setEditingShowUsersDropdown(true); setEditingLeaderName(''); setEditingLeaderUserId(null); }} onFocus={() => setEditingShowUsersDropdown(true)} className="border p-2 rounded w-full bg-white dark:bg-gray-800 dark:text-white" />
                {editingShowUsersDropdown && (
                  <div className="absolute left-0 right-0 bg-white dark:bg-gray-800 border mt-1 rounded max-h-44 overflow-auto z-50">
                    {users.filter(u => {
                      const q = (editingLeaderQuery || '').toLowerCase();
                      if (!q) return true;
                      return (`${u.firstName} ${u.lastName}`.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
                    }).map(u => (
                      <div key={u.id} className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center justify-between" onMouseDown={() => { setEditingLeaderUserId(u.id); setEditingLeaderName(`${u.firstName} ${u.lastName}`); setEditingLeaderQuery(''); setEditingShowUsersDropdown(false); }}>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{u.firstName} {u.lastName}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{u.email}</div>
                        </div>
                        <div className="text-xs text-green-600">Selecionar</div>
                      </div>
                    ))}
                    <div className="px-3 py-2 border-t text-center sticky bottom-0 bg-white dark:bg-gray-800">
                      <button onMouseDown={(e) => { e.preventDefault(); setEditingShowUsersDropdown(false); setShowCreateUserModal(true); }} className="text-sm text-blue-600">Criar novo usuário</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setEditingId(null)} className="px-3 py-1">Cancelar</button>
              <button onClick={saveEdit} className="px-3 py-1 bg-blue-600 text-white rounded">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {multiplyingCelula && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-start sm:items-center justify-center pt-20 sm:pt-0">
          <div className="bg-white dark:bg-gray-900 p-4 rounded w-11/12 sm:w-[720px] max-h-[80vh] overflow-auto">
            <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">Multiplicar: {multiplyingCelula.name}</h4>

            <div className="mb-3">
              <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Nome da nova célula</label>
              <input value={newCelulaNameField} onChange={(e) => setNewCelulaNameField(e.target.value)} className="w-full border p-2 rounded bg-white dark:bg-gray-800 dark:text-white" />
            </div>

            <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Líder da célula nova</label>
                <input value={newLeaderNameField} onChange={(e) => setNewLeaderNameField(e.target.value)} className="w-full border p-2 rounded bg-white dark:bg-gray-800 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Líder da célula atual</label>
                <input value={oldLeaderNameField} onChange={(e) => setOldLeaderNameField(e.target.value)} className="w-full border p-2 rounded bg-white dark:bg-gray-800 dark:text-white" />
              </div>
            </div>

            <div className="mb-3">
              <div className="font-medium text-gray-900 dark:text-white mb-2">Selecionar membros para a nova célula</div>
              <div className="space-y-2 max-h-56 overflow-auto p-2 border rounded bg-white dark:bg-gray-800">
                {availableMembers.length === 0 && <div className="text-sm text-gray-500 dark:text-gray-400">Nenhum membro disponível</div>}
                {availableMembers.map((m: any) => (
                  <label key={m.id} className="flex items-center gap-2">
                    <input type="checkbox" checked={selectedMemberIds.includes(m.id)} onChange={() => toggleMemberSelection(m.id)} />
                    <span className="text-sm text-gray-900 dark:text-white">{m.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setMultiplyingCelula(null)} className="px-3 py-1">Cancelar</button>
              <button onClick={submitMultiply} className="px-3 py-1 bg-indigo-600 text-white rounded">Multiplicar</button>
            </div>
          </div>
        </div>
      )}

      {confirmingCelula && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-55">
          <div className="bg-white dark:bg-gray-900 p-6 rounded w-11/12 sm:w-96">
            <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">Confirmar exclusão</h4>
            <div className="mb-4 text-sm text-gray-700 dark:text-gray-300">Tem certeza que deseja excluir a célula <strong>{confirmingCelula.name}</strong>? Esta ação é irreversível.</div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmingCelula(null)} className="px-3 py-1">Cancelar</button>
              <button
                onClick={async () => {
                  try {
                    await celulasService.deleteCelula(confirmingCelula.id);
                    toast.success('Célula excluída');
                    setConfirmingCelula(null);
                    await load();
                  } catch (e) {
                    console.error(e);
                    toast.error('Falha ao excluir célula');
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

      {/* Acompanhamento agora é uma página separada */}
    </div>
  );
}
