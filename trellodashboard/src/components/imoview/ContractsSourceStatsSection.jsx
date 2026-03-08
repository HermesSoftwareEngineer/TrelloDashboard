import React from 'react';

const ContractsSourceStatsSection = ({
  dark,
  totalCards,
  cardsWithLocatarioCode,
  requestTargetsCount,
  allContracts,
  contractsWithLocatarioCodeList,
  onOpenContractsDetails,
}) => {
  const boxClass = `rounded-lg p-2 text-left transition-colors ${dark ? 'hover:bg-neutral-900/80' : 'hover:bg-neutral-50'}`;

  const openDetails = (title, contracts) => {
    if (!onOpenContractsDetails) return;
    onOpenContractsDetails({
      title,
      subtitle: 'Indicador selecionado',
      contracts,
    });
  };

  return (
    <section className={`rounded-2xl border p-4 ${dark ? 'border-neutral-800 bg-neutral-900/40' : 'border-neutral-200 bg-white'}`}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <button type="button" className={boxClass} onClick={() => openDetails('Cards LOCAÇÃO/RESCISÃO (contratos relacionados)', allContracts)}>
          <p className={`text-xs uppercase tracking-widest ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>Cards LOCAÇÃO/RESCISÃO</p>
          <p className={`text-lg font-semibold ${dark ? 'text-white' : 'text-neutral-900'}`}>{totalCards}</p>
        </button>
        <button type="button" className={boxClass} onClick={() => openDetails('Com cod. locatário', contractsWithLocatarioCodeList)}>
          <p className={`text-xs uppercase tracking-widest ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>Com cod. locatario</p>
          <p className={`text-lg font-semibold ${dark ? 'text-white' : 'text-neutral-900'}`}>{cardsWithLocatarioCode}</p>
        </button>
        <button type="button" className={boxClass} onClick={() => openDetails('Consultas Imoview (locatário+contrato)', allContracts)}>
          <p className={`text-xs uppercase tracking-widest ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>Consultas Imoview (locatario+contrato)</p>
          <p className={`text-lg font-semibold ${dark ? 'text-white' : 'text-neutral-900'}`}>{requestTargetsCount}</p>
        </button>
      </div>
    </section>
  );
};

export default ContractsSourceStatsSection;
