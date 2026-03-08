const IMOVIEW_API_BASE_URL = import.meta.env.VITE_IMOVIEW_API_BASE_URL || 'https://api.imoview.com.br';
const IMOVIEW_API_KEY = String(import.meta.env.VITE_IMOVIEW_API_KEY || '').trim();
const IMOVIEW_USER_CODE = String(import.meta.env.VITE_IMOVIEW_USER_CODE || '').trim();
const IMOVIEW_API_KEY_HEADER = String(import.meta.env.VITE_IMOVIEW_API_KEY_HEADER || 'chave').trim();
const IMOVIEW_USER_CODE_HEADER = String(import.meta.env.VITE_IMOVIEW_USER_CODE_HEADER || 'codigoUsuario').trim();

const toPositiveInteger = (value) => {
  const numeric = Number.parseInt(String(value ?? '').replace(/[^\d-]/g, ''), 10);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return numeric;
};

const parseErrorMessage = async (response) => {
  const bodyText = await response.text();

  if (!bodyText) {
    return `Imoview API error: ${response.status}`;
  }

  try {
    const parsed = JSON.parse(bodyText);
    if (typeof parsed?.mensagem === 'string' && parsed.mensagem.trim()) {
      return parsed.mensagem.trim();
    }

    if (typeof parsed?.message === 'string' && parsed.message.trim()) {
      return parsed.message.trim();
    }

    return `Imoview API error: ${response.status}`;
  } catch {
    return `Imoview API error: ${response.status} - ${bodyText}`;
  }
};

const buildHeaders = () => {
  const headers = {
    accept: 'application/json',
  };

  if (IMOVIEW_API_KEY) {
    headers[IMOVIEW_API_KEY_HEADER] = IMOVIEW_API_KEY;
  }

  if (IMOVIEW_USER_CODE) {
    headers[IMOVIEW_USER_CODE_HEADER] = IMOVIEW_USER_CODE;
  }

  return headers;
};

const fetchFromImoview = async (path, query = {}) => {
  const url = new URL(path, IMOVIEW_API_BASE_URL);

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.append(key, String(value));
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return response.json();
};

export const getImoviewRuntimeConfig = () => ({
  baseUrl: IMOVIEW_API_BASE_URL,
  hasApiKey: Boolean(IMOVIEW_API_KEY),
  hasUserCode: Boolean(IMOVIEW_USER_CODE),
  apiKeyHeader: IMOVIEW_API_KEY_HEADER,
  userCodeHeader: IMOVIEW_USER_CODE_HEADER,
});

export const retornarContratos = async ({
  numeroPagina = 1,
  numeroRegistros = 20,
  codigoCliente,
  codigoContrato = 0,
  endereco,
} = {}) => {
  const parsedClientCode = toPositiveInteger(codigoCliente);
  if (!parsedClientCode) {
    throw new Error('codigoCliente (cod. locatario) e obrigatorio e deve ser numerico.');
  }

  const parsedPage = Math.max(toPositiveInteger(numeroPagina) || 1, 1);
  const parsedPageSize = Math.min(Math.max(toPositiveInteger(numeroRegistros) || 20, 1), 20);
  const parsedContractCode = toPositiveInteger(codigoContrato) || 0;

  return fetchFromImoview('/Locatario/RetornarContratos', {
    numeroPagina: parsedPage,
    numeroRegistros: parsedPageSize,
    codigoCliente: parsedClientCode,
    codigoContrato: parsedContractCode,
    mostrarRescindidos: true,
    endereco,
  });
};

export const retornarContratosPorReferencias = async ({
  references = [],
  numeroRegistros = 20,
} = {}) => {
  const targetsMap = new Map();

  (references || []).forEach((reference) => {
    const parsedLocatarioCode = toPositiveInteger(reference?.codigoLocatario);
    if (!parsedLocatarioCode) return;

    const parsedContractCode = toPositiveInteger(reference?.codigoContrato) || 0;
    const requestKey = `${parsedLocatarioCode}:${parsedContractCode}`;

    if (!targetsMap.has(requestKey)) {
      targetsMap.set(requestKey, {
        codigoCliente: parsedLocatarioCode,
        codigoLocatario: parsedLocatarioCode,
        codigoContrato: parsedContractCode,
      });
    }
  });

  const requestTargets = Array.from(targetsMap.values());

  if (requestTargets.length === 0) {
    return {
      contracts: [],
      responses: [],
      requestTargets: [],
      quantidadeSomada: 0,
    };
  }

  const responses = [];
  const contracts = [];

  for (const requestTarget of requestTargets) {
    const body = await retornarContratos({
      numeroPagina: 1,
      numeroRegistros,
      codigoCliente: requestTarget.codigoCliente,
      codigoContrato: requestTarget.codigoContrato,
    });

    responses.push({
      codigoCliente: requestTarget.codigoCliente,
      codigoLocatario: requestTarget.codigoLocatario,
      codigoContrato: requestTarget.codigoContrato,
      body,
    });

    if (Array.isArray(body?.lista)) {
      contracts.push(...body.lista);
    }
  }

  const uniqueByCode = new Map();
  contracts.forEach((contract, index) => {
    const key = toPositiveInteger(contract?.codigo) || `row-${index}`;
    if (!uniqueByCode.has(key)) {
      uniqueByCode.set(key, contract);
    }
  });

  return {
    contracts: Array.from(uniqueByCode.values()),
    responses,
    requestTargets,
    quantidadeSomada: responses.reduce((sum, item) => sum + (Number(item?.body?.quantidade) || 0), 0),
  };
};

export const retornarContratosPorCodigos = retornarContratosPorReferencias;

export default {
  getImoviewRuntimeConfig,
  retornarContratos,
  retornarContratosPorReferencias,
  retornarContratosPorCodigos,
};
