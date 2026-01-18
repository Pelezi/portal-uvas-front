import apiClient from '@/lib/apiClient';
import { Member } from '@/types';

export interface MemberInput {
  email?: string;
  password?: string;
  name: string;
  phone?: string;
  celulaId?: number;
  isActive?: boolean;
  maritalStatus?: string;
  photoUrl?: string;
  gender?: string;
  isBaptized?: boolean;
  baptismDate?: string;
  birthDate?: string;
  registerDate?: string;
  spouseId?: number;
  ministryPositionId?: number;
  winnerPathId?: number;
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
}

export const memberService = {
  async list(filters?: { celulaId?: number; discipuladoId?: number; redeId?: number; ministryType?: string }): Promise<Member[]> {
    const params = new URLSearchParams();
    if (filters?.celulaId) params.append('celulaId', filters.celulaId.toString());
    if (filters?.discipuladoId) params.append('discipuladoId', filters.discipuladoId.toString());
    if (filters?.redeId) params.append('redeId', filters.redeId.toString());
    if (filters?.ministryType) params.append('ministryType', filters.ministryType);
    
    const url = params.toString() ? `/members?${params.toString()}` : '/members';
    const response = await apiClient.get(url);
    return response.data;
  },

  async getById(id: number): Promise<Member> {
    const response = await apiClient.get(`/members/${id}`);
    return response.data;
  },

  async create(data: MemberInput): Promise<Member> {
    const response = await apiClient.post('/members/members', data);
    return response.data;
  },

  async update(memberId: number, data: Partial<MemberInput>): Promise<Member> {
    const response = await apiClient.put(`/members/${memberId}`, data);
    return response.data;
  },

  async removeFromCelula(memberId: number): Promise<Member> {
    const response = await apiClient.delete(`/members/${memberId}`);
    return response.data;
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
};
