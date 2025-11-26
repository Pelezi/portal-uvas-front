"use client";

import React, { useEffect, useState, use } from 'react';
import { membersService } from '@/services/membersService';
import { Member } from '@/types';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function CelulaMembersPage({ params }: { params: any }) {
  // `params` may be a Promise (Next routing). Unwrap it with React.use()
  const resolvedParams = use(params) as { id: string };
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  const celulaId = parseInt(resolvedParams.id, 10);

  const load = async () => {
    if (Number.isNaN(celulaId)) return;
    setLoading(true);
    try {
      const m = await membersService.getMembers(celulaId);
      setMembers(m as Member[]);
    } catch (err) {
      console.error(err);
      toast.error('Falha ao carregar membros');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [resolvedParams.id]);

  const startEdit = (m: Member) => { setEditingId(m.id); setEditingName(m.name); };
  const saveEdit = async () => {
    if (editingId == null) return;
    try {
      await membersService.updateMember(celulaId, editingId, { name: editingName });
      toast.success('Atualizado');
      setEditingId(null); setEditingName('');
      load();
    } catch (err) { console.error(err); toast.error('Falha ao atualizar'); }
  };

  const remove = async (memberId: number) => {
    if (!confirm('Remover membro?')) return;
    try {
      await membersService.deleteMember(celulaId, memberId);
      toast.success('Removido'); load();
    } catch (err) { console.error(err); toast.error('Falha ao remover'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Membros da célula {resolvedParams.id}</h2>
        <Link href="/celulas" className="text-sm text-blue-500">Voltar</Link>
      </div>

      {loading && <div>Carregando...</div>}

      {!loading && (
        <ul className="space-y-3">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between border p-3 rounded bg-white dark:bg-gray-900">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">{m.name}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">id: {m.id}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => startEdit(m)} className="px-3 py-1 bg-yellow-400 rounded">Editar</button>
                <button onClick={() => remove(m.id)} className="px-3 py-1 bg-red-500 text-white rounded">Remover</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editingId != null && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 p-6 rounded w-11/12 sm:w-96">
            <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">Editar membro</h4>
            <input value={editingName} onChange={(e) => setEditingName(e.target.value)} className="border p-2 rounded w-full mb-4 bg-white dark:bg-gray-700 dark:text-white" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditingId(null)} className="px-3 py-1">Cancelar</button>
              <button onClick={saveEdit} className="px-3 py-1 bg-blue-600 text-white rounded">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
