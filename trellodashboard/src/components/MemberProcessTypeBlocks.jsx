import { calculateMemberTimeByProcessType } from '../utils/memberAnalysisProcessor';

const COLOR_MAP = {
  green: '#22c55e',
  yellow: '#eab308',
  orange: '#f97316',
  red: '#ef4444',
  purple: '#a855f7',
  blue: '#3b82f6',
  sky: '#38bdf8',
  lime: '#84cc16',
  pink: '#ec4899',
  black: '#111827',
  gray: '#6b7280'
};

const getTypeColor = (color) => COLOR_MAP[color] || COLOR_MAP.gray;

const MemberProcessTypeBlocks = ({ cards, periodRange, dark = true }) => {
  if (!cards || !periodRange) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className={`text-sm ${dark ? 'text-neutral-500' : 'text-neutral-400'}`}>
          Sem dados para exibir
        </p>
      </div>
    );
  }

  const analysisMap = calculateMemberTimeByProcessType(
    cards,
    periodRange.startDate,
    periodRange.endDate
  );

  const members = Object.values(analysisMap || {});

  if (members.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className={`text-sm ${dark ? 'text-neutral-500' : 'text-neutral-400'}`}>
          Nenhum dado de processo por colaborador
        </p>
      </div>
    );
  }

  const sortedMembers = [...members].sort((a, b) =>
    a.memberName.localeCompare(b.memberName, 'pt-BR')
  );

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className={`text-xs font-bold uppercase tracking-widest ${
          dark ? 'text-neutral-500' : 'text-neutral-600'
        }`}>
          Tipos de Processo por Colaborador
        </h3>
        <p className={`text-xs mt-1 ${dark ? 'text-neutral-600' : 'text-neutral-500'}`}>
          Tempo medio por tipo de processo (apenas concluidos)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sortedMembers.map(member => {
          const totalCount = member.totalCards ?? member.processTypes.reduce((sum, type) => sum + type.count, 0);

          return (
            <div
              key={member.memberId}
              className={`rounded-2xl p-4 border ${
                dark ? 'bg-[#0c0c0c] border-[#272727]' : 'bg-white border-[#e5e5e5]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className={`text-sm font-bold ${dark ? 'text-neutral-100' : 'text-neutral-900'}`}>
                    {member.memberName || 'Sem Responsavel'}
                  </p>
                  <p className={`text-xs ${dark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                    {totalCount} processos concluidos
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {member.processTypes.map(type => (
                  <div key={type.typeId} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: getTypeColor(type.typeColor) }}
                        aria-hidden="true"
                      />
                      <span className={dark ? 'text-neutral-300' : 'text-neutral-600'}>
                        {type.typeName || 'Sem Tipo'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={dark ? 'text-neutral-400' : 'text-neutral-500'}>
                        {type.count}x
                      </span>
                      <span className={dark ? 'text-neutral-100' : 'text-neutral-900'}>
                        {type.avgTimeDays}d
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MemberProcessTypeBlocks;
