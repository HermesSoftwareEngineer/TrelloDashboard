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
 */
export const getCards = async () => {
  const url = buildUrl(`/boards/${BOARD_ID}/cards`, {
    fields: 'name,desc,due,dueComplete,start,dateLastActivity,labels,idList,idMembers,url,pos,closed',
    customFieldItems: 'true',
  });
  return await fetchFromTrello(url);
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
 */
export const getBoardActions = async (limit = 100) => {
  const url = buildUrl(`/boards/${BOARD_ID}/actions`, {
    limit: limit.toString(),
    filter: 'all',
  });
  return await fetchFromTrello(url);
};

/**
 * Get complete board data (board, lists, cards, labels, custom fields)
 */
export const getCompleteBoardData = async () => {
  try {
    const [board, lists, cards, labels, customFields, members, actions] = await Promise.all([
      getBoard(),
      getLists(),
      getCards(),
      getLabels(),
      getCustomFields(),
      getMembers(),
      getBoardActions(1000),
    ]);
    
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
  getCompleteBoardData,
};
