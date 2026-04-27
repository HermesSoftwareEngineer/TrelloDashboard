import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiRefreshCw, FiX } from 'react-icons/fi';
import { useTheme } from '../contexts/ThemeContext';
import trelloService from '../services/trelloService';
import { analyzeBottlenecksWithGoogleAI } from '../services/googleAiService';

const DEFAULT_BOTTLENECK_PROMPT = String(import.meta.env.VITE_BOTTLENECK_AI_PROMPT || '').trim() || [
  'Analise os gargalos descritos nos cards e identifique os principais padrões.',
  'Priorize os problemas mais críticos para o fluxo operacional.',
  'Sugira ações objetivas e práticas para reduzir o tempo de ciclo e destravar o processo.',
  'Use uma abordagem direta e orientada à execução.',
].join(' ');

const normalizeText = (value = '') => value
  .toString()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const findBottleneckCustomField = (customFields = []) => {
  const target = normalizeText('Maior gargalo do processo');

  return customFields.find((field) => {
    const fieldName = normalizeText(field?.name);
    if (!fieldName) return false;

    return fieldName === target || fieldName.includes(target);
  }) || null;
};

const resolveCustomFieldItemValue = (item, customField) => {
  if (!item) return '-';

  if (item.value?.text !== undefined) return item.value.text || '-';
  if (item.value?.number !== undefined) return item.value.number || '-';
  if (item.value?.date !== undefined) return item.value.date || '-';
  if (item.value?.checked !== undefined) return item.value.checked ? 'Sim' : 'Nao';

  if (item.idValue && Array.isArray(customField?.options)) {
    const option = customField.options.find((opt) => opt.id === item.idValue);
    const optionValue = option?.value;

    if (optionValue?.text !== undefined) return optionValue.text || '-';
    if (optionValue?.color !== undefined) return optionValue.color || '-';
  }

  return '-';
};

const buildMembersLabel = (card, memberMap) => {
  const directMembers = Array.isArray(card?.members) ? card.members : [];
  if (directMembers.length > 0) {
    return directMembers
      .map((member) => member.fullName || member.username || '-')
      .filter(Boolean)
      .join(', ');
  }

  const idMembers = Array.isArray(card?.idMembers) ? card.idMembers : [];
  if (idMembers.length === 0) return '-';

  return idMembers
    .map((memberId) => {
      const member = memberMap.get(memberId);
      return member?.fullName || member?.username || '-';
    })
    .filter(Boolean)
    .join(', ');
};

const buildLabels = (labels = []) => {
  if (!Array.isArray(labels) || labels.length === 0) return [];

  return labels.map((label) => ({
    id: label.id || `${label.name || ''}-${label.color || ''}`,
    text: label.name?.trim() || label.color || 'Etiqueta',
  }));
};

const hasBottleneckDescription = (value) => {
  if (value === null || value === undefined) return false;
  const normalized = String(value).trim();
  return normalized !== '' && normalized !== '-';
};

const BottleneckAnalysisPage = ({ cards = [], customFields = [], members = [] }) => {
  const { dark } = useTheme();

  const [allCards, setAllCards] = useState(cards);
  const [allCustomFields, setAllCustomFields] = useState(customFields);
  const [allMembers, setAllMembers] = useState(members);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [isTagFilterOpen, setIsTagFilterOpen] = useState(false);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [analysisPrompt, setAnalysisPrompt] = useState(DEFAULT_BOTTLENECK_PROMPT);
  const [draftPrompt, setDraftPrompt] = useState(DEFAULT_BOTTLENECK_PROMPT);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);

  const loadAllCards = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setFetchError(null);

      const [cardsResponse, customFieldsResponse, membersResponse] = await Promise.all([
        trelloService.getCards({ includeClosed: true }),
        trelloService.getCustomFields(),
        trelloService.getMembers(),
      ]);

      setAllCards(Array.isArray(cardsResponse) ? cardsResponse : []);
      setAllCustomFields(Array.isArray(customFieldsResponse) ? customFieldsResponse : []);
      setAllMembers(Array.isArray(membersResponse) ? membersResponse : []);
    } catch (error) {
      setFetchError(error.message || 'Erro ao carregar cards do Trello.');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAllCards();
  }, [loadAllCards]);

  const bottleneckField = useMemo(() => findBottleneckCustomField(allCustomFields), [allCustomFields]);

  const memberMap = useMemo(() => {
    const map = new Map();
    allMembers.forEach((member) => {
      if (member?.id) {
        map.set(member.id, member);
      }
    });
    return map;
  }, [allMembers]);

  const rows = useMemo(() => {
    return allCards
      .map((card) => {
        const customFieldItems = Array.isArray(card?.customFieldItems) ? card.customFieldItems : [];
        const bottleneckFieldItem = bottleneckField
          ? customFieldItems.find((item) => item.idCustomField === bottleneckField.id)
          : null;

        return {
          id: card.id,
          title: card.name || '-',
          labels: buildLabels(card.labels),
          labelIds: buildLabels(card.labels).map((label) => label.id),
          membersLabel: buildMembersLabel(card, memberMap),
          bottleneck: resolveCustomFieldItemValue(bottleneckFieldItem, bottleneckField),
          cardUrl: card.url,
        };
      })
      .sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
  }, [allCards, bottleneckField, memberMap]);

  const availableTags = useMemo(() => {
    const tagMap = new Map();

    rows.forEach((row) => {
      row.labels.forEach((label) => {
        if (!tagMap.has(label.id)) {
          tagMap.set(label.id, label);
        }
      });
    });

    return Array.from(tagMap.values()).sort((a, b) => a.text.localeCompare(b.text, 'pt-BR'));
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (selectedTagIds.length === 0) return rows;

    return rows.filter((row) => row.labelIds.some((labelId) => selectedTagIds.includes(labelId)));
  }, [rows, selectedTagIds]);

  const summaryStats = useMemo(() => {
    const withBottleneck = filteredRows.filter((row) => hasBottleneckDescription(row.bottleneck)).length;
    return {
      withBottleneck,
      withoutBottleneck: filteredRows.length - withBottleneck,
    };
  }, [filteredRows]);

  const rowsWithBottleneck = useMemo(
    () => filteredRows.filter((row) => hasBottleneckDescription(row.bottleneck)),
    [filteredRows]
  );

  const analysisContext = useMemo(() => ({
    generatedAt: new Date().toISOString(),
    totalCards: rowsWithBottleneck.length,
    cardsWithBottleneck: summaryStats.withBottleneck,
    cardsWithoutBottleneck: summaryStats.withoutBottleneck,
    selectedTagIds,
    cards: rowsWithBottleneck.map((row) => ({
      title: row.title,
      members: row.membersLabel,
      labels: row.labels.map((label) => label.text),
      bottleneck: row.bottleneck,
      url: row.cardUrl,
    })),
  }), [rowsWithBottleneck, selectedTagIds, summaryStats]);

  const toggleTagFilter = (tagId) => {
    setSelectedTagIds((prev) => {
      if (prev.includes(tagId)) {
        return prev.filter((id) => id !== tagId);
      }

      return [...prev, tagId];
    });
  };

  const btnNeutral = dark
    ? 'border-neutral-700 bg-neutral-800/50 hover:bg-neutral-700/60 text-neutral-300 hover:text-white'
    : 'border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-600 hover:text-black';

  const openPromptModal = () => {
    setDraftPrompt(analysisPrompt);
    setIsPromptModalOpen(true);
  };

  const savePrompt = () => {
    setAnalysisPrompt(String(draftPrompt || '').trim() || DEFAULT_BOTTLENECK_PROMPT);
    setIsPromptModalOpen(false);
  };

  const handleAnalyzeWithAI = async () => {
    if (rowsWithBottleneck.length === 0) {
      setAnalysisError('Nao ha cards com gargalo descrito para analisar com os filtros atuais.');
      return;
    }

    try {
      setIsAnalyzing(true);
      setAnalysisError('');

      const response = await analyzeBottlenecksWithGoogleAI({
        userPrompt: analysisPrompt,
        context: analysisContext,
      });

      setAnalysisResult(response);
    } catch (error) {
      setAnalysisError(error.message || 'Erro ao analisar gargalos com IA.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div>
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b -mx-8 -mt-8 mb-8 px-8 ${dark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white/90 border-neutral-200'}`}>
        <div className="flex items-center justify-between h-16">
          <div>
            <h1 className={`text-xl font-bold ${dark ? 'text-white' : 'text-neutral-900'}`}>Análise de Gargalos</h1>
            <p className={`text-xs ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>
              Lista completa de cards com etiquetas, membros e maior gargalo do processo.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs px-3 py-1 rounded-full border ${dark ? 'border-neutral-700 text-neutral-300' : 'border-neutral-300 text-neutral-700'}`}>
              {filteredRows.length} cards
            </span>
            <button
              onClick={openPromptModal}
              className={`px-3 py-2 text-xs font-bold uppercase tracking-widest rounded-lg border transition-colors ${btnNeutral}`}
              type="button"
            >
              Editar prompt
            </button>
            <button
              onClick={handleAnalyzeWithAI}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white bg-red-600 hover:bg-red-500 rounded-lg transition-all disabled:opacity-60"
              disabled={isAnalyzing || isRefreshing}
              type="button"
            >
              <FiRefreshCw size={14} className={isAnalyzing ? 'animate-spin' : ''} />
              {isAnalyzing ? 'Analisando...' : 'Analisar com IA'}
            </button>
            <button
              onClick={loadAllCards}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white bg-red-600 hover:bg-red-500 rounded-lg transition-all"
              disabled={isRefreshing}
            >
              <FiRefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              {isRefreshing ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        </div>
      </header>

      {fetchError && (
        <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${dark ? 'border-red-900/60 bg-red-950/30 text-red-300' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {fetchError}
        </div>
      )}

      {analysisError && (
        <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${dark ? 'border-red-900/60 bg-red-950/30 text-red-300' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {analysisError}
        </div>
      )}

      <section className="mb-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <article className={`rounded-xl border p-4 ${dark ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-white shadow-sm'}`}>
          <p className={`text-xs uppercase tracking-wider mb-2 ${dark ? 'text-neutral-400' : 'text-neutral-500'}`}>
            Cards com gargalos descritos
          </p>
          <p className={`text-3xl font-bold ${dark ? 'text-white' : 'text-neutral-900'}`}>{summaryStats.withBottleneck}</p>
        </article>

        <article className={`rounded-xl border p-4 ${dark ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-white shadow-sm'}`}>
          <p className={`text-xs uppercase tracking-wider mb-2 ${dark ? 'text-neutral-400' : 'text-neutral-500'}`}>
            Cards sem gargalos descritos
          </p>
          <p className={`text-3xl font-bold ${dark ? 'text-white' : 'text-neutral-900'}`}>{summaryStats.withoutBottleneck}</p>
        </article>

        <article className={`rounded-xl border p-4 relative ${dark ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-white shadow-sm'}`}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <label className={`block text-xs uppercase tracking-wider ${dark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Filtro por tags
            </label>
            {selectedTagIds.length > 0 && (
              <button
                onClick={() => setSelectedTagIds([])}
                type="button"
                className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md border transition-colors ${
                  dark
                    ? 'text-neutral-300 border-neutral-700 hover:border-neutral-500 hover:text-white'
                    : 'text-neutral-600 border-neutral-300 hover:border-neutral-500 hover:text-neutral-900'
                }`}
              >
                Limpar
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsTagFilterOpen((prev) => !prev)}
            className={`${
              dark
                ? 'bg-[#0c0c0c] border border-[#272727] text-[#f5f5f5]'
                : 'bg-white border border-[#e5e5e5] text-[#0c0c0c]'
            } w-full rounded-xl px-4 py-2 text-sm transition-colors cursor-pointer flex items-center justify-between text-left`}
          >
            <span>
              {selectedTagIds.length > 0
                ? `${selectedTagIds.length} selecionado(s)`
                : 'Selecionar tags'}
            </span>
            <span>{isTagFilterOpen ? '▴' : '▾'}</span>
          </button>

          {isTagFilterOpen && (
            <div className={`absolute z-20 mt-2 left-4 right-4 rounded-xl border shadow-xl max-h-56 overflow-auto ${
              dark ? 'bg-[#0c0c0c] border-[#272727]' : 'bg-white border-[#e5e5e5]'
            }`}>
              {availableTags.length > 0 ? (
                availableTags.map((tag) => (
                  <label
                    key={tag.id}
                    className={`flex items-center gap-2 px-3 py-2 text-xs cursor-pointer transition-colors ${
                      dark ? 'text-neutral-200 hover:bg-neutral-800' : 'text-neutral-800 hover:bg-neutral-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTagIds.includes(tag.id)}
                      onChange={() => toggleTagFilter(tag.id)}
                      className="accent-red-600"
                    />
                    <span className="truncate">{tag.text}</span>
                  </label>
                ))
              ) : (
                <p className={`px-3 py-2 text-xs ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                  Nenhuma tag disponivel para filtro.
                </p>
              )}
            </div>
          )}

          <p className={`mt-2 text-xs ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>
            {selectedTagIds.length > 0
              ? `${selectedTagIds.length} tag(s) selecionada(s)`
              : 'Nenhuma tag selecionada'}
          </p>
        </article>
      </section>

      {analysisResult && (
        <section className={`mb-4 rounded-2xl border p-4 ${dark ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-white shadow-sm'}`}>
          <h2 className={`text-sm font-bold uppercase tracking-widest mb-3 ${dark ? 'text-neutral-200' : 'text-neutral-700'}`}>
            Resultado da IA
          </h2>

          <p className={`text-sm whitespace-pre-wrap mb-4 ${dark ? 'text-neutral-200' : 'text-neutral-800'}`}>
            {analysisResult.summary}
          </p>

          {Array.isArray(analysisResult.criticalPoints) && analysisResult.criticalPoints.length > 0 && (
            <div className="mb-4">
              <h3 className={`text-xs font-bold uppercase tracking-widest mb-2 ${dark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                Pontos criticos
              </h3>
              <ul className={`text-sm space-y-1 ${dark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                {analysisResult.criticalPoints.map((item, index) => (
                  <li key={`critical-${index}`}>- {item}</li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(analysisResult.recommendations) && analysisResult.recommendations.length > 0 && (
            <div className="mb-4">
              <h3 className={`text-xs font-bold uppercase tracking-widest mb-2 ${dark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                Recomendacoes
              </h3>
              <div className="space-y-3">
                {analysisResult.recommendations.map((item, index) => (
                  <article key={`rec-${index}`} className={`rounded-lg border p-3 ${dark ? 'border-neutral-800 bg-neutral-950' : 'border-neutral-200 bg-neutral-50'}`}>
                    <p className={`text-sm font-semibold mb-1 ${dark ? 'text-white' : 'text-neutral-900'}`}>
                      {item.title || `Recomendacao ${index + 1}`}
                    </p>
                    <p className={`text-xs mb-1 ${dark ? 'text-red-300' : 'text-red-700'}`}>
                      Prioridade: {item.priority || 'media'}
                    </p>
                    <p className={`text-xs mb-1 ${dark ? 'text-neutral-300' : 'text-neutral-700'}`}>Motivo: {item.reason || '-'}</p>
                    <p className={`text-xs ${dark ? 'text-neutral-300' : 'text-neutral-700'}`}>Impacto esperado: {item.expectedImpact || '-'}</p>
                  </article>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(analysisResult.highlightedCards) && analysisResult.highlightedCards.length > 0 && (
            <div>
              <h3 className={`text-xs font-bold uppercase tracking-widest mb-2 ${dark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                Cards destacados
              </h3>
              <div className="space-y-2">
                {analysisResult.highlightedCards.map((item, index) => (
                  <div key={`card-${index}`} className={`rounded-lg border p-3 ${dark ? 'border-neutral-800 bg-neutral-950' : 'border-neutral-200 bg-neutral-50'}`}>
                    <p className={`text-sm font-semibold ${dark ? 'text-white' : 'text-neutral-900'}`}>{item.title || '-'}</p>
                    <p className={`text-xs mt-1 ${dark ? 'text-neutral-300' : 'text-neutral-700'}`}>Gargalo: {item.bottleneck || '-'}</p>
                    <p className={`text-xs mt-1 ${dark ? 'text-red-300' : 'text-red-700'}`}>Prioridade: {item.priority || 'media'}</p>
                    <p className={`text-xs mt-1 ${dark ? 'text-neutral-300' : 'text-neutral-700'}`}>Motivo: {item.reason || '-'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <section className={`rounded-2xl border overflow-hidden ${dark ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-white shadow-sm'}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className={dark ? 'bg-neutral-800/70' : 'bg-neutral-50'}>
              <tr>
                <th className={`text-left px-4 py-3 font-semibold ${dark ? 'text-neutral-200' : 'text-neutral-700'}`}>Tags / Etiquetas</th>
                <th className={`text-left px-4 py-3 font-semibold ${dark ? 'text-neutral-200' : 'text-neutral-700'}`}>Titulo</th>
                <th className={`text-left px-4 py-3 font-semibold ${dark ? 'text-neutral-200' : 'text-neutral-700'}`}>Membros</th>
                <th className={`text-left px-4 py-3 font-semibold ${dark ? 'text-neutral-200' : 'text-neutral-700'}`}>
                  Maior gargalo do processo
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id} className={`border-t ${dark ? 'border-neutral-800' : 'border-neutral-200'}`}>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-wrap gap-2">
                      {row.labels.length > 0 ? row.labels.map((label) => (
                        <span
                          key={label.id}
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs border ${dark ? 'border-neutral-700 bg-neutral-800 text-neutral-200' : 'border-neutral-300 bg-neutral-100 text-neutral-700'}`}
                        >
                          {label.text}
                        </span>
                      )) : (
                        <span className={dark ? 'text-neutral-500' : 'text-neutral-500'}>-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    {row.cardUrl ? (
                      <a
                        href={row.cardUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={dark ? 'text-red-400 hover:text-red-300 underline-offset-2 hover:underline' : 'text-red-600 hover:text-red-500 underline-offset-2 hover:underline'}
                      >
                        {row.title}
                      </a>
                    ) : row.title}
                  </td>
                  <td className={`px-4 py-3 align-top ${dark ? 'text-neutral-300' : 'text-neutral-700'}`}>{row.membersLabel}</td>
                  <td className={`px-4 py-3 align-top ${dark ? 'text-neutral-300' : 'text-neutral-700'}`}>{row.bottleneck}</td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr className={`border-t ${dark ? 'border-neutral-800' : 'border-neutral-200'}`}>
                  <td colSpan={4} className={`px-4 py-6 text-center ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    Nenhum card encontrado para as tags selecionadas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!bottleneckField && (
          <div className={`px-4 py-3 border-t text-xs ${dark ? 'border-neutral-800 text-amber-400 bg-amber-500/10' : 'border-neutral-200 text-amber-700 bg-amber-50'}`}>
            Campo personalizado "Maior gargalo do processo" nao encontrado no board. A coluna sera exibida com "-".
          </div>
        )}
      </section>

      <div className="mt-4">
        <button
          onClick={loadAllCards}
          className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${btnNeutral}`}
          disabled={isRefreshing}
        >
          {isRefreshing ? 'Recarregando dados...' : 'Recarregar dados do Trello'}
        </button>
      </div>

      {isPromptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setIsPromptModalOpen(false)}
            aria-hidden="true"
          />
          <div className={`relative w-full max-w-2xl rounded-2xl border p-5 ${dark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200 shadow-xl'}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-sm font-bold uppercase tracking-widest ${dark ? 'text-neutral-200' : 'text-neutral-800'}`}>
                Editar prompt da analise
              </h3>
              <button
                type="button"
                onClick={() => setIsPromptModalOpen(false)}
                className={`p-2 rounded-lg border ${dark ? 'border-neutral-700 text-neutral-300 hover:bg-neutral-800' : 'border-neutral-300 text-neutral-700 hover:bg-neutral-100'}`}
              >
                <FiX size={14} />
              </button>
            </div>

            <textarea
              value={draftPrompt}
              onChange={(event) => setDraftPrompt(event.target.value)}
              rows={9}
              className={`w-full rounded-xl border px-3 py-2 text-sm ${dark ? 'bg-[#0c0c0c] border-[#272727] text-[#f5f5f5]' : 'bg-white border-[#e5e5e5] text-[#0c0c0c]'}`}
            />

            <p className={`text-xs mt-2 ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>
              Este prompt sera enviado junto com o contexto de cards e gargalos para a IA do Google.
            </p>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPromptModalOpen(false)}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border ${dark ? 'border-neutral-700 text-neutral-300 hover:bg-neutral-800' : 'border-neutral-300 text-neutral-700 hover:bg-neutral-100'}`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={savePrompt}
                className="px-3 py-2 text-xs font-bold uppercase tracking-widest rounded-lg bg-red-600 text-white hover:bg-red-500"
              >
                Salvar prompt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BottleneckAnalysisPage;
