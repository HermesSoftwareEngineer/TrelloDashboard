/**
 * EXEMPLOS DE USO - STATUS CHART PROCESSOR
 * 
 * Demonstra como usar as funções de classificação e agregação de status
 */

import React from 'react';
import {
  classifyCardStatus,
  countCardsByStatus,
  filterCardsByStatus,
  generateStatusDataset,
  getStatusSummary,
  getStatusCounts,
  calculateStatusMetrics,
  compareStatusBetweenPeriods
} from '../utils/statusChartProcessor';
import { usePeriodFilter } from '../hooks/usePeriodFilter';
import useTrello from '../hooks/useTrello';

// ============================================================================
// EXEMPLO 1: Contadores Simples de Status
// ============================================================================
export function StatusCounters() {
  const { normalizedData } = useTrello('SEU_BOARD_ID');
  const { periodRange } = usePeriodFilter();

  if (!normalizedData || !periodRange) return <div>Carregando...</div>;

  const counts = getStatusCounts(
    normalizedData.cards,
    periodRange.startDate,
    periodRange.endDate
  );

  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="bg-blue-100 p-4 rounded">
        <div className="text-2xl font-bold text-blue-600">{counts.new}</div>
        <div className="text-sm text-blue-800">Novos no período</div>
      </div>
      <div className="bg-yellow-100 p-4 rounded">
        <div className="text-2xl font-bold text-yellow-600">{counts.inProgress}</div>
        <div className="text-sm text-yellow-800">Em andamento</div>
      </div>
      <div className="bg-green-100 p-4 rounded">
        <div className="text-2xl font-bold text-green-600">{counts.completed}</div>
        <div className="text-sm text-green-800">Concluídos no período</div>
      </div>
      <div className="bg-gray-100 p-4 rounded">
        <div className="text-2xl font-bold text-gray-600">{counts.total}</div>
        <div className="text-sm text-gray-800">Total</div>
      </div>
    </div>
  );
}

// ============================================================================
// EXEMPLO 2: Dataset para Gráfico de Pizza (Chart.js)
// ============================================================================
export function StatusPieChartData() {
  const { normalizedData } = useTrello('SEU_BOARD_ID');
  const { periodRange } = usePeriodFilter();

  if (!normalizedData || !periodRange) return null;

  const dataset = generateStatusDataset(
    normalizedData.cards,
    periodRange.startDate,
    periodRange.endDate
  );

  // Dataset pronto para Chart.js
  const chartConfig = {
    type: 'pie',
    data: dataset,
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom'
        },
        title: {
          display: true,
          text: 'Status Geral do Período'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed;
              const percentage = dataset.percentages[context.dataIndex];
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      }
    }
  };

  return (
    <div>
      <pre>{JSON.stringify(chartConfig, null, 2)}</pre>
      {/* Ou com Chart.js: */}
      {/* <Pie data={dataset} options={chartConfig.options} /> */}
    </div>
  );
}

// ============================================================================
// EXEMPLO 3: Resumo Detalhado com Percentuais
// ============================================================================
export function StatusSummaryPanel() {
  const { normalizedData } = useTrello('SEU_BOARD_ID');
  const { periodRange } = usePeriodFilter();

  if (!normalizedData || !periodRange) return <div>Carregando...</div>;

  const summary = getStatusSummary(
    normalizedData.cards,
    periodRange.startDate,
    periodRange.endDate
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Status Geral do Período</h2>
      
      <div className="space-y-4">
        {/* Novos */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium">Novos no período</span>
            <span className="text-sm text-gray-600">
              {summary.totals.new} ({summary.percentages.new}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full" 
              style={{ width: `${summary.percentages.new}%` }}
            />
          </div>
        </div>

        {/* Em Andamento */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium">Em andamento</span>
            <span className="text-sm text-gray-600">
              {summary.totals.inProgress} ({summary.percentages.inProgress}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-yellow-500 h-2 rounded-full" 
              style={{ width: `${summary.percentages.inProgress}%` }}
            />
          </div>
        </div>

        {/* Concluídos */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium">Concluídos no período</span>
            <span className="text-sm text-gray-600">
              {summary.totals.completed} ({summary.percentages.completed}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full" 
              style={{ width: `${summary.percentages.completed}%` }}
            />
          </div>
        </div>

        {/* Total */}
        <div className="pt-2 border-t">
          <div className="flex justify-between">
            <span className="text-sm font-bold">Total de Cards</span>
            <span className="text-sm font-bold">{summary.totals.total}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EXEMPLO 4: Lista de Cards Por Status
// ============================================================================
export function CardsByStatusList() {
  const { normalizedData } = useTrello('SEU_BOARD_ID');
  const { periodRange } = usePeriodFilter();
  const [selectedStatus, setSelectedStatus] = React.useState('new');

  if (!normalizedData || !periodRange) return <div>Carregando...</div>;

  const cards = filterCardsByStatus(
    normalizedData.cards,
    selectedStatus,
    periodRange.startDate,
    periodRange.endDate
  );

  const statusLabels = {
    new: 'Novos no período',
    'in-progress': 'Em andamento',
    completed: 'Concluídos no período'
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Cards por Status</h2>
      
      {/* Filtro de Status */}
      <div className="mb-4">
        <select 
          value={selectedStatus} 
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="new">Novos no período</option>
          <option value="in-progress">Em andamento</option>
          <option value="completed">Concluídos no período</option>
        </select>
      </div>

      {/* Lista de Cards */}
      <div className="space-y-2">
        <div className="text-sm text-gray-600 mb-2">
          {cards.length} card(s) - {statusLabels[selectedStatus]}
        </div>
        {cards.map(card => (
          <div key={card.id} className="border-l-4 border-blue-500 bg-gray-50 p-3">
            <div className="font-medium">{card.name}</div>
            <div className="text-sm text-gray-600">
              Criado: {new Date(card.createdAt).toLocaleDateString('pt-BR')}
              {card.completedAt && (
                <> | Concluído: {new Date(card.completedAt).toLocaleDateString('pt-BR')}</>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// EXEMPLO 5: Métricas de Desempenho
// ============================================================================
export function PerformanceMetrics() {
  const { normalizedData } = useTrello('SEU_BOARD_ID');
  const { periodRange } = usePeriodFilter();

  if (!normalizedData || !periodRange) return <div>Carregando...</div>;

  const metrics = calculateStatusMetrics(
    normalizedData.cards,
    periodRange.startDate,
    periodRange.endDate
  );

  const getHealthColor = (status) => {
    const colors = {
      'Excelente': 'text-green-600',
      'Bom': 'text-blue-600',
      'Regular': 'text-yellow-600',
      'Atenção': 'text-orange-600',
      'Crítico': 'text-red-600'
    };
    return colors[status] || 'text-gray-600';
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Métricas de Desempenho</h2>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Taxa de Conclusão */}
        <div className="border rounded p-4">
          <div className="text-sm text-gray-600">Taxa de Conclusão</div>
          <div className="text-2xl font-bold text-green-600">{metrics.completionRate}%</div>
        </div>

        {/* Taxa de Entrada */}
        <div className="border rounded p-4">
          <div className="text-sm text-gray-600">Taxa de Entrada</div>
          <div className="text-2xl font-bold text-blue-600">{metrics.intakeRate}%</div>
        </div>

        {/* Taxa de WIP */}
        <div className="border rounded p-4">
          <div className="text-sm text-gray-600">Taxa de WIP</div>
          <div className="text-2xl font-bold text-yellow-600">{metrics.wipRate}%</div>
        </div>

        {/* Health Score */}
        <div className="border rounded p-4">
          <div className="text-sm text-gray-600">Saúde do Processo</div>
          <div className={`text-2xl font-bold ${getHealthColor(metrics.healthStatus)}`}>
            {metrics.healthScore}/100
          </div>
          <div className={`text-xs ${getHealthColor(metrics.healthStatus)}`}>
            {metrics.healthStatus}
          </div>
        </div>

        {/* Média Diária - Conclusões */}
        <div className="border rounded p-4">
          <div className="text-sm text-gray-600">Conclusões/Dia</div>
          <div className="text-xl font-bold">{metrics.avgCompletionsPerDay}</div>
        </div>

        {/* Média Diária - Novos */}
        <div className="border rounded p-4">
          <div className="text-sm text-gray-600">Novos Cards/Dia</div>
          <div className="text-xl font-bold">{metrics.avgNewPerDay}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EXEMPLO 6: Comparação Entre Períodos
// ============================================================================
export function PeriodComparison() {
  const { normalizedData } = useTrello('SEU_BOARD_ID');

  if (!normalizedData) return <div>Carregando...</div>;

  // Exemplo: Comparar últimos 30 dias com 30 dias anteriores
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const sixtyDaysAgo = new Date(today);
  sixtyDaysAgo.setDate(today.getDate() - 60);

  const comparison = compareStatusBetweenPeriods(
    normalizedData.cards,
    sixtyDaysAgo,
    thirtyDaysAgo,
    thirtyDaysAgo,
    today
  );

  const renderChange = (change) => {
    const isPositive = change.absolute > 0;
    const color = isPositive ? 'text-green-600' : 'text-red-600';
    const arrow = isPositive ? '↑' : '↓';
    
    return (
      <span className={`${color} text-sm font-medium`}>
        {arrow} {Math.abs(change.absolute)} ({change.percentage > 0 ? '+' : ''}{change.percentage}%)
      </span>
    );
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Comparação de Períodos</h2>
      
      <div className="space-y-4">
        {/* Novos */}
        <div className="flex justify-between items-center">
          <span>Novos no período</span>
          <div className="text-right">
            <div className="font-bold">{comparison.period2.counts.new}</div>
            {renderChange(comparison.changes.new)}
          </div>
        </div>

        {/* Em Andamento */}
        <div className="flex justify-between items-center">
          <span>Em andamento</span>
          <div className="text-right">
            <div className="font-bold">{comparison.period2.counts['in-progress']}</div>
            {renderChange(comparison.changes.inProgress)}
          </div>
        </div>

        {/* Concluídos */}
        <div className="flex justify-between items-center">
          <span>Concluídos no período</span>
          <div className="text-right">
            <div className="font-bold">{comparison.period2.counts.completed}</div>
            {renderChange(comparison.changes.completed)}
          </div>
        </div>

        {/* Total */}
        <div className="flex justify-between items-center pt-2 border-t">
          <span className="font-bold">Total</span>
          <div className="text-right">
            <div className="font-bold">{comparison.period2.counts.total}</div>
            {renderChange(comparison.changes.total)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EXEMPLO 7: Classificação Individual de Card
// ============================================================================
export function CardStatusClassifier() {
  const { normalizedData } = useTrello('SEU_BOARD_ID');
  const { periodRange } = usePeriodFilter();
  const [selectedCardId, setSelectedCardId] = React.useState(null);

  if (!normalizedData || !periodRange) return <div>Carregando...</div>;

  const selectedCard = normalizedData.cards.find(c => c.id === selectedCardId);
  const status = selectedCard 
    ? classifyCardStatus(selectedCard, periodRange.startDate, periodRange.endDate)
    : null;

  const statusInfo = {
    'new': {
      label: 'Novo no período',
      color: 'bg-blue-100 text-blue-800',
      description: 'Card criado durante o período e ainda não concluído'
    },
    'in-progress': {
      label: 'Em andamento',
      color: 'bg-yellow-100 text-yellow-800',
      description: 'Card em progresso, criado antes ou durante o período'
    },
    'completed': {
      label: 'Concluído no período',
      color: 'bg-green-100 text-green-800',
      description: 'Card concluído durante o período selecionado'
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Classificar Card</h2>
      
      {/* Seletor de Card */}
      <select 
        value={selectedCardId || ''} 
        onChange={(e) => setSelectedCardId(e.target.value)}
        className="w-full border rounded px-3 py-2 mb-4"
      >
        <option value="">Selecione um card...</option>
        {normalizedData.cards.map(card => (
          <option key={card.id} value={card.id}>{card.name}</option>
        ))}
      </select>

      {/* Resultado da Classificação */}
      {status && statusInfo[status] && (
        <div className={`p-4 rounded ${statusInfo[status].color}`}>
          <div className="font-bold mb-2">{statusInfo[status].label}</div>
          <div className="text-sm mb-3">{statusInfo[status].description}</div>
          <div className="text-xs space-y-1">
            <div>Criado: {new Date(selectedCard.createdAt).toLocaleDateString('pt-BR')}</div>
            {selectedCard.completedAt && (
              <div>Concluído: {new Date(selectedCard.completedAt).toLocaleDateString('pt-BR')}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXEMPLO 8: Widget Compacto de Status
// ============================================================================
export function StatusWidget() {
  const { normalizedData } = useTrello('SEU_BOARD_ID');
  const { periodRange } = usePeriodFilter();

  if (!normalizedData || !periodRange) return null;

  const counts = getStatusCounts(
    normalizedData.cards,
    periodRange.startDate,
    periodRange.endDate
  );

  return (
    <div className="inline-flex bg-white rounded-full shadow-sm border p-1 gap-1">
      <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
        {counts.new} novos
      </div>
      <div className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium">
        {counts.inProgress} andamento
      </div>
      <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
        {counts.completed} concluídos
      </div>
    </div>
  );
}

// ============================================================================
// EXEMPLO 9: Uso Sem React (Vanilla JavaScript)
// ============================================================================
export const vanillaJSExample = `
// Importar funções
import { 
  getStatusCounts, 
  generateStatusDataset,
  calculateStatusMetrics 
} from './utils/statusChartProcessor';

// Buscar dados do Trello (já normalizado)
const cards = await fetch('/api/trello/cards').then(r => r.json());

// Definir período
const startDate = new Date('2026-01-01');
const endDate = new Date('2026-01-31');

// Obter contadores
const counts = getStatusCounts(cards, startDate, endDate);
console.log('Novos:', counts.new);
console.log('Em andamento:', counts.inProgress);
console.log('Concluídos:', counts.completed);

// Gerar dataset para gráfico
const dataset = generateStatusDataset(cards, startDate, endDate);
console.log('Dataset:', dataset);

// Calcular métricas
const metrics = calculateStatusMetrics(cards, startDate, endDate);
console.log('Taxa de conclusão:', metrics.completionRate + '%');
console.log('Saúde:', metrics.healthStatus, metrics.healthScore);

// Usar com Chart.js
const ctx = document.getElementById('myChart').getContext('2d');
new Chart(ctx, {
  type: 'pie',
  data: dataset,
  options: {
    responsive: true,
    plugins: {
      legend: { position: 'bottom' }
    }
  }
});
`;

// ============================================================================
// EXEMPLO 10: Integração com Context API
// ============================================================================
export function StatusDashboard() {
  const { normalizedData, isLoading } = useTrello('SEU_BOARD_ID');
  const { periodRange, periodType } = usePeriodFilter();

  if (isLoading || !normalizedData || !periodRange) {
    return <div className="flex justify-center items-center h-64">Carregando...</div>;
  }

  const counts = getStatusCounts(
    normalizedData.cards,
    periodRange.startDate,
    periodRange.endDate
  );

  const metrics = calculateStatusMetrics(
    normalizedData.cards,
    periodRange.startDate,
    periodRange.endDate
  );

  const dataset = generateStatusDataset(
    normalizedData.cards,
    periodRange.startDate,
    periodRange.endDate
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Status Geral - {periodType}</h1>
        <StatusWidget />
      </div>

      {/* Cards de Contadores */}
      <StatusCounters />

      {/* Grid Principal */}
      <div className="grid grid-cols-2 gap-6">
        {/* Resumo com Barras */}
        <StatusSummaryPanel />
        
        {/* Métricas de Desempenho */}
        <PerformanceMetrics />
      </div>

      {/* Dataset JSON (para debug) */}
      <details className="bg-gray-50 p-4 rounded">
        <summary className="cursor-pointer font-medium">Ver Dataset do Gráfico</summary>
        <pre className="mt-2 text-xs overflow-auto">
          {JSON.stringify(dataset, null, 2)}
        </pre>
      </details>
    </div>
  );
}

export default StatusDashboard;
