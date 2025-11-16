'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { groupService } from '@/services/groupService';
import { useAppStore } from '@/lib/store';
import { Group, GroupPermissions } from '@/types';
import { Loader2 } from 'lucide-react';

export default function GroupLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const groupId = parseInt(params?.id as string);
  const { setCurrentGroupId, setCurrentGroupPermissions } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadGroupData = async () => {
      if (!groupId || isNaN(groupId)) {
        setError('Invalid group ID');
        setIsLoading(false);
        return;
      }

      try {
        // Load group details and permissions
        const [group, permissions] = await Promise.all([
          groupService.getGroup(groupId),
          groupService.getPermissions(groupId),
        ]);

        setCurrentGroupId(groupId);
        setCurrentGroupPermissions(permissions);
        setIsLoading(false);
      } catch (err: any) {
        console.error('Failed to load group:', err);
        setError(err.response?.data?.message || 'Failed to load group');
        setIsLoading(false);
      }
    };

    loadGroupData();

    // Cleanup on unmount
    return () => {
      setCurrentGroupId(null);
      setCurrentGroupPermissions(null);
    };
  }, [groupId, setCurrentGroupId, setCurrentGroupPermissions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading group...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={() => router.push('/transactions')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Personal View
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
