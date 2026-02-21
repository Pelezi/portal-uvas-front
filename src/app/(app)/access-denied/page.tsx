'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldAlert, Home } from 'lucide-react';
import { getMinistryTypeLabel } from '@/lib/permissions';

export default function AccessDeniedPage() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-xl p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-red-900/20 p-4 rounded-full">
            <ShieldAlert size={64} className="text-red-500" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-100 mb-2">
          Acesso Negado
        </h1>
        
        <p className="text-gray-400 mb-6">
          Você não tem permissão para acessar esta página.
        </p>

        {user?.permission?.ministryType && (
          <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-400 mb-1">Seu nível de acesso:</p>
            <p className="text-lg font-semibold text-blue-400">
              {getMinistryTypeLabel(user.permission.ministryType)}
            </p>
          </div>
        )}

        <p className="text-sm text-gray-500 mb-8">
          Se você acredita que deveria ter acesso a esta página, entre em contato com um administrador do sistema.
        </p>

        <button
          onClick={() => router.push('/profile')}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
        >
          <Home size={18} />
          Ir para Início
        </button>
      </div>
    </div>
  );
}
