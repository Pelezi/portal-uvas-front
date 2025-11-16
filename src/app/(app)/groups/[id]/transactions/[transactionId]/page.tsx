'use client';

import { useParams } from 'next/navigation';
import TransactionDetails from '@/components/TransactionDetails';

export default function GroupTransactionDetailPage() {
  const params = useParams();
  const groupId = params?.id ? Number(params.id) : null;
  const transactionIdParam = (params as any)?.transactionId;
  const transactionId = transactionIdParam ? Number(transactionIdParam) : null;

  const backUrl = groupId ? `/groups/${groupId}/transactions` : '/groups';

  return (
    <TransactionDetails
      transactionId={transactionId}
      backUrl={backUrl}
      groupId={groupId}
    />
  );
}
