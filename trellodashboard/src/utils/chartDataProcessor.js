/**
 * Chart Data Processor
 * Aggregates card data into time-based datasets for charts
 */

import periodUtils from './periodUtils';

/**
 * Granularity types for chart aggregation
 */
export const GRANULARITY = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
};

/**
 * Determine optimal granularity based on period duration
 * @param {number} days - Number of days in the period
 * @returns {string} Granularity type
 */
export const determineGranularity = (days) => {
  if (days <= 31) return GRANULARITY.DAILY;
  if (days <= 365) return GRANULARITY.WEEKLY;
  return GRANULARITY.MONTHLY;
};

/**
 * Get date key for grouping based on granularity
 * @param {Date} date - Date to format
 * @param {string} granularity - Granularity type
 * @returns {string} Formatted date key
 */
export const getDateKey = (date, granularity) => {
  const d = new Date(date);
  
  switch (granularity) {
    case GRANULARITY.DAILY:
      return d.toISOString().split('T')[0]; // YYYY-MM-DD
      
    case GRANULARITY.WEEKLY: {
      // Get Monday of the week
      const monday = periodUtils.getStartOfWeek(d);
      return monday.toISOString().split('T')[0];
    }
      
    case GRANULARITY.MONTHLY: {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}`; // YYYY-MM
    }
      
    default:
      return d.toISOString().split('T')[0];
  }
};

/**
 * Format date key for display
 * @param {string} dateKey - Date key from getDateKey
 * @param {string} granularity - Granularity type
 * @returns {string} Formatted label
 */
export const formatDateLabel = (dateKey, granularity) => {
  switch (granularity) {
    case GRANULARITY.DAILY: {
      const [year, month, day] = dateKey.split('-');
      return `${day}/${month}`;
    }
      
    case GRANULARITY.WEEKLY: {
      const [year, month, day] = dateKey.split('-');
      const date = new Date(year, month - 1, day);
      const endOfWeek = new Date(date);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      return `${day}/${month} - ${endOfWeek.getDate()}/${String(endOfWeek.getMonth() + 1).padStart(2, '0')}`;
    }
      
    case GRANULARITY.MONTHLY: {
      const [year, month] = dateKey.split('-');
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
                          'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return `${monthNames[parseInt(month) - 1]}/${year}`;
    }
      
    default:
      return dateKey;
  }
};

/**
 * Generate all date keys for a period based on granularity
 * @param {Date} startDate - Start of period
 * @param {Date} endDate - End of period
 * @param {string} granularity - Granularity type
 * @returns {Array<string>} Array of date keys
 */
export const generateDateKeys = (startDate, endDate, granularity) => {
  const keys = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    keys.push(getDateKey(current, granularity));
    
    // Increment based on granularity
    switch (granularity) {
      case GRANULARITY.DAILY:
        current.setDate(current.getDate() + 1);
        break;
      case GRANULARITY.WEEKLY:
        current.setDate(current.getDate() + 7);
        break;
      case GRANULARITY.MONTHLY:
        current.setMonth(current.getMonth() + 1);
        break;
    }
  }
  
  // Remove duplicates (can happen with weekly/monthly)
  return [...new Set(keys)];
};

/**
 * Aggregate cards by creation date
 * @param {Array} cards - Array of normalized cards
 * @param {Date} startDate - Start of period
 * @param {Date} endDate - End of period
 * @param {string} granularity - Granularity type
 * @returns {Object} Map of dateKey -> count
 */
export const aggregateByCreation = (cards, startDate, endDate, granularity) => {
  const aggregated = {};
  
  // Initialize all date keys with 0
  const dateKeys = generateDateKeys(startDate, endDate, granularity);
  dateKeys.forEach(key => {
    aggregated[key] = 0;
  });
  
  // Count cards by creation date
  cards.forEach(card => {
    if (!card.creationDate) return;
    const creationDate = new Date(card.creationDate);
    if (creationDate < startDate || creationDate > endDate) return;
    
    const key = getDateKey(creationDate, granularity);
    if (aggregated.hasOwnProperty(key)) {
      aggregated[key]++;
    }
  });
  
  return aggregated;
};

/**
 * Aggregate cards by completion date
 * @param {Array} cards - Array of normalized cards
 * @param {Date} startDate - Start of period
 * @param {Date} endDate - End of period
 * @param {string} granularity - Granularity type
 * @returns {Object} Map of dateKey -> count
 */
export const aggregateByCompletion = (cards, startDate, endDate, granularity) => {
  const aggregated = {};
  
  // Initialize all date keys with 0
  const dateKeys = generateDateKeys(startDate, endDate, granularity);
  dateKeys.forEach(key => {
    aggregated[key] = 0;
  });
  
  // Count completed cards only
  cards.forEach(card => {
    if (!card.isComplete || !card.completionDate) return;
    const completionDate = new Date(card.completionDate);
    if (completionDate < startDate || completionDate > endDate) return;
    
    const key = getDateKey(completionDate, granularity);
    if (aggregated.hasOwnProperty(key)) {
      aggregated[key]++;
    }
  });
  
  return aggregated;
};

/**
 * Generate evolution chart dataset
 * @param {Array} cards - Array of normalized cards
 * @param {Object} periodRange - Period range from calculatePeriodRange
 * @param {string} customGranularity - Override automatic granularity (optional)
 * @returns {Object} Chart dataset
 */
export const generateEvolutionDataset = (cards, periodRange, customGranularity = null) => {
  const { startDate, endDate, days } = periodRange;
  
  // Determine granularity
  const granularity = customGranularity || determineGranularity(days);
  
  // Get date keys
  const dateKeys = generateDateKeys(startDate, endDate, granularity);
  
  // Aggregate data
  const createdData = aggregateByCreation(cards, startDate, endDate, granularity);
  const completedData = aggregateByCompletion(cards, startDate, endDate, granularity);
  
  // Build dataset
  const dataset = {
    labels: dateKeys.map(key => formatDateLabel(key, granularity)),
    dateKeys: dateKeys,
    granularity: granularity,
    series: {
      created: {
        label: 'Novos Processos',
        data: dateKeys.map(key => createdData[key] || 0),
        color: '#3b82f6', // blue
      },
      completed: {
        label: 'Processos Concluídos',
        data: dateKeys.map(key => completedData[key] || 0),
        color: '#10b981', // green
      }
    },
    totals: {
      created: Object.values(createdData).reduce((sum, val) => sum + val, 0),
      completed: Object.values(completedData).reduce((sum, val) => sum + val, 0),
    },
    metadata: {
      startDate,
      endDate,
      days,
      granularity,
      dataPoints: dateKeys.length,
    }
  };
  
  return dataset;
};

/**
 * Calculate cumulative values (running totals)
 * @param {Array} values - Array of values
 * @returns {Array} Cumulative values
 */
export const calculateCumulative = (values) => {
  let sum = 0;
  return values.map(val => {
    sum += val;
    return sum;
  });
};

/**
 * Generate evolution dataset with cumulative series
 * @param {Array} cards - Array of normalized cards
 * @param {Object} periodRange - Period range from calculatePeriodRange
 * @param {string} customGranularity - Override automatic granularity (optional)
 * @returns {Object} Chart dataset with cumulative data
 */
export const generateEvolutionDatasetWithCumulative = (cards, periodRange, customGranularity = null) => {
  const baseDataset = generateEvolutionDataset(cards, periodRange, customGranularity);
  
  // Add cumulative series
  baseDataset.series.createdCumulative = {
    label: 'Novos Processos (Acumulado)',
    data: calculateCumulative(baseDataset.series.created.data),
    color: '#059669', // darker green
  };
  
  baseDataset.series.completedCumulative = {
    label: 'Processos Concluídos (Acumulado)',
    data: calculateCumulative(baseDataset.series.completed.data),
    color: '#2563eb', // darker blue
  };
  
  return baseDataset;
};

/**
 * Get summary statistics from evolution dataset
 * @param {Object} dataset - Dataset from generateEvolutionDataset
 * @returns {Object} Summary statistics
 */
export const getEvolutionSummary = (dataset) => {
  const { created, completed } = dataset.series;
  
  const createdData = created.data;
  const completedData = completed.data;
  
  // Calculate averages
  const avgCreated = createdData.reduce((sum, val) => sum + val, 0) / createdData.length;
  const avgCompleted = completedData.reduce((sum, val) => sum + val, 0) / completedData.length;
  
  // Calculate max/min
  const maxCreated = Math.max(...createdData);
  const minCreated = Math.min(...createdData);
  const maxCompleted = Math.max(...completedData);
  const minCompleted = Math.min(...completedData);
  
  // Find peak dates
  const peakCreatedIndex = createdData.indexOf(maxCreated);
  const peakCompletedIndex = completedData.indexOf(maxCompleted);
  
  return {
    averages: {
      created: Math.round(avgCreated * 10) / 10,
      completed: Math.round(avgCompleted * 10) / 10,
    },
    peaks: {
      created: {
        value: maxCreated,
        date: dataset.labels[peakCreatedIndex],
        dateKey: dataset.dateKeys[peakCreatedIndex],
      },
      completed: {
        value: maxCompleted,
        date: dataset.labels[peakCompletedIndex],
        dateKey: dataset.dateKeys[peakCompletedIndex],
      }
    },
    ranges: {
      created: { min: minCreated, max: maxCreated },
      completed: { min: minCompleted, max: maxCompleted },
    },
    totals: dataset.totals,
  };
};

/**
 * Calculate trend (linear regression slope)
 * @param {Array} values - Array of values
 * @returns {string} Trend direction ('up' | 'down' | 'stable')
 */
export const calculateTrend = (values) => {
  if (values.length < 2) return 'stable';
  
  const n = values.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }
  
  // Calculate slope
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  
  // Determine trend (threshold: 0.1)
  if (slope > 0.1) return 'up';
  if (slope < -0.1) return 'down';
  return 'stable';
};

/**
 * Add trend analysis to evolution dataset
 * @param {Object} dataset - Dataset from generateEvolutionDataset
 * @returns {Object} Dataset with trend analysis
 */
export const addTrendAnalysis = (dataset) => {
  const createdTrend = calculateTrend(dataset.series.created.data);
  const completedTrend = calculateTrend(dataset.series.completed.data);
  
  return {
    ...dataset,
    trends: {
      created: createdTrend,
      completed: completedTrend,
    }
  };
};

/**
 * Generate complete evolution dataset with all enhancements
 * @param {Array} cards - Array of normalized cards
 * @param {Object} periodRange - Period range from calculatePeriodRange
 * @param {Object} options - Options { cumulative: boolean, trend: boolean }
 * @returns {Object} Enhanced chart dataset
 */
export const generateCompleteEvolutionDataset = (
  cards, 
  periodRange, 
  options = { cumulative: false, trend: false }
) => {
  // Base dataset
  let dataset = options.cumulative 
    ? generateEvolutionDatasetWithCumulative(cards, periodRange)
    : generateEvolutionDataset(cards, periodRange);
  
  // Add summary
  dataset.summary = getEvolutionSummary(dataset);
  
  // Add trend analysis
  if (options.trend) {
    dataset = addTrendAnalysis(dataset);
  }
  
  return dataset;
};

/**
 * Get the date range (start, end) for a given date key and granularity
 * @param {string} dateKey - Date key from getDateKey
 * @param {string} granularity - Granularity type
 * @returns {{ start: Date, end: Date }}
 */
export const getDateRangeForKey = (dateKey, granularity) => {
  switch (granularity) {
    case GRANULARITY.DAILY: {
      const [year, month, day] = dateKey.split('-').map(Number);
      const start = new Date(year, month - 1, day, 0, 0, 0, 0);
      const end = new Date(year, month - 1, day, 23, 59, 59, 999);
      return { start, end };
    }
    case GRANULARITY.WEEKLY: {
      const [year, month, day] = dateKey.split('-').map(Number);
      const start = new Date(year, month - 1, day, 0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case GRANULARITY.MONTHLY: {
      const [year, month] = dateKey.split('-').map(Number);
      const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const end = new Date(year, month, 0, 23, 59, 59, 999);
      return { start, end };
    }
    default:
      return null;
  }
};

/**
 * Get new and completed cards for a specific date key
 * @param {Array} cards - Normalized cards
 * @param {string} dateKey - Date key from getDateKey
 * @param {string} granularity - Granularity type
 * @returns {{ newCards: Array, completedCards: Array }}
 */
export const getCardsForDateKey = (cards, dateKey, granularity) => {
  const range = getDateRangeForKey(dateKey, granularity);
  if (!range || !Array.isArray(cards)) return { newCards: [], completedCards: [] };

  const { start, end } = range;

  const newCards = cards.filter(card => {
    if (!card.creationDate) return false;
    const d = new Date(card.creationDate);
    return d >= start && d <= end;
  });

  const completedCards = cards.filter(card => {
    if (!card.completionDate) return false;
    const d = new Date(card.completionDate);
    return d >= start && d <= end;
  });

  return { newCards, completedCards };
};

export default {
  GRANULARITY,
  determineGranularity,
  getDateKey,
  formatDateLabel,
  generateDateKeys,
  aggregateByCreation,
  aggregateByCompletion,
  getDateRangeForKey,
  getCardsForDateKey,
  generateEvolutionDataset,
  calculateCumulative,
  generateEvolutionDatasetWithCumulative,
  getEvolutionSummary,
  calculateTrend,
  addTrendAnalysis,
  generateCompleteEvolutionDataset,
};
