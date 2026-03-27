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

  // Selected process type labels (multi-select)
  const [selectedProcessTypeIds, setSelectedProcessTypeIds] = useState([]);

  // Selected collaborators (multi-select)
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  
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
   * Set selected process type IDs
   */
  const changeProcessTypeFilter = useCallback((processTypeIds = []) => {
    if (!Array.isArray(processTypeIds)) {
      setSelectedProcessTypeIds([]);
      return;
    }

    const sanitizedIds = processTypeIds.filter((id) => typeof id === 'string' && id.trim().length > 0);
    setSelectedProcessTypeIds(Array.from(new Set(sanitizedIds)));
  }, []);

  /**
   * Toggle a process type in the selected filter set
   */
  const toggleProcessTypeFilter = useCallback((processTypeId) => {
    if (!processTypeId || typeof processTypeId !== 'string') {
      return;
    }

    setSelectedProcessTypeIds((prev) => {
      if (prev.includes(processTypeId)) {
        return prev.filter((id) => id !== processTypeId);
      }
      return [...prev, processTypeId];
    });
  }, []);

  /**
   * Clear all selected process type filters
   */
  const clearProcessTypeFilters = useCallback(() => {
    setSelectedProcessTypeIds([]);
  }, []);

  /**
   * Set selected collaborator IDs
   */
  const changeMemberFilter = useCallback((memberIds = []) => {
    if (!Array.isArray(memberIds)) {
      setSelectedMemberIds([]);
      return;
    }

    const sanitizedIds = memberIds.filter((id) => typeof id === 'string' && id.trim().length > 0);
    setSelectedMemberIds(Array.from(new Set(sanitizedIds)));
  }, []);

  /**
   * Toggle collaborator in the selected filter set
   */
  const toggleMemberFilter = useCallback((memberId) => {
    if (!memberId || typeof memberId !== 'string') {
      return;
    }

    setSelectedMemberIds((prev) => {
      if (prev.includes(memberId)) {
        return prev.filter((id) => id !== memberId);
      }
      return [...prev, memberId];
    });
  }, []);

  /**
   * Clear all selected collaborator filters
   */
  const clearMemberFilters = useCallback(() => {
    setSelectedMemberIds([]);
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

    const periodFilteredData = applyPeriodFilter(cards, periodRange);

    if (selectedProcessTypeIds.length === 0 && selectedMemberIds.length === 0) {
      return periodFilteredData;
    }

    const hasSelectedProcessType = (card) => {
      if (selectedProcessTypeIds.length === 0) {
        return true;
      }

      const processTypes = Array.isArray(card?.processTypes) ? card.processTypes : [];
      return processTypes.some((processType) => selectedProcessTypeIds.includes(processType?.id));
    };

    const hasSelectedMember = (card) => {
      if (selectedMemberIds.length === 0) {
        return true;
      }

      const members = Array.isArray(card?.members) ? card.members : [];
      return members.some((member) => selectedMemberIds.includes(member?.id));
    };

    const hasSelectedFilters = (card) => hasSelectedProcessType(card) && hasSelectedMember(card);

    const created = periodFilteredData.cards.created.filter(hasSelectedFilters);
    const completed = periodFilteredData.cards.completed.filter(hasSelectedFilters);
    const inProgress = periodFilteredData.cards.inProgress.filter(hasSelectedFilters);
    const active = periodFilteredData.cards.active.filter(hasSelectedFilters);

    return {
      ...periodFilteredData,
      cards: {
        created,
        completed,
        inProgress,
        active,
      },
      counts: {
        created: created.length,
        completed: completed.length,
        inProgress: inProgress.length,
        active: active.length,
      },
      averages: {
        createdPerDay: (created.length / periodRange.days).toFixed(1),
        completedPerDay: (completed.length / periodRange.days).toFixed(1),
      }
    };
  }, [periodRange, selectedProcessTypeIds, selectedMemberIds]);
  
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
    selectedProcessTypeIds,
    selectedMemberIds,
    
    // Actions
    changePeriodType,
    setCustomDateRange,
    resetPeriod,
    setReferenceDate,
    changeProcessTypeFilter,
    toggleProcessTypeFilter,
    clearProcessTypeFilters,
    changeMemberFilter,
    toggleMemberFilter,
    clearMemberFilters,
    
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
