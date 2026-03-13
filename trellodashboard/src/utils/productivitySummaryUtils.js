import { formatDatePTBR, toISODate } from './productivityPeriodUtils';

export const PRODUCTIVITY_SUMMARY_GRANULARITY = {
  AUTO: 'auto',
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
};

export const PRODUCTIVITY_SUMMARY_GRANULARITY_OPTIONS = [
  { value: PRODUCTIVITY_SUMMARY_GRANULARITY.AUTO, label: 'Automatica' },
  { value: PRODUCTIVITY_SUMMARY_GRANULARITY.DAY, label: 'Por dia' },
  { value: PRODUCTIVITY_SUMMARY_GRANULARITY.WEEK, label: 'Por semana' },
  { value: PRODUCTIVITY_SUMMARY_GRANULARITY.MONTH, label: 'Por mes' },
];

const SHORT_DAY_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
});

const MONTH_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  month: 'short',
  year: 'numeric',
});

const getDurationInDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diffMs = end.getTime() - start.getTime();
  return Math.max(1, Math.floor(diffMs / 86400000) + 1);
};

const getStartOfWeek = (date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  const day = normalized.getDay();
  const diff = normalized.getDate() - day + (day === 0 ? -6 : 1);
  normalized.setDate(diff);
  return normalized;
};

const getEndOfWeek = (date) => {
  const end = new Date(getStartOfWeek(date));
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
};

const getStartOfMonth = (date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  normalized.setDate(1);
  return normalized;
};

const getEndOfMonth = (date) => {
  const end = new Date(getStartOfMonth(date));
  end.setMonth(end.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return end;
};

const formatWeekLabel = (startDate, endDate) => `${SHORT_DAY_FORMATTER.format(startDate)} a ${SHORT_DAY_FORMATTER.format(endDate)}`;

const getGranularityBucket = (dateValue, granularity) => {
  const date = new Date(dateValue);
  date.setHours(0, 0, 0, 0);

  if (granularity === PRODUCTIVITY_SUMMARY_GRANULARITY.MONTH) {
    const start = getStartOfMonth(date);
    const end = getEndOfMonth(date);
    return {
      bucketKey: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
      bucketStart: start,
      label: MONTH_FORMATTER.format(start).replace('.', ''),
      tooltipLabel: MONTH_FORMATTER.format(start).replace('.', ''),
      sortKey: start.getTime(),
      startISO: toISODate(start),
    };
  }

  if (granularity === PRODUCTIVITY_SUMMARY_GRANULARITY.WEEK) {
    const start = getStartOfWeek(date);
    const end = getEndOfWeek(date);
    return {
      bucketKey: toISODate(start),
      bucketStart: start,
      label: formatWeekLabel(start, end),
      tooltipLabel: `${formatDatePTBR(start)} ate ${formatDatePTBR(end)}`,
      sortKey: start.getTime(),
      startISO: toISODate(start),
    };
  }

  return {
    bucketKey: toISODate(date),
    bucketStart: date,
    label: SHORT_DAY_FORMATTER.format(date),
    tooltipLabel: formatDatePTBR(date),
    sortKey: date.getTime(),
    startISO: toISODate(date),
  };
};

const createMetricLineData = (buckets, collaborators, metricKey) => (
  buckets.map((bucket) => {
    const row = {
      bucket_key: bucket.bucketKey,
      bucket_label: bucket.label,
      tooltip_label: bucket.tooltipLabel,
      bucket_start: bucket.startISO,
    };

    collaborators.forEach((collaborator) => {
      row[collaborator.id] = bucket.metricsByCollaborator.get(collaborator.id)?.[metricKey] || 0;
    });

    return row;
  })
);

export const resolveSummaryGranularity = (granularity, startDate, endDate) => {
  if (granularity && granularity !== PRODUCTIVITY_SUMMARY_GRANULARITY.AUTO) {
    return granularity;
  }

  const days = getDurationInDays(startDate, endDate);
  if (days <= 45) return PRODUCTIVITY_SUMMARY_GRANULARITY.DAY;
  if (days <= 180) return PRODUCTIVITY_SUMMARY_GRANULARITY.WEEK;
  return PRODUCTIVITY_SUMMARY_GRANULARITY.MONTH;
};

export const buildProductivitySummarySeries = ({
  summaryRows = [],
  members = [],
  startDate,
  endDate,
  granularity = PRODUCTIVITY_SUMMARY_GRANULARITY.AUTO,
}) => {
  const resolvedGranularity = resolveSummaryGranularity(granularity, startDate, endDate);
  const membersMap = new Map((members || []).map((member) => [member.id, member.fullName || member.username || member.id]));
  const collaboratorTotals = new Map();
  const bucketsMap = new Map();

  (summaryRows || []).forEach((row) => {
    const collaboratorId = row.collaborator_id || 'unknown';
    const collaboratorName = membersMap.get(row.collaborator_id)
      || row.collaborator_name
      || (collaboratorId === 'unknown' ? 'Sem responsavel' : 'Desconhecido');

    if (!collaboratorTotals.has(collaboratorId)) {
      collaboratorTotals.set(collaboratorId, {
        id: collaboratorId,
        name: collaboratorName,
        total: 0,
      });
    }

    const collaboratorTotal = collaboratorTotals.get(collaboratorId);
    collaboratorTotal.total += Number(row.completed_count || 0) + Number(row.pending_count || 0) + Number(row.comment_count || 0);

    const bucket = getGranularityBucket(row.date, resolvedGranularity);
    if (!bucketsMap.has(bucket.bucketKey)) {
      bucketsMap.set(bucket.bucketKey, {
        ...bucket,
        metricsByCollaborator: new Map(),
      });
    }

    const currentBucket = bucketsMap.get(bucket.bucketKey);
    if (!currentBucket.metricsByCollaborator.has(collaboratorId)) {
      currentBucket.metricsByCollaborator.set(collaboratorId, {
        completed_count: 0,
        pending_count: 0,
        comment_count: 0,
      });
    }

    const metrics = currentBucket.metricsByCollaborator.get(collaboratorId);
    metrics.completed_count += Number(row.completed_count || 0);
    metrics.pending_count += Number(row.pending_count || 0);
    metrics.comment_count += Number(row.comment_count || 0);
  });

  const collaborators = Array.from(collaboratorTotals.values())
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'pt-BR'))
    .map(({ total, ...collaborator }) => collaborator);

  const buckets = Array.from(bucketsMap.values())
    .sort((a, b) => a.sortKey - b.sortKey);

  const completedLineData = createMetricLineData(buckets, collaborators, 'completed_count');
  const pendingLineData = createMetricLineData(buckets, collaborators, 'pending_count');
  const commentsLineData = createMetricLineData(buckets, collaborators, 'comment_count');

  const hasMetricData = (lineData) => lineData.some((row) => (
    collaborators.some((collaborator) => Number(row[collaborator.id] || 0) > 0)
  ));

  return {
    resolvedGranularity,
    collaborators,
    completedLineData,
    pendingLineData,
    commentsLineData,
    hasCompletedData: hasMetricData(completedLineData),
    hasPendingData: hasMetricData(pendingLineData),
    hasCommentsData: hasMetricData(commentsLineData),
  };
};