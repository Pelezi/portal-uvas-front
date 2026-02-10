'use client';

import { useState, useEffect } from 'react';
import { authService } from '@/services/authService';
import { matrixService } from '@/services/matrixService';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [matrixName, setMatrixName] = useState('');
  const router = useRouter();
  const { login } = useAuth();

  useEffect(() => {
    // Fetch matrix information based on current domain
    const fetchMatrixInfo = async () => {
      try {
        const matrixInfo = await matrixService.getCurrentDomainMatrix();
        if (matrixInfo?.name) {
          setMatrixName(matrixInfo.name);
          document.title = matrixInfo.name;
        } else {
          document.title = 'Portal Uvas';
        }
      } catch (error) {
        console.error('Error fetching matrix info:', error);
        document.title = 'Portal Uvas';
      }
    };

    fetchMatrixInfo();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Backend extracts domain from request headers
      const result = await login(email, password);

      // Check if requires matrix selection
      if ('requireMatrixSelection' in result && result.requireMatrixSelection) {
        router.push('/auth/select-matrix');
        return;
      }

      switch (result.permission?.ministryType) {
        
      }
      // Successfully logged in with single matrix
      router.push('/report/fill');
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      const msg = error.response?.data?.message;
      setError(msg || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-8 bg-gray-800 rounded-lg shadow-lg">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-100">
            Portal Uvas
          </h2>
          {matrixName && (
            <h3 className="text-center text-xl font-semibold text-gray-300 mt-2">
              {matrixName}
            </h3>
          )}
          <p className="mt-2 text-center text-sm text-gray-400">
            Entrar
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-400 text-gray-100 bg-gray-700 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-400 text-gray-100 bg-gray-700 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex items-center justify-end">
            <Link 
              href="/auth/forgot-password"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Esqueci minha senha
            </Link>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-700 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Carregando...' : 'Entrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
// First access flow moved to `/auth/first-access` page
