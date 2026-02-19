/**
 * Trello API Service
 * Handles all interactions with the Trello API
 */

const API_BASE_URL = 'https://api.trello.com/1';

// Get environment variables
const API_KEY = import.meta.env.VITE_TRELLO_API_KEY;
const TOKEN = import.meta.env.VITE_TRELLO_TOKEN;
const BOARD_ID = import.meta.env.VITE_TRELLO_BOARD_ID;

/**
 * Build URL with authentication parameters
 */
const buildUrl = (endpoint, additionalParams = {}) => {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  
  // Add authentication
  url.searchParams.append('key', API_KEY);
  url.searchParams.append('token', TOKEN);
  
  // Add additional parameters
  Object.entries(additionalParams).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });
  
  return url.toString();
};

/**
 * Generic fetch wrapper with error handling
 */
const fetchFromTrello = async (url) => {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Trello API Error: ${response.status} - ${errorBody}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching from Trello:', error);
    throw error;
  }
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Test connection to Trello API
 */
export const testConnection = async () => {
  try {
    const url = buildUrl(`/boards/${BOARD_ID}`, { fields: 'name,id' });
    const board = await fetchFromTrello(url);
    return { success: true, board };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get board information
 */
export const getBoard = async () => {
  const url = buildUrl(`/boards/${BOARD_ID}`, {
    fields: 'name,desc,url,dateLastActivity,prefs',
  });
  return await fetchFromTrello(url);
};

/**
 * Get all lists from the board
 */
export const getLists = async () => {
  const url = buildUrl(`/boards/${BOARD_ID}/lists`, {
    fields: 'name,id,pos,closed',
  });
  return await fetchFromTrello(url);
};

/**
 * Get all cards from the board with full details
 * Includes dateLastActivity as fallback for creation date if 'start' is not set
 */
export const getCards = async () => {
  const url = buildUrl(`/boards/${BOARD_ID}/cards`, {
    fields: 'id,name,desc,due,dueComplete,start,dateLastActivity,labels,idList,idMembers,url,pos,closed,badges',
    customFieldItems: 'true',
    members: 'true',
    member_fields: 'fullName,username,id',
  });
  const cards = await fetchFromTrello(url);
  
  // Log estrutura do primeiro card para debug
  if (cards && cards.length > 0) {
    console.log('[TrelloService] Estrutura do primeiro card recebido:');
    console.log(JSON.stringify(cards[0], null, 2));
  }
  
  return cards;
};

/**
 * Get cards from a specific list
 */
export const getCardsByList = async (listId) => {
  const url = buildUrl(`/lists/${listId}/cards`, {
    fields: 'name,desc,due,dueComplete,start,dateLastActivity,labels,idMembers,url,pos',
    customFieldItems: 'true',
  });
  return await fetchFromTrello(url);
};

/**
 * Get a specific card with all details
 */
export const getCard = async (cardId) => {
  const url = buildUrl(`/cards/${cardId}`, {
    fields: 'all',
    customFieldItems: 'true',
    attachments: 'true',
    members: 'true',
  });
  return await fetchFromTrello(url);
};

/**
 * Get all labels from the board
 */
export const getLabels = async () => {
  const url = buildUrl(`/boards/${BOARD_ID}/labels`, {
    fields: 'name,color,id',
  });
  return await fetchFromTrello(url);
};

/**
 * Get custom fields from the board
 */
export const getCustomFields = async () => {
  const url = buildUrl(`/boards/${BOARD_ID}/customFields`);
  return await fetchFromTrello(url);
};

/**
 * Get members of the board
 */
export const getMembers = async () => {
  const url = buildUrl(`/boards/${BOARD_ID}/members`, {
    fields: 'fullName,username,avatarUrl,id',
  });
  return await fetchFromTrello(url);
};

/**
 * Get actions (activity) from the board
 * @param {number} limit - Number of actions to fetch (max 1000)
 * @param {string} before - Optional action ID to fetch actions before this one (for pagination)
 */
export const getBoardActions = async (limit = 100, before = null) => {
  const params = {
    limit: Math.min(limit, 1000).toString(), // Cap at 1000 per API limit
    filter: 'all',
  };
  
  if (before) {
    params.before = before;
  }
  
  const url = buildUrl(`/boards/${BOARD_ID}/actions`, params);
  return await fetchFromTrello(url);
};

/**
 * Get createCard action for a specific card
 * @param {string} cardId - Trello card ID
 * @returns {Object|null} First createCard action found
 */

/**
 * Get all board actions with dynamic pagination
 * Fetches actions dynamically until the end of history or max safety limit is reached
 * @param {number} maxPages - Maximum number of pages to fetch (default 10 = 10000 actions, can be increased to 15+ for more history)
 */
export const getBoardActionsMultiple = async (maxPages = 10) => {
  const pageSize = 1000; // Trello API max per request
  
  try {
    console.log(`[Actions] Iniciando busca de até ${maxPages} páginas (${maxPages * 1000} actions no máximo)...`);
    let allActions = [];
    let beforeId = null;
    let pageCount = 0;
    let hasMoreData = true;
    
    while (hasMoreData && pageCount < maxPages) {
      pageCount++;
      const pageActions = await getBoardActions(pageSize, beforeId);
      
      if (!pageActions || pageActions.length === 0) {
        console.log(`[Actions] Página ${pageCount}: nenhuma ação encontrada (fim do histórico)`);
        hasMoreData = false;
        break;
      }
      
      allActions = allActions.concat(pageActions);
      console.log(`[Actions] Página ${pageCount}: ${pageActions.length} ações (total: ${allActions.length})`);
      
      // If we got less than a full page, we've reached the end
      if (pageActions.length < pageSize) {
        console.log(`[Actions] Página ${pageCount}: histórico completo (${pageActions.length} < ${pageSize})`);
        hasMoreData = false;
      } else {
        // Set the ID of the last action for the next page
        beforeId = pageActions[pageActions.length - 1].id;
      }
    }
    
    if (pageCount >= maxPages) {
      console.log(`[Actions] Limite máximo de segurança atingido (${maxPages} páginas = ${allActions.length} ações)`);
    }
    
    console.log(`[Actions] Total de ações buscadas: ${allActions.length}`);
    
    // Log exemplos de ações createCard encontradas
    const createCardActions = allActions.filter(a => a.type === 'createCard');
    console.log(`[Actions] Total de ações 'createCard': ${createCardActions.length}`);
    if (createCardActions.length > 0) {
      console.log('[Actions] Exemplo de createCard action:');
      console.log(JSON.stringify(createCardActions[0], null, 2));
    }
    
    return allActions;
  } catch (error) {
    console.error('Error fetching multiple pages of actions:', error);
    throw error;
  }
};


/**
 * Get complete board data (board, lists, cards, labels, custom fields)
 * Now includes paginated board actions plus per-card createCard actions
 */
export const getCompleteBoardData = async () => {
  try {
    const [board, lists, cards, labels, customFields, members] = await Promise.all([
      getBoard(),
      getLists(),
      getCards(),
      getLabels(),
      getCustomFields(),
      getMembers(),
    ]);
    
    // Fetch actions separately with pagination support (up to 15000 actions = 15 pages)
    const actions = await getBoardActionsMultiple(15);

    
    return {
      board,
      lists,
      cards,
      labels,
      customFields,
      members,
      actions,
    };
  } catch (error) {
    console.error('Error fetching complete board data:', error);
    throw error;
  }
};

export default {
  testConnection,
  getBoard,
  getLists,
  getCards,
  getCardsByList,
  getCard,
  getLabels,
  getCustomFields,
  getMembers,
  getBoardActions,
  getBoardActionsMultiple,
  getCompleteBoardData,
};
