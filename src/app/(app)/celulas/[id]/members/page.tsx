"use client";

import React, { useEffect, useState, use } from 'react';
import { memberService, MemberInput } from '@/services/memberService';
import { celulasService } from '@/services/celulasService';
import { Celula, Member } from '@/types';
import toast from 'react-hot-toast';
import { ErrorMessages } from '@/lib/errorHandler';
import Link from 'next/link';
import MemberModal from '@/components/MemberModal';
import MemberViewModal from '@/components/MemberViewModal';
import DuplicateMemberModal from '@/components/DuplicateMemberModal';
import { FiEdit2, FiTrash2, FiUserPlus } from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';

export default function CelulaMembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useAuth();
  const [celulas, setCelulas] = useState<Celula[]>([]);
  const resolvedParams = use(params);
  const [members, setMembers] = useState<Member[]>([]);
  const [celulaName, setCelulaName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMember, setModalMember] = useState<Member | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingMember, setViewingMember] = useState<Member | null>(null);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [duplicateMembers, setDuplicateMembers] = useState<Member[]>([]);
  const [pendingMemberData, setPendingMemberData] = useState<{ data: Partial<Member>, photo?: File } | null>(null);

  const celulaId = parseInt(resolvedParams.id, 10);

  const load = async () => {
    if (Number.isNaN(celulaId)) return;
    setLoading(true);
    try {
      const m = await memberService.getMembers(celulaId);
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
    setIsModalOpen(true);
  };

  const openViewModal = (member: Member) => {
    setViewingMember(member);
    setIsViewModalOpen(true);
  };

  const checkForDuplicates = async (name: string, gender: string): Promise<Member[]> => {
    try {
      // Buscar membros com mesmo nome e gênero
      const allMembers = await memberService.getAllMembers({ all: true });
      const duplicates = allMembers.filter(
        (m) => m.name.toLowerCase().trim() === name.toLowerCase().trim() && m.gender === gender
      );
      return duplicates;
    } catch (err) {
      console.error('Erro ao verificar duplicatas:', err);
      return [];
    }
  };

  const handleAddExistingMember = async (member: Member) => {
    if (!member) return;
    
    try {
      // Atualizar o membro para adicionar à célula
      await memberService.updateMember(celulaId, member.id, { celulaId, isActive: true });
      toast.success(`${member.name} adicionado(a) à célula`);
      setIsDuplicateModalOpen(false);
      setDuplicateMembers([]);
      setPendingMemberData(null);
      await load();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao adicionar membro existente');
      throw err;
    }
  };

  const handleCreateNewMemberAnyway = async () => {
    if (!pendingMemberData) return;

    setIsDuplicateModalOpen(false);
    setDuplicateMembers([]);
    
    // Continuar com a criação do novo membro
    try {
      const memberDataWithCelula = { ...pendingMemberData.data, celulaId };
      const savedMember = await memberService.create(
        memberDataWithCelula as MemberInput,
        pendingMemberData.photo
      );
      toast.success('Membro adicionado com sucesso');

      // Check if user edited their own photo
      const isEditingSelf = user && savedMember.id === user.id;
      const photoChanged = pendingMemberData.photo;
      
      if (isEditingSelf && photoChanged) {
        window.location.reload();
        return;
      }

      setPendingMemberData(null);
      load();

      // Enviar convite em background
      const shouldSendInvite = pendingMemberData.data.hasSystemAccess && 
        pendingMemberData.data.email && 
        pendingMemberData.data.email.trim();

      if (shouldSendInvite) {
        memberService.sendInvite(savedMember.id)
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
    } catch (err) {
      console.error(err);
      toast.error(ErrorMessages.createMember(err));
      throw err;
    }
  };

  const handleModalSave = async (memberData: Partial<Member>, photo?: File, deletePhoto?: boolean): Promise<Member> => {
    let savedMember: Member;
    const wasCreating = !modalMember?.id;
    const wasEnablingAccess = !modalMember?.hasSystemAccess && memberData.hasSystemAccess;
    
    try {
      if (modalMember?.id) {
        // Edit existing member
        savedMember = await memberService.updateMember(celulaId, modalMember.id, memberData, photo, deletePhoto);
        toast.success('Membro atualizado com sucesso');
      } else {
        // Create new member - check for duplicates first
        if (memberData.name && memberData.gender) {
          const duplicates = await checkForDuplicates(memberData.name, memberData.gender);
          
          if (duplicates.length > 0) {
            // Found duplicates - show confirmation modal
            setDuplicateMembers(duplicates);
            setPendingMemberData({ data: memberData, photo });
            setIsDuplicateModalOpen(true);
            setIsModalOpen(false);
            setModalMember(null);
            // Return a placeholder - the actual save will happen in handleAddExistingMember or handleCreateNewMemberAnyway
            return duplicates[0];
          }
        }

        // No duplicate found - proceed with creation
        const memberDataWithCelula = { ...memberData, celulaId };
        savedMember = await memberService.create(memberDataWithCelula as MemberInput, photo);
        toast.success('Membro adicionado com sucesso');
      }

      // Check if user edited their own photo - if so, reload page to update sidebar
      const isEditingSelf = user && savedMember.id === user.id;
      const photoChanged = photo || deletePhoto;
      
      if (isEditingSelf && photoChanged) {
        // Close modal first for better UX
        setIsModalOpen(false);
        setModalMember(null);
        
        // Reload page to update sidebar picture
        window.location.reload();
        return savedMember;
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
        memberService.sendInvite(savedMember.id)
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
      await memberService.deleteMember(celulaId, memberId);
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

      <DuplicateMemberModal
        isOpen={isDuplicateModalOpen}
        onClose={() => {
          setIsDuplicateModalOpen(false);
          setDuplicateMembers([]);
          setPendingMemberData(null);
        }}
        duplicateMembers={duplicateMembers}
        onAddExisting={handleAddExistingMember}
        onCreateNew={handleCreateNewMemberAnyway}
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
