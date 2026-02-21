import api from '@/lib/apiClient';
import { Congregacao } from '@/types';

export interface CreateCongregacaoInput {
  name: string;
  pastorGovernoMemberId: number;
  vicePresidenteMemberId?: number;
  kidsLeaderMemberId?: number;
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
  kidsLeaderMemberId?: number;
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

export interface CongregacaoFilterInput {
  name?: string;
  pastorGovernoMemberId?: number;
  vicePresidenteMemberId?: number;
  congregacaoIds?: number[];
  all?: boolean;
}

export const congregacoesService = {
  getCongregacoes: async (filters?: CongregacaoFilterInput): Promise<Congregacao[]> => {
    const params = new URLSearchParams();
    if (filters?.name) params.append('name', filters.name);
    if (filters?.pastorGovernoMemberId) params.append('pastorGovernoMemberId', filters.pastorGovernoMemberId.toString());
    if (filters?.vicePresidenteMemberId) params.append('vicePresidenteMemberId', filters.vicePresidenteMemberId.toString());
    if (filters?.congregacaoIds && filters.congregacaoIds.length > 0) {
      filters.congregacaoIds.forEach(id => params.append('congregacaoIds', id.toString()));
    }
    if (filters?.all !== undefined) params.append('all', filters.all.toString());
    
    const queryString = params.toString();
    const url = queryString ? `/congregacoes?${queryString}` : '/congregacoes';
    const res = await api.get<Congregacao[]>(url);
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
