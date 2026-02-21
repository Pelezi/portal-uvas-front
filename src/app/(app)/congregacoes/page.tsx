"use client";

import React, { useEffect, useState, useRef } from 'react';
import CollapsibleItem from '@/components/CollapsibleItem';
import { congregacoesService, CreateCongregacaoInput, UpdateCongregacaoInput, CongregacaoFilterInput } from '@/services/congregacoesService';
import { memberService } from '@/services/memberService';
import { redesService } from '@/services/redesService';
import toast from 'react-hot-toast';
import { ErrorMessages } from '@/lib/errorHandler';
import { FiTrash2, FiPlus, FiEdit2, FiMapPin } from 'react-icons/fi';
import { FaFilter, FaFilterCircleXmark } from 'react-icons/fa6';
import ModalConfirm from '@/components/ModalConfirm';
import { Congregacao, Member, Rede } from '@/types';
import FilterModal, { FilterConfig } from '@/components/FilterModal';
import { TextField, Autocomplete, ThemeProvider, createTheme } from '@mui/material';

export default function CongregacoesPage() {
  const [congregacoes, setCongregacoes] = useState<Congregacao[]>([]);
  const [users, setUsers] = useState<Member[]>([]);
  const [kidsLeaders, setKidsLeaders] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);

  // Filter states
  const [filterName, setFilterName] = useState('');
  const [filterMyCongregations, setFilterMyCongregations] = useState(true);
  const [filterPastorId, setFilterPastorId] = useState<number | null>(null);
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  // expansion & cache maps
  const [expandedCongregacoes, setExpandedCongregacoes] = useState<Record<number, boolean>>({});
  const [congregacaoRedesMap, setCongregacaoRedesMap] = useState<Record<number, Rede[]>>({});

  // create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createData, setCreateData] = useState<CreateCongregacaoInput>({
    name: '',
    pastorGovernoMemberId: 0,
    isPrincipal: false,
  });

  // edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<UpdateCongregacaoInput>({});

  // confirm modal for deletions
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Congregacao | null>(null);

  // Address autocomplete
  const [loadingAddress, setLoadingAddress] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const filters: CongregacaoFilterInput = {};
      if (filterName) filters.name = filterName;
      if (filterPastorId) filters.pastorGovernoMemberId = filterPastorId;
      if (!filterMyCongregations) filters.all = true;
      
      const c = await congregacoesService.getCongregacoes(filters);
      setCongregacoes(c || []);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar congregações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filterName, filterPastorId, filterMyCongregations]);

  useEffect(() => {
    (async () => {
      try {
        const u = await memberService.getAllMembers({ ministryType: 'PRESIDENT_PASTOR,PASTOR', all: true });
        setUsers(u || []);
        
        // Carregar lista de mulheres com cargo ministerial de tipo PASTOR ou acima para rede kids
        const kidsLeadersList = await memberService.getAllMembers({ 
          ministryType: 'PRESIDENT_PASTOR,PASTOR',
          gender: 'FEMALE',
          all: true
        });
        setKidsLeaders(kidsLeadersList || []);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  const onToggleCongregacao = async (c: Congregacao) => {
    try {
      const currently = !!expandedCongregacoes[c.id];
      if (!currently && !congregacaoRedesMap[c.id]) {
        const all = await redesService.getRedes();
        const congregacaoRedes = (all || []).filter((r: Rede) => r.congregacaoId === c.id);
        setCongregacaoRedesMap(prev => ({ ...prev, [c.id]: congregacaoRedes }));
      }
      setExpandedCongregacoes(prev => ({ ...prev, [c.id]: !currently }));
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar redes');
    }
  };

  const searchAddress = async (zipCode: string, isEdit: boolean = false) => {
    if (!zipCode || zipCode.replace(/\D/g, '').length !== 8) return;

    setLoadingAddress(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${zipCode.replace(/\D/g, '')}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }

      const addressData = {
        street: data.logradouro || '',
        neighborhood: data.bairro || '',
        city: data.localidade || '',
        state: data.uf || '',
        country: 'Brasil',
      };

      if (isEdit) {
        setEditData(prev => ({ ...prev, ...addressData }));
      } else {
        setCreateData(prev => ({ ...prev, ...addressData }));
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao buscar endereço');
    } finally {
      setLoadingAddress(false);
    }
  };

  const createCongregacao = async () => {
    try {
      if (!createData.name) {
        toast.error('Nome é obrigatório');
        return;
      }
      if (!createData.pastorGovernoMemberId) {
        toast.error('Pastor de governo é obrigatório');
        return;
      }

      await congregacoesService.createCongregacao(createData);
      setCreateData({ name: '', pastorGovernoMemberId: 0, isPrincipal: false });
      setShowCreateModal(false);
      await load();
      toast.success('Congregação criada com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao criar congregação');
    }
  };

  const openEditCongregacao = (c: Congregacao) => {
    setEditingId(c.id);
    setEditData({
      name: c.name,
      pastorGovernoMemberId: c.pastorGovernoMemberId,
      vicePresidenteMemberId: c.vicePresidenteMemberId || undefined,
      kidsLeaderMemberId: c.kidsLeaderMemberId || undefined,
      isPrincipal: c.isPrincipal,
      country: c.country || '',
      zipCode: c.zipCode || '',
      street: c.street || '',
      streetNumber: c.streetNumber || '',
      neighborhood: c.neighborhood || '',
      city: c.city || '',
      complement: c.complement || '',
      state: c.state || '',
    });
    setShowEditModal(true);
  };

  const saveEditCongregacao = async () => {
    try {
      if (!editingId) throw new Error('Congregação inválida');
      await congregacoesService.updateCongregacao(editingId, editData);
      setShowEditModal(false);
      toast.success('Congregação atualizada com sucesso!');
      await load();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar congregação');
    }
  };

  const requestDeleteCongregacao = async (c: Congregacao) => {
    try {
      const allRedes = await redesService.getRedes();
      const children = (allRedes || []).filter((r: Rede) => r.congregacaoId === c.id);
      if (children.length > 0) {
        return toast.error('Não é possível apagar congregação com redes associadas');
      }
    } catch (err) {
      console.error(err);
      return toast.error('Erro ao verificar associações');
    }
    setConfirmTarget(c);
    setConfirmOpen(true);
  };

  const deleteCongregacaoConfirmed = async () => {
    if (!confirmTarget) return setConfirmOpen(false);
    try {
      await congregacoesService.deleteCongregacao(confirmTarget.id);
      toast.success('Congregação removida com sucesso!');
      setConfirmOpen(false);
      setConfirmTarget(null);
      await load();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao deletar congregação');
    }
  };

  const hasActiveFilters = !!(filterName || filterPastorId !== null || filterMyCongregations);

  const clearAllFilters = () => {
    setFilterName('');
    setFilterMyCongregations(false);
    setFilterPastorId(null);
  };

  // Configuração dos filtros para o modal
  const filterConfigs: FilterConfig[] = [
    {
      type: 'switch',
      label: '',
      value: filterMyCongregations,
      onChange: setFilterMyCongregations,
      switchLabelOff: 'Todas as congregações',
      switchLabelOn: 'Minhas congregações'
    },
    {
      type: 'select',
      label: 'Nome',
      value: filterName,
      onChange: setFilterName,
      renderCustom: () => (
        <ThemeProvider theme={muiTheme}>
          <TextField
            size="small"
            fullWidth
            placeholder="Buscar por nome"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            className="bg-gray-700"
          />
        </ThemeProvider>
      )
    },
    {
      type: 'select',
      label: 'Pastor',
      value: filterPastorId,
      onChange: setFilterPastorId,
      renderCustom: () => (
        <ThemeProvider theme={muiTheme}>
          <Autocomplete
            size="small"
            fullWidth
            options={users}
            getOptionLabel={(option) => option.name}
            value={users.find(u => u.id === filterPastorId) || null}
            onChange={(event, newValue) => setFilterPastorId(newValue?.id || null)}
            renderInput={(params) => (
              <TextField 
                {...params} 
                placeholder="Selecione um pastor"
                className="bg-gray-700" 
              />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.id}>
                <div>
                  <div className="text-sm font-medium">{option.name}</div>
                  <div className="text-xs text-gray-400">{option.email}</div>
                </div>
              </li>
            )}
          />
        </ThemeProvider>
      )
    }
  ];

  const muiTheme = createTheme({
    palette: {
      mode: 'dark',
    },
  });

  return (
    <>
      <ThemeProvider theme={muiTheme}>
        <div className="relative pb-20">
          <h1 className="text-3xl font-bold mb-6">Congregações</h1>

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <TextField
              size="small"
              placeholder="Buscar por nome"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              className="w-64 bg-gray-800"
            />
            <button
              onClick={() => setFilterModalOpen(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
                hasActiveFilters
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
              title="Filtros"
            >
              <FaFilter className="h-4 w-4" />
              <span>Filtros</span>
              {hasActiveFilters && (
                <span className="bg-white text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                  {[filterName, filterPastorId].filter(f => f !== null && f !== '').length + (filterMyCongregations ? 1 : 0)}
                </span>
              )}
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                title="Limpar filtros"
              >
                <FaFilterCircleXmark className="h-5 w-5" />
              </button>
            )}
          </div>

          {loading && <p>Carregando...</p>}

          <div>
            <h3 className="font-medium mb-2">Exibindo {congregacoes.length} congregações</h3>
            <div className="space-y-2">
              {congregacoes.map(c => {
          const isExpanded = !!expandedCongregacoes[c.id];
          const redes = congregacaoRedesMap[c.id] || [];
          
          return (
            <div key={c.id} className="border rounded p-2">
              <CollapsibleItem
                isOpen={isExpanded}
                onToggle={() => onToggleCongregacao(c)}
                onEdit={() => openEditCongregacao(c)}
                title={
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{c.name}</span>
                    {c.isPrincipal && (
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">Principal</span>
                    )}
                  </div>
                }
                subtitle={`Pastor: ${c.pastorGoverno?.name || 'Sem pastor'}`}
                right={
                  <button
                    onClick={(e) => { e.stopPropagation(); requestDeleteCongregacao(c); }}
                    className="text-red-600 hover:text-red-800 p-1"
                  >
                    <FiTrash2 />
                  </button>
                }
              >
              <div className="pl-4 space-y-2">
                {c.city && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FiMapPin />
                    <span>{c.city}, {c.state}</span>
                  </div>
                )}
                {c.vicePresidente && (
                  <div className="text-sm text-gray-600">
                    Vice Presidente: {c.vicePresidente.name}
                  </div>
                )}
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">Redes ({redes.length})</h3>
                  {redes.length === 0 ? (
                    <p className="text-gray-500 text-sm">Nenhuma rede cadastrada</p>
                  ) : (
                    <ul className="space-y-1">
                      {redes.map(r => (
                        <li key={r.id} className="text-sm">
                          • {r.name} {r.pastor && `- ${r.pastor.name}`}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              </CollapsibleItem>
            </div>
          );
        })}
            </div>
          </div>

        {/* Floating create button */}
        <button 
        aria-label="Criar congregação" 
        onClick={() => setShowCreateModal(true)} 
        className="fixed right-6 bottom-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg z-50"
      >
        <FiPlus size={24} />
      </button>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded w-11/12 max-w-4xl my-8 max-h-[90vh] flex flex-col">
            <div className="p-6 flex items-center justify-between border-b border-gray-700">
              <h3 className="text-xl font-semibold">Nova Congregação</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-300">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm mb-1">Nome *</label>
                <input
                  type="text"
                  value={createData.name}
                  onChange={(e) => setCreateData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border rounded px-3 py-2 bg-gray-800 text-white h-10"
                  placeholder="Nome da congregação"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Pastor de Governo *</label>
                <select
                  value={createData.pastorGovernoMemberId || ''}
                  onChange={(e) => setCreateData(prev => ({ ...prev, pastorGovernoMemberId: Number(e.target.value) }))}
                  className="w-full border rounded px-3 py-2 bg-gray-800 text-white h-10"
                >
                  <option value="">Selecione...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">Vice Presidente</label>
                <select
                  value={createData.vicePresidenteMemberId || ''}
                  onChange={(e) => setCreateData(prev => ({ ...prev, vicePresidenteMemberId: e.target.value ? Number(e.target.value) : undefined }))}
                  className="w-full border rounded px-3 py-2 bg-gray-800 text-white h-10"
                >
                  <option value="">Selecione...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">Responsável pela Rede Kids</label>
                <select
                  value={createData.kidsLeaderMemberId || ''}
                  onChange={(e) => setCreateData(prev => ({ ...prev, kidsLeaderMemberId: e.target.value ? Number(e.target.value) : undefined }))}
                  className="w-full border rounded px-3 py-2 bg-gray-800 text-white h-10"
                >
                  <option value="">Selecione...</option>
                  {kidsLeaders.map(k => (
                    <option key={k.id} value={k.id}>{k.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPrincipal"
                  checked={createData.isPrincipal || false}
                  onChange={(e) => setCreateData(prev => ({ ...prev, isPrincipal: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="isPrincipal" className="text-sm">
                  Congregação Principal da Cidade
                </label>
              </div>

              <div className="border-t border-gray-700 my-4"></div>
              <h4 className="text-md font-semibold mb-3">Endereço</h4>

              <div>
                <label className="block text-sm mb-1">CEP</label>
                <input
                  type="text"
                  value={createData.zipCode || ''}
                  onChange={(e) => setCreateData(prev => ({ ...prev, zipCode: e.target.value }))}
                  onBlur={(e) => searchAddress(e.target.value, false)}
                  className="w-full border rounded px-3 py-2 bg-gray-800 text-white h-10"
                  placeholder="00000-000"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-sm mb-1">Rua</label>
                  <input
                    type="text"
                    value={createData.street || ''}
                    onChange={(e) => setCreateData(prev => ({ ...prev, street: e.target.value }))}
                    className="w-full border rounded px-3 py-2 bg-gray-800 text-white h-10"
                    placeholder="Nome da rua"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Número</label>
                  <input
                    type="text"
                    value={createData.streetNumber || ''}
                    onChange={(e) => setCreateData(prev => ({ ...prev, streetNumber: e.target.value }))}
                    className="w-full border rounded px-3 py-2 bg-gray-800 text-white h-10"
                    placeholder="123"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1">Bairro</label>
                <input
                  type="text"
                  value={createData.neighborhood || ''}
                  onChange={(e) => setCreateData(prev => ({ ...prev, neighborhood: e.target.value }))}
                  className="w-full border rounded px-3 py-2 bg-gray-800 text-white h-10"
                  placeholder="Nome do bairro"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-sm mb-1">Cidade</label>
                  <input
                    type="text"
                    value={createData.city || ''}
                    onChange={(e) => setCreateData(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full border rounded px-3 py-2 bg-gray-800 text-white h-10"
                    placeholder="Nome da cidade"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Estado</label>
                  <input
                    type="text"
                    value={createData.state || ''}
                    onChange={(e) => setCreateData(prev => ({ ...prev, state: e.target.value }))}
                    className="w-full border rounded px-3 py-2 bg-gray-800 text-white h-10 uppercase"
                    placeholder="UF"
                    maxLength={2}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1">Complemento</label>
                <input
                  type="text"
                  value={createData.complement || ''}
                  onChange={(e) => setCreateData(prev => ({ ...prev, complement: e.target.value }))}
                  className="w-full border rounded px-3 py-2 bg-gray-800 text-white h-10"
                  placeholder="Apartamento, bloco, etc."
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 p-6 flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-3 border rounded hover:bg-gray-800 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={createCongregacao}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
              >
                Criar Congregação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded w-11/12 max-w-4xl my-8 max-h-[90vh] flex flex-col">
            <div className="p-6 flex items-center justify-between border-b border-gray-700">
              <h3 className="text-xl font-semibold">Editar Congregação</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-300">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm mb-1">Nome</label>
                <input
                  type="text"
                  value={editData.name || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border rounded px-3 py-2 bg-gray-800 text-white h-10"
                  placeholder="Nome da congregação"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Pastor de Governo</label>
                <select
                  value={editData.pastorGovernoMemberId || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, pastorGovernoMemberId: e.target.value ? Number(e.target.value) : undefined }))}
                  className="w-full border rounded px-3 py-2 bg-gray-800 text-white h-10"
                >
                  <option value="">Selecione...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">Vice Presidente</label>
                <select
                  value={editData.vicePresidenteMemberId || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, vicePresidenteMemberId: e.target.value ? Number(e.target.value) : undefined }))}
                  className="w-full border rounded px-3 py-2 bg-gray-800 text-white h-10"
                >
                  <option value="">Selecione...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">Responsável pela Rede Kids</label>
                <select
                  value={editData.kidsLeaderMemberId || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, kidsLeaderMemberId: e.target.value ? Number(e.target.value) : undefined }))}
                  className="w-full border rounded px-3 py-2 bg-gray-800 text-white h-10"
                >
                  <option value="">Selecione...</option>
                  {kidsLeaders.map(k => (
                    <option key={k.id} value={k.id}>{k.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editIsPrincipal"
                  checked={editData.isPrincipal || false}
                  onChange={(e) => setEditData(prev => ({ ...prev, isPrincipal: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="editIsPrincipal" className="text-sm">
                  Congregação Principal da Cidade
                </label>
              </div>

              <div className="border-t border-gray-700 my-4"></div>
              <h4 className="text-md font-semibold mb-3">Endereço</h4>

              <div>
                <label className="block text-sm mb-1">CEP</label>
                <input
                  type="text"
                  value={editData.zipCode || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, zipCode: e.target.value }))}
                  onBlur={(e) => searchAddress(e.target.value, true)}
                  className="w-full border rounded px-3 py-2 bg-gray-800 text-white h-10"
                  placeholder="00000-000"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-sm mb-1">Rua</label>
                  <input
                    type="text"
                    value={editData.street || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, street: e.target.value }))}
                    className="w-full border rounded px-3 py-2 bg-gray-800 text-white h-10"
                    placeholder="Nome da rua"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Número</label>
                  <input
                    type="text"
                    value={editData.streetNumber || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, streetNumber: e.target.value }))}
                    className="w-full border rounded px-3 py-2 bg-gray-800 text-white h-10"
                    placeholder="123"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1">Bairro</label>
                <input
                  type="text"
                  value={editData.neighborhood || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, neighborhood: e.target.value }))}
                  className="w-full border rounded px-3 py-2 bg-gray-800 text-white h-10"
                  placeholder="Nome do bairro"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-sm mb-1">Cidade</label>
                  <input
                    type="text"
                    value={editData.city || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full border rounded px-3 py-2 bg-gray-800 text-white h-10"
                    placeholder="Nome da cidade"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Estado</label>
                  <input
                    type="text"
                    value={editData.state || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, state: e.target.value }))}
                    className="w-full border rounded px-3 py-2 bg-gray-800 text-white h-10 uppercase"
                    placeholder="UF"
                    maxLength={2}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1">Complemento</label>
                <input
                  type="text"
                  value={editData.complement || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, complement: e.target.value }))}
                  className="w-full border rounded px-3 py-2 bg-gray-800 text-white h-10"
                  placeholder="Apartamento, bloco, etc."
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 p-6 flex gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-3 border rounded hover:bg-gray-800 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={saveEditCongregacao}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Confirm Delete Modal */}
        <ModalConfirm
          open={confirmOpen}
          title="Confirmar Exclusão"
          message={`Tem certeza que deseja excluir a congregação "${confirmTarget?.name}"?`}
          onConfirm={deleteCongregacaoConfirmed}
          onCancel={() => { setConfirmOpen(false); setConfirmTarget(null); }}
        />

        {/* Filter Modal */}
        <FilterModal
          isOpen={filterModalOpen}
          onClose={() => setFilterModalOpen(false)}
          filters={filterConfigs}
          onApply={() => setFilterModalOpen(false)}
          onClear={clearAllFilters}
          hasActiveFilters={hasActiveFilters}
        />
        </div>
      </ThemeProvider>
    </>
  );
}
