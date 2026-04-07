const normalizeText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toUpperCase();

const parseCode = (value) => {
  if (value === undefined || value === null || value === '') return null;

  const raw = String(value).trim();
  if (!raw) return null;

  const onlyDigits = raw.replace(/\D/g, '');
  if (!onlyDigits) return null;

  const parsed = Number.parseInt(onlyDigits, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;

  return parsed;
};

export const parseImoviewMoney = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const text = String(value || '').trim();
  if (!text) return 0;

  const clean = text
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');

  const parsed = Number.parseFloat(clean);
  if (!Number.isFinite(parsed)) return 0;

  return parsed;
};

export const parseImoviewDate = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const text = String(value).trim();
  if (!text) return null;

  // Imoview often returns pt-BR dates like 20/01/2025.
  const brDateMatch = text.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (brDateMatch) {
    const day = Number.parseInt(brDateMatch[1], 10);
    const month = Number.parseInt(brDateMatch[2], 10);
    const year = Number.parseInt(brDateMatch[3], 10);
    const hour = Number.parseInt(brDateMatch[4] || '0', 10);
    const minute = Number.parseInt(brDateMatch[5] || '0', 10);
    const second = Number.parseInt(brDateMatch[6] || '0', 10);

    const date = new Date(year, month - 1, day, hour, minute, second);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const isContractSectionCard = (card) => {
  const labels = Array.isArray(card?.labels) ? card.labels : [];
  return labels.some((label) => {
    const normalized = normalizeText(label?.name);
    return normalized.includes('LOCACAO') || normalized.includes('RESCISAO') || normalized.includes('ADITIV');
  });
};

const getCustomFieldItemValue = (item) => {
  if (!item?.value) return null;

  if (item.value.number !== undefined) return item.value.number;
  if (item.value.text !== undefined) return item.value.text;
  if (item.value.date !== undefined) return item.value.date;
  if (item.value.checked !== undefined) return item.value.checked ? '1' : '0';

  return null;
};

const findCustomFieldId = (customFields, aliases) => {
  const aliasSet = new Set(aliases.map((alias) => normalizeText(alias)));

  const found = customFields.find((field) => {
    const fieldName = normalizeText(field?.name);
    if (!fieldName) return false;

    if (aliasSet.has(fieldName)) return true;
    return aliases.some((alias) => fieldName.includes(normalizeText(alias)));
  });

  return found?.id || null;
};

const buildCustomFieldAliasMap = (customFields = []) => ({
  contratoFieldId: findCustomFieldId(customFields, ['Cod. Contrato', 'Cod Contrato', 'Codigo Contrato']),
  locadorFieldId: findCustomFieldId(customFields, ['Cod. Locador', 'Cod Locador', 'Cod. Proprietario', 'Cod Proprietario']),
  locatarioFieldId: findCustomFieldId(customFields, ['Cod. Locatario', 'Cod Locatario', 'Cod. Locatário', 'Cod Locatário', 'Codigo Locatario']),
  imovelFieldId: findCustomFieldId(customFields, ['Cod. Imovel', 'Cod Imovel', 'Codigo Imovel']),
});

export const buildLocacaoCardReferences = (cards = [], customFields = []) => {
  const aliasMap = buildCustomFieldAliasMap(customFields);
  const contractCards = cards.filter(isContractSectionCard);

  const references = contractCards.map((card) => {
    const labels = Array.isArray(card?.labels) ? card.labels : [];
    const hasLocacaoTag = labels.some((label) => normalizeText(label?.name).includes('LOCACAO'));
    const hasRescisaoTag = labels.some((label) => normalizeText(label?.name).includes('RESCISAO'));
    const hasAditivoTag = labels.some((label) => normalizeText(label?.name).includes('ADITIV'));

    const fieldMap = new Map();
    (card.customFieldItems || []).forEach((item) => {
      fieldMap.set(item.idCustomField, getCustomFieldItemValue(item));
    });

    const codigoContrato = parseCode(fieldMap.get(aliasMap.contratoFieldId));
    const codigoLocador = parseCode(fieldMap.get(aliasMap.locadorFieldId));
    const codigoLocatario = parseCode(fieldMap.get(aliasMap.locatarioFieldId));
    const codigoImovel = parseCode(fieldMap.get(aliasMap.imovelFieldId));

    return {
      id: card.id,
      cardId: card.id,
      cardName: card.name,
      cardUrl: card.url,
      start: card.start,
      due: card.due,
      dueComplete: card.dueComplete,
      dateLastActivity: card.dateLastActivity,
      labels,
      hasLocacaoTag,
      hasRescisaoTag,
      hasAditivoTag,
      codigoContrato,
      codigoLocador,
      codigoLocatario,
      codigoImovel,
      hasAnyCode: Boolean(codigoContrato || codigoLocador || codigoLocatario || codigoImovel),
    };
  });

  const contractCodes = Array.from(new Set(references.map((item) => item.codigoContrato).filter(Boolean)));
  const ownerCodes = Array.from(new Set(references.map((item) => item.codigoLocador).filter(Boolean)));
  const tenantCodes = Array.from(new Set(references.map((item) => item.codigoLocatario).filter(Boolean)));
  const propertyCodes = Array.from(new Set(references.map((item) => item.codigoImovel).filter(Boolean)));

  return {
    aliasMap,
    references,
    contractCodes,
    ownerCodes,
    tenantCodes,
    propertyCodes,
    stats: {
      totalLocacaoCards: contractCards.length,
      cardsWithCodes: references.filter((item) => item.hasAnyCode).length,
      cardsWithoutCodes: references.filter((item) => !item.hasAnyCode).length,
      cardsWithContractCode: references.filter((item) => Boolean(item.codigoContrato)).length,
      cardsWithLocadorCode: references.filter((item) => Boolean(item.codigoLocador)).length,
      cardsWithContractAndLocadorCode: references.filter((item) => Boolean(item.codigoContrato && item.codigoLocador)).length,
      cardsWithLocatarioCode: references.filter((item) => Boolean(item.codigoLocatario)).length,
      cardsWithContractAndLocatarioCode: references.filter((item) => Boolean(item.codigoContrato && item.codigoLocatario)).length,
    },
  };
};

const getContractPropertyCodes = (contract) => {
  const properties = Array.isArray(contract?.imoveis) ? contract.imoveis : [];
  return properties
    .map((property) => parseCode(property?.codigo))
    .filter(Boolean);
};

const getContractOwnerCodes = (contract) => {
  const properties = Array.isArray(contract?.imoveis) ? contract.imoveis : [];

  return properties
    .flatMap((property) => (Array.isArray(property?.locadores) ? property.locadores : []))
    .map((owner) => parseCode(owner?.codigo))
    .filter(Boolean);
};

const getContractTenantCodes = (contract) => {
  const tenantsFromRoot = Array.isArray(contract?.locatarios) ? contract.locatarios : [];
  const properties = Array.isArray(contract?.imoveis) ? contract.imoveis : [];
  const tenantsFromProperties = properties.flatMap((property) => (Array.isArray(property?.locatarios) ? property.locatarios : []));

  return [...tenantsFromRoot, ...tenantsFromProperties]
    .map((tenant) => parseCode(tenant?.codigo))
    .filter(Boolean);
};

export const mapContractsWithTrelloReferences = (contracts = [], references = []) => {
  return contracts.map((contract) => {
    const contractCode = parseCode(contract?.codigo);
    const ownerCodes = getContractOwnerCodes(contract);
    const tenantCodes = getContractTenantCodes(contract);
    const queryLocatarioCodes = (Array.isArray(contract?._imoviewQueryLocatarioCodes) ? contract._imoviewQueryLocatarioCodes : [])
      .map((value) => parseCode(value))
      .filter(Boolean);
    const propertyCodes = getContractPropertyCodes(contract);

    const relatedCards = references.filter((cardRef) => {
      if (cardRef.codigoContrato && contractCode && cardRef.codigoContrato === contractCode) return true;
      if (cardRef.codigoLocador && ownerCodes.includes(cardRef.codigoLocador)) return true;
      if (cardRef.codigoLocatario && tenantCodes.includes(cardRef.codigoLocatario)) return true;
      if (cardRef.codigoLocatario && queryLocatarioCodes.includes(cardRef.codigoLocatario)) return true;
      if (cardRef.codigoImovel && propertyCodes.includes(cardRef.codigoImovel)) return true;
      return false;
    });

    return {
      ...contract,
      _trello: {
        contractCode,
        ownerCodes,
        tenantCodes,
        queryLocatarioCodes,
        propertyCodes,
        relatedCards,
      },
    };
  });
};

export const resolveContractStatusLabel = (contract) => {
  const status = String(contract?.status || '').trim();
  if (status) return status;

  const situacao = String(contract?.situacao || '').trim();
  if (situacao) return situacao;

  return 'Sem status';
};

export const buildStatusDistribution = (contracts = []) => {
  const map = new Map();

  contracts.forEach((contract) => {
    const key = resolveContractStatusLabel(contract);
    map.set(key, (map.get(key) || 0) + 1);
  });

  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};

export const buildRentByStatus = (contracts = []) => {
  const map = new Map();

  contracts.forEach((contract) => {
    const key = resolveContractStatusLabel(contract);
    const current = map.get(key) || { totalRent: 0, contracts: 0 };

    current.totalRent += parseImoviewMoney(contract?.valoraluguel);
    current.contracts += 1;
    map.set(key, current);
  });

  return Array.from(map.entries())
    .map(([status, values]) => ({
      status,
      totalRent: Number(values.totalRent.toFixed(2)),
      contracts: values.contracts,
      avgRent: values.contracts > 0 ? Number((values.totalRent / values.contracts).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.totalRent - a.totalRent);
};

export const buildContractStartTimeline = (contracts = []) => {
  const map = new Map();

  contracts.forEach((contract) => {
    const startDate = parseImoviewDate(contract?.datainicio);
    if (!startDate) return;

    const year = startDate.getFullYear();
    const month = String(startDate.getMonth() + 1).padStart(2, '0');
    const key = `${year}-${month}`;

    const current = map.get(key) || {
      key,
      label: startDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      contratos: 0,
    };

    current.contratos += 1;
    map.set(key, current);
  });

  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
};

export const isActiveContractStatus = (status) => {
  const normalized = normalizeText(status);
  if (!normalized) return false;

  if (normalized.includes('ENCERR')) return false;
  if (normalized.includes('RESC')) return false;
  if (normalized.includes('CANCEL')) return false;
  if (normalized.includes('INATIV')) return false;

  return true;
};

export const buildLocacaoKpis = (contracts = [], references = []) => {
  const totalContracts = contracts.length;
  const totalRent = contracts.reduce((sum, contract) => sum + parseImoviewMoney(contract?.valoraluguel), 0);
  const activeContracts = contracts.filter((contract) => isActiveContractStatus(resolveContractStatusLabel(contract))).length;
  const linkedContracts = contracts.filter((contract) => (contract?._trello?.relatedCards?.length || 0) > 0).length;

  const uniqueContractsFromTrello = new Set(
    references
      .map((ref) => ref.codigoContrato)
      .filter(Boolean)
  );

  return {
    totalContracts,
    activeContracts,
    totalRent,
    averageRent: totalContracts > 0 ? totalRent / totalContracts : 0,
    linkedContracts,
    coveragePercent: uniqueContractsFromTrello.size > 0
      ? Math.round((linkedContracts / uniqueContractsFromTrello.size) * 100)
      : 0,
  };
};

export const getContractStartDateFromImoview = (contract) => parseImoviewDate(contract?.datainicio);

export const getContractRescissionDateFromImoview = (contract) => parseImoviewDate(contract?.datarescisao);

export const getContractPredictedRescissionDateFromImoview = (contract) => parseImoviewDate(contract?.dataprevisaorescisao);

const isDateInRange = (date, startDate, endDate) => {
  if (!date || !startDate || !endDate) return false;
  return date >= startDate && date <= endDate;
};

export const classifyContractGuaranteeType = (contract) => {
  const source = `${contract?.garantia || ''} ${contract?.garantialocaticia?.forma || ''}`;
  const normalized = normalizeText(source);

  if (normalized.includes('CAUC')) return 'CAUCAO';
  if (normalized.includes('SEGURO') || normalized.includes('FIANC')) return 'SEGURO_FIANCA';

  return 'OUTRAS';
};

const getGuaranteeFinancialValue = (contract) => {
  return parseImoviewMoney(contract?.garantialocaticia?.valor);
};

export const buildContractsSectionMetrics = (contracts = [], periodRange) => {
  if (!periodRange?.startDate || !periodRange?.endDate) {
    return {
      resumoGerencial: {
        vgvTotalCarteira: 0,
        totalContratosFechados: 0,
        novosContratosPeriodo: 0,
        volumeFinanceiroGeradoVgl: 0,
        rescisoesPeriodo: 0,
        churnFinanceiroValor: 0,
      },
      producaoContratual: {
        totalContratosFirmados: 0,
        vgl: 0,
        ticketMedio: 0,
      },
      garantias: {
        caucao: 0,
        seguroFianca: 0,
        outras: 0,
      },
      caucaoRecebidaMensal: 0,
      rescisoesChurn: {
        totalContratosRescindidos: 0,
        valorTotalSaiuCarteira: 0,
        ticketMedioRescisoes: 0,
        valorCaucoesDevolvidas: 0,
        churnFinanceiroPercentual: 0,
      },
      previsaoRescisoes: {
        totalPrevistasPeriodo: 0,
        valorPrevistoSaiuCarteira: 0,
        ticketMedioPrevisto: 0,
        percentualPrevistoSobreCarteira: 0,
        totalPrevistasProximos30Dias: 0,
        valorPrevistoProximos30Dias: 0,
      },
      productionTimeline: [],
      garantiaPieData: [],
      previsaoTimeline: [],
    };
  }

  const { startDate, endDate } = periodRange;

  const startedInPeriod = contracts.filter((contract) => isDateInRange(getContractStartDateFromImoview(contract), startDate, endDate));

  const rescindedInPeriod = contracts.filter((contract) => {
    const rescissionDate = getContractRescissionDateFromImoview(contract);
    // Only explicit Imoview rescission date counts as actual rescission.
    return isDateInRange(rescissionDate, startDate, endDate);
  });

  const predictedRescissionsInPeriod = contracts.filter((contract) => {
    const rescissionDate = getContractRescissionDateFromImoview(contract);
    if (rescissionDate) return false;

    return isDateInRange(getContractPredictedRescissionDateFromImoview(contract), startDate, endDate);
  });

  const activeContracts = contracts.filter((contract) => isActiveContractStatus(resolveContractStatusLabel(contract)));

  const vgvTotalCarteira = activeContracts.reduce((sum, contract) => sum + parseImoviewMoney(contract?.valoraluguel), 0);
  const vgl = startedInPeriod.reduce((sum, contract) => sum + parseImoviewMoney(contract?.valoraluguel), 0);
  const churnFinanceiroValor = rescindedInPeriod.reduce((sum, contract) => sum + parseImoviewMoney(contract?.valoraluguel), 0);
  const valorPrevistoSaiuCarteira = predictedRescissionsInPeriod.reduce((sum, contract) => sum + parseImoviewMoney(contract?.valoraluguel), 0);

  const guaranteeCounters = startedInPeriod.reduce((acc, contract) => {
    const guaranteeType = classifyContractGuaranteeType(contract);
    if (guaranteeType === 'CAUCAO') acc.caucao += 1;
    else if (guaranteeType === 'SEGURO_FIANCA') acc.seguroFianca += 1;
    else acc.outras += 1;
    return acc;
  }, {
    caucao: 0,
    seguroFianca: 0,
    outras: 0,
  });

  const caucaoRecebidaMensal = startedInPeriod
    .filter((contract) => classifyContractGuaranteeType(contract) === 'CAUCAO')
    .reduce((sum, contract) => sum + getGuaranteeFinancialValue(contract), 0);

  const valorCaucoesDevolvidas = rescindedInPeriod
    .filter((contract) => classifyContractGuaranteeType(contract) === 'CAUCAO')
    .reduce((sum, contract) => sum + getGuaranteeFinancialValue(contract), 0);

  const today = new Date();
  const startToday = new Date(today);
  startToday.setHours(0, 0, 0, 0);
  const endNext30Days = new Date(startToday);
  endNext30Days.setDate(endNext30Days.getDate() + 30);
  endNext30Days.setHours(23, 59, 59, 999);

  const predictedNext30Days = contracts.filter((contract) => {
    const rescissionDate = getContractRescissionDateFromImoview(contract);
    if (rescissionDate) return false;

    return isDateInRange(getContractPredictedRescissionDateFromImoview(contract), startToday, endNext30Days);
  });

  const valorPrevistoProximos30Dias = predictedNext30Days.reduce((sum, contract) => sum + parseImoviewMoney(contract?.valoraluguel), 0);

  const monthBuckets = [];
  const bucketCursor = new Date(startDate);
  bucketCursor.setDate(1);
  bucketCursor.setHours(0, 0, 0, 0);

  while (bucketCursor <= endDate) {
    const year = bucketCursor.getFullYear();
    const month = bucketCursor.getMonth();
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;
    monthBuckets.push({
      key,
      label: bucketCursor.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      novosContratos: 0,
      rescisoes: 0,
      vgl: 0,
      churn: 0,
    });

    bucketCursor.setMonth(bucketCursor.getMonth() + 1);
  }

  const bucketMap = new Map(monthBuckets.map((bucket) => [bucket.key, bucket]));

  const previsaoMonthBuckets = monthBuckets.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    previstas: 0,
    valorPrevisto: 0,
  }));
  const previsaoBucketMap = new Map(previsaoMonthBuckets.map((bucket) => [bucket.key, bucket]));

  startedInPeriod.forEach((contract) => {
    const start = getContractStartDateFromImoview(contract);
    if (!start) return;

    const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
    const bucket = bucketMap.get(key);
    if (!bucket) return;

    bucket.novosContratos += 1;
    bucket.vgl += parseImoviewMoney(contract?.valoraluguel);
  });

  rescindedInPeriod.forEach((contract) => {
    const rescissionDate = getContractRescissionDateFromImoview(contract);
    if (!rescissionDate) return;

    const key = `${rescissionDate.getFullYear()}-${String(rescissionDate.getMonth() + 1).padStart(2, '0')}`;
    const bucket = bucketMap.get(key);
    if (!bucket) return;

    bucket.rescisoes += 1;
    bucket.churn += parseImoviewMoney(contract?.valoraluguel);
  });

  predictedRescissionsInPeriod.forEach((contract) => {
    const predictionDate = getContractPredictedRescissionDateFromImoview(contract);
    if (!predictionDate) return;

    const key = `${predictionDate.getFullYear()}-${String(predictionDate.getMonth() + 1).padStart(2, '0')}`;
    const bucket = previsaoBucketMap.get(key);
    if (!bucket) return;

    bucket.previstas += 1;
    bucket.valorPrevisto += parseImoviewMoney(contract?.valoraluguel);
  });

  return {
    resumoGerencial: {
      vgvTotalCarteira,
      totalContratosFechados: startedInPeriod.length,
      novosContratosPeriodo: startedInPeriod.length,
      volumeFinanceiroGeradoVgl: vgl,
      rescisoesPeriodo: rescindedInPeriod.length,
      churnFinanceiroValor,
    },
    producaoContratual: {
      totalContratosFirmados: startedInPeriod.length,
      vgl,
      ticketMedio: startedInPeriod.length > 0 ? vgl / startedInPeriod.length : 0,
    },
    garantias: guaranteeCounters,
    caucaoRecebidaMensal,
    rescisoesChurn: {
      totalContratosRescindidos: rescindedInPeriod.length,
      valorTotalSaiuCarteira: churnFinanceiroValor,
      ticketMedioRescisoes: rescindedInPeriod.length > 0 ? churnFinanceiroValor / rescindedInPeriod.length : 0,
      valorCaucoesDevolvidas,
      churnFinanceiroPercentual: vgvTotalCarteira > 0 ? (churnFinanceiroValor / vgvTotalCarteira) * 100 : 0,
    },
    previsaoRescisoes: {
      totalPrevistasPeriodo: predictedRescissionsInPeriod.length,
      valorPrevistoSaiuCarteira,
      ticketMedioPrevisto: predictedRescissionsInPeriod.length > 0 ? valorPrevistoSaiuCarteira / predictedRescissionsInPeriod.length : 0,
      percentualPrevistoSobreCarteira: vgvTotalCarteira > 0 ? (valorPrevistoSaiuCarteira / vgvTotalCarteira) * 100 : 0,
      totalPrevistasProximos30Dias: predictedNext30Days.length,
      valorPrevistoProximos30Dias,
    },
    productionTimeline: monthBuckets,
    garantiaPieData: [
      { name: 'Caucao', value: guaranteeCounters.caucao },
      { name: 'Seguro fianca', value: guaranteeCounters.seguroFianca },
      { name: 'Outras', value: guaranteeCounters.outras },
    ],
    previsaoTimeline: previsaoMonthBuckets,
  };
};
