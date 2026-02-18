import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

const grid  = (d) => d ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';
const tick  = (d) => d ? '#525252' : '#a3a3a3';
const leg   = (d) => d ? '#525252' : '#a3a3a3';
const ttOpt = (d) => ({
  backgroundColor: d ? '#111111' : '#ffffff',
  titleColor:      d ? '#f5f5f5' : '#0c0c0c',
  bodyColor:       d ? '#737373' : '#737373',
  borderColor:     d ? '#272727' : '#e5e5e5',
  borderWidth: 1, padding: 10, cornerRadius: 6,
  displayColors: true, boxWidth: 8, boxHeight: 8,
});
const legOpt = (d, pos = 'top') => ({
  position: pos,
  labels: { color: leg(d), font: { size: 12 }, boxWidth: 10, boxHeight: 10, padding: 20 },
});

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Line Chart Component
export const LineChart = ({ data, options, dark = false }) => {
  const opts = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: legOpt(dark), tooltip: ttOpt(dark) },
    scales: {
      x: {
        grid: { color: grid(dark) },
        ticks: { color: tick(dark), font: { size: 11 }, maxRotation: 0 },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        grid: { color: grid(dark) },
        ticks: { color: tick(dark), precision: 0, font: { size: 11 } },
        border: { display: false },
      },
    },
    ...options,
  };
  return <Line data={data} options={opts} />;
};

// Bar Chart Component
export const BarChart = ({ data, options, dark = false }) => {
  const opts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: legOpt(dark), tooltip: ttOpt(dark) },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: tick(dark), font: { size: 11 } },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        grid: { color: grid(dark) },
        ticks: { color: tick(dark), precision: 0, font: { size: 11 } },
        border: { display: false },
      },
    },
    ...options,
  };
  return <Bar data={data} options={opts} />;
};

// Doughnut Chart Component
export const DoughnutChart = ({ data, options, onSliceClick }) => {
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
    onClick: onSliceClick
      ? (event, elements) => { if (elements.length > 0) onSliceClick(elements[0].index); }
      : undefined,
    onHover: onSliceClick
      ? (event, elements) => {
          if (event.native) event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
        }
      : undefined,
    ...options,
  };

  return <Doughnut data={data} options={defaultOptions} />;
};
