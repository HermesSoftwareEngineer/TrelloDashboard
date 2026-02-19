import { useState } from 'react';
import PeriodFilter from './PeriodFilter';
import EvolutionChart from './EvolutionChart';
import StatusPieChart from './StatusPieChart';
import LabelAnalysisChart from './LabelAnalysisChart';
import ListAnalysisChart from './ListAnalysisChart';
import MemberAnalysisChart from './MemberAnalysisChart';
import HorizontalAnalysisDashboard from './HorizontalAnalysisDashboard';
import MemberProcessTypeBlocks from './MemberProcessTypeBlocks';
import KPIsPanel from './KPIsPanel';
import usePeriodFilter from '../hooks/usePeriodFilter';

const DashboardV2 = ({ dark = true, normalizedData = null }) => {
  const { periodRange, filterCards } = usePeriodFilter();
  const [viewMode, setViewMode] = useState('standard');
  const [horizontalGranularity, setHorizontalGranularity] = useState('month');
  const [horizontalCount, setHorizontalCount] = useState(12);

  if (!normalizedData) {
    return (
      <div className="w-full p-6">
        <p className="text-sm text-neutral-500">Nenhum dado disponivel</p>
      </div>
    );
  }

  const filteredData = filterCards(normalizedData.cards);
  const { counts, averages } = filteredData;

  return (
    <div className="w-full p-6">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setViewMode('standard')}
            className={`px-3 py-2 text-xs font-bold uppercase tracking-widest rounded-lg border transition-colors ${
              viewMode === 'standard'
                ? (dark ? 'bg-white text-black border-white' : 'bg-black text-white border-black')
                : (dark ? 'border-neutral-700 text-neutral-400 hover:text-neutral-100' : 'border-neutral-200 text-neutral-500 hover:text-neutral-900')
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setViewMode('horizontal')}
            className={`px-3 py-2 text-xs font-bold uppercase tracking-widest rounded-lg border transition-colors ${
              viewMode === 'horizontal'
                ? (dark ? 'bg-white text-black border-white' : 'bg-black text-white border-black')
                : (dark ? 'border-neutral-700 text-neutral-400 hover:text-neutral-100' : 'border-neutral-200 text-neutral-500 hover:text-neutral-900')
            }`}
          >
            Analise Horizontal
          </button>
        </div>

        {viewMode === 'horizontal' ? (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-widest ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>
                Granularidade
              </span>
              <select
                value={horizontalGranularity}
                onChange={(event) => setHorizontalGranularity(event.target.value)}
                className={`text-xs rounded-lg border px-3 py-2 ${
                  dark ? 'bg-neutral-900 border-neutral-700 text-neutral-100' : 'bg-white border-neutral-200 text-neutral-900'
                }`}
              >
                <option value="week">Semanal</option>
                <option value="month">Mensal</option>
                <option value="quarter">Trimestral</option>
                <option value="year">Anual</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-widest ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>
                Periodos
              </span>
              <input
                type="number"
                min={2}
                max={36}
                value={horizontalCount}
                onChange={(event) => setHorizontalCount(Number(event.target.value) || 2)}
                className={`w-20 text-xs rounded-lg border px-3 py-2 ${
                  dark ? 'bg-neutral-900 border-neutral-700 text-neutral-100' : 'bg-white border-neutral-200 text-neutral-900'
                }`}
              />
            </div>
          </div>
        ) : (
          <PeriodFilter dark={dark} className="mb-0" />
        )}
      </div>

      {viewMode === 'horizontal' ? (
        <div className={`${
          dark ? 'bg-[#0c0c0c] border border-[#272727]' : 'bg-white border border-[#e5e5e5]'
        } rounded-2xl p-6 mb-6`}>
          <HorizontalAnalysisDashboard
            cards={normalizedData.cards}
            dark={dark}
            granularity={horizontalGranularity}
            periodsCount={horizontalCount}
          />
        </div>
      ) : (
        <>
          <div className={`${
            dark ? 'bg-[#0c0c0c] border border-[#272727]' : 'bg-white border border-[#e5e5e5]'
          } rounded-2xl p-6 mb-6`}>
            <KPIsPanel
              cards={normalizedData.cards}
              periodRange={periodRange}
              dark={dark}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className={`${
              dark ? 'bg-[#0c0c0c] border border-[#272727]' : 'bg-white border border-[#e5e5e5]'
            } rounded-2xl p-6`}>
              <EvolutionChart
                cards={normalizedData.cards}
                periodRange={periodRange}
                dark={dark}
              />
            </div>

            <div className={`${
              dark ? 'bg-[#0c0c0c] border border-[#272727]' : 'bg-white border border-[#e5e5e5]'
            } rounded-2xl p-6`}>
              <StatusPieChart
                cards={normalizedData.cards}
                periodRange={periodRange}
                dark={dark}
                variant="doughnut"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className={`${
              dark ? 'bg-[#0c0c0c] border border-[#272727]' : 'bg-white border border-[#e5e5e5]'
            } rounded-2xl p-6`}>
              <LabelAnalysisChart
                cards={normalizedData.cards}
                periodRange={periodRange}
                dark={dark}
              />
            </div>

            <div className={`${
              dark ? 'bg-[#0c0c0c] border border-[#272727]' : 'bg-white border border-[#e5e5e5]'
            } rounded-2xl p-6`}>
              <ListAnalysisChart
                cards={normalizedData.cards}
                periodRange={periodRange}
                dark={dark}
              />
            </div>

            <div className={`${
              dark ? 'bg-[#0c0c0c] border border-[#272727]' : 'bg-white border border-[#e5e5e5]'
            } rounded-2xl p-6`}>
              <MemberAnalysisChart
                cards={normalizedData.cards}
                periodRange={periodRange}
                dark={dark}
              />
            </div>
          </div>

          <div className={`${
            dark ? 'bg-[#0c0c0c] border border-[#272727]' : 'bg-white border border-[#e5e5e5]'
          } rounded-2xl p-6 mb-6`}>
            <MemberProcessTypeBlocks
              cards={normalizedData.cards}
              periodRange={periodRange}
              dark={dark}
            />
          </div>

          <div className={`${
            dark ? 'bg-[#0c0c0c] border border-[#272727]' : 'bg-white border border-[#e5e5e5]'
          } rounded-2xl p-6`}>
            <h2 className={`text-xs font-bold uppercase tracking-widest mb-4 ${
              dark ? 'text-[#737373]' : 'text-[#737373]'
            }`}>
              Resumo do Periodo Filtrado
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className={`text-xs mb-1 ${dark ? 'text-[#525252]' : 'text-[#a3a3a3]'}`}>
                  Criados
                </p>
                <p className={`text-2xl font-bold ${dark ? 'text-[#f5f5f5]' : 'text-[#0c0c0c]'}`}>
                  {counts.created}
                </p>
                <p className={`text-xs ${dark ? 'text-[#525252]' : 'text-[#737373]'}`}>
                  {averages.createdPerDay}/dia
                </p>
              </div>

              <div>
                <p className={`text-xs mb-1 ${dark ? 'text-[#525252]' : 'text-[#a3a3a3]'}`}>
                  Concluidos
                </p>
                <p className={`text-2xl font-bold ${dark ? 'text-[#f5f5f5]' : 'text-[#0c0c0c]'}`}>
                  {counts.completed}
                </p>
                <p className={`text-xs ${dark ? 'text-[#525252]' : 'text-[#737373]'}`}>
                  {averages.completedPerDay}/dia
                </p>
              </div>

              <div>
                <p className={`text-xs mb-1 ${dark ? 'text-[#525252]' : 'text-[#a3a3a3]'}`}>
                  Em Andamento
                </p>
                <p className={`text-2xl font-bold ${dark ? 'text-[#f5f5f5]' : 'text-[#0c0c0c]'}`}>
                  {counts.inProgress}
                </p>
              </div>

              <div>
                <p className={`text-xs mb-1 ${dark ? 'text-[#525252]' : 'text-[#a3a3a3]'}`}>
                  Com Atividade
                </p>
                <p className={`text-2xl font-bold ${dark ? 'text-[#f5f5f5]' : 'text-[#0c0c0c]'}`}>
                  {counts.active}
                </p>
              </div>
            </div>

            <div className={`text-xs ${dark ? 'text-[#525252]' : 'text-[#737373]'}`}>
              <p><strong>Periodo:</strong> {periodRange.label}</p>
              <p><strong>Dias:</strong> {periodRange.days}</p>
              <p><strong>Data Inicio:</strong> {periodRange.startDate?.toLocaleDateString?.() || 'N/A'}</p>
              <p><strong>Data Fim:</strong> {periodRange.endDate?.toLocaleDateString?.() || 'N/A'}</p>
              <p><strong>Total de cards no board:</strong> {normalizedData.cards.length}</p>
              <p><strong>Cards com creationDate:</strong> {normalizedData.cards.filter(c => c.creationDate).length}</p>
              <p><strong>Cards com completionDate:</strong> {normalizedData.cards.filter(c => c.completionDate).length}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardV2;
