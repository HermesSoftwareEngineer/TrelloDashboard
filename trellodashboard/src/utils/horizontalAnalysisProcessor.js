import {
  getStartOfWeek,
  getEndOfWeek,
  getStartOfMonth,
  getEndOfMonth,
  getStartOfQuarter,
  getEndOfQuarter,
  getStartOfYear,
  getEndOfYear
} from './periodUtils';
import { calculateDetailedFlowKPIs } from './flowKPIs';
import { generateLabelAnalysisDataset } from './labelAnalysisProcessor';
import { generateListAnalysisDataset } from './listAnalysisProcessor';
import { generateMemberAnalysisDataset } from './memberAnalysisProcessor';

export const HORIZONTAL_GRANULARITY = {
  WEEK: 'week',
  MONTH: 'month',
  QUARTER: 'quarter',
  YEAR: 'year'
};

const formatPeriodLabel = (startDate, endDate, granularity) => {
  switch (granularity) {
    case HORIZONTAL_GRANULARITY.WEEK: {
      const startLabel = startDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit'
      });
      const endLabel = endDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit'
      });
      return `${startLabel} - ${endLabel}`;
    }
    case HORIZONTAL_GRANULARITY.MONTH:
      return startDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
    case HORIZONTAL_GRANULARITY.QUARTER: {
      const quarter = Math.floor(startDate.getMonth() / 3) + 1;
      return `T${quarter} ${startDate.getFullYear()}`;
    }
    case HORIZONTAL_GRANULARITY.YEAR:
      return String(startDate.getFullYear());
    default:
      return startDate.toLocaleDateString('pt-BR');
  }
};

export const buildHorizontalPeriods = (granularity, count, referenceDate = new Date()) => {
  const periods = [];
  const safeCount = Math.max(2, count);

  for (let i = 0; i < safeCount; i += 1) {
    let startDate = null;
    let endDate = null;

    switch (granularity) {
      case HORIZONTAL_GRANULARITY.WEEK: {
        const baseStart = getStartOfWeek(referenceDate);
        startDate = new Date(baseStart);
        startDate.setDate(baseStart.getDate() - (i * 7));
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      }
      case HORIZONTAL_GRANULARITY.MONTH: {
        startDate = getStartOfMonth(new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1));
        endDate = getEndOfMonth(startDate);
        break;
      }
      case HORIZONTAL_GRANULARITY.QUARTER: {
        const currentQuarter = Math.floor(referenceDate.getMonth() / 3) * 3;
        startDate = getStartOfQuarter(new Date(referenceDate.getFullYear(), currentQuarter - (i * 3), 1));
        endDate = getEndOfQuarter(startDate);
        break;
      }
      case HORIZONTAL_GRANULARITY.YEAR: {
        startDate = getStartOfYear(new Date(referenceDate.getFullYear() - i, 0, 1));
        endDate = getEndOfYear(startDate);
        break;
      }
      default:
        break;
    }

    if (startDate && endDate) {
      periods.push({
        startDate,
        endDate,
        label: formatPeriodLabel(startDate, endDate, granularity)
      });
    }
  }

  return periods;
};

export const buildHorizontalAnalysisRows = (cards, periods) => {
  if (!Array.isArray(cards) || !Array.isArray(periods)) return [];

  return periods.map(period => {
    const kpis = calculateDetailedFlowKPIs(cards, period.startDate, period.endDate);
    const labelAnalysis = generateLabelAnalysisDataset(cards, period.startDate, period.endDate);
    const listAnalysis = generateListAnalysisDataset(cards, period.startDate, period.endDate);
    const memberAnalysis = generateMemberAnalysisDataset(cards, period.startDate, period.endDate);

    const topLabel = labelAnalysis.length > 0 ? labelAnalysis[0] : null;
    const topList = listAnalysis.length > 0
      ? listAnalysis.reduce((best, list) => (list.total > best.total ? list : best), listAnalysis[0])
      : null;
    const topMember = memberAnalysis.length > 0 ? memberAnalysis[0] : null;

    return {
      period,
      kpis,
      topLabel,
      topList,
      topMember
    };
  });
};

export const buildMemberTypeEvolution = (cards, periods) => {
  if (!Array.isArray(cards) || !Array.isArray(periods)) return [];

  const memberMap = new Map();

  const getMemberKey = (member) => (member ? member.id : 'no-member');
  const getMemberLabel = (member) => (member ? member.name : 'Sem Responsavel');

  const ensureMember = (member) => {
    const memberId = getMemberKey(member);
    if (!memberMap.has(memberId)) {
      memberMap.set(memberId, {
        memberId,
        memberName: getMemberLabel(member),
        types: new Map(),
        totalCompleted: 0
      });
    }
    return memberMap.get(memberId);
  };

  const ensureType = (memberEntry, type) => {
    const typeId = type ? type.id : 'no-type';
    if (!memberEntry.types.has(typeId)) {
      memberEntry.types.set(typeId, {
        typeId,
        typeName: type ? type.name : 'Sem Tipo',
        typeColor: type ? type.color : 'gray',
        series: periods.map(() => ({ count: 0, totalTime: 0, timeCount: 0 }))
      });
    }
    return memberEntry.types.get(typeId);
  };

  periods.forEach((period, periodIndex) => {
    const start = new Date(period.startDate);
    const end = new Date(period.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const completedInPeriod = cards.filter(card => {
      if (!card.isComplete || !card.completionDate || card.isClosed) return false;
      const completionDate = new Date(card.completionDate);
      return completionDate >= start && completionDate <= end;
    });

    completedInPeriod.forEach(card => {
      const members = card.members && card.members.length > 0 ? card.members : [null];
      const types = card.processTypes && card.processTypes.length > 0 ? card.processTypes : [null];

      members.forEach(member => {
        const memberEntry = ensureMember(member);
        memberEntry.totalCompleted += 1;

        types.forEach(type => {
          const typeEntry = ensureType(memberEntry, type);
          const point = typeEntry.series[periodIndex];
          point.count += 1;
          if (card.processTimeDays !== null && card.processTimeDays >= 0) {
            point.totalTime += card.processTimeDays;
            point.timeCount += 1;
          }
        });
      });
    });
  });

  return Array.from(memberMap.values())
    .map(member => {
      const types = Array.from(member.types.values()).map(type => ({
        typeId: type.typeId,
        typeName: type.typeName,
        typeColor: type.typeColor,
        series: type.series.map(point => ({
          count: point.count,
          avgTime: point.timeCount > 0 ? Number((point.totalTime / point.timeCount).toFixed(2)) : 0
        })),
        totalCount: type.series.reduce((sum, point) => sum + point.count, 0)
      }));

      return {
        memberId: member.memberId,
        memberName: member.memberName,
        totalCompleted: member.totalCompleted,
        types: types.sort((a, b) => b.totalCount - a.totalCount)
      };
    })
    .sort((a, b) => b.totalCompleted - a.totalCompleted);
};
