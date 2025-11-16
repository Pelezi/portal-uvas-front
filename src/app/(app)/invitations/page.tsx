'use client';

import { InvitationList } from '@/components/NotificationComponents';

export default function InvitationsPage() {
    return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Convites de Grupo
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Gerencie seus convites de grupo pendentes
        </p>
      </div>
      <InvitationList />
    </div>
  );
}
