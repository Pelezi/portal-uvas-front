"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Celula, Member, Discipulado, Rede, Congregacao } from '@/types';
import { congregacoesService } from '@/services/congregacoesService';
import { createTheme, FormControl, InputLabel, MenuItem, Select, ThemeProvider } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/pt-br';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

interface CelulaModalProps {
  celula: Celula | null;
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
  }) => Promise<void>;
  members: Member[];
  discipulados: Discipulado[];
  redes: Rede[];
}

export default function CelulaModal({
  celula,
  isOpen,
  onClose,
  onSave,
  members,
  discipulados,
  redes
}: CelulaModalProps) {
  const isEditing = !!celula;
  const { user } = useAuth();

  // Estados
  const [name, setName] = useState('');
  const [congregacoes, setCongregacoes] = useState<Congregacao[]>([]);
  const [congregacaoId, setCongregacaoId] = useState<number | null>(null);
  const [redeId, setRedeId] = useState<number | null>(null);
  const [discipuladoId, setDiscipuladoId] = useState<number | null>(null);
  const [leaderQuery, setLeaderQuery] = useState('');
  const [leaderId, setLeaderId] = useState<number | null>(null);
  const [leaderName, setLeaderName] = useState('');
  const [showLeaderDropdown, setShowLeaderDropdown] = useState(false);
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
  const [hostQuery, setHostQuery] = useState('');
  const [hostId, setHostId] = useState<number | null>(null);
  const [hostName, setHostName] = useState('');
  const [showHostDropdown, setShowHostDropdown] = useState(false);
  const [openingDate, setOpeningDate] = useState<Dayjs | null>(null);
  const [hasNextHost, setHasNextHost] = useState(false);
  const [celulaType, setCelulaType] = useState<string>('');
  const [celulaLevel, setCelulaLevel] = useState<string>('');

  // Validação
  const [touched, setTouched] = useState({
    name: false,
    discipulado: false,
  });

  // Kids validation
  const [genderError, setGenderError] = useState('');

  const leaderDropdownRef = useRef<HTMLDivElement>(null);
  const hostDropdownRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (showLeaderDropdown && leaderDropdownRef.current && !leaderDropdownRef.current.contains(target)) {
        setShowLeaderDropdown(false);
      }
      if (showHostDropdown && hostDropdownRef.current && !hostDropdownRef.current.contains(target)) {
        setShowHostDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLeaderDropdown, showHostDropdown]);

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
      } catch (error) {
        console.error('Error loading congregações:', error);
      }
    };
    loadCongregacoes();
  }, [user]);

  useEffect(() => {
    if (celula) {
      // Modo edição
      setName(celula.name || '');
      setLeaderId(celula.leaderMemberId ?? null);
      setLeaderName(celula.leader?.name || '');
      setLeaderQuery('');
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
      setHostName(celula.host?.name || '');
      setHostQuery('');
      setOpeningDate(celula.openingDate ? dayjs(celula.openingDate) : null);
      setHasNextHost(celula.hasNextHost ?? false);
      setCelulaType(celula.type || '');
      setCelulaLevel(celula.level || '');

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
            const allMembersData = await memberService.getAllMembers({ 
              discipleOfId: selectedDiscipulado.id,
              all: true 
            });
            setAllMembers(allMembersData || []);
            
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
    }
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
        const allMembersData = await memberService.getAllMembers({ 
          discipleOfId: selectedDiscipulado.id,
          all: true 
        });
        setAllMembers(allMembersData || []);
        
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
        setLeaderName('');
        setLeaderQuery('');
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
    setLeaderQuery('');
    setLeaderId(null);
    setLeaderName('');
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
    setHostQuery('');
    setHostId(null);
    setHostName('');
    setOpeningDate(null);
    setHasNextHost(false);
    setCelulaType('');
    setCelulaLevel('');
    setTouched({ name: false, discipulado: false });
    setGenderError('');
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
      leaderInTrainingIds: leaderInTrainingIds.length > 0 ? leaderInTrainingIds : undefined,
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
            {/* Nome */}
            <div>
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

            {/* Congregação */}
            <div>
              <FormControl className="w-full">
                <InputLabel id="congregacao-label" size='small'>Congregação *</InputLabel>
                <Select
                  labelId="congregacao-label"
                  value={congregacaoId ?? ''}
                  onChange={(e) => {
                    setCongregacaoId(e.target.value ? Number(e.target.value) : null);
                    setRedeId(null);
                    setDiscipuladoId(null);
                  }}
                  label="Congregação"
                  size="small"
                  className="bg-gray-800 w-full"
                  disabled={!editPermissions.canEditCongregacao}>
                  <MenuItem value="">Selecione congregação</MenuItem>
                  {congregacoes.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {!editPermissions.canEditCongregacao && isEditing && (
                <p className="text-xs text-gray-400 mt-1">
                  Você não tem permissão para alterar a congregação
                </p>
              )}
            </div>

            {/* Rede */}
            <div>
              <FormControl className="w-full">
                <InputLabel id="rede-label" size='small'>Rede *</InputLabel>
                <Select
                  labelId="rede-label"
                  value={redeId ?? ''}
                  onChange={(e) => {
                    const selectedRedeId = e.target.value ? Number(e.target.value) : null;
                    setRedeId(selectedRedeId);
                    setDiscipuladoId(null);
                    // Auto-preencher congregação quando rede é selecionada
                    if (selectedRedeId) {
                      const rede = redes.find(r => r.id === selectedRedeId);
                      if (rede?.congregacaoId) {
                        setCongregacaoId(rede.congregacaoId);
                      }
                    }
                  }}
                  label="Rede"
                  size="small"
                  className="bg-gray-800 w-full"
                  disabled={!editPermissions.canEditRede}>
                  <MenuItem value="">Selecione rede</MenuItem>
                  {redes.filter(r => !congregacaoId || r.congregacaoId === congregacaoId).map((r) => (
                    <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {!editPermissions.canEditRede && isEditing && (
                <p className="text-xs text-gray-400 mt-1">
                  Você não tem permissão para alterar a rede
                </p>
              )}
            </div>

            {/* Discipulado */}
            <div>
              <FormControl
                className="w-full"
                error={touched.discipulado && !discipuladoId}
              >
                <InputLabel id="discipulado-label" size='small'>Discipulado *</InputLabel>
                <Select
                  labelId="discipulado-label"
                  value={discipuladoId ?? ''}
                  onChange={(e) => {
                    const selectedDiscipuladoId = e.target.value ? Number(e.target.value) : null;
                    setDiscipuladoId(selectedDiscipuladoId);
                    // Auto-preencher rede e congregação quando discipulado é selecionado
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
                  label="Discipulado"
                  size="small"
                  className="bg-gray-800 w-full"
                  disabled={!editPermissions.canEditDiscipulado}>
                  <MenuItem value="">Selecione discipulado</MenuItem>
                  {discipulados.filter(d => !redeId || d.redeId === redeId).map((d) => (
                    <MenuItem key={d.id} value={d.id}>{d.discipulador?.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {!editPermissions.canEditDiscipulado && isEditing && (
                <p className="text-xs text-gray-400 mt-1">
                  Você não tem permissão para alterar o discipulado
                </p>
              )}
            </div>

            {/* Líder */}
            <div>
              <label className="block mb-1 text-sm">Líder</label>
              <div ref={leaderDropdownRef} className="relative w-full">
                <input
                  placeholder="Buscar líder"
                  value={leaderQuery || leaderName}
                  onChange={(e) => {
                    setLeaderQuery(e.target.value);
                    setLeaderName('');
                    setLeaderId(null);
                    setShowLeaderDropdown(true);
                  }}
                  onFocus={() => setShowLeaderDropdown(true)}
                  className="border p-2 rounded w-full bg-gray-800 text-white h-10"
                  disabled={!editPermissions.canEditLeader}
                />
                {genderError && <div className="text-red-500 text-xs mt-1">{genderError}</div>}
                {!editPermissions.canEditLeader && isEditing && (
                  <p className="text-xs text-gray-400 mt-1">
                    Você não tem permissão para alterar o líder
                  </p>
                )}
                {showLeaderDropdown && editPermissions.canEditLeader && (
                  <div className="absolute left-0 right-0 bg-gray-800 border mt-1 rounded max-h-44 overflow-auto z-50">
                    {(() => {
                      // Encontrar a rede - pode vir direto do redeId ou do discipulado
                      let selectedRede = redes.find(r => r.id === redeId);
                      
                      // Se não tem redeId mas tem discipuladoId, buscar a rede do discipulado
                      if (!selectedRede && discipuladoId) {
                        const selectedDiscipulado = discipulados.find(d => d.id === discipuladoId);
                        if (selectedDiscipulado) {
                          selectedRede = redes.find(r => r.id === selectedDiscipulado.redeId);
                        }
                      }
                      
                      // Se for rede Kids, usar apenas os discípulos do discipulado (allMembers)
                      // Caso contrário, usar todos os membros disponíveis
                      const availableMembers = selectedRede?.isKids ? allMembers : members;
                      
                      return availableMembers.filter(member => {
                        // Para rede Kids, os membros já são apenas discípulos femininos
                        // Para outras redes, não tem filtro de gênero
                        const q = (leaderQuery || '').toLowerCase();
                        if (!q) return true;
                        return (member.name.toLowerCase().includes(q) || (member.email || '').toLowerCase().includes(q));
                      }).map(member => (
                      <div
                        key={member.id}
                        className="px-3 py-2 hover:bg-gray-700 cursor-pointer flex items-center justify-between"
                        onMouseDown={() => {
                          setLeaderId(member.id);
                          setLeaderName(member.name);
                          setLeaderQuery('');
                          setShowLeaderDropdown(false);
                        }}
                      >
                        <div>
                          <div className="text-sm font-medium text-white">{member.name}</div>
                          <div className="text-xs text-gray-400">{member.email}</div>
                        </div>
                        <div className="text-xs text-green-600">Selecionar</div>
                      </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Anfitrião */}
            <div>
              <label className="block mb-1 text-sm">Anfitrião</label>
              <div ref={hostDropdownRef} className="relative w-full">
                <input
                  placeholder="Buscar anfitrião"
                  value={hostQuery || hostName}
                  onChange={(e) => {
                    setHostQuery(e.target.value);
                    setHostName('');
                    setHostId(null);
                    setShowHostDropdown(true);
                  }}
                  onFocus={() => setShowHostDropdown(true)}
                  className="border p-2 rounded w-full bg-gray-800 text-white h-10"
                />
                {showHostDropdown && (
                  <div className="absolute left-0 right-0 bg-gray-800 border mt-1 rounded max-h-44 overflow-auto z-50">
                    {members.filter(member => {
                      const q = (hostQuery || '').toLowerCase();
                      if (!q) return true;
                      return (member.name.toLowerCase().includes(q) || (member.email || '').toLowerCase().includes(q));
                    }).map(member => (
                      <div
                        key={member.id}
                        className="px-3 py-2 hover:bg-gray-700 cursor-pointer flex items-center justify-between"
                        onMouseDown={() => {
                          setHostId(member.id);
                          setHostName(member.name);
                          setHostQuery('');
                          setShowHostDropdown(false);
                        }}
                      >
                        <div>
                          <div className="text-sm font-medium text-white">{member.name}</div>
                          <div className="text-xs text-gray-400">{member.email}</div>
                        </div>
                        <div className="text-xs text-green-600">Selecionar</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Líderes em Treinamento */}
            {(() => {
              // Mostrar campo de líderes em treinamento se:
              // 1. Estiver editando OU
              // 2. Estiver criando E for rede Kids com membros carregados
              if (isEditing) return true;
              
              if (!discipuladoId) return false;
              
              const selectedDiscipulado = discipulados.find(d => d.id === discipuladoId);
              if (!selectedDiscipulado) return false;
              
              const selectedRede = redes.find(r => r.id === selectedDiscipulado.redeId);
              return selectedRede?.isKids && allMembers.length > 0;
            })() && (
              <div className="md:col-span-2">
                <label className="block mb-1 text-sm">Líderes em Treinamento</label>
                <ThemeProvider theme={muiTheme}>
                  <FormControl className="w-full">
                    <InputLabel id="leader-in-training-label" size='small'>Selecione os líderes em treinamento</InputLabel>
                    <Select
                      labelId="leader-in-training-label"
                      multiple
                      value={leaderInTrainingIds}
                      onChange={(e) => {
                        const value = e.target.value as number[];
                        setLeaderInTrainingIds(value);
                      }}
                      label="Selecione os líderes em treinamento"
                      size="small"
                      className="bg-gray-800 w-full"
                      renderValue={(selected) => {
                        const selectedRede = (() => {
                          let sr = redes.find(r => r.id === redeId);
                          if (!sr && discipuladoId) {
                            const selectedDiscipulado = discipulados.find(d => d.id === discipuladoId);
                            if (selectedDiscipulado) {
                              sr = redes.find(r => r.id === selectedDiscipulado.redeId);
                            }
                          }
                          return sr;
                        })();
                        
                        const membersList = selectedRede?.isKids ? allMembers : celulaMemberOptions;
                        const selectedMembers = membersList.filter(m => selected.includes(m.id));
                        
                        return selectedMembers.map(m => m.name).join(', ');
                      }}
                    >
                      {(() => {
                        // Encontrar a rede
                        let selectedRede = redes.find(r => r.id === redeId);
                        
                        if (!selectedRede && discipuladoId) {
                          const selectedDiscipulado = discipulados.find(d => d.id === discipuladoId);
                          if (selectedDiscipulado) {
                            selectedRede = redes.find(r => r.id === selectedDiscipulado.redeId);
                          }
                        }
                        
                        // Função para verificar se o ministério é >= LEADER_IN_TRAINING
                        const hasMinistryLevel = (ministryType: string | null | undefined): boolean => {
                          const ministryHierarchy = ['VISITOR', 'REGULAR_ATTENDEE', 'MEMBER', 'LEADER_IN_TRAINING', 'LEADER', 'DISCIPULADOR', 'PASTOR', 'PRESIDENT_PASTOR'];
                          const requiredIndex = ministryHierarchy.indexOf('LEADER_IN_TRAINING');
                          const memberIndex = ministryType ? ministryHierarchy.indexOf(ministryType) : -1;
                          return memberIndex >= requiredIndex;
                        };
                        
                        // Se for rede Kids, usar lógica especial
                        if (selectedRede?.isKids) {
                          const filteredMembers = allMembers.filter(m => {
                            // Não incluir o líder
                            if (m.id === leaderId) return false;
                            // Apenas membros femininos
                            if (m.gender !== 'FEMALE') return false;
                            // Verificar nível ministerial
                            if (!hasMinistryLevel(m.ministryPosition?.type)) return false;
                            return true;
                          });
                          
                          const menuItems = filteredMembers
                            .map((member) => {
                              // Verificar se já está em outra célula
                              const isInAnotherCelula = allCelulas.some(c => 
                                c.id !== celula?.id && 
                                c.leadersInTraining?.some(lit => lit.member.id === member.id)
                              );
                              
                              return (
                                <MenuItem 
                                  key={member.id} 
                                  value={member.id}
                                  disabled={isInAnotherCelula}
                                >
                                  <div className="flex items-center gap-2 w-full">
                                    <input
                                      type="checkbox"
                                      checked={leaderInTrainingIds.includes(member.id)}
                                      readOnly
                                      className="h-4 w-4"
                                      disabled={isInAnotherCelula}
                                    />
                                    <div className="flex-1">
                                      <span className={isInAnotherCelula ? 'text-gray-500' : ''}>
                                        {member.name}
                                      </span>
                                      {isInAnotherCelula && (
                                        <span className="text-xs text-gray-500 ml-2">(Já em outra célula)</span>
                                      )}
                                    </div>
                                  </div>
                                </MenuItem>
                              );
                            });
                          
                          return menuItems;
                        } else {
                          // Lógica padrão para células não-Kids
                          const nonKidsItems = celulaMemberOptions
                            .filter(m => m.id !== leaderId)
                            .map((member) => (
                              <MenuItem key={member.id} value={member.id}>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={leaderInTrainingIds.includes(member.id)}
                                    readOnly
                                    className="h-4 w-4"
                                  />
                                  <span>{member.name}</span>
                                </div>
                              </MenuItem>
                            ));
                          
                          return nonKidsItems;
                        }
                      })()}
                    </Select>
                  </FormControl>
                </ThemeProvider>
                <p className="text-xs text-gray-400 mt-1">
                  {(() => {
                    let selectedRede = redes.find(r => r.id === redeId);
                    if (!selectedRede && discipuladoId) {
                      const selectedDiscipulado = discipulados.find(d => d.id === discipuladoId);
                      if (selectedDiscipulado) {
                        selectedRede = redes.find(r => r.id === selectedDiscipulado.redeId);
                      }
                    }
                    
                    if (selectedRede?.isKids) {
                      return 'Apenas discípulos do discipulado. Membros já em outra célula estão bloqueados.';
                    } else {
                      return 'Apenas membros desta célula podem ser selecionados como líderes em treinamento';
                    }
                  })()}
                </p>
              </div>
            )}

            {/* Dia da Semana */}
            <div>
              <FormControl className="w-full">
                <InputLabel id="weekday-label" size='small'>Dia da Semana *</InputLabel>
                <Select
                  labelId="weekday-label"
                  value={weekday ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    // Se não houver valor (string vazia) ou for undefined, define null
                    // Caso contrário, converte para número (incluindo 0 para domingo)
                    setWeekday(!val && val !== 0 ? null : Number(val));
                  }}
                  label="Dia da Semana *"
                  size="small"
                  className="bg-gray-800 w-full">
                  <MenuItem value="">Selecione o dia</MenuItem>
                  <MenuItem value={0}>Domingo</MenuItem>
                  <MenuItem value={1}>Segunda-feira</MenuItem>
                  <MenuItem value={2}>Terça-feira</MenuItem>
                  <MenuItem value={3}>Quarta-feira</MenuItem>
                  <MenuItem value={4}>Quinta-feira</MenuItem>
                  <MenuItem value={5}>Sexta-feira</MenuItem>
                  <MenuItem value={6}>Sábado</MenuItem>
                </Select>
              </FormControl>
            </div>

            {/* Horário */}
            <div>
              <label className="block mb-1 text-sm">Horário *</label>
              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
                <TimePicker
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
                    },
                  }}
                />
              </LocalizationProvider>
            </div>

            {/* Data de Abertura */}
            <div>
              <label className="block mb-1 text-sm">Data de Abertura</label>
              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
                <DatePicker
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
                    },
                  }}
                />
              </LocalizationProvider>
            </div>

            {/* Tipo */}
            <div>
              <FormControl className="w-full">
                <InputLabel id="type-label" size='small'>Tipo</InputLabel>
                <Select
                  labelId="type-label"
                  value={celulaType}
                  onChange={(e) => setCelulaType(e.target.value)}
                  label="Tipo"
                  size="small"
                  className="bg-gray-800 w-full">
                  <MenuItem value="">Selecione o tipo</MenuItem>
                  <MenuItem value="YOUNG">Jovens</MenuItem>
                  <MenuItem value="ADULT">Adultos</MenuItem>
                  <MenuItem value="TEENAGER">Adolescentes</MenuItem>
                  <MenuItem value="CHILDISH">Crianças</MenuItem>
                </Select>
              </FormControl>
            </div>

            {/* Nível */}
            <div>
              <FormControl className="w-full">
                <InputLabel id="level-label" size='small'>Nível</InputLabel>
                <Select
                  labelId="level-label"
                  value={celulaLevel}
                  onChange={(e) => setCelulaLevel(e.target.value)}
                  label="Nível"
                  size="small"
                  className="bg-gray-800 w-full">
                  <MenuItem value="">Selecione o nível</MenuItem>
                  <MenuItem value="EVANGELISM">Evangelismo</MenuItem>
                  <MenuItem value="EDIFICATION">Edificação</MenuItem>
                  <MenuItem value="COMMUNION">Comunhão</MenuItem>
                  <MenuItem value="MULTIPLICATION">Multiplicação</MenuItem>
                  <MenuItem value="UNKNOWN">Desconhecido</MenuItem>
                </Select>
              </FormControl>
            </div>

            {/* Tem Próximo Anfitrião */}
            <div className="flex items-center gap-3">
              <label className="text-sm">Tem Próximo Anfitrião?</label>
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

            {/* Divider */}
            <div className="border-t border-gray-700 my-4"></div>
            <h4 className="text-md font-semibold mb-3">Endereço da Célula</h4>

            {/* CEP */}
            <div>
              <label className="block mb-1 text-sm">CEP</label>
              <div className="relative">
                <input
                  placeholder="00000-000"
                  value={zipCode}
                  onChange={handleCepChange}
                  maxLength={9}
                  className="border p-2 rounded w-full bg-gray-800 text-white h-10"
                />
                {loadingCep && (
                  <div className="absolute right-2 top-2">
                    <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Rua e Número */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block mb-1 text-sm">Rua</label>
                <input
                  placeholder="Nome da rua"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="border p-2 rounded w-full bg-gray-800 text-white h-10"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm">Número</label>
                <input
                  placeholder="123"
                  value={streetNumber}
                  onChange={(e) => setStreetNumber(e.target.value)}
                  className="border p-2 rounded w-full bg-gray-800 text-white h-10"
                />
              </div>
            </div>

            {/* Bairro */}
            <div>
              <label className="block mb-1 text-sm">Bairro</label>
              <input
                placeholder="Nome do bairro"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="border p-2 rounded w-full bg-gray-800 text-white h-10"
              />
            </div>

            {/* Cidade e Estado */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block mb-1 text-sm">Cidade</label>
                <input
                  placeholder="Nome da cidade"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="border p-2 rounded w-full bg-gray-800 text-white h-10"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm">Estado</label>
                <input
                  placeholder="UF"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  maxLength={2}
                  className="border p-2 rounded w-full bg-gray-800 text-white h-10 uppercase"
                />
              </div>
            </div>

            {/* Complemento */}
            <div>
              <label className="block mb-1 text-sm">Complemento</label>
              <input
                placeholder="Apartamento, bloco, etc."
                value={complement}
                onChange={(e) => setComplement(e.target.value)}
                className="border p-2 rounded w-full bg-gray-800 text-white h-10"
              />
            </div>

            {/* País */}
            <div>
              <label className="block mb-1 text-sm">País</label>
              <input
                placeholder="País"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="border p-2 rounded w-full bg-gray-800 text-white h-10"
              />
            </div>
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
