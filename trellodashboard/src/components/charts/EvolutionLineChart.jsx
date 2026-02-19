/**
 * EVOLUTION LINE CHART
 * 
 * Gráfico de linhas mostrando evolução temporal de processos.
 * Exibe duas séries: Processos Novos e Processos Concluídos.
 * 
 * Baseado na documentação oficial do Recharts:
 * https://recharts.org/en-US/api/LineChart
 */

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

/**
 * Componente de Gráfico de Evolução
 * 
 * @param {Object} props
 * @param {Array} props.data - Array de objetos com formato: [{ date: '01/02', novos: 5, concluidos: 2 }]
 * @param {number} props.height - Altura do gráfico (default: 300)
 * @param {boolean} props.dark - Tema escuro (default: false)
 */
export default function EvolutionLineChart({ data, height = 300, dark = false }) {
  // Cores baseadas no tema
  const colors = {
    novos: dark ? '#60a5fa' : '#3b82f6',      // blue-400 / blue-600
    concluidos: dark ? '#34d399' : '#10b981',  // green-400 / green-600
    grid: dark ? '#374151' : '#e5e7eb',        // gray-700 / gray-200
    text: dark ? '#9ca3af' : '#6b7280'         // gray-400 / gray-500
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
        <XAxis 
          dataKey="date" 
          stroke={colors.text}
          style={{ fontSize: '12px' }}
        />
        <YAxis 
          stroke={colors.text}
          style={{ fontSize: '12px' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: dark ? '#1f2937' : '#ffffff',
            border: `1px solid ${colors.grid}`,
            borderRadius: '6px',
            color: dark ? '#f3f4f6' : '#111827'
          }}
        />
        <Legend
          wrapperStyle={{
            paddingTop: '10px',
            fontSize: '14px'
          }}
        />
        <Line
          type="monotone"
          dataKey="novos"
          name="Processos Novos"
          stroke={colors.novos}
          strokeWidth={2}
          dot={{ fill: colors.novos, r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="concluidos"
          name="Processos Concluídos"
          stroke={colors.concluidos}
          strokeWidth={2}
          dot={{ fill: colors.concluidos, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
