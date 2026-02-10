"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Celula, Member, Discipulado, Rede } from '@/types';
import { createTheme, FormControl, InputLabel, MenuItem, Select, ThemeProvider } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/pt-br';
import toast from 'react-hot-toast';

interface CelulaModalProps {
  celula: Celula | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    leaderMemberId?: number;
    discipuladoId?: number;
    leaderInTrainingIds?: number[];
    weekday?: number;
    time?: string;
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

  // Estados
  const [name, setName] = useState('');
  const [redeId, setRedeId] = useState<number | null>(null);
  const [discipuladoId, setDiscipuladoId] = useState<number | null>(null);
  const [leaderQuery, setLeaderQuery] = useState('');
  const [leaderId, setLeaderId] = useState<number | null>(null);
  const [leaderName, setLeaderName] = useState('');
  const [showLeaderDropdown, setShowLeaderDropdown] = useState(false);
  const [leaderInTrainingIds, setLeaderInTrainingIds] = useState<number[]>([]);
  const [celulaMemberOptions, setCelulaMemberOptions] = useState<Member[]>([]);
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

  // Validação
  const [touched, setTouched] = useState({
    name: false,
    discipulado: false,
  });

  const leaderDropdownRef = useRef<HTMLDivElement>(null);

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
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (showLeaderDropdown && leaderDropdownRef.current && !leaderDropdownRef.current.contains(target)) {
        setShowLeaderDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLeaderDropdown]);

  const muiTheme = createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
      primary: {
        main: isDarkMode ? '#ffffffff' : '#000000ff',
      },
    },
  });

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

      // Encontrar a rede através do discipulado
      if (celula.discipuladoId) {
        const disc = discipulados.find(d => d.id === celula.discipuladoId);
        if (disc) {
          setRedeId(disc.redeId);
        }
      }
    } else {
      // Modo criação
      resetForm();
    }
  }, [celula, discipulados]);

  // Carregar membros da célula quando editando
  useEffect(() => {
    const loadCelulaMembers = async () => {
      if (celula?.id) {
        try {
          const { membersService } = await import('@/services/membersService');
          const data = await membersService.getMembers(celula.id);
          setCelulaMemberOptions(data || []);
          
          // Inicializar líderes em treinamento
          if (celula.leadersInTraining) {
            setLeaderInTrainingIds(celula.leadersInTraining.map(lit => lit.member.id));
          }
        } catch (error) {
          console.error('Error loading celula members:', error);
        }
      } else {
        setCelulaMemberOptions([]);
        setLeaderInTrainingIds([]);
      }
    };
    
    loadCelulaMembers();
  }, [celula]);

  const resetForm = () => {
    setName('');
    setRedeId(null);
    setDiscipuladoId(null);
    setLeaderQuery('');
    setLeaderId(null);
    setLeaderName('');
    setLeaderInTrainingIds([]);
    setCelulaMemberOptions([]);
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
    setTouched({ name: false, discipulado: false });
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
      discipuladoId: discipuladoId || undefined,
      leaderInTrainingIds: leaderInTrainingIds.length > 0 ? leaderInTrainingIds : undefined,
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

            {/* Rede */}
            <div>
              <FormControl className="w-full">
                <InputLabel id="rede-label" size='small'>Rede *</InputLabel>
                <Select
                  labelId="rede-label"
                  value={redeId ?? ''}
                  onChange={(e) => {
                    setRedeId(e.target.value ? Number(e.target.value) : null);
                    setDiscipuladoId(null);
                  }}
                  label="Rede"
                  size="small"
                  className="bg-gray-800 w-full">
                  <MenuItem value="">Selecione rede</MenuItem>
                  {redes.map((r) => (<MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>))}
                </Select>
              </FormControl>
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
                  onChange={(e) => setDiscipuladoId(e.target.value ? Number(e.target.value) : null)}
                  onBlur={() => setTouched({ ...touched, discipulado: true })}
                  label="Discipulado"
                  size="small"
                  className="bg-gray-800 w-full">
                  <MenuItem value="">Selecione discipulado</MenuItem>
                  {discipulados.filter(d => !redeId || d.redeId === redeId).map((d) => (
                    <MenuItem key={d.id} value={d.id}>{d.discipulador?.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
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
                />
                {showLeaderDropdown && (
                  <div className="absolute left-0 right-0 bg-gray-800 border mt-1 rounded max-h-44 overflow-auto z-50">
                    {members.filter(member => {
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
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Líderes em Treinamento */}
            {isEditing && celulaMemberOptions.length > 0 && (
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
                        const selectedMembers = celulaMemberOptions.filter(m => selected.includes(m.id));
                        return selectedMembers.map(m => m.name).join(', ');
                      }}
                    >
                      {celulaMemberOptions
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
                        ))}
                    </Select>
                  </FormControl>
                </ThemeProvider>
                <p className="text-xs text-gray-400 mt-1">
                  Apenas membros desta célula podem ser selecionados como líderes em treinamento
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
                  onChange={(e) => setWeekday(e.target.value ? Number(e.target.value) : null)}
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
