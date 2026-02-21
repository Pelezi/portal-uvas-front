'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { memberService } from '@/services/memberService';
import { Member } from '@/types';
import { toast } from 'react-hot-toast';
import { Eye, EyeOff, Edit2, Save, X } from 'lucide-react';
import { formatPhoneForDisplay, formatPhoneForInput, stripPhoneFormatting, ensureCountryCode } from '@/lib/phoneUtils';
import { createTheme, FormControl, InputLabel, MenuItem, Select, ThemeProvider, TextField, Button, Slider } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/pt-br';
import Cropper from 'react-easy-crop';
import { Area } from 'react-easy-crop';
import getCroppedImg from '@/utils/cropImage';

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Email state
  const [email, setEmail] = useState('');
  const [editingEmail, setEditingEmail] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Editable personal data
  const [name, setName] = useState('');
  const [maritalStatus, setMaritalStatus] = useState<string>('SINGLE');
  const [spouseId, setSpouseId] = useState<number | null>(null);
  const [birthDate, setBirthDate] = useState<Dayjs | null>(null);
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  // Editable address data
  const [country, setCountry] = useState('Brasil');
  const [zipCode, setZipCode] = useState('');
  const [street, setStreet] = useState('');
  const [streetNumber, setStreetNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [complement, setComplement] = useState('');
  const [state, setState] = useState('');

  // Social Media state - array of { type, username }
  const [socialMedia, setSocialMedia] = useState<Array<{ type: string; username: string }>>([]);

  // For spouse selection
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [loadingCep, setLoadingCep] = useState(false);

  // Photo upload and crop state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [croppedImage, setCroppedImage] = useState<string>('');
  const [croppedImageFile, setCroppedImageFile] = useState<File | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [deletePhoto, setDeletePhoto] = useState(false);

  const muiTheme = createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: '#3b82f6',
      },
    },
  });

  useEffect(() => {
    loadProfile();
    loadMembers();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await memberService.getOwnProfile();
      setProfile(data);
      setEmail(data.email || '');
      
      // Set editable fields
      setName(data.name || '');
      setMaritalStatus(data.maritalStatus || 'SINGLE');
      setSpouseId(data.spouseId || null);
      setBirthDate(data.birthDate ? dayjs(data.birthDate) : null);
      setPhone(data.phone ? formatPhoneForDisplay(ensureCountryCode(data.phone)) : '+55');
      setPhotoUrl(data.photoUrl || '');
      setCountry(data.country || 'Brasil');
      setZipCode(data.zipCode || '');
      setStreet(data.street || '');
      setStreetNumber(data.streetNumber || '');
      setNeighborhood(data.neighborhood || '');
      setCity(data.city || '');
      setComplement(data.complement || '');
      setState(data.state || '');
      
      // Initialize social media from array
      setSocialMedia(data.socialMedia?.map(sm => ({ type: sm.type, username: sm.username })) || []);
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      toast.error('Erro ao carregar perfil');
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      const members = await memberService.list();
      setAllMembers(members);
    } catch (error) {
      console.error('Erro ao carregar membros:', error);
    }
  };

  const handleUpdateEmail = async () => {
    if (!email.trim()) {
      toast.error('Email não pode estar vazio');
      return;
    }

    try {
      await memberService.updateOwnEmail(email.trim());
      toast.success('Email atualizado com sucesso!');
      setEditingEmail(false);
      loadProfile();
    } catch (error: any) {
      console.error('Erro ao atualizar email:', error);
      const errorMessage = error?.response?.data?.message || 'Erro ao atualizar email';
      toast.error(errorMessage);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Preencha todos os campos de senha');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('A nova senha e a confirmação não coincidem');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    try {
      await memberService.updateOwnPassword(currentPassword, newPassword);
      toast.success('Senha atualizada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Erro ao atualizar senha:', error);
      const errorMessage = error?.response?.data?.message || 'Erro ao atualizar senha';
      toast.error(errorMessage);
    }
  };

  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    setIsSaving(true);
    try {
      const strippedPhone = phone ? stripPhoneFormatting(phone) : '';
      const phoneToSend = strippedPhone && strippedPhone !== '55' ? strippedPhone : undefined;

      // Filter valid social media entries
      const validSocialMedia = socialMedia.filter(sm => sm.type.trim() && sm.username.trim());

      const photoChanged = croppedImageFile || deletePhoto;

      await memberService.updateOwnProfile({
        name,
        maritalStatus,
        spouseId: maritalStatus === 'MARRIED' ? spouseId : null,
        birthDate: birthDate ? birthDate.format('YYYY-MM-DD') : undefined,
        phone: phoneToSend,
        photoUrl: photoUrl || undefined,
        country: country || undefined,
        zipCode: zipCode || undefined,
        street: street || undefined,
        streetNumber: streetNumber || undefined,
        neighborhood: neighborhood || undefined,
        city: city || undefined,
        complement: complement || undefined,
        state: state || undefined,
        socialMedia: validSocialMedia.length > 0 ? validSocialMedia : undefined,
      }, croppedImageFile || undefined, deletePhoto);
      
      toast.success('Perfil atualizado com sucesso!');
      setIsEditing(false);

      // If photo was changed, reload page to update sidebar
      if (photoChanged) {
        window.location.reload();
      } else {
        loadProfile();
      }
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      const errorMessage = error?.response?.data?.message || 'Erro ao atualizar perfil';
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (profile) {
      setName(profile.name || '');
      setMaritalStatus(profile.maritalStatus || 'SINGLE');
      setSpouseId(profile.spouseId || null);
      setBirthDate(profile.birthDate ? dayjs(profile.birthDate) : null);
      setPhone(profile.phone ? formatPhoneForDisplay(ensureCountryCode(profile.phone)) : '+55');
      setPhotoUrl(profile.photoUrl || '');
      setCountry(profile.country || 'Brasil');
      setZipCode(profile.zipCode || '');
      setStreet(profile.street || '');
      setStreetNumber(profile.streetNumber || '');
      setNeighborhood(profile.neighborhood || '');
      setCity(profile.city || '');
      setComplement(profile.complement || '');
      setState(profile.state || '');
      
      // Reset social media from profile
      setSocialMedia(profile.socialMedia?.map(sm => ({ type: sm.type, username: sm.username })) || []);
      
      // Reset photo states
      setCroppedImage('');
      setCroppedImageFile(null);
      setSelectedImage(null);
      setImagePreview('');
      setDeletePhoto(false);
    }
    setIsEditing(false);
  };

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
      setDeletePhoto(false);
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
    // Reset crop and zoom
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  };

  const handleRemovePhoto = () => {
    setPhotoUrl('');
    setCroppedImage('');
    setCroppedImageFile(null);
    setSelectedImage(null);
    setImagePreview('');
    setDeletePhoto(true);
    toast.success('Foto removida');
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

    if (formatted.replace(/\D/g, '').length === 8) {
      fetchAddressByCep(formatted);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneForInput(e.target.value);
    setPhone(formatted);
  };

  const getMaritalStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      SINGLE: 'Solteiro(a)',
      COHABITATING: 'Amasiados',
      MARRIED: 'Casado(a)',
      DIVORCED: 'Divorciado(a)',
      WIDOWED: 'Viúvo(a)',
    };
    return labels[status] || status;
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'Não informado';
    return dayjs(date).format('DD/MM/YYYY');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-400">Carregando...</div>
      </div>
    );
  }

  return (
    <ThemeProvider theme={muiTheme}>
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Photo Section */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            {(photoUrl || croppedImage) ? (
              <div className="relative">
                <img
                  src={croppedImage || photoUrl}
                  alt={profile?.name}
                  className="w-32 h-32 rounded-full object-cover border-4 border-blue-900"
                />
                {isEditing && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg"
                    title="Remover foto"
                  >
                    ✕
                  </button>
                )}
              </div>
            ) : (
              <div className="w-32 h-32 rounded-full bg-gray-800 border-4 border-blue-900 flex items-center justify-center">
                <span className="text-4xl text-gray-600">👤</span>
              </div>
            )}
            
            {isEditing && (
              <div className="mt-3 text-center">
                <input
                  type="file"
                  id="profile-photo-upload"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <label
                  htmlFor="profile-photo-upload"
                  className="cursor-pointer px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium inline-block"
                >
                  {photoUrl ? 'Alterar Foto' : 'Adicionar Foto'}
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  Máximo: 10MB | JPG, PNG
                </p>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-100">Meu Perfil</h1>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <Edit2 size={18} />
              Editar Perfil
            </button>
          )}
          {isEditing && (
            <div className="flex gap-2">
              <button
                onClick={handleUpdateProfile}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={18} />
                {isSaving ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X size={18} />
                Cancelar
              </button>
            </div>
          )}
        </div>

        {/* Aviso de senha padrão */}
        {profile?.hasDefaultPassword && (
          <div className="bg-red-900/20 border-l-4 border-red-500 p-4 mb-6 rounded">
            <div className="flex items-start">
              <div className="shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-300">
                  Atenção: Senha Padrão Detectada
                </h3>
                <p className="mt-1 text-sm text-red-400">
                  Você ainda está usando a senha padrão. Por favor, altere sua senha abaixo para garantir a segurança da sua conta.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* INFORMAÇÕES PESSOAIS */}
          <div className="bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-100 border-b border-gray-700 pb-2">Informações Pessoais</h2>
            <div className="space-y-4">
              {isEditing ? (
                <>
                  <div>
                    <TextField
                      fullWidth
                      size="small"
                      label="Nome *"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-gray-700"
                    />
                  </div>

                  <div>
                    <FormControl fullWidth size="small">
                      <InputLabel id="marital-status-label">Estado Civil</InputLabel>
                      <Select
                        labelId="marital-status-label"
                        value={maritalStatus}
                        onChange={(e) => setMaritalStatus(e.target.value)}
                        label="Estado Civil"
                        className="bg-gray-700"
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
                    <div>
                      <FormControl fullWidth size="small">
                        <InputLabel id="spouse-label">Cônjuge</InputLabel>
                        <Select
                          labelId="spouse-label"
                          value={spouseId ?? ''}
                          onChange={(e) => setSpouseId(e.target.value ? Number(e.target.value) : null)}
                          label="Cônjuge"
                          className="bg-gray-700"
                        >
                          <MenuItem value="">Selecione o cônjuge</MenuItem>
                          {allMembers
                            .filter(m => m.id !== profile?.id)
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
                      className="bg-gray-700"
                    />
                  </div>

                  <div>
                    <TextField
                      fullWidth
                      size="small"
                      label="URL da Foto"
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      placeholder="https://..."
                      className="bg-gray-700"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-400">Nome</label>
                    <p className="text-gray-100">{profile?.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400">Gênero</label>
                    <p className="text-gray-100">
                      {profile?.gender === 'MALE' ? 'Masculino' : profile?.gender === 'FEMALE' ? 'Feminino' : profile?.gender === 'OTHER' ? 'Outro' : 'Não informado'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400">Estado Civil</label>
                    <p className="text-gray-100">{getMaritalStatusLabel(profile?.maritalStatus || '')}</p>
                  </div>
                  {profile?.spouse && (
                    <div>
                      <label className="block text-sm font-medium text-gray-400">Cônjuge</label>
                      <p className="text-gray-100">{profile.spouse.name}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-400">Data de Nascimento</label>
                    <p className="text-gray-100">{formatDate(profile?.birthDate)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400">Telefone</label>
                    <p className="text-gray-100">{formatPhoneForDisplay(profile?.phone) || 'Não informado'}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* DADOS ECLESIÁSTICOS */}
          <div className="bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-100 border-b border-gray-700 pb-2">Dados Eclesiásticos</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400">Cargo Ministerial</label>
                <p className="text-gray-100">{profile?.ministryPosition?.name || 'Não informado'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400">Batizado</label>
                <p className="text-gray-100">{profile?.isBaptized ? 'Sim' : 'Não'}</p>
              </div>
              {profile?.isBaptized && (
                <div>
                  <label className="block text-sm font-medium text-gray-400">Data de Batismo</label>
                  <p className="text-gray-100">{formatDate(profile?.baptismDate)}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-400">Trilho do Vencedor</label>
                <p className="text-gray-100">{profile?.winnerPath?.name || 'Não informado'}</p>
              </div>
              {profile?.roles && profile.roles.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-400">Funções</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {profile.roles.map(mr => (
                      <span key={mr.role.id} className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                        {mr.role.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-400">Apto para ser anfitrião</label>
                <p className="text-gray-100">{profile?.canBeHost ? 'Sim' : 'Não'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400">Data de Ingresso</label>
                <p className="text-gray-100">{formatDate(profile?.registerDate)}</p>
              </div>
            </div>
          </div>

          {/* CÉLULA */}
          <div className="bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-100 border-b border-gray-700 pb-2">Célula</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400">Congregação</label>
                <p className="text-gray-100">
                  {profile?.celula?.discipulado?.rede?.congregacao?.name || 'Não informado'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400">Rede</label>
                <p className="text-gray-100">
                  {profile?.celula?.discipulado?.rede?.name || 'Não informado'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400">Discipulado</label>
                <p className="text-gray-100">
                  {profile?.celula?.discipulado?.discipulador?.name || 'Não informado'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400">Célula</label>
                <p className="text-gray-100">{profile?.celula?.name || 'Não informado'}</p>
              </div>
            </div>
          </div>

          {/* ENDEREÇO */}
          <div className="bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-100 border-b border-gray-700 pb-2">Endereço</h2>
            <div className="space-y-4">
              {isEditing ? (
                <>
                  <div>
                    <FormControl fullWidth size="small">
                      <InputLabel id="country-label">País</InputLabel>
                      <Select
                        labelId="country-label"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        label="País"
                        className="bg-gray-700"
                      >
                        <MenuItem value="Brasil">Brasil</MenuItem>
                      </Select>
                    </FormControl>
                  </div>

                  <div className="relative">
                    <TextField
                      fullWidth
                      size="small"
                      label="CEP"
                      value={zipCode}
                      onChange={handleCepChange}
                      placeholder="12345-678"
                      inputProps={{ maxLength: 9 }}
                      className="bg-gray-700"
                    />
                    {loadingCep && (
                      <div className="absolute right-2 top-2">
                        <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 sm:col-span-1">
                      <TextField
                        fullWidth
                        size="small"
                        label="Rua"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        className="bg-gray-700"
                      />
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <TextField
                        fullWidth
                        size="small"
                        label="Número"
                        value={streetNumber}
                        onChange={(e) => setStreetNumber(e.target.value)}
                        className="bg-gray-700"
                      />
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <TextField
                        fullWidth
                        size="small"
                        label="Bairro"
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        className="bg-gray-700"
                      />
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <TextField
                        fullWidth
                        size="small"
                        label="Cidade"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="bg-gray-700"
                      />
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <TextField
                        fullWidth
                        size="small"
                        label="Complemento"
                        value={complement}
                        onChange={(e) => setComplement(e.target.value)}
                        className="bg-gray-700"
                      />
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <FormControl fullWidth size="small">
                        <InputLabel id="state-label">UF</InputLabel>
                        <Select
                          labelId="state-label"
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          label="UF"
                          className="bg-gray-700"
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
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-400">País</label>
                    <p className="text-gray-100">{profile?.country || 'Não informado'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400">CEP</label>
                    <p className="text-gray-100">{profile?.zipCode || 'Não informado'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400">Endereço</label>
                    <p className="text-gray-100">
                      {profile?.street && profile?.streetNumber
                        ? `${profile.street}, ${profile.streetNumber}`
                        : profile?.street || 'Não informado'}
                    </p>
                  </div>
                  {profile?.complement && (
                    <div>
                      <label className="block text-sm font-medium text-gray-400">Complemento</label>
                      <p className="text-gray-100">{profile.complement}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-400">Bairro</label>
                    <p className="text-gray-100">{profile?.neighborhood || 'Não informado'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400">Cidade</label>
                    <p className="text-gray-100">
                      {profile?.city && profile?.state
                        ? `${profile.city} - ${profile.state}`
                        : profile?.city || 'Não informado'}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* REDES SOCIAIS */}
        <div className="mt-6">
          <div className="bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-100 border-b border-gray-700 pb-2">Redes Sociais</h2>
            {isEditing ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-300">
                    Adicione as redes sociais
                  </label>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setSocialMedia([...socialMedia, { type: 'INSTAGRAM', username: '' }])}
                    className="text-blue-400 border-blue-400 hover:bg-blue-400 hover:bg-opacity-10"
                  >
                    + Adicionar Rede Social
                  </Button>
                </div>
                
                {socialMedia.length === 0 && (
                  <p className="text-sm text-gray-500 italic">Nenhuma rede social adicionada</p>
                )}
                
                {socialMedia.map((sm, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-start">
                    <div className="md:col-span-2">
                      <FormControl fullWidth size="small">
                        <InputLabel>Tipo</InputLabel>
                        <Select
                          value={sm.type}
                          onChange={(e) => {
                            const updated = [...socialMedia];
                            updated[idx].type = e.target.value;
                            setSocialMedia(updated);
                          }}
                          label="Tipo"
                          className="bg-gray-700"
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
                        value={sm.username}
                        onChange={(e) => {
                          const updated = [...socialMedia];
                          updated[idx].username = e.target.value;
                          setSocialMedia(updated);
                        }}
                        placeholder={
                          sm.type === 'WHATSAPP' ? '+55 11 99999-9999' : 
                          sm.type === 'INSTAGRAM' || sm.type === 'TWITTER' || sm.type === 'TIKTOK' 
                            ? '@username' 
                            : 'username ou URL'
                        }
                        className="bg-gray-700"
                      />
                    </div>
                    <div>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => setSocialMedia(socialMedia.filter((_, i) => i !== idx))}
                        className="w-full"
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {profile?.socialMedia && profile.socialMedia.length > 0 ? (
                  profile.socialMedia.map((sm, idx) => (
                    <div key={idx}>
                      <label className="block text-sm font-medium text-gray-400">{sm.type}</label>
                      <p className="text-gray-100">{sm.username}</p>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2">
                    <p className="text-gray-400">Nenhuma rede social cadastrada</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* DADOS DE ACESSO */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Alterar Email */}
          <div className="bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-100 border-b border-gray-700 pb-2">Email</h2>
            <div className="space-y-3">
              {!editingEmail ? (
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-gray-400">Email atual</label>
                    <p className="text-gray-100">{email || 'Não informado'}</p>
                  </div>
                  <button
                    onClick={() => setEditingEmail(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Alterar Email
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Novo Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-gray-100"
                      placeholder="seu@email.com"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdateEmail}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => {
                        setEmail(profile?.email || '');
                        setEditingEmail(false);
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Alterar Senha */}
          <div className="bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-100 border-b border-gray-700 pb-2">Alterar Senha</h2>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Senha Atual
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-gray-100 pr-10"
                    placeholder="Digite sua senha atual"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                  >
                    {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-gray-100 pr-10"
                    placeholder="Digite a nova senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                  >
                    {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Confirmar Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-gray-100 pr-10"
                    placeholder="Confirme a nova senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Alterar Senha
              </button>
            </form>
          </div>
        </div>
        
        {/* Modal de Crop */}
        {showCropModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded w-11/12 max-w-2xl p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-100">Ajustar Foto</h3>
              
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

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Zoom
                </label>
                <Slider
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  onChange={(e, value) => setZoom(value as number)}
                  className="text-blue-600"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCropCancel}
                  className="flex-1 px-4 py-2 border border-gray-600 rounded hover:bg-gray-800 text-gray-100"
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
      </div>
    </ThemeProvider>
  );
}
