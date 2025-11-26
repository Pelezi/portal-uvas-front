import api from '@/lib/apiClient';
import { Member } from '@/types';

export const membersService = {
  getMembers: async (celulaId: number): Promise<Member[]> => {
    const res = await api.get<Member[]>(`/celulas/${celulaId}/members`);
    return res.data;
  },

  addMember: async (celulaId: number, data: Partial<Member> & { name: string }): Promise<Member> => {
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
};
