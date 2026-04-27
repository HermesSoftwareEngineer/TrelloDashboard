import resumoService from './resumoService';
import { listDaysInRange, toISODate } from '../utils/productivityPeriodUtils';

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
        id: action.id,
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
        id: action.id,
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

const createDailyKey = (date, collaboratorId) => `${date}::${collaboratorId || 'unknown'}`;

const buildDailyData = (activityRows) => {
  const dailyMap = new Map();

  activityRows.forEach((row) => {
    const key = createDailyKey(row.date, row.collaborator_id);

    if (!dailyMap.has(key)) {
      dailyMap.set(key, {
        id: `daily_${key}`,
        date: row.date,
        collaborator_id: row.collaborator_id,
        collaborator_name: row.collaborator_name,
        total_activities: 0,
        checklist_count: 0,
        comment_count: 0,
      });
    }

    const current = dailyMap.get(key);
    current.total_activities += 1;

    if (row.type === 'checklist') {
      current.checklist_count += 1;
    } else {
      current.comment_count += 1;
    }
  });

  return Array.from(dailyMap.values()).sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;

    return String(a.collaborator_name || a.collaborator_id || '').localeCompare(
      String(b.collaborator_name || b.collaborator_id || ''),
      'pt-BR'
    );
  });
};

const getTopActivities = (activityRows, limit = 20) => (
  [...activityRows]
    .sort((a, b) => {
      const dateCompare = String(b.date_time || '').localeCompare(String(a.date_time || ''));
      if (dateCompare !== 0) return dateCompare;
      return String(b.id || '').localeCompare(String(a.id || ''));
    })
    .slice(0, limit)
);

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

export const collectProductivityActivities = async ({ startDate, endDate, selectedCollaboratorIds = [], onProgress }) => {
  const members = await getProductivityMembers();
  const membersMap = buildMembersMap(members);

  const startISO = toISODate(startDate);
  const endISO = toISODate(endDate);
  const days = listDaysInRange(startISO, endISO);
  const selectedSet = new Set(selectedCollaboratorIds);

  const actions = await resumoService.getActionsInRange(startISO, endISO);

  let mappedActivities = mapActionsToActivities(actions || [], membersMap).filter(
    (activity) => activity.date >= startISO && activity.date <= endISO
  );

  if (selectedSet.size > 0) {
    mappedActivities = mappedActivities.filter((activity) => activity.collaborator_id && selectedSet.has(activity.collaborator_id));
  }

  const groupedByDate = new Map();
  mappedActivities.forEach((activity) => {
    if (!groupedByDate.has(activity.date)) {
      groupedByDate.set(activity.date, []);
    }

    groupedByDate.get(activity.date).push(activity);
  });

  const activitiesByDay = [];

  for (let index = 0; index < days.length; index += 1) {
    const day = days[index];
    const isoDay = toISODate(day);

    activitiesByDay.push({
      date: isoDay,
      activities: groupedByDate.get(isoDay) || [],
    });

    if (typeof onProgress === 'function') {
      onProgress({
        stage: 'collecting',
        current: index + 1,
        total: days.length,
        date: isoDay,
      });
    }
  }

  return {
    members,
    activitiesByDay,
    totalDays: days.length,
  };
};

export const getProductivityDashboardData = async ({
  startDate,
  endDate,
  selectedCollaboratorIds = [],
  onProgress,
}) => {
  const { activitiesByDay } = await collectProductivityActivities({
    startDate,
    endDate,
    selectedCollaboratorIds,
    onProgress,
  });

  const activityRows = activitiesByDay.flatMap((dayData) => (
    dayData.activities.map((activity, index) => ({
      ...activity,
      id: `${activity.id || 'activity'}_${dayData.date}_${index}`,
      date: activity.date || dayData.date,
    }))
  ));

  const dailyData = buildDailyData(activityRows);
  const topActivities = getTopActivities(activityRows, 20);

  return {
    dailyData,
    topActivities,
    activityRows,
  };
};

export const getProductivitySummaryData = async ({
  startDate,
  endDate,
  selectedCollaboratorIds = [],
}) => {
  const startISO = toISODate(startDate);
  const endISO = toISODate(endDate);
  const selectedSet = new Set(selectedCollaboratorIds);

  const [actions, cardsWithChecklists] = await Promise.all([
    resumoService.getActionsInRange(startISO, endISO),
    resumoService.getCardsWithChecklists(),
  ]);

  const summaryMap = new Map();

  const ensureRow = (date, collaboratorId, collaboratorName = null) => {
    const key = `${date}::${collaboratorId || 'unknown'}`;

    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        date,
        collaborator_id: collaboratorId,
        collaborator_name: collaboratorName,
        completed_count: 0,
        pending_count: 0,
        comment_count: 0,
      });
    }

    const row = summaryMap.get(key);
    if (!row.collaborator_name && collaboratorName) {
      row.collaborator_name = collaboratorName;
    }
    return row;
  };

  (actions || []).forEach((action) => {
    const collaboratorId = action.memberCreator?.id || null;
    const collaboratorName = action.memberCreator?.fullName || action.memberCreator?.username || null;

    if (selectedSet.size > 0 && (!collaboratorId || !selectedSet.has(collaboratorId))) return;

    const date = toISODate(action.date);
    if (date < startISO || date > endISO) return;

    if (action.type === 'updateCheckItemStateOnCard') {
      if (action.data?.checkItem?.state === 'complete') {
        const row = ensureRow(date, collaboratorId, collaboratorName);
        row.completed_count += 1;
      }
      return;
    }

    if (action.type === 'commentCard') {
      const row = ensureRow(date, collaboratorId, collaboratorName);
      row.comment_count += 1;
    }
  });

  (cardsWithChecklists || []).forEach((card) => {
    (card.checklists || []).forEach((checklist) => {
      (checklist.checkItems || []).forEach((item) => {
        if (!item?.due || item.state === 'complete') return;

        const dueDate = toISODate(item.due);
        if (dueDate < startISO || dueDate > endISO) return;

        const collaboratorId = item.idMember || null;
        if (selectedSet.size > 0 && (!collaboratorId || !selectedSet.has(collaboratorId))) return;

        const row = ensureRow(dueDate, collaboratorId);
        row.pending_count += 1;
      });
    });
  });

  return Array.from(summaryMap.values()).sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;

    return String(a.collaborator_name || a.collaborator_id || '').localeCompare(
      String(b.collaborator_name || b.collaborator_id || ''),
      'pt-BR'
    );
  });
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
  const { activityRows } = await getProductivityDashboardData({
    startDate,
    endDate,
    selectedCollaboratorIds,
  });

  let filteredRows = [...activityRows];

  if (typeof collaboratorId === 'string' && collaboratorId.length > 0) {
    filteredRows = filteredRows.filter((row) => row.collaborator_id === collaboratorId);
  }

  if (collaboratorId === null) {
    filteredRows = filteredRows.filter((row) => !row.collaborator_id);
  }

  if (typeof date === 'string' && date.length > 0) {
    filteredRows = filteredRows.filter((row) => row.date === date);
  }

  if (typeof activityType === 'string' && activityType.length > 0) {
    filteredRows = filteredRows.filter((row) => row.type === activityType);
  }

  filteredRows.sort((a, b) => {
    const dateCompare = String(b.date_time || '').localeCompare(String(a.date_time || ''));
    if (dateCompare !== 0) return dateCompare;
    return String(b.id || '').localeCompare(String(a.id || ''));
  });

  if (Number.isFinite(limit) && limit > 0) {
    filteredRows = filteredRows.slice(0, Math.floor(limit));
  }

  return filteredRows;
};

export default {
  getProductivityMembers,
  collectProductivityActivities,
  getProductivityDashboardData,
  getProductivitySummaryData,
  getProductivityActivityHistory,
};
