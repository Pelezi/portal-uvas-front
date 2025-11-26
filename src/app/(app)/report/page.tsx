"use client";

import React, { useEffect, useState } from 'react';
import { celulasService } from '@/services/celulasService';
import { membersService } from '@/services/membersService';
import { reportsService } from '@/services/reportsService';
import { Celula, Member } from '@/types';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { LuHistory } from 'react-icons/lu';
import { createTheme, FormControl, InputLabel, MenuItem, Select, ThemeProvider } from '@mui/material';

export default function ReportPage() {
  const [groups, setGroups] = useState<Celula[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [presentMap, setPresentMap] = useState<Record<number, boolean>>({});
  const [reportDate, setReportDate] = useState<string>(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

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
    const memberIds = members.filter((m) => !!presentMap[m.id]).map((m) => m.id);
    if (memberIds.length === 0) return toast.error('Marque pelo menos um membro presente');
    try {
      await reportsService.createReport(selectedGroup, { memberIds, date: reportDate });
      toast.success('Relatório enviado');
    } catch (e) {
      console.error(e);
      toast.error('Falha ao enviar');
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

      <div className="mb-4">
        <ThemeProvider theme={muiTheme}>
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
        </ThemeProvider>
      </div>

      <div className="mb-4 max-w-xs">
        <label className="block text-sm font-medium mb-1">Data do relatório</label>
        <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800" />
      </div>

      {members.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">Membros</h3>
            {selectedGroup && (
              <Link href={`/celulas/${selectedGroup}/presence?from=report`} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Acompanhamento">
                <LuHistory className="h-4 w-4 text-teal-600" aria-hidden />
              </Link>
            )}
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
    </div>
  );
}
