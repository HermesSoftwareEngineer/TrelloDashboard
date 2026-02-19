import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { generateLabelAnalysisDataset } from '../utils/labelAnalysisProcessor';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const LabelAnalysisChart = ({ cards, periodRange, dark = true }) => {
  if (!cards || !periodRange) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className={`text-sm ${dark ? 'text-neutral-500' : 'text-neutral-400'}`}>
          Sem dados para exibir
        </p>
      </div>
    );
  }

  const labelAnalysis = generateLabelAnalysisDataset(
    cards,
    periodRange.startDate,
    periodRange.endDate
  );

  if (!labelAnalysis || labelAnalysis.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className={`text-sm ${dark ? 'text-neutral-500' : 'text-neutral-400'}`}>
          Nenhum label encontrado no período
        </p>
      </div>
    );
  }

  // Preparar dados para gráfico de barras
  const chartData = {
    labels: labelAnalysis.map(l => l.labelName || 'Sem Tipo'),
    datasets: [
      {
        label: 'Tempo Médio (dias)',
        data: labelAnalysis.map(l => l.avgCompletionTimeDays || 0),
        backgroundColor: dark ? 'rgba(59, 130, 246, 0.7)' : 'rgba(59, 130, 246, 0.8)',
        borderColor: dark ? 'rgba(59, 130, 246, 1)' : 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
        borderRadius: 6,
        yAxisID: 'y'
      },
      {
        label: 'Total de Cards',
        data: labelAnalysis.map(l => l.total),
        backgroundColor: dark ? 'rgba(16, 185, 129, 0.7)' : 'rgba(16, 185, 129, 0.8)',
        borderColor: dark ? 'rgba(16, 185, 129, 1)' : 'rgba(16, 185, 129, 1)',
        borderWidth: 1,
        borderRadius: 6,
        yAxisID: 'y1'
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: dark ? '#a3a3a3' : '#525252',
          font: { size: 11 },
          padding: 15,
          usePointStyle: true
        }
      },
      tooltip: {
        enabled: true,
        backgroundColor: dark ? '#171717' : '#ffffff',
        titleColor: dark ? '#f5f5f5' : '#0a0a0a',
        bodyColor: dark ? '#a3a3a3' : '#525252',
        borderColor: dark ? '#272727' : '#e5e5e5',
        borderWidth: 1,
        padding: 12
      }
    },
    scales: {
      x: {
        stacked: false,
        grid: {
          display: true,
          color: dark ? '#1a1a1a' : '#f5f5f5',
          drawBorder: false
        },
        ticks: {
          color: dark ? '#737373' : '#737373',
          font: { size: 10 },
          maxRotation: 45,
          minRotation: 0
        }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        grid: {
          color: dark ? '#1a1a1a' : '#f5f5f5',
          drawBorder: false
        },
        ticks: {
          color: dark ? '#737373' : '#737373',
          font: { size: 10 },
          precision: 0
        },
        title: {
          display: true,
          text: 'Tempo (dias)',
          color: dark ? '#a3a3a3' : '#525252',
          font: { size: 10 }
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: {
          drawOnChartArea: false
        },
        ticks: {
          color: dark ? '#737373' : '#737373',
          font: { size: 10 },
          precision: 0
        },
        title: {
          display: true,
          text: 'Quantidade',
          color: dark ? '#a3a3a3' : '#525252',
          font: { size: 10 }
        }
      }
    }
  };

  // Encontrar label com maior e menor tempo médio
  const sortedByTime = [...labelAnalysis].sort((a, b) => 
    (b.avgCompletionTimeDays || 0) - (a.avgCompletionTimeDays || 0)
  );
  const fastestLabel = sortedByTime[sortedByTime.length - 1];
  const slowestLabel = sortedByTime[0];

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className={`text-xs font-bold uppercase tracking-widest ${
          dark ? 'text-neutral-500' : 'text-neutral-600'
        }`}>
          Análise por Tipo de Processo
        </h3>
        <p className={`text-xs mt-1 ${dark ? 'text-neutral-600' : 'text-neutral-500'}`}>
          Tempo médio e quantidade por tipo
        </p>
      </div>

      <div className="h-80 mb-4">
        <Bar data={chartData} options={options} />
      </div>

      {/* Insights */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`p-3 rounded-lg ${dark ? 'bg-neutral-900' : 'bg-neutral-50'}`}>
          <p className={`text-xs ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>
            Mais Rápido
          </p>
          <p className={`text-sm font-bold ${dark ? 'text-green-400' : 'text-green-600'}`}>
            {fastestLabel?.labelName || 'N/A'}
          </p>
          <p className={`text-xs ${dark ? 'text-neutral-600' : 'text-neutral-500'}`}>
            {fastestLabel?.avgCompletionTimeDays || 0}d
          </p>
        </div>

        <div className={`p-3 rounded-lg ${dark ? 'bg-neutral-900' : 'bg-neutral-50'}`}>
          <p className={`text-xs ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>
            Mais Lento
          </p>
          <p className={`text-sm font-bold ${dark ? 'text-red-400' : 'text-red-600'}`}>
            {slowestLabel?.labelName || 'N/A'}
          </p>
          <p className={`text-xs ${dark ? 'text-neutral-600' : 'text-neutral-500'}`}>
            {slowestLabel?.avgCompletionTimeDays || 0}d
          </p>
        </div>
      </div>

      {/* Legenda de tipos */}
      <div className={`mt-4 p-4 rounded-lg ${dark ? 'bg-neutral-900' : 'bg-neutral-50'}`}>
        <p className={`text-xs font-bold mb-3 ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>
          Estatísticas por Tipo
        </p>
        <div className={`space-y-2 max-h-48 overflow-y-auto scrollbar-thin ${
          dark ? 'scrollbar-dark' : 'scrollbar-light'
        }`}>
          {labelAnalysis.map((label, idx) => (
            <div key={idx} className="flex justify-between items-center text-xs">
              <span className={`flex-1 ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                {label.labelName || 'Sem Tipo'}
              </span>
              <div className="flex gap-3">
                <span className={`font-medium ${dark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                  {label.total} cards
                </span>
                <span className={`font-medium ${dark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                  {label.avgCompletionTimeDays || 0}d
                </span>
                <span className={`font-medium ${dark ? 'text-green-400' : 'text-green-600'}`}>
                  {label.completionRate}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LabelAnalysisChart;
