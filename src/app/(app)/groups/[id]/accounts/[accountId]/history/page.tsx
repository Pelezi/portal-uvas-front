"use client";

import { useParams } from 'next/navigation';
import TransactionManager from '@/components/TransactionManager';

export default function GroupAccountHistoryPage() {
  const params = useParams();
  const accountId = params?.accountId ? Number(params.accountId) : null;
  const groupId = params?.id ? Number(params.id) : undefined;

  return (
    <div>
      <TransactionManager
        title="Histórico da Conta"
        groupId={groupId}
        initialAccountId={accountId ?? undefined}
      />
    </div>
  );
}
