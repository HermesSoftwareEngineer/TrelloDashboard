const PeriodFilter = ({ selectedPeriod, onPeriodChange, customStart, customEnd, onCustomDateChange, dark = false }) => {
  const periods = [
    { value: 'today',     label: 'Hoje' },
    { value: 'last7days', label: 'Últ. 7 Dias' },
    { value: 'last30days',label: 'Últ. 30 Dias' },
    { value: 'week',      label: 'Esta Semana' },
    { value: 'month',     label: 'Este Mês' },
    { value: 'lastMonth', label: 'Mês Passado' },
    { value: 'quarter',   label: 'Trimestre' },
    { value: 'year',      label: 'Este Ano' },
    { value: 'all',       label: 'Todos' },
    { value: 'custom',    label: 'Personalizado' },
  ];

  const fieldCls = dark
    ? 'bg-[#111111] border border-[#272727] text-[#f5f5f5] focus:border-[#dc2626] focus:outline-none rounded-xl px-4 py-2 text-sm'
    : 'bg-white border border-[#e5e5e5] text-[#0c0c0c] focus:border-[#dc2626] focus:outline-none rounded-xl px-4 py-2 text-sm';

  const labelCls = `text-[10px] font-bold uppercase tracking-widest mb-1.5 block ${
    dark ? 'text-[#525252]' : 'text-[#a3a3a3]'
  }`;

  return (
    <div className={`${
      dark ? 'bg-[#111111] border border-[#272727]' : 'bg-white border border-[#e5e5e5]'
    } rounded-2xl px-6 py-4 mb-6 flex flex-wrap items-end gap-5`}>
      <div>
        <span className={labelCls}>Período</span>
        <select value={selectedPeriod} onChange={(e) => onPeriodChange(e.target.value)} className={fieldCls}>
          {periods.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>
      {selectedPeriod === 'custom' && (
        <>
          <div>
            <span className={labelCls}>Data Inicial</span>
            <input type="date" value={customStart} onChange={(e) => onCustomDateChange('start', e.target.value)} className={fieldCls} />
          </div>
          <div>
            <span className={labelCls}>Data Final</span>
            <input type="date" value={customEnd} onChange={(e) => onCustomDateChange('end', e.target.value)} className={fieldCls} />
          </div>
        </>
      )}
    </div>
  );
};

export default PeriodFilter;
