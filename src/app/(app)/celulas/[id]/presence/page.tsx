"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { reportsService } from '@/services/reportsService';
import { celulasService } from '@/services/celulasService';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Member } from '@/types';

export default function CelulaPresencePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams?.get('from');
  const idParam = params?.id;
  const celulaId = idParam ? Number(idParam) : NaN;

  const [loading, setLoading] = useState(false);
  const [presences, setPresences] = useState<Array<{ date: string; members: Member[] }>>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [celulaName, setCelulaName] = useState<string | null>(null);

  useEffect(() => {
    if (Number.isNaN(celulaId)) return;
    const load = async () => {
      setLoading(true);
      try {
        const data = await reportsService.getRecentPresences(celulaId);
        setPresences(data || []);
        try {
          const c = await celulasService.getCelula(celulaId);
          setCelulaName(c?.name || null);
        } catch (err) {
          // ignore celula name failure, keep null
        }
        // default collapsed
        const map: Record<string, boolean> = {};
        (data || []).forEach((d: { date: string; members: Member[] }) => { map[d.date] = false; });
        setExpanded(map);
      } catch (e) {
        console.error(e);
        toast.error('Falha ao carregar presenças');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [celulaId]);

  const toggle = (date: string) => {
    setExpanded((prev) => ({ ...prev, [date]: !prev[date] }));
  };

  const handleBack = () => {
    if (from === 'report') {
      router.push('/report/fill');
      return;
    }
    if (from === 'celulas') {
      router.push('/celulas');
      return;
    }
    router.back();
  };

  if (Number.isNaN(celulaId)) {
    return (
      <div className="p-6">
        <div className="mb-4">ID da célula inválido.</div>
        <button onClick={handleBack} className="text-blue-600">Voltar</button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Célula {celulaName ?? celulaId}</h2>
        <div className="flex items-center gap-2">
          <button onClick={handleBack} className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded hover:bg-gray-300 dark:hover:bg-gray-600">Voltar</button>
        </div>
      </div>

      {loading && <div>Carregando...</div>}

      {!loading && presences.length === 0 && (
        <div className="text-sm text-gray-500">Nenhum registro de presença encontrado.</div>
      )}

      <div className="space-y-3">
        {presences.map((p) => {
          const isOpen = !!expanded[p.date];
          return (
            <div key={p.date} className="border rounded-lg overflow-hidden bg-white dark:bg-gray-800">
              <button
                type="button"
                onClick={() => toggle(p.date)}
                className="w-full flex items-center justify-between p-3 text-left"
              >
                <div className="font-medium">{new Date(p.date).toLocaleDateString('pt-BR')}</div>
                <div className="text-sm text-gray-500">{p.members?.length ?? 0} presente(s)</div>
              </button>

              {isOpen && (
                <div className="p-3 border-t bg-gray-50 dark:bg-gray-900">
                  <ul className="list-disc pl-5 space-y-1">
                    {(p.members || []).map((m: Member) => (
                      <li key={m.id} className="text-sm text-gray-900 dark:text-gray-100">{m.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
