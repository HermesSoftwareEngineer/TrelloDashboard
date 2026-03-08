import React from 'react';
import { PERIOD_FILTER_OPTIONS, PERIOD_FILTER_TYPES, formatDate } from './contractsPeriod';

const ContractsPeriodFilterSection = ({
  dark,
  periodType,
  customStartDate,
  customEndDate,
  setPeriodType,
  setCustomStartDate,
  setCustomEndDate,
  selectedPeriodRange,
}) => {
  return (
    <section className={`rounded-2xl border p-4 ${dark ? 'border-neutral-800 bg-neutral-900/40' : 'border-neutral-200 bg-white'}`}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="md:col-span-2">
          <label className={`text-xs uppercase tracking-widest block mb-1 ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>
            Filtro por período
          </label>
          <select
            value={periodType}
            onChange={(event) => setPeriodType(event.target.value)}
            className={`w-full rounded-lg border px-3 py-2 text-sm ${dark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`}
          >
            {PERIOD_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        {periodType === PERIOD_FILTER_TYPES.CUSTOM ? (
          <>
            <div>
              <label className={`text-xs uppercase tracking-widest block mb-1 ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                Data inicial
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(event) => setCustomStartDate(event.target.value)}
                max={customEndDate || undefined}
                className={`w-full rounded-lg border px-3 py-2 text-sm ${dark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`}
              />
            </div>
            <div>
              <label className={`text-xs uppercase tracking-widest block mb-1 ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                Data final
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(event) => setCustomEndDate(event.target.value)}
                min={customStartDate || undefined}
                className={`w-full rounded-lg border px-3 py-2 text-sm ${dark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-neutral-300 text-neutral-900'}`}
              />
            </div>
          </>
        ) : null}
      </div>

      <p className={`text-xs mt-3 ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>
        Período selecionado: <strong>{selectedPeriodRange.label}</strong> ({formatDate(selectedPeriodRange.startDate)} a {formatDate(selectedPeriodRange.endDate)})
      </p>
      <p className={`text-xs mt-1 ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>
        Regra de período: locações por <code>datainicio</code> e rescisões por <code>datarescisao</code>, sempre com datas do Imoview.
      </p>
    </section>
  );
};

export default ContractsPeriodFilterSection;
