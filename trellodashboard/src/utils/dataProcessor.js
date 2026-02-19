/**
 * Data Processor Utility
 * Normalizes and transforms raw Trello API data into structured format
 * for dashboard metrics calculation
 */

/**
 * Normalize a single card from Trello API
 * @param {Object} card - Raw card data from Trello
 * @param {Array} lists - All lists from the board
 * @param {Array} members - All members from the board
 * @param {Array} actions - All actions from the board (optional)
 * @returns {Object} Normalized card object
 */
const extractCreationDateFromId = (cardId) => {
  if (!cardId || typeof cardId !== 'string' || cardId.length < 8) return null;
  const hexTimestamp = cardId.slice(0, 8);
  const seconds = parseInt(hexTimestamp, 16);
  if (Number.isNaN(seconds)) return null;
  return new Date(seconds * 1000);
};

export const normalizeCard = (card, lists = [], members = [], actions = []) => {
  // Get creation date: prefer 'start' field (manually set by user)
  // If not set, find from actions (createCard action)
  // Fallback: derive from card ID (MongoDB ObjectID timestamp)
  let creationDate = null;
  
  if (card.start) {
    creationDate = new Date(card.start);
  } else if (actions && Array.isArray(actions)) {
    // Find the 'createCard' action for this card
    const createAction = actions.find(action => 
      action.type === 'createCard' && action.data?.card?.id === card.id
    );
    if (createAction && createAction.date) {
      creationDate = new Date(createAction.date);
    }
  }

  if (!creationDate) {
    creationDate = extractCreationDateFromId(card.id);
  }
  
  // Log detalhado para cards recentes
  if (card.name && (card.name.toLowerCase().includes('rescis') || card.name.toLowerCase().includes('template') || card.name.includes('2026') || card.name.includes('2025'))) {
    console.log(`[NormalizeCard DEBUG] ${card.name}`);
    console.log(`  - start: ${card.start || 'null'}`);
    console.log(`  - dateLastActivity: ${card.dateLastActivity || 'null'}`);
    console.log(`  - creationDate (final): ${creationDate ? creationDate.toLocaleString('pt-BR') : 'null'}`);
    console.log(`  - actions length: ${actions ? actions.length : 0}`);
    if (actions) {
      const createActions = actions.filter(a => a.type === 'createCard' && a.data?.card?.id === card.id);
      console.log(`  - createCard actions encontradas: ${createActions.length}`);
      if (createActions.length > 0) {
        createActions.forEach(a => {
          console.log(`    -> ${new Date(a.date).toLocaleString('pt-BR')}`);
        });
      }
    }
  }
  
  // Get completion date: only if card is marked as complete
  // 'due' é a data final/prazo, 'dueComplete' indica se foi marcado como concluído
  const completionDate = card.dueComplete && card.due ? new Date(card.due) : null;
  
  // Calculate process time in days (only for completed cards)
  let processTimeDays = null;
  if (completionDate && creationDate) {
    const timeDiff = completionDate - creationDate;
    processTimeDays = Math.round(timeDiff / (1000 * 60 * 60 * 24));
  }
  
  // Get list information (priority/urgency)
  const list = lists.find(l => l.id === card.idList);
  
  // Get member information
  const cardMembers = card.idMembers?.map(memberId => {
    const member = members.find(m => m.id === memberId);
    return member ? {
      id: member.id,
      name: member.fullName || member.username,
      username: member.username,
      avatarUrl: member.avatarUrl,
    } : null;
  }).filter(Boolean) || [];
  
  // Process labels (types of process)
  const processTypes = card.labels?.map(label => ({
    id: label.id,
    name: label.name || 'Sem Nome',
    color: label.color || 'gray',
  })) || [];
  
  // Determine card status
  let status = 'Em Andamento';
  if (card.closed) {
    status = 'Arquivado';
  } else if (card.dueComplete) {
    status = 'Concluído';
  } else if (creationDate) {
    const daysSinceCreation = Math.round((new Date() - creationDate) / (1000 * 60 * 60 * 24));
    if (daysSinceCreation <= 1) {
      status = 'Novo';
    }
  }
  
  return {
    id: card.id,
    name: card.name,
    description: card.desc || '',
    url: card.url,
    
    // Dates
    creationDate,
    completionDate,
    dueDate: card.due ? new Date(card.due) : null,
    lastActivityDate: card.dateLastActivity ? new Date(card.dateLastActivity) : null,
    
    // Status flags
    isComplete: card.dueComplete || false,
    isClosed: card.closed || false,
    status,
    
    // Calculated metrics
    processTimeDays,
    
    // Relations
    list: list ? {
      id: list.id,
      name: list.name,
      position: list.pos,
    } : null,
    
    members: cardMembers,
    processTypes,
    
    // Raw data for debugging
    raw: {
      idList: card.idList,
      idMembers: card.idMembers,
      badges: card.badges,
    }
  };
};

/**
 * Normalize all cards from the board
 * @param {Array} cards - Raw cards from Trello API
 * @param {Array} lists - All lists from the board
 * @param {Array} members - All members from the board
 * @param {Array} actions - All actions from the board (optional)
 * @returns {Array} Array of normalized cards
 */
export const normalizeCards = (cards, lists, members, actions = []) => {
  if (!Array.isArray(cards)) {
    console.warn('normalizeCards: cards is not an array', cards);
    return [];
  }
  
  return cards.map(card => normalizeCard(card, lists, members, actions));
};

/**
 * Filter cards based on criteria
 * @param {Array} normalizedCards - Array of normalized cards
 * @param {Object} filters - Filter criteria
 * @returns {Array} Filtered cards
 */
export const filterCards = (normalizedCards, filters = {}) => {
  let filtered = [...normalizedCards];
  
  // Exclude archived cards by default
  if (filters.excludeArchived !== false) {
    filtered = filtered.filter(card => !card.isClosed);
  }
  
  // Filter by status
  if (filters.status) {
    filtered = filtered.filter(card => card.status === filters.status);
  }
  
  // Filter by completion
  if (filters.isComplete !== undefined) {
    filtered = filtered.filter(card => card.isComplete === filters.isComplete);
  }
  
  // Filter by list
  if (filters.listId) {
    filtered = filtered.filter(card => card.list?.id === filters.listId);
  }
  
  // Filter by member
  if (filters.memberId) {
    filtered = filtered.filter(card => 
      card.members.some(member => member.id === filters.memberId)
    );
  }
  
  // Filter by label/process type
  if (filters.labelId) {
    filtered = filtered.filter(card => 
      card.processTypes.some(type => type.id === filters.labelId)
    );
  }
  
  // Filter by date range
  if (filters.startDate) {
    const startDate = new Date(filters.startDate);
    filtered = filtered.filter(card => 
      card.creationDate && card.creationDate >= startDate
    );
  }
  
  if (filters.endDate) {
    const endDate = new Date(filters.endDate);
    filtered = filtered.filter(card => 
      card.creationDate && card.creationDate <= endDate
    );
  }
  
  return filtered;
};

/**
 * Get cards completed in a specific period
 * @param {Array} normalizedCards - Array of normalized cards
 * @param {Number} days - Number of days to look back (null for all time)
 * @returns {Array} Cards completed in the period
 */
export const getCompletedCardsInPeriod = (normalizedCards, days = null) => {
  const now = new Date();
  const cutoffDate = days ? new Date(now - days * 24 * 60 * 60 * 1000) : null;
  
  return normalizedCards.filter(card => {
    if (!card.isComplete || !card.completionDate) return false;
    if (card.isClosed) return false;
    if (cutoffDate && card.completionDate < cutoffDate) return false;
    return true;
  });
};

/**
 * Get cards created in a specific period
 * @param {Array} normalizedCards - Array of normalized cards
 * @param {Number} days - Number of days to look back (null for all time)
 * @returns {Array} Cards created in the period
 */
export const getCardsCreatedInPeriod = (normalizedCards, days = null) => {
  const now = new Date();
  const cutoffDate = days ? new Date(now - days * 24 * 60 * 60 * 1000) : null;
  
  return normalizedCards.filter(card => {
    if (!card.creationDate) return false;
    if (card.isClosed) return false;
    if (cutoffDate && card.creationDate < cutoffDate) return false;
    return true;
  });
};

/**
 * Calculate average process time from cards
 * @param {Array} cards - Array of normalized cards (should be filtered to completed only)
 * @returns {Number} Average process time in days (rounded to 1 decimal)
 */
export const calculateAverageProcessTime = (cards) => {
  const validCards = cards.filter(card => 
    card.processTimeDays !== null && card.processTimeDays >= 0
  );
  
  if (validCards.length === 0) return 0;
  
  const total = validCards.reduce((sum, card) => sum + card.processTimeDays, 0);
  return Math.round((total / validCards.length) * 10) / 10;
};

/**
 * Group cards by a specific field
 * @param {Array} cards - Array of normalized cards
 * @param {String} groupBy - Field to group by ('member', 'processType', 'list')
 * @returns {Object} Grouped cards with statistics
 */
export const groupAndCalculate = (cards, groupBy) => {
  const groups = {};
  
  cards.forEach(card => {
    let groupKeys = [];
    
    switch (groupBy) {
      case 'member':
        groupKeys = card.members.length > 0 
          ? card.members.map(m => ({ id: m.id, name: m.name }))
          : [{ id: 'no-member', name: 'Sem Responsável' }];
        break;
        
      case 'processType':
        groupKeys = card.processTypes.length > 0
          ? card.processTypes.map(t => ({ id: t.id, name: t.name, color: t.color }))
          : [{ id: 'no-type', name: 'Sem Tipo', color: 'gray' }];
        break;
        
      case 'list':
        groupKeys = card.list 
          ? [{ id: card.list.id, name: card.list.name }]
          : [{ id: 'no-list', name: 'Sem Lista' }];
        break;
        
      default:
        return;
    }
    
    // Add card to each group it belongs to
    groupKeys.forEach(key => {
      if (!groups[key.id]) {
        groups[key.id] = {
          ...key,
          cards: [],
          count: 0,
          averageProcessTime: 0,
        };
      }
      groups[key.id].cards.push(card);
      groups[key.id].count++;
    });
  });
  
  // Calculate averages for each group
  Object.values(groups).forEach(group => {
    group.averageProcessTime = calculateAverageProcessTime(group.cards);
  });
  
  return Object.values(groups);
};

/**
 * Normalize complete board data from Trello API
 * @param {Object} rawData - Raw data from getCompleteBoardData()
 * @returns {Object} Normalized and structured data
 */
export const normalizeBoardData = (rawData) => {
  const { board, lists, cards, labels, members, actions } = rawData;
  
  console.log(`[NormalizeBoardData] Totais: ${cards?.length || 0} cards, ${actions?.length || 0} actions`);
  
  // Normalize cards with context - PASSA ACTIONS para encontrar data de criação real
  const normalizedCards = normalizeCards(cards, lists, members, actions || []);
  
  // Filter active lists (not closed) and sort by position
  const activeLists = lists
    .filter(list => !list.closed)
    .sort((a, b) => a.pos - b.pos);
  
  // Process labels
  const processedLabels = labels.map(label => ({
    id: label.id,
    name: label.name || 'Sem Nome',
    color: label.color || 'gray',
  }));
  
  // Process members
  const processedMembers = members.map(member => ({
    id: member.id,
    name: member.fullName || member.username,
    username: member.username,
    avatarUrl: member.avatarUrl,
  }));
  
  return {
    board: {
      id: board.id,
      name: board.name,
      description: board.desc,
      url: board.url,
      lastActivity: board.dateLastActivity ? new Date(board.dateLastActivity) : null,
    },
    lists: activeLists,
    labels: processedLabels,
    members: processedMembers,
    cards: normalizedCards,
    stats: {
      totalCards: normalizedCards.length,
      activeCards: normalizedCards.filter(c => !c.isClosed).length,
      completedCards: normalizedCards.filter(c => c.isComplete && !c.isClosed).length,
      totalMembers: processedMembers.length,
      totalLists: activeLists.length,
    },
    rawActions: actions, // Keep for future use
    lastFetch: new Date(),
  };
};

/**
 * Generate example payload structure for documentation
 * @returns {Object} Example normalized data structure
 */
export const getExamplePayload = () => ({
  board: {
    id: "abc123",
    name: "Locação 3.0 - Stylus Imobiliária",
    description: "Board de processos de locação",
    url: "https://trello.com/b/abc123",
    lastActivity: new Date("2026-02-18T10:00:00Z"),
  },
  lists: [
    { id: "list1", name: "Urgente", pos: 0, closed: false },
    { id: "list2", name: "Alta Prioridade", pos: 1, closed: false },
    { id: "list3", name: "Normal", pos: 2, closed: false },
    { id: "list4", name: "Baixa Prioridade", pos: 3, closed: false },
    { id: "list5", name: "Aguardando", pos: 4, closed: false },
  ],
  labels: [
    { id: "label1", name: "Nova Locação", color: "green" },
    { id: "label2", name: "Renovação", color: "blue" },
    { id: "label3", name: "Vistoria", color: "yellow" },
    { id: "label4", name: "Rescisão", color: "red" },
  ],
  members: [
    { id: "mem1", name: "João Silva", username: "joaosilva", avatarUrl: "https://..." },
    { id: "mem2", name: "Maria Santos", username: "mariasantos", avatarUrl: "https://..." },
  ],
  cards: [
    {
      id: "card1",
      name: "Contrato Novo - Apt 101",
      description: "Novo contrato de locação para apartamento 101",
      url: "https://trello.com/c/card1",
      creationDate: new Date("2026-02-01T09:00:00Z"),
      completionDate: new Date("2026-02-15T17:00:00Z"),
      dueDate: new Date("2026-02-15T23:59:59Z"),
      lastActivityDate: new Date("2026-02-15T17:30:00Z"),
      isComplete: true,
      isClosed: false,
      status: "Concluído",
      processTimeDays: 14,
      list: { id: "list2", name: "Alta Prioridade", position: 1 },
      members: [
        { id: "mem1", name: "João Silva", username: "joaosilva", avatarUrl: "https://..." }
      ],
      processTypes: [
        { id: "label1", name: "Nova Locação", color: "green" }
      ],
      raw: { idList: "list2", idMembers: ["mem1"], badges: {} }
    },
    {
      id: "card2",
      name: "Vistoria - Casa 205",
      description: "Vistoria de entrada",
      url: "https://trello.com/c/card2",
      creationDate: new Date("2026-02-16T10:00:00Z"),
      completionDate: null,
      dueDate: new Date("2026-02-20T23:59:59Z"),
      lastActivityDate: new Date("2026-02-18T08:00:00Z"),
      isComplete: false,
      isClosed: false,
      status: "Em Andamento",
      processTimeDays: null,
      list: { id: "list1", name: "Urgente", position: 0 },
      members: [
        { id: "mem2", name: "Maria Santos", username: "mariasantos", avatarUrl: "https://..." }
      ],
      processTypes: [
        { id: "label3", name: "Vistoria", color: "yellow" }
      ],
      raw: { idList: "list1", idMembers: ["mem2"], badges: {} }
    }
  ],
  stats: {
    totalCards: 2,
    activeCards: 2,
    completedCards: 1,
    totalMembers: 2,
    totalLists: 5,
  },
  lastFetch: new Date(),
});

export default {
  normalizeCard,
  normalizeCards,
  filterCards,
  getCompletedCardsInPeriod,
  getCardsCreatedInPeriod,
  calculateAverageProcessTime,
  groupAndCalculate,
  normalizeBoardData,
  getExamplePayload,
};
