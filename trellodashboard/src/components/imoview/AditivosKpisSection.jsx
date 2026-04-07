import React from 'react';
import KpiCard from './KpiCard';
import { formatCurrency } from './formatters';

const AditivosKpisSection = ({
  dark,
  aditivosConcluidosNoPeriodo,
  aditivosIniciadosNoPeriodo,
  valorAluguelContratosAditivosConcluidos,
  valorAluguelContratosAditivosIniciados,
  contratosComAditivosConcluidos,
  contratosComAditivosIniciados,
  onOpenContractsDetails,
}) => {
  const openDetails = (title, contracts) => {
    if (!onOpenContractsDetails) return;
    onOpenContractsDetails({
      title,
      subtitle: 'Indicador de aditivos',
      contracts,
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
        />
        <KpiCard
          dark={dark}
          label="Aditivos iniciados no período"
          value={aditivosIniciadosNoPeriodo}
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
