/**
 * Analytics and metrics calculation for Trello cards (processes)
 * Updated to use card creation date as start date
 */

/**
 * Get date range for different periods
 */
export const getDateRange = (period, customStart = null, customEnd = null) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Custom date range
  if (period === 'custom' && customStart && customEnd) {
    return {
      start: new Date(customStart),
      end: new Date(customEnd),
      label: 'Período Personalizado'
    };
  }
  
  switch (period) {
    case 'today':
      return {
        start: today,
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
        label: 'Hoje'
      };
    
    case 'week':
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      return {
        start: weekStart,
        end: now,
        label: 'Esta Semana'
      };
    
    case 'last7days':
      const last7 = new Date(today);
      last7.setDate(today.getDate() - 7);
      return {
        start: last7,
        end: now,
        label: 'Últimos 7 Dias'
      };
    
    case 'last30days':
      const last30 = new Date(today);
      last30.setDate(today.getDate() - 30);
      return {
        start: last30,
        end: now,
        label: 'Últimos 30 Dias'
      };
    
    case 'month':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: now,
        label: 'Este Mês'
      };
    
    case 'lastMonth':
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        start: lastMonth,
        end: lastMonthEnd,
        label: 'Mês Passado'
      };
    
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      return {
        start: new Date(now.getFullYear(), quarter * 3, 1),
        end: now,
        label: 'Este Trimestre'
      };
    
    case 'year':
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: now,
        label: 'Este Ano'
      };
    
    case 'all':
    default:
      return { start: new Date(0), end: now, label: 'Todos' };
  }
};

/**
 * Check if a date is within a range
 */
const isInRange = (date, start, end) => {
  if (!date) return false;
  const d = new Date(date);
  return d >= start && d <= end;
};

/**
 * Get card creation date.
 * Primary source: card ID (Trello uses MongoDB ObjectID — first 8 hex chars = Unix timestamp in seconds).
 * This is always available and reliable regardless of available actions.
 * Falls back to createCard action date only if the ID-based date looks invalid.
 */
const getCardCreationDate = (card, actions) => {
  // Extract creation timestamp from card ID (most reliable)
  const idTimestamp = parseInt(card.id.substring(0, 8), 16) * 1000;
  if (!isNaN(idTimestamp) && idTimestamp > 0) {
    return new Date(idTimestamp).toISOString();
  }

  // Fallback: look for createCard action
  if (actions && actions.length > 0) {
    const createAction = actions.find(
      action => action.type === 'createCard' && action.data.card?.id === card.id
    );
    if (createAction) return createAction.date;
  }

  return null;
};

/**
 * Get card completion date
 */
const getCardCompletionDate = (card, lists, actions) => {
  const doneListNames = ['concluído', 'concluido', 'done', 'finalizado'];
  const doneLists = lists.filter(list => 
    doneListNames.some(name => list.name.toLowerCase().includes(name))
  );
  const doneListIds = doneLists.map(l => l.id);
  
  // If card has due date and is marked complete
  if (card.due && card.dueComplete) {
    return card.due;
  }
  
  // Find when moved to done list
  if (actions) {
    const moveAction = actions.find(action => 
      action.type === 'updateCard' && 
      action.data.card?.id === card.id &&
      action.data.listAfter &&
      doneListIds.includes(action.data.listAfter.id)
    );
    
    if (moveAction) return moveAction.date;
  }
  
  // If in done list, use dateLastActivity
  if (doneListIds.includes(card.idList)) {
    return card.dateLastActivity;
  }
  
  return null;
};

/**
 * Check if card is completed
 */
const isCardCompleted = (card, lists) => {
  const doneListNames = ['concluído', 'concluido', 'done', 'finalizado'];
  const doneLists = lists.filter(list => 
    doneListNames.some(name => list.name.toLowerCase().includes(name))
  );
  const doneListIds = doneLists.map(l => l.id);
  
  return card.dueComplete || doneListIds.includes(card.idList);
};

/**
 * Get cards created in a period (novos)
 */
export const getNewCards = (cards, actions, period, customStart, customEnd) => {
  const { start, end } = getDateRange(period, customStart, customEnd);
  
  return cards.filter(card => {
    const creationDate = getCardCreationDate(card, actions);
    if (!creationDate) return false; // Skip cards without determinable creation date
    return isInRange(creationDate, start, end);
  });
};

/**
 * Get cards in progress (em andamento)
 */
export const getInProgressCards = (cards, lists, actions, period, customStart, customEnd) => {
  const { start, end } = getDateRange(period, customStart, customEnd);
  const now = new Date();
  
  return cards.filter(card => {
    // Card is not closed and not completed
    if (card.closed || isCardCompleted(card, lists)) return false;
    
    const creationDate = getCardCreationDate(card, actions);
    if (!creationDate) {
      // If we can't determine creation date, assume it's active if it exists now
      return true;
    }
    
    const createdDate = new Date(creationDate);
    
    // Card must have been created before or during the period
    if (createdDate > end) return false;
    
    // Card is active (not completed) as of the end of the period
    return true;
  });
};

/**
 * Get completed cards (concluídos)
 */
export const getCompletedCards = (cards, lists, actions, period, customStart, customEnd) => {
  const { start, end } = getDateRange(period, customStart, customEnd);
  
  return cards.filter(card => {
    if (!isCardCompleted(card, lists)) return false;
    
    const completionDate = getCardCompletionDate(card, lists, actions);
    return completionDate && isInRange(completionDate, start, end);
  });
};

/**
 * Calculate process time (from creation to completion) in days
 */
export const calculateProcessTime = (card, lists, actions) => {
  if (!isCardCompleted(card, lists)) return null;
  
  const creationDate = getCardCreationDate(card, actions);
  if (!creationDate) return null;
  
  const completionDate = getCardCompletionDate(card, lists, actions);
  if (!completionDate) return null;
  
  const creationDateObj = new Date(creationDate);
  const completionDateObj = new Date(completionDate);
  
  return (completionDateObj - creationDateObj) / (1000 * 60 * 60 * 24);
};

/**
 * Calculate average process time
 */
export const calculateAverageProcessTime = (cards, lists, actions) => {
  const times = cards
    .map(card => calculateProcessTime(card, lists, actions))
    .filter(time => time !== null && time >= 0);
  
  if (times.length === 0) return 0;
  
  const average = times.reduce((acc, time) => acc + time, 0) / times.length;
  return average.toFixed(1);
};

/**
 * Calculate average time by label (process type)
 */
export const calculateAverageTimeByLabel = (cards, lists, actions) => {
  const completedCards = cards.filter(card => isCardCompleted(card, lists));
  const byLabel = {};
  
  completedCards.forEach(card => {
    const time = calculateProcessTime(card, lists, actions);
    if (time === null || time < 0) return;
    
    const labels = card.labels && card.labels.length > 0 
      ? card.labels 
      : [{ name: 'Sem etiqueta', color: null }];
    
    labels.forEach(label => {
      if (!byLabel[label.name]) {
        byLabel[label.name] = { total: 0, count: 0, label };
      }
      byLabel[label.name].total += time;
      byLabel[label.name].count++;
    });
  });
  
  return Object.entries(byLabel).map(([name, data]) => ({
    label: data.label,
    average: (data.total / data.count).toFixed(1),
    count: data.count
  }));
};

/**
 * Calculate average time by member
 */
export const calculateAverageTimeByMember = (cards, lists, members, actions) => {
  const completedCards = cards.filter(card => isCardCompleted(card, lists));
  const byMember = {};
  
  completedCards.forEach(card => {
    const time = calculateProcessTime(card, lists, actions);
    if (time === null || time < 0) return;
    
    if (card.idMembers && card.idMembers.length > 0) {
      card.idMembers.forEach(memberId => {
        const member = members.find(m => m.id === memberId);
        const memberName = member ? member.fullName : 'Desconhecido';
        
        if (!byMember[memberId]) {
          byMember[memberId] = { total: 0, count: 0, member: memberName };
        }
        byMember[memberId].total += time;
        byMember[memberId].count++;
      });
    }
  });
  
  return Object.entries(byMember).map(([id, data]) => ({
    memberId: id,
    memberName: data.member,
    average: (data.total / data.count).toFixed(1),
    count: data.count
  }));
};

/**
 * Calculate average time by member and label
 */
export const calculateAverageTimeByMemberAndLabel = (cards, lists, members, actions) => {
  const completedCards = cards.filter(card => isCardCompleted(card, lists));
  const byMemberAndLabel = {};
  
  completedCards.forEach(card => {
    const time = calculateProcessTime(card, lists, actions);
    if (time === null || time < 0) return;
    
    if (card.idMembers && card.idMembers.length > 0) {
      card.idMembers.forEach(memberId => {
        const member = members.find(m => m.id === memberId);
        const memberName = member ? member.fullName : 'Desconhecido';
        
        const labels = card.labels && card.labels.length > 0 
          ? card.labels 
          : [{ name: 'Sem etiqueta' }];
        
        labels.forEach(label => {
          const key = `${memberId}:${label.name}`;
          
          if (!byMemberAndLabel[key]) {
            byMemberAndLabel[key] = { 
              total: 0, 
              count: 0, 
              member: memberName,
              memberId,
              label: label.name 
            };
          }
          byMemberAndLabel[key].total += time;
          byMemberAndLabel[key].count++;
        });
      });
    }
  });
  
  return Object.entries(byMemberAndLabel).map(([key, data]) => ({
    memberId: data.memberId,
    memberName: data.member,
    label: data.label,
    average: (data.total / data.count).toFixed(1),
    count: data.count
  }));
};

/**
 * Get time series data for charts (daily/weekly/monthly)
 */
export const getTimeSeriesData = (cards, lists, actions, period, customStart, customEnd) => {
  const { start, end } = getDateRange(period, customStart, customEnd);
  const data = [];
  
  // Determine granularity based on period
  const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
  let interval, labelFormat;
  
  if (daysDiff <= 31) {
    interval = 'day';
    labelFormat = { day: 'numeric', month: 'short' };
  } else if (daysDiff <= 90) {
    interval = 'week';
    labelFormat = { day: 'numeric', month: 'short' };
  } else {
    interval = 'month';
    labelFormat = { month: 'short', year: 'numeric' };
  }
  
  // Generate time points
  const current = new Date(start);
  while (current <= end) {
    const nextPoint = new Date(current);
    if (interval === 'day') {
      nextPoint.setDate(nextPoint.getDate() + 1);
    } else if (interval === 'week') {
      nextPoint.setDate(nextPoint.getDate() + 7);
    } else {
      nextPoint.setMonth(nextPoint.getMonth() + 1);
    }

    const newCards = cards.filter(card => {
      const creationDate = getCardCreationDate(card, actions);
      if (!creationDate) return false;
      return isInRange(creationDate, current, nextPoint);
    });
    
    const completedCards = cards.filter(card => {
      if (!isCardCompleted(card, lists)) return false;
      const completionDate = getCardCompletionDate(card, lists, actions);
      return completionDate && isInRange(completionDate, current, nextPoint);
    });
    
    data.push({
      date: new Date(current),
      label: current.toLocaleDateString('pt-BR', labelFormat),
      new: newCards.length,
      completed: completedCards.length
    });
    
    current.setTime(nextPoint.getTime());
  }
  
  return data;
};

/**
 * Get comprehensive metrics
 */
export const getComprehensiveMetrics = (cards, lists, members, actions, period = 'month', customStart = null, customEnd = null) => {
  const newCards = getNewCards(cards, actions, period, customStart, customEnd);
  const inProgressCards = getInProgressCards(cards, lists, actions, period, customStart, customEnd);
  const completedCards = getCompletedCards(cards, lists, actions, period, customStart, customEnd);
  
  return {
    summary: {
      new: newCards.length,
      inProgress: inProgressCards.length,
      completed: completedCards.length,
      total: cards.length
    },
    averageProcessTime: calculateAverageProcessTime(completedCards, lists, actions),
    byLabel: calculateAverageTimeByLabel(cards, lists, actions),
    byMember: calculateAverageTimeByMember(cards, lists, members, actions),
    byMemberAndLabel: calculateAverageTimeByMemberAndLabel(cards, lists, members, actions),
    timeSeries: getTimeSeriesData(cards, lists, actions, period, customStart, customEnd)
  };
};

export default {
  getDateRange,
  getNewCards,
  getInProgressCards,
  getCompletedCards,
  calculateAverageProcessTime,
  calculateAverageTimeByLabel,
  calculateAverageTimeByMember,
  calculateAverageTimeByMemberAndLabel,
  getTimeSeriesData,
  getComprehensiveMetrics
};
