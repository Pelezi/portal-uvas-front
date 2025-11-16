'use client';

import { useParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import BudgetGrid from '@/components/BudgetGrid';

export default function GroupBudgetPage() {
  const params = useParams();
  const groupId = parseInt(params?.id as string);
  const { currentGroupPermissions } = useAppStore();

  const canManage = currentGroupPermissions?.canManageBudgets || false;
  const canView = currentGroupPermissions?.canViewBudgets || false;

  return (
    <BudgetGrid 
      groupId={groupId} 
      canManage={canManage} 
      canView={canView}
      title="Orçamento do Grupo"
    />
  );
}


