import resumoService from './resumoService';
import { supabase } from './goalService';
import { analyzeProductivityWithGoogleAI } from './googleAiService';
import { listDaysInRange, toISODate } from '../utils/productivityPeriodUtils';

const DEFAULT_PRODUCTIVITY_INSTRUCTION_PROMPT = [
  'Analise os comentários e itens de checklist concluídos pelos colaboradores de forma metódica.',
  'Para cada atividade, identifique a ação principal e aplique exatamente um action_type da tabela de pontos.',
  'Considere complexidade, clareza, impacto e evidências explícitas no texto.',
  'A justificativa deve ser objetiva e padronizada neste formato:',
  'Ação: <resumo curto> | Evidência: <trecho-chave> | Regra: <action_type => X pontos> | Motivo: <por que essa regra se aplica>.',
  'Evite justificativas genéricas. Sempre cite o que foi feito e a regra usada para pontuar.',
  'No summary, apresente os principais blocos de trabalho avaliados (ex.: vistoria, cadastro, anexos, contrato), cada um com pontos e motivação.',
  'Some os pontos por colaborador e distribua a pontuação por dia. Retorne os resultados em formato estruturado.',
].join(' ');

const PRODUCTIVITY_INSTRUCTION_PROMPT_FROM_ENV = String(import.meta.env.VITE_PRODUCTIVITY_INSTRUCTION_PROMPT || '').trim();

export const PRODUCTIVITY_INSTRUCTION_PROMPT = PRODUCTIVITY_INSTRUCTION_PROMPT_FROM_ENV || DEFAULT_PRODUCTIVITY_INSTRUCTION_PROMPT;

const PRODUCTIVITY_AI_MAX_ACTIVITIES_PER_CALL = (() => {
  const parsed = Number(import.meta.env.VITE_PRODUCTIVITY_AI_MAX_ACTIVITIES_PER_CALL);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 25;
  }

  return Math.floor(parsed);
})();

export const PRODUCTIVITY_ACTION_TYPES = {
  CHECKLIST_COMPLETED: 'checklist_completed',
  COMMENT_SIMPLE: 'comment_simple',
  COMMENT_EXPLANATORY: 'comment_explanatory',
  COMMENT_TECHNICAL_DECISION: 'comment_technical_decision',
  PROBLEM_SOLVED: 'problem_solved',
};

export const PRODUCTIVITY_ACTION_LABELS = {
  [PRODUCTIVITY_ACTION_TYPES.CHECKLIST_COMPLETED]: 'Checklist concluído',
  [PRODUCTIVITY_ACTION_TYPES.COMMENT_SIMPLE]: 'Comentário simples',
  [PRODUCTIVITY_ACTION_TYPES.COMMENT_EXPLANATORY]: 'Comentário explicativo',
  [PRODUCTIVITY_ACTION_TYPES.COMMENT_TECHNICAL_DECISION]: 'Comentário com decisão técnica',
  [PRODUCTIVITY_ACTION_TYPES.PROBLEM_SOLVED]: 'Resolver problema',
};

export const DEFAULT_PRODUCTIVITY_SETTINGS = [
  { action_type: PRODUCTIVITY_ACTION_TYPES.CHECKLIST_COMPLETED, points: 2 },
  { action_type: PRODUCTIVITY_ACTION_TYPES.COMMENT_SIMPLE, points: 1 },
  { action_type: PRODUCTIVITY_ACTION_TYPES.COMMENT_EXPLANATORY, points: 2 },
  { action_type: PRODUCTIVITY_ACTION_TYPES.COMMENT_TECHNICAL_DECISION, points: 3 },
  { action_type: PRODUCTIVITY_ACTION_TYPES.PROBLEM_SOLVED, points: 5 },
];

const normalizeSettings = (settings) => {
  const map = new Map();
  settings.forEach((setting) => {
    const actionType = String(setting.action_type || '').trim();
    if (!actionType) return;

    map.set(actionType, {
      action_type: actionType,
      points: Number(setting.points) || 0,
    });
  });

  return Array.from(map.values());
};

const chunkArray = (items, size = 500) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const insertInChunks = async (tableName, rows) => {
  if (!rows.length) return;

  const chunks = chunkArray(rows, 500);
  for (const chunk of chunks) {
    const { error } = await supabase.from(tableName).insert(chunk);
    if (error) throw error;
  }
};

const buildMembersMap = (members) => {
  const map = new Map();
  (members || []).forEach((member) => {
    map.set(member.id, member.fullName || member.username || member.id);
  });
  return map;
};

const mapActionsToActivities = (actions, membersMap) => {
  const comments = actions
    .filter((action) => action.type === 'commentCard')
    .map((action) => {
      const collaboratorId = action.memberCreator?.id || null;
      const collaboratorName = collaboratorId
        ? (membersMap.get(collaboratorId) || action.memberCreator?.fullName || action.memberCreator?.username || 'Desconhecido')
        : 'Desconhecido';

      return {
        source_action_id: action.id,
        date: toISODate(action.date),
        date_time: action.date,
        collaborator_id: collaboratorId,
        collaborator_name: collaboratorName,
        type: 'comment',
        card_name: action.data?.card?.name || '',
        item_name: null,
        content: action.data?.text || '',
      };
    });

  const checklistItems = actions
    .filter((action) => action.type === 'updateCheckItemStateOnCard' && action.data?.checkItem?.state === 'complete')
    .map((action) => {
      const collaboratorId = action.memberCreator?.id || null;
      const collaboratorName = collaboratorId
        ? (membersMap.get(collaboratorId) || action.memberCreator?.fullName || action.memberCreator?.username || 'Desconhecido')
        : 'Desconhecido';

      return {
        source_action_id: action.id,
        date: toISODate(action.date),
        date_time: action.date,
        collaborator_id: collaboratorId,
        collaborator_name: collaboratorName,
        type: 'checklist',
        card_name: action.data?.card?.name || '',
        item_name: action.data?.checkItem?.name || '',
        content: null,
      };
    });

  return [...comments, ...checklistItems].sort((a, b) => new Date(a.date_time) - new Date(b.date_time));
};

const inferCommentTypeFallback = (content) => {
  const text = String(content || '').toLowerCase();

  const problemKeywords = ['resolvido', 'resolvida', 'corrigido', 'corrigida', 'consertei', 'bug', 'erro', 'fix', 'hotfix'];
  const technicalKeywords = ['arquitetura', 'decisão', 'tecnico', 'técnico', 'refator', 'api', 'schema', 'modelagem', 'infra'];

  if (problemKeywords.some((keyword) => text.includes(keyword))) {
    return PRODUCTIVITY_ACTION_TYPES.PROBLEM_SOLVED;
  }

  if (technicalKeywords.some((keyword) => text.includes(keyword))) {
    return PRODUCTIVITY_ACTION_TYPES.COMMENT_TECHNICAL_DECISION;
  }

  if (text.length >= 120 || text.includes('\n')) {
    return PRODUCTIVITY_ACTION_TYPES.COMMENT_EXPLANATORY;
  }

  return PRODUCTIVITY_ACTION_TYPES.COMMENT_SIMPLE;
};

const getDefaultActionTypeForActivity = (activity) => {
  if (activity.type === 'checklist') return PRODUCTIVITY_ACTION_TYPES.CHECKLIST_COMPLETED;
  return inferCommentTypeFallback(activity.content);
};

const getSettingsMap = (settings) => {
  const map = new Map();
  settings.forEach((item) => {
    map.set(item.action_type, Number(item.points) || 0);
  });
  return map;
};

const getPointsFromSettings = (actionType, settingsMap) => settingsMap.get(actionType) || 0;

const buildAiInputActivities = (activities) => (
  activities.map((activity, index) => ({
    index,
    date: activity.date,
    collaborator_id: activity.collaborator_id,
    collaborator_name: activity.collaborator_name,
    type: activity.type,
    card_name: activity.card_name,
    item_name: activity.item_name,
    content: activity.content,
  }))
);

const createDailyKey = (date, collaboratorId) => `${date}::${collaboratorId || 'unknown'}`;

const updateDailyAccumulator = (accumulator, activityRows) => {
  const touchedKeys = new Set();

  activityRows.forEach((row) => {
    const key = createDailyKey(row.date, row.collaborator_id);

    if (!accumulator.has(key)) {
      accumulator.set(key, {
        date: row.date,
        collaborator_id: row.collaborator_id,
        collaborator_name: row.collaborator_name,
        points_total: 0,
        checklist_points: 0,
        comment_points: 0,
        ai_summary: '',
      });
    }

    const current = accumulator.get(key);
    current.points_total += row.points;

    if (row.type === 'checklist') {
      current.checklist_points += row.points;
    } else {
      current.comment_points += row.points;
    }

    if (row.ai_reason) {
      current.ai_summary = current.ai_summary
        ? `${current.ai_summary} | ${row.ai_reason}`
        : row.ai_reason;
    }

    touchedKeys.add(key);
  });

  return touchedKeys;
};

const getDailyRowsFromAccumulatorKeys = (accumulator, keys) => (
  Array.from(keys)
    .map((key) => accumulator.get(key))
    .filter(Boolean)
    .map((row) => ({
      ...row,
      ai_summary: String(row.ai_summary || '').slice(0, 500),
    }))
);

const deleteDailyRowsByKeys = async (accumulator, keys) => {
  for (const key of keys) {
    const row = accumulator.get(key);
    if (!row) continue;

    let query = supabase
      .from('productivity_daily')
      .delete()
      .eq('date', row.date);

    if (row.collaborator_id) {
      query = query.eq('collaborator_id', row.collaborator_id);
    } else {
      query = query.is('collaborator_id', null);
    }

    const { error } = await query;
    if (error) throw error;
  }
};

const deleteRangeData = async ({ startISO, endISO, collaboratorIds = [] }) => {
  let activitiesDeleteQuery = supabase
    .from('productivity_activities')
    .delete()
    .gte('date', startISO)
    .lte('date', endISO);

  let dailyDeleteQuery = supabase
    .from('productivity_daily')
    .delete()
    .gte('date', startISO)
    .lte('date', endISO);

  if (collaboratorIds.length > 0) {
    activitiesDeleteQuery = activitiesDeleteQuery.in('collaborator_id', collaboratorIds);
    dailyDeleteQuery = dailyDeleteQuery.in('collaborator_id', collaboratorIds);
  }

  const [{ error: activitiesError }, { error: dailyError }] = await Promise.all([
    activitiesDeleteQuery,
    dailyDeleteQuery,
  ]);

  if (activitiesError) throw activitiesError;
  if (dailyError) throw dailyError;
};

export const getProductivityMembers = async () => {
  const members = await resumoService.getMembers();
  return (members || [])
    .map((member) => ({
      id: member.id,
      fullName: member.fullName || member.username || member.id,
      username: member.username,
      avatarUrl: member.avatarUrl,
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'pt-BR'));
};

export const getProductivitySettings = async () => {
  const { data, error } = await supabase
    .from('productivity_settings')
    .select('id, action_type, points')
    .order('id', { ascending: true });

  if (error) throw error;

  if (!data || data.length === 0) {
    const settingsToInsert = DEFAULT_PRODUCTIVITY_SETTINGS.map((item) => ({
      action_type: item.action_type,
      points: item.points,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('productivity_settings')
      .insert(settingsToInsert)
      .select('id, action_type, points')
      .order('id', { ascending: true });

    if (insertError) throw insertError;
    return inserted || [];
  }

  return data;
};

export const saveProductivitySettings = async (settings) => {
  const normalized = normalizeSettings(settings);

  const { error: deleteError } = await supabase
    .from('productivity_settings')
    .delete()
    .gt('id', 0);

  if (deleteError) throw deleteError;

  const { data, error } = await supabase
    .from('productivity_settings')
    .insert(normalized)
    .select('id, action_type, points')
    .order('id', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const collectProductivityActivities = async ({ startDate, endDate, selectedCollaboratorIds = [], onProgress }) => {
  const members = await getProductivityMembers();
  const membersMap = buildMembersMap(members);

  const days = listDaysInRange(startDate, endDate);
  const selectedSet = new Set(selectedCollaboratorIds);

  const activitiesByDay = [];

  for (let index = 0; index < days.length; index += 1) {
    const day = days[index];
    const actions = await resumoService.getActionsByDate(day);
    let activities = mapActionsToActivities(actions || [], membersMap);

    if (selectedSet.size > 0) {
      activities = activities.filter((activity) => activity.collaborator_id && selectedSet.has(activity.collaborator_id));
    }

    activitiesByDay.push({
      date: toISODate(day),
      activities,
    });

    if (typeof onProgress === 'function') {
      onProgress({
        stage: 'collecting',
        current: index + 1,
        total: days.length,
        date: toISODate(day),
      });
    }
  }

  return {
    members,
    activitiesByDay,
    totalDays: days.length,
  };
};

export const analyzeAndStoreProductivity = async ({
  startDate,
  endDate,
  selectedCollaboratorIds = [],
  settings,
  onProgress,
  onChunkStored,
}) => {
  const activeSettings = settings && settings.length > 0
    ? normalizeSettings(settings)
    : normalizeSettings(await getProductivitySettings());

  const settingsMap = getSettingsMap(activeSettings);

  const { activitiesByDay, totalDays } = await collectProductivityActivities({
    startDate,
    endDate,
    selectedCollaboratorIds,
    onProgress,
  });

  const allActivities = activitiesByDay.flatMap((dayData) => (
    dayData.activities.map((activity) => ({
      ...activity,
      date: activity.date || dayData.date,
    }))
  ));

  const startISO = toISODate(startDate);
  const endISO = toISODate(endDate);

  await deleteRangeData({
    startISO,
    endISO,
    collaboratorIds: selectedCollaboratorIds,
  });

  if (!allActivities.length) {
    if (typeof onProgress === 'function') {
      onProgress({
        stage: 'completed',
        currentChunk: 0,
        totalChunks: 0,
        processedActivities: 0,
        totalActivities: 0,
      });
    }

    return {
      daysProcessed: totalDays,
      activitiesProcessed: 0,
      collaboratorsProcessed: 0,
      aiCalls: 0,
      totalChunks: 0,
      maxActivitiesPerCall: PRODUCTIVITY_AI_MAX_ACTIVITIES_PER_CALL,
    };
  }

  const activityChunks = chunkArray(allActivities, PRODUCTIVITY_AI_MAX_ACTIVITIES_PER_CALL);
  const dailyAccumulator = new Map();
  let processedActivities = 0;
  let aiCalls = 0;

  for (let chunkIndex = 0; chunkIndex < activityChunks.length; chunkIndex += 1) {
    const chunkActivities = activityChunks[chunkIndex];

    const aiResult = await analyzeProductivityWithGoogleAI({
      activities: buildAiInputActivities(chunkActivities),
      pointsTable: activeSettings,
      instructionPrompt: PRODUCTIVITY_INSTRUCTION_PROMPT,
    });

    aiCalls += 1;

    const scoredMap = new Map();
    aiResult.scoredActivities.forEach((scored) => {
      scoredMap.set(scored.activityIndex, scored);
    });

    const activityRowsChunk = chunkActivities.map((activity, activityIndex) => {
      const aiScored = scoredMap.get(activityIndex);
      const fallbackType = getDefaultActionTypeForActivity(activity);
      const actionType = aiScored?.activityType || fallbackType;
      const fallbackPoints = getPointsFromSettings(fallbackType, settingsMap);
      const pointsFromActionType = getPointsFromSettings(actionType, settingsMap);
      const points = Number.isFinite(aiScored?.points)
        ? aiScored.points
        : (pointsFromActionType || fallbackPoints);

      return {
        date: activity.date,
        collaborator_id: activity.collaborator_id,
        collaborator_name: activity.collaborator_name,
        type: activity.type,
        card_name: activity.card_name,
        item_name: activity.item_name,
        content: activity.content,
        points: Number(points) || 0,
        ai_reason: aiScored?.reason || aiResult.summary || '',
      };
    });

    await insertInChunks('productivity_activities', activityRowsChunk);

    const touchedKeys = updateDailyAccumulator(dailyAccumulator, activityRowsChunk);
    await deleteDailyRowsByKeys(dailyAccumulator, touchedKeys);
    await insertInChunks('productivity_daily', getDailyRowsFromAccumulatorKeys(dailyAccumulator, touchedKeys));

    processedActivities += activityRowsChunk.length;

    if (typeof onProgress === 'function') {
      onProgress({
        stage: 'analyzing',
        currentChunk: chunkIndex + 1,
        totalChunks: activityChunks.length,
        processedActivities,
        totalActivities: allActivities.length,
      });
    }

    if (typeof onChunkStored === 'function') {
      await onChunkStored({
        currentChunk: chunkIndex + 1,
        totalChunks: activityChunks.length,
        processedActivities,
        totalActivities: allActivities.length,
      });
    }
  }

  if (typeof onProgress === 'function') {
    onProgress({
      stage: 'completed',
      currentChunk: activityChunks.length,
      totalChunks: activityChunks.length,
      processedActivities,
      totalActivities: allActivities.length,
    });
  }

  return {
    daysProcessed: totalDays,
    activitiesProcessed: processedActivities,
    collaboratorsProcessed: new Set(allActivities.map((row) => row.collaborator_id).filter(Boolean)).size,
    aiCalls,
    totalChunks: activityChunks.length,
    maxActivitiesPerCall: PRODUCTIVITY_AI_MAX_ACTIVITIES_PER_CALL,
  };
};

export const getProductivityDashboardData = async ({
  startDate,
  endDate,
  selectedCollaboratorIds = [],
}) => {
  const startISO = toISODate(startDate);
  const endISO = toISODate(endDate);

  let dailyQuery = supabase
    .from('productivity_daily')
    .select('id, date, collaborator_id, collaborator_name, points_total, checklist_points, comment_points, ai_summary')
    .gte('date', startISO)
    .lte('date', endISO)
    .order('date', { ascending: true });

  let activitiesQuery = supabase
    .from('productivity_activities')
    .select('id, date, collaborator_id, type, card_name, item_name, content, points, ai_reason')
    .gte('date', startISO)
    .lte('date', endISO)
    .order('points', { ascending: false })
    .limit(20);

  if (selectedCollaboratorIds.length > 0) {
    dailyQuery = dailyQuery.in('collaborator_id', selectedCollaboratorIds);
    activitiesQuery = activitiesQuery.in('collaborator_id', selectedCollaboratorIds);
  }

  const [{ data: dailyData, error: dailyError }, { data: activitiesData, error: activitiesError }] = await Promise.all([
    dailyQuery,
    activitiesQuery,
  ]);

  if (dailyError) throw dailyError;
  if (activitiesError) throw activitiesError;

  return {
    dailyData: dailyData || [],
    topActivities: activitiesData || [],
  };
};

export const getProductivityActivityHistory = async ({
  startDate,
  endDate,
  selectedCollaboratorIds = [],
  collaboratorId,
  date,
  activityType,
  limit = 500,
}) => {
  const startISO = toISODate(startDate);
  const endISO = toISODate(endDate);

  let query = supabase
    .from('productivity_activities')
    .select('id, date, collaborator_id, collaborator_name, type, card_name, item_name, content, points, ai_reason')
    .gte('date', startISO)
    .lte('date', endISO)
    .order('date', { ascending: false })
    .order('id', { ascending: false });

  if (selectedCollaboratorIds.length > 0) {
    query = query.in('collaborator_id', selectedCollaboratorIds);
  }

  if (typeof collaboratorId === 'string' && collaboratorId.length > 0) {
    query = query.eq('collaborator_id', collaboratorId);
  }

  if (collaboratorId === null) {
    query = query.is('collaborator_id', null);
  }

  if (typeof date === 'string' && date.length > 0) {
    query = query.eq('date', date);
  }

  if (typeof activityType === 'string' && activityType.length > 0) {
    query = query.eq('type', activityType);
  }

  if (Number.isFinite(limit) && limit > 0) {
    query = query.limit(Math.floor(limit));
  }

  const { data, error } = await query;
  if (error) throw error;

  return data || [];
};

export default {
  PRODUCTIVITY_ACTION_LABELS,
  DEFAULT_PRODUCTIVITY_SETTINGS,
  getProductivityMembers,
  getProductivitySettings,
  saveProductivitySettings,
  collectProductivityActivities,
  analyzeAndStoreProductivity,
  getProductivityDashboardData,
  getProductivityActivityHistory,
};
