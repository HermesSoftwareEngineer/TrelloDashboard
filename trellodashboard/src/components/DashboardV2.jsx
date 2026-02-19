import PeriodFilter from './PeriodFilter';
import EvolutionChart from './EvolutionChart';
import StatusPieChart from './StatusPieChart';
import LabelAnalysisChart from './LabelAnalysisChart';
import ListAnalysisChart from './ListAnalysisChart';
import MemberAnalysisChart from './MemberAnalysisChart';
import MemberProcessTypeBlocks from './MemberProcessTypeBlocks';
import KPIsPanel from './KPIsPanel';
import usePeriodFilter from '../hooks/usePeriodFilter';

const DashboardV2 = ({ dark = true, normalizedData = null }) => {
  const { periodRange, filterCards } = usePeriodFilter();
  

  
  if (!normalizedData) {
    return (
      <div className="w-full p-6">
        <p className="text-sm text-neutral-500">Nenhum dado disponível</p>
      </div>
    );
  }
  
  // Apply period filter to cards
  const filteredData = filterCards(normalizedData.cards);
  const { cards: filteredCards, counts, averages } = filteredData;
  
  return (
    <div className="w-full p-6">
      {/* Period Filter */}
      <PeriodFilter dark={dark} className="mb-6" />
      
      {/* Debug Info - Temporary */}
      <div className={`${
        dark ? 'bg-[#0c0c0c] border border-[#272727]' : 'bg-white border border-[#e5e5e5]'
      } rounded-2xl p-6 mb-6`}>
        <h2 className={`text-xs font-bold uppercase tracking-widest mb-4 ${
          dark ? 'text-[#737373]' : 'text-[#737373]'
        }`}>
          Resumo do Período Filtrado
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
              Concluídos
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
          <p><strong>Período:</strong> {periodRange.label}</p>
          <p><strong>Dias:</strong> {periodRange.days}</p>
          <p><strong>Data Início:</strong> {periodRange.startDate?.toLocaleDateString?.() || 'N/A'}</p>
          <p><strong>Data Fim:</strong> {periodRange.endDate?.toLocaleDateString?.() || 'N/A'}</p>
          <p><strong>Total de cards no board:</strong> {normalizedData.cards.length}</p>
          <p><strong>Cards com creationDate:</strong> {normalizedData.cards.filter(c => c.creationDate).length}</p>
          <p><strong>Cards com completionDate:</strong> {normalizedData.cards.filter(c => c.completionDate).length}</p>
        </div>
      </div>
      
      {/* KPIs de Vazão */}
      <div className={`${
        dark ? 'bg-[#0c0c0c] border border-[#272727]' : 'bg-white border border-[#e5e5e5]'
      } rounded-2xl p-6 mb-6`}>
        <KPIsPanel 
          cards={normalizedData.cards} 
          periodRange={periodRange} 
          dark={dark} 
        />
      </div>
      
      {/* Gráficos Principais (Evolução e Status) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Gráfico de Evolução */}
        <div className={`${
          dark ? 'bg-[#0c0c0c] border border-[#272727]' : 'bg-white border border-[#e5e5e5]'
        } rounded-2xl p-6`}>
          <EvolutionChart 
            cards={normalizedData.cards} 
            periodRange={periodRange} 
            dark={dark} 
          />
        </div>
        
        {/* Gráfico de Status (Pizza) */}
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

      {/* Análises Avançadas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Análise por Tipo de Processo */}
        <div className={`${
          dark ? 'bg-[#0c0c0c] border border-[#272727]' : 'bg-white border border-[#e5e5e5]'
        } rounded-2xl p-6`}>
          <LabelAnalysisChart 
            cards={normalizedData.cards}
            periodRange={periodRange}
            dark={dark}
          />
        </div>

        {/* Análise por Lista (Prioridade) */}
        <div className={`${
          dark ? 'bg-[#0c0c0c] border border-[#272727]' : 'bg-white border border-[#e5e5e5]'
        } rounded-2xl p-6`}>
          <ListAnalysisChart 
            cards={normalizedData.cards}
            periodRange={periodRange}
            dark={dark}
          />
        </div>

        {/* Análise por Colaborador */}
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

      {/* Tipos de Processo por Colaborador */}
      <div className={`${
        dark ? 'bg-[#0c0c0c] border border-[#272727]' : 'bg-white border border-[#e5e5e5]'
      } rounded-2xl p-6 mb-6`}>
        <MemberProcessTypeBlocks
          cards={normalizedData.cards}
          periodRange={periodRange}
          dark={dark}
        />
      </div>
    </div>
  );
};

export default DashboardV2;
