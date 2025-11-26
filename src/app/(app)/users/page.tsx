"use client";

import React, { useEffect, useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { userService } from '@/services/userService';
import { permissionService } from '@/services/permissionService';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [userToRemove, setUserToRemove] = useState<any | null>(null);

  // form fields
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // permissions
  const [celulas, setCelulas] = useState<any[]>([]);
  const [selectedCelulaIds, setSelectedCelulaIds] = useState<number[]>([]);
  const [hasGlobal, setHasGlobal] = useState(false);
  const [canManageCelulas, setCanManageCelulas] = useState(false);
  const [canManagePermissions, setCanManagePermissions] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await userService.list();
      setUsers(list);
      // also load available celulas for permissions select
      try {
        const celulaList = await (await import('@/services/celulasService')).celulasService.getCelulas();
        setCelulas(celulaList);
      } catch (e) {
        // ignore celulas load errors
        // console.error(e);
      }
    } catch (e) { console.error(e); toast.error('Falha ao buscar usuários'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setEmail(''); setFirstName(''); setLastName(''); setSelectedCelulaIds([]); setHasGlobal(false); setCanManageCelulas(false); setCanManagePermissions(false);
    setShowModal(true);
  };

  const openEdit = async (u: any) => {
    try {
      const full = await userService.getById(u.id);
        setEditing(full.user || full);
        const usr = full.user || full;
        setEmail(usr.email || ''); setFirstName(usr.firstName || ''); setLastName(usr.lastName || '');
        // populate permissions if returned
        const perm = (full as any).permission;
        setSelectedCelulaIds((perm && perm.celulaIds && Array.isArray(perm.celulaIds)) ? (perm.celulaIds as number[]) : []);
        setHasGlobal(!!(perm && perm.hasGlobalCelulaAccess));
        setCanManageCelulas(!!(perm && perm.canManageCelulas));
        setCanManagePermissions(!!(perm && perm.canManagePermissions));
      setShowModal(true);
    } catch (e) {
      console.error(e); toast.error('Falha ao carregar dados do usuário');
    }
  };

  const save = async () => {
    try {
      if (editing) {
        await userService.update(editing.id, { firstName, lastName });
        toast.success('Usuário atualizado');
      } else {
        await userService.invite({ email, firstName, lastName });
        toast.success('Convite enviado / usuário criado');
      }

      // update permissions if provided
      if (selectedCelulaIds.length || hasGlobal || canManageCelulas || canManagePermissions) {
        const celulaIds = selectedCelulaIds;
        await permissionService.upsertPermission({ email: editing ? editing.email : email, celulaIds, hasGlobalCelulaAccess: hasGlobal, canManageCelulas, canManagePermissions });
        toast.success('Permissões salvas');
      }

      setShowModal(false);
      load();
    } catch (e) { console.error(e); toast.error('Falha ao salvar'); }
  };

  const remove = (u: any) => {
    // open confirmation modal
    setUserToRemove(u);
  };

  const confirmRemove = async () => {
    if (!userToRemove) return;
    try {
      await userService.remove(userToRemove.id);
      toast.success('Usuário removido');
      setUserToRemove(null);
      load();
    } catch (e) {
      console.error(e);
      toast.error('Falha ao remover usuário');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Usuários</h2>
      </div>

      {loading ? (
        <div>Carregando...</div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {users.map((u) => (
            <div key={u.id} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-lg font-semibold text-gray-700 dark:text-gray-200">{(u.firstName && u.firstName[0]) || 'U'}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-gray-900 dark:text-gray-100 font-medium">{u.firstName} {u.lastName}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">{u.email}</div>
                  </div>
                  <div>
                    <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100">{u.roles[0] == 'PASTOR' ? 'Pastor' : u.roles[0] == 'DISCIPULADOR' ? 'Discipulador' : u.roles[0] == 'LEADER' ? 'Líder' : u.roles[0] == 'VICELEADER' ? 'Líder E.T.': 'Membro'}</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button onClick={() => openEdit(u)} className="px-3 py-1 bg-yellow-400 text-black rounded text-sm">Editar</button>
                  <button onClick={() => remove(u)} className="px-3 py-1 bg-red-600 text-white rounded text-sm">Remover</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 p-6 rounded w-full max-w-lg max-h-[70vh] overflow-auto">
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">{editing ? 'Editar usuário' : 'Criar usuário (convite)'}</h3>
            {!editing && (
              <div className="mb-3">
                <label className="block mb-1 text-gray-700 dark:text-gray-200">Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} className="border border-gray-300 dark:border-gray-600 p-2 rounded w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
              </div>
            )}
            <div className="mb-3">
              <label className="block mb-1 text-gray-700 dark:text-gray-200">Nome</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="border border-gray-300 dark:border-gray-600 p-2 rounded w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
            </div>
            <div className="mb-3">
              <label className="block mb-1 text-gray-700 dark:text-gray-200">Sobrenome</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="border border-gray-300 dark:border-gray-600 p-2 rounded w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
            </div>

            <div className="mb-3 border-t pt-3 border-gray-200 dark:border-gray-700">
              <h4 className="font-medium mb-2 text-gray-800 dark:text-gray-100">Permissões</h4>
              <label className="block mb-1 text-gray-700 dark:text-gray-200">Células</label>
              <div className="max-h-40 sm:max-h-48 overflow-y-auto p-2 border border-gray-300 dark:border-gray-600 rounded w-full mb-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                {celulas.length === 0 && <div className="text-sm text-gray-500">Nenhuma célula disponível</div>}
                {celulas.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 p-1">
                    <input
                      type="checkbox"
                      checked={selectedCelulaIds.includes(c.id)}
                      onChange={() => setSelectedCelulaIds((prev) => (prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id]))}
                    />
                    <span className="text-sm">{c.name}</span>
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-4 text-gray-700 dark:text-gray-200">
                <label className="flex items-center gap-2"><input type="checkbox" checked={hasGlobal} onChange={(e) => setHasGlobal(e.target.checked)} /> Acesso global</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={canManageCelulas} onChange={(e) => setCanManageCelulas(e.target.checked)} /> Gerenciar células</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={canManagePermissions} onChange={(e) => setCanManagePermissions(e.target.checked)} /> Gerenciar permissões</label>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200">Cancelar</button>
              <button onClick={save} className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Floating create button */}
      <button aria-label="Criar usuário" onClick={openCreate} className="fixed right-6 bottom-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg z-50">
        <FiPlus className="h-7 w-7" aria-hidden />
      </button>

      {/* Remove confirmation modal */}
      {userToRemove && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 p-6 rounded w-full max-w-md">
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Confirmar remoção</h3>
            <p className="mb-4 text-gray-700 dark:text-gray-200">Tem certeza que deseja remover o usuário <strong className="text-gray-900 dark:text-gray-100">{userToRemove.email}</strong>?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setUserToRemove(null)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200">Cancelar</button>
              <button onClick={confirmRemove} className="px-4 py-2 bg-red-600 text-white rounded">Remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
