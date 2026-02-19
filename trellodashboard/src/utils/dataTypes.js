/**
 * Type Definitions / Data Structure Reference
 * 
 * Este arquivo documenta a estrutura de dados utilizada na aplicação.
 * Use como referência para entender os objetos retornados pelas funções.
 */

/**
 * Card Normalizado
 * Representa um processo de locação após normalização
 */
export const NormalizedCard = {
  // Identificação
  id: "string",                    // ID único do card
  name: "string",                  // Nome/título do processo
  description: "string",           // Descrição detalhada
  url: "string",                   // URL do card no Trello
  
  // Datas
  creationDate: "Date | null",     // Data de início do processo
  completionDate: "Date | null",   // Data de conclusão (apenas se isComplete=true)
  dueDate: "Date | null",          // Prazo estabelecido
  lastActivityDate: "Date | null", // Última atividade registrada
  
  // Status
  isComplete: "boolean",           // Se foi marcado como concluído
  isClosed: "boolean",             // Se foi arquivado
  status: "string",                // "Novo" | "Em Andamento" | "Concluído" | "Arquivado"
  
  // Métricas calculadas
  processTimeDays: "number | null", // Tempo do processo em dias
  
  // Relações
  list: {
    id: "string",
    name: "string",
    position: "number"
  },
  
  members: [
    {
      id: "string",
      name: "string",
      username: "string",
      avatarUrl: "string"
    }
  ],
  
  processTypes: [
    {
      id: "string",
      name: "string",
      color: "string"
    }
  ],
  
  // Dados brutos (para debugging)
  raw: {
    idList: "string",
    idMembers: ["string"],
    badges: "object"
  }
};

/**
 * Board Data Normalizado
 * Estrutura completa retornada por normalizeBoardData()
 */
export const NormalizedBoardData = {
  board: {
    id: "string",
    name: "string",
    description: "string",
    url: "string",
    lastActivity: "Date | null"
  },
  
  lists: [
    {
      id: "string",
      name: "string",
      pos: "number",
      closed: "boolean"
    }
  ],
  
  labels: [
    {
      id: "string",
      name: "string",
      color: "string"
    }
  ],
  
  members: [
    {
      id: "string",
      name: "string",
      username: "string",
      avatarUrl: "string"
    }
  ],
  
  cards: "NormalizedCard[]",
  
  stats: {
    totalCards: "number",
    activeCards: "number",
    completedCards: "number",
    totalMembers: "number",
    totalLists: "number"
  },
  
  rawActions: "array",
  lastFetch: "Date"
};

/**
 * Resultado de groupAndCalculate()
 */
export const GroupedData = [
  {
    id: "string",              // ID do grupo (member/label/list)
    name: "string",            // Nome do grupo
    color: "string",           // (apenas para labels) Cor
    username: "string",        // (apenas para members) Username
    position: "number",        // (apenas para lists) Posição
    cards: "NormalizedCard[]", // Array de cards no grupo
    count: "number",           // Quantidade de cards
    averageProcessTime: "number" // Tempo médio em dias
  }
];

/**
 * Filtros disponíveis para filterCards()
 */
export const FilterOptions = {
  excludeArchived: "boolean",    // Excluir cards arquivados (padrão: true)
  status: "string",              // Filtrar por status específico
  isComplete: "boolean",         // Filtrar por conclusão
  listId: "string",             // Filtrar por lista
  memberId: "string",           // Filtrar por membro
  labelId: "string",            // Filtrar por label
  startDate: "string | Date",   // Data início (cards criados após)
  endDate: "string | Date"      // Data fim (cards criados antes)
};

/**
 * Opções do hook useTrelloBoard()
 */
export const UseTrelloBoardOptions = {
  autoRefresh: "boolean",       // Habilitar refresh automático (padrão: false)
  refreshInterval: "number",    // Intervalo em ms (padrão: 300000 = 5 min)
  normalize: "boolean"          // Retornar dados normalizados (padrão: true)
};

/**
 * Retorno do hook useTrelloBoard()
 */
export const UseTrelloBoardReturn = {
  // Dados brutos da API
  board: "object",
  lists: "array",
  cards: "array",
  labels: "array",
  customFields: "array",
  members: "array",
  actions: "array",
  
  // Dados normalizados
  normalizedData: "NormalizedBoardData | null",
  
  // Estado
  isLoading: "boolean",
  error: "string | null",
  lastFetch: "Date | null",
  
  // Funções
  refetch: "function",          // Função para atualizar manualmente
  isAutoRefreshEnabled: "boolean" // Se auto-refresh está ativo
};

/**
 * Card bruto da API Trello (antes da normalização)
 */
export const RawTrelloCard = {
  id: "string",
  name: "string",
  desc: "string",
  due: "string | null",           // ISO date string
  dueComplete: "boolean",
  start: "string | null",         // ISO date string
  dateLastActivity: "string",     // ISO date string
  labels: [
    {
      id: "string",
      name: "string",
      color: "string"
    }
  ],
  idList: "string",
  idMembers: ["string"],
  url: "string",
  pos: "number",
  closed: "boolean",
  badges: "object",
  members: [
    {
      id: "string",
      fullName: "string",
      username: "string"
    }
  ]
};

/**
 * Períodos disponíveis para cálculos
 */
export const Periods = {
  TODAY: 1,          // Hoje (últimas 24h)
  WEEK: 7,           // Última semana
  MONTH: 30,         // Último mês
  QUARTER: 90,       // Último trimestre
  ALL: null          // Todo o período
};

/**
 * Status possíveis de um card
 */
export const CardStatus = {
  NEW: "Novo",
  IN_PROGRESS: "Em Andamento",
  COMPLETED: "Concluído",
  ARCHIVED: "Arquivado"
};

/**
 * Exemplo de uso TypeScript (se migrar para TS no futuro)
 */
/*
interface NormalizedCard {
  id: string;
  name: string;
  description: string;
  url: string;
  
  creationDate: Date | null;
  completionDate: Date | null;
  dueDate: Date | null;
  lastActivityDate: Date | null;
  
  isComplete: boolean;
  isClosed: boolean;
  status: 'Novo' | 'Em Andamento' | 'Concluído' | 'Arquivado';
  
  processTimeDays: number | null;
  
  list: {
    id: string;
    name: string;
    position: number;
  } | null;
  
  members: Array<{
    id: string;
    name: string;
    username: string;
    avatarUrl: string;
  }>;
  
  processTypes: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  
  raw: {
    idList: string;
    idMembers: string[];
    badges: any;
  };
}
*/

export default {
  NormalizedCard,
  NormalizedBoardData,
  GroupedData,
  FilterOptions,
  UseTrelloBoardOptions,
  UseTrelloBoardReturn,
  RawTrelloCard,
  Periods,
  CardStatus,
};
