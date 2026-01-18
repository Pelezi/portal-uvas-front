"use client";

import React, { useEffect, useState } from 'react';
import { celulasService } from '@/services/celulasService';
import { membersService } from '@/services/membersService';
import { reportsService } from '@/services/reportsService';
import { Celula, Member } from '@/types';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { LuHistory } from 'react-icons/lu';
import { FiPlus } from 'react-icons/fi';
import { createTheme, FormControl, InputLabel, MenuItem, Select, ThemeProvider } from '@mui/material';
import MemberModal from '@/components/MemberModal';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/pt-br';

export default function ReportPage() {
  const [groups, setGroups] = useState<Celula[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [presentMap, setPresentMap] = useState<Record<number, boolean>>({});
  const [reportDate, setReportDate] = useState<Dayjs | null>(null);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    const load = async () => {
      try {
        const g = await celulasService.getCelulas();
        setGroups(g);
        // If user only has one célula (group), select it automatically
        if (Array.isArray(g) && g.length === 1) {
          setSelectedGroup(g[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  // Função auxiliar para calcular datas válidas
  const getValidDates = (celula: Celula | undefined): Dayjs[] => {
    if (!celula || celula.weekday === null || celula.weekday === undefined) {
      return []; // Sem restrição se não tiver dia da semana
    }

    const dates: Dayjs[] = [];
    const today = dayjs();
    
    // Gerar 52 ocorrências passadas
    for (let i = 1; i <= 52; i++) {
      let date = today.subtract(i, 'week');
      const currentWeekday = date.day();
      const targetWeekday = celula.weekday;
      const diff = targetWeekday - currentWeekday;
      date = date.add(diff, 'day');
      dates.unshift(date); // Adicionar no início para manter ordem cronológica
    }
    
    // Gerar próximas 52 ocorrências (futuras + hoje)
    for (let i = 0; i < 52; i++) {
      let date = today.add(i, 'week');
      const currentWeekday = date.day();
      const targetWeekday = celula.weekday;
      const diff = targetWeekday - currentWeekday;
      date = date.add(diff, 'day');
      dates.push(date);
    }
    
    return dates;
  };

  // Atualizar data selecionada quando a célula mudar
  useEffect(() => {
    if (selectedGroup === null) {
      setReportDate(null);
      return;
    }

    const celula = groups.find(g => g.id === selectedGroup);
    if (!celula || celula.weekday === null || celula.weekday === undefined) {
      // Se não tem dia da semana definido, usar data de hoje
      setReportDate(dayjs());
      return;
    }

    const validDates = getValidDates(celula);
    const today = dayjs();

    // Verificar se hoje é uma data válida
    const todayIsValid = validDates.some(d => d.isSame(today, 'day'));

    if (todayIsValid) {
      setReportDate(today);
    } else if (validDates.length > 0) {
      // Selecionar a próxima data válida
      const nextValidDate = validDates.find(d => d.isAfter(today, 'day'));
      setReportDate(nextValidDate || validDates[0]);
    } else {
      setReportDate(today);
    }
  }, [selectedGroup, groups]);

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

  const reloadMembers = async () => {
    if (selectedGroup === null) return;
    try {
      const m = await membersService.getMembers(selectedGroup);
      setMembers(m);
    } catch (e) {
      console.error(e);
      toast.error('Falha ao carregar membros');
    }
  };

  useEffect(() => {
    if (selectedGroup === null) return;
    const loadMembers = async () => {
      try {
        const m = await membersService.getMembers(selectedGroup);
        setMembers(m);
        const map: Record<number, boolean> = {};
        m.forEach((mm: Member) => { map[mm.id] = false; });
        setPresentMap(map);
      } catch (e) {
        console.error(e);
      }
    };
    loadMembers();
  }, [selectedGroup]);

  const togglePresent = (memberId: number) => {
    setPresentMap((prev) => ({ ...prev, [memberId]: !prev[memberId] }));
  };

  const submit = async () => {
    if (!selectedGroup) return toast.error('Selecione uma célula');
    if (!reportDate) return toast.error('Selecione uma data');
    const memberIds = members.filter((m) => !!presentMap[m.id]).map((m) => m.id);
    if (memberIds.length === 0) return toast.error('Marque pelo menos um membro presente');
    try {
      await reportsService.createReport(selectedGroup, {
        memberIds,
        date: reportDate.format('YYYY-MM-DD')
      });
      toast.success('Relatório enviado');
    } catch (e) {
      console.error(e);
      toast.error('Falha ao enviar');
    }
  };

  const handleSaveMember = async (data: Partial<Member>) => {
    try {
      await membersService.addMember(selectedGroup, data as Partial<Member> & { name: string });
      toast.success('Membro adicionado com sucesso');
      setIsAddMemberModalOpen(false);
      await reloadMembers();
    } catch (e) {
      console.error(e);
      toast.error('Falha ao adicionar membro');
    }
  };

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
      <h2 className="text-2xl font-semibold mb-4">Relatório de Presença</h2>

      <ThemeProvider theme={muiTheme}>
        <div className="mb-4">
          <FormControl fullWidth>
            <InputLabel id="group-select-label">Selecione a célula</InputLabel>
            <Select
              labelId='group-select-label'
              value={selectedGroup ?? ''}
              label="Selecione a célula"
              onChange={(e) => setSelectedGroup(e.target.value ? Number(e.target.value) : null)}
            >
              {groups.map((g) => (
                <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>

        <div className="mb-4 max-w-xs">
          <label className="block text-sm font-medium mb-1">Data do relatório</label>
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
            <DatePicker
              value={reportDate}
              onChange={(newValue: Dayjs | null) => setReportDate(newValue)}
              format="DD/MM/YYYY"
              shouldDisableDate={(date) => {
                const celula = groups.find(g => g.id === selectedGroup);
                if (!celula || celula.weekday === null || celula.weekday === undefined) {
                  return false; // Sem restrição
                }
                const validDates = getValidDates(celula);
                return !validDates.some(d => d.isSame(date, 'day'));
              }}
              localeText={{
                toolbarTitle: 'Selecionar data',
                cancelButtonLabel: 'Cancelar',
                okButtonLabel: 'OK',
              }}
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: 'small',
                },
              }}
            />
          </LocalizationProvider>
        </div>
      </ThemeProvider>

      {members.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">Membros</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setIsAddMemberModalOpen(true)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                title="Adicionar membro"
                aria-label="Adicionar membro"
              >
                <FiPlus className="h-5 w-5 text-blue-600" aria-hidden />
              </button>
              {selectedGroup && (
                <Link href={`/celulas/${selectedGroup}/presence?from=report`} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Acompanhamento">
                  <LuHistory className="h-5 w-5 text-teal-600" aria-hidden />
                </Link>
              )}
            </div>
          </div>
          <ul className="space-y-2">
            {members.map((m) => {
              const selected = !!presentMap[m.id];
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => togglePresent(m.id)}
                    className={`w-full text-left flex items-center justify-between p-3 rounded-lg border transition-colors ${selected ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700'} hover:shadow-sm`}
                    aria-pressed={selected}
                  >
                    <span className="truncate">{m.name}</span>
                    <span className="sr-only">{selected ? 'Selecionado' : 'Não selecionado'}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div>
        <button onClick={submit} className="px-4 py-2 bg-blue-600 text-white rounded">Enviar</button>
      </div>

      <MemberModal
        member={null}
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        onSave={handleSaveMember}
        celulas={groups}
        initialCelulaId={selectedGroup}
      />
    </div>
  );
}
