/**
 * LIST ANALYSIS PROCESSOR - ANÁLISE POR LISTAS (PRIORIDADE)
 * 
 * Funções para análise de cards por lista do Trello.
 * As listas representam níveis de prioridade/urgência dos processos.
 * 
 * PROMPT 08: Análise por Listas (Prioridade)
 * - Total de processos por lista
 * - Novos, em andamento e concluídos por lista
 * - Tempo médio de permanência em cada lista
 * - Evolução temporal por lista
 * - Dataset por lista e métricas de permanência
 */

/**
 * Agrupa cards por lista
 * 
 * @param {Array} cards - Array de cards normalizados
 * @returns {Object} Mapa com listId como chave e dados da lista como valor
 */
export function groupCardsByList(cards) {
  if (!Array.isArray(cards)) return {};
  
  const grouped = {};
  
  cards.forEach(card => {
    if (!card.list || !card.list.id) {
      // Cards sem lista vão para categoria especial
      if (!grouped['no-list']) {
        grouped['no-list'] = {
          id: 'no-list',
          name: 'Sem Lista',
          position: 999,
          cards: []
        };
      }
      grouped['no-list'].cards.push(card);
    } else {
      if (!grouped[card.list.id]) {
        grouped[card.list.id] = {
          id: card.list.id,
          name: card.list.name,
          position: card.list.position,
          cards: []
        };
      }
      grouped[card.list.id].cards.push(card);
    }
  });
  
  return grouped;
}

/**
 * Calcula total de processos por lista
 * 
 * @param {Array} cards - Array de cards normalizados
 * @param {boolean} excludeArchived - Excluir cards arquivados (padrão: true)
 * @returns {Array} Array de objetos com contagens por lista
 */
export function countCardsByList(cards, excludeArchived = true) {
  if (!Array.isArray(cards)) return [];
  
  // Filtrar arquivados se necessário
  const filteredCards = excludeArchived 
    ? cards.filter(card => !card.isClosed)
    : cards;
  
  // Agrupar por lista
  const grouped = groupCardsByList(filteredCards);
  
  // Converter para array de resultados
  const results = Object.values(grouped).map(group => ({
    listId: group.id,
    listName: group.name,
    position: group.position,
    count: group.cards.length,
    cards: group.cards
  }));
  
  // Ordenar por posição da lista
  return results.sort((a, b) => a.position - b.position);
}

/**
 * Classifica um card em status contextual (novo, em andamento, concluído)
 * baseado em sua data de criação/conclusão e período
 * 
 * @param {Object} card - Card normalizado
 * @param {Date} startDate - Data inicial do período
 * @param {Date} endDate - Data final do período
 * @returns {string} Status: 'new', 'in-progress', 'completed', ou null
 */
function classifyCardStatusInPeriod(card, startDate, endDate) {
  if (!card.creationDate) return null;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  
  // Concluído no período
  if (card.completionDate && 
      card.completionDate >= start && 
      card.completionDate <= end) {
    return 'completed';
  }
  
  // Novo no período (criado no período e não concluído nele)
  if (card.creationDate >= start && card.creationDate <= end) {
    return 'new';
  }
  
  // Em andamento (criado antes/durante período, não concluído no período)
  if (card.creationDate <= end && 
      (!card.completionDate || card.completionDate > end)) {
    return 'in-progress';
  }
  
  return null;
}

/**
 * Calcula distribuição de status por lista
 * 
 * @param {Array} cards - Array de cards normalizados
 * @param {Date} startDate - Data inicial do período (opcional)
 * @param {Date} endDate - Data final do período (opcional)
 * @returns {Array} Array de objetos com distribuição por lista
 */
export function calculateStatusByList(cards, startDate = null, endDate = null) {
  if (!Array.isArray(cards)) return [];
  
  // Filtrar cards não arquivados
  const activeCards = cards.filter(card => !card.isClosed);
  
  // Agrupar por lista
  const grouped = groupCardsByList(activeCards);
  
  // Calcular distribuição para cada lista
  const results = Object.values(grouped).map(group => {
    let newCount = 0;
    let inProgressCount = 0;
    let completedCount = 0;
    
    if (startDate && endDate) {
      // Com período: usar classificação temporal
      group.cards.forEach(card => {
        const status = classifyCardStatusInPeriod(card, startDate, endDate);
        if (status === 'new') newCount++;
        else if (status === 'in-progress') inProgressCount++;
        else if (status === 'completed') completedCount++;
      });
    } else {
      // Sem período: usar status atual do card
      group.cards.forEach(card => {
        if (card.status === 'Novo') newCount++;
        else if (card.status === 'Em Andamento') inProgressCount++;
        else if (card.status === 'Concluído') completedCount++;
      });
    }
    
    const total = newCount + inProgressCount + completedCount;
    
    return {
      listId: group.id,
      listName: group.name,
      position: group.position,
      
      // Contadores
      new: newCount,
      inProgress: inProgressCount,
      completed: completedCount,
      total: total,
      
      // Percentuais
      newPercentage: total > 0 ? Number(((newCount / total) * 100).toFixed(1)) : 0,
      inProgressPercentage: total > 0 ? Number(((inProgressCount / total) * 100).toFixed(1)) : 0,
      completedPercentage: total > 0 ? Number(((completedCount / total) * 100).toFixed(1)) : 0,
      
      cards: group.cards
    };
  });
  
  // Ordenar por posição da lista
  return results.sort((a, b) => a.position - b.position);
}

/**
 * Calcula tempo médio de processo dos cards em cada lista
 * 
 * Nota: Este é o tempo médio de processo (criação até conclusão) dos cards
 * que estão atualmente em cada lista, não o tempo de permanência na lista.
 * 
 * @param {Array} cards - Array de cards normalizados
 * @returns {Array} Array de objetos com tempo médio por lista
 */
export function calculateAvgProcessTimeByList(cards) {
  if (!Array.isArray(cards)) return [];
  
  // Filtrar apenas cards concluídos com tempo válido
  const completedCards = cards.filter(card => 
    card.isComplete && 
    card.processTimeDays !== null && 
    card.processTimeDays >= 0
  );
  
  // Agrupar por lista
  const grouped = groupCardsByList(completedCards);
  
  // Calcular tempo médio para cada lista
  const results = Object.values(grouped).map(group => {
    const times = group.cards.map(card => card.processTimeDays);
    const avgTime = times.length > 0
      ? times.reduce((sum, time) => sum + time, 0) / times.length
      : 0;
    
    return {
      listId: group.id,
      listName: group.name,
      position: group.position,
      avgProcessTimeDays: Number(avgTime.toFixed(2)),
      count: times.length,
      minTimeDays: times.length > 0 ? Math.min(...times) : 0,
      maxTimeDays: times.length > 0 ? Math.max(...times) : 0,
      cards: group.cards
    };
  });
  
  // Ordenar por posição da lista
  return results.sort((a, b) => a.position - b.position);
}

/**
 * Gera dataset de evolução temporal por lista
 * 
 * Mostra como os cards foram criados e concluídos ao longo do tempo em cada lista.
 * 
 * @param {Array} cards - Array de cards normalizados
 * @param {Date} startDate - Data inicial do período
 * @param {Date} endDate - Data final do período
 * @param {string} granularity - 'daily', 'weekly', ou 'monthly'
 * @returns {Object} Objeto com séries temporais por lista
 */
export function generateListEvolutionDataset(cards, startDate, endDate, granularity = 'daily') {
  if (!Array.isArray(cards) || !startDate || !endDate) return {};
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  
  // Função auxiliar para formatar data conforme granularidade
  const formatDate = (date, gran) => {
    const d = new Date(date);
    switch (gran) {
      case 'daily':
        return d.toISOString().split('T')[0]; // YYYY-MM-DD
      case 'weekly': {
        // Início da semana (segunda-feira)
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        return monday.toISOString().split('T')[0];
      }
      case 'monthly': {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
      }
      default:
        return d.toISOString().split('T')[0];
    }
  };
  
  // Gerar todas as datas do período
  const dateKeys = new Set();
  const current = new Date(start);
  while (current <= end) {
    dateKeys.add(formatDate(current, granularity));
    switch (granularity) {
      case 'daily':
        current.setDate(current.getDate() + 1);
        break;
      case 'weekly':
        current.setDate(current.getDate() + 7);
        break;
      case 'monthly':
        current.setMonth(current.getMonth() + 1);
        break;
    }
  }
  
  // Agrupar cards por lista
  const grouped = groupCardsByList(cards);
  
  // Para cada lista, calcular evolução temporal
  const evolution = {};
  
  Object.values(grouped).forEach(group => {
    // Inicializar contadores para cada data
    const created = {};
    const completed = {};
    dateKeys.forEach(key => {
      created[key] = 0;
      completed[key] = 0;
    });
    
    // Contar cards criados e concluídos por data
    group.cards.forEach(card => {
      // Cards criados no período
      if (card.creationDate && card.creationDate >= start && card.creationDate <= end) {
        const key = formatDate(card.creationDate, granularity);
        if (created[key] !== undefined) {
          created[key]++;
        }
      }
      
      // Cards concluídos no período
      if (card.completionDate && card.completionDate >= start && card.completionDate <= end) {
        const key = formatDate(card.completionDate, granularity);
        if (completed[key] !== undefined) {
          completed[key]++;
        }
      }
    });
    
    evolution[group.id] = {
      listId: group.id,
      listName: group.name,
      position: group.position,
      created: created,
      completed: completed,
      dates: Array.from(dateKeys).sort()
    };
  });
  
  return evolution;
}

/**
 * Gera dataset completo por lista para análise
 * 
 * Combina todas as métricas em um único dataset estruturado.
 * 
 * @param {Array} cards - Array de cards normalizados
 * @param {Date} startDate - Data inicial do período (opcional)
 * @param {Date} endDate - Data final do período (opcional)
 * @returns {Array} Array de objetos com análise completa por lista
 */
export function generateListAnalysisDataset(cards, startDate = null, endDate = null) {
  if (!Array.isArray(cards)) return [];
  
  // Filtrar cards não arquivados
  const activeCards = cards.filter(card => !card.isClosed);
  
  // Aplicar filtro de período se fornecido
  let filteredCards = activeCards;
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    filteredCards = activeCards.filter(card => {
      if (!card.creationDate) return false;
      // Incluir cards criados no período ou concluídos no período
      const createdInPeriod = card.creationDate >= start && card.creationDate <= end;
      const completedInPeriod = card.completionDate && 
                                card.completionDate >= start && 
                                card.completionDate <= end;
      return createdInPeriod || completedInPeriod;
    });
  }
  
  // Agrupar por lista
  const grouped = groupCardsByList(filteredCards);
  
  // Gerar estatísticas completas para cada lista
  const results = Object.values(grouped).map(group => {
    const allCards = group.cards;
    
    // Classificar por status
    let newCount = 0;
    let inProgressCount = 0;
    let completedCount = 0;
    
    if (startDate && endDate) {
      allCards.forEach(card => {
        const status = classifyCardStatusInPeriod(card, startDate, endDate);
        if (status === 'new') newCount++;
        else if (status === 'in-progress') inProgressCount++;
        else if (status === 'completed') completedCount++;
      });
    } else {
      allCards.forEach(card => {
        if (card.status === 'Novo') newCount++;
        else if (card.status === 'Em Andamento') inProgressCount++;
        else if (card.status === 'Concluído') completedCount++;
      });
    }
    
    // Calcular tempo médio de processo
    const completedWithTime = allCards.filter(card => 
      card.isComplete && 
      card.processTimeDays !== null && 
      card.processTimeDays >= 0
    );
    const avgTime = completedWithTime.length > 0
      ? completedWithTime.reduce((sum, card) => sum + card.processTimeDays, 0) / completedWithTime.length
      : 0;
    
    return {
      listId: group.id,
      listName: group.name,
      position: group.position,
      
      // Contadores por status
      total: allCards.length,
      new: newCount,
      inProgress: inProgressCount,
      completed: completedCount,
      
      // Percentuais
      newPercentage: allCards.length > 0 ? Number(((newCount / allCards.length) * 100).toFixed(1)) : 0,
      inProgressPercentage: allCards.length > 0 ? Number(((inProgressCount / allCards.length) * 100).toFixed(1)) : 0,
      completedPercentage: allCards.length > 0 ? Number(((completedCount / allCards.length) * 100).toFixed(1)) : 0,
      
      // Métricas de tempo
      avgProcessTimeDays: Number(avgTime.toFixed(2)),
      completedWithTimeCount: completedWithTime.length,
      
      // Taxa de conclusão
      completionRate: allCards.length > 0 
        ? Number(((completedCount / allCards.length) * 100).toFixed(1))
        : 0,
      
      // Referência aos cards
      cards: allCards
    };
  });
  
  // Ordenar por posição da lista
  return results.sort((a, b) => a.position - b.position);
}

/**
 * Filtra cards por lista específica
 * 
 * @param {Array} cards - Array de cards normalizados
 * @param {string} listId - ID da lista para filtrar
 * @returns {Array} Cards que estão na lista especificada
 */
export function filterCardsByList(cards, listId) {
  if (!Array.isArray(cards)) return [];
  
  if (listId === 'no-list') {
    return cards.filter(card => !card.list || !card.list.id);
  }
  
  return cards.filter(card => 
    card.list && card.list.id === listId
  );
}

/**
 * Obtém lista de todas as listas únicas no conjunto de cards
 * 
 * @param {Array} cards - Array de cards normalizados
 * @returns {Array} Array de objetos com informações das listas
 */
export function getUniqueLists(cards) {
  if (!Array.isArray(cards)) return [];
  
  const listsMap = new Map();
  
  cards.forEach(card => {
    if (card.list && card.list.id) {
      if (!listsMap.has(card.list.id)) {
        listsMap.set(card.list.id, {
          id: card.list.id,
          name: card.list.name,
          position: card.list.position
        });
      }
    }
  });
  
  const lists = Array.from(listsMap.values());
  
  // Ordenar por posição
  return lists.sort((a, b) => a.position - b.position);
}

/**
 * Gera comparação de performance entre listas
 * 
 * @param {Array} cards - Array de cards normalizados
 * @param {Date} startDate - Data inicial do período (opcional)
 * @param {Date} endDate - Data final do período (opcional)
 * @returns {Array} Array ordenado por performance (taxa de conclusão)
 */
export function generateListPerformanceComparison(cards, startDate = null, endDate = null) {
  const analysis = generateListAnalysisDataset(cards, startDate, endDate);
  
  // Ordenar por taxa de conclusão (decrescente)
  return analysis.sort((a, b) => b.completionRate - a.completionRate);
}
