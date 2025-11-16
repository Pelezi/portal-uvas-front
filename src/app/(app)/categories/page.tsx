'use client';

import CategoryList from '@/components/CategoryList';

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Categorias</h1>
      </div>

      <CategoryList canManage={true} canView={true} />
    </div>
  );
}
