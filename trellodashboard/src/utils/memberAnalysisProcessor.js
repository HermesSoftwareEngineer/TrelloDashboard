/**
 * MEMBER ANALYSIS PROCESSOR - ANÁLISE POR COLABORADOR
 * 
 * Funções para análise de performance e produtividade por membro.
 * Permite análise individual e comparativa entre colaboradores.
 * 
 * PROMPT 09: Análise por Colaborador
 * - Total atribuídos
 * - Total concluídos
 * - Total em andamento
 * - Produtividade média
 * - Tempo médio por tipo de processo
 * - Distribuição por lista
 * - Estrutura de dados por membro e funções reutilizáveis
 */

/**
 * Agrupa cards por membro
 * Um card pode ter múltiplos membros, então será contado para cada um
 * 
 * @param {Array} cards - Array de cards normalizados
 * @returns {Object} Mapa com memberId como chave e dados do membro como valor
 */
export function groupCardsByMember(cards) {
  if (!Array.isArray(cards)) return {};
  
  const grouped = {};
  
  cards.forEach(card => {
    if (!card.members || card.members.length === 0) {
      // Cards sem membro vão para categoria especial
      if (!grouped['no-member']) {
        grouped['no-member'] = {
          id: 'no-member',
          name: 'Sem Responsável',
          username: 'unassigned',
          avatarUrl: null,
          cards: []
        };
      }
      grouped['no-member'].cards.push(card);
    } else {
      // Adicionar card a cada membro que está atribuído
      card.members.forEach(member => {
        if (!grouped[member.id]) {
          grouped[member.id] = {
            id: member.id,
            name: member.name,
            username: member.username,
            avatarUrl: member.avatarUrl || null,
            cards: []
          };
        }
        grouped[member.id].cards.push(card);
      });
    }
  });
  
  return grouped;
}

/**
 * Calcula estatísticas básicas por membro
 * 
 * @param {Array} cards - Array de cards normalizados
 * @param {boolean} excludeArchived - Excluir cards arquivados (padrão: true)
 * @returns {Array} Array de objetos com estatísticas por membro
 */
export function calculateMemberBasicStats(cards, excludeArchived = true) {
  if (!Array.isArray(cards)) return [];
  
  // Filtrar arquivados se necessário
  const filteredCards = excludeArchived 
    ? cards.filter(card => !card.isClosed)
    : cards;
  
  // Agrupar por membro
  const grouped = groupCardsByMember(filteredCards);
  
  // Calcular estatísticas para cada membro
  const results = Object.values(grouped).map(group => {
    const allCards = group.cards;
    const completed = allCards.filter(card => card.isComplete);
    const inProgress = allCards.filter(card => !card.isComplete);
    
    return {
      memberId: group.id,
      memberName: group.name,
      username: group.username,
      avatarUrl: group.avatarUrl,
      
      // Contadores básicos
      totalAssigned: allCards.length,
      totalCompleted: completed.length,
      totalInProgress: inProgress.length,
      
      // Taxa de conclusão
      completionRate: allCards.length > 0 
        ? Number(((completed.length / allCards.length) * 100).toFixed(1))
        : 0,
      
      cards: allCards
    };
  });
  
  // Ordenar por total atribuído (decrescente)
  return results.sort((a, b) => b.totalAssigned - a.totalAssigned);
}

/**
 * Calcula produtividade média por membro
 * 
 * Produtividade = cards concluídos / tempo médio de conclusão
 * Produtividade média = cards concluídos / dia (considerando período)
 * 
 * @param {Array} cards - Array de cards normalizados
 * @param {Date} startDate - Data inicial do período (opcional)
 * @param {Date} endDate - Data final do período (opcional)
 * @returns {Array} Array de objetos com métricas de produtividade
 */
export function calculateMemberProductivity(cards, startDate = null, endDate = null) {
  if (!Array.isArray(cards)) return [];
  
  // Agrupar por membro
  const grouped = groupCardsByMember(cards);
  
  // Calcular dias do período
  let periodDays = null;
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    periodDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  }
  
  // Calcular produtividade para cada membro
  const results = Object.values(grouped).map(group => {
    const allCards = group.cards;
    
    // Filtrar cards concluídos no período (se fornecido)
    let completedCards = allCards.filter(card => card.isComplete && !card.isClosed);
    
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
    
    // Calcular tempo médio de processo
    const completedWithTime = completedCards.filter(card => 
      card.processTimeDays !== null && card.processTimeDays >= 0
    );
    const avgTime = completedWithTime.length > 0
      ? completedWithTime.reduce((sum, card) => sum + card.processTimeDays, 0) / completedWithTime.length
      : 0;
    
    // Calcular produtividade média (cards/dia no período)
    let avgPerDay = null;
    if (periodDays && periodDays > 0) {
      avgPerDay = Number((completedCards.length / periodDays).toFixed(2));
    }
    
    return {
      memberId: group.id,
      memberName: group.name,
      username: group.username,
      avatarUrl: group.avatarUrl,
      
      // Métricas de conclusão
      completedCount: completedCards.length,
      completedWithTimeCount: completedWithTime.length,
      avgProcessTimeDays: Number(avgTime.toFixed(2)),
      
      // Produtividade
      avgCompletedPerDay: avgPerDay,
      periodDays: periodDays,
      
      // Eficiência (inverso do tempo médio - quanto menor o tempo, maior a eficiência)
      efficiency: avgTime > 0 ? Number((1 / avgTime).toFixed(4)) : 0,
      
      cards: completedCards
    };
  });
  
  // Ordenar por cards concluídos (decrescente)
  return results.sort((a, b) => b.completedCount - a.completedCount);
}

/**
 * Calcula tempo médio por tipo de processo para cada membro
 * 
 * @param {Array} cards - Array de cards normalizados
 * @param {Date} startDate - Data inicial do período (opcional)
 * @param {Date} endDate - Data final do período (opcional)
 * @returns {Object} Objeto com memberId como chave e array de tempos por tipo
 */
export function calculateMemberTimeByProcessType(cards, startDate = null, endDate = null) {
  if (!Array.isArray(cards)) return {};
  
  // Filtrar apenas cards concluídos com datas disponíveis para calcular tempo
  let completedCards = cards.filter(card => 
    card.isComplete && 
    !card.isClosed &&
    card.completionDate &&
    card.creationDate
  );
  
  // Aplicar filtro de período se fornecido
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
  
  // Agrupar por membro
  const grouped = groupCardsByMember(completedCards);
  
  // Para cada membro, agrupar por tipo de processo
  const results = {};
  
  Object.values(grouped).forEach(group => {
    const typeStats = {};
    
    group.cards.forEach(card => {
      // Calcular tempo de processo inline (usa processTimeDays se válido, senão calcula das datas)
      const timeDays = (card.processTimeDays !== null && card.processTimeDays >= 0)
        ? card.processTimeDays
        : Math.round((new Date(card.completionDate) - new Date(card.creationDate)) / (1000 * 60 * 60 * 24));

      // Cards podem ter múltiplos tipos
      if (!card.processTypes || card.processTypes.length === 0) {
        // Sem tipo
        if (!typeStats['no-type']) {
          typeStats['no-type'] = {
            typeId: 'no-type',
            typeName: 'Sem Tipo',
            typeColor: 'gray',
            times: []
          };
        }
        typeStats['no-type'].times.push(timeDays);
      } else {
        card.processTypes.forEach(type => {
          if (!typeStats[type.id]) {
            typeStats[type.id] = {
              typeId: type.id,
              typeName: type.name,
              typeColor: type.color,
              times: []
            };
          }
          typeStats[type.id].times.push(timeDays);
        });
      }
    });
    
    // Calcular médias
    const processTypes = Object.values(typeStats).map(stat => {
      const avgTime = stat.times.reduce((sum, time) => sum + time, 0) / stat.times.length;
      return {
        typeId: stat.typeId,
        typeName: stat.typeName,
        typeColor: stat.typeColor,
        avgTimeDays: Number(avgTime.toFixed(2)),
        count: stat.times.length,
        minTimeDays: Math.min(...stat.times),
        maxTimeDays: Math.max(...stat.times)
      };
    });
    
    results[group.id] = {
      memberId: group.id,
      memberName: group.name,
      username: group.username,
      avatarUrl: group.avatarUrl,
      totalCards: group.cards.length,
      processTypes: processTypes.sort((a, b) => b.count - a.count)
    };
  });
  
  return results;
}

/**
 * Calcula distribuição de cards por lista para cada membro
 * 
 * @param {Array} cards - Array de cards normalizados
 * @param {boolean} excludeArchived - Excluir cards arquivados (padrão: true)
 * @returns {Object} Objeto com memberId como chave e distribuição por lista
 */
export function calculateMemberDistributionByList(cards, excludeArchived = true) {
  if (!Array.isArray(cards)) return {};
  
  // Filtrar arquivados se necessário
  const filteredCards = excludeArchived 
    ? cards.filter(card => !card.isClosed)
    : cards;
  
  // Agrupar por membro
  const grouped = groupCardsByMember(filteredCards);
  
  // Para cada membro, agrupar por lista
  const results = {};
  
  Object.values(grouped).forEach(group => {
    const listStats = {};
    
    group.cards.forEach(card => {
      const listId = card.list ? card.list.id : 'no-list';
      const listName = card.list ? card.list.name : 'Sem Lista';
      const listPosition = card.list ? card.list.position : 999;
      
      if (!listStats[listId]) {
        listStats[listId] = {
          listId: listId,
          listName: listName,
          listPosition: listPosition,
          count: 0,
          completed: 0,
          inProgress: 0
        };
      }
      
      listStats[listId].count++;
      if (card.isComplete) {
        listStats[listId].completed++;
      } else {
        listStats[listId].inProgress++;
      }
    });
    
    // Converter para array e ordenar por posição da lista
    const lists = Object.values(listStats).sort(
      (a, b) => a.listPosition - b.listPosition
    );
    
    results[group.id] = {
      memberId: group.id,
      memberName: group.name,
      username: group.username,
      avatarUrl: group.avatarUrl,
      totalCards: group.cards.length,
      lists: lists
    };
  });
  
  return results;
}

/**
 * Gera dataset completo por membro para análise
 * 
 * Combina todas as métricas em um único dataset estruturado.
 * 
 * @param {Array} cards - Array de cards normalizados
 * @param {Date} startDate - Data inicial do período (opcional)
 * @param {Date} endDate - Data final do período (opcional)
 * @returns {Array} Array de objetos com análise completa por membro
 */
export function generateMemberAnalysisDataset(cards, startDate = null, endDate = null) {
  if (!Array.isArray(cards)) return [];
  
  // Filtrar cards não arquivados
  const activeCards = cards.filter(card => !card.isClosed);
  
  // Aplicar filtro de período para cards relevantes
  let filteredCards = activeCards;
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    filteredCards = activeCards.filter(card => {
      if (!card.creationDate) return false;
      // Incluir cards criados no período ou concluídos no período ou em andamento
      const createdInPeriod = card.creationDate >= start && card.creationDate <= end;
      const completedInPeriod = card.completionDate && 
                                card.completionDate >= start && 
                                card.completionDate <= end;
      const activeInPeriod = card.creationDate <= end && 
                            (!card.completionDate || card.completionDate >= start);
      return createdInPeriod || completedInPeriod || activeInPeriod;
    });
  }
  
  // Agrupar por membro
  const grouped = groupCardsByMember(filteredCards);
  
  // Calcular dias do período
  let periodDays = null;
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    periodDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  }
  
  // Gerar estatísticas completas para cada membro
  const results = Object.values(grouped).map(group => {
    const allCards = group.cards;
    const completedCards = allCards.filter(card => {
      if (!card.isComplete) return false;
      if (!startDate || !endDate) return true;
      const s = new Date(startDate); s.setHours(0, 0, 0, 0);
      const e = new Date(endDate); e.setHours(23, 59, 59, 999);
      return card.completionDate && card.completionDate >= s && card.completionDate <= e;
    });
    const inProgressCards = allCards.filter(card => !card.isComplete);
    
    // Calcular tempo médio de processo (usa processTimeDays ou calcula inline das datas)
    const completedWithTime = completedCards.filter(card =>
      card.completionDate && card.creationDate
    );
    const avgTime = completedWithTime.length > 0
      ? completedWithTime.reduce((sum, card) => {
          const t = (card.processTimeDays !== null && card.processTimeDays >= 0)
            ? card.processTimeDays
            : Math.round((new Date(card.completionDate) - new Date(card.creationDate)) / (1000 * 60 * 60 * 24));
          return sum + t;
        }, 0) / completedWithTime.length
      : 0;
    
    // Produtividade
    const avgPerDay = periodDays && periodDays > 0
      ? Number((completedCards.length / periodDays).toFixed(2))
      : null;
    
    // Distribuição por lista
    const listDistribution = {};
    allCards.forEach(card => {
      const listId = card.list ? card.list.id : 'no-list';
      const listName = card.list ? card.list.name : 'Sem Lista';
      if (!listDistribution[listId]) {
        listDistribution[listId] = { listId, listName, count: 0 };
      }
      listDistribution[listId].count++;
    });
    
    // Distribuição por tipo de processo
    const typeDistribution = {};
    allCards.forEach(card => {
      if (!card.processTypes || card.processTypes.length === 0) {
        if (!typeDistribution['no-type']) {
          typeDistribution['no-type'] = { typeId: 'no-type', typeName: 'Sem Tipo', count: 0 };
        }
        typeDistribution['no-type'].count++;
      } else {
        card.processTypes.forEach(type => {
          if (!typeDistribution[type.id]) {
            typeDistribution[type.id] = { typeId: type.id, typeName: type.name, count: 0 };
          }
          typeDistribution[type.id].count++;
        });
      }
    });
    
    return {
      memberId: group.id,
      memberName: group.name,
      username: group.username,
      avatarUrl: group.avatarUrl,
      
      // Contadores básicos
      totalAssigned: allCards.length,
      totalCompleted: completedCards.length,
      totalInProgress: inProgressCards.length,
      
      // Taxa de conclusão
      completionRate: allCards.length > 0 
        ? Number(((completedCards.length / allCards.length) * 100).toFixed(1))
        : 0,
      
      // Métricas de tempo e produtividade
      avgProcessTimeDays: Number(avgTime.toFixed(2)),
      completedWithTimeCount: completedWithTime.length,
      avgCompletedPerDay: avgPerDay,
      periodDays: periodDays,
      
      // Eficiência (inverso do tempo médio)
      efficiency: avgTime > 0 ? Number((1 / avgTime).toFixed(4)) : 0,
      
      // Distribuições
      listDistribution: Object.values(listDistribution).sort((a, b) => b.count - a.count),
      typeDistribution: Object.values(typeDistribution).sort((a, b) => b.count - a.count),
      
      // Referência aos cards
      cards: allCards
    };
  });
  
  // Ordenar por total atribuído (decrescente)
  return results.sort((a, b) => b.totalAssigned - a.totalAssigned);
}

/**
 * Obtém análise individual de um membro específico
 * 
 * @param {Array} cards - Array de cards normalizados
 * @param {string} memberId - ID do membro
 * @param {Date} startDate - Data inicial do período (opcional)
 * @param {Date} endDate - Data final do período (opcional)
 * @returns {Object|null} Análise completa do membro ou null se não encontrado
 */
export function getMemberAnalysis(cards, memberId, startDate = null, endDate = null) {
  const allAnalysis = generateMemberAnalysisDataset(cards, startDate, endDate);
  return allAnalysis.find(member => member.memberId === memberId) || null;
}

/**
 * Filtra cards por membro específico
 * 
 * @param {Array} cards - Array de cards normalizados
 * @param {string} memberId - ID do membro para filtrar
 * @returns {Array} Cards atribuídos ao membro especificado
 */
export function filterCardsByMember(cards, memberId) {
  if (!Array.isArray(cards)) return [];
  
  if (memberId === 'no-member') {
    return cards.filter(card => 
      !card.members || card.members.length === 0
    );
  }
  
  return cards.filter(card => 
    card.members && card.members.some(member => member.id === memberId)
  );
}

/**
 * Obtém lista de todos os membros únicos no conjunto de cards
 * 
 * @param {Array} cards - Array de cards normalizados
 * @returns {Array} Array de objetos com informações dos membros
 */
export function getUniqueMembers(cards) {
  if (!Array.isArray(cards)) return [];
  
  const membersMap = new Map();
  
  cards.forEach(card => {
    if (card.members && card.members.length > 0) {
      card.members.forEach(member => {
        if (!membersMap.has(member.id)) {
          membersMap.set(member.id, {
            id: member.id,
            name: member.name,
            username: member.username,
            avatarUrl: member.avatarUrl
          });
        }
      });
    }
  });
  
  // Verificar se há cards sem membro
  const hasNoMember = cards.some(card => 
    !card.members || card.members.length === 0
  );
  
  const members = Array.from(membersMap.values());
  
  if (hasNoMember) {
    members.push({
      id: 'no-member',
      name: 'Sem Responsável',
      username: 'unassigned',
      avatarUrl: null
    });
  }
  
  return members.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Gera comparação de performance entre membros
 * 
 * @param {Array} cards - Array de cards normalizados
 * @param {Date} startDate - Data inicial do período (opcional)
 * @param {Date} endDate - Data final do período (opcional)
 * @returns {Array} Array ordenado por performance (taxa de conclusão e produtividade)
 */
export function generateMemberPerformanceComparison(cards, startDate = null, endDate = null) {
  const analysis = generateMemberAnalysisDataset(cards, startDate, endDate);
  
  // Calcular score de performance (combinação de taxa de conclusão e produtividade)
  const withScores = analysis.map(member => ({
    ...member,
    performanceScore: member.completionRate * 0.5 + 
                     (member.avgCompletedPerDay || 0) * 50 * 0.3 +
                     member.efficiency * 1000 * 0.2
  }));
  
  // Ordenar por score de performance (decrescente)
  return withScores.sort((a, b) => b.performanceScore - a.performanceScore);
}
