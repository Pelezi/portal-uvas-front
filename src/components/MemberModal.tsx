"use client";

import React, { useState, useEffect } from 'react';
import { Member, Celula, Ministry, WinnerPath, Role } from '@/types';
import { createTheme, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, ThemeProvider, Checkbox, ListItemText, OutlinedInput } from '@mui/material';
import toast from 'react-hot-toast';
import { configService } from '@/services/configService';
import { memberService } from '@/services/memberService';

interface MemberModalProps {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Member>) => Promise<void>;
  celulas?: Celula[];
}

export default function MemberModal({ member, isOpen, onClose, onSave, celulas = [] }: MemberModalProps) {
  const isEditing = !!member;

  // Estados para todos os campos
  const [name, setName] = useState('');
  const [celulaId, setCelulaId] = useState<number | null>(null);
  const [maritalStatus, setMaritalStatus] = useState<string>('SINGLE');
  const [photoUrl, setPhotoUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<string>('');
  const [isBaptized, setIsBaptized] = useState(false);
  const [baptismDate, setBaptismDate] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [registerDate, setRegisterDate] = useState('');
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

  // Validação
  const [touched, setTouched] = useState({
    name: false,
    celula: false,
    ministryPosition: false,
    email: false,
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    const updateDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    updateDarkMode();
    window.addEventListener('storage', updateDarkMode);
    const observer = new MutationObserver(updateDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => {
      window.removeEventListener('storage', updateDarkMode);
      observer.disconnect();
    };
  }, []);

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

  const muiTheme = createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
      primary: {
        main: isDarkMode ? '#ffffffff' : '#000000ff',
      },
    },
  });

  useEffect(() => {
    if (member) {
      setName(member.name || '');
      setCelulaId(member.celulaId ?? null);
      setMaritalStatus(member.maritalStatus ?? 'SINGLE');
      setPhotoUrl(member.photoUrl ?? '');
      setPhone(member.phone ?? '');
      setGender(member.gender ?? '');
      setIsBaptized(member.isBaptized ?? false);
      setBaptismDate(member.baptismDate ? isoToDateBR(member.baptismDate) : '');
      setBirthDate(member.birthDate ? isoToDateBR(member.birthDate) : '');
      setRegisterDate(member.registerDate ? isoToDateBR(member.registerDate) : '');
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
    }
  }, [member]);

  const resetForm = () => {
    setName('');
    setCelulaId(null);
    setMaritalStatus('SINGLE');
    setPhotoUrl('');
    setPhone('');
    setGender('');
    setIsBaptized(false);
    setBaptismDate('');
    setBirthDate('');
    setRegisterDate('');
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
    setTouched({ name: false, celula: false, ministryPosition: false, email: false });
  };

  const formatPhoneNumber = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');

    // Limita a 11 dígitos
    const limited = numbers.slice(0, 11);

    // Aplica a máscara
    if (limited.length <= 2) {
      return limited;
    } else if (limited.length <= 6) {
      return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    } else if (limited.length <= 10) {
      return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
    } else {
      return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
    }
  };

  const formatCep = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const limited = numbers.slice(0, 8);
    if (limited.length <= 5) {
      return limited;
    }
    return `${limited.slice(0, 5)}-${limited.slice(5)}`;
  };

  // Converter data ISO (yyyy-mm-dd) para dd/mm/yyyy
  const isoToDateBR = (isoDate: string): string => {
    if (!isoDate) return '';
    const date = isoDate.split('T')[0]; // yyyy-mm-dd
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
  };

  // Converter data BR (dd/mm/yyyy) para ISO (yyyy-mm-dd)
  const dateBRToISO = (dateBR: string): string => {
    if (!dateBR) return '';
    const cleaned = dateBR.replace(/\D/g, '');
    if (cleaned.length !== 8) return '';
    const day = cleaned.slice(0, 2);
    const month = cleaned.slice(2, 4);
    const year = cleaned.slice(4, 8);
    return `${year}-${month}-${day}`;
  };

  // Formatar data para dd/mm/yyyy
  const formatDate = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    const limited = numbers.slice(0, 8);
    if (limited.length <= 2) {
      return limited;
    } else if (limited.length <= 4) {
      return `${limited.slice(0, 2)}/${limited.slice(2)}`;
    } else {
      return `${limited.slice(0, 2)}/${limited.slice(2, 4)}/${limited.slice(4)}`;
    }
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
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  const handleSave = async () => {
    // Marcar todos os campos como touched
    setTouched({ 
      name: true, 
      celula: true, 
      ministryPosition: true, 
      email: hasSystemAccess 
    });

    if (!name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (!celulaId) {
      toast.error('Célula é obrigatória');
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

    const data: Partial<Member> & { roleIds?: number[] } = {
      name,
      maritalStatus: maritalStatus as any,
      photoUrl: photoUrl || undefined,
      phone: phone || undefined,
      gender: gender as any || undefined,
      isBaptized,
      baptismDate: baptismDate ? dateBRToISO(baptismDate) : undefined,
      birthDate: birthDate ? dateBRToISO(birthDate) : undefined,
      registerDate: registerDate ? dateBRToISO(registerDate) : undefined,
      spouseId: spouseId || undefined,
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

    // Salvar o membro
    await onSave(data);

    // Enviar convite apenas se:
    // 1. É um novo membro (não está editando) E hasSystemAccess está ativo
    // 2. OU está editando E o email foi alterado E hasSystemAccess está ativo
    const isCreating = !member;
    const emailChanged = member && member.email !== email.trim();
    const shouldSendInvite = hasSystemAccess && email.trim() && (isCreating || emailChanged);

    if (shouldSendInvite) {
      try {
        await memberService.invite({
          email: email.trim(),
        });

        toast.success('Convite enviado para o email com sucesso!');
      } catch (err: unknown) {
        console.error('Erro ao enviar convite:', err);
        const errorMessage = err instanceof Error && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
        // Não bloqueamos o fluxo se o convite falhar
        toast.error(errorMessage || 'Erro ao enviar convite por email');
      }
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
      <div className="bg-white dark:bg-gray-900 rounded w-11/12 max-w-4xl my-8 max-h-[90vh] flex flex-col">
        <div className="p-6 flex items-center justify-between border-b dark:border-gray-700">
          <h3 className="text-xl font-semibold">{isEditing ? 'Editar Membro' : 'Adicionar Novo Membro'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* DADOS PESSOAIS */}
          <div className="border-b pb-3">
            <h4 className="font-medium mb-3 text-sm text-gray-600 dark:text-gray-400">DADOS PESSOAIS</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-sm">Nome *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setTouched({ ...touched, name: true })}
                  className={`border p-2 rounded w-full bg-white dark:bg-gray-800 dark:text-white h-10 ${
                    touched.name && !name.trim() ? 'border-red-500' : ''
                  }`}
                  placeholder="Nome completo"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm">Sexo</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full border p-2 rounded bg-white dark:bg-gray-800 h-10"
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
                  className="w-full border p-2 rounded bg-white dark:bg-gray-800 h-10"
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
                  <ThemeProvider theme={muiTheme}>
                    <FormControl fullWidth size="small">
                      <Select
                        value={spouseId ?? ''}
                        onChange={(e) => setSpouseId(e.target.value ? Number(e.target.value) : null)}
                        className="bg-white dark:bg-gray-800"
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
                  </ThemeProvider>
                </div>
              )}

              <div>
                <label className="block mb-1 text-sm">Data de Nascimento</label>
                <input
                  type="text"
                  value={birthDate}
                  onChange={(e) => setBirthDate(formatDate(e.target.value))}
                  className="border p-2 rounded w-full bg-white dark:bg-gray-800 h-10"
                  placeholder="dd/mm/aaaa"
                  maxLength={10}
                />
              </div>


              <div>
                <label className="block mb-1 text-sm">Telefone</label>
                <input
                  value={phone}
                  onChange={handlePhoneChange}
                  className="border p-2 rounded w-full bg-white dark:bg-gray-800 h-10"
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                />
              </div>
            </div>
          </div>

          {/* DADOS ECLESIÁSTICOS */}
          <div className="border-b pb-3">
            <h4 className="font-medium mb-3 text-sm text-gray-600 dark:text-gray-400">DADOS ECLESIÁSTICOS</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-sm">Célula *</label>
                <ThemeProvider theme={muiTheme}>
                  <FormControl 
                    fullWidth 
                    size="small"
                    error={touched.celula && !celulaId}
                  >
                    <Select
                      value={celulaId ?? ''}
                      onChange={(e) => setCelulaId(e.target.value ? Number(e.target.value) : null)}
                      onBlur={() => setTouched({ ...touched, celula: true })}
                      className="bg-white dark:bg-gray-800"
                      displayEmpty
                    >
                      <MenuItem value="">Sem célula</MenuItem>
                      {celulas.map(c => (
                        <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </ThemeProvider>
              </div>
              <div>
                <label className="block mb-1 text-sm">Cargo Ministerial *</label>
                <ThemeProvider theme={muiTheme}>
                  <FormControl 
                    fullWidth 
                    size="small"
                    error={touched.ministryPosition && !ministryPositionId}
                  >
                    <Select
                      value={ministryPositionId ?? ''}
                      onChange={(e) => setMinistryPositionId(e.target.value ? Number(e.target.value) : null)}
                      onBlur={() => setTouched({ ...touched, ministryPosition: true })}
                      className="bg-white dark:bg-gray-800"
                      displayEmpty
                    >
                      <MenuItem value="">Sem cargo ministerial</MenuItem>
                      {ministries.map(m => (
                        <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </ThemeProvider>
              </div>

              <div>
                <label className="block mb-1 text-sm">É batizado?</label>
                <label htmlFor="isBaptized" className="border rounded p-2 flex items-center justify-between bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
                  <span className="text-sm font-medium"></span>
                  <div className="relative inline-block w-12 h-6">
                    <input
                      type="checkbox"
                      checked={isBaptized}
                      onChange={(e) => setIsBaptized(e.target.checked)}
                      id="isBaptized"
                      className="sr-only peer"
                    />
                    <span className="absolute inset-0 bg-gray-300 dark:bg-gray-600 rounded-full transition-all duration-300 ease-in-out peer-checked:bg-blue-600"></span>
                    <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ease-in-out peer-checked:translate-x-6 peer-checked:shadow-md"></span>
                  </div>
                </label>
              </div>

              {isBaptized && (
                <div>
                  <label className="block mb-1 text-sm">Data de Batismo</label>
                  <input
                    type="text"
                    value={baptismDate}
                    onChange={(e) => setBaptismDate(formatDate(e.target.value))}
                    className="border p-2 rounded w-full bg-white dark:bg-gray-800 h-10"
                    placeholder="dd/mm/aaaa"
                    maxLength={10}
                  />
                </div>
              )}

              <div>
                <label className="block mb-1 text-sm">Trilho do Vencedor</label>
                <ThemeProvider theme={muiTheme}>
                  <FormControl fullWidth size="small">
                    <Select
                      value={winnerPathId ?? ''}
                      onChange={(e) => setWinnerPathId(e.target.value ? Number(e.target.value) : null)}
                      className="bg-white dark:bg-gray-800"
                      displayEmpty
                    >
                      <MenuItem value="">Sem trilho</MenuItem>
                      {winnerPaths.map(w => (
                        <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </ThemeProvider>
              </div>

              <div className="md:col-span-2">
                <label className="block mb-1 text-sm">Funções</label>
                <ThemeProvider theme={muiTheme}>
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
                      className="bg-white dark:bg-gray-800"
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
                </ThemeProvider>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Selecione uma ou mais funções para este membro
                </p>
              </div>

              <div>
                <label className="block mb-1 text-sm">Apto para ser anfitrião?</label>
                <label htmlFor="canBeHost" className="border rounded p-2 flex items-center justify-between bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
                  <span className="text-sm font-medium"></span>
                  <div className="relative inline-block w-12 h-6">
                    <input
                      type="checkbox"
                      checked={canBeHost}
                      onChange={(e) => setCanBeHost(e.target.checked)}
                      id="canBeHost"
                      className="sr-only peer"
                    />
                    <span className="absolute inset-0 bg-gray-300 dark:bg-gray-600 rounded-full transition-all duration-300 ease-in-out peer-checked:bg-blue-600"></span>
                    <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ease-in-out peer-checked:translate-x-6 peer-checked:shadow-md"></span>
                  </div>
                </label>
              </div>


              <div>
                <label className="block mb-1 text-sm">Data de Ingresso</label>
                <input
                  type="text"
                  value={registerDate}
                  onChange={(e) => setRegisterDate(formatDate(e.target.value))}
                  className="border p-2 rounded w-full bg-white dark:bg-gray-800 h-10"
                  placeholder="dd/mm/aaaa"
                  maxLength={10}
                />
              </div>
            </div>
          </div>

          {/* ENDEREÇO */}
          <div className="border-b pb-3">
            <h4 className="font-medium mb-3 text-sm text-gray-600 dark:text-gray-400">ENDEREÇO</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-sm">País</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full border p-2 rounded bg-white dark:bg-gray-800 h-10"
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
                    className="border p-2 rounded w-full bg-white dark:bg-gray-800 h-10"
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
                  className="border p-2 rounded w-full bg-white dark:bg-gray-800 h-10"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm">Número</label>
                <input
                  value={streetNumber}
                  onChange={(e) => setStreetNumber(e.target.value)}
                  className="border p-2 rounded w-full bg-white dark:bg-gray-800 h-10"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm">Bairro</label>
                <input
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="border p-2 rounded w-full bg-white dark:bg-gray-800 h-10"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm">Cidade</label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="border p-2 rounded w-full bg-white dark:bg-gray-800 h-10"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm">Complemento</label>
                <input
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  className="border p-2 rounded w-full bg-white dark:bg-gray-800 h-10"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm">UF</label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full border p-2 rounded bg-white dark:bg-gray-800 h-10"
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
            <h4 className="font-medium mb-3 text-sm text-gray-600 dark:text-gray-400">DADOS DE ACESSO</h4>
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
                  className={`border p-2 rounded w-full bg-white dark:bg-gray-800 h-10 ${
                    hasSystemAccess && touched.email && !email.trim() ? 'border-red-500' : ''
                  }`}
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm">Acesso ao sistema</label>
                <label htmlFor="hasSystemAccess" className="border rounded p-2 flex items-center justify-between bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
                  <span className="text-sm font-medium"></span>
                  <div className="relative inline-block w-12 h-6">
                    <input
                      type="checkbox"
                      checked={hasSystemAccess}
                      onChange={(e) => setHasSystemAccess(e.target.checked)}
                      id="hasSystemAccess"
                      className="sr-only peer"
                    />
                    <span className="absolute inset-0 bg-gray-300 dark:bg-gray-600 rounded-full transition-all duration-300 ease-in-out peer-checked:bg-blue-600"></span>
                    <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ease-in-out peer-checked:translate-x-6 peer-checked:shadow-md"></span>
                  </div>
                </label>
                {hasSystemAccess && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    Um convite será enviado por email para criar a senha de acesso ao sistema
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

          {/* Botões de ação - sticky e full width */}
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t dark:border-gray-700 p-6 flex flex-col gap-2">
          <button
            onClick={handleSave}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
          >
            {isEditing ? 'Salvar' : 'Criar Membro'}
          </button>
          <button
            onClick={onClose}
            className="w-full px-4 py-3 border rounded hover:bg-gray-100 dark:hover:bg-gray-800 font-medium"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
