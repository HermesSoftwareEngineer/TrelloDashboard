/**
 * Analytics and metrics calculation for Trello cards (processes)
 */

/**
 * Get date range for different periods
 */
export const getDateRange = (period) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
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
    
    case 'month':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: now,
        label: 'Este Mês'
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
    
    default:
      return { start: new Date(0), end: now, label: 'Todos' };
  }
};

/**
 * Check if a date is within a range
 */
const isInRange = (date, start, end) => {
  const d = new Date(date);
  return d >= start && d <= end;
};

/**
 * Get cards created in a period (novos)
 */
export const getNewCards = (cards, actions, period) => {
  const { start, end } = getDateRange(period);
  
  // Cards created in this period based on dateLastActivity as approximation
  // Better: use board actions to find exact creation date
  return cards.filter(card => {
    // For new cards, we check when they were first created
    // This would ideally come from board actions of type "createCard"
    const createdAction = actions?.find(
      action => action.type === 'createCard' && action.data.card.id === card.id
    );
    
    if (createdAction) {
      return isInRange(createdAction.date, start, end);
    }
    
    // Fallback: use card's dateLastActivity if no actions available
    return card.dateLastActivity && isInRange(card.dateLastActivity, start, end);
  });
};

/**
 * Get cards in progress (em andamento)
 * Cards that have a start date but no completion (not in "done" list and not dueComplete)
 */
export const getInProgressCards = (cards, lists, period) => {
  const { start, end } = getDateRange(period);
  const doneListNames = ['concluído', 'concluido', 'done', 'finalizado'];
  const doneLists = lists.filter(list => 
    doneListNames.some(name => list.name.toLowerCase().includes(name))
  );
  const doneListIds = doneLists.map(l => l.id);
  
  return cards.filter(card => {
    // Card is not done
    const isNotDone = !doneListIds.includes(card.idList) && !card.dueComplete && !card.closed;
    
    if (!isNotDone) return false;
    
    // Card has start date or was created in the period
    if (card.start) {
      return isInRange(card.start, start, end);
    }
    
    // Or card exists in the period
    return card.dateLastActivity && isInRange(card.dateLastActivity, start, end);
  });
};

/**
 * Get completed cards (concluídos)
 */
export const getCompletedCards = (cards, lists, actions, period) => {
  const { start, end } = getDateRange(period);
  const doneListNames = ['concluído', 'concluido', 'done', 'finalizado'];
  const doneLists = lists.filter(list => 
    doneListNames.some(name => list.name.toLowerCase().includes(name))
  );
  const doneListIds = doneLists.map(l => l.id);
  
  return cards.filter(card => {
    // Card is marked as complete
    const isComplete = card.dueComplete || doneListIds.includes(card.idList);
    
    if (!isComplete) return false;
    
    // Find when it was completed (moved to done list or marked as complete)
    if (actions) {
      const completionAction = actions.find(action => {
        if (action.data.card?.id !== card.id) return false;
        
        // Moved to done list
        if (action.type === 'updateCard' && action.data.listAfter) {
          return doneListIds.includes(action.data.listAfter.id);
        }
        
        // Marked as complete
        if (action.type === 'updateCard' && action.data.card?.dueComplete !== undefined) {
          return action.data.card.dueComplete === true;
        }
        
        return false;
      });
      
      if (completionAction) {
        return isInRange(completionAction.date, start, end);
      }
    }
    
    // Fallback: use due date if completed
    if (card.due && card.dueComplete) {
      return isInRange(card.due, start, end);
    }
    
    return false;
  });
};

/**
 * Calculate average per day/week/month
 */
export const calculateAverage = (count, period) => {
  const now = new Date();
  const { start } = getDateRange(period);
  
  const diffTime = Math.abs(now - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  switch (period) {
    case 'today':
      return count;
    case 'week':
      return (count / Math.max(diffDays, 1)).toFixed(1);
    case 'month':
      return (count / Math.max(diffDays, 1)).toFixed(1);
    case 'quarter':
      const weeks = diffDays / 7;
      return (count / Math.max(weeks, 1)).toFixed(1);
    case 'year':
      const months = diffDays / 30;
      return (count / Math.max(months, 1)).toFixed(1);
    default:
      return count;
  }
};

/**
 * Calculate average time for a process (from start to completion)
 */
export const calculateAverageProcessTime = (cards, lists) => {
  const doneListNames = ['concluído', 'concluido', 'done', 'finalizado'];
  const doneLists = lists.filter(list => 
    doneListNames.some(name => list.name.toLowerCase().includes(name))
  );
  const doneListIds = doneLists.map(l => l.id);
  
  const completedCards = cards.filter(card => 
    card.dueComplete || doneListIds.includes(card.idList)
  );
  
  const times = completedCards
    .filter(card => card.start && card.due)
    .map(card => {
      const start = new Date(card.start);
      const end = new Date(card.due);
      return (end - start) / (1000 * 60 * 60 * 24); // days
    });
  
  if (times.length === 0) return 0;
  
  const average = times.reduce((acc, time) => acc + time, 0) / times.length;
  return average.toFixed(1);
};

/**
 * Calculate average time by label (process type)
 */
export const calculateAverageTimeByLabel = (cards, lists) => {
  const doneListNames = ['concluído', 'concluido', 'done', 'finalizado'];
  const doneLists = lists.filter(list => 
    doneListNames.some(name => list.name.toLowerCase().includes(name))
  );
  const doneListIds = doneLists.map(l => l.id);
  
  const completedCards = cards.filter(card => 
    (card.dueComplete || doneListIds.includes(card.idList)) && card.start && card.due
  );
  
  const byLabel = {};
  
  completedCards.forEach(card => {
    const days = (new Date(card.due) - new Date(card.start)) / (1000 * 60 * 60 * 24);
    
    if (card.labels && card.labels.length > 0) {
      card.labels.forEach(label => {
        if (!byLabel[label.name]) {
          byLabel[label.name] = { total: 0, count: 0, label };
        }
        byLabel[label.name].total += days;
        byLabel[label.name].count++;
      });
    } else {
      if (!byLabel['Sem etiqueta']) {
        byLabel['Sem etiqueta'] = { total: 0, count: 0, label: { name: 'Sem etiqueta' } };
      }
      byLabel['Sem etiqueta'].total += days;
      byLabel['Sem etiqueta'].count++;
    }
  });
  
  return Object.entries(byLabel).map(([name, data]) => ({
    label: data.label,
    average: (data.total / data.count).toFixed(1),
    count: data.count
  }));
};

/**
 * Calculate average time by member (person)
 */
export const calculateAverageTimeByMember = (cards, lists, members) => {
  const doneListNames = ['concluído', 'concluido', 'done', 'finalizado'];
  const doneLists = lists.filter(list => 
    doneListNames.some(name => list.name.toLowerCase().includes(name))
  );
  const doneListIds = doneLists.map(l => l.id);
  
  const completedCards = cards.filter(card => 
    (card.dueComplete || doneListIds.includes(card.idList)) && card.start && card.due
  );
  
  const byMember = {};
  
  completedCards.forEach(card => {
    const days = (new Date(card.due) - new Date(card.start)) / (1000 * 60 * 60 * 24);
    
    if (card.idMembers && card.idMembers.length > 0) {
      card.idMembers.forEach(memberId => {
        const member = members.find(m => m.id === memberId);
        const memberName = member ? member.fullName : 'Desconhecido';
        
        if (!byMember[memberId]) {
          byMember[memberId] = { total: 0, count: 0, member: memberName };
        }
        byMember[memberId].total += days;
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
export const calculateAverageTimeByMemberAndLabel = (cards, lists, members) => {
  const doneListNames = ['concluído', 'concluido', 'done', 'finalizado'];
  const doneLists = lists.filter(list => 
    doneListNames.some(name => list.name.toLowerCase().includes(name))
  );
  const doneListIds = doneLists.map(l => l.id);
  
  const completedCards = cards.filter(card => 
    (card.dueComplete || doneListIds.includes(card.idList)) && card.start && card.due
  );
  
  const byMemberAndLabel = {};
  
  completedCards.forEach(card => {
    const days = (new Date(card.due) - new Date(card.start)) / (1000 * 60 * 60 * 24);
    
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
          byMemberAndLabel[key].total += days;
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
 * Get comprehensive metrics for all periods
 */
export const getComprehensiveMetrics = (cards, lists, members, actions) => {
  const periods = ['today', 'week', 'month', 'quarter', 'year'];
  
  const metrics = periods.map(period => {
    const newCards = getNewCards(cards, actions, period);
    const inProgressCards = getInProgressCards(cards, lists, period);
    const completedCards = getCompletedCards(cards, lists, actions, period);
    
    return {
      period,
      label: getDateRange(period).label,
      new: {
        count: newCards.length,
        average: calculateAverage(newCards.length, period)
      },
      inProgress: {
        count: inProgressCards.length,
        average: calculateAverage(inProgressCards.length, period)
      },
      completed: {
        count: completedCards.length,
        average: calculateAverage(completedCards.length, period)
      }
    };
  });
  
  return {
    byPeriod: metrics,
    averageProcessTime: calculateAverageProcessTime(cards, lists),
    byLabel: calculateAverageTimeByLabel(cards, lists),
    byMember: calculateAverageTimeByMember(cards, lists, members),
    byMemberAndLabel: calculateAverageTimeByMemberAndLabel(cards, lists, members)
  };
};

export default {
  getDateRange,
  getNewCards,
  getInProgressCards,
  getCompletedCards,
  calculateAverage,
  calculateAverageProcessTime,
  calculateAverageTimeByLabel,
  calculateAverageTimeByMember,
  calculateAverageTimeByMemberAndLabel,
  getComprehensiveMetrics
};
