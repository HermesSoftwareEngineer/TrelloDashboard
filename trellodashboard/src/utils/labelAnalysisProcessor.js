/**
 * LABEL ANALYSIS PROCESSOR - ANÁLISE POR TIPO DE PROCESSO
 * 
 * Funções para análise de cards por labels (tipos de processo).
 * Agrupa processos por tipo e calcula métricas relevantes.
 * 
 * PROMPT 07: Análise por Tipo de Processo (Labels)
 * - Quantidade de processos em andamento por tipo
 * - Tempo médio de conclusão por tipo
 * - Datasets estruturados para gráficos de barras
 */

/**
 * Agrupa cards por label/tipo de processo
 * Um card pode ter múltiplas labels, então será contado em cada uma
 * 
 * @param {Array} cards - Array de cards normalizados
 * @returns {Object} Mapa com labelId como chave e array de cards como valor
 */
export function groupCardsByLabel(cards) {
  if (!Array.isArray(cards)) return {};
  
  const grouped = {};
  
  cards.forEach(card => {
    if (!card.processTypes || card.processTypes.length === 0) {
      // Cards sem label vão para categoria especial "no-label"
      if (!grouped['no-label']) {
        grouped['no-label'] = {
          id: 'no-label',
          name: 'Sem Tipo',
          color: 'gray',
          cards: []
        };
      }
      grouped['no-label'].cards.push(card);
    } else {
      // Adicionar card a cada label que possui
      card.processTypes.forEach(label => {
        if (!grouped[label.id]) {
          grouped[label.id] = {
            id: label.id,
            name: label.name,
            color: label.color,
            cards: []
          };
        }
        grouped[label.id].cards.push(card);
      });
    }
  });
  
  return grouped;
}

/**
 * Calcula quantidade de processos em andamento por tipo
 * 
 * Processos em andamento: não concluídos e não arquivados
 * 
 * @param {Array} cards - Array de cards normalizados
 * @param {Date} startDate - Data inicial do período (opcional)
 * @param {Date} endDate - Data final do período (opcional)
 * @returns {Array} Array de objetos com estatísticas por label
 */
export function countInProgressByLabel(cards, startDate = null, endDate = null) {
  if (!Array.isArray(cards)) return [];
  
  // Filtrar apenas cards em andamento
  let inProgressCards = cards.filter(card => 
    !card.isComplete && !card.isClosed
  );
  
  // Se período fornecido, filtrar cards criados até o final do período
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    inProgressCards = inProgressCards.filter(card => 
      card.creationDate && card.creationDate <= end
    );
  }
  
  // Agrupar por label
  const grouped = groupCardsByLabel(inProgressCards);
  
  // Converter para array de resultados
  const results = Object.values(grouped).map(group => ({
    labelId: group.id,
    labelName: group.name,
    labelColor: group.color,
    count: group.cards.length,
    cards: group.cards
  }));
  
  // Ordenar por quantidade (decrescente)
  return results.sort((a, b) => b.count - a.count);
}

/**
 * Calcula tempo médio de conclusão por tipo de processo
 * 
 * Considera apenas cards concluídos com tempo de processo válido.
 * 
 * @param {Array} cards - Array de cards normalizados
 * @param {Date} startDate - Data inicial do período (opcional - filtra por conclusão)
 * @param {Date} endDate - Data final do período (opcional - filtra por conclusão)
 * @returns {Array} Array de objetos com tempo médio por label
 */
export function calculateAvgTimeByLabel(cards, startDate = null, endDate = null) {
  if (!Array.isArray(cards)) return [];
  
  // Filtrar apenas cards concluídos com tempo válido
  let completedCards = cards.filter(card => 
    card.isComplete && 
    card.processTimeDays !== null && 
    card.processTimeDays >= 0
  );
  
  // Se período fornecido, filtrar por data de conclusão
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    completedCards = completedCards.filter(card => 
      card.completionDate && 
      card.completionDate >= start && 
      card.completionDate <= end
    );
  }
  
  // Agrupar por label
  const grouped = groupCardsByLabel(completedCards);
  
  // Calcular tempo médio para cada label
  const results = Object.values(grouped).map(group => {
    const validCards = group.cards.filter(card => 
      card.processTimeDays !== null && card.processTimeDays >= 0
    );
    
    if (validCards.length === 0) {
      return {
        labelId: group.id,
        labelName: group.name,
        labelColor: group.color,
        avgTimeDays: 0,
        count: 0,
        minTimeDays: 0,
        maxTimeDays: 0
      };
    }
    
    const times = validCards.map(card => card.processTimeDays);
    const total = times.reduce((sum, time) => sum + time, 0);
    const avgTime = total / validCards.length;
    
    return {
      labelId: group.id,
      labelName: group.name,
      labelColor: group.color,
      avgTimeDays: Number(avgTime.toFixed(2)),
      count: validCards.length,
      minTimeDays: Math.min(...times),
      maxTimeDays: Math.max(...times)
    };
  });
  
  // Ordenar por tempo médio (decrescente)
  return results.sort((a, b) => b.avgTimeDays - a.avgTimeDays);
}

/**
 * Gera dataset completo por label para análise
 * 
 * Combina todas as métricas em um único dataset estruturado.
 * Ideal para gráficos de barras e análises comparativas.
 * 
 * @param {Array} cards - Array de cards normalizados
 * @param {Date} startDate - Data inicial do período (opcional)
 * @param {Date} endDate - Data final do período (opcional)
 * @returns {Array} Array de objetos com análise completa por label
 */
export function generateLabelAnalysisDataset(cards, startDate = null, endDate = null) {
  if (!Array.isArray(cards)) return [];
  
  // Aplicar filtro de período se fornecido
  let filteredCards = cards;
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    filteredCards = cards.filter(card => {
      if (!card.creationDate) return false;
      // Incluir cards criados no período ou concluídos no período
      const createdInPeriod = card.creationDate >= start && card.creationDate <= end;
      const completedInPeriod = card.completionDate && 
                                card.completionDate >= start && 
                                card.completionDate <= end;
      return createdInPeriod || completedInPeriod;
    });
  }
  
  // Agrupar todos os cards por label
  const grouped = groupCardsByLabel(filteredCards);
  
  // Gerar estatísticas completas para cada label
  const results = Object.values(grouped).map(group => {
    const allCards = group.cards;
    const completedCards = allCards.filter(card => card.isComplete);
    const inProgressCards = allCards.filter(card => !card.isComplete && !card.isClosed);
    const archivedCards = allCards.filter(card => card.isClosed);
    
    // Tempo médio de conclusão
    const completedWithTime = completedCards.filter(card => 
      card.processTimeDays !== null && card.processTimeDays >= 0
    );
    const avgTime = completedWithTime.length > 0
      ? completedWithTime.reduce((sum, card) => sum + card.processTimeDays, 0) / completedWithTime.length
      : 0;
    
    return {
      labelId: group.id,
      labelName: group.name,
      labelColor: group.color,
      
      // Contadores
      total: allCards.length,
      completed: completedCards.length,
      inProgress: inProgressCards.length,
      archived: archivedCards.length,
      
      // Métricas de tempo
      avgCompletionTimeDays: Number(avgTime.toFixed(2)),
      completedWithTimeCount: completedWithTime.length,
      
      // Taxa de conclusão
      completionRate: allCards.length > 0 
        ? Number(((completedCards.length / allCards.length) * 100).toFixed(1))
        : 0,
      
      // Referência aos cards (para drilling down)
      cards: allCards
    };
  });
  
  // Ordenar por total de processos (decrescente)
  return results.sort((a, b) => b.total - a.total);
}

/**
 * Gera dataset estruturado para gráfico de barras
 * 
 * Formato otimizado para bibliotecas de gráficos como Chart.js ou Recharts.
 * 
 * @param {Array} cards - Array de cards normalizados
 * @param {Date} startDate - Data inicial do período (opcional)
 * @param {Date} endDate - Data final do período (opcional)
 * @returns {Object} Objeto com labels e datasets para gráfico
 */
export function generateLabelBarChartData(cards, startDate = null, endDate = null) {
  const analysis = generateLabelAnalysisDataset(cards, startDate, endDate);
  
  return {
    labels: analysis.map(item => item.labelName),
    datasets: {
      inProgress: {
        label: 'Em Andamento',
        data: analysis.map(item => item.inProgress),
        colors: analysis.map(item => item.labelColor)
      },
      completed: {
        label: 'Concluídos',
        data: analysis.map(item => item.completed),
        colors: analysis.map(item => item.labelColor)
      },
      avgTime: {
        label: 'Tempo Médio (dias)',
        data: analysis.map(item => item.avgCompletionTimeDays),
        colors: analysis.map(item => item.labelColor)
      }
    },
    rawData: analysis
  };
}

/**
 * Filtra cards por label específico
 * 
 * @param {Array} cards - Array de cards normalizados
 * @param {string} labelId - ID da label para filtrar
 * @returns {Array} Cards que possuem a label especificada
 */
export function filterCardsByLabel(cards, labelId) {
  if (!Array.isArray(cards)) return [];
  
  if (labelId === 'no-label') {
    return cards.filter(card => 
      !card.processTypes || card.processTypes.length === 0
    );
  }
  
  return cards.filter(card => 
    card.processTypes && card.processTypes.some(label => label.id === labelId)
  );
}

/**
 * Obtém lista de todas as labels únicas no conjunto de cards
 * 
 * @param {Array} cards - Array de cards normalizados
 * @returns {Array} Array de objetos com informações das labels
 */
export function getUniqueLabels(cards) {
  if (!Array.isArray(cards)) return [];
  
  const labelsMap = new Map();
  
  cards.forEach(card => {
    if (card.processTypes && card.processTypes.length > 0) {
      card.processTypes.forEach(label => {
        if (!labelsMap.has(label.id)) {
          labelsMap.set(label.id, {
            id: label.id,
            name: label.name,
            color: label.color
          });
        }
      });
    }
  });
  
  // Verificar se há cards sem label
  const hasNoLabel = cards.some(card => 
    !card.processTypes || card.processTypes.length === 0
  );
  
  const labels = Array.from(labelsMap.values());
  
  if (hasNoLabel) {
    labels.push({
      id: 'no-label',
      name: 'Sem Tipo',
      color: 'gray'
    });
  }
  
  return labels.sort((a, b) => a.name.localeCompare(b.name));
}
