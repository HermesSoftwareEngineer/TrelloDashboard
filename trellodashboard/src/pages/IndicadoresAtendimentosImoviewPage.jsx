import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FiActivity,
  FiCalendar,
  FiClock,
  FiFilter,
  FiRefreshCw,
  FiShield,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import MD5 from 'crypto-js/md5';
import {
  Area,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import imoviewService from '../services/imoviewService';
import { parseImoviewDate } from '../utils/imoviewLocacaoProcessor';

const PERIOD_OPTIONS = [
  { value: 'this_month', label: 'Este mês' },
  { value: 'last_month', label: 'Mês anterior' },
  { value: 'this_week', label: 'Esta semana' },
  { value: 'last_week', label: 'Semana anterior' },
  { value: 'this_year', label: 'Este ano' },
  { value: 'last_year', label: 'Ano anterior' },
  { value: 'custom', label: 'Personalizado' },
];

const GRANULARITY_OPTIONS = [
  { value: 'day', label: 'Dia' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mês' },
  { value: 'quarter', label: 'Trimestre' },
  { value: 'year', label: 'Ano' },
];

const LINE_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'];
const IMOVIEW_APP_EMAIL_STORAGE_KEY = 'imoview_app_email';
const IMOVIEW_ATENDIMENTOS_CACHE_STORAGE_KEY = 'imoview_atendimentos_dashboard_cache_v1';
const DEFAULT_LOAD_WINDOW_MONTHS = Number.parseInt(String(import.meta.env.VITE_IMOVIEW_DEFAULT_LOAD_MONTHS || '3'), 10);

const readLocalStorageJson = (key) => {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const writeLocalStorageJson = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

const clampLoadWindowMonths = (value) => {
  const parsed = Number.parseInt(String(value || '').replace(/[^\d]/g, ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 3;
  return Math.min(Math.max(parsed, 1), 24);
};

const toGradientId = (value) => String(value || 'serie').replace(/[^a-zA-Z0-9_-]/g, '_');

const getDefaultLoadWindowRange = (months = 3) => {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  startDate.setHours(0, 0, 0, 0);

  return { startDate, endDate };
};

const dedupeAtendimentos = (items = []) => {
  const map = new Map();

  items.forEach((item, index) => {
    const key = String(item?.codigo || item?.id || `${item?.datahorainclusao || item?.datahoraentradalead || 'row'}-${index}`);
    if (!map.has(key)) {
      map.set(key, item);
    }
  });

  return Array.from(map.values());
};

const normalizeText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toUpperCase();

const pad = (value) => String(value).padStart(2, '0');

const formatDateToInput = (date) => {
  if (!date) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const formatDateToImoview = (date) => {
  if (!date) return '';
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

const formatDateTimePTBR = (date) => {
  if (!date) return '-';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDateTimeCell = (date) => {
  if (!date) return '-';

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStartOfWeek = (baseDate) => {
  const date = new Date(baseDate);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

const getEndOfWeek = (baseDate) => {
  const date = getStartOfWeek(baseDate);
  date.setDate(date.getDate() + 6);
  date.setHours(23, 59, 59, 999);
  return date;
};

const getPeriodRange = (periodType, customStartDate, customEndDate) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let startDate;
  let endDate;

  switch (periodType) {
    case 'this_month': {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    }
    case 'last_month': {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    }
    case 'this_week': {
      startDate = getStartOfWeek(now);
      endDate = getEndOfWeek(now);
      break;
    }
    case 'last_week': {
      const previousWeekReference = new Date(now);
      previousWeekReference.setDate(now.getDate() - 7);
      startDate = getStartOfWeek(previousWeekReference);
      endDate = getEndOfWeek(previousWeekReference);
      break;
    }
    case 'this_year': {
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
    }
    case 'last_year': {
      startDate = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      break;
    }
    case 'custom': {
      if (!customStartDate || !customEndDate) {
        return { startDate: null, endDate: null, isValid: false };
      }

      startDate = new Date(`${customStartDate}T00:00:00`);
      endDate = new Date(`${customEndDate}T23:59:59`);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) {
        return { startDate: null, endDate: null, isValid: false };
      }
      break;
    }
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  return { startDate, endDate, isValid: true };
};

const getRangeDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  return Math.max(Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1, 1);
};

const resolveAutoGranularity = (startDate, endDate) => {
  const rangeDays = getRangeDays(startDate, endDate);
  if (rangeDays < 32) return 'day';
  if (rangeDays <= 93) return 'week';
  if (rangeDays <= 366) return 'month';
  return 'year';
};

const startOfBucket = (date, granularity) => {
  const current = new Date(date);

  if (granularity === 'day') {
    current.setHours(0, 0, 0, 0);
    return current;
  }

  if (granularity === 'week') {
    return getStartOfWeek(current);
  }

  if (granularity === 'month') {
    return new Date(current.getFullYear(), current.getMonth(), 1, 0, 0, 0, 0);
  }

  if (granularity === 'quarter') {
    const quarterStartMonth = Math.floor(current.getMonth() / 3) * 3;
    return new Date(current.getFullYear(), quarterStartMonth, 1, 0, 0, 0, 0);
  }

  return new Date(current.getFullYear(), 0, 1, 0, 0, 0, 0);
};

const getBucketKey = (date, granularity) => {
  const start = startOfBucket(date, granularity);

  if (granularity === 'day' || granularity === 'week') {
    return `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
  }

  if (granularity === 'month') {
    return `${start.getFullYear()}-${pad(start.getMonth() + 1)}`;
  }

  if (granularity === 'quarter') {
    return `${start.getFullYear()}-T${Math.floor(start.getMonth() / 3) + 1}`;
  }

  return `${start.getFullYear()}`;
};

const getBucketLabel = (bucketDate, granularity) => {
  if (granularity === 'day') {
    return bucketDate.toLocaleDateString('pt-BR');
  }

  if (granularity === 'week') {
    const end = new Date(bucketDate);
    end.setDate(end.getDate() + 6);
    return `${bucketDate.toLocaleDateString('pt-BR')} - ${end.toLocaleDateString('pt-BR')}`;
  }

  if (granularity === 'month') {
    return bucketDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  }

  if (granularity === 'quarter') {
    return `${Math.floor(bucketDate.getMonth() / 3) + 1}º tri/${bucketDate.getFullYear()}`;
  }

  return String(bucketDate.getFullYear());
};

const isWithinRange = (date, startDate, endDate) => {
  if (!date || !startDate || !endDate) return false;
  return date >= startDate && date <= endDate;
};

const toSafeCode = (value) => {
  const parsed = Number.parseInt(String(value ?? '').replace(/\D/g, ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const normalizeInteracoes = (interacoes) => {
  if (Array.isArray(interacoes)) return interacoes;
  if (Array.isArray(interacoes?.lista)) return interacoes.lista;

  if (interacoes && typeof interacoes === 'object' && (
    interacoes.datahora !== undefined
    || interacoes.dataHora !== undefined
    || interacoes.usuario !== undefined
  )) {
    return [interacoes];
  }

  return [];
};

const getCorretorCodeFromAtendimento = (atendimento) => (
  toSafeCode(atendimento?.codigoCorretor)
  || toSafeCode(atendimento?.corretorcodigo)
  || toSafeCode(atendimento?.codigocorretor)
  || null
);

const getCardClass = (dark) => `rounded-2xl border p-5 ${
  dark ? 'border-neutral-800 bg-neutral-900/60' : 'border-neutral-200 bg-white shadow-sm'
}`;

const CorretorFilter = ({ options, selectedValues, onChange, dark }) => {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);

  useEffect(() => {
    const handler = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedSet = useMemo(() => new Set(selectedValues || []), [selectedValues]);

  const toggleValue = (value) => {
    if (selectedSet.has(value)) {
      onChange((selectedValues || []).filter((item) => item !== value));
      return;
    }

    onChange([...(selectedValues || []), value]);
  };

  const label = (selectedValues || []).length === 0
    ? 'Todos os corretores'
    : (selectedValues || []).length === 1
      ? options.find((item) => item.value === selectedValues[0])?.label || '1 corretor'
      : `${(selectedValues || []).length} corretores`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border transition-colors w-full ${
          dark
            ? 'border-neutral-700 bg-neutral-800/60 text-neutral-300 hover:bg-neutral-700/60 hover:text-white'
            : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 hover:text-black'
        }`}
      >
        <FiUsers size={14} />
        <span className="max-w-[190px] truncate text-left">{label}</span>
        {(selectedValues || []).length > 0 && (
          <span
            role="button"
            tabIndex={0}
            onClick={(event) => {
              event.stopPropagation();
              onChange([]);
            }}
            className={`ml-1 ${dark ? 'text-neutral-500 hover:text-white' : 'text-neutral-500 hover:text-black'}`}
          >
            <FiX size={12} />
          </span>
        )}
      </button>

      {open && (
        <div className={`absolute left-0 top-full mt-1 z-50 rounded-lg shadow-xl min-w-[240px] max-w-[280px] overflow-hidden border ${
          dark ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-neutral-300'
        }`}>
          <div className="max-h-64 overflow-y-auto">
            {options.length === 0 ? (
              <div className={`px-3 py-2 text-sm ${dark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                Nenhum corretor disponível.
              </div>
            ) : (
              options.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center gap-2.5 px-3 py-2.5 text-sm cursor-pointer select-none ${
                    dark ? 'text-neutral-300 hover:bg-neutral-800' : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="accent-red-500"
                    checked={selectedSet.has(option.value)}
                    onChange={() => toggleValue(option.value)}
                  />
                  <span className="truncate">{option.label}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const DedupedChartTooltip = ({ active, payload, label, dark }) => {
  if (!active || !Array.isArray(payload) || payload.length === 0) {
    return null;
  }

  const seen = new Set();
  const rows = payload.filter((entry) => {
    const key = String(entry?.name || entry?.dataKey || '').trim();
    if (!key || seen.has(key)) return false;

    const numericValue = Number(entry?.value);
    if (!Number.isFinite(numericValue)) return false;

    seen.add(key);
    return true;
  });

  if (rows.length === 0) {
    return null;
  }

  return (
    <div
      className="rounded-lg border px-3 py-2 shadow-xl"
      style={{
        backgroundColor: dark ? '#171717' : '#ffffff',
        borderColor: dark ? '#272727' : '#e5e7eb',
      }}
    >
      <p className={`text-xs font-semibold mb-1 ${dark ? 'text-neutral-200' : 'text-neutral-800'}`}>{label}</p>

      <div className="space-y-1">
        {rows.map((entry) => (
          <div key={String(entry?.name || entry?.dataKey)} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-2 min-w-0">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: entry?.color || '#ef4444' }}
              />
              <span className={`truncate ${dark ? 'text-neutral-200' : 'text-neutral-800'}`}>{entry?.name || entry?.dataKey}</span>
            </span>
            <span className={dark ? 'text-neutral-300' : 'text-neutral-700'}>{Number(entry?.value || 0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const resolveChartEventPayload = (chartEvent) => {
  if (!chartEvent) return null;
  if (chartEvent?.payload && typeof chartEvent.payload === 'object') return chartEvent.payload;
  if (chartEvent?.activePayload?.[0]?.payload) return chartEvent.activePayload[0].payload;
  if (chartEvent?.tooltipPayload?.[0]?.payload) return chartEvent.tooltipPayload[0].payload;
  return chartEvent;
};

const resolveBucketKeyFromChartEvent = (chartEvent, timeline = []) => {
  const payload = resolveChartEventPayload(chartEvent);
  if (payload?.bucketKey) return payload.bucketKey;

  const label = payload?.periodLabel || chartEvent?.activeLabel || chartEvent?.label;
  if (!label) return null;

  const matched = (timeline || []).find((row) => row?.periodLabel === label);
  return matched?.bucketKey || null;
};

const resolvePeriodLabelFromChartEvent = (chartEvent, timeline = []) => {
  const payload = resolveChartEventPayload(chartEvent);
  if (payload?.periodLabel) return payload.periodLabel;

  const label = chartEvent?.activeLabel || chartEvent?.label;
  if (!label) return '-';

  const matched = (timeline || []).find((row) => row?.periodLabel === label);
  return matched?.periodLabel || String(label);
};

const resolvePrimarySeriesFromChartEvent = (chartEvent, allowedDataKeys = []) => {
  const activePayload = Array.isArray(chartEvent?.activePayload) ? chartEvent.activePayload : [];
  if (activePayload.length === 0) return null;

  const allowedSet = new Set(allowedDataKeys);
  const candidates = activePayload
    .filter((item) => {
      const dataKey = String(item?.dataKey || item?.name || '');
      if (!dataKey) return false;
      if (allowedSet.size > 0 && !allowedSet.has(dataKey)) return false;
      return Number(item?.value || 0) > 0;
    })
    .sort((a, b) => Number(b?.value || 0) - Number(a?.value || 0));

  if (candidates.length === 0) return null;
  return String(candidates[0]?.dataKey || candidates[0]?.name || '');
};

const ChartDrilldownModal = ({ dark, modalState, onClose }) => {
  if (!modalState?.isOpen) return null;

  const rows = Array.isArray(modalState?.rows) ? modalState.rows : [];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.72)' }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={`w-full max-w-6xl max-h-[85vh] rounded-2xl border overflow-hidden ${dark ? 'bg-neutral-900 border-neutral-700 text-neutral-100' : 'bg-white border-neutral-200 text-neutral-900'}`}>
        <div className={`px-4 py-3 border-b flex items-start justify-between gap-3 ${dark ? 'border-neutral-700' : 'border-neutral-200'}`}>
          <div>
            <h3 className="text-base font-semibold">{modalState.title}</h3>
            <p className={`text-xs mt-1 ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>{modalState.subtitle}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-lg border transition-colors ${dark ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-300' : 'border-neutral-300 hover:bg-neutral-100 text-neutral-700'}`}
          >
            <FiX size={14} />
          </button>
        </div>

        <div className="overflow-auto max-h-[calc(85vh-64px)]">
          {rows.length === 0 ? (
            <div className={`px-4 py-6 text-sm ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>
              Nenhum registro encontrado para este ponto.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className={dark ? 'bg-neutral-950/60 text-neutral-300' : 'bg-neutral-50 text-neutral-700'}>
                {modalState.type === 'interacoes' ? (
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">Data/Hora</th>
                    <th className="text-left px-3 py-2 font-semibold">Corretor</th>
                    <th className="text-left px-3 py-2 font-semibold">Usuário</th>
                    <th className="text-left px-3 py-2 font-semibold">Tipo</th>
                    <th className="text-left px-3 py-2 font-semibold">Título</th>
                    <th className="text-left px-3 py-2 font-semibold">Atendimento</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">Data</th>
                    <th className="text-left px-3 py-2 font-semibold">Corretor</th>
                    <th className="text-left px-3 py-2 font-semibold">Situação</th>
                    <th className="text-left px-3 py-2 font-semibold">Tipo</th>
                    <th className="text-left px-3 py-2 font-semibold">Atendimento</th>
                  </tr>
                )}
              </thead>

              <tbody>
                {rows.map((row, index) => (
                  modalState.type === 'interacoes' ? (
                    <tr key={`${row?.codigoAtendimento || 'row'}-${row?.dateISO || index}`} className={dark ? 'border-t border-neutral-800' : 'border-t border-neutral-200'}>
                      <td className="px-3 py-2 whitespace-nowrap">{row?.dateLabel || '-'}</td>
                      <td className="px-3 py-2">{row?.corretor || '-'}</td>
                      <td className="px-3 py-2">{row?.usuario || '-'}</td>
                      <td className="px-3 py-2">{row?.tipo || '-'}</td>
                      <td className="px-3 py-2 max-w-[360px] truncate">{row?.titulo || row?.texto || '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">#{row?.codigoAtendimento || '-'}</td>
                    </tr>
                  ) : (
                    <tr key={`${row?.codigoAtendimento || 'row'}-${row?.dateISO || index}`} className={dark ? 'border-t border-neutral-800' : 'border-t border-neutral-200'}>
                      <td className="px-3 py-2 whitespace-nowrap">{row?.dateLabel || '-'}</td>
                      <td className="px-3 py-2">{row?.corretor || '-'}</td>
                      <td className="px-3 py-2">{row?.situacao || '-'}</td>
                      <td className="px-3 py-2">{row?.tipoRegistro || '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">#{row?.codigoAtendimento || '-'}</td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

const LoadWindowModal = ({
  dark,
  isOpen,
  monthsInput,
  onMonthsInputChange,
  onApply,
  isLoading,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.72)' }}>
      <div className={`w-full max-w-lg rounded-2xl border p-6 ${dark ? 'bg-neutral-900 border-neutral-700 text-neutral-100' : 'bg-white border-neutral-200 text-neutral-900'}`}>
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 rounded-lg p-2 ${dark ? 'bg-neutral-800' : 'bg-neutral-100'}`}>
            <FiClock size={16} />
          </div>

          <div>
            <h2 className="text-lg font-semibold">Definir janela de carregamento</h2>
            <p className={`text-sm mt-1 ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>
              Para garantir uma experiência mais rápida, escolha quantos meses de dados devem ser carregados inicialmente.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-widest">
            <span className={dark ? 'text-neutral-400' : 'text-neutral-600'}>Período de carga (meses)</span>
            <input
              type="number"
              min={1}
              max={24}
              step={1}
              value={monthsInput}
              onChange={(event) => onMonthsInputChange(event.target.value)}
              className={`px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-neutral-950 border-neutral-700 text-neutral-100' : 'bg-white border-neutral-300 text-neutral-900'}`}
            />
          </label>

          <button
            type="button"
            onClick={onApply}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white bg-red-600 hover:bg-red-500 disabled:opacity-60 rounded-lg transition-colors"
          >
            {isLoading ? 'Aplicando...' : 'Carregar dados'}
          </button>
        </div>
      </div>
    </div>
  );
};

const IndicadoresAtendimentosImoviewPage = () => {
  const { dark } = useTheme();

  const [finalidade, setFinalidade] = useState(1);
  const [periodType, setPeriodType] = useState('this_month');
  const [customStartDate, setCustomStartDate] = useState(formatDateToInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [customEndDate, setCustomEndDate] = useState(formatDateToInput(new Date()));
  const [selectedCorretores, setSelectedCorretores] = useState([]);
  const [granularityMode, setGranularityMode] = useState('auto');
  const [customGranularity, setCustomGranularity] = useState('day');
  const [appEmail, setAppEmail] = useState(String(import.meta.env.VITE_IMOVIEW_APP_EMAIL || '').trim());
  const [appPassword, setAppPassword] = useState(String(import.meta.env.VITE_IMOVIEW_APP_PASSWORD || '').trim());
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authStatus, setAuthStatus] = useState('');
  const [authVersion, setAuthVersion] = useState(0);

  const [atendimentos, setAtendimentos] = useState([]);
  const [corretores, setCorretores] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdateAt, setLastUpdateAt] = useState(null);
  const [paginasConsultadas, setPaginasConsultadas] = useState(0);
  const [loadWindowMonths, setLoadWindowMonths] = useState(clampLoadWindowMonths(DEFAULT_LOAD_WINDOW_MONTHS));
  const [loadWindowMonthsInput, setLoadWindowMonthsInput] = useState(String(clampLoadWindowMonths(DEFAULT_LOAD_WINDOW_MONTHS)));
  const [showLoadWindowModal, setShowLoadWindowModal] = useState(true);
  const [hasConfiguredLoadWindow, setHasConfiguredLoadWindow] = useState(false);
  const [isStorageHydrated, setIsStorageHydrated] = useState(false);
  const [cachedWindowStart, setCachedWindowStart] = useState(null);
  const [cachedWindowEnd, setCachedWindowEnd] = useState(null);
  const [cachedFinalidade, setCachedFinalidade] = useState(null);
  const [drilldownModal, setDrilldownModal] = useState({
    isOpen: false,
    title: '',
    subtitle: '',
    type: 'interacoes',
    rows: [],
  });

  const runtimeConfig = useMemo(() => imoviewService.getImoviewRuntimeConfig(), [authVersion]);

  const periodRange = useMemo(
    () => getPeriodRange(periodType, customStartDate, customEndDate),
    [periodType, customStartDate, customEndDate]
  );

  const effectiveGranularity = useMemo(() => {
    if (!periodRange.isValid) return 'day';
    if (granularityMode === 'custom') return customGranularity;
    return resolveAutoGranularity(periodRange.startDate, periodRange.endDate);
  }, [customGranularity, granularityMode, periodRange]);

  const autenticarAcessoApp = useCallback(async () => {
    setError('');

    const parsedEmail = String(appEmail || '').trim();
    const parsedPassword = String(appPassword || '').trim();

    if (!parsedEmail) {
      setError('Informe o e-mail do usuário para autenticar no App do Imoview.');
      return false;
    }

    if (!parsedPassword) {
      setError('Informe a senha do usuário para autenticar no App do Imoview.');
      return false;
    }

    setIsAuthenticating(true);

    try {
      const senhaMd5 = MD5(parsedPassword).toString();
      await imoviewService.validarAcessoApp({
        email: parsedEmail,
        senhaMd5,
      });

      try {
        window.localStorage.setItem(IMOVIEW_APP_EMAIL_STORAGE_KEY, parsedEmail);
      } catch {
        // noop
      }

      setAuthVersion((value) => value + 1);
      setAuthStatus('Acesso App autenticado com sucesso.');
      return true;
    } catch (authError) {
      imoviewService.limparAppAccessCode();
      setAuthVersion((value) => value + 1);
      setAuthStatus('');
      setError(authError.message || 'Falha ao autenticar App_ValidarAcesso.');
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  }, [appEmail, appPassword]);

  useEffect(() => {
    try {
      const storedEmail = window.localStorage.getItem(IMOVIEW_APP_EMAIL_STORAGE_KEY);
      if (storedEmail && !appEmail) {
        setAppEmail(storedEmail);
      }
    } catch {
      // noop
    }
  }, [appEmail]);

  useEffect(() => {
    const cachedState = readLocalStorageJson(IMOVIEW_ATENDIMENTOS_CACHE_STORAGE_KEY);

    if (cachedState && typeof cachedState === 'object') {
      const restoredMonths = clampLoadWindowMonths(cachedState.loadWindowMonths);
      const restoredConfigured = Boolean(cachedState.hasConfiguredLoadWindow);

      setLoadWindowMonths(restoredMonths);
      setLoadWindowMonthsInput(String(restoredMonths));
      setHasConfiguredLoadWindow(restoredConfigured);
      setShowLoadWindowModal(!restoredConfigured);

      setCachedWindowStart(cachedState.cachedWindowStart ? new Date(cachedState.cachedWindowStart) : null);
      setCachedWindowEnd(cachedState.cachedWindowEnd ? new Date(cachedState.cachedWindowEnd) : null);
      setCachedFinalidade(Number.isFinite(Number(cachedState.cachedFinalidade)) ? Number(cachedState.cachedFinalidade) : null);

      setPaginasConsultadas(Number.isFinite(Number(cachedState.paginasConsultadas)) ? Number(cachedState.paginasConsultadas) : 0);
      setLastUpdateAt(cachedState.lastUpdateAt ? new Date(cachedState.lastUpdateAt) : null);

      const restoredAtendimentos = Array.isArray(cachedState.atendimentos) ? cachedState.atendimentos : [];
      const restoredCorretores = Array.isArray(cachedState.corretores) ? cachedState.corretores : [];

      setAtendimentos(restoredAtendimentos);
      setCorretores(restoredCorretores);
    }

    setIsStorageHydrated(true);
  }, []);

  const loadAtendimentos = useCallback(async ({ forceReload = false, overrideLoadWindowMonths } = {}) => {
    setError('');
    setAuthStatus('');

    if (!isStorageHydrated) {
      return;
    }

    const effectiveLoadWindowMonths = clampLoadWindowMonths(overrideLoadWindowMonths ?? loadWindowMonths);
    const isLoadWindowConfigured = hasConfiguredLoadWindow || overrideLoadWindowMonths !== undefined;

    if (!isLoadWindowConfigured) {
      setShowLoadWindowModal(true);
      setError('Defina a janela de carregamento para buscar os dados.');
      return;
    }

    if (!runtimeConfig.hasApiKey) {
      setAtendimentos([]);
      setError('Configure VITE_IMOVIEW_API_KEY no .env para carregar os atendimentos.');
      return;
    }

    if (!runtimeConfig.hasUserCode) {
      setAtendimentos([]);
      setError('Configure VITE_IMOVIEW_USER_CODE no .env para carregar os atendimentos.');
      return;
    }

    if (!periodRange.isValid) {
      setError('Período inválido. Ajuste a data inicial e final.');
      return;
    }

    if (!runtimeConfig.hasAppAccessCode) {
      setAtendimentos([]);
      setCorretores([]);
      setError('Clique em Conectar para autenticar no App do Imoview antes de consultar os dados.');
      return;
    }

    const defaultRange = getDefaultLoadWindowRange(effectiveLoadWindowMonths);
    const hasCacheForFinalidade = !forceReload
      && cachedFinalidade === finalidade
      && cachedWindowStart
      && cachedWindowEnd;

    const effectiveCacheStart = hasCacheForFinalidade ? cachedWindowStart : defaultRange.startDate;
    const effectiveCacheEnd = hasCacheForFinalidade ? cachedWindowEnd : defaultRange.endDate;

    const shouldFetchByRange = !hasCacheForFinalidade
      || periodRange.startDate < effectiveCacheStart
      || periodRange.endDate > effectiveCacheEnd;

    if (!shouldFetchByRange) {
      return;
    }

    const targetStartDate = periodRange.startDate < effectiveCacheStart ? periodRange.startDate : effectiveCacheStart;
    const targetEndDate = periodRange.endDate > effectiveCacheEnd ? periodRange.endDate : effectiveCacheEnd;

    setIsLoading(true);

    try {
      const [corretoresResponse, atendimentosResponse] = await Promise.all([
        imoviewService.retornarCorretoresApp({
          finalidade,
          codigoUnidade: 0,
          codigoEquipe: 0,
        }),
        imoviewService.retornarTodosAtendimentos({
          finalidade,
          situacao: 0,
          fase: 0,
          opcaoAtendimento: 1,
          dataInicial: formatDateToImoview(targetStartDate),
          dataFinal: formatDateToImoview(targetEndDate),
          numeroRegistros: 20,
        }),
      ]);

      const corretoresList = Array.isArray(corretoresResponse?.lista)
        ? corretoresResponse.lista
        : [];

      setCorretores(corretoresList);
      setAtendimentos(dedupeAtendimentos(Array.isArray(atendimentosResponse?.atendimentos) ? atendimentosResponse.atendimentos : []));
      setPaginasConsultadas(Number(atendimentosResponse?.paginasConsultadas) || 0);
      setLastUpdateAt(new Date());
      setCachedWindowStart(targetStartDate);
      setCachedWindowEnd(targetEndDate);
      setCachedFinalidade(finalidade);
      setAuthStatus((previous) => previous || (imoviewService.getImoviewRuntimeConfig().hasAppAccessCode ? 'Acesso App autenticado com sucesso.' : ''));
    } catch (requestError) {
      setAtendimentos([]);
      setError(requestError.message || 'Erro ao consultar atendimentos no Imoview.');
    } finally {
      setIsLoading(false);
    }
  }, [cachedFinalidade, cachedWindowEnd, cachedWindowStart, finalidade, hasConfiguredLoadWindow, isStorageHydrated, loadWindowMonths, periodRange, runtimeConfig.hasApiKey, runtimeConfig.hasAppAccessCode, runtimeConfig.hasUserCode]);

  useEffect(() => {
    loadAtendimentos();
  }, [loadAtendimentos]);

  useEffect(() => {
    if (!isStorageHydrated) return;

    writeLocalStorageJson(IMOVIEW_ATENDIMENTOS_CACHE_STORAGE_KEY, {
      loadWindowMonths,
      hasConfiguredLoadWindow,
      cachedWindowStart: cachedWindowStart ? cachedWindowStart.toISOString() : null,
      cachedWindowEnd: cachedWindowEnd ? cachedWindowEnd.toISOString() : null,
      cachedFinalidade,
      paginasConsultadas,
      lastUpdateAt: lastUpdateAt ? lastUpdateAt.toISOString() : null,
      atendimentos,
      corretores,
      savedAt: new Date().toISOString(),
    });
  }, [
    atendimentos,
    cachedFinalidade,
    cachedWindowEnd,
    cachedWindowStart,
    corretores,
    hasConfiguredLoadWindow,
    isStorageHydrated,
    lastUpdateAt,
    loadWindowMonths,
    paginasConsultadas,
  ]);

  useEffect(() => {
    setSelectedCorretores([]);
  }, [finalidade]);

  const corretorNameByCode = useMemo(() => {
    const map = new Map();
    corretores.forEach((corretor) => {
      const code = toSafeCode(corretor?.codigo);
      if (!code) return;
      map.set(String(code), String(corretor?.nome || '').trim() || `Corretor ${code}`);
    });
    return map;
  }, [corretores]);

  const normalizedAtendimentos = useMemo(() => atendimentos.map((item) => {
    const corretorCode = getCorretorCodeFromAtendimento(item);
    const corretorName = String(item?.corretor || '').trim()
      || corretorNameByCode.get(String(corretorCode || ''))
      || 'Sem corretor';

    const situacao = String(item?.situacao || '').trim();
    const isDescartado = normalizeText(situacao).includes('DESCARTADO');

    return {
      ...item,
      corretorCode,
      corretorName,
      situacao,
      isDescartado,
      dataInclusao: parseImoviewDate(item?.datahorainclusao || item?.datahoraentradalead),
      dataUltimaAlteracao: parseImoviewDate(item?.datahoraultimaalteracao),
      dataUltimaInteracao: parseImoviewDate(item?.datahoraultimainteracao),
      interacoesList: normalizeInteracoes(item?.interacoes),
    };
  }), [atendimentos, corretorNameByCode]);

  const corretorOptions = useMemo(() => {
    const map = new Map();

    corretores.forEach((corretor) => {
      const code = toSafeCode(corretor?.codigo);
      if (!code) return;
      map.set(String(code), {
        value: String(code),
        label: String(corretor?.nome || '').trim() || `Corretor ${code}`,
      });
    });

    normalizedAtendimentos.forEach((atendimento) => {
      const key = atendimento.corretorCode ? String(atendimento.corretorCode) : `name:${atendimento.corretorName}`;
      if (!map.has(key)) {
        map.set(key, {
          value: key,
          label: atendimento.corretorName,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }, [corretores, normalizedAtendimentos]);

  const filteredAtendimentos = useMemo(() => {
    if (!Array.isArray(selectedCorretores) || selectedCorretores.length === 0) {
      return normalizedAtendimentos;
    }

    const selectedSet = new Set(selectedCorretores);

    return normalizedAtendimentos.filter((item) => {
      if (item.corretorCode && selectedSet.has(String(item.corretorCode))) {
        return true;
      }

      return selectedSet.has(`name:${item.corretorName}`);
    });
  }, [normalizedAtendimentos, selectedCorretores]);

  const selectedCollaboratorNormalizedSet = useMemo(() => {
    if (!Array.isArray(selectedCorretores) || selectedCorretores.length === 0) {
      return null;
    }

    const labels = selectedCorretores
      .map((value) => corretorOptions.find((item) => item.value === value)?.label || '')
      .map((label) => normalizeText(label))
      .filter(Boolean);

    return new Set(labels);
  }, [corretorOptions, selectedCorretores]);

  const interactionsTimeline = useMemo(() => {
    const bucketMap = new Map();
    const collaboratorSet = new Set();

    const ensureBucket = (date) => {
      const bucketDate = startOfBucket(date, effectiveGranularity);
      const bucketKey = getBucketKey(bucketDate, effectiveGranularity);

      if (!bucketMap.has(bucketKey)) {
        bucketMap.set(bucketKey, {
          bucketKey,
          bucketSortDate: bucketDate,
          periodLabel: getBucketLabel(bucketDate, effectiveGranularity),
        });
      }

      return bucketMap.get(bucketKey);
    };

    filteredAtendimentos.forEach((atendimento) => {
      const interacoes = atendimento.interacoesList;

      if (interacoes.length > 0) {
        interacoes.forEach((interacao) => {
          const interactionDate = parseImoviewDate(interacao?.datahora || interacao?.dataHora);
          if (!isWithinRange(interactionDate, periodRange.startDate, periodRange.endDate)) return;

          const collaboratorName = String(interacao?.usuario || atendimento.corretorName || 'Sem colaborador').trim() || 'Sem colaborador';

          if (selectedCollaboratorNormalizedSet && selectedCollaboratorNormalizedSet.size > 0) {
            const isSelectedCollaborator = selectedCollaboratorNormalizedSet.has(normalizeText(collaboratorName));
            if (!isSelectedCollaborator) return;
          }

          collaboratorSet.add(collaboratorName);

          const bucket = ensureBucket(interactionDate);
          bucket[collaboratorName] = Number(bucket[collaboratorName] || 0) + 1;
          bucket.totalInteracoes = Number(bucket.totalInteracoes || 0) + 1;
        });

        return;
      }

      if (!isWithinRange(atendimento.dataUltimaInteracao, periodRange.startDate, periodRange.endDate)) return;

      const collaboratorName = atendimento.corretorName || 'Sem colaborador';

      if (selectedCollaboratorNormalizedSet && selectedCollaboratorNormalizedSet.size > 0) {
        const isSelectedCollaborator = selectedCollaboratorNormalizedSet.has(normalizeText(collaboratorName));
        if (!isSelectedCollaborator) return;
      }

      collaboratorSet.add(collaboratorName);
      const bucket = ensureBucket(atendimento.dataUltimaInteracao);
      bucket[collaboratorName] = Number(bucket[collaboratorName] || 0) + 1;
      bucket.totalInteracoes = Number(bucket.totalInteracoes || 0) + 1;
    });

    const collaborators = Array.from(collaboratorSet).sort((a, b) => a.localeCompare(b, 'pt-BR'));

    const timeline = Array.from(bucketMap.values())
      .sort((a, b) => a.bucketSortDate.getTime() - b.bucketSortDate.getTime())
      .map((row) => {
        const normalizedRow = {
          bucketKey: row.bucketKey,
          periodLabel: row.periodLabel,
          totalInteracoes: Number(row.totalInteracoes || 0),
        };

        collaborators.forEach((collaborator) => {
          normalizedRow[collaborator] = Number(row[collaborator] || 0);
        });

        return normalizedRow;
      });

    return {
      collaborators,
      timeline,
    };
  }, [effectiveGranularity, filteredAtendimentos, periodRange.endDate, periodRange.startDate, selectedCollaboratorNormalizedSet]);

  const handleConnect = useCallback(async () => {
    const authenticated = await autenticarAcessoApp();
    if (authenticated) {
      await loadAtendimentos({ forceReload: true });
    }
  }, [autenticarAcessoApp, loadAtendimentos]);

  const handleApplyLoadWindow = useCallback(async () => {
    const months = clampLoadWindowMonths(loadWindowMonthsInput);
    setLoadWindowMonths(months);
    setLoadWindowMonthsInput(String(months));
    setCachedWindowStart(null);
    setCachedWindowEnd(null);
    setCachedFinalidade(null);
    setHasConfiguredLoadWindow(true);
    setShowLoadWindowModal(false);

    await loadAtendimentos({ forceReload: true, overrideLoadWindowMonths: months });
  }, [loadAtendimentos, loadWindowMonthsInput]);

  const closeDrilldownModal = useCallback(() => {
    setDrilldownModal((previous) => ({ ...previous, isOpen: false }));
  }, []);

  const openInteractionsDrilldown = useCallback((pointPayload, collaboratorName) => {
    const bucketKey = resolveBucketKeyFromChartEvent(pointPayload, interactionsTimeline.timeline);
    if (!bucketKey || !collaboratorName) return;

    const collaboratorNormalized = normalizeText(collaboratorName);
    const rows = [];

    filteredAtendimentos.forEach((atendimento) => {
      const interacoes = atendimento.interacoesList;

      if (interacoes.length > 0) {
        interacoes.forEach((interacao) => {
          const interactionDate = parseImoviewDate(interacao?.datahora || interacao?.dataHora);
          if (!interactionDate) return;
          if (!isWithinRange(interactionDate, periodRange.startDate, periodRange.endDate)) return;
          if (getBucketKey(interactionDate, effectiveGranularity) !== bucketKey) return;

          const collaborator = String(interacao?.usuario || atendimento.corretorName || 'Sem colaborador').trim() || 'Sem colaborador';
          if (normalizeText(collaborator) !== collaboratorNormalized) return;

          rows.push({
            dateISO: interactionDate.toISOString(),
            dateLabel: formatDateTimeCell(interactionDate),
            corretor: atendimento.corretorName || '-',
            usuario: collaborator,
            tipo: String(interacao?.tipo || '-'),
            titulo: String(interacao?.titulo || ''),
            texto: String(interacao?.texto || ''),
            codigoAtendimento: atendimento?.codigo,
          });
        });

        return;
      }

      const fallbackDate = atendimento.dataUltimaInteracao;
      if (!fallbackDate) return;
      if (!isWithinRange(fallbackDate, periodRange.startDate, periodRange.endDate)) return;
      if (getBucketKey(fallbackDate, effectiveGranularity) !== bucketKey) return;

      const collaborator = String(atendimento.corretorName || 'Sem colaborador').trim() || 'Sem colaborador';
      if (normalizeText(collaborator) !== collaboratorNormalized) return;

      rows.push({
        dateISO: fallbackDate.toISOString(),
        dateLabel: formatDateTimeCell(fallbackDate),
        corretor: atendimento.corretorName || '-',
        usuario: collaborator,
        tipo: 'Sem tipo',
        titulo: 'Interação inferida por última interação',
        texto: '',
        codigoAtendimento: atendimento?.codigo,
      });
    });

    rows.sort((a, b) => String(b.dateISO).localeCompare(String(a.dateISO)));

    setDrilldownModal({
      isOpen: true,
      title: `Interações - ${collaboratorName}`,
      subtitle: `Período: ${resolvePeriodLabelFromChartEvent(pointPayload, interactionsTimeline.timeline)} (${rows.length} registro(s))`,
      type: 'interacoes',
      rows,
    });
  }, [effectiveGranularity, filteredAtendimentos, interactionsTimeline.timeline, periodRange.endDate, periodRange.startDate]);

  const openAtendimentosDrilldown = useCallback((pointPayload, metricKey) => {
    const bucketKey = resolveBucketKeyFromChartEvent(pointPayload, []);
    if (!bucketKey || !metricKey) return;

    const rows = [];

    filteredAtendimentos.forEach((atendimento) => {
      if (metricKey === 'novos') {
        const date = atendimento.dataInclusao;
        if (!date) return;
        if (!isWithinRange(date, periodRange.startDate, periodRange.endDate)) return;
        if (getBucketKey(date, effectiveGranularity) !== bucketKey) return;

        rows.push({
          dateISO: date.toISOString(),
          dateLabel: formatDateTimeCell(date),
          corretor: atendimento.corretorName || '-',
          situacao: atendimento.situacao || '-',
          tipoRegistro: 'Novo',
          codigoAtendimento: atendimento?.codigo,
        });
        return;
      }

      if (metricKey === 'descartados') {
        const date = atendimento.dataUltimaAlteracao;
        if (!atendimento.isDescartado || !date) return;
        if (!isWithinRange(date, periodRange.startDate, periodRange.endDate)) return;
        if (getBucketKey(date, effectiveGranularity) !== bucketKey) return;

        rows.push({
          dateISO: date.toISOString(),
          dateLabel: formatDateTimeCell(date),
          corretor: atendimento.corretorName || '-',
          situacao: atendimento.situacao || '-',
          tipoRegistro: 'Descartado',
          codigoAtendimento: atendimento?.codigo,
        });
      }
    });

    rows.sort((a, b) => String(b.dateISO).localeCompare(String(a.dateISO)));

    setDrilldownModal({
      isOpen: true,
      title: metricKey === 'novos' ? 'Atendimentos novos' : 'Atendimentos descartados',
      subtitle: `Período: ${resolvePeriodLabelFromChartEvent(pointPayload, [])} (${rows.length} registro(s))`,
      type: 'atendimentos',
      rows,
    });
  }, [effectiveGranularity, filteredAtendimentos, periodRange.endDate, periodRange.startDate]);

  const handleInteractionsChartClick = useCallback((chartEvent) => {
    const collaboratorName = resolvePrimarySeriesFromChartEvent(chartEvent, interactionsTimeline.collaborators);
    if (!collaboratorName) return;

    openInteractionsDrilldown(chartEvent, collaboratorName);
  }, [interactionsTimeline.collaborators, openInteractionsDrilldown]);

  const handleNovosDescartadosChartClick = useCallback((chartEvent) => {
    const metricKey = resolvePrimarySeriesFromChartEvent(chartEvent, ['novos', 'descartados']);
    if (!metricKey) return;

    openAtendimentosDrilldown(chartEvent, metricKey);
  }, [openAtendimentosDrilldown]);

  const novosDescartadosTimeline = useMemo(() => {
    const bucketMap = new Map();

    const ensureBucket = (date) => {
      const bucketDate = startOfBucket(date, effectiveGranularity);
      const bucketKey = getBucketKey(bucketDate, effectiveGranularity);

      if (!bucketMap.has(bucketKey)) {
        bucketMap.set(bucketKey, {
          bucketKey,
          bucketSortDate: bucketDate,
          periodLabel: getBucketLabel(bucketDate, effectiveGranularity),
          novos: 0,
          descartados: 0,
        });
      }

      return bucketMap.get(bucketKey);
    };

    filteredAtendimentos.forEach((atendimento) => {
      if (isWithinRange(atendimento.dataInclusao, periodRange.startDate, periodRange.endDate)) {
        const bucket = ensureBucket(atendimento.dataInclusao);
        bucket.novos += 1;
      }

      if (atendimento.isDescartado && isWithinRange(atendimento.dataUltimaAlteracao, periodRange.startDate, periodRange.endDate)) {
        const bucket = ensureBucket(atendimento.dataUltimaAlteracao);
        bucket.descartados += 1;
      }
    });

    return Array.from(bucketMap.values())
      .sort((a, b) => a.bucketSortDate.getTime() - b.bucketSortDate.getTime())
      .map((row) => ({
        bucketKey: row.bucketKey,
        periodLabel: row.periodLabel,
        novos: row.novos,
        descartados: row.descartados,
      }));
  }, [effectiveGranularity, filteredAtendimentos, periodRange.endDate, periodRange.startDate]);

  const totalInteracoes = useMemo(() => interactionsTimeline.timeline.reduce((sum, row) => sum + Number(row.totalInteracoes || 0), 0), [interactionsTimeline.timeline]);

  const totalDescartados = useMemo(() => filteredAtendimentos.filter((item) => item.isDescartado).length, [filteredAtendimentos]);

  const totalNovos = useMemo(
    () => filteredAtendimentos.filter((item) => isWithinRange(item.dataInclusao, periodRange.startDate, periodRange.endDate)).length,
    [filteredAtendimentos, periodRange.endDate, periodRange.startDate]
  );

  const chartTheme = useMemo(() => ({
    grid: dark ? '#262626' : '#e5e7eb',
    axis: dark ? '#a3a3a3' : '#525252',
    legend: dark ? '#a3a3a3' : '#525252',
    dotStroke: dark ? '#0a0a0a' : '#ffffff',
  }), [dark]);

  const renderInteractionsDot = useCallback((dotProps, collaborator, color, radius = 4) => {
    if (!dotProps || dotProps?.cx == null || dotProps?.cy == null) return null;

    return (
      <circle
        cx={dotProps.cx}
        cy={dotProps.cy}
        r={radius}
        fill={color}
        stroke={chartTheme.dotStroke}
        strokeWidth={2}
        style={{ cursor: 'pointer' }}
        onClick={(event) => {
          event?.stopPropagation?.();
          openInteractionsDrilldown({ payload: dotProps.payload }, collaborator);
        }}
      />
    );
  }, [chartTheme.dotStroke, openInteractionsDrilldown]);

  const renderMetricDot = useCallback((dotProps, metricKey, color, radius = 4) => {
    if (!dotProps || dotProps?.cx == null || dotProps?.cy == null) return null;

    return (
      <circle
        cx={dotProps.cx}
        cy={dotProps.cy}
        r={radius}
        fill={color}
        stroke={chartTheme.dotStroke}
        strokeWidth={2}
        style={{ cursor: 'pointer' }}
        onClick={(event) => {
          event?.stopPropagation?.();
          openAtendimentosDrilldown({ payload: dotProps.payload }, metricKey);
        }}
      />
    );
  }, [chartTheme.dotStroke, openAtendimentosDrilldown]);

  return (
    <div className="space-y-6">
      <header className={`sticky top-0 z-20 backdrop-blur-md border rounded-2xl p-4 ${dark ? 'bg-neutral-900/85 border-neutral-800' : 'bg-white/90 border-neutral-200'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className={`text-xl font-bold ${dark ? 'text-white' : 'text-neutral-900'}`}>Indicadores de Atendimentos Imoview</h1>
            <p className={`text-xs ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>
              Interações por colaborador e evolução de atendimentos novos vs descartados.
            </p>
          </div>

          <button
            onClick={() => setShowLoadWindowModal(true)}
            disabled={isLoading}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors border ${dark ? 'border-neutral-700 bg-neutral-900 text-neutral-100 hover:bg-neutral-800' : 'border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100'} disabled:opacity-60`}
          >
            <FiClock size={14} />
            Janela ({loadWindowMonths}m)
          </button>

          <button
            onClick={() => loadAtendimentos({ forceReload: true })}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white bg-red-600 hover:bg-red-500 disabled:opacity-60 rounded-lg transition-colors"
          >
            <FiRefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
      </header>

      <section className={getCardClass(dark)}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-8 gap-4">
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-widest xl:col-span-2">
            <span className={dark ? 'text-neutral-400' : 'text-neutral-600'}>E-mail App Imoview</span>
            <input
              type="email"
              value={appEmail}
              onChange={(event) => setAppEmail(event.target.value)}
              placeholder="usuario@empresa.com"
              className={`px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-neutral-900 border-neutral-700 text-neutral-100' : 'bg-white border-neutral-300 text-neutral-900'}`}
            />
          </label>

          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-widest xl:col-span-2">
            <span className={dark ? 'text-neutral-400' : 'text-neutral-600'}>Senha App Imoview</span>
            <input
              type="password"
              value={appPassword}
              onChange={(event) => setAppPassword(event.target.value)}
              placeholder="••••••••"
              className={`px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-neutral-900 border-neutral-700 text-neutral-100' : 'bg-white border-neutral-300 text-neutral-900'}`}
            />
          </label>

          <div className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-widest xl:col-span-1">
            <span className={dark ? 'text-neutral-400' : 'text-neutral-600'}>Autenticação</span>
            <button
              type="button"
              onClick={handleConnect}
              disabled={isAuthenticating}
              className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-widest transition-colors ${dark ? 'border-neutral-700 bg-neutral-900 text-neutral-100 hover:bg-neutral-800' : 'border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100'} disabled:opacity-60`}
            >
              <FiShield size={14} className={isAuthenticating ? 'animate-pulse' : ''} />
              {isAuthenticating ? 'Autenticando...' : 'Conectar'}
            </button>
          </div>

          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-widest">
            <span className={dark ? 'text-neutral-400' : 'text-neutral-600'}>Finalidade</span>
            <select
              value={finalidade}
              onChange={(event) => setFinalidade(Number(event.target.value) || 1)}
              className={`px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-neutral-900 border-neutral-700 text-neutral-100' : 'bg-white border-neutral-300 text-neutral-900'}`}
            >
              <option value={1}>Aluguel</option>
              <option value={2}>Venda</option>
            </select>
          </label>

          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-widest">
            <span className={dark ? 'text-neutral-400' : 'text-neutral-600'}>Período</span>
            <select
              value={periodType}
              onChange={(event) => setPeriodType(event.target.value)}
              className={`px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-neutral-900 border-neutral-700 text-neutral-100' : 'bg-white border-neutral-300 text-neutral-900'}`}
            >
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          {periodType === 'custom' && (
            <>
              <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-widest">
                <span className={dark ? 'text-neutral-400' : 'text-neutral-600'}>Data inicial</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(event) => setCustomStartDate(event.target.value)}
                  className={`px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-neutral-900 border-neutral-700 text-neutral-100' : 'bg-white border-neutral-300 text-neutral-900'}`}
                />
              </label>

              <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-widest">
                <span className={dark ? 'text-neutral-400' : 'text-neutral-600'}>Data final</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(event) => setCustomEndDate(event.target.value)}
                  className={`px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-neutral-900 border-neutral-700 text-neutral-100' : 'bg-white border-neutral-300 text-neutral-900'}`}
                />
              </label>
            </>
          )}

          <div className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-widest">
            <span className={dark ? 'text-neutral-400' : 'text-neutral-600'}>Corretor</span>
            <CorretorFilter
              options={corretorOptions}
              selectedValues={selectedCorretores}
              onChange={setSelectedCorretores}
              dark={dark}
            />
          </div>

          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-widest">
            <span className={dark ? 'text-neutral-400' : 'text-neutral-600'}>Granularidade</span>
            <select
              value={granularityMode}
              onChange={(event) => setGranularityMode(event.target.value)}
              className={`px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-neutral-900 border-neutral-700 text-neutral-100' : 'bg-white border-neutral-300 text-neutral-900'}`}
            >
              <option value="auto">Automática</option>
              <option value="custom">Personalizada</option>
            </select>
          </label>

          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-widest">
            <span className={dark ? 'text-neutral-400' : 'text-neutral-600'}>Detalhe</span>
            <select
              value={customGranularity}
              onChange={(event) => setCustomGranularity(event.target.value)}
              disabled={granularityMode !== 'custom'}
              className={`px-3 py-2 rounded-lg border text-sm disabled:opacity-50 ${dark ? 'bg-neutral-900 border-neutral-700 text-neutral-100' : 'bg-white border-neutral-300 text-neutral-900'}`}
            >
              {GRANULARITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className={`mt-4 flex flex-wrap items-center gap-3 text-xs ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>
          <span className="inline-flex items-center gap-1"><FiShield size={14} />Status App_: {runtimeConfig.hasAppAccessCode ? 'Autenticado' : 'Não autenticado'}</span>
          <span className="inline-flex items-center gap-1"><FiCalendar size={14} />{periodRange.isValid ? `${periodRange.startDate.toLocaleDateString('pt-BR')} até ${periodRange.endDate.toLocaleDateString('pt-BR')}` : 'Período inválido'}</span>
          <span className="inline-flex items-center gap-1"><FiFilter size={14} />Granularidade aplicada: {GRANULARITY_OPTIONS.find((option) => option.value === effectiveGranularity)?.label || effectiveGranularity}</span>
          <span className="inline-flex items-center gap-1"><FiClock size={14} />Janela configurada: últimos {loadWindowMonths} mês(es)</span>
          <span>Janela em memória: {cachedWindowStart && cachedWindowEnd ? `${cachedWindowStart.toLocaleDateString('pt-BR')} até ${cachedWindowEnd.toLocaleDateString('pt-BR')}` : 'não carregada'}</span>
          <span className="inline-flex items-center gap-1"><FiUsers size={14} />Corretores retornados: {corretores.length}</span>
          <span className="inline-flex items-center gap-1"><FiActivity size={14} />Páginas consultadas: {paginasConsultadas}</span>
          <span>Última atualização: {formatDateTimePTBR(lastUpdateAt)}</span>
          {authStatus && <span>{authStatus}</span>}
        </div>
      </section>

      {error && (
        <section className={`rounded-2xl border p-4 ${dark ? 'bg-red-950/20 border-red-900/70 text-red-200' : 'bg-red-50 border-red-200 text-red-700'}`}>
          <p className="text-sm font-semibold">Erro ao consultar Imoview</p>
          <p className="text-sm mt-1">{error}</p>
        </section>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <article className={getCardClass(dark)}>
          <p className={`text-xs uppercase tracking-widest ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>Atendimentos filtrados</p>
          <p className={`text-3xl font-bold mt-2 ${dark ? 'text-white' : 'text-neutral-900'}`}>{filteredAtendimentos.length}</p>
        </article>

        <article className={getCardClass(dark)}>
          <p className={`text-xs uppercase tracking-widest ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>Interações no período</p>
          <p className={`text-3xl font-bold mt-2 ${dark ? 'text-white' : 'text-neutral-900'}`}>{totalInteracoes}</p>
        </article>

        <article className={getCardClass(dark)}>
          <p className={`text-xs uppercase tracking-widest ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>Novos no período</p>
          <p className="text-3xl font-bold mt-2 text-emerald-500">{totalNovos}</p>
        </article>

        <article className={getCardClass(dark)}>
          <p className={`text-xs uppercase tracking-widest ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>Descartados no filtro</p>
          <p className="text-3xl font-bold mt-2 text-amber-500">{totalDescartados}</p>
        </article>
      </section>

      <section className={getCardClass(dark)}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className={`text-lg font-semibold ${dark ? 'text-white' : 'text-neutral-900'}`}>Interações ao longo do tempo por colaborador</h2>
            <p className={`text-xs ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>Cada linha representa um colaborador (usuário da interação).</p>
          </div>
        </div>

        <div className="h-[420px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={interactionsTimeline.timeline}
              margin={{ top: 8, right: 20, left: 0, bottom: 8 }}
              onClick={handleInteractionsChartClick}
              style={{ cursor: 'pointer' }}
            >
              <defs>
                {interactionsTimeline.collaborators.map((collaborator, index) => {
                  const color = LINE_COLORS[index % LINE_COLORS.length];
                  const id = `interactionsArea_${toGradientId(collaborator)}`;

                  return (
                    <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.24} />
                      <stop offset="55%" stopColor={color} stopOpacity={0.1} />
                      <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke={chartTheme.grid} />
              <XAxis dataKey="periodLabel" stroke={chartTheme.axis} tick={{ fontSize: 10 }} minTickGap={20} />
              <YAxis stroke={chartTheme.axis} tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip content={<DedupedChartTooltip dark={dark} />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: 12, fontSize: '11px', color: chartTheme.legend }}
              />

              {interactionsTimeline.collaborators.map((collaborator, index) => (
                <Area
                  key={`${collaborator}_area`}
                  type="monotone"
                  dataKey={collaborator}
                  legendType="none"
                  stroke="none"
                  fill={`url(#interactionsArea_${toGradientId(collaborator)})`}
                  fillOpacity={1}
                  isAnimationActive={false}
                  connectNulls
                />
              ))}

              {interactionsTimeline.collaborators.map((collaborator, index) => {
                const color = LINE_COLORS[index % LINE_COLORS.length];
                return (
                <Line
                  key={collaborator}
                  type="monotone"
                  dataKey={collaborator}
                  stroke={color}
                  strokeWidth={2}
                  cursor="pointer"
                  dot={(dotProps) => renderInteractionsDot(dotProps, collaborator, color, 4)}
                  activeDot={(dotProps) => renderInteractionsDot(dotProps, collaborator, color, 6)}
                  onClick={(pointPayload) => openInteractionsDrilldown(pointPayload, collaborator)}
                  connectNulls
                />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {!isLoading && interactionsTimeline.timeline.length === 0 && (
          <p className={`text-sm mt-4 ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>
            Sem dados de interação para o filtro selecionado.
          </p>
        )}
      </section>

      <section className={getCardClass(dark)}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className={`text-lg font-semibold ${dark ? 'text-white' : 'text-neutral-900'}`}>Atendimentos novos vs descartados no tempo</h2>
            <p className={`text-xs ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>Novos: data de inclusão. Descartados: situação "Descartado" na última alteração.</p>
          </div>
        </div>

        <div className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={novosDescartadosTimeline}
              margin={{ top: 8, right: 20, left: 0, bottom: 8 }}
              onClick={handleNovosDescartadosChartClick}
              style={{ cursor: 'pointer' }}
            >
              <defs>
                <linearGradient id="novosAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.24} />
                  <stop offset="55%" stopColor="#22c55e" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="descartadosAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.24} />
                  <stop offset="55%" stopColor="#f59e0b" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke={chartTheme.grid} />
              <XAxis dataKey="periodLabel" stroke={chartTheme.axis} tick={{ fontSize: 10 }} minTickGap={20} />
              <YAxis stroke={chartTheme.axis} tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip content={<DedupedChartTooltip dark={dark} />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: 12, fontSize: '11px', color: chartTheme.legend }}
              />

              <Area
                type="monotone"
                dataKey="novos"
                legendType="none"
                stroke="none"
                fill="url(#novosAreaGradient)"
                fillOpacity={1}
                isAnimationActive={false}
                connectNulls
              />

              <Area
                type="monotone"
                dataKey="descartados"
                legendType="none"
                stroke="none"
                fill="url(#descartadosAreaGradient)"
                fillOpacity={1}
                isAnimationActive={false}
                connectNulls
              />

              <Line
                type="monotone"
                dataKey="novos"
                name="Novos"
                stroke="#22c55e"
                strokeWidth={2.5}
                cursor="pointer"
                dot={(dotProps) => renderMetricDot(dotProps, 'novos', '#22c55e', 4)}
                activeDot={(dotProps) => renderMetricDot(dotProps, 'novos', '#22c55e', 6)}
                onClick={(pointPayload) => openAtendimentosDrilldown(pointPayload, 'novos')}
                connectNulls
              />

              <Line
                type="monotone"
                dataKey="descartados"
                name="Descartados"
                stroke="#f59e0b"
                strokeWidth={2.5}
                cursor="pointer"
                dot={(dotProps) => renderMetricDot(dotProps, 'descartados', '#f59e0b', 4)}
                activeDot={(dotProps) => renderMetricDot(dotProps, 'descartados', '#f59e0b', 6)}
                onClick={(pointPayload) => openAtendimentosDrilldown(pointPayload, 'descartados')}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {!isLoading && novosDescartadosTimeline.length === 0 && (
          <p className={`text-sm mt-4 ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>
            Sem dados de atendimentos novos/descartados para o filtro selecionado.
          </p>
        )}
      </section>

      {isLoading && (
        <section className={getCardClass(dark)}>
          <div className="flex items-center gap-3 text-sm">
            <FiRefreshCw className="animate-spin" />
            Consultando API do Imoview e percorrendo páginas até encontrar uma página vazia...
          </div>
        </section>
      )}

      <section className={`rounded-2xl border p-4 text-xs ${dark ? 'bg-neutral-900/50 border-neutral-800 text-neutral-400' : 'bg-neutral-50 border-neutral-200 text-neutral-600'}`}>
        <p className="font-semibold mb-1">Regras implementadas</p>
        <ul className="list-disc ml-4 space-y-1">
          <li>Paginação de atendimentos avança página a página até retorno vazio.</li>
          <li>Filtros por período (incluindo personalizado) e por corretor.</li>
          <li>Granularidade automática ou personalizada (dia, semana, mês, trimestre, ano).</li>
          <li>Gráfico de interações por colaborador e gráfico de novos vs descartados ao longo do tempo.</li>
        </ul>
      </section>

      <LoadWindowModal
        dark={dark}
        isOpen={showLoadWindowModal}
        monthsInput={loadWindowMonthsInput}
        onMonthsInputChange={setLoadWindowMonthsInput}
        onApply={handleApplyLoadWindow}
        isLoading={isLoading}
      />

      <ChartDrilldownModal
        dark={dark}
        modalState={drilldownModal}
        onClose={closeDrilldownModal}
      />
    </div>
  );
};

export default IndicadoresAtendimentosImoviewPage;
