"use client";

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Discipulado, Celula } from '@/types';
import { Network, BookOpen, Church, Users } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { discipuladosService } from '@/services/discipuladosService';

const MemberViewModal = dynamic(() => import('./MemberViewModal'), { ssr: false });
const CelulaViewModal = dynamic(() => import('./CelulaViewModal'), { ssr: false });
const RedeViewModal = dynamic(() => import('./RedeViewModal'), { ssr: false });
const CongregacaoViewModal = dynamic(() => import('./CongregacaoViewModal'), { ssr: false });

interface DiscipuladoViewModalProps {
  discipuladoId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DiscipuladoViewModal({ 
  discipuladoId, 
  isOpen, 
  onClose 
}: DiscipuladoViewModalProps) {
  const [discipulado, setDiscipulado] = useState<Discipulado | null>(null);
  const [loadingDiscipulado, setLoadingDiscipulado] = useState(false);
  const [viewingMemberId, setViewingMemberId] = useState<number | null>(null);
  const [viewingCelulaId, setViewingCelulaId] = useState<number | null>(null);
  const [viewingRedeId, setViewingRedeId] = useState<number | null>(null);
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
    if (discipuladoId && isOpen) {
      setLoadingDiscipulado(true);
      discipuladosService.getDiscipulado(discipuladoId)
        .then(setDiscipulado)
        .catch(err => {
          console.error('Erro ao carregar discipulado:', err);
          setDiscipulado(null);
        })
        .finally(() => setLoadingDiscipulado(false));
    } else {
      setDiscipulado(null);
    }
  }, [discipuladoId, isOpen]);

  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const celulaCount = discipulado?.celulas?.length || 0;
  const disciplesCount = discipulado?.disciples?.length || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gray-800 p-0 gap-0 overflow-hidden max-h-[90vh] rounded-lg">
        {loadingDiscipulado && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
          </div>
        )}
        {!loadingDiscipulado && discipulado && (
          <ScrollArea className="max-h-[90vh]">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-white">
                      {discipulado.discipulador?.name || 'Sem discipulador'}
                    </h2>
                    <Badge variant="default" className="text-[10px]">{celulaCount} células</Badge>
                    {disciplesCount > 0 && (
                      <Badge variant="secondary" className="text-[10px]">{disciplesCount} discípulas</Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">ID: {discipulado.id}</p>
                </div>
              </div>

              {/* Discipulador */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-3">Discipulador</h3>
                <div className="space-y-3">
                  {discipulado.discipulador ? (
                    <div 
                      onClick={() => setViewingMemberId(discipulado.discipulador!.id)}
                      className="flex items-center gap-3 bg-gray-700/50 rounded-lg p-3 border border-gray-600 cursor-pointer hover:bg-gray-700 hover:border-blue-500 transition-all"
                    >
                      <Avatar className="h-11 w-11">
                        <AvatarImage src={discipulado.discipulador.photoUrl} alt={discipulado.discipulador.name} />
                        <AvatarFallback className="bg-blue-600 text-white text-sm font-semibold">
                          {getInitials(discipulado.discipulador.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-white text-sm">{discipulado.discipulador.name}</p>
                        <p className="text-xs text-gray-400">Discipulador</p>
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
                        <p className="font-medium text-red-400 text-sm">Sem discipulador</p>
                        <p className="text-xs text-gray-400">Discipulador não atribuído</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Discípulas - apenas para redes Kids */}
                  {discipulado.disciples && discipulado.disciples.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 mb-2">Discípulas</p>
                      <div className="flex flex-wrap gap-2">
                        {discipulado.disciples.map(disc => (
                          <div 
                            key={disc.id} 
                            onClick={() => setViewingMemberId(disc.member.id)}
                            className="flex items-center gap-2 bg-gray-900 rounded-full pl-1 pr-3 py-1 border border-gray-600 cursor-pointer hover:border-blue-500 hover:bg-gray-800 transition-all"
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={disc.member.photoUrl} alt={disc.member.name} />
                              <AvatarFallback className="bg-gray-600 text-gray-300 text-[10px] font-medium">
                                {getInitials(disc.member.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-gray-200">{disc.member.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Hierarchy */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-3">Hierarquia</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    className={`bg-gray-700/50 rounded-lg p-3 border border-gray-600 text-center ${discipulado.rede ? 'cursor-pointer hover:border-blue-500 transition-colors' : ''}`}
                    onClick={() => discipulado.rede && setViewingRedeId(discipulado.rede.id)}
                  >
                    <Network className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                    <p className="text-[10px] text-gray-400">Rede</p>
                    <p className="text-sm font-medium text-white">{discipulado.rede?.name || "—"}</p>
                  </div>
                  <div 
                    className={`bg-gray-700/50 rounded-lg p-3 border border-gray-600 text-center ${discipulado.rede?.congregacao ? 'cursor-pointer hover:border-blue-500 transition-colors' : ''}`}
                    onClick={() => discipulado.rede?.congregacao && setViewingCongregacaoId(discipulado.rede.congregacao.id)}
                  >
                    <Church className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                    <p className="text-[10px] text-gray-400">Congregação</p>
                    <p className="text-sm font-medium text-white">{discipulado.rede?.congregacao?.name || "—"}</p>
                  </div>
                </div>
              </section>

              {/* Células List */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-3">
                  Células ({celulaCount})
                </h3>
                <div className="space-y-1">
                  {(!discipulado.celulas || discipulado.celulas.length === 0) && (
                    <p className="text-sm text-gray-400 py-2">Nenhuma célula encontrada neste discipulado.</p>
                  )}
                  {discipulado.celulas?.map(celula => (
                    <div 
                      key={celula.id}
                      onClick={() => setViewingCelulaId(celula.id)}
                      className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-gray-700/30 transition-colors border border-transparent cursor-pointer hover:border-blue-500"
                    >
                      <Avatar className="h-8 w-8">
                        {celula.leader ? (
                          <>
                            <AvatarImage src={celula.leader.photoUrl} alt={celula.leader.name} />
                            <AvatarFallback className="bg-blue-600 text-white text-xs font-semibold">
                              {getInitials(celula.leader.name)}
                            </AvatarFallback>
                          </>
                        ) : (
                          <AvatarFallback className="bg-gray-600 text-white text-xs font-semibold">
                            ?
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm text-gray-200 font-medium">{celula.name}</p>
                        {celula.leader && (
                          <p className="text-xs text-gray-400">Líder: {celula.leader.name}</p>
                        )}
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

      {viewingCelulaId !== null && (
        <CelulaViewModal
          celulaId={viewingCelulaId}
          isOpen={true}
          onClose={() => setViewingCelulaId(null)}
        />
      )}

      {viewingRedeId !== null && (
        <RedeViewModal
          redeId={viewingRedeId}
          isOpen={true}
          onClose={() => setViewingRedeId(null)}
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
