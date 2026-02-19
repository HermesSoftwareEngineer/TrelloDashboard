import { useState } from 'react';
import CardsListModal from './CardsListModal';

/**
 * Diagrama de Venn mostrando as interseções entre
 * processos Novos, Em Andamento e Concluídos no período.
 *
 * Regiões possíveis (IP ∩ Concluídos = ∅ por definição):
 *   [IP only] ── [New ∩ IP] ── [New ∩ Comp] ── [Comp only]
 */
const ProcessVennDiagram = ({ cards, periodRange, dark = true }) => {
  const [selectedRegion, setSelectedRegion] = useState(null);

  if (!cards || !periodRange) return null;

  const start = new Date(periodRange.startDate);
  const end   = new Date(periodRange.endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  // ── Classify each card into exactly one region ───────────────────────────
  const ipOnly    = [];   // created before period, still active
  const newAndIp  = [];   // created in period, still active
  const newAndComp = [];  // created AND completed in period
  const compOnly  = [];   // created before period, completed in period

  cards.forEach(card => {
    if (!card.creationDate) return;
    const createdAt   = new Date(card.creationDate);
    if (createdAt > end) return; // card doesn't exist yet in this period
    const completedAt = card.completionDate ? new Date(card.completionDate) : null;

    const isNew        = createdAt >= start && createdAt <= end;
    const isCompleted  = !!completedAt && completedAt >= start && completedAt <= end;
    const isInProgress = createdAt <= end && (!completedAt || completedAt > end);

    if (isNew && isCompleted)        newAndComp.push(card);
    else if (isNew && isInProgress)  newAndIp.push(card);
    else if (!isNew && isCompleted)  compOnly.push(card);
    else if (!isNew && isInProgress) ipOnly.push(card);
  });

  // ── SVG geometry ─────────────────────────────────────────────────────────
  const r   = 95;
  const cy  = 148;
  const ipCx   = 152;
  const newCx  = 292;   // distance from IP = 140  (overlap = r+r-140 = 50px)
  const compCx = 432;   // distance from New = 140
  // IP ↔ Comp distance = 280 > 2r = 190 → never overlap ✓

  // Region label x positions (approximate center of each logical area)
  const ipOnlyX   = 83;   // left non-overlapping part of IP circle
  const newIpX    = 222;  // IP ∩ New lens center
  const newCompX  = 362;  // New ∩ Comp lens center
  const compOnlyX = 501;  // right non-overlapping part of Comp circle

  const regions = [
    {
      id: 'ip-only',
      label: 'Em Andamento\n(anteriores)',
      title: 'Em Andamento — criados antes do período',
      x: ipOnlyX,
      count: ipOnly.length,
      cards: ipOnly,
      color: '#f59e0b',
      dateField: 'creationDate',
      dotColor: 'bg-yellow-500',
      accentColor: dark ? 'text-yellow-400' : 'text-yellow-600',
      badgeColor: dark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700',
    },
    {
      id: 'new-ip',
      label: 'Novos em\nAndamento',
      title: 'Novos em Andamento — criados no período, ainda abertos',
      x: newIpX,
      count: newAndIp.length,
      cards: newAndIp,
      color: '#818cf8',
      dateField: 'creationDate',
      dotColor: 'bg-indigo-400',
      accentColor: dark ? 'text-indigo-400' : 'text-indigo-600',
      badgeColor: dark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-700',
    },
    {
      id: 'new-comp',
      label: 'Novos e\nConcluídos',
      title: 'Novos e Concluídos — abertos e fechados no período',
      x: newCompX,
      count: newAndComp.length,
      cards: newAndComp,
      color: '#34d399',
      dateField: 'completionDate',
      dotColor: 'bg-emerald-400',
      accentColor: dark ? 'text-emerald-400' : 'text-emerald-600',
      badgeColor: dark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700',
    },
    {
      id: 'comp-only',
      label: 'Concluídos\n(anteriores)',
      title: 'Concluídos — criados antes do período',
      x: compOnlyX,
      count: compOnly.length,
      cards: compOnly,
      color: '#10b981',
      dateField: 'completionDate',
      dotColor: 'bg-green-500',
      accentColor: dark ? 'text-green-400' : 'text-green-600',
      badgeColor: dark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700',
    },
  ];

  const axisColor   = dark ? '#404040' : '#d4d4d4';
  const subTextColor = dark ? '#525252' : '#a3a3a3';

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-5">
        <h3 className={`text-xs font-bold uppercase tracking-widest ${
          dark ? 'text-neutral-500' : 'text-neutral-600'
        }`}>
          Diagrama de Venn — Interseções de Processos
        </h3>
        <p className={`text-xs mt-1 ${dark ? 'text-neutral-600' : 'text-neutral-500'}`}>
          Clique em uma região para listar os processos · Em Andamento ∩ Concluídos&nbsp;=&nbsp;∅
        </p>
      </div>

      {/* SVG Venn Diagram */}
      <div className="overflow-x-auto">
        <svg
          viewBox="0 0 584 290"
          className="w-full max-w-2xl mx-auto block"
          style={{ minWidth: 340 }}
        >
          {/* ── Circle fills ─────────────────────────────────── */}
          <circle cx={ipCx}   cy={cy} r={r}
            fill={dark ? 'rgba(245,158,11,0.10)' : 'rgba(245,158,11,0.16)'}
            stroke={dark ? 'rgba(245,158,11,0.45)' : 'rgba(245,158,11,0.65)'}
            strokeWidth={1.5} />
          <circle cx={newCx}  cy={cy} r={r}
            fill={dark ? 'rgba(99,102,241,0.10)' : 'rgba(99,102,241,0.16)'}
            stroke={dark ? 'rgba(99,102,241,0.45)' : 'rgba(99,102,241,0.65)'}
            strokeWidth={1.5} />
          <circle cx={compCx} cy={cy} r={r}
            fill={dark ? 'rgba(16,185,129,0.10)' : 'rgba(16,185,129,0.16)'}
            stroke={dark ? 'rgba(16,185,129,0.45)' : 'rgba(16,185,129,0.65)'}
            strokeWidth={1.5} />

          {/* ── "Empty" annotation between IP and Comp ───────── */}
          <text x={292} y={cy + 4} textAnchor="middle"
            fill={subTextColor} fontSize={9} fontStyle="italic">
            ∅
          </text>
          <text x={292} y={cy + 17} textAnchor="middle"
            fill={subTextColor} fontSize={7.5}>
            (sem interseção)
          </text>

          {/* ── Circle name labels ────────────────────────────── */}
          <text x={ipCx}   y={27} textAnchor="middle"
            fill={dark ? '#f59e0b' : '#b45309'} fontSize={10.5} fontWeight="700">
            Em Andamento
          </text>
          <text x={newCx}  y={13} textAnchor="middle"
            fill={dark ? '#818cf8' : '#4338ca'} fontSize={10.5} fontWeight="700">
            Novos
          </text>
          <text x={compCx} y={27} textAnchor="middle"
            fill={dark ? '#34d399' : '#047857'} fontSize={10.5} fontWeight="700">
            Concluídos
          </text>

          {/* ── Intersection brace labels at bottom ──────────── */}
          <line x1={ipCx} y1={cy + r + 8} x2={newCx} y2={cy + r + 8}
            stroke={axisColor} strokeWidth={1} />
          <text x={newIpX} y={cy + r + 22} textAnchor="middle"
            fill={subTextColor} fontSize={8}>
            Em And. ∩ Novos
          </text>

          <line x1={newCx} y1={cy + r + 8} x2={compCx} y2={cy + r + 8}
            stroke={axisColor} strokeWidth={1} />
          <text x={newCompX} y={cy + r + 22} textAnchor="middle"
            fill={subTextColor} fontSize={8}>
            Novos ∩ Conc.
          </text>

          {/* ── Clickable region groups ───────────────────────── */}
          {regions.map(region => (
            <g
              key={region.id}
              onClick={() => region.count > 0 && setSelectedRegion(region)}
              style={{ cursor: region.count > 0 ? 'pointer' : 'default' }}
            >
              {/* Transparent hit area */}
              <circle cx={region.x} cy={cy} r={50} fill="transparent" />

              {/* Count */}
              <text
                x={region.x}
                y={cy - 4}
                textAnchor="middle"
                fontFamily="system-ui, -apple-system, sans-serif"
                fontSize={34}
                fontWeight="800"
                fill={region.count > 0 ? region.color : axisColor}
              >
                {region.count}
              </text>

              {/* Two-line label */}
              {region.label.split('\n').map((line, i) => (
                <text
                  key={i}
                  x={region.x}
                  y={cy + 20 + i * 13}
                  textAnchor="middle"
                  fill={dark ? '#737373' : '#6b7280'}
                  fontSize={9}
                >
                  {line}
                </text>
              ))}

              {/* "Ver lista" hint */}
              {region.count > 0 && (
                <text
                  x={region.x}
                  y={cy + 52}
                  textAnchor="middle"
                  fill={region.color}
                  fontSize={7.5}
                  opacity={0.65}
                >
                  ↗ ver lista
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>

      {/* ── Summary cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-5">
        {regions.map(region => (
          <button
            key={region.id}
            onClick={() => region.count > 0 && setSelectedRegion(region)}
            disabled={region.count === 0}
            className={`p-3 rounded-xl text-left transition-colors ${
              dark ? 'bg-neutral-900' : 'bg-neutral-50'
            } ${
              region.count > 0
                ? dark
                  ? 'hover:bg-neutral-800 cursor-pointer'
                  : 'hover:bg-neutral-100 cursor-pointer'
                : 'opacity-40 cursor-default'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: region.color }}
              />
              <span className={`text-[9px] font-bold uppercase tracking-wider leading-tight ${
                dark ? 'text-neutral-400' : 'text-neutral-600'
              }`}>
                {region.label.replace('\n', ' ')}
              </span>
            </div>
            <p className="text-2xl font-bold" style={{ color: region.color }}>
              {region.count}
            </p>
          </button>
        ))}
      </div>

      {/* ── Modal ────────────────────────────────────────────────── */}
      {selectedRegion && (
        <CardsListModal
          title={selectedRegion.title}
          subtitle="Diagrama de Venn — Processos"
          sections={[{
            title: selectedRegion.title,
            dotColor: selectedRegion.dotColor,
            accentColor: selectedRegion.accentColor,
            badgeColor: selectedRegion.badgeColor,
            cards: selectedRegion.cards,
            dateField: selectedRegion.dateField,
          }]}
          dark={dark}
          onClose={() => setSelectedRegion(null)}
        />
      )}
    </div>
  );
};

export default ProcessVennDiagram;
