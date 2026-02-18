import api from '@/lib/apiClient';
import { Matrix } from '@/types';

export const matrixService = {
  async getAll(): Promise<Matrix[]> {
    const response = await api.get('/matrix');
    return response.data;
  },

  async getById(id: number): Promise<Matrix> {
    const response = await api.get(`/matrix/${id}`);
    return response.data;
  },

  async getCurrentDomainMatrix(): Promise<{ id?: number; name: string } | null> {
    try {
      const response = await api.get('/matrix/by-current-domain');
      return response.data;
    } catch (error) {
      console.error('Error fetching matrix by current domain:', error);
      return { name: 'Uvas' }; // Default name
    }
  },

  async getByDomain(domain: string): Promise<Matrix | null> {
    const response = await api.get(`/matrix/domain/${domain}`);
    return response.data;
  },

  async create(data: { name: string; domains: string[] }): Promise<Matrix> {
    const response = await api.post('/matrix', data);
    return response.data;
  },

  async update(id: number, data: { name?: string; domains?: string[]; whatsappApiKey?: string }): Promise<Matrix> {
    const response = await api.put(`/matrix/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/matrix/${id}`);
  },

  async addMember(matrixId: number, memberId: number): Promise<void> {
    await api.post(`/matrix/${matrixId}/members/${memberId}`);
  },

  async removeMember(matrixId: number, memberId: number): Promise<void> {
    await api.delete(`/matrix/${matrixId}/members/${memberId}`);
  },

  async getMemberMatrices(memberId: number): Promise<Matrix[]> {
    const response = await api.get(`/matrix/members/${memberId}/matrices`);
    return response.data;
  },

  async selectMatrix(token: string, matrixId: number): Promise<{
    token: string;
    refreshToken?: string;
    member: any;
    permission: any;
    currentMatrix: { id: number; name: string };
    matrices: Matrix[];
  }> {
    const response = await api.post('/auth/select-matrix', { token, matrixId });
    return response.data;
  }
};
