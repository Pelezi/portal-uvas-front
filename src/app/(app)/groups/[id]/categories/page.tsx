'use client';

import { useParams } from 'next/navigation';
import CategoryList from '@/components/CategoryList';
import { useAppStore } from '@/lib/store';

export default function GroupCategoriesPage() {
  const params = useParams();
  const groupId = parseInt(params?.id as string);
  const { currentGroupPermissions } = useAppStore();

  const canManage = currentGroupPermissions?.canManageCategories || false;
  const canView = currentGroupPermissions?.canViewCategories || false;

  if (!canView) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200">
            Você não tem permissão para visualizar as categorias deste grupo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Categorias do Grupo
        </h1>
      </div>

      <CategoryList groupId={groupId} canManage={canManage} canView={canView} />
    </div>
  );
}
