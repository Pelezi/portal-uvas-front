'use client';

import { useParams } from 'next/navigation';
import TransactionDetails from '@/components/TransactionDetails';

export default function TransactionDetailPage() {
  const params = useParams();
  const transactionId = params?.id ? Number(params.id) : null;

  return <TransactionDetails transactionId={transactionId} backUrl="/transactions" />;
}
