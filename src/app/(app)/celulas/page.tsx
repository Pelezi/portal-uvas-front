"use client";

import React, { useEffect, useState, useRef } from 'react';
import { celulasService } from '@/services/celulasService';
import { membersService } from '@/services/membersService';
import { discipuladosService } from '@/services/discipuladosService';
import { redesService } from '@/services/redesService';
import { Celula, Member, Discipulado, Rede } from '@/types';
import { memberService } from '@/services/memberService';
import { useAuth } from '@/contexts/AuthContext';
import { createTheme, FormControl, InputLabel, MenuItem, Select, ThemeProvider } from '@mui/material';
import toast from 'react-hot-toast';
import { ErrorMessages } from '@/lib/errorHandler';
import { FiPlus, FiUsers, FiEdit2, FiCopy, FiTrash2 } from 'react-icons/fi';
import { LuHistory } from 'react-icons/lu';
import Link from 'next/link';
import CelulaModal from '@/components/CelulaModal';

export default function CelulasPage() {
  const [groups, setGroups] = useState<Celula[]>([]);
  const [cellMembersCount, setCellMembersCount] = useState<Record<number, number>>({});
  const [cellHasInactive, setCellHasInactive] = useState<Record<number, boolean>>({});
  const [confirmingCelula, setConfirmingCelula] = useState<Celula | null>(null);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [showCelulaModal, setShowCelulaModal] = useState(false);
  const [editingCelula, setEditingCelula] = useState<Celula | null>(null);

  // listing filters
  const [filterName, setFilterName] = useState('');
  const [filterRedeId, setFilterRedeId] = useState<number | null>(null);
  const [filterDiscipuladoId, setFilterDiscipuladoId] = useState<number | null>(null);
  const [filterLeaderQuery, setFilterLeaderQuery] = useState('');
  const [filterLeaderId, setFilterLeaderId] = useState<number | null>(null);
  const [showFilterLeaderDropdown, setShowFilterLeaderDropdown] = useState(false);
  const filterLeaderDropdownRef = useRef<HTMLDivElement>(null);

  const [members, setMembers] = useState<Member[]>([]);
  const [discipulados, setDiscipulados] = useState<Discipulado[]>([]);
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

  const { user } = useAuth();
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
      if (showFilterLeaderDropdown) {
        if (filterLeaderDropdownRef.current && !filterLeaderDropdownRef.current.contains(target)) {
          setShowFilterLeaderDropdown(false);
        }
      }
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
  }, [showFilterLeaderDropdown, showNewLeaderDropdown, showOldLeaderDropdown]);

  const load = async () => {
    setLoading(true);
    try {
      const g = await celulasService.getCelulas();
      const permission = user?.permission;

      if (permission && !permission.isAdmin) {
        const allowed = permission.celulaIds || [];
        setGroups(g.filter((c) => allowed.includes(c.id)));
      } else {
        setGroups(g);
      }
      // load member counts per célula
      try {
        const counts: Record<number, number> = {};
        const inactiveMap: Record<number, boolean> = {};
        await Promise.all((g || []).map(async (c) => {
          try {
            const m = await membersService.getMembers(c.id);
            counts[c.id] = (m || []).length;
            inactiveMap[c.id] = (m || []).some((mm) => mm.isActive === false);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const run = async () => { await load(); };
    run();
  }, []);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        // Carregar apenas usuários que podem ser líderes (PRESIDENT_PASTOR, PASTOR, DISCIPULADOR, LEADER ou LEADER_IN_TRAINING)
        const u = await memberService.list({ ministryType: 'PRESIDENT_PASTOR,PASTOR,DISCIPULADOR,LEADER,LEADER_IN_TRAINING' });
        setMembers(u || []);
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

  const handleSaveCelula = async (data: { name: string; leaderMemberId?: number; discipuladoId?: number }) => {
    try {
      if (editingCelula) {
        // Edit mode
        await celulasService.updateCelula(editingCelula.id, data);
        toast.success('Célula atualizada com sucesso!');
      } else {
        // Create mode
        await celulasService.createCelula(data);
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
      const m = await membersService.getMembers(g.id);
      setAvailableMembers(m);
      
      // Se houver apenas um líder em treinamento, pré-seleciona ele como novo líder
      const leadersInTraining = m.filter(
        member => member.ministryPosition?.type === 'LEADER_IN_TRAINING'
      );
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

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Gerenciar Células</h2>

      <div className="mb-6">
        <label className="block mb-2">Filtros</label>
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <input placeholder="Nome da célula" value={filterName} onChange={(e) => setFilterName(e.target.value)} className="border p-2 rounded flex-1 bg-white dark:bg-gray-800 dark:text-white h-10" />

          <ThemeProvider theme={muiTheme}>
            <div className="w-full sm:w-48">
              <FormControl fullWidth>
                <InputLabel
                  id="filter-rede-label"
                  size='small'
                >Rede</InputLabel>
                <Select
                  labelId="filter-rede-label" value={filterRedeId ?? ''} label="Rede" onChange={(e) => { setFilterRedeId(e.target.value ? Number(e.target.value) : null); setFilterDiscipuladoId(null); }} size="small" className="bg-white dark:bg-gray-800">
                  <MenuItem value="">Todas redes</MenuItem>
                  {redes.map(r => (<MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>))}
                </Select>
              </FormControl>
            </div>

            <div className="w-full sm:w-48">
              <FormControl fullWidth>
                <InputLabel id="filter-discipulado-label" size='small'>Discipulado</InputLabel>
                <Select labelId="filter-discipulado-label" value={filterDiscipuladoId ?? ''} label="Discipulado" onChange={(e) => setFilterDiscipuladoId(e.target.value ? Number(e.target.value) : null)} size="small" className="bg-white dark:bg-gray-800">
                  <MenuItem value="">Todos</MenuItem>
                  {discipulados.filter(discipulado => !filterRedeId || discipulado.redeId === filterRedeId).map(discipulado => (<MenuItem key={discipulado.id} value={discipulado.id}>{discipulado.discipulador?.name}</MenuItem>))}
                </Select>
              </FormControl>
            </div>
          </ThemeProvider>

          <div ref={filterLeaderDropdownRef} className="relative w-full sm:w-64">
            <input placeholder="Líder" value={filterLeaderQuery || (filterLeaderId ? members.find(member => member.id === filterLeaderId)?.name : '')} onChange={(e) => { setFilterLeaderQuery(e.target.value); setShowFilterLeaderDropdown(true); setFilterLeaderId(null); }} onFocus={() => setShowFilterLeaderDropdown(true)} className="border p-2 rounded w-full bg-white dark:bg-gray-800 dark:text-white h-10" />
            {showFilterLeaderDropdown && (
              <div className="absolute left-0 right-0 bg-white dark:bg-gray-800 border mt-1 rounded max-h-44 overflow-auto z-50">
                {members.filter(member => {
                  const q = (filterLeaderQuery || '').toLowerCase();
                  if (!q) return true;
                  return (member.name.toLowerCase().includes(q) || (member.email || '').toLowerCase().includes(q));
                }).map(member => (
                  <div key={member.id} className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center justify-between" onMouseDown={() => { setFilterLeaderId(member.id); setFilterLeaderQuery(''); setShowFilterLeaderDropdown(false); }}>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{member.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{member.email}</div>
                    </div>
                    <div className="text-xs text-green-600">Selecionar</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-medium mb-2">Células existentes</h3>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
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
              <li key={g.id} className={`flex flex-col sm:flex-row sm:items-center sm:justify-between border p-3 rounded ${!g.leaderMemberId ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700' : 'bg-white dark:bg-gray-900'}`}>
                <div className="mb-3 sm:mb-0">
                  <div className="font-medium text-gray-900 dark:text-white">{g.name} {!g.leaderMemberId && <span className="text-xs text-red-600 dark:text-red-400 ml-2">(sem líder)</span>}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">id: {g.id}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/celulas/${g.id}/members`} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800" title="Membros" aria-label={`Membros ${g.name}`}>
                    <FiUsers className="h-6 w-6 text-blue-600" aria-hidden />
                  </Link>
                  {(!user?.permission || user.permission.isAdmin) && (
                    <>
                      <button onClick={() => handleOpenEditModal(g)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800" title="Editar" aria-label={`Editar ${g.name}`}>
                        <FiEdit2 className="h-6 w-6 text-yellow-500" aria-hidden />
                      </button>
                      <button onClick={() => openMultiply(g)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800" title="Multiplicar" aria-label={`Multiplicar ${g.name}`}>
                        <FiCopy className="h-6 w-6 text-indigo-600" aria-hidden />
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
                            <FiTrash2 className="h-6 w-6" aria-hidden />
                          </button>
                        );
                      })()}
                    </>
                  )}
                  <Link href={`/celulas/${g.id}/presence?from=celulas`} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800" title="Acompanhamento" aria-label={`Acompanhamento ${g.name}`}>
                    <LuHistory className="h-6 w-6 text-teal-600" aria-hidden />
                  </Link>
                </div>
              </li>
            ))}
        </ul>
        )}
      </div>

      {/* Floating create button */}
      <button aria-label="Criar célula" onClick={handleOpenCreateModal} className="fixed right-6 bottom-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg z-50">
        <FiPlus className="h-7 w-7" aria-hidden />
      </button>

      {/* CelulaModal */}
      <CelulaModal
        celula={editingCelula}
        isOpen={showCelulaModal}
        onClose={handleCloseCelulaModal}
        onSave={handleSaveCelula}
        members={members}
        discipulados={discipulados}
        redes={redes}
      />

      {multiplyingCelula && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-start sm:items-center justify-center pt-20 sm:pt-0 z-50">
          <div className="bg-white dark:bg-gray-900 p-4 rounded w-11/12 sm:w-[720px] max-h-[80vh] overflow-auto">
            <h4 className="font-semibold mb-4 text-gray-900 dark:text-white">Multiplicar: {multiplyingCelula.name}</h4>

            <div className="mb-4">
              <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Nome da nova célula</label>
              <input value={newCelulaNameField} onChange={(e) => setNewCelulaNameField(e.target.value)} className="w-full border p-2 rounded bg-white dark:bg-gray-800 dark:text-white h-10" />
            </div>

            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Líder da nova célula</label>
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
                    className="border p-2 rounded w-full bg-white dark:bg-gray-800 dark:text-white h-10"
                  />
                  {showNewLeaderDropdown && (
                    <div className="absolute left-0 right-0 bg-white dark:bg-gray-800 border mt-1 rounded max-h-44 overflow-auto z-50">
                      {members.filter(member => {
                        const q = (newLeaderQuery || '').toLowerCase();
                        if (!q) return true;
                        return (member.name.toLowerCase().includes(q) || (member.email || '').toLowerCase().includes(q));
                      }).map(member => (
                        <div
                          key={member.id}
                          className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center justify-between"
                          onMouseDown={() => {
                            setNewLeaderId(member.id);
                            setNewLeaderName(member.name);
                            setNewLeaderQuery('');
                            setShowNewLeaderDropdown(false);
                          }}
                        >
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{member.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{member.email}</div>
                          </div>
                          <div className="text-xs text-green-600">Selecionar</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Líder da célula atual</label>
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
                    className="border p-2 rounded w-full bg-white dark:bg-gray-800 dark:text-white h-10"
                  />
                  {showOldLeaderDropdown && (
                    <div className="absolute left-0 right-0 bg-white dark:bg-gray-800 border mt-1 rounded max-h-44 overflow-auto z-50">
                      {members.filter(member => {
                        const q = (oldLeaderQuery || '').toLowerCase();
                        if (!q) return true;
                        return (member.name.toLowerCase().includes(q) || (member.email || '').toLowerCase().includes(q));
                      }).map(member => (
                        <div
                          key={member.id}
                          className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center justify-between"
                          onMouseDown={() => {
                            setOldLeaderId(member.id);
                            setOldLeaderName(member.name);
                            setOldLeaderQuery('');
                            setShowOldLeaderDropdown(false);
                          }}
                        >
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{member.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{member.email}</div>
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
              <div className="font-medium text-gray-900 dark:text-white mb-2">Membros para a nova célula</div>
              <div className="space-y-2 max-h-64 overflow-auto">
                {availableMembers.length === 0 && <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Nenhum membro disponível</div>}
                {availableMembers.map((m) => {
                  const selected = selectedMemberIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleMemberSelection(m.id)}
                      className={`w-full text-left flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        selected 
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <span className="truncate font-medium text-gray-900 dark:text-white">{m.name}</span>
                      {selected && (
                        <span className="text-xs text-green-600 dark:text-green-400 font-semibold">✓ Selecionado</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t dark:border-gray-700">
              <button onClick={() => setMultiplyingCelula(null)} className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">Cancelar</button>
              <button onClick={submitMultiply} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded">Multiplicar</button>
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
    </div>
  );
}
