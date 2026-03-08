import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import KpiCard from './KpiCard';
import ImoviewChartTooltip from './ImoviewChartTooltip';
import { formatCurrency } from './formatters';

const CHART_COLORS = ['#ef4444', '#f97316', '#10b981', '#3b82f6', '#14b8a6', '#f59e0b', '#a855f7'];

const ProducaoContratualSection = ({
  dark,
  producaoContratual,
  caucaoRecebidaMensal,
  garantias,
  productionTimeline,
  garantiaPieData,
  startedInPeriodContracts,
  startedByMonth,
  rescindedByMonth,
  startedCaucaoContracts,
  startedSeguroFiancaContracts,
  startedOutrasGarantiasContracts,
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

  const getStartedContractsByMonth = (monthKey) => startedByMonth?.get(monthKey) || [];
  const getRescindedContractsByMonth = (monthKey) => rescindedByMonth?.get(monthKey) || [];

  return (
    <section>
      <h2 className={`text-lg font-semibold mb-3 ${dark ? 'text-white' : 'text-neutral-900'}`}>6. Produção Contratual & Financeira (Back Office)</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          dark={dark}
          label="Total de contratos firmados"
          value={producaoContratual.totalContratosFirmados}
          onClick={() => openDetails('Total de contratos firmados', startedInPeriodContracts, 'Indicador selecionado')}
        />
        <KpiCard
          dark={dark}
          label="VGL"
          value={formatCurrency(producaoContratual.vgl)}
          valueClassName="text-xl"
          onClick={() => openDetails('VGL (produção contratual)', startedInPeriodContracts, 'Indicador selecionado')}
        />
        <KpiCard
          dark={dark}
          label="Ticket médio"
          value={formatCurrency(producaoContratual.ticketMedio)}
          valueClassName="text-xl"
          onClick={() => openDetails('Ticket médio (produção contratual)', startedInPeriodContracts, 'Indicador selecionado')}
        />
        <KpiCard
          dark={dark}
          label="Cauções recebidas (total financeiro)"
          value={formatCurrency(caucaoRecebidaMensal)}
          valueClassName="text-xl"
          onClick={() => openDetails('Cauções recebidas (total financeiro)', startedCaucaoContracts, 'Indicador selecionado')}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 mt-4">
        <article className={chartCardClass}>
          <h3 className={`text-base font-semibold mb-4 ${dark ? 'text-white' : 'text-neutral-900'}`}>Produção contratual e financeira</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productionTimeline} margin={{ top: 10, right: 10, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#262626' : '#e5e7eb'} />
                <XAxis dataKey="label" tick={{ fill: dark ? '#a3a3a3' : '#525252', fontSize: 11 }} />
                <YAxis yAxisId="left" allowDecimals={false} tick={{ fill: dark ? '#a3a3a3' : '#525252', fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: dark ? '#a3a3a3' : '#525252', fontSize: 11 }} />
                <Tooltip content={(props) => <ImoviewChartTooltip {...props} dark={dark} />} />
                <Bar
                  yAxisId="left"
                  dataKey="novosContratos"
                  name="Contratos novos"
                  fill="#3b82f6"
                  radius={[6, 6, 0, 0]}
                  onClick={(data) => {
                    const monthKey = data?.key || data?.payload?.key;
                    const label = data?.label || data?.payload?.label;
                    if (!monthKey) return;
                    openDetails(`Produção contratual: contratos novos (${label || monthKey})`, getStartedContractsByMonth(monthKey));
                  }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="rescisoes"
                  name="Rescisões"
                  fill="#ef4444"
                  radius={[6, 6, 0, 0]}
                  onClick={(data) => {
                    const monthKey = data?.key || data?.payload?.key;
                    const label = data?.label || data?.payload?.label;
                    if (!monthKey) return;
                    openDetails(`Produção contratual: rescisões (${label || monthKey})`, getRescindedContractsByMonth(monthKey));
                  }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="vgl"
                  name="VGL"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  onClick={(data) => {
                    const monthKey = data?.key || data?.payload?.key;
                    const label = data?.label || data?.payload?.label;
                    if (!monthKey) return;
                    openDetails(`Produção contratual: VGL (${label || monthKey})`, getStartedContractsByMonth(monthKey));
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className={chartCardClass}>
          <h3 className={`text-base font-semibold mb-4 ${dark ? 'text-white' : 'text-neutral-900'}`}>Garantias utilizadas</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={garantiaPieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={2}
                  onClick={(data) => {
                    const guaranteeName = data?.name || data?.payload?.name;
                    if (!guaranteeName) return;

                    if (guaranteeName === 'Caucao') {
                      openDetails('Garantias utilizadas: Caução', startedCaucaoContracts);
                      return;
                    }

                    if (guaranteeName === 'Seguro fianca') {
                      openDetails('Garantias utilizadas: Seguro fiança', startedSeguroFiancaContracts);
                      return;
                    }

                    openDetails('Garantias utilizadas: Outras', startedOutrasGarantiasContracts);
                  }}
                >
                  {garantiaPieData.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={(props) => <ImoviewChartTooltip {...props} dark={dark} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <button
              type="button"
              onClick={() => openDetails('Garantias utilizadas: Caução', startedCaucaoContracts, 'Indicador selecionado')}
              className={`rounded-lg p-2 text-center transition-colors ${dark ? 'bg-neutral-950 text-neutral-300 hover:bg-neutral-900' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}
            >
              <p className="text-xs">Caução</p>
              <p className="font-semibold">{garantias.caucao}</p>
            </button>
            <button
              type="button"
              onClick={() => openDetails('Garantias utilizadas: Seguro fiança', startedSeguroFiancaContracts, 'Indicador selecionado')}
              className={`rounded-lg p-2 text-center transition-colors ${dark ? 'bg-neutral-950 text-neutral-300 hover:bg-neutral-900' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}
            >
              <p className="text-xs">Seguro fiança</p>
              <p className="font-semibold">{garantias.seguroFianca}</p>
            </button>
            <button
              type="button"
              onClick={() => openDetails('Garantias utilizadas: Outras', startedOutrasGarantiasContracts, 'Indicador selecionado')}
              className={`rounded-lg p-2 text-center transition-colors ${dark ? 'bg-neutral-950 text-neutral-300 hover:bg-neutral-900' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}
            >
              <p className="text-xs">Outras</p>
              <p className="font-semibold">{garantias.outras}</p>
            </button>
          </div>
        </article>
      </div>
    </section>
  );
};

export default ProducaoContratualSection;
