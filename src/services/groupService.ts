import api from '@/lib/apiClient';
import { Group, GroupRole, GroupMember, GroupPermissions, User } from '@/types';

export const groupService = {
  // Groups
  getGroups: async (): Promise<Group[]> => {
    const response = await api.get<Group[]>('/groups');
    return response.data;
  },

  getGroup: async (id: number): Promise<Group> => {
    const response = await api.get<Group>(`/groups/${id}`);
    return response.data;
  },

  createGroup: async (data: { name: string; description?: string }): Promise<Group> => {
    const response = await api.post<Group>('/groups', data);
    return response.data;
  },

  updateGroup: async (id: number, data: { name?: string; description?: string }): Promise<Group> => {
    const response = await api.put<Group>(`/groups/${id}`, data);
    return response.data;
  },

  deleteGroup: async (id: number): Promise<void> => {
    await api.delete(`/groups/${id}`);
  },

  getPermissions: async (groupId: number): Promise<GroupPermissions> => {
    const response = await api.get<GroupPermissions>(`/groups/${groupId}/permissions`);
    return response.data;
  },

  // Roles
  getRoles: async (groupId: number): Promise<GroupRole[]> => {
    const response = await api.get<GroupRole[]>(`/groups/${groupId}/roles`);
    return response.data;
  },

  getRole: async (groupId: number, roleId: number): Promise<GroupRole> => {
    const response = await api.get<GroupRole>(`/groups/${groupId}/roles/${roleId}`);
    return response.data;
  },

  createRole: async (groupId: number, data: Partial<GroupRole>): Promise<GroupRole> => {
    const response = await api.post<GroupRole>(`/groups/${groupId}/roles`, data);
    return response.data;
  },

  updateRole: async (groupId: number, roleId: number, data: Partial<GroupRole>): Promise<GroupRole> => {
    const response = await api.put<GroupRole>(`/groups/${groupId}/roles/${roleId}`, data);
    return response.data;
  },

  deleteRole: async (groupId: number, roleId: number): Promise<void> => {
    await api.delete(`/groups/${groupId}/roles/${roleId}`);
  },

  // Members
  getMembers: async (groupId: number): Promise<GroupMember[]> => {
    const response = await api.get<GroupMember[]>(`/groups/${groupId}/members`);
    return response.data;
  },

  addMember: async (groupId: number, data: { userId: number; roleId: number }): Promise<GroupMember> => {
    const response = await api.post<GroupMember>(`/groups/${groupId}/members`, data);
    return response.data;
  },

  updateMemberRole: async (groupId: number, memberId: number, roleId: number): Promise<GroupMember> => {
    const response = await api.put<GroupMember>(`/groups/${groupId}/members/${memberId}/role`, { roleId });
    return response.data;
  },

  removeMember: async (groupId: number, memberId: number): Promise<void> => {
    await api.delete(`/groups/${groupId}/members/${memberId}`);
  },

  leaveGroup: async (groupId: number): Promise<void> => {
    await api.post(`/groups/${groupId}/members/leave`);
  },

  // Search users for inviting
  searchUsers: async (query: string): Promise<User[]> => {
    const response = await api.get<User[]>(`/users/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },
};
