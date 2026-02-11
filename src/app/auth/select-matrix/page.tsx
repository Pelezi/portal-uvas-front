'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Matrix } from '@/types';

export default function SelectMatrixPage() {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { matrices, selectMatrix } = useAuth();

  useEffect(() => {
    // If no matrices available, redirect to login
    if (!matrices || matrices.length === 0) {
      router.push('/auth/login');
    }
  }, [matrices, router]);

  const handleMatrixSelect = async (matrixId: number) => {
    setError('');
    setIsLoading(true);

    try {
      const result = await selectMatrix(matrixId);
      
      // Redireciona baseado no tipo de ministério
      switch (result.permission?.ministryType) {
        case 'VISITOR':
        case 'REGULAR_ATTENDEE':
        case 'MEMBER':
          router.push('/profile');
          break;
        case 'LEADER_IN_TRAINING':
        case 'LEADER':
          router.push('/report/fill');
          break;
        case 'DISCIPULADOR':
          router.push('/celulas');
          break;
        case 'PASTOR':
          router.push('/');
          break;
        default:
          router.push('/report/fill');
      }
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      const msg = error.response?.data?.message;
      setError(msg || 'Erro ao selecionar base');
    } finally {
      setIsLoading(false);
    }
  };

  if (!matrices || matrices.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-8 bg-gray-800 rounded-lg shadow-lg">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-100">
            Selecione uma Base
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Você possui acesso a múltiplas bases. Selecione qual deseja acessar.
          </p>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {matrices.map((matrix: Matrix) => (
            <button
              key={matrix.id}
              onClick={() => handleMatrixSelect(matrix.id)}
              disabled={isLoading}
              className="w-full flex items-center justify-between p-4 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-lg font-medium text-gray-100">
                {matrix.name}
              </span>
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          ))}
        </div>

        <div className="mt-6">
          <button
            onClick={() => router.push('/auth/login')}
            className="w-full text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            ← Voltar ao login
          </button>
        </div>
      </div>
    </div>
  );
}
