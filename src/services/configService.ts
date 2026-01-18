import apiClient from '@/lib/apiClient';
import { Role, Ministry, WinnerPath } from '@/types';

export const configService = {
  // Roles
  async getRoles(): Promise<Role[]> {
    const { data } = await apiClient.get('/roles');
    return data;
  },

  async createRole(name: string, isAdmin: boolean = false): Promise<Role> {
    const { data } = await apiClient.post('/roles', { name, isAdmin });
    return data;
  },

  async updateRole(id: number, name: string, isAdmin?: boolean): Promise<Role> {
    const { data } = await apiClient.put(`/roles/${id}`, { name, isAdmin });
    return data;
  },

  async deleteRole(id: number): Promise<void> {
    await apiClient.delete(`/roles/${id}`);
  },

  // Ministries
  async getMinistries(): Promise<Ministry[]> {
    const { data } = await apiClient.get('/ministries');
    return data;
  },

  async createMinistry(name: string, type?: string): Promise<Ministry> {
    const { data } = await apiClient.post('/ministries', { name, type });
    return data;
  },

  async updateMinistry(id: number, name: string, type?: string): Promise<Ministry> {
    const { data } = await apiClient.put(`/ministries/${id}`, { name, type });
    return data;
  },

  async deleteMinistry(id: number): Promise<void> {
    await apiClient.delete(`/ministries/${id}`);
  },

  async updateMinistryPriority(id: number, priority: number): Promise<Ministry> {
    const { data } = await apiClient.put(`/ministries/${id}/priority`, { priority });
    return data;
  },

  // Winner Paths
  async getWinnerPaths(): Promise<WinnerPath[]> {
    const { data } = await apiClient.get('/winner-paths');
    return data;
  },

  async createWinnerPath(name: string): Promise<WinnerPath> {
    const { data } = await apiClient.post('/winner-paths', { name });
    return data;
  },

  async updateWinnerPath(id: number, name: string): Promise<WinnerPath> {
    const { data } = await apiClient.put(`/winner-paths/${id}`, { name });
    return data;
  },

  async deleteWinnerPath(id: number): Promise<void> {
    await apiClient.delete(`/winner-paths/${id}`);
  },

  async updateWinnerPathPriority(id: number, priority: number): Promise<WinnerPath> {
    const { data } = await apiClient.put(`/winner-paths/${id}/priority`, { priority });
    return data;
  },
};
