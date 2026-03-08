import React from 'react';
import { FiBarChart2 } from 'react-icons/fi';

const NextStepSection = ({ dark }) => {
  return (
    <section className={`rounded-2xl border p-4 ${dark ? 'border-neutral-800 bg-neutral-900/40' : 'border-neutral-200 bg-white'}`}>
      <div className="flex items-start gap-3">
        <FiBarChart2 size={18} className={`mt-0.5 ${dark ? 'text-neutral-300' : 'text-neutral-700'}`} />
        <div>
          <p className={`text-sm font-semibold ${dark ? 'text-white' : 'text-neutral-900'}`}>Proximo passo da trilha LOCAÇÃO</p>
          <p className={`text-sm mt-1 ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>
            A base inicial esta pronta com filtro da tag LOCAÇÃO, leitura dos campos Cod. Contrato / Cod. Locatario / Cod. Imovel e cruzamento com contratos retornados.
          </p>
        </div>
      </div>
    </section>
  );
};

export default NextStepSection;
