'use client';

import { useParams } from 'next/navigation';
import TransactionManager from '@/components/TransactionManager';
import { useAppStore } from '@/lib/store';

export default function GroupTransactionsPage() {
  const params = useParams();
  const groupId = parseInt(params?.id as string);
  const { currentGroupPermissions } = useAppStore();

  // Can manage if user has permission for own transactions OR all group transactions
  const canManage = currentGroupPermissions?.canManageOwnTransactions || currentGroupPermissions?.canManageGroupTransactions || false;
  const canView = currentGroupPermissions?.canViewTransactions || false;

  if (!canView) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200">
            Você não tem permissão para visualizar as transações deste grupo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <TransactionManager
      groupId={groupId}
      canManage={canManage}
      canView={canView}
      title="Transações do Grupo"
      showUser={true}
    />
  );
}
