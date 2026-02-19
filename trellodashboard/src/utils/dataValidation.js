/**
 * DATA VALIDATION AND CONSISTENCY
 * 
 * Valida integridade, consistência e qualidade dos dados.
 * Detecta problemas comuns e fornece estratégias de fallback.
 * 
 * PROMPT 11: Validação e Consistência
 * - Contagem duplicada
 * - Cards sem prazo
 * - Cards sem labels
 * - Cards sem membros
 * - Impacto correto do filtro global
 * - Checklist de validação
 * - Estratégias de fallback
 * - Garantia de consistência dos dados
 */

/**
 * ==============================================
 * TIPOS DE PROBLEMAS DETECTÁVEIS
 * ==============================================
 */

export const VALIDATION_ISSUES = {
  // Dados faltantes
  MISSING_CREATION_DATE: 'missing_creation_date',
  MISSING_DUE_DATE: 'missing_due_date',
  MISSING_LABELS: 'missing_labels',
  MISSING_MEMBERS: 'missing_members',
  MISSING_LIST: 'missing_list',
  
  // Inconsistências
  COMPLETED_WITHOUT_DATE: 'completed_without_date',
  NEGATIVE_PROCESS_TIME: 'negative_process_time',
  FUTURE_COMPLETION_DATE: 'future_completion_date',
  
  // Duplicação potencial
  MULTIPLE_MEMBERS: 'multiple_members',
  MULTIPLE_LABELS: 'multiple_labels',
  
  // Problemas de qualidade
  EMPTY_NAME: 'empty_name',
  ARCHIVED_WITHOUT_COMPLETION: 'archived_without_completion'
};

/**
 * Severidade dos problemas
 */
export const SEVERITY = {
  CRITICAL: 'critical',  // Impede análise correta
  WARNING: 'warning',    // Pode afetar precisão
  INFO: 'info'          // Informativo apenas
};

/**
 * ==============================================
 * VALIDAÇÃO DE CARDS INDIVIDUAIS
 * ==============================================
 */

/**
 * Valida um card normalizado e retorna lista de problemas
 * 
 * @param {Object} card - Card normalizado
 * @returns {Array<Object>} Array de problemas encontrados
 */
export function validateCard(card) {
  const issues = [];
  
  // Validar dados básicos
  if (!card.name || card.name.trim() === '') {
    issues.push({
      type: VALIDATION_ISSUES.EMPTY_NAME,
      severity: SEVERITY.WARNING,
      message: 'Card sem nome',
      cardId: card.id
    });
  }
  
  // Validar data de criação
  if (!card.creationDate) {
    issues.push({
      type: VALIDATION_ISSUES.MISSING_CREATION_DATE,
      severity: SEVERITY.CRITICAL,
      message: 'Card sem data de criação - não pode ser incluído em análises temporais',
      cardId: card.id,
      cardName: card.name
    });
  }
  
  // Validar data de conclusão vs flag isComplete
  if (card.isComplete && !card.completionDate) {
    issues.push({
      type: VALIDATION_ISSUES.COMPLETED_WITHOUT_DATE,
      severity: SEVERITY.WARNING,
      message: 'Card marcado como concluído mas sem data de conclusão',
      cardId: card.id,
      cardName: card.name
    });
  }
  
  // Validar tempo de processo
  if (card.processTimeDays !== null && card.processTimeDays < 0) {
    issues.push({
      type: VALIDATION_ISSUES.NEGATIVE_PROCESS_TIME,
      severity: SEVERITY.CRITICAL,
      message: 'Tempo de processo negativo - data de conclusão antes da criação',
      cardId: card.id,
      cardName: card.name,
      value: card.processTimeDays
    });
  }
  
  // Validar data de conclusão no futuro
  if (card.completionDate && card.completionDate > new Date()) {
    issues.push({
      type: VALIDATION_ISSUES.FUTURE_COMPLETION_DATE,
      severity: SEVERITY.WARNING,
      message: 'Data de conclusão no futuro',
      cardId: card.id,
      cardName: card.name,
      date: card.completionDate
    });
  }
  
  // Validar prazo
  if (!card.dueDate) {
    issues.push({
      type: VALIDATION_ISSUES.MISSING_DUE_DATE,
      severity: SEVERITY.INFO,
      message: 'Card sem prazo definido',
      cardId: card.id,
      cardName: card.name
    });
  }
  
  // Validar labels
  if (!card.processTypes || card.processTypes.length === 0) {
    issues.push({
      type: VALIDATION_ISSUES.MISSING_LABELS,
      severity: SEVERITY.INFO,
      message: 'Card sem labels (tipo de processo)',
      cardId: card.id,
      cardName: card.name
    });
  } else if (card.processTypes.length > 1) {
    issues.push({
      type: VALIDATION_ISSUES.MULTIPLE_LABELS,
      severity: SEVERITY.INFO,
      message: `Card com múltiplas labels (${card.processTypes.length}) - será contado em cada uma`,
      cardId: card.id,
      cardName: card.name,
      count: card.processTypes.length
    });
  }
  
  // Validar membros
  if (!card.members || card.members.length === 0) {
    issues.push({
      type: VALIDATION_ISSUES.MISSING_MEMBERS,
      severity: SEVERITY.INFO,
      message: 'Card sem membros atribuídos',
      cardId: card.id,
      cardName: card.name
    });
  } else if (card.members.length > 1) {
    issues.push({
      type: VALIDATION_ISSUES.MULTIPLE_MEMBERS,
      severity: SEVERITY.INFO,
      message: `Card com múltiplos membros (${card.members.length}) - será contado para cada um`,
      cardId: card.id,
      cardName: card.name,
      count: card.members.length
    });
  }
  
  // Validar lista
  if (!card.list || !card.list.id) {
    issues.push({
      type: VALIDATION_ISSUES.MISSING_LIST,
      severity: SEVERITY.WARNING,
      message: 'Card sem lista atribuída',
      cardId: card.id,
      cardName: card.name
    });
  }
  
  // Validar arquivamento
  if (card.isClosed && !card.isComplete) {
    issues.push({
      type: VALIDATION_ISSUES.ARCHIVED_WITHOUT_COMPLETION,
      severity: SEVERITY.INFO,
      message: 'Card arquivado sem estar concluído',
      cardId: card.id,
      cardName: card.name
    });
  }
  
  return issues;
}

/**
 * Valida array de cards e gera relatório completo
 * 
 * @param {Array} cards - Array de cards normalizados
 * @returns {Object} Relatório de validação
 */
export function validateCards(cards) {
  if (!Array.isArray(cards)) {
    return {
      valid: false,
      error: 'Input não é um array',
      issues: []
    };
  }
  
  const allIssues = [];
  const issuesByType = {};
  const issuesBySeverity = {
    [SEVERITY.CRITICAL]: [],
    [SEVERITY.WARNING]: [],
    [SEVERITY.INFO]: []
  };
  
  // Validar cada card
  cards.forEach(card => {
    const cardIssues = validateCard(card);
    allIssues.push(...cardIssues);
    
    // Agrupar por tipo
    cardIssues.forEach(issue => {
      if (!issuesByType[issue.type]) {
        issuesByType[issue.type] = [];
      }
      issuesByType[issue.type].push(issue);
      
      // Agrupar por severidade
      issuesBySeverity[issue.severity].push(issue);
    });
  });
  
  return {
    valid: issuesBySeverity[SEVERITY.CRITICAL].length === 0,
    totalCards: cards.length,
    totalIssues: allIssues.length,
    issuesBySeverity: {
      critical: issuesBySeverity[SEVERITY.CRITICAL].length,
      warning: issuesBySeverity[SEVERITY.WARNING].length,
      info: issuesBySeverity[SEVERITY.INFO].length
    },
    issuesByType: Object.entries(issuesByType).map(([type, issues]) => ({
      type,
      count: issues.length,
      severity: issues[0]?.severity,
      examples: issues.slice(0, 5) // Primeiros 5 exemplos
    })),
    allIssues: allIssues
  };
}

/**
 * ==============================================
 * VALIDAÇÃO DE DUPLICAÇÃO E CONTAGEM
 * ==============================================
 */

/**
 * Analisa potencial duplicação em análises por membro
 * 
 * @param {Array} cards - Array de cards normalizados
 * @returns {Object} Relatório de duplicação
 */
export function analyzeMemberDuplication(cards) {
  const cardsWithMultipleMembers = cards.filter(card => 
    card.members && card.members.length > 1
  );
  
  const uniqueCardCount = cards.length;
  const totalCountAcrossMembers = cards.reduce((sum, card) => 
    sum + (card.members?.length || 0), 0
  );
  
  return {
    uniqueCards: uniqueCardCount,
    totalCountAcrossMembers: totalCountAcrossMembers,
    duplicationFactor: totalCountAcrossMembers > 0 
      ? Number((totalCountAcrossMembers / uniqueCardCount).toFixed(2))
      : 0,
    cardsWithMultipleMembers: cardsWithMultipleMembers.length,
    percentageWithMultipleMembers: uniqueCardCount > 0
      ? Number(((cardsWithMultipleMembers.length / uniqueCardCount) * 100).toFixed(1))
      : 0,
    warning: totalCountAcrossMembers > uniqueCardCount
      ? 'Soma de cards por membro será maior que total de cards únicos'
      : null
  };
}

/**
 * Analisa potencial duplicação em análises por label
 * 
 * @param {Array} cards - Array de cards normalizados
 * @returns {Object} Relatório de duplicação
 */
export function analyzeLabelDuplication(cards) {
  const cardsWithMultipleLabels = cards.filter(card => 
    card.processTypes && card.processTypes.length > 1
  );
  
  const uniqueCardCount = cards.length;
  const totalCountAcrossLabels = cards.reduce((sum, card) => 
    sum + (card.processTypes?.length || 0), 0
  );
  
  return {
    uniqueCards: uniqueCardCount,
    totalCountAcrossLabels: totalCountAcrossLabels,
    duplicationFactor: totalCountAcrossLabels > 0 
      ? Number((totalCountAcrossLabels / uniqueCardCount).toFixed(2))
      : 0,
    cardsWithMultipleLabels: cardsWithMultipleLabels.length,
    percentageWithMultipleLabels: uniqueCardCount > 0
      ? Number(((cardsWithMultipleLabels.length / uniqueCardCount) * 100).toFixed(1))
      : 0,
    warning: totalCountAcrossLabels > uniqueCardCount
      ? 'Soma de cards por label será maior que total de cards únicos'
      : null
  };
}

/**
 * ==============================================
 * VALIDAÇÃO DE COBERTURA DE DADOS
 * ==============================================
 */

/**
 * Analisa cobertura de dados essenciais
 * 
 * @param {Array} cards - Array de cards normalizados
 * @returns {Object} Relatório de cobertura
 */
export function analyzeDataCoverage(cards) {
  const total = cards.length;
  
  if (total === 0) {
    return {
      total: 0,
      coverage: {}
    };
  }
  
  const withCreationDate = cards.filter(c => c.creationDate).length;
  const withCompletionDate = cards.filter(c => c.completionDate).length;
  const withDueDate = cards.filter(c => c.dueDate).length;
  const withLabels = cards.filter(c => c.processTypes && c.processTypes.length > 0).length;
  const withMembers = cards.filter(c => c.members && c.members.length > 0).length;
  const withList = cards.filter(c => c.list && c.list.id).length;
  const withProcessTime = cards.filter(c => c.processTimeDays !== null && c.processTimeDays >= 0).length;
  
  return {
    total: total,
    coverage: {
      creationDate: {
        count: withCreationDate,
        percentage: Number(((withCreationDate / total) * 100).toFixed(1)),
        missing: total - withCreationDate
      },
      completionDate: {
        count: withCompletionDate,
        percentage: Number(((withCompletionDate / total) * 100).toFixed(1)),
        missing: total - withCompletionDate
      },
      dueDate: {
        count: withDueDate,
        percentage: Number(((withDueDate / total) * 100).toFixed(1)),
        missing: total - withDueDate
      },
      labels: {
        count: withLabels,
        percentage: Number(((withLabels / total) * 100).toFixed(1)),
        missing: total - withLabels
      },
      members: {
        count: withMembers,
        percentage: Number(((withMembers / total) * 100).toFixed(1)),
        missing: total - withMembers
      },
      list: {
        count: withList,
        percentage: Number(((withList / total) * 100).toFixed(1)),
        missing: total - withList
      },
      processTime: {
        count: withProcessTime,
        percentage: Number(((withProcessTime / total) * 100).toFixed(1)),
        missing: total - withProcessTime
      }
    }
  };
}

/**
 * ==============================================
 * VALIDAÇÃO DE FILTROS
 * ==============================================
 */

/**
 * Valida impacto de filtro de período
 * 
 * @param {Array} allCards - Todos os cards
 * @param {Array} filteredCards - Cards após filtro
 * @param {Date} startDate - Data inicial do filtro
 * @param {Date} endDate - Data final do filtro
 * @returns {Object} Análise de impacto
 */
export function validatePeriodFilter(allCards, filteredCards, startDate, endDate) {
  const excluded = allCards.length - filteredCards.length;
  
  return {
    totalCards: allCards.length,
    filteredCards: filteredCards.length,
    excludedCards: excluded,
    retentionRate: allCards.length > 0 
      ? Number(((filteredCards.length / allCards.length) * 100).toFixed(1))
      : 0,
    period: {
      start: startDate,
      end: endDate,
      days: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1
    },
    warning: excluded > allCards.length * 0.9 
      ? 'Mais de 90% dos cards foram excluídos - verifique o período'
      : null
  };
}

/**
 * Valida impacto de múltiplos filtros
 * 
 * @param {Array} allCards - Todos os cards
 * @param {Object} filters - Objeto com filtros aplicados
 * @returns {Object} Análise de impacto
 */
export function validateFilters(allCards, filters) {
  let currentCards = [...allCards];
  const steps = [];
  
  // Simular aplicação de cada filtro
  if (filters.excludeArchived !== false) {
    const before = currentCards.length;
    currentCards = currentCards.filter(card => !card.isClosed);
    steps.push({
      filter: 'excludeArchived',
      before: before,
      after: currentCards.length,
      excluded: before - currentCards.length
    });
  }
  
  if (filters.status) {
    const before = currentCards.length;
    currentCards = currentCards.filter(card => card.status === filters.status);
    steps.push({
      filter: 'status',
      value: filters.status,
      before: before,
      after: currentCards.length,
      excluded: before - currentCards.length
    });
  }
  
  if (filters.listId) {
    const before = currentCards.length;
    currentCards = currentCards.filter(card => card.list?.id === filters.listId);
    steps.push({
      filter: 'listId',
      value: filters.listId,
      before: before,
      after: currentCards.length,
      excluded: before - currentCards.length
    });
  }
  
  if (filters.memberId) {
    const before = currentCards.length;
    currentCards = currentCards.filter(card => 
      card.members?.some(member => member.id === filters.memberId)
    );
    steps.push({
      filter: 'memberId',
      value: filters.memberId,
      before: before,
      after: currentCards.length,
      excluded: before - currentCards.length
    });
  }
  
  if (filters.labelId) {
    const before = currentCards.length;
    currentCards = currentCards.filter(card => 
      card.processTypes?.some(type => type.id === filters.labelId)
    );
    steps.push({
      filter: 'labelId',
      value: filters.labelId,
      before: before,
      after: currentCards.length,
      excluded: before - currentCards.length
    });
  }
  
  if (filters.startDate || filters.endDate) {
    const before = currentCards.length;
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      currentCards = currentCards.filter(card => 
        card.creationDate && card.creationDate >= startDate
      );
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      currentCards = currentCards.filter(card => 
        card.creationDate && card.creationDate <= endDate
      );
    }
    steps.push({
      filter: 'dateRange',
      value: { start: filters.startDate, end: filters.endDate },
      before: before,
      after: currentCards.length,
      excluded: before - currentCards.length
    });
  }
  
  const totalExcluded = allCards.length - currentCards.length;
  
  return {
    initialCards: allCards.length,
    finalCards: currentCards.length,
    totalExcluded: totalExcluded,
    retentionRate: allCards.length > 0 
      ? Number(((currentCards.length / allCards.length) * 100).toFixed(1))
      : 0,
    steps: steps,
    warning: totalExcluded > allCards.length * 0.95 
      ? 'Mais de 95% dos cards foram excluídos - filtros podem estar muito restritivos'
      : null
  };
}

/**
 * ==============================================
 * ESTRATÉGIAS DE FALLBACK
 * ==============================================
 */

/**
 * Aplica estratégias de fallback para garantir dados utilizáveis
 * 
 * @param {Object} card - Card normalizado
 * @returns {Object} Card com fallbacks aplicados
 */
export function applyCardFallbacks(card) {
  const enhanced = { ...card };
  
  // Fallback para nome vazio
  if (!enhanced.name || enhanced.name.trim() === '') {
    enhanced.name = '[Sem Título]';
    enhanced._fallbacks = enhanced._fallbacks || [];
    enhanced._fallbacks.push('name');
  }
  
  // Fallback para lista ausente
  if (!enhanced.list || !enhanced.list.id) {
    enhanced.list = {
      id: 'no-list',
      name: 'Sem Lista',
      position: 999
    };
    enhanced._fallbacks = enhanced._fallbacks || [];
    enhanced._fallbacks.push('list');
  }
  
  // Fallback para labels ausentes (não modificar, apenas marcar)
  if (!enhanced.processTypes || enhanced.processTypes.length === 0) {
    enhanced._hasNoLabels = true;
  }
  
  // Fallback para membros ausentes (não modificar, apenas marcar)
  if (!enhanced.members || enhanced.members.length === 0) {
    enhanced._hasNoMembers = true;
  }
  
  // Fallback para tempo de processo inválido
  if (enhanced.processTimeDays !== null && enhanced.processTimeDays < 0) {
    enhanced.processTimeDays = null;
    enhanced._fallbacks = enhanced._fallbacks || [];
    enhanced._fallbacks.push('processTimeDays');
  }
  
  return enhanced;
}

/**
 * Aplica fallbacks para array de cards
 * 
 * @param {Array} cards - Array de cards normalizados
 * @returns {Array} Cards com fallbacks aplicados
 */
export function applyCardsFallbacks(cards) {
  return cards.map(card => applyCardFallbacks(card));
}

/**
 * ==============================================
 * CHECKLIST DE VALIDAÇÃO COMPLETA
 * ==============================================
 */

/**
 * Executa checklist completo de validação
 * 
 * @param {Array} cards - Array de cards normalizados
 * @param {Object} filters - Filtros aplicados (opcional)
 * @returns {Object} Relatório completo de validação
 */
export function runValidationChecklist(cards, filters = null) {
  console.log('🔍 Executando checklist de validação...');
  
  const report = {
    timestamp: new Date().toISOString(),
    totalCards: cards.length,
    checks: {}
  };
  
  // 1. Validação básica de cards
  console.log('  ✓ Validando cards individuais...');
  report.checks.cardValidation = validateCards(cards);
  
  // 2. Análise de cobertura de dados
  console.log('  ✓ Analisando cobertura de dados...');
  report.checks.dataCoverage = analyzeDataCoverage(cards);
  
  // 3. Análise de duplicação por membro
  console.log('  ✓ Analisando duplicação por membro...');
  report.checks.memberDuplication = analyzeMemberDuplication(cards);
  
  // 4. Análise de duplicação por label
  console.log('  ✓ Analisando duplicação por label...');
  report.checks.labelDuplication = analyzeLabelDuplication(cards);
  
  // 5. Validação de filtros (se fornecidos)
  if (filters) {
    console.log('  ✓ Validando impacto de filtros...');
    report.checks.filterImpact = validateFilters(cards, filters);
  }
  
  // Resumo executivo
  report.summary = {
    dataQuality: report.checks.cardValidation.valid ? 'good' : 'issues_found',
    criticalIssues: report.checks.cardValidation.issuesBySeverity.critical,
    warnings: report.checks.cardValidation.issuesBySeverity.warning,
    hasDuplicationRisk: (
      report.checks.memberDuplication.duplicationFactor > 1.1 ||
      report.checks.labelDuplication.duplicationFactor > 1.1
    ),
    coverageQuality: calculateCoverageScore(report.checks.dataCoverage),
    recommendations: generateRecommendations(report)
  };
  
  console.log('✅ Checklist de validação concluído');
  
  return report;
}

/**
 * Calcula score de qualidade de cobertura (0-100)
 * 
 * @param {Object} coverage - Relatório de cobertura
 * @returns {number} Score de 0 a 100
 */
function calculateCoverageScore(coverage) {
  if (!coverage.coverage) return 0;
  
  const weights = {
    creationDate: 30,  // Crítico
    list: 20,          // Importante
    processTime: 15,   // Importante
    members: 15,       // Desejável
    labels: 10,        // Desejável
    dueDate: 5,        // Opcional
    completionDate: 5  // Opcional
  };
  
  let score = 0;
  Object.entries(weights).forEach(([field, weight]) => {
    if (coverage.coverage[field]) {
      score += (coverage.coverage[field].percentage / 100) * weight;
    }
  });
  
  return Number(score.toFixed(1));
}

/**
 * Gera recomendações baseadas no relatório
 * 
 * @param {Object} report - Relatório de validação
 * @returns {Array<string>} Lista de recomendações
 */
function generateRecommendations(report) {
  const recommendations = [];
  
  // Recomendações baseadas em problemas críticos
  if (report.checks.cardValidation.issuesBySeverity.critical > 0) {
    recommendations.push('⚠️ Corrigir problemas críticos antes de análises temporais');
  }
  
  // Recomendações baseadas em cobertura
  const coverage = report.checks.dataCoverage.coverage;
  
  if (coverage.creationDate?.percentage < 90) {
    recommendations.push('📅 Adicionar datas de criação aos cards (campo "Data de Início")');
  }
  
  if (coverage.labels?.percentage < 50) {
    recommendations.push('🏷️ Classificar cards com labels para melhor análise por tipo');
  }
  
  if (coverage.members?.percentage < 70) {
    recommendations.push('👥 Atribuir membros aos cards para análise de produtividade');
  }
  
  // Recomendações baseadas em duplicação
  if (report.checks.memberDuplication.duplicationFactor > 1.5) {
    recommendations.push('⚡ Cuidado: muitos cards com múltiplos membros - totais por membro podem ser inflados');
  }
  
  if (report.checks.labelDuplication.duplicationFactor > 1.3) {
    recommendations.push('⚡ Cuidado: muitos cards com múltiplas labels - totais por tipo podem ser inflados');
  }
  
  // Recomendações baseadas em filtros
  if (report.checks.filterImpact && report.checks.filterImpact.retentionRate < 10) {
    recommendations.push('🔍 Filtros muito restritivos - considere ampliar critérios');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('✅ Dados em boa qualidade - nenhuma ação necessária');
  }
  
  return recommendations;
}

/**
 * ==============================================
 * UTILITÁRIOS DE CONSOLE
 * ==============================================
 */

/**
 * Imprime relatório de validação no console de forma legível
 * 
 * @param {Object} report - Relatório de runValidationChecklist
 */
export function printValidationReport(report) {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 RELATÓRIO DE VALIDAÇÃO DE DADOS');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log(`Total de Cards: ${report.totalCards}`);
  console.log(`Data: ${new Date(report.timestamp).toLocaleString('pt-BR')}\n`);
  
  console.log('─────────────────────────────────────────────────────────');
  console.log('RESUMO EXECUTIVO');
  console.log('─────────────────────────────────────────────────────────');
  console.log(`Qualidade de Dados: ${report.summary.dataQuality === 'good' ? '✅ BOA' : '⚠️ PROBLEMAS DETECTADOS'}`);
  console.log(`Problemas Críticos: ${report.summary.criticalIssues}`);
  console.log(`Avisos: ${report.summary.warnings}`);
  console.log(`Risco de Duplicação: ${report.summary.hasDuplicationRisk ? '⚠️ SIM' : '✅ NÃO'}`);
  console.log(`Score de Cobertura: ${report.summary.coverageQuality}/100\n`);
  
  console.log('─────────────────────────────────────────────────────────');
  console.log('RECOMENDAÇÕES');
  console.log('─────────────────────────────────────────────────────────');
  report.summary.recommendations.forEach(rec => {
    console.log(`  ${rec}`);
  });
  
  console.log('\n═══════════════════════════════════════════════════════\n');
}
