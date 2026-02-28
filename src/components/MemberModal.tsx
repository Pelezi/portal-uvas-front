"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Member, Celula, Ministry, WinnerPath, Role, Congregacao, Rede, Discipulado } from '@/types';
import { createTheme, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, ThemeProvider, Checkbox, ListItemText, OutlinedInput, Autocomplete, TextField, Switch, FormControlLabel, Slider } from '@mui/material';
import SingleMemberSelect from '@/components/SingleMemberSelect';
import StyledSelect from '@/components/StyledSelect';
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
import { FiSearch } from 'react-icons/fi';
import SearchUnassignedMembersModal from '@/components/SearchUnassignedMembersModal';
import Cropper from 'react-easy-crop';
import { Area } from 'react-easy-crop';
import getCroppedImg from '@/utils/cropImage';

interface MemberModalProps {
  memberId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Member>, photo?: File, deletePhoto?: boolean, originalMember?: Member | null) => Promise<Member>;
  celulas: Celula[];
  initialCelulaId?: number | null;
  /** Show a search icon to find and assign unassigned members to a cell */
  showSearchUnassigned?: boolean;
  /** Called after an unassigned member is assigned to the cell */
  onMemberAssigned?: () => void;
}

export default function MemberModal({ memberId, isOpen, onClose, onSave, celulas = [], initialCelulaId, showSearchUnassigned, onMemberAssigned }: MemberModalProps) {
  const isEditing = !!memberId;
  const { user } = useAuth();

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Ref para o campo de nome
  const nameInputRef = useRef<HTMLInputElement>(null);
  const configRequestControllerRef = useRef<AbortController | null>(null);

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

  // Internal member state — fetched from API when editing
  const [member, setMember] = useState<Member | null>(null);
  const [loadingMember, setLoadingMember] = useState(false);

  useEffect(() => {
    if (!isOpen || !memberId) {
      setMember(null);
      return;
    }
    setLoadingMember(true);
    memberService.getById(memberId)
      .then(setMember)
      .catch(err => { console.error(err); toast.error('Erro ao carregar membro'); })
      .finally(() => setLoadingMember(false));
  }, [isOpen, memberId]);

  // Estados para upload e crop de imagem
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [croppedImage, setCroppedImage] = useState<string>('');
  const [croppedImageFile, setCroppedImageFile] = useState<File | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [originalPhotoUrl, setOriginalPhotoUrl] = useState<string>(''); // Foto original do membro

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
    gender: false,
  });

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      // Focar o campo de nome quando abrir o modal em modo de criação
      if (!isEditing) {
        setTimeout(() => {
          nameInputRef.current?.focus();
        }, 100);
      }
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose, isEditing]);

  useEffect(() => {
    if (!isOpen) return;
    
    const controller = new AbortController();
    
    const loadConfigData = async () => {
      configRequestControllerRef.current?.abort();
      configRequestControllerRef.current = controller;
      
      // Determinar se deve buscar todos os dados
      const canSeeAllFilters = !!user?.permission?.isAdmin || !!user?.permission?.pastorPresidente;
      
      try {
        const [ministriesData, winnerPathsData, rolesData, membersData, congregacoesData, redesData, discipuladosData] = await Promise.all([
          configService.getMinistries(),
          configService.getWinnerPaths(),
          configService.getRoles(),
          memberService.getMembersAutocomplete({ all: true }),
          congregacoesService.getCongregacoes(canSeeAllFilters ? { all: true } : undefined),
          redesService.getRedes(canSeeAllFilters ? { all: true } : {}),
          discipuladosService.getDiscipulados(canSeeAllFilters ? { all: true } : undefined),
        ]);
        
        if (controller.signal.aborted) return;
        
        setMinistries(ministriesData);
        setWinnerPaths(winnerPathsData);
        setRoles(rolesData);
        setAllMembers(membersData);
        setCongregacoes(congregacoesData || []);
        setRedes(redesData || []);
        setDiscipulados(discipuladosData || []);
      } catch (err) {
        if ((err as { code?: string; name?: string })?.code === 'ERR_CANCELED' || (err as { code?: string; name?: string })?.name === 'CanceledError') {
          return;
        }
        console.error('Failed to load config data:', err);
      }
    };
    loadConfigData();
    
    return () => {
      controller.abort();
      if (configRequestControllerRef.current === controller) {
        configRequestControllerRef.current = null;
      }
    };
  }, [isOpen, user?.permission?.isAdmin, user?.permission?.pastorPresidente]);

  // Verificar se o usuário está editando a si mesmo
  const isEditingSelf = useMemo(() => {
    return !!(isEditing && member && user && member.id === user.id);
  }, [isEditing, member, user]);

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

  // Verificar quais ministérios o usuário pode selecionar
  const selectableMinistryIds = useMemo(() => {
    // Se não há usuário logado, nenhum cargo selecionável
    if (!user) return new Set<number>();

    // Admin e pastores podem atribuir qualquer cargo
    const isAdmin = user.permission?.isAdmin || false;
    const isPastor = user.permission?.ministryType === 'PRESIDENT_PASTOR' ||
      user.permission?.ministryType === 'PASTOR';

    if (isAdmin || isPastor) {
      return new Set(ministries.map(m => m.id));
    }

    // Se o usuário não tem cargo ministerial, não pode criar membros com cargo
    const userMinistryPositionId = user.ministryPositionId;
    if (!userMinistryPositionId) {
      return new Set<number>();
    }

    // Encontrar o cargo do usuário logado
    const userMinistry = ministries.find(m => m.id === userMinistryPositionId);
    if (!userMinistry) {
      return new Set(ministries.map(m => m.id));
    }

    // Retornar apenas IDs de cargos com priority MAIOR (menor na hierarquia) que o do usuário
    return new Set(
      ministries
        .filter(m => (m.priority ?? 0) > (userMinistry.priority ?? 0))
        .map(m => m.id)
    );
  }, [user, ministries]);

  const muiTheme = createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: '#3b82f6', 
      },
    },
  });

  // Definir valor padrão do cargo ministerial como REGULAR_ATTENDEE em modo de criação
  useEffect(() => {
    if (!isEditing && isOpen && ministries.length > 0 && !ministryPositionId) {
      const regularAttendee = ministries.find(m => m.type === 'REGULAR_ATTENDEE');
      if (regularAttendee) {
        setMinistryPositionId(regularAttendee.id);
      }
    }
  }, [isEditing, isOpen, ministries, ministryPositionId]);

  useEffect(() => {
    if (isOpen) {
      if (member) {
        setName(member.name || '');
        setCelulaId(member.celulaId ?? null);
        setMaritalStatus(member.maritalStatus ?? 'SINGLE');
        setPhotoUrl(member.photoUrl ?? '');
        setOriginalPhotoUrl(member.photoUrl ?? ''); // Guardar foto original
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
    } else {
      // Limpar estados quando o modal é fechado para evitar que dados antigos apareçam na próxima abertura
      resetForm();
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
    setRegisterDate(dayjs()); // Preencher automaticamente com a data atual
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
    setTouched({ name: false, ministryPosition: false, email: false, gender: false });
    
    // Reset social media
    setSocialMedia([]);
    
    // Reset image states
    setSelectedImage(null);
    setImagePreview('');
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setCroppedImage('');
    setCroppedImageFile(null);
    setShowCropModal(false);
    setOriginalPhotoUrl('');
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



  // Funções de manipulação de imagem
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tamanho do arquivo (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 10MB');
        return;
      }
      
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione uma imagem válida');
        return;
      }
      
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setShowCropModal(true);
    }
  };

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropConfirm = async () => {
    if (!croppedAreaPixels || !selectedImage) return;

    try {
      const croppedImageBlob = await getCroppedImg(
        imagePreview,
        croppedAreaPixels
      );

      // Converter Blob para File
      const croppedFile = new File(
        [croppedImageBlob],
        selectedImage.name,
        { type: 'image/jpeg' }
      );

      setCroppedImage(URL.createObjectURL(croppedImageBlob));
      setCroppedImageFile(croppedFile);
      setPhotoUrl(URL.createObjectURL(croppedImageBlob));
      setShowCropModal(false);
      
      // Reset crop and zoom for next photo
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      
      toast.success('Foto selecionada com sucesso!');
    } catch (error) {
      console.error('Erro ao cortar imagem:', error);
      toast.error('Erro ao processar a imagem');
    }
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    setSelectedImage(null);
    setImagePreview('');
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  const handleRemovePhoto = () => {
    setPhotoUrl('');
    setCroppedImage('');
    setCroppedImageFile(null);
    setSelectedImage(null);
    setImagePreview('');
    toast.success('Foto removida');
  };

  const handleSave = async () => {
    // Marcar todos os campos como touched
    setTouched({
      name: true,
      ministryPosition: true,
      email: hasSystemAccess,
      gender: true
    });

    if (!name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (!gender) {
      toast.error('Gênero é obrigatório');
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

    // Verificar se deve deletar a foto: tinha foto original E agora não tem mais E não está enviando uma nova
    const shouldDeletePhoto = Boolean(isEditing && originalPhotoUrl && !photoUrl.trim() && !croppedImageFile);

    setIsSaving(true);
    try {
      // Salvar o membro - onSave agora retorna o membro salvo e aceita foto
      await onSave(data, croppedImageFile || undefined, shouldDeletePhoto, member);
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
    
    // Se estiver desativando o membro, verificar posições de liderança
    if (member && !newActiveState) {
      const leadershipPositions: string[] = [];
      
      if (member.ledCelulas && member.ledCelulas.length > 0) {
        leadershipPositions.push(`Líder de ${member.ledCelulas.length} célula(s)`);
      }
      
      if (member.discipulados && member.discipulados.length > 0) {
        leadershipPositions.push(`Discipulador de ${member.discipulados.length} discipulado(s)`);
      }
      
      if (member.redes && member.redes.length > 0) {
        leadershipPositions.push(`Pastor de ${member.redes.length} rede(s)`);
      }
      
      if (member.congregacoesPastorGoverno && member.congregacoesPastorGoverno.length > 0) {
        leadershipPositions.push(`Pastor de governo de ${member.congregacoesPastorGoverno.length} congregação(ões)`);
      }
      
      if (leadershipPositions.length > 0) {
        toast.error(
          `Não é possível desligar este membro pois ele possui os seguintes cargos de liderança:\n\n${leadershipPositions.join('\n')}\n\nRemova-o desses cargos antes de desligá-lo.`,
          { duration: 6000 }
        );
        return;
      }
    }
    
    setIsActive(newActiveState);

    if (member) {
      await onSave({ isActive: newActiveState });
    }
  };

  if (!isOpen) return null;

  if (loadingMember) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
      </div>
    );
  }

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
            <div className="flex items-center gap-2">
              {showSearchUnassigned && !isEditing && initialCelulaId && (
                <button
                  onClick={() => setIsSearchModalOpen(true)}
                  className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded transition-colors"
                  title="Buscar membros sem célula"
                >
                  <FiSearch size={18} />
                </button>
              )}
              <button onClick={onClose} className="text-gray-500 hover:text-gray-300">✕</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* FOTO E DADOS PESSOAIS */}
            <div className="border-b pb-4">
              <h4 className="font-medium mb-3 text-sm text-gray-400">DADOS PESSOAIS</h4>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Coluna da Foto - 1/4 em desktop */}
                <div className="lg:col-span-1 flex flex-col items-center gap-4">
                  {/* Preview da foto */}
                  <div className="relative">
                    {(photoUrl || croppedImage) ? (
                      <div className="relative">
                        <img
                          src={croppedImage || photoUrl}
                          alt="Foto do membro"
                          className="w-40 h-40 rounded-full object-cover border-4 border-gray-700"
                        />
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-8 h-8 flex items-center justify-center"
                          title="Remover foto"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="w-40 h-40 rounded-full bg-gray-800 border-4 border-gray-700 flex items-center justify-center">
                        <span className="text-4xl text-gray-600">👤</span>
                      </div>
                    )}
                  </div>

                  {/* Botão de upload */}
                  <div className="w-full">
                    <input
                      type="file"
                      id="photo-upload"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="photo-upload"
                      className="cursor-pointer px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium inline-block w-full text-center"
                    >
                      {photoUrl ? 'Alterar Foto' : 'Selecionar Foto'}
                    </label>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Tamanho máximo: 10MB | Formatos: JPG, PNG
                    </p>
                  </div>
                </div>

                {/* Coluna dos Campos - 3/4 em desktop */}
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-3">
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
                      inputRef={nameInputRef}
                    />
                  </div>

                  <div>
                    <StyledSelect
                      id="gender"
                      label="Gênero"
                      required
                      value={gender}
                      onChange={(val) => setGender(String(val))}
                      onBlur={() => setTouched({ ...touched, gender: true })}
                      error={touched.gender && !gender}
                      options={[
                        { value: 'MALE', label: 'Masculino' },
                        { value: 'FEMALE', label: 'Feminino' },
                        { value: 'OTHER', label: 'Outro' },
                      ]}
                      placeholder="Selecione"
                    />
                  </div>

                  <div>
                    <StyledSelect
                      id="marital-status"
                      label="Estado Civil"
                      value={maritalStatus}
                      onChange={(val) => setMaritalStatus(String(val))}
                      options={[
                        { value: 'SINGLE', label: 'Solteiro(a)' },
                        { value: 'COHABITATING', label: 'Amasiados' },
                        { value: 'MARRIED', label: 'Casado(a)' },
                        { value: 'DIVORCED', label: 'Divorciado(a)' },
                        { value: 'WIDOWED', label: 'Viúvo(a)' },
                      ]}
                    />
                  </div>

                  {maritalStatus === 'MARRIED' && (
                    <div className="md:col-span-1">
                      <SingleMemberSelect
                        options={allMembers}
                        value={spouseId}
                        onChange={(id) => setSpouseId(id)}
                        label="Cônjuge"
                        placeholder="Buscar cônjuge..."
                        excludeIds={member?.id ? [member.id] : []}
                        avatarColor="bg-pink-600"
                      />
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
            </div>

            {/* CÉLULA */}
            <div className="border-b pb-3">
              <h4 className="font-medium mb-3 text-sm text-gray-400">CÉLULA</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Congregação */}
                <div>
                  <StyledSelect
                    id="filter-congregacao"
                    label="Congregação"
                    value={filterCongregacaoId ?? ''}
                    onChange={(val) => {
                      setFilterCongregacaoId(val ? Number(val) : null);
                      setFilterRedeId(null);
                      setFilterDiscipuladoId(null);
                    }}
                    disabled={isEditingSelf}
                    options={congregacoes.map((c) => ({ value: c.id, label: c.name }))}
                    placeholder="Todas as congregações"
                  />
                </div>

                {/* Rede */}
                <div>
                  <StyledSelect
                    id="filter-rede"
                    label="Rede"
                    value={filterRedeId ?? ''}
                    onChange={(val) => {
                      const selectedRedeId = val ? Number(val) : null;
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
                    disabled={isEditingSelf}
                    options={redes
                      .filter(r => !filterCongregacaoId || r.congregacaoId === filterCongregacaoId)
                      .map((r) => ({ value: r.id, label: r.name }))}
                    placeholder="Todas as redes"
                  />
                </div>

                {/* Discipulado */}
                <div>
                  <StyledSelect
                    id="filter-discipulado"
                    label="Discipulado"
                    value={filterDiscipuladoId ?? ''}
                    onChange={(val) => {
                      const selectedDiscipuladoId = val ? Number(val) : null;
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
                    disabled={isEditingSelf}
                    options={discipulados
                      .filter(d => !filterRedeId || d.redeId === filterRedeId)
                      .map((d) => ({
                        value: d.id,
                        label: d.discipulador?.name || `Discipulado ${d.id}`,
                      }))}
                    placeholder="Todos os discipulados"
                  />
                </div>

                {/* Célula */}
                <div>
                  <Autocomplete
                    size="small"
                    disabled={isEditingSelf}
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
                  <StyledSelect
                    id="ministry-position"
                    label="Cargo Ministerial"
                    required
                    value={ministryPositionId ?? ''}
                    onChange={(val) => setMinistryPositionId(val ? Number(val) : null)}
                    onBlur={() => setTouched({ ...touched, ministryPosition: true })}
                    error={touched.ministryPosition && !ministryPositionId}
                    disabled={isEditingSelf}
                    options={ministries.map(m => ({
                      value: m.id,
                      label: m.name,
                      disabled: !selectableMinistryIds.has(m.id)
                    }))}
                  />
                </div>

                <div>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={isBaptized}
                        onChange={(e) => setIsBaptized(e.target.checked)}
                        disabled={isEditingSelf}
                        color="primary"
                      />
                    }
                    label="É batizado?"
                    className={`border rounded bg-gray-800 px-2 py-1 m-0 w-full flex justify-between ${isEditingSelf ? 'opacity-60' : ''}`}
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
                        disabled={isEditingSelf}
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
                  <StyledSelect
                    id="winner-path"
                    label="Trilho do Vencedor"
                    value={winnerPathId ?? ''}
                    onChange={(val) => setWinnerPathId(val ? Number(val) : null)}
                    disabled={isEditingSelf}
                    options={winnerPaths.map(w => ({ value: w.id, label: w.name }))}
                  />
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
                        disabled={isEditingSelf}
                        color="primary"
                      />
                    }
                    label="Apto para ser anfitrião?"
                    className={`border rounded bg-gray-800 px-2 py-1 m-0 w-full flex justify-between ${isEditingSelf ? 'opacity-60' : ''}`}
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
                      disabled={isEditingSelf}
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
                  <StyledSelect
                    id="country"
                    label="País"
                    value={country}
                    onChange={(val) => setCountry(String(val))}
                    options={[
                      { value: 'Brasil', label: 'Brasil' },
                    ]}
                  />
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
                  <StyledSelect
                    id="state"
                    label="UF"
                    value={state}
                    onChange={(val) => setState(String(val))}
                    options={[
                      { value: 'AC', label: 'AC' },
                      { value: 'AL', label: 'AL' },
                      { value: 'AP', label: 'AP' },
                      { value: 'AM', label: 'AM' },
                      { value: 'BA', label: 'BA' },
                      { value: 'CE', label: 'CE' },
                      { value: 'DF', label: 'DF' },
                      { value: 'ES', label: 'ES' },
                      { value: 'GO', label: 'GO' },
                      { value: 'MA', label: 'MA' },
                      { value: 'MT', label: 'MT' },
                      { value: 'MS', label: 'MS' },
                      { value: 'MG', label: 'MG' },
                      { value: 'PA', label: 'PA' },
                      { value: 'PB', label: 'PB' },
                      { value: 'PR', label: 'PR' },
                      { value: 'PE', label: 'PE' },
                      { value: 'PI', label: 'PI' },
                      { value: 'RJ', label: 'RJ' },
                      { value: 'RN', label: 'RN' },
                      { value: 'RS', label: 'RS' },
                      { value: 'RO', label: 'RO' },
                      { value: 'RR', label: 'RR' },
                      { value: 'SC', label: 'SC' },
                      { value: 'SP', label: 'SP' },
                      { value: 'SE', label: 'SE' },
                      { value: 'TO', label: 'TO' },
                    ]}
                    placeholder="Selecione"
                  />
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
                      <StyledSelect
                        id={`social-type-${index}`}
                        label="Tipo"
                        value={social.type}
                        onChange={(val) => {
                          const updated = [...socialMedia];
                          updated[index].type = String(val);
                          setSocialMedia(updated);
                        }}
                        options={[
                          { value: 'INSTAGRAM', label: 'Instagram' },
                          { value: 'FACEBOOK', label: 'Facebook' },
                          { value: 'TWITTER', label: 'Twitter/X' },
                          { value: 'LINKEDIN', label: 'LinkedIn' },
                          { value: 'TIKTOK', label: 'TikTok' },
                          { value: 'YOUTUBE', label: 'YouTube' },
                          { value: 'TELEGRAM', label: 'Telegram' },
                          { value: 'DISCORD', label: 'Discord' },
                          { value: 'THREADS', label: 'Threads' },
                          { value: 'SNAPCHAT', label: 'Snapchat' },
                          { value: 'PINTEREST', label: 'Pinterest' },
                          { value: 'TWITCH', label: 'Twitch' },
                          { value: 'OUTRO', label: 'Outro' },
                        ]}
                      />
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
                <div className="md:col-span-2">
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

                {!isEditingSelf && canManageSystemAccess && (
                  <div className="md:col-span-2">
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
                )}
              </div>
            </div>

            {/* Status Ativo/Desligado - só na edição */}
            {isEditing  && !isEditingSelf && (
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

      {/* Modal de Crop */}
      {showCropModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-60">
          <div className="bg-gray-900 rounded w-11/12 max-w-2xl p-6">
            <h3 className="text-xl font-bold mb-4">Ajustar Foto</h3>
            
            <div className="relative w-full h-96 bg-gray-800 rounded mb-4">
              <Cropper
                image={imagePreview}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                cropShape="round"
                showGrid={false}
              />
            </div>

            <ZoomSlider zoom={zoom} onZoomChange={setZoom} />

            <div className="flex gap-3">
              <button
                onClick={handleCropCancel}
                className="flex-1 px-4 py-2 border border-gray-600 rounded hover:bg-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleCropConfirm}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
              >
                Confirmar Corte
              </button>
            </div>
          </div>
        </div>
      )}

      {showSearchUnassigned && initialCelulaId && (
        <SearchUnassignedMembersModal
          isOpen={isSearchModalOpen}
          onClose={() => setIsSearchModalOpen(false)}
          celulaId={initialCelulaId}
          onMemberAssigned={() => {
            onMemberAssigned?.();
          }}
        />
      )}
    </div>
  );
}

// Memoized zoom slider component to prevent unnecessary re-renders
const ZoomSlider = React.memo(({ zoom, onZoomChange }: { zoom: number; onZoomChange: (zoom: number) => void }) => {
  // Local state for immediate slider feedback without triggering expensive Cropper re-renders
  const [localZoom, setLocalZoom] = useState(zoom);

  // Sync local zoom when prop changes (e.g., modal opens)
  useEffect(() => {
    setLocalZoom(zoom);
  }, [zoom]);

  // Update local state immediately for responsive UI
  const handleChange = useCallback((event: Event, newValue: number | number[]) => {
    setLocalZoom(newValue as number);
  }, []);

  // Only update parent (and Cropper) when user finishes dragging
  const handleChangeCommitted = useCallback((event: React.SyntheticEvent | Event, newValue: number | number[]) => {
    onZoomChange(newValue as number);
  }, [onZoomChange]);

  const marks = useMemo(() => [
    { value: 1, label: '1x' },
    { value: 2, label: '2x' },
    { value: 3, label: '3x' }
  ], []);

  const sliderSx = useMemo(() => ({
    color: '#3b82f6',
    '& .MuiSlider-thumb': {
      width: 20,
      height: 20,
    },
    '& .MuiSlider-track': {
      height: 4,
    },
    '& .MuiSlider-rail': {
      height: 4,
      backgroundColor: '#374151',
    },
  }), []);

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-2">
        Zoom: {localZoom.toFixed(1)}x
      </label>
      <Slider
        value={localZoom}
        onChange={handleChange}
        onChangeCommitted={handleChangeCommitted}
        min={1}
        max={3}
        step={0.01}
        valueLabelDisplay="auto"
        valueLabelFormat={(value) => `${value.toFixed(1)}x`}
        marks={marks}
        sx={sliderSx}
      />
    </div>
  );
});
