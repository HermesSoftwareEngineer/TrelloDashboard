/**
 * Resumo Service
 * Fetches daily activity data from the Trello API for the Resumo page.
 */

const API_BASE_URL = import.meta.env.VITE_TRELLO_API_BASE_URL || '/api/trello';

const API_KEY = import.meta.env.VITE_TRELLO_API_KEY;
const TOKEN = import.meta.env.VITE_TRELLO_TOKEN;
const BOARD_ID = import.meta.env.VITE_TRELLO_BOARD_ID;

const buildUrl = (endpoint, params = {}) => {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
  const url = new URL(`${API_BASE_URL}${endpoint}`, origin);
  url.searchParams.append('key', API_KEY);
  url.searchParams.append('token', TOKEN);
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
  return url.toString();
};

const fetchFromTrello = async (url, options = {}) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Trello API Error: ${response.status} - ${body}`);
  }
  return response.json();
};

/**
 * Fetch board actions for a specific day.
 * Returns commentCard and updateCard actions.
 * @param {Date} date - JS Date object representing the selected day
 */
export const getActionsByDate = async (date) => {
  const since = new Date(date);
  since.setHours(0, 0, 0, 0);
  const before = new Date(date);
  before.setHours(23, 59, 59, 999);

  const url = buildUrl(`/boards/${BOARD_ID}/actions`, {
    filter: 'commentCard,updateCard',
    since: since.toISOString(),
    before: before.toISOString(),
    limit: 1000,
    memberCreator: true,
    memberCreator_fields: 'fullName,username,avatarUrl,id',
  });

  return fetchFromTrello(url);
};

/**
 * Fetch all board members.
 */
export const getMembers = async () => {
  const url = buildUrl(`/boards/${BOARD_ID}/members`, {
    fields: 'fullName,username,avatarUrl,id',
  });
  return fetchFromTrello(url);
};

/**
 * Fetch all cards on the board with their checklists and checklist item states.
 * Used to determine pending checklist items (due date matches selected day, not complete).
 */
export const getCardsWithChecklists = async () => {
  const url = buildUrl(`/boards/${BOARD_ID}/cards`, {
    fields: 'id,name,idList,idMembers,closed,labels',
    checklists: 'all',
    checkItemStates: true,
    checkItem_fields: 'id,name,state,due,idChecklist,idMember',
    filter: 'all',
  });
  return fetchFromTrello(url);
};

/**
 * Update due date for a checklist item on a card.
 * @param {string} cardId - Trello card ID
 * @param {string} checkItemId - Checklist item ID
 * @param {string} dueDateIso - ISO date string for due date
 */
export const updateChecklistItemDueDate = async (cardId, checkItemId, dueDateIso) => {
  const url = buildUrl(`/cards/${cardId}/checkItem/${checkItemId}`, {
    due: dueDateIso,
  });

  return fetchFromTrello(url, { method: 'PUT' });
};

/**
 * Fetch all lists (to resolve list names when displaying completed cards).
 */
export const getLists = async () => {
  const url = buildUrl(`/boards/${BOARD_ID}/lists`, {
    fields: 'id,name',
  });
  return fetchFromTrello(url);
};

/**
 * Fetch board actions within a date range.
 * Returns commentCard and updateCheckItemStateOnCard actions.
 * @param {string} startDateISO - start date as YYYY-MM-DD
 * @param {string} endDateISO - end date as YYYY-MM-DD
 */
export const getActionsInRange = async (startDateISO, endDateISO) => {
  const since = new Date(startDateISO);
  since.setHours(0, 0, 0, 0);
  const before = new Date(endDateISO);
  before.setHours(23, 59, 59, 999);

  const url = buildUrl(`/boards/${BOARD_ID}/actions`, {
    filter: 'commentCard,updateCheckItemStateOnCard',
    since: since.toISOString(),
    before: before.toISOString(),
    limit: 1000,
    memberCreator: true,
    memberCreator_fields: 'fullName,username,avatarUrl,id',
  });

  return fetchFromTrello(url);
};

/**
 * Main function: fetches all data needed for the Resumo page.
 * @param {Date} date - selected day
 */
export const getResumoDayData = async (date) => {
  const [actions, members, cardsWithChecklists, lists] = await Promise.all([
    getActionsByDate(date),
    getMembers(),
    getCardsWithChecklists(),
    getLists(),
  ]);

  return { actions, members, cardsWithChecklists, lists };
};

export default {
  getActionsByDate,
  getActionsInRange,
  getMembers,
  getCardsWithChecklists,
  getLists,
  updateChecklistItemDueDate,
  getResumoDayData,
};
