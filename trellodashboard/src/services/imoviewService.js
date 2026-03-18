const IMOVIEW_API_BASE_URL = import.meta.env.VITE_IMOVIEW_API_BASE_URL || 'https://api.imoview.com.br';
const IMOVIEW_API_KEY = String(import.meta.env.VITE_IMOVIEW_API_KEY || '').trim();
const IMOVIEW_USER_CODE = String(import.meta.env.VITE_IMOVIEW_USER_CODE || '').trim();
const IMOVIEW_API_KEY_HEADER = String(import.meta.env.VITE_IMOVIEW_API_KEY_HEADER || 'chave').trim();
const IMOVIEW_USER_CODE_HEADER = String(import.meta.env.VITE_IMOVIEW_USER_CODE_HEADER || 'codigoUsuario').trim();
const IMOVIEW_INITIAL_ACCESS_CODE = String(import.meta.env.VITE_IMOVIEW_APP_ACCESS_CODE || '').trim();

const MAX_IMOVIEW_PAGE_SIZE = 20;
const MAX_IMOVIEW_SAFE_PAGES = 1000;

let appAccessCode = IMOVIEW_INITIAL_ACCESS_CODE;

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

const shouldUseAppAccessHeader = (path) => {
  const normalizedPath = String(path || '');
  return /\/App_/i.test(normalizedPath) && !/\/App_ValidarAcesso$/i.test(normalizedPath);
};

const buildHeaders = (path) => {
  const headers = {
    accept: 'application/json',
  };

  if (IMOVIEW_API_KEY) {
    headers[IMOVIEW_API_KEY_HEADER] = IMOVIEW_API_KEY;
  }

  if (IMOVIEW_USER_CODE) {
    headers[IMOVIEW_USER_CODE_HEADER] = IMOVIEW_USER_CODE;
  }

  if (shouldUseAppAccessHeader(path)) {
    if (!appAccessCode) {
      throw new Error('codigoacesso nao configurado. Use App_ValidarAcesso antes de consultar endpoints App_.');
    }

    headers.codigoacesso = appAccessCode;
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
    headers: buildHeaders(path),
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
  hasAppAccessCode: Boolean(appAccessCode),
  apiKeyHeader: IMOVIEW_API_KEY_HEADER,
  userCodeHeader: IMOVIEW_USER_CODE_HEADER,
});

export const setAppAccessCode = (codigoAcesso) => {
  appAccessCode = String(codigoAcesso || '').trim();
  return appAccessCode;
};

export const getAppAccessCode = () => appAccessCode;

export const limparAppAccessCode = () => {
  appAccessCode = '';
};

export const validarAcessoApp = async ({ email, senha, senhaMd5 } = {}) => {
  const parsedEmail = String(email || '').trim();
  const parsedSenhaMd5 = String(senhaMd5 || senha || '').trim();

  if (!parsedEmail) {
    throw new Error('Email e obrigatorio para App_ValidarAcesso.');
  }

  if (!parsedSenhaMd5) {
    throw new Error('Senha em MD5 e obrigatoria para App_ValidarAcesso.');
  }

  const response = await fetchFromImoview('/Usuario/App_ValidarAcesso', {
    email: parsedEmail,
    senha: parsedSenhaMd5,
  });

  const receivedAccessCode = String(response?.codigoacesso || '').trim();
  if (!receivedAccessCode) {
    throw new Error('App_ValidarAcesso nao retornou codigoacesso.');
  }

  setAppAccessCode(receivedAccessCode);

  return {
    ...response,
    codigoacesso: receivedAccessCode,
  };
};

const getRequiredUserCode = () => {
  const userCode = toPositiveInteger(IMOVIEW_USER_CODE);
  if (!userCode) {
    throw new Error('VITE_IMOVIEW_USER_CODE e obrigatorio para consultar os endpoints de atendimento.');
  }

  return userCode;
};

const extractListFromResponse = (body) => {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.lista)) return body.lista;

  if (body && typeof body === 'object' && (
    body.codigo !== undefined
    || body.corretor !== undefined
    || body.situacao !== undefined
    || body.datahorainclusao !== undefined
  )) {
    return [body];
  }

  return [];
};

export const retornarCorretoresApp = async ({
  finalidade = 1,
  codigoUnidade = 0,
  codigoEquipe = 0,
  codigoUsuario,
} = {}) => {
  const parsedFinalidade = [1, 2].includes(Number(finalidade)) ? Number(finalidade) : 1;
  const parsedUserCode = toPositiveInteger(codigoUsuario) || getRequiredUserCode();
  const parsedCodigoUnidade = toPositiveInteger(codigoUnidade) || 0;
  const parsedCodigoEquipe = toPositiveInteger(codigoEquipe) || 0;

  return fetchFromImoview('/Usuario/App_RetornarCorretores', {
    codigoUsuario: parsedUserCode,
    finalidade: parsedFinalidade,
    codigoUnidade: parsedCodigoUnidade,
    codigoEquipe: parsedCodigoEquipe,
  });
};

export const retornarAtendimentos = async ({
  numeroPagina = 1,
  numeroRegistros = MAX_IMOVIEW_PAGE_SIZE,
  finalidade = 1,
  situacao = 0,
  fase = 0,
  codigoUnidade,
  codigoCliente,
  codigoCorretor,
  codigoMql,
  codigoMidia,
  codigoTipo,
  dataInicial,
  dataFinal,
  opcaoAtendimento = 1,
  dataHoraInicialUltimaAlteracao,
  dataHoraFinalUltimaAlteracao,
} = {}) => {
  const parsedPage = Math.max(toPositiveInteger(numeroPagina) || 1, 1);
  const parsedPageSize = Math.min(Math.max(toPositiveInteger(numeroRegistros) || MAX_IMOVIEW_PAGE_SIZE, 1), MAX_IMOVIEW_PAGE_SIZE);
  const parsedFinalidade = [1, 2].includes(Number(finalidade)) ? Number(finalidade) : 1;
  const parsedSituacao = Number.isFinite(Number(situacao)) ? Number(situacao) : 0;
  const parsedFase = Number.isFinite(Number(fase)) ? Number(fase) : 0;
  const parsedOpcaoAtendimento = [1, 2].includes(Number(opcaoAtendimento)) ? Number(opcaoAtendimento) : 1;

  return fetchFromImoview('/Atendimento/RetornarAtendimentos', {
    numeroPagina: parsedPage,
    numeroRegistros: parsedPageSize,
    finalidade: parsedFinalidade,
    situacao: parsedSituacao,
    fase: parsedFase,
    codigoUnidade: toPositiveInteger(codigoUnidade) || undefined,
    codigoCliente: toPositiveInteger(codigoCliente) || undefined,
    codigoCorretor: toPositiveInteger(codigoCorretor) || undefined,
    codigoMql: toPositiveInteger(codigoMql) || undefined,
    codigoMidia: toPositiveInteger(codigoMidia) || undefined,
    codigoTipo: toPositiveInteger(codigoTipo) || undefined,
    dataInicial,
    dataFinal,
    opcaoAtendimento: parsedOpcaoAtendimento,
    dataHoraInicialUltimaAlteracao,
    dataHoraFinalUltimaAlteracao,
  });
};

export const retornarTodosAtendimentos = async ({
  numeroRegistros = MAX_IMOVIEW_PAGE_SIZE,
  maxPaginas = MAX_IMOVIEW_SAFE_PAGES,
  ...rest
} = {}) => {
  const pageSize = Math.min(Math.max(toPositiveInteger(numeroRegistros) || MAX_IMOVIEW_PAGE_SIZE, 1), MAX_IMOVIEW_PAGE_SIZE);
  const safeMaxPages = Math.max(toPositiveInteger(maxPaginas) || MAX_IMOVIEW_SAFE_PAGES, 1);

  const responses = [];
  const atendimentos = [];

  let paginaAtual = 1;
  let interrompidoPorLimite = false;

  while (paginaAtual <= safeMaxPages) {
    const body = await retornarAtendimentos({
      ...rest,
      numeroPagina: paginaAtual,
      numeroRegistros: pageSize,
    });

    const listaAtual = extractListFromResponse(body);

    responses.push({
      numeroPagina: paginaAtual,
      quantidade: Number(body?.quantidade) || listaAtual.length,
      body,
    });

    if (listaAtual.length === 0) {
      break;
    }

    atendimentos.push(...listaAtual);
    paginaAtual += 1;
  }

  if (paginaAtual > safeMaxPages) {
    interrompidoPorLimite = true;
  }

  return {
    atendimentos,
    responses,
    paginasConsultadas: responses.length,
    interrompidoPorLimite,
  };
};

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
  setAppAccessCode,
  getAppAccessCode,
  limparAppAccessCode,
  validarAcessoApp,
  retornarContratos,
  retornarContratosPorReferencias,
  retornarContratosPorCodigos,
  retornarCorretoresApp,
  retornarAtendimentos,
  retornarTodosAtendimentos,
};
