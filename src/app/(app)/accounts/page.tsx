'use client';

import AccountManager from '@/components/AccountManager';

export default function AccountsPage() {
  return (
    <AccountManager
      title="Minhas Contas"
      canManage={true}
      canView={true}
    />
  );
}
