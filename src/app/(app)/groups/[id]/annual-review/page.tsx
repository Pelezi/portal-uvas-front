'use client';

import { useParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import AnnualReviewDashboard from '@/components/AnnualReviewDashboard';

export default function GroupAnnualReviewPage() {
  const params = useParams();
  const groupId = parseInt(params?.id as string);
  const { currentGroupPermissions } = useAppStore();

  const canView = currentGroupPermissions?.canViewBudgets || false;

  return (
    <AnnualReviewDashboard 
      groupId={groupId} 
      canView={canView}
      title="Resumo Anual do Grupo"
    />
  );
}
