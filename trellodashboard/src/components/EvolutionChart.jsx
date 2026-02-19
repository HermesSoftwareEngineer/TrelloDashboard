import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { generateEvolutionDataset } from '../utils/chartDataProcessor';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const EvolutionChart = ({ cards, periodRange, dark = true }) => {
  if (!cards || !periodRange) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className={`text-sm ${dark ? 'text-neutral-500' : 'text-neutral-400'}`}>
          Sem dados para exibir
        </p>
      </div>
    );
  }

  // Gerar dataset usando a lógica já implementada
  const evolutionData = generateEvolutionDataset(
    cards,
    periodRange
  );

  // Configurar dados para Chart.js
  const chartData = {
    labels: evolutionData.labels,
    datasets: [
      {
        label: 'Novos Processos',
        data: evolutionData.series.created.data,
        borderColor: evolutionData.series.created.color,
        backgroundColor: dark 
          ? 'rgba(59, 130, 246, 0.1)' 
          : 'rgba(59, 130, 246, 0.2)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: evolutionData.series.created.color,
        pointBorderColor: dark ? '#0a0a0a' : '#ffffff',
        pointBorderWidth: 2,
      },
      {
        label: 'Processos Concluídos',
        data: evolutionData.series.completed.data,
        borderColor: evolutionData.series.completed.color,
        backgroundColor: dark
          ? 'rgba(16, 185, 129, 0.1)'
          : 'rgba(16, 185, 129, 0.2)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: evolutionData.series.completed.color,
        pointBorderColor: dark ? '#0a0a0a' : '#ffffff',
        pointBorderWidth: 2,
      }
    ]
  };

  // Configurar opções do gráfico
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: {
          color: dark ? '#a3a3a3' : '#525252',
          font: {
            size: 11,
            family: 'system-ui, -apple-system, sans-serif'
          },
          padding: 15,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        enabled: true,
        backgroundColor: dark ? '#171717' : '#ffffff',
        titleColor: dark ? '#f5f5f5' : '#0a0a0a',
        bodyColor: dark ? '#a3a3a3' : '#525252',
        borderColor: dark ? '#272727' : '#e5e5e5',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y}`;
          }
        }
      },
      title: {
        display: false
      }
    },
    scales: {
      x: {
        grid: {
          display: true,
          color: dark ? '#1a1a1a' : '#f5f5f5',
          drawBorder: false
        },
        ticks: {
          color: dark ? '#737373' : '#737373',
          font: {
            size: 10
          },
          maxRotation: 45,
          minRotation: 0
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          display: true,
          color: dark ? '#1a1a1a' : '#f5f5f5',
          drawBorder: false
        },
        ticks: {
          color: dark ? '#737373' : '#737373',
          font: {
            size: 10
          },
          precision: 0
        }
      }
    },
    interaction: {
      mode: 'index',
      intersect: false
    }
  };

  return (
    <div className="w-full">
      {/* Cabeçalho do gráfico */}
      <div className="mb-4">
        <h3 className={`text-xs font-bold uppercase tracking-widest ${
          dark ? 'text-neutral-500' : 'text-neutral-600'
        }`}>
          Evolução de Processos
        </h3>
        <p className={`text-xs mt-1 ${dark ? 'text-neutral-600' : 'text-neutral-500'}`}>
          Granularidade: {evolutionData.metadata.granularity === 'daily' ? 'Diária' : 
                         evolutionData.metadata.granularity === 'weekly' ? 'Semanal' : 'Mensal'}
        </p>
      </div>

      {/* Gráfico */}
      <div className="h-80">
        <Line data={chartData} options={options} />
      </div>

      {/* Resumo abaixo do gráfico */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className={`p-3 rounded-lg ${dark ? 'bg-neutral-900' : 'bg-neutral-50'}`}>
          <p className={`text-xs ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>
            Total de Novos
          </p>
          <p className={`text-xl font-bold ${dark ? 'text-blue-400' : 'text-blue-600'}`}>
            {evolutionData.series.created.total}
          </p>
        </div>
        <div className={`p-3 rounded-lg ${dark ? 'bg-neutral-900' : 'bg-neutral-50'}`}>
          <p className={`text-xs ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>
            Total de Concluídos
          </p>
          <p className={`text-xl font-bold ${dark ? 'text-green-400' : 'text-green-600'}`}>
            {evolutionData.series.completed.total}
          </p>
        </div>
      </div>
    </div>
  );
};

export default EvolutionChart;
