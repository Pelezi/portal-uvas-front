'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/authService';
import toast from 'react-hot-toast';

export default function SetPasswordClient({ token }: { token: string }) {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [localToken, setLocalToken] = useState<string | null>(token || null);
  const [parsedUrl, setParsedUrl] = useState(false);

  useEffect(() => {
    // only show 'token absent' after we've attempted to parse the URL
    if (parsedUrl && !token && !localToken) toast.error('Token ausente na URL.');
  }, [token, localToken, parsedUrl]);

  // If server didn't provide the token prop for some reason, try to read it from the browser URL
  useEffect(() => {
    if (localToken) {
      setParsedUrl(true);
      return;
    }
    try {
      const params = new URLSearchParams(window.location.search);
      const t = params.get('token');
      if (t) {
        console.debug('[SetPassword] token found in URL', t?.slice(0, 10) + '...');
        setLocalToken(t);
      }
    } catch (e) {
      // ignore
    }
    setParsedUrl(true);
  }, [localToken]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Senha deve ter ao menos 6 caracteres');
      return;
    }
    if (password !== confirm) {
      toast.error('Senhas não conferem');
      return;
    }
    try {
      const tk = localToken || token;
      if (!tk) {
        toast.error('Token ausente na URL.');
        return;
      }
      await authService.setPassword(tk, password);
      toast.success('Senha definida. Redirecionando para login...');
      setTimeout(() => router.push('/auth/login'), 1200);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error && 'response' in err 
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message 
        : undefined;
      toast.error(errorMessage || 'Falha ao definir senha');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md mx-auto mt-12 p-6 bg-white dark:bg-gray-800 rounded shadow">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Definir senha</h2>
        {/* errors are shown via toast */}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-200">Senha</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 px-3 py-2 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </div>
          <div className="mb-3">
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-200">Confirmar senha</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 px-3 py-2 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-4 py-2 rounded">Definir senha</button>
          </div>
        </form>
      </div>
    </div>
  );
}
