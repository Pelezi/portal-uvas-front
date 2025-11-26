import api from '@/lib/apiClient';
import { ReportCreateInput } from '@/types';

export const reportsService = {
  createReport: async (celulaId: number, data: ReportCreateInput) => {
    const res = await api.post(`/celulas/${celulaId}/reports`, data);
    return res.data;
  },
  getRecentPresences: async (celulaId: number) => {
    const res = await api.get<{ date: string; members: any[] }[]>(`/celulas/${celulaId}/reports/presences`);
    return res.data;
  },
};
