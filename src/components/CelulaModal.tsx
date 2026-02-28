"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Celula, Member, Discipulado, Rede, Congregacao } from '@/types';
import { congregacoesService } from '@/services/congregacoesService';
import { createTheme, ThemeProvider, TextField } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/pt-br';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import SingleMemberSelect from '@/components/SingleMemberSelect';
import MultiMemberSelect from '@/components/MultiMemberSelect';
import StyledSelect from '@/components/StyledSelect';

interface CelulaModalProps {
  celulaId?: number | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    leaderMemberId?: number;
    hostMemberId?: number;
    discipuladoId?: number;
    leaderInTrainingIds?: number[];
    weekday?: number;
    time?: string;
    openingDate?: string;
    hasNextHost?: boolean;
    type?: string;
    level?: string;
    country?: string;
    zipCode?: string;
    street?: string;
    streetNumber?: string;
    neighborhood?: string;
    city?: string;
    complement?: string;
    state?: string;
    parallelCelulaId?: number | null;
  }) => Promise<void>;
  members: Member[];
  discipulados: Discipulado[];
  redes: Rede[];
}

export default function CelulaModal({
  celulaId,
  isOpen,
  onClose,
  onSave,
  members,
  discipulados,
  redes
}: CelulaModalProps) {
  const isEditing = !!celulaId;
  const { user } = useAuth();

  // Estados
  const [celula, setCelula] = useState<Celula | null>(null);
  const [loadingCelula, setLoadingCelula] = useState(false);
  const [name, setName] = useState('');
  const [congregacoes, setCongregacoes] = useState<Congregacao[]>([]);
  const [congregacaoId, setCongregacaoId] = useState<number | null>(null);
  const [redeId, setRedeId] = useState<number | null>(null);
  const [discipuladoId, setDiscipuladoId] = useState<number | null>(null);
  const [leaderId, setLeaderId] = useState<number | null>(null);
  const [leaderInTrainingIds, setLeaderInTrainingIds] = useState<number[]>([]);
  const [celulaMemberOptions, setCelulaMemberOptions] = useState<Member[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]); // Todos os membros para células Kids
  const [allCelulas, setAllCelulas] = useState<Celula[]>([]); // Todas as células para verificar disponibilidade
  const [weekday, setWeekday] = useState<number | null>(null);
  const [time, setTime] = useState<Dayjs | null>(() => dayjs().hour(19).minute(30));

  // Address fields
  const [country, setCountry] = useState('Brasil');
  const [zipCode, setZipCode] = useState('');
  const [street, setStreet] = useState('');
  const [streetNumber, setStreetNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [complement, setComplement] = useState('');
  const [state, setState] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);

  // New fields
  const [hostId, setHostId] = useState<number | null>(null);
  const [openingDate, setOpeningDate] = useState<Dayjs | null>(null);
  const [hasNextHost, setHasNextHost] = useState(false);
  const [celulaType, setCelulaType] = useState<string>('');
  const [celulaLevel, setCelulaLevel] = useState<string>('');
  const [parallelCelulaId, setParallelCelulaId] = useState<number | null>(null);
  const [parallelCelulaOptions, setParallelCelulaOptions] = useState<Celula[]>([]);
  const [hasLoadedMainCongregacaoAddress, setHasLoadedMainCongregacaoAddress] = useState(false);

  // Validação
  const [touched, setTouched] = useState({
    name: false,
    discipulado: false,
  });

  // Kids validation
  const [genderError, setGenderError] = useState('');



  // Lógica de permissões para edição
  const editPermissions = useMemo(() => {
    // Modo criação - pode editar tudo
    if (!isEditing) {
      return {
        canEditCongregacao: true,
        canEditRede: true,
        canEditDiscipulado: true,
        canEditLeader: true,
      };
    }

    // Se não há user ou célula, não pode editar nada
    if (!user?.permission || !celula) {
      return {
        canEditCongregacao: false,
        canEditRede: false,
        canEditDiscipulado: false,
        canEditLeader: false,
      };
    }

    const permission = user.permission;

    // Admin pode editar tudo
    if (permission.isAdmin) {
      return {
        canEditCongregacao: true,
        canEditRede: true,
        canEditDiscipulado: true,
        canEditLeader: true,
      };
    }

    // Pastor presidente da congregação principal da cidade pode editar tudo
    const mainCongregacao = congregacoes.find(c => c.isPrincipal);
    if (mainCongregacao && (
      mainCongregacao.pastorGovernoMemberId === permission.id ||
      mainCongregacao.vicePresidenteMemberId === permission.id
    )) {
      return {
        canEditCongregacao: true,
        canEditRede: true,
        canEditDiscipulado: true,
        canEditLeader: true,
      };
    }

    // Pastor da congregação da célula - não pode alterar a congregação
    if (celula.discipulado?.rede.congregacao?.pastorGovernoMemberId === permission.id ||
      celula.discipulado?.rede.congregacao?.vicePresidenteMemberId === permission.id
    ) {
      return {
        canEditCongregacao: false,
        canEditRede: true,
        canEditDiscipulado: true,
        canEditLeader: true,
      };
    }

    // Pastor da rede da célula - não pode editar a rede (nem congregação)
    if (celula.discipulado?.rede?.pastorMemberId === permission.id) {
      return {
        canEditCongregacao: false,
        canEditRede: false,
        canEditDiscipulado: true,
        canEditLeader: true,
      };
    }

    // Discipulador - não pode alterar o discipulado (nem rede, nem congregação)
    if (celula.discipulado?.discipuladorMemberId === permission.id) {
      return {
        canEditCongregacao: false,
        canEditRede: false,
        canEditDiscipulado: false,
        canEditLeader: true,
      };
    }

    // Líder - não pode alterar o líder (nem discipulado, nem rede, nem congregação)
    if (celula.leaderMemberId === permission.id) {
      return {
        canEditCongregacao: false,
        canEditRede: false,
        canEditDiscipulado: false,
        canEditLeader: false,
      };
    }

    // Caso padrão - não pode editar nada
    return {
      canEditCongregacao: false,
      canEditRede: false,
      canEditDiscipulado: false,
      canEditLeader: false,
    };
  }, [isEditing, user, celula, congregacoes, discipulados, redes]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  // Fetch celula data by ID when editing
  useEffect(() => {
    const fetchCelula = async () => {
      if (!celulaId || !isOpen) {
        setCelula(null);
        return;
      }

      setLoadingCelula(true);
      try {
        const { celulasService } = await import('@/services/celulasService');
        const data = await celulasService.getCelula(celulaId);
        setCelula(data);
      } catch (error) {
        console.error('Error loading celula:', error);
        toast.error('Erro ao carregar dados da célula');
        onClose();
      } finally {
        setLoadingCelula(false);
      }
    };

    fetchCelula();
  }, [celulaId, isOpen, onClose]);

  const muiTheme = createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: '#ffffffff',
      },
    },
  });

  // Carregar congregações
  useEffect(() => {
    const loadCongregacoes = async () => {
      try {
        const isAdmin = user?.permission?.isAdmin || false;
        const data = await congregacoesService.getCongregacoes(isAdmin ? { all: true } : undefined);
        setCongregacoes(data || []);
        
        // Preencher cidade e estado da congregação principal automaticamente (apenas na criação)
        if (!celula && data && data.length > 0 && !hasLoadedMainCongregacaoAddress) {
          const mainCongregacao = data.find(c => c.isPrincipal);
          if (mainCongregacao) {
            if (mainCongregacao.city) setCity(mainCongregacao.city);
            if (mainCongregacao.state) setState(mainCongregacao.state);
            setHasLoadedMainCongregacaoAddress(true);
          }
        }
      } catch (error) {
        console.error('Error loading congregações:', error);
      }
    };
    loadCongregacoes();
  }, [user, celulaId, hasLoadedMainCongregacaoAddress]);

  useEffect(() => {
    if (celula) {
      // Modo edição
      setName(celula.name || '');
      setLeaderId(celula.leaderMemberId ?? null);
      setDiscipuladoId(celula.discipuladoId ?? null);
      setWeekday(celula.weekday ?? null);
      setTime(celula.time ? dayjs(celula.time, 'HH:mm') : dayjs().hour(19).minute(30));

      // Address fields
      setCountry(celula.country || 'Brasil');
      setZipCode(celula.zipCode || '');
      setStreet(celula.street || '');
      setStreetNumber(celula.streetNumber || '');
      setNeighborhood(celula.neighborhood || '');
      setCity(celula.city || '');
      setComplement(celula.complement || '');
      setState(celula.state || '');

      // New fields
      setHostId(celula.hostMemberId ?? null);
      setOpeningDate(celula.openingDate ? dayjs(celula.openingDate) : null);
      setHasNextHost(celula.hasNextHost ?? false);
      setCelulaType(celula.type || '');
      setCelulaLevel(celula.level || '');
      setParallelCelulaId(celula.parallelCelulaId ?? null);

      // Encontrar a rede e congregação através do discipulado
      if (celula.discipuladoId) {
        const disc = discipulados.find(d => d.id === celula.discipuladoId);
        if (disc) {
          setRedeId(disc.redeId);
          const rede = redes.find(r => r.id === disc.redeId);
          if (rede) {
            setCongregacaoId(rede.congregacaoId);
          }
        }
      }
    } else {
      // Modo criação
      resetForm();
    }
  }, [celula, discipulados]);

  // Carregar membros da célula quando editando - APENAS quando o modal está aberto
  useEffect(() => {
    const loadCelulaMembers = async () => {
      // Só carregar se o modal estiver aberto e houver uma célula
      if (!isOpen || !celula?.id) {
        return;
      }
      
      try {
        const { memberService } = await import('@/services/memberService');
        const { celulasService } = await import('@/services/celulasService');
        const data = await memberService.getMembers(celula.id);
        setCelulaMemberOptions(data || []);
        
        // Inicializar líderes em treinamento
        if (celula.leadersInTraining) {
          setLeaderInTrainingIds(celula.leadersInTraining.map(lit => lit.member.id));
        }
        
        // Carregar todos os membros e células para células Kids
        const selectedDiscipulado = discipulados.find(d => d.id === celula.discipuladoId);
        
        if (selectedDiscipulado) {
          const selectedRede = redes.find(r => r.id === selectedDiscipulado.redeId);
          
          if (selectedRede?.isKids) {
            
            // Buscar todos os discípulos do discipulador (célula Kids)
            const allMembersData = await memberService.getMembersAutocomplete({ 
              discipleOfId: selectedDiscipulado.id,
              all: true 
            });
            
            // Incluir também a discipuladora e a pastora da rede
            const additionalMembers: any[] = [];
            
            // Adicionar discipuladora se existir
            if (selectedDiscipulado.discipuladorMemberId && selectedDiscipulado.discipulador) {
              const alreadyIncluded = (allMembersData || []).some(m => m.id === selectedDiscipulado.discipuladorMemberId);
              if (!alreadyIncluded) {
                additionalMembers.push(selectedDiscipulado.discipulador);
              }
            }
            
            // Adicionar pastora da rede se existir
            if (selectedRede.pastorMemberId && selectedRede.pastor) {
              const alreadyIncluded = (allMembersData || []).some(m => m.id === selectedRede.pastorMemberId) || 
                                     additionalMembers.some(m => m.id === selectedRede.pastorMemberId);
              if (!alreadyIncluded) {
                additionalMembers.push(selectedRede.pastor);
              }
            }
            
            setAllMembers([...(allMembersData || []), ...additionalMembers]);
            
            // Buscar todas as células para verificar disponibilidade
            const allCelulasData = await celulasService.getCelulas();
            setAllCelulas(allCelulasData || []);
          }
        }
      } catch (error) {
        console.error('Error loading celula members:', error);
      }
    };
    
    loadCelulaMembers();
  }, [isOpen, celula, discipulados, redes]); // Adicionado isOpen como dependência

  // Limpar estados quando o modal for fechado para liberar memória
  useEffect(() => {
    if (!isOpen) {
      setCelulaMemberOptions([]);
      setAllMembers([]);
      setAllCelulas([]);
      setParallelCelulaOptions([]);
    }
  }, [isOpen]);

  // Carregar todas as células para o select de célula paralela
  useEffect(() => {
    if (!isOpen) return;
    const loadParallelCelulaOptions = async () => {
      try {
        const { celulasService } = await import('@/services/celulasService');
        const data = await celulasService.getCelulas({ all: true });
        setParallelCelulaOptions(data || []);
      } catch (error) {
        console.error('Error loading celulas for parallel select:', error);
      }
    };
    loadParallelCelulaOptions();
  }, [isOpen]);

  // Carregar membros quando discipuladoId muda (para criação de células Kids)
  useEffect(() => {
    const loadDiscipuladoMembers = async () => {
      // Só carregar se não estiver editando e houver discipuladoId
      if (isEditing || !discipuladoId || !isOpen) {
        return;
      }

      const selectedDiscipulado = discipulados.find(d => d.id === discipuladoId);
      if (!selectedDiscipulado) return;

      const selectedRede = redes.find(r => r.id === selectedDiscipulado.redeId);
      if (!selectedRede?.isKids) {
        // Se não for Kids, limpar allMembers
        setAllMembers([]);
        setAllCelulas([]);
        return;
      }

      try {
        const { memberService } = await import('@/services/memberService');
        const { celulasService } = await import('@/services/celulasService');
        
        // Buscar todos os discípulos do discipulador (célula Kids)
        const allMembersData = await memberService.getMembersAutocomplete({ 
          discipleOfId: selectedDiscipulado.id,
          all: true 
        });
        
        // Incluir também a discipuladora e a pastora da rede
        const additionalMembers: any[] = [];
        
        // Adicionar discipuladora se existir
        if (selectedDiscipulado.discipuladorMemberId && selectedDiscipulado.discipulador) {
          const alreadyIncluded = (allMembersData || []).some(m => m.id === selectedDiscipulado.discipuladorMemberId);
          if (!alreadyIncluded) {
            additionalMembers.push(selectedDiscipulado.discipulador);
          }
        }
        
        // Adicionar pastora da rede se existir
        if (selectedRede.pastorMemberId && selectedRede.pastor) {
          const alreadyIncluded = (allMembersData || []).some(m => m.id === selectedRede.pastorMemberId) || 
                                 additionalMembers.some(m => m.id === selectedRede.pastorMemberId);
          if (!alreadyIncluded) {
            additionalMembers.push(selectedRede.pastor);
          }
        }
        
        setAllMembers([...(allMembersData || []), ...additionalMembers]);
        
        // Buscar todas as células para verificar disponibilidade
        const allCelulasData = await celulasService.getCelulas();
        setAllCelulas(allCelulasData || []);
      } catch (error) {
        console.error('Error loading discipulado members:', error);
      }
    };

    loadDiscipuladoMembers();
  }, [discipuladoId, isOpen, isEditing, discipulados, redes]);

  // Validar gênero quando rede Kids é selecionada
  useEffect(() => {
    if (!redeId && !discipuladoId) {
      setGenderError('');
      return;
    }
    
    // Encontrar a rede - pode vir direto do redeId ou do discipulado
    let selectedRede = redes.find(r => r.id === redeId);
    
    // Se não tem redeId mas tem discipuladoId, buscar a rede do discipulado
    if (!selectedRede && discipuladoId) {
      const selectedDiscipulado = discipulados.find(d => d.id === discipuladoId);
      if (selectedDiscipulado) {
        selectedRede = redes.find(r => r.id === selectedDiscipulado.redeId);
      }
    }
    
    // Validar se é rede Kids e se o líder selecionado é feminino
    if (selectedRede?.isKids && leaderId) {
      // Para redes Kids, verificar no allMembers se disponível, senão em members
      const membersList = allMembers.length > 0 ? allMembers : members;
      const selectedMember = membersList.find(m => m.id === leaderId);
      if (selectedMember && selectedMember.gender !== 'FEMALE') {
        setLeaderId(null);
        setGenderError('Redes Kids só podem ter líderes do gênero feminino');
      }
    } else {
      setGenderError('');
    }
  }, [redeId, discipuladoId, leaderId, redes, discipulados, members, allMembers]);

  const resetForm = () => {
    setName('');
    setCongregacaoId(null);
    setRedeId(null);
    setDiscipuladoId(null);
    setLeaderId(null);
    setLeaderInTrainingIds([]);
    setCelulaMemberOptions([]);
    setAllMembers([]);
    setAllCelulas([]);
    setWeekday(null);
    setTime(dayjs().hour(19).minute(30));
    setCountry('Brasil');
    setZipCode('');
    setStreet('');
    setStreetNumber('');
    setNeighborhood('');
    setCity('');
    setComplement('');
    setState('');
    setHostId(null);
    setOpeningDate(null);
    setHasNextHost(false);
    setCelulaType('');
    setCelulaLevel('');
    setParallelCelulaId(null);
    setTouched({ name: false, discipulado: false });
    setGenderError('');
    setHasLoadedMainCongregacaoAddress(false);
  };

  const formatCep = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const limited = numbers.slice(0, 8);
    if (limited.length <= 5) {
      return limited;
    }
    return `${limited.slice(0, 5)}-${limited.slice(5)}`;
  };

  const fetchAddressByCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');

    if (cleanCep.length !== 8) {
      return;
    }

    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }

      setStreet(data.logradouro || '');
      setNeighborhood(data.bairro || '');
      setCity(data.localidade || '');
      setState(data.uf || '');
      toast.success('Endereço preenchido automaticamente!');
    } catch (err) {
      console.error('Erro ao buscar CEP:', err);
      toast.error('Erro ao buscar CEP');
    } finally {
      setLoadingCep(false);
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value);
    setZipCode(formatted);

    // Buscar endereço quando CEP estiver completo
    if (formatted.replace(/\D/g, '').length === 8) {
      fetchAddressByCep(formatted);
    }
  };

  const handleSave = async () => {
    // Marcar todos os campos como touched
    setTouched({ name: true, discipulado: true });

    if (!name.trim()) {
      toast.error('Nome da célula é obrigatório');
      return;
    }

    if (!discipuladoId) {
      toast.error('Discipulado é obrigatório');
      return;
    }

    if (weekday === null || weekday === undefined) {
      toast.error('Dia da semana é obrigatório');
      return;
    }

    if (!time || !time.isValid()) {
      toast.error('Horário é obrigatório');
      return;
    }

    await onSave({
      name,
      weekday: weekday,
      time: time.format('HH:mm'),
      leaderMemberId: leaderId || undefined,
      hostMemberId: hostId || undefined,
      discipuladoId: discipuladoId || undefined,
      leaderInTrainingIds: leaderInTrainingIds,
      openingDate: openingDate ? openingDate.format('YYYY-MM-DD') : undefined,
      hasNextHost: hasNextHost,
      type: celulaType || undefined,
      level: celulaLevel || undefined,
      country: country || undefined,
      zipCode: zipCode || undefined,
      street: street || undefined,
      streetNumber: streetNumber || undefined,
      neighborhood: neighborhood || undefined,
      city: city || undefined,
      complement: complement || undefined,
      state: state || undefined,
      parallelCelulaId: parallelCelulaId ?? null,
    });

    resetForm();
  };

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (

    <div
      className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <ThemeProvider theme={muiTheme}>
        <div className="bg-gray-900 rounded w-11/12 max-w-4xl my-8 max-h-[90vh] flex flex-col">
          <div className="p-6 flex items-center justify-between border-b border-gray-700">
            <h3 className="text-xl font-semibold">{isEditing ? 'Editar Célula' : 'Criar Célula'}</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {loadingCelula ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
            {/* ===== SEÇÃO: INFORMAÇÕES BÁSICAS ===== */}
            <div>
              <h4 className="text-md font-semibold mb-4 text-blue-400 flex items-center gap-2">
                <span>📋</span> Informações Básicas
              </h4>
              
              {/* Nome */}
              <div className="mb-4">
                <label className="block mb-1 text-sm">Nome *</label>
                <input
                  placeholder="Nome da célula"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setTouched({ ...touched, name: true })}
                  className={`border p-2 rounded w-full bg-gray-800 text-white h-10 ${touched.name && !name.trim() ? 'border-red-500' : ''
                    }`}
                />
              </div>

              {/* Tipo e Nível */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <StyledSelect
                    id="type"
                    label="Tipo"
                    value={celulaType}
                    onChange={(val) => setCelulaType(String(val))}
                    options={[
                      { value: 'YOUNG', label: 'Jovens' },
                      { value: 'ADULT', label: 'Adultos' },
                      { value: 'TEENAGER', label: 'Adolescentes' },
                      { value: 'CHILDISH', label: 'Crianças' },
                    ]}
                    placeholder="Selecione o tipo"
                  />
                </div>

                <div>
                  <StyledSelect
                    id="level"
                    label="Nível"
                    value={celulaLevel}
                    onChange={(val) => setCelulaLevel(String(val))}
                    options={[
                      { value: 'EVANGELISM', label: 'Evangelismo' },
                      { value: 'EDIFICATION', label: 'Edificação' },
                      { value: 'COMMUNION', label: 'Comunhão' },
                      { value: 'MULTIPLICATION', label: 'Multiplicação' },
                      { value: 'UNKNOWN', label: 'Desconhecido' },
                    ]}
                    placeholder="Selecione o nível"
                  />
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-700 my-6"></div>

            {/* ===== SEÇÃO: HIERARQUIA ORGANIZACIONAL ===== */}
            <div>
              <h4 className="text-md font-semibold mb-4 text-purple-400 flex items-center gap-2">
                <span>🏛️</span> Hierarquia Organizacional
              </h4>

              {/* Congregação e Rede */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <StyledSelect
                    id="congregacao"
                    label="Congregação"
                    required
                    value={congregacaoId ?? ''}
                    onChange={(val) => {
                      setCongregacaoId(val ? Number(val) : null);
                      setRedeId(null);
                      setDiscipuladoId(null);
                    }}
                    options={congregacoes.map((c) => ({ value: c.id, label: c.name }))}
                    placeholder="Selecione congregação"
                    disabled={!editPermissions.canEditCongregacao}
                  />
                  {!editPermissions.canEditCongregacao && isEditing && (
                    <p className="text-xs text-gray-400 mt-1">
                      Você não tem permissão para alterar a congregação
                    </p>
                  )}
                </div>

                <div>
                  <StyledSelect
                    id="rede"
                    label="Rede"
                    required
                    value={redeId ?? ''}
                    onChange={(val) => {
                      const selectedRedeId = val ? Number(val) : null;
                      setRedeId(selectedRedeId);
                      setDiscipuladoId(null);
                      if (selectedRedeId) {
                        const rede = redes.find(r => r.id === selectedRedeId);
                        if (rede?.congregacaoId) {
                          setCongregacaoId(rede.congregacaoId);
                        }
                      }
                    }}
                    options={redes.filter(r => !congregacaoId || r.congregacaoId === congregacaoId).map((r) => ({ value: r.id, label: r.name }))}
                    placeholder="Selecione rede"
                    disabled={!editPermissions.canEditRede}
                  />
                  {!editPermissions.canEditRede && isEditing && (
                    <p className="text-xs text-gray-400 mt-1">
                      Você não tem permissão para alterar a rede
                    </p>
                  )}
                </div>
              </div>

              {/* Discipulado */}
              <div>
                <StyledSelect
                  id="discipulado"
                  label="Discipulado"
                  required
                  value={discipuladoId ?? ''}
                  onChange={(val) => {
                    const selectedDiscipuladoId = val ? Number(val) : null;
                    setDiscipuladoId(selectedDiscipuladoId);
                    if (selectedDiscipuladoId) {
                      const discipulado = discipulados.find(d => d.id === selectedDiscipuladoId);
                      if (discipulado?.redeId) {
                        setRedeId(discipulado.redeId);
                        const rede = redes.find(r => r.id === discipulado.redeId);
                        if (rede?.congregacaoId) {
                          setCongregacaoId(rede.congregacaoId);
                        }
                      }
                    }
                  }}
                  onBlur={() => setTouched({ ...touched, discipulado: true })}
                  options={discipulados.filter(d => !redeId || d.redeId === redeId).map((d) => ({ value: d.id, label: d.discipulador?.name || `Discipulado ${d.id}` }))}
                  placeholder="Selecione discipulado"
                  error={touched.discipulado && !discipuladoId}
                  disabled={!editPermissions.canEditDiscipulado}
                />
                {!editPermissions.canEditDiscipulado && isEditing && (
                  <p className="text-xs text-gray-400 mt-1">
                    Você não tem permissão para alterar o discipulado
                  </p>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-700 my-6"></div>

            {/* ===== SEÇÃO: LIDERANÇA ===== */}
            <div>
              <h4 className="text-md font-semibold mb-4 text-green-400 flex items-center gap-2">
                <span>👥</span> Liderança
              </h4>

              {/* Líder */}
              <div className="mb-4">
                <SingleMemberSelect
                  label="Líder"
                  value={leaderId}
                  onChange={(id) => setLeaderId(id)}
                  options={(() => {
                    let selectedRede = redes.find(r => r.id === redeId);
                    if (!selectedRede && discipuladoId) {
                      const selectedDiscipulado = discipulados.find(d => d.id === discipuladoId);
                      if (selectedDiscipulado) {
                        selectedRede = redes.find(r => r.id === selectedDiscipulado.redeId);
                      }
                    }
                    return selectedRede?.isKids ? allMembers : members;
                  })()}
                  placeholder="Buscar líder..."
                  disabled={!editPermissions.canEditLeader}
                  avatarColor="bg-green-600"
                />
                {genderError && <div className="text-red-500 text-xs mt-1">{genderError}</div>}
                {!editPermissions.canEditLeader && isEditing && (
                  <p className="text-xs text-gray-400 mt-1">
                    Você não tem permissão para alterar o líder
                  </p>
                )}
              </div>

              {/* Anfitrião */}
              <div className="mb-4">
                <SingleMemberSelect
                  label="Anfitrião"
                  value={hostId}
                  onChange={(id) => setHostId(id)}
                  options={members}
                  placeholder="Buscar anfitrião..."
                  avatarColor="bg-purple-600"
                />
              </div>

              {/* Líderes em Treinamento */}
              {(() => {
                if (isEditing) return true;
                if (!discipuladoId) return false;
                const selectedDiscipulado = discipulados.find(d => d.id === discipuladoId);
                if (!selectedDiscipulado) return false;
                const selectedRede = redes.find(r => r.id === selectedDiscipulado.redeId);
                return selectedRede?.isKids && allMembers.length > 0;
              })() && (
                <div>
                  <MultiMemberSelect
                    label="Líderes em Treinamento"
                    options={(() => {
                      let selectedRede = redes.find(r => r.id === redeId);
                      if (!selectedRede && discipuladoId) {
                        const selectedDiscipulado = discipulados.find(d => d.id === discipuladoId);
                        if (selectedDiscipulado) {
                          selectedRede = redes.find(r => r.id === selectedDiscipulado.redeId);
                        }
                      }
                      if (selectedRede?.isKids) {
                        return allMembers.filter(m => m.id !== leaderId && m.gender === 'FEMALE');
                      }
                      return celulaMemberOptions.filter(m => m.id !== leaderId);
                    })()}
                    selectedIds={leaderInTrainingIds}
                    onChange={setLeaderInTrainingIds}
                    placeholder="Buscar membro para adicionar..."
                    avatarColor="bg-yellow-600"
                    isOptionDisabled={(member) => {
                      const isInAnother = allCelulas.some(c =>
                        c.id !== celula?.id &&
                        c.leadersInTraining?.some(lit => lit.member.id === member.id)
                      );
                      return isInAnother ? 'Já em outra célula' : false;
                    }}
                    helperText={(() => {
                      let selectedRede = redes.find(r => r.id === redeId);
                      if (!selectedRede && discipuladoId) {
                        const selectedDiscipulado = discipulados.find(d => d.id === discipuladoId);
                        if (selectedDiscipulado) {
                          selectedRede = redes.find(r => r.id === selectedDiscipulado.redeId);
                        }
                      }
                      if (selectedRede?.isKids) {
                        return 'Apenas discípulos do discipulado. Membros já em outra célula estão bloqueados.';
                      }
                      return 'Apenas membros desta célula podem ser selecionados como líderes em treinamento';
                    })()}
                    noOptionsText="Nenhum membro disponível"
                  />
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-gray-700 my-6"></div>

            {/* ===== SEÇÃO: AGENDA ===== */}
            <div>
              <h4 className="text-md font-semibold mb-4 text-yellow-400 flex items-center gap-2">
                <span>📅</span> Agenda
              </h4>

              {/* Dia da Semana e Horário */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <StyledSelect
                    id="weekday"
                    label="Dia da Semana"
                    required
                    value={weekday ?? ''}
                    onChange={(val) => {
                      setWeekday(val !== '' ? Number(val) : null);
                    }}
                    options={[
                      { value: 0, label: 'Domingo' },
                      { value: 1, label: 'Segunda-feira' },
                      { value: 2, label: 'Terça-feira' },
                      { value: 3, label: 'Quarta-feira' },
                      { value: 4, label: 'Quinta-feira' },
                      { value: 5, label: 'Sexta-feira' },
                      { value: 6, label: 'Sábado' },
                    ]}
                    placeholder="Selecione o dia"
                  />
                </div>

                <div>
                  <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
                    <TimePicker
                      label="Horário *"
                      value={time}
                      onChange={(newValue: Dayjs | null) => setTime(newValue)}
                      format="HH:mm"
                      ampm={false}
                      localeText={{
                        toolbarTitle: 'Selecionar horário',
                        cancelButtonLabel: 'Cancelar',
                        okButtonLabel: 'OK',
                      }}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: 'small',
                          placeholder: '19:30',
                          sx: {
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: 'rgb(31 41 55)',
                              borderRadius: '0.5rem',
                              '& fieldset': { borderColor: 'rgb(75 85 99)' },
                              '&:hover fieldset': { borderColor: 'rgb(107 114 128)' },
                              '&.Mui-focused fieldset': { borderColor: 'rgb(59 130 246)' },
                            },
                            '& .MuiInputBase-input': { color: 'white' },
                            '& .MuiInputLabel-root': { color: 'rgb(156 163 175)' },
                            '& .MuiInputLabel-root.Mui-focused': { color: 'rgb(59 130 246)' },
                            '& .MuiSvgIcon-root': { color: 'rgb(156 163 175)' },
                          },
                        },
                      }}
                    />
                  </LocalizationProvider>
                </div>
              </div>

              {/* Data de Abertura */}
              <div>
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
                  <DatePicker
                    label="Data de Abertura"
                    value={openingDate}
                    onChange={(newValue: Dayjs | null) => setOpeningDate(newValue)}
                    format="DD/MM/YYYY"
                    localeText={{
                      toolbarTitle: 'Selecionar data',
                      cancelButtonLabel: 'Cancelar',
                      okButtonLabel: 'OK',
                    }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        size: 'small',
                        placeholder: 'DD/MM/AAAA',
                        sx: {
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: 'rgb(31 41 55)',
                            borderRadius: '0.5rem',
                            '& fieldset': { borderColor: 'rgb(75 85 99)' },
                            '&:hover fieldset': { borderColor: 'rgb(107 114 128)' },
                            '&.Mui-focused fieldset': { borderColor: 'rgb(59 130 246)' },
                          },
                          '& .MuiInputBase-input': { color: 'white' },
                          '& .MuiInputLabel-root': { color: 'rgb(156 163 175)' },
                          '& .MuiInputLabel-root.Mui-focused': { color: 'rgb(59 130 246)' },
                          '& .MuiSvgIcon-root': { color: 'rgb(156 163 175)' },
                        },
                      },
                    }}
                  />
                </LocalizationProvider>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-700 my-6"></div>

            {/* ===== SEÇÃO: ENDEREÇO ===== */}
            <div>
              <h4 className="text-md font-semibold mb-4 text-orange-400 flex items-center gap-2">
                <span>📍</span> Endereço da Célula
              </h4>

              {/* CEP */}
              <div className="mb-4">
                <div className="relative">
                  <TextField
                    label="CEP"
                    placeholder="00000-000"
                    value={zipCode}
                    onChange={handleCepChange}
                    inputProps={{ maxLength: 9 }}
                    fullWidth
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgb(31 41 55)',
                        borderRadius: '0.5rem',
                        '& fieldset': { borderColor: 'rgb(75 85 99)' },
                        '&:hover fieldset': { borderColor: 'rgb(107 114 128)' },
                        '&.Mui-focused fieldset': { borderColor: 'rgb(59 130 246)' },
                      },
                      '& .MuiInputBase-input': { color: 'white' },
                      '& .MuiInputLabel-root': { color: 'rgb(156 163 175)' },
                      '& .MuiInputLabel-root.Mui-focused': { color: 'rgb(59 130 246)' },
                    }}
                  />
                  {loadingCep && (
                    <div className="absolute right-2 top-2">
                      <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Rua e Número */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="col-span-2">
                  <TextField
                    label="Rua"
                    placeholder="Nome da rua"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    fullWidth
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgb(31 41 55)',
                        borderRadius: '0.5rem',
                        '& fieldset': { borderColor: 'rgb(75 85 99)' },
                        '&:hover fieldset': { borderColor: 'rgb(107 114 128)' },
                        '&.Mui-focused fieldset': { borderColor: 'rgb(59 130 246)' },
                      },
                      '& .MuiInputBase-input': { color: 'white' },
                      '& .MuiInputLabel-root': { color: 'rgb(156 163 175)' },
                      '& .MuiInputLabel-root.Mui-focused': { color: 'rgb(59 130 246)' },
                    }}
                  />
                </div>
                <div>
                  <TextField
                    label="Número"
                    placeholder="123"
                    value={streetNumber}
                    onChange={(e) => setStreetNumber(e.target.value)}
                    fullWidth
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgb(31 41 55)',
                        borderRadius: '0.5rem',
                        '& fieldset': { borderColor: 'rgb(75 85 99)' },
                        '&:hover fieldset': { borderColor: 'rgb(107 114 128)' },
                        '&.Mui-focused fieldset': { borderColor: 'rgb(59 130 246)' },
                      },
                      '& .MuiInputBase-input': { color: 'white' },
                      '& .MuiInputLabel-root': { color: 'rgb(156 163 175)' },
                      '& .MuiInputLabel-root.Mui-focused': { color: 'rgb(59 130 246)' },
                    }}
                  />
                </div>
              </div>

              {/* Bairro */}
              <div className="mb-4">
                <TextField
                  label="Bairro"
                  placeholder="Nome do bairro"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  fullWidth
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgb(31 41 55)',
                      borderRadius: '0.5rem',
                      '& fieldset': { borderColor: 'rgb(75 85 99)' },
                      '&:hover fieldset': { borderColor: 'rgb(107 114 128)' },
                      '&.Mui-focused fieldset': { borderColor: 'rgb(59 130 246)' },
                    },
                    '& .MuiInputBase-input': { color: 'white' },
                    '& .MuiInputLabel-root': { color: 'rgb(156 163 175)' },
                    '& .MuiInputLabel-root.Mui-focused': { color: 'rgb(59 130 246)' },
                  }}
                />
              </div>

              {/* Cidade e Estado */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="col-span-2">
                  <TextField
                    label="Cidade"
                    placeholder="Nome da cidade"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    fullWidth
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgb(31 41 55)',
                        borderRadius: '0.5rem',
                        '& fieldset': { borderColor: 'rgb(75 85 99)' },
                        '&:hover fieldset': { borderColor: 'rgb(107 114 128)' },
                        '&.Mui-focused fieldset': { borderColor: 'rgb(59 130 246)' },
                      },
                      '& .MuiInputBase-input': { color: 'white' },
                      '& .MuiInputLabel-root': { color: 'rgb(156 163 175)' },
                      '& .MuiInputLabel-root.Mui-focused': { color: 'rgb(59 130 246)' },
                    }}
                  />
                </div>
                <div>
                  <TextField
                    label="Estado"
                    placeholder="UF"
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    inputProps={{ maxLength: 2 }}
                    fullWidth
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgb(31 41 55)',
                        borderRadius: '0.5rem',
                        '& fieldset': { borderColor: 'rgb(75 85 99)' },
                        '&:hover fieldset': { borderColor: 'rgb(107 114 128)' },
                        '&.Mui-focused fieldset': { borderColor: 'rgb(59 130 246)' },
                      },
                      '& .MuiInputBase-input': { color: 'white', textTransform: 'uppercase' },
                      '& .MuiInputLabel-root': { color: 'rgb(156 163 175)' },
                      '& .MuiInputLabel-root.Mui-focused': { color: 'rgb(59 130 246)' },
                    }}
                  />
                </div>
              </div>

              {/* Complemento */}
              <div className="mb-4">
                <TextField
                  label="Complemento"
                  placeholder="Apartamento, bloco, etc."
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  fullWidth
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgb(31 41 55)',
                      borderRadius: '0.5rem',
                      '& fieldset': { borderColor: 'rgb(75 85 99)' },
                      '&:hover fieldset': { borderColor: 'rgb(107 114 128)' },
                      '&.Mui-focused fieldset': { borderColor: 'rgb(59 130 246)' },
                    },
                    '& .MuiInputBase-input': { color: 'white' },
                    '& .MuiInputLabel-root': { color: 'rgb(156 163 175)' },
                    '& .MuiInputLabel-root.Mui-focused': { color: 'rgb(59 130 246)' },
                  }}
                />
              </div>

              {/* País */}
              <div>
                <TextField
                  label="País"
                  placeholder="País"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  fullWidth
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgb(31 41 55)',
                      borderRadius: '0.5rem',
                      '& fieldset': { borderColor: 'rgb(75 85 99)' },
                      '&:hover fieldset': { borderColor: 'rgb(107 114 128)' },
                      '&.Mui-focused fieldset': { borderColor: 'rgb(59 130 246)' },
                    },
                    '& .MuiInputBase-input': { color: 'white' },
                    '& .MuiInputLabel-root': { color: 'rgb(156 163 175)' },
                    '& .MuiInputLabel-root.Mui-focused': { color: 'rgb(59 130 246)' },
                  }}
                />
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-700 my-6"></div>

            {/* ===== SEÇÃO: CONFIGURAÇÕES ADICIONAIS ===== */}
            <div>
              <h4 className="text-md font-semibold mb-4 text-cyan-400 flex items-center gap-2">
                <span>⚙️</span> Configurações Adicionais
              </h4>

              {/* Tem Próximo Anfitrião */}
              <div className="flex items-center gap-3 mb-4">
                <label className="text-sm font-medium">Tem Próximo Anfitrião?</label>
                <button
                  type="button"
                  onClick={() => setHasNextHost(!hasNextHost)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    hasNextHost ? 'bg-blue-600' : 'bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      hasNextHost ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-xs text-gray-400">{hasNextHost ? 'Sim' : 'Não'}</span>
              </div>

              {/* Célula Paralela */}
              <div>
                <StyledSelect
                  id="parallel-celula"
                  label="Célula Paralela"
                  value={parallelCelulaId ?? ''}
                  onChange={(val) => setParallelCelulaId(val !== '' ? Number(val) : null)}
                  options={parallelCelulaOptions
                    .filter(c => c.id !== celula?.id)
                    .map((c) => ({
                      value: c.id,
                      label: `${c.name}${c.leader ? ` — ${c.leader.name}` : ''}`,
                    }))}
                  placeholder="Nenhuma"
                />
                <p className="text-xs text-gray-400 mt-1">Associar a outra célula que acontece em paralelo</p>
              </div>
            </div>
            </>
            )}
          </div>

          {/* Botões de ação - sticky e full width */}
          <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 p-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border rounded hover:bg-gray-800 font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
            >
              {isEditing ? 'Salvar' : 'Criar Célula'}
            </button>
          </div>
        </div>
      </ThemeProvider>
    </div>
  );
}
