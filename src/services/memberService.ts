import apiClient from '@/lib/apiClient';
import { Member } from '@/types';

export interface MemberInput {
  email?: string;
  password?: string;
  name: string;
  phone?: string;
  celulaId?: number | null;
  isActive?: boolean;
  maritalStatus?: string;
  photoUrl?: string;
  gender?: string;
  isBaptized?: boolean;
  baptismDate?: string;
  birthDate?: string;
  registerDate?: string;
  spouseId?: number | null;
  ministryPositionId?: number | null;
  winnerPathId?: number | null;
  canBeHost?: boolean;
  country?: string;
  zipCode?: string;
  street?: string;
  streetNumber?: string;
  neighborhood?: string;
  city?: string;
  complement?: string;
  state?: string;
  hasSystemAccess?: boolean;
  roleIds?: number[];
  // Social media
  socialMedia?: Array<{ type: string; username: string }>;
}

export const memberService = {
  async getAllMembers(filters?: { 
    celulaId?: number | null; 
    discipuladoId?: number; 
    redeId?: number; 
    congregacaoId?: number; 
    discipleOfId?: number; 
    ministryType?: string; 
    gender?: string;
    all?: boolean;
    isActive?: boolean;
  }): Promise<Member[]> {
    const params = new URLSearchParams();
    if (filters?.celulaId !== undefined && filters?.celulaId !== null) {
      params.append('celulaId', filters.celulaId.toString());
    }
    if (filters?.discipuladoId) params.append('discipuladoId', filters.discipuladoId.toString());
    if (filters?.redeId) params.append('redeId', filters.redeId.toString());
    if (filters?.congregacaoId) params.append('congregacaoId', filters.congregacaoId.toString());
    if (filters?.discipleOfId) params.append('discipleOfId', filters.discipleOfId.toString());
    if (filters?.ministryType) params.append('ministryType', filters.ministryType);
    if (filters?.gender) params.append('gender', filters.gender);
    if (filters?.all !== undefined) params.append('all', filters.all.toString());
    if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    
    const queryString = params.toString();
    const url = queryString ? `/members?${queryString}` : '/members';
    const response = await apiClient.get(url);
    return response.data;
  },

  // Get members by celula ID
  async getMembers(celulaId: number): Promise<Member[]> {
    const response = await apiClient.get(`/celulas/${celulaId}/members`);
    return response.data;
  },

  async getById(id: number): Promise<Member> {
    const response = await apiClient.get(`/members/${id}`);
    return response.data;
  },

  // Create member with photo support
  async create(data: MemberInput, photo?: File): Promise<Member> {
    // Se houver foto, enviar como FormData
    if (photo) {
      const formData = new FormData();
      formData.append('photo', photo);
      
      // Adicionar campos do membro ao FormData
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            formData.append(key, JSON.stringify(value));
          } else if (typeof value === 'object') {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, String(value));
          }
        }
      });
      
      const response = await apiClient.post('/members', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    }
    
    const response = await apiClient.post('/members', data);
    return response.data;
  },

  // Update member with photo support
  async update(memberId: number, data: Partial<MemberInput>, photo?: File, deletePhoto?: boolean): Promise<Member> {
    // Se houver foto, enviar como FormData
    if (photo) {
      const formData = new FormData();
      formData.append('photo', photo);
      
      // Adicionar campos do membro ao FormData
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            formData.append(key, JSON.stringify(value));
          } else if (typeof value === 'object') {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, String(value));
          }
        }
      });
      
      const url = deletePhoto ? `/members/${memberId}?deletePhoto=true` : `/members/${memberId}`;
      const response = await apiClient.put(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    }
    
    // Se não houver foto, enviar como JSON normal
    const url = deletePhoto ? `/members/${memberId}?deletePhoto=true` : `/members/${memberId}`;
    const response = await apiClient.put(url, data);
    return response.data;
  },

  // Update member (alias with celulaId parameter for backward compatibility)
  async updateMember(celulaId: number, memberId: number, data: Partial<Member>, photo?: File, deletePhoto?: boolean): Promise<Member> {
    return this.update(memberId, data, photo, deletePhoto);
  },

  async removeFromCelula(memberId: number): Promise<Member> {
    const response = await apiClient.delete(`/members/${memberId}`);
    return response.data;
  },

  // Delete member (alias for removeFromCelula)
  async deleteMember(celulaId: number, memberId: number): Promise<void> {
    await apiClient.delete(`/members/${memberId}`);
  },

  async getOwnProfile(): Promise<Member> {
    const response = await apiClient.get('/members/profile/me');
    return response.data;
  },

  async updateOwnPassword(currentPassword: string, newPassword: string): Promise<{ success: boolean }> {
    const response = await apiClient.put('/members/profile/password', { currentPassword, newPassword });
    return response.data;
  },

  async updateOwnEmail(email: string): Promise<Member> {
    const response = await apiClient.put('/members/profile/email', { email });
    return response.data;
  },

  async updateOwnProfile(data: {
    name?: string;
    gender?: string;
    maritalStatus?: string;
    spouseId?: number | null;
    birthDate?: string;
    phone?: string;
    photoUrl?: string;
    country?: string;
    zipCode?: string;
    street?: string;
    streetNumber?: string;
    neighborhood?: string;
    city?: string;
    complement?: string;
    state?: string;
    // Social media
    socialMedia?: Array<{ type: string; username: string }>;
  }, photo?: File, deletePhoto?: boolean): Promise<Member> {
    // Se houver foto, enviar como FormData
    if (photo) {
      const formData = new FormData();
      formData.append('photo', photo);
      
      // Adicionar campos do membro ao FormData
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            formData.append(key, JSON.stringify(value));
          } else if (typeof value === 'object') {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, String(value));
          }
        }
      });
      
      const url = deletePhoto ? '/members/profile/me?deletePhoto=true' : '/members/profile/me';
      
      const response = await apiClient.put(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    }
    
    // Se não houver foto, enviar como JSON normal
    const url = deletePhoto ? '/members/profile/me?deletePhoto=true' : '/members/profile/me';
    const response = await apiClient.put(url, data);
    return response.data;
  },

  async getStatistics(filters?: { 
    celulaId?: number; 
    discipuladoId?: number; 
    redeId?: number; 
    congregacaoId?: number 
  }): Promise<{
    total: number;
    withoutCelula: number;
    gender: { male: number; female: number; other: number; notInformed: number };
    maritalStatus: { single: number; married: number; cohabitating: number; divorced: number; widowed: number; notInformed: number };
    ageRanges: { '0-17': number; '18-25': number; '26-35': number; '36-50': number; '51-65': number; '65+': number; notInformed: number };
  }> {
    const params = new URLSearchParams();
    if (filters?.celulaId !== undefined) params.append('celulaId', filters.celulaId.toString());
    if (filters?.discipuladoId) params.append('discipuladoId', filters.discipuladoId.toString());
    if (filters?.redeId) params.append('redeId', filters.redeId.toString());
    if (filters?.congregacaoId) params.append('congregacaoId', filters.congregacaoId.toString());
    const queryString = params.toString();
    const response = await apiClient.get(`/members/statistics${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  async resendInvite(memberId: number): Promise<{ success: boolean; message: string; whatsappSent: boolean }> {
    const response = await apiClient.post(`/members/${memberId}/resend-invite`);
    return response.data;
  },

  async sendInvite(memberId: number): Promise<{ success: boolean; message: string; whatsappSent: boolean }> {
    const response = await apiClient.post(`/members/${memberId}/send-invite`);
    return response.data;
  },
};

// Export as membersService for backward compatibility
export const membersService = memberService;
