import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import KpiCard from './KpiCard';
import ImoviewChartTooltip from './ImoviewChartTooltip';
import { formatCurrency, formatPercent } from './formatters';

const RescisoesChurnSection = ({
  dark,
  rescisoesChurn,
  previsaoRescisoes,
  previsaoTimeline,
  rescindedInPeriodContracts,
  rescindedCaucaoContracts,
  predictedRescissionsInPeriod,
  predictedNext30Days,
  predictedByMonth,
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

  const getPredictedContractsByMonth = (monthKey) => predictedByMonth?.get(monthKey) || [];

  return (
    <section>
      <h2 className={`text-lg font-semibold mb-3 ${dark ? 'text-white' : 'text-neutral-900'}`}>7. Rescisões & Churn</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          dark={dark}
          label="Total de contratos rescindidos"
          value={rescisoesChurn.totalContratosRescindidos}
          onClick={() => openDetails('Total de contratos rescindidos', rescindedInPeriodContracts, 'Indicador selecionado')}
        />
        <KpiCard
          dark={dark}
          label="Valor total que saiu da carteira"
          value={formatCurrency(rescisoesChurn.valorTotalSaiuCarteira)}
          valueClassName="text-xl"
          onClick={() => openDetails('Valor total que saiu da carteira', rescindedInPeriodContracts, 'Indicador selecionado')}
        />
        <KpiCard
          dark={dark}
          label="Ticket médio das rescisões"
          value={formatCurrency(rescisoesChurn.ticketMedioRescisoes)}
          valueClassName="text-xl"
          onClick={() => openDetails('Ticket médio das rescisões', rescindedInPeriodContracts, 'Indicador selecionado')}
        />
        <KpiCard
          dark={dark}
          label="Valor de cauções devolvidas"
          value={formatCurrency(rescisoesChurn.valorCaucoesDevolvidas)}
          valueClassName="text-xl"
          onClick={() => openDetails('Valor de cauções devolvidas', rescindedCaucaoContracts, 'Indicador selecionado')}
        />
        <KpiCard
          dark={dark}
          label="Churn financeiro da carteira"
          value={formatPercent(rescisoesChurn.churnFinanceiroPercentual)}
          onClick={() => openDetails('Churn financeiro da carteira', rescindedInPeriodContracts, 'Indicador selecionado')}
        />
      </div>

      <div className="mt-4">
        <h3 className={`text-base font-semibold mb-3 ${dark ? 'text-white' : 'text-neutral-900'}`}>Subseção: Previsão de Rescisão</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            dark={dark}
            label="Previstas no período"
            value={previsaoRescisoes.totalPrevistasPeriodo}
            onClick={() => openDetails('Previsões de rescisão no período', predictedRescissionsInPeriod, 'Indicador selecionado')}
          />
          <KpiCard
            dark={dark}
            label="Valor previsto de saída"
            value={formatCurrency(previsaoRescisoes.valorPrevistoSaiuCarteira)}
            valueClassName="text-xl"
            onClick={() => openDetails('Valor previsto de saída', predictedRescissionsInPeriod, 'Indicador selecionado')}
          />
          <KpiCard
            dark={dark}
            label="Ticket médio previsto"
            value={formatCurrency(previsaoRescisoes.ticketMedioPrevisto)}
            valueClassName="text-xl"
            onClick={() => openDetails('Ticket médio previsto', predictedRescissionsInPeriod, 'Indicador selecionado')}
          />
          <KpiCard
            dark={dark}
            label="Previstas próximos 30 dias"
            value={previsaoRescisoes.totalPrevistasProximos30Dias}
            onClick={() => openDetails('Previsões de rescisão nos próximos 30 dias', predictedNext30Days, 'Indicador selecionado')}
          />
          <KpiCard
            dark={dark}
            label="Risco financeiro previsto da carteira"
            value={formatPercent(previsaoRescisoes.percentualPrevistoSobreCarteira)}
            onClick={() => openDetails('Risco financeiro previsto da carteira', predictedRescissionsInPeriod, 'Indicador selecionado')}
          />
        </div>

        <article className={`${chartCardClass} mt-4`}>
          <h4 className={`text-base font-semibold mb-4 ${dark ? 'text-white' : 'text-neutral-900'}`}>Evolução de previsões de rescisão</h4>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={previsaoTimeline} margin={{ top: 10, right: 10, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#262626' : '#e5e7eb'} />
                <XAxis dataKey="label" tick={{ fill: dark ? '#a3a3a3' : '#525252', fontSize: 11 }} />
                <YAxis yAxisId="left" allowDecimals={false} tick={{ fill: dark ? '#a3a3a3' : '#525252', fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: dark ? '#a3a3a3' : '#525252', fontSize: 11 }} />
                <Tooltip content={(props) => <ImoviewChartTooltip {...props} dark={dark} />} />
                <Bar
                  yAxisId="left"
                  dataKey="previstas"
                  name="Previstas"
                  fill="#f59e0b"
                  radius={[6, 6, 0, 0]}
                  onClick={(data) => {
                    const monthKey = data?.key || data?.payload?.key;
                    const label = data?.label || data?.payload?.label;
                    if (!monthKey) return;
                    openDetails(`Previsão de rescisão: previstas (${label || monthKey})`, getPredictedContractsByMonth(monthKey));
                  }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="valorPrevisto"
                  name="Valor previsto"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  onClick={(data) => {
                    const monthKey = data?.key || data?.payload?.key;
                    const label = data?.label || data?.payload?.label;
                    if (!monthKey) return;
                    openDetails(`Previsão de rescisão: valor previsto (${label || monthKey})`, getPredictedContractsByMonth(monthKey));
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>
    </section>
  );
};

export default RescisoesChurnSection;
