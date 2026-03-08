import React from 'react';

const ImoviewChartTooltip = ({ active, payload, label, dark }) => {
  if (!active || !Array.isArray(payload) || payload.length === 0) return null;

  return (
    <div className={`rounded-lg border px-3 py-2 text-xs ${dark ? 'border-neutral-700 bg-neutral-900 text-neutral-100' : 'border-neutral-300 bg-white text-neutral-800'}`}>
      {label ? <p className="font-semibold mb-1">{label}</p> : null}
      {payload.map((entry) => (
        <p key={`${entry.name}-${entry.dataKey}`}>{entry.name}: {entry.value}</p>
      ))}
    </div>
  );
};

export default ImoviewChartTooltip;
