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
import { generateMemberAnalysisDataset } from '../utils/memberAnalysisProcessor';
import CardsListModal from './CardsListModal';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const MemberAnalysisChart = ({ cards, periodRange, dark = true }) => {
  const [selectedMember, setSelectedMember] = useState(null);

  if (!cards || !periodRange) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className={`text-sm ${dark ? 'text-neutral-500' : 'text-neutral-400'}`}>
          Sem dados para exibir
        </p>
      </div>
    );
  }

  const memberAnalysis = generateMemberAnalysisDataset(
    cards,
    periodRange.startDate,
    periodRange.endDate
  );

  if (!memberAnalysis || memberAnalysis.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className={`text-sm ${dark ? 'text-neutral-500' : 'text-neutral-400'}`}>
          Nenhum colaborador encontrado
        </p>
      </div>
    );
  }

  // Limitar a 8 colaboradores para melhor visualização
  const topMembers = memberAnalysis.slice(0, 8);

  const chartData = {
    labels: topMembers.map(m => m.memberName || 'Sem Responsável'),
    datasets: [
      {
        label: 'Taxa de Conclusão (%)',
        data: topMembers.map(m => m.completionRate || 0),
        backgroundColor: dark ? 'rgba(59, 130, 246, 0.7)' : 'rgba(59, 130, 246, 0.8)',
        borderColor: dark ? 'rgba(59, 130, 246, 1)' : 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
        borderRadius: 6,
        yAxisID: 'y'
      },
      {
        label: 'Tempo Médio (dias)',
        data: topMembers.map(m => m.avgProcessTimeDays || 0),
        backgroundColor: dark ? 'rgba(245, 158, 11, 0.7)' : 'rgba(245, 158, 11, 0.8)',
        borderColor: dark ? 'rgba(245, 158, 11, 1)' : 'rgba(245, 158, 11, 1)',
        borderWidth: 1,
        borderRadius: 6,
        yAxisID: 'y1'
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (event, elements) => {
      if (!elements || elements.length === 0) return;
      const index = elements[0].index;
      const item = topMembers[index];
      if (!item) return;
      setSelectedMember(item);
    },
    onHover: (event, elements) => {
      if (event.native) {
        event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
      }
    },
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
          precision: 0,
          max: 100
        },
        title: {
          display: true,
          text: 'Taxa (%)',
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
          text: 'Dias',
          color: dark ? '#a3a3a3' : '#525252',
          font: { size: 10 }
        }
      }
    }
  };

  // Top performer
  const topPerformer = memberAnalysis.reduce((max, m) => 
    (m.completionRate || 0) > (max.completionRate || 0) ? m : max
  );
  
  // Mais produtivo
  const mostProductive = memberAnalysis.reduce((max, m) =>
    (m.totalCompleted || 0) > (max.totalCompleted || 0) ? m : max
  );

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className={`text-xs font-bold uppercase tracking-widest ${
          dark ? 'text-neutral-500' : 'text-neutral-600'
        }`}>
          Análise por Colaborador
        </h3>
        <p className={`text-xs mt-1 ${dark ? 'text-neutral-600' : 'text-neutral-500'}`}>
          Performance e produtividade (Top {topMembers.length} de {memberAnalysis.length})
        </p>
      </div>

      <div className="h-80 mb-4">
        <Bar data={chartData} options={options} />
      </div>

      {/* Insights */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`p-3 rounded-lg ${dark ? 'bg-neutral-900' : 'bg-neutral-50'}`}>
          <p className={`text-xs ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>
            Top Performer
          </p>
          <p className={`text-sm font-bold ${dark ? 'text-green-400' : 'text-green-600'}`}>
            {topPerformer?.memberName || 'N/A'}
          </p>
          <p className={`text-xs ${dark ? 'text-neutral-600' : 'text-neutral-500'}`}>
            {topPerformer?.completionRate || 0}% conclusão
          </p>
        </div>

        <div className={`p-3 rounded-lg ${dark ? 'bg-neutral-900' : 'bg-neutral-50'}`}>
          <p className={`text-xs ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>
            Mais Produtivo
          </p>
          <p className={`text-sm font-bold ${dark ? 'text-blue-400' : 'text-blue-600'}`}>
            {mostProductive?.memberName || 'N/A'}
          </p>
          <p className={`text-xs ${dark ? 'text-neutral-600' : 'text-neutral-500'}`}>
            {mostProductive?.totalCompleted || 0} concluídos
          </p>
        </div>
      </div>

      {/* Tabela de colaboradores */}
      <div className={`mt-4 p-4 rounded-lg ${dark ? 'bg-neutral-900' : 'bg-neutral-50'}`}>
        <p className={`text-xs font-bold mb-3 ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>
          Ranking de Colaboradores
        </p>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {memberAnalysis.map((member, idx) => (
            <div key={idx} className="flex justify-between items-center text-xs">
              <div className="flex-1">
                <span className={`font-medium ${dark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                  {idx + 1}. {member.memberName || 'Sem Responsável'}
                </span>
              </div>
              <div className="flex gap-4">
                <span className={`font-medium ${dark ? 'text-blue-400' : 'text-blue-600'}`}>
                  {member.totalCompleted || 0} ✓
                </span>
                <span className={`font-medium ${dark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                  {member.avgProcessTimeDays || 0}d
                </span>
                <span className={`font-medium ${dark ? 'text-green-400' : 'text-green-600'}`}>
                  {member.completionRate || 0}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de detalhes do colaborador clicado */}
      {selectedMember && (
        <CardsListModal
          title={selectedMember.memberName}
          subtitle="Análise por Colaborador"
          sections={[
            {
              title: 'Em Andamento',
              dotColor: 'bg-yellow-500',
              accentColor: dark ? 'text-yellow-400' : 'text-yellow-600',
              badgeColor: dark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700',
              cards: selectedMember.cards.filter(c => !c.isComplete && !c.isClosed),
              dateField: 'creationDate',
            },
            {
              title: 'Concluídos',
              dotColor: 'bg-green-500',
              accentColor: dark ? 'text-green-400' : 'text-green-600',
              badgeColor: dark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700',
              cards: selectedMember.cards.filter(c => c.isComplete),
              dateField: 'completionDate',
            },
          ]}
          dark={dark}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </div>
  );
};

export default MemberAnalysisChart;
