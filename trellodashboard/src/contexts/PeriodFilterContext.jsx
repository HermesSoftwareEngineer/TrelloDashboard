/**
 * Period Filter Context
 * Global state management for period filtering across the entire dashboard
 */

import { createContext, useState, useCallback, useMemo } from 'react';
import periodUtils from '../utils/periodUtils';

const { PERIOD_TYPES, calculatePeriodRange, applyPeriodFilter } = periodUtils;

/**
 * Context for period filter state
 */
export const PeriodFilterContext = createContext(null);

/**
 * Period Filter Provider Component
 * Wraps the application to provide global period filter state
 */
export const PeriodFilterProvider = ({ children }) => {
  // Current period type
  const [periodType, setPeriodType] = useState(PERIOD_TYPES.THIS_MONTH);
  
  // Custom date range (for CUSTOM period type)
  const [customRange, setCustomRange] = useState({
    startDate: null,
    endDate: null,
  });
  
  // Reference date (for testing different "current" dates)
  const [referenceDate, setReferenceDate] = useState(new Date());
  
  /**
   * Calculate current period range based on selected period type
   */
  const periodRange = useMemo(() => {
    try {
      return calculatePeriodRange(periodType, referenceDate, customRange);
    } catch (error) {
      console.error('Error calculating period range:', error);
      // Fallback to this month
      return calculatePeriodRange(PERIOD_TYPES.THIS_MONTH, referenceDate);
    }
  }, [periodType, referenceDate, customRange]);
  
  /**
   * Change period type
   */
  const changePeriodType = useCallback((newPeriodType) => {
    setPeriodType(newPeriodType);
    
    // If switching away from custom, clear custom dates
    if (newPeriodType !== PERIOD_TYPES.CUSTOM) {
      setCustomRange({ startDate: null, endDate: null });
    }
  }, []);
  
  /**
   * Set custom date range
   */
  const setCustomDateRange = useCallback((startDate, endDate) => {
    // Validate dates
    const validation = periodUtils.validateCustomRange(startDate, endDate);
    
    if (!validation.valid) {
      console.error('Invalid custom range:', validation.error);
      return false;
    }
    
    setCustomRange({ startDate, endDate });
    setPeriodType(PERIOD_TYPES.CUSTOM);
    return true;
  }, []);
  
  /**
   * Reset to default period (This Month)
   */
  const resetPeriod = useCallback(() => {
    setPeriodType(PERIOD_TYPES.THIS_MONTH);
    setCustomRange({ startDate: null, endDate: null });
    setReferenceDate(new Date());
  }, []);
  
  /**
   * Apply period filter to cards data
   * Returns filtered cards with statistics
   */
  const filterCards = useCallback((cards) => {
    if (!cards || !Array.isArray(cards)) {
      return {
        period: periodRange,
        cards: { created: [], completed: [], inProgress: [], active: [] },
        counts: { created: 0, completed: 0, inProgress: 0, active: 0 },
        averages: { createdPerDay: '0.0', completedPerDay: '0.0' },
      };
    }
    
    return applyPeriodFilter(cards, periodRange);
  }, [periodRange]);
  
  /**
   * Check if a date is within the current period
   */
  const isDateInCurrentPeriod = useCallback((date) => {
    return periodUtils.isDateInPeriod(date, periodRange.startDate, periodRange.endDate);
  }, [periodRange]);
  
  /**
   * Get period description for display
   */
  const periodDescription = useMemo(() => {
    return periodUtils.getPeriodDescription(periodRange);
  }, [periodRange]);
  
  // Context value
  const contextValue = {
    // State
    periodType,
    periodRange,
    customRange,
    referenceDate,
    periodDescription,
    
    // Actions
    changePeriodType,
    setCustomDateRange,
    resetPeriod,
    setReferenceDate,
    
    // Utilities
    filterCards,
    isDateInCurrentPeriod,
  };
  
  return (
    <PeriodFilterContext.Provider value={contextValue}>
      {children}
    </PeriodFilterContext.Provider>
  );
};

export default PeriodFilterContext;
