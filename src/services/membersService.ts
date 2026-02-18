import api from '@/lib/apiClient';
import { Member } from '@/types';

export const membersService = {
  getAllMembers: async (filters?: { celulaId?: number | null; discipuladoId?: number; redeId?: number; congregacaoId?: number }): Promise<Member[]> => {
    const params = new URLSearchParams();
    // celulaId = 0 significa "sem célula"
    if (filters?.celulaId !== undefined && filters?.celulaId !== null) {
      params.append('celulaId', filters.celulaId.toString());
    }
    if (filters?.discipuladoId) params.append('discipuladoId', filters.discipuladoId.toString());
    if (filters?.redeId) params.append('redeId', filters.redeId.toString());
    if (filters?.congregacaoId) params.append('congregacaoId', filters.congregacaoId.toString());
    const queryString = params.toString();
    const res = await api.get<Member[]>(`/members${queryString ? `?${queryString}` : ''}`);
    return res.data;
  },

  getMembers: async (celulaId: number): Promise<Member[]> => {
    const res = await api.get<Member[]>(`/celulas/${celulaId}/members`);
    return res.data;
  },

  addMember: async (celulaId: number | null, data: Partial<Member> & { name: string }): Promise<Member> => {
    if (celulaId === null) {
      const res = await api.post<Member>(`/members`, data);
      return res.data;
    }
    const res = await api.post<Member>(`/celulas/${celulaId}/members`, data);
    return res.data;
  },
  updateMember: async (celulaId: number, memberId: number, data: Partial<Member>): Promise<Member> => {
    // backend exposes member update at /members/:memberId
    const res = await api.put<Member>(`/members/${memberId}`, data);
    return res.data;
  },

  deleteMember: async (celulaId: number, memberId: number): Promise<void> => {
    // backend exposes member deletion/inactivation at /members/:memberId
    await api.delete(`/members/${memberId}`);
  },

  getStatistics: async (filters?: { celulaId?: number; discipuladoId?: number; redeId?: number; congregacaoId?: number }): Promise<{
    total: number;
    withoutCelula: number;
    gender: { male: number; female: number; other: number; notInformed: number };
    maritalStatus: { single: number; married: number; cohabitating: number; divorced: number; widowed: number; notInformed: number };
    ageRanges: { '0-17': number; '18-25': number; '26-35': number; '36-50': number; '51-65': number; '65+': number; notInformed: number };
  }> => {
    const params = new URLSearchParams();
    if (filters?.celulaId !== undefined) params.append('celulaId', filters.celulaId.toString());
    if (filters?.discipuladoId) params.append('discipuladoId', filters.discipuladoId.toString());
    if (filters?.redeId) params.append('redeId', filters.redeId.toString());
    if (filters?.congregacaoId) params.append('congregacaoId', filters.congregacaoId.toString());
    const queryString = params.toString();
    const res = await api.get(`/members/statistics${queryString ? `?${queryString}` : ''}`);
    return res.data;
  },

  sendInvite: async (memberId: number): Promise<{ success: boolean; message: string; whatsappSent: boolean }> => {
    const res = await api.post(`/members/${memberId}/send-invite`);
    return res.data;
  },

  resendInvite: async (memberId: number): Promise<{ success: boolean; message: string; whatsappSent: boolean }> => {
    const res = await api.post(`/members/${memberId}/resend-invite`);
    return res.data;
  },
};
