export const PERIOD_FILTER_TYPES = {
  TODAY: 'today',
  PREVIOUS_DAY: 'previous_day',
  THIS_WEEK: 'this_week',
  PREVIOUS_WEEK: 'previous_week',
  THIS_MONTH: 'this_month',
  PREVIOUS_MONTH: 'previous_month',
  THIS_QUARTER: 'this_quarter',
  PREVIOUS_QUARTER: 'previous_quarter',
  THIS_YEAR: 'this_year',
  PREVIOUS_YEAR: 'previous_year',
  CUSTOM: 'custom',
};

export const PERIOD_FILTER_OPTIONS = [
  { value: PERIOD_FILTER_TYPES.TODAY, label: 'Este dia' },
  { value: PERIOD_FILTER_TYPES.PREVIOUS_DAY, label: 'Dia anterior' },
  { value: PERIOD_FILTER_TYPES.THIS_WEEK, label: 'Esta semana' },
  { value: PERIOD_FILTER_TYPES.PREVIOUS_WEEK, label: 'Semana anterior' },
  { value: PERIOD_FILTER_TYPES.THIS_MONTH, label: 'Este mês' },
  { value: PERIOD_FILTER_TYPES.PREVIOUS_MONTH, label: 'Mês anterior' },
  { value: PERIOD_FILTER_TYPES.THIS_QUARTER, label: 'Este trimestre' },
  { value: PERIOD_FILTER_TYPES.PREVIOUS_QUARTER, label: 'Trimestre anterior' },
  { value: PERIOD_FILTER_TYPES.THIS_YEAR, label: 'Este ano' },
  { value: PERIOD_FILTER_TYPES.PREVIOUS_YEAR, label: 'Ano anterior' },
  { value: PERIOD_FILTER_TYPES.CUSTOM, label: 'Personalizado' },
];

const startOfDay = (date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const endOfDay = (date) => {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
};

export const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('pt-BR');
};

export const getPeriodRange = ({
  periodType,
  customStartDate,
  customEndDate,
  referenceDate = new Date(),
}) => {
  const now = new Date(referenceDate);
  const month = now.getMonth();
  const year = now.getFullYear();

  switch (periodType) {
    case PERIOD_FILTER_TYPES.TODAY:
      return {
        startDate: startOfDay(now),
        endDate: endOfDay(now),
        label: 'Este dia',
      };

    case PERIOD_FILTER_TYPES.PREVIOUS_DAY: {
      const previousDay = new Date(now);
      previousDay.setDate(previousDay.getDate() - 1);
      return {
        startDate: startOfDay(previousDay),
        endDate: endOfDay(previousDay),
        label: 'Dia anterior',
      };
    }

    case PERIOD_FILTER_TYPES.THIS_WEEK: {
      const start = startOfDay(now);
      const weekDay = start.getDay();
      const diff = weekDay === 0 ? 6 : weekDay - 1;
      start.setDate(start.getDate() - diff);
      const end = endOfDay(start);
      end.setDate(start.getDate() + 6);
      return { startDate: start, endDate: end, label: 'Esta semana' };
    }

    case PERIOD_FILTER_TYPES.PREVIOUS_WEEK: {
      const thisWeek = getPeriodRange({ periodType: PERIOD_FILTER_TYPES.THIS_WEEK, referenceDate: now });
      const start = new Date(thisWeek.startDate);
      start.setDate(start.getDate() - 7);
      const end = new Date(thisWeek.endDate);
      end.setDate(end.getDate() - 7);
      return { startDate: start, endDate: end, label: 'Semana anterior' };
    }

    case PERIOD_FILTER_TYPES.THIS_MONTH: {
      const start = new Date(year, month, 1, 0, 0, 0, 0);
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
      return { startDate: start, endDate: end, label: 'Este mês' };
    }

    case PERIOD_FILTER_TYPES.PREVIOUS_MONTH: {
      const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const end = new Date(year, month, 0, 23, 59, 59, 999);
      return { startDate: start, endDate: end, label: 'Mês anterior' };
    }

    case PERIOD_FILTER_TYPES.THIS_QUARTER: {
      const quarterStartMonth = Math.floor(month / 3) * 3;
      const start = new Date(year, quarterStartMonth, 1, 0, 0, 0, 0);
      const end = new Date(year, quarterStartMonth + 3, 0, 23, 59, 59, 999);
      return { startDate: start, endDate: end, label: 'Este trimestre' };
    }

    case PERIOD_FILTER_TYPES.PREVIOUS_QUARTER: {
      const quarterStartMonth = Math.floor(month / 3) * 3;
      const start = new Date(year, quarterStartMonth - 3, 1, 0, 0, 0, 0);
      const end = new Date(year, quarterStartMonth, 0, 23, 59, 59, 999);
      return { startDate: start, endDate: end, label: 'Trimestre anterior' };
    }

    case PERIOD_FILTER_TYPES.THIS_YEAR:
      return {
        startDate: new Date(year, 0, 1, 0, 0, 0, 0),
        endDate: new Date(year, 11, 31, 23, 59, 59, 999),
        label: 'Este ano',
      };

    case PERIOD_FILTER_TYPES.PREVIOUS_YEAR:
      return {
        startDate: new Date(year - 1, 0, 1, 0, 0, 0, 0),
        endDate: new Date(year - 1, 11, 31, 23, 59, 59, 999),
        label: 'Ano anterior',
      };

    case PERIOD_FILTER_TYPES.CUSTOM: {
      if (customStartDate && customEndDate) {
        const startDate = startOfDay(customStartDate);
        const endDate = endOfDay(customEndDate);

        if (startDate <= endDate) {
          return {
            startDate,
            endDate,
            label: `Personalizado: ${formatDate(startDate)} a ${formatDate(endDate)}`,
          };
        }
      }

      return {
        startDate: startOfDay(now),
        endDate: endOfDay(now),
        label: 'Personalizado (datas inválidas)',
      };
    }

    default:
      return {
        startDate: startOfDay(now),
        endDate: endOfDay(now),
        label: 'Este dia',
      };
  }
};
