'use client';

import TransactionManager from '@/components/TransactionManager';

export default function TransactionsPage() {
  return <TransactionManager canManage={true} canView={true} title="Transações" showUser={false} />;
}
