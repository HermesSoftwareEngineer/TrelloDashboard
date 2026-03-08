import React from 'react';

const KpiCard = ({ dark, label, value, valueClassName = 'text-2xl', onClick }) => {
  const isClickable = typeof onClick === 'function';

  return (
    <article
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? onClick : undefined}
      onKeyDown={isClickable ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      } : undefined}
      className={`rounded-2xl border p-4 transition-colors ${
        dark ? 'border-neutral-800 bg-neutral-900/60' : 'border-neutral-200 bg-white'
      } ${isClickable ? (dark ? 'cursor-pointer hover:border-neutral-600' : 'cursor-pointer hover:border-neutral-400') : ''}`}
    >
      <p className={`text-xs uppercase tracking-widest ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>{label}</p>
      <p className={`${valueClassName} font-bold mt-1 ${dark ? 'text-white' : 'text-neutral-900'}`}>{value}</p>
    </article>
  );
};

export default KpiCard;
