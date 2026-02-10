import api from '@/lib/apiClient';
import { Congregacao } from '@/types';

export interface CreateCongregacaoInput {
  name: string;
  pastorGovernoMemberId: number;
  vicePresidenteMemberId?: number;
  isPrincipal?: boolean;
  country?: string;
  zipCode?: string;
  street?: string;
  streetNumber?: string;
  neighborhood?: string;
  city?: string;
  complement?: string;
  state?: string;
}

export interface UpdateCongregacaoInput {
  name?: string;
  pastorGovernoMemberId?: number;
  vicePresidenteMemberId?: number;
  isPrincipal?: boolean;
  country?: string;
  zipCode?: string;
  street?: string;
  streetNumber?: string;
  neighborhood?: string;
  city?: string;
  complement?: string;
  state?: string;
}

export const congregacoesService = {
  getCongregacoes: async (): Promise<Congregacao[]> => {
    const res = await api.get<Congregacao[]>('/congregacoes');
    return res.data;
  },

  getCongregacao: async (id: number): Promise<Congregacao> => {
    const res = await api.get<Congregacao>(`/congregacoes/${id}`);
    return res.data;
  },

  createCongregacao: async (data: CreateCongregacaoInput): Promise<Congregacao> => {
    const res = await api.post<Congregacao>('/congregacoes', data);
    return res.data;
  },

  updateCongregacao: async (id: number, data: UpdateCongregacaoInput): Promise<Congregacao> => {
    const res = await api.put<Congregacao>(`/congregacoes/${id}`, data);
    return res.data;
  },

  deleteCongregacao: async (id: number): Promise<void> => {
    await api.delete(`/congregacoes/${id}`);
  }
};

export default congregacoesService;
