'use client';

import { useEffect, useState } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { notificationService, invitationService } from '@/services/notificationService';
import { Notification, GroupInvitation } from '@/types';
import { useRouter } from 'next/navigation';

interface NotificationBellProps {
  onNavigate?: () => void;
}

export function NotificationBell({ onNavigate }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadUnreadCount();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadUnreadCount = async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load notification count:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    // On mobile (< 1024px), navigate directly to notifications page
    if (window.innerWidth < 1024) {
      router.push('/notifications');
      onNavigate?.();
      return;
    }
    
    // On desktop, toggle dropdown
    if (!isOpen) {
      loadNotifications();
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      loadUnreadCount();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => 
        prev.map(n => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    handleMarkAsRead(notification.id);
    
    // Navigate based on notification type
    if (notification.type === 'GROUP_INVITATION' && notification.metadata?.invitationId) {
      router.push('/invitations');
    } else if (notification.metadata?.groupId) {
      router.push(`/groups/${notification.metadata.groupId}`);
    }
    
    setIsOpen(false);
    onNavigate?.();
  };

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop to close dropdown */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown positioned below the button, extending to the right */}
          <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  Mark all as read
                </button>
              )}
            </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{notification.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 ml-2 mt-1" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-2 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <button
              onClick={() => {
                router.push('/notifications');
                setIsOpen(false);
                onNavigate?.();
              }}
              className="w-full text-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
            >
              View all notifications
            </button>
          </div>
        </div>
        </>
      )}
    </div>
  );
}

export function InvitationList() {
  const [invitations, setInvitations] = useState<GroupInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const data = await invitationService.getPendingInvitations();
      setInvitations(data);
    } catch (error) {
      console.error('Failed to load invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id: number) => {
    try {
      await invitationService.acceptInvitation(id);
      setInvitations(prev => prev.filter(inv => inv.id !== id));
      // Refresh groups list
      window.location.reload();
    } catch (error) {
      console.error('Failed to accept invitation:', error);
    }
  };

  const handleDecline = async (id: number) => {
    try {
      await invitationService.declineInvitation(id);
      setInvitations(prev => prev.filter(inv => inv.id !== id));
    } catch (error) {
      console.error('Failed to decline invitation:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading invitations...</div>;
  }

  if (invitations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No pending invitations
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {invitations.map((invitation) => (
        <div
          key={invitation.id}
          className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-semibold text-lg">{invitation.groupName}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Invited by {invitation.inviterName}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Role: <span className="font-medium">{invitation.roleName}</span>
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleAccept(invitation.id)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Check className="w-4 h-4" />
              Accept
            </button>
            <button
              onClick={() => handleDecline(invitation.id)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              Decline
            </button>
          </div>

          <p className="text-xs text-gray-400 mt-4">
            Invited on {new Date(invitation.createdAt).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}
