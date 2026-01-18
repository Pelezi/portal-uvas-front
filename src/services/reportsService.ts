import api from '@/lib/apiClient';
import { ReportCreateInput, PresenceData, Member } from '@/types';

interface MonthReportData {
  date: string;
  present: Member[];
  absent: Member[];
}

interface MonthReportsResponse {
  reports: MonthReportData[];
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
};
