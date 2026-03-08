import React from 'react';
import KpiCard from './KpiCard';
import { formatCurrency } from './formatters';

const ResumoGerencialSection = ({
  dark,
  resumoGerencial,
  activeContracts,
  startedInPeriodContracts,
  rescindedInPeriodContracts,
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
    <section>
      <h2 className={`text-lg font-semibold mb-3 ${dark ? 'text-white' : 'text-neutral-900'}`}>Resumo Gerencial</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          dark={dark}
          label="VGV total da carteira"
          value={formatCurrency(resumoGerencial.vgvTotalCarteira)}
          valueClassName="text-xl"
          onClick={() => openDetails('VGV total da carteira', activeContracts)}
        />
        <KpiCard
          dark={dark}
          label="Total de contratos fechados"
          value={resumoGerencial.totalContratosFechados}
          onClick={() => openDetails('Total de contratos fechados', startedInPeriodContracts)}
        />
        <KpiCard
          dark={dark}
          label="Novos contratos do período"
          value={resumoGerencial.novosContratosPeriodo}
          onClick={() => openDetails('Novos contratos do período', startedInPeriodContracts)}
        />
        <KpiCard
          dark={dark}
          label="Volume financeiro gerado (VGL)"
          value={formatCurrency(resumoGerencial.volumeFinanceiroGeradoVgl)}
          valueClassName="text-xl"
          onClick={() => openDetails('Volume financeiro gerado (VGL)', startedInPeriodContracts)}
        />
        <KpiCard
          dark={dark}
          label="Rescisões do período"
          value={resumoGerencial.rescisoesPeriodo}
          onClick={() => openDetails('Rescisões do período', rescindedInPeriodContracts)}
        />
        <KpiCard
          dark={dark}
          label="Churn financeiro (valor)"
          value={formatCurrency(resumoGerencial.churnFinanceiroValor)}
          valueClassName="text-xl"
          onClick={() => openDetails('Churn financeiro (valor)', rescindedInPeriodContracts)}
        />
      </div>
    </section>
  );
};

export default ResumoGerencialSection;
