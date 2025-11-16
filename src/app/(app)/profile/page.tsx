'use client';

import { authService } from '@/services/authService';
import { Mail, User, Phone, Globe } from 'lucide-react';

export default function ProfilePage() {
  const user = authService.getCurrentUser();

  const InfoItem = ({ icon: Icon, label, value }: { icon: any, label: string, value?: string }) => (
    <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <Icon className="text-blue-600 dark:text-blue-400 mt-1" size={20} />
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-base text-gray-900 dark:text-gray-100 mt-1">
          {value || 'Não informado'}
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Perfil
        </h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="space-y-4">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Informações do Perfil
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Suas informações pessoais e configurações
            </p>
          </div>

          <div className="grid gap-4">
            <InfoItem 
              icon={User} 
              label="Nome Completo" 
              value={user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : undefined}
            />
            
            <InfoItem 
              icon={Mail} 
              label="E-mail" 
              value={user?.email}
            />

            <InfoItem 
              icon={Phone} 
              label="Telefone" 
              value={user?.phoneNumber}
            />

            <InfoItem 
              icon={Globe} 
              label="Fuso Horário" 
              value={user?.timezone || 'UTC'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
