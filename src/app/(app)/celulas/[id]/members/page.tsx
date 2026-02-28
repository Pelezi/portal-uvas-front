"use client";

import React, { useEffect, useState, use } from 'react';
import { memberService, MemberInput } from '@/services/memberService';
import { celulasService } from '@/services/celulasService';
import { Celula, Member } from '@/types';
import toast from 'react-hot-toast';
import { ErrorMessages } from '@/lib/errorHandler';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import MemberModal from '@/components/MemberModal';
import DuplicateMemberModal from '@/components/DuplicateMemberModal';

const MemberViewModal = dynamic(() => import('@/components/MemberViewModal'), { ssr: false });
import ModalConfirm from '@/components/ModalConfirm';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { FiEdit2, FiTrash2, FiUserPlus, FiEye } from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';

export default function CelulaMembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useAuth();
  const [celulas, setCelulas] = useState<Celula[]>([]);
  const resolvedParams = use(params);
  const [members, setMembers] = useState<Member[]>([]);
  const [celulaName, setCelulaName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMemberId, setModalMemberId] = useState<number | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingMemberId, setViewingMemberId] = useState<number | null>(null);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [duplicateMembers, setDuplicateMembers] = useState<Member[]>([]);
  const [pendingMemberData, setPendingMemberData] = useState<{ data: Partial<Member>, photo?: File } | null>(null);
  
  // Confirmation modal state
  const [confirmingRemoveMember, setConfirmingRemoveMember] = useState<Member | null>(null);

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
        const c = await celulasService.getCelulas({ all: true });
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
    setModalMemberId(member.id);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setModalMemberId(null);
    setIsModalOpen(true);
  };

  const openViewModal = (member: Member) => {
    setViewingMemberId(member.id);
    setIsViewModalOpen(true);
  };

  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const checkForDuplicates = async (name: string, gender: string): Promise<Member[]> => {
    try {
      return await memberService.checkDuplicateMember(name, gender);
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

  const handleModalSave = async (memberData: Partial<Member>, photo?: File, deletePhoto?: boolean, originalMember?: Member | null): Promise<Member> => {
    let savedMember: Member;
    const wasCreating = !modalMemberId;
    const wasEnablingAccess = !originalMember?.hasSystemAccess && memberData.hasSystemAccess;
    
    try {
      if (modalMemberId) {
        // Edit existing member
        savedMember = await memberService.updateMember(celulaId, modalMemberId, memberData, photo, deletePhoto);
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
            setModalMemberId(null);
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
        setModalMemberId(null);
        
        // Reload page to update sidebar picture
        window.location.reload();
        return savedMember;
      }

      setIsModalOpen(false);
      setModalMemberId(null);
      load();

      // Enviar convite em background após fechar o modal
      const shouldSendInvite = memberData.hasSystemAccess && memberData.email && memberData.email.trim() && (
        wasCreating || // Criar novo membro com acesso
        (wasEnablingAccess && originalMember?.hasDefaultPassword !== false && !originalMember?.inviteSent) // Ativando acesso pela primeira vez
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
      toast.error(modalMemberId ? ErrorMessages.updateMember(err) : ErrorMessages.createMember(err));
      throw err;
    }
  };

  const remove = async (member: Member) => {
    setConfirmingRemoveMember(member);
  };

  const removeMemberConfirmed = async () => {
    if (!confirmingRemoveMember) return;
    try {
      await memberService.deleteMember(celulaId, confirmingRemoveMember.id);
      toast.success('Membro removido com sucesso!');
      setConfirmingRemoveMember(null);
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
            <li key={m.id} className="bg-gray-800 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {m.photoUrl ? (
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={m.photoUrl} alt={m.name} />
                      <AvatarFallback className="bg-gray-700 text-white text-sm">
                        {getInitials(m.name)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-gray-700 text-white text-sm">
                        {getInitials(m.name)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className="flex-1">
                    <h4 className="font-medium text-white">{m.name}</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      ID: {m.id} {m.email && `• ${m.email}`}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openViewModal(m)}
                    className="p-2 text-blue-400 hover:bg-blue-900/30 rounded transition-colors"
                    title="Visualizar detalhes"
                  >
                    <FiEye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => openEditModal(m)}
                    className="p-2 text-gray-400 hover:bg-gray-700 rounded transition-colors"
                    title="Editar"
                  >
                    <FiEdit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(m)}
                    className="p-2 text-red-400 hover:bg-red-900/30 rounded transition-colors"
                    title="Remover"
                  >
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                </div>
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
        memberId={viewingMemberId}
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setViewingMemberId(null);
        }}
      />

      <MemberModal
        memberId={modalMemberId}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setModalMemberId(null);
        }}
        celulas={celulas}
        onSave={handleModalSave}
        initialCelulaId={celulaId}
        showSearchUnassigned
        onMemberAssigned={load}
      />

      <ModalConfirm
        open={!!confirmingRemoveMember}
        title="Confirmar remoção"
        message={confirmingRemoveMember ? `Remover membro ${confirmingRemoveMember.name}?` : ''}
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        onConfirm={removeMemberConfirmed}
        onCancel={() => setConfirmingRemoveMember(null)}
      />
    </div>
  );
}
