/**
 * FLOW KPIs - INDICADORES DE VAZÃO
 * 
 * Funções puras para cálculo de KPIs de vazão de processos.
 * Todas as funções recebem cards normalizados e período como parâmetros.
 */

/**
 * Calcula total de novos processos criados no período
 * 
 * @param {Array} cards - Cards normalizados
 * @param {Date} startDate - Data inicial do período
 * @param {Date} endDate - Data final do período
 * @returns {number} Total de processos criados
 */
export function calculateNewProcesses(cards, startDate, endDate) {
  if (!Array.isArray(cards) || !startDate || !endDate) return 0;

  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return cards.filter(card => {
    if (!card.creationDate) return false;
    const creationDate = new Date(card.creationDate);
    return creationDate >= start && creationDate <= end;
  }).length;
}

/**
 * Calcula total de processos concluídos no período
 * 
 * @param {Array} cards - Cards normalizados
 * @param {Date} startDate - Data inicial do período
 * @param {Date} endDate - Data final do período
 * @returns {number} Total de processos concluídos
 */
export function calculateCompletedProcesses(cards, startDate, endDate) {
  if (!Array.isArray(cards) || !startDate || !endDate) return 0;

  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return cards.filter(card => {
    if (!card.completionDate) return false;
    const completionDate = new Date(card.completionDate);
    return completionDate >= start && completionDate <= end;
  }).length;
}

/**
 * Calcula total de processos em andamento no período
 * 
 * Considera cards:
 * - Criados antes ou durante o período
 * - Não concluídos ou concluídos após o período
 * 
 * @param {Array} cards - Cards normalizados
 * @param {Date} startDate - Data inicial do período
 * @param {Date} endDate - Data final do período
 * @returns {number} Total de processos em andamento
 */
export function calculateInProgressProcesses(cards, startDate, endDate) {
  if (!Array.isArray(cards) || !startDate || !endDate) return 0;

  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return cards.filter(card => {
    if (!card.creationDate) return false;
    
    const creationDate = new Date(card.creationDate);
    const completionDate = card.completionDate ? new Date(card.completionDate) : null;

    // Criado antes ou durante o período
    const wasCreatedBeforeOrDuring = creationDate <= end;
    
    // Não concluído ou concluído após o período
    const isNotCompletedInPeriod = !completionDate || completionDate > end;

    return wasCreatedBeforeOrDuring && isNotCompletedInPeriod;
  }).length;
}

/**
 * Calcula média de novos processos por dia no período
 * 
 * @param {Array} cards - Cards normalizados
 * @param {Date} startDate - Data inicial do período
 * @param {Date} endDate - Data final do período
 * @returns {number} Média diária de novos processos (2 decimais)
 */
export function calculateAvgNewPerDay(cards, startDate, endDate) {
  if (!Array.isArray(cards) || !startDate || !endDate) return 0;

  const totalNew = calculateNewProcesses(cards, startDate, endDate);
  const days = calculatePeriodDays(startDate, endDate);

  if (days === 0) return 0;

  return Number((totalNew / days).toFixed(2));
}

/**
 * Calcula média de processos concluídos por dia no período
 * 
 * @param {Array} cards - Cards normalizados
 * @param {Date} startDate - Data inicial do período
 * @param {Date} endDate - Data final do período
 * @returns {number} Média diária de processos concluídos (2 decimais)
 */
export function calculateAvgCompletedPerDay(cards, startDate, endDate) {
  if (!Array.isArray(cards) || !startDate || !endDate) return 0;

  const totalCompleted = calculateCompletedProcesses(cards, startDate, endDate);
  const days = calculatePeriodDays(startDate, endDate);

  if (days === 0) return 0;

  return Number((totalCompleted / days).toFixed(2));
}

/**
 * Calcula tempo médio de processo (em dias)
 * 
 * Considera apenas cards concluídos.
 * Tempo = diferença entre data de conclusão e data de criação.
 * 
 * @param {Array} cards - Cards normalizados
 * @param {Date} startDate - Data inicial do período (opcional - filtra por conclusão)
 * @param {Date} endDate - Data final do período (opcional - filtra por conclusão)
 * @returns {number} Tempo médio em dias (2 decimais)
 */
export function calculateAvgProcessTime(cards, startDate = null, endDate = null) {
  if (!Array.isArray(cards)) return 0;

  // Filtrar cards concluídos
  let completedCards = cards.filter(card => 
    card.completionDate && card.creationDate
  );

  // Se período fornecido, filtrar por data de conclusão
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    completedCards = completedCards.filter(card => {
      const completionDate = new Date(card.completionDate);
      return completionDate >= start && completionDate <= end;
    });
  }

  if (completedCards.length === 0) return 0;

  // Calcular tempo de cada card em dias
  const processTimes = completedCards.map(card => {
    const created = new Date(card.creationDate);
    const completed = new Date(card.completionDate);
    const diffMs = completed - created;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays;
  });

  // Média dos tempos
  const totalTime = processTimes.reduce((sum, time) => sum + time, 0);
  const avgTime = totalTime / processTimes.length;

  return Number(avgTime.toFixed(2));
}

/**
 * Calcula número de dias no período (inclusive)
 * 
 * @param {Date} startDate - Data inicial
 * @param {Date} endDate - Data final
 * @returns {number} Número de dias
 */
export function calculatePeriodDays(startDate, endDate) {
  if (!startDate || !endDate) return 0;

  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diffMs = end - start;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir ambos os dias

  return Math.max(1, diffDays); // Mínimo 1 dia
}

/**
 * Calcula todos os KPIs de vazão de uma vez
 * 
 * @param {Array} cards - Cards normalizados
 * @param {Date} startDate - Data inicial do período
 * @param {Date} endDate - Data final do período
 * @returns {Object} Objeto com todos os KPIs
 */
export function calculateAllFlowKPIs(cards, startDate, endDate) {
  if (!Array.isArray(cards) || !startDate || !endDate) {
    return {
      totalNew: 0,
      totalCompleted: 0,
      totalInProgress: 0,
      avgNewPerDay: 0,
      avgCompletedPerDay: 0,
      avgProcessTime: 0,
      periodDays: 0
    };
  }

  const totalNew = calculateNewProcesses(cards, startDate, endDate);
  const totalCompleted = calculateCompletedProcesses(cards, startDate, endDate);
  const totalInProgress = calculateInProgressProcesses(cards, startDate, endDate);
  const avgNewPerDay = calculateAvgNewPerDay(cards, startDate, endDate);
  const avgCompletedPerDay = calculateAvgCompletedPerDay(cards, startDate, endDate);
  const avgProcessTime = calculateAvgProcessTime(cards, startDate, endDate);
  const periodDays = calculatePeriodDays(startDate, endDate);

  return {
    totalNew,
    totalCompleted,
    totalInProgress,
    avgNewPerDay,
    avgCompletedPerDay,
    avgProcessTime,
    periodDays
  };
}

/**
 * Calcula KPIs com detalhamento adicional
 * 
 * Inclui:
 * - Todos os KPIs básicos
 * - Taxa de throughput (concluídos / novos)
 * - WIP (Work in Progress)
 * - Cycle efficiency
 * 
 * @param {Array} cards - Cards normalizados
 * @param {Date} startDate - Data inicial do período
 * @param {Date} endDate - Data final do período
 * @returns {Object} Objeto com KPIs detalhados
 */
export function calculateDetailedFlowKPIs(cards, startDate, endDate) {
  const basicKPIs = calculateAllFlowKPIs(cards, startDate, endDate);

  // Taxa de throughput (saída / entrada)
  const throughputRate = basicKPIs.totalNew > 0
    ? Number((basicKPIs.totalCompleted / basicKPIs.totalNew * 100).toFixed(1))
    : 0;

  // Classificação do throughput
  let throughputStatus = 'Equilibrado';
  if (throughputRate > 110) throughputStatus = 'Excelente';
  else if (throughputRate > 90) throughputStatus = 'Bom';
  else if (throughputRate < 70) throughputStatus = 'Atenção';
  else if (throughputRate < 50) throughputStatus = 'Crítico';

  // WIP vs Throughput (ideal: WIP baixo com Throughput alto)
  const wipThroughputRatio = basicKPIs.totalCompleted > 0
    ? Number((basicKPIs.totalInProgress / basicKPIs.totalCompleted).toFixed(2))
    : 0;

  return {
    ...basicKPIs,
    throughput: {
      rate: throughputRate,
      status: throughputStatus,
      balance: basicKPIs.totalCompleted - basicKPIs.totalNew
    },
    wip: {
      current: basicKPIs.totalInProgress,
      throughputRatio: wipThroughputRatio
    },
    velocity: {
      intake: basicKPIs.avgNewPerDay,
      output: basicKPIs.avgCompletedPerDay,
      netFlow: Number((basicKPIs.avgCompletedPerDay - basicKPIs.avgNewPerDay).toFixed(2))
    }
  };
}

/**
 * Valida consistência matemática dos KPIs
 * 
 * Verifica:
 * - Valores não negativos
 * - Médias consistentes com totais
 * - Período válido
 * 
 * @param {Object} kpis - Objeto retornado por calculateAllFlowKPIs
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
export function validateKPIs(kpis) {
  const errors = [];

  // Valores não negativos
  if (kpis.totalNew < 0) errors.push('totalNew não pode ser negativo');
  if (kpis.totalCompleted < 0) errors.push('totalCompleted não pode ser negativo');
  if (kpis.totalInProgress < 0) errors.push('totalInProgress não pode ser negativo');
  if (kpis.avgNewPerDay < 0) errors.push('avgNewPerDay não pode ser negativo');
  if (kpis.avgCompletedPerDay < 0) errors.push('avgCompletedPerDay não pode ser negativo');
  if (kpis.avgProcessTime < 0) errors.push('avgProcessTime não pode ser negativo');
  if (kpis.periodDays < 1) errors.push('periodDays deve ser pelo menos 1');

  // Validar médias
  const expectedAvgNew = kpis.periodDays > 0 
    ? Number((kpis.totalNew / kpis.periodDays).toFixed(2)) 
    : 0;
  if (Math.abs(kpis.avgNewPerDay - expectedAvgNew) > 0.01) {
    errors.push(`avgNewPerDay inconsistente: esperado ${expectedAvgNew}, recebido ${kpis.avgNewPerDay}`);
  }

  const expectedAvgCompleted = kpis.periodDays > 0
    ? Number((kpis.totalCompleted / kpis.periodDays).toFixed(2))
    : 0;
  if (Math.abs(kpis.avgCompletedPerDay - expectedAvgCompleted) > 0.01) {
    errors.push(`avgCompletedPerDay inconsistente: esperado ${expectedAvgCompleted}, recebido ${kpis.avgCompletedPerDay}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Compara KPIs entre dois períodos
 * 
 * @param {Array} cards - Cards normalizados
 * @param {Date} period1Start - Início período 1
 * @param {Date} period1End - Fim período 1
 * @param {Date} period2Start - Início período 2
 * @param {Date} period2End - Fim período 2
 * @returns {Object} Comparação entre períodos
 */
export function compareFlowKPIs(cards, period1Start, period1End, period2Start, period2End) {
  const kpis1 = calculateAllFlowKPIs(cards, period1Start, period1End);
  const kpis2 = calculateAllFlowKPIs(cards, period2Start, period2End);

  const calculateChange = (val1, val2) => {
    const absolute = val2 - val1;
    const percentage = val1 !== 0 
      ? Number(((absolute / val1) * 100).toFixed(1))
      : (val2 > 0 ? 100 : 0);
    return { absolute, percentage };
  };

  return {
    period1: {
      start: period1Start.toISOString(),
      end: period1End.toISOString(),
      kpis: kpis1
    },
    period2: {
      start: period2Start.toISOString(),
      end: period2End.toISOString(),
      kpis: kpis2
    },
    changes: {
      totalNew: calculateChange(kpis1.totalNew, kpis2.totalNew),
      totalCompleted: calculateChange(kpis1.totalCompleted, kpis2.totalCompleted),
      totalInProgress: calculateChange(kpis1.totalInProgress, kpis2.totalInProgress),
      avgNewPerDay: calculateChange(kpis1.avgNewPerDay, kpis2.avgNewPerDay),
      avgCompletedPerDay: calculateChange(kpis1.avgCompletedPerDay, kpis2.avgCompletedPerDay),
      avgProcessTime: calculateChange(kpis1.avgProcessTime, kpis2.avgProcessTime)
    }
  };
}

/**
 * Exportações padrão
 */
export default {
  calculateNewProcesses,
  calculateCompletedProcesses,
  calculateInProgressProcesses,
  calculateAvgNewPerDay,
  calculateAvgCompletedPerDay,
  calculateAvgProcessTime,
  calculatePeriodDays,
  calculateAllFlowKPIs,
  calculateDetailedFlowKPIs,
  validateKPIs,
  compareFlowKPIs
};
