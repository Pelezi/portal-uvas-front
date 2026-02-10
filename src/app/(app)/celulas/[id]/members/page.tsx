"use client";

import React, { useEffect, useState, use } from 'react';
import { membersService } from '@/services/membersService';
import { celulasService } from '@/services/celulasService';
import { Celula, Member } from '@/types';
import toast from 'react-hot-toast';
import { ErrorMessages } from '@/lib/errorHandler';
import Link from 'next/link';
import MemberModal from '@/components/MemberModal';
import MemberViewModal from '@/components/MemberViewModal';
import AddMemberChoiceModal from '@/components/AddMemberChoiceModal';
import { FiEdit2, FiTrash2, FiUserPlus } from 'react-icons/fi';

export default function CelulaMembersPage({ params }: { params: Promise<{ id: string }> }) {
  const [celulas, setCelulas] = useState<Celula[]>([]);
  const resolvedParams = use(params);
  const [members, setMembers] = useState<Member[]>([]);
  const [celulaName, setCelulaName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMember, setModalMember] = useState<Member | null>(null);
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingMember, setViewingMember] = useState<Member | null>(null);

  const celulaId = parseInt(resolvedParams.id, 10);

  const load = async () => {
    if (Number.isNaN(celulaId)) return;
    setLoading(true);
    try {
      const m = await membersService.getMembers(celulaId);
      setMembers(m);
    } catch (err) {
      console.error(err);
      toast.error(ErrorMessages.loadMembers(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadCelulas = async () => {
      try {
        const c = await celulasService.getCelulas()
        setCelulas(c);
      } catch (e) {
        console.error(e);
      }
    };
    loadCelulas();
  }, []);

  useEffect(() => {
    load();
    // Carregar nome da célula
    const loadCelula = async () => {
      try {
        const celula = await celulasService.getCelula(celulaId);
        setCelulaName(celula.name);
      } catch (err) {
        console.error(err);
      }
    };
    if (!Number.isNaN(celulaId)) {
      loadCelula();
    }
  }, [resolvedParams.id]);

  const openEditModal = (member: Member) => {
    setModalMember(member);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setModalMember(null);
    setIsChoiceModalOpen(true);
  };

  const openViewModal = (member: Member) => {
    setViewingMember(member);
    setIsViewModalOpen(true);
  };

  const handleAddExistingMember = async (memberId: number) => {
    try {
      // Atualizar o membro para adicionar à célula
      await membersService.updateMember(celulaId, memberId, { celulaId });
      await load();
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleCreateNewMember = () => {
    setIsChoiceModalOpen(false);
    setModalMember(null);
    setIsModalOpen(true);
  };

  const handleModalSave = async (memberData: Partial<Member>): Promise<Member> => {
    let savedMember: Member;
    const wasCreating = !modalMember?.id;
    const wasEnablingAccess = !modalMember?.hasSystemAccess && memberData.hasSystemAccess;
    
    try {
      if (modalMember?.id) {
        // Edit existing member
        savedMember = await membersService.updateMember(celulaId, modalMember.id, memberData);
        toast.success('Membro atualizado com sucesso');
      } else {
        // Create new member
        savedMember = await membersService.addMember(celulaId, memberData as Partial<Member> & { name: string });
        toast.success('Membro adicionado com sucesso');
      }

      setIsModalOpen(false);
      setModalMember(null);
      load();

      // Enviar convite em background após fechar o modal
      const shouldSendInvite = memberData.hasSystemAccess && memberData.email && memberData.email.trim() && (
        wasCreating || // Criar novo membro com acesso
        (wasEnablingAccess && modalMember?.hasDefaultPassword !== false && !modalMember?.inviteSent) // Ativando acesso pela primeira vez
      );

      if (shouldSendInvite) {
        // Enviar em background sem bloquear
        membersService.sendInvite(savedMember.id)
          .then((response) => {
            const message = response.whatsappSent 
              ? 'Convite enviado por email e WhatsApp' 
              : 'Convite enviado por email';
            toast.success(message);
          })
          .catch((inviteErr: any) => {
            console.error('Erro ao enviar convite:', inviteErr);
            toast.error(inviteErr.response?.data?.message || 'Erro ao enviar convite, mas o membro foi salvo');
          });
      }

      return savedMember;
    } catch (err) {
      console.error(err);
      toast.error(modalMember?.id ? ErrorMessages.updateMember(err) : ErrorMessages.createMember(err));
      throw err;
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
    <div className="pb-20">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">
          Membros da célula {celulaName || resolvedParams.id}
        </h2>
        <Link href="/celulas" className="text-sm text-blue-500">Voltar</Link>
      </div>

      {loading && <div>Carregando...</div>}

      {!loading && (
        <ul className="space-y-3">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between border p-3 rounded bg-gray-900">
              <div>
                <button
                  onClick={() => openViewModal(m)}
                  className="font-medium text-white hover:text-blue-400 transition-colors text-left"
                >
                  {m.name}
                </button>
                <div className="text-sm text-gray-400">id: {m.id}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditModal(m)}
                  className="p-2 text-yellow-600 hover:bg-yellow-900/20 rounded transition-colors"
                  title="Editar"
                >
                  <FiEdit2 size={18} />
                </button>
                <button
                  onClick={() => remove(m.id)}
                  className="p-2 text-red-600 hover:bg-red-900/20 rounded transition-colors"
                  title="Remover"
                >
                  <FiTrash2 size={18} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Botão flutuante para adicionar membro */}
      <button
        onClick={openAddModal}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-40"
        title="Adicionar Membro"
        aria-label="Adicionar Membro"
      >
        <FiUserPlus size={24} />
      </button>

      <AddMemberChoiceModal
        isOpen={isChoiceModalOpen}
        onClose={() => setIsChoiceModalOpen(false)}
        onCreateNew={handleCreateNewMember}
        onAddExisting={handleAddExistingMember}
        currentCelulaId={celulaId}
      />

      <MemberViewModal
        member={viewingMember}
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setViewingMember(null);
        }}
      />

      <MemberModal
        member={modalMember}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setModalMember(null);
        }}
        celulas={celulas}
        onSave={handleModalSave}
        initialCelulaId={celulaId}
      />
    </div>
  );
}
