"use client";

import { useParams } from 'next/navigation';
import TransactionManager from '@/components/TransactionManager';

export default function AccountHistoryPage() {
  const params = useParams();
  const accountId = params?.id ? Number(params.id) : null;

  return (
    <div>
      <TransactionManager title="Histórico da Conta" initialAccountId={accountId ?? undefined} />
    </div>
  );
}
