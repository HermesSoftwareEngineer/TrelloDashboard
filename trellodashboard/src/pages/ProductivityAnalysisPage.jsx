import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiBarChart2,
  FiCalendar,
  FiChevronDown,
  FiLoader,
  FiRefreshCw,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import productivityService from '../services/productivityService';
import { useTheme } from '../contexts/ThemeContext';
import {
  PRODUCTIVITY_PERIOD_OPTIONS,
  PRODUCTIVITY_PERIOD_TYPES,
  formatDatePTBR,
  getProductivityPeriodRange,
  listDaysInRange,
  toISODate,
} from '../utils/productivityPeriodUtils';
import {
  PRODUCTIVITY_SUMMARY_GRANULARITY,
  PRODUCTIVITY_SUMMARY_GRANULARITY_OPTIONS,
  buildProductivitySummarySeries,
} from '../utils/productivitySummaryUtils';

const CHART_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];

const getTooltipStyle = (dark) => ({
  backgroundColor: dark ? '#171717' : '#ffffff',
  border: `1px solid ${dark ? '#272727' : '#e5e7eb'}`,
  borderRadius: '8px',
  color: dark ? '#f5f5f5' : '#171717',
});

const getCardClass = (dark) => `rounded-2xl border p-5 ${
  dark ? 'border-neutral-800 bg-neutral-900/60' : 'border-neutral-200 bg-white shadow-sm'
}`;

const getSummaryChartCardClass = (dark) => `rounded-2xl border p-6 ${
  dark ? 'border-[#272727] bg-[#0c0c0c]' : 'border-neutral-200 bg-white shadow-sm'
}`;

const getSummaryStatCardClass = (dark) => `p-3 rounded-lg ${dark ? 'bg-neutral-900' : 'bg-neutral-50'}`;

const getChartTheme = (dark) => ({
  grid: dark ? '#1a1a1a' : '#e5e7eb',
  axis: dark ? '#737373' : '#6b7280',
  legend: dark ? '#a3a3a3' : '#525252',
  dotStroke: dark ? '#0a0a0a' : '#ffffff',
});

const formatCount = (value, label = 'atividades') => `${Number(value || 0)} ${label}`;

const getChartGradientId = (prefix, value) => {
  const normalized = String(value || 'series').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${prefix}_${normalized}`;
};

const isValidDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return false;
  return new Date(startDate) <= new Date(endDate);
};

const getLoadingProgressMessage = (progress) => {
  if (!progress) return '';

  if (progress.stage === 'collecting') {
    return `Coletando dados do Trello: dia ${progress.current} de ${progress.total} (${progress.date}).`;
  }

  return 'Atualizando dados de produtividade...';
};

const groupDailyDataByDate = (dailyData, allDates = []) => {
  const map = new Map();

  allDates.forEach((date) => {
    map.set(date, {
      date,
      total_activities: 0,
    });
  });

  dailyData.forEach((item) => {
    if (!map.has(item.date)) {
      map.set(item.date, {
        date: item.date,
        total_activities: 0,
      });
    }

    const current = map.get(item.date);
    current.total_activities += Number(item.total_activities || 0);
  });

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
};

const groupDataByCollaborator = (dailyData) => {
  const map = new Map();

  dailyData.forEach((item) => {
    const collaboratorId = item.collaborator_id || 'unknown';

    if (!map.has(collaboratorId)) {
      map.set(collaboratorId, {
        collaborator_id: collaboratorId,
        collaborator_name: item.collaborator_name || 'Desconhecido',
        total_activities: 0,
      });
    }

    map.get(collaboratorId).total_activities += Number(item.total_activities || 0);
  });

  return Array.from(map.values()).sort((a, b) => b.total_activities - a.total_activities);
};

const buildCollaboratorEvolution = (dailyData, collaboratorsSummary, allDates = []) => {
  const dates = allDates.length > 0
    ? allDates
    : Array.from(new Set(dailyData.map((item) => item.date))).sort((a, b) => a.localeCompare(b));
  const collaborators = collaboratorsSummary.map((item) => ({
    id: item.collaborator_id,
    name: item.collaborator_name,
  }));

  const matrix = new Map();
  dailyData.forEach((item) => {
    const key = `${item.date}::${item.collaborator_id}`;
    matrix.set(key, Number(item.total_activities || 0));
  });

  const lineData = dates.map((date) => {
    const row = {
      date,
      date_label: formatDatePTBR(date),
    };

    collaborators.forEach((collaborator) => {
      row[collaborator.id] = matrix.get(`${date}::${collaborator.id}`) || 0;
    });

    return row;
  });

  return {
    lineData,
    collaborators,
  };
};

const buildDistributionData = (activityRows) => {
  const totals = activityRows.reduce((accumulator, item) => {
    if (item.type === 'comment') accumulator.comment += 1;
    if (item.type === 'checklist') accumulator.checklist += 1;
    return accumulator;
  }, { comment: 0, checklist: 0 });

  return [
    { name: 'Comentarios', value: totals.comment },
    { name: 'Checklist', value: totals.checklist },
  ];
};

const ACTIVITY_TYPE_LABELS = {
  comment: 'Comentario',
  checklist: 'Item de checklist',
};

const getPayloadFromChartEvent = (chartEvent) => {
  if (!chartEvent) return null;

  if (chartEvent.payload && typeof chartEvent.payload === 'object') {
    return chartEvent.payload;
  }

  if (chartEvent.activePayload?.[0]?.payload) {
    return chartEvent.activePayload[0].payload;
  }

  if (chartEvent.tooltipPayload?.[0]?.payload) {
    return chartEvent.tooltipPayload[0].payload;
  }

  if (typeof chartEvent.date === 'string' || typeof chartEvent.collaborator_id === 'string') {
    return chartEvent;
  }

  return null;
};

const getDateFromChartEvent = (chartEvent) => {
  const payload = getPayloadFromChartEvent(chartEvent);
  if (typeof payload?.date === 'string') {
    return payload.date;
  }

  if (typeof chartEvent?.activeLabel === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(chartEvent.activeLabel)) {
    return chartEvent.activeLabel;
  }

  return null;
};

const resolveDateFromEvolutionEvent = (chartEvent, lineData) => {
  const payload = getPayloadFromChartEvent(chartEvent);

  if (typeof payload?.date === 'string' && payload.date) {
    return payload.date;
  }

  const label = payload?.date_label || chartEvent?.activeLabel || chartEvent?.label;
  if (typeof label !== 'string' || !label) {
    return null;
  }

  const matched = lineData.find((row) => row.date_label === label || row.date === label);
  return matched?.date || null;
};

const ActivityHistoryModal = ({ title, rows, isLoading, error, onClose, dark }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
    onClick={(event) => event.target === event.currentTarget && onClose()}
  >
    <div className={`w-full max-w-5xl max-h-[88vh] rounded-2xl border shadow-2xl flex flex-col ${
      dark ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-white'
    }`}>
      <div className={`flex items-center justify-between px-6 py-4 border-b ${dark ? 'border-neutral-800' : 'border-neutral-200'}`}>
        <div>
          <h2 className={`text-lg font-bold ${dark ? 'text-white' : 'text-neutral-900'}`}>{title}</h2>
          <p className={`text-xs ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>Historico de atividades do Trello para este recorte.</p>
        </div>
        <button
          onClick={onClose}
          className={`p-2 rounded-lg ${dark ? 'text-neutral-500 hover:text-white hover:bg-neutral-800' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'}`}
        >
          <FiX size={16} />
        </button>
      </div>

      <div className="px-6 py-5 overflow-y-auto">
        {isLoading ? (
          <div className={`py-16 flex items-center justify-center gap-2 ${dark ? 'text-neutral-400' : 'text-neutral-500'}`}>
            <FiLoader className="animate-spin" />
            <span>Carregando historico...</span>
          </div>
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : rows.length === 0 ? (
          <p className={`text-sm ${dark ? 'text-neutral-400' : 'text-neutral-500'}`}>Nenhuma atividade encontrada para este recorte.</p>
        ) : (
          <div className={`rounded-xl overflow-hidden border overflow-x-auto ${dark ? 'border-neutral-800' : 'border-neutral-200'}`}>
            <div className={`grid grid-cols-[180px_140px_minmax(0,1fr)] px-4 py-3 text-xs uppercase tracking-widest font-bold min-w-[760px] ${dark ? 'bg-neutral-950 text-neutral-500' : 'bg-neutral-50 text-neutral-600'}`}>
              <span>Data</span>
              <span>Tipo</span>
              <span>Atividade</span>
            </div>

            {rows.map((row) => (
              <div key={row.id} className={`grid grid-cols-[180px_140px_minmax(0,1fr)] px-4 py-3 gap-3 items-start min-w-[760px] border-t ${dark ? 'border-neutral-800' : 'border-neutral-200'}`}>
                <div>
                  <p className={`text-sm ${dark ? 'text-neutral-100' : 'text-neutral-900'}`}>{formatDatePTBR(row.date)}</p>
                  <p className={`text-xs mt-1 ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>{row.collaborator_name || 'Sem colaborador'}</p>
                </div>
                <p className={`text-sm ${dark ? 'text-neutral-100' : 'text-neutral-900'}`}>{ACTIVITY_TYPE_LABELS[row.type] || row.type || '-'}</p>
                <div className="min-w-0">
                  <p className={`text-sm whitespace-pre-wrap break-words ${dark ? 'text-neutral-200' : 'text-neutral-800'}`}>
                    {row.type === 'comment'
                      ? (row.content || 'Comentario sem texto.')
                      : (row.item_name || 'Item de checklist sem descricao.')}
                  </p>
                  <p className={`text-xs mt-1 ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>{row.card_name || 'Card sem nome'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
);

const MemberFilter = ({ members, selectedIds, onChange, dark }) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const label = selectedIds.length === 0
    ? 'Todos os colaboradores'
    : selectedIds.length === 1
      ? (members.find((member) => member.id === selectedIds[0])?.fullName || '1 colaborador')
      : `${selectedIds.length} colaboradores`;

  const toggleMember = (memberId) => {
    if (selectedIds.includes(memberId)) {
      onChange(selectedIds.filter((id) => id !== memberId));
      return;
    }

    onChange([...selectedIds, memberId]);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={`h-10 min-w-[240px] px-3 rounded-lg border text-sm flex items-center justify-between gap-2 ${
          dark
            ? 'border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700/70'
            : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50'
        }`}
      >
        <span className="flex items-center gap-2 truncate">
          <FiUsers size={14} />
          <span className="truncate">{label}</span>
        </span>
        <FiChevronDown size={14} />
      </button>

      {open && (
        <div className={`absolute top-full mt-2 left-0 z-40 w-full rounded-lg border shadow-xl ${
          dark ? 'border-neutral-700 bg-neutral-900' : 'border-neutral-200 bg-white'
        }`}>
          <div className="max-h-64 overflow-y-auto py-1">
            {members.map((member) => (
              <label key={member.id} className={`px-3 py-2 flex items-center gap-2 text-sm cursor-pointer ${
                dark ? 'text-neutral-200 hover:bg-neutral-800' : 'text-neutral-700 hover:bg-neutral-50'
              }`}>
                <input
                  type="checkbox"
                  className="accent-red-600"
                  checked={selectedIds.includes(member.id)}
                  onChange={() => toggleMember(member.id)}
                />
                <span className="truncate">{member.fullName}</span>
              </label>
            ))}
          </div>

          {selectedIds.length > 0 && (
            <button
              onClick={() => onChange([])}
              className={`w-full border-t px-3 py-2 text-xs uppercase tracking-widest ${
                dark
                  ? 'border-neutral-700 text-neutral-400 hover:text-white'
                  : 'border-neutral-200 text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Limpar selecao
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const SummaryTrendChartCard = ({
  title,
  description,
  data,
  collaborators,
  hasData,
  unitLabel,
  dark,
}) => {
  const total = data.reduce(
    (totalValue, row) => totalValue + collaborators.reduce((rowTotal, collaborator) => rowTotal + Number(row[collaborator.id] || 0), 0),
    0
  );
  const tooltipStyle = getTooltipStyle(dark);
  const summaryChartCardClass = getSummaryChartCardClass(dark);
  const summaryStatCardClass = getSummaryStatCardClass(dark);
  const chartTheme = getChartTheme(dark);

  const peakBucket = data.reduce((best, row) => {
    const rowTotal = collaborators.reduce((sum, collaborator) => sum + Number(row[collaborator.id] || 0), 0);
    if (rowTotal > best.value) {
      return {
        value: rowTotal,
        label: row.tooltip_label || row.bucket_label || '-',
      };
    }
    return best;
  }, { value: 0, label: '-' });

  return (
    <div className={summaryChartCardClass}>
      <div className="mb-4">
        <h3 className={`text-xs font-bold uppercase tracking-widest ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>{title}</h3>
        <p className={`text-xs mt-1 ${dark ? 'text-neutral-600' : 'text-neutral-500'}`}>{description}</p>
      </div>

      {!hasData || collaborators.length === 0 ? (
        <div className="h-96 flex items-center justify-center text-center px-6">
          <p className={`text-sm ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>Nenhum dado encontrado para esse recorte.</p>
        </div>
      ) : (
        <>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  {collaborators.map((collaborator, index) => {
                    const color = CHART_COLORS[index % CHART_COLORS.length];
                    const gradientId = getChartGradientId('summary_line', collaborator.id);
                    return (
                      <linearGradient key={gradientId} id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.24} />
                        <stop offset="55%" stopColor={color} stopOpacity={0.1} />
                        <stop offset="100%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    );
                  })}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                <XAxis dataKey="bucket_label" stroke={chartTheme.axis} tick={{ fontSize: 10 }} />
                <YAxis stroke={chartTheme.axis} allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => formatCount(value, unitLabel)}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.tooltip_label || label}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: 16, fontSize: '11px', color: chartTheme.legend }}
                />
                {collaborators.map((collaborator, index) => {
                  const color = CHART_COLORS[index % CHART_COLORS.length];
                  const gradientId = getChartGradientId('summary_line', collaborator.id);
                  return (
                    <>
                      <Area
                        key={`${collaborator.id}_area`}
                        type="monotone"
                        dataKey={collaborator.id}
                        stroke="none"
                        fill={`url(#${gradientId})`}
                        fillOpacity={1}
                        isAnimationActive={false}
                        legendType="none"
                      />
                      <Line
                        key={collaborator.id}
                        type="monotone"
                        dataKey={collaborator.id}
                        name={collaborator.name}
                        stroke={color}
                        strokeWidth={2}
                        dot={{ r: 4, fill: color, stroke: chartTheme.dotStroke, strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: color, stroke: chartTheme.dotStroke, strokeWidth: 2 }}
                      />
                    </>
                  );
                })}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className={summaryStatCardClass}>
              <p className="text-xs text-neutral-500">Total no periodo</p>
              <p className={`text-xl font-bold ${dark ? 'text-white' : 'text-neutral-900'}`}>{total}</p>
            </div>
            <div className={summaryStatCardClass}>
              <p className="text-xs text-neutral-500">Maior pico</p>
              <p className="text-xl font-bold text-emerald-400">{peakBucket.value}</p>
              <p className="text-[11px] mt-1 text-neutral-500">{peakBucket.label}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const SummaryCompletedPendingBarChartCard = ({ data, hasData, dark }) => {
  const totals = data.reduce((accumulator, row) => ({
    completed: accumulator.completed + Number(row.completed_count || 0),
    pending: accumulator.pending + Number(row.pending_count || 0),
  }), { completed: 0, pending: 0 });

  const tooltipStyle = getTooltipStyle(dark);
  const summaryChartCardClass = getSummaryChartCardClass(dark);
  const summaryStatCardClass = getSummaryStatCardClass(dark);
  const chartTheme = getChartTheme(dark);

  return (
    <div className={summaryChartCardClass}>
      <div className="mb-4">
        <h3 className={`text-xs font-bold uppercase tracking-widest ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>Concluidos x pendentes no decorrer dos dias</h3>
        <p className={`text-xs mt-1 ${dark ? 'text-neutral-600' : 'text-neutral-500'}`}>
          Comparativo diario consolidado entre itens concluidos e pendencias.
        </p>
      </div>

      {!hasData ? (
        <div className="h-96 flex items-center justify-center text-center px-6">
          <p className={`text-sm ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>Nenhum dado diario encontrado para esse recorte.</p>
        </div>
      ) : (
        <>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="summary_bar_completed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.2} />
                  </linearGradient>
                  <linearGradient id="summary_bar_pending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                <XAxis dataKey="date_label" stroke={chartTheme.axis} tick={{ fontSize: 10 }} />
                <YAxis stroke={chartTheme.axis} allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => formatCount(value, 'itens')}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.tooltip_label || label}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: 16, fontSize: '11px', color: chartTheme.legend }}
                />
                <Bar dataKey="completed_count" name="Concluidos" fill="url(#summary_bar_completed)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="pending_count" name="Pendentes" fill="url(#summary_bar_pending)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className={summaryStatCardClass}>
              <p className="text-xs text-neutral-500">Total concluido</p>
              <p className="text-xl font-bold text-emerald-400">{totals.completed}</p>
            </div>
            <div className={summaryStatCardClass}>
              <p className="text-xs text-neutral-500">Total pendente</p>
              <p className="text-xl font-bold text-amber-400">{totals.pending}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const ProductivityAnalysisPage = () => {
  const { dark } = useTheme();
  const tooltipStyle = getTooltipStyle(dark);
  const cardClass = getCardClass(dark);
  const chartTheme = getChartTheme(dark);

  const [periodType, setPeriodType] = useState(PRODUCTIVITY_PERIOD_TYPES.THIS_MONTH);
  const [selectedCollaboratorIds, setSelectedCollaboratorIds] = useState([]);
  const [summaryGranularity, setSummaryGranularity] = useState(PRODUCTIVITY_SUMMARY_GRANULARITY.AUTO);
  const [customRange, setCustomRange] = useState({ startDate: '', endDate: '' });

  const [members, setMembers] = useState([]);
  const [dailyData, setDailyData] = useState([]);
  const [topActivities, setTopActivities] = useState([]);
  const [activityRows, setActivityRows] = useState([]);
  const [summaryRows, setSummaryRows] = useState([]);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyModalTitle, setHistoryModalTitle] = useState('');
  const [historyRows, setHistoryRows] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState('');

  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [appliedRange, setAppliedRange] = useState(null);
  const [appliedCollaboratorIds, setAppliedCollaboratorIds] = useState([]);

  const selectedRange = useMemo(() => {
    if (periodType === PRODUCTIVITY_PERIOD_TYPES.CUSTOM) {
      if (!isValidDateRange(customRange.startDate, customRange.endDate)) return null;
    }

    return getProductivityPeriodRange(periodType, new Date(), {
      startDate: customRange.startDate,
      endDate: customRange.endDate,
    });
  }, [periodType, customRange.startDate, customRange.endDate]);

  const isMainRangeValid = Boolean(selectedRange);

  const handleMainPeriodChange = (newPeriodType) => {
    if (
      newPeriodType === PRODUCTIVITY_PERIOD_TYPES.CUSTOM
      && !isValidDateRange(customRange.startDate, customRange.endDate)
    ) {
      const fallback = getProductivityPeriodRange(PRODUCTIVITY_PERIOD_TYPES.THIS_MONTH, new Date());
      setCustomRange({ startDate: fallback.startISO, endDate: fallback.endISO });
    }

    setPeriodType(newPeriodType);
  };

  const loadDashboardData = async (range = selectedRange, collaboratorIds = selectedCollaboratorIds) => {
    const [{ dailyData: dailyRows, topActivities: topRows, activityRows: allRows }, summaryTrendRows] = await Promise.all([
      productivityService.getProductivityDashboardData({
        startDate: range.startDate,
        endDate: range.endDate,
        selectedCollaboratorIds: collaboratorIds,
        onProgress: (progressState) => setProgress(progressState),
      }),
      productivityService.getProductivitySummaryData({
        startDate: range.startDate,
        endDate: range.endDate,
        selectedCollaboratorIds: collaboratorIds,
      }),
    ]);

    setDailyData(dailyRows);
    setTopActivities(topRows);
    setActivityRows(allRows);
    setSummaryRows(summaryTrendRows);
    setAppliedRange(range);
    setAppliedCollaboratorIds(collaboratorIds);
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoadingPage(true);
      setError(null);

      try {
        const membersData = await productivityService.getProductivityMembers();
        setMembers(membersData);

        await loadDashboardData(selectedRange, selectedCollaboratorIds);
      } catch (err) {
        setError(err.message || 'Falha ao carregar dados de produtividade.');
      } finally {
        setIsLoadingPage(false);
        setProgress(null);
      }
    };

    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasPendingFilterChanges = useMemo(() => {
    if (!selectedRange && !appliedRange) return false;
    if (!selectedRange || !appliedRange) return true;

    if (selectedRange.startISO !== appliedRange.startISO || selectedRange.endISO !== appliedRange.endISO) {
      return true;
    }

    if (selectedCollaboratorIds.length !== appliedCollaboratorIds.length) {
      return true;
    }

    const selectedSet = new Set(selectedCollaboratorIds);
    return appliedCollaboratorIds.some((id) => !selectedSet.has(id));
  }, [selectedRange, appliedRange, selectedCollaboratorIds, appliedCollaboratorIds]);

  const handleReloadData = async () => {
    if (!selectedRange) return;

    setError(null);
    setProgress(null);
    setIsRefreshing(true);

    try {
      await loadDashboardData(selectedRange, selectedCollaboratorIds);
    } catch (err) {
      setError(err.message || 'Falha ao carregar dados do Trello.');
    } finally {
      setProgress(null);
      setIsRefreshing(false);
    }
  };

  const openActivityHistoryModal = async ({ title, filters = {} }) => {
    if (!selectedRange || activityRows.length === 0) return;

    setHistoryModalTitle(title);
    setHistoryRows([]);
    setHistoryError('');
    setIsHistoryModalOpen(true);
    setIsLoadingHistory(true);

    try {
      let rows = [...activityRows];

      if (typeof filters.collaboratorId === 'string' && filters.collaboratorId.length > 0) {
        rows = rows.filter((row) => row.collaborator_id === filters.collaboratorId);
      }

      if (filters.collaboratorId === null) {
        rows = rows.filter((row) => !row.collaborator_id);
      }

      if (typeof filters.date === 'string' && filters.date.length > 0) {
        rows = rows.filter((row) => row.date === filters.date);
      }

      if (typeof filters.activityType === 'string' && filters.activityType.length > 0) {
        rows = rows.filter((row) => row.type === filters.activityType);
      }

      rows.sort((a, b) => {
        const dateCompare = String(b.date_time || '').localeCompare(String(a.date_time || ''));
        if (dateCompare !== 0) return dateCompare;
        return String(b.id || '').localeCompare(String(a.id || ''));
      });

      setHistoryRows(rows);
    } catch (err) {
      setHistoryError(err.message || 'Nao foi possivel carregar o historico deste indicador.');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleDailyChartClick = async (chartEvent) => {
    const date = getDateFromChartEvent(chartEvent);
    if (!date) return;

    await openActivityHistoryModal({
      title: `Historico do dia ${formatDatePTBR(date)}`,
      filters: { date },
    });
  };

  const handleCollaboratorChartClick = async (chartEvent) => {
    const payload = getPayloadFromChartEvent(chartEvent);
    if (!payload) return;

    const collaboratorId = payload.collaborator_id === 'unknown' ? null : payload.collaborator_id;
    const collaboratorName = payload.collaborator_name || 'Sem colaborador identificado';

    await openActivityHistoryModal({
      title: `Historico de ${collaboratorName}`,
      filters: { collaboratorId },
    });
  };

  const handleDistributionChartClick = async (entry) => {
    const payload = entry?.payload || entry;
    const activityType = payload?.name === 'Comentarios'
      ? 'comment'
      : payload?.name === 'Checklist'
        ? 'checklist'
        : null;

    if (!activityType) return;

    await openActivityHistoryModal({
      title: `Historico de ${payload.name}`,
      filters: { activityType },
    });
  };

  const handleEvolutionLineClick = async (collaborator, linePoint) => {
    const date = resolveDateFromEvolutionEvent(linePoint, collaboratorEvolution.lineData);
    if (!date) return;

    const collaboratorId = collaborator.id === 'unknown' ? null : collaborator.id;

    await openActivityHistoryModal({
      title: `Historico de ${collaborator.name} em ${formatDatePTBR(date)}`,
      filters: {
        collaboratorId,
        date,
      },
    });
  };

  const allDatesInRange = useMemo(() => {
    if (!appliedRange) return [];
    return listDaysInRange(appliedRange.startDate, appliedRange.endDate).map((date) => toISODate(date));
  }, [appliedRange?.startISO, appliedRange?.endISO]);

  const totalByDay = useMemo(() => groupDailyDataByDate(dailyData, allDatesInRange), [dailyData, allDatesInRange]);
  const byCollaborator = useMemo(() => groupDataByCollaborator(dailyData), [dailyData]);
  const distributionData = useMemo(() => buildDistributionData(activityRows), [activityRows]);

  const summarySeries = useMemo(() => {
    if (!appliedRange) {
      return {
        resolvedGranularity: PRODUCTIVITY_SUMMARY_GRANULARITY.DAY,
        collaborators: [],
        completedLineData: [],
        pendingLineData: [],
        commentsLineData: [],
        hasCompletedData: false,
        hasPendingData: false,
        hasCommentsData: false,
      };
    }

    return buildProductivitySummarySeries({
      summaryRows,
      members,
      startDate: appliedRange.startDate,
      endDate: appliedRange.endDate,
      granularity: summaryGranularity,
    });
  }, [summaryRows, members, appliedRange, summaryGranularity]);

  const resolvedSummaryGranularityLabel = useMemo(() => (
    PRODUCTIVITY_SUMMARY_GRANULARITY_OPTIONS.find((option) => option.value === summarySeries.resolvedGranularity)?.label || 'Por dia'
  ), [summarySeries.resolvedGranularity]);

  const completedPendingDailyBars = useMemo(() => {
    const rowsByDate = new Map();

    allDatesInRange.forEach((date) => {
      rowsByDate.set(date, {
        date,
        date_label: formatDatePTBR(date),
        tooltip_label: formatDatePTBR(date),
        completed_count: 0,
        pending_count: 0,
      });
    });

    summaryRows.forEach((row) => {
      if (!rowsByDate.has(row.date)) {
        rowsByDate.set(row.date, {
          date: row.date,
          date_label: formatDatePTBR(row.date),
          tooltip_label: formatDatePTBR(row.date),
          completed_count: 0,
          pending_count: 0,
        });
      }

      const current = rowsByDate.get(row.date);
      current.completed_count += Number(row.completed_count || 0);
      current.pending_count += Number(row.pending_count || 0);
    });

    return Array.from(rowsByDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [summaryRows, allDatesInRange]);

  const hasCompletedPendingDailyBars = useMemo(
    () => completedPendingDailyBars.some((row) => Number(row.completed_count || 0) > 0 || Number(row.pending_count || 0) > 0),
    [completedPendingDailyBars]
  );

  const collaboratorEvolution = useMemo(
    () => buildCollaboratorEvolution(dailyData, byCollaborator, allDatesInRange),
    [dailyData, byCollaborator, allDatesInRange]
  );

  const totalActivities = useMemo(
    () => dailyData.reduce((sum, row) => sum + Number(row.total_activities || 0), 0),
    [dailyData]
  );

  const controlsDisabled = isLoadingPage || isRefreshing;

  return (
    <div className="max-w-[1400px] mx-auto py-6 px-2">
      <header className="mb-6">
        <h1 className={`text-2xl font-bold ${dark ? 'text-white' : 'text-neutral-900'}`}>Analise de produtividade</h1>
        <p className={`text-sm mt-1 ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>
          Visualizacao de produtividade baseada apenas em atividades do Trello.
        </p>
      </header>

      <section className={`${cardClass} mb-6`}>
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_auto] gap-3 items-end">
          <div>
            <label className={`text-[11px] uppercase tracking-widest font-bold block mb-1.5 ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>Periodo</label>
            <select
              value={periodType}
              onChange={(event) => handleMainPeriodChange(event.target.value)}
              className={`h-10 w-full rounded-lg border px-3 text-sm ${dark ? 'border-neutral-700 bg-neutral-800 text-neutral-100' : 'border-neutral-300 bg-white text-neutral-900'}`}
              disabled={controlsDisabled}
            >
              {PRODUCTIVITY_PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            {periodType === PRODUCTIVITY_PERIOD_TYPES.CUSTOM && (
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="date"
                  value={customRange.startDate}
                  onChange={(event) => setCustomRange((previous) => ({ ...previous, startDate: event.target.value }))}
                  className={`h-10 w-full rounded-lg border px-3 text-sm ${dark ? 'border-neutral-700 bg-neutral-800 text-neutral-100' : 'border-neutral-300 bg-white text-neutral-900'}`}
                  disabled={controlsDisabled}
                />
                <input
                  type="date"
                  value={customRange.endDate}
                  onChange={(event) => setCustomRange((previous) => ({ ...previous, endDate: event.target.value }))}
                  className={`h-10 w-full rounded-lg border px-3 text-sm ${dark ? 'border-neutral-700 bg-neutral-800 text-neutral-100' : 'border-neutral-300 bg-white text-neutral-900'}`}
                  disabled={controlsDisabled}
                />
              </div>
            )}
          </div>

          <div>
            <label className={`text-[11px] uppercase tracking-widest font-bold block mb-1.5 ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>Colaboradores</label>
            <MemberFilter
              members={members}
              selectedIds={selectedCollaboratorIds}
              onChange={setSelectedCollaboratorIds}
              dark={dark}
            />
          </div>

          <button
            onClick={handleReloadData}
            disabled={controlsDisabled || !isMainRangeValid}
            className={`px-4 h-10 rounded-lg border text-xs font-bold uppercase tracking-widest disabled:opacity-60 flex items-center gap-2 ${dark ? 'border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700/70' : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50'}`}
          >
            {isRefreshing ? <FiLoader size={14} className="animate-spin" /> : <FiRefreshCw size={14} />}
            {isRefreshing ? 'Recarregando...' : 'Recarregar do Trello'}
          </button>
        </div>

        <div className={`mt-4 flex flex-wrap items-center gap-2 text-xs ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>
          {isMainRangeValid ? (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${dark ? 'border-neutral-700 bg-neutral-800' : 'border-neutral-200 bg-neutral-50'}`}>
              <FiCalendar size={12} />
              {formatDatePTBR(selectedRange.startDate)} ate {formatDatePTBR(selectedRange.endDate)}
            </span>
          ) : (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${dark ? 'border-red-800/60 bg-red-950/30 text-red-300' : 'border-red-200 bg-red-50 text-red-700'}`}>
              <FiCalendar size={12} />
              Periodo personalizado invalido
            </span>
          )}
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${dark ? 'border-neutral-700 bg-neutral-800' : 'border-neutral-200 bg-neutral-50'}`}>
            <FiBarChart2 size={12} />
            Total de atividades: {totalActivities}
          </span>
          {hasPendingFilterChanges && (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${dark ? 'border-amber-700/70 bg-amber-900/20 text-amber-300' : 'border-amber-300 bg-amber-50 text-amber-700'}`}>
              Filtros alterados: clique em Recarregar do Trello para atualizar
            </span>
          )}
        </div>

        {progress && (
          <p className={`mt-3 text-xs ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>
            {getLoadingProgressMessage(progress)}
          </p>
        )}

        {isRefreshing && !progress && (
          <p className={`mt-3 text-xs ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>
            Recarregando dados do Trello com os filtros atuais...
          </p>
        )}

        {error && (
          <p className="mt-3 text-sm text-red-400">{error}</p>
        )}
      </section>

      {isLoadingPage ? (
        <div className={`py-20 flex items-center justify-center gap-2 ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>
          <FiLoader className="animate-spin" />
          <span>Carregando dados de produtividade...</span>
        </div>
      ) : dailyData.length === 0 ? (
        <div className={`${cardClass} text-center py-16`}>
          <p className={`font-medium ${dark ? 'text-white' : 'text-neutral-900'}`}>Nenhuma atividade encontrada no Trello para o periodo selecionado.</p>
          <p className={`text-sm mt-2 ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>Ajuste filtros e recarregue para atualizar os graficos.</p>
        </div>
      ) : (
        <>
          <section className={`${cardClass} mb-5`}>
            <div className="flex flex-col lg:flex-row lg:items-end gap-3 mb-4">
              <div>
                <h2 className={`text-sm font-bold ${dark ? 'text-white' : 'text-neutral-900'}`}>Analise de resumo</h2>
                <p className={`text-xs mt-1 ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>
                  Series por colaborador para itens concluidos, pendencias e comentarios.
                </p>
              </div>

              <div className="lg:ml-auto min-w-[220px]">
                <label className={`text-[11px] uppercase tracking-widest font-bold block mb-1.5 ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>Granularidade</label>
                <select
                  value={summaryGranularity}
                  onChange={(event) => setSummaryGranularity(event.target.value)}
                  className={`h-10 w-full rounded-lg border px-3 text-sm ${dark ? 'border-neutral-700 bg-neutral-800 text-neutral-100' : 'border-neutral-300 bg-white text-neutral-900'}`}
                >
                  {PRODUCTIVITY_SUMMARY_GRANULARITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={`mb-4 flex flex-wrap items-center gap-2 text-xs ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${dark ? 'border-neutral-700 bg-neutral-800' : 'border-neutral-200 bg-neutral-50'}`}>
                <FiBarChart2 size={12} />
                Granularidade ativa: {resolvedSummaryGranularityLabel}
              </span>
            </div>

            <div className="flex flex-col gap-4">
              <SummaryCompletedPendingBarChartCard
                data={completedPendingDailyBars}
                hasData={hasCompletedPendingDailyBars}
                dark={dark}
              />

              <SummaryTrendChartCard
                title="Itens concluidos por colaborador"
                description="Contagem de itens de checklist concluidos por colaborador ao longo do tempo."
                data={summarySeries.completedLineData}
                collaborators={summarySeries.collaborators}
                hasData={summarySeries.hasCompletedData}
                unitLabel="itens"
                dark={dark}
              />

              <SummaryTrendChartCard
                title="Pendencias por colaborador"
                description="Itens pendentes agrupados pela data de vencimento e pelo responsavel."
                data={summarySeries.pendingLineData}
                collaborators={summarySeries.collaborators}
                hasData={summarySeries.hasPendingData}
                unitLabel="itens"
                dark={dark}
              />

              <SummaryTrendChartCard
                title="Comentarios por colaborador"
                description="Contagem de comentarios registrados por colaborador no periodo."
                data={summarySeries.commentsLineData}
                collaborators={summarySeries.collaborators}
                hasData={summarySeries.hasCommentsData}
                unitLabel="comentarios"
                dark={dark}
              />
            </div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <section className={cardClass}>
              <h2 className={`text-sm font-bold mb-4 ${dark ? 'text-white' : 'text-neutral-900'}`}>Volume de atividades por dia</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={totalByDay} onClick={handleDailyChartClick}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                    <XAxis dataKey="date" tickFormatter={formatDatePTBR} stroke={chartTheme.axis} />
                    <YAxis stroke={chartTheme.axis} allowDecimals={false} />
                    <Tooltip
                      formatter={(value) => formatCount(value)}
                      labelFormatter={(label) => `Data: ${formatDatePTBR(label)}`}
                      contentStyle={tooltipStyle}
                    />
                    <Line
                      type="monotone"
                      dataKey="total_activities"
                      stroke="#ef4444"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#ef4444', strokeWidth: 0, cursor: 'pointer' }}
                      activeDot={{ r: 5, cursor: 'pointer' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className={cardClass}>
              <h2 className={`text-sm font-bold mb-4 ${dark ? 'text-white' : 'text-neutral-900'}`}>Atividades por colaborador</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byCollaborator}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                    <XAxis dataKey="collaborator_name" stroke={chartTheme.axis} />
                    <YAxis stroke={chartTheme.axis} allowDecimals={false} />
                    <Tooltip formatter={(value) => formatCount(value)} contentStyle={tooltipStyle} />
                    <Bar dataKey="total_activities" radius={[8, 8, 0, 0]} cursor="pointer" onClick={handleCollaboratorChartClick}>
                      {byCollaborator.map((item, index) => (
                        <Cell key={item.collaborator_id} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className={cardClass}>
              <h2 className={`text-sm font-bold mb-4 ${dark ? 'text-white' : 'text-neutral-900'}`}>Evolucao de atividades por colaborador</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={collaboratorEvolution.lineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                    <XAxis dataKey="date_label" stroke={chartTheme.axis} />
                    <YAxis stroke={chartTheme.axis} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatCount(value)} />
                    <Legend wrapperStyle={{ color: chartTheme.legend }} />
                    {collaboratorEvolution.collaborators.map((collaborator, index) => (
                      <Line
                        key={collaborator.id}
                        type="monotone"
                        dataKey={collaborator.id}
                        name={collaborator.name}
                        stroke={CHART_COLORS[index % CHART_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 2, strokeWidth: 0, cursor: 'pointer' }}
                        activeDot={{ r: 5, cursor: 'pointer' }}
                        onClick={(linePoint) => handleEvolutionLineClick(collaborator, linePoint)}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className={cardClass}>
              <h2 className={`text-sm font-bold mb-4 ${dark ? 'text-white' : 'text-neutral-900'}`}>Distribuicao de tipos de atividade</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={distributionData} dataKey="value" nameKey="name" outerRadius={110} label onClick={handleDistributionChartClick} cursor="pointer">
                      <Cell fill="#3b82f6" />
                      <Cell fill="#f59e0b" />
                    </Pie>
                    <Tooltip formatter={(value) => formatCount(value)} contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ color: chartTheme.legend }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
        </>
      )}

      <section className={`${cardClass} mt-5`}>
        <h2 className={`text-sm font-bold mb-3 ${dark ? 'text-white' : 'text-neutral-900'}`}>Atividades recentes do periodo</h2>
        {topActivities.length === 0 ? (
          <p className={`text-sm ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>Nenhuma atividade registrada para o filtro atual.</p>
        ) : (
          <div className="space-y-2">
            {topActivities.map((activity) => (
              <div key={activity.id} className={`rounded-lg border px-3 py-2 ${dark ? 'border-neutral-800 bg-neutral-950/70' : 'border-neutral-200 bg-neutral-50'}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm truncate ${dark ? 'text-neutral-100' : 'text-neutral-900'}`}>
                    {activity.card_name || 'Card sem nome'}
                    {activity.item_name ? ` · ${activity.item_name}` : ''}
                  </p>
                  <span className="text-xs font-bold text-blue-400">{ACTIVITY_TYPE_LABELS[activity.type] || activity.type}</span>
                </div>
                <p className={`text-xs mt-1 ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>
                  {formatDatePTBR(activity.date)}
                  {activity.collaborator_name ? ` · ${activity.collaborator_name}` : ''}
                </p>
                {activity.content && (
                  <p className={`text-xs mt-1 line-clamp-2 ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    {activity.content}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {isHistoryModalOpen && (
        <ActivityHistoryModal
          title={historyModalTitle}
          rows={historyRows}
          isLoading={isLoadingHistory}
          error={historyError}
          onClose={() => {
            setIsHistoryModalOpen(false);
            setHistoryRows([]);
            setHistoryError('');
          }}
          dark={dark}
        />
      )}
    </div>
  );
};

export default ProductivityAnalysisPage;
