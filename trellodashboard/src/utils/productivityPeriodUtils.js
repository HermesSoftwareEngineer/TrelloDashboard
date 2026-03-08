export const PRODUCTIVITY_PERIOD_TYPES = {
  THIS_WEEK: 'this_week',
  LAST_WEEK: 'last_week',
  THIS_MONTH: 'this_month',
  LAST_MONTH: 'last_month',
  THIS_QUARTER: 'this_quarter',
  LAST_QUARTER: 'last_quarter',
  THIS_YEAR: 'this_year',
  CUSTOM: 'custom',
};

export const PRODUCTIVITY_PERIOD_OPTIONS = [
  { value: PRODUCTIVITY_PERIOD_TYPES.THIS_WEEK, label: 'Esta semana' },
  { value: PRODUCTIVITY_PERIOD_TYPES.LAST_WEEK, label: 'Semana anterior' },
  { value: PRODUCTIVITY_PERIOD_TYPES.THIS_MONTH, label: 'Este mês' },
  { value: PRODUCTIVITY_PERIOD_TYPES.LAST_MONTH, label: 'Mês anterior' },
  { value: PRODUCTIVITY_PERIOD_TYPES.THIS_QUARTER, label: 'Este trimestre' },
  { value: PRODUCTIVITY_PERIOD_TYPES.LAST_QUARTER, label: 'Trimestre anterior' },
  { value: PRODUCTIVITY_PERIOD_TYPES.THIS_YEAR, label: 'Este ano' },
  { value: PRODUCTIVITY_PERIOD_TYPES.CUSTOM, label: 'Personalizado' },
];

const withDayStart = (date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

const withDayEnd = (date) => {
  const normalized = new Date(date);
  normalized.setHours(23, 59, 59, 999);
  return normalized;
};

const getStartOfWeek = (date) => {
  const d = withDayStart(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
};

const getEndOfWeek = (date) => {
  const d = getStartOfWeek(date);
  d.setDate(d.getDate() + 6);
  return withDayEnd(d);
};

const getStartOfMonth = (date) => {
  const d = withDayStart(date);
  d.setDate(1);
  return d;
};

const getEndOfMonth = (date) => {
  const d = withDayStart(date);
  d.setMonth(d.getMonth() + 1, 0);
  return withDayEnd(d);
};

const getStartOfQuarter = (date) => {
  const d = withDayStart(date);
  const quarterIndex = Math.floor(d.getMonth() / 3);
  d.setMonth(quarterIndex * 3, 1);
  return d;
};

const getEndOfQuarter = (date) => {
  const d = getStartOfQuarter(date);
  d.setMonth(d.getMonth() + 3, 0);
  return withDayEnd(d);
};

const getStartOfYear = (date) => {
  const d = withDayStart(date);
  d.setMonth(0, 1);
  return d;
};

const getEndOfYear = (date) => {
  const d = withDayStart(date);
  d.setMonth(11, 31);
  return withDayEnd(d);
};

export const toISODate = (date) => {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const formatDatePTBR = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR');
};

export const listDaysInRange = (startDate, endDate) => {
  const days = [];
  const cursor = withDayStart(startDate);
  const end = withDayStart(endDate);

  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
};

export const getProductivityPeriodRange = (periodType, referenceDate = new Date(), customRange = null) => {
  const ref = new Date(referenceDate);
  let startDate;
  let endDate;
  let label;

  switch (periodType) {
    case PRODUCTIVITY_PERIOD_TYPES.THIS_WEEK:
      startDate = getStartOfWeek(ref);
      endDate = getEndOfWeek(ref);
      label = 'Esta semana';
      break;
    case PRODUCTIVITY_PERIOD_TYPES.LAST_WEEK: {
      const previousWeekDate = new Date(ref);
      previousWeekDate.setDate(previousWeekDate.getDate() - 7);
      startDate = getStartOfWeek(previousWeekDate);
      endDate = getEndOfWeek(previousWeekDate);
      label = 'Semana anterior';
      break;
    }
    case PRODUCTIVITY_PERIOD_TYPES.THIS_MONTH:
      startDate = getStartOfMonth(ref);
      endDate = getEndOfMonth(ref);
      label = 'Este mês';
      break;
    case PRODUCTIVITY_PERIOD_TYPES.LAST_MONTH: {
      const previousMonthDate = new Date(ref);
      previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
      startDate = getStartOfMonth(previousMonthDate);
      endDate = getEndOfMonth(previousMonthDate);
      label = 'Mês anterior';
      break;
    }
    case PRODUCTIVITY_PERIOD_TYPES.THIS_QUARTER:
      startDate = getStartOfQuarter(ref);
      endDate = getEndOfQuarter(ref);
      label = 'Este trimestre';
      break;
    case PRODUCTIVITY_PERIOD_TYPES.LAST_QUARTER: {
      const previousQuarterDate = new Date(ref);
      previousQuarterDate.setMonth(previousQuarterDate.getMonth() - 3);
      startDate = getStartOfQuarter(previousQuarterDate);
      endDate = getEndOfQuarter(previousQuarterDate);
      label = 'Trimestre anterior';
      break;
    }
    case PRODUCTIVITY_PERIOD_TYPES.THIS_YEAR:
      startDate = getStartOfYear(ref);
      endDate = getEndOfYear(ref);
      label = 'Este ano';
      break;
    case PRODUCTIVITY_PERIOD_TYPES.CUSTOM: {
      const start = customRange?.startDate;
      const end = customRange?.endDate;

      if (!start || !end) {
        startDate = getStartOfMonth(ref);
        endDate = getEndOfMonth(ref);
        label = 'Personalizado';
        break;
      }

      startDate = withDayStart(start);
      endDate = withDayEnd(end);
      label = 'Personalizado';
      break;
    }
    default:
      startDate = getStartOfMonth(ref);
      endDate = getEndOfMonth(ref);
      label = 'Este mês';
      break;
  }

  return {
    periodType,
    label,
    startDate,
    endDate,
    startISO: toISODate(startDate),
    endISO: toISODate(endDate),
  };
};

export const getTodayRange = () => {
  const today = new Date();
  return {
    startDate: withDayStart(today),
    endDate: withDayEnd(today),
  };
};

export const getCurrentYearRange = () => {
  const now = new Date();
  return {
    startDate: getStartOfYear(now),
    endDate: getEndOfYear(now),
  };
};
