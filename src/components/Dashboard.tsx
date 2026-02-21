"use client";

import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { memberService } from '@/services/memberService';
import { redesService } from '@/services/redesService';
import { congregacoesService } from '@/services/congregacoesService';
import { discipuladosService } from '@/services/discipuladosService';
import { celulasService } from '@/services/celulasService';
import { useAuth } from '@/contexts/AuthContext';
import { Users, UserX, Filter } from 'lucide-react';
import { Rede, Discipulado, Celula, Congregacao } from '@/types';

const COLORS = ['#4f46e5', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6'];

interface Statistics {
  total: number;
  withoutCelula: number;
  gender: { male: number; female: number; other: number; notInformed: number };
  maritalStatus: { single: number; married: number; cohabitating: number; divorced: number; widowed: number; notInformed: number };
  ageRanges: { '0-17': number; '18-25': number; '26-35': number; '36-50': number; '51-65': number; '65+': number; notInformed: number };
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Estados para filtros
  const [selectedCongregacaoId, setSelectedCongregacaoId] = useState<number | undefined>(undefined);
  const [selectedRedeId, setSelectedRedeId] = useState<number | undefined>(undefined);
  const [selectedDiscipuladoId, setSelectedDiscipuladoId] = useState<number | undefined>(undefined);
  const [selectedCelulaId, setSelectedCelulaId] = useState<number | undefined>(undefined);
  
  // Estados para opções de filtros
  const [congregacoes, setCongregacoes] = useState<Congregacao[]>([]);
  const [redes, setRedes] = useState<Rede[]>([]);
  const [discipulados, setDiscipulados] = useState<Discipulado[]>([]);
  const [celulas, setCelulas] = useState<Celula[]>([]);
  
  // Permissões
  const isPastor = user?.permission?.pastor || user?.permission?.isAdmin;
  const isDiscipulador = user?.permission?.discipulador;
  const isLeader = user?.permission?.leader;

  // Buscar opções de filtros
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        if (isPastor) {
          // Pastores podem ver todas as congregações e redes
          const [congregacoesData, redesData] = await Promise.all([
            congregacoesService.getCongregacoes(),
            redesService.getRedes()
          ]);
          setCongregacoes(congregacoesData);
          setRedes(redesData);
        }
        
        if (isPastor || isDiscipulador) {
          // Pastores e discipuladores podem ver todos os discipulados
          const discipuladosData = await discipuladosService.getDiscipulados();
          setDiscipulados(discipuladosData);
        }
        
        if (isPastor || isDiscipulador || isLeader) {
          // Todos podem ver as células
          const celulasData = await celulasService.getCelulas();
          setCelulas(celulasData);
        }
      } catch (error) {
        console.error('Erro ao carregar opções de filtros:', error);
      }
    };

    fetchFilterOptions();
  }, [isPastor, isDiscipulador, isLeader]);

  // Definir filtros padrão baseado em permissões
  useEffect(() => {
    if (!user?.permission) return;
    
    // Se for líder (e não pastor/discipulador), mostrar apenas sua célula
    if (isLeader && !isPastor && !isDiscipulador) {
      const userCelulaIds = user.permission.celulaIds;
      if (userCelulaIds && userCelulaIds.length > 0) {
        setSelectedCelulaId(userCelulaIds[0]);
      }
    }
    
    // Se for discipulador (e não pastor), filtrar por seu discipulado
    // Buscar o discipulado onde ele é o discipulador
    if (isDiscipulador && !isPastor) {
      const userDiscipulado = discipulados.find(d => d.discipuladorMemberId === user.id);
      if (userDiscipulado) {
        setSelectedDiscipuladoId(userDiscipulado.id);
      }
    }
  }, [user, isPastor, isDiscipulador, isLeader, discipulados]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // Construir filtros baseado em seleções
        const filters: { celulaId?: number; discipuladoId?: number; redeId?: number; congregacaoId?: number } = {};
        
        if (selectedCelulaId !== undefined) {
          filters.celulaId = selectedCelulaId;
        } else if (selectedDiscipuladoId !== undefined) {
          filters.discipuladoId = selectedDiscipuladoId;
        } else if (selectedRedeId !== undefined) {
          filters.redeId = selectedRedeId;
        } else if (selectedCongregacaoId !== undefined) {
          filters.congregacaoId = selectedCongregacaoId;
        }
        
        const data = await memberService.getStatistics(filters);
        setStats(data);
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [selectedCongregacaoId, selectedRedeId, selectedDiscipuladoId, selectedCelulaId, redes]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando estatísticas...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-red-500">Erro ao carregar estatísticas</div>
      </div>
    );
  }

  // Prepare data for charts
  const genderData = [
    { name: 'Masculino', value: stats.gender.male },
    { name: 'Feminino', value: stats.gender.female },
    { name: 'Outro', value: stats.gender.other },
    { name: 'Não informado', value: stats.gender.notInformed },
  ].filter(item => item.value > 0);

  const maritalStatusData = [
    { name: 'Solteiro', value: stats.maritalStatus.single },
    { name: 'Casado', value: stats.maritalStatus.married },
    { name: 'União estável', value: stats.maritalStatus.cohabitating },
    { name: 'Divorciado', value: stats.maritalStatus.divorced },
    { name: 'Viúvo', value: stats.maritalStatus.widowed },
    { name: 'Não informado', value: stats.maritalStatus.notInformed },
  ].filter(item => item.value > 0);

  const ageRangeData = [
    { name: '0-17', value: stats.ageRanges['0-17'] },
    { name: '18-25', value: stats.ageRanges['18-25'] },
    { name: '26-35', value: stats.ageRanges['26-35'] },
    { name: '36-50', value: stats.ageRanges['36-50'] },
    { name: '51-65', value: stats.ageRanges['51-65'] },
    { name: '65+', value: stats.ageRanges['65+'] },
    { name: 'Não informado', value: stats.ageRanges.notInformed },
  ].filter(item => item.value > 0);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>

      {/* Filtros */}
      <div className="bg-gray-800 rounded-lg p-4 shadow">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={20} className="text-gray-400" />
          <h2 className="text-lg font-semibold text-white">Filtros</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Filtro de Congregação - apenas para pastores */}
          {isPastor && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Congregação
              </label>
              <select
                value={selectedCongregacaoId || ''}
                onChange={(e) => {
                  setSelectedCongregacaoId(e.target.value ? Number(e.target.value) : undefined);
                  setSelectedRedeId(undefined);
                  setSelectedDiscipuladoId(undefined);
                  setSelectedCelulaId(undefined);
                }}
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white"
                disabled={!isPastor}
              >
                <option value="">Todas as congregações</option>
                {congregacoes.map((congregacao) => (
                  <option key={congregacao.id} value={congregacao.id}>
                    {congregacao.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro de Rede - apenas para pastores */}
          {isPastor && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Rede
              </label>
              <select
                value={selectedRedeId || ''}
                onChange={(e) => {
                  const redeId = e.target.value ? Number(e.target.value) : undefined;
                  setSelectedRedeId(redeId);
                  setSelectedDiscipuladoId(undefined);
                  setSelectedCelulaId(undefined);
                  
                  // Auto-preencher congregação
                  if (redeId) {
                    const rede = redes.find(r => r.id === redeId);
                    if (rede?.congregacaoId) {
                      setSelectedCongregacaoId(rede.congregacaoId);
                    }
                  }
                }}
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white"
                disabled={!isPastor}
              >
                <option value="">Todas as redes</option>
                {redes.filter(rede => !selectedCongregacaoId || rede.congregacaoId === selectedCongregacaoId).map((rede) => (
                  <option key={rede.id} value={rede.id}>
                    {rede.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro de Discipulado - para pastores e discipuladores */}
          {(isPastor || isDiscipulador) && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Discipulado
              </label>
              <select
                value={selectedDiscipuladoId || ''}
                onChange={(e) => {
                  const discipuladoId = e.target.value ? Number(e.target.value) : undefined;
                  setSelectedDiscipuladoId(discipuladoId);
                  setSelectedCelulaId(undefined);
                  
                  // Auto-preencher rede e congregação
                  if (discipuladoId) {
                    const discipulado = discipulados.find(d => d.id === discipuladoId);
                    if (discipulado?.redeId) {
                      setSelectedRedeId(discipulado.redeId);
                      const rede = redes.find(r => r.id === discipulado.redeId);
                      if (rede?.congregacaoId) {
                        setSelectedCongregacaoId(rede.congregacaoId);
                      }
                    }
                  }
                }}
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white"
                disabled={!isPastor && !isDiscipulador}
              >
                <option value="">Todos os discipulados</option>
                {discipulados
                  .filter(d => !selectedRedeId || d.redeId === selectedRedeId)
                  .map((discipulado) => (
                    <option key={discipulado.id} value={discipulado.id}>
                      {discipulado.discipulador ? discipulado.discipulador.name : `Discipulado ${discipulado.id} `}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Filtro de Célula - para todos */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Célula
            </label>
            <select
              value={selectedCelulaId || ''}
              onChange={(e) => {
                const celulaId = e.target.value ? Number(e.target.value) : undefined;
                setSelectedCelulaId(celulaId);
                
                // Auto-preencher discipulado, rede e congregação
                if (celulaId) {
                  const celula = celulas.find(c => c.id === celulaId);
                  if (celula?.discipuladoId) {
                    setSelectedDiscipuladoId(celula.discipuladoId);
                    const discipulado = discipulados.find(d => d.id === celula.discipuladoId);
                    if (discipulado?.redeId) {
                      setSelectedRedeId(discipulado.redeId);
                      const rede = redes.find(r => r.id === discipulado.redeId);
                      if (rede?.congregacaoId) {
                        setSelectedCongregacaoId(rede.congregacaoId);
                      }
                    }
                  }
                }
              }}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white"
              disabled={isLeader && !isPastor && !isDiscipulador}
            >
              <option value="">Todas as células</option>
              {celulas
                .filter(c => {
                  if (selectedDiscipuladoId) return c.discipuladoId === selectedDiscipuladoId;
                  if (selectedRedeId) {
                    const discipulado = discipulados.find(d => d.id === c.discipuladoId);
                    return discipulado?.redeId === selectedRedeId;
                  }
                  // Líderes só podem ver suas células
                  if (isLeader && !isPastor && !isDiscipulador) {
                    return user?.permission?.celulaIds?.includes(c.id);
                  }
                  return true;
                })
                .map((celula) => (
                  <option key={celula.id} value={celula.id}>
                    {celula.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-400">Total de Membros</div>
              <div className="text-3xl font-bold text-white mt-2">{stats.total}</div>
            </div>
            <div className="p-3 bg-blue-900 rounded-full">
              <Users className="text-blue-300" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-400">Sem Célula</div>
              <div className="text-3xl font-bold text-white mt-2">{stats.withoutCelula}</div>
            </div>
            <div className="p-3 bg-red-900 rounded-full">
              <UserX className="text-red-300" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-400">Com Célula</div>
              <div className="text-3xl font-bold text-white mt-2">{stats.total - stats.withoutCelula}</div>
            </div>
            <div className="p-3 bg-green-900 rounded-full">
              <Users className="text-green-300" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gender Chart */}
        <div className="bg-gray-800 rounded-lg p-6 shadow">
          <h2 className="text-lg font-semibold mb-4 text-white">Distribuição por Gênero</h2>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie 
                  data={genderData} 
                  dataKey="value" 
                  nameKey="name" 
                  cx="50%" 
                  cy="50%" 
                  outerRadius={100} 
                  label
                >
                  {genderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Marital Status Chart */}
        <div className="bg-gray-800 rounded-lg p-6 shadow">
          <h2 className="text-lg font-semibold mb-4 text-white">Estado Civil</h2>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie 
                  data={maritalStatusData} 
                  dataKey="value" 
                  nameKey="name" 
                  cx="50%" 
                  cy="50%" 
                  outerRadius={100} 
                  label
                >
                  {maritalStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Age Range Chart */}
      <div className="bg-gray-800 rounded-lg p-6 shadow">
        <h2 className="text-lg font-semibold mb-4 text-white">Distribuição por Faixa Etária</h2>
        <div style={{ width: '100%', height: 350 }}>
          <ResponsiveContainer>
            <BarChart data={ageRangeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#4f46e5" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
