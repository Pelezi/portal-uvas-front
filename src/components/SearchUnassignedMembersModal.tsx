"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Member } from '@/types';
import { memberService } from '@/services/memberService';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/utils/getInitials';
import { FiSearch, FiUserPlus } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface SearchUnassignedMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  celulaId: number;
  onMemberAssigned: () => void;
}

export default function SearchUnassignedMembersModal({
  isOpen,
  onClose,
  celulaId,
  onMemberAssigned,
}: SearchUnassignedMembersModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchUnassigned = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const results = await memberService.getMembersAutocomplete({
        celulaId: 0, // 0 = members without a cell
        all: true,
        name: query || undefined,
      });
      setMembers(results);
    } catch (err) {
      console.error('Erro ao buscar membros sem célula:', err);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchUnassigned('');
      setSearchQuery('');
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setMembers([]);
      setSearchQuery('');
    }
  }, [isOpen, fetchUnassigned]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchUnassigned(value);
    }, 300);
  };

  const handleAssign = async (member: Member) => {
    setAssigning(member.id);
    try {
      await memberService.updateMember(celulaId, member.id, { celulaId, isActive: true });
      toast.success(`${member.name} adicionado(a) à célula!`);
      // Remove from list
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      onMemberAssigned();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao associar membro à célula');
    } finally {
      setAssigning(null);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="bg-gray-900 rounded-lg w-11/12 max-w-lg my-8 max-h-[80vh] flex flex-col shadow-xl border border-gray-700">
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-gray-700">
          <h3 className="text-lg font-semibold">Buscar Membros Sem Célula</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg">✕</button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-gray-700">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar por nome..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg pl-9 pr-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">
                {searchQuery
                  ? 'Nenhum membro encontrado com esse nome'
                  : 'Nenhum membro sem célula encontrado'}
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-800 transition-colors group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="w-9 h-9 shrink-0">
                      {m.photoUrl ? (
                        <AvatarImage src={m.photoUrl} alt={m.name} />
                      ) : null}
                      <AvatarFallback className="bg-gray-700 text-white text-xs">
                        {getInitials(m.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{m.name}</p>
                      {m.phone && (
                        <p className="text-xs text-gray-400 truncate">{m.phone}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleAssign(m)}
                    disabled={assigning === m.id}
                    className="ml-2 shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-xs rounded-lg transition-colors"
                    title="Associar à célula"
                  >
                    {assigning === m.id ? (
                      <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <FiUserPlus size={14} />
                        <span>Adicionar</span>
                      </>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-700 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {members.length} membro{members.length !== 1 ? 's' : ''} encontrado{members.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
