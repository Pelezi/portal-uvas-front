"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Member, Celula, Ministry, WinnerPath, Role, Congregacao, Rede, Discipulado } from '@/types';
import { createTheme, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, ThemeProvider, Checkbox, ListItemText, OutlinedInput, Autocomplete, TextField, Switch, FormControlLabel } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/pt-br';
import toast from 'react-hot-toast';
import { configService } from '@/services/configService';
import { memberService } from '@/services/memberService';
import { congregacoesService } from '@/services/congregacoesService';
import { redesService } from '@/services/redesService';
import { discipuladosService } from '@/services/discipuladosService';
import { useAuth } from '@/contexts/AuthContext';
import { formatPhoneForDisplay, formatPhoneForInput, stripPhoneFormatting, ensureCountryCode } from '@/lib/phoneUtils';

interface MemberModalProps {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Member>) => Promise<Member>;
  celulas: Celula[];
  initialCelulaId?: number | null;
}

export default function MemberModal({ member, isOpen, onClose, onSave, celulas = [], initialCelulaId }: MemberModalProps) {
  const isEditing = !!member;
  const { user } = useAuth();

  // Estados para todos os campos
  const [name, setName] = useState('');
  const [celulaId, setCelulaId] = useState<number | null>(null);
  const [maritalStatus, setMaritalStatus] = useState<string>('SINGLE');
  const [photoUrl, setPhotoUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<string>('');
  const [isBaptized, setIsBaptized] = useState(false);
  const [baptismDate, setBaptismDate] = useState<Dayjs | null>(null);
  const [birthDate, setBirthDate] = useState<Dayjs | null>(null);
  const [registerDate, setRegisterDate] = useState<Dayjs | null>(null);
  const [spouseId, setSpouseId] = useState<number | null>(null);
  const [ministryPositionId, setMinistryPositionId] = useState<number | null>(null);
  const [winnerPathId, setWinnerPathId] = useState<number | null>(null);
  const [canBeHost, setCanBeHost] = useState(false);
  const [country, setCountry] = useState('Brasil');
  const [zipCode, setZipCode] = useState('');
  const [street, setStreet] = useState('');
  const [streetNumber, setStreetNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [complement, setComplement] = useState('');
  const [state, setState] = useState('');
  const [email, setEmail] = useState('');
  const [hasSystemAccess, setHasSystemAccess] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Social Media state - array of { type, username }
  const [socialMedia, setSocialMedia] = useState<Array<{ type: string; username: string }>>([]);

  // Config data
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [winnerPaths, setWinnerPaths] = useState<WinnerPath[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [loadingCep, setLoadingCep] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResendingInvite, setIsResendingInvite] = useState(false);

  // Filtros em cascata para célula
  const [congregacoes, setCongregacoes] = useState<Congregacao[]>([]);
  const [redes, setRedes] = useState<Rede[]>([]);
  const [discipulados, setDiscipulados] = useState<Discipulado[]>([]);
  const [filterCongregacaoId, setFilterCongregacaoId] = useState<number | null>(null);
  const [filterRedeId, setFilterRedeId] = useState<number | null>(null);
  const [filterDiscipuladoId, setFilterDiscipuladoId] = useState<number | null>(null);

  // Validação
  const [touched, setTouched] = useState({
    name: false,
    ministryPosition: false,
    email: false,
  });

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
    const loadConfigData = async () => {
      try {
        const [ministriesData, winnerPathsData, rolesData, membersData, congregacoesData, redesData, discipuladosData] = await Promise.all([
          configService.getMinistries(),
          configService.getWinnerPaths(),
          configService.getRoles(),
          memberService.list(),
          congregacoesService.getCongregacoes(),
          redesService.getRedes(),
          discipuladosService.getDiscipulados(),
        ]);
        setMinistries(ministriesData);
        setWinnerPaths(winnerPathsData);
        setRoles(rolesData);
        setAllMembers(membersData);
        setCongregacoes(congregacoesData || []);
        setRedes(redesData || []);
        setDiscipulados(discipuladosData || []);
      } catch (err) {
        console.error('Failed to load config data:', err);
      }
    };
    loadConfigData();
  }, []);

  // Verificar se usuário pode gerenciar acesso ao sistema
  const canManageSystemAccess = useMemo(() => {
    if (!user) return false;

    const isAdmin = user.permission?.isAdmin || false;
    const isPastor = user.permission?.ministryType === 'PRESIDENT_PASTOR' ||
      user.permission?.ministryType === 'PASTOR';
    const isDiscipulador = user.permission?.ministryType === 'DISCIPULADOR';
    const isLeader = user.permission?.ministryType === 'LEADER';

    // Apenas admin, pastores, discipuladores e líderes podem gerenciar acesso ao sistema
    return isAdmin || isPastor || isDiscipulador || isLeader;
  }, [user]);

  // Filtrar ministérios permitidos baseado no cargo do usuário logado
  const allowedMinistries = useMemo(() => {
    // Se não há usuário logado, retornar lista vazia
    if (!user) return [];

    // Admin e pastores podem atribuir qualquer cargo
    const isAdmin = user.permission?.isAdmin || false;
    const isPastor = user.permission?.ministryType === 'PRESIDENT_PASTOR' ||
      user.permission?.ministryType === 'PASTOR';

    if (isAdmin || isPastor) {
      return ministries;
    }

    // Se o usuário não tem cargo ministerial, não pode criar membros com cargo
    const userMinistryPositionId = user.ministryPositionId;
    if (!userMinistryPositionId) {
      return [];
    }

    // Encontrar o cargo do usuário logado
    const userMinistry = ministries.find(m => m.id === userMinistryPositionId);
    if (!userMinistry) {
      return ministries;
    }

    // Retornar apenas cargos com priority MAIOR (menor na hierarquia) que o do usuário
    return ministries.filter(m => (m.priority ?? 0) > (userMinistry.priority ?? 0));
  }, [user, ministries]);

  const muiTheme = createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: '#3b82f6', 
      },
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (member) {
        setName(member.name || '');
        setCelulaId(member.celulaId ?? null);
        setMaritalStatus(member.maritalStatus ?? 'SINGLE');
        setPhotoUrl(member.photoUrl ?? '');
        setPhone(member.phone ? formatPhoneForDisplay(ensureCountryCode(member.phone)) : '+55');
        setGender(member.gender ?? '');
        setIsBaptized(member.isBaptized ?? false);
        setBaptismDate(member.baptismDate ? dayjs(member.baptismDate) : null);
        setBirthDate(member.birthDate ? dayjs(member.birthDate) : null);
        setRegisterDate(member.registerDate ? dayjs(member.registerDate) : null);
        setSpouseId(member.spouseId ?? null);
        setMinistryPositionId(member.ministryPositionId ?? null);
        setWinnerPathId(member.winnerPathId ?? null);
        setCanBeHost(member.canBeHost ?? false);
        setCountry(member.country ?? 'Brasil');
        setZipCode(member.zipCode ?? '');
        setStreet(member.street ?? '');
        setStreetNumber(member.streetNumber ?? '');
        setNeighborhood(member.neighborhood ?? '');
        setCity(member.city ?? '');
        setComplement(member.complement ?? '');
        setState(member.state ?? '');
        setEmail(member.email ?? '');
        setHasSystemAccess(member.hasSystemAccess ?? false);
        setIsActive(member.isActive ?? true);
        setSelectedRoleIds(member.roles?.map(mr => mr.role.id) ?? []);
        
        // Initialize social media from array
        setSocialMedia(member.socialMedia?.map(sm => ({ type: sm.type, username: sm.username })) ?? []);
      } else {
        resetForm();
        // Set initial celula if provided
        if (initialCelulaId !== undefined && initialCelulaId !== null) {
          setCelulaId(initialCelulaId);
        }
      }
    }
  }, [member, isOpen, initialCelulaId]);

  // Auto-preencher filtros quando célula é selecionada
  useEffect(() => {
    if (celulaId && celulas.length > 0 && discipulados.length > 0 && redes.length > 0) {
      const celula = celulas.find(c => c.id === celulaId);
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
  }, [celulaId, celulas, discipulados, redes]);

  // Auto-preencher filtros baseado nas permissões do usuário quando não estiver editando
  useEffect(() => {
    if (!isEditing && isOpen && user?.permission && user.permission.ministryType !== 'PRESIDENT_PASTOR' && !user.permission.isAdmin && congregacoes.length > 0 && redes.length > 0 && discipulados.length > 0 && celulas.length > 0) {
      const permission = user.permission;

      // Se usuário tem apenas uma congregação permitida
      if (permission.congregacaoIds && permission.congregacaoIds.length === 1 && !filterCongregacaoId) {
        const allowedCongregacaoId = permission.congregacaoIds[0];
        const congregacaoExists = congregacoes.find(c => c.id === allowedCongregacaoId);
        if (congregacaoExists) {
          setFilterCongregacaoId(allowedCongregacaoId);
        }
      }

      // Se usuário tem apenas uma rede permitida
      if (permission.redeIds && permission.redeIds.length === 1 && !filterRedeId) {
        const allowedRedeId = permission.redeIds[0];
        const rede = redes.find(r => r.id === allowedRedeId);
        if (rede) {
          setFilterRedeId(allowedRedeId);
          // Auto-preencher congregação se ainda não estiver preenchida
          if (rede.congregacaoId && !filterCongregacaoId) {
            setFilterCongregacaoId(rede.congregacaoId);
          }
        }
      }

      // Se usuário tem apenas um discipulado permitido
      if (permission.discipuladoIds && permission.discipuladoIds.length === 1 && !filterDiscipuladoId) {
        const allowedDiscipuladoId = permission.discipuladoIds[0];
        const discipulado = discipulados.find(d => d.id === allowedDiscipuladoId);
        if (discipulado) {
          setFilterDiscipuladoId(allowedDiscipuladoId);
          // Auto-preencher rede se ainda não estiver preenchida
          if (discipulado.redeId && !filterRedeId) {
            setFilterRedeId(discipulado.redeId);
            // Auto-preencher congregação se ainda não estiver preenchida
            const rede = redes.find(r => r.id === discipulado.redeId);
            if (rede?.congregacaoId && !filterCongregacaoId) {
              setFilterCongregacaoId(rede.congregacaoId);
            }
          }
        }
      }

      // Se usuário tem apenas uma célula permitida
      if (permission.celulaIds && permission.celulaIds.length === 1 && !celulaId) {
        const allowedCelulaId = permission.celulaIds[0];
        const celula = celulas.find(c => c.id === allowedCelulaId);
        if (celula) {
          setCelulaId(allowedCelulaId);
        }
      }
    }
  }, [isEditing, isOpen, user, congregacoes, redes, discipulados, celulas, filterCongregacaoId, filterRedeId, filterDiscipuladoId, celulaId]);

  const resetForm = () => {
    setName('');
    setCelulaId(null);
    setMaritalStatus('SINGLE');
    setPhotoUrl('');
    setPhone('+55');
    setGender('');
    setIsBaptized(false);
    setBaptismDate(null);
    setBirthDate(null);
    setRegisterDate(null);
    setSpouseId(null);
    setMinistryPositionId(null);
    setWinnerPathId(null);
    setCanBeHost(false);
    setCountry('Brasil');
    setZipCode('');
    setStreet('');
    setStreetNumber('');
    setNeighborhood('');
    setCity('');
    setComplement('');
    setState('');
    setEmail('');
    setHasSystemAccess(false);
    setIsActive(true);
    setSelectedRoleIds([]);
    setFilterCongregacaoId(null);
    setFilterRedeId(null);
    setFilterDiscipuladoId(null);
    setTouched({ name: false, ministryPosition: false, email: false });
    
    // Reset social media
    setSocialMedia([]);
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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneForInput(e.target.value);
    setPhone(formatted);
  };

  const handleSave = async () => {
    // Marcar todos os campos como touched
    setTouched({
      name: true,
      ministryPosition: true,
      email: hasSystemAccess
    });

    if (!name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (!ministryPositionId) {
      toast.error('Cargo ministerial é obrigatório');
      return;
    }

    // Validação: se hasSystemAccess estiver marcado, email é obrigatório
    if (hasSystemAccess && !email.trim()) {
      toast.error('Email é obrigatório para acesso ao sistema');
      return;
    }

    // Preparar telefone: não enviar se for apenas o código do país "55"
    const strippedPhone = phone ? stripPhoneFormatting(phone) : '';
    const phoneToSend = strippedPhone && strippedPhone !== '55' ? strippedPhone : undefined;

    // Preparar redes sociais: apenas as que têm type e username preenchidos
    const validSocialMedia = socialMedia.filter(sm => sm.type.trim() && sm.username.trim());

    const data: Partial<Member> & { roleIds?: number[] } = {
      name,
      maritalStatus: maritalStatus as any,
      photoUrl: photoUrl || undefined,
      phone: phoneToSend,
      gender: gender as any || undefined,
      isBaptized,
      baptismDate: baptismDate ? baptismDate.format('YYYY-MM-DD') : undefined,
      birthDate: birthDate ? birthDate.format('YYYY-MM-DD') : undefined,
      registerDate: registerDate ? registerDate.format('YYYY-MM-DD') : undefined,
      spouseId: maritalStatus === 'MARRIED' ? (spouseId || undefined) : null,
      ministryPositionId: ministryPositionId || undefined,
      winnerPathId: winnerPathId || undefined,
      canBeHost,
      country: country || undefined,
      zipCode: zipCode || undefined,
      street: street || undefined,
      streetNumber: streetNumber || undefined,
      neighborhood: neighborhood || undefined,
      city: city || undefined,
      complement: complement || undefined,
      state: state || undefined,
      email: email || undefined,
      hasSystemAccess,
      isActive,
      roleIds: selectedRoleIds,
      // Social media
      socialMedia: validSocialMedia.length > 0 ? validSocialMedia : undefined,
    } as any;

    data.celulaId = celulaId;

    setIsSaving(true);
    try {
      // Salvar o membro - onSave agora retorna o membro salvo
      await onSave(data);
      // Modal fecha imediatamente após salvar com sucesso
      // O envio do convite continuará em background no parent
    } catch (error) {
      // Se houver erro, mantém o modal aberto
      console.error('Erro ao salvar:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async () => {
    const newActiveState = !isActive;
    setIsActive(newActiveState);

    if (member) {
      await onSave({ isActive: newActiveState });
    }
  };

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <ThemeProvider theme={muiTheme}>
        <div className="bg-gray-900 rounded w-11/12 max-w-4xl my-8 max-h-[90vh] flex flex-col">
          <div className="p-6 flex items-center justify-between border-b border-gray-700">
            <h2 className="text-xl font-bold">{isEditing ? 'Editar Membro' : 'Novo Membro'}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* DADOS PESSOAIS */}
            <div className="border-b pb-3">
              <h4 className="font-medium mb-3 text-sm text-gray-400">DADOS PESSOAIS</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <TextField
                    fullWidth
                    size="small"
                    label="Nome *"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => setTouched({ ...touched, name: true })}
                    error={touched.name && !name.trim()}
                    placeholder="Nome completo"
                    className="bg-gray-800"
                  />
                </div>

                <div>
                  <FormControl fullWidth size="small">
                    <InputLabel id="gender-label">Gênero</InputLabel>
                    <Select
                      labelId="gender-label"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      label="Gênero"
                      className="bg-gray-800"
                    >
                      <MenuItem value="">Selecione</MenuItem>
                      <MenuItem value="MALE">Masculino</MenuItem>
                      <MenuItem value="FEMALE">Feminino</MenuItem>
                      <MenuItem value="OTHER">Outro</MenuItem>
                    </Select>
                  </FormControl>
                </div>

                <div>
                  <FormControl fullWidth size="small">
                    <InputLabel id="marital-status-label">Estado Civil</InputLabel>
                    <Select
                      labelId="marital-status-label"
                      value={maritalStatus}
                      onChange={(e) => setMaritalStatus(e.target.value)}
                      label="Estado Civil"
                      className="bg-gray-800"
                    >
                      <MenuItem value="SINGLE">Solteiro(a)</MenuItem>
                      <MenuItem value="COHABITATING">Amasiados</MenuItem>
                      <MenuItem value="MARRIED">Casado(a)</MenuItem>
                      <MenuItem value="DIVORCED">Divorciado(a)</MenuItem>
                      <MenuItem value="WIDOWED">Viúvo(a)</MenuItem>
                    </Select>
                  </FormControl>
                </div>

                {maritalStatus === 'MARRIED' && (
                  <div className="md:col-span-1">
                    <FormControl fullWidth size="small">
                      <InputLabel id="spouse-label">Cônjuge</InputLabel>
                      <Select
                        labelId="spouse-label"
                        value={spouseId ?? ''}
                        onChange={(e) => setSpouseId(e.target.value ? Number(e.target.value) : null)}
                        label="Cônjuge"
                        className="bg-gray-800"
                        displayEmpty
                      >
                        <MenuItem value="">Selecione o cônjuge</MenuItem>
                        {allMembers
                          .filter(m => m.id !== member?.id)
                          .map(m => (
                            <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
                          ))}
                      </Select>
                    </FormControl>
                  </div>
                )}

                <div>
                  <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
                    <DatePicker
                      value={birthDate}
                      onChange={(newValue: Dayjs | null) => setBirthDate(newValue)}
                      format="DD/MM/YYYY"
                      label="Data de Nascimento"
                      localeText={{
                        toolbarTitle: 'Selecionar data',
                        cancelButtonLabel: 'Cancelar',
                        okButtonLabel: 'OK',
                      }}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: 'small',
                          placeholder: 'dd/mm/aaaa',
                        },
                      }}
                    />
                  </LocalizationProvider>
                </div>


                <div>
                  <TextField
                    fullWidth
                    size="small"
                    label="Telefone"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="(11) 99999-9999"
                    inputProps={{ maxLength: 25 }}
                    className="bg-gray-800"
                  />
                </div>
              </div>
            </div>

            {/* CÉLULA */}
            <div className="border-b pb-3">
              <h4 className="font-medium mb-3 text-sm text-gray-400">CÉLULA</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Congregação */}
                <div>
                  <FormControl fullWidth size="small">
                    <InputLabel id="filter-congregacao-label">Congregação</InputLabel>
                    <Select
                      labelId="filter-congregacao-label"
                      value={filterCongregacaoId ?? ''}
                      onChange={(e) => {
                        setFilterCongregacaoId(e.target.value ? Number(e.target.value) : null);
                        setFilterRedeId(null);
                        setFilterDiscipuladoId(null);
                      }}
                      label="Congregação"
                      className="bg-gray-800"
                    >
                      <MenuItem value="">Todas as congregações</MenuItem>
                      {congregacoes.map((c) => (
                        <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>

                {/* Rede */}
                <div>
                  <FormControl fullWidth size="small">
                    <InputLabel id="filter-rede-label">Rede</InputLabel>
                    <Select
                      labelId="filter-rede-label"
                      value={filterRedeId ?? ''}
                      onChange={(e) => {
                        const selectedRedeId = e.target.value ? Number(e.target.value) : null;
                        setFilterRedeId(selectedRedeId);
                        setFilterDiscipuladoId(null);
                        // Auto-preencher congregação quando rede é selecionada
                        if (selectedRedeId) {
                          const rede = redes.find(r => r.id === selectedRedeId);
                          if (rede?.congregacaoId) {
                            setFilterCongregacaoId(rede.congregacaoId);
                          }
                        }
                      }}
                      label="Rede"
                      className="bg-gray-800"
                    >
                      <MenuItem value="">Todas as redes</MenuItem>
                      {redes.filter(r => !filterCongregacaoId || r.congregacaoId === filterCongregacaoId).map((r) => (
                        <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>

                {/* Discipulado */}
                <div>
                  <FormControl fullWidth size="small">
                    <InputLabel id="filter-discipulado-label">Discipulado</InputLabel>
                    <Select
                      labelId="filter-discipulado-label"
                      value={filterDiscipuladoId ?? ''}
                      onChange={(e) => {
                        const selectedDiscipuladoId = e.target.value ? Number(e.target.value) : null;
                        setFilterDiscipuladoId(selectedDiscipuladoId);
                        // Auto-preencher rede e congregação quando discipulado é selecionado
                        if (selectedDiscipuladoId) {
                          const discipulado = discipulados.find(d => d.id === selectedDiscipuladoId);
                          if (discipulado?.redeId) {
                            setFilterRedeId(discipulado.redeId);
                            const rede = redes.find(r => r.id === discipulado.redeId);
                            if (rede?.congregacaoId) {
                              setFilterCongregacaoId(rede.congregacaoId);
                            }
                          }
                        }
                      }}
                      label="Discipulado"
                      className="bg-gray-800"
                    >
                      <MenuItem value="">Todos os discipulados</MenuItem>
                      {discipulados.filter(d => !filterRedeId || d.redeId === filterRedeId).map((d) => (
                        <MenuItem key={d.id} value={d.id}>{d.discipulador?.name || `Discipulado ${d.id}`}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>

                {/* Célula */}
                <div>
                  <Autocomplete
                    size="small"
                    options={celulas.filter(c => {
                      // Filtrar células baseado nos filtros superiores
                      if (filterDiscipuladoId && c.discipuladoId !== filterDiscipuladoId) return false;
                      if (filterRedeId && !filterDiscipuladoId) {
                        // Se tem filtro de rede mas não de discipulado, verificar se a célula pertence a um discipulado da rede
                        const celulaDiscipulado = discipulados.find(d => d.id === c.discipuladoId);
                        if (!celulaDiscipulado || celulaDiscipulado.redeId !== filterRedeId) return false;
                      }
                      if (filterCongregacaoId && !filterRedeId && !filterDiscipuladoId) {
                        // Se tem filtro de congregação mas não de rede/discipulado, verificar hierarquia
                        const celulaDiscipulado = discipulados.find(d => d.id === c.discipuladoId);
                        if (!celulaDiscipulado) return false;
                        const celulaRede = redes.find(r => r.id === celulaDiscipulado.redeId);
                        if (!celulaRede || celulaRede.congregacaoId !== filterCongregacaoId) return false;
                      }
                      return true;
                    })}
                    getOptionLabel={(option) => option.name}
                    value={celulas.find(c => c.id === celulaId) || null}
                    onChange={(event, newValue) => {
                      setCelulaId(newValue ? newValue.id : null);
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Célula"
                        placeholder="Sem célula"
                        className="bg-gray-800"
                      />
                    )}
                    noOptionsText="Nenhuma célula encontrada"
                    clearText="Limpar"
                    openText="Abrir"
                    closeText="Fechar"
                  />
                </div>
              </div>
            </div>

            {/* DADOS ECLESIÁSTICOS */}
            <div className="border-b pb-3">
              <h4 className="font-medium mb-3 text-sm text-gray-400">DADOS ECLESIÁSTICOS</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <FormControl
                    fullWidth
                    size="small"
                    error={touched.ministryPosition && !ministryPositionId}
                  >
                    <InputLabel id="ministry-position-label">Cargo Ministerial *</InputLabel>
                    <Select
                      labelId="ministry-position-label"
                      value={ministryPositionId ?? ''}
                      onChange={(e) => setMinistryPositionId(e.target.value ? Number(e.target.value) : null)}
                      onBlur={() => setTouched({ ...touched, ministryPosition: true })}
                      label="Cargo Ministerial *"
                      className="bg-gray-800"
                    >
                      {allowedMinistries.map(m => (
                        <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>

                <div>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={isBaptized}
                        onChange={(e) => setIsBaptized(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="É batizado?"
                    className="border rounded bg-gray-800 px-2 py-1 m-0 w-full flex justify-between"
                    labelPlacement="start"
                    sx={{
                      marginLeft: 0,
                      '& .MuiFormControlLabel-label': {
                        flex: 1,
                        fontSize: '0.875rem'
                      }
                    }}
                  />
                </div>

                {isBaptized && (
                  <div>
                    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
                      <DatePicker
                        value={baptismDate}
                        onChange={(newValue: Dayjs | null) => setBaptismDate(newValue)}
                        format="DD/MM/YYYY"
                        label="Data de Batismo"
                        localeText={{
                          toolbarTitle: 'Selecionar data',
                          cancelButtonLabel: 'Cancelar',
                          okButtonLabel: 'OK',
                        }}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            size: 'small',
                            placeholder: 'dd/mm/aaaa',
                          },
                        }}
                      />
                    </LocalizationProvider>
                  </div>
                )}

                <div>
                  <FormControl fullWidth size="small">
                    <InputLabel id="winner-path-label">Trilho do Vencedor</InputLabel>
                    <Select
                      labelId="winner-path-label"
                      value={winnerPathId ?? ''}
                      onChange={(e) => setWinnerPathId(e.target.value ? Number(e.target.value) : null)}
                      label="Trilho do Vencedor"
                      className="bg-gray-800"
                    >
                      {winnerPaths.map(w => (
                        <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>

                <div className="md:col-span-2">
                  <FormControl fullWidth size="small">
                    <InputLabel id="roles-label">Funções</InputLabel>
                    <Select<number[]>
                      labelId="roles-label"
                      multiple
                      value={selectedRoleIds}
                      onChange={(e: SelectChangeEvent<number[]>) => {
                        const value = e.target.value;
                        setSelectedRoleIds(typeof value === 'string' ? [] : value);
                      }}
                      input={<OutlinedInput label="Funções" />}
                      renderValue={(selected) => {
                        if (selected.length === 0) {
                          return <em className="text-gray-400">Selecione as funções</em>;
                        }
                        return roles
                          .filter(r => selected.includes(r.id))
                          .map(r => r.name)
                          .join(', ');
                      }}
                      className="bg-gray-800"
                    >
                      {roles.map((role) => (
                        <MenuItem key={role.id} value={role.id}>
                          <Checkbox checked={selectedRoleIds.includes(role.id)} />
                          <ListItemText
                            primary={role.name}
                            secondary={role.isAdmin ? 'Admin' : undefined}
                          />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <p className="text-xs text-gray-400 mt-1">
                    Selecione uma ou mais funções para este membro
                  </p>
                </div>

                <div>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={canBeHost}
                        onChange={(e) => setCanBeHost(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Apto para ser anfitrião?"
                    className="border rounded bg-gray-800 px-2 py-1 m-0 w-full flex justify-between"
                    labelPlacement="start"
                    sx={{
                      marginLeft: 0,
                      '& .MuiFormControlLabel-label': {
                        flex: 1,
                        fontSize: '0.875rem'
                      }
                    }}
                  />
                </div>


                <div>
                  <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
                    <DatePicker
                      value={registerDate}
                      onChange={(newValue: Dayjs | null) => setRegisterDate(newValue)}
                      format="DD/MM/YYYY"
                      label="Data de Ingresso"
                      localeText={{
                        toolbarTitle: 'Selecionar data',
                        cancelButtonLabel: 'Cancelar',
                        okButtonLabel: 'OK',
                      }}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: 'small',
                          placeholder: 'dd/mm/aaaa',
                        },
                      }}
                    />
                  </LocalizationProvider>
                </div>
              </div>
            </div>

            {/* ENDEREÇO */}
            <div className="border-b pb-3">
              <h4 className="font-medium mb-3 text-sm text-gray-400">ENDEREÇO</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <FormControl fullWidth size="small">
                    <InputLabel id="country-label">País</InputLabel>
                    <Select
                      labelId="country-label"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      label="País"
                      className="bg-gray-800"
                    >
                      <MenuItem value="Brasil">Brasil</MenuItem>
                    </Select>
                  </FormControl>
                </div>

                <div>
                  <div className="relative">
                    <TextField
                      fullWidth
                      size="small"
                      label="CEP"
                      value={zipCode}
                      onChange={handleCepChange}
                      placeholder="12345-678"
                      inputProps={{ maxLength: 9 }}
                      className="bg-gray-800"
                    />
                    {loadingCep && (
                      <div className="absolute right-2 top-2">
                        <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <TextField
                    fullWidth
                    size="small"
                    label="Rua"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="bg-gray-800"
                  />
                </div>

                <div>
                  <TextField
                    fullWidth
                    size="small"
                    label="Número"
                    value={streetNumber}
                    onChange={(e) => setStreetNumber(e.target.value)}
                    className="bg-gray-800"
                  />
                </div>

                <div>
                  <TextField
                    fullWidth
                    size="small"
                    label="Bairro"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className="bg-gray-800"
                  />
                </div>

                <div>
                  <TextField
                    fullWidth
                    size="small"
                    label="Cidade"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="bg-gray-800"
                  />
                </div>

                <div>
                  <TextField
                    fullWidth
                    size="small"
                    label="Complemento"
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                    className="bg-gray-800"
                  />
                </div>

                <div>
                  <FormControl fullWidth size="small">
                    <InputLabel id="state-label">UF</InputLabel>
                    <Select
                      labelId="state-label"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      label="UF"
                      className="bg-gray-800"
                    >
                      <MenuItem value="">Selecione</MenuItem>
                      <MenuItem value="AC">AC</MenuItem>
                      <MenuItem value="AL">AL</MenuItem>
                      <MenuItem value="AP">AP</MenuItem>
                      <MenuItem value="AM">AM</MenuItem>
                      <MenuItem value="BA">BA</MenuItem>
                      <MenuItem value="CE">CE</MenuItem>
                      <MenuItem value="DF">DF</MenuItem>
                      <MenuItem value="ES">ES</MenuItem>
                      <MenuItem value="GO">GO</MenuItem>
                      <MenuItem value="MA">MA</MenuItem>
                      <MenuItem value="MT">MT</MenuItem>
                      <MenuItem value="MS">MS</MenuItem>
                      <MenuItem value="MG">MG</MenuItem>
                      <MenuItem value="PA">PA</MenuItem>
                      <MenuItem value="PB">PB</MenuItem>
                      <MenuItem value="PR">PR</MenuItem>
                      <MenuItem value="PE">PE</MenuItem>
                      <MenuItem value="PI">PI</MenuItem>
                      <MenuItem value="RJ">RJ</MenuItem>
                      <MenuItem value="RN">RN</MenuItem>
                      <MenuItem value="RS">RS</MenuItem>
                      <MenuItem value="RO">RO</MenuItem>
                      <MenuItem value="RR">RR</MenuItem>
                      <MenuItem value="SC">SC</MenuItem>
                      <MenuItem value="SP">SP</MenuItem>
                      <MenuItem value="SE">SE</MenuItem>
                      <MenuItem value="TO">TO</MenuItem>
                    </Select>
                  </FormControl>
                </div>
              </div>
            </div>

            {/* REDES SOCIAIS */}
            <div className="border-b pb-3">
              <h4 className="font-medium mb-3 text-sm text-gray-400">REDES SOCIAIS</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-300">
                    Adicione as redes sociais
                  </label>
                  <button
                    type="button"
                    onClick={() => setSocialMedia([...socialMedia, { type: 'INSTAGRAM', username: '' }])}
                    className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                  >
                    + Adicionar Rede Social
                  </button>
                </div>
                
                {socialMedia.length === 0 && (
                  <p className="text-sm text-gray-500 italic">Nenhuma rede social adicionada</p>
                )}
                
                {socialMedia.map((social, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-start">
                    <div className="md:col-span-2">
                      <FormControl fullWidth size="small">
                        <InputLabel>Tipo</InputLabel>
                        <Select
                          value={social.type}
                          onChange={(e) => {
                            const updated = [...socialMedia];
                            updated[index].type = e.target.value;
                            setSocialMedia(updated);
                          }}
                          label="Tipo"
                          className="bg-gray-800"
                        >
                          <MenuItem value="INSTAGRAM">Instagram</MenuItem>
                          <MenuItem value="FACEBOOK">Facebook</MenuItem>
                          <MenuItem value="TWITTER">Twitter/X</MenuItem>
                          <MenuItem value="WHATSAPP">WhatsApp</MenuItem>
                          <MenuItem value="LINKEDIN">LinkedIn</MenuItem>
                          <MenuItem value="TIKTOK">TikTok</MenuItem>
                          <MenuItem value="YOUTUBE">YouTube</MenuItem>
                          <MenuItem value="TELEGRAM">Telegram</MenuItem>
                          <MenuItem value="DISCORD">Discord</MenuItem>
                          <MenuItem value="THREADS">Threads</MenuItem>
                          <MenuItem value="SNAPCHAT">Snapchat</MenuItem>
                          <MenuItem value="PINTEREST">Pinterest</MenuItem>
                          <MenuItem value="TWITCH">Twitch</MenuItem>
                          <MenuItem value="OUTRO">Outro</MenuItem>
                        </Select>
                      </FormControl>
                    </div>
                    <div className="md:col-span-2">
                      <TextField
                        fullWidth
                        size="small"
                        label="Username/URL/Número"
                        value={social.username}
                        onChange={(e) => {
                          const updated = [...socialMedia];
                          updated[index].username = e.target.value;
                          setSocialMedia(updated);
                        }}
                        placeholder={
                          social.type === 'WHATSAPP' ? '+55 11 99999-9999' : 
                          social.type === 'INSTAGRAM' || social.type === 'TWITTER' || social.type === 'TIKTOK' 
                            ? '@username' 
                            : 'username ou URL'
                        }
                        className="bg-gray-800"
                      />
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => setSocialMedia(socialMedia.filter((_, i) => i !== index))}
                        className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* DADOS DE ACESSO */}
            <div className="border-b pb-3">
              <h4 className="font-medium mb-3 text-sm text-gray-400">DADOS DE ACESSO</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <TextField
                    fullWidth
                    size="small"
                    type="email"
                    label={`Email ${hasSystemAccess ? '*' : ''}`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setTouched({ ...touched, email: true })}
                    error={hasSystemAccess && touched.email && !email.trim()}
                    placeholder="email@example.com"
                    className="bg-gray-800"
                  />
                </div>

                <div>
                  <div className="flex gap-2">
                    <FormControlLabel
                      control={
                        <Switch
                          checked={hasSystemAccess}
                          onChange={(e) => canManageSystemAccess && setHasSystemAccess(e.target.checked)}
                          disabled={!canManageSystemAccess}
                          color="primary"
                        />
                      }
                      label="Acesso ao sistema"
                      className={`border rounded bg-gray-800 px-2 py-1 m-0 flex-1 flex justify-between ${!canManageSystemAccess ? 'opacity-60' : ''
                        }`}
                      labelPlacement="start"
                      title={!canManageSystemAccess ? 'Você não tem permissão para gerenciar acesso ao sistema' : ''}
                      sx={{
                        marginLeft: 0,
                        '& .MuiFormControlLabel-label': {
                          flex: 1,
                          fontSize: '0.875rem'
                        }
                      }}
                    />
                    {isEditing && hasSystemAccess && member?.hasSystemAccess && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!member?.id || member?.hasLoggedIn || !canManageSystemAccess) return;

                          setIsResendingInvite(true);
                          try {
                            // Verificar se email ou phone mudaram
                            const originalEmail = member.email ?? '';
                            const originalPhone = member.phone ? ensureCountryCode(member.phone) : '';
                            const currentEmail = email;
                            const currentPhone = stripPhoneFormatting(phone);

                            const emailChanged = originalEmail !== currentEmail;
                            const phoneChanged = originalPhone !== currentPhone;

                            // Se mudaram, salvar primeiro
                            if (emailChanged || phoneChanged) {
                              const updateData: Partial<Member> = {};

                              if (emailChanged) {
                                updateData.email = currentEmail;
                              }

                              if (phoneChanged) {
                                updateData.phone = currentPhone;
                              }

                              // Salvar as mudanças
                              await onSave(updateData);
                              toast.success('Dados atualizados antes de reenviar o convite');
                            }

                            // Reenviar convite
                            const response = await memberService.resendInvite(member.id);
                            const message = response.whatsappSent
                              ? 'Convite reenviado por email e WhatsApp!'
                              : 'Convite reenviado por email!';
                            toast.success(message);
                          } catch (err: any) {
                            toast.error(err.response?.data?.message || 'Erro ao reenviar convite');
                          } finally {
                            setIsResendingInvite(false);
                          }
                        }}
                        disabled={member?.hasLoggedIn || !canManageSystemAccess || isResendingInvite}
                        title={
                          !canManageSystemAccess
                            ? 'Você não tem permissão para reenviar convites'
                            : member?.hasLoggedIn
                              ? 'Este usuário já recebeu o convite e conseguiu acessar o sistema'
                              : 'Reenviar convite por email e WhatsApp'
                        }
                        className={`border rounded p-2 text-sm font-medium flex-1 transition-colors ${member?.hasLoggedIn || !canManageSystemAccess || isResendingInvite
                          ? 'bg-gray-400 text-gray-700 cursor-not-allowed opacity-60'
                          : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                          }`}
                      >
                        {isResendingInvite ? 'Reenviando...' : 'Reenviar Convite'}
                      </button>
                    )}
                  </div>
                  {hasSystemAccess && (
                    <p className="text-xs text-blue-400 mt-2">
                      {isEditing && member?.hasLoggedIn
                        ? 'Usuário já acessou o sistema'
                        : 'Um convite será enviado por email para criar a senha de acesso ao sistema'
                      }
                    </p>
                  )}
                  {!canManageSystemAccess && (
                    <p className="text-xs text-orange-400 mt-2">
                      ⚠️ Apenas líderes, discipuladores, pastores e admins podem gerenciar acesso ao sistema
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Status Ativo/Desligado - só na edição */}
            {isEditing && (
              <div className="border-b pb-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleToggleActive}
                    className={`px-4 py-2 rounded font-medium ${isActive
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                  >
                    {isActive ? 'Desligar Pessoa' : 'Reativar Pessoa'}
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Botões de ação - sticky e full width */}
          <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 p-6 flex gap-3">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 px-4 py-3 border rounded hover:bg-gray-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Salvando...' : (isEditing ? 'Salvar' : 'Criar Membro')}
            </button>
          </div>
        </div>
      </ThemeProvider>
    </div>
  );
}
