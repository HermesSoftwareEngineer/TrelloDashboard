const LANGSMITH_TRACING_ENABLED = String(import.meta.env.VITE_LANGSMITH_TRACING || 'false').toLowerCase() === 'true';
const LANGSMITH_API_KEY = import.meta.env.VITE_LANGSMITH_API_KEY;
const LANGSMITH_ENDPOINT = import.meta.env.VITE_LANGSMITH_ENDPOINT || 'https://api.smith.langchain.com';
const LANGSMITH_PROJECT = import.meta.env.VITE_LANGSMITH_PROJECT || 'trellodashboard';
const LANGSMITH_TIMEOUT_MS = Number(import.meta.env.VITE_LANGSMITH_TIMEOUT_MS || 2500);

const buildHeaders = () => ({
  'Content-Type': 'application/json',
  'x-api-key': LANGSMITH_API_KEY,
});

const generateRunId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `run_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const fetchWithTimeout = async (url, options) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LANGSMITH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    return response;
  } finally {
    clearTimeout(timeout);
  }
};

const isTracingConfigured = () => LANGSMITH_TRACING_ENABLED && Boolean(LANGSMITH_API_KEY);

const safeStringifyError = (error) => {
  if (!error) return 'Erro desconhecido';
  if (typeof error === 'string') return error;
  return error.message || JSON.stringify(error);
};

export const startLangSmithRun = async ({
  name,
  runType = 'llm',
  inputs = {},
  metadata = {},
  tags = [],
}) => {
  if (!isTracingConfigured()) return null;

  const runId = generateRunId();
  const payload = {
    id: runId,
    name,
    run_type: runType,
    session_name: LANGSMITH_PROJECT,
    start_time: new Date().toISOString(),
    inputs,
    extra: {
      metadata,
    },
    tags,
  };

  try {
    await fetchWithTimeout(`${LANGSMITH_ENDPOINT}/runs`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(payload),
    });

    return { id: runId };
  } catch (error) {
    console.warn('[LangSmith] Não foi possível iniciar tracing:', safeStringifyError(error));
    return null;
  }
};

export const endLangSmithRun = async ({ run, outputs, error }) => {
  if (!run?.id || !isTracingConfigured()) return;

  const payload = {
    end_time: new Date().toISOString(),
  };

  if (error) {
    payload.error = safeStringifyError(error);
  } else {
    payload.outputs = outputs;
  }

  try {
    await fetchWithTimeout(`${LANGSMITH_ENDPOINT}/runs/${run.id}`, {
      method: 'PATCH',
      headers: buildHeaders(),
      body: JSON.stringify(payload),
    });
  } catch (traceError) {
    console.warn('[LangSmith] Não foi possível finalizar tracing:', safeStringifyError(traceError));
  }
};

export const traceWithLangSmith = async ({
  name,
  runType = 'llm',
  inputs,
  metadata,
  tags,
  fn,
  mapOutputs,
}) => {
  const run = await startLangSmithRun({
    name,
    runType,
    inputs,
    metadata,
    tags,
  });

  try {
    const result = await fn();

    await endLangSmithRun({
      run,
      outputs: typeof mapOutputs === 'function' ? mapOutputs(result) : result,
    });

    return result;
  } catch (error) {
    await endLangSmithRun({
      run,
      error,
    });

    throw error;
  }
};

export default {
  startLangSmithRun,
  endLangSmithRun,
  traceWithLangSmith,
};
