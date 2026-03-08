import React, { useEffect } from 'react';
import { formatCurrency } from './formatters';
import { parseImoviewDate, parseImoviewMoney } from '../../utils/imoviewLocacaoProcessor';

const formatDate = (value) => {
  if (!value) return '-';
  const date = parseImoviewDate(value);
  if (!date) return '-';
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
};

const normalizeText = (value) => String(value || '').trim();

const getContractStatus = (contract) => normalizeText(contract?.status) || normalizeText(contract?.situacao) || 'Sem status';

const getTenantNames = (contract) => {
  const fromRoot = Array.isArray(contract?.locatarios) ? contract.locatarios : [];
  const fromProperties = (Array.isArray(contract?.imoveis) ? contract.imoveis : [])
    .flatMap((property) => (Array.isArray(property?.locatarios) ? property.locatarios : []));

  const map = new Map();
  [...fromRoot, ...fromProperties].forEach((tenant) => {
    const key = `${tenant?.codigo || ''}-${normalizeText(tenant?.nome)}`;
    if (!normalizeText(tenant?.nome)) return;
    if (!map.has(key)) {
      map.set(key, normalizeText(tenant?.nome));
    }
  });

  return Array.from(map.values());
};

const getPropertySummary = (property) => {
  const explicitSummary = normalizeText(property?.resumo);
  if (explicitSummary) return explicitSummary;

  const explicitAddress = normalizeText(property?.endereco);
  if (explicitAddress) return explicitAddress;

  const line1 = [normalizeText(property?.logradouro), normalizeText(property?.numero)].filter(Boolean).join(', ');
  const line2 = [normalizeText(property?.bairro), normalizeText(property?.cidade)].filter(Boolean).join(' - ');
  const summary = [line1, line2].filter(Boolean).join(' | ');
  return summary || 'Sem resumo';
};

const getProperties = (contract) => {
  const properties = Array.isArray(contract?.imoveis) ? contract.imoveis : [];
  const map = new Map();

  properties.forEach((property) => {
    const code = property?.codigo ?? '-';
    const summary = getPropertySummary(property);
    const key = `${code}-${summary}`;
    if (!map.has(key)) {
      map.set(key, { code, summary });
    }
  });

  return Array.from(map.values());
};

const getOwners = (contract) => {
  const owners = (Array.isArray(contract?.imoveis) ? contract.imoveis : [])
    .flatMap((property) => (Array.isArray(property?.locadores) ? property.locadores : []));

  const map = new Map();
  owners.forEach((owner) => {
    const code = owner?.codigo ?? '-';
    const name = normalizeText(owner?.nome) || 'Sem nome';
    const key = `${code}-${name}`;
    if (!map.has(key)) {
      map.set(key, { code, name });
    }
  });

  return Array.from(map.values());
};

const getGuaranteeForm = (contract) => {
  return normalizeText(contract?.garantialocaticia?.forma)
    || normalizeText(contract?.garantia)
    || 'Nao informado';
};

const getRescissionOrPredictionDate = (contract) => {
  if (contract?.datarescisao) return { label: 'Rescisao', value: contract.datarescisao };
  if (contract?.dataprevisaorescisao) return { label: 'Previsao', value: contract.dataprevisaorescisao };
  return { label: '-', value: null };
};

const ContractsDrilldownModal = ({
  dark,
  isOpen,
  title,
  subtitle,
  contracts = [],
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.72)' }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full max-w-[95vw] xl:max-w-[92vw] max-h-[90vh] rounded-2xl border shadow-2xl flex flex-col ${
          dark ? 'border-neutral-800 bg-neutral-950' : 'border-neutral-200 bg-white'
        }`}
      >
        <header className={`px-5 py-4 border-b flex items-start justify-between gap-4 ${dark ? 'border-neutral-800' : 'border-neutral-200'}`}>
          <div>
            <p className={`text-xs uppercase tracking-widest ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>
              {subtitle || 'Detalhamento'}
            </p>
            <h2 className={`text-lg font-bold mt-1 ${dark ? 'text-white' : 'text-neutral-900'}`}>{title}</h2>
            <p className={`text-xs mt-1 ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>
              {contracts.length} contrato(s)
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              dark ? 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            Fechar
          </button>
        </header>

        <div className="overflow-auto p-4">
          {contracts.length === 0 ? (
            <p className={`text-sm italic ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>
              Nenhum contrato encontrado para este recorte.
            </p>
          ) : (
            <table className={`w-full min-w-[1280px] text-xs ${dark ? 'text-neutral-200' : 'text-neutral-800'}`}>
              <thead>
                <tr className={`${dark ? 'bg-neutral-900' : 'bg-neutral-100'}`}>
                  <th className="text-left px-3 py-2 font-semibold">Cod contrato</th>
                  <th className="text-left px-3 py-2 font-semibold">Situacao</th>
                  <th className="text-left px-3 py-2 font-semibold">Locatario (nome)</th>
                  <th className="text-left px-3 py-2 font-semibold">Valor de aluguel</th>
                  <th className="text-left px-3 py-2 font-semibold">Imoveis (codigo e resumo)</th>
                  <th className="text-left px-3 py-2 font-semibold">Locadores (codigo e nome)</th>
                  <th className="text-left px-3 py-2 font-semibold">Data de inicio</th>
                  <th className="text-left px-3 py-2 font-semibold">Data de rescisao ou previsao</th>
                  <th className="text-left px-3 py-2 font-semibold">Forma de garantia</th>
                </tr>
              </thead>

              <tbody>
                {contracts.map((contract, index) => {
                  const tenants = getTenantNames(contract);
                  const properties = getProperties(contract);
                  const owners = getOwners(contract);
                  const rescissionOrPrediction = getRescissionOrPredictionDate(contract);

                  return (
                    <tr key={`${contract?.codigo || 'sem-codigo'}-${index}`} className={`border-b ${dark ? 'border-neutral-800' : 'border-neutral-200'}`}>
                      <td className="px-3 py-2">{contract?.codigo ?? '-'}</td>
                      <td className="px-3 py-2">{getContractStatus(contract)}</td>
                      <td className="px-3 py-2">{tenants.length > 0 ? tenants.join(', ') : '-'}</td>
                      <td className="px-3 py-2">{formatCurrency(parseImoviewMoney(contract?.valoraluguel))}</td>
                      <td className="px-3 py-2">
                        {properties.length > 0 ? (
                          <div className="space-y-1">
                            {properties.map((property) => (
                              <p key={`${property.code}-${property.summary}`}>
                                <strong>{property.code}</strong>: {property.summary}
                              </p>
                            ))}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-3 py-2">
                        {owners.length > 0 ? (
                          <div className="space-y-1">
                            {owners.map((owner) => (
                              <p key={`${owner.code}-${owner.name}`}>
                                <strong>{owner.code}</strong>: {owner.name}
                              </p>
                            ))}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-3 py-2">{formatDate(contract?.datainicio)}</td>
                      <td className="px-3 py-2">
                        {rescissionOrPrediction.label === '-' ? '-' : `${rescissionOrPrediction.label}: ${formatDate(rescissionOrPrediction.value)}`}
                      </td>
                      <td className="px-3 py-2">{getGuaranteeForm(contract)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractsDrilldownModal;
