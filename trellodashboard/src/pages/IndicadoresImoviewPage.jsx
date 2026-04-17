import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import imoviewService from '../services/imoviewService';
import {
  buildContractsSectionMetrics,
  buildContractStartTimeline,
  buildLocacaoCardReferences,
  buildRentByStatus,
  buildStatusDistribution,
  classifyContractGuaranteeType,
  getContractPredictedRescissionDateFromImoview,
  getContractRescissionDateFromImoview,
  getContractStartDateFromImoview,
  isActiveContractStatus,
  mapContractsWithTrelloReferences,
  parseImoviewMoney,
  resolveContractStatusLabel,
} from '../utils/imoviewLocacaoProcessor';
import ContractsHeader from '../components/imoview/ContractsHeader';
import ContractsPeriodFilterSection from '../components/imoview/ContractsPeriodFilterSection';
import ContractsSourceStatsSection from '../components/imoview/ContractsSourceStatsSection';
import ImoviewErrorBanner from '../components/imoview/ImoviewErrorBanner';
import ResumoGerencialSection from '../components/imoview/ResumoGerencialSection';
import ProducaoContratualSection from '../components/imoview/ProducaoContratualSection';
import RescisoesChurnSection from '../components/imoview/RescisoesChurnSection';
import PortfolioKpisSection from '../components/imoview/PortfolioKpisSection';
import StatusChartsSection from '../components/imoview/StatusChartsSection';
import AditivosKpisSection from '../components/imoview/AditivosKpisSection';
import PayloadSampleSection from '../components/imoview/PayloadSampleSection';
import NextStepSection from '../components/imoview/NextStepSection';
import ContractsDrilldownModal from '../components/imoview/ContractsDrilldownModal';
import { PERIOD_FILTER_TYPES, getPeriodRange } from '../components/imoview/contractsPeriod';

const getMonthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const normalizeText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toUpperCase();

const hasAditivoTag = (card) => {
  if (card?.hasAditivoTag) return true;

  const labels = Array.isArray(card?.labels) ? card.labels : [];
  return labels.some((label) => normalizeText(label?.name).includes('ADITIV'));
};

const getStrictRelatedAditivoCards = (contract) => {
  const relatedCards = Array.isArray(contract?._trello?.relatedCards) ? contract._trello.relatedCards : [];
  const contractCode = contract?._trello?.contractCode;

  if (!contractCode) return [];

  return relatedCards.filter((card) => (
    hasAditivoTag(card)
    && Boolean(card?.codigoContrato)
    && card.codigoContrato === contractCode
  ));
};

const extractCreationDateFromCardId = (cardId) => {
  if (!cardId || typeof cardId !== 'string' || cardId.length < 8) return null;
  const hexTimestamp = cardId.slice(0, 8);
  const seconds = Number.parseInt(hexTimestamp, 16);
  if (Number.isNaN(seconds)) return null;
  const parsedDate = new Date(seconds * 1000);
  if (Number.isNaN(parsedDate.getTime())) return null;
  return parsedDate;
};

const getAditivoStartDate = (card) => {
  if (card?.start) {
    const parsedStart = new Date(card.start);
    if (!Number.isNaN(parsedStart.getTime())) return parsedStart;
  }

  if (card?.dateLastActivity) {
    const parsedLastActivity = new Date(card.dateLastActivity);
    if (!Number.isNaN(parsedLastActivity.getTime())) return parsedLastActivity;
  }

  return extractCreationDateFromCardId(card?.id || card?.cardId);
};

const getAditivoCompletionDate = (card) => {
  if (!card?.dueComplete || !card?.due) return null;
  const completionDate = new Date(card.due);
  if (Number.isNaN(completionDate.getTime())) return null;
  return completionDate;
};

const isDateInRange = (date, startDate, endDate) => {
  if (!date || !startDate || !endDate) return false;
  return date >= startDate && date <= endDate;
};

const groupContractsByMonth = (items, dateResolver) => {
  const map = new Map();

  (items || []).forEach((contract) => {
    const date = dateResolver(contract);
    if (!date) return;

    const key = getMonthKey(date);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(contract);
  });

  return map;
};

const IndicadoresImoviewPage = ({ trelloCards = [], trelloCustomFields = [] }) => {
  const { dark } = useTheme();
  const [contracts, setContracts] = useState([]);
  const [responses, setResponses] = useState([]);
  const [requestTargets, setRequestTargets] = useState([]);
  const [periodType, setPeriodType] = useState(PERIOD_FILTER_TYPES.THIS_MONTH);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdateAt, setLastUpdateAt] = useState(null);
  const [drilldownModal, setDrilldownModal] = useState({
    isOpen: false,
    title: '',
    subtitle: '',
    contracts: [],
  });

  const runtimeConfig = useMemo(() => imoviewService.getImoviewRuntimeConfig(), []);

  const locacaoReference = useMemo(
    () => buildLocacaoCardReferences(trelloCards, trelloCustomFields),
    [trelloCards, trelloCustomFields]
  );

  const shouldBlockByConfig = !runtimeConfig.hasApiKey;

  const loadImoviewContracts = useCallback(async () => {
    setError('');

    if (shouldBlockByConfig) {
      setContracts([]);
      setResponses([]);
      setRequestTargets([]);
      setError('Configure VITE_IMOVIEW_API_KEY no arquivo .env para iniciar a consulta.');
      return;
    }

    if (locacaoReference.stats.cardsWithLocatarioCode === 0) {
      setContracts([]);
      setResponses([]);
      setRequestTargets([]);
      setError('Nenhum card com tag LOCACAO possui Cod. Locatario preenchido no Trello.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await imoviewService.retornarContratosPorReferencias({
        references: locacaoReference.references,
      });

      const enrichedContracts = mapContractsWithTrelloReferences(result.contracts, locacaoReference.references);

      setContracts(enrichedContracts);
      setResponses(result.responses || []);
      setRequestTargets(result.requestTargets || []);
      setLastUpdateAt(new Date());
      setError('');
    } catch (requestError) {
      setContracts([]);
      setResponses([]);
      setRequestTargets([]);
      setError(requestError.message || 'Erro ao consultar a API Imoview.');
    } finally {
      setIsLoading(false);
    }
  }, [locacaoReference.references, locacaoReference.stats.cardsWithLocatarioCode, shouldBlockByConfig]);

  useEffect(() => {
    loadImoviewContracts();
  }, [loadImoviewContracts]);

  const statusChartData = useMemo(() => buildStatusDistribution(contracts), [contracts]);
  const rentByStatusData = useMemo(() => buildRentByStatus(contracts), [contracts]);
  const timelineData = useMemo(() => buildContractStartTimeline(contracts), [contracts]);

  const selectedPeriodRange = useMemo(() => getPeriodRange({
    periodType,
    customStartDate,
    customEndDate,
  }), [periodType, customStartDate, customEndDate]);

  const contractsMetrics = useMemo(
    () => buildContractsSectionMetrics(contracts, selectedPeriodRange),
    [contracts, selectedPeriodRange]
  );

  const contractsDrilldownData = useMemo(() => {
    const { startDate, endDate } = selectedPeriodRange;

    const startedInPeriodContracts = contracts.filter((contract) => isDateInRange(getContractStartDateFromImoview(contract), startDate, endDate));
    const rescindedInPeriodContracts = contracts.filter((contract) => isDateInRange(getContractRescissionDateFromImoview(contract), startDate, endDate));
    const predictedRescissionsInPeriod = contracts.filter((contract) => {
      const rescissionDate = getContractRescissionDateFromImoview(contract);
      if (rescissionDate) return false;
      return isDateInRange(getContractPredictedRescissionDateFromImoview(contract), startDate, endDate);
    });

    const activeContracts = contracts.filter((contract) => isActiveContractStatus(resolveContractStatusLabel(contract)));
    const linkedContracts = contracts.filter((contract) => (contract?._trello?.relatedCards?.length || 0) > 0);
    const contractsWithLocatarioCodeList = contracts.filter((contract) => {
      const relatedCards = contract?._trello?.relatedCards || [];
      return relatedCards.some((item) => Boolean(item?.codigoLocatario));
    });

    const now = new Date();
    const startToday = new Date(now);
    startToday.setHours(0, 0, 0, 0);
    const endNext30Days = new Date(startToday);
    endNext30Days.setDate(endNext30Days.getDate() + 30);
    endNext30Days.setHours(23, 59, 59, 999);

    const predictedNext30Days = contracts.filter((contract) => {
      const rescissionDate = getContractRescissionDateFromImoview(contract);
      if (rescissionDate) return false;
      return isDateInRange(getContractPredictedRescissionDateFromImoview(contract), startToday, endNext30Days);
    });

    const startedCaucaoContracts = startedInPeriodContracts.filter((contract) => classifyContractGuaranteeType(contract) === 'CAUCAO');
    const startedSeguroFiancaContracts = startedInPeriodContracts.filter((contract) => classifyContractGuaranteeType(contract) === 'SEGURO_FIANCA');
    const startedOutrasGarantiasContracts = startedInPeriodContracts.filter((contract) => classifyContractGuaranteeType(contract) === 'OUTRAS');

    const rescindedCaucaoContracts = rescindedInPeriodContracts.filter((contract) => classifyContractGuaranteeType(contract) === 'CAUCAO');

    const contractsByStatus = contracts.reduce((map, contract) => {
      const status = resolveContractStatusLabel(contract);
      if (!map.has(status)) {
        map.set(status, []);
      }
      map.get(status).push(contract);
      return map;
    }, new Map());

    return {
      allContracts: contracts,
      activeContracts,
      linkedContracts,
      contractsWithLocatarioCodeList,
      startedInPeriodContracts,
      rescindedInPeriodContracts,
      predictedRescissionsInPeriod,
      predictedNext30Days,
      startedCaucaoContracts,
      startedSeguroFiancaContracts,
      startedOutrasGarantiasContracts,
      rescindedCaucaoContracts,
      contractsByStatus,
      contractsByStartMonth: groupContractsByMonth(contracts, getContractStartDateFromImoview),
      startedByMonth: groupContractsByMonth(startedInPeriodContracts, getContractStartDateFromImoview),
      rescindedByMonth: groupContractsByMonth(rescindedInPeriodContracts, getContractRescissionDateFromImoview),
      predictedByMonth: groupContractsByMonth(predictedRescissionsInPeriod, getContractPredictedRescissionDateFromImoview),
    };
  }, [contracts, selectedPeriodRange]);

  const aditivosMetrics = useMemo(() => {
    const { startDate, endDate } = selectedPeriodRange;

    const aditivosCards = trelloCards.filter(hasAditivoTag);
    const aditivosConcluidosNoPeriodoCards = aditivosCards.filter((card) => isDateInRange(getAditivoCompletionDate(card), startDate, endDate));
    const aditivosIniciadosNoPeriodoCards = aditivosCards.filter((card) => isDateInRange(getAditivoStartDate(card), startDate, endDate));

    const contratosComAditivosConcluidos = contracts.filter((contract) => {
      const relatedAditivoCards = getStrictRelatedAditivoCards(contract);
      return relatedAditivoCards.some((card) => isDateInRange(getAditivoCompletionDate(card), startDate, endDate));
    });

    const contratosComAditivosIniciados = contracts.filter((contract) => {
      const relatedAditivoCards = getStrictRelatedAditivoCards(contract);
      return relatedAditivoCards.some((card) => isDateInRange(getAditivoStartDate(card), startDate, endDate));
    });

    const valorAluguelContratosAditivosConcluidos = contratosComAditivosConcluidos
      .reduce((sum, contract) => sum + parseImoviewMoney(contract?.valoraluguel), 0);

    const valorAluguelContratosAditivosIniciados = contratosComAditivosIniciados
      .reduce((sum, contract) => sum + parseImoviewMoney(contract?.valoraluguel), 0);

    return {
      aditivosConcluidosNoPeriodo: aditivosConcluidosNoPeriodoCards.length,
      aditivosIniciadosNoPeriodo: aditivosIniciadosNoPeriodoCards.length,
      valorAluguelContratosAditivosConcluidos,
      valorAluguelContratosAditivosIniciados,
      contratosComAditivosConcluidos,
      contratosComAditivosIniciados,
    };
  }, [trelloCards, contracts, selectedPeriodRange]);

  useEffect(() => {
    const { startDate, endDate } = selectedPeriodRange;

    const aditivosReferences = locacaoReference.references.filter((item) => Boolean(item?.hasAditivoTag));
    const aditivosReferencesWithLocatario = aditivosReferences.filter((item) => Boolean(item?.codigoLocatario));

    const contractsWithAnyAditivoLink = contracts.filter((contract) => {
      const relatedAditivoCards = getStrictRelatedAditivoCards(contract);
      return relatedAditivoCards.length > 0;
    });

    console.log('[Imoview][Aditivos] Diagnostico', {
      periodo: {
        startDate: startDate?.toISOString?.(),
        endDate: endDate?.toISOString?.(),
      },
      trelloCardsTotal: trelloCards.length,
      contractsTotal: contracts.length,
      requestTargetsTotal: requestTargets.length,
      responsesTotal: responses.length,
      aditivosReferencesTotal: aditivosReferences.length,
      aditivosReferencesWithLocatario: aditivosReferencesWithLocatario.length,
      contractsWithAnyAditivoLink: contractsWithAnyAditivoLink.length,
      aditivosConcluidosNoPeriodo: aditivosMetrics.aditivosConcluidosNoPeriodo,
      aditivosIniciadosNoPeriodo: aditivosMetrics.aditivosIniciadosNoPeriodo,
      contratosComAditivosConcluidos: aditivosMetrics.contratosComAditivosConcluidos.length,
      contratosComAditivosIniciados: aditivosMetrics.contratosComAditivosIniciados.length,
      valorAluguelContratosAditivosConcluidos: aditivosMetrics.valorAluguelContratosAditivosConcluidos,
      valorAluguelContratosAditivosIniciados: aditivosMetrics.valorAluguelContratosAditivosIniciados,
      sampleAditivosReferences: aditivosReferencesWithLocatario.slice(0, 5).map((item) => ({
        cardName: item?.cardName,
        codigoLocatario: item?.codigoLocatario,
        codigoContrato: item?.codigoContrato,
        hasAditivoTag: item?.hasAditivoTag,
      })),
      sampleContractsLinkedToAditivos: contractsWithAnyAditivoLink.slice(0, 5).map((contract) => ({
        codigoContrato: contract?.codigo,
        valorAluguel: contract?.valoraluguel,
        tenantCodes: contract?._trello?.tenantCodes,
        queryLocatarioCodes: contract?._trello?.queryLocatarioCodes,
        relatedAditivoCards: getStrictRelatedAditivoCards(contract)
          .map((card) => ({
            cardName: card?.cardName || card?.name,
            codigoLocatario: card?.codigoLocatario,
            codigoContrato: card?.codigoContrato,
            start: card?.start,
            due: card?.due,
            dueComplete: card?.dueComplete,
          })),
      })),
    });
  }, [
    locacaoReference.references,
    trelloCards,
    contracts,
    requestTargets,
    responses,
    selectedPeriodRange,
    aditivosMetrics,
  ]);

  const openContractsDetails = useCallback(({ title, subtitle, contracts: items = [] }) => {
    const sortedContracts = Array.isArray(items)
      ? [...items].sort((a, b) => String(a?.codigo ?? '').localeCompare(String(b?.codigo ?? ''), 'pt-BR', { numeric: true }))
      : [];

    setDrilldownModal({
      isOpen: true,
      title: title || 'Detalhamento de contratos',
      subtitle: subtitle || 'Segmento selecionado',
      contracts: sortedContracts,
    });
  }, []);

  const closeContractsDetails = useCallback(() => {
    setDrilldownModal((previous) => ({
      ...previous,
      isOpen: false,
    }));
  }, []);

  const {
    resumoGerencial,
    producaoContratual,
    garantias,
    caucaoRecebidaMensal,
    rescisoesChurn,
    previsaoRescisoes,
    productionTimeline,
    garantiaPieData,
    previsaoTimeline,
  } = contractsMetrics;

  const samplePayload = useMemo(() => {
    const firstResponse = responses[0]?.body;
    if (firstResponse?.lista?.length > 0) {
      return firstResponse.lista[0];
    }

    return null;
  }, [responses]);

  const totalRent = useMemo(
    () => rentByStatusData.reduce((sum, item) => sum + Number(item.totalRent || 0), 0),
    [rentByStatusData]
  );

  const averageRent = contracts.length > 0 ? totalRent / contracts.length : 0;

  const activeContractsCount = contractsDrilldownData.activeContracts.length;

  const coveragePercent = locacaoReference.contractCodes.length > 0
    ? Math.round((contracts.length / locacaoReference.contractCodes.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <ContractsHeader
        dark={dark}
        lastUpdateAt={lastUpdateAt}
        onRefresh={loadImoviewContracts}
        isLoading={isLoading}
      />

      <ContractsPeriodFilterSection
        dark={dark}
        periodType={periodType}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        setPeriodType={setPeriodType}
        setCustomStartDate={setCustomStartDate}
        setCustomEndDate={setCustomEndDate}
        selectedPeriodRange={selectedPeriodRange}
      />

      <ContractsSourceStatsSection
        dark={dark}
        totalCards={locacaoReference.stats.totalLocacaoCards}
        cardsWithLocatarioCode={locacaoReference.stats.cardsWithLocatarioCode}
        requestTargetsCount={requestTargets.length}
        allContracts={contractsDrilldownData.allContracts}
        contractsWithLocatarioCodeList={contractsDrilldownData.contractsWithLocatarioCodeList}
        onOpenContractsDetails={openContractsDetails}
      />

      <ImoviewErrorBanner dark={dark} error={error} runtimeConfig={runtimeConfig} />

      <ResumoGerencialSection
        dark={dark}
        resumoGerencial={resumoGerencial}
        activeContracts={contractsDrilldownData.activeContracts}
        startedInPeriodContracts={contractsDrilldownData.startedInPeriodContracts}
        rescindedInPeriodContracts={contractsDrilldownData.rescindedInPeriodContracts}
        onOpenContractsDetails={openContractsDetails}
      />

      <ProducaoContratualSection
        dark={dark}
        producaoContratual={producaoContratual}
        caucaoRecebidaMensal={caucaoRecebidaMensal}
        garantias={garantias}
        productionTimeline={productionTimeline}
        garantiaPieData={garantiaPieData}
        startedInPeriodContracts={contractsDrilldownData.startedInPeriodContracts}
        startedByMonth={contractsDrilldownData.startedByMonth}
        rescindedByMonth={contractsDrilldownData.rescindedByMonth}
        startedCaucaoContracts={contractsDrilldownData.startedCaucaoContracts}
        startedSeguroFiancaContracts={contractsDrilldownData.startedSeguroFiancaContracts}
        startedOutrasGarantiasContracts={contractsDrilldownData.startedOutrasGarantiasContracts}
        onOpenContractsDetails={openContractsDetails}
      />

      <RescisoesChurnSection
        dark={dark}
        rescisoesChurn={rescisoesChurn}
        previsaoRescisoes={previsaoRescisoes}
        previsaoTimeline={previsaoTimeline}
        rescindedInPeriodContracts={contractsDrilldownData.rescindedInPeriodContracts}
        rescindedCaucaoContracts={contractsDrilldownData.rescindedCaucaoContracts}
        predictedRescissionsInPeriod={contractsDrilldownData.predictedRescissionsInPeriod}
        predictedNext30Days={contractsDrilldownData.predictedNext30Days}
        predictedByMonth={contractsDrilldownData.predictedByMonth}
        onOpenContractsDetails={openContractsDetails}
      />

      <PortfolioKpisSection
        dark={dark}
        contractsCount={contracts.length}
        activeContractsCount={activeContractsCount}
        totalRent={totalRent}
        averageRent={averageRent}
        coveragePercent={coveragePercent}
        allContracts={contractsDrilldownData.allContracts}
        activeContracts={contractsDrilldownData.activeContracts}
        linkedContracts={contractsDrilldownData.linkedContracts}
        onOpenContractsDetails={openContractsDetails}
      />

      <StatusChartsSection
        dark={dark}
        statusChartData={statusChartData}
        rentByStatusData={rentByStatusData}
        timelineData={timelineData}
        contractsByStatus={contractsDrilldownData.contractsByStatus}
        contractsByStartMonth={contractsDrilldownData.contractsByStartMonth}
        onOpenContractsDetails={openContractsDetails}
      />

      <AditivosKpisSection
        dark={dark}
        aditivosConcluidosNoPeriodo={aditivosMetrics.aditivosConcluidosNoPeriodo}
        aditivosIniciadosNoPeriodo={aditivosMetrics.aditivosIniciadosNoPeriodo}
        valorAluguelContratosAditivosConcluidos={aditivosMetrics.valorAluguelContratosAditivosConcluidos}
        valorAluguelContratosAditivosIniciados={aditivosMetrics.valorAluguelContratosAditivosIniciados}
        contratosComAditivosConcluidos={aditivosMetrics.contratosComAditivosConcluidos}
        contratosComAditivosIniciados={aditivosMetrics.contratosComAditivosIniciados}
        onOpenContractsDetails={openContractsDetails}
      />

      <PayloadSampleSection dark={dark} samplePayload={samplePayload} />

      <NextStepSection dark={dark} />

      <ContractsDrilldownModal
        dark={dark}
        isOpen={drilldownModal.isOpen}
        title={drilldownModal.title}
        subtitle={drilldownModal.subtitle}
        contracts={drilldownModal.contracts}
        onClose={closeContractsDetails}
      />
    </div>
  );
};

export default IndicadoresImoviewPage;
