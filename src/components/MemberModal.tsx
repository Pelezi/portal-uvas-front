"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Member, Celula, Ministry, WinnerPath, Role } from '@/types';
import { createTheme, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, ThemeProvider, Checkbox, ListItemText, OutlinedInput, Autocomplete, TextField } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/pt-br';
import toast from 'react-hot-toast';
import { configService } from '@/services/configService';
import { memberService } from '@/services/memberService';
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

  // Config data
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [winnerPaths, setWinnerPaths] = useState<WinnerPath[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [loadingCep, setLoadingCep] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResendingInvite, setIsResendingInvite] = useState(false);

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
        const [ministriesData, winnerPathsData, rolesData, membersData] = await Promise.all([
          configService.getMinistries(),
          configService.getWinnerPaths(),
          configService.getRoles(),
          memberService.list(),
        ]);
        setMinistries(ministriesData);
        setWinnerPaths(winnerPathsData);
        setRoles(rolesData);
        setAllMembers(membersData);
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
        main: '#ffffffff',
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
      } else {
        resetForm();
        // Set initial celula if provided
        if (initialCelulaId !== undefined && initialCelulaId !== null) {
          setCelulaId(initialCelulaId);
        }
      }
    }
  }, [member, isOpen, initialCelulaId]);

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
    setTouched({ name: false, ministryPosition: false, email: false });
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
    };

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
                  <label className="block mb-1 text-sm">Nome *</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => setTouched({ ...touched, name: true })}
                    className={`border p-2 rounded w-full bg-gray-800 text-white h-10 ${touched.name && !name.trim() ? 'border-red-500' : ''
                      }`}
                    placeholder="Nome completo"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-sm">Sexo</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full border p-2 rounded bg-gray-800 h-10"
                  >
                    <option value="">Selecione</option>
                    <option value="MALE">Masculino</option>
                    <option value="FEMALE">Feminino</option>
                    <option value="OTHER">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-sm">Estado Civil</label>
                  <select
                    value={maritalStatus}
                    onChange={(e) => setMaritalStatus(e.target.value)}
                    className="w-full border p-2 rounded bg-gray-800 h-10"
                  >
                    <option value="SINGLE">Solteiro(a)</option>
                    <option value="COHABITATING">Amasiados</option>
                    <option value="MARRIED">Casado(a)</option>
                    <option value="DIVORCED">Divorciado(a)</option>
                    <option value="WIDOWED">Viúvo(a)</option>
                  </select>
                </div>

                {maritalStatus === 'MARRIED' && (
                  <div className="md:col-span-1">
                    <label className="block mb-1 text-sm">Cônjuge</label>
                    <FormControl fullWidth size="small">
                      <Select
                        value={spouseId ?? ''}
                        onChange={(e) => setSpouseId(e.target.value ? Number(e.target.value) : null)}
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
                  <label className="block mb-1 text-sm">Data de Nascimento</label>
                  <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
                    <DatePicker
                      value={birthDate}
                      onChange={(newValue: Dayjs | null) => setBirthDate(newValue)}
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
                          placeholder: 'dd/mm/aaaa',
                        },
                      }}
                    />
                  </LocalizationProvider>
                </div>


                <div>
                  <label className="block mb-1 text-sm">Telefone</label>
                  <input
                    value={phone}
                    onChange={handlePhoneChange}
                    className="border p-2 rounded w-full bg-gray-800 h-10"
                    placeholder="(11) 99999-9999"
                    maxLength={25}
                  />
                </div>
              </div>
            </div>

            {/* DADOS ECLESIÁSTICOS */}
            <div className="border-b pb-3">
              <h4 className="font-medium mb-3 text-sm text-gray-400">DADOS ECLESIÁSTICOS</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-sm">Célula</label>
                  <Autocomplete
                    size="small"
                    options={celulas}
                    getOptionLabel={(option) => option.name}
                    value={celulas.find(c => c.id === celulaId) || null}
                    onChange={(event, newValue) => {
                      setCelulaId(newValue ? newValue.id : null);
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
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
                <div>
                  <label className="block mb-1 text-sm">Cargo Ministerial *</label>
                  <FormControl
                    fullWidth
                    size="small"
                    error={touched.ministryPosition && !ministryPositionId}
                  >
                    <Select
                      value={ministryPositionId ?? ''}
                      onChange={(e) => setMinistryPositionId(e.target.value ? Number(e.target.value) : null)}
                      onBlur={() => setTouched({ ...touched, ministryPosition: true })}
                      className="bg-gray-800"
                      displayEmpty
                    >
                      <MenuItem value="">Sem cargo ministerial</MenuItem>
                      {allowedMinistries.map(m => (
                        <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>

                <div>
                  <label className="block mb-1 text-sm">É batizado?</label>
                  <label htmlFor="isBaptized" className="border rounded p-2 flex items-center justify-between bg-gray-800 cursor-pointer hover:bg-gray-900 transition-colors">
                    <span className="text-sm font-medium"></span>
                    <div className="relative inline-block w-12 h-6">
                      <input
                        type="checkbox"
                        checked={isBaptized}
                        onChange={(e) => setIsBaptized(e.target.checked)}
                        id="isBaptized"
                        className="sr-only peer"
                      />
                      <span className="absolute inset-0 bg-gray-600 rounded-full transition-all duration-300 ease-in-out peer-checked:bg-blue-600"></span>
                      <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ease-in-out peer-checked:translate-x-6 peer-checked:shadow-md"></span>
                    </div>
                  </label>
                </div>

                {isBaptized && (
                  <div>
                    <label className="block mb-1 text-sm">Data de Batismo</label>
                    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
                      <DatePicker
                        value={baptismDate}
                        onChange={(newValue: Dayjs | null) => setBaptismDate(newValue)}
                        format="DD/MM/YYYY" localeText={{
                          toolbarTitle: 'Selecionar data',
                          cancelButtonLabel: 'Cancelar',
                          okButtonLabel: 'OK',
                        }} slotProps={{
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
                  <label className="block mb-1 text-sm">Trilho do Vencedor</label>
                  <FormControl fullWidth size="small">
                    <Select
                      value={winnerPathId ?? ''}
                      onChange={(e) => setWinnerPathId(e.target.value ? Number(e.target.value) : null)}
                      className="bg-gray-800"
                      displayEmpty
                    >
                      <MenuItem value="">Sem trilho</MenuItem>
                      {winnerPaths.map(w => (
                        <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>

                <div className="md:col-span-2">
                  <label className="block mb-1 text-sm">Funções</label>
                  <FormControl fullWidth size="small">
                    <Select<number[]>
                      multiple
                      value={selectedRoleIds}
                      onChange={(e: SelectChangeEvent<number[]>) => {
                        const value = e.target.value;
                        setSelectedRoleIds(typeof value === 'string' ? [] : value);
                      }}
                      input={<OutlinedInput />}
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
                      displayEmpty
                    >
                      <MenuItem disabled value="">
                        <em>Selecione as funções</em>
                      </MenuItem>
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
                  <label className="block mb-1 text-sm">Apto para ser anfitrião?</label>
                  <label htmlFor="canBeHost" className="border rounded p-2 flex items-center justify-between bg-gray-800 cursor-pointer hover:bg-gray-900 transition-colors">
                    <span className="text-sm font-medium"></span>
                    <div className="relative inline-block w-12 h-6">
                      <input
                        type="checkbox"
                        checked={canBeHost}
                        onChange={(e) => setCanBeHost(e.target.checked)}
                        id="canBeHost"
                        className="sr-only peer"
                      />
                      <span className="absolute inset-0 bg-gray-600 rounded-full transition-all duration-300 ease-in-out peer-checked:bg-blue-600"></span>
                      <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ease-in-out peer-checked:translate-x-6 peer-checked:shadow-md"></span>
                    </div>
                  </label>
                </div>


                <div>
                  <label className="block mb-1 text-sm">Data de Ingresso</label>
                  <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
                    <DatePicker
                      value={registerDate}
                      onChange={(newValue: Dayjs | null) => setRegisterDate(newValue)}
                      format="DD/MM/YYYY" localeText={{
                        toolbarTitle: 'Selecionar data',
                        cancelButtonLabel: 'Cancelar',
                        okButtonLabel: 'OK',
                      }} slotProps={{
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
                  <label className="block mb-1 text-sm">País</label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full border p-2 rounded bg-gray-800 h-10"
                  >
                    <option value="Brasil">Brasil</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-sm">CEP</label>
                  <div className="relative">
                    <input
                      value={zipCode}
                      onChange={handleCepChange}
                      className="border p-2 rounded w-full bg-gray-800 h-10"
                      placeholder="12345-678"
                      maxLength={9}
                    />
                    {loadingCep && (
                      <div className="absolute right-2 top-2">
                        <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block mb-1 text-sm">Rua</label>
                  <input
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="border p-2 rounded w-full bg-gray-800 h-10"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-sm">Número</label>
                  <input
                    value={streetNumber}
                    onChange={(e) => setStreetNumber(e.target.value)}
                    className="border p-2 rounded w-full bg-gray-800 h-10"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-sm">Bairro</label>
                  <input
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className="border p-2 rounded w-full bg-gray-800 h-10"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-sm">Cidade</label>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="border p-2 rounded w-full bg-gray-800 h-10"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-sm">Complemento</label>
                  <input
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                    className="border p-2 rounded w-full bg-gray-800 h-10"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-sm">UF</label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full border p-2 rounded bg-gray-800 h-10"
                  >
                    <option value="">Selecione</option>
                    <option value="AC">AC</option>
                    <option value="AL">AL</option>
                    <option value="AP">AP</option>
                    <option value="AM">AM</option>
                    <option value="BA">BA</option>
                    <option value="CE">CE</option>
                    <option value="DF">DF</option>
                    <option value="ES">ES</option>
                    <option value="GO">GO</option>
                    <option value="MA">MA</option>
                    <option value="MT">MT</option>
                    <option value="MS">MS</option>
                    <option value="MG">MG</option>
                    <option value="PA">PA</option>
                    <option value="PB">PB</option>
                    <option value="PR">PR</option>
                    <option value="PE">PE</option>
                    <option value="PI">PI</option>
                    <option value="RJ">RJ</option>
                    <option value="RN">RN</option>
                    <option value="RS">RS</option>
                    <option value="RO">RO</option>
                    <option value="RR">RR</option>
                    <option value="SC">SC</option>
                    <option value="SP">SP</option>
                    <option value="SE">SE</option>
                    <option value="TO">TO</option>
                  </select>
                </div>
              </div>
            </div>

            {/* DADOS DE ACESSO */}
            <div className="border-b pb-3">
              <h4 className="font-medium mb-3 text-sm text-gray-400">DADOS DE ACESSO</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-sm">
                    Email {hasSystemAccess && '*'}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setTouched({ ...touched, email: true })}
                    className={`border p-2 rounded w-full bg-gray-800 h-10 ${hasSystemAccess && touched.email && !email.trim() ? 'border-red-500' : ''
                      }`}
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-sm">Acesso ao sistema</label>
                  <div className="flex gap-2">
                    <label
                      htmlFor="hasSystemAccess"
                      className={`border rounded p-2 flex items-center justify-between bg-gray-800 transition-colors flex-1 ${canManageSystemAccess ? 'cursor-pointer hover:bg-gray-900' : 'cursor-not-allowed opacity-60'
                        }`}
                      title={!canManageSystemAccess ? 'Você não tem permissão para gerenciar acesso ao sistema' : ''}
                    >
                      <span className="text-sm font-medium"></span>
                      <div className="relative inline-block w-12 h-6">
                        <input
                          type="checkbox"
                          checked={hasSystemAccess}
                          onChange={(e) => canManageSystemAccess && setHasSystemAccess(e.target.checked)}
                          id="hasSystemAccess"
                          disabled={!canManageSystemAccess}
                          className="sr-only peer"
                        />
                        <span className={`absolute inset-0 rounded-full transition-all duration-300 ease-in-out ${canManageSystemAccess
                            ? 'bg-gray-600 peer-checked:bg-blue-600'
                            : 'bg-gray-700 peer-checked:bg-gray-500'
                          }`}></span>
                        <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ease-in-out peer-checked:translate-x-6 peer-checked:shadow-md"></span>
                      </div>
                    </label>
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
