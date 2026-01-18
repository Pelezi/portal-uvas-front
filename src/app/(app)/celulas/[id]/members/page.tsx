"use client";

import React, { useEffect, useState, use } from 'react';
import { membersService } from '@/services/membersService';
import { Member } from '@/types';
import toast from 'react-hot-toast';
import { ErrorMessages } from '@/lib/errorHandler';
import Link from 'next/link';
import MemberModal from '@/components/MemberModal';

export default function CelulaMembersPage({ params }: { params: Promise<{ id: string }> }) {
  // `params` may be a Promise (Next routing). Unwrap it with React.use()
  const resolvedParams = use(params);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMember, setModalMember] = useState<Member | null>(null);

  const celulaId = parseInt(resolvedParams.id, 10);

  const load = async () => {
    if (Number.isNaN(celulaId)) return;
    setLoading(true);
    try {
      const m = await membersService.getMembers(celulaId);
      setMembers(m as Member[]);
    } catch (err) {
      console.error(err);
      toast.error(ErrorMessages.loadMembers(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [resolvedParams.id]);

  const openEditModal = (member: Member) => {
    setModalMember(member);
    setIsModalOpen(true);
  };

  const handleModalSave = async (memberData: Partial<Member>) => {
    try {
      if (modalMember?.id) {
        // Edit existing member
        await membersService.updateMember(celulaId, modalMember.id, memberData);
        toast.success('Membro atualizado com sucesso');
      }
      setIsModalOpen(false);
      setModalMember(null);
      load();
    } catch (err) {
      console.error(err);
      toast.error(ErrorMessages.updateMember(err));
    }
  };

  const remove = async (memberId: number) => {
    if (!confirm('Remover membro?')) return;
    try {
      await membersService.deleteMember(celulaId, memberId);
      toast.success('Membro removido com sucesso!'); 
      load();
    } catch (err) { 
      console.error(err); 
      toast.error(ErrorMessages.deleteMember(err)); 
    }
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
                <button onClick={() => openEditModal(m)} className="px-3 py-1 bg-yellow-400 rounded">Editar</button>
                <button onClick={() => remove(m.id)} className="px-3 py-1 bg-red-500 text-white rounded">Remover</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <MemberModal
        member={modalMember}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setModalMember(null);
        }}
        onSave={handleModalSave}
      />
    </div>
  );
}
