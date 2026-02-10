'use client';

import { Toaster } from 'react-hot-toast';
import Sidebar from '@/components/Sidebar';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function AppLayout({ children }: { children: React.ReactNode }) {

  return (
    <ProtectedRoute>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <div className="flex h-screen overflow-hidden bg-gray-900">
        <Sidebar />
        <main className="flex-1 overflow-y-auto lg:ml-64">
          <div className="p-4 pt-20 sm:p-6 sm:pt-20 lg:pt-6">
            {children}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
