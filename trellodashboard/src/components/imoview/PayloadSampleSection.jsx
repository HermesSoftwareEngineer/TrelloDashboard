import React from 'react';
import { FiDatabase } from 'react-icons/fi';

const PayloadSampleSection = ({ dark, samplePayload }) => {
  return (
    <section className={`rounded-2xl border p-5 ${dark ? 'border-neutral-800 bg-neutral-900/60' : 'border-neutral-200 bg-white'}`}>
      <div className="flex items-center gap-2 mb-3">
        <FiDatabase className={dark ? 'text-neutral-300' : 'text-neutral-700'} />
        <h2 className={`text-base font-semibold ${dark ? 'text-white' : 'text-neutral-900'}`}>
          Amostra do payload da API
        </h2>
      </div>
      {samplePayload ? (
        <pre className={`max-h-72 overflow-auto rounded-xl p-3 text-xs ${dark ? 'bg-neutral-950 text-neutral-300' : 'bg-neutral-100 text-neutral-800'}`}>
          {JSON.stringify(samplePayload, null, 2)}
        </pre>
      ) : (
        <p className={`text-sm ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>
          Ainda sem resposta valida para exibir. Configure as variaveis do Imoview e clique em atualizar.
        </p>
      )}
    </section>
  );
};

export default PayloadSampleSection;
