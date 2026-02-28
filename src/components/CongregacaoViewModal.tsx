"use client";

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Congregacao } from '@/types';
import { Church, MapPin, User, Users } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { congregacoesService } from '@/services/congregacoesService';

const MemberViewModal = dynamic(() => import('./MemberViewModal'), { ssr: false });
const RedeViewModal = dynamic(() => import('./RedeViewModal'), { ssr: false });

interface CongregacaoViewModalProps {
  congregacaoId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function CongregacaoViewModal({ 
  congregacaoId, 
  isOpen, 
  onClose
}: CongregacaoViewModalProps) {
  const [congregacao, setCongregacao] = useState<Congregacao | null>(null);
  const [loadingCongregacao, setLoadingCongregacao] = useState(false);
  const [viewingMemberId, setViewingMemberId] = useState<number | null>(null);
  const [viewingRedeId, setViewingRedeId] = useState<number | null>(null);

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
    if (congregacaoId && isOpen) {
      setLoadingCongregacao(true);
      congregacoesService.getCongregacao(congregacaoId)
        .then(setCongregacao)
        .catch(err => {
          console.error('Erro ao carregar congregação:', err);
          setCongregacao(null);
        })
        .finally(() => setLoadingCongregacao(false));
    } else {
      setCongregacao(null);
    }
  }, [congregacaoId, isOpen]);

  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const formatAddress = (congregacao: Congregacao) => {
    const parts = [];
    if (congregacao.street) {
      let streetPart = congregacao.street;
      if (congregacao.streetNumber) streetPart += `, ${congregacao.streetNumber}`;
      parts.push(streetPart);
    }
    if (congregacao.neighborhood) parts.push(congregacao.neighborhood);
    if (congregacao.city) parts.push(congregacao.city);
    if (congregacao.state) parts.push(congregacao.state);
    
    return parts.length > 0 ? parts.join(' - ') : '—';
  };

  const redesCount = congregacao?.redes?.length || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gray-800 p-0 gap-0 overflow-hidden max-h-[90vh] rounded-lg">
        {loadingCongregacao && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
          </div>
        )}
        {!loadingCongregacao && congregacao && (
          <ScrollArea className="max-h-[90vh]">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-white">
                      {congregacao.name}
                    </h2>
                    {congregacao.isPrincipal && (
                      <Badge variant="default" className="bg-yellow-600 text-white text-[10px]">Principal</Badge>
                    )}
                    <Badge variant="default" className="text-[10px]">{redesCount} redes</Badge>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">ID: {congregacao.id}</p>
                </div>
              </div>

              {/* Liderança */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-3">Liderança</h3>
                <div className="space-y-3">
                  {/* Pastor de Governo */}
                  {congregacao.pastorGoverno ? (
                    <div 
                      onClick={() => setViewingMemberId(congregacao.pastorGoverno!.id)}
                      className="flex items-center gap-3 bg-gray-700/50 rounded-lg p-3 border border-gray-600 cursor-pointer hover:bg-gray-700 hover:border-blue-500 transition-all"
                    >
                      <Avatar className="h-11 w-11">
                        <AvatarImage src={congregacao.pastorGoverno.photoUrl} alt={congregacao.pastorGoverno.name} />
                        <AvatarFallback className="bg-blue-600 text-white text-sm font-semibold">
                          {getInitials(congregacao.pastorGoverno.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-white text-sm">{congregacao.pastorGoverno.name}</p>
                        <p className="text-xs text-gray-400">Pastor de Governo</p>
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
                        <p className="font-medium text-red-400 text-sm">Sem pastor de governo</p>
                        <p className="text-xs text-gray-400">Pastor não atribuído</p>
                      </div>
                    </div>
                  )}

                  {/* Vice Presidente */}
                  {congregacao.vicePresidente && (
                    <div 
                      onClick={() => setViewingMemberId(congregacao.vicePresidente!.id)}
                      className="flex items-center gap-3 bg-gray-700/50 rounded-lg p-3 border border-gray-600 cursor-pointer hover:bg-gray-700 hover:border-blue-500 transition-all"
                    >
                      <Avatar className="h-11 w-11">
                        <AvatarImage src={congregacao.vicePresidente.photoUrl} alt={congregacao.vicePresidente.name} />
                        <AvatarFallback className="bg-purple-600 text-white text-sm font-semibold">
                          {getInitials(congregacao.vicePresidente.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-white text-sm">{congregacao.vicePresidente.name}</p>
                        <p className="text-xs text-gray-400">Vice Presidente</p>
                      </div>
                    </div>
                  )}

                  {/* Kids Leader */}
                  {congregacao.kidsLeader && (
                    <div 
                      onClick={() => setViewingMemberId(congregacao.kidsLeader!.id)}
                      className="flex items-center gap-3 bg-gray-700/50 rounded-lg p-3 border border-gray-600 cursor-pointer hover:bg-gray-700 hover:border-blue-500 transition-all"
                    >
                      <Avatar className="h-11 w-11">
                        <AvatarImage src={congregacao.kidsLeader.photoUrl} alt={congregacao.kidsLeader.name} />
                        <AvatarFallback className="bg-pink-600 text-white text-sm font-semibold">
                          {getInitials(congregacao.kidsLeader.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-white text-sm">{congregacao.kidsLeader.name}</p>
                        <p className="text-xs text-gray-400">Responsável pela Rede Kids</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Endereço */}
              {(congregacao.street || congregacao.city || congregacao.state) && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Endereço
                  </h3>
                  <div className="bg-gray-700/50 rounded-lg p-3 border border-gray-600 space-y-3">
                    <div>
                      {congregacao.street && (
                        <p className="text-sm text-white">
                          {congregacao.street}
                          {congregacao.streetNumber && `, ${congregacao.streetNumber}`}
                        </p>
                      )}
                      {congregacao.complement && (
                        <p className="text-sm text-gray-400">{congregacao.complement}</p>
                      )}
                      {congregacao.neighborhood && (
                        <p className="text-sm text-gray-400">{congregacao.neighborhood}</p>
                      )}
                      {(congregacao.city || congregacao.state) && (
                        <p className="text-sm text-gray-400">
                          {congregacao.city}{congregacao.city && congregacao.state && ' - '}{congregacao.state}
                        </p>
                      )}
                      {congregacao.zipCode && (
                        <p className="text-sm text-gray-400">CEP: {congregacao.zipCode}</p>
                      )}
                    </div>
                    {/* Google Maps Embed */}
                    {(congregacao.street || congregacao.city) && (
                      <div className="rounded-lg overflow-hidden border border-gray-600 h-48">
                        <iframe
                          title="Mapa"
                          width="100%"
                          height="100%"
                          style={{ border: 0 }}
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          src={`https://maps.google.com/maps?q=${encodeURIComponent(formatAddress(congregacao))}&output=embed`}
                        />
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Redes List */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-3">
                  Redes ({redesCount})
                </h3>
                <div className="space-y-1">
                  {congregacao?.redes?.length === 0 && (
                    <p className="text-sm text-gray-400 py-2">Nenhuma rede encontrada nesta congregação.</p>
                  )}
                  {congregacao?.redes?.map(rede => (
                    <div 
                      key={rede.id}
                      onClick={() => setViewingRedeId(rede.id)}
                      className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-gray-700/30 transition-colors border border-transparent cursor-pointer hover:border-blue-500"
                    >
                      <Avatar className="h-8 w-8">
                        {rede.pastor ? (
                          <>
                            <AvatarImage src={rede.pastor.photoUrl} alt={rede.pastor.name} />
                            <AvatarFallback className="bg-blue-600 text-white text-xs font-semibold">
                              {getInitials(rede.pastor.name)}
                            </AvatarFallback>
                          </>
                        ) : (
                          <AvatarFallback className="bg-gray-600 text-white text-xs font-semibold">
                            ?
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-gray-200 font-medium">
                            {rede.name}
                          </p>
                          {rede.isKids && (
                            <Badge variant="default" className="bg-purple-600 text-white text-[10px]">Kids</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">
                          Pastor: {rede.pastor?.name || 'Sem pastor'}
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

      {viewingRedeId !== null && (
        <RedeViewModal
          redeId={viewingRedeId}
          isOpen={true}
          onClose={() => setViewingRedeId(null)}
        />
      )}
    </Dialog>
  );
}
