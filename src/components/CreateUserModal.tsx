"use client";

import React, { useState } from 'react';
import { userService } from '@/services/userService';
import toast from 'react-hot-toast';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: (user: any) => void;
};

export default function CreateUserModal({ open, onClose, onCreated }: Props) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  if (!open) return null;

  const submit = async () => {
    try {
      const created = await userService.invite({ email, firstName, lastName });
      toast.success('Usuário criado');
      setEmail(''); setFirstName(''); setLastName('');
      onCreated && onCreated(created);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Falha ao criar usuário');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-60">
      <div className="bg-white dark:bg-gray-900 p-6 rounded w-11/12 sm:w-96">
        <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">Criar usuário</h4>
        <div className="mb-2">
          <label className="block text-sm mb-1">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border p-2 rounded bg-white dark:bg-gray-800 dark:text-white" />
        </div>
        <div className="mb-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input placeholder="Nome" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="border p-2 rounded bg-white dark:bg-gray-800 dark:text-white" />
          <input placeholder="Sobrenome" value={lastName} onChange={(e) => setLastName(e.target.value)} className="border p-2 rounded bg-white dark:bg-gray-800 dark:text-white" />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1">Cancelar</button>
          <button onClick={submit} className="px-3 py-1 bg-blue-600 text-white rounded">Criar e selecionar</button>
        </div>
      </div>
    </div>
  );
}
