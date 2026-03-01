"use client";

import React, { useEffect, useState } from 'react';
import { celulasService } from '@/services/celulasService';
import { redesService } from '@/services/redesService';
import { congregacoesService } from '@/services/congregacoesService';
import { discipuladosService } from '@/services/discipuladosService';
import { reportsService } from '@/services/reportsService';
import { Celula, Member, Rede, Discipulado, Congregacao } from '@/types';
import toast from 'react-hot-toast';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/pt-br';
import { createTheme, ThemeProvider } from '@mui/material';
import { CheckCircle, XCircle, Download, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { FaFilter, FaFilterCircleXmark } from "react-icons/fa6";
import FilterModal, { FilterConfig } from '@/components/FilterModal';

interface ReportData {
  date: string;
  present: Member[];
  absent: Member[];
  hasReport?: boolean;
  isStandardDay?: boolean;
  offerAmount?: number;
  type?: 'CELULA' | 'CULTO';
}

interface CelulaReportData {
  celula: {
    id: number;
    name: string;
    weekday: number | null;
    time: string | null;
    discipulado: any;
  };
  reports: ReportData[];
  allMembers: Member[];
}

type FilterType = 'celula' | 'discipulado' | 'rede';

export default function ViewReportPage() {
  const { user, isLoading: authLoading } = useAuth();
  
  // Listas de opções
  const [congregacoes, setCongregacoes] = useState<Congregacao[]>([]);
  const [redes, setRedes] = useState<Rede[]>([]);
  const [discipulados, setDiscipulados] = useState<Discipulado[]>([]);
  const [celulas, setCelulas] = useState<Celula[]>([]);
  
  // Filtros selecionados
  const [selectedCongregacaoId, setSelectedCongregacaoId] = useState<number | null>(null);
  const [selectedRedeId, setSelectedRedeId] = useState<number | null>(null);
  const [selectedDiscipuladoId, setSelectedDiscipuladoId] = useState<number | null>(null);
  const [selectedCelulaId, setSelectedCelulaId] = useState<number | null>(null);
  const [selectedReportType, setSelectedReportType] = useState< 'CELULA' | 'CULTO'>('CELULA');
  const [filterMyCells, setFilterMyCells] = useState(true);
  
  const [selectedMonth, setSelectedMonth] = useState<Dayjs | null>(dayjs());
  const [celulasData, setCelulasData] = useState<CelulaReportData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filter modal state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const muiTheme = createTheme({
    palette: {
      mode: 'dark',
    },
  });

  const isAdminOrPresident = () => {
    const permission = user?.permission;
    return permission?.isAdmin || permission?.ministryType === 'PRESIDENT_PASTOR';
  };

  // Carregar dados iniciais para filtros
  useEffect(() => {
    const loadFilterData = async () => {
      if (authLoading) return;
      try {
        const useAll = isAdminOrPresident();
        const [congregacoesData, redesData, discipuladosData, celulasData] = await Promise.all([
          congregacoesService.getCongregacoes(useAll ? { all: true } : undefined),
          redesService.getRedes(useAll ? { all: true } : {}),
          discipuladosService.getDiscipulados(useAll ? { all: true } : undefined),
          celulasService.getCelulas(useAll ? { all: true } : undefined)
        ]);

        setCongregacoes(congregacoesData);
        setRedes(redesData);
        setDiscipulados(discipuladosData);
        setCelulas(celulasData);
      } catch (e) {
        console.error(e);
        toast.error('Erro ao carregar dados');
      }
    };
    loadFilterData();
  }, [user, authLoading]);

  // Filtrar opções de dropdown com base na seleção hierárquica
  const getFilteredRedes = () => {
    if (selectedCongregacaoId) {
      return redes.filter(r => r.congregacaoId === selectedCongregacaoId);
    }
    return redes;
  };

  const getFilteredDiscipulados = () => {
    if (selectedRedeId) {
      return discipulados.filter(d => d.redeId === selectedRedeId);
    }
    if (selectedCongregacaoId) {
      const redeIdsInCongregacao = redes.filter(r => r.congregacaoId === selectedCongregacaoId).map(r => r.id);
      return discipulados.filter(d => redeIdsInCongregacao.includes(d.redeId));
    }
    return discipulados;
  };

  const getFilteredCelulas = () => {
    if (selectedDiscipuladoId) {
      return celulas.filter(c => c.discipuladoId === selectedDiscipuladoId);
    }
    if (selectedRedeId) {
      const discipuladoIdsInRede = discipulados
        .filter(d => d.redeId === selectedRedeId)
        .map(d => d.id);
      return celulas.filter(c => c.discipuladoId && discipuladoIdsInRede.includes(c.discipuladoId));
    }
    if (selectedCongregacaoId) {
      const redeIdsInCongregacao = redes.filter(r => r.congregacaoId === selectedCongregacaoId).map(r => r.id);
      const discipuladoIdsInRedes = discipulados.filter(d => redeIdsInCongregacao.includes(d.redeId)).map(d => d.id);
      return celulas.filter(c => c.discipuladoId && discipuladoIdsInRedes.includes(c.discipuladoId));
    }
    return celulas;
  };

  const filteredRedes = getFilteredRedes();
  const filteredDiscipulados = getFilteredDiscipulados();
  const filteredCelulas = getFilteredCelulas();

  // Carregar relatórios quando filtros mudam
  useEffect(() => {
    if (!selectedMonth) {
      setCelulasData([]);
      return;
    }

    const loadReports = async () => {
      setIsLoading(true);
      try {
        const year = selectedMonth.year();
        const month = selectedMonth.month() + 1;

        let filters: { congregacaoId?: number; redeId?: number; discipuladoId?: number; celulaId?: number; all?: boolean } = {};

        // Se "Minhas células" estiver desativado, trazer todas
        if (!filterMyCells) {
          filters.all = true;
        }

        // Aplicar filtros na ordem de prioridade: célula > discipulado > rede > congregação
        if (selectedCelulaId) {
          filters.celulaId = selectedCelulaId;
        } else if (selectedDiscipuladoId) {
          filters.discipuladoId = selectedDiscipuladoId;
        } else if (selectedRedeId) {
          filters.redeId = selectedRedeId;
        } else if (selectedCongregacaoId) {
          filters.congregacaoId = selectedCongregacaoId;
        }

        const data = await reportsService.getReportsByFilter(year, month, filters);
        setCelulasData(data.celulas);
      } catch (error) {
        console.error('Erro ao carregar relatórios:', error);
        toast.error('Erro ao carregar relatórios');
        setCelulasData([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadReports();
  }, [selectedCongregacaoId, selectedRedeId, selectedDiscipuladoId, selectedCelulaId, selectedMonth, filterMyCells]);

  // Atualizar rede, discipulado e célula quando congregação muda
  const handleCongregacaoChange = (congregacaoId: number | null) => {
    setSelectedCongregacaoId(congregacaoId);
    setSelectedRedeId(null);
    setSelectedDiscipuladoId(null);
    setSelectedCelulaId(null);
  };

  // Atualizar discipulado e célula quando rede muda
  const handleRedeChange = (redeId: number | null) => {
    setSelectedRedeId(redeId);
    if (!redeId || !selectedDiscipuladoId || !filteredDiscipulados.find(d => d.id === selectedDiscipuladoId && d.redeId === redeId)) {
      setSelectedDiscipuladoId(null);
      setSelectedCelulaId(null);
    }
  };

  // Atualizar célula quando discipulado muda
  const handleDiscipuladoChange = (discipuladoId: number | null) => {
    setSelectedDiscipuladoId(discipuladoId);
    if (!discipuladoId || !selectedCelulaId) {
      setSelectedCelulaId(null);
    }
  };

  // Atualizar célula
  const handleCelulaChange = (celulaId: number | null) => {
    setSelectedCelulaId(celulaId);
  };

  // Verificar filtros ativos
  const hasActiveFilters = selectedCongregacaoId !== null || selectedRedeId !== null || selectedDiscipuladoId !== null || selectedCelulaId !== null || (isAdminOrPresident() && filterMyCells) || selectedReportType !== 'CELULA';

  const clearAllFilters = () => {
    // Apenas limpar filterMyCells se o usuário for admin ou presidente
    if (isAdminOrPresident()) {
      setFilterMyCells(false);
    }
    setSelectedCongregacaoId(null);
    setSelectedRedeId(null);
    setSelectedDiscipuladoId(null);
    setSelectedCelulaId(null);
    setSelectedReportType('CELULA');
  };

  // Configuração dos filtros para o FilterModal
  const filterConfigs: FilterConfig[] = [
    // Switch de Minhas células / Todas as células apenas para admin/presidente
    ...(isAdminOrPresident() ? [{
      type: 'switch' as const,
      label: '',
      value: filterMyCells,
      onChange: setFilterMyCells,
      switchLabelOff: 'Todas as células',
      switchLabelOn: 'Minhas células'
    }] : []),
    {
      type: 'select',
      label: 'Tipo de Relatório',
      value: selectedReportType,
      onChange: (val: any) => setSelectedReportType(val || 'CELULA'),
      hideAllOption: true,
      options: [
        { value: 'CELULA', label: 'Célula' },
        { value: 'CULTO', label: 'Culto' },
      ]
    },
    {
      type: 'select',
      label: 'Mês',
      value: selectedMonth,
      onChange: () => {},
      renderCustom: () => (
        <ThemeProvider theme={muiTheme}>
          <DatePicker
            views={['month', 'year']}
            value={selectedMonth}
            onChange={(newValue) => setSelectedMonth(newValue)}
            format="MMMM/YYYY"
            slotProps={{
              textField: {
                fullWidth: true,
                variant: 'outlined',
                size: 'small',
              },
            }}
          />
        </ThemeProvider>
      )
    },
    {
      type: 'select',
      label: 'Congregação',
      value: selectedCongregacaoId,
      onChange: (val: any) => handleCongregacaoChange(val),
      options: congregacoes.map(c => ({ value: c.id, label: c.name }))
    },
    {
      type: 'select',
      label: 'Rede',
      value: selectedRedeId,
      onChange: (val: any) => handleRedeChange(val),
      options: filteredRedes.map(r => ({ value: r.id, label: r.name }))
    },
    {
      type: 'select',
      label: 'Discipulado',
      value: selectedDiscipuladoId,
      onChange: (val: any) => handleDiscipuladoChange(val),
      options: filteredDiscipulados.map(d => ({ value: d.id, label: d.discipulador?.name ? `Discipulado de ${d.discipulador.name}` : 'Sem discipulador' }))
    },
    {
      type: 'select',
      label: 'Célula',
      value: selectedCelulaId,
      onChange: (val: any) => handleCelulaChange(val),
      options: filteredCelulas.map(c => ({ value: c.id, label: c.name }))
    },
  ];

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

  const getDayLabel = (weekday: number | null): string => {
    if (weekday === null) return '';
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return days[weekday] || '';
  };

  const wasMemberPresent = (memberId: number, celulaReports: ReportData[], date: string): boolean | null => {
    const report = celulaReports.find(r => dayjs(r.date).format('YYYY-MM-DD') === date);
    if (!report || !report.hasReport) return null;
    
    const isPresent = report.present?.some(m => m.id === memberId) || false;
    const isAbsent = report.absent?.some(m => m.id === memberId) || false;
    
    if (isPresent) return true;
    if (isAbsent) return false;
    return null; // Membro não estava na lista (pode não fazer parte da célula ainda)
  };

  const downloadCSV = () => {
    if (celulasData.length === 0) {
      toast.error('Não há dados para exportar');
      return;
    }

    let csv = '\uFEFF'; // BOM para UTF-8
    
    celulasData.forEach((celulaData, idx) => {
      if (idx > 0) csv += '\n\n';
      
      csv += `Célula: ${celulaData.celula.name}\n`;
      csv += `Rede: ${celulaData.celula.discipulado.rede.name}\n`;
      csv += `Discipulado: ${celulaData.celula.discipulado.discipulador.name}\n`;
      csv += `Dia: ${getDayLabel(celulaData.celula.weekday)} ${celulaData.celula.time || ''}\n\n`;
      
      // Cabeçalho
      csv += 'Membro;Tipo';
      celulaData.reports.forEach(report => {
        const dateStr = dayjs(report.date).format('DD/MM');
        const dayStr = getDayLabel(new Date(report.date).getDay());
        const warning = report.isStandardDay === false ? ' ⚠' : '';
        csv += `;${dateStr} (${dayStr})${warning}`;
      });
      csv += '\n';

      // Dados
      celulaData.allMembers.forEach(member => {
        csv += `${member.name};${getMinistryTypeLabel(getMemberMinistryType(member))}`;
        celulaData.reports.forEach(report => {
          if (!report.hasReport) {
            csv += `;-`;
          } else {
            const dateStr = dayjs(report.date).format('YYYY-MM-DD');
            const isPresent = wasMemberPresent(member.id, celulaData.reports, dateStr);
            csv += `;${isPresent ? 'Presente' : 'Ausente'}`;
          }
        });
        csv += '\n';
      });

      // Adicionar linha de ofertas se houver alguma
      const hasOffers = celulaData.reports.some(r => r.offerAmount !== undefined && r.offerAmount !== null);
      if (hasOffers) {
        csv += '\n';
        csv += 'Oferta;;';
        celulaData.reports.forEach(report => {
          if (report.offerAmount !== undefined && report.offerAmount !== null) {
            csv += `R$ ${report.offerAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          } else {
            csv += '-';
          }
          csv += ';';
        });
        csv += '\n';
        const totalOffers = celulaData.reports
          .filter(r => r.hasReport && r.offerAmount)
          .reduce((sum, r) => sum + (r.offerAmount || 0), 0);
        csv += `Total de Ofertas: R$ ${totalOffers.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
      }
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_${selectedMonth?.format('YYYY-MM')}.csv`;
    link.click();
    toast.success('CSV baixado com sucesso');
  };

  const downloadXLSX = async () => {
    if (celulasData.length === 0) {
      toast.error('Não há dados para exportar');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    
    celulasData.forEach((celulaData) => {
      const sheetName = celulaData.celula.name.substring(0, 31); // Excel limit
      const worksheet = workbook.addWorksheet(sheetName);
      
      // Título
      worksheet.mergeCells('A1:' + String.fromCharCode(65 + 1 + celulaData.reports.length) + '1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = `Relatório de Presença - ${celulaData.celula.name}`;
      titleCell.font = { bold: true, size: 14 };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF3B82F6' }
      };
      titleCell.font = { ...titleCell.font, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).height = 25;
      
      // Informações da célula
      let infoRow = 2;
      if (celulaData.celula.discipulado?.rede?.name) {
        worksheet.getCell(`A${infoRow}`).value = `Rede: ${celulaData.celula.discipulado.rede.name}`;
        worksheet.getCell(`A${infoRow}`).font = { bold: true };
        infoRow++;
      }
      if (celulaData.celula.discipulado?.discipulador?.name) {
        worksheet.getCell(`A${infoRow}`).value = `Discipulado: ${celulaData.celula.discipulado.discipulador.name}`;
        worksheet.getCell(`A${infoRow}`).font = { bold: true };
        infoRow++;
      }
      worksheet.getCell(`A${infoRow}`).value = `Dia: ${getDayLabel(celulaData.celula.weekday)} às ${celulaData.celula.time || 'N/D'}`;
      worksheet.getCell(`A${infoRow}`).font = { bold: true };
      infoRow++;
      worksheet.getCell(`A${infoRow}`).value = `Período: ${selectedMonth?.locale('pt-br').format('MMMM [de] YYYY')}`;
      worksheet.getCell(`A${infoRow}`).font = { bold: true };
      infoRow += 2;
      
      // Cabeçalho da tabela
      const headerRow = worksheet.getRow(infoRow);
      const headerValues = ['Membro', 'Tipo', ...celulaData.reports.map(r => {
        const dateDay = `${dayjs(r.date).format('DD/MM')} (${getDayLabel(new Date(r.date).getDay())})`;
        return r.isStandardDay === false ? `${dateDay}\nFora do dia padrão` : dateDay;
      })];
      
      // Aplicar valores e estilos apenas nas células com dados
      headerValues.forEach((value, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = value;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF3B82F6' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      });
      
      const hasNonStandardDay = celulaData.reports.some(r => r.isStandardDay === false);
      headerRow.height = hasNonStandardDay ? 35 : 20;
      
      // Dados
      celulaData.allMembers.forEach((member, idx) => {
        const row = worksheet.getRow(infoRow + 1 + idx);
        const rowData = [
          member.name,
          getMinistryTypeLabel(getMemberMinistryType(member)),
          ...celulaData.reports.map(report => {
            const dateStr = dayjs(report.date).format('YYYY-MM-DD');
            const isPresent = wasMemberPresent(member.id, celulaData.reports, dateStr);
            if (isPresent === null) return '-';
            return isPresent ? '✓' : '✗';
          })
        ];
        row.values = rowData;
        
        // Estilo das linhas
        row.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
          };
          
          if (colNumber > 2) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            const value = cell.value as string;
            if (value === '✓') {
              cell.font = { bold: true, color: { argb: 'FF22C55E' } };
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFDCFCE7' }
              };
            } else if (value === '✗') {
              cell.font = { color: { argb: 'FFEF4444' } };
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFECACA' }
              };
            } else if (value === '-') {
              cell.font = { color: { argb: 'FFD97706' } };
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFEF3C7' }
              };
            }
          }
        });
      });
      
      // Adicionar linha de ofertas se houver alguma
      const hasOffers = celulaData.reports.some(r => r.offerAmount !== undefined && r.offerAmount !== null);
      if (hasOffers) {
        const offerRowIndex = infoRow + 1 + celulaData.allMembers.length + 1;
        const offerRow = worksheet.getRow(offerRowIndex);
        const offerData = [
          'Oferta',
          '',
          ...celulaData.reports.map(report => {
            if (report.offerAmount !== undefined && report.offerAmount !== null) {
              return `R$ ${report.offerAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            }
            return '-';
          })
        ];
        offerRow.values = offerData;
        offerRow.font = { bold: true };
        offerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF3F4F6' }
        };
        offerRow.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
          };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        // Total de ofertas
        const totalOffers = celulaData.reports
          .filter(r => r.hasReport && r.offerAmount)
          .reduce((sum, r) => sum + (r.offerAmount || 0), 0);
        const totalRow = worksheet.getRow(offerRowIndex + 1);
        totalRow.getCell(1).value = 'Total de Ofertas:';
        totalRow.getCell(2).value = `R$ ${totalOffers.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        totalRow.font = { bold: true, color: { argb: 'FF22C55E' } };
      }
      
      // Ajustar largura das colunas
      worksheet.getColumn(1).width = 30;
      worksheet.getColumn(2).width = 20;
      for (let i = 3; i <= 2 + celulaData.reports.length; i++) {
        worksheet.getColumn(i).width = 12;
      }
    });
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_${selectedMonth?.format('YYYY-MM')}.xlsx`;
    link.click();
    toast.success('XLSX baixado com sucesso');
  };

  const downloadPDF = () => {
    if (celulasData.length === 0) {
      toast.error('Não há dados para exportar');
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    celulasData.forEach((celulaData, idx) => {
      if (idx > 0) doc.addPage();

      // Cabeçalho principal com fundo azul
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, pageWidth, 25, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(`Relatório de Presença`, pageWidth / 2, 10, { align: 'center' });
      
      doc.setFontSize(14);
      doc.text(celulaData.celula.name, pageWidth / 2, 18, { align: 'center' });
      
      // Box de informações da célula
      doc.setTextColor(0, 0, 0);
      let yPos = 32;
      
      // Linha 1: Rede e Discipulado
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      const infoLine1: string[] = [];
      
      if (celulaData.celula.discipulado.rede.name) {
        infoLine1.push(`Rede: ${celulaData.celula.discipulado.rede.name}`);
      }
      
      if (celulaData.celula.discipulado.discipulador.name) {
        infoLine1.push(`Discipulado: ${celulaData.celula.discipulado.discipulador.name}`);
      }
      
      if (infoLine1.length > 0) {
        doc.text(infoLine1.join('  |  '), pageWidth / 2, yPos, { align: 'center' });
        yPos += 6;
      }
      
      // Linha 2: Dia/Horário e Período
      const infoLine2: string[] = [];
      infoLine2.push(`${getDayLabel(celulaData.celula.weekday)} às ${celulaData.celula.time || 'N/D'}`);
      infoLine2.push(`Período: ${selectedMonth?.locale('pt-br').format('MMMM [de] YYYY')}`);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(64, 64, 64);
      doc.text(infoLine2.join('  |  '), pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      // Tabela de presença geral
      const headers = ['Membro', 'Tipo', ...celulaData.reports.map(r => {
        const dateDay = `${dayjs(r.date).format('DD/MM')}\n${getDayLabel(new Date(r.date).getDay())}`;
        return r.isStandardDay === false ? `${dateDay}\nFora do dia padrão` : dateDay;
      })];
      
      const data = celulaData.allMembers.map(member => [
        member.name,
        getMinistryTypeLabel(getMemberMinistryType(member)),
        ...celulaData.reports.map(report => {
          const dateStr = dayjs(report.date).format('YYYY-MM-DD');
          const isPresent = wasMemberPresent(member.id, celulaData.reports, dateStr);
          if (isPresent === null) return '-';
          return isPresent ? 'P' : 'F';
        })
      ]);

      autoTable(doc, {
        head: [headers],
        body: data,
        startY: yPos,
        styles: { 
          fontSize: 8, 
          cellPadding: 1.5, 
          halign: 'center',
          overflow: 'linebreak'
        },
        headStyles: { 
          fillColor: [59, 130, 246], 
          textColor: 255, 
          fontStyle: 'bold', 
          halign: 'center',
          minCellHeight: 8
        },
        columnStyles: {
          0: { cellWidth: 35, halign: 'left' },
          1: { cellWidth: 25, halign: 'left' },
        },
        margin: { top: 30, right: 10, bottom: 20, left: 10 },
        showHead: 'everyPage',
        didDrawPage: (hookData: any) => {
          // Se não for a primeira página, adicionar cabeçalho reduzido
          if (hookData.pageNumber > 1) {
            doc.setFillColor(59, 130, 246);
            doc.rect(0, 0, pageWidth, 20, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`${celulaData.celula.name} - Continuação`, pageWidth / 2, 10, { align: 'center' });
            
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`Página ${hookData.pageNumber}`, pageWidth / 2, 16, { align: 'center' });
          }
          
          // Resetar cor do texto
          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'normal');
        },
        didDrawCell: (data: any) => {
          if (data.section === 'body' && data.column.index >= 2) {
            const cellValue = data.cell.raw;
            if (cellValue === 'P') {
              doc.setTextColor(255, 255, 255); // white text
              doc.setFillColor(34, 197, 94); // green background
              doc.setFont('helvetica', 'bold');
              const cell = data.cell;
              doc.rect(cell.x, cell.y, cell.width, cell.height, 'F');
              doc.text('P', cell.x + cell.width / 2, cell.y + cell.height / 2 + 1, { align: 'center' });
            } else if (cellValue === 'F') {
              doc.setTextColor(255, 255, 255); // white text
              doc.setFillColor(239, 68, 68); // red background
              doc.setFont('helvetica', 'bold');
              const cell = data.cell;
              doc.rect(cell.x, cell.y, cell.width, cell.height, 'F');
              doc.text('F', cell.x + cell.width / 2, cell.y + cell.height / 2 + 1, { align: 'center' });
            }
          }
        }
      });

      // Adicionar informações de ofertas se houver
      const hasOffers = celulaData.reports.some(r => r.offerAmount !== undefined && r.offerAmount !== null);
      if (hasOffers) {
        const finalY = (doc as any).lastAutoTable.finalY || yPos;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Ofertas:', 10, finalY + 10);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        let offerY = finalY + 16;
        
        celulaData.reports.forEach((report, idx) => {
          if (report.offerAmount !== undefined && report.offerAmount !== null) {
            const dateStr = dayjs(report.date).format('DD/MM/YYYY');
            const offerValue = `R$ ${report.offerAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            doc.text(`${dateStr}: ${offerValue}`, 15, offerY);
            offerY += 5;
          }
        });
        
        // Total de ofertas
        const totalOffers = celulaData.reports
          .filter(r => r.hasReport && r.offerAmount)
          .reduce((sum, r) => sum + (r.offerAmount || 0), 0);
        
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(34, 197, 94); // verde
        doc.text(
          `Total de Ofertas: R$ ${totalOffers.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
          10, 
          offerY + 3
        );
      }
    });

    doc.save(`relatorio_${selectedMonth?.format('YYYY-MM')}.pdf`);
    toast.success('PDF baixado com sucesso');
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
      <ThemeProvider theme={muiTheme}>
        <div className="max-w-[95%] mx-auto p-6 space-y-6">
          {/* Título */}
          <div>
            <h1 className="text-2xl font-bold text-gray-100">
              Visualizar Relatórios
            </h1>
            <p className="text-gray-400 mt-1"></p>
          </div>

          {/* Barra de filtros: Mês + botão Filtros + limpar filtros */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Mês (fora do modal) */}
            <div className="w-56">
              <DatePicker
                views={['month', 'year']}
                value={selectedMonth}
                onChange={(newValue) => setSelectedMonth(newValue)}
                format="MMMM/YYYY"
                slotProps={{
                  textField: {
                    fullWidth: true,
                    variant: 'outlined',
                    size: 'small',
                  },
                }}
              />
            </div>

            {/* Botão Filtros */}
            <button
              onClick={() => setIsFilterModalOpen(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${hasActiveFilters
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
              title="Filtros"
            >
              <FaFilter className="h-5 w-5" />
              <span>Filtros</span>
              {hasActiveFilters && (
                <span className="bg-white text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                  {[selectedCongregacaoId, selectedRedeId, selectedDiscipuladoId, selectedCelulaId].filter(f => f !== null).length 
                    + (isAdminOrPresident() && filterMyCells ? 1 : 0)
                    + (selectedReportType !== 'CELULA' ? 1 : 0)}
                </span>
              )}
            </button>

            {/* Limpar filtros */}
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                title="Limpar filtros"
              >
                <FaFilterCircleXmark className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Botões de download abaixo dos filtros */}
          {celulasData.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={downloadXLSX}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <FileSpreadsheet size={18} />
                Baixar Planilha
              </button>
              <button
                onClick={downloadPDF}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download size={18} />
                Baixar PDF
              </button>
            </div>
          )}

          {/* Resultados */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <p className="mt-4 text-gray-400">Carregando relatórios...</p>
            </div>
          ) : celulasData.length === 0 ? (
            <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-12 text-center">
              <p className="text-gray-400">
                Nenhum relatório encontrado para os filtros selecionados
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {celulasData.map((celulaData) => {
                // Filtrar relatórios por tipo
                const filteredReports = celulaData.reports.filter(r => r.type === selectedReportType || !r.hasReport);

                const filteredCelulaData = { ...celulaData, reports: filteredReports };

                // Calcular se tem pelo menos 1 relatório preenchido
                const hasAnyReport = filteredReports.some(r => r.hasReport);

                return (
                <div key={celulaData.celula.id} className="bg-gray-800 rounded-lg shadow-sm border border-gray-700">
                  {/* Header da célula */}
                  <div className="px-6 py-4 border-b border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-gray-100">
                          {filteredCelulaData.celula.name}
                        </h2>
                        <p className="text-sm text-gray-400">
                          {getDayLabel(filteredCelulaData.celula.weekday)} {filteredCelulaData.celula.time || ''}
                        </p>
                      </div>
                      {!hasAnyReport && (
                        <span className="text-xs font-medium text-orange-400 bg-orange-900/30 px-3 py-1 rounded-full">
                          Sem relatório neste mês
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tabela */}
                  {filteredReports.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-700">
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-100 bg-gray-900 sticky left-0 z-10">
                              Membro
                            </th>
                            {filteredCelulaData.reports.map((report) => (
                              <th 
                                key={dayjs(report.date).format('YYYY-MM-DD')} 
                                className="px-4 py-3 text-center text-sm font-semibold text-gray-100 bg-gray-900 min-w-[100px]"
                              >
                                <div>{dayjs(report.date).format('DD/MM')}</div>
                                <div className="text-xs font-normal text-gray-400">
                                  {getDayLabel(new Date(report.date).getDay())}
                                </div>
                                {!report.hasReport && (
                                  <div className="text-xs font-normal text-orange-500">
                                    Sem relatório
                                  </div>
                                )}
                                {report.hasReport && report.isStandardDay === false && (
                                  <div className="text-xs font-normal text-amber-400">
                                    ⚠️ Fora do dia padrão
                                  </div>
                                )}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCelulaData.allMembers.map((member, idx) => (
                            <tr 
                              key={member.id}
                              className={`border-b border-gray-700 ${
                                idx % 2 === 0 ? 'bg-gray-800' : 'bg-gray-900/50'
                              }`}
                            >
                              <td className="px-4 py-3 text-sm text-gray-100 sticky left-0 z-10 bg-inherit">
                                <div className="font-medium">{member.name}</div>
                                <div className="text-xs text-gray-400">
                                  {getMinistryTypeLabel(getMemberMinistryType(member))}
                                </div>
                              </td>
                              {filteredCelulaData.reports.map((report) => {
                                const dateStr = dayjs(report.date).format('YYYY-MM-DD');
                                const isPresent = wasMemberPresent(member.id, filteredCelulaData.reports, dateStr);
                                const isFutureDate = dayjs(report.date).isAfter(dayjs(), 'day');
                                
                                return (
                                  <td 
                                    key={dateStr}
                                    className="px-4 py-3 text-center"
                                  >
                                    {report.hasReport ? (
                                      isPresent === true ? (
                                        <CheckCircle className="inline-block text-green-500" size={20} />
                                      ) : isPresent === false ? (
                                        <XCircle className="inline-block text-red-500" size={20} />
                                      ) : (
                                        <span className="text-gray-400">-</span>
                                      )
                                    ) : isFutureDate ? (
                                      <span className="text-gray-400">-</span>
                                    ) : (
                                      <span className="text-orange-400">-</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                          {/* Linha de ofertas por data */}
                          {filteredCelulaData.reports.some(r => r.offerAmount !== undefined && r.offerAmount !== null) && (
                            <tr className="border-b border-gray-700 bg-gray-900/80">
                              <td className="px-4 py-3 text-sm font-semibold text-gray-100 sticky left-0 z-10 bg-gray-900/80">
                                💰 Oferta
                              </td>
                              {filteredCelulaData.reports.map((report) => {
                                const dateStr = dayjs(report.date).format('YYYY-MM-DD');
                                return (
                                  <td key={dateStr} className="px-4 py-3 text-center text-sm">
                                    {report.hasReport && report.offerAmount !== undefined && report.offerAmount !== null ? (
                                      <span className="text-green-400 font-medium">
                                        R$ {report.offerAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                    ) : (
                                      <span className="text-gray-500">-</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="px-6 py-8 text-center">
                      <p className="text-gray-500 text-sm">Nenhuma data de relatório para o período</p>
                    </div>
                  )}

                  {/* Resumo */}
                  <div className="px-4 py-3 bg-gray-900 border-t border-gray-700">
                    <div className="flex items-center gap-6 text-sm flex-wrap">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="text-green-500" size={16} />
                        <span className="text-gray-300">Presente</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <XCircle className="text-red-500" size={16} />
                        <span className="text-gray-300">Ausente</span>
                      </div>
                      <div className="ml-auto text-gray-400">
                        Total de membros: {filteredCelulaData.allMembers.length}
                      </div>
                      {filteredCelulaData.reports.some(r => r.offerAmount !== undefined && r.offerAmount !== null) && (
                        <div className="w-full mt-2 pt-2 border-t border-gray-700 flex items-center gap-2">
                          <span className="text-gray-300 font-medium">Total de Ofertas:</span>
                          <span className="text-green-400 font-semibold">
                            R$ {filteredCelulaData.reports
                              .filter(r => r.hasReport && r.offerAmount)
                              .reduce((sum, r) => sum + (r.offerAmount || 0), 0)
                              .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FilterModal */}
        <FilterModal
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          onApply={() => { }}
          onClear={clearAllFilters}
          filters={filterConfigs}
          hasActiveFilters={hasActiveFilters}
        />
      </ThemeProvider>
    </LocalizationProvider>
  );
}
