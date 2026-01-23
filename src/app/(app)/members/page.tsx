"use client";

import React, { useEffect, useState, useRef } from 'react';
import { celulasService } from '@/services/celulasService';
import { discipuladosService } from '@/services/discipuladosService';
import { redesService } from '@/services/redesService';
import { membersService } from '@/services/membersService';
import { Celula, Member, Discipulado, Rede, MemberFilters } from '@/types';
import toast from 'react-hot-toast';
import { createTheme, FormControl, InputLabel, MenuItem, Select, ThemeProvider } from '@mui/material';
import { FiEdit2, FiTrash2, FiPlus } from 'react-icons/fi';
import MemberModal from '@/components/MemberModal';

export default function MembersManagementPage() {
  const [celulas, setCelulas] = useState<Celula[]>([]);
  const [discipulados, setDiscipulados] = useState<Discipulado[]>([]);
  const [redes, setRedes] = useState<Rede[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterCelulaId, setFilterCelulaId] = useState<number | null>(null);
  const [filterDiscipuladoId, setFilterDiscipuladoId] = useState<number | null>(null);
  const [filterRedeId, setFilterRedeId] = useState<number | null>(null);

  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [confirmingMember, setConfirmingMember] = useState<Member | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMember, setModalMember] = useState<Member | null>(null);

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
      primary: {
        main: isDarkMode ? '#ffffffff' : '#000000ff',
      },
    },
  });

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [c, d, r] = await Promise.all([
          celulasService.getCelulas(),
          discipuladosService.getDiscipulados(),
          redesService.getRedes()
        ]);
        setCelulas(c);
        setDiscipulados(d);
        setRedes(r);
      } catch (e) {
        console.error(e);
      }
    };
    loadFilters();
  }, []);

  useEffect(() => {
    const loadMembers = async () => {
      setLoading(true);
      try {
        const filters: MemberFilters = {};
        // filterCelulaId = 0 significa "sem célula", null significa "todas"
        if (filterCelulaId !== null) filters.celulaId = filterCelulaId;
        if (filterDiscipuladoId) filters.discipuladoId = filterDiscipuladoId;
        if (filterRedeId) filters.redeId = filterRedeId;

        const m = await membersService.getAllMembers(filters);
        setMembers(m);
      } catch (e) {
        console.error(e);
        toast.error('Falha ao carregar membros');
      } finally {
        setLoading(false);
      }
    };
    loadMembers();
  }, [filterCelulaId, filterDiscipuladoId, filterRedeId]);

  const openEditModal = (m: Member) => {
    setModalMember(m);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setModalMember(null);
    setIsModalOpen(true);
  };

  const handleModalSave = async (data: Partial<Member>) => {
    try {
      if (modalMember) {
        // Editing
        await membersService.updateMember(modalMember.celulaId || 0, modalMember.id, data);
        toast.success('Membro atualizado');
      } else {
        // Creating - name is required
        if (!data.name) {
          toast.error('Nome é obrigatório');
          return;
        }
        await membersService.addMember(data.celulaId ?? null, data as Partial<Member> & { name: string });
        toast.success('Membro criado com sucesso');
      }

      // Reload members
      const filters: MemberFilters = {};
      if (filterCelulaId !== null) filters.celulaId = filterCelulaId;
      if (filterDiscipuladoId) filters.discipuladoId = filterDiscipuladoId;
      if (filterRedeId) filters.redeId = filterRedeId;
      const refreshed = await membersService.getAllMembers(filters);
      setMembers(refreshed);
      setIsModalOpen(false);
      setModalMember(null);
    } catch (e) {
      console.error(e);
      toast.error('Falha ao salvar');
    }
  };

  const removeMember = (member: Member) => {
    setConfirmingMember(member);
  };

  const performDeleteMember = async () => {
    const member = confirmingMember;
    if (!member) return;
    try {
      await membersService.deleteMember(member.celulaId || 0, member.id);
      toast.success('Membro removido da célula');

      // Reload members
      const filters: MemberFilters = {};
      if (filterCelulaId !== null) filters.celulaId = filterCelulaId;
      if (filterDiscipuladoId) filters.discipuladoId = filterDiscipuladoId;
      if (filterRedeId) filters.redeId = filterRedeId;
      const refreshed = await membersService.getAllMembers(filters);
      setMembers(refreshed);
      setConfirmingMember(null);
    } catch (e) {
      console.error(e);
      toast.error('Falha ao remover');
    }
  };

  const cancelDelete = () => setConfirmingMember(null);

  return (
    <div className="relative pb-20">
      <ThemeProvider theme={muiTheme}>
        <h2 className="text-2xl font-semibold mb-4">Gestão de Membros</h2>

        <div className="mb-6">
          <label className="block mb-2">Filtros</label>
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <div className="w-full sm:w-48">
              <FormControl fullWidth>
                <InputLabel id="filter-rede-label" size='small'>Rede</InputLabel>
                <Select
                  labelId="filter-rede-label"
                  value={filterRedeId !== null ? String(filterRedeId) : ''}
                  label="Rede"
                  onChange={(e) => {
                    setFilterRedeId(e.target.value ? Number(e.target.value) : null);
                    setFilterDiscipuladoId(null);
                    setFilterCelulaId(null);
                  }}
                  size="small"
                  className="bg-white dark:bg-gray-800"
                >
                  <MenuItem value="">Todas redes</MenuItem>
                  {redes.map(r => (<MenuItem key={r.id} value={String(r.id)}>{r.name}</MenuItem>))}
                </Select>
              </FormControl>
            </div>

            <div className="w-full sm:w-48">
              <FormControl fullWidth>
                <InputLabel id="filter-discipulado-label" size='small'>Discipulado</InputLabel>
                <Select
                  labelId="filter-discipulado-label"
                  value={filterDiscipuladoId !== null ? String(filterDiscipuladoId) : ''}
                  label="Discipulado"
                  onChange={(e) => {
                    setFilterDiscipuladoId(e.target.value ? Number(e.target.value) : null);
                    setFilterCelulaId(null);
                  }}
                  size="small"
                  className="bg-white dark:bg-gray-800"
                >
                  <MenuItem value="">Todos</MenuItem>
                  {discipulados
                    .filter(d => !filterRedeId || d.redeId === filterRedeId)
                    .map(d => (
                      <MenuItem key={d.id} value={String(d.id)}>
                        {d.discipulador.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </div>

            <div className="w-full sm:w-48">
              <FormControl fullWidth>
                <InputLabel id="filter-celula-label" size='small'>Célula</InputLabel>
                <Select
                  labelId="filter-celula-label"
                  value={filterCelulaId !== null ? String(filterCelulaId) : ''}
                  label="Célula"
                  onChange={(e) => setFilterCelulaId(e.target.value === '' ? null : Number(e.target.value))}
                  size="small"
                  className="bg-white dark:bg-gray-800"
                >
                  <MenuItem value="">Todas</MenuItem>
                  <MenuItem value="0">Sem célula</MenuItem>
                  {celulas
                    .filter(c => !filterDiscipuladoId || c.discipuladoId === filterDiscipuladoId)
                    .map(c => (<MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>))}
                </Select>
              </FormControl>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center mb-3">
            <h3 className="font-medium">Membros ({members.length})</h3>
          </div>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
          <ul className="space-y-2">
            {members.map((m) => (
              <li
                key={m.id}
                className={`flex items-center gap-3 border p-2 rounded ${!m.celulaId ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700' : 'bg-white dark:bg-gray-900'}`}
              >
                <span className="flex-1">
                  {m.name}
                  {!m.celulaId && <span className="text-xs text-red-600 dark:text-red-400 ml-2 font-semibold">(sem célula)</span>}
                  {m.celula && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      - {m.celula.name}
                    </span>
                  )}
                  {!m.isActive && <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">(desligado)</span>}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(m)}
                    aria-label="Editar membro"
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <FiEdit2 className="h-4 w-4 text-yellow-500" aria-hidden />
                  </button>
                  {m.celulaId && (
                    <button
                      onClick={() => removeMember(m)}
                      aria-label="Remover membro da célula"
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <FiTrash2 className="h-4 w-4 text-red-600" aria-hidden />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          )}
        </div>

        {/* Floating Action Button */}
        <button
          onClick={openCreateModal}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-40"
          aria-label="Adicionar Membro"
        >
          <FiPlus className="h-6 w-6" />
        </button>

        {/* Member Modal */}
        <MemberModal
          member={modalMember}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setModalMember(null);
          }}
          onSave={handleModalSave}
          celulas={celulas}
        />

        {/* Delete confirmation modal */}
        {confirmingMember && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 p-6 rounded w-11/12 sm:w-96">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Confirmação</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Tem certeza que deseja remover <strong>{confirmingMember.name}</strong> da célula? O membro não será excluído, apenas sua associação com a célula será removida.</p>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={cancelDelete} className="px-3 py-2 border rounded">Cancelar</button>
                <button onClick={performDeleteMember} className="px-3 py-2 bg-red-600 text-white rounded">Remover da célula</button>
              </div>
            </div>
          </div>
        )}
      </ThemeProvider>
    </div>
  );
}
