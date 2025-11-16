"use client";

import { useParams } from 'next/navigation';
import AccountManager from '@/components/AccountManager';
import { useAppStore } from '@/lib/store';
import { authService } from '@/services/authService';

export default function GroupAccountsPage() {
  const params = useParams();
  const groupId = parseInt(params?.id as string);
  const { currentGroupPermissions } = useAppStore();
  const currentUser = authService.getCurrentUser();

  const canView = currentGroupPermissions?.canViewAccounts || false;
  const canManageOwn = currentGroupPermissions?.canManageOwnAccounts || false;
  const canManageAll = currentGroupPermissions?.canManageGroupAccounts || false;

  return (
    <AccountManager
      groupId={groupId}
      canView={canView}
      canManageOwn={canManageOwn}
      canManageAll={canManageAll}
      currentUserId={currentUser?.id}
      title="Contas do Grupo"
    />
  );
}
