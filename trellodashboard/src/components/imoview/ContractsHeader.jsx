import React from 'react';
import { FiRefreshCw } from 'react-icons/fi';

const ContractsHeader = ({ dark, lastUpdateAt, onRefresh, isLoading }) => {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className={`text-2xl font-bold tracking-tight ${dark ? 'text-white' : 'text-neutral-900'}`}>
          Contratos
        </h1>
        <p className={`text-sm mt-1 ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>
          Sessão de contratos usando cards com etiquetas LOCAÇÃO e RESCISÃO e integração com Imoview.
        </p>
        {lastUpdateAt ? (
          <p className={`text-xs mt-2 ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>
            Ultima atualizacao: {lastUpdateAt.toLocaleString('pt-BR')}
          </p>
        ) : null}
      </div>

      <button
        onClick={onRefresh}
        disabled={isLoading}
        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <FiRefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
        Atualizar dados
      </button>
    </header>
  );
};

export default ContractsHeader;
