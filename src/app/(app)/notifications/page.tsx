'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { notificationService } from '@/services/notificationService';
import { Notification } from '@/types';
import { Trash2 } from 'lucide-react';

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const router = useRouter();

  useEffect(() => {
    loadNotifications();
  }, [filter]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getNotifications();
      
      const filtered = filter === 'unread' 
        ? data.filter(n => !n.isRead)
        : data;
      
      setNotifications(filtered);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, isRead: true } : n
      ));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza de que deseja excluir esta notificação?')) return;
    
    try {
      await notificationService.deleteNotification(id);
      setNotifications(notifications.filter(n => n.id !== id));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }

    // Handle navigation based on notification type and metadata
    if (notification.metadata) {
      const metadata = JSON.parse(notification.metadata);
      
      if (notification.type === 'GROUP_INVITATION') {
        router.push('/invitations');
      } else if (metadata.groupId) {
        // Navigate to the relevant page in the group context
        switch (notification.type) {
          case 'GROUP_MEMBER_JOINED':
          case 'GROUP_MEMBER_LEFT':
          case 'GROUP_UPDATED':
            router.push(`/groups/${metadata.groupId}/settings`);
            break;
          case 'TRANSACTION_CREATED':
          case 'TRANSACTION_UPDATED':
          case 'TRANSACTION_DELETED':
            router.push(`/groups/${metadata.groupId}/transactions`);
            break;
          case 'CATEGORY_CREATED':
          case 'CATEGORY_UPDATED':
          case 'CATEGORY_DELETED':
            router.push(`/groups/${metadata.groupId}/categories`);
            break;
          case 'BUDGET_CREATED':
          case 'BUDGET_UPDATED':
          case 'BUDGET_DELETED':
            router.push(`/groups/${metadata.groupId}/budget`);
            break;
          default:
            // Default to settings page for group-related notifications
            router.push(`/groups/${metadata.groupId}/settings`);
        }
      }
    }
  };

  const getNotificationTypeColor = (type: string) => {
    if (type.includes('CREATED')) return 'text-green-600 dark:text-green-400';
    if (type.includes('UPDATED')) return 'text-blue-600 dark:text-blue-400';
    if (type.includes('DELETED')) return 'text-red-600 dark:text-red-400';
    if (type.includes('INVITATION')) return 'text-purple-600 dark:text-purple-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Notificações
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Veja todas as suas notificações e atividades do grupo
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'unread'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Não lidas
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">Carregando notificações...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">Nenhuma notificação para exibir</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white dark:bg-gray-800 rounded-lg p-4 border transition-all cursor-pointer hover:shadow-md ${
                !notification.isRead
                  ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">
                      {notification.title}
                    </h3>
                    {!notification.isRead && (
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                    <span className={`text-xs font-medium ${getNotificationTypeColor(notification.type)}`}>
                      {notification.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(notification.id);
                  }}
                  className="ml-4 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
