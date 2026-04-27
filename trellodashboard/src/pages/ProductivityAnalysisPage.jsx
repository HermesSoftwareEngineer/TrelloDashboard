import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiAlignLeft,
  FiBarChart2,
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiChevronUp,
  FiEdit2,
  FiLoader,
  FiRefreshCw,
  FiSave,
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
} from '../utils/productivityPeriodUtils';
import {
  PRODUCTIVITY_SUMMARY_GRANULARITY,
  PRODUCTIVITY_SUMMARY_GRANULARITY_OPTIONS,
  buildProductivitySummarySeries,
} from '../utils/productivitySummaryUtils';

const CHART_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];
const ANALYSIS_AUTH_PASSWORD = import.meta.env.VITE_PRODUCTIVITY_ANALYSIS_PASSWORD;

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

const formatPoints = (value) => `${Number(value || 0).toFixed(0)} pts`;

const formatCount = (value, label) => `${Number(value || 0)} ${label}`;

const getChartGradientId = (prefix, value) => {
  const normalized = String(value || 'series').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${prefix}_${normalized}`;
};

const getMetricTotalFromSeries = (data, collaborators) => data.reduce(
  (total, row) => total + collaborators.reduce((rowTotal, collaborator) => rowTotal + Number(row[collaborator.id] || 0), 0),
  0,
);

const getActiveCollaboratorCount = (data, collaborators) => collaborators.filter((collaborator) => (
  data.some((row) => Number(row[collaborator.id] || 0) > 0)
)).length;

const getPeakBucket = (data, collaborators) => {
  let peakLabel = '-';
  let peakValue = 0;

  data.forEach((row) => {
    const rowTotal = collaborators.reduce((total, collaborator) => total + Number(row[collaborator.id] || 0), 0);
    if (rowTotal > peakValue) {
      peakValue = rowTotal;
      peakLabel = row.tooltip_label || row.bucket_label || '-';
    }
  });

  return {
    label: peakLabel,
    value: peakValue,
  };
};

const createLocalRowKey = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `row_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const isValidDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return false;
  return new Date(startDate) <= new Date(endDate);
};

const getAnalysisProgressMessage = (progress) => {
  if (!progress) return '';

  if (progress.stage === 'collecting') {
    return `Coletando dados do Trello: dia ${progress.current} de ${progress.total} (${progress.date}).`;
  }

  if (progress.stage === 'analyzing') {
    return `Processando IA em lotes: chamada ${progress.currentChunk} de ${progress.totalChunks} (${progress.processedActivities}/${progress.totalActivities} atividades concluídas).`;
  }

  if (progress.stage === 'completed') {
    return `Análise finalizada: ${progress.processedActivities}/${progress.totalActivities} atividades processadas.`;
  }

  return 'Processando análise de produtividade...';
};

const groupDailyDataByDate = (dailyData) => {
  const map = new Map();

  dailyData.forEach((item) => {
    if (!map.has(item.date)) {
      map.set(item.date, {
        date: item.date,
        points_total: 0,
      });
    }

    const current = map.get(item.date);
    current.points_total += Number(item.points_total || 0);
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
        points_total: 0,
      });
    }

    map.get(collaboratorId).points_total += Number(item.points_total || 0);
  });

  return Array.from(map.values()).sort((a, b) => b.points_total - a.points_total);
};

const buildCollaboratorEvolution = (dailyData, collaboratorsSummary) => {
  const dates = Array.from(new Set(dailyData.map((item) => item.date))).sort((a, b) => a.localeCompare(b));
  const collaborators = collaboratorsSummary.map((item) => ({
    id: item.collaborator_id,
    name: item.collaborator_name,
  }));

  const matrix = new Map();
  dailyData.forEach((item) => {
    const key = `${item.date}::${item.collaborator_id}`;
    matrix.set(key, Number(item.points_total || 0));
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

const buildDistributionData = (dailyData) => {
  const totals = dailyData.reduce((accumulator, item) => {
    accumulator.comment += Number(item.comment_points || 0);
    accumulator.checklist += Number(item.checklist_points || 0);
    return accumulator;
  }, { comment: 0, checklist: 0 });

  return [
    { name: 'Comentários', value: totals.comment },
    { name: 'Checklist', value: totals.checklist },
  ];
};

const ACTIVITY_TYPE_LABELS = {
  comment: 'Comentário',
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

const ActivityHistoryModal = ({
  title,
  rows,
  isLoading,
  error,
  onClose,
  dark,
}) => {
  const [sortConfig, setSortConfig] = useState({ column: 'points', direction: 'desc' });
  const [wrappedCells, setWrappedCells] = useState({});

  const sortedRows = useMemo(() => {
    const getSortableValue = (row, column) => {
      if (column === 'type') return ACTIVITY_TYPE_LABELS[row.type] || row.type || '';
      if (column === 'ai_reason') {
        const activityText = row.type === 'comment' ? (row.content || '') : (row.item_name || '');
        return `${activityText} ${row.ai_reason || ''}`.trim();
      }
      if (column === 'points') return Number(row.points) || 0;
      return '';
    };

    const copy = [...rows];
    copy.sort((a, b) => {
      const aValue = getSortableValue(a, sortConfig.column);
      const bValue = getSortableValue(b, sortConfig.column);

      let compare = 0;
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        compare = aValue - bValue;
      } else {
        compare = String(aValue).localeCompare(String(bValue), 'pt-BR');
      }

      if (compare === 0) {
        return String(b.date || '').localeCompare(String(a.date || ''));
      }

      return sortConfig.direction === 'asc' ? compare : -compare;
    });

    return copy;
  }, [rows, sortConfig.column, sortConfig.direction]);

  const toggleSort = (column) => {
    setSortConfig((previous) => {
      if (previous.column === column) {
        return {
          column,
          direction: previous.direction === 'asc' ? 'desc' : 'asc',
        };
      }

      return {
        column,
        direction: column === 'points' ? 'desc' : 'asc',
      };
    });
  };

  const renderSortIndicator = (column) => {
    if (sortConfig.column !== column) {
      return <FiChevronDown size={12} className="opacity-30" />;
    }

    return sortConfig.direction === 'asc'
      ? <FiChevronUp size={12} />
      : <FiChevronDown size={12} />;
  };

  const toggleCellWrap = (cellKey) => {
    const currentlyWrapped = wrappedCells[cellKey] !== false;

    setWrappedCells((previous) => ({
      ...previous,
      [cellKey]: !currentlyWrapped,
    }));
  };

  const shouldShowWrapToggle = (text) => {
    const value = String(text || '');
    return value.length > 120 || value.includes('\n');
  };

  const getCellTextClassName = (cellKey) => {
    if (wrappedCells[cellKey] !== false) {
      return 'whitespace-pre-wrap break-words';
    }

    return 'whitespace-nowrap overflow-hidden text-ellipsis';
  };

  const tooltipStyle = getTooltipStyle(dark);

  return (
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
            <p className={`text-xs ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>Histórico das atividades usadas no cálculo da IA para esse indicador.</p>
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
              <span>Carregando histórico do indicador...</span>
            </div>
          ) : error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : rows.length === 0 ? (
            <p className={`text-sm ${dark ? 'text-neutral-400' : 'text-neutral-500'}`}>Nenhuma atividade encontrada para este recorte.</p>
          ) : (
            <div className={`rounded-xl overflow-hidden border overflow-x-auto ${dark ? 'border-neutral-800' : 'border-neutral-200'}`}>
              <div className={`grid grid-cols-[220px_minmax(0,1fr)_160px] px-4 py-3 text-xs uppercase tracking-widest font-bold min-w-[760px] ${dark ? 'bg-neutral-950 text-neutral-500' : 'bg-neutral-50 text-neutral-600'}`}>
                <button onClick={() => toggleSort('type')} className={`flex items-center gap-1 text-left ${dark ? 'hover:text-white' : 'hover:text-neutral-900'}`}>
                  Tipo de atividade {renderSortIndicator('type')}
                </button>
                <button onClick={() => toggleSort('ai_reason')} className={`flex items-center gap-1 text-left ${dark ? 'hover:text-white' : 'hover:text-neutral-900'}`}>
                  Atividade e comentário da IA {renderSortIndicator('ai_reason')}
                </button>
                <button onClick={() => toggleSort('points')} className={`w-[160px] min-w-[160px] max-w-[160px] justify-self-end flex items-center justify-end gap-1 text-right ${dark ? 'hover:text-white' : 'hover:text-neutral-900'}`}>
                  Pontuação atribuída {renderSortIndicator('points')}
                </button>
              </div>

              {sortedRows.map((row) => (
                <div key={row.id} className={`grid grid-cols-[220px_minmax(0,1fr)_160px] px-4 py-3 gap-3 items-start min-w-[760px] border-t ${dark ? 'border-neutral-800' : 'border-neutral-200'}`}>
                  <div>
                    <p className={`text-sm ${dark ? 'text-neutral-100' : 'text-neutral-900'}`}>{ACTIVITY_TYPE_LABELS[row.type] || row.type || 'Não informado'}</p>
                    <p className={`text-xs mt-1 ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>{formatDatePTBR(row.date)}</p>
                  </div>

                  <div className="min-w-0 space-y-2">
                    <div className={`group relative rounded-md border px-2.5 py-2 min-w-0 ${dark ? 'border-neutral-800/80 bg-neutral-950/60' : 'border-neutral-200 bg-neutral-50'}`}>
                      {shouldShowWrapToggle(row.type === 'comment' ? row.content : row.item_name) && (
                        <button
                          type="button"
                          className={`absolute top-1.5 right-1.5 p-1 rounded opacity-0 group-hover:opacity-80 transition-opacity ${dark ? 'text-neutral-500 hover:text-white hover:bg-neutral-800' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200'}`}
                          title="Quebrar linha nesta célula"
                          onClick={() => toggleCellWrap(`activity_${row.id}`)}
                        >
                          <FiAlignLeft size={12} />
                        </button>
                      )}
                      <p className={`pr-7 text-sm ${dark ? 'text-neutral-200' : 'text-neutral-800'} ${getCellTextClassName(`activity_${row.id}`)}`}>
                        {row.type === 'comment'
                          ? (row.content || 'Comentário sem texto.')
                          : (row.item_name || 'Item de checklist sem descrição.')}
                      </p>
                    </div>

                    <div className={`group relative rounded-md border px-2.5 py-2 min-w-0 ${dark ? 'border-neutral-800/80 bg-neutral-950/60' : 'border-neutral-200 bg-neutral-50'}`}>
                      <button
                        type="button"
                        className={`absolute top-1.5 right-1.5 p-1 rounded opacity-0 group-hover:opacity-80 transition-opacity ${dark ? 'text-neutral-500 hover:text-white hover:bg-neutral-800' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200'}`}
                        title="Quebrar linha nesta célula"
                        onClick={() => toggleCellWrap(`ai_${row.id}`)}
                      >
                        <FiAlignLeft size={12} />
                      </button>
                      <p className={`pr-7 text-sm ${dark ? 'text-neutral-200' : 'text-neutral-800'} ${getCellTextClassName(`ai_${row.id}`)}`}>
                        {row.ai_reason || 'Sem comentário da IA para este item.'}
                      </p>
                    </div>

                    <p className={`text-xs mt-1 whitespace-normal break-words leading-relaxed ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                      {(row.card_name || 'Card sem nome')}
                      {row.collaborator_name ? ` · ${row.collaborator_name}` : ''}
                    </p>
                  </div>

                  <div className="w-[160px] min-w-[160px] max-w-[160px] text-right justify-self-end">
                    <span className="text-sm font-bold text-red-400">{formatPoints(row.points)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

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
              Limpar seleção
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const PointsSettingsModal = ({ settings, onClose, onSave, isSaving, dark }) => {
  const [draft, setDraft] = useState(() => settings.map((item) => ({
    ...item,
    _rowKey: item.id ? `db_${item.id}` : createLocalRowKey(),
  })));
  const [formError, setFormError] = useState('');

  const updatePoints = (index, points) => {
    setFormError('');
    setDraft((previous) => previous.map((item, itemIndex) => (
      itemIndex === index
        ? { ...item, points: Number(points) || 0 }
        : item
    )));
  };

  const updateActionType = (index, value) => {
    setFormError('');
    setDraft((previous) => previous.map((item, itemIndex) => (
      itemIndex === index
        ? { ...item, action_type: value }
        : item
    )));
  };

  const addRow = () => {
    setFormError('');
    setDraft((previous) => ([
      ...previous,
      {
        action_type: '',
        points: 0,
        _rowKey: createLocalRowKey(),
      },
    ]));
  };

  const removeRow = (index) => {
    setFormError('');
    setDraft((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
  };

  const moveRow = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= draft.length) return;

    setFormError('');
    setDraft((previous) => {
      const copy = [...previous];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return copy;
    });
  };

  const handleSaveDraft = () => {
    const normalized = draft
      .map((item) => ({
        action_type: String(item.action_type || '').trim(),
        points: Number(item.points) || 0,
      }))
      .filter((item) => item.action_type.length > 0);

    if (normalized.length === 0) {
      setFormError('Adicione pelo menos uma ação com nome para salvar.');
      return;
    }

    const actionTypeSet = new Set();
    for (const row of normalized) {
      if (actionTypeSet.has(row.action_type)) {
        setFormError('Existem ações duplicadas. Ajuste os nomes antes de salvar.');
        return;
      }

      actionTypeSet.add(row.action_type);
    }

    onSave(normalized);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className={`w-full max-w-2xl max-h-[85vh] rounded-2xl border shadow-2xl flex flex-col ${dark ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-white'}`}>
        <div className={`flex items-center justify-between px-6 py-4 border-b ${dark ? 'border-neutral-800' : 'border-neutral-200'}`}>
          <div>
            <h2 className={`text-lg font-bold ${dark ? 'text-white' : 'text-neutral-900'}`}>Tabela de pontos</h2>
            <p className={`text-xs ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>Defina quantos pontos cada tipo de atividade vale.</p>
          </div>
          <button onClick={onClose} className={`p-2 rounded-lg ${dark ? 'text-neutral-500 hover:text-white hover:bg-neutral-800' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'}`}>
            <FiX size={16} />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto">
          <div className={`rounded-xl overflow-hidden border ${dark ? 'border-neutral-800' : 'border-neutral-200'}`}>
            <div className={`grid grid-cols-[1fr_120px_120px] px-4 py-3 text-xs uppercase tracking-widest font-bold ${dark ? 'bg-neutral-950 text-neutral-500' : 'bg-neutral-50 text-neutral-600'}`}>
              <span>Ação</span>
              <span>Pontos</span>
              <span className="text-right pr-1">Ordem</span>
            </div>
            {draft.map((row, index) => (
              <div key={row._rowKey} className={`grid grid-cols-[1fr_120px_120px] px-4 py-3 border-t items-center gap-2 ${dark ? 'border-neutral-800' : 'border-neutral-200'}`}>
                <input
                  type="text"
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${dark ? 'border-neutral-700 bg-neutral-800 text-neutral-100' : 'border-neutral-300 bg-white text-neutral-900'}`}
                  placeholder="Nome da ação (ex: revisão final)"
                  value={row.action_type}
                  onChange={(event) => updateActionType(index, event.target.value)}
                />
                <input
                  type="number"
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${dark ? 'border-neutral-700 bg-neutral-800 text-neutral-100' : 'border-neutral-300 bg-white text-neutral-900'}`}
                  value={row.points}
                  onChange={(event) => updatePoints(index, event.target.value)}
                />
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => moveRow(index, index - 1)}
                    disabled={index === 0}
                    className={`p-2 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed ${dark ? 'text-neutral-500 hover:text-white hover:bg-neutral-800' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'}`}
                    title="Subir"
                  >
                    <FiChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => moveRow(index, index + 1)}
                    disabled={index === draft.length - 1}
                    className={`p-2 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed ${dark ? 'text-neutral-500 hover:text-white hover:bg-neutral-800' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'}`}
                    title="Descer"
                  >
                    <FiChevronDown size={14} />
                  </button>
                  <button
                    onClick={() => removeRow(index)}
                    className={`p-2 rounded-lg text-neutral-500 hover:text-red-400 ${dark ? 'hover:bg-red-950/40' : 'hover:bg-red-50'}`}
                    title="Remover linha"
                  >
                    <FiX size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={addRow}
            className={`mt-3 px-3 py-2 text-xs rounded-lg border ${dark ? 'border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-800' : 'border-neutral-300 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50'}`}
          >
            + Adicionar linha
          </button>

          {formError && (
            <p className="mt-3 text-sm text-red-400">{formError}</p>
          )}
        </div>

        <div className={`px-6 py-4 border-t flex justify-end gap-2 ${dark ? 'border-neutral-800' : 'border-neutral-200'}`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 text-sm rounded-lg border ${dark ? 'border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-800' : 'border-neutral-300 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50'}`}
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-500 disabled:opacity-60 flex items-center gap-2"
          >
            {isSaving ? <FiLoader size={14} className="animate-spin" /> : <FiSave size={14} />}
            Salvar pontos
          </button>
        </div>
      </div>
    </div>
  );
};

const AuthorizationModal = ({
  password,
  onPasswordChange,
  onClose,
  onConfirm,
  error,
  isSubmitting,
  dark,
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
    onClick={(event) => event.target === event.currentTarget && onClose()}
  >
    <div className={`w-full max-w-md rounded-2xl border shadow-2xl ${dark ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-white'}`}>
      <div className={`flex items-center justify-between px-6 py-4 border-b ${dark ? 'border-neutral-800' : 'border-neutral-200'}`}>
        <div>
          <h2 className={`text-lg font-bold ${dark ? 'text-white' : 'text-neutral-900'}`}>Autorização</h2>
          <p className={`text-xs ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>Informe a senha para liberar o uso da IA.</p>
        </div>
        <button onClick={onClose} className={`p-2 rounded-lg ${dark ? 'text-neutral-500 hover:text-white hover:bg-neutral-800' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'}`}>
          <FiX size={16} />
        </button>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm();
        }}
        className="px-6 py-5"
      >
        <label className={`block text-xs uppercase tracking-widest font-bold mb-2 ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>Senha</label>
        <input
          type="password"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          className={`w-full rounded-lg border px-3 py-2 text-sm ${dark ? 'border-neutral-700 bg-neutral-800 text-neutral-100' : 'border-neutral-300 bg-white text-neutral-900'}`}
          placeholder="Digite a senha"
          autoFocus
        />

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 text-sm rounded-lg border ${dark ? 'border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-800' : 'border-neutral-300 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50'}`}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-500 disabled:opacity-60"
          >
            Continuar
          </button>
        </div>
      </form>
    </div>
  </div>
);

const UpdatePeriodModal = ({
  periodType,
  onPeriodTypeChange,
  customRange,
  onCustomRangeChange,
  range,
  isRangeValid,
  onClose,
  onConfirm,
  isSubmitting,
  dark,
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
    onClick={(event) => event.target === event.currentTarget && onClose()}
  >
    <div className={`w-full max-w-lg rounded-2xl border shadow-2xl ${dark ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-white'}`}>
      <div className={`flex items-center justify-between px-6 py-4 border-b ${dark ? 'border-neutral-800' : 'border-neutral-200'}`}>
        <div>
          <h2 className={`text-lg font-bold ${dark ? 'text-white' : 'text-neutral-900'}`}>Atualizar período</h2>
          <p className={`text-xs ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>Selecione o período que será processado pela IA.</p>
        </div>
        <button onClick={onClose} className={`p-2 rounded-lg ${dark ? 'text-neutral-500 hover:text-white hover:bg-neutral-800' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'}`}>
          <FiX size={16} />
        </button>
      </div>

      <div className="px-6 py-5">
        <label className={`block text-xs uppercase tracking-widest font-bold mb-2 ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>Período</label>
        <select
          value={periodType}
          onChange={(event) => onPeriodTypeChange(event.target.value)}
          className={`h-10 w-full rounded-lg border px-3 text-sm ${dark ? 'border-neutral-700 bg-neutral-800 text-neutral-100' : 'border-neutral-300 bg-white text-neutral-900'}`}
        >
          {PRODUCTIVITY_PERIOD_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        {periodType === PRODUCTIVITY_PERIOD_TYPES.CUSTOM && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className={`block text-xs uppercase tracking-widest font-bold mb-1.5 ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>Data inicial</label>
              <input
                type="date"
                value={customRange.startDate}
                onChange={(event) => onCustomRangeChange('startDate', event.target.value)}
                className={`h-10 w-full rounded-lg border px-3 text-sm ${dark ? 'border-neutral-700 bg-neutral-800 text-neutral-100' : 'border-neutral-300 bg-white text-neutral-900'}`}
              />
            </div>
            <div>
              <label className={`block text-xs uppercase tracking-widest font-bold mb-1.5 ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>Data final</label>
              <input
                type="date"
                value={customRange.endDate}
                onChange={(event) => onCustomRangeChange('endDate', event.target.value)}
                className={`h-10 w-full rounded-lg border px-3 text-sm ${dark ? 'border-neutral-700 bg-neutral-800 text-neutral-100' : 'border-neutral-300 bg-white text-neutral-900'}`}
              />
            </div>
          </div>
        )}

        {isRangeValid ? (
          <p className={`mt-3 text-sm ${dark ? 'text-neutral-300' : 'text-neutral-700'}`}>
            Período selecionado: <span className={dark ? 'text-white' : 'text-neutral-900'}>{formatDatePTBR(range.startDate)} até {formatDatePTBR(range.endDate)}</span>
          </p>
        ) : (
          <p className="mt-3 text-sm text-red-400">Informe uma data inicial e final válidas.</p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className={`px-4 py-2 text-sm rounded-lg border ${dark ? 'border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-800' : 'border-neutral-300 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50'}`}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting || !isRangeValid}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-500 disabled:opacity-60 flex items-center gap-2"
          >
            {isSubmitting ? <FiLoader size={14} className="animate-spin" /> : <FiCheck size={14} />}
            Atualizar
          </button>
        </div>
      </div>
    </div>
  </div>
);

const SummaryTrendChartCard = ({
  title,
  description,
  data,
  collaborators,
  hasData,
  unitLabel,
  dark,
}) => {
  const total = getMetricTotalFromSeries(data, collaborators);
  const activeCollaborators = getActiveCollaboratorCount(data, collaborators);
  const peakBucket = getPeakBucket(data, collaborators);
  const tooltipStyle = getTooltipStyle(dark);
  const summaryChartCardClass = getSummaryChartCardClass(dark);
  const summaryStatCardClass = getSummaryStatCardClass(dark);
  const chartTheme = getChartTheme(dark);

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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className={summaryStatCardClass}>
              <p className="text-xs text-neutral-500">Total no período</p>
              <p className={`text-xl font-bold ${dark ? 'text-white' : 'text-neutral-900'}`}>{total}</p>
            </div>
            <div className={summaryStatCardClass}>
              <p className="text-xs text-neutral-500">Colaboradores ativos</p>
              <p className="text-xl font-bold text-blue-400">{activeCollaborators}</p>
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

  const peakDay = data.reduce((best, row) => {
    const combined = Number(row.completed_count || 0) + Number(row.pending_count || 0);
    if (combined > best.value) {
      return {
        value: combined,
        label: row.tooltip_label || row.date_label || '-',
      };
    }
    return best;
  }, { value: 0, label: '-' });

  return (
    <div className={summaryChartCardClass}>
      <div className="mb-4">
        <h3 className={`text-xs font-bold uppercase tracking-widest ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>Concluídos x pendentes no decorrer dos dias</h3>
        <p className={`text-xs mt-1 ${dark ? 'text-neutral-600' : 'text-neutral-500'}`}>
          Comparativo diário consolidado entre itens concluídos e pendências para o filtro atual.
        </p>
      </div>

      {!hasData ? (
        <div className="h-96 flex items-center justify-center text-center px-6">
          <p className={`text-sm ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>Nenhum dado diário encontrado para esse recorte.</p>
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
                <Bar dataKey="completed_count" name="Concluídos" fill="url(#summary_bar_completed)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="pending_count" name="Pendentes" fill="url(#summary_bar_pending)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className={summaryStatCardClass}>
              <p className="text-xs text-neutral-500">Total concluído</p>
              <p className="text-xl font-bold text-emerald-400">{totals.completed}</p>
            </div>
            <div className={summaryStatCardClass}>
              <p className="text-xs text-neutral-500">Total pendente</p>
              <p className="text-xl font-bold text-amber-400">{totals.pending}</p>
            </div>
            <div className={summaryStatCardClass}>
              <p className="text-xs text-neutral-500">Maior volume diário</p>
              <p className="text-xl font-bold text-blue-400">{peakDay.value}</p>
              <p className="text-[11px] mt-1 text-neutral-500">{peakDay.label}</p>
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
  const [updatePeriodType, setUpdatePeriodType] = useState(PRODUCTIVITY_PERIOD_TYPES.THIS_MONTH);
  const [customRange, setCustomRange] = useState({ startDate: '', endDate: '' });
  const [updateCustomRange, setUpdateCustomRange] = useState({ startDate: '', endDate: '' });

  const [members, setMembers] = useState([]);
  const [settings, setSettings] = useState([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [authorizationPassword, setAuthorizationPassword] = useState('');
  const [authorizationError, setAuthorizationError] = useState('');

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
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [progress, setProgress] = useState(null);

  const selectedRange = useMemo(() => {
    if (periodType === PRODUCTIVITY_PERIOD_TYPES.CUSTOM) {
      if (!isValidDateRange(customRange.startDate, customRange.endDate)) return null;
    }

    return getProductivityPeriodRange(periodType, new Date(), {
      startDate: customRange.startDate,
      endDate: customRange.endDate,
    });
  }, [periodType, customRange.startDate, customRange.endDate]);

  const updateRange = useMemo(() => {
    if (updatePeriodType === PRODUCTIVITY_PERIOD_TYPES.CUSTOM) {
      if (!isValidDateRange(updateCustomRange.startDate, updateCustomRange.endDate)) return null;
    }

    return getProductivityPeriodRange(updatePeriodType, new Date(), {
      startDate: updateCustomRange.startDate,
      endDate: updateCustomRange.endDate,
    });
  }, [updatePeriodType, updateCustomRange.startDate, updateCustomRange.endDate]);

  const isMainRangeValid = Boolean(selectedRange);
  const isUpdateRangeValid = Boolean(updateRange);

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

  const handleUpdatePeriodChange = (newPeriodType) => {
    if (
      newPeriodType === PRODUCTIVITY_PERIOD_TYPES.CUSTOM
      && !isValidDateRange(updateCustomRange.startDate, updateCustomRange.endDate)
    ) {
      const fallback = getProductivityPeriodRange(PRODUCTIVITY_PERIOD_TYPES.THIS_MONTH, new Date());
      setUpdateCustomRange({ startDate: fallback.startISO, endDate: fallback.endISO });
    }

    setUpdatePeriodType(newPeriodType);
  };

  const loadDashboardData = async (range = selectedRange, collaboratorIds = selectedCollaboratorIds) => {
    const [{ dailyData: dailyRows, topActivities: topRows, activityRows: scoredRows }, summaryTrendRows] = await Promise.all([
      productivityService.getProductivityDashboardData({
        startDate: range.startDate,
        endDate: range.endDate,
        selectedCollaboratorIds: collaboratorIds,
        settings,
      }),
      productivityService.getProductivitySummaryData({
        startDate: range.startDate,
        endDate: range.endDate,
        selectedCollaboratorIds: collaboratorIds,
      }),
    ]);

    setDailyData(dailyRows);
    setTopActivities(topRows);
    setActivityRows(scoredRows);
    setSummaryRows(summaryTrendRows);
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoadingPage(true);
      setError(null);

      try {
        const [membersData, settingsData] = await Promise.all([
          productivityService.getProductivityMembers(),
          productivityService.getProductivitySettings(),
        ]);

        setMembers(membersData);
        setSettings(settingsData);

        await loadDashboardData(selectedRange, selectedCollaboratorIds);
      } catch (err) {
        setError(err.message || 'Falha ao carregar dados de produtividade.');
      } finally {
        setIsLoadingPage(false);
      }
    };

    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const refreshByFilters = async () => {
      if (isLoadingPage) return;
      if (!selectedRange) return;
      setError(null);

      try {
        await loadDashboardData(selectedRange, selectedCollaboratorIds);
      } catch (err) {
        setError(err.message || 'Falha ao carregar dados de produtividade no Trello.');
      }
    };

    refreshByFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRange?.startISO, selectedRange?.endISO, selectedCollaboratorIds.join('|'), settings.map((item) => `${item.action_type}:${item.points}`).join('|')]);

  const handleSaveSettings = async (draftSettings) => {
    setIsSavingSettings(true);
    setError(null);

    try {
      const saved = await productivityService.saveProductivitySettings(draftSettings);
      setSettings(saved);
      setIsSettingsOpen(false);
      setSuccess('Tabela de pontos atualizada com sucesso.');
    } catch (err) {
      setError(err.message || 'Não foi possível salvar a tabela de pontos.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const runAnalysis = async (range, label) => {
    setIsAnalyzing(true);
    setError(null);
    setSuccess('');
    setProgress(null);

    try {
      const result = await productivityService.analyzeAndStoreProductivity({
        startDate: range.startDate,
        endDate: range.endDate,
        selectedCollaboratorIds,
        settings,
        onProgress: (progressState) => setProgress(progressState),
      });

      setDailyData(result.dailyData || []);
      setTopActivities(result.topActivities || []);
      setActivityRows(result.activityRows || []);

      setSuccess(
        `${label} concluída: ${result.activitiesProcessed} atividades processadas em ${result.daysProcessed} dias, com ${result.aiCalls} chamadas de IA (até ${result.maxActivitiesPerCall} atividades por chamada). Os dados exibidos foram recalculados a partir do Trello.`
      );
    } catch (err) {
      setError(err.message || 'Falha ao analisar produtividade com IA.');
    } finally {
      setIsAnalyzing(false);
      setProgress(null);
    }
  };

  const handleAnalyzeClick = () => {
    if (!selectedRange) {
      setError('Informe um intervalo de datas válido para analisar.');
      return;
    }

    setAuthorizationPassword('');
    setAuthorizationError('');
    setUpdatePeriodType(periodType);
    setUpdateCustomRange(customRange);
    setIsAuthModalOpen(true);
  };

  const handleAuthorizeAndContinue = () => {
    if (!ANALYSIS_AUTH_PASSWORD) {
      setAuthorizationError('Senha de autorização não configurada. Defina VITE_PRODUCTIVITY_ANALYSIS_PASSWORD.');
      return;
    }

    if (authorizationPassword !== ANALYSIS_AUTH_PASSWORD) {
      setAuthorizationError('Senha inválida.');
      return;
    }

    setIsAuthModalOpen(false);
    setIsUpdateModalOpen(true);
    setAuthorizationPassword('');
    setAuthorizationError('');
  };

  const handleUpdateBySelectedPeriod = async () => {
    if (!updateRange) {
      setError('Informe um intervalo válido para atualizar.');
      return;
    }

    setIsUpdateModalOpen(false);
    await runAnalysis(updateRange, `Atualização do período (${updateRange.label})`);
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
        const dateCompare = String(b.date || '').localeCompare(String(a.date || ''));
        if (dateCompare !== 0) return dateCompare;
        return String(b.id || '').localeCompare(String(a.id || ''));
      });

      setHistoryRows(rows);
    } catch (err) {
      setHistoryError(err.message || 'Não foi possível carregar o histórico deste indicador.');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleDailyChartClick = async (chartEvent) => {
    const date = getDateFromChartEvent(chartEvent);
    if (!date) return;

    await openActivityHistoryModal({
      title: `Histórico do dia ${formatDatePTBR(date)}`,
      filters: { date },
    });
  };

  const handleDailyLineClick = async (linePoint) => {
    await handleDailyChartClick(linePoint);
  };

  const handleCollaboratorChartClick = async (chartEvent) => {
    const payload = getPayloadFromChartEvent(chartEvent);
    if (!payload) return;

    const collaboratorId = payload.collaborator_id === 'unknown' ? null : payload.collaborator_id;
    const collaboratorName = payload.collaborator_name || 'Sem colaborador identificado';

    await openActivityHistoryModal({
      title: `Histórico de ${collaboratorName}`,
      filters: { collaboratorId },
    });
  };

  const handleCollaboratorBarClick = async (barData) => {
    await handleCollaboratorChartClick(barData);
  };

  const handleDistributionChartClick = async (entry) => {
    const payload = entry?.payload || entry;
    const activityType = payload?.name === 'Comentários'
      ? 'comment'
      : payload?.name === 'Checklist'
        ? 'checklist'
        : null;

    if (!activityType) return;

    await openActivityHistoryModal({
      title: `Histórico de ${payload.name}`,
      filters: { activityType },
    });
  };

  const handleEvolutionLineClick = async (collaborator, linePoint) => {
    const date = resolveDateFromEvolutionEvent(linePoint, collaboratorEvolution.lineData);
    if (!date) return;

    const collaboratorId = collaborator.id === 'unknown' ? null : collaborator.id;

    await openActivityHistoryModal({
      title: `Histórico de ${collaborator.name} em ${formatDatePTBR(date)}`,
      filters: {
        collaboratorId,
        date,
      },
    });
  };

  const handleEvolutionChartClick = async (chartEvent) => {
    const date = resolveDateFromEvolutionEvent(chartEvent, collaboratorEvolution.lineData);
    if (!date) return;

    await openActivityHistoryModal({
      title: `Histórico do dia ${formatDatePTBR(date)} (evolução)` ,
      filters: { date },
    });
  };

  const totalByDay = useMemo(() => groupDailyDataByDate(dailyData), [dailyData]);
  const byCollaborator = useMemo(() => groupDataByCollaborator(dailyData), [dailyData]);
  const distributionData = useMemo(() => buildDistributionData(dailyData), [dailyData]);

  const summarySeries = useMemo(() => {
    if (!selectedRange) {
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
      startDate: selectedRange.startDate,
      endDate: selectedRange.endDate,
      granularity: summaryGranularity,
    });
  }, [summaryRows, members, selectedRange, summaryGranularity]);

  const resolvedSummaryGranularityLabel = useMemo(() => (
    PRODUCTIVITY_SUMMARY_GRANULARITY_OPTIONS.find((option) => option.value === summarySeries.resolvedGranularity)?.label || 'Por dia'
  ), [summarySeries.resolvedGranularity]);

  const completedPendingDailyBars = useMemo(() => {
    const rowsByDate = new Map();

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
  }, [summaryRows]);

  const hasCompletedPendingDailyBars = useMemo(
    () => completedPendingDailyBars.some((row) => Number(row.completed_count || 0) > 0 || Number(row.pending_count || 0) > 0),
    [completedPendingDailyBars]
  );

  const collaboratorEvolution = useMemo(
    () => buildCollaboratorEvolution(dailyData, byCollaborator),
    [dailyData, byCollaborator]
  );

  const totalPoints = useMemo(
    () => dailyData.reduce((sum, row) => sum + Number(row.points_total || 0), 0),
    [dailyData]
  );

  const controlsDisabled = isLoadingPage || isAnalyzing;

  return (
    <div className="max-w-[1400px] mx-auto py-6 px-2">
      <header className="mb-6">
        <h1 className={`text-2xl font-bold ${dark ? 'text-white' : 'text-neutral-900'}`}>Análise de produtividade</h1>
        <p className={`text-sm mt-1 ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>
          Avaliação de produtividade por IA com comentários e checklist concluído do Trello.
        </p>
      </header>

      <section className={`${cardClass} mb-6`}>
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_auto] gap-3 items-end">
          <div>
            <label className={`text-[11px] uppercase tracking-widest font-bold block mb-1.5 ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>Período</label>
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
            onClick={() => setIsSettingsOpen(true)}
            className={`h-10 px-4 rounded-lg border text-sm flex items-center justify-center gap-2 ${dark ? 'border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700/70' : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50'}`}
            disabled={controlsDisabled}
          >
            <FiEdit2 size={14} />
            Editar tabela de pontos
          </button>
        </div>

        <div className={`mt-4 flex flex-wrap items-center gap-2 text-xs ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>
          {isMainRangeValid ? (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${dark ? 'border-neutral-700 bg-neutral-800' : 'border-neutral-200 bg-neutral-50'}`}>
              <FiCalendar size={12} />
              {formatDatePTBR(selectedRange.startDate)} até {formatDatePTBR(selectedRange.endDate)}
            </span>
          ) : (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${dark ? 'border-red-800/60 bg-red-950/30 text-red-300' : 'border-red-200 bg-red-50 text-red-700'}`}>
              <FiCalendar size={12} />
              Período personalizado inválido
            </span>
          )}
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${dark ? 'border-neutral-700 bg-neutral-800' : 'border-neutral-200 bg-neutral-50'}`}>
            <FiBarChart2 size={12} />
            Dados calculados a partir da API do Trello
          </span>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${dark ? 'border-neutral-700 bg-neutral-800' : 'border-neutral-200 bg-neutral-50'}`}>
            <FiBarChart2 size={12} />
            Total salvo: {formatPoints(totalPoints)}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={handleAnalyzeClick}
            disabled={controlsDisabled || !isMainRangeValid}
            className="px-4 h-10 rounded-lg bg-red-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-red-500 disabled:opacity-60 flex items-center gap-2"
          >
            {isAnalyzing ? <FiLoader size={14} className="animate-spin" /> : <FiCheck size={14} />}
            Analisar produtividade
          </button>

          <button
            onClick={() => selectedRange && loadDashboardData(selectedRange, selectedCollaboratorIds)}
            disabled={controlsDisabled || !isMainRangeValid}
            className={`px-4 h-10 rounded-lg border text-xs font-bold uppercase tracking-widest disabled:opacity-60 flex items-center gap-2 ${dark ? 'border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700/70' : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50'}`}
          >
            <FiRefreshCw size={14} />
            Recarregar do Trello
          </button>
        </div>

        {progress && (
          <p className={`mt-3 text-xs ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>
            {getAnalysisProgressMessage(progress)}
          </p>
        )}

        {error && (
          <p className="mt-3 text-sm text-red-400">{error}</p>
        )}

        {success && (
          <p className="mt-3 text-sm text-emerald-400">{success}</p>
        )}
      </section>

      {isLoadingPage ? (
        <div className={`py-20 flex items-center justify-center gap-2 ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>
          <FiLoader className="animate-spin" />
          <span>Carregando dados de produtividade...</span>
        </div>
      ) : dailyData.length === 0 ? (
        <div className={`${cardClass} text-center py-16`}>
          <p className={`font-medium ${dark ? 'text-white' : 'text-neutral-900'}`}>Nenhuma atividade encontrada no Trello para o período selecionado.</p>
          <p className={`text-sm mt-2 ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>Ajuste filtros ou clique em “Analisar produtividade” para recalcular a pontuação com IA usando apenas dados do Trello.</p>
        </div>
      ) : (
        <>
          <section className={`${cardClass} mb-5`}>
            <div className="flex flex-col lg:flex-row lg:items-end gap-3 mb-4">
              <div>
                <h2 className={`text-sm font-bold ${dark ? 'text-white' : 'text-neutral-900'}`}>Análise de resumo</h2>
                <p className={`text-xs mt-1 ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>
                  Séries por colaborador para itens concluídos, pendências e comentários. O filtro global de colaboradores é aplicado aqui também.
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
              {summaryGranularity === PRODUCTIVITY_SUMMARY_GRANULARITY.AUTO && (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${dark ? 'border-neutral-700 bg-neutral-800' : 'border-neutral-200 bg-neutral-50'}`}>
                  Ajuste automatico conforme o tamanho do periodo
                </span>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <SummaryCompletedPendingBarChartCard
                data={completedPendingDailyBars}
                hasData={hasCompletedPendingDailyBars}
                dark={dark}
              />

              <SummaryTrendChartCard
                title="Itens concluídos por colaborador"
                description="Contagem de itens de checklist concluídos por colaborador ao longo do tempo." 
                data={summarySeries.completedLineData}
                collaborators={summarySeries.collaborators}
                hasData={summarySeries.hasCompletedData}
                unitLabel="itens"
                dark={dark}
              />

              <SummaryTrendChartCard
                title="Pendências por colaborador"
                description="Itens pendentes são agrupados pela data de vencimento e pelo responsável do item." 
                data={summarySeries.pendingLineData}
                collaborators={summarySeries.collaborators}
                hasData={summarySeries.hasPendingData}
                unitLabel="itens"
                dark={dark}
              />

              <SummaryTrendChartCard
                title="Comentários por colaborador"
                description="Contagem de comentários registrados por colaborador no mesmo recorte temporal." 
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
            <h2 className={`text-sm font-bold mb-4 ${dark ? 'text-white' : 'text-neutral-900'}`}>Pontuação no decorrer dos dias</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={totalByDay} onClick={handleDailyChartClick}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                  <XAxis dataKey="date" tickFormatter={formatDatePTBR} stroke={chartTheme.axis} />
                  <YAxis stroke={chartTheme.axis} />
                  <Tooltip
                    formatter={(value) => formatPoints(value)}
                    labelFormatter={(label) => `Data: ${formatDatePTBR(label)}`}
                    contentStyle={tooltipStyle}
                  />
                  <Line
                    type="monotone"
                    dataKey="points_total"
                    stroke="#ef4444"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#ef4444', strokeWidth: 0, cursor: 'pointer' }}
                    activeDot={{ r: 5, cursor: 'pointer' }}
                    onClick={handleDailyLineClick}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            </section>

            <section className={cardClass}>
            <h2 className={`text-sm font-bold mb-4 ${dark ? 'text-white' : 'text-neutral-900'}`}>Pontuação por colaborador</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCollaborator}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                  <XAxis dataKey="collaborator_name" stroke={chartTheme.axis} />
                  <YAxis stroke={chartTheme.axis} />
                  <Tooltip formatter={(value) => formatPoints(value)} contentStyle={tooltipStyle} />
                  <Bar dataKey="points_total" radius={[8, 8, 0, 0]} cursor="pointer" onClick={handleCollaboratorBarClick}>
                    {byCollaborator.map((item, index) => (
                      <Cell key={item.collaborator_id} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            </section>

            <section className={cardClass}>
            <h2 className={`text-sm font-bold mb-4 ${dark ? 'text-white' : 'text-neutral-900'}`}>Evolução de produtividade por colaborador</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={collaboratorEvolution.lineData} onClick={handleEvolutionChartClick}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                  <XAxis dataKey="date_label" stroke={chartTheme.axis} />
                  <YAxis stroke={chartTheme.axis} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatPoints(value)} />
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
            <h2 className={`text-sm font-bold mb-4 ${dark ? 'text-white' : 'text-neutral-900'}`}>Distribuição de tipos de atividade</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distributionData} dataKey="value" nameKey="name" outerRadius={110} label onClick={handleDistributionChartClick} cursor="pointer">
                    <Cell fill="#3b82f6" />
                    <Cell fill="#f59e0b" />
                  </Pie>
                  <Tooltip formatter={(value) => formatPoints(value)} contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ color: chartTheme.legend }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            </section>
          </div>
        </>
      )}

      <section className={`${cardClass} mt-5`}>
        <h2 className={`text-sm font-bold mb-3 ${dark ? 'text-white' : 'text-neutral-900'}`}>Atividades com maior pontuação</h2>
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
                  <span className="text-xs font-bold text-red-400">{formatPoints(activity.points)}</span>
                </div>
                <p className={`text-xs mt-1 ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>
                  {formatDatePTBR(activity.date)} · {activity.type === 'comment' ? 'Comentário' : 'Checklist'}
                </p>
                {(activity.content || activity.ai_reason) && (
                  <p className={`text-xs mt-1 line-clamp-2 ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    {activity.ai_reason || activity.content}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {isSettingsOpen && (
        <PointsSettingsModal
          settings={settings}
          onClose={() => setIsSettingsOpen(false)}
          onSave={handleSaveSettings}
          isSaving={isSavingSettings}
          dark={dark}
        />
      )}

      {isAuthModalOpen && (
        <AuthorizationModal
          password={authorizationPassword}
          onPasswordChange={setAuthorizationPassword}
          onClose={() => {
            setIsAuthModalOpen(false);
            setAuthorizationPassword('');
            setAuthorizationError('');
          }}
          onConfirm={handleAuthorizeAndContinue}
          error={authorizationError}
          isSubmitting={isAnalyzing}
          dark={dark}
        />
      )}

      {isUpdateModalOpen && (
        <UpdatePeriodModal
          periodType={updatePeriodType}
          onPeriodTypeChange={handleUpdatePeriodChange}
          customRange={updateCustomRange}
          onCustomRangeChange={(field, value) => setUpdateCustomRange((previous) => ({ ...previous, [field]: value }))}
          range={updateRange}
          isRangeValid={isUpdateRangeValid}
          onClose={() => setIsUpdateModalOpen(false)}
          onConfirm={handleUpdateBySelectedPeriod}
          isSubmitting={isAnalyzing}
          dark={dark}
        />
      )}

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
