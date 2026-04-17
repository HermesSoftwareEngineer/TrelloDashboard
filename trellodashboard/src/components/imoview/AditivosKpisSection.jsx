import React from 'react';
import KpiCard from './KpiCard';
import { formatCurrency } from './formatters';

const AditivosKpisSection = ({
  dark,
  aditivosConcluidosNoPeriodo,
  aditivosIniciadosNoPeriodo,
  aditivosConcluidosNoPeriodoCards,
  aditivosIniciadosNoPeriodoCards,
  valorAluguelContratosAditivosConcluidos,
  valorAluguelContratosAditivosIniciados,
  contratosComAditivosConcluidos,
  contratosComAditivosIniciados,
  onOpenContractsDetails,
  onOpenCardsDetails,
}) => {
  const openDetails = (title, contracts) => {
    if (!onOpenContractsDetails) return;
    onOpenContractsDetails({
      title,
      subtitle: 'Indicador de aditivos',
      contracts,
    });
  };

  const openCardsDetails = (title, cards, dateField) => {
    if (!onOpenCardsDetails) return;
    onOpenCardsDetails({
      title,
      subtitle: 'Cards de aditivos',
      sections: [
        {
          title: 'Cards encontrados',
          cards,
          dotColor: 'bg-amber-500',
          accentColor: 'text-amber-400',
          badgeColor: 'bg-amber-500/15 text-amber-400',
          dateField,
        },
      ],
    });
  };

  return (
    <section>
      <h2 className={`text-lg font-semibold mb-3 ${dark ? 'text-white' : 'text-neutral-900'}`}>Aditivos no período</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          dark={dark}
          label="Aditivos concluídos no período"
          value={aditivosConcluidosNoPeriodo}
          onClick={() => openCardsDetails('Aditivos concluídos no período', aditivosConcluidosNoPeriodoCards, 'due')}
        />
        <KpiCard
          dark={dark}
          label="Aditivos iniciados no período"
          value={aditivosIniciadosNoPeriodo}
          onClick={() => openCardsDetails('Aditivos iniciados no período', aditivosIniciadosNoPeriodoCards, 'start')}
        />
        <KpiCard
          dark={dark}
          label="Aluguel dos contratos com aditivos concluídos"
          value={formatCurrency(valorAluguelContratosAditivosConcluidos)}
          valueClassName="text-xl"
          onClick={() => openDetails('Contratos com aditivos concluídos no período', contratosComAditivosConcluidos)}
        />
        <KpiCard
          dark={dark}
          label="Aluguel dos contratos com aditivos iniciados"
          value={formatCurrency(valorAluguelContratosAditivosIniciados)}
          valueClassName="text-xl"
          onClick={() => openDetails('Contratos com aditivos iniciados no período', contratosComAditivosIniciados)}
        />
      </div>
    </section>
  );
};

export default AditivosKpisSection;
