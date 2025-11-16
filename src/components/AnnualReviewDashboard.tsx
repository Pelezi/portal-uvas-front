'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { categoryService } from '@/services/categoryService';
import { subcategoryService } from '@/services/subcategoryService';
import { transactionService } from '@/services/transactionService';
import { useAppStore } from '@/lib/store';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  TooltipProps,
} from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { TrendingUp, TrendingDown, DollarSign, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

interface AnnualReviewDashboardProps {
  groupId?: number;
  canView?: boolean;
  title?: string;
}

type AggTx = {
  subcategoryId: number;
  total: number;
  count: number;
  month: number;
  year: number;
  type: 'INCOME' | 'EXPENSE';
};

const fmtBRL = (n: number | null | undefined) =>
  n == null ? 'N/A' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Tooltip customizado para o gráfico de tendências mensais
const CustomTrendsTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: any;
  label?: React.ReactNode;
}) => {
  if (!active || !payload || payload.length === 0) return null;

  // Reorder to a predictable sequence: income, expense, net
  const order = ['income', 'expense', 'net'];
  const items = [...payload].sort(
    (a, b) => order.indexOf(String(a.dataKey)) - order.indexOf(String(b.dataKey))
  );

  const Dot = ({ color }: { color: string }) => (
    <span
      style={{
        display: 'inline-block',
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: color,
        marginRight: 8,
        transform: 'translateY(1px)',
      }}
    />
  );

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.98)',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        padding: '12px 14px',
        color: '#111827',
        minWidth: 220,
        fontSize: 13,
        zIndex: 10,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 8 }}>{label}</div>

      {items.map((it) => (
        <div key={String(it.dataKey)} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Dot color={it.color || '#6b7280'} />
            <span style={{ fontWeight: 500 }}>{it.name}</span>
          </div>
          <span>{fmtBRL(Number(it.value))}</span>
        </div>
      ))}
    </div>
  );
};

export default function AnnualReviewDashboard({
  groupId,
  canView = true,
  title = 'Resumo Anual',
}: AnnualReviewDashboardProps) {
  const { selectedYear, setSelectedYear } = useAppStore();

  // Queries
  const { data: categories = [] } = useQuery({
    queryKey: ['categories', groupId],
    queryFn: () => categoryService.getAll(groupId),
    enabled: canView,
  });

  const { data: subcategories = [] } = useQuery({
    queryKey: ['subcategories', groupId],
    queryFn: () => subcategoryService.getAll(groupId),
    enabled: canView,
  });

  const { data: aggregatedTransactions = [] } = useQuery<AggTx[]>({
    queryKey: ['transactions-aggregated', selectedYear, groupId],
    queryFn: async (): Promise<AggTx[]> => {
      const res = await transactionService.getAggregated(selectedYear, undefined, groupId);
      return (res || [])
        .filter((t: any) => t.type === 'INCOME' || t.type === 'EXPENSE')
        .map((t: any) => ({
          subcategoryId: t.subcategoryId,
          total: t.total ?? 0,
          count: t.count ?? 0,
          month: t.month,
          year: t.year,
          type: t.type as 'INCOME' | 'EXPENSE',
        }));
    },
    enabled: canView,
  });

  // Permission check
  if (!canView) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200">
            Você não tem permissão para visualizar o resumo anual{groupId ? ' deste grupo' : ''}.
          </p>
        </div>
      </div>
    );
  }

  const monthNames = useMemo(
    () => [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro',
    ],
    []
  );

  const monthlyTrends = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const income = aggregatedTransactions
        .filter((t) => t.month === month && t.type === 'INCOME')
        .reduce((s, t) => s + (t.total ?? 0), 0);

      const expense = aggregatedTransactions
        .filter((t) => t.month === month && t.type === 'EXPENSE')
        .reduce((s, t) => s + (t.total ?? 0), 0);

      return {
        month: monthNames[i],
        income,
        expense,
        net: income - expense,
      };
    });
  }, [aggregatedTransactions, monthNames]);

  const totalIncome = useMemo(
    () => monthlyTrends.reduce((sum, m) => sum + (m.income || 0), 0),
    [monthlyTrends]
  );
  const totalExpenses = useMemo(
    () => monthlyTrends.reduce((sum, m) => sum + (m.expense || 0), 0),
    [monthlyTrends]
  );
  const netSavings = useMemo(() => totalIncome - totalExpenses, [totalIncome, totalExpenses]);

  const expensesByCategory = useMemo(() => {
    return categories
      .filter((cat: any) => cat.type === 'EXPENSE')
      .map((cat: any) => {
        const categorySubs = subcategories.filter((sub: any) => sub.categoryId === cat.id);
        const total = categorySubs.reduce((sum: number, sub: any) => {
          const subTotal = aggregatedTransactions
            .filter((t) => t.subcategoryId === sub.id && t.type === 'EXPENSE')
            .reduce((s, t) => s + t.total, 0);
          return sum + subTotal;
        }, 0);
        return { name: cat.name, value: total };
      })
      .filter((cat: any) => cat.value > 0)
      .sort((a: any, b: any) => b.value - a.value);
  }, [categories, subcategories, aggregatedTransactions]);

  // Hover state to sync highlight between pie slices and legend items
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const totalByCategory = useMemo(() => {
    return expensesByCategory.reduce((s: number, c: any) => s + (c.value || 0), 0);
  }, [expensesByCategory]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>

        {/* Year Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedYear(selectedYear - 1)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-900 dark:text-gray-100"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100">
            <Calendar size={20} />
            <span className="font-medium">{selectedYear}</span>
          </div>
          <button
            onClick={() => setSelectedYear(selectedYear + 1)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-900 dark:text-gray-100"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Renda Total</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {fmtBRL(totalIncome)}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
              <TrendingUp className="text-green-600 dark:text-green-400" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Despesas Totais</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {fmtBRL(totalExpenses)}
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
              <TrendingDown className="text-red-600 dark:text-red-400" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Economia Líquida</p>
              <p
                className={`text-2xl font-bold mt-1 ${
                  netSavings >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {fmtBRL(netSavings)}
              </p>
            </div>
            <div
              className={`p-3 rounded-full ${
                netSavings >= 0 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-red-100 dark:bg-red-900/30'
              }`}
            >
              <DollarSign
                className={netSavings >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}
                size={24}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Gastos Mensais (Transações)
          </h2>
          <ResponsiveContainer width="100%" height={500}>
            <LineChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
              />
              <Tooltip content={CustomTrendsTooltip} />
              <Legend />
              <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} name="Renda" dot={false} />
              <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} name="Despesa" dot={false} />
              <Line type="monotone" dataKey="net" stroke="#3b82f6" strokeWidth={2} name="Líquido Mensal" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Distribuição por Categoria</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expensesByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  // Remove label to avoid cutoff
                  outerRadius={100}
                  dataKey="value"
                >
                  {expensesByCategory.map((entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      fillOpacity={hoveredIndex === null || hoveredIndex === index ? 1 : 0.35}
                      stroke={hoveredIndex === index ? '#000000' : undefined}
                      strokeWidth={hoveredIndex === index ? 2 : 0}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, _name: string, props: any) => [
                    fmtBRL(value),
                    `${props?.payload?.name ?? 'Categoria'}`,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Custom legend below the chart with percentages and hover sync */}
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {expensesByCategory.map((cat: any, idx: number) => {
                const percent = totalByCategory > 0 ? (cat.value / totalByCategory) * 100 : 0;
                return (
                  <div
                    key={cat.name}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className={`flex items-center gap-2 text-sm px-3 py-1 rounded transition-all duration-150 cursor-pointer ${
                      hoveredIndex === idx
                        ? 'ring-2 ring-offset-1 ring-blue-400 dark:ring-blue-600 bg-gray-200 dark:bg-gray-600'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: COLORS[idx % COLORS.length],
                      }}
                    />
                    <span className="font-medium">{cat.name}</span>
                    <span className="text-gray-600 dark:text-gray-300">{`${percent.toFixed(0)}%`}</span>
                  </div>
                );
              })}
            </div>
        </div>
      </div>
    </div>
  );
}