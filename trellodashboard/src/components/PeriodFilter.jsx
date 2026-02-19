/**
 * Period Filter Component
 * Global period filter UI with automatic context integration
 */

import { useState } from 'react';
import usePeriodFilter from '../hooks/usePeriodFilter';
import periodUtils from '../utils/periodUtils';

const { PERIOD_TYPES, getPeriodOptions, formatDateForInput } = periodUtils;

/**
 * Period Filter Component
 * @param {Object} props
 * @param {boolean} props.dark - Dark mode flag
 * @param {string} props.className - Additional CSS classes
 */
const PeriodFilter = ({ dark = false, className = '' }) => {
  const {
    periodType,
    periodRange,
    customRange,
    changePeriodType,
    setCustomDateRange,
    periodDescription,
  } = usePeriodFilter();
  
  // Local state for custom date inputs
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [customError, setCustomError] = useState('');
  
  // Period options
  const periodOptions = getPeriodOptions();
  
  // Handle period type change
  const handlePeriodChange = (newPeriodType) => {
    setCustomError('');
    changePeriodType(newPeriodType);
  };
  
  // Handle custom date change
  const handleCustomDateChange = (field, value) => {
    setCustomError('');
    
    if (field === 'start') {
      setCustomStart(value);
      
      // Auto-apply if both dates are set
      if (value && customEnd) {
        applyCustomRange(value, customEnd);
      }
    } else {
      setCustomEnd(value);
      
      // Auto-apply if both dates are set
      if (customStart && value) {
        applyCustomRange(customStart, value);
      }
    }
  };
  
  // Apply custom date range
  const applyCustomRange = (start, end) => {
    const success = setCustomDateRange(start, end);
    
    if (!success) {
      const validation = periodUtils.validateCustomRange(start, end);
      setCustomError(validation.error);
    }
  };
  
  // CSS classes
  const containerCls = `${
    dark ? 'bg-[#111111] border border-[#272727]' : 'bg-white border border-[#e5e5e5]'
  } rounded-2xl px-6 py-4 flex flex-wrap items-end gap-5 ${className}`;
  
  const fieldCls = dark
    ? 'bg-[#0c0c0c] border border-[#272727] text-[#f5f5f5] focus:border-[#dc2626] focus:outline-none rounded-xl px-4 py-2 text-sm transition-colors cursor-pointer'
    : 'bg-white border border-[#e5e5e5] text-[#0c0c0c] focus:border-[#dc2626] focus:outline-none rounded-xl px-4 py-2 text-sm transition-colors cursor-pointer';
  
  const labelCls = `text-[10px] font-bold uppercase tracking-widest mb-1.5 block ${
    dark ? 'text-[#525252]' : 'text-[#a3a3a3]'
  }`;
  
  const descriptionCls = `text-xs ${dark ? 'text-[#737373]' : 'text-[#737373]'} mt-1`;
  const errorCls = 'text-xs text-red-600 mt-1';
  
  return (
    <div className={containerCls}>
      {/* Period Type Select */}
      <div className="flex-1 min-w-[200px]">
        <label className={labelCls}>Período</label>
        <select 
          value={periodType} 
          onChange={(e) => handlePeriodChange(e.target.value)} 
          className={fieldCls}
        >
          {periodOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {periodType !== PERIOD_TYPES.CUSTOM && (
          <p className={descriptionCls}>
            {periodDescription}
          </p>
        )}
      </div>
      
      {/* Custom Date Inputs */}
      {periodType === PERIOD_TYPES.CUSTOM && (
        <>
          <div className="min-w-[160px]">
            <label className={labelCls}>Data Inicial</label>
            <input 
              type="date" 
              value={customStart}
              onChange={(e) => handleCustomDateChange('start', e.target.value)} 
              className={fieldCls}
              max={customEnd || undefined}
            />
          </div>
          
          <div className="min-w-[160px]">
            <label className={labelCls}>Data Final</label>
            <input 
              type="date" 
              value={customEnd}
              onChange={(e) => handleCustomDateChange('end', e.target.value)} 
              className={fieldCls}
              min={customStart || undefined}
            />
          </div>
          
          {/* Custom Range Info or Error */}
          <div className="flex-1 min-w-[200px] flex items-end">
            {customError ? (
              <p className={errorCls}>{customError}</p>
            ) : customStart && customEnd ? (
              <p className={descriptionCls}>
                {periodDescription}
              </p>
            ) : (
              <p className={descriptionCls}>
                Selecione as datas inicial e final
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default PeriodFilter;
