/**
 * Exemplos de uso do Filtro de Período
 * Demonstra diferentes casos de uso práticos
 */

import usePeriodFilter from '../hooks/usePeriodFilter';
import { useTrelloBoard } from '../hooks/useTrello';
import dataProcessor from '../utils/dataProcessor';
import periodUtils from '../utils/periodUtils';

const { PERIOD_TYPES } = periodUtils;

/**
 * Exemplo 1: Card de Métricas Resumidas
 */
export const MetricasResumo = ({ dark = false }) => {
  const { normalizedData, isLoading } = useTrelloBoard({ normalize: true });
  const { filterCards, periodRange } = usePeriodFilter();
  
  if (isLoading) return <div>Carregando...</div>;
  
  const { counts, averages } = filterCards(normalizedData.cards);
  
  return (
    <div>
      <h3>Resumo - {periodRange.label}</h3>
      <div>
        <div>
          <span>Criados</span>
          <span>{counts.created}</span>
          <small>{averages.createdPerDay}/dia</small>
        </div>
        <div>
          <span>Concluídos</span>
          <span>{counts.completed}</span>
          <small>{averages.completedPerDay}/dia</small>
        </div>
        <div>
          <span>Em Andamento</span>
          <span>{counts.inProgress}</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Exemplo 2: Tempo Médio com Destaque
 */
export const TempoMedioDestaque = () => {
  const { normalizedData, isLoading } = useTrelloBoard({ normalize: true });
  const { filterCards, periodRange } = usePeriodFilter();
  
  if (isLoading) return null;
  
  const { cards } = filterCards(normalizedData.cards);
  const avgTime = dataProcessor.calculateAverageProcessTime(cards.completed);
  
  // Benchmark: 15 dias é o ideal
  const benchmark = 15;
  const performance = avgTime <= benchmark ? 'good' : 'needs-improvement';
  
  return (
    <div>
      <h3>Tempo Médio de Conclusão</h3>
      <p className={`text-4xl ${performance === 'good' ? 'text-green-600' : 'text-yellow-600'}`}>
        {avgTime} dias
      </p>
      <p>Meta: {benchmark} dias</p>
      <p>Período: {periodRange.label}</p>
      <p>Baseado em {cards.completed.length} processos</p>
    </div>
  );
};

/**
 * Exemplo 3: Ranking de Colaboradores
 */
export const RankingColaboradores = () => {
  const { normalizedData, isLoading } = useTrelloBoard({ normalize: true });
  const { filterCards } = usePeriodFilter();
  
  if (isLoading) return null;
  
  const { cards } = filterCards(normalizedData.cards);
  const byMember = dataProcessor.groupAndCalculate(cards.completed, 'member');
  
  // Ordenar por quantidade (decrescente)
  const ranked = byMember.sort((a, b) => b.count - a.count);
  
  return (
    <div>
      <h3>Ranking de Produtividade</h3>
      <ol>
        {ranked.map((member, index) => (
          <li key={member.id}>
            <span>{index + 1}º</span>
            <span>{member.name}</span>
            <span>{member.count} concluídos</span>
            <span>{member.averageProcessTime} dias de média</span>
          </li>
        ))}
      </ol>
    </div>
  );
};

/**
 * Exemplo 4: Gráfico de Tipos de Processo
 */
export const TiposProcesso = () => {
  const { normalizedData, isLoading } = useTrelloBoard({ normalize: true });
  const { filterCards } = usePeriodFilter();
  
  if (isLoading) return null;
  
  const { cards } = filterCards(normalizedData.cards);
  const byType = dataProcessor.groupAndCalculate(cards.completed, 'processType');
  
  // Calcular porcentagens
  const total = cards.completed.length;
  const withPercentages = byType.map(type => ({
    ...type,
    percentage: ((type.count / total) * 100).toFixed(1)
  }));
  
  return (
    <div>
      <h3>Distribuição por Tipo</h3>
      {withPercentages.map(type => (
        <div key={type.id}>
          <span style={{ backgroundColor: type.color }}></span>
          <span>{type.name}</span>
          <span>{type.count}</span>
          <span>{type.percentage}%</span>
          <span>{type.averageProcessTime} dias</span>
        </div>
      ))}
    </div>
  );
};

/**
 * Exemplo 5: Indicador de Tendência
 */
export const IndicadorTendencia = () => {
  const { normalizedData, isLoading } = useTrelloBoard({ normalize: true });
  const { periodRange } = usePeriodFilter();
  
  if (isLoading) return null;
  
  // Período atual
  const currentData = periodUtils.applyPeriodFilter(normalizedData.cards, periodRange);
  
  // Período anterior (mesma duração)
  const previousEnd = new Date(periodRange.startDate);
  previousEnd.setSeconds(previousEnd.getSeconds() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - periodRange.days + 1);
  
  const previousRange = {
    ...periodRange,
    startDate: previousStart,
    endDate: previousEnd
  };
  
  const previousData = periodUtils.applyPeriodFilter(normalizedData.cards, previousRange);
  
  // Calcular variação
  const currentCompleted = currentData.counts.completed;
  const previousCompleted = previousData.counts.completed;
  const variation = currentCompleted - previousCompleted;
  const variationPercent = previousCompleted > 0 
    ? ((variation / previousCompleted) * 100).toFixed(1)
    : 0;
  
  const trend = variation > 0 ? 'up' : variation < 0 ? 'down' : 'stable';
  
  return (
    <div>
      <h3>Tendência de Conclusões</h3>
      <div>
        <span>Período Atual: {currentCompleted}</span>
        <span>Período Anterior: {previousCompleted}</span>
      </div>
      <div className={trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'}>
        {trend === 'up' && '↑'}
        {trend === 'down' && '↓'}
        {trend === 'stable' && '→'}
        <span>{Math.abs(variation)} processos</span>
        <span>({variationPercent}%)</span>
      </div>
    </div>
  );
};

/**
 * Exemplo 6: Alerta de Processos Atrasados
 */
export const AlertaProcessosAtrasados = () => {
  const { normalizedData, isLoading } = useTrelloBoard({ normalize: true });
  const { filterCards } = usePeriodFilter();
  
  if (isLoading) return null;
  
  const { cards } = filterCards(normalizedData.cards);
  const now = new Date();
  
  // Processos em andamento com prazo vencido
  const overdue = cards.inProgress.filter(card => {
    return card.dueDate && card.dueDate < now;
  });
  
  // Processos em andamento sem prazo definido
  const noDueDate = cards.inProgress.filter(card => !card.dueDate);
  
  if (overdue.length === 0 && noDueDate.length === 0) {
    return (
      <div className="text-green-600">
        ✓ Todos os processos em dia
      </div>
    );
  }
  
  return (
    <div>
      <h3>Alertas</h3>
      
      {overdue.length > 0 && (
        <div className="text-red-600">
          <strong>⚠️ {overdue.length} processos atrasados</strong>
          <ul>
            {overdue.slice(0, 5).map(card => (
              <li key={card.id}>
                {card.name} - Venceu em {periodUtils.formatDate(card.dueDate)}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {noDueDate.length > 0 && (
        <div className="text-yellow-600">
          <strong>⚠️ {noDueDate.length} processos sem prazo definido</strong>
        </div>
      )}
    </div>
  );
};

/**
 * Exemplo 7: Seletor Rápido de Período
 */
export const SeletorRapidoPeriodo = () => {
  const { periodType, changePeriodType } = usePeriodFilter();
  
  const quickPeriods = [
    { type: PERIOD_TYPES.THIS_WEEK, label: 'Semana', icon: '📅' },
    { type: PERIOD_TYPES.THIS_MONTH, label: 'Mês', icon: '📆' },
    { type: PERIOD_TYPES.THIS_QUARTER, label: 'Trimestre', icon: '🗓️' },
    { type: PERIOD_TYPES.THIS_YEAR, label: 'Ano', icon: '📊' },
  ];
  
  return (
    <div className="flex gap-2">
      {quickPeriods.map(period => (
        <button
          key={period.type}
          onClick={() => changePeriodType(period.type)}
          className={`px-4 py-2 rounded-lg ${
            periodType === period.type 
              ? 'bg-red-600 text-white' 
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          <span>{period.icon}</span>
          <span>{period.label}</span>
        </button>
      ))}
    </div>
  );
};

/**
 * Exemplo 8: Progressão Diária
 */
export const ProgressaoDiaria = () => {
  const { normalizedData, isLoading } = useTrelloBoard({ normalize: true });
  const { filterCards, periodRange } = usePeriodFilter();
  
  if (isLoading) return null;
  
  const { cards, averages } = filterCards(normalizedData.cards);
  
  // Calcular dias úteis restantes (simplificado: excluir finais de semana)
  const today = new Date();
  const daysRemaining = Math.max(0, Math.ceil((periodRange.endDate - today) / (1000 * 60 * 60 * 24)));
  
  // Projeção
  const projection = cards.completed.length + (parseFloat(averages.completedPerDay) * daysRemaining);
  
  return (
    <div>
      <h3>Progressão no Período</h3>
      <div>
        <p>Concluídos até agora: {cards.completed.length}</p>
        <p>Média diária: {averages.completedPerDay}</p>
        <p>Dias restantes: {daysRemaining}</p>
        <p className="font-bold">Projeção: ~{Math.round(projection)} processos</p>
      </div>
    </div>
  );
};

/**
 * Exemplo 9: Comparação Multi-Período
 */
export const ComparacaoMultiPeriodo = () => {
  const { normalizedData, isLoading } = useTrelloBoard({ normalize: true });
  
  if (isLoading) return null;
  
  const periods = [
    { type: PERIOD_TYPES.THIS_WEEK, label: 'Semana' },
    { type: PERIOD_TYPES.THIS_MONTH, label: 'Mês' },
    { type: PERIOD_TYPES.THIS_QUARTER, label: 'Trimestre' },
    { type: PERIOD_TYPES.THIS_YEAR, label: 'Ano' },
  ];
  
  const comparisons = periods.map(period => {
    const range = periodUtils.calculatePeriodRange(period.type);
    const data = periodUtils.applyPeriodFilter(normalizedData.cards, range);
    return {
      label: period.label,
      created: data.counts.created,
      completed: data.counts.completed,
      avgPerDay: data.averages.completedPerDay
    };
  });
  
  return (
    <div>
      <h3>Comparação Multi-Período</h3>
      <table>
        <thead>
          <tr>
            <th>Período</th>
            <th>Criados</th>
            <th>Concluídos</th>
            <th>Média/Dia</th>
          </tr>
        </thead>
        <tbody>
          {comparisons.map((comp, idx) => (
            <tr key={idx}>
              <td>{comp.label}</td>
              <td>{comp.created}</td>
              <td>{comp.completed}</td>
              <td>{comp.avgPerDay}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Exemplo 10: Cartão de Status Geral
 */
export const StatusGeral = ({ dark = false }) => {
  const { normalizedData, isLoading } = useTrelloBoard({ normalize: true });
  const { filterCards, periodRange } = usePeriodFilter();
  
  if (isLoading) return null;
  
  const { cards, counts } = filterCards(normalizedData.cards);
  
  // Calcular taxa de conclusão
  const completionRate = counts.created > 0 
    ? ((counts.completed / counts.created) * 100).toFixed(1)
    : 0;
  
  // Calcular tempo médio
  const avgTime = dataProcessor.calculateAverageProcessTime(cards.completed);
  
  // Status geral (verde se >= 80% conclusão e <= 15 dias média)
  const isGood = completionRate >= 80 && avgTime <= 15;
  const isWarning = completionRate >= 60 && avgTime <= 20;
  
  return (
    <div className={`p-6 rounded-2xl ${
      isGood ? 'bg-green-100' : isWarning ? 'bg-yellow-100' : 'bg-red-100'
    }`}>
      <h2>Status Geral - {periodRange.label}</h2>
      
      <div className="grid grid-cols-3 gap-4 my-4">
        <div>
          <p className="text-sm text-gray-600">Taxa de Conclusão</p>
          <p className="text-3xl font-bold">{completionRate}%</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Tempo Médio</p>
          <p className="text-3xl font-bold">{avgTime} dias</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Em Andamento</p>
          <p className="text-3xl font-bold">{counts.inProgress}</p>
        </div>
      </div>
      
      <div className="mt-4">
        {isGood && (
          <p className="text-green-700 font-bold">✓ Desempenho excelente!</p>
        )}
        {isWarning && !isGood && (
          <p className="text-yellow-700 font-bold">⚠ Atenção necessária</p>
        )}
        {!isGood && !isWarning && (
          <p className="text-red-700 font-bold">⚠ Melhorias necessárias</p>
        )}
      </div>
    </div>
  );
};

export default {
  MetricasResumo,
  TempoMedioDestaque,
  RankingColaboradores,
  TiposProcesso,
  IndicadorTendencia,
  AlertaProcessosAtrasados,
  SeletorRapidoPeriodo,
  ProgressaoDiaria,
  ComparacaoMultiPeriodo,
  StatusGeral,
};
