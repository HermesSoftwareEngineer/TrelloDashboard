/**
 * STATUS CHART PROCESSOR
 * 
 * Lógica para classificação e agregação de status dos cards por período.
 * Gera dados para gráfico de pizza mostrando distribuição de status.
 */

/**
 * Classifica um card em uma das três categorias de status
 * 
 * REGRAS DE CLASSIFICAÇÃO (mutuamente exclusivas, por ordem de prioridade):
 * 1. CONCLUÍDO: Card concluído dentro do período (maior prioridade)
 * 2. NOVO: Card criado no período e não concluído dentro dele
 * 3. EM ANDAMENTO: Card criado antes/durante período, não concluído ou concluído após período
 * 
 * @param {Object} card - Card normalizado
 * @param {Date} startDate - Data inicial do período
 * @param {Date} endDate - Data final do período
 * @returns {'completed'|'new'|'in-progress'} Status do card
 */
export function classifyCardStatus(card, startDate, endDate) {
  if (!card) return null;

  const createdAt = card.creationDate ? new Date(card.creationDate) : null;
  const completedAt = card.completionDate ? new Date(card.completionDate) : null;

  if (!createdAt) return null; // Card sem data de criação não pode ser classificado

  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Normalizar para comparação (início do dia)
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  // 1. PRIORIDADE ALTA: Concluído no período
  if (completedAt && completedAt >= start && completedAt <= end) {
    return 'completed';
  }

  // 2. PRIORIDADE MÉDIA: Novo no período (criado no período e não concluído nele)
  if (createdAt >= start && createdAt <= end) {
    return 'new';
  }

  // 3. PRIORIDADE BAIXA: Em andamento
  // - Criado antes ou durante o período
  // - Não concluído, ou concluído após o período
  if (createdAt <= end && (!completedAt || completedAt > end)) {
    return 'in-progress';
  }

  // Card não relevante para este período
  return null;
}

/**
 * Conta cards por categoria de status
 * 
 * @param {Array} cards - Array de cards normalizados
 * @param {Date} startDate - Data inicial do período
 * @param {Date} endDate - Data final do período
 * @returns {Object} Objeto com contadores por status
 */
export function countCardsByStatus(cards, startDate, endDate) {
  const counts = {
    new: 0,
    'in-progress': 0,
    completed: 0,
    total: 0
  };

  if (!Array.isArray(cards)) return counts;

  cards.forEach(card => {
    const status = classifyCardStatus(card, startDate, endDate);
    if (status) {
      counts[status]++;
      counts.total++;
    }
  });

  return counts;
}

/**
 * Filtra cards por status específico
 * 
 * @param {Array} cards - Array de cards normalizados
 * @param {'new'|'in-progress'|'completed'} status - Status desejado
 * @param {Date} startDate - Data inicial do período
 * @param {Date} endDate - Data final do período
 * @returns {Array} Cards que pertencem ao status especificado
 */
export function filterCardsByStatus(cards, status, startDate, endDate) {
  if (!Array.isArray(cards)) return [];
  
  return cards.filter(card => 
    classifyCardStatus(card, startDate, endDate) === status
  );
}

/**
 * Gera dataset para gráfico de pizza de status
 * 
 * ESTRUTURA DO DATASET:
 * - labels: Array com nomes das categorias
 * - data: Array com valores numéricos
 * - total: Soma total de cards
 * - percentages: Array com percentuais de cada categoria
 * - colors: Cores sugeridas para cada categoria
 * 
 * @param {Array} cards - Array de cards normalizados
 * @param {Date} startDate - Data inicial do período
 * @param {Date} endDate - Data final do período
 * @param {Object} options - Opções de customização
 * @returns {Object} Dataset estruturado para gráfico de pizza
 */
export function generateStatusDataset(cards, startDate, endDate, options = {}) {
  const {
    labelMap = {
      new: 'Novos no período',
      'in-progress': 'Em andamento',
      completed: 'Concluídos no período'
    },
    colorMap = {
      new: '#3B82F6',        // Azul - Novos
      'in-progress': '#F59E0B', // Amarelo/Laranja - Em andamento
      completed: '#10B981'   // Verde - Concluídos
    },
    order = ['new', 'in-progress', 'completed'] // Ordem de exibição
  } = options;

  const counts = countCardsByStatus(cards, startDate, endDate);
  
  const labels = [];
  const data = [];
  const colors = [];
  const percentages = [];

  order.forEach(status => {
    const count = counts[status] || 0;
    const percentage = counts.total > 0 
      ? Number(((count / counts.total) * 100).toFixed(1))
      : 0;

    labels.push(labelMap[status]);
    data.push(count);
    colors.push(colorMap[status]);
    percentages.push(percentage);
  });

  return {
    labels,
    datasets: [{
      data,
      backgroundColor: colors,
      borderWidth: 2,
      borderColor: '#ffffff'
    }],
    total: counts.total,
    percentages,
    metadata: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      generatedAt: new Date().toISOString()
    }
  };
}

/**
 * Gera resumo detalhado de status com informações adicionais
 * 
 * @param {Array} cards - Array de cards normalizados
 * @param {Date} startDate - Data inicial do período
 * @param {Date} endDate - Data final do período
 * @returns {Object} Resumo completo com contadores, percentuais e cards detalhados
 */
export function getStatusSummary(cards, startDate, endDate) {
  const counts = countCardsByStatus(cards, startDate, endDate);
  
  const summary = {
    period: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      days: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1
    },
    totals: {
      new: counts.new,
      inProgress: counts['in-progress'],
      completed: counts.completed,
      total: counts.total
    },
    percentages: {
      new: counts.total > 0 ? Number(((counts.new / counts.total) * 100).toFixed(1)) : 0,
      inProgress: counts.total > 0 ? Number(((counts['in-progress'] / counts.total) * 100).toFixed(1)) : 0,
      completed: counts.total > 0 ? Number(((counts.completed / counts.total) * 100).toFixed(1)) : 0
    },
    cards: {
      new: filterCardsByStatus(cards, 'new', startDate, endDate),
      inProgress: filterCardsByStatus(cards, 'in-progress', startDate, endDate),
      completed: filterCardsByStatus(cards, 'completed', startDate, endDate)
    }
  };

  return summary;
}

/**
 * Gera dataset simplificado (apenas valores numéricos)
 * Útil para exibição rápida de números sem gráfico
 * 
 * @param {Array} cards - Array de cards normalizados
 * @param {Date} startDate - Data inicial do período
 * @param {Date} endDate - Data final do período
 * @returns {Object} Objeto com contadores simples
 */
export function getStatusCounts(cards, startDate, endDate) {
  const counts = countCardsByStatus(cards, startDate, endDate);
  
  return {
    new: counts.new,
    inProgress: counts['in-progress'],
    completed: counts.completed,
    total: counts.total
  };
}

/**
 * Calcula métricas de desempenho baseadas no status
 * 
 * @param {Array} cards - Array de cards normalizados
 * @param {Date} startDate - Data inicial do período
 * @param {Date} endDate - Data final do período
 * @returns {Object} Métricas de desempenho
 */
export function calculateStatusMetrics(cards, startDate, endDate) {
  const counts = countCardsByStatus(cards, startDate, endDate);
  const periodDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

  const metrics = {
    // Taxa de conclusão = concluídos / (novos + em andamento + concluídos)
    completionRate: counts.total > 0 
      ? Number(((counts.completed / counts.total) * 100).toFixed(1))
      : 0,
    
    // Taxa de entrada = novos / total
    intakeRate: counts.total > 0
      ? Number(((counts.new / counts.total) * 100).toFixed(1))
      : 0,
    
    // Taxa de trabalho em andamento = em andamento / total
    wipRate: counts.total > 0
      ? Number(((counts['in-progress'] / counts.total) * 100).toFixed(1))
      : 0,
    
    // Média diária de conclusões
    avgCompletionsPerDay: Number((counts.completed / periodDays).toFixed(2)),
    
    // Média diária de novos cards
    avgNewPerDay: Number((counts.new / periodDays).toFixed(2)),
    
    // Indicador de saúde (completed >= new + in-progress/2)
    healthScore: calculateHealthScore(counts),
    
    // Classificação de saúde
    healthStatus: getHealthStatus(calculateHealthScore(counts))
  };

  return metrics;
}

/**
 * Calcula score de saúde do processo (0-100)
 * 
 * Lógica:
 * - Se concluídos >= novos: score alto (60-100)
 * - Balance entre entrada e saída
 * - Penaliza excesso de WIP
 * 
 * @param {Object} counts - Contadores de status
 * @returns {number} Score de 0 a 100
 */
function calculateHealthScore(counts) {
  if (counts.total === 0) return 0;

  let score = 50; // Base score

  // Fator 1: Taxa de conclusão (0-40 pontos)
  const completionRatio = counts.completed / counts.total;
  score += completionRatio * 40;

  // Fator 2: Balance entrada/saída (0-20 pontos)
  if (counts.completed >= counts.new) {
    score += 20; // Concluindo mais ou igual ao que entra
  } else if (counts.new > 0) {
    const balance = counts.completed / counts.new;
    score += balance * 20;
  }

  // Fator 3: WIP controlado (-10 a +10 pontos)
  const wipRatio = counts['in-progress'] / counts.total;
  if (wipRatio <= 0.3) {
    score += 10; // WIP saudável
  } else if (wipRatio > 0.5) {
    score -= 10; // WIP excessivo
  }

  // Limita entre 0 e 100
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Retorna classificação textual do health score
 * 
 * @param {number} score - Score de saúde (0-100)
 * @returns {string} Classificação
 */
function getHealthStatus(score) {
  if (score >= 80) return 'Excelente';
  if (score >= 60) return 'Bom';
  if (score >= 40) return 'Regular';
  if (score >= 20) return 'Atenção';
  return 'Crítico';
}

/**
 * Compara status entre dois períodos
 * 
 * @param {Array} cards - Array de cards normalizados
 * @param {Date} period1Start - Início do período 1
 * @param {Date} period1End - Fim do período 1
 * @param {Date} period2Start - Início do período 2
 * @param {Date} period2End - Fim do período 2
 * @returns {Object} Comparação entre períodos
 */
export function compareStatusBetweenPeriods(
  cards, 
  period1Start, 
  period1End, 
  period2Start, 
  period2End
) {
  const period1Counts = countCardsByStatus(cards, period1Start, period1End);
  const period2Counts = countCardsByStatus(cards, period2Start, period2End);

  const comparison = {
    period1: {
      startDate: period1Start.toISOString(),
      endDate: period1End.toISOString(),
      counts: period1Counts
    },
    period2: {
      startDate: period2Start.toISOString(),
      endDate: period2End.toISOString(),
      counts: period2Counts
    },
    changes: {
      new: {
        absolute: period2Counts.new - period1Counts.new,
        percentage: period1Counts.new > 0 
          ? Number((((period2Counts.new - period1Counts.new) / period1Counts.new) * 100).toFixed(1))
          : (period2Counts.new > 0 ? 100 : 0)
      },
      inProgress: {
        absolute: period2Counts['in-progress'] - period1Counts['in-progress'],
        percentage: period1Counts['in-progress'] > 0
          ? Number((((period2Counts['in-progress'] - period1Counts['in-progress']) / period1Counts['in-progress']) * 100).toFixed(1))
          : (period2Counts['in-progress'] > 0 ? 100 : 0)
      },
      completed: {
        absolute: period2Counts.completed - period1Counts.completed,
        percentage: period1Counts.completed > 0
          ? Number((((period2Counts.completed - period1Counts.completed) / period1Counts.completed) * 100).toFixed(1))
          : (period2Counts.completed > 0 ? 100 : 0)
      },
      total: {
        absolute: period2Counts.total - period1Counts.total,
        percentage: period1Counts.total > 0
          ? Number((((period2Counts.total - period1Counts.total) / period1Counts.total) * 100).toFixed(1))
          : (period2Counts.total > 0 ? 100 : 0)
      }
    }
  };

  return comparison;
}

/**
 * Exportações padrão para uso simplificado
 */
export default {
  classifyCardStatus,
  countCardsByStatus,
  filterCardsByStatus,
  generateStatusDataset,
  getStatusSummary,
  getStatusCounts,
  calculateStatusMetrics,
  compareStatusBetweenPeriods
};
