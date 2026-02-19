/**
 * EXAMPLES - VALIDAÇÃO E ADAPTAÇÃO PARA VISUALIZAÇÃO
 * 
 * Exemplos práticos de uso dos módulos criados nos PROMPTs 10 e 11.
 * 
 * Este arquivo demonstra:
 * - PROMPT 10: Adaptação de dados para diferentes tipos de gráficos
 * - PROMPT 11: Validação de dados e estratégias de fallback
 */

// ==========================================
// IMPORTS
// ==========================================

// Validação
import {
  validateCard,
  validateCards,
  analyzeMemberDuplication,
  analyzeLabelDuplication,
  analyzeDataCoverage,
  validatePeriodFilter,
  validateFilters,
  applyCardFallbacks,
  applyCardsFallbacks,
  runValidationChecklist,
  printValidationReport
} from '../utils/dataValidation';

// Adaptação
import {
  adaptEvolutionToLineChart,
  adaptLabelAnalysisToBarChart,
  adaptListAnalysisToStackedBarChart,
  adaptMemberAnalysisToHorizontalBarChart,
  adaptStatusToPieChart,
  adaptEvolutionToRechartsLine,
  adaptLabelAnalysisToRechartsBar,
  adaptFlowKPIsToMetricCards,
  adaptLabelSummaryToMetricCards,
  adaptMemberSummaryToMetricCards,
  adaptData
} from '../utils/chartDataAdapter';

// ==========================================
// EXEMPLO 1: VALIDAÇÃO COMPLETA DE DADOS
// ==========================================

/**
 * Exemplo de validação completa ao carregar dados
 */
export function exampleFullValidation(normalizedCards) {
  console.log('=== EXEMPLO 1: VALIDAÇÃO COMPLETA ===\n');
  
  // Executar checklist completo
  const report = runValidationChecklist(normalizedCards);
  
  // Imprimir relatório formatado
  printValidationReport(report);
  
  // Verificar resultado
  if (report.summary.dataQuality === 'good') {
    console.log('✅ Dados validados com sucesso!');
  } else {
    console.log('⚠️ Problemas detectados:');
    console.log(`  - Críticos: ${report.summary.criticalIssues}`);
    console.log(`  - Avisos: ${report.summary.warnings}`);
    console.log('\nRecomendações:');
    report.summary.recommendations.forEach(rec => {
      console.log(`  ${rec}`);
    });
  }
  
  return report;
}

// ==========================================
// EXEMPLO 2: VALIDAÇÃO E FALLBACK
// ==========================================

/**
 * Exemplo de aplicação de fallbacks quando há problemas
 */
export function exampleValidationWithFallback(normalizedCards) {
  console.log('=== EXEMPLO 2: VALIDAÇÃO COM FALLBACK ===\n');
  
  // Validar dados
  const validation = validateCards(normalizedCards);
  
  console.log(`Total de problemas: ${validation.totalIssues}`);
  
  let cardsToUse = normalizedCards;
  
  // Se houver problemas críticos, aplicar fallbacks
  if (validation.issuesBySeverity.critical > 0) {
    console.log('⚠️ Problemas críticos detectados - aplicando fallbacks...');
    cardsToUse = applyCardsFallbacks(normalizedCards);
    
    // Contar quantos fallbacks foram aplicados
    const withFallbacks = cardsToUse.filter(card => card._fallbacks && card._fallbacks.length > 0);
    console.log(`✓ Fallbacks aplicados em ${withFallbacks.length} cards`);
  }
  
  return cardsToUse;
}

// ==========================================
// EXEMPLO 3: ANÁLISE DE DUPLICAÇÃO
// ==========================================

/**
 * Exemplo de detecção de duplicação em análises
 */
export function exampleDuplicationAnalysis(normalizedCards) {
  console.log('=== EXEMPLO 3: ANÁLISE DE DUPLICAÇÃO ===\n');
  
  // Analisar duplicação por membro
  const memberDup = analyzeMemberDuplication(normalizedCards);
  console.log('Duplicação por Membro:');
  console.log(`  - Cards únicos: ${memberDup.uniqueCards}`);
  console.log(`  - Total através de membros: ${memberDup.totalCountAcrossMembers}`);
  console.log(`  - Fator de duplicação: ${memberDup.duplicationFactor}x`);
  console.log(`  - Cards com múltiplos membros: ${memberDup.cardsWithMultipleMembers} (${memberDup.percentageWithMultipleMembers}%)`);
  if (memberDup.warning) {
    console.log(`  ⚠️ ${memberDup.warning}`);
  }
  
  console.log('');
  
  // Analisar duplicação por label
  const labelDup = analyzeLabelDuplication(normalizedCards);
  console.log('Duplicação por Label:');
  console.log(`  - Cards únicos: ${labelDup.uniqueCards}`);
  console.log(`  - Total através de labels: ${labelDup.totalCountAcrossLabels}`);
  console.log(`  - Fator de duplicação: ${labelDup.duplicationFactor}x`);
  console.log(`  - Cards com múltiplas labels: ${labelDup.cardsWithMultipleLabels} (${labelDup.percentageWithMultipleLabels}%)`);
  if (labelDup.warning) {
    console.log(`  ⚠️ ${labelDup.warning}`);
  }
  
  return { memberDup, labelDup };
}

// ==========================================
// EXEMPLO 4: ANÁLISE DE COBERTURA
// ==========================================

/**
 * Exemplo de análise de cobertura de dados essenciais
 */
export function exampleDataCoverage(normalizedCards) {
  console.log('=== EXEMPLO 4: COBERTURA DE DADOS ===\n');
  
  const coverage = analyzeDataCoverage(normalizedCards);
  
  console.log(`Total de cards: ${coverage.total}\n`);
  
  console.log('Cobertura de campos:');
  Object.entries(coverage.coverage).forEach(([field, stats]) => {
    const bar = '█'.repeat(Math.floor(stats.percentage / 10)) + 
                '░'.repeat(10 - Math.floor(stats.percentage / 10));
    console.log(`  ${field.padEnd(20)} [${bar}] ${stats.percentage}% (${stats.count}/${coverage.total})`);
    if (stats.percentage < 80) {
      console.log(`                       ⚠️ ${stats.missing} cards sem ${field}`);
    }
  });
  
  return coverage;
}

// ==========================================
// EXEMPLO 5: VALIDAÇÃO DE FILTROS
// ==========================================

/**
 * Exemplo de validação do impacto de filtros
 */
export function exampleFilterValidation(allCards, filters) {
  console.log('=== EXEMPLO 5: VALIDAÇÃO DE FILTROS ===\n');
  
  // Validar impacto dos filtros
  const validation = validateFilters(allCards, filters);
  
  console.log(`Cards iniciais: ${validation.initialCards}`);
  console.log(`Cards após filtros: ${validation.finalCards}`);
  console.log(`Cards excluídos: ${validation.totalExcluded}`);
  console.log(`Taxa de retenção: ${validation.retentionRate}%\n`);
  
  console.log('Impacto por filtro:');
  validation.steps.forEach((step, index) => {
    const reduction = ((step.excluded / step.before) * 100).toFixed(1);
    console.log(`  ${index + 1}. ${step.filter}: ${step.before} → ${step.after} (-${step.excluded}, -${reduction}%)`);
  });
  
  if (validation.warning) {
    console.log(`\n⚠️ ${validation.warning}`);
  }
  
  return validation;
}

// ==========================================
// EXEMPLO 6: ADAPTAÇÃO PARA CHART.JS
// ==========================================

/**
 * Exemplo de adaptação completa para gráficos Chart.js
 */
export function exampleChartJsAdaptation(
  evolutionData,
  labelAnalysis,
  listAnalysis,
  memberAnalysis,
  statusCounts
) {
  console.log('=== EXEMPLO 6: ADAPTAÇÃO PARA CHART.JS ===\n');
  
  // 1. Gráfico de linha - Evolução temporal
  const lineData = adaptEvolutionToLineChart(evolutionData);
  console.log('1. Line Chart (Evolução):');
  console.log(`   Labels: ${lineData.labels.length} períodos`);
  console.log(`   Datasets: ${lineData.datasets.length} séries`);
  
  // 2. Gráfico de barras - Análise por label
  const barData = adaptLabelAnalysisToBarChart(labelAnalysis, 'avgTime');
  console.log('\n2. Bar Chart (Labels):');
  console.log(`   Labels: ${barData.labels.length} tipos`);
  console.log(`   Métrica: Tempo Médio`);
  
  // 3. Gráfico de barras empilhadas - Análise por lista
  const stackedBarData = adaptListAnalysisToStackedBarChart(listAnalysis);
  console.log('\n3. Stacked Bar Chart (Listas):');
  console.log(`   Labels: ${stackedBarData.labels.length} listas`);
  console.log(`   Datasets: ${stackedBarData.datasets.length} status`);
  
  // 4. Gráfico de barras horizontais - Análise por membro
  const horizontalBarData = adaptMemberAnalysisToHorizontalBarChart(memberAnalysis, 'completionRate', 5);
  console.log('\n4. Horizontal Bar Chart (Top 5 Membros):');
  console.log(`   Labels: ${horizontalBarData.labels.length} membros`);
  console.log(`   Métrica: Taxa de Conclusão`);
  
  // 5. Gráfico de pizza - Status
  const pieData = adaptStatusToPieChart(statusCounts);
  console.log('\n5. Pie Chart (Status):');
  console.log(`   Total: ${pieData.total} processos`);
  console.log(`   Fatias: ${pieData.labels.join(', ')}`);
  console.log(`   Valores: ${pieData.data.join(', ')}`);
  
  return {
    lineData,
    barData,
    stackedBarData,
    horizontalBarData,
    pieData
  };
}

// ==========================================
// EXEMPLO 7: ADAPTAÇÃO PARA RECHARTS
// ==========================================

/**
 * Exemplo de adaptação para Recharts
 */
export function exampleRechartsAdaptation(
  evolutionData,
  labelAnalysis,
  listAnalysis,
  statusCounts
) {
  console.log('=== EXEMPLO 7: ADAPTAÇÃO PARA RECHARTS ===\n');
  
  // 1. Line Chart
  const lineData = adaptEvolutionToRechartsLine(evolutionData);
  console.log('1. Line Chart (Formato array de objetos):');
  console.log(`   Pontos: ${lineData.length}`);
  console.log(`   Exemplo: ${JSON.stringify(lineData[0])}`);
  
  // 2. Bar Chart - Labels
  const barData = adaptLabelAnalysisToRechartsBar(labelAnalysis);
  console.log('\n2. Bar Chart (Labels):');
  console.log(`   Items: ${barData.length}`);
  console.log(`   Campos: name, total, completed, inProgress, avgTime, color`);
  
  // 3. Pie Chart - Status
  const pieData = adaptStatusToRechartsPie(statusCounts);
  console.log('\n3. Pie Chart (Status):');
  console.log(`   Fatias: ${pieData.length}`);
  console.log(`   Exemplo: ${JSON.stringify(pieData[0])}`);
  
  return {
    lineData,
    barData,
    pieData
  };
}

// ==========================================
// EXEMPLO 8: CARDS DE MÉTRICAS (KPIs)
// ==========================================

/**
 * Exemplo de geração de cards de KPIs
 */
export function exampleMetricCards(
  currentFlowKPIs,
  previousFlowKPIs,
  labelAnalysis,
  memberAnalysis
) {
  console.log('=== EXEMPLO 8: CARDS DE MÉTRICAS ===\n');
  
  // 1. Cards de KPIs de vazão
  const flowCards = adaptFlowKPIsToMetricCards(currentFlowKPIs, previousFlowKPIs);
  console.log('1. KPIs de Vazão:');
  flowCards.forEach(card => {
    const trendIcon = card.trend === 'up' ? '↑' : card.trend === 'down' ? '↓' : '→';
    const change = card.changeValue ? ` (${trendIcon} ${Math.abs(card.changeValue)}%)` : '';
    console.log(`   • ${card.label}: ${card.value} ${card.unit}${change}`);
  });
  
  // 2. Cards resumo de labels
  const labelCards = adaptLabelSummaryToMetricCards(labelAnalysis);
  console.log('\n2. Resumo por Tipo:');
  labelCards.forEach(card => {
    console.log(`   • ${card.label}: ${card.value} (${card.unit})`);
  });
  
  // 3. Cards resumo de membros
  const memberCards = adaptMemberSummaryToMetricCards(memberAnalysis);
  console.log('\n3. Resumo de Performance:');
  memberCards.forEach(card => {
    console.log(`   • ${card.label}: ${card.value} (${card.unit})`);
  });
  
  return {
    flowCards,
    labelCards,
    memberCards
  };
}

// ==========================================
// EXEMPLO 9: ADAPTADOR UNIVERSAL
// ==========================================

/**
 * Exemplo de uso do adaptador universal
 */
export function exampleUniversalAdapter(
  evolutionData,
  labelAnalysis,
  memberAnalysis,
  statusCounts
) {
  console.log('=== EXEMPLO 9: ADAPTADOR UNIVERSAL ===\n');
  
  // Adaptar diferentes fontes para diferentes destinos
  
  // 1. Evolution → Line (Chart.js)
  const lineChartJs = adaptData(evolutionData, 'evolution', 'line', 'chartjs');
  console.log('1. Evolution → Line (Chart.js): ✓');
  
  // 2. Evolution → Line (Recharts)
  const lineRecharts = adaptData(evolutionData, 'evolution', 'line', 'recharts');
  console.log('2. Evolution → Line (Recharts): ✓');
  
  // 3. Label → Bar (Chart.js)
  const barChartJs = adaptData(labelAnalysis, 'label', 'bar', 'chartjs', { metric: 'total' });
  console.log('3. Label → Bar (Chart.js): ✓');
  
  // 4. Member → Metric Cards
  const memberCards = adaptData(memberAnalysis, 'member', 'metricCard');
  console.log('4. Member → Metric Cards: ✓');
  
  // 5. Status → Pie (Chart.js)
  const pieChartJs = adaptData(statusCounts, 'status', 'pie', 'chartjs');
  console.log('5. Status → Pie (Chart.js): ✓');
  
  return {
    lineChartJs,
    lineRecharts,
    barChartJs,
    memberCards,
    pieChartJs
  };
}

// ==========================================
// EXEMPLO 10: FLUXO COMPLETO
// ==========================================

/**
 * Exemplo de fluxo completo: validação → processamento → adaptação
 */
export function exampleCompleteFlow(normalizedCards, period) {
  console.log('=== EXEMPLO 10: FLUXO COMPLETO ===\n');
  
  // PASSO 1: Validação
  console.log('PASSO 1: Validação dos Dados');
  const validation = runValidationChecklist(normalizedCards);
  console.log(`✓ Qualidade: ${validation.summary.dataQuality}`);
  console.log(`✓ Score de cobertura: ${validation.summary.coverageQuality}/100\n`);
  
  // PASSO 2: Aplicar fallbacks se necessário
  let cards = normalizedCards;
  if (!validation.checks.cardValidation.valid) {
    console.log('PASSO 2: Aplicando Fallbacks');
    cards = applyCardsFallbacks(normalizedCards);
    console.log('✓ Fallbacks aplicados\n');
  }
  
  // PASSO 3: Processar análises
  console.log('PASSO 3: Processamento de Análises');
  // (Aqui você chamaria seus processadores de análise)
  console.log('✓ Análises processadas\n');
  
  // PASSO 4: Adaptar para visualização
  console.log('PASSO 4: Adaptação para Visualização');
  // (Aqui você adaptaria os dados)
  console.log('✓ Dados adaptados para gráficos\n');
  
  // PASSO 5: Renderizar
  console.log('PASSO 5: Renderização');
  console.log('✓ Pronto para renderizar!\n');
  
  return {
    validation,
    cards
  };
}

// ==========================================
// EXEMPLO 11: USO EM COMPONENTE REACT
// ==========================================

/**
 * Exemplo de uso em componente React com hooks
 */
export function ExampleReactComponent() {
  /*
  import React, { useEffect, useMemo, useState } from 'react';
  import { useTrello } from '../hooks/useTrello';
  import { runValidationChecklist, applyCardsFallbacks } from '../utils/dataValidation';
  import { generateLabelAnalysisDataset } from '../utils/labelAnalysisProcessor';
  import { adaptLabelAnalysisToBarChart } from '../utils/chartDataAdapter';
  import { Bar } from 'react-chartjs-2';
  
  function LabelAnalysisChart({ startDate, endDate }) {
    const { normalizedData, loading, error } = useTrello();
    const [validationReport, setValidationReport] = useState(null);
    const [dataIssues, setDataIssues] = useState([]);
    
    // Validar dados ao carregar
    useEffect(() => {
      if (normalizedData?.cards) {
        const report = runValidationChecklist(normalizedData.cards);
        setValidationReport(report);
        
        // Extrair issues para mostrar ao usuário
        if (report.summary.warnings > 0) {
          setDataIssues(report.summary.recommendations);
        }
      }
    }, [normalizedData]);
    
    // Processar e adaptar dados
    const chartData = useMemo(() => {
      if (!normalizedData?.cards) return null;
      
      // Aplicar fallbacks se necessário
      let cards = normalizedData.cards;
      if (validationReport && !validationReport.checks.cardValidation.valid) {
        cards = applyCardsFallbacks(cards);
      }
      
      // Processar análise
      const analysis = generateLabelAnalysisDataset(cards, startDate, endDate);
      
      // Adaptar para Chart.js
      return adaptLabelAnalysisToBarChart(analysis, 'avgTime');
    }, [normalizedData, startDate, endDate, validationReport]);
    
    // Loading e error states
    if (loading) return <div>Carregando...</div>;
    if (error) return <div>Erro: {error}</div>;
    if (!chartData) return <div>Sem dados</div>;
    
    return (
      <div className="chart-container">
        {dataIssues.length > 0 && (
          <div className="alert alert-warning">
            <h4>⚠️ Avisos de Qualidade de Dados</h4>
            <ul>
              {dataIssues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          </div>
        )}
        
        {validationReport && (
          <div className="data-quality-badge">
            Score de Qualidade: {validationReport.summary.coverageQuality}/100
          </div>
        )}
        
        <Bar 
          data={chartData}
          options={{
            responsive: true,
            plugins: {
              title: {
                display: true,
                text: 'Tempo Médio por Tipo de Processo'
              }
            }
          }}
        />
      </div>
    );
  }
  */
  
  return 'Ver código comentado acima';
}

// ==========================================
// EXEMPLO 12: TESTE COMPLETO
// ==========================================

/**
 * Função de teste que executa todos os exemplos
 */
export function runAllExamples(mockData) {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   EXEMPLOS DE VALIDAÇÃO E ADAPTAÇÃO DE VISUALIZAÇÃO     ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('\n');
  
  const {
    normalizedCards,
    evolutionData,
    labelAnalysis,
    listAnalysis,
    memberAnalysis,
    statusCounts,
    flowKPIs,
    previousFlowKPIs
  } = mockData;
  
  // Executar todos os exemplos
  exampleFullValidation(normalizedCards);
  exampleValidationWithFallback(normalizedCards);
  exampleDuplicationAnalysis(normalizedCards);
  exampleDataCoverage(normalizedCards);
  
  const filters = {
    excludeArchived: true,
    listId: 'list-123'
  };
  exampleFilterValidation(normalizedCards, filters);
  
  exampleChartJsAdaptation(
    evolutionData,
    labelAnalysis,
    listAnalysis,
    memberAnalysis,
    statusCounts
  );
  
  exampleRechartsAdaptation(
    evolutionData,
    labelAnalysis,
    listAnalysis,
    statusCounts
  );
  
  exampleMetricCards(
    flowKPIs,
    previousFlowKPIs,
    labelAnalysis,
    memberAnalysis
  );
  
  exampleUniversalAdapter(
    evolutionData,
    labelAnalysis,
    memberAnalysis,
    statusCounts
  );
  
  exampleCompleteFlow(normalizedCards, { startDate: new Date(), endDate: new Date() });
  
  console.log('\n✅ Todos os exemplos executados com sucesso!\n');
}
