"use client";

import React, { useEffect, useState, useRef } from 'react';
import { celulasService } from '@/services/celulasService';
import { discipuladosService } from '@/services/discipuladosService';
import { redesService } from '@/services/redesService';
import { congregacoesService } from '@/services/congregacoesService';
import { membersService } from '@/services/membersService';
import { Celula, Member, Discipulado, Rede, Congregacao, MemberFilters } from '@/types';
import toast from 'react-hot-toast';
import { createTheme, FormControl, InputLabel, MenuItem, Select, ThemeProvider, Button } from '@mui/material';
import { FiEdit2, FiTrash2, FiPlus } from 'react-icons/fi';
import MemberModal from '@/components/MemberModal';
import MemberViewModal from '@/components/MemberViewModal';
import { useAuth } from '@/contexts/AuthContext';

export default function MembersManagementPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [celulas, setCelulas] = useState<Celula[]>([]);
  const [discipulados, setDiscipulados] = useState<Discipulado[]>([]);
  const [congregacoes, setCongregacoes] = useState<Congregacao[]>([]);
  const [redes, setRedes] = useState<Rede[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const hasInitialized = useRef(false);
  const filtersInitialized = useRef(false);

  // Filters
  const [filterCelulaId, setFilterCelulaId] = useState<number | null>(null);
  const [filterDiscipuladoId, setFilterDiscipuladoId] = useState<number | null>(null);
  const [filterCongregacaoId, setFilterCongregacaoId] = useState<number | null>(null);
  const [filterRedeId, setFilterRedeId] = useState<number | null>(null);

  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [confirmingMember, setConfirmingMember] = useState<Member | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMember, setModalMember] = useState<Member | null>(null);
  
  // View modal state
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingMember, setViewingMember] = useState<Member | null>(null);

  const muiTheme = createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: '#ffffffff',
      },
    },
  });

  useEffect(() => {
    const loadFilters = async () => {
      if (authLoading) return;
      try {
        const [c, d, r, cong] = await Promise.all([
          celulasService.getCelulas(),
          discipuladosService.getDiscipulados(),
          redesService.getRedes(),
          congregacoesService.getCongregacoes()
        ]);
        setCelulas(c);
        setDiscipulados(d);
        setRedes(r);
        setCongregacoes(cong);

        // Inicializar filtros baseados no usuário logado (apenas uma vez)
        if (!hasInitialized.current && user) {
          hasInitialized.current = true;
          
          // Verificar se o usuário tem associações e selecionar a primeira
          if (user.celula?.id) {
            // Tem célula associada
            setFilterCelulaId(user.celula.id);
            
            // Buscar discipulado e rede da célula
            const celula = c.find(cel => cel.id === user.celula?.id);
            if (celula?.discipuladoId) {
              setFilterDiscipuladoId(celula.discipuladoId);
              
              const discipulado = d.find(disc => disc.id === celula.discipuladoId);
              if (discipulado?.redeId) {
                setFilterRedeId(discipulado.redeId);
                
                const rede = r.find(rd => rd.id === discipulado.redeId);
                if (rede?.congregacaoId) {
                  setFilterCongregacaoId(rede.congregacaoId);
                }
              }
            }
          } else {
            // Verificar se é discipulador
            const userDiscipulado = d.find(disc => disc.discipuladorMemberId === user.id);
            if (userDiscipulado) {
              setFilterDiscipuladoId(userDiscipulado.id);
              if (userDiscipulado.redeId) {
                setFilterRedeId(userDiscipulado.redeId);
                
                const rede = r.find(rd => rd.id === userDiscipulado.redeId);
                if (rede?.congregacaoId) {
                  setFilterCongregacaoId(rede.congregacaoId);
                }
              }
            } else {
              // Verificar se é pastor de rede
              const userRede = r.find(rede => rede.pastorMemberId === user.id);
              if (userRede) {
                setFilterRedeId(userRede.id);
                if (userRede.congregacaoId) {
                  setFilterCongregacaoId(userRede.congregacaoId);
                }
              }
            }
          }
          
          // Marcar que os filtros foram inicializados
          filtersInitialized.current = true;
        } else if (!hasInitialized.current) {
          // Se não há usuário ainda, marcar como inicializado para evitar loop
          filtersInitialized.current = true;
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadFilters();
  }, [user, authLoading]);

  useEffect(() => {
    const loadMembers = async () => {
      // Aguardar inicialização dos filtros e autenticação
      if (!filtersInitialized.current || authLoading) {
        return;
      }
      
      setLoading(true);
      try {
        const filters: MemberFilters = {};
        // filterCelulaId = 0 significa "sem célula", null significa "todas"
        if (filterCelulaId !== null) filters.celulaId = filterCelulaId;
        if (filterDiscipuladoId) filters.discipuladoId = filterDiscipuladoId;
        if (filterRedeId) filters.redeId = filterRedeId;
        if (filterCongregacaoId) filters.congregacaoId = filterCongregacaoId;

        const m = await membersService.getAllMembers(filters);
        setMembers(m);
      } catch (e) {
        console.error(e);
        toast.error('Falha ao carregar membros');
      } finally {
        setLoading(false);
      }
    };
    loadMembers();
  }, [filterCelulaId, filterDiscipuladoId, filterRedeId, filterCongregacaoId, authLoading]);

  const openEditModal = (m: Member) => {
    setModalMember(m);
    setIsModalOpen(true);
  };

  const openViewModal = (m: Member) => {
    setViewingMember(m);
    setIsViewModalOpen(true);
  };

  const openCreateModal = () => {
    setModalMember(null);
    setIsModalOpen(true);
  };

  const handleModalSave = async (data: Partial<Member>): Promise<Member> => {
    let savedMember: Member;
    const wasCreating = !modalMember;
    const wasEnablingAccess = !modalMember?.hasSystemAccess && data.hasSystemAccess;
    
    try {
      if (modalMember) {
        // Editing
        savedMember = await membersService.updateMember(modalMember.celulaId || 0, modalMember.id, data);
        toast.success('Membro atualizado');
      } else {
        // Creating - name is required
        if (!data.name) {
          toast.error('Nome é obrigatório');
          throw new Error('Nome é obrigatório');
        }
        savedMember = await membersService.addMember(data.celulaId ?? null, data as Partial<Member> & { name: string });
        toast.success('Membro criado com sucesso');
      }

      // Reload members
      const filters: MemberFilters = {};
      if (filterCelulaId !== null) filters.celulaId = filterCelulaId;
      if (filterDiscipuladoId) filters.discipuladoId = filterDiscipuladoId;
      if (filterRedeId) filters.redeId = filterRedeId;
      if (filterCongregacaoId) filters.congregacaoId = filterCongregacaoId;
      const refreshed = await membersService.getAllMembers(filters);
      setMembers(refreshed);
      setIsModalOpen(false);
      setModalMember(null);

      // Enviar convite em background após fechar o modal
      const shouldSendInvite = data.hasSystemAccess && data.email && data.email.trim() && (
        wasCreating || // Criar novo membro com acesso
        (wasEnablingAccess && modalMember?.hasDefaultPassword !== false && !modalMember?.inviteSent) // Ativando acesso pela primeira vez
      );

      if (shouldSendInvite) {
        // Enviar em background sem bloquear
        membersService.sendInvite(savedMember.id)
          .then((response) => {
            const message = response.whatsappSent 
              ? 'Convite enviado por email e WhatsApp' 
              : 'Convite enviado por email';
            toast.success(message);
          })
          .catch((inviteErr: any) => {
            console.error('Erro ao enviar convite:', inviteErr);
            toast.error(inviteErr.response?.data?.message || 'Erro ao enviar convite, mas o membro foi salvo');
          });
      }

      return savedMember;
    } catch (e) {
      console.error(e);
      toast.error('Falha ao salvar');
      throw e;
    }
  };

  const removeMember = (member: Member) => {
    setConfirmingMember(member);
  };

  // Verifica se o usuário pode editar/deletar um membro específico
  const canManageMember = (member: Member): boolean => {
    if (!user) return false;
    
    // Admin pode gerenciar todos
    const isAdmin = user.roles?.some((r: any) => r.role?.isAdmin);
    
    if (isAdmin) return true;
    
    // Membro sem célula pode ser gerenciado
    if (!member.celulaId) return true;
    
    // Verificar se o membro está na mesma rede/discipulado/célula
    const memberCelula = celulas.find(c => c.id === member.celulaId);
    
    // Verificar se usuário tem célula e é a mesma célula do membro
    if (user.celula?.id === member.celulaId) {
      // Verificar hierarquia ministerial
      return isLowerMinistryLevel(member);
    }
    
    // Verificar se o usuário é discipulador do membro
    if (memberCelula?.discipuladoId) {
      const memberDiscipulado = discipulados.find(d => d.id === memberCelula.discipuladoId);
      if (memberDiscipulado?.discipuladorMemberId === user.id) {
        return isLowerMinistryLevel(member);
      }
      
      // Verificar se está na mesma rede
      if (memberDiscipulado?.redeId) {
        const memberRede = redes.find(r => r.id === memberDiscipulado.redeId);
        if (memberRede?.pastorMemberId === user.id) {
          return isLowerMinistryLevel(member);
        }
      }
    }
    
    return false;
  };

  // Verifica se o membro tem nível ministerial inferior ao usuário logado
  const isLowerMinistryLevel = (member: Member): boolean => {
    if (!user?.ministryPosition?.priority || !member.ministryPosition?.priority) {
      return true; // Se não tem priority definido, permite
    }
    
    // Priority maior = cargo menor na hierarquia
    return member.ministryPosition.priority > user.ministryPosition.priority;
  };

  // Retorna as tags de liderança do membro
  const getLeadershipTags = (member: Member): { label: string; color: string }[] => {
    const tags: { label: string; color: string }[] = [];
    
    // Pastor de Governo de Congregação
    if (member.congregacoesPastorGoverno && member.congregacoesPastorGoverno.length > 0) {
      tags.push({ label: 'Pastor de Governo', color: 'text-purple-400' });
    }
    
    // Vice-Presidente de Congregação
    if (member.congregacoesVicePresidente && member.congregacoesVicePresidente.length > 0) {
      tags.push({ label: 'Vice-Presidente', color: 'text-purple-400' });
    }
    
    // Pastor de Rede
    if (member.redes && member.redes.length > 0) {
      tags.push({ label: 'Pastor de Rede', color: 'text-blue-400' });
    }
    
    // Discipulador
    if (member.discipulados && member.discipulados.length > 0) {
      tags.push({ label: 'Discipulador', color: 'text-green-400' });
    }
    
    // Líder de Célula
    if (member.ledCelulas && member.ledCelulas.length > 0) {
      tags.push({ label: 'Líder de Célula', color: 'text-yellow-400' });
    }
    
    // Vice-Líder de Célula
    if (member.viceLedCelulas && member.viceLedCelulas.length > 0) {
      tags.push({ label: 'Líder em Treinamento', color: 'text-yellow-400' });
    }
    
    return tags;
  };

  const performDeleteMember = async () => {
    const member = confirmingMember;
    if (!member) return;
    try {
      await membersService.deleteMember(member.celulaId || 0, member.id);
      toast.success('Membro removido da célula');

      // Reload members
      const filters: MemberFilters = {};
      if (filterCelulaId !== null) filters.celulaId = filterCelulaId;
      if (filterDiscipuladoId) filters.discipuladoId = filterDiscipuladoId;
      if (filterRedeId) filters.redeId = filterRedeId;
      if (filterCongregacaoId) filters.congregacaoId = filterCongregacaoId;
      const refreshed = await membersService.getAllMembers(filters);
      setMembers(refreshed);
      setConfirmingMember(null);
    } catch (e) {
      console.error(e);
      toast.error('Falha ao remover');
    }
  };

  const cancelDelete = () => setConfirmingMember(null);

  return (
    <div className="relative pb-20">
      <ThemeProvider theme={muiTheme}>
        <h2 className="text-2xl font-semibold mb-4">Gestão de Membros</h2>

        <div className="mb-6">
          <label className="block mb-2">Filtros</label>
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <div className="w-full sm:w-48">
              <FormControl fullWidth>
                <InputLabel id="filter-congregacao-label" size='small'>Congregação</InputLabel>
                <Select
                  labelId="filter-congregacao-label"
                  value={filterCongregacaoId !== null ? String(filterCongregacaoId) : ''}
                  label="Congregação"
                  onChange={(e) => {
                    setFilterCongregacaoId(e.target.value ? Number(e.target.value) : null);
                    setFilterRedeId(null);
                    setFilterDiscipuladoId(null);
                    setFilterCelulaId(null);
                  }}
                  size="small"
                  className="bg-gray-800"
                >
                  <MenuItem value="">Todas congregações</MenuItem>
                  {congregacoes.map(c => (
                    <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>

            <div className="w-full sm:w-48">
              <FormControl fullWidth>
                <InputLabel id="filter-rede-label" size='small'>Rede</InputLabel>
                <Select
                  labelId="filter-rede-label"
                  value={filterRedeId !== null ? String(filterRedeId) : ''}
                  label="Rede"
                  onChange={(e) => {
                    const redeId = e.target.value ? Number(e.target.value) : null;
                    setFilterRedeId(redeId);
                    setFilterDiscipuladoId(null);
                    setFilterCelulaId(null);
                    
                    // Auto-preencher congregação
                    if (redeId) {
                      const rede = redes.find(r => r.id === redeId);
                      if (rede?.congregacaoId) {
                        setFilterCongregacaoId(rede.congregacaoId);
                      }
                    }
                  }}
                  size="small"
                  className="bg-gray-800"
                >
                  <MenuItem value="">Todas redes</MenuItem>
                  {redes.filter(r => !filterCongregacaoId || r.congregacaoId === filterCongregacaoId).map(r => (
                    <MenuItem key={r.id} value={String(r.id)}>{r.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>

            <div className="w-full sm:w-48">
              <FormControl fullWidth>
                <InputLabel id="filter-discipulado-label" size='small'>Discipulado</InputLabel>
                <Select
                  labelId="filter-discipulado-label"
                  value={filterDiscipuladoId !== null ? String(filterDiscipuladoId) : ''}
                  label="Discipulado"
                  onChange={(e) => {
                    const discipuladoId = e.target.value ? Number(e.target.value) : null;
                    setFilterDiscipuladoId(discipuladoId);
                    setFilterCelulaId(null);
                    
                    // Auto-preencher rede e congregação
                    if (discipuladoId) {
                      const discipulado = discipulados.find(d => d.id === discipuladoId);
                      if (discipulado?.redeId) {
                        setFilterRedeId(discipulado.redeId);
                        const rede = redes.find(r => r.id === discipulado.redeId);
                        if (rede?.congregacaoId) {
                          setFilterCongregacaoId(rede.congregacaoId);
                        }
                      }
                    }
                  }}
                  size="small"
                  className="bg-gray-800"
                >
                  <MenuItem value="">Todos</MenuItem>
                  {discipulados
                    .filter(d => !filterRedeId || d.redeId === filterRedeId)
                    .map(d => (
                      <MenuItem key={d.id} value={String(d.id)}>
                        {d.discipulador.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </div>

            <div className="w-full sm:w-48">
              <FormControl fullWidth>
                <InputLabel id="filter-celula-label" size='small'>Célula</InputLabel>
                <Select
                  labelId="filter-celula-label"
                  value={filterCelulaId !== null ? String(filterCelulaId) : ''}
                  label="Célula"
                  onChange={(e) => {
                    const value = e.target.value === '' ? null : Number(e.target.value);
                    setFilterCelulaId(value);
                    
                    // Se selecionar "Sem célula" (0), limpar filtros superiores
                    if (value === 0) {
                      setFilterRedeId(null);
                      setFilterDiscipuladoId(null);
                      setFilterCongregacaoId(null);
                    } else if (value) {
                      // Auto-preencher discipulado, rede e congregação
                      const celula = celulas.find(c => c.id === value);
                      if (celula?.discipuladoId) {
                        setFilterDiscipuladoId(celula.discipuladoId);
                        const discipulado = discipulados.find(d => d.id === celula.discipuladoId);
                        if (discipulado?.redeId) {
                          setFilterRedeId(discipulado.redeId);
                          const rede = redes.find(r => r.id === discipulado.redeId);
                          if (rede?.congregacaoId) {
                            setFilterCongregacaoId(rede.congregacaoId);
                          }
                        }
                      }
                    }
                  }}
                  size="small"
                  className="bg-gray-800"
                >
                  <MenuItem value="">Todas</MenuItem>
                  <MenuItem value="0">Sem célula</MenuItem>
                  {celulas
                    .filter(c => !filterDiscipuladoId || c.discipuladoId === filterDiscipuladoId)
                    .map(c => (<MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>))}
                </Select>
              </FormControl>
            </div>

            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setFilterCongregacaoId(null);
                setFilterRedeId(null);
                setFilterDiscipuladoId(null);
                setFilterCelulaId(null);
              }}
              className="h-10 whitespace-nowrap"
            >
              Limpar Filtros
            </Button>
          </div>
        </div>

        <div>
          <div className="flex items-center mb-3">
            <h3 className="font-medium">Membros ({members.length})</h3>
          </div>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
          <ul className="space-y-2">
            {members.map((m) => {
              const leadershipTags = getLeadershipTags(m);
              const hasLeadership = leadershipTags.length > 0;
              const showNoCelula = !m.celulaId && !hasLeadership;

              return (
                <li
                  key={m.id}
                  className={`flex items-center gap-3 border p-2 rounded ${showNoCelula ? 'bg-red-900/20 border-red-700' : 'bg-gray-900'}`}
                >
                  <span className="flex-1">
                    <button
                      onClick={() => openViewModal(m)}
                      className="text-left hover:text-blue-400 transition-colors font-medium"
                    >
                      {m.name}
                    </button>
                    {showNoCelula && <span className="text-xs text-red-400 ml-2 font-semibold">(sem célula)</span>}
                    {m.celula && (
                      <span className="text-xs text-gray-400 ml-2">
                        - {m.celula.name}
                      </span>
                    )}
                    {leadershipTags.map((tag, idx) => (
                      <span key={idx} className={`text-xs ${tag.color} ml-2 font-semibold`}>
                        {tag.label}
                      </span>
                    ))}
                    {!m.isActive && <span className="text-xs text-gray-400 ml-2">(desligado)</span>}
                  </span>
                  {canManageMember(m) && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(m)}
                        aria-label="Editar membro"
                        className="p-1 rounded hover:bg-gray-800"
                      >
                        <FiEdit2 className="h-4 w-4 text-yellow-500" aria-hidden />
                      </button>
                      {m.celulaId && (
                        <button
                          onClick={() => removeMember(m)}
                          aria-label="Remover membro da célula"
                          className="p-1 rounded hover:bg-gray-800"
                        >
                          <FiTrash2 className="h-4 w-4 text-red-600" aria-hidden />
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          )}
        </div>

        {/* Floating Action Button */}
        <button
          onClick={openCreateModal}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-40"
          aria-label="Adicionar Membro"
        >
          <FiPlus className="h-6 w-6" />
        </button>

        {/* Member Modal */}
        <MemberModal
          member={modalMember}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setModalMember(null);
          }}
          onSave={handleModalSave}
          celulas={celulas}
        />

        {/* Member View Modal */}
        <MemberViewModal
          member={viewingMember}
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setViewingMember(null);
          }}
        />

        {/* Delete confirmation modal */}
        {confirmingMember && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-gray-900 p-6 rounded w-11/12 sm:w-96">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Confirmação</h3>
                <p className="text-sm text-gray-400">Tem certeza que deseja remover <strong>{confirmingMember.name}</strong> da célula? O membro não será excluído, apenas sua associação com a célula será removida.</p>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={cancelDelete} className="px-3 py-2 border rounded">Cancelar</button>
                <button onClick={performDeleteMember} className="px-3 py-2 bg-red-600 text-white rounded">Remover da célula</button>
              </div>
            </div>
          </div>
        )}
      </ThemeProvider>
    </div>
  );
}
