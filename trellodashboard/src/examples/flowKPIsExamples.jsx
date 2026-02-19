/**
 * EXEMPLOS DE USO - FLOW KPIs
 * 
 * Demonstra como usar as funções de cálculo de KPIs de vazão
 */

import React from 'react';
import {
  calculateNewProcesses,
  calculateCompletedProcesses,
  calculateInProgressProcesses,
  calculateAvgNewPerDay,
  calculateAvgCompletedPerDay,
  calculateAvgProcessTime,
  calculateAllFlowKPIs,
  calculateDetailedFlowKPIs,
  validateKPIs,
  compareFlowKPIs
} from '../utils/flowKPIs';
import { usePeriodFilter } from '../hooks/usePeriodFilter';
import useTrello from '../hooks/useTrello';

// ============================================================================
// EXEMPLO 1: KPIs Básicos Individuais
// ============================================================================
export function BasicKPIs() {
  const { normalizedData } = useTrello('SEU_BOARD_ID');
  const { periodRange } = usePeriodFilter();

  if (!normalizedData || !periodRange) return <div>Carregando...</div>;

  const totalNew = calculateNewProcesses(
    normalizedData.cards,
    periodRange.startDate,
    periodRange.endDate
  );

  const totalCompleted = calculateCompletedProcesses(
    normalizedData.cards,
    periodRange.startDate,
    periodRange.endDate
  );

  const totalInProgress = calculateInProgressProcesses(
    normalizedData.cards,
    periodRange.startDate,
    periodRange.endDate
  );

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="p-4 bg-blue-50 rounded">
        <div className="text-3xl font-bold text-blue-600">{totalNew}</div>
        <div className="text-sm text-blue-800">Novos Processos</div>
      </div>
      <div className="p-4 bg-green-50 rounded">
        <div className="text-3xl font-bold text-green-600">{totalCompleted}</div>
        <div className="text-sm text-green-800">Concluídos</div>
      </div>
      <div className="p-4 bg-yellow-50 rounded">
        <div className="text-3xl font-bold text-yellow-600">{totalInProgress}</div>
        <div className="text-sm text-yellow-800">Em Andamento</div>
      </div>
    </div>
  );
}

// ============================================================================
// EXEMPLO 2: Médias Diárias
// ============================================================================
export function DailyAverages() {
  const { normalizedData } = useTrello('SEU_BOARD_ID');
  const { periodRange } = usePeriodFilter();

  if (!normalizedData || !periodRange) return <div>Carregando...</div>;

  const avgNew = calculateAvgNewPerDay(
    normalizedData.cards,
    periodRange.startDate,
    periodRange.endDate
  );

  const avgCompleted = calculateAvgCompletedPerDay(
    normalizedData.cards,
    periodRange.startDate,
    periodRange.endDate
  );

  const avgTime = calculateAvgProcessTime(
    normalizedData.cards,
    periodRange.startDate,
    periodRange.endDate
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Médias do Período</h2>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Novos por dia</span>
          <span className="text-2xl font-bold text-blue-600">{avgNew}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Concluídos por dia</span>
          <span className="text-2xl font-bold text-green-600">{avgCompleted}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Tempo médio (dias)</span>
          <span className="text-2xl font-bold text-gray-700">{avgTime}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EXEMPLO 3: Todos os KPIs de Uma Vez
// ============================================================================
export function AllKPIsPanel() {
  const { normalizedData } = useTrello('SEU_BOARD_ID');
  const { periodRange } = usePeriodFilter();

  if (!normalizedData || !periodRange) return <div>Carregando...</div>;

  const kpis = calculateAllFlowKPIs(
    normalizedData.cards,
    periodRange.startDate,
    periodRange.endDate
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">KPIs de Vazão</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="border-l-4 border-blue-500 pl-4">
          <div className="text-2xl font-bold">{kpis.totalNew}</div>
          <div className="text-sm text-gray-600">Total de Novos</div>
          <div className="text-xs text-gray-500">{kpis.avgNewPerDay}/dia</div>
        </div>
        
        <div className="border-l-4 border-green-500 pl-4">
          <div className="text-2xl font-bold">{kpis.totalCompleted}</div>
          <div className="text-sm text-gray-600">Total Concluídos</div>
          <div className="text-xs text-gray-500">{kpis.avgCompletedPerDay}/dia</div>
        </div>
        
        <div className="border-l-4 border-yellow-500 pl-4">
          <div className="text-2xl font-bold">{kpis.totalInProgress}</div>
          <div className="text-sm text-gray-600">Em Andamento</div>
        </div>
        
        <div className="border-l-4 border-purple-500 pl-4">
          <div className="text-2xl font-bold">{kpis.avgProcessTime}</div>
          <div className="text-sm text-gray-600">Tempo Médio</div>
          <div className="text-xs text-gray-500">dias</div>
        </div>
        
        <div className="border-l-4 border-gray-500 pl-4">
          <div className="text-2xl font-bold">{kpis.periodDays}</div>
          <div className="text-sm text-gray-600">Dias do Período</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EXEMPLO 4: KPIs Detalhados com Métricas Avançadas
// ============================================================================
export function DetailedKPIsPanel() {
  const { normalizedData } = useTrello('SEU_BOARD_ID');
  const { periodRange } = usePeriodFilter();

  if (!normalizedData || !periodRange) return <div>Carregando...</div>;

  const kpis = calculateDetailedFlowKPIs(
    normalizedData.cards,
    periodRange.startDate,
    periodRange.endDate
  );

  const getThroughputColor = (status) => {
    const colors = {
      'Excelente': 'text-green-600',
      'Bom': 'text-blue-600',
      'Equilibrado': 'text-gray-600',
      'Atenção': 'text-orange-600',  
      'Crítico': 'text-red-600'
    };
    return colors[status] || 'text-gray-600';
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">KPIs Detalhados</h2>
      
      {/* KPIs Básicos */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 bg-blue-50 rounded">
          <div className="text-3xl font-bold text-blue-600">{kpis.totalNew}</div>
          <div className="text-sm text-blue-800">Novos</div>
        </div>
        <div className="text-center p-4 bg-green-50 rounded">
          <div className="text-3xl font-bold text-green-600">{kpis.totalCompleted}</div>
          <div className="text-sm text-green-800">Concluídos</div>
        </div>
        <div className="text-center p-4 bg-yellow-50 rounded">
          <div className="text-3xl font-bold text-yellow-600">{kpis.totalInProgress}</div>
          <div className="text-sm text-yellow-800">Em Andamento</div>
        </div>
      </div>

      {/* Throughput */}
      <div className="mb-6 p-4 bg-gray-50 rounded">
        <h3 className="text-sm font-bold text-gray-700 mb-2">Throughput</h3>
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold">{kpis.throughput.rate}%</span>
          <span className={`text-sm font-medium ${getThroughputColor(kpis.throughput.status)}`}>
            {kpis.throughput.status}
          </span>
          <span className="text-sm text-gray-500">
            (Balance: {kpis.throughput.balance > 0 ? '+' : ''}{kpis.throughput.balance})
          </span>
        </div>
      </div>

      {/* Velocity */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-gray-700 mb-2">Velocity</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-600">Intake</div>
            <div className="text-xl font-bold text-blue-600">{kpis.velocity.intake}/dia</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Output</div>
            <div className="text-xl font-bold text-green-600">{kpis.velocity.output}/dia</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Net Flow</div>
            <div className={`text-xl font-bold ${
              kpis.velocity.netFlow >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {kpis.velocity.netFlow > 0 ? '+' : ''}{kpis.velocity.netFlow}/dia
            </div>
          </div>
        </div>
      </div>

      {/* WIP */}
      <div className="p-4 bg-yellow-50 rounded">
        <h3 className="text-sm font-bold text-yellow-800 mb-2">Work in Progress</h3>
        <div className="flex justify-between items-center">
          <span className="text-2xl font-bold text-yellow-600">{kpis.wip.current}</span>
          <span className="text-sm text-yellow-700">
            Ratio WIP/Throughput: {kpis.wip.throughputRatio}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EXEMPLO 5: Validação de KPIs
// ============================================================================
export function KPIsValidation() {
  const { normalizedData } = useTrello('SEU_BOARD_ID');
  const { periodRange } = usePeriodFilter();

  if (!normalizedData || !periodRange) return <div>Carregando...</div>;

  const kpis = calculateAllFlowKPIs(
    normalizedData.cards,
    periodRange.startDate,
    periodRange.endDate
  );

  const validation = validateKPIs(kpis);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Validação de KPIs</h2>
      
      {validation.isValid ? (
        <div className="p-4 bg-green-50 border border-green-200 rounded">
          <div className="flex items-center gap-2">
            <span className="text-green-600 text-2xl">✓</span>
            <span className="text-green-800 font-medium">Todos os KPIs são válidos</span>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-red-600 text-2xl">✗</span>
            <span className="text-red-800 font-medium">Erros encontrados:</span>
          </div>
          <ul className="list-disc list-inside space-y-1">
            {validation.errors.map((error, index) => (
              <li key={index} className="text-sm text-red-700">{error}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Debug: Mostrar KPIs */}
      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-gray-600">Ver KPIs calculados</summary>
        <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-auto">
          {JSON.stringify(kpis, null, 2)}
        </pre>
      </details>
    </div>
  );
}

// ============================================================================
// EXEMPLO 6: Comparação Entre Períodos
// ============================================================================
export function PeriodComparison() {
  const { normalizedData } = useTrello('SEU_BOARD_ID');

  if (!normalizedData) return <div>Carregando...</div>;

  // Exemplo: Comparar último mês com mês anterior
  const today = new Date();
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const previousMonthEnd = new Date(today.getFullYear(), today.getMonth() - 1, 0);
  const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 2, 1);

  const comparison = compareFlowKPIs(
    normalizedData.cards,
    previousMonthStart,
    previousMonthEnd,
    lastMonthStart,
    lastMonthEnd
  );

  const renderChange = (change) => {
    const isPositive = change.absolute > 0;
    const isNegative = change.absolute < 0;
    const color = isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-600';
    const arrow = isPositive ? '↑' : isNegative ? '↓' : '→';
    
    return (
      <div className={`${color} text-sm font-medium`}>
        {arrow} {Math.abs(change.absolute)} ({change.percentage > 0 ? '+' : ''}{change.percentage}%)
      </div>
    );
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Comparação de Períodos</h2>
      
      <div className="space-y-4">
        {/* Novos */}
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
          <div>
            <div className="font-medium">Novos Processos</div>
            <div className="text-xs text-gray-500">
              {comparison.period1.kpis.totalNew} → {comparison.period2.kpis.totalNew}
            </div>
          </div>
          {renderChange(comparison.changes.totalNew)}
        </div>

        {/* Concluídos */}
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
          <div>
            <div className="font-medium">Concluídos</div>
            <div className="text-xs text-gray-500">
              {comparison.period1.kpis.totalCompleted} → {comparison.period2.kpis.totalCompleted}
            </div>
          </div>
          {renderChange(comparison.changes.totalCompleted)}
        </div>

        {/* Em Andamento */}
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
          <div>
            <div className="font-medium">Em Andamento</div>
            <div className="text-xs text-gray-500">
              {comparison.period1.kpis.totalInProgress} → {comparison.period2.kpis.totalInProgress}
            </div>
          </div>
          {renderChange(comparison.changes.totalInProgress)}
        </div>

        {/* Média Novos/Dia */}
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
          <div>
            <div className="font-medium">Média Novos/Dia</div>
            <div className="text-xs text-gray-500">
              {comparison.period1.kpis.avgNewPerDay} → {comparison.period2.kpis.avgNewPerDay}
            </div>
          </div>
          {renderChange(comparison.changes.avgNewPerDay)}
        </div>

        {/* Média Concluídos/Dia */}
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
          <div>
            <div className="font-medium">Média Concluídos/Dia</div>
            <div className="text-xs text-gray-500">
              {comparison.period1.kpis.avgCompletedPerDay} → {comparison.period2.kpis.avgCompletedPerDay}
            </div>
          </div>
          {renderChange(comparison.changes.avgCompletedPerDay)}
        </div>

        {/* Tempo Médio */}
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
          <div>
            <div className="font-medium">Tempo Médio (dias)</div>
            <div className="text-xs text-gray-500">
              {comparison.period1.kpis.avgProcessTime} → {comparison.period2.kpis.avgProcessTime}
            </div>
          </div>
          {renderChange(comparison.changes.avgProcessTime)}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EXEMPLO 7: Uso Sem React (Vanilla JavaScript)
// ============================================================================
export const vanillaJSExample = `
// Importar funções
import { calculateAllFlowKPIs } from './utils/flowKPIs';

// Buscar dados (já normalizados)
const cards = await fetch('/api/trello/cards').then(r => r.json());

// Definir período
const startDate = new Date('2026-02-01');
const endDate = new Date('2026-02-28');

// Calcular todos os KPIs
const kpis = calculateAllFlowKPIs(cards, startDate, endDate);

console.log('Total de novos:', kpis.totalNew);
console.log('Total concluídos:', kpis.totalCompleted);
console.log('Total em andamento:', kpis.totalInProgress);
console.log('Média novos/dia:', kpis.avgNewPerDay);
console.log('Média concluídos/dia:', kpis.avgCompletedPerDay);
console.log('Tempo médio:', kpis.avgProcessTime, 'dias');
console.log('Período:', kpis.periodDays, 'dias');
`;

// ============================================================================
// EXEMPLO 8: Dashboard Completo de KPIs
// ============================================================================
export function FlowKPIsDashboard() {
  const { normalizedData, isLoading } = useTrello('SEU_BOARD_ID');
  const { periodRange, periodType } = usePeriodFilter();

  if (isLoading || !normalizedData || !periodRange) {
    return <div className="flex justify-center items-center h-64">Carregando...</div>;
  }

  const kpis = calculateDetailedFlowKPIs(
    normalizedData.cards,
    periodRange.startDate,
    periodRange.endDate
  );

  const validation = validateKPIs(kpis);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">KPIs de Vazão - {periodType}</h1>
        {!validation.isValid && (
          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
            ⚠ Validação falhou
          </span>
        )}
      </div>

      {/* Cards Principais */}
      <AllKPIsPanel />

      {/* KPIs Detalhados */}
      <DetailedKPIsPanel />

      {/* Validação */}
      {!validation.isValid && <KPIsValidation />}
    </div>
  );
}

export default FlowKPIsDashboard;
