import api from '@/lib/apiClient';
import { Member } from '@/types';

export const membersService = {
  getAllMembers: async (filters?: { celulaId?: number | null; discipuladoId?: number; redeId?: number; congregacaoId?: number; discipleOfId?: number; all?: boolean }): Promise<Member[]> => {
    const params = new URLSearchParams();
    // celulaId = 0 significa "sem célula"
    if (filters?.celulaId !== undefined && filters?.celulaId !== null) {
      params.append('celulaId', filters.celulaId.toString());
    }
    if (filters?.discipuladoId) params.append('discipuladoId', filters.discipuladoId.toString());
    if (filters?.redeId) params.append('redeId', filters.redeId.toString());
    if (filters?.congregacaoId) params.append('congregacaoId', filters.congregacaoId.toString());
    if (filters?.discipleOfId) params.append('discipleOfId', filters.discipleOfId.toString());
    if (filters?.all !== undefined) params.append('all', filters.all.toString());
    const queryString = params.toString();
    const res = await api.get<Member[]>(`/members${queryString ? `?${queryString}` : ''}`);
    return res.data;
  },

  getMembers: async (celulaId: number): Promise<Member[]> => {
    const res = await api.get<Member[]>(`/celulas/${celulaId}/members`);
    return res.data;
  },

  addMember: async (celulaId: number | null, data: Partial<Member> & { name: string }, photo?: File): Promise<Member> => {
    // Se houver foto, enviar como FormData
    if (photo) {
      const formData = new FormData();
      formData.append('photo', photo);
      
      // Adicionar campos do membro ao FormData
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            // Para arrays (como socialMedia, roleIds)
            formData.append(key, JSON.stringify(value));
          } else if (typeof value === 'object') {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, String(value));
          }
        }
      });
      
      const endpoint = celulaId === null ? '/members' : `/celulas/${celulaId}/members`;
      const res = await api.post<Member>(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return res.data;
    }
    
    // Se não houver foto, enviar como JSON normal
    if (celulaId === null) {
      const res = await api.post<Member>(`/members`, data);
      return res.data;
    }
    const res = await api.post<Member>(`/celulas/${celulaId}/members`, data);
    return res.data;
  },
  updateMember: async (celulaId: number, memberId: number, data: Partial<Member>, photo?: File, deletePhoto?: boolean): Promise<Member> => {
    // Se houver foto, enviar como FormData
    if (photo) {
      const formData = new FormData();
      formData.append('photo', photo);
      
      // Adicionar campos do membro ao FormData
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            // Para arrays (como socialMedia, roleIds)
            formData.append(key, JSON.stringify(value));
          } else if (typeof value === 'object') {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, String(value));
          }
        }
      });
      
      // Adicionar query param deletePhoto se necessário
      const url = deletePhoto ? `/members/${memberId}?deletePhoto=true` : `/members/${memberId}`;
      
      const res = await api.put<Member>(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return res.data;
    }
    
    // Se não houver foto, enviar como JSON normal
    // Adicionar query param deletePhoto se necessário
    const url = deletePhoto ? `/members/${memberId}?deletePhoto=true` : `/members/${memberId}`;
    const res = await api.put<Member>(url, data);
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
