import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  FiChevronLeft,
  FiChevronRight,
  FiUsers,
  FiRefreshCw,
  FiMessageSquare,
  FiCheckSquare,
  FiCheckCircle,
  FiAlertCircle,
  FiEdit2,
  FiX,
  FiSquare,
  FiTag,
  FiPrinter,
} from 'react-icons/fi';
import resumoService from '../services/resumoService';
import { useTheme } from '../contexts/ThemeContext';

const WEEKDAYS_PT = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

const formatDateLabel = (date) => {
  const weekday = WEEKDAYS_PT[date.getDay()];
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${weekday}, ${dd}/${mm}/${yyyy}`;
};

const toInputValue = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const toDateTimeLocalInput = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

const toDueIsoFromInput = (dateTimeInputValue) => {
  const localDate = new Date(dateTimeInputValue);
  if (Number.isNaN(localDate.getTime())) return null;
  return localDate.toISOString();
};

const formatTime = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const formatDateShort = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const formatDateTimeShort = (isoString) => {
  if (!isoString) return '';
  return `${formatDateShort(isoString)} ${formatTime(isoString)}`;
};

const sameDay = (d1, d2) => (
  d1.getFullYear() === d2.getFullYear()
  && d1.getMonth() === d2.getMonth()
  && d1.getDate() === d2.getDate()
);

const avatarInitials = (fullName) => {
  if (!fullName) return '?';
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const normalizeLabels = (labels = []) => labels.map((label) => ({
  id: label.id || `${label.name || ''}-${label.color || ''}`,
  text: label.name?.trim() || label.color || 'Tag',
}));

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const buildLabelsHtml = (labels = []) => {
  if (!labels.length) return '';

  return labels
    .map((label) => `<span class="tag">${escapeHtml(label.text)}</span>`)
    .join('');
};

const buildChecklistGroupsHtml = (groups = [], isCompleted = false) => {
  if (!groups.length) return '<p class="empty">Nenhum item nesta seção.</p>';

  return groups.map((group) => {
    const itemsHtml = group.items.map((item) => `
      <div class="check-item-row">
        <span class="check-icon">${isCompleted ? '☑' : '☐'}</span>
        <div class="check-text-wrap">
          <p class="item-title">${escapeHtml(item.name)}</p>
          <p class="item-sub">${escapeHtml(item.checklistName)} · ${escapeHtml(item.memberName || 'Sem responsável')}</p>
        </div>
        <span class="item-date">${escapeHtml(item.due ? formatDateShort(item.due) : '')}</span>
      </div>
    `).join('');

    return `
      <div class="card-block avoid-break">
        <div class="card-header">
          <p class="card-title">${escapeHtml(group.cardName)}</p>
          <div class="tags">${buildLabelsHtml(group.cardLabels)}</div>
        </div>
        <div class="card-body">${itemsHtml}</div>
      </div>
    `;
  }).join('');
};

const buildPrintHtml = ({
  selectedDate,
  selectedMembersLabel,
  comments,
  completedCards,
  completedChecklistGroups,
  pendingGroups,
  productivityStats = [],
}) => {
  const commentsHtml = comments.length
    ? comments.map((comment) => `
      <div class="item avoid-break">
        <p class="main">${escapeHtml(comment.text)}</p>
        <p class="meta">${escapeHtml(comment.memberName)} · ${escapeHtml(comment.cardName)} · ${escapeHtml(formatTime(comment.date))}</p>
      </div>
    `).join('')
    : '<p class="empty">Nenhum comentário nesta data.</p>';

  const cardsHtml = completedCards.length
    ? completedCards.map((card) => `
      <div class="item avoid-break">
        <div class="row-start">
          <p class="main">${escapeHtml(card.cardName)}</p>
          <div class="tags">${buildLabelsHtml(card.cardLabels)}</div>
        </div>
        <p class="meta">${escapeHtml(card.memberName || 'Sem responsável')} · ${escapeHtml(card.listName || 'Sem lista')} · ${escapeHtml(formatTime(card.date))}</p>
      </div>
    `).join('')
    : '<p class="empty">Nenhum card concluído nesta data.</p>';

  return `
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Resumo Diário - ${escapeHtml(formatDateLabel(selectedDate))}</title>
    <style>
      @page {
        size: A4 portrait;
        margin: 10mm;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: Inter, Arial, sans-serif;
        color: #111827;
        background: #f8fafc;
      }

      .print-page {
        width: 100%;
        max-width: 190mm;
        margin: 0 auto;
        background: #ffffff;
      }

      .toolbar {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        padding: 12px 0;
      }

      .toolbar button {
        border: 1px solid #d1d5db;
        background: #ffffff;
        color: #111827;
        font-size: 12px;
        font-weight: 600;
        border-radius: 8px;
        padding: 6px 12px;
        cursor: pointer;
      }

      .header {
        border-bottom: 1px solid #e5e7eb;
        padding: 0 0 10px 0;
        margin-bottom: 12px;
      }

      .title {
        margin: 0;
        font-size: 20px;
        font-weight: 700;
      }

      .subtitle {
        margin: 4px 0 0;
        font-size: 12px;
        color: #6b7280;
      }

      .sections {
        display: grid;
        grid-template-columns: 1fr;
        gap: 10px;
      }

      .top-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        align-items: start;
      }

      .left-column,
      .right-column {
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-width: 0;
      }

      .section {
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        padding: 10px;
        background: #fff;
      }

      .section h2 {
        margin: 0 0 8px;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: .08em;
        color: #374151;
      }

      .item {
        border: 1px solid #f3f4f6;
        border-radius: 8px;
        padding: 8px;
        margin-bottom: 6px;
      }

      .main {
        margin: 0;
        font-size: 13px;
        line-height: 1.4;
        color: #111827;
      }

      .meta {
        margin: 4px 0 0;
        font-size: 11px;
        color: #6b7280;
      }

      .row-start {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
      }

      .tag {
        display: inline-flex;
        align-items: center;
        border: 1px solid #d1d5db;
        border-radius: 999px;
        padding: 1px 8px;
        font-size: 10px;
        color: #4b5563;
        background: #f9fafb;
      }

      .tags {
        display: inline-flex;
        flex-wrap: wrap;
        gap: 4px;
      }

      .empty {
        margin: 0;
        font-size: 12px;
        color: #6b7280;
      }

      .card-block {
        border: 1px solid #f3f4f6;
        border-radius: 8px;
        margin-bottom: 8px;
        overflow: hidden;
      }

      .card-header {
        padding: 8px;
        border-bottom: 1px solid #f3f4f6;
        display: flex;
        gap: 6px;
        align-items: center;
        flex-wrap: wrap;
      }

      .card-title {
        margin: 0;
        font-size: 12px;
        font-weight: 600;
        color: #374151;
      }

      .card-body {
        padding: 0 8px;
      }

      .check-item-row {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 8px 0;
        border-bottom: 1px solid #f9fafb;
      }

      .check-item-row:last-child {
        border-bottom: 0;
      }

      .check-icon {
        font-size: 12px;
        color: #374151;
        line-height: 1.2;
        margin-top: 1px;
      }

      .check-text-wrap {
        flex: 1;
        min-width: 0;
      }

      .item-title {
        margin: 0;
        font-size: 12px;
        color: #111827;
      }

      .item-sub {
        margin: 2px 0 0;
        font-size: 10px;
        color: #6b7280;
      }

      .item-date {
        font-size: 10px;
        color: #6b7280;
        white-space: nowrap;
      }

      .avoid-break {
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .prod-panel {
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        padding: 10px;
        margin-bottom: 12px;
      }

      .prod-panel h2 {
        margin: 0 0 8px;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: .08em;
        color: #6b7280;
      }

      .prod-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .prod-row {
        display: flex;
        align-items: center;
        gap: 8px;
        border: 1px solid #f3f4f6;
        border-radius: 8px;
        padding: 6px 10px;
        min-width: 180px;
      }

      .prod-avatar {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: #e5e7eb;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 600;
        color: #374151;
        flex-shrink: 0;
      }

      .prod-name {
        font-size: 12px;
        font-weight: 500;
        color: #111827;
        flex: 1;
        min-width: 0;
      }

      .prod-stats {
        display: flex;
        gap: 10px;
        flex-shrink: 0;
      }

      .prod-stat {
        display: flex;
        align-items: center;
        gap: 3px;
        font-size: 11px;
        font-weight: 600;
        color: #374151;
      }

      .prod-stat svg {
        width: 12px;
        height: 12px;
      }

      .icon-check {
        color: #10b981;
      }

      .icon-comment {
        color: #60a5fa;
      }

      .icon-pending {
        color: #fbbf24;
      }

      @media print {
        body {
          background: #fff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .toolbar {
          display: none !important;
        }

        .print-page {
          max-width: none;
          width: 100%;
          padding: 0;
        }

        .top-grid {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 8px !important;
        }

        .section {
          padding: 8px;
          border-radius: 6px;
        }

        .item {
          padding: 6px;
          margin-bottom: 4px;
        }

        .main {
          font-size: 12px;
        }

        .meta {
          font-size: 10px;
        }
      }

      @media screen and (max-width: 900px) {
        .top-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <div class="print-page">
      <div class="toolbar">
        <button onclick="window.print()">Imprimir</button>
        <button onclick="window.close()">Fechar</button>
      </div>

      <header class="header avoid-break">
        <h1 class="title">Resumo Diário</h1>
        <p class="subtitle">${escapeHtml(formatDateLabel(selectedDate))}</p>
        <p class="subtitle">Filtro de colaboradores: ${escapeHtml(selectedMembersLabel)}</p>
      </header>

      ${productivityStats.length > 0 ? `
      <div class="prod-panel avoid-break">
        <h2>Produtividade do dia</h2>
        <div class="prod-grid">
          ${productivityStats.map((s) => `
            <div class="prod-row">
              <div class="prod-avatar">${escapeHtml(avatarInitials(s.fullName))}</div>
              <span class="prod-name">${escapeHtml(s.fullName)}</span>
              <div class="prod-stats">
                <span class="prod-stat">
                  <svg class="icon-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  ${s.completed}
                </span>
                <span class="prod-stat">
                  <svg class="icon-comment" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  ${s.comments}
                </span>
                <span class="prod-stat">
                  <svg class="icon-pending" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  ${s.pending}
                </span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <main class="sections">
        <div class="top-grid">
          <div class="left-column">
            <section class="section">
              <h2>Comentários do dia (${comments.length})</h2>
              ${commentsHtml}
            </section>

            <section class="section">
              <h2>Cards concluídos (${completedCards.length})</h2>
              ${cardsHtml}
            </section>
          </div>

          <div class="right-column">
            <section class="section">
              <h2>Itens de checklist concluídos (${completedChecklistGroups.reduce((sum, group) => sum + group.items.length, 0)})</h2>
              ${buildChecklistGroupsHtml(completedChecklistGroups, true)}
            </section>

            <section class="section">
              <h2>Pendências do dia (${pendingGroups.reduce((sum, group) => sum + group.items.length, 0)})</h2>
              ${buildChecklistGroupsHtml(pendingGroups, false)}
            </section>
          </div>
        </div>
      </main>
    </div>
  </body>
</html>
  `;
};

// ─── productivity helpers ────────────────────────────────────────────────────

const buildProductivityStats = (comments, completedCards, completedChecklistGroups, pendingGroups, members) => {
  const statsMap = {};

  const ensure = (memberId) => {
    if (!statsMap[memberId]) {
      const member = members.find((m) => m.id === memberId);
      statsMap[memberId] = {
        memberId,
        fullName: member?.fullName ?? memberId ?? 'Desconhecido',
        comments: 0,
        completed: 0,
        pending: 0,
      };
    }
  };

  comments.forEach((c) => { if (c.memberId) { ensure(c.memberId); statsMap[c.memberId].comments += 1; } });
  completedCards.forEach((c) => { if (c.memberId) { ensure(c.memberId); statsMap[c.memberId].completed += 1; } });
  completedChecklistGroups.forEach((g) => {
    g.items.forEach((item) => { if (item.memberId) { ensure(item.memberId); statsMap[item.memberId].completed += 1; } });
  });
  pendingGroups.forEach((g) => {
    g.items.forEach((item) => {
      if (!item.memberId) return;
      ensure(item.memberId);
      statsMap[item.memberId].pending += 1;
    });
  });

  return Object.values(statsMap).sort((a, b) => (b.completed + b.comments) - (a.completed + a.comments));
};

const ProductivityPanel = ({ stats, dark }) => {
  if (!stats.length) return null;

  return (
    <div className={`rounded-xl border p-4 mb-8 ${
      dark ? 'bg-neutral-900/60 border-neutral-800' : 'bg-white border-neutral-200'
    }`}>
      <h2 className={`text-[11px] font-bold uppercase tracking-widest mb-3 ${
        dark ? 'text-neutral-400' : 'text-neutral-600'
      }`}>
        Produtividade do dia
      </h2>

      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
        {stats.map((s) => (
          <div
            key={s.memberId}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
              dark ? 'bg-neutral-800/60' : 'bg-neutral-50 border border-neutral-100'
            }`}
          >
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 ${
                dark ? 'bg-neutral-700 text-neutral-300' : 'bg-neutral-200 text-neutral-700'
              }`}
            >
              {avatarInitials(s.fullName)}
            </span>

            <span className={`text-sm font-medium flex-1 min-w-0 ${
              dark ? 'text-neutral-200' : 'text-neutral-800'
            }`}>
              {s.fullName}
            </span>

            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="flex items-center gap-1" title="Itens concluídos">
                <FiCheckCircle size={13} className="text-emerald-500" />
                <span className={`text-xs tabular-nums font-semibold ${dark ? 'text-neutral-300' : 'text-neutral-700'}`}>{s.completed}</span>
              </span>
              <span className="flex items-center gap-1" title="Comentários">
                <FiMessageSquare size={13} className="text-blue-400" />
                <span className={`text-xs tabular-nums font-semibold ${dark ? 'text-neutral-300' : 'text-neutral-700'}`}>{s.comments}</span>
              </span>
              <span className="flex items-center gap-1" title="Pendências">
                <FiAlertCircle size={13} className="text-amber-400" />
                <span className={`text-xs tabular-nums font-semibold ${dark ? 'text-neutral-300' : 'text-neutral-700'}`}>{s.pending}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Avatar = ({ fullName, size = 24, dark }) => (
  <span
    style={{ width: size, height: size, fontSize: size * 0.4 }}
    className={`inline-flex items-center justify-center rounded-full font-semibold flex-shrink-0 select-none ${
      dark ? 'bg-neutral-700 text-neutral-300' : 'bg-neutral-200 text-neutral-700'
    }`}
  >
    {avatarInitials(fullName)}
  </span>
);

const Pill = ({ children, dark }) => (
  <span className={`inline-flex items-center gap-1 text-[10px] rounded px-1.5 py-0.5 leading-none border ${
    dark ? 'text-neutral-400 bg-neutral-800 border-neutral-700' : 'text-neutral-600 bg-neutral-100 border-neutral-300'
  }`}>
    <FiTag size={9} />
    {children}
  </span>
);

const SectionHeader = ({ icon: Icon, label, count, dark }) => (
  <div className="flex items-center gap-2 mb-3">
    <Icon size={16} className="text-red-500 flex-shrink-0" />
    <h2 className={`text-sm font-bold uppercase tracking-widest ${dark ? 'text-neutral-300' : 'text-neutral-700'}`}>{label}</h2>
    {count !== undefined && (
      <span className={`ml-auto text-xs tabular-nums ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>
        {count} {count === 1 ? 'item' : 'itens'}
      </span>
    )}
  </div>
);

const EmptyState = ({ message, dark }) => (
  <p className={`text-xs italic py-2 ${dark ? 'text-neutral-600' : 'text-neutral-500'}`}>{message}</p>
);

const CommentsSection = ({ comments, dark }) => (
  <section>
    <SectionHeader icon={FiMessageSquare} label="Comentários do dia" count={comments.length} dark={dark} />
    {comments.length === 0
      ? <EmptyState message="Nenhum comentário nesta data." dark={dark} />
      : (
        <div className="flex flex-col gap-2">
          {comments.map((c) => (
            <div
              key={c.id}
              className={`rounded-lg p-3 border transition-colors ${
                dark
                  ? 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                  : 'bg-white border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <p className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${dark ? 'text-neutral-100' : 'text-neutral-900'}`}>
                {c.text}
              </p>

              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Avatar fullName={c.memberName} size={18} dark={dark} />
                <span className={`text-xs ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>{c.memberName}</span>
                <span className={`text-xs ${dark ? 'text-neutral-700' : 'text-neutral-400'}`}>·</span>
                <span className={`text-xs ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>{c.cardName}</span>
                {(c.cardLabels ?? []).map((label) => (
                  <Pill key={label.id} dark={dark}>{label.text}</Pill>
                ))}
                <span className={`ml-auto text-[10px] flex-shrink-0 ${dark ? 'text-neutral-600' : 'text-neutral-500'}`}>
                  {formatTime(c.date)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
  </section>
);

const CompletedCardsSection = ({ cards, dark }) => (
  <section>
    <SectionHeader icon={FiCheckCircle} label="Cards concluídos" count={cards.length} dark={dark} />
    {cards.length === 0
      ? <EmptyState message="Nenhum card concluído nesta data." dark={dark} />
      : (
        <div className="flex flex-col gap-2">
          {cards.map((c) => (
            <div
              key={c.id}
              className={`rounded-lg p-3 border transition-colors ${
                dark
                  ? 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                  : 'bg-white border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className={`text-sm font-medium ${dark ? 'text-neutral-100' : 'text-neutral-900'}`}>{c.cardName}</p>
                {(c.cardLabels ?? []).map((label) => (
                  <Pill key={label.id} dark={dark}>{label.text}</Pill>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {c.memberName && (
                  <>
                    <Avatar fullName={c.memberName} size={16} dark={dark} />
                    <span className={`text-xs ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>{c.memberName}</span>
                  </>
                )}
                {c.listName && <Pill dark={dark}>{c.listName}</Pill>}
                <span className={`ml-auto text-[10px] ${dark ? 'text-neutral-600' : 'text-neutral-500'}`}>{formatTime(c.date)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
  </section>
);

const ChecklistGroup = ({ cardName, cardLabels, items, isCompleted, dark }) => (
  <div className={`rounded-lg overflow-hidden border transition-colors ${
    dark ? 'bg-neutral-900 border-neutral-800 hover:border-neutral-700' : 'bg-white border-neutral-200 hover:border-neutral-300'
  }`}>
    <div className={`px-3 py-2 border-b flex flex-wrap items-center gap-2 ${
      dark ? 'border-neutral-800 bg-neutral-950/40' : 'border-neutral-200 bg-neutral-50'
    }`}>
      <p className={`text-xs font-medium truncate ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>{cardName}</p>
      {(cardLabels ?? []).map((label) => (
        <Pill key={label.id} dark={dark}>{label.text}</Pill>
      ))}
    </div>

    <div className={dark ? 'divide-y divide-neutral-800/60' : 'divide-y divide-neutral-200'}>
      {items.map((item, idx) => (
        <div key={`${item.name}-${idx}`} className="px-3 py-2 flex items-start gap-2">
          <div className={`mt-0.5 ${isCompleted ? 'text-red-500' : dark ? 'text-neutral-500' : 'text-neutral-400'}`}>
            {isCompleted ? <FiCheckSquare size={14} /> : <FiSquare size={14} />}
          </div>

          <div className="flex-1 min-w-0">
            <p className={`text-sm ${dark ? 'text-neutral-100' : 'text-neutral-900'}`}>{item.name}</p>
            <p className={`text-[11px] mt-0.5 ${dark ? 'text-neutral-600' : 'text-neutral-500'}`}>
              {item.checklistName} &middot; {item.memberName || 'Sem responsável'}
            </p>
          </div>

          {item.due && (
            <span className={`text-[10px] flex-shrink-0 ml-2 mt-0.5 ${dark ? 'text-neutral-600' : 'text-neutral-500'}`}>
              {formatDateShort(item.due)}
            </span>
          )}
        </div>
      ))}
    </div>
  </div>
);

const CompletedChecklistSection = ({ groups, dark }) => {
  const total = groups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <section>
      <SectionHeader icon={FiCheckSquare} label="Itens de checklist concluídos" count={total} dark={dark} />
      {groups.length === 0
        ? <EmptyState message="Nenhum item de checklist concluído nesta data." dark={dark} />
        : (
          <div className="flex flex-col gap-2">
            {groups.map((g) => (
              <ChecklistGroup
                key={g.cardId}
                cardName={g.cardName}
                cardLabels={g.cardLabels}
                items={g.items}
                isCompleted
                dark={dark}
              />
            ))}
          </div>
        )}
    </section>
  );
};

const getPendingItemKey = (item) => `${item.cardId || 'card'}:${item.checkItemId || item.name}`;

const PendingTreatmentModal = ({
  open,
  onClose,
  dark,
  items,
  bulkDateInput,
  onBulkDateChange,
  onUpdateAll,
  isBulkUpdating,
  rowDateInputs,
  onRowDateChange,
  onUpdateItem,
  updatingItemKey,
  error,
  success,
}) => {
  useEffect(() => {
    if (!open) return undefined;

    const handleEsc = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar modal"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />

      <div className={`relative w-full max-w-6xl max-h-[90vh] rounded-xl border shadow-2xl overflow-hidden ${
        dark ? 'bg-neutral-950 border-neutral-800' : 'bg-white border-neutral-300'
      }`}>
        <div className={`px-5 py-4 border-b flex items-center gap-3 ${
          dark ? 'border-neutral-800' : 'border-neutral-200'
        }`}>
          <FiEdit2 size={16} className="text-red-500" />
          <h3 className={`text-sm font-bold uppercase tracking-widest ${dark ? 'text-neutral-300' : 'text-neutral-700'}`}>
            Tratar pendências
          </h3>
          <span className={`ml-auto text-xs ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>
            {items.length} {items.length === 1 ? 'item' : 'itens'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded border ${
              dark
                ? 'border-neutral-700 text-neutral-400 hover:text-white hover:bg-neutral-800'
                : 'border-neutral-300 text-neutral-600 hover:text-black hover:bg-neutral-100'
            }`}
          >
            <FiX size={14} />
          </button>
        </div>

        <div className={`px-5 py-4 border-b ${dark ? 'border-neutral-800 bg-neutral-900/40' : 'border-neutral-200 bg-neutral-50'}`}>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className={`block text-[10px] font-semibold uppercase tracking-widest mb-1 ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                Nova data e hora (todas)
              </label>
              <input
                type="datetime-local"
                step={60}
                value={bulkDateInput}
                onChange={(event) => onBulkDateChange(event.target.value)}
                className={`px-3 py-2 rounded-lg border text-sm ${
                  dark
                    ? 'border-neutral-700 bg-neutral-900 text-neutral-100'
                    : 'border-neutral-300 bg-white text-neutral-900'
                }`}
              />
            </div>

            <button
              type="button"
              onClick={onUpdateAll}
              disabled={isBulkUpdating || items.length === 0 || !bulkDateInput}
              className="px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest text-white bg-red-600 hover:bg-red-500 disabled:opacity-50"
            >
              {isBulkUpdating ? 'Alterando...' : 'Alterar todas'}
            </button>
          </div>

          {error && (
            <p className="mt-3 text-xs text-red-400">{error}</p>
          )}
          {success && (
            <p className={`mt-3 text-xs ${dark ? 'text-emerald-400' : 'text-emerald-700'}`}>{success}</p>
          )}
        </div>

        <div className="overflow-auto max-h-[58vh]">
          {items.length === 0 ? (
            <p className={`px-5 py-6 text-sm ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>
              Nenhuma pendência disponível.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className={dark ? 'bg-neutral-900 text-neutral-400' : 'bg-neutral-50 text-neutral-600'}>
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Card</th>
                  <th className="px-4 py-2 text-left font-semibold">Item</th>
                  <th className="px-4 py-2 text-left font-semibold">Checklist</th>
                  <th className="px-4 py-2 text-left font-semibold">Responsável</th>
                  <th className="px-4 py-2 text-left font-semibold">Vencimento atual</th>
                  <th className="px-4 py-2 text-left font-semibold">Nova data e hora</th>
                  <th className="px-4 py-2 text-left font-semibold">Ação</th>
                </tr>
              </thead>
              <tbody className={dark ? 'divide-y divide-neutral-800' : 'divide-y divide-neutral-200'}>
                {items.map((item) => {
                  const itemKey = getPendingItemKey(item);
                  const rowIsUpdating = updatingItemKey === itemKey;

                  return (
                    <tr key={itemKey} className={dark ? 'hover:bg-neutral-900/50' : 'hover:bg-neutral-50'}>
                      <td className={`px-4 py-2 align-top ${dark ? 'text-neutral-300' : 'text-neutral-700'}`}>{item.cardName}</td>
                      <td className={`px-4 py-2 align-top ${dark ? 'text-neutral-100' : 'text-neutral-900'}`}>{item.name}</td>
                      <td className={`px-4 py-2 align-top ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>{item.checklistName}</td>
                      <td className={`px-4 py-2 align-top ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>{item.memberName || 'Sem responsável'}</td>
                      <td className={`px-4 py-2 align-top ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                        {item.due ? formatDateTimeShort(item.due) : '-'}
                      </td>
                      <td className="px-4 py-2 align-top">
                        <input
                          type="datetime-local"
                          step={60}
                          value={rowDateInputs[itemKey] || ''}
                          onChange={(event) => onRowDateChange(itemKey, event.target.value)}
                          className={`px-2 py-1.5 rounded border text-xs ${
                            dark
                              ? 'border-neutral-700 bg-neutral-900 text-neutral-100'
                              : 'border-neutral-300 bg-white text-neutral-900'
                          }`}
                        />
                      </td>
                      <td className="px-4 py-2 align-top">
                        <button
                          type="button"
                          onClick={() => onUpdateItem(item)}
                          disabled={rowIsUpdating || isBulkUpdating || !rowDateInputs[itemKey] || !item.cardId || !item.checkItemId}
                          className="px-2.5 py-1.5 rounded text-[11px] font-bold uppercase tracking-widest text-white bg-red-600 hover:bg-red-500 disabled:opacity-50"
                        >
                          {rowIsUpdating ? 'Alterando...' : 'Alterar'}
                        </button>
                      </td>
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

const PendingChecklistSection = ({ groups, dark, onOpenTreatmentModal }) => {
  const total = groups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <FiAlertCircle size={16} className="text-red-500 flex-shrink-0" />
        <h2 className={`text-sm font-bold uppercase tracking-widest ${dark ? 'text-neutral-300' : 'text-neutral-700'}`}>
          Pendências do dia
        </h2>

        <button
          type="button"
          onClick={onOpenTreatmentModal}
          title="Tratar pendências"
          disabled={total === 0}
          className={`inline-flex items-center justify-center w-6 h-6 rounded border transition-colors ${
            dark
              ? 'border-neutral-700 text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-40'
              : 'border-neutral-300 text-neutral-600 hover:text-black hover:bg-neutral-100 disabled:opacity-40'
          }`}
        >
          <FiEdit2 size={12} />
        </button>

        <span className={`ml-auto text-xs tabular-nums ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>
          {total} {total === 1 ? 'item' : 'itens'}
        </span>
      </div>

      {groups.length === 0
        ? <EmptyState message="Nenhuma pendência para esta data." dark={dark} />
        : (
          <div className="flex flex-col gap-2">
            {groups.map((g) => (
              <ChecklistGroup
                key={g.cardId}
                cardName={g.cardName}
                cardLabels={g.cardLabels}
                items={g.items}
                isCompleted={false}
                dark={dark}
              />
            ))}
          </div>
        )}
    </section>
  );
};

const MemberFilter = ({ members, selectedIds, onChange, dark }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleMember = (id) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((memberId) => memberId !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const label = selectedIds.length === 0
    ? 'Todos os colaboradores'
    : selectedIds.length === 1
      ? members.find((m) => m.id === selectedIds[0])?.fullName ?? '1 colaborador'
      : `${selectedIds.length} colaboradores`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
          dark
            ? 'border-neutral-700 bg-neutral-800/60 text-neutral-300 hover:bg-neutral-700/60 hover:text-white'
            : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 hover:text-black'
        }`}
      >
        <FiUsers size={14} />
        <span className="max-w-[180px] truncate">{label}</span>
        {selectedIds.length > 0 && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onChange([]);
            }}
            className={`ml-1 ${dark ? 'text-neutral-500 hover:text-white' : 'text-neutral-500 hover:text-black'}`}
          >
            <FiX size={12} />
          </span>
        )}
      </button>

      {open && (
        <div className={`absolute left-0 top-full mt-1 z-50 rounded-lg shadow-xl min-w-[220px] overflow-hidden border ${
          dark ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-neutral-300'
        }`}>
          <div className="max-h-60 overflow-y-auto">
            {members.map((m) => (
              <label
                key={m.id}
                className={`flex items-center gap-2.5 px-3 py-2.5 text-sm cursor-pointer select-none ${
                  dark ? 'text-neutral-300 hover:bg-neutral-800' : 'text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                <input
                  type="checkbox"
                  className="accent-red-500"
                  checked={selectedIds.includes(m.id)}
                  onChange={() => toggleMember(m.id)}
                />
                <Avatar fullName={m.fullName} size={20} dark={dark} />
                <span className="truncate">{m.fullName}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const processData = (actions, cardsWithChecklists, listsMap, selectedDate, filteredMemberIds, allMembers) => {
  const allMemberIds = new Set();
  const membersMap = {};
  (allMembers ?? []).forEach((m) => {
    membersMap[m.id] = m.fullName || m.username;
  });

  const cardMetaById = {};
  (cardsWithChecklists ?? []).forEach((card) => {
    cardMetaById[card.id] = {
      labels: normalizeLabels(card.labels || []),
    };
  });

  const comments = actions
    .filter((a) => a.type === 'commentCard')
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map((a) => {
      const memberId = a.memberCreator?.id;
      if (memberId) allMemberIds.add(memberId);
      const cardId = a.data?.card?.id;

      return {
        id: a.id,
        text: a.data?.text ?? '',
        memberName: a.memberCreator?.fullName ?? a.memberCreator?.username ?? 'Desconhecido',
        memberId,
        cardName: a.data?.card?.name ?? '',
        cardId,
        cardLabels: cardMetaById[cardId]?.labels || [],
        date: a.date,
      };
    });

  const completedCardsRaw = actions
    .filter((a) => a.type === 'updateCard' && a.data?.card?.dueComplete === true)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map((a) => {
      const memberId = a.memberCreator?.id;
      if (memberId) allMemberIds.add(memberId);

      const cardId = a.data?.card?.id;
      const listId = a.data?.card?.idList ?? a.data?.listAfter?.id;

      return {
        id: a.id,
        cardName: a.data?.card?.name ?? '',
        cardId,
        cardLabels: cardMetaById[cardId]?.labels || [],
        memberId,
        memberName: a.memberCreator?.fullName ?? a.memberCreator?.username ?? '',
        listName: listsMap[listId] ?? a.data?.listAfter?.name ?? '',
        date: a.date,
      };
    });

  const seenCards = new Set();
  const completedCards = completedCardsRaw.filter((card) => {
    if (!card.cardId || seenCards.has(card.cardId)) return false;
    seenCards.add(card.cardId);
    return true;
  });

  const completedChecklistMap = {};
  (cardsWithChecklists ?? []).forEach((card) => {
    const checklists = card.checklists ?? [];

    checklists.forEach((checklist) => {
      const items = checklist.checkItems ?? [];

      items.forEach((item) => {
        if (!item.due) return;

        const itemDue = new Date(item.due);
        if (!sameDay(itemDue, selectedDate)) return;
        if (item.state !== 'complete') return;

        const cardId = card.id;
        const memberId = item.idMember;
        if (memberId) allMemberIds.add(memberId);

        if (!completedChecklistMap[cardId]) {
          completedChecklistMap[cardId] = {
            cardId,
            cardName: card.name ?? '',
            cardLabels: cardMetaById[cardId]?.labels || [],
            items: [],
          };
        }

        completedChecklistMap[cardId].items.push({
          name: item.name ?? '',
          checklistName: checklist.name ?? '',
          due: item.due,
          memberId,
          memberName: memberId ? (membersMap[memberId] ?? 'Desconhecido') : 'Sem responsável',
        });
      });
    });
  });

  const completedChecklistGroups = Object.values(completedChecklistMap);

  const pendingMap = {};
  (cardsWithChecklists ?? []).forEach((card) => {
    const checklists = card.checklists ?? [];

    checklists.forEach((checklist) => {
      const items = checklist.checkItems ?? [];

      items.forEach((item) => {
        if (!item.due) return;

        const itemDue = new Date(item.due);
        if (!sameDay(itemDue, selectedDate)) return;
        if (item.state === 'complete') return;

        const cardId = card.id;

        if (!pendingMap[cardId]) {
          pendingMap[cardId] = {
            cardId,
            cardName: card.name ?? '',
            cardLabels: cardMetaById[cardId]?.labels || [],
            idMembers: card.idMembers ?? [],
            items: [],
          };
        }

        pendingMap[cardId].items.push({
          cardId,
          checkItemId: item.id,
          name: item.name ?? '',
          checklistName: checklist.name ?? '',
          due: item.due,
          memberId: item.idMember,
          memberName: item.idMember ? (membersMap[item.idMember] ?? 'Desconhecido') : 'Sem responsável',
        });
      });
    });
  });

  const pendingGroups = Object.values(pendingMap);

  const filterByMember = (memberId) => (
    filteredMemberIds.length === 0 || filteredMemberIds.includes(memberId)
  );

  const shouldKeepPendingItem = (item) => (
    filteredMemberIds.length === 0 || filteredMemberIds.includes(item.memberId)
  );

  return {
    comments: comments.filter((comment) => filterByMember(comment.memberId)),
    completedCards: completedCards.filter((card) => filterByMember(card.memberId)),
    completedChecklistGroups: completedChecklistGroups
      .map((group) => ({ ...group, items: group.items.filter((item) => filterByMember(item.memberId)) }))
      .filter((group) => group.items.length > 0),
    pendingGroups: pendingGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => shouldKeepPendingItem(item)),
      }))
      .filter((group) => group.items.length > 0),
    allMemberIds: Array.from(allMemberIds),
  };
};

const ResumePage = () => {
  const { dark } = useTheme();

  const [selectedDate, setSelectedDate] = useState(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawData, setRawData] = useState({ actions: [], members: [], cardsWithChecklists: [], lists: [] });
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
  const [bulkPendingDateInput, setBulkPendingDateInput] = useState(() => toInputValue(new Date()));
  const [pendingItemDateInputs, setPendingItemDateInputs] = useState({});
  const [updatingPendingItemKey, setUpdatingPendingItemKey] = useState('');
  const [isUpdatingAllPending, setIsUpdatingAllPending] = useState(false);
  const [pendingUpdateError, setPendingUpdateError] = useState('');
  const [pendingUpdateSuccess, setPendingUpdateSuccess] = useState('');
  const dateInputRef = useRef(null);

  const loadData = useCallback(async (date) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await resumoService.getResumoDayData(date);
      setRawData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(selectedDate);
  }, [selectedDate, loadData]);

  const listsMap = useMemo(() => {
    const map = {};
    (rawData.lists ?? []).forEach((list) => {
      map[list.id] = list.name;
    });
    return map;
  }, [rawData.lists]);

  const { comments, completedCards, completedChecklistGroups, pendingGroups } = useMemo(
    () => processData(rawData.actions, rawData.cardsWithChecklists, listsMap, selectedDate, selectedMemberIds, rawData.members),
    [rawData.actions, rawData.cardsWithChecklists, listsMap, selectedDate, selectedMemberIds, rawData.members]
  );

  const pendingItems = useMemo(
    () => pendingGroups.flatMap((group) => group.items.map((item) => ({
      ...item,
      cardName: group.cardName,
      cardLabels: group.cardLabels,
    }))),
    [pendingGroups]
  );

  useEffect(() => {
    if (!isPendingModalOpen) return;

    const nowInput = toDateTimeLocalInput(new Date());

    setPendingItemDateInputs((prev) => {
      const next = {};
      pendingItems.forEach((item) => {
        const key = getPendingItemKey(item);
        next[key] = prev[key] || toDateTimeLocalInput(item.due) || nowInput;
      });
      return next;
    });

    if (!bulkPendingDateInput) {
      setBulkPendingDateInput(nowInput);
    }
  }, [isPendingModalOpen, pendingItems, bulkPendingDateInput]);

  const productivityStats = useMemo(
    () => buildProductivityStats(comments, completedCards, completedChecklistGroups, pendingGroups, rawData.members),
    [comments, completedCards, completedChecklistGroups, pendingGroups, rawData.members]
  );

  const goToPrev = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    setSelectedDate(date);
  };

  const goToNext = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    setSelectedDate(date);
  };

  const handleDateClick = () => {
    const input = dateInputRef.current;
    if (!input) return;

    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }

    input.click();
  };

  const handleDateChange = (event) => {
    if (!event.target.value) return;

    const [yyyy, mm, dd] = event.target.value.split('-').map(Number);
    const date = new Date(yyyy, mm - 1, dd, 0, 0, 0, 0);
    setSelectedDate(date);
  };

  const isToday = sameDay(selectedDate, new Date());

  const selectedMembersLabel = selectedMemberIds.length === 0
    ? 'Todos os colaboradores'
    : rawData.members
      .filter((member) => selectedMemberIds.includes(member.id))
      .map((member) => member.fullName)
      .join(', ');

  const handlePrintResumo = () => {
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      alert('Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-ups está ativo.');
      return;
    }

    const html = buildPrintHtml({
      selectedDate,
      selectedMembersLabel,
      comments,
      completedCards,
      completedChecklistGroups,
      pendingGroups,
      productivityStats,
    });

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleOpenPendingTreatmentModal = () => {
    setPendingUpdateError('');
    setPendingUpdateSuccess('');
    setBulkPendingDateInput(toDateTimeLocalInput(new Date()));
    setIsPendingModalOpen(true);
  };

  const handlePendingItemDateChange = (itemKey, value) => {
    setPendingItemDateInputs((prev) => ({
      ...prev,
      [itemKey]: value,
    }));
  };

  const handleUpdateSinglePendingItem = async (item) => {
    const itemKey = getPendingItemKey(item);
    const targetDate = pendingItemDateInputs[itemKey];

    if (!targetDate) {
      setPendingUpdateError('Selecione data e horário para alterar a pendência.');
      return;
    }

    if (!item.cardId || !item.checkItemId) {
      setPendingUpdateError('Não foi possível identificar o item no Trello.');
      return;
    }

    setPendingUpdateError('');
    setPendingUpdateSuccess('');
    setUpdatingPendingItemKey(itemKey);

    try {
      const dueIso = toDueIsoFromInput(targetDate);
      if (!dueIso) {
        setPendingUpdateError('Data e horário inválidos para atualização da pendência.');
        return;
      }

      await resumoService.updateChecklistItemDueDate(item.cardId, item.checkItemId, dueIso);
      setPendingUpdateSuccess(`Pendência "${item.name}" atualizada com sucesso.`);
      await loadData(selectedDate);
    } catch (err) {
      setPendingUpdateError(err.message || 'Erro ao atualizar pendência.');
    } finally {
      setUpdatingPendingItemKey('');
    }
  };

  const handleUpdateAllPendingItems = async () => {
    if (!bulkPendingDateInput) {
      setPendingUpdateError('Selecione data e horário que serão aplicados em todas as pendências.');
      return;
    }

    const updatableItems = pendingItems.filter((item) => item.cardId && item.checkItemId);

    if (updatableItems.length === 0) {
      setPendingUpdateError('Nenhuma pendência válida para atualização.');
      return;
    }

    setPendingUpdateError('');
    setPendingUpdateSuccess('');
    setIsUpdatingAllPending(true);

    try {
      const targetDueIso = toDueIsoFromInput(bulkPendingDateInput);
      if (!targetDueIso) {
        setPendingUpdateError('Data e horário inválidos para atualização em massa.');
        return;
      }

      await Promise.all(
        updatableItems.map((item) => resumoService.updateChecklistItemDueDate(item.cardId, item.checkItemId, targetDueIso))
      );

      setPendingUpdateSuccess(`${updatableItems.length} pendência(s) atualizada(s) com sucesso.`);
      await loadData(selectedDate);
    } catch (err) {
      setPendingUpdateError(err.message || 'Erro ao atualizar pendências.');
    } finally {
      setIsUpdatingAllPending(false);
    }
  };

  const controlButtonClass = dark
    ? 'border-neutral-700 bg-neutral-800/60 text-neutral-400 hover:bg-neutral-700/60 hover:text-white'
    : 'border-neutral-300 bg-white text-neutral-500 hover:bg-neutral-100 hover:text-black';

  return (
    <div className={`min-h-screen -mx-8 -my-8 px-8 py-8 ${dark ? 'bg-neutral-950 text-neutral-100' : 'bg-neutral-100 text-neutral-900'}`}>
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b -mx-8 -mt-8 mb-8 px-8 ${
        dark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white/90 border-neutral-200'
      }`}>
        <div className="flex items-center justify-between h-16 gap-4">
          <div>
            <h1 className={`text-xl font-bold ${dark ? 'text-white' : 'text-neutral-900'}`}>Resumo</h1>
            <p className={`text-xs ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>Atividades diárias dos colaboradores.</p>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handlePrintResumo}
              className={`p-2 rounded-lg border transition-colors ${controlButtonClass}`}
              title="Imprimir resumo"
            >
              <FiPrinter size={16} />
            </button>

            <MemberFilter
              members={rawData.members}
              selectedIds={selectedMemberIds}
              onChange={setSelectedMemberIds}
              dark={dark}
            />

            <button
              onClick={() => loadData(selectedDate)}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg transition-all"
            >
              <FiRefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              Atualizar
            </button>
          </div>
        </div>
      </header>

      <div className="flex items-center justify-center gap-3 mb-8">
        <button
          onClick={goToPrev}
          className={`p-2 rounded-lg border transition-colors ${controlButtonClass}`}
          title="Dia anterior"
        >
          <FiChevronLeft size={18} />
        </button>

        <div className="relative">
          <button
            onClick={handleDateClick}
            className={`px-5 py-2 min-w-[240px] text-center rounded-lg border font-medium text-sm transition-colors ${
              dark
                ? 'border-neutral-700 bg-neutral-800/60 text-white hover:bg-neutral-700/60'
                : 'border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100'
            }`}
            title="Clique para selecionar uma data"
          >
            {formatDateLabel(selectedDate)}
            {isToday && (
              <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-red-500">Hoje</span>
            )}
          </button>

          <input
            ref={dateInputRef}
            type="date"
            value={toInputValue(selectedDate)}
            onChange={handleDateChange}
            className="absolute inset-0 opacity-0 w-full h-full pointer-events-none"
            style={{ colorScheme: dark ? 'dark' : 'light' }}
          />
        </div>

        <button
          onClick={goToNext}
          className={`p-2 rounded-lg border transition-colors ${controlButtonClass}`}
          title="Dia seguinte"
        >
          <FiChevronRight size={18} />
        </button>
      </div>

      {!isLoading && !error && (
        <ProductivityPanel stats={productivityStats} dark={dark} />
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          <p className={`text-xs tracking-widest uppercase ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>Carregando...</p>
        </div>
      ) : error ? (
        <div className={`rounded-xl p-6 text-center max-w-md mx-auto border ${
          dark ? 'bg-neutral-900/60 border-red-900/40' : 'bg-white border-red-200'
        }`}>
          <p className="text-red-500 text-xs font-bold uppercase tracking-widest mb-2">Erro ao carregar dados</p>
          <p className={dark ? 'text-neutral-400 text-sm' : 'text-neutral-600 text-sm'}>{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="flex flex-col gap-6">
            <CommentsSection comments={comments} dark={dark} />
            <CompletedCardsSection cards={completedCards} dark={dark} />
          </div>

          <div className="flex flex-col gap-6">
            <CompletedChecklistSection groups={completedChecklistGroups} dark={dark} />
            <PendingChecklistSection
              groups={pendingGroups}
              dark={dark}
              onOpenTreatmentModal={handleOpenPendingTreatmentModal}
            />
          </div>
        </div>
      )}

      <PendingTreatmentModal
        open={isPendingModalOpen}
        onClose={() => setIsPendingModalOpen(false)}
        dark={dark}
        items={pendingItems}
        bulkDateInput={bulkPendingDateInput}
        onBulkDateChange={setBulkPendingDateInput}
        onUpdateAll={handleUpdateAllPendingItems}
        isBulkUpdating={isUpdatingAllPending}
        rowDateInputs={pendingItemDateInputs}
        onRowDateChange={handlePendingItemDateChange}
        onUpdateItem={handleUpdateSinglePendingItem}
        updatingItemKey={updatingPendingItemKey}
        error={pendingUpdateError}
        success={pendingUpdateSuccess}
      />
    </div>
  );
};

export default ResumePage;
