import { Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { 
  generateStatusDataset, 
  calculateStatusMetrics,
  getStatusCounts 
} from '../utils/statusChartProcessor';

// Registrar componentes do Chart.js
ChartJS.register(ArcElement, Tooltip, Legend);

const StatusPieChart = ({ cards, periodRange, dark = true, variant = 'pie' }) => {
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
  const statusData = generateStatusDataset(
    cards,
    periodRange.startDate,
    periodRange.endDate
  );

  // Calcular métricas
  const metrics = calculateStatusMetrics(
    cards,
    periodRange.startDate,
    periodRange.endDate
  );

  // Obter contadores
  const counts = getStatusCounts(
    cards,
    periodRange.startDate,
    periodRange.endDate
  );

  // Se não houver dados, mostrar mensagem
  if (statusData.total === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className={`text-sm ${dark ? 'text-neutral-500' : 'text-neutral-400'}`}>
          Nenhum card no período selecionado
        </p>
      </div>
    );
  }

  // Configurar opções do gráfico
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          color: dark ? '#a3a3a3' : '#525252',
          font: {
            size: 11,
            family: 'system-ui, -apple-system, sans-serif'
          },
          padding: 15,
          usePointStyle: true,
          pointStyle: 'circle',
          generateLabels: function(chart) {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label, i) => {
                const value = data.datasets[0].data[i];
                const percentage = statusData.percentages[i];
                return {
                  text: `${label}: ${value} (${percentage}%)`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  hidden: false,
                  index: i
                };
              });
            }
            return [];
          }
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
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed;
            const percentage = statusData.percentages[context.dataIndex];
            return `${label}: ${value} cards (${percentage}%)`;
          }
        }
      }
    },
    cutout: variant === 'doughnut' ? '60%' : '0%'
  };

  // Função para obter cor do health status
  const getHealthColor = (status) => {
    const colors = {
      'Excelente': dark ? 'text-green-400' : 'text-green-600',
      'Bom': dark ? 'text-blue-400' : 'text-blue-600',
      'Regular': dark ? 'text-yellow-400' : 'text-yellow-600',
      'Atenção': dark ? 'text-orange-400' : 'text-orange-600',
      'Crítico': dark ? 'text-red-400' : 'text-red-600'
    };
    return colors[status] || (dark ? 'text-neutral-400' : 'text-neutral-600');
  };

  const ChartComponent = variant === 'doughnut' ? Doughnut : Pie;

  return (
    <div className="w-full">
      {/* Cabeçalho do gráfico */}
      <div className="mb-4">
        <h3 className={`text-xs font-bold uppercase tracking-widest ${
          dark ? 'text-neutral-500' : 'text-neutral-600'
        }`}>
          Status Geral do Período
        </h3>
        <p className={`text-xs mt-1 ${dark ? 'text-neutral-600' : 'text-neutral-500'}`}>
          Distribuição de cards por status
        </p>
      </div>

      {/* Gráfico */}
      <div className="h-80 flex items-center justify-center">
        <div className="w-full max-w-sm">
          <ChartComponent data={statusData} options={options} />
        </div>
      </div>

      {/* Métricas de Desempenho */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
        <div className={`p-3 rounded-lg ${dark ? 'bg-neutral-900' : 'bg-neutral-50'}`}>
          <p className={`text-xs ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>
            Taxa de Conclusão
          </p>
          <p className={`text-lg font-bold ${dark ? 'text-green-400' : 'text-green-600'}`}>
            {metrics.completionRate}%
          </p>
        </div>

        <div className={`p-3 rounded-lg ${dark ? 'bg-neutral-900' : 'bg-neutral-50'}`}>
          <p className={`text-xs ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>
            Taxa de Entrada
          </p>
          <p className={`text-lg font-bold ${dark ? 'text-blue-400' : 'text-blue-600'}`}>
            {metrics.intakeRate}%
          </p>
        </div>

        <div className={`p-3 rounded-lg ${dark ? 'bg-neutral-900' : 'bg-neutral-50'}`}>
          <p className={`text-xs ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>
            Taxa de WIP
          </p>
          <p className={`text-lg font-bold ${dark ? 'text-yellow-400' : 'text-yellow-600'}`}>
            {metrics.wipRate}%
          </p>
        </div>

        <div className={`p-3 rounded-lg ${dark ? 'bg-neutral-900' : 'bg-neutral-50'}`}>
          <p className={`text-xs ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>
            Saúde do Processo
          </p>
          <div className="flex items-baseline gap-2">
            <p className={`text-lg font-bold ${getHealthColor(metrics.healthStatus)}`}>
              {metrics.healthScore}
            </p>
            <p className={`text-xs ${getHealthColor(metrics.healthStatus)}`}>
              {metrics.healthStatus}
            </p>
          </div>
        </div>
      </div>

      {/* Detalhes Adicionais */}
      <div className={`mt-4 p-4 rounded-lg ${dark ? 'bg-neutral-900' : 'bg-neutral-50'}`}>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className={dark ? 'text-neutral-500' : 'text-neutral-600'}>
              Média de conclusões/dia
            </p>
            <p className={`font-bold ${dark ? 'text-neutral-300' : 'text-neutral-700'}`}>
              {metrics.avgCompletionsPerDay}
            </p>
          </div>
          <div>
            <p className={dark ? 'text-neutral-500' : 'text-neutral-600'}>
              Média de novos/dia
            </p>
            <p className={`font-bold ${dark ? 'text-neutral-300' : 'text-neutral-700'}`}>
              {metrics.avgNewPerDay}
            </p>
          </div>
        </div>
      </div>

      {/* Contadores em formato de badges */}
      <div className="flex flex-wrap gap-2 mt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          <span className="text-xs font-medium text-blue-400">{counts.new} novos</span>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20">
          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
          <span className="text-xs font-medium text-yellow-400">{counts.inProgress} andamento</span>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span className="text-xs font-medium text-green-400">{counts.completed} concluídos</span>
        </div>
      </div>
    </div>
  );
};

export default StatusPieChart;
