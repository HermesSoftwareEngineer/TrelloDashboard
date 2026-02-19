import { calculateAllFlowKPIs } from '../utils/flowKPIs';

const KPIsPanel = ({ cards, periodRange, dark = true }) => {
  if (!cards || !periodRange) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className={`text-sm ${dark ? 'text-neutral-500' : 'text-neutral-400'}`}>
          Sem dados para exibir
        </p>
      </div>
    );
  }

  const kpis = calculateAllFlowKPIs(
    cards,
    periodRange.startDate,
    periodRange.endDate
  );

  // Calcular trend/variação (simulado - poderia vir de período anterior)
  const getTrendArrow = (value) => {
    if (value > 0) return '↑';
    if (value < 0) return '↓';
    return '→';
  };

  const getTrendColor = (value) => {
    if (value > 0) return dark ? 'text-green-400' : 'text-green-600';
    if (value < 0) return dark ? 'text-red-400' : 'text-red-600';
    return dark ? 'text-neutral-400' : 'text-neutral-600';
  };

  // Classificação de throughput
  const getThroughputStatus = () => {
    const rate = (kpis.totalCompleted / Math.max(kpis.totalNew, 1)) * 100;
    if (rate > 110) return { label: 'Excelente', color: 'text-green-400' };
    if (rate >= 90) return { label: 'Bom', color: dark ? 'text-green-400' : 'text-green-600' };
    if (rate >= 70) return { label: 'Equilibrado', color: dark ? 'text-blue-400' : 'text-blue-600' };
    if (rate >= 50) return { label: 'Atenção', color: dark ? 'text-yellow-400' : 'text-yellow-600' };
    return { label: 'Crítico', color: dark ? 'text-red-400' : 'text-red-600' };
  };

  const throughputStatus = getThroughputStatus();

  const KpisCard = ({ label, value, unit, icon, trend }) => (
    <div className={`${
      dark ? 'bg-[#0c0c0c] border border-[#272727]' : 'bg-white border border-[#e5e5e5]'
    } rounded-xl p-4 flex flex-col`}>
      <div className="flex justify-between items-start mb-2">
        <p className={`text-xs uppercase tracking-widest font-bold ${
          dark ? 'text-[#737373]' : 'text-[#737373]'
        }`}>
          {label}
        </p>
        <span className="text-lg">{icon}</span>
      </div>
      
      <div className="flex items-baseline gap-2 mb-1">
        <p className={`text-3xl font-bold ${
          dark ? 'text-[#f5f5f5]' : 'text-[#0c0c0c]'
        }`}>
          {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(2) : value}
        </p>
        <span className={`text-xs ${dark ? 'text-[#737373]' : 'text-[#737373]'}`}>
          {unit}
        </span>
      </div>

      {trend !== undefined && (
        <div className={`text-xs font-medium ${getTrendColor(trend)}`}>
          {getTrendArrow(trend)} {Math.abs(trend)}% vs período anterior
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className={`text-xs font-bold uppercase tracking-widest ${
          dark ? 'text-neutral-500' : 'text-neutral-600'
        }`}>
          KPIs de Vazão
        </h3>
        <p className={`text-xs mt-1 ${dark ? 'text-neutral-600' : 'text-neutral-500'}`}>
          Indicadores de fluxo e desempenho do período
        </p>
      </div>

      {/* Grid de KPIs principais */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <KpisCard 
          label="Novos" 
          value={kpis.totalNew} 
          unit="processos" 
          icon="🆕"
        />
        
        <KpisCard 
          label="Concluídos" 
          value={kpis.totalCompleted} 
          unit="processos" 
          icon="✓"
        />
        
        <KpisCard 
          label="Em Andamento" 
          value={kpis.totalInProgress} 
          unit="processos" 
          icon="⏳"
        />
        
        <KpisCard 
          label="Novos/Dia" 
          value={kpis.avgNewPerDay} 
          unit="média" 
          icon="📈"
        />
        
        <KpisCard 
          label="Concluídos/Dia" 
          value={kpis.avgCompletedPerDay} 
          unit="média" 
          icon="📊"
        />
        
        <KpisCard 
          label="Tempo Médio" 
          value={kpis.avgProcessTime} 
          unit="dias" 
          icon="⏱️"
        />
      </div>

      {/* Métricas Avançadas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Throughput Rate */}
        <div className={`${
          dark ? 'bg-[#0c0c0c] border border-[#272727]' : 'bg-white border border-[#e5e5e5]'
        } rounded-xl p-4`}>
          <p className={`text-xs uppercase tracking-widest font-bold mb-3 ${
            dark ? 'text-[#737373]' : 'text-[#737373]'
          }`}>
            Taxa de Saída
          </p>
          
          <div className="flex items-end gap-3 mb-2">
            <div className="flex-1">
              <p className={`text-2xl font-bold ${
                dark ? 'text-[#f5f5f5]' : 'text-[#0c0c0c]'
              }`}>
                {((kpis.totalCompleted / Math.max(kpis.totalNew, 1)) * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className={`text-xs font-bold px-2 py-1 rounded-full ${
                throughputStatus.color
              } ${dark ? 'bg-[#1a1a1a]' : 'bg-neutral-100'}`}>
                {throughputStatus.label}
              </p>
            </div>
          </div>
          
          <p className={`text-xs ${dark ? 'text-[#737373]' : 'text-[#737373]'}`}>
            {kpis.totalCompleted} / {kpis.totalNew} = {((kpis.totalCompleted / Math.max(kpis.totalNew, 1)) * 100).toFixed(1)}%
          </p>
        </div>

        {/* Net Flow */}
        <div className={`${
          dark ? 'bg-[#0c0c0c] border border-[#272727]' : 'bg-white border border-[#e5e5e5]'
        } rounded-xl p-4`}>
          <p className={`text-xs uppercase tracking-widest font-bold mb-3 ${
            dark ? 'text-[#737373]' : 'text-[#737373]'
          }`}>
            Fluxo Líquido
          </p>
          
          <div className="flex items-end gap-2 mb-2">
            <p className={`text-2xl font-bold ${
              (kpis.avgCompletedPerDay - kpis.avgNewPerDay) >= 0 
                ? (dark ? 'text-green-400' : 'text-green-600')
                : (dark ? 'text-red-400' : 'text-red-600')
            }`}>
              {(kpis.avgCompletedPerDay - kpis.avgNewPerDay).toFixed(2)}
            </p>
            <span className="text-xs text-neutral-500">processos/dia</span>
          </div>
          
          <div className={`text-xs ${dark ? 'text-[#737373]' : 'text-[#737373]'}`}>
            {kpis.avgCompletedPerDay.toFixed(2)} (saída) - {kpis.avgNewPerDay.toFixed(2)} (entrada)
          </div>
          
          {(kpis.avgCompletedPerDay - kpis.avgNewPerDay) > 0 && (
            <p className={`text-xs font-medium mt-2 ${dark ? 'text-green-400' : 'text-green-600'}`}>
              ✓ Reduzindo backlog
            </p>
          )}
          {(kpis.avgCompletedPerDay - kpis.avgNewPerDay) < 0 && (
            <p className={`text-xs font-medium mt-2 ${dark ? 'text-red-400' : 'text-red-600'}`}>
              ⚠ Acumulando trabalho
            </p>
          )}
        </div>

        {/* WIP / Throughput Ratio */}
        <div className={`${
          dark ? 'bg-[#0c0c0c] border border-[#272727]' : 'bg-white border border-[#e5e5e5]'
        } rounded-xl p-4`}>
          <p className={`text-xs uppercase tracking-widest font-bold mb-3 ${
            dark ? 'text-[#737373]' : 'text-[#737373]'
          }`}>
            Taxa WIP
          </p>
          
          <p className={`text-2xl font-bold mb-2 ${
            dark ? 'text-[#f5f5f5]' : 'text-[#0c0c0c]'
          }`}>
            {(kpis.totalInProgress / Math.max(kpis.totalCompleted, 1)).toFixed(2)}
          </p>
          
          <p className={`text-xs ${dark ? 'text-[#737373]' : 'text-[#737373]'}`}>
            {kpis.totalInProgress} (WIP) / {kpis.totalCompleted} (completos)
          </p>
          
          {(kpis.totalInProgress / Math.max(kpis.totalCompleted, 1)) < 1 && (
            <p className={`text-xs font-medium mt-2 ${dark ? 'text-green-400' : 'text-green-600'}`}>
              ✓ WIP controlado
            </p>
          )}
          {(kpis.totalInProgress / Math.max(kpis.totalCompleted, 1)) >= 2 && (
            <p className={`text-xs font-medium mt-2 ${dark ? 'text-red-400' : 'text-red-600'}`}>
              ⚠ WIP elevado
            </p>
          )}
        </div>
      </div>

      {/* Resumo período */}
      <div className={`${
        dark ? 'bg-[#0c0c0c] border border-[#272727]' : 'bg-white border border-[#e5e5e5]'
      } rounded-xl p-4 mt-4`}>
        <p className={`text-xs font-bold mb-2 ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>
          Período Analisado
        </p>
        <p className={`text-xs ${dark ? 'text-neutral-500' : 'text-neutral-600'}`}>
          {kpis.periodDays} dias | {periodRange.label}
        </p>
      </div>
    </div>
  );
};

export default KPIsPanel;
