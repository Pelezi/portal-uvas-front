import api from '@/lib/apiClient';
import { Notification, GroupInvitation } from '@/types';

export const notificationService = {
  // Get all notifications
  getNotifications: async (unreadOnly?: boolean): Promise<Notification[]> => {
    const params = unreadOnly ? { unreadOnly: 'true' } : {};
    const response = await api.get<Notification[]>('/notifications', { params });
    return response.data;
  },

  // Get unread notification count
  getUnreadCount: async (): Promise<number> => {
    const response = await api.get<{ count: number }>('/notifications/unread-count');
    return response.data.count;
  },

  // Mark notification as read
  markAsRead: async (id: number): Promise<void> => {
    await api.post(`/notifications/${id}/read`);
  },

  // Mark all notifications as read
  markAllAsRead: async (): Promise<void> => {
    await api.post('/notifications/read-all');
  },

  // Delete notification
  deleteNotification: async (id: number): Promise<void> => {
    await api.delete(`/notifications/${id}`);
  },
};

export const invitationService = {
  // Get pending invitations
  getPendingInvitations: async (): Promise<GroupInvitation[]> => {
    const response = await api.get<GroupInvitation[]>('/group-invitations/pending');
    return response.data;
  },

  // Accept invitation
  acceptInvitation: async (id: number): Promise<void> => {
    await api.post(`/group-invitations/${id}/accept`);
  },

  // Decline invitation
  declineInvitation: async (id: number): Promise<void> => {
    await api.post(`/group-invitations/${id}/decline`);
  },
};
