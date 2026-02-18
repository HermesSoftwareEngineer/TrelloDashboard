import { useState } from 'react';
import { getComprehensiveMetrics } from '../utils/analyticsV2';
import PeriodFilter from './PeriodFilter';
import { LineChart, BarChart, DoughnutChart } from './Charts';

const DashboardV2 = ({ cards, lists, members, actions, dark = true }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  if (!cards || cards.length === 0) return null;

  const effectivePeriod =
    selectedPeriod === 'custom' && customStart && customEnd ? 'custom' :
    selectedPeriod === 'custom' ? 'month' : selectedPeriod;

  const metrics = getComprehensiveMetrics(
    cards, lists, members, actions,
    effectivePeriod, customStart, customEnd
  );

  const alpha = (hex, a) => {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  };

  const RED = ['#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d', '#fca5a5', '#f87171', '#fecaca'];

  const timeSeriesData = {
    labels: metrics.timeSeries.map(d => d.label),
    datasets: [
      { label: 'Novos', data: metrics.timeSeries.map(d => d.new), borderColor: '#ef4444', backgroundColor: alpha('#ef4444', 0.06), fill: true, tension: 0.4, pointRadius: 2, pointHoverRadius: 5, borderWidth: 1.5 },
      { label: 'Concluidos', data: metrics.timeSeries.map(d => d.completed), borderColor: '#b91c1c', backgroundColor: alpha('#b91c1c', 0.06), fill: true, tension: 0.4, pointRadius: 2, pointHoverRadius: 5, borderWidth: 1.5 },
    ],
  };

  const statusData = {
    labels: ['Novos', 'Em Andamento', 'Concluidos'],
    datasets: [{ data: [metrics.summary.new, metrics.summary.inProgress, metrics.summary.completed], backgroundColor: [alpha('#ef4444', 0.9), alpha('#dc2626', 0.7), alpha('#7f1d1d', 0.9)], borderWidth: 0, hoverOffset: 4 }],
  };

  const labelData = {
    labels: metrics.byLabel.map(item => item.label.name),
    datasets: [{ label: 'Dias', data: metrics.byLabel.map(item => parseFloat(item.average)), backgroundColor: RED.map(c => alpha(c, 0.85)), borderRadius: 4, borderSkipped: false }],
  };

  const memberData = {
    labels: metrics.byMember.map(item => item.memberName),
    datasets: [{ label: 'Dias', data: metrics.byMember.map(item => parseFloat(item.average)), backgroundColor: alpha('#dc2626', 0.85), borderRadius: 4, borderSkipped: false }],
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <PeriodFilter
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
        customStart={customStart}
        customEnd={customEnd}
        onCustomDateChange={(type, val) => type === 'start' ? setCustomStart(val) : setCustomEnd(val)}
        dark={dark}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ height: 224 }}><LineChart data={timeSeriesData} dark={dark} /></div>
        <div style={{ height: 224 }}><DoughnutChart data={statusData} dark={dark} /></div>
        {metrics.byLabel?.length > 0 && <div style={{ height: 224 }}><BarChart data={labelData} dark={dark} /></div>}
        {metrics.byMember?.length > 0 && <div style={{ height: 224 }}><BarChart data={memberData} dark={dark} /></div>}
      </div>
    </div>
  );
};

export default DashboardV2;
