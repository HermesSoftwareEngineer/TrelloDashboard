/**
 * Evolution Chart Examples
 * Demonstrates usage of chartDataProcessor for evolution charts
 */

import { useTrelloBoard } from '../hooks/useTrello';
import usePeriodFilter from '../hooks/usePeriodFilter';
import chartDataProcessor from '../utils/chartDataProcessor';

/**
 * Example 1: Basic Evolution Chart Data
 */
export const BasicEvolutionData = () => {
  const { normalizedData, isLoading } = useTrelloBoard({ normalize: true });
  const { periodRange } = usePeriodFilter();
  
  if (isLoading || !normalizedData) return null;
  
  // Generate dataset
  const dataset = chartDataProcessor.generateEvolutionDataset(
    normalizedData.cards,
    periodRange
  );
  
  console.log('Evolution Dataset:', dataset);
  
  return (
    <div>
      <h3>Evolução de Processos - {periodRange.label}</h3>
      <p>Granularidade: {dataset.granularity}</p>
      <p>Pontos de dados: {dataset.metadata.dataPoints}</p>
      
      <div>
        <h4>Novos Processos</h4>
        <p>Total: {dataset.totals.created}</p>
        <pre>{JSON.stringify(dataset.series.created.data, null, 2)}</pre>
      </div>
      
      <div>
        <h4>Processos Concluídos</h4>
        <p>Total: {dataset.totals.completed}</p>
        <pre>{JSON.stringify(dataset.series.completed.data, null, 2)}</pre>
      </div>
    </div>
  );
};

/**
 * Example 2: Evolution with Summary Statistics
 */
export const EvolutionWithSummary = () => {
  const { normalizedData, isLoading } = useTrelloBoard({ normalize: true });
  const { periodRange } = usePeriodFilter();
  
  if (isLoading || !normalizedData) return null;
  
  const dataset = chartDataProcessor.generateCompleteEvolutionDataset(
    normalizedData.cards,
    periodRange,
    { cumulative: false, trend: true }
  );
  
  const { summary, trends } = dataset;
  
  return (
    <div>
      <h3>Resumo de Evolução</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4>Novos Processos</h4>
          <p>Média: {summary.averages.created}/período</p>
          <p>Pico: {summary.peaks.created.value} em {summary.peaks.created.date}</p>
          <p>Tendência: {trends.created === 'up' ? '↑ Crescendo' : trends.created === 'down' ? '↓ Decrescendo' : '→ Estável'}</p>
        </div>
        
        <div>
          <h4>Processos Concluídos</h4>
          <p>Média: {summary.averages.completed}/período</p>
          <p>Pico: {summary.peaks.completed.value} em {summary.peaks.completed.date}</p>
          <p>Tendência: {trends.completed === 'up' ? '↑ Crescendo' : trends.completed === 'down' ? '↓ Decrescendo' : '→ Estável'}</p>
        </div>
      </div>
    </div>
  );
};

/**
 * Example 3: Cumulative Evolution Chart
 */
export const CumulativeEvolution = () => {
  const { normalizedData, isLoading } = useTrelloBoard({ normalize: true });
  const { periodRange } = usePeriodFilter();
  
  if (isLoading || !normalizedData) return null;
  
  const dataset = chartDataProcessor.generateEvolutionDatasetWithCumulative(
    normalizedData.cards,
    periodRange
  );
  
  return (
    <div>
      <h3>Evolução Acumulada</h3>
      
      <table>
        <thead>
          <tr>
            <th>Período</th>
            <th>Novos</th>
            <th>Total Novos</th>
            <th>Concluídos</th>
            <th>Total Concluídos</th>
          </tr>
        </thead>
        <tbody>
          {dataset.labels.map((label, index) => (
            <tr key={index}>
              <td>{label}</td>
              <td>{dataset.series.created.data[index]}</td>
              <td>{dataset.series.createdCumulative.data[index]}</td>
              <td>{dataset.series.completed.data[index]}</td>
              <td>{dataset.series.completedCumulative.data[index]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Example 4: Granularity Info Display
 */
export const GranularityDisplay = () => {
  const { periodRange } = usePeriodFilter();
  
  const granularity = chartDataProcessor.determineGranularity(periodRange.days);
  
  const granularityLabels = {
    daily: 'Diário',
    weekly: 'Semanal',
    monthly: 'Mensal',
  };
  
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <p className="text-sm text-blue-800">
        <strong>Período:</strong> {periodRange.days} dias
      </p>
      <p className="text-sm text-blue-800">
        <strong>Granularidade:</strong> {granularityLabels[granularity]}
      </p>
      <p className="text-xs text-blue-600 mt-2">
        {granularity === 'daily' && '≤ 31 dias: visualização diária'}
        {granularity === 'weekly' && '32-365 dias: visualização semanal'}
        {granularity === 'monthly' && '> 365 dias: visualização mensal'}
      </p>
    </div>
  );
};

/**
 * Example 5: Chart Data for Chart.js
 */
export const ChartJsFormat = () => {
  const { normalizedData, isLoading } = useTrelloBoard({ normalize: true });
  const { periodRange } = usePeriodFilter();
  
  if (isLoading || !normalizedData) return null;
  
  const dataset = chartDataProcessor.generateEvolutionDataset(
    normalizedData.cards,
    periodRange
  );
  
  // Format for Chart.js
  const chartJsData = {
    labels: dataset.labels,
    datasets: [
      {
        label: dataset.series.created.label,
        data: dataset.series.created.data,
        borderColor: dataset.series.created.color,
        backgroundColor: dataset.series.created.color + '20',
        tension: 0.4,
      },
      {
        label: dataset.series.completed.label,
        data: dataset.series.completed.data,
        borderColor: dataset.series.completed.color,
        backgroundColor: dataset.series.completed.color + '20',
        tension: 0.4,
      }
    ]
  };
  
  return (
    <pre>
      {JSON.stringify(chartJsData, null, 2)}
    </pre>
  );
};

/**
 * Example 6: Simple Table View
 */
export const EvolutionTable = ({ dark = false }) => {
  const { normalizedData, isLoading } = useTrelloBoard({ normalize: true });
  const { periodRange } = usePeriodFilter();
  
  if (isLoading || !normalizedData) return null;
  
  const dataset = chartDataProcessor.generateEvolutionDataset(
    normalizedData.cards,
    periodRange
  );
  
  return (
    <div className={`${dark ? 'bg-[#0c0c0c]' : 'bg-white'} rounded-2xl p-6`}>
      <h3 className={`text-sm font-bold mb-4 ${dark ? 'text-[#f5f5f5]' : 'text-[#0c0c0c]'}`}>
        Evolução - {periodRange.label}
      </h3>
      
      <table className="w-full text-sm">
        <thead>
          <tr className={dark ? 'text-[#737373]' : 'text-[#737373]'}>
            <th className="text-left py-2">Período</th>
            <th className="text-right py-2">Novos</th>
            <th className="text-right py-2">Concluídos</th>
            <th className="text-right py-2">Diferença</th>
          </tr>
        </thead>
        <tbody>
          {dataset.labels.map((label, index) => {
            const created = dataset.series.created.data[index];
            const completed = dataset.series.completed.data[index];
            const diff = created - completed;
            
            return (
              <tr key={index} className={`border-t ${dark ? 'border-[#272727]' : 'border-[#e5e5e5]'}`}>
                <td className="py-2">{label}</td>
                <td className="text-right text-green-600">{created}</td>
                <td className="text-right text-blue-600">{completed}</td>
                <td className={`text-right ${diff > 0 ? 'text-orange-600' : diff < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                  {diff > 0 ? '+' : ''}{diff}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className={`border-t-2 font-bold ${dark ? 'border-[#272727] text-[#f5f5f5]' : 'border-[#0c0c0c] text-[#0c0c0c]'}`}>
            <td className="py-2">Total</td>
            <td className="text-right text-green-600">{dataset.totals.created}</td>
            <td className="text-right text-blue-600">{dataset.totals.completed}</td>
            <td className="text-right">{dataset.totals.created - dataset.totals.completed}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

/**
 * Example 7: Performance Indicator
 */
export const PerformanceIndicator = () => {
  const { normalizedData, isLoading } = useTrelloBoard({ normalize: true });
  const { periodRange } = usePeriodFilter();
  
  if (isLoading || !normalizedData) return null;
  
  const dataset = chartDataProcessor.generateCompleteEvolutionDataset(
    normalizedData.cards,
    periodRange,
    { trend: true }
  );
  
  const { totals, trends } = dataset;
  const completionRate = totals.created > 0 
    ? ((totals.completed / totals.created) * 100).toFixed(1)
    : 0;
  
  const isGoodPerformance = completionRate >= 80 && trends.completed !== 'down';
  
  return (
    <div className={`rounded-lg p-4 ${isGoodPerformance ? 'bg-green-100' : 'bg-yellow-100'}`}>
      <h4 className="font-bold mb-2">Indicador de Desempenho</h4>
      
      <div className="grid grid-cols-3 gap-4 mb-3">
        <div>
          <p className="text-xs text-gray-600">Taxa de Conclusão</p>
          <p className="text-2xl font-bold">{completionRate}%</p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Tendência Novos</p>
          <p className="text-xl">
            {trends.created === 'up' && '↑ Crescendo'}
            {trends.created === 'down' && '↓ Decrescendo'}
            {trends.created === 'stable' && '→ Estável'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Tendência Conclusões</p>
          <p className="text-xl">
            {trends.completed === 'up' && '↑ Crescendo'}
            {trends.completed === 'down' && '↓ Decrescendo'}
            {trends.completed === 'stable' && '→ Estável'}
          </p>
        </div>
      </div>
      
      {isGoodPerformance ? (
        <p className="text-sm text-green-700 font-bold">✓ Desempenho saudável</p>
      ) : (
        <p className="text-sm text-yellow-700 font-bold">⚠ Atenção recomendada</p>
      )}
    </div>
  );
};

export default {
  BasicEvolutionData,
  EvolutionWithSummary,
  CumulativeEvolution,
  GranularityDisplay,
  ChartJsFormat,
  EvolutionTable,
  PerformanceIndicator,
};
