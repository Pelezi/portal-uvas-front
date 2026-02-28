"use client";

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Rede, Discipulado } from '@/types';
import { Network, Church, Users, BookOpen } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { redesService } from '@/services/redesService';

const MemberViewModal = dynamic(() => import('./MemberViewModal'), { ssr: false });
const DiscipuladoViewModal = dynamic(() => import('./DiscipuladoViewModal'), { ssr: false });
const CongregacaoViewModal = dynamic(() => import('./CongregacaoViewModal'), { ssr: false });

interface RedeViewModalProps {
  redeId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function RedeViewModal({ 
  redeId, 
  isOpen, 
  onClose
}: RedeViewModalProps) {
  const [rede, setRede] = useState<Rede | null>(null);
  const [loadingRede, setLoadingRede] = useState(false);
  const [viewingMemberId, setViewingMemberId] = useState<number | null>(null);
  const [viewingDiscipuladoId, setViewingDiscipuladoId] = useState<number | null>(null);
  const [viewingCongregacaoId, setViewingCongregacaoId] = useState<number | null>(null);

  // ESC key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (redeId && isOpen) {
      setLoadingRede(true);
      redesService.getRede(redeId)
        .then(setRede)
        .catch(err => {
          console.error('Erro ao carregar rede:', err);
          setRede(null);
        })
        .finally(() => setLoadingRede(false));
    } else {
      setRede(null);
    }
  }, [redeId, isOpen]);

  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const discipuladoCount = rede?.discipulados?.length || 0;
  const celulasCount = rede?.discipulados?.reduce((sum, d) => sum + (d.celulas?.length || 0), 0) || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gray-800 p-0 gap-0 overflow-hidden max-h-[90vh] rounded-lg">
        {loadingRede && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
          </div>
        )}
        {!loadingRede && rede && (
          <ScrollArea className="max-h-[90vh]">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-white">
                      {rede.name}
                    </h2>
                    {rede.isKids && (
                      <Badge variant="default" className="bg-purple-600 text-white text-[10px]">Kids</Badge>
                    )}
                    <Badge variant="default" className="text-[10px]">{discipuladoCount} discipulados</Badge>
                    {celulasCount > 0 && (
                      <Badge variant="secondary" className="text-[10px]">{celulasCount} células</Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">ID: {rede.id}</p>
                </div>
              </div>

              {/* Pastor */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-3">Pastor Responsável</h3>
                <div className="space-y-3">
                  {rede.pastor ? (
                    <div 
                      onClick={() => setViewingMemberId(rede.pastor!.id)}
                      className="flex items-center gap-3 bg-gray-700/50 rounded-lg p-3 border border-gray-600 cursor-pointer hover:bg-gray-700 hover:border-blue-500 transition-all"
                    >
                      <Avatar className="h-11 w-11">
                        <AvatarImage src={rede.pastor.photoUrl} alt={rede.pastor.name} />
                        <AvatarFallback className="bg-blue-600 text-white text-sm font-semibold">
                          {getInitials(rede.pastor.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-white text-sm">{rede.pastor.name}</p>
                        <p className="text-xs text-gray-400">Pastor da Rede</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 bg-red-900/20 rounded-lg p-3 border border-red-700">
                      <Avatar className="h-11 w-11">
                        <AvatarFallback className="bg-red-600 text-white text-sm font-semibold">
                          ?
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-red-400 text-sm">Sem pastor</p>
                        <p className="text-xs text-gray-400">Pastor não atribuído</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Hierarchy */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-3">Hierarquia</h3>
                <div className="grid grid-cols-1 gap-3">
                  <div 
                    className={`bg-gray-700/50 rounded-lg p-3 border border-gray-600 text-center ${rede.congregacao ? 'cursor-pointer hover:border-blue-500 transition-colors' : ''}`}
                    onClick={() => rede.congregacao && setViewingCongregacaoId(rede.congregacao.id)}
                  >
                    <Church className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                    <p className="text-[10px] text-gray-400">Congregação</p>
                    <p className="text-sm font-medium text-white">{rede.congregacao?.name || "—"}</p>
                  </div>
                </div>
              </section>

              {/* Discipulados List */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-3">
                  Discipulados ({discipuladoCount})
                </h3>
                <div className="space-y-1">
                  {rede?.discipulados?.length === 0 && (
                    <p className="text-sm text-gray-400 py-2">Nenhum discipulado encontrado nesta rede.</p>
                  )}
                  {rede?.discipulados?.map(discipulado => (
                    <div 
                      key={discipulado.id} 
                      onClick={() => setViewingDiscipuladoId(discipulado.id)}
                      className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-gray-700/30 transition-colors border border-transparent cursor-pointer hover:border-blue-500"
                    >
                      <Avatar className="h-8 w-8">
                        {discipulado.discipulador ? (
                          <>
                            <AvatarImage src={discipulado.discipulador.photoUrl} alt={discipulado.discipulador.name} />
                            <AvatarFallback className="bg-blue-600 text-white text-xs font-semibold">
                              {getInitials(discipulado.discipulador.name)}
                            </AvatarFallback>
                          </>
                        ) : (
                          <AvatarFallback className="bg-gray-600 text-white text-xs font-semibold">
                            ?
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm text-gray-200 font-medium">
                          {discipulado.discipulador?.name || 'Sem discipulador'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {discipulado.celulas?.length || 0} {discipulado.celulas?.length === 1 ? 'célula' : 'células'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </ScrollArea>
        )}
      </DialogContent>

      {viewingMemberId !== null && (
        <MemberViewModal
          memberId={viewingMemberId}
          isOpen={true}
          onClose={() => setViewingMemberId(null)}
        />
      )}

      {viewingDiscipuladoId !== null && (
        <DiscipuladoViewModal
          discipuladoId={viewingDiscipuladoId}
          isOpen={true}
          onClose={() => setViewingDiscipuladoId(null)}
        />
      )}

      {viewingCongregacaoId !== null && (
        <CongregacaoViewModal
          congregacaoId={viewingCongregacaoId}
          isOpen={true}
          onClose={() => setViewingCongregacaoId(null)}
        />
      )}
    </Dialog>
  );
}
