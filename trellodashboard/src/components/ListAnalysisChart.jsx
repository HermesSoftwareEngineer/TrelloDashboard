import { useState } from 'react';
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
import { generateListAnalysisDataset } from '../utils/listAnalysisProcessor';
import CardsListModal from './CardsListModal';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const ListAnalysisChart = ({ cards, periodRange, dark = true }) => {
  const [selectedList, setSelectedList] = useState(null);

  if (!cards || !periodRange) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className={`text-sm ${dark ? 'text-neutral-500' : 'text-neutral-400'}`}>
          Sem dados para exibir
        </p>
      </div>
    );
  }

  const listAnalysis = generateListAnalysisDataset(
    cards,
    periodRange.startDate,
    periodRange.endDate
  );

  if (!listAnalysis || listAnalysis.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className={`text-sm ${dark ? 'text-neutral-500' : 'text-neutral-400'}`}>
          Nenhuma lista encontrada
        </p>
      </div>
    );
  }

  // Gráfico de barras empilhadas com status por lista
  const chartData = {
    labels: listAnalysis.map(l => l.listName || 'Sem Lista'),
    datasets: [
      {
        label: 'Novos',
        data: listAnalysis.map(l => l.new || 0),
        backgroundColor: dark ? 'rgba(59, 130, 246, 0.8)' : 'rgba(59, 130, 246, 0.9)',
        borderRadius: 6,
        borderWidth: 0
      },
      {
        label: 'Em Andamento',
        data: listAnalysis.map(l => l.inProgress || 0),
        backgroundColor: dark ? 'rgba(245, 158, 11, 0.8)' : 'rgba(245, 158, 11, 0.9)',
        borderRadius: 6,
        borderWidth: 0
      },
      {
        label: 'Concluídos',
        data: listAnalysis.map(l => l.completed || 0),
        backgroundColor: dark ? 'rgba(16, 185, 129, 0.8)' : 'rgba(16, 185, 129, 0.9)',
        borderRadius: 6,
        borderWidth: 0
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    onClick: (event, elements) => {
      if (!elements || elements.length === 0) return;
      const index = elements[0].index;
      const item = listAnalysis[index];
      if (!item) return;
      setSelectedList(item);
    },
    onHover: (event, elements) => {
      if (event.native) {
        event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
      }
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
        padding: 12,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.x}`;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
        grid: {
          display: true,
          color: dark ? '#1a1a1a' : '#f5f5f5',
          drawBorder: false
        },
        ticks: {
          color: dark ? '#737373' : '#737373',
          font: { size: 10 },
          precision: 0
        }
      },
      y: {
        stacked: true,
        grid: {
          display: false
        },
        ticks: {
          color: dark ? '#737373' : '#737373',
          font: { size: 10 }
        }
      }
    }
  };

  // Encontrar lista com melhor e pior desempenho
  const sortedByCompletionRate = [...listAnalysis].sort((a, b) =>
    (b.completionRate || 0) - (a.completionRate || 0)
  );
  const bestList = sortedByCompletionRate[0];
  const worstList = sortedByCompletionRate[sortedByCompletionRate.length - 1];

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className={`text-xs font-bold uppercase tracking-widest ${
          dark ? 'text-neutral-500' : 'text-neutral-600'
        }`}>
          Análise por Lista (Prioridade)
        </h3>
        <p className={`text-xs mt-1 ${dark ? 'text-neutral-600' : 'text-neutral-500'}`}>
          Distribuição de status por nível de prioridade
        </p>
      </div>

      <div className="h-80 mb-4">
        <Bar data={chartData} options={options} />
      </div>

      {/* Insights */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`p-3 rounded-lg ${dark ? 'bg-neutral-900' : 'bg-neutral-50'}`}>
          <p className={`text-xs ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>
            Melhor Desempenho
          </p>
          <p className={`text-sm font-bold ${dark ? 'text-green-400' : 'text-green-600'}`}>
            {bestList?.listName || 'N/A'}
          </p>
          <p className={`text-xs ${dark ? 'text-neutral-600' : 'text-neutral-500'}`}>
            {bestList?.completionRate || 0}% conclusão
          </p>
        </div>

        <div className={`p-3 rounded-lg ${dark ? 'bg-neutral-900' : 'bg-neutral-50'}`}>
          <p className={`text-xs ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>
            Maior Volume
          </p>
          <p className={`text-sm font-bold ${dark ? 'text-yellow-400' : 'text-yellow-600'}`}>
            {listAnalysis.reduce((max, l) => l.total > max.total ? l : max, listAnalysis[0])?.listName || 'N/A'}
          </p>
          <p className={`text-xs ${dark ? 'text-neutral-600' : 'text-neutral-500'}`}>
            {listAnalysis.reduce((max, l) => l.total > max.total ? l : max, listAnalysis[0])?.total || 0} cards
          </p>
        </div>
      </div>

      {/* Detalhes por lista */}
      <div className={`mt-4 p-4 rounded-lg ${dark ? 'bg-neutral-900' : 'bg-neutral-50'}`}>
        <p className={`text-xs font-bold mb-3 ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>
          Detalhes por Lista
        </p>
        <div className={`space-y-3 max-h-48 overflow-y-auto scrollbar-thin ${
          dark ? 'scrollbar-dark' : 'scrollbar-light'
        }`}>
          {listAnalysis.map((list, idx) => (
            <div key={idx} className={`p-2 rounded ${dark ? 'bg-neutral-800' : 'bg-neutral-100'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className={`text-xs font-bold ${dark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                  {list.listName || 'Sem Lista'}
                </span>
                <span className={`text-xs font-bold ${dark ? 'text-green-400' : 'text-green-600'}`}>
                  {list.completionRate}%
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className={dark ? 'text-blue-400' : 'text-blue-600'}>
                  🆕 {list.new}
                </div>
                <div className={dark ? 'text-yellow-400' : 'text-yellow-600'}>
                  ⏳ {list.inProgress}
                </div>
                <div className={dark ? 'text-green-400' : 'text-green-600'}>
                  ✓ {list.completed}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de detalhes da lista clicada */}
      {selectedList && (
        <CardsListModal
          title={selectedList.listName}
          subtitle="Análise por Lista (Prioridade)"
          sections={[
            {
              title: 'Em Andamento',
              dotColor: 'bg-yellow-500',
              accentColor: dark ? 'text-yellow-400' : 'text-yellow-600',
              badgeColor: dark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700',
              cards: selectedList.cards.filter(c => !c.isComplete && !c.isClosed),
              dateField: 'creationDate',
            },
            {
              title: 'Concluídos',
              dotColor: 'bg-green-500',
              accentColor: dark ? 'text-green-400' : 'text-green-600',
              badgeColor: dark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700',
              cards: selectedList.cards.filter(c => c.isComplete),
              dateField: 'completionDate',
            },
          ]}
          dark={dark}
          onClose={() => setSelectedList(null)}
        />
      )}
    </div>
  );
};

export default ListAnalysisChart;
