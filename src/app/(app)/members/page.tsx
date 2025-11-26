"use client";

import React, { useEffect, useState, useRef } from 'react';
import { celulasService } from '@/services/celulasService';
import { membersService } from '@/services/membersService';
import { Celula, Member } from '@/types';
import toast from 'react-hot-toast';
import { createTheme, FormControl, InputLabel, MenuItem, Select, ThemeProvider } from '@mui/material';
import { FiEdit2, FiTrash2, FiPlus } from 'react-icons/fi';

export default function MembersManagementPage() {
  const [celulas, setCelulas] = useState<Celula[]>([]);
  const [selectedCelula, setSelectedCelula] = useState<number | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState<string>('MEMBER');
  const [editMarital, setEditMarital] = useState<string>('SINGLE');

  const [newRows, setNewRows] = useState<Array<{ key: string; value: string }>>([]);
  const newRowRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [confirmingMember, setConfirmingMember] = useState<Member | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const c = await celulasService.getCelulas();
        setCelulas(c);
        // If there's only one célula available, select it automatically
        if (Array.isArray(c) && c.length === 1) {
          setSelectedCelula(c[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (selectedCelula === null) return;
    const load = async () => {
      try {
        const m = await membersService.getMembers(selectedCelula);
        setMembers(m);
      } catch (e) {
        console.error(e);
      }
    };
    load();
    setNewRows([]);
    newRowRefs.current = {};
  }, [selectedCelula]);

  const openEditModal = (m: Member) => {
    setEditingMember(m);
    setEditName(m.name);
    setEditStatus((m as any).status ?? 'MEMBER');
    setEditMarital((m as any).maritalStatus ?? 'SINGLE');
  };

  const closeEditModal = () => {
    setEditingMember(null);
    setEditName('');
    setEditStatus('MEMBER');
    setEditMarital('SINGLE');
  };

  const saveEdit = async () => {
    if (!editingMember) return;
    if (selectedCelula === null) return toast.error('Selecione uma célula');
    try {
      await membersService.updateMember(selectedCelula, editingMember.id, { name: editName, status: editStatus, maritalStatus: editMarital } as any);
      toast.success('Membro atualizado');
      const refreshed = await membersService.getMembers(selectedCelula);
      setMembers(refreshed);
      closeEditModal();
    } catch (e) {
      console.error(e);
      toast.error('Falha ao atualizar');
    }
  };

  const removeMember = (member: Member) => {
    // open confirmation modal
    setConfirmingMember(member);
  };

  const performDeleteMember = async () => {
    const member = confirmingMember;
    if (!member) return;
    if (selectedCelula === null) return toast.error('Selecione uma célula');
    try {
      await membersService.deleteMember(selectedCelula, member.id);
      toast.success('Membro removido');
      const refreshed = await membersService.getMembers(selectedCelula);
      setMembers(refreshed);
      setConfirmingMember(null);
    } catch (e) {
      console.error(e);
      toast.error('Falha ao remover');
    }
  };

  const cancelDelete = () => setConfirmingMember(null);

  const addMemberInline = async (value: string, key: string) => {
    const name = value.trim();
    if (!name) return toast.error('Informe o nome do membro');
    if (selectedCelula === null) return toast.error('Selecione uma célula');
    try {
      const created = await membersService.addMember(selectedCelula, { name } as any);
      toast.success('Membro adicionado');
      setMembers(prev => [created, ...prev]);
      // remove filled row and append a fresh empty one
      const newKey = String(Date.now());
      setNewRows(prev => {
        const without = prev.filter(r => r.key !== key);
        return [...without, { key: newKey, value: '' }];
      });
      // focus the newly appended empty input (allow render to settle)
      setTimeout(() => {
        const keys = Object.keys(newRowRefs.current);
        const lastKey = keys[keys.length - 1];
        if (lastKey) newRowRefs.current[lastKey]?.focus();
      }, 60);
    } catch (e) {
      console.error(e);
      toast.error('Falha ao adicionar membro');
    }
  };

  useEffect(() => {
    if (newRows.length === 0) return;
    const last = newRows[newRows.length - 1];
    setTimeout(() => {
      newRowRefs.current[last.key]?.focus();
    }, 50);
  }, [newRows.length]);

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

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Gestão de Membros</h2>

      <div className="mb-4">
        <ThemeProvider theme={muiTheme}>
          <FormControl fullWidth required margin="normal">
            <InputLabel id="celula-type-label">Selecione uma célula</InputLabel>
            <Select
              labelId="celula-type-label"
              value={selectedCelula ?? ''}
              label="Selecione uma célula"
              onChange={(e) => setSelectedCelula(e.target.value ? Number(e.target.value) : null)}
            >
              <MenuItem value={0}>Selecione</MenuItem>
              {celulas.map((celula: any) => (
                <MenuItem key={celula.id} value={celula.id}>
                  {celula.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </ThemeProvider>
      </div>

      {selectedCelula && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Membros</h3>
          </div>
          <div className="mb-2" />
          <ul className="space-y-2">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 border p-2 rounded">
                <span className="flex-1">{m.name}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => openEditModal(m)} aria-label="Editar membro" className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                    <FiEdit2 className="h-4 w-4 text-yellow-500" aria-hidden />
                  </button>
                  <button onClick={() => removeMember(m)} aria-label="Remover membro" className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                    <FiTrash2 className="h-4 w-4 text-red-600" aria-hidden />
                  </button>
                </div>
              </li>
            ))}

            {/* new rows */}
            {newRows.map((nr) => (
              <li key={nr.key} className="flex items-center gap-3 border p-2 rounded">
                <input ref={(el) => { newRowRefs.current[nr.key] = el }} className="border p-1 rounded flex-1" value={nr.value} onChange={(e) => setNewRows(prev => prev.map(x => x.key === nr.key ? { ...x, value: e.target.value } : x))} onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    await addMemberInline(nr.value, nr.key);
                  }
                }} />
                <button onClick={() => setNewRows(prev => prev.filter(x => x.key !== nr.key))} className="p-1 rounded hover:bg-gray-100">✕</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Floating add button */}
      {selectedCelula && (
        <button aria-label="Adicionar membro" onClick={() => setNewRows(prev => [...prev, { key: String(Date.now()), value: '' }])} className="fixed right-6 bottom-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg z-50">
          <FiPlus className="h-7 w-7" aria-hidden />
        </button>
      )}

      {/* Edit member modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 p-6 rounded w-11/12 sm:w-96">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Editar Membro</h3>
              <button onClick={closeEditModal} className="text-gray-500">Fechar</button>
            </div>
            <div className="space-y-3">
              <input placeholder="Nome" value={editName} onChange={(e) => setEditName(e.target.value)} className="border p-2 rounded w-full bg-white dark:bg-gray-800 dark:text-white h-10" />
              <div>
                <label className="block mb-1">Status</label>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="w-full border p-2 rounded bg-white dark:bg-gray-800">
                  <option value="VISITOR">Visitante</option>
                  <option value="MEMBER">Membro</option>
                  <option value="FA">Frequentador assíduo</option>
                  <option value="INACTIVE">Inativo</option>
                </select>
              </div>
              <div>
                <label className="block mb-1">Estado civil</label>
                <select value={editMarital} onChange={(e) => setEditMarital(e.target.value)} className="w-full border p-2 rounded bg-white dark:bg-gray-800">
                  <option value="SINGLE">Solteiro(a)</option>
                  <option value="COHABITATING">Amasiados</option>
                  <option value="MARRIED">Casado(a)</option>
                  <option value="DIVORCED">Divorciado(a)</option>
                  <option value="WIDOWED">Viúvo(a)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={closeEditModal} className="px-3 py-2 border rounded">Cancelar</button>
                <button onClick={saveEdit} className="px-3 py-2 bg-green-600 text-white rounded">Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Delete confirmation modal */}
      {confirmingMember && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 p-6 rounded w-11/12 sm:w-96">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Confirmação</h3>
              <p className="text-sm text-gray-600">Tem certeza que deseja remover <strong>{confirmingMember.name}</strong>?</p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={cancelDelete} className="px-3 py-2 border rounded">Cancelar</button>
              <button onClick={performDeleteMember} className="px-3 py-2 bg-red-600 text-white rounded">Remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
 
