/**
 * Period Calculation Utilities
 * Handles all period-related calculations for the dashboard
 */

/**
 * Period types available in the filter
 */
export const PERIOD_TYPES = {
  THIS_WEEK: 'this_week',
  THIS_MONTH: 'this_month',
  THIS_QUARTER: 'this_quarter',
  THIS_YEAR: 'this_year',
  CUSTOM: 'custom',
};

/**
 * Period labels for UI display
 */
export const PERIOD_LABELS = {
  [PERIOD_TYPES.THIS_WEEK]: 'Esta Semana',
  [PERIOD_TYPES.THIS_MONTH]: 'Este Mês',
  [PERIOD_TYPES.THIS_QUARTER]: 'Este Trimestre',
  [PERIOD_TYPES.THIS_YEAR]: 'Este Ano',
  [PERIOD_TYPES.CUSTOM]: 'Personalizado',
};

/**
 * Get the start of the week (Monday)
 * @param {Date} date - Reference date
 * @returns {Date} Start of the week
 */
export const getStartOfWeek = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get the end of the week (Sunday)
 * @param {Date} date - Reference date
 * @returns {Date} End of the week
 */
export const getEndOfWeek = (date = new Date()) => {
  const d = getStartOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Get the start of the month
 * @param {Date} date - Reference date
 * @returns {Date} Start of the month
 */
export const getStartOfMonth = (date = new Date()) => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get the end of the month
 * @param {Date} date - Reference date
 * @returns {Date} End of the month
 */
export const getEndOfMonth = (date = new Date()) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Get the start of the quarter
 * @param {Date} date - Reference date
 * @returns {Date} Start of the quarter
 */
export const getStartOfQuarter = (date = new Date()) => {
  const d = new Date(date);
  const quarter = Math.floor(d.getMonth() / 3);
  d.setMonth(quarter * 3);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get the end of the quarter
 * @param {Date} date - Reference date
 * @returns {Date} End of the quarter
 */
export const getEndOfQuarter = (date = new Date()) => {
  const d = getStartOfQuarter(date);
  d.setMonth(d.getMonth() + 3);
  d.setDate(0);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Get the start of the year
 * @param {Date} date - Reference date
 * @returns {Date} Start of the year
 */
export const getStartOfYear = (date = new Date()) => {
  const d = new Date(date);
  d.setMonth(0);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get the end of the year
 * @param {Date} date - Reference date
 * @returns {Date} End of the year
 */
export const getEndOfYear = (date = new Date()) => {
  const d = new Date(date);
  d.setMonth(11);
  d.setDate(31);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Calculate period range based on period type
 * @param {string} periodType - Type of period (from PERIOD_TYPES)
 * @param {Date} referenceDate - Reference date (default: now)
 * @param {Object} customRange - Custom range { startDate, endDate }
 * @returns {Object} { startDate, endDate, label, days }
 */
export const calculatePeriodRange = (periodType, referenceDate = new Date(), customRange = null) => {
  let startDate, endDate, label;

  switch (periodType) {
    case PERIOD_TYPES.THIS_WEEK:
      startDate = getStartOfWeek(referenceDate);
      endDate = getEndOfWeek(referenceDate);
      label = PERIOD_LABELS[PERIOD_TYPES.THIS_WEEK];
      break;

    case PERIOD_TYPES.THIS_MONTH:
      startDate = getStartOfMonth(referenceDate);
      endDate = getEndOfMonth(referenceDate);
      label = PERIOD_LABELS[PERIOD_TYPES.THIS_MONTH];
      break;

    case PERIOD_TYPES.THIS_QUARTER:
      startDate = getStartOfQuarter(referenceDate);
      endDate = getEndOfQuarter(referenceDate);
      label = PERIOD_LABELS[PERIOD_TYPES.THIS_QUARTER];
      break;

    case PERIOD_TYPES.THIS_YEAR:
      startDate = getStartOfYear(referenceDate);
      endDate = getEndOfYear(referenceDate);
      label = PERIOD_LABELS[PERIOD_TYPES.THIS_YEAR];
      break;

    case PERIOD_TYPES.CUSTOM:
      if (!customRange || !customRange.startDate || !customRange.endDate) {
        throw new Error('Custom period requires startDate and endDate');
      }
      startDate = new Date(customRange.startDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(customRange.endDate);
      endDate.setHours(23, 59, 59, 999);
      label = `${formatDate(startDate)} - ${formatDate(endDate)}`;
      break;

    default:
      throw new Error(`Invalid period type: ${periodType}`);
  }

  // Calculate number of days in the period
  const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

  return {
    startDate,
    endDate,
    label,
    days,
    periodType,
  };
};

/**
 * Check if a date is within a period range
 * @param {Date} date - Date to check
 * @param {Date} startDate - Start of the period
 * @param {Date} endDate - End of the period
 * @returns {boolean} True if date is within the range
 */
export const isDateInPeriod = (date, startDate, endDate) => {
  if (!date) return false;
  const d = new Date(date);
  return d >= startDate && d <= endDate;
};

/**
 * Filter cards by creation date within a period
 * @param {Array} cards - Array of normalized cards
 * @param {Date} startDate - Start of the period
 * @param {Date} endDate - End of the period
 * @returns {Array} Filtered cards
 */
export const filterCardsByCreationPeriod = (cards, startDate, endDate) => {
  return cards.filter(card => 
    card.creationDate && isDateInPeriod(card.creationDate, startDate, endDate)
  );
};

/**
 * Filter cards by completion date within a period
 * @param {Array} cards - Array of normalized cards
 * @param {Date} startDate - Start of the period
 * @param {Date} endDate - End of the period
 * @returns {Array} Filtered cards (only completed cards)
 */
export const filterCardsByCompletionPeriod = (cards, startDate, endDate) => {
  return cards.filter(card => 
    card.isComplete && 
    !card.isClosed &&
    card.completionDate && 
    isDateInPeriod(card.completionDate, startDate, endDate)
  );
};

/**
 * Filter cards by any activity within a period
 * @param {Array} cards - Array of normalized cards
 * @param {Date} startDate - Start of the period
 * @param {Date} endDate - End of the period
 * @returns {Array} Filtered cards
 */
export const filterCardsByActivityPeriod = (cards, startDate, endDate) => {
  return cards.filter(card => {
    if (!card.lastActivityDate) return false;
    return isDateInPeriod(card.lastActivityDate, startDate, endDate);
  });
};

/**
 * Get cards that are in progress during a period
 * (created before or during the period and not completed or completed after the period)
 * @param {Array} cards - Array of normalized cards
 * @param {Date} startDate - Start of the period
 * @param {Date} endDate - End of the period
 * @returns {Array} Cards in progress during the period
 */
export const getCardsInProgressDuringPeriod = (cards, startDate, endDate) => {
  return cards.filter(card => {
    if (card.isClosed) return false;
    
    // Must be created before or during the period
    const createdBeforeOrDuring = card.creationDate && card.creationDate <= endDate;
    if (!createdBeforeOrDuring) return false;
    
    // Still in progress OR completed after the period
    const stillInProgress = !card.isComplete;
    const completedAfter = card.isComplete && card.completionDate && card.completionDate > endDate;
    
    return stillInProgress || completedAfter;
  });
};

/**
 * Format date for display
 * @param {Date} date - Date to format
 * @param {string} format - Format type ('short' | 'long')
 * @returns {string} Formatted date string
 */
export const formatDate = (date, format = 'short') => {
  if (!date) return '';
  
  const d = date instanceof Date ? date : new Date(date);
  
  if (format === 'long') {
    return d.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  return d.toLocaleDateString('pt-BR');
};

/**
 * Format date for input[type="date"] (YYYY-MM-DD)
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDateForInput = (date) => {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().split('T')[0];
};

/**
 * Get period description with date range
 * @param {Object} periodRange - Period range object from calculatePeriodRange
 * @returns {string} Description string
 */
export const getPeriodDescription = (periodRange) => {
  const { label, days, startDate, endDate } = periodRange;
  
  if (periodRange.periodType === PERIOD_TYPES.CUSTOM) {
    return `${label} (${days} dias)`;
  }
  
  return `${label} (${formatDate(startDate)} a ${formatDate(endDate)})`;
};

/**
 * Get all available period options for dropdown
 * @returns {Array} Array of period options
 */
export const getPeriodOptions = () => {
  return [
    { value: PERIOD_TYPES.THIS_WEEK, label: PERIOD_LABELS[PERIOD_TYPES.THIS_WEEK] },
    { value: PERIOD_TYPES.THIS_MONTH, label: PERIOD_LABELS[PERIOD_TYPES.THIS_MONTH] },
    { value: PERIOD_TYPES.THIS_QUARTER, label: PERIOD_LABELS[PERIOD_TYPES.THIS_QUARTER] },
    { value: PERIOD_TYPES.THIS_YEAR, label: PERIOD_LABELS[PERIOD_TYPES.THIS_YEAR] },
    { value: PERIOD_TYPES.CUSTOM, label: PERIOD_LABELS[PERIOD_TYPES.CUSTOM] },
  ];
};

/**
 * Apply period filter to all cards data
 * Returns comprehensive statistics for the period
 * @param {Array} cards - Array of normalized cards
 * @param {Object} periodRange - Period range from calculatePeriodRange
 * @returns {Object} Filtered data with statistics
 */
export const applyPeriodFilter = (cards, periodRange) => {
  const { startDate, endDate } = periodRange;
  
  console.log(`\n[PeriodFilter] Period: ${periodRange.label}`);
  console.log(`[PeriodFilter] Range: ${startDate.toLocaleString('pt-BR')} até ${endDate.toLocaleString('pt-BR')}`);
  
  // Cards created in the period
  const createdInPeriod = filterCardsByCreationPeriod(cards, startDate, endDate);
  console.log(`[PeriodFilter] Cards criados: ${createdInPeriod.length}`);
  if (createdInPeriod.length > 0) {
    createdInPeriod.forEach(card => {
      console.log(`  - ${card.name}: criado em ${card.creationDate ? card.creationDate.toLocaleString('pt-BR') : 'SEM DATA'}`);
    });
  } else {
    // Debug: mostrar cards com creationDate nulo
    const cardsWithoutCreation = cards.filter(c => !c.creationDate);
    console.log(`[PeriodFilter] Cards sem creationDate: ${cardsWithoutCreation.length}`);
    cardsWithoutCreation.slice(0, 3).forEach(card => {
      console.log(`  - ${card.name}: start=${card.start}, dateLastActivity=${card.dateLastActivity}`);
    });
  }
  
  // Cards completed in the period
  const completedInPeriod = filterCardsByCompletionPeriod(cards, startDate, endDate);
  console.log(`[PeriodFilter] Cards concluídos: ${completedInPeriod.length}`);
  
  // Cards in progress during the period
  const inProgressDuringPeriod = getCardsInProgressDuringPeriod(cards, startDate, endDate);
  console.log(`[PeriodFilter] Cards em andamento: ${inProgressDuringPeriod.length}`);
  
  // Cards with any activity in the period
  const activeInPeriod = filterCardsByActivityPeriod(cards, startDate, endDate);
  console.log(`[PeriodFilter] Cards com atividade: ${activeInPeriod.length}\n`);
  
  return {
    period: periodRange,
    cards: {
      created: createdInPeriod,
      completed: completedInPeriod,
      inProgress: inProgressDuringPeriod,
      active: activeInPeriod,
    },
    counts: {
      created: createdInPeriod.length,
      completed: completedInPeriod.length,
      inProgress: inProgressDuringPeriod.length,
      active: activeInPeriod.length,
    },
    averages: {
      createdPerDay: (createdInPeriod.length / periodRange.days).toFixed(1),
      completedPerDay: (completedInPeriod.length / periodRange.days).toFixed(1),
    }
  };
};

/**
 * Validate custom date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Object} { valid: boolean, error: string }
 */
export const validateCustomRange = (startDate, endDate) => {
  if (!startDate || !endDate) {
    return { valid: false, error: 'Data inicial e final são obrigatórias' };
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { valid: false, error: 'Datas inválidas' };
  }
  
  if (start > end) {
    return { valid: false, error: 'Data inicial deve ser anterior à data final' };
  }
  
  const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  if (daysDiff > 365) {
    return { valid: false, error: 'O período não pode ser maior que 365 dias' };
  }
  
  return { valid: true, error: null };
};

export default {
  PERIOD_TYPES,
  PERIOD_LABELS,
  getStartOfWeek,
  getEndOfWeek,
  getStartOfMonth,
  getEndOfMonth,
  getStartOfQuarter,
  getEndOfQuarter,
  getStartOfYear,
  getEndOfYear,
  calculatePeriodRange,
  isDateInPeriod,
  filterCardsByCreationPeriod,
  filterCardsByCompletionPeriod,
  filterCardsByActivityPeriod,
  getCardsInProgressDuringPeriod,
  formatDate,
  formatDateForInput,
  getPeriodDescription,
  getPeriodOptions,
  applyPeriodFilter,
  validateCustomRange,
};
