import React from 'react';

const MetricCard = ({ title, value, subtitle, color = 'bg-gray-700' }) => {
  return (
    <div className={`p-4 rounded-lg shadow-md flex items-center ${color}`}>
      <div className="flex-1">
        <p className="text-sm text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );
};

export default MetricCard;

