import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ImoviewChartTooltip from './ImoviewChartTooltip';

const CHART_COLORS = ['#ef4444', '#f97316', '#10b981', '#3b82f6', '#14b8a6', '#f59e0b', '#a855f7'];

const StatusChartsSection = ({
  dark,
  statusChartData,
  rentByStatusData,
  timelineData,
  contractsByStatus,
  contractsByStartMonth,
  onOpenContractsDetails,
}) => {
  const chartCardClass = `rounded-2xl border p-5 ${dark ? 'border-neutral-800 bg-neutral-900/60' : 'border-neutral-200 bg-white'}`;

  const openDetails = (title, contracts, subtitle = 'Segmento do gráfico') => {
    if (!onOpenContractsDetails) return;
    onOpenContractsDetails({
      title,
      subtitle,
      contracts,
    });
  };

  const getStatusContracts = (status) => contractsByStatus?.get(status) || [];
  const getMonthContracts = (key) => contractsByStartMonth?.get(key) || [];

  return (
    <>
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className={chartCardClass}>
          <h2 className={`text-base font-semibold mb-4 ${dark ? 'text-white' : 'text-neutral-900'}`}>Distribuicao por status</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusChartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={2}
                  onClick={(data) => {
                    const status = data?.name || data?.payload?.name;
                    if (!status) return;
                    openDetails(`Distribuição por status: ${status}`, getStatusContracts(status));
                  }}
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={(props) => <ImoviewChartTooltip {...props} dark={dark} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className={chartCardClass}>
          <h2 className={`text-base font-semibold mb-4 ${dark ? 'text-white' : 'text-neutral-900'}`}>Valor de aluguel por status</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rentByStatusData} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#262626' : '#e5e7eb'} />
                <XAxis dataKey="status" angle={-22} textAnchor="end" height={60} tick={{ fill: dark ? '#a3a3a3' : '#525252', fontSize: 11 }} />
                <YAxis tick={{ fill: dark ? '#a3a3a3' : '#525252', fontSize: 11 }} />
                <Tooltip content={(props) => <ImoviewChartTooltip {...props} dark={dark} />} />
                <Bar
                  dataKey="totalRent"
                  name="Aluguel total"
                  fill="#ef4444"
                  radius={[6, 6, 0, 0]}
                  onClick={(data) => {
                    const status = data?.status || data?.payload?.status;
                    if (!status) return;
                    openDetails(`Valor de aluguel por status: ${status}`, getStatusContracts(status));
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className={chartCardClass}>
        <h2 className={`text-base font-semibold mb-4 ${dark ? 'text-white' : 'text-neutral-900'}`}>Evolucao de inicio de contratos</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timelineData} margin={{ top: 10, right: 10, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#262626' : '#e5e7eb'} />
              <XAxis dataKey="label" tick={{ fill: dark ? '#a3a3a3' : '#525252', fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fill: dark ? '#a3a3a3' : '#525252', fontSize: 11 }} />
              <Tooltip content={(props) => <ImoviewChartTooltip {...props} dark={dark} />} />
              <Line
                dataKey="contratos"
                name="Contratos"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 3 }}
                onClick={(data) => {
                  const monthKey = data?.key || data?.payload?.key;
                  const label = data?.label || data?.payload?.label;
                  if (!monthKey) return;
                  openDetails(`Evolução de início de contratos: ${label || monthKey}`, getMonthContracts(monthKey));
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </>
  );
};

export default StatusChartsSection;
