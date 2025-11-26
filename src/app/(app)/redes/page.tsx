"use client";

import React, { useEffect, useState, useRef } from 'react';
import Collapse from '@/components/Collapse';
import CollapsibleItem from '@/components/CollapsibleItem';
import { redesService } from '@/services/redesService';
import { userService } from '@/services/userService';
import { discipuladosService } from '@/services/discipuladosService';
import { celulasService } from '@/services/celulasService';
import toast from 'react-hot-toast';
import { FiTrash2, FiPlus } from 'react-icons/fi';
import CreateUserModal from '@/components/CreateUserModal';
import ModalConfirm from '@/components/ModalConfirm';

export default function RedesPage() {
  const [redes, setRedes] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // filters
  const [filterName, setFilterName] = useState('');
  const [filterPastorQuery, setFilterPastorQuery] = useState('');
  const [filterPastorId, setFilterPastorId] = useState<number | null>(null);
  const pastorDropdownRef = useRef<any>(null);
  const [showPastorsDropdown, setShowPastorsDropdown] = useState(false);
  const pastorsDropdownTimeoutRef = useRef<number | null>(null);

  // expansion & cache maps
  const [expandedRedes, setExpandedRedes] = useState<Record<number, boolean>>({});
  const [redeDiscipuladosMap, setRedeDiscipuladosMap] = useState<Record<number, any[]>>({});
  const [redeDiscipuladosCount, setRedeDiscipuladosCount] = useState<Record<number, number>>({});
  const [expandedDiscipulados, setExpandedDiscipulados] = useState<Record<number, boolean>>({});
  const [discipuladoCelulasMap, setDiscipuladoCelulasMap] = useState<Record<number, any[]>>({});

  // create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createPastorUserId, setCreatePastorUserId] = useState<number | null>(null);
  const [createPastorQuery, setCreatePastorQuery] = useState('');
  const [createPastorName, setCreatePastorName] = useState('');
  const [showCreatePastorsDropdown, setShowCreatePastorsDropdown] = useState(false);
  const createPastorDropdownRef = useRef<any>(null);

  // inline create-user inside modal
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserFirstName, setNewUserFirstName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');

  // confirm modal for deletions
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<any | null>(null);

  // edit modal state
  const [editRedeModalOpen, setEditRedeModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPastorQuery, setEditPastorQuery] = useState('');
  const [editPastorId, setEditPastorId] = useState<number | null>(null);
  const [editPastorName, setEditPastorName] = useState('');
  const editPastorDropdownRef = useRef<any>(null);
  const [showEditPastorsDropdown, setShowEditPastorsDropdown] = useState(false);
  const editPastorsTimeoutRef = useRef<number | null>(null);
  const [editingRedeId, setEditingRedeId] = useState<number | null>(null);

  const load = async () => {
    try {
      const r = await redesService.getRedes();
      setRedes(r || []);
      try {
        const allD = await discipuladosService.getDiscipulados();
        const counts: Record<number, number> = {};
        (allD || []).forEach((d:any) => { counts[d.redeId] = (counts[d.redeId] || 0) + 1; });
        setRedeDiscipuladosCount(counts);
      } catch (err) {
        console.error('Failed to load discipulados for counts', err);
        setRedeDiscipuladosCount({});
      }
    } catch (err) { console.error(err); toast.error('Falha ao carregar redes'); }
  };

  useEffect(() => {
    load();
    (async () => {
      try { const u = await userService.list(); setUsers(u || []); } catch (err) { console.error(err); }
    })();
    return () => {
      if (pastorsDropdownTimeoutRef.current) window.clearTimeout(pastorsDropdownTimeoutRef.current);
    };
  }, []);

  const onToggleRede = async (r: any) => {
    try {
      const currently = !!expandedRedes[r.id];
      if (!currently && !redeDiscipuladosMap[r.id]) {
        const all = await discipuladosService.getDiscipulados();
        const redeDiscipulados = (all || []).filter(d => d.redeId === r.id);
        setRedeDiscipuladosMap(prev => ({ ...prev, [r.id]: redeDiscipulados }));
      }
      setExpandedRedes(prev => ({ ...prev, [r.id]: !currently }));
    } catch (err) { console.error(err); toast.error('Falha ao carregar discipulados'); }
  };

  const onToggleDiscipulado = async (d: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const currently = !!expandedDiscipulados[d.id];
      if (!currently && !discipuladoCelulasMap[d.id]) {
        const all = await celulasService.getCelulas();
        const discipuladoCelulas = (all || []).filter((c:any) => c.discipuladoId === d.id);
        setDiscipuladoCelulasMap(prev => ({ ...prev, [d.id]: discipuladoCelulas }));
      }
      setExpandedDiscipulados(prev => ({ ...prev, [d.id]: !currently }));
    } catch (err) { console.error(err); toast.error('Falha ao carregar células'); }
  };

  const createRede = async () => {
    if (!createPastorUserId) return toast.error('Selecione um pastor');
    try {
      await redesService.createRede({ name: createName, pastorUserId: createPastorUserId });
      setCreateName(''); setCreatePastorUserId(null); setShowCreateModal(false);
      await load();
      toast.success('Rede criada');
    } catch (err) { console.error(err); toast.error('Falha ao criar rede'); }
  };

  const openEditRede = (r: any) => {
    setEditingRedeId(r.id);
    setEditName(r.name || '');
    setEditPastorId(r.pastorUserId ?? null);
    setEditPastorName(r.pastor ? `${r.pastor.firstName} ${r.pastor.lastName}` : '');
    setEditPastorQuery('');
    setShowEditPastorsDropdown(false);
    setEditRedeModalOpen(true);
  };

  const saveEditRede = async () => {
    try {
      if (!editingRedeId) throw new Error('Rede inválida');
      if (!editPastorId) throw new Error('Selecione um pastor');
      await redesService.updateRede(editingRedeId, { name: editName, pastorUserId: editPastorId });
      setEditRedeModalOpen(false);
      toast.success('Rede atualizada');
      await load();
    } catch (err) {
      console.error(err);
      toast.error('Falha ao atualizar rede');
    }
  };

  // request deletion: validate associations and open confirm modal
  const requestDeleteRede = async (r: any) => {
    try {
      const allDiscipulados = await discipuladosService.getDiscipulados();
      const children = (allDiscipulados || []).filter((d:any) => d.redeId === r.id);
      if (children.length > 0) {
        return toast.error('Não é possível apagar rede com discipulados associados');
      }
    } catch (err) {
      console.error(err);
      return toast.error('Falha ao verificar associações');
    }
    setConfirmTarget(r);
    setConfirmOpen(true);
  };

  const deleteRedeConfirmed = async () => {
    if (!confirmTarget) return setConfirmOpen(false);
    try {
      await redesService.deleteRede(confirmTarget.id);
      toast.success('Rede removida');
      setConfirmOpen(false);
      setConfirmTarget(null);
      await load();
    } catch (err) {
      console.error(err);
      toast.error('Falha ao remover rede');
    }
  };

  const deleteDiscipulado = async (d: any) => {
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
    if (!confirm(`Remover discipulado de ${d.discipulador.firstName} ${d.discipulador.lastName}?`)) return;
    try {
      await discipuladosService.deleteDiscipulado(d.id);
      toast.success('Discipulado removido');
      // refresh cached list for this rede
      const all = await discipuladosService.getDiscipulados();
      setRedeDiscipuladosMap(prev => ({ ...prev, [d.redeId]: (all || []).filter(x => x.redeId === d.redeId) }));
    } catch (err) {
      console.error(err);
      toast.error('Falha ao remover discipulado');
    }
  };

  const createUserInline = async () => {
    try {
      const created = await userService.invite({ email: newUserEmail, firstName: newUserFirstName, lastName: newUserLastName });
      setUsers(prev => [created, ...prev]);
      setCreatePastorUserId(created.id);
      setCreatePastorName(`${created.firstName} ${created.lastName}`);
      setShowCreateUserModal(false);
      setNewUserEmail(''); setNewUserFirstName(''); setNewUserLastName('');
      toast.success('Usuário criado e selecionado como pastor');
    } catch (err) { console.error(err); toast.error('Falha ao criar usuário'); }
  };

  // IDs de usuários que são pastores de alguma rede
  const pastorUserIds = new Set<number>((redes || []).map(r => r.pastorUserId).filter(Boolean));

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Redes</h2>

      <div className="mb-6">
        <label className="block mb-2">Filtros</label>
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <input placeholder="Nome da rede" value={filterName} onChange={(e) => setFilterName(e.target.value)} className="border p-2 rounded flex-1 bg-white dark:bg-gray-800 dark:text-white h-10" />

          <div ref={pastorDropdownRef} className="relative w-full sm:w-80">
            <input
              placeholder="Pastor"
              value={filterPastorQuery}
              onChange={(e) => { setFilterPastorQuery(e.target.value); }}
              onFocus={() => {
                if (pastorsDropdownTimeoutRef.current) { window.clearTimeout(pastorsDropdownTimeoutRef.current); pastorsDropdownTimeoutRef.current = null; }
                setShowPastorsDropdown(true);
              }}
              onBlur={() => {
                // delay hiding to allow click selection
                pastorsDropdownTimeoutRef.current = window.setTimeout(() => { setShowPastorsDropdown(false); pastorsDropdownTimeoutRef.current = null; }, 150);
              }}
              className="border p-2 rounded w-full bg-white dark:bg-gray-800 dark:text-white h-10"
            />

            {showPastorsDropdown && (
              <div className="absolute left-0 right-0 bg-white dark:bg-gray-800 border mt-1 rounded max-h-44 overflow-auto z-50">
                {users
                  .filter(u => pastorUserIds.has(u.id))
                  .filter(u => {
                    const q = (filterPastorQuery || '').toLowerCase();
                    if (!q) return true;
                    return (`${u.firstName} ${u.lastName}`.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
                  })
                  .map(u => (
                    <div key={u.id} className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center justify-between" onMouseDown={() => { setFilterPastorId(u.id); setFilterPastorQuery(''); setShowPastorsDropdown(false); }}>
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

      <div>
        <h3 className="font-medium mb-2">Lista de redes</h3>
        <ul className="space-y-2">
          {redes
            .filter(r => !filterName || r.name.toLowerCase().includes(filterName.toLowerCase()))
            .filter(r => !filterPastorId || r.pastorUserId === filterPastorId)
            .map(r => (
              <li key={r.id} className="border p-2 rounded">
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
                            className={`p-1 rounded ${disabled ? 'text-gray-400 opacity-60 cursor-not-allowed' : 'text-red-600 hover:bg-red-100 dark:hover:bg-red-900'}`}
                          >
                            <FiTrash2 className="h-4 w-4" aria-hidden />
                          </button>
                        </span>
                      );
                    })()
                  }
                  title={<>{r.name} <span className="text-sm text-gray-500">({redeDiscipuladosCount[r.id] ?? (redeDiscipuladosMap[r.id]?.length ?? 0)} Discipulados)</span></>}
                  subtitle={<>{/* keep same pastor text */}Pastor: {r.pastor.firstName} {r.pastor.lastName}</>}
                  duration={300}
                >
                  {(redeDiscipuladosMap[r.id] || []).length === 0 && <div className="text-xs text-gray-500">Nenhum discipulado</div>}
                  <ul className="space-y-1">
                    {(redeDiscipuladosMap[r.id] || []).map((d:any) => (
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
                          title={<>{d.discipulador.firstName} {d.discipulador.lastName}</>}
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
                </CollapsibleItem>
              </li>
            ))}
        </ul>
      </div>

      {/* Floating create button */}
      <button aria-label="Criar rede" onClick={() => setShowCreateModal(true)} className="fixed right-6 bottom-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg z-50">
        <FiPlus className="h-7 w-7" aria-hidden />
      </button>

      {/* Create modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 p-6 rounded w-11/12 sm:w-96">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Criar Rede</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-500">Fechar</button>
            </div>
            <div className="space-y-3">
              <input placeholder="Nome da rede" value={createName} onChange={(e) => setCreateName(e.target.value)} className="border p-2 rounded w-full bg-white dark:bg-gray-800 dark:text-white h-10" />
              <div ref={createPastorDropdownRef} className="relative w-full">
                <input placeholder="Pastor" value={createPastorQuery || createPastorName} onChange={(e) => { setCreatePastorQuery(e.target.value); setShowCreatePastorsDropdown(true); setCreatePastorName(''); setCreatePastorUserId(null); }} onFocus={() => setShowCreatePastorsDropdown(true)} className="border p-2 rounded w-full bg-white dark:bg-gray-800 dark:text-white h-10" />
                {showCreatePastorsDropdown && (
                  <div className="absolute left-0 right-0 bg-white dark:bg-gray-800 border mt-1 rounded max-h-44 overflow-auto z-50">
                    {users.filter(u => {
                      const q = (createPastorQuery || '').toLowerCase();
                      if (!q) return true;
                      return (`${u.firstName} ${u.lastName}`.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
                    }).map(u => (
                      <div key={u.id} className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center justify-between" onMouseDown={() => { setCreatePastorUserId(u.id); setCreatePastorName(`${u.firstName} ${u.lastName}`); setCreatePastorQuery(''); setShowCreatePastorsDropdown(false); }}>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{u.firstName} {u.lastName}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{u.email}</div>
                        </div>
                        <div className="text-xs text-green-600">Selecionar</div>
                      </div>
                    ))}
                    <div className="px-3 py-2 border-t text-center sticky bottom-0 bg-white dark:bg-gray-800">
                      <button onMouseDown={(e) => { e.preventDefault(); setShowCreatePastorsDropdown(false); setShowCreateUserModal(true); }} className="text-sm text-blue-600">Criar novo usuário</button>
                    </div>
                  </div>
                )}
              </div>

              <CreateUserModal open={showCreateUserModal} onClose={() => setShowCreateUserModal(false)} onCreated={(created) => {
                setUsers(prev => [created, ...prev]);
                // prefer to set edit selection when edit modal open
                if (editRedeModalOpen) {
                  setEditPastorId(created.id);
                  setEditPastorName(`${created.firstName} ${created.lastName}`);
                } else {
                  setCreatePastorUserId(created.id);
                  setCreatePastorName(`${created.firstName} ${created.lastName}`);
                }
                setShowCreateUserModal(false);
              }} />

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
          <div className="bg-white dark:bg-gray-900 p-6 rounded w-11/12 sm:w-96">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Editar Rede</h3>
              <button onClick={() => setEditRedeModalOpen(false)} className="text-gray-500">Fechar</button>
            </div>
            <div className="space-y-3">
              <input placeholder="Nome da rede" value={editName} onChange={(e) => setEditName(e.target.value)} className="border p-2 rounded w-full bg-white dark:bg-gray-800 dark:text-white h-10" />
              <div ref={editPastorDropdownRef} className="relative w-full">
                <input placeholder="Pastor" value={editPastorQuery || editPastorName} onChange={(e) => { setEditPastorQuery(e.target.value); setShowEditPastorsDropdown(true); setEditPastorName(''); setEditPastorId(null); }} onFocus={() => { if (editPastorsTimeoutRef.current) { window.clearTimeout(editPastorsTimeoutRef.current); editPastorsTimeoutRef.current = null; } setShowEditPastorsDropdown(true); }} className="border p-2 rounded w-full bg-white dark:bg-gray-800 dark:text-white h-10" />
                {showEditPastorsDropdown && (
                  <div className="absolute left-0 right-0 bg-white dark:bg-gray-800 border mt-1 rounded max-h-44 overflow-auto z-50">
                    {users.filter(u => {
                      const q = (editPastorQuery || '').toLowerCase();
                      if (!q) return true;
                      return (`${u.firstName} ${u.lastName}`.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
                    }).map(u => (
                      <div key={u.id} className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center justify-between" onMouseDown={() => { setEditPastorId(u.id); setEditPastorName(`${u.firstName} ${u.lastName}`); setEditPastorQuery(''); setShowEditPastorsDropdown(false); }}>
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
  );
}
