/**
 * Helper functions to process and format Trello data
 */

/**
 * Group cards by list
 */
export const groupCardsByList = (cards, lists) => {
  const grouped = {};
  
  lists.forEach(list => {
    grouped[list.id] = {
      list,
      cards: cards.filter(card => card.idList === list.id && !card.closed),
    };
  });
  
  return grouped;
};

/**
 * Group cards by label
 */
export const groupCardsByLabel = (cards) => {
  const grouped = {};
  
  cards.forEach(card => {
    if (card.labels && card.labels.length > 0) {
      card.labels.forEach(label => {
        if (!grouped[label.id]) {
          grouped[label.id] = {
            label,
            cards: [],
          };
        }
        grouped[label.id].cards.push(card);
      });
    } else {
      // Cards without labels
      if (!grouped['no-label']) {
        grouped['no-label'] = {
          label: { id: 'no-label', name: 'Sem etiqueta', color: null },
          cards: [],
        };
      }
      grouped['no-label'].cards.push(card);
    }
  });
  
  return grouped;
};

/**
 * Get cards with due dates
 */
export const getCardsWithDueDates = (cards) => {
  return cards
    .filter(card => card.due && !card.closed)
    .sort((a, b) => new Date(a.due) - new Date(b.due));
};

/**
 * Get overdue cards
 */
export const getOverdueCards = (cards) => {
  const now = new Date();
  return cards
    .filter(card => card.due && !card.dueComplete && new Date(card.due) < now && !card.closed)
    .sort((a, b) => new Date(a.due) - new Date(b.due));
};

/**
 * Get cards by date range
 */
export const getCardsByDateRange = (cards, startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return cards.filter(card => {
    if (!card.due) return false;
    const dueDate = new Date(card.due);
    return dueDate >= start && dueDate <= end;
  });
};

/**
 * Calculate card statistics
 */
export const calculateCardStats = (cards) => {
  const activeCards = cards.filter(card => !card.closed);
  const completedCards = cards.filter(card => card.dueComplete);
  const overdueCards = getOverdueCards(cards);
  const withDueDates = activeCards.filter(card => card.due);
  
  return {
    total: cards.length,
    active: activeCards.length,
    completed: completedCards.length,
    overdue: overdueCards.length,
    withDueDates: withDueDates.length,
    completionRate: cards.length > 0 ? (completedCards.length / cards.length * 100).toFixed(1) : 0,
  };
};

/**
 * Format date for display
 */
export const formatDate = (dateString, includeTime = false) => {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  
  return date.toLocaleDateString('pt-BR', options);
};

/**
 * Check if a card is overdue
 */
export const isCardOverdue = (card) => {
  if (!card.due || card.dueComplete || card.closed) return false;
  return new Date(card.due) < new Date();
};

/**
 * Get card status based on dates
 */
export const getCardStatus = (card) => {
  if (card.closed) return 'closed';
  if (card.dueComplete) return 'completed';
  if (isCardOverdue(card)) return 'overdue';
  if (card.due) {
    const daysUntilDue = Math.ceil((new Date(card.due) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysUntilDue <= 7) return 'due-soon';
  }
  return 'active';
};

/**
 * Count cards by label
 */
export const countCardsByLabel = (cards) => {
  const counts = {};
  
  cards.forEach(card => {
    if (card.labels && card.labels.length > 0) {
      card.labels.forEach(label => {
        counts[label.name] = (counts[label.name] || 0) + 1;
      });
    }
  });
  
  return counts;
};

/**
 * Extract custom field values from a card
 */
export const getCustomFieldValue = (card, customFields, fieldName) => {
  if (!card.customFieldItems || !customFields) return null;
  
  const field = customFields.find(f => f.name === fieldName);
  if (!field) return null;
  
  const fieldItem = card.customFieldItems.find(item => item.idCustomField === field.id);
  if (!fieldItem) return null;
  
  // Return the appropriate value based on field type
  if (fieldItem.value) {
    return fieldItem.value.text || fieldItem.value.number || fieldItem.value.date || fieldItem.value.checked;
  }
  
  // For list type fields
  if (fieldItem.idValue && field.options) {
    const option = field.options.find(opt => opt.id === fieldItem.idValue);
    return option ? option.value.text : null;
  }
  
  return null;
};

export default {
  groupCardsByList,
  groupCardsByLabel,
  getCardsWithDueDates,
  getOverdueCards,
  getCardsByDateRange,
  calculateCardStats,
  formatDate,
  isCardOverdue,
  getCardStatus,
  countCardsByLabel,
  getCustomFieldValue,
};
