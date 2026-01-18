import api from '@/lib/apiClient';
import { ReportCreateInput, PresenceData } from '@/types';

export const reportsService = {
  createReport: async (celulaId: number, data: ReportCreateInput) => {
    const res = await api.post(`/celulas/${celulaId}/reports`, data);
    return res.data;
  },
  getRecentPresences: async (celulaId: number): Promise<PresenceData[]> => {
    const res = await api.get<PresenceData[]>(`/celulas/${celulaId}/reports/presences`);
    return res.data;
  },
};
