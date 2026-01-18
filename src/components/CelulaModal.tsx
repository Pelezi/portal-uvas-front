"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Celula, Member, Discipulado, Rede } from '@/types';
import { createTheme, FormControl, InputLabel, MenuItem, Select, ThemeProvider } from '@mui/material';
import toast from 'react-hot-toast';

interface CelulaModalProps {
  celula: Celula | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; leaderMemberId?: number; discipuladoId?: number }) => Promise<void>;
  members: Member[];
  discipulados: Discipulado[];
  redes: Rede[];
}

export default function CelulaModal({ 
  celula, 
  isOpen, 
  onClose, 
  onSave,
  members,
  discipulados,
  redes
}: CelulaModalProps) {
  const isEditing = !!celula;

  // Estados
  const [name, setName] = useState('');
  const [redeId, setRedeId] = useState<number | null>(null);
  const [discipuladoId, setDiscipuladoId] = useState<number | null>(null);
  const [leaderQuery, setLeaderQuery] = useState('');
  const [leaderId, setLeaderId] = useState<number | null>(null);
  const [leaderName, setLeaderName] = useState('');
  const [showLeaderDropdown, setShowLeaderDropdown] = useState(false);
  
  // Validação
  const [touched, setTouched] = useState({
    name: false,
    discipulado: false,
  });

  const leaderDropdownRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (showLeaderDropdown && leaderDropdownRef.current && !leaderDropdownRef.current.contains(target)) {
        setShowLeaderDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLeaderDropdown]);

  const muiTheme = createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
      primary: {
        main: isDarkMode ? '#ffffffff' : '#000000ff',
      },
    },
  });

  useEffect(() => {
    if (celula) {
      // Modo edição
      setName(celula.name || '');
      setLeaderId(celula.leaderMemberId ?? null);
      setLeaderName(celula.leader?.name || '');
      setLeaderQuery('');
      setDiscipuladoId(celula.discipuladoId ?? null);
      
      // Encontrar a rede através do discipulado
      if (celula.discipuladoId) {
        const disc = discipulados.find(d => d.id === celula.discipuladoId);
        if (disc) {
          setRedeId(disc.redeId);
        }
      }
    } else {
      // Modo criação
      resetForm();
    }
  }, [celula, discipulados]);

  const resetForm = () => {
    setName('');
    setRedeId(null);
    setDiscipuladoId(null);
    setLeaderQuery('');
    setLeaderId(null);
    setLeaderName('');
    setTouched({ name: false, discipulado: false });
  };

  const handleSave = async () => {
    // Marcar todos os campos como touched
    setTouched({ name: true, discipulado: true });

    if (!name.trim()) {
      toast.error('Nome da célula é obrigatório');
      return;
    }

    if (!discipuladoId) {
      toast.error('Discipulado é obrigatório');
      return;
    }

    await onSave({
      name,
      leaderMemberId: leaderId || undefined,
      discipuladoId: discipuladoId || undefined,
    });

    resetForm();
  };

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-900 rounded w-11/12 sm:w-96 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">{isEditing ? 'Editar Célula' : 'Criar Célula'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">✕</button>
        </div>

        <div className="space-y-3">
          {/* Nome */}
          <div>
            <label className="block mb-1 text-sm">Nome *</label>
            <input
              placeholder="Nome da célula"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched({ ...touched, name: true })}
              className={`border p-2 rounded w-full bg-white dark:bg-gray-800 dark:text-white h-10 ${
                touched.name && !name.trim() ? 'border-red-500' : ''
              }`}
            />
          </div>

          {/* Rede */}
          <div>
            <ThemeProvider theme={muiTheme}>
              <FormControl className="w-full">
                <InputLabel id="rede-label" size='small'>Rede *</InputLabel>
                <Select
                  labelId="rede-label"
                  value={redeId ?? ''}
                  onChange={(e) => { 
                    setRedeId(e.target.value ? Number(e.target.value) : null); 
                    setDiscipuladoId(null); 
                  }}
                  label="Rede"
                  size="small"
                  className="bg-white dark:bg-gray-800 w-full">
                  <MenuItem value="">Selecione rede</MenuItem>
                  {redes.map((r) => (<MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>))}
                </Select>
              </FormControl>
            </ThemeProvider>
          </div>

          {/* Discipulado */}
          <div>
            <ThemeProvider theme={muiTheme}>
              <FormControl 
                className="w-full"
                error={touched.discipulado && !discipuladoId}
              >
                <InputLabel id="discipulado-label" size='small'>Discipulado *</InputLabel>
                <Select
                  labelId="discipulado-label"
                  value={discipuladoId ?? ''}
                  onChange={(e) => setDiscipuladoId(e.target.value ? Number(e.target.value) : null)}
                  onBlur={() => setTouched({ ...touched, discipulado: true })}
                  label="Discipulado"
                  size="small"
                  className="bg-white dark:bg-gray-800 w-full">
                  <MenuItem value="">Selecione discipulado</MenuItem>
                  {discipulados.filter(d => !redeId || d.redeId === redeId).map((d) => (
                    <MenuItem key={d.id} value={d.id}>{d.discipulador?.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </ThemeProvider>
          </div>

          {/* Líder */}
          <div>
            <label className="block mb-1 text-sm">Líder</label>
            <div ref={leaderDropdownRef} className="relative w-full">
              <input
                placeholder="Buscar líder"
                value={leaderQuery || leaderName}
                onChange={(e) => { 
                  setLeaderQuery(e.target.value); 
                  setLeaderName(''); 
                  setLeaderId(null); 
                  setShowLeaderDropdown(true); 
                }}
                onFocus={() => setShowLeaderDropdown(true)}
                className="border p-2 rounded w-full bg-white dark:bg-gray-800 dark:text-white h-10"
              />
              {showLeaderDropdown && (
                <div className="absolute left-0 right-0 bg-white dark:bg-gray-800 border mt-1 rounded max-h-44 overflow-auto z-50">
                  {members.filter(member => {
                    const q = (leaderQuery || '').toLowerCase();
                    if (!q) return true;
                    return (member.name.toLowerCase().includes(q) || (member.email || '').toLowerCase().includes(q));
                  }).map(member => (
                    <div 
                      key={member.id} 
                      className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center justify-between" 
                      onMouseDown={() => { 
                        setLeaderId(member.id); 
                        setLeaderName(member.name); 
                        setLeaderQuery(''); 
                        setShowLeaderDropdown(false); 
                      }}
                    >
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{member.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{member.email}</div>
                      </div>
                      <div className="text-xs text-green-600">Selecionar</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {isEditing ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  );
}
