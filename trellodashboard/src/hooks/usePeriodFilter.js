/**
 * Custom hook to use Period Filter context
 */

import { useContext } from 'react';
import { PeriodFilterContext } from '../contexts/PeriodFilterContext';

/**
 * Hook to access period filter state and actions
 * Must be used within PeriodFilterProvider
 * 
 * @returns {Object} Period filter context
 * @throws {Error} If used outside PeriodFilterProvider
 * 
 * @example
 * const { periodRange, filterCards, changePeriodType } = usePeriodFilter();
 * 
 * // Filter cards from Trello
 * const filteredData = filterCards(normalizedCards);
 * 
 * // Change period
 * changePeriodType(PERIOD_TYPES.THIS_WEEK);
 */
export const usePeriodFilter = () => {
  const context = useContext(PeriodFilterContext);
  
  if (!context) {
    throw new Error('usePeriodFilter must be used within PeriodFilterProvider');
  }
  
  return context;
};

export default usePeriodFilter;
