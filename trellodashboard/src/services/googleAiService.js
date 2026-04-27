import { traceWithLangSmith } from './langsmithService';

const GOOGLE_AI_API_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY;
const GOOGLE_AI_MODEL = import.meta.env.VITE_GOOGLE_AI_MODEL || 'gemini-2.0-flash';

const DEFAULT_SUMMARY = 'Análise concluída pela IA.';
const DEFAULT_BOTTLENECK_SUMMARY = 'Análise de gargalos concluída pela IA.';

const extractJsonFromText = (rawText) => {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Resposta vazia da IA do Google.');
  }

  try {
    return JSON.parse(rawText);
  } catch {
    // noop
  }

  const fenced = rawText.match(/```json\s*([\s\S]*?)\s*```/i) || rawText.match(/```\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1]);
    } catch {
      // noop
    }
  }

  const start = rawText.indexOf('{');
  const end = rawText.lastIndexOf('}');

  if (start !== -1 && end !== -1 && end > start) {
    const possibleJson = rawText.slice(start, end + 1);
    try {
      return JSON.parse(possibleJson);
    } catch {
      // noop
    }
  }

  throw new Error('Não foi possível interpretar a resposta JSON da IA do Google.');
};

const normalizeScoredActivities = (scoredActivities) => {
  if (!Array.isArray(scoredActivities)) return [];

  return scoredActivities
    .map((item) => ({
      activityIndex: Number(item.activityIndex),
      points: Number(item.points),
      activityType: String(item.activityType || '').trim(),
      reason: String(item.reason || '').trim(),
    }))
    .filter((item) => Number.isInteger(item.activityIndex) && Number.isFinite(item.points));
};

const buildPrompt = ({ activities, pointsTable, instructionPrompt }) => {
  const actionTypes = pointsTable.map((row) => row.action_type);

  return [
    'Você é um avaliador de produtividade de uma equipe que usa Trello.',
    'Responda EXCLUSIVAMENTE em JSON válido, sem markdown e sem texto adicional.',
    '',
    'Instrução principal:',
    instructionPrompt,
    '',
    'Tabela de pontos (action_type -> points):',
    JSON.stringify(pointsTable, null, 2),
    '',
    'Atividades do lote:',
    JSON.stringify(activities, null, 2),
    '',
    'Classifique cada atividade obrigatoriamente em um destes action_type:',
    JSON.stringify(actionTypes),
    '',
    'Metodo de avaliacao obrigatorio por atividade:',
    '1) Identifique a acao principal realizada no texto.',
    '2) Extraia a evidencia textual mais relevante (trecho curto do comentario/item).',
    '3) Selecione o action_type mais aderente entre os permitidos.',
    '4) Aplique os pontos exatos da tabela para esse action_type.',
    '5) Explique a decisao no campo reason com formato padronizado.',
    '',
    'Formato padrao do campo reason (obrigatorio):',
    'Acao: <resumo curto> | Evidencia: <trecho-chave> | Regra: <action_type => X pontos> | Motivo: <justificativa objetiva>.',
    '',
    'Formato do summary (obrigatorio):',
    '- Liste blocos de trabalho avaliados em formato de itens curtos, com pontos e motivo.',
    '- Exemplo: "- Solicitar vistoria: 2 pontos (coordenacao inicial e definicao de data)."',
    '- Exemplo: "- Atualizar cadastro no Imoview: 3 pontos (execucao operacional completa)."',
    '',
    'Formato de resposta obrigatório:',
    JSON.stringify(
      {
        summary: '- Solicitar vistoria: 2 pontos (coordenacao inicial e definicao de data).\n- Atualizar cadastro no Imoview: 3 pontos (execucao operacional completa).',
        scoredActivities: [
          {
            activityIndex: 0,
            points: 2,
            activityType: 'comment_explanatory',
            reason: 'Acao: Solicitar vistoria de entrada | Evidencia: "solicitei vistoria de entrada" | Regra: comment_explanatory => 2 pontos | Motivo: descreve acao operacional clara com contexto.',
          },
        ],
        topActivities: [
          {
            activityIndex: 0,
            points: 2,
            reason: 'Motivo de maior impacto',
          },
        ],
      },
      null,
      2
    ),
    '',
    'Regras:',
    '- Retorne um item em scoredActivities para cada atividade recebida.',
    '- activityIndex deve corresponder ao índice da atividade recebida.',
    '- points deve respeitar a tabela de pontos enviada.',
    '- Se a atividade for checklist, use action_type checklist_completed.',
    '- Nao invente atividades, evidencias ou pontos fora do que foi fornecido.',
    '- Nao deixe o campo reason vazio.',
  ].join('\n');
};

export const analyzeProductivityWithGoogleAI = async ({ activities, pointsTable, instructionPrompt }) => {
  if (!GOOGLE_AI_API_KEY) {
    throw new Error('Configure VITE_GOOGLE_AI_API_KEY para usar a análise de produtividade com IA.');
  }

  const prompt = buildPrompt({ activities, pointsTable, instructionPrompt });

  return traceWithLangSmith({
    name: 'google_ai_productivity_analysis',
    runType: 'llm',
    inputs: {
      model: GOOGLE_AI_MODEL,
      activities_count: activities?.length || 0,
      points_table: pointsTable,
      instruction_prompt: instructionPrompt,
    },
    metadata: {
      provider: 'google-ai-studio',
      feature: 'productivity-analysis',
    },
    tags: ['productivity', 'google-ai'],
    fn: async () => {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_AI_MODEL}:generateContent?key=${GOOGLE_AI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Erro na IA do Google: ${response.status} - ${errorBody}`);
      }

      const payload = await response.json();
      const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n') || '';
      const parsed = extractJsonFromText(text);

      return {
        summary: String(parsed.summary || DEFAULT_SUMMARY),
        scoredActivities: normalizeScoredActivities(parsed.scoredActivities),
        topActivities: Array.isArray(parsed.topActivities) ? parsed.topActivities : [],
      };
    },
    mapOutputs: (result) => ({
      summary: result.summary,
      scored_activities_count: result.scoredActivities?.length || 0,
      top_activities_count: result.topActivities?.length || 0,
    }),
  });
};

const buildBottleneckPrompt = ({ userPrompt, context }) => {
  const safeContext = {
    boardName: context?.boardName || '',
    generatedAt: context?.generatedAt || new Date().toISOString(),
    totalCards: Number(context?.totalCards || 0),
    cardsWithBottleneck: Number(context?.cardsWithBottleneck || 0),
    cardsWithoutBottleneck: Number(context?.cardsWithoutBottleneck || 0),
    cards: Array.isArray(context?.cards) ? context.cards : [],
  };

  return [
    'Você é um analista de processos especializado em identificar gargalos operacionais em cards do Trello.',
    'Responda EXCLUSIVAMENTE em JSON válido, sem markdown e sem texto extra.',
    '',
    'Objetivo:',
    'Analisar os gargalos informados nos cards e produzir recomendações práticas e priorizadas.',
    '',
    'Prompt do usuário:',
    String(userPrompt || '').trim(),
    '',
    'Contexto para análise:',
    JSON.stringify(safeContext, null, 2),
    '',
    'Formato obrigatório da resposta JSON:',
    JSON.stringify(
      {
        summary: 'Resumo executivo da situação geral.',
        criticalPoints: [
          'Ponto crítico 1',
          'Ponto crítico 2',
        ],
        recommendations: [
          {
            title: 'Ação recomendada',
            priority: 'alta',
            reason: 'Motivo da recomendação',
            expectedImpact: 'Impacto esperado',
          },
        ],
        highlightedCards: [
          {
            title: 'Nome do card',
            bottleneck: 'Descrição do gargalo',
            priority: 'alta',
            reason: 'Por que é prioritário',
          },
        ],
      },
      null,
      2
    ),
    '',
    'Regras:',
    '- Não invente cards ou dados fora do contexto enviado.',
    '- Seja objetivo e acionável.',
    '- Prioridade deve ser: alta, media ou baixa.',
    '- Se houver poucos dados, sinalize isso no summary.',
  ].join('\n');
};

export const analyzeBottlenecksWithGoogleAI = async ({ userPrompt, context }) => {
  if (!GOOGLE_AI_API_KEY) {
    throw new Error('Configure VITE_GOOGLE_AI_API_KEY para usar a análise de gargalos com IA.');
  }

  const prompt = buildBottleneckPrompt({ userPrompt, context });

  return traceWithLangSmith({
    name: 'google_ai_bottleneck_analysis',
    runType: 'llm',
    inputs: {
      model: GOOGLE_AI_MODEL,
      cards_count: context?.totalCards || 0,
      cards_with_bottleneck: context?.cardsWithBottleneck || 0,
      prompt: userPrompt,
    },
    metadata: {
      provider: 'google-ai-studio',
      feature: 'bottleneck-analysis',
    },
    tags: ['bottleneck', 'google-ai'],
    fn: async () => {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_AI_MODEL}:generateContent?key=${GOOGLE_AI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.3,
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Erro na IA do Google: ${response.status} - ${errorBody}`);
      }

      const payload = await response.json();
      const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n') || '';
      const parsed = extractJsonFromText(text);

      return {
        summary: String(parsed.summary || DEFAULT_BOTTLENECK_SUMMARY),
        criticalPoints: Array.isArray(parsed.criticalPoints) ? parsed.criticalPoints.map((item) => String(item || '').trim()).filter(Boolean) : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        highlightedCards: Array.isArray(parsed.highlightedCards) ? parsed.highlightedCards : [],
      };
    },
    mapOutputs: (result) => ({
      summary: result.summary,
      critical_points_count: result.criticalPoints?.length || 0,
      recommendations_count: result.recommendations?.length || 0,
      highlighted_cards_count: result.highlightedCards?.length || 0,
    }),
  });
};

export default {
  analyzeProductivityWithGoogleAI,
  analyzeBottlenecksWithGoogleAI,
};
