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
const PeriodFilter = ({ dark = false, className = '', processTypeOptions = [], memberOptions = [] }) => {
  const {
    periodType,
    periodRange,
    customRange,
    changePeriodType,
    setCustomDateRange,
    periodDescription,
    selectedProcessTypeIds,
    toggleProcessTypeFilter,
    clearProcessTypeFilters,
    selectedMemberIds,
    toggleMemberFilter,
    clearMemberFilters,
  } = usePeriodFilter();
  
  // Local state for custom date inputs
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [customError, setCustomError] = useState('');
  const [isProcessTypeOpen, setIsProcessTypeOpen] = useState(false);
  const [isMemberOpen, setIsMemberOpen] = useState(false);
  
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
  const dropdownButtonCls = `${fieldCls} w-full flex items-center justify-between text-left`;
  const dropdownPanelCls = `absolute z-20 mt-2 w-full rounded-xl border shadow-xl max-h-56 overflow-auto ${
    dark ? 'bg-[#0c0c0c] border-[#272727]' : 'bg-white border-[#e5e5e5]'
  }`;
  const optionLabelCls = `flex items-center gap-2 px-3 py-2 text-xs cursor-pointer transition-colors ${
    dark ? 'text-neutral-200 hover:bg-neutral-800' : 'text-neutral-800 hover:bg-neutral-50'
  }`;
  
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

      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <div className="flex items-center justify-between gap-2 mb-2">
            <label className={labelCls}>Tipo de Processo</label>
            {selectedProcessTypeIds.length > 0 && (
              <button
                type="button"
                onClick={clearProcessTypeFilters}
                className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md border transition-colors ${
                  dark
                    ? 'text-neutral-300 border-neutral-700 hover:border-neutral-500 hover:text-white'
                    : 'text-neutral-600 border-neutral-300 hover:border-neutral-500 hover:text-neutral-900'
                }`}
              >
                Limpar
              </button>
            )}
          </div>

          <button
            type="button"
            className={dropdownButtonCls}
            onClick={() => {
              setIsProcessTypeOpen((prev) => !prev);
              setIsMemberOpen(false);
            }}
          >
            <span>
              {selectedProcessTypeIds.length > 0
                ? `${selectedProcessTypeIds.length} selecionado(s)`
                : 'Selecionar tipos'}
            </span>
            <span>{isProcessTypeOpen ? '▴' : '▾'}</span>
          </button>

          {isProcessTypeOpen && (
            <div className={dropdownPanelCls}>
              {processTypeOptions.length > 0 ? (
                processTypeOptions.map((processType) => (
                  <label key={processType.id} className={optionLabelCls}>
                    <input
                      type="checkbox"
                      checked={selectedProcessTypeIds.includes(processType.id)}
                      onChange={() => toggleProcessTypeFilter(processType.id)}
                      className="accent-red-600"
                    />
                    <span className="truncate">{processType.name}</span>
                  </label>
                ))
              ) : (
                <p className={`px-3 py-2 text-xs ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                  Nenhuma tag disponivel para filtro.
                </p>
              )}
            </div>
          )}

          {selectedProcessTypeIds.length > 0 && (
            <p className={descriptionCls}>
              {selectedProcessTypeIds.length} tipo(s) selecionado(s)
            </p>
          )}
        </div>

        <div className="relative">
          <div className="flex items-center justify-between gap-2 mb-2">
            <label className={labelCls}>Colaborador</label>
            {selectedMemberIds.length > 0 && (
              <button
                type="button"
                onClick={clearMemberFilters}
                className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md border transition-colors ${
                  dark
                    ? 'text-neutral-300 border-neutral-700 hover:border-neutral-500 hover:text-white'
                    : 'text-neutral-600 border-neutral-300 hover:border-neutral-500 hover:text-neutral-900'
                }`}
              >
                Limpar
              </button>
            )}
          </div>

          <button
            type="button"
            className={dropdownButtonCls}
            onClick={() => {
              setIsMemberOpen((prev) => !prev);
              setIsProcessTypeOpen(false);
            }}
          >
            <span>
              {selectedMemberIds.length > 0
                ? `${selectedMemberIds.length} selecionado(s)`
                : 'Selecionar colaboradores'}
            </span>
            <span>{isMemberOpen ? '▴' : '▾'}</span>
          </button>

          {isMemberOpen && (
            <div className={dropdownPanelCls}>
              {memberOptions.length > 0 ? (
                memberOptions.map((member) => (
                  <label key={member.id} className={optionLabelCls}>
                    <input
                      type="checkbox"
                      checked={selectedMemberIds.includes(member.id)}
                      onChange={() => toggleMemberFilter(member.id)}
                      className="accent-red-600"
                    />
                    <span className="truncate">{member.name}</span>
                  </label>
                ))
              ) : (
                <p className={`px-3 py-2 text-xs ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                  Nenhum colaborador disponivel para filtro.
                </p>
              )}
            </div>
          )}

          {selectedMemberIds.length > 0 && (
            <p className={descriptionCls}>
              {selectedMemberIds.length} colaborador(es) selecionado(s)
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PeriodFilter;
