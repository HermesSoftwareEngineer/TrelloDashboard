/**
 * Exemplo de uso da integração com Trello
 * Este arquivo demonstra como usar os dados normalizados e calcular métricas
 */

import { useTrelloBoard } from '../hooks/useTrello';
import dataProcessor from '../utils/dataProcessor';

/**
 * Exemplo 1: Buscar dados básicos do board
 */
export const ExemploBasico = () => {
  const { normalizedData, isLoading, error } = useTrelloBoard();

  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;

  return (
    <div>
      <h2>{normalizedData.board.name}</h2>
      <p>Total de cards: {normalizedData.stats.totalCards}</p>
      <p>Cards ativos: {normalizedData.stats.activeCards}</p>
      <p>Cards concluídos: {normalizedData.stats.completedCards}</p>
    </div>
  );
};

/**
 * Exemplo 2: Calcular tempo médio geral
 */
export const ExemploTempoMedio = () => {
  const { normalizedData, isLoading } = useTrelloBoard();

  if (isLoading) return null;

  // Pegar apenas cards concluídos
  const completedCards = normalizedData.cards.filter(c => c.isComplete && !c.isClosed);
  
  // Calcular tempo médio
  const avgTime = dataProcessor.calculateAverageProcessTime(completedCards);

  return (
    <div>
      <h3>Tempo Médio de Processo</h3>
      <p>{avgTime} dias</p>
      <p>Baseado em {completedCards.length} processos concluídos</p>
    </div>
  );
};

/**
 * Exemplo 3: Tempo médio por tipo de processo (label)
 */
export const ExemploTempoMedioPorTipo = () => {
  const { normalizedData, isLoading } = useTrelloBoard();

  if (isLoading) return null;

  // Filtrar apenas concluídos
  const completedCards = normalizedData.cards.filter(c => c.isComplete && !c.isClosed);
  
  // Agrupar por tipo de processo
  const byType = dataProcessor.groupAndCalculate(completedCards, 'processType');

  return (
    <div>
      <h3>Tempo Médio por Tipo</h3>
      {byType.map(type => (
        <div key={type.id}>
          <span style={{ color: type.color }}>{type.name}</span>: 
          {type.averageProcessTime} dias ({type.count} processos)
        </div>
      ))}
    </div>
  );
};

/**
 * Exemplo 4: Tempo médio por colaborador
 */
export const ExemploTempoMedioPorColaborador = () => {
  const { normalizedData, isLoading } = useTrelloBoard();

  if (isLoading) return null;

  const completedCards = normalizedData.cards.filter(c => c.isComplete && !c.isClosed);
  const byMember = dataProcessor.groupAndCalculate(completedCards, 'member');

  return (
    <div>
      <h3>Tempo Médio por Colaborador</h3>
      {byMember.map(member => (
        <div key={member.id}>
          {member.name}: {member.averageProcessTime} dias ({member.count} processos)
        </div>
      ))}
    </div>
  );
};

/**
 * Exemplo 5: Processos por período
 */
export const ExemploProcessosPorPeriodo = () => {
  const { normalizedData, isLoading } = useTrelloBoard();

  if (isLoading) return null;

  // Últimos 30 dias
  const last30Days = dataProcessor.getCardsCreatedInPeriod(normalizedData.cards, 30);
  const completed30Days = dataProcessor.getCompletedCardsInPeriod(normalizedData.cards, 30);

  return (
    <div>
      <h3>Últimos 30 Dias</h3>
      <p>Novos processos: {last30Days.length}</p>
      <p>Processos concluídos: {completed30Days.length}</p>
      <p>Média por dia: {(last30Days.length / 30).toFixed(1)} novos</p>
    </div>
  );
};

/**
 * Exemplo 6: Filtros avançados
 */
export const ExemploFiltrosAvancados = () => {
  const { normalizedData, isLoading } = useTrelloBoard();

  if (isLoading) return null;

  // Filtrar processos específicos
  const filteredCards = dataProcessor.filterCards(normalizedData.cards, {
    excludeArchived: true,
    status: 'Concluído',
    startDate: '2026-02-01',
    endDate: '2026-02-28',
  });

  // Processos de um membro específico
  const memberCards = dataProcessor.filterCards(normalizedData.cards, {
    memberId: normalizedData.members[0]?.id,
    isComplete: true,
  });

  // Processos de um tipo específico
  const typeCards = dataProcessor.filterCards(normalizedData.cards, {
    labelId: normalizedData.labels[0]?.id,
  });

  return (
    <div>
      <h3>Filtros Avançados</h3>
      <p>Cards filtrados por data: {filteredCards.length}</p>
      <p>Cards do primeiro membro: {memberCards.length}</p>
      <p>Cards do primeiro tipo: {typeCards.length}</p>
    </div>
  );
};

/**
 * Exemplo 7: Auto-refresh habilitado
 */
export const ExemploAutoRefresh = () => {
  const { normalizedData, isLoading, lastFetch, isAutoRefreshEnabled } = useTrelloBoard({
    autoRefresh: true,
    refreshInterval: 5 * 60 * 1000, // 5 minutos
  });

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div>
      <h3>Dashboard com Auto-Refresh</h3>
      <p>Auto-refresh: {isAutoRefreshEnabled ? 'Ativado' : 'Desativado'}</p>
      <p>Última atualização: {lastFetch?.toLocaleTimeString()}</p>
      <p>Total de cards: {normalizedData.stats.totalCards}</p>
    </div>
  );
};

/**
 * Exemplo 8: Métricas completas por período
 */
export const ExemploMetricasCompletas = () => {
  const { normalizedData, isLoading } = useTrelloBoard();

  if (isLoading) return null;

  const calcularMetricasPeriodo = (dias) => {
    const created = dataProcessor.getCardsCreatedInPeriod(normalizedData.cards, dias);
    const completed = dataProcessor.getCompletedCardsInPeriod(normalizedData.cards, dias);
    const inProgress = created.filter(c => !c.isComplete);
    const avgTime = dataProcessor.calculateAverageProcessTime(completed);

    return {
      label: dias ? `Últimos ${dias} dias` : 'Todo o período',
      novos: created.length,
      emAndamento: inProgress.length,
      concluidos: completed.length,
      tempoMedio: avgTime,
      mediaPorDia: dias ? (created.length / dias).toFixed(1) : 'N/A',
    };
  };

  const periodos = [
    calcularMetricasPeriodo(1),   // Hoje
    calcularMetricasPeriodo(7),   // 7 dias
    calcularMetricasPeriodo(30),  // 30 dias
    calcularMetricasPeriodo(90),  // 90 dias
    calcularMetricasPeriodo(null), // Tudo
  ];

  return (
    <div>
      <h3>Métricas por Período</h3>
      <table>
        <thead>
          <tr>
            <th>Período</th>
            <th>Novos</th>
            <th>Em Andamento</th>
            <th>Concluídos</th>
            <th>Tempo Médio</th>
            <th>Média/Dia</th>
          </tr>
        </thead>
        <tbody>
          {periodos.map((periodo, idx) => (
            <tr key={idx}>
              <td>{periodo.label}</td>
              <td>{periodo.novos}</td>
              <td>{periodo.emAndamento}</td>
              <td>{periodo.concluidos}</td>
              <td>{periodo.tempoMedio} dias</td>
              <td>{periodo.mediaPorDia}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Exemplo 9: Processos por prioridade (lista)
 */
export const ExemploProcessosPorPrioridade = () => {
  const { normalizedData, isLoading } = useTrelloBoard();

  if (isLoading) return null;

  const activeCards = normalizedData.cards.filter(c => !c.isClosed);
  const byList = dataProcessor.groupAndCalculate(activeCards, 'list');

  // Ordenar por posição da lista
  const sortedByList = byList.sort((a, b) => {
    const listA = normalizedData.lists.find(l => l.id === a.id);
    const listB = normalizedData.lists.find(l => l.id === b.id);
    return (listA?.pos || 0) - (listB?.pos || 0);
  });

  return (
    <div>
      <h3>Processos por Prioridade</h3>
      {sortedByList.map(list => (
        <div key={list.id}>
          <strong>{list.name}</strong>: {list.count} processos
        </div>
      ))}
    </div>
  );
};

/**
 * Exemplo 10: Ver estrutura completa dos dados
 */
export const ExemploDebug = () => {
  const { normalizedData, isLoading, lastFetch } = useTrelloBoard();

  if (isLoading) return null;

  // Exemplo de um card normalizado
  const exampleCard = normalizedData.cards[0];

  return (
    <div>
      <h3>Debug - Estrutura de Dados</h3>
      <pre>
        {JSON.stringify({
          board: normalizedData.board,
          stats: normalizedData.stats,
          exampleCard: exampleCard,
          lastFetch: lastFetch,
        }, null, 2)}
      </pre>
    </div>
  );
};

export default {
  ExemploBasico,
  ExemploTempoMedio,
  ExemploTempoMedioPorTipo,
  ExemploTempoMedioPorColaborador,
  ExemploProcessosPorPeriodo,
  ExemploFiltrosAvancados,
  ExemploAutoRefresh,
  ExemploMetricasCompletas,
  ExemploProcessosPorPrioridade,
  ExemploDebug,
};
