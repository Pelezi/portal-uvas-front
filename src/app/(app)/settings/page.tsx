'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { userService } from '@/services/userService';
import { authService } from '@/services/authService';
import FirstAccessSetupModal from '@/components/FirstAccessSetupModal';
import toast from 'react-hot-toast';
import { Globe, Phone } from 'lucide-react';

export default function SettingsPage() {
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [timezone, setTimezone] = useState('UTC');
  const [locale, setLocale] = useState('pt-BR');
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) {
      setTimezone(user.timezone || 'UTC');
      setLocale(user.locale || 'pt-BR');
      setPhoneNumber(user.phoneNumber || '');
    }
  }, []);

  const updateSettingsMutation = useMutation({
    mutationFn: (data: { timezone?: string; locale?: string; phoneNumber?: string }) => 
      userService.updateProfile(data),
    onSuccess: (updatedUser) => {
      // Update local storage with new user data
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        authService.setCurrentUser({ ...currentUser, ...updatedUser });
      }
      toast.success('Configurações atualizadas com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar configurações');
    },
  });

  const handleSetupComplete = () => {
    setShowSetupModal(false);
  };

  const handleSaveTimezone = () => {
    updateSettingsMutation.mutate({ timezone });
  };

  const handleSavePhoneNumber = () => {
    updateSettingsMutation.mutate({ phoneNumber });
  };

  const timezones = [
    { value: 'America/Sao_Paulo', label: 'São Paulo (UTC-3)' },
    { value: 'America/Manaus', label: 'Manaus (UTC-4)' },
    { value: 'America/Rio_Branco', label: 'Rio Branco (UTC-5)' },
    { value: 'America/Noronha', label: 'Fernando de Noronha (UTC-2)' },
    { value: 'UTC', label: 'UTC (GMT+0)' },
    { value: 'America/New_York', label: 'New York (UTC-5/-4)' },
    { value: 'Europe/London', label: 'London (UTC+0/+1)' },
    { value: 'Europe/Paris', label: 'Paris (UTC+1/+2)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Configurações
        </h1>
      </div>

      {/* Timezone Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="text-blue-600 dark:text-blue-400" size={24} />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Fuso Horário
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Selecione seu fuso horário para exibir datas e horários corretos
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Fuso Horário
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {timezones.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSaveTimezone}
            disabled={updateSettingsMutation.isPending}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateSettingsMutation.isPending ? 'Salvando...' : 'Salvar Fuso Horário'}
          </button>
        </div>
      </div>

      {/* Phone Number Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <Phone className="text-blue-600 dark:text-blue-400" size={24} />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Telefone
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Configure seu número de telefone
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Número de Telefone
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+55 11 98765-4321"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleSavePhoneNumber}
            disabled={updateSettingsMutation.isPending}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateSettingsMutation.isPending ? 'Salvando...' : 'Salvar Telefone'}
          </button>
        </div>
      </div>

      {/* Categories Management */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Gerenciar Categorias Padrão
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Adicione mais categorias e subcategorias padrão à sua conta
            </p>
          </div>

          <button
            onClick={() => setShowSetupModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            Gerenciar Categorias Padrão
          </button>
        </div>
      </div>

      {showSetupModal && (
        <FirstAccessSetupModal 
          onComplete={handleSetupComplete}
          isResetup={true}
        />
      )}
    </div>
  );
}
