import React from 'react';
import KpiCard from './KpiCard';
import { formatCurrency } from './formatters';

const PortfolioKpisSection = ({
  dark,
  contractsCount,
  activeContractsCount,
  totalRent,
  averageRent,
  coveragePercent,
  allContracts,
  activeContracts,
  linkedContracts,
  onOpenContractsDetails,
}) => {
  const openDetails = (title, contracts) => {
    if (!onOpenContractsDetails) return;
    onOpenContractsDetails({
      title,
      subtitle: 'Indicador selecionado',
      contracts,
    });
  };

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
      <KpiCard dark={dark} label="Contratos retornados" value={contractsCount} onClick={() => openDetails('Contratos retornados', allContracts)} />
      <KpiCard dark={dark} label="Contratos ativos" value={activeContractsCount} onClick={() => openDetails('Contratos ativos', activeContracts)} />
      <KpiCard dark={dark} label="Aluguel total" value={formatCurrency(totalRent)} valueClassName="text-xl" onClick={() => openDetails('Aluguel total', allContracts)} />
      <KpiCard dark={dark} label="Aluguel medio" value={formatCurrency(averageRent)} valueClassName="text-xl" onClick={() => openDetails('Aluguel médio', allContracts)} />
      <KpiCard dark={dark} label="Cobertura Trello x API" value={`${coveragePercent}%`} onClick={() => openDetails('Cobertura Trello x API', linkedContracts)} />
    </section>
  );
};

export default PortfolioKpisSection;
