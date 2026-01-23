import api from '@/lib/apiClient';
import { ReportCreateInput, PresenceData, Member, Discipulado } from '@/types';

interface MonthReportData {
  date: string;
  present: Member[];
  absent: Member[];
  hasReport?: boolean;
}

interface MonthReportsResponse {
  reports: MonthReportData[];
  allMembers: Member[];
}

interface CelulaReportData {
  celula: {
    id: number;
    name: string;
    weekday: number | null;
    time: string | null;
    discipulado: Discipulado;
  };
  reports: MonthReportData[];
  allMembers: Member[];
}

interface MultipleCelulasReportsResponse {
  celulas: CelulaReportData[];
  allMembers: Member[];
}

export const reportsService = {
  createReport: async (celulaId: number, data: ReportCreateInput) => {
    const res = await api.post(`/celulas/${celulaId}/reports`, data);
    return res.data;
  },
  getRecentPresences: async (celulaId: number): Promise<PresenceData[]> => {
    const res = await api.get<PresenceData[]>(`/celulas/${celulaId}/reports/presences`);
    return res.data;
  },
  getReportsByMonth: async (celulaId: number, year: number, month: number): Promise<MonthReportsResponse> => {
    const res = await api.get<MonthReportsResponse>(`/celulas/${celulaId}/reports/by-month/${year}/${month}`);
    return res.data;
  },
  getReportsByFilter: async (
    year: number, 
    month: number, 
    filters: { 
      redeId?: number; 
      discipuladoId?: number; 
      celulaId?: number;
    }
  ): Promise<MultipleCelulasReportsResponse> => {
    const params = new URLSearchParams();
    if (filters.redeId) params.append('redeId', filters.redeId.toString());
    if (filters.discipuladoId) params.append('discipuladoId', filters.discipuladoId.toString());
    if (filters.celulaId) params.append('celulaId', filters.celulaId.toString());
    
    const res = await api.get<MultipleCelulasReportsResponse>(
      `/reports/by-filter/${year}/${month}?${params.toString()}`
    );
    return res.data;
  },
};
