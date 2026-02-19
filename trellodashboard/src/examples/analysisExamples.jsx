/**
 * EXAMPLES - ANÁLISE POR LABELS, LISTAS E MEMBROS
 * 
 * Exemplos de uso dos processadores de análise criados nos PROMPTs 07, 08 e 09.
 * 
 * Este arquivo demonstra como usar as funções para:
 * - PROMPT 07: Análise por Tipo de Processo (Labels)
 * - PROMPT 08: Análise por Listas (Prioridade)
 * - PROMPT 09: Análise por Colaborador
 */

// ==========================================
// PROMPT 07: ANÁLISE POR TIPO DE PROCESSO (LABELS)
// ==========================================

import {
  groupCardsByLabel,
  countInProgressByLabel,
  calculateAvgTimeByLabel,
  generateLabelAnalysisDataset,
  generateLabelBarChartData,
  filterCardsByLabel,
  getUniqueLabels
} from '../utils/labelAnalysisProcessor';

/**
 * Exemplo 1: Obter quantidade de processos em andamento por tipo
 */
export function exampleLabelInProgress(normalizedCards) {
  // Sem período específico - todos em andamento
  const inProgressByLabel = countInProgressByLabel(normalizedCards);
  
  console.log('Processos em andamento por tipo:', inProgressByLabel);
  /*
  Retorna algo como:
  [
    {
      labelId: 'label-123',
      labelName: 'Locação Residencial',
      labelColor: 'blue',
      count: 15,
      cards: [...]
    },
    {
      labelId: 'label-456',
      labelName: 'Locação Comercial',
      labelColor: 'green',
      count: 8,
      cards: [...]
    }
  ]
  */
}

/**
 * Exemplo 2: Obter tempo médio de conclusão por tipo
 */
export function exampleLabelAvgTime(normalizedCards, startDate, endDate) {
  // Com período - apenas cards concluídos no período
  const avgTimeByLabel = calculateAvgTimeByLabel(normalizedCards, startDate, endDate);
  
  console.log('Tempo médio de conclusão por tipo:', avgTimeByLabel);
  /*
  Retorna algo como:
  [
    {
      labelId: 'label-123',
      labelName: 'Locação Residencial',
      labelColor: 'blue',
      avgTimeDays: 12.5,
      count: 23,
      minTimeDays: 5,
      maxTimeDays: 30
    }
  ]
  */
}

/**
 * Exemplo 3: Dataset completo por label (para gráficos)
 */
export function exampleLabelCompleteDataset(normalizedCards, startDate, endDate) {
  const labelDataset = generateLabelAnalysisDataset(normalizedCards, startDate, endDate);
  
  console.log('Dataset completo por label:', labelDataset);
  /*
  Retorna análise completa com:
  - Total de processos
  - Concluídos, em andamento, arquivados
  - Tempo médio de conclusão
  - Taxa de conclusão
  - Referência aos cards
  */
}

/**
 * Exemplo 4: Dados formatados para gráfico de barras
 */
export function exampleLabelBarChart(normalizedCards) {
  const chartData = generateLabelBarChartData(normalizedCards);
  
  console.log('Dados para gráfico de barras:', chartData);
  /*
  Retorna estrutura otimizada para Chart.js/Recharts:
  {
    labels: ['Locação Residencial', 'Locação Comercial', ...],
    datasets: {
      inProgress: { label: 'Em Andamento', data: [15, 8, ...], colors: [...] },
      completed: { label: 'Concluídos', data: [23, 12, ...], colors: [...] },
      avgTime: { label: 'Tempo Médio (dias)', data: [12.5, 15.3, ...], colors: [...] }
    },
    rawData: [...]
  }
  */
}

// ==========================================
// PROMPT 08: ANÁLISE POR LISTAS (PRIORIDADE)
// ==========================================

import {
  groupCardsByList,
  countCardsByList,
  calculateStatusByList,
  calculateAvgProcessTimeByList,
  generateListEvolutionDataset,
  generateListAnalysisDataset,
  generateListPerformanceComparison,
  filterCardsByList,
  getUniqueLists
} from '../utils/listAnalysisProcessor';

/**
 * Exemplo 5: Obter total de processos por lista
 */
export function exampleListCounts(normalizedCards) {
  const cardsByList = countCardsByList(normalizedCards, true); // true = excluir arquivados
  
  console.log('Total de processos por lista:', cardsByList);
  /*
  Retorna algo como:
  [
    {
      listId: 'list-123',
      listName: 'Urgente',
      position: 0,
      count: 25,
      cards: [...]
    },
    {
      listId: 'list-456',
      listName: 'Normal',
      position: 1,
      count: 42,
      cards: [...]
    }
  ]
  */
}

/**
 * Exemplo 6: Obter novos, em andamento e concluídos por lista
 */
export function exampleListStatusDistribution(normalizedCards, startDate, endDate) {
  const statusByList = calculateStatusByList(normalizedCards, startDate, endDate);
  
  console.log('Distribuição de status por lista:', statusByList);
  /*
  Retorna algo como:
  [
    {
      listId: 'list-123',
      listName: 'Urgente',
      position: 0,
      new: 5,
      inProgress: 12,
      completed: 8,
      total: 25,
      newPercentage: 20.0,
      inProgressPercentage: 48.0,
      completedPercentage: 32.0,
      cards: [...]
    }
  ]
  */
}

/**
 * Exemplo 7: Obter tempo médio de processo por lista
 */
export function exampleListAvgTime(normalizedCards) {
  const avgTimeByList = calculateAvgProcessTimeByList(normalizedCards);
  
  console.log('Tempo médio de processo por lista:', avgTimeByList);
  /*
  Retorna algo como:
  [
    {
      listId: 'list-123',
      listName: 'Urgente',
      position: 0,
      avgProcessTimeDays: 8.5,
      count: 23,
      minTimeDays: 3,
      maxTimeDays: 20,
      cards: [...]
    }
  ]
  */
}

/**
 * Exemplo 8: Obter evolução temporal por lista
 */
export function exampleListEvolution(normalizedCards, startDate, endDate) {
  const evolution = generateListEvolutionDataset(
    normalizedCards, 
    startDate, 
    endDate, 
    'weekly' // ou 'daily', 'monthly'
  );
  
  console.log('Evolução temporal por lista:', evolution);
  /*
  Retorna objeto com cada lista:
  {
    'list-123': {
      listId: 'list-123',
      listName: 'Urgente',
      position: 0,
      created: {
        '2026-01-06': 3,
        '2026-01-13': 5,
        '2026-01-20': 2
      },
      completed: {
        '2026-01-06': 2,
        '2026-01-13': 4,
        '2026-01-20': 3
      },
      dates: ['2026-01-06', '2026-01-13', '2026-01-20', ...]
    }
  }
  */
}

/**
 * Exemplo 9: Dataset completo por lista
 */
export function exampleListCompleteDataset(normalizedCards, startDate, endDate) {
  const listDataset = generateListAnalysisDataset(normalizedCards, startDate, endDate);
  
  console.log('Dataset completo por lista:', listDataset);
  /*
  Retorna análise completa por lista com:
  - Total e distribuição por status
  - Percentuais
  - Tempo médio de processo
  - Taxa de conclusão
  */
}

// ==========================================
// PROMPT 09: ANÁLISE POR COLABORADOR
// ==========================================

import {
  groupCardsByMember,
  calculateMemberBasicStats,
  calculateMemberProductivity,
  calculateMemberTimeByProcessType,
  calculateMemberDistributionByList,
  generateMemberAnalysisDataset,
  getMemberAnalysis,
  generateMemberPerformanceComparison,
  filterCardsByMember,
  getUniqueMembers
} from '../utils/memberAnalysisProcessor';

/**
 * Exemplo 10: Obter estatísticas básicas por colaborador
 */
export function exampleMemberBasicStats(normalizedCards) {
  const memberStats = calculateMemberBasicStats(normalizedCards);
  
  console.log('Estatísticas básicas por colaborador:', memberStats);
  /*
  Retorna algo como:
  [
    {
      memberId: 'member-123',
      memberName: 'João Silva',
      username: 'joaosilva',
      avatarUrl: 'https://...',
      totalAssigned: 35,
      totalCompleted: 28,
      totalInProgress: 7,
      completionRate: 80.0,
      cards: [...]
    }
  ]
  */
}

/**
 * Exemplo 11: Obter produtividade por colaborador
 */
export function exampleMemberProductivity(normalizedCards, startDate, endDate) {
  const productivity = calculateMemberProductivity(normalizedCards, startDate, endDate);
  
  console.log('Produtividade por colaborador:', productivity);
  /*
  Retorna algo como:
  [
    {
      memberId: 'member-123',
      memberName: 'João Silva',
      username: 'joaosilva',
      avatarUrl: 'https://...',
      completedCount: 15,
      completedWithTimeCount: 14,
      avgProcessTimeDays: 10.5,
      avgCompletedPerDay: 0.48,
      periodDays: 31,
      efficiency: 0.0952,
      cards: [...]
    }
  ]
  */
}

/**
 * Exemplo 12: Obter tempo médio por tipo de processo para cada colaborador
 */
export function exampleMemberTimeByType(normalizedCards, startDate, endDate) {
  const timeByType = calculateMemberTimeByProcessType(normalizedCards, startDate, endDate);
  
  console.log('Tempo médio por tipo por colaborador:', timeByType);
  /*
  Retorna objeto com cada membro:
  {
    'member-123': {
      memberId: 'member-123',
      memberName: 'João Silva',
      username: 'joaosilva',
      avatarUrl: 'https://...',
      processTypes: [
        {
          typeId: 'label-123',
          typeName: 'Locação Residencial',
          typeColor: 'blue',
          avgTimeDays: 12.3,
          count: 10,
          minTimeDays: 5,
          maxTimeDays: 25
        }
      ]
    }
  }
  */
}

/**
 * Exemplo 13: Obter distribuição por lista para cada colaborador
 */
export function exampleMemberDistributionByList(normalizedCards) {
  const distribution = calculateMemberDistributionByList(normalizedCards);
  
  console.log('Distribuição por lista por colaborador:', distribution);
  /*
  Retorna objeto com cada membro:
  {
    'member-123': {
      memberId: 'member-123',
      memberName: 'João Silva',
      username: 'joaosilva',
      avatarUrl: 'https://...',
      totalCards: 35,
      lists: [
        {
          listId: 'list-123',
          listName: 'Urgente',
          listPosition: 0,
          count: 12,
          completed: 8,
          inProgress: 4
        }
      ]
    }
  }
  */
}

/**
 * Exemplo 14: Dataset completo por colaborador
 */
export function exampleMemberCompleteDataset(normalizedCards, startDate, endDate) {
  const memberDataset = generateMemberAnalysisDataset(normalizedCards, startDate, endDate);
  
  console.log('Dataset completo por colaborador:', memberDataset);
  /*
  Retorna análise completa com:
  - Contadores (atribuídos, concluídos, em andamento)
  - Taxa de conclusão
  - Métricas de tempo e produtividade
  - Eficiência
  - Distribuição por lista e por tipo
  - Referência aos cards
  */
}

/**
 * Exemplo 15: Análise individual de um colaborador específico
 */
export function exampleIndividualMemberAnalysis(normalizedCards, memberId, startDate, endDate) {
  const memberAnalysis = getMemberAnalysis(normalizedCards, memberId, startDate, endDate);
  
  if (memberAnalysis) {
    console.log(`Análise de ${memberAnalysis.memberName}:`, memberAnalysis);
  } else {
    console.log('Colaborador não encontrado');
  }
}

/**
 * Exemplo 16: Comparação de performance entre colaboradores
 */
export function exampleMemberPerformanceComparison(normalizedCards, startDate, endDate) {
  const comparison = generateMemberPerformanceComparison(normalizedCards, startDate, endDate);
  
  console.log('Comparação de performance:', comparison);
  /*
  Retorna array ordenado por score de performance (combinação de taxa de conclusão,
  produtividade e eficiência), do melhor para o pior desempenho.
  */
}

// ==========================================
// EXEMPLO DE USO INTEGRADO
// ==========================================

/**
 * Exemplo 17: Análise completa de um período
 */
export function exampleCompleteAnalysis(normalizedCards) {
  // Definir período (último mês)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1);
  
  console.log('=== ANÁLISE COMPLETA DO PERÍODO ===');
  console.log(`Período: ${startDate.toLocaleDateString()} até ${endDate.toLocaleDateString()}`);
  
  // Análise por Labels
  console.log('\n--- ANÁLISE POR TIPO DE PROCESSO ---');
  const labelAnalysis = generateLabelAnalysisDataset(normalizedCards, startDate, endDate);
  labelAnalysis.forEach(label => {
    console.log(`${label.labelName}: ${label.total} processos (${label.completed} concluídos, ${label.avgCompletionTimeDays} dias médio)`);
  });
  
  // Análise por Listas
  console.log('\n--- ANÁLISE POR LISTA (PRIORIDADE) ---');
  const listAnalysis = generateListAnalysisDataset(normalizedCards, startDate, endDate);
  listAnalysis.forEach(list => {
    console.log(`${list.listName}: ${list.total} processos (${list.new} novos, ${list.inProgress} em andamento, ${list.completed} concluídos)`);
  });
  
  // Análise por Colaboradores
  console.log('\n--- ANÁLISE POR COLABORADOR ---');
  const memberAnalysis = generateMemberAnalysisDataset(normalizedCards, startDate, endDate);
  memberAnalysis.forEach(member => {
    console.log(`${member.memberName}: ${member.totalAssigned} atribuídos (${member.totalCompleted} concluídos, ${member.completionRate}% taxa conclusão)`);
  });
  
  // Top performers
  console.log('\n--- TOP PERFORMERS ---');
  const topPerformers = generateMemberPerformanceComparison(normalizedCards, startDate, endDate);
  topPerformers.slice(0, 3).forEach((member, index) => {
    console.log(`${index + 1}. ${member.memberName} - Score: ${member.performanceScore.toFixed(2)}`);
  });
}

/**
 * Exemplo 18: Uso em componente React
 */
export function ExampleReactComponent() {
  // Este é um exemplo de como usar os processadores em um componente React
  
  /*
  import React, { useMemo } from 'react';
  import { generateLabelAnalysisDataset } from '../utils/labelAnalysisProcessor';
  import { generateListAnalysisDataset } from '../utils/listAnalysisProcessor';
  import { generateMemberAnalysisDataset } from '../utils/memberAnalysisProcessor';
  
  function AnalysisPage({ normalizedCards, startDate, endDate }) {
    // Memoizar datasets para evitar recálculo desnecessário
    const labelData = useMemo(
      () => generateLabelAnalysisDataset(normalizedCards, startDate, endDate),
      [normalizedCards, startDate, endDate]
    );
    
    const listData = useMemo(
      () => generateListAnalysisDataset(normalizedCards, startDate, endDate),
      [normalizedCards, startDate, endDate]
    );
    
    const memberData = useMemo(
      () => generateMemberAnalysisDataset(normalizedCards, startDate, endDate),
      [normalizedCards, startDate, endDate]
    );
    
    return (
      <div className="analysis-page">
        <section>
          <h2>Análise por Tipo de Processo</h2>
          {labelData.map(label => (
            <div key={label.labelId}>
              <h3>{label.labelName}</h3>
              <p>Total: {label.total}</p>
              <p>Concluídos: {label.completed}</p>
              <p>Tempo Médio: {label.avgCompletionTimeDays} dias</p>
            </div>
          ))}
        </section>
        
        <section>
          <h2>Análise por Lista</h2>
          {listData.map(list => (
            <div key={list.listId}>
              <h3>{list.listName}</h3>
              <p>Total: {list.total}</p>
              <p>Novos: {list.new}</p>
              <p>Em Andamento: {list.inProgress}</p>
              <p>Concluídos: {list.completed}</p>
            </div>
          ))}
        </section>
        
        <section>
          <h2>Análise por Colaborador</h2>
          {memberData.map(member => (
            <div key={member.memberId}>
              <h3>{member.memberName}</h3>
              <p>Atribuídos: {member.totalAssigned}</p>
              <p>Concluídos: {member.totalCompleted}</p>
              <p>Taxa de Conclusão: {member.completionRate}%</p>
              <p>Produtividade: {member.avgCompletedPerDay} cards/dia</p>
            </div>
          ))}
        </section>
      </div>
    );
  }
  */
}
