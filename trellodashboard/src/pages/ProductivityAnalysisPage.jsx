import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiAlignLeft,
  FiBarChart2,
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiChevronUp,
  FiDatabase,
  FiEdit2,
  FiLoader,
  FiRefreshCw,
  FiSave,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import {
  PRODUCTIVITY_PERIOD_OPTIONS,
  PRODUCTIVITY_PERIOD_TYPES,
  formatDatePTBR,
  getProductivityPeriodRange,
} from '../utils/productivityPeriodUtils';

const CHART_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];
const ANALYSIS_AUTH_PASSWORD = import.meta.env.VITE_PRODUCTIVITY_ANALYSIS_PASSWORD;

const tooltipStyle = {
  backgroundColor: '#171717',
  border: '1px solid #404040',
  borderRadius: '8px',
  color: '#f5f5f5',
};

const cardClass = 'rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5';

const formatPoints = (value) => `${Number(value || 0).toFixed(0)} pts`;

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="w-full max-w-5xl max-h-[88vh] rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div>
            <h2 className="text-lg font-bold text-white">{title}</h2>
            <p className="text-xs text-neutral-500">Histórico das atividades usadas no cálculo da IA para esse indicador.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800">
            <FiX size={16} />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto">
          {isLoading ? (
            <div className="py-16 flex items-center justify-center gap-2 text-neutral-400">
              <FiLoader className="animate-spin" />
              <span>Carregando histórico do indicador...</span>
            </div>
          ) : error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-neutral-400">Nenhuma atividade encontrada para este recorte.</p>
          ) : (
              <div className="rounded-xl overflow-hidden border border-neutral-800 overflow-x-auto">
                <div className="grid grid-cols-[220px_minmax(0,1fr)_160px] bg-neutral-950 px-4 py-3 text-xs uppercase tracking-widest font-bold text-neutral-500 min-w-[760px]">
                <button onClick={() => toggleSort('type')} className="flex items-center gap-1 hover:text-white text-left">
                  Tipo de atividade {renderSortIndicator('type')}
                </button>
                <button onClick={() => toggleSort('ai_reason')} className="flex items-center gap-1 hover:text-white text-left">
                    Atividade e comentário da IA {renderSortIndicator('ai_reason')}
                </button>
                  <button onClick={() => toggleSort('points')} className="w-[160px] min-w-[160px] max-w-[160px] justify-self-end flex items-center justify-end gap-1 hover:text-white text-right">
                  Pontuação atribuída {renderSortIndicator('points')}
                </button>
              </div>

              {sortedRows.map((row) => (
                  <div key={row.id} className="grid grid-cols-[220px_minmax(0,1fr)_160px] px-4 py-3 border-t border-neutral-800 gap-3 items-start min-w-[760px]">
                  <div>
                    <p className="text-sm text-neutral-100">{ACTIVITY_TYPE_LABELS[row.type] || row.type || 'Não informado'}</p>
                    <p className="text-xs text-neutral-500 mt-1">{formatDatePTBR(row.date)}</p>
                  </div>

                    <div className="min-w-0 space-y-2">
                      <div className="group relative rounded-md border border-neutral-800/80 bg-neutral-950/60 px-2.5 py-2 min-w-0">
                        {shouldShowWrapToggle(row.type === 'comment' ? row.content : row.item_name) && (
                          <button
                            type="button"
                            className="absolute top-1.5 right-1.5 p-1 rounded text-neutral-500 hover:text-white hover:bg-neutral-800 opacity-0 group-hover:opacity-80 transition-opacity"
                            title="Quebrar linha nesta célula"
                            onClick={() => toggleCellWrap(`activity_${row.id}`)}
                          >
                            <FiAlignLeft size={12} />
                          </button>
                        )}
                        <p className={`pr-7 text-sm text-neutral-200 ${getCellTextClassName(`activity_${row.id}`)}`}>
                          {row.type === 'comment'
                            ? (row.content || 'Comentário sem texto.')
                            : (row.item_name || 'Item de checklist sem descrição.')}
                        </p>
                      </div>

                      <div className="group relative rounded-md border border-neutral-800/80 bg-neutral-950/60 px-2.5 py-2 min-w-0">
                        <button
                          type="button"
                          className="absolute top-1.5 right-1.5 p-1 rounded text-neutral-500 hover:text-white hover:bg-neutral-800 opacity-0 group-hover:opacity-80 transition-opacity"
                          title="Quebrar linha nesta célula"
                          onClick={() => toggleCellWrap(`ai_${row.id}`)}
                        >
                          <FiAlignLeft size={12} />
                        </button>
                        <p className={`pr-7 text-sm text-neutral-200 ${getCellTextClassName(`ai_${row.id}`)}`}>
                          {row.ai_reason || 'Sem comentário da IA para este item.'}
                        </p>
                      </div>

                      <p className="text-xs text-neutral-500 mt-1 whitespace-normal break-words leading-relaxed">
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

const MemberFilter = ({ members, selectedIds, onChange }) => {
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
        className="h-10 min-w-[240px] px-3 rounded-lg border border-neutral-700 bg-neutral-800 text-sm text-neutral-200 flex items-center justify-between gap-2 hover:bg-neutral-700/70"
      >
        <span className="flex items-center gap-2 truncate">
          <FiUsers size={14} />
          <span className="truncate">{label}</span>
        </span>
        <FiChevronDown size={14} />
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 z-40 w-full rounded-lg border border-neutral-700 bg-neutral-900 shadow-xl">
          <div className="max-h-64 overflow-y-auto py-1">
            {members.map((member) => (
              <label key={member.id} className="px-3 py-2 flex items-center gap-2 text-sm text-neutral-200 hover:bg-neutral-800 cursor-pointer">
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
              className="w-full border-t border-neutral-700 px-3 py-2 text-xs uppercase tracking-widest text-neutral-400 hover:text-white"
            >
              Limpar seleção
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const PointsSettingsModal = ({ settings, onClose, onSave, isSaving }) => {
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
      <div className="w-full max-w-2xl max-h-[85vh] rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div>
            <h2 className="text-lg font-bold text-white">Tabela de pontos</h2>
            <p className="text-xs text-neutral-500">Defina quantos pontos cada tipo de atividade vale.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800">
            <FiX size={16} />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto">
          <div className="rounded-xl overflow-hidden border border-neutral-800">
            <div className="grid grid-cols-[1fr_120px_120px] bg-neutral-950 px-4 py-3 text-xs uppercase tracking-widest font-bold text-neutral-500">
              <span>Ação</span>
              <span>Pontos</span>
              <span className="text-right pr-1">Ordem</span>
            </div>
            {draft.map((row, index) => (
              <div key={row._rowKey} className="grid grid-cols-[1fr_120px_120px] px-4 py-3 border-t border-neutral-800 items-center gap-2">
                <input
                  type="text"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100"
                  placeholder="Nome da ação (ex: revisão final)"
                  value={row.action_type}
                  onChange={(event) => updateActionType(index, event.target.value)}
                />
                <input
                  type="number"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100"
                  value={row.points}
                  onChange={(event) => updatePoints(index, event.target.value)}
                />
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => moveRow(index, index - 1)}
                    disabled={index === 0}
                    className="p-2 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Subir"
                  >
                    <FiChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => moveRow(index, index + 1)}
                    disabled={index === draft.length - 1}
                    className="p-2 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Descer"
                  >
                    <FiChevronDown size={14} />
                  </button>
                  <button
                    onClick={() => removeRow(index)}
                    className="p-2 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-950/40"
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
            className="mt-3 px-3 py-2 text-xs rounded-lg border border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-800"
          >
            + Adicionar linha
          </button>

          {formError && (
            <p className="mt-3 text-sm text-red-400">{formError}</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-neutral-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-800"
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
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
    onClick={(event) => event.target === event.currentTarget && onClose()}
  >
    <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl">
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
        <div>
          <h2 className="text-lg font-bold text-white">Autorização</h2>
          <p className="text-xs text-neutral-500">Informe a senha para liberar o uso da IA.</p>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800">
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
        <label className="block text-xs uppercase tracking-widest font-bold text-neutral-500 mb-2">Senha</label>
        <input
          type="password"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100"
          placeholder="Digite a senha"
          autoFocus
        />

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-800"
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
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
    onClick={(event) => event.target === event.currentTarget && onClose()}
  >
    <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl">
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
        <div>
          <h2 className="text-lg font-bold text-white">Atualizar período</h2>
          <p className="text-xs text-neutral-500">Selecione o período que será processado pela IA.</p>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800">
          <FiX size={16} />
        </button>
      </div>

      <div className="px-6 py-5">
        <label className="block text-xs uppercase tracking-widest font-bold text-neutral-500 mb-2">Período</label>
        <select
          value={periodType}
          onChange={(event) => onPeriodTypeChange(event.target.value)}
          className="h-10 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 text-sm text-neutral-100"
        >
          {PRODUCTIVITY_PERIOD_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        {periodType === PRODUCTIVITY_PERIOD_TYPES.CUSTOM && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-xs uppercase tracking-widest font-bold text-neutral-500 mb-1.5">Data inicial</label>
              <input
                type="date"
                value={customRange.startDate}
                onChange={(event) => onCustomRangeChange('startDate', event.target.value)}
                className="h-10 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 text-sm text-neutral-100"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest font-bold text-neutral-500 mb-1.5">Data final</label>
              <input
                type="date"
                value={customRange.endDate}
                onChange={(event) => onCustomRangeChange('endDate', event.target.value)}
                className="h-10 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 text-sm text-neutral-100"
              />
            </div>
          </div>
        )}

        {isRangeValid ? (
          <p className="mt-3 text-sm text-neutral-300">
            Período selecionado: <span className="text-white">{formatDatePTBR(range.startDate)} até {formatDatePTBR(range.endDate)}</span>
          </p>
        ) : (
          <p className="mt-3 text-sm text-red-400">Informe uma data inicial e final válidas.</p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-800"
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

const ProductivityAnalysisPage = () => {
  const [periodType, setPeriodType] = useState(PRODUCTIVITY_PERIOD_TYPES.THIS_MONTH);
  const [selectedCollaboratorIds, setSelectedCollaboratorIds] = useState([]);
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
    const { dailyData: dailyRows, topActivities: topRows } = await productivityService.getProductivityDashboardData({
      startDate: range.startDate,
      endDate: range.endDate,
      selectedCollaboratorIds: collaboratorIds,
    });

    setDailyData(dailyRows);
    setTopActivities(topRows);
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
        setError(err.message || 'Falha ao carregar dados salvos no banco.');
      }
    };

    refreshByFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRange?.startISO, selectedRange?.endISO, selectedCollaboratorIds.join('|')]);

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
        onChunkStored: async () => {
          await loadDashboardData(range, selectedCollaboratorIds);
        },
      });

      await loadDashboardData(range, selectedCollaboratorIds);

      setSuccess(
        `${label} concluída: ${result.activitiesProcessed} atividades processadas em ${result.daysProcessed} dias, com ${result.aiCalls} chamadas de IA (até ${result.maxActivitiesPerCall} atividades por chamada).`
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
    if (!selectedRange) return;

    setHistoryModalTitle(title);
    setHistoryRows([]);
    setHistoryError('');
    setIsHistoryModalOpen(true);
    setIsLoadingHistory(true);

    try {
      const rows = await productivityService.getProductivityActivityHistory({
        startDate: selectedRange.startDate,
        endDate: selectedRange.endDate,
        selectedCollaboratorIds,
        ...filters,
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
        <h1 className="text-2xl font-bold text-white">Análise de produtividade</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Avaliação de produtividade por IA com comentários e checklist concluído do Trello.
        </p>
      </header>

      <section className={`${cardClass} mb-6`}>
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_auto] gap-3 items-end">
          <div>
            <label className="text-[11px] uppercase tracking-widest font-bold text-neutral-500 block mb-1.5">Período</label>
            <select
              value={periodType}
              onChange={(event) => handleMainPeriodChange(event.target.value)}
              className="h-10 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 text-sm text-neutral-100"
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
                  className="h-10 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 text-sm text-neutral-100"
                  disabled={controlsDisabled}
                />
                <input
                  type="date"
                  value={customRange.endDate}
                  onChange={(event) => setCustomRange((previous) => ({ ...previous, endDate: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 text-sm text-neutral-100"
                  disabled={controlsDisabled}
                />
              </div>
            )}
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-widest font-bold text-neutral-500 block mb-1.5">Colaboradores</label>
            <MemberFilter
              members={members}
              selectedIds={selectedCollaboratorIds}
              onChange={setSelectedCollaboratorIds}
            />
          </div>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="h-10 px-4 rounded-lg border border-neutral-700 bg-neutral-800 text-sm text-neutral-200 hover:bg-neutral-700/70 flex items-center justify-center gap-2"
            disabled={controlsDisabled}
          >
            <FiEdit2 size={14} />
            Editar tabela de pontos
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
          {isMainRangeValid ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-neutral-700 bg-neutral-800">
              <FiCalendar size={12} />
              {formatDatePTBR(selectedRange.startDate)} até {formatDatePTBR(selectedRange.endDate)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-red-800/60 bg-red-950/30 text-red-300">
              <FiCalendar size={12} />
              Período personalizado inválido
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-neutral-700 bg-neutral-800">
            <FiDatabase size={12} />
            Dados exibidos sempre a partir do Supabase
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-neutral-700 bg-neutral-800">
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
            className="px-4 h-10 rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-200 text-xs font-bold uppercase tracking-widest hover:bg-neutral-700/70 disabled:opacity-60 flex items-center gap-2"
          >
            <FiRefreshCw size={14} />
            Recarregar do banco
          </button>
        </div>

        {progress && (
          <p className="mt-3 text-xs text-neutral-400">
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
        <div className="py-20 flex items-center justify-center gap-2 text-neutral-400">
          <FiLoader className="animate-spin" />
          <span>Carregando dados de produtividade...</span>
        </div>
      ) : dailyData.length === 0 ? (
        <div className={`${cardClass} text-center py-16`}>
          <p className="text-white font-medium">Nenhuma análise salva para o período selecionado.</p>
          <p className="text-sm text-neutral-500 mt-2">Clique em “Analisar produtividade” para gerar e persistir os dados no Supabase.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <section className={cardClass}>
            <h2 className="text-sm font-bold text-white mb-4">Pontuação no decorrer dos dias</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={totalByDay} onClick={handleDailyChartClick}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis dataKey="date" tickFormatter={formatDatePTBR} stroke="#a3a3a3" />
                  <YAxis stroke="#a3a3a3" />
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
            <h2 className="text-sm font-bold text-white mb-4">Pontuação por colaborador</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCollaborator}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis dataKey="collaborator_name" stroke="#a3a3a3" />
                  <YAxis stroke="#a3a3a3" />
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
            <h2 className="text-sm font-bold text-white mb-4">Evolução de produtividade por colaborador</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={collaboratorEvolution.lineData} onClick={handleEvolutionChartClick}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis dataKey="date_label" stroke="#a3a3a3" />
                  <YAxis stroke="#a3a3a3" />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatPoints(value)} />
                  <Legend />
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
            <h2 className="text-sm font-bold text-white mb-4">Distribuição de tipos de atividade</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distributionData} dataKey="value" nameKey="name" outerRadius={110} label onClick={handleDistributionChartClick} cursor="pointer">
                    <Cell fill="#3b82f6" />
                    <Cell fill="#f59e0b" />
                  </Pie>
                  <Tooltip formatter={(value) => formatPoints(value)} contentStyle={tooltipStyle} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      )}

      <section className={`${cardClass} mt-5`}>
        <h2 className="text-sm font-bold text-white mb-3">Atividades com maior pontuação</h2>
        {topActivities.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhuma atividade registrada para o filtro atual.</p>
        ) : (
          <div className="space-y-2">
            {topActivities.map((activity) => (
              <div key={activity.id} className="rounded-lg border border-neutral-800 bg-neutral-950/70 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-neutral-100 truncate">
                    {activity.card_name || 'Card sem nome'}
                    {activity.item_name ? ` · ${activity.item_name}` : ''}
                  </p>
                  <span className="text-xs font-bold text-red-400">{formatPoints(activity.points)}</span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  {formatDatePTBR(activity.date)} · {activity.type === 'comment' ? 'Comentário' : 'Checklist'}
                </p>
                {(activity.content || activity.ai_reason) && (
                  <p className="text-xs text-neutral-400 mt-1 line-clamp-2">
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
        />
      )}
    </div>
  );
};

export default ProductivityAnalysisPage;
