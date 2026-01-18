"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function FirstAccessPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const router = useRouter();
  const { login } = useAuth();

  const submit = async () => {
    setMsg("");
    setLoading(true);
    try {
      const result = await login(email, "");
      if ('setPasswordUrl' in result) {
        window.location.href = result.setPasswordUrl;
        return;
      }
      router.push("/report/fill");
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      const m = error.response?.data?.message;
      setMsg(m || "Falha no primeiro acesso");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div>
          <h2 className="text-center text-2xl font-semibold text-gray-900 dark:text-gray-100">Primeiro acesso</h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">Informe seu e-mail para definir sua senha.</p>
        </div>

        {msg && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded">
            {msg}
          </div>
        )}

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">E-mail</label>
          <div className="flex gap-2 mt-2">
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="seu@email.com" className="flex-1 border px-3 py-2 rounded bg-white dark:bg-gray-700 dark:text-white" />
            <button onClick={submit} disabled={!email || loading} className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{loading ? 'Enviando...' : 'Enviar'}</button>
          </div>
          <div className="text-right mt-2">
            <a href="/auth/login" className="text-sm text-gray-600 dark:text-gray-300">Voltar</a>
          </div>
        </div>
      </div>
    </div>
  );
}
