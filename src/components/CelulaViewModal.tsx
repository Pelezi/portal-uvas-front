"use client";

import React, { useEffect, useState } from 'react';
import { Celula, Member } from '@/types';
import { Calendar, Clock, MapPin, Network, BookOpen, Church, Home, Tag } from 'lucide-react';
import dayjs from 'dayjs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { memberService } from '@/services/memberService';

interface CelulaViewModalProps {
  celula: Celula | null;
  isOpen: boolean;
  onClose: () => void;
  discipuladorName?: string;
  redeName?: string;
  congregacaoName?: string;
}

export default function CelulaViewModal({
  celula,
  isOpen,
  onClose,
  discipuladorName,
  redeName,
  congregacaoName
}: CelulaViewModalProps) {
  const [celulaMembers, setCelulaMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    if (celula?.id && isOpen) {
      loadMembers();
    } else {
      setCelulaMembers([]);
    }
  }, [celula?.id, isOpen]);

  const loadMembers = async () => {
    if (!celula?.id) return;

    setLoadingMembers(true);
    try {
      const members = await memberService.getMembersAutocomplete({ celulaId: celula.id, isActive: true, all: true });
      setCelulaMembers(members || []);
    } catch (error) {
      console.error('Erro ao carregar membros:', error);
      setCelulaMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getWeekdayLabel = (weekday?: number | null) => {
    if (weekday === null || weekday === undefined) return '—';
    const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    return days[weekday] || '—';
  };

  const formatTime = (time?: string | null) => {
    if (!time) return '—';
    return time;
  };

  const formatAddress = (celula: Celula) => {
    const parts = [];
    if (celula.street) {
      let streetPart = celula.street;
      if (celula.streetNumber) streetPart += `, ${celula.streetNumber}`;
      parts.push(streetPart);
    }
    if (celula.neighborhood) parts.push(celula.neighborhood);
    if (celula.city) parts.push(celula.city);
    if (celula.state) parts.push(celula.state);

    return parts.length > 0 ? parts.join(' - ') : '—';
  };

  const getTypeLabel = (type?: string | null) => {
    if (!type) return '—';
    const types: Record<string, string> = {
      YOUNG: 'Jovens',
      ADULT: 'Adultos',
      TEENAGER: 'Adolescentes',
      CHILDISH: 'Crianças'
    };
    return types[type] || type;
  };

  const getLevelLabel = (level?: string | null) => {
    if (!level) return '—';
    const levels: Record<string, string> = {
      EVANGELISM: 'Evangelismo',
      EDIFICATION: 'Edificação',
      COMMUNION: 'Comunhão',
      MULTIPLICATION: 'Multiplicação',
      UNKNOWN: 'Desconhecido'
    };
    return levels[level] || level;
  };

  const formatDate = (date?: string | null) => {
    if (!date) return '—';
    return dayjs(date).format('DD/MM/YYYY');
  };

  const getMemberRoles = (member: Member) => {
    const roles: string[] = [];
    if (member.roles && member.roles.length > 0) {
      roles.push(...member.roles.map(r => r.role.name));
    }
    return roles;
  };

  const isLeaderInTraining = (memberId: number) => {
    return celula?.leadersInTraining?.some(lit => lit.memberId === memberId) || false;
  };

  const memberCount = celulaMembers.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gray-800 p-0 gap-0 overflow-hidden max-h-[90vh] rounded-lg">
        {celula && (
          <ScrollArea className="max-h-[90vh]">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-white">{celula.name}</h2>
                    <Badge variant="default" className="text-[10px]">{memberCount} membros</Badge>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">ID: {celula.id}</p>
                </div>
              </div>

              {/* Leadership */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-3">Liderança</h3>
                <div className="space-y-3">
                  {/* Leader */}
                  {celula.leader && (
                    <div className="flex items-center gap-3 bg-gray-700/50 rounded-lg p-3 border border-gray-600">
                      <Avatar className="h-11 w-11">
                        <AvatarImage src={celula.leader.photoUrl} alt={celula.leader.name} />
                        <AvatarFallback className="bg-blue-600 text-white text-sm font-semibold">
                          {getInitials(celula.leader.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-white text-sm">{celula.leader.name}</p>
                        <p className="text-xs text-gray-400">Líder de Célula</p>
                      </div>
                    </div>
                  )}

                  {/* Leaders in Training */}
                  {celula.leadersInTraining && celula.leadersInTraining.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 mb-2">Líderes em Treinamento</p>
                      <div className="flex flex-wrap gap-2">
                        {celula.leadersInTraining.map(lit => (
                          <div key={lit.id} className="flex items-center gap-2 bg-gray-900 rounded-full pl-1 pr-3 py-1 border border-gray-600">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={lit.member.photoUrl} alt={lit.member.name} />
                              <AvatarFallback className="bg-gray-600 text-gray-300 text-[10px] font-medium">
                                {getInitials(lit.member.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-gray-200">{lit.member.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Schedule & Location */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-3">Agenda & Local</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-200">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{getWeekdayLabel(celula.weekday)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-200">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>{formatTime(celula.time)}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-gray-200">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                    <span>{formatAddress(celula)}</span>
                  </div>
                  {/* Google Maps Embed */}
                  {(celula.street || celula.city) && (
                    <div className="rounded-lg overflow-hidden border border-gray-600 h-48">
                      <iframe
                        title="Mapa"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(formatAddress(celula))}&output=embed`}
                      />
                    </div>
                  )}
                </div>
              </section>

              {/* Parallel Célula */}
              {celula.parallelCelula && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-3">Célula Paralela</h3>
                  <div className="flex items-center gap-3 bg-gray-700/50 rounded-lg p-3 border border-gray-600">
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={celula.parallelCelula.leader?.photoUrl} alt={celula.parallelCelula.leader?.name} />
                      <AvatarFallback className="bg-purple-600 text-white text-sm font-semibold">
                        {getInitials(celula.parallelCelula.leader?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-sm truncate">{celula.parallelCelula.name}</p>
                      {celula.parallelCelula.leader && (
                        <p className="text-xs text-gray-400 truncate">Líder: {celula.parallelCelula.leader.name}</p>
                      )}
                      {(celula.parallelCelula.weekday !== null && celula.parallelCelula.weekday !== undefined) && (
                        <p className="text-xs text-gray-500">{getWeekdayLabel(celula.parallelCelula.weekday)}{celula.parallelCelula.time ? ` · ${formatTime(celula.parallelCelula.time)}` : ''}</p>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* Additional Information */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-3">Informações Adicionais</h3>
                <div className="space-y-3">
                  {/* Host */}
                  {celula.host && (
                    <div className="flex items-center gap-3 bg-gray-700/50 rounded-lg p-3 border border-gray-600">
                      <Home className="h-4 w-4 text-blue-400" />
                      <div>
                        <p className="text-xs text-gray-400">Anfitrião</p>
                        <p className="text-sm font-medium text-white">{celula.host.name}</p>
                      </div>
                    </div>
                  )}

                  {/* Opening Date, Type, Level */}
                  <div className="grid grid-cols-3 gap-3">
                    {celula.openingDate && (
                      <div className="bg-gray-700/50 rounded-lg p-3 border border-gray-600">
                        <p className="text-xs text-gray-400 mb-1">Data de Abertura</p>
                        <p className="text-sm font-medium text-white">{formatDate(celula.openingDate)}</p>
                      </div>
                    )}

                    {celula.type && (
                      <div className="bg-gray-700/50 rounded-lg p-3 border border-gray-600">
                        <p className="text-xs text-gray-400 mb-1">Tipo</p>
                        <p className="text-sm font-medium text-white">{getTypeLabel(celula.type)}</p>
                      </div>
                    )}

                    {celula.level && (
                      <div className="bg-gray-700/50 rounded-lg p-3 border border-gray-600">
                        <p className="text-xs text-gray-400 mb-1">Nível</p>
                        <p className="text-sm font-medium text-white">{getLevelLabel(celula.level)}</p>
                      </div>
                    )}
                  </div>

                  {/* Has Next Host */}
                  {celula.hasNextHost && (
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="text-xs bg-green-600">
                        <Tag className="h-3 w-3 mr-1" />
                        Possui próximo anfitrião
                      </Badge>
                    </div>
                  )}
                </div>
              </section>

              {/* Hierarchy */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-3">Hierarquia</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-700/50 rounded-lg p-3 border border-gray-600 text-center">
                    <BookOpen className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                    <p className="text-[10px] text-gray-400">Discipulado</p>
                    <p className="text-sm font-medium text-white">{discipuladorName || "—"}</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-3 border border-gray-600 text-center">
                    <Network className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                    <p className="text-[10px] text-gray-400">Rede</p>
                    <p className="text-sm font-medium text-white">{redeName || "—"}</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-3 border border-gray-600 text-center">
                    <Church className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                    <p className="text-[10px] text-gray-400">Congregação</p>
                    <p className="text-sm font-medium text-white">{congregacaoName || "—"}</p>
                  </div>
                </div>
              </section>

              {/* Members List */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-3">
                  Membros ({memberCount})
                </h3>
                <div className="space-y-1">
                  {loadingMembers && (
                    <p className="text-sm text-gray-400 py-2">Carregando membros...</p>
                  )}
                  {!loadingMembers && celulaMembers.length === 0 && (
                    <p className="text-sm text-gray-400 py-2">Nenhum membro encontrado nesta célula.</p>
                  )}
                  {!loadingMembers && celulaMembers.map(member => (
                    <div
                      key={member.id}
                      className={`flex items-center gap-3 rounded-lg p-2.5 hover:bg-gray-700/30 transition-colors ${isLeaderInTraining(member.id)
                          ? 'border-2 border-blue-500/40'
                          : 'border border-transparent'
                        }`}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.photoUrl} alt={member.name} />
                        <AvatarFallback className="bg-gray-600 text-gray-300 text-[10px] font-medium">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-gray-200 flex-1">{member.name}</span>
                      {getMemberRoles(member).map(role => (
                        <Badge key={role} variant="secondary" className="text-[10px]">{role}</Badge>
                      ))}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
