# 📊 KPIs DE VAZÃO

Funções puras para cálculo de indicadores de vazão de processos.

## 📁 Arquivo

```
src/utils/flowKPIs.js
```

## 🎯 KPIs Implementados

### 1. Total de Novos Processos
```javascript
import { calculateNewProcesses } from './utils/flowKPIs';

const total = calculateNewProcesses(cards, startDate, endDate);
// Retorna: número de cards criados no período
```

### 2. Total de Concluídos
```javascript
import { calculateCompletedProcesses } from './utils/flowKPIs';

const total = calculateCompletedProcesses(cards, startDate, endDate);
// Retorna: número de cards concluídos no período
```

### 3. Total em Andamento
```javascript
import { calculateInProgressProcesses } from './utils/flowKPIs';

const total = calculateInProgressProcesses(cards, startDate, endDate);
// Retorna: número de cards ativos (criados antes/durante, não concluídos)
```

### 4. Média de Novos por Dia
```javascript
import { calculateAvgNewPerDay } from './utils/flowKPIs';

const avg = calculateAvgNewPerDay(cards, startDate, endDate);
// Retorna: média diária (2 decimais)
```

### 5. Média de Concluídos por Dia
```javascript
import { calculateAvgCompletedPerDay } from './utils/flowKPIs';

const avg = calculateAvgCompletedPerDay(cards, startDate, endDate);
// Retorna: média diária (2 decimais)
```

### 6. Tempo Médio de Processo
```javascript
import { calculateAvgProcessTime } from './utils/flowKPIs';

const avgTime = calculateAvgProcessTime(cards, startDate, endDate);
// Retorna: tempo médio em dias (2 decimais)
// Considera apenas cards concluídos no período
```

## ⚡ Função Agregada

```javascript
import { calculateAllFlowKPIs } from './utils/flowKPIs';

const kpis = calculateAllFlowKPIs(cards, startDate, endDate);
// {
//   totalNew: 42,
//   totalCompleted: 38,
//   totalInProgress: 15,
//   avgNewPerDay: 1.4,
//   avgCompletedPerDay: 1.27,
//   avgProcessTime: 12.5,
//   periodDays: 30
// }
```

## 📈 KPIs Detalhados

```javascript
import { calculateDetailedFlowKPIs } from './utils/flowKPIs';

const detailed = calculateDetailedFlowKPIs(cards, startDate, endDate);
// Inclui:
// - Todos os KPIs básicos
// - Throughput rate (%)
// - WIP/Throughput ratio
// - Net flow (saída - entrada)
```

## ✅ Validação Matemática

```javascript
import { validateKPIs } from './utils/flowKPIs';

const kpis = calculateAllFlowKPIs(cards, startDate, endDate);
const validation = validateKPIs(kpis);

if (validation.isValid) {
  console.log('KPIs válidos');
} else {
  console.error('Erros:', validation.errors);
}
```

**Regras de validação:**
- Valores não negativos
- Médias consistentes com totais
- `avgNewPerDay = totalNew / periodDays`
- `avgCompletedPerDay = totalCompleted / periodDays`
- Período ≥ 1 dia

## 🔄 Comparação de Períodos

```javascript
import { compareFlowKPIs } from './utils/flowKPIs';

const comparison = compareFlowKPIs(
  cards,
  period1Start, period1End,
  period2Start, period2End
);

// Retorna:
// - KPIs de ambos períodos
// - Mudanças absolutas e percentuais
// - changes.totalNew.absolute: +5
// - changes.totalNew.percentage: 12.5
```

## 📊 Uso com Context API

```javascript
import { usePeriodFilter } from './hooks/usePeriodFilter';
import useTrello from './hooks/useTrello';
import { calculateAllFlowKPIs } from './utils/flowKPIs';

function KPIsPanel() {
  const { normalizedData } = useTrello('BOARD_ID');
  const { periodRange } = usePeriodFilter();
  
  const kpis = calculateAllFlowKPIs(
    normalizedData.cards,
    periodRange.startDate,
    periodRange.endDate
  );
  
  return (
    <div>
      <div>Novos: {kpis.totalNew}</div>
      <div>Concluídos: {kpis.totalCompleted}</div>
      <div>Tempo médio: {kpis.avgProcessTime} dias</div>
    </div>
  );
}
```

## 🧮 Fórmulas

### Total de Novos
```
cards.filter(card => 
  card.createdAt >= startDate && 
  card.createdAt <= endDate
).length
```

### Total de Concluídos
```
cards.filter(card => 
  card.completedAt >= startDate && 
  card.completedAt <= endDate
).length
```

### Total em Andamento
```
cards.filter(card => 
  card.createdAt <= endDate &&
  (!card.completedAt || card.completedAt > endDate)
).length
```

### Média por Dia
```
total / periodDays
```

### Tempo Médio
```
completedCards = cards.filter(card => 
  card.completedAt >= startDate && 
  card.completedAt <= endDate
)

times = completedCards.map(card => 
  (card.completedAt - card.createdAt) / (1000*60*60*24)
)

avg = sum(times) / times.length
```

### Período em Dias
```
Math.ceil((endDate - startDate) / (1000*60*60*24)) + 1
```

## 🎯 Métricas Avançadas

### Throughput Rate
```
(totalCompleted / totalNew) * 100
```
- \>110%: Excelente
- 90-110%: Bom
- 70-90%: Equilibrado
- 50-70%: Atenção
- <50%: Crítico

### WIP/Throughput Ratio
```
totalInProgress / totalCompleted
```
Ideal: Baixo WIP com alto throughput

### Net Flow
```
avgCompletedPerDay - avgNewPerDay
```
- Positivo: Reduzindo backlog
- Zero: Equilibrado
- Negativo: Acumulando trabalho

## 🧪 Testes Manuais

```javascript
// Mock
const cards = [
  { 
    id: '1',
    createdAt: '2026-02-01T10:00:00Z',
    completedAt: '2026-02-15T15:00:00Z'
  },
  { 
    id: '2',
    createdAt: '2026-02-10T10:00:00Z',
    completedAt: null
  }
];

const start = new Date('2026-02-01');
const end = new Date('2026-02-28');

// Testar
const kpis = calculateAllFlowKPIs(cards, start, end);
console.log(kpis);
// {
//   totalNew: 2,
//   totalCompleted: 1,
//   totalInProgress: 1,
//   avgNewPerDay: 0.07,
//   avgCompletedPerDay: 0.04,
//   avgProcessTime: 14,
//   periodDays: 28
// }

// Validar
const validation = validateKPIs(kpis);
console.log(validation.isValid); // true
```

## 📚 Exemplos

Consulte `src/examples/flowKPIsExamples.jsx` para:
- 8 exemplos completos
- Componentes React prontos
- Validação visual
- Comparação de períodos
- Dashboard integrado

## ⚙️ Características

✅ Funções puras (sem side effects)  
✅ Validação matemática integrada  
✅ Precisão de 2 decimais  
✅ Tratamento de casos extremos  
✅ Compatível com sistema de períodos  
✅ Performance otimizada (O(n))
