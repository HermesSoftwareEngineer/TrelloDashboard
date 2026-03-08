import React from 'react';
import { FiAlertCircle } from 'react-icons/fi';

const ImoviewErrorBanner = ({ dark, error, runtimeConfig }) => {
  if (!error) return null;

  return (
    <section className={`rounded-2xl border p-4 ${dark ? 'border-red-900/70 bg-red-950/40' : 'border-red-200 bg-red-50'}`}>
      <div className="flex items-start gap-3">
        <FiAlertCircle size={18} className="mt-0.5 text-red-500" />
        <div>
          <p className={`text-sm font-semibold ${dark ? 'text-red-300' : 'text-red-700'}`}>Falha na integracao Imoview</p>
          <p className={`text-sm mt-1 ${dark ? 'text-red-200' : 'text-red-600'}`}>{error}</p>
          <p className={`text-xs mt-2 ${dark ? 'text-red-300/80' : 'text-red-700/80'}`}>
            Header de chave configurado: <code>{runtimeConfig.apiKeyHeader}</code> | Header de usuario: <code>{runtimeConfig.userCodeHeader}</code>
          </p>
        </div>
      </div>
    </section>
  );
};

export default ImoviewErrorBanner;
