"use client";

import React, { useEffect, useState } from 'react';
import { celulasService } from '@/services/celulasService';
import { reportsService } from '@/services/reportsService';
import { Celula, Member } from '@/types';
import toast from 'react-hot-toast';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/pt-br';
import { createTheme, ThemeProvider } from '@mui/material';
import { CheckCircle, XCircle, User } from 'lucide-react';

interface ReportData {
  date: string;
  attendees: Member[];
}

interface MonthReportData {
  date: string;
  present: Member[];
  absent: Member[];
}

export default function ViewReportPage() {
  const [groups, setGroups] = useState<Celula[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<Dayjs | null>(dayjs());
  const [reports, setReports] = useState<MonthReportData[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const muiTheme = createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
    },
  });

  useEffect(() => {
    const load = async () => {
      try {
        const g = await celulasService.getCelulas();
        setGroups(g);
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
    if (!selectedGroup || !selectedMonth) {
      setReports([]);
      return;
    }

    const loadReports = async () => {
      setIsLoading(true);
      try {
        const monthData = await reportsService.getReportsByMonth(
          selectedGroup, 
          selectedMonth.year(), 
          selectedMonth.month() + 1
        );
        setReports(monthData.reports);
        setAllMembers(monthData.allMembers);
      } catch (error) {
        console.error('Erro ao carregar relatórios:', error);
        toast.error('Erro ao carregar relatórios');
        setReports([]);
        setAllMembers([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadReports();
  }, [selectedGroup, selectedMonth]);

  const getMinistryTypeLabel = (type: string | null | undefined): string => {
    if (!type) return 'Não definido';
    const labels: Record<string, string> = {
      PRESIDENT_PASTOR: 'Pastor Presidente',
      PASTOR: 'Pastor',
      DISCIPULADOR: 'Discipulador',
      LEADER: 'Líder',
      LEADER_IN_TRAINING: 'Líder em Treinamento',
      MEMBER: 'Membro',
      REGULAR_ATTENDEE: 'Frequentador',
      VISITOR: 'Visitante',
    };
    return labels[type] || type;
  };

  const getMemberMinistryType = (member: Member): string => {
    return member.ministryPosition?.type || 'Não definido';
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
      <ThemeProvider theme={muiTheme}>
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Visualizar Relatórios
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Visualize os relatórios de presença por mês
            </p>
          </div>

          {/* Filtros */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Seleção de Célula */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Célula/Discipulado
                </label>
                <select
                  value={selectedGroup || ''}
                  onChange={(e) => setSelectedGroup(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Selecione uma célula/discipulado</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Seleção de Mês */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mês
                </label>
                <DatePicker
                  views={['month', 'year']}
                  value={selectedMonth}
                  onChange={(newValue) => setSelectedMonth(newValue)}
                  format="MMMM/YYYY"
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      variant: 'outlined',
                    },
                  }}
                />
              </div>
            </div>
          </div>

          {/* Resultados */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Carregando relatórios...</p>
            </div>
          ) : reports.length === 0 && selectedGroup ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                Nenhum relatório encontrado para este mês
              </p>
            </div>
          ) : reports.length > 0 ? (
            <div className="space-y-4">
              {reports.map((report, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    {dayjs(report.date).format('DD/MM/YYYY - dddd')}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Presentes */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="text-green-500" size={20} />
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">
                          Presentes ({report.present.length})
                        </h4>
                      </div>
                      <div className="space-y-2">
                        {report.present.length === 0 ? (
                          <p className="text-gray-500 dark:text-gray-400 text-sm">
                            Nenhum membro presente
                          </p>
                        ) : (
                          report.present.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg"
                            >
                              <User size={16} className="text-green-600 dark:text-green-400" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {member.name}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  {getMinistryTypeLabel(getMemberMinistryType(member))}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Ausentes */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <XCircle className="text-red-500" size={20} />
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">
                          Ausentes ({report.absent.length})
                        </h4>
                      </div>
                      <div className="space-y-2">
                        {report.absent.length === 0 ? (
                          <p className="text-gray-500 dark:text-gray-400 text-sm">
                            Todos presentes
                          </p>
                        ) : (
                          report.absent.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg"
                            >
                              <User size={16} className="text-red-600 dark:text-red-400" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {member.name}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  {getMinistryTypeLabel(getMemberMinistryType(member))}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </ThemeProvider>
    </LocalizationProvider>
  );
}
