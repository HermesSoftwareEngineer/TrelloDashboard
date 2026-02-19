/**
 * CHART DATA ADAPTER
 * 
 * Adapta datasets processados para formatos consumíveis por bibliotecas de gráficos.
 * Garante padronização e separação entre lógica de dados e UI.
 * 
 * PROMPT 10: Preparação para Visualização
 * - Contrato de dados para linhas, barras, pizza, cards numéricos
 * - Padronização de formatos
 * - Separação clara entre lógica e UI
 */

/**
 * ==============================================
 * CONTRATO DE DADOS (DATA CONTRACTS)
 * ==============================================
 * 
 * Define estruturas padrão para cada tipo de visualização.
 */

/**
 * @typedef {Object} LineChartData
 * @property {string[]} labels - Array de labels para o eixo X
 * @property {LineChartDataset[]} datasets - Array de séries de dados
 */

/**
 * @typedef {Object} LineChartDataset
 * @property {string} label - Nome da série
 * @property {number[]} data - Valores da série
 * @property {string} borderColor - Cor da linha
 * @property {string} backgroundColor - Cor de preenchimento (se área)
 * @property {boolean} fill - Se deve preencher área sob a linha
 * @property {boolean} tension - Tensão da curva (0 = reta, 0.4 = suave)
 */

/**
 * @typedef {Object} BarChartData
 * @property {string[]} labels - Array de labels para o eixo X
 * @property {BarChartDataset[]} datasets - Array de séries de dados
 */

/**
 * @typedef {Object} BarChartDataset
 * @property {string} label - Nome da série
 * @property {number[]} data - Valores da série
 * @property {string|string[]} backgroundColor - Cor(es) das barras
 * @property {string|string[]} borderColor - Cor(es) das bordas
 * @property {number} borderWidth - Largura da borda
 */

/**
 * @typedef {Object} PieChartData
 * @property {string[]} labels - Array de labels para as fatias
 * @property {number[]} data - Valores das fatias
 * @property {string[]} backgroundColor - Cores das fatias
 * @property {number} total - Total geral (soma dos valores)
 * @property {number[]} percentages - Percentuais de cada fatia
 */

/**
 * @typedef {Object} MetricCardData
 * @property {string} label - Nome da métrica
 * @property {number|string} value - Valor principal
 * @property {string} unit - Unidade (ex: 'processos', 'dias', '%')
 * @property {string} trend - Tendência: 'up', 'down', 'neutral'
 * @property {number} changeValue - Valor da mudança
 * @property {string} changeLabel - Descrição da mudança
 * @property {string} icon - Ícone sugerido
 * @property {string} color - Cor temática
 */

/**
 * ==============================================
 * ADAPTADORES PARA CHART.JS
 * ==============================================
 */

/**
 * Adapta dados de evolução temporal para gráfico de linhas (Chart.js)
 * 
 * @param {Object} evolutionData - Dados de chartDataProcessor.generateEvolutionDataset
 * @returns {LineChartData} Dados formatados para Chart.js
 */
export function adaptEvolutionToLineChart(evolutionData) {
  const { labels, datasets } = evolutionData;
  
  const chartDatasets = Object.entries(datasets).map(([key, dataset]) => ({
    label: dataset.label,
    data: dataset.data,
    borderColor: getColorForDataset(key),
    backgroundColor: getColorForDataset(key, 0.1),
    fill: false,
    tension: 0.4,
    pointRadius: 3,
    pointHoverRadius: 5
  }));
  
  return {
    labels: labels,
    datasets: chartDatasets
  };
}

/**
 * Adapta análise por label para gráfico de barras (Chart.js)
 * 
 * @param {Array} labelAnalysis - Dados de labelAnalysisProcessor.generateLabelAnalysisDataset
 * @param {string} metric - Métrica a exibir: 'total', 'completed', 'inProgress', 'avgTime'
 * @returns {BarChartData} Dados formatados para Chart.js
 */
export function adaptLabelAnalysisToBarChart(labelAnalysis, metric = 'total') {
  const labels = labelAnalysis.map(item => item.labelName);
  
  let data, label, colors;
  
  switch (metric) {
    case 'total':
      data = labelAnalysis.map(item => item.total);
      label = 'Total de Processos';
      colors = labelAnalysis.map(item => getLabelColor(item.labelColor));
      break;
    case 'completed':
      data = labelAnalysis.map(item => item.completed);
      label = 'Processos Concluídos';
      colors = '#10b981'; // green
      break;
    case 'inProgress':
      data = labelAnalysis.map(item => item.inProgress);
      label = 'Em Andamento';
      colors = '#f59e0b'; // amber
      break;
    case 'avgTime':
      data = labelAnalysis.map(item => item.avgCompletionTimeDays);
      label = 'Tempo Médio (dias)';
      colors = '#6366f1'; // indigo
      break;
    default:
      data = labelAnalysis.map(item => item.total);
      label = 'Total de Processos';
      colors = labelAnalysis.map(item => getLabelColor(item.labelColor));
  }
  
  return {
    labels: labels,
    datasets: [{
      label: label,
      data: data,
      backgroundColor: colors,
      borderColor: colors,
      borderWidth: 1
    }]
  };
}

/**
 * Adapta análise por lista para gráfico de barras empilhadas (Chart.js)
 * 
 * @param {Array} listAnalysis - Dados de listAnalysisProcessor.generateListAnalysisDataset
 * @returns {BarChartData} Dados formatados para Chart.js (stacked)
 */
export function adaptListAnalysisToStackedBarChart(listAnalysis) {
  const labels = listAnalysis.map(item => item.listName);
  
  return {
    labels: labels,
    datasets: [
      {
        label: 'Novos',
        data: listAnalysis.map(item => item.new),
        backgroundColor: '#3b82f6', // blue
        borderColor: '#3b82f6',
        borderWidth: 1
      },
      {
        label: 'Em Andamento',
        data: listAnalysis.map(item => item.inProgress),
        backgroundColor: '#f59e0b', // amber
        borderColor: '#f59e0b',
        borderWidth: 1
      },
      {
        label: 'Concluídos',
        data: listAnalysis.map(item => item.completed),
        backgroundColor: '#10b981', // green
        borderColor: '#10b981',
        borderWidth: 1
      }
    ]
  };
}

/**
 * Adapta análise por membro para gráfico de barras horizontais (Chart.js)
 * 
 * @param {Array} memberAnalysis - Dados de memberAnalysisProcessor.generateMemberAnalysisDataset
 * @param {string} metric - Métrica a exibir: 'totalAssigned', 'totalCompleted', 'completionRate', 'avgTime'
 * @param {number} limit - Limitar número de membros (default: 10)
 * @returns {BarChartData} Dados formatados para Chart.js (horizontal)
 */
export function adaptMemberAnalysisToHorizontalBarChart(memberAnalysis, metric = 'totalCompleted', limit = 10) {
  const limitedData = memberAnalysis.slice(0, limit);
  const labels = limitedData.map(item => item.memberName);
  
  let data, label, color;
  
  switch (metric) {
    case 'totalAssigned':
      data = limitedData.map(item => item.totalAssigned);
      label = 'Total Atribuídos';
      color = '#6366f1'; // indigo
      break;
    case 'totalCompleted':
      data = limitedData.map(item => item.totalCompleted);
      label = 'Total Concluídos';
      color = '#10b981'; // green
      break;
    case 'completionRate':
      data = limitedData.map(item => item.completionRate);
      label = 'Taxa de Conclusão (%)';
      color = '#8b5cf6'; // purple
      break;
    case 'avgTime':
      data = limitedData.map(item => item.avgProcessTimeDays);
      label = 'Tempo Médio (dias)';
      color = '#f59e0b'; // amber
      break;
    default:
      data = limitedData.map(item => item.totalCompleted);
      label = 'Total Concluídos';
      color = '#10b981';
  }
  
  return {
    labels: labels,
    datasets: [{
      label: label,
      data: data,
      backgroundColor: color,
      borderColor: color,
      borderWidth: 1
    }]
  };
}

/**
 * Adapta distribuição de status para gráfico de pizza (Chart.js)
 * 
 * @param {Object} statusCounts - Dados de statusChartProcessor.countCardsByStatus
 * @returns {PieChartData} Dados formatados para Chart.js
 */
export function adaptStatusToPieChart(statusCounts) {
  const labels = ['Novos', 'Em Andamento', 'Concluídos'];
  const data = [
    statusCounts.new || 0,
    statusCounts['in-progress'] || 0,
    statusCounts.completed || 0
  ];
  const backgroundColor = [
    '#3b82f6', // blue
    '#f59e0b', // amber
    '#10b981'  // green
  ];
  
  const total = data.reduce((sum, val) => sum + val, 0);
  const percentages = data.map(val => total > 0 ? Number(((val / total) * 100).toFixed(1)) : 0);
  
  return {
    labels: labels,
    data: data,
    backgroundColor: backgroundColor,
    total: total,
    percentages: percentages
  };
}

/**
 * ==============================================
 * ADAPTADORES PARA RECHARTS
 * ==============================================
 */

/**
 * Adapta dados de evolução temporal para Recharts (formato array de objetos)
 * 
 * @param {Object} evolutionData - Dados de chartDataProcessor.generateEvolutionDataset
 * @returns {Array<Object>} Dados formatados para Recharts
 */
export function adaptEvolutionToRechartsLine(evolutionData) {
  const { labels, datasets } = evolutionData;
  
  return labels.map((label, index) => {
    const point = { date: label };
    
    Object.entries(datasets).forEach(([key, dataset]) => {
      point[key] = dataset.data[index];
    });
    
    return point;
  });
}

/**
 * Adapta análise por label para Recharts BarChart
 * 
 * @param {Array} labelAnalysis - Dados de labelAnalysisProcessor.generateLabelAnalysisDataset
 * @returns {Array<Object>} Dados formatados para Recharts
 */
export function adaptLabelAnalysisToRechartsBar(labelAnalysis) {
  return labelAnalysis.map(item => ({
    name: item.labelName,
    total: item.total,
    completed: item.completed,
    inProgress: item.inProgress,
    avgTime: item.avgCompletionTimeDays,
    color: getLabelColor(item.labelColor)
  }));
}

/**
 * Adapta análise por lista para Recharts BarChart empilhado
 * 
 * @param {Array} listAnalysis - Dados de listAnalysisProcessor.generateListAnalysisDataset
 * @returns {Array<Object>} Dados formatados para Recharts
 */
export function adaptListAnalysisToRechartsStackedBar(listAnalysis) {
  return listAnalysis.map(item => ({
    name: item.listName,
    new: item.new,
    inProgress: item.inProgress,
    completed: item.completed,
    total: item.total
  }));
}

/**
 * Adapta distribuição de status para Recharts PieChart
 * 
 * @param {Object} statusCounts - Dados de statusChartProcessor.countCardsByStatus
 * @returns {Array<Object>} Dados formatados para Recharts
 */
export function adaptStatusToRechartsPie(statusCounts) {
  return [
    { name: 'Novos', value: statusCounts.new || 0, color: '#3b82f6' },
    { name: 'Em Andamento', value: statusCounts['in-progress'] || 0, color: '#f59e0b' },
    { name: 'Concluídos', value: statusCounts.completed || 0, color: '#10b981' }
  ];
}

/**
 * ==============================================
 * ADAPTADORES PARA CARDS NUMÉRICOS (KPIs)
 * ==============================================
 */

/**
 * Gera dados para card de métrica numérica
 * 
 * @param {string} label - Nome da métrica
 * @param {number|string} value - Valor principal
 * @param {Object} options - Opções adicionais
 * @returns {MetricCardData} Dados formatados para card numérico
 */
export function createMetricCard(label, value, options = {}) {
  const {
    unit = '',
    trend = 'neutral',
    changeValue = null,
    changeLabel = '',
    icon = 'default',
    color = 'blue'
  } = options;
  
  return {
    label,
    value,
    unit,
    trend,
    changeValue,
    changeLabel,
    icon,
    color
  };
}

/**
 * Adapta KPIs de vazão para cards numéricos
 * 
 * @param {Object} flowKPIs - Objeto com KPIs calculados
 * @param {Object} previousFlowKPIs - KPIs do período anterior (opcional, para tendência)
 * @returns {Array<MetricCardData>} Array de cards de métricas
 */
export function adaptFlowKPIsToMetricCards(flowKPIs, previousFlowKPIs = null) {
  const cards = [];
  
  // Total de Processos Novos
  cards.push(createMetricCard(
    'Processos Novos',
    flowKPIs.newProcesses || 0,
    {
      unit: 'processos',
      trend: calculateTrend(flowKPIs.newProcesses, previousFlowKPIs?.newProcesses),
      changeValue: calculateChange(flowKPIs.newProcesses, previousFlowKPIs?.newProcesses),
      changeLabel: 'vs período anterior',
      icon: 'plus-circle',
      color: 'blue'
    }
  ));
  
  // Total de Processos Concluídos
  cards.push(createMetricCard(
    'Processos Concluídos',
    flowKPIs.completedProcesses || 0,
    {
      unit: 'processos',
      trend: calculateTrend(flowKPIs.completedProcesses, previousFlowKPIs?.completedProcesses),
      changeValue: calculateChange(flowKPIs.completedProcesses, previousFlowKPIs?.completedProcesses),
      changeLabel: 'vs período anterior',
      icon: 'check-circle',
      color: 'green'
    }
  ));
  
  // Processos em Andamento
  cards.push(createMetricCard(
    'Em Andamento',
    flowKPIs.inProgressProcesses || 0,
    {
      unit: 'processos',
      trend: calculateTrend(flowKPIs.inProgressProcesses, previousFlowKPIs?.inProgressProcesses, true),
      changeValue: calculateChange(flowKPIs.inProgressProcesses, previousFlowKPIs?.inProgressProcesses),
      changeLabel: 'vs período anterior',
      icon: 'clock',
      color: 'amber'
    }
  ));
  
  // Tempo Médio de Processo
  cards.push(createMetricCard(
    'Tempo Médio',
    flowKPIs.avgProcessTime || 0,
    {
      unit: 'dias',
      trend: calculateTrend(flowKPIs.avgProcessTime, previousFlowKPIs?.avgProcessTime, true),
      changeValue: calculateChange(flowKPIs.avgProcessTime, previousFlowKPIs?.avgProcessTime),
      changeLabel: 'vs período anterior',
      icon: 'trending',
      color: 'purple'
    }
  ));
  
  // Média de Novos por Dia
  if (flowKPIs.avgNewPerDay !== undefined) {
    cards.push(createMetricCard(
      'Média Novos/Dia',
      flowKPIs.avgNewPerDay || 0,
      {
        unit: 'processos/dia',
        trend: calculateTrend(flowKPIs.avgNewPerDay, previousFlowKPIs?.avgNewPerDay),
        changeValue: calculateChange(flowKPIs.avgNewPerDay, previousFlowKPIs?.avgNewPerDay),
        changeLabel: 'vs período anterior',
        icon: 'chart-line',
        color: 'indigo'
      }
    ));
  }
  
  // Média de Concluídos por Dia
  if (flowKPIs.avgCompletedPerDay !== undefined) {
    cards.push(createMetricCard(
      'Média Concluídos/Dia',
      flowKPIs.avgCompletedPerDay || 0,
      {
        unit: 'processos/dia',
        trend: calculateTrend(flowKPIs.avgCompletedPerDay, previousFlowKPIs?.avgCompletedPerDay),
        changeValue: calculateChange(flowKPIs.avgCompletedPerDay, previousFlowKPIs?.avgCompletedPerDay),
        changeLabel: 'vs período anterior',
        icon: 'zap',
        color: 'teal'
      }
    ));
  }
  
  return cards;
}

/**
 * Adapta resumo de análise por label para cards numéricos
 * 
 * @param {Array} labelAnalysis - Dados de labelAnalysisProcessor.generateLabelAnalysisDataset
 * @returns {Array<MetricCardData>} Array de cards de métricas
 */
export function adaptLabelSummaryToMetricCards(labelAnalysis) {
  if (!labelAnalysis || labelAnalysis.length === 0) {
    return [];
  }
  
  // Tipo com mais processos
  const topLabel = labelAnalysis[0];
  
  // Tipo mais rápido (menor tempo médio, excluindo zeros)
  const fastestLabel = labelAnalysis
    .filter(item => item.avgCompletionTimeDays > 0)
    .sort((a, b) => a.avgCompletionTimeDays - b.avgCompletionTimeDays)[0];
  
  // Tipo mais lento (maior tempo médio)
  const slowestLabel = labelAnalysis
    .filter(item => item.avgCompletionTimeDays > 0)
    .sort((a, b) => b.avgCompletionTimeDays - a.avgCompletionTimeDays)[0];
  
  const cards = [];
  
  if (topLabel) {
    cards.push(createMetricCard(
      'Tipo Mais Comum',
      topLabel.labelName,
      {
        unit: `${topLabel.total} processos`,
        icon: 'award',
        color: 'blue'
      }
    ));
  }
  
  if (fastestLabel) {
    cards.push(createMetricCard(
      'Tipo Mais Rápido',
      fastestLabel.labelName,
      {
        unit: `${fastestLabel.avgCompletionTimeDays} dias`,
        icon: 'zap',
        color: 'green'
      }
    ));
  }
  
  if (slowestLabel) {
    cards.push(createMetricCard(
      'Tipo Mais Lento',
      slowestLabel.labelName,
      {
        unit: `${slowestLabel.avgCompletionTimeDays} dias`,
        icon: 'alert-circle',
        color: 'red'
      }
    ));
  }
  
  return cards;
}

/**
 * Adapta resumo de análise por membro para cards numéricos
 * 
 * @param {Array} memberAnalysis - Dados de memberAnalysisProcessor.generateMemberAnalysisDataset
 * @returns {Array<MetricCardData>} Array de cards de métricas
 */
export function adaptMemberSummaryToMetricCards(memberAnalysis) {
  if (!memberAnalysis || memberAnalysis.length === 0) {
    return [];
  }
  
  // Top performer (maior taxa de conclusão)
  const topPerformer = memberAnalysis
    .filter(item => item.memberId !== 'no-member')
    .sort((a, b) => b.completionRate - a.completionRate)[0];
  
  // Mais produtivo (mais cards concluídos)
  const mostProductive = memberAnalysis
    .filter(item => item.memberId !== 'no-member')
    .sort((a, b) => b.totalCompleted - a.totalCompleted)[0];
  
  // Mais eficiente (menor tempo médio, excluindo zeros)
  const mostEfficient = memberAnalysis
    .filter(item => item.memberId !== 'no-member' && item.avgProcessTimeDays > 0)
    .sort((a, b) => a.avgProcessTimeDays - b.avgProcessTimeDays)[0];
  
  const cards = [];
  
  if (topPerformer) {
    cards.push(createMetricCard(
      'Top Performer',
      topPerformer.memberName,
      {
        unit: `${topPerformer.completionRate}% conclusão`,
        icon: 'star',
        color: 'yellow'
      }
    ));
  }
  
  if (mostProductive) {
    cards.push(createMetricCard(
      'Mais Produtivo',
      mostProductive.memberName,
      {
        unit: `${mostProductive.totalCompleted} concluídos`,
        icon: 'trending-up',
        color: 'green'
      }
    ));
  }
  
  if (mostEfficient) {
    cards.push(createMetricCard(
      'Mais Eficiente',
      mostEfficient.memberName,
      {
        unit: `${mostEfficient.avgProcessTimeDays} dias médio`,
        icon: 'zap',
        color: 'purple'
      }
    ));
  }
  
  return cards;
}

/**
 * ==============================================
 * FUNÇÕES AUXILIARES
 * ==============================================
 */

/**
 * Calcula tendência comparando valor atual com anterior
 * 
 * @param {number} current - Valor atual
 * @param {number} previous - Valor anterior
 * @param {boolean} invertLogic - Se true, diminuir é bom (ex: tempo médio)
 * @returns {string} 'up', 'down', ou 'neutral'
 */
function calculateTrend(current, previous, invertLogic = false) {
  if (!previous || previous === 0 || !current) return 'neutral';
  
  const isIncreasing = current > previous;
  
  if (invertLogic) {
    return isIncreasing ? 'down' : 'up';
  }
  
  return isIncreasing ? 'up' : 'down';
}

/**
 * Calcula mudança percentual ou absoluta
 * 
 * @param {number} current - Valor atual
 * @param {number} previous - Valor anterior
 * @returns {number|null} Mudança percentual ou null
 */
function calculateChange(current, previous) {
  if (!previous || previous === 0 || !current) return null;
  
  const percentChange = ((current - previous) / previous) * 100;
  return Number(percentChange.toFixed(1));
}

/**
 * Obtém cor para dataset baseado na chave
 * 
 * @param {string} key - Chave do dataset
 * @param {number} alpha - Transparência (0-1)
 * @returns {string} Cor em formato rgba ou hex
 */
function getColorForDataset(key, alpha = 1) {
  const colors = {
    created: alpha < 1 ? `rgba(59, 130, 246, ${alpha})` : '#3b82f6', // blue
    completed: alpha < 1 ? `rgba(16, 185, 129, ${alpha})` : '#10b981', // green
    inProgress: alpha < 1 ? `rgba(245, 158, 11, ${alpha})` : '#f59e0b', // amber
    new: alpha < 1 ? `rgba(59, 130, 246, ${alpha})` : '#3b82f6', // blue
    total: alpha < 1 ? `rgba(99, 102, 241, ${alpha})` : '#6366f1' // indigo
  };
  
  return colors[key] || (alpha < 1 ? `rgba(107, 114, 128, ${alpha})` : '#6b7280'); // gray
}

/**
 * Converte cor de label do Trello para hex
 * 
 * @param {string} trelloColor - Cor do Trello (ex: 'blue', 'green')
 * @returns {string} Cor em formato hex
 */
function getLabelColor(trelloColor) {
  const colorMap = {
    green: '#10b981',
    yellow: '#f59e0b',
    orange: '#f97316',
    red: '#ef4444',
    purple: '#8b5cf6',
    blue: '#3b82f6',
    sky: '#0ea5e9',
    lime: '#84cc16',
    pink: '#ec4899',
    black: '#1f2937',
    gray: '#6b7280'
  };
  
  return colorMap[trelloColor] || '#6b7280';
}

/**
 * ==============================================
 * EXPORTAÇÕES DE CONTRATOS (para TypeScript/JSDoc)
 * ==============================================
 */

/**
 * Formatos de chart disponíveis
 */
export const CHART_FORMATS = {
  LINE: 'line',
  BAR: 'bar',
  HORIZONTAL_BAR: 'horizontalBar',
  STACKED_BAR: 'stackedBar',
  PIE: 'pie',
  DOUGHNUT: 'doughnut',
  METRIC_CARD: 'metricCard'
};

/**
 * Bibliotecas de gráfico suportadas
 */
export const CHART_LIBRARIES = {
  CHARTJS: 'chartjs',
  RECHARTS: 'recharts',
  NATIVE: 'native'
};

/**
 * Adaptador universal - detecta formato e biblioteca automaticamente
 * 
 * @param {any} data - Dados processados
 * @param {string} sourceType - Tipo da fonte: 'evolution', 'label', 'list', 'member', 'status'
 * @param {string} chartType - Tipo de gráfico desejado
 * @param {string} library - Biblioteca alvo
 * @param {Object} options - Opções adicionais
 * @returns {any} Dados adaptados
 */
export function adaptData(data, sourceType, chartType, library = CHART_LIBRARIES.CHARTJS, options = {}) {
  // Evolution data
  if (sourceType === 'evolution') {
    if (chartType === CHART_FORMATS.LINE) {
      return library === CHART_LIBRARIES.RECHARTS 
        ? adaptEvolutionToRechartsLine(data)
        : adaptEvolutionToLineChart(data);
    }
  }
  
  // Label analysis
  if (sourceType === 'label') {
    if (chartType === CHART_FORMATS.BAR) {
      return library === CHART_LIBRARIES.RECHARTS
        ? adaptLabelAnalysisToRechartsBar(data)
        : adaptLabelAnalysisToBarChart(data, options.metric);
    }
    if (chartType === CHART_FORMATS.METRIC_CARD) {
      return adaptLabelSummaryToMetricCards(data);
    }
  }
  
  // List analysis
  if (sourceType === 'list') {
    if (chartType === CHART_FORMATS.STACKED_BAR) {
      return library === CHART_LIBRARIES.RECHARTS
        ? adaptListAnalysisToRechartsStackedBar(data)
        : adaptListAnalysisToStackedBarChart(data);
    }
  }
  
  // Member analysis
  if (sourceType === 'member') {
    if (chartType === CHART_FORMATS.HORIZONTAL_BAR) {
      return adaptMemberAnalysisToHorizontalBarChart(data, options.metric, options.limit);
    }
    if (chartType === CHART_FORMATS.METRIC_CARD) {
      return adaptMemberSummaryToMetricCards(data);
    }
  }
  
  // Status distribution
  if (sourceType === 'status') {
    if (chartType === CHART_FORMATS.PIE) {
      return library === CHART_LIBRARIES.RECHARTS
        ? adaptStatusToRechartsPie(data)
        : adaptStatusToPieChart(data);
    }
  }
  
  // Default: return data as-is
  console.warn(`No adapter found for ${sourceType} -> ${chartType} (${library})`);
  return data;
}
