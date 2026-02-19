import { useMemo } from 'react';
import {
  buildHorizontalPeriods,
  buildHorizontalAnalysisRows,
  buildMemberTypeEvolution
} from '../utils/horizontalAnalysisProcessor';

const formatNumber = (value) => {
  if (value === null || value === undefined) return '0';
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2);
};

const formatDelta = (delta) => {
  if (!delta) return null;
  const sign = delta.absolute > 0 ? '+' : '';
  const pctSign = delta.percentage > 0 ? '+' : '';
  return `${sign}${formatNumber(delta.absolute)} (${pctSign}${formatNumber(delta.percentage)}%)`;
};

const buildDelta = (current, previous) => {
  if (previous === null || previous === undefined) return null;
  const absolute = current - previous;
  const percentage = previous !== 0
    ? Number(((absolute / previous) * 100).toFixed(1))
    : (current > 0 ? 100 : 0);
  return { absolute, percentage };
};

const HorizontalAnalysisDashboard = ({
  cards,
  dark = true,
  granularity,
  periodsCount
}) => {
  const periods = useMemo(
    () => buildHorizontalPeriods(granularity, periodsCount),
    [granularity, periodsCount]
  );

  const rows = useMemo(
    () => buildHorizontalAnalysisRows(cards, periods),
    [cards, periods]
  );

  const memberEvolution = useMemo(
    () => buildMemberTypeEvolution(cards, periods),
    [cards, periods]
  );

  if (!cards || rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className={`text-sm ${dark ? 'text-neutral-500' : 'text-neutral-400'}`}>
          Sem dados para exibir
        </p>
      </div>
    );
  }

  const columns = [
    { key: 'totalNew', label: 'Novos', get: row => row.kpis.totalNew },
    { key: 'totalCompleted', label: 'Concluidos', get: row => row.kpis.totalCompleted },
    { key: 'totalInProgress', label: 'Em Andamento', get: row => row.kpis.totalInProgress },
    { key: 'avgProcessTime', label: 'Tempo Medio (d)', get: row => row.kpis.avgProcessTime, lowerBetter: true },
    { key: 'avgNewPerDay', label: 'Novos/dia', get: row => row.kpis.avgNewPerDay },
    { key: 'avgCompletedPerDay', label: 'Concluidos/dia', get: row => row.kpis.avgCompletedPerDay },
    { key: 'throughputRate', label: 'Throughput %', get: row => row.kpis.throughput.rate },
    { key: 'netFlow', label: 'Net Flow', get: row => row.kpis.velocity.netFlow },
    { key: 'wipRatio', label: 'WIP/Throughput', get: row => row.kpis.wip.throughputRatio, lowerBetter: true },
    { key: 'topType', label: 'Top Tipo', get: row => row.topLabel ? `${row.topLabel.labelName} (${row.topLabel.avgCompletionTimeDays}d)` : 'N/A', type: 'text' },
    { key: 'topList', label: 'Top Lista', get: row => row.topList ? `${row.topList.listName} (${row.topList.completionRate}%)` : 'N/A', type: 'text' },
    { key: 'topMember', label: 'Top Colaborador', get: row => row.topMember ? `${row.topMember.memberName} (${row.topMember.completionRate}%)` : 'N/A', type: 'text' }
  ];

  const getTrendColor = (delta, lowerBetter) => {
    if (!delta || delta.absolute === 0) return dark ? 'text-neutral-500' : 'text-neutral-400';
    const isPositive = lowerBetter ? delta.absolute < 0 : delta.absolute > 0;
    return isPositive
      ? (dark ? 'text-green-400' : 'text-green-600')
      : (dark ? 'text-red-400' : 'text-red-600');
  };

  const getTrendArrow = (delta, lowerBetter) => {
    if (!delta || delta.absolute === 0) return '•';
    const isPositive = lowerBetter ? delta.absolute < 0 : delta.absolute > 0;
    return isPositive ? '▲' : '▼';
  };

  const getTrendMeta = (delta, lowerBetter) => {
    if (!delta || delta.absolute === 0) {
      return {
        arrow: '•',
        color: dark ? 'text-neutral-500' : 'text-neutral-400'
      };
    }
    const isPositive = lowerBetter ? delta.absolute < 0 : delta.absolute > 0;
    return {
      arrow: isPositive ? '▲' : '▼',
      color: isPositive
        ? (dark ? 'text-green-400' : 'text-green-600')
        : (dark ? 'text-red-400' : 'text-red-600')
    };
  };

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className={`text-xs font-bold uppercase tracking-widest ${
          dark ? 'text-neutral-500' : 'text-neutral-600'
        }`}>
          Dashboard de Analise Horizontal
        </h3>
        <p className={`text-xs mt-1 ${dark ? 'text-neutral-600' : 'text-neutral-500'}`}>
          Comparativo por periodo com indicadores de crescimento/regressao
        </p>
      </div>

      <div className={`overflow-x-auto scrollbar-thin ${dark ? 'scrollbar-dark' : 'scrollbar-light'}`}>
        <table className="min-w-full text-xs border-separate" style={{ borderSpacing: 0 }}>
          <thead>
            <tr>
              <th className={`sticky left-0 z-10 px-3 py-2 text-left ${
                dark ? 'bg-[#0c0c0c] text-neutral-400' : 'bg-white text-neutral-600'
              }`}>
                Periodo
              </th>
              {columns.map(col => (
                <th key={col.key} className={`px-3 py-2 text-left ${
                  dark ? 'text-neutral-400' : 'text-neutral-600'
                }`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const previous = rows[index + 1];

              return (
                <tr key={`${row.period.label}-${index}`} className={dark ? 'border-b border-[#272727]' : 'border-b border-[#e5e5e5]'}>
                  <td className={`sticky left-0 z-10 px-3 py-2 font-semibold ${
                    dark ? 'bg-[#0c0c0c] text-neutral-100' : 'bg-white text-neutral-900'
                  }`}>
                    {row.period.label}
                  </td>
                  {columns.map(col => {
                    const value = col.get(row);
                    if (col.type === 'text') {
                      return (
                        <td key={col.key} className={dark ? 'px-3 py-2 text-neutral-300' : 'px-3 py-2 text-neutral-700'}>
                          {value}
                        </td>
                      );
                    }

                    const numericValue = Number(value || 0);
                    const previousValue = previous ? Number(col.get(previous) || 0) : null;
                    const delta = previousValue !== null ? buildDelta(numericValue, previousValue) : null;
                    const trendColor = getTrendColor(delta, col.lowerBetter);
                    const trendArrow = getTrendArrow(delta, col.lowerBetter);

                    return (
                      <td key={col.key} className="px-3 py-2">
                        <div className={dark ? 'text-neutral-100' : 'text-neutral-900'}>
                          {formatNumber(numericValue)}
                        </div>
                        {delta && (
                          <div className={`text-[11px] ${trendColor}`}>
                            {trendArrow} {formatDelta(delta)}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-8">
        <div className="mb-4">
          <h4 className={`text-xs font-bold uppercase tracking-widest ${
            dark ? 'text-neutral-500' : 'text-neutral-600'
          }`}>
            Analise por Colaborador
          </h4>
          <p className={`text-xs mt-1 ${dark ? 'text-neutral-600' : 'text-neutral-500'}`}>
            Evolucao dos concluidos por tipo e tempo medio por periodo
          </p>
        </div>

        {memberEvolution.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <p className={`text-sm ${dark ? 'text-neutral-500' : 'text-neutral-400'}`}>
              Nenhum colaborador com concluidos no periodo
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {memberEvolution.slice(0, 6).map(member => {
              const topTypes = member.types.slice(0, 6);

              return (
                <div
                  key={member.memberId}
                  className={`rounded-2xl p-4 border ${
                    dark ? 'bg-[#0c0c0c] border-[#272727]' : 'bg-white border-[#e5e5e5]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className={`text-sm font-bold ${dark ? 'text-neutral-100' : 'text-neutral-900'}`}>
                        {member.memberName}
                      </p>
                      <p className={`text-xs ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                        {member.totalCompleted} concluidos no total
                      </p>
                    </div>
                    <span className={`text-[11px] ${dark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                      Concluidos | Tempo medio
                    </span>
                  </div>

                  <div className={`overflow-x-auto scrollbar-thin ${dark ? 'scrollbar-dark' : 'scrollbar-light'}`}>
                    <table className="min-w-full text-[11px]">
                      <thead>
                        <tr>
                          <th className={`text-left py-2 pr-3 ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                            Tipo
                          </th>
                          {periods.map(period => (
                            <th
                              key={`${member.memberId}-${period.label}`}
                              className={`text-left py-2 px-2 ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}
                            >
                              {period.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {topTypes.map(type => (
                          <tr key={`${member.memberId}-${type.typeId}`}>
                            <td className={`py-2 pr-3 ${dark ? 'text-neutral-200' : 'text-neutral-700'}`}>
                              {type.typeName}
                            </td>
                            {type.series.map((point, index) => {
                              const previousPoint = type.series[index + 1];
                              const countDelta = previousPoint
                                ? buildDelta(point.count, previousPoint.count)
                                : null;
                              const timeDelta = previousPoint
                                ? buildDelta(point.avgTime, previousPoint.avgTime)
                                : null;
                              const countTrend = getTrendMeta(countDelta, false);
                              const timeTrend = getTrendMeta(timeDelta, true);

                              return (
                                <td key={`${member.memberId}-${type.typeId}-${index}`} className={dark ? 'py-2 px-2 text-neutral-300' : 'py-2 px-2 text-neutral-700'}>
                                  <div className={dark ? 'text-neutral-100' : 'text-neutral-900'}>
                                    {point.count}x | {formatNumber(point.avgTime)}d
                                  </div>
                                  {countDelta && (
                                    <div className={`text-[12px] ${countTrend.color}`}>
                                      {countTrend.arrow} {formatDelta(countDelta)}
                                    </div>
                                  )}
                                  {timeDelta && (
                                    <div className={`text-[12px] ${timeTrend.color}`}>
                                      {timeTrend.arrow} {formatDelta(timeDelta)}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default HorizontalAnalysisDashboard;
