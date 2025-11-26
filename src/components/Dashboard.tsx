"use client";

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const lineData = [
  { month: 'Jan', value: 1200 },
  { month: 'Feb', value: 2100 },
  { month: 'Mar', value: 800 },
  { month: 'Apr', value: 1600 },
  { month: 'May', value: 900 },
  { month: 'Jun', value: 2400 },
];

const pieData = [
  { name: 'Alimentação', value: 400 },
  { name: 'Transporte', value: 300 },
  { name: 'Lazer', value: 300 },
  { name: 'Outros', value: 200 },
];

const COLORS = ['#4f46e5', '#06b6d4', '#f59e0b', '#ef4444'];

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Painel</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="col-span-2 bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <h2 className="text-lg font-semibold mb-2">Receita / Despesa (últimos meses)</h2>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <h2 className="text-lg font-semibold mb-2">Distribuição por categoria</h2>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={80} fill="#8884d8">
                  {pieData.map((entry, index) => (
                    <Cell key={`celula-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <div className="text-sm text-gray-500">Saldo atual</div>
          <div className="text-2xl font-bold">R$ 12.345,67</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <div className="text-sm text-gray-500">Membros ativos</div>
          <div className="text-2xl font-bold">42</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <div className="text-sm text-gray-500">Células</div>
          <div className="text-2xl font-bold">8</div>
        </div>
      </div>
    </div>
  );
}
