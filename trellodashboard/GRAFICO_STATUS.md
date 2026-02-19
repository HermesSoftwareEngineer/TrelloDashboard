# 📊 GRÁFICO DE STATUS - PIZZA

Lógica de classificação e agregação de cards por status para gráfico de pizza.

## 🎯 Objetivo

Gerar dados para visualizar a distribuição de status dos cards em um período:
- **Novos no período**: Cards criados no período (não concluídos nele)
- **Em andamento**: Cards ativos mas não concluídos no período
- **Concluídos no período**: Cards finalizados no período

## 📁 Arquivos

```
src/utils/statusChartProcessor.js  → Lógica de classificação e agregação
src/examples/statusChartExamples.jsx → 10 exemplos práticos de uso
```

## 🔧 Funções Principais

### 1. Classificação de Card

```javascript
import { classifyCardStatus } from './utils/statusChartProcessor';

const status = classifyCardStatus(card, startDate, endDate);
// Retorna: 'new' | 'in-progress' | 'completed' | null
```

**Regras de Classificação** (mutuamente exclusivas, por prioridade):
1. **completed**: Card concluído dentro do período (maior prioridade)
2. **new**: Card criado no período e não concluído nele
3. **in-progress**: Card ativo mas não concluído no período

### 2. Contadores Simples

```javascript
import { getStatusCounts } from './utils/statusChartProcessor';

const counts = getStatusCounts(cards, startDate, endDate);
// {
//   new: 12,
//   inProgress: 8,
//   completed: 15,
//   total: 35
// }
```

### 3. Dataset para Gráfico

```javascript
import { generateStatusDataset } from './utils/statusChartProcessor';

const dataset = generateStatusDataset(cards, startDate, endDate);
// {
//   labels: ['Novos no período', 'Em andamento', 'Concluídos no período'],
//   datasets: [{
//     data: [12, 8, 15],
//     backgroundColor: ['#3B82F6', '#F59E0B', '#10B981'],
//     borderWidth: 2,
//     borderColor: '#ffffff'
//   }],
//   total: 35,
//   percentages: [34.3, 22.9, 42.9],
//   metadata: { ... }
// }
```

**Compatível com Chart.js:**
```javascript
new Chart(ctx, {
  type: 'pie',
  data: dataset,
  options: { responsive: true }
});
```

### 4. Resumo Detalhado

```javascript
import { getStatusSummary } from './utils/statusChartProcessor';

const summary = getStatusSummary(cards, startDate, endDate);
// {
//   period: { startDate, endDate, days },
//   totals: { new, inProgress, completed, total },
//   percentages: { new, inProgress, completed },
//   cards: {
//     new: [...],        // Array de cards novos
//     inProgress: [...], // Array de cards em andamento
//     completed: [...]   // Array de cards concluídos
//   }
// }
```

### 5. Métricas de Desempenho

```javascript
import { calculateStatusMetrics } from './utils/statusChartProcessor';

const metrics = calculateStatusMetrics(cards, startDate, endDate);
// {
//   completionRate: 42.9,        // % de conclusão
//   intakeRate: 34.3,            // % de novos
//   wipRate: 22.9,               // % em andamento
//   avgCompletionsPerDay: 0.5,   // Média diária de conclusões
//   avgNewPerDay: 0.4,           // Média diária de novos
//   healthScore: 78,             // Score de saúde (0-100)
//   healthStatus: 'Bom'          // Excelente/Bom/Regular/Atenção/Crítico
// }
```

**Cálculo do Health Score:**
- Base: 50 pontos
- Taxa de conclusão: +0 a +40 pontos
- Balance entrada/saída: +0 a +20 pontos
- WIP controlado: -10 a +10 pontos
- **Resultado:** 0-100

**Classificação:**
- ≥80: Excelente
- 60-79: Bom
- 40-59: Regular
- 20-39: Atenção
- <20: Crítico

### 6. Filtrar Cards por Status

```javascript
import { filterCardsByStatus } from './utils/statusChartProcessor';

const newCards = filterCardsByStatus(cards, 'new', startDate, endDate);
const inProgressCards = filterCardsByStatus(cards, 'in-progress', startDate, endDate);
const completedCards = filterCardsByStatus(cards, 'completed', startDate, endDate);
```

### 7. Comparação Entre Períodos

```javascript
import { compareStatusBetweenPeriods } from './utils/statusChartProcessor';

const comparison = compareStatusBetweenPeriods(
  cards,
  period1Start, period1End,
  period2Start, period2End
);
// {
//   period1: { startDate, endDate, counts },
//   period2: { startDate, endDate, counts },
//   changes: {
//     new: { absolute: +5, percentage: 41.7 },
//     inProgress: { absolute: -2, percentage: -20.0 },
//     completed: { absolute: +3, percentage: 25.0 },
//     total: { absolute: +6, percentage: 20.7 }
//   }
// }
```

## 🎨 Customização do Dataset

```javascript
const dataset = generateStatusDataset(cards, startDate, endDate, {
  // Customizar labels
  labelMap: {
    new: 'Novos Processos',
    'in-progress': 'Processos Ativos',
    completed: 'Processos Finalizados'
  },
  
  // Customizar cores
  colorMap: {
    new: '#1E40AF',
    'in-progress': '#D97706',
    completed: '#059669'
  },
  
  // Customizar ordem
  order: ['completed', 'new', 'in-progress']
});
```

## 📊 Uso com Context API

```jsx
import { usePeriodFilter } from './hooks/usePeriodFilter';
import useTrello from './hooks/useTrello';
import { getStatusCounts } from './utils/statusChartProcessor';

function StatusWidget() {
  const { normalizedData } = useTrello('BOARD_ID');
  const { periodRange } = usePeriodFilter();
  
  const counts = getStatusCounts(
    normalizedData.cards,
    periodRange.startDate,
    periodRange.endDate
  );
  
  return (
    <div>
      <div>Novos: {counts.new}</div>
      <div>Em andamento: {counts.inProgress}</div>
      <div>Concluídos: {counts.completed}</div>
    </div>
  );
}
```

## 🔄 Fluxo de Dados

```
Cards Trello (API)
    ↓
normalizedData (useTrello)
    ↓
Period Range (usePeriodFilter)
    ↓
statusChartProcessor
    ↓
Dataset / Counts / Metrics
    ↓
UI Components / Charts
```

## 📈 Exemplo Completo

```jsx
import { usePeriodFilter } from './hooks/usePeriodFilter';
import useTrello from './hooks/useTrello';
import { 
  generateStatusDataset, 
  calculateStatusMetrics 
} from './utils/statusChartProcessor';
import { Pie } from 'react-chartjs-2';

function StatusDashboard() {
  const { normalizedData } = useTrello('SEU_BOARD_ID');
  const { periodRange } = usePeriodFilter();
  
  if (!normalizedData || !periodRange) return <div>Carregando...</div>;
  
  const dataset = generateStatusDataset(
    normalizedData.cards,
    periodRange.startDate,
    periodRange.endDate
  );
  
  const metrics = calculateStatusMetrics(
    normalizedData.cards,
    periodRange.startDate,
    periodRange.endDate
  );
  
  return (
    <div>
      <h2>Status Geral do Período</h2>
      
      {/* Gráfico de Pizza */}
      <Pie data={dataset} />
      
      {/* Métricas */}
      <div>
        <div>Taxa de Conclusão: {metrics.completionRate}%</div>
        <div>Saúde: {metrics.healthStatus} ({metrics.healthScore})</div>
        <div>Conclusões/dia: {metrics.avgCompletionsPerDay}</div>
      </div>
    </div>
  );
}
```

## 🧪 Testes Manuais

```javascript
// Mock de cards
const cards = [
  { 
    id: '1', 
    name: 'Card 1',
    createdAt: '2026-01-05T10:00:00Z',
    completedAt: '2026-01-20T15:00:00Z'
  },
  { 
    id: '2', 
    name: 'Card 2',
    createdAt: '2026-01-15T10:00:00Z',
    completedAt: null
  },
  { 
    id: '3', 
    name: 'Card 3',
    createdAt: '2025-12-20T10:00:00Z',
    completedAt: null
  }
];

const startDate = new Date('2026-01-01');
const endDate = new Date('2026-01-31');

// Testar classificação
import { classifyCardStatus } from './utils/statusChartProcessor';

console.log(classifyCardStatus(cards[0], startDate, endDate)); // 'completed'
console.log(classifyCardStatus(cards[1], startDate, endDate)); // 'new'
console.log(classifyCardStatus(cards[2], startDate, endDate)); // 'in-progress'

// Testar contadores
import { getStatusCounts } from './utils/statusChartProcessor';

const counts = getStatusCounts(cards, startDate, endDate);
console.log(counts); // { new: 1, inProgress: 1, completed: 1, total: 3 }
```

## 📚 Exemplos Adicionais

Consulte `src/examples/statusChartExamples.jsx` para:
- 10 exemplos completos de componentes React
- Uso com Tailwind CSS
- Integração com Chart.js
- Comparação entre períodos
- Widgets e cards de métricas

## ⚙️ Próximos Passos

1. ✅ Lógica de classificação implementada
2. ✅ Funções de agregação criadas
3. ⏳ Implementar visualização com Chart.js ou similar
4. ⏳ Adicionar animações e interatividade
5. ⏳ Integrar no Dashboard principal
