# 📈 Gráfico de Evolução de Processos

Sistema de agregação temporal para gráfico de linhas de evolução de processos.

---

## 🎯 Funcionalidade

Gera datasets para gráfico de linhas mostrando:
- **Novos processos** - Cards criados no período
- **Processos concluídos** - Cards concluídos no período

---

## 📊 Granularidade Automática

```javascript
≤ 31 dias    → Diário (dia a dia)
32-365 dias  → Semanal (semana a semana)
> 365 dias   → Mensal (mês a mês)
```

---

## 🚀 Uso Básico

```javascript
import chartDataProcessor from './utils/chartDataProcessor';
import usePeriodFilter from './hooks/usePeriodFilter';

const { normalizedData } = useTrelloBoard({ normalize: true });
const { periodRange } = usePeriodFilter();

// Gerar dataset
const dataset = chartDataProcessor.generateEvolutionDataset(
  normalizedData.cards,
  periodRange
);
```

---

## 📦 Estrutura do Dataset

```javascript
{
  // Labels para eixo X
  labels: ["18/02", "19/02", "20/02", ...],
  
  // Séries de dados
  series: {
    created: {
      label: "Novos Processos",
      data: [5, 3, 7, ...],
      color: "#10b981"
    },
    completed: {
      label: "Processos Concluídos",
      data: [4, 6, 5, ...],
      color: "#3b82f6"
    }
  },
  
  // Totais
  totals: {
    created: 150,
    completed: 120
  },
  
  // Metadados
  metadata: {
    startDate: Date,
    endDate: Date,
    days: 30,
    granularity: "daily",
    dataPoints: 30
  }
}
```

---

## 🔧 Funções Disponíveis

### `generateEvolutionDataset(cards, periodRange)`
Gera dataset básico com novos e concluídos.

### `generateEvolutionDatasetWithCumulative(cards, periodRange)`
Adiciona séries acumuladas (running totals).

### `generateCompleteEvolutionDataset(cards, periodRange, options)`
Dataset completo com:
- `options.cumulative` - Adicionar série acumulada
- `options.trend` - Adicionar análise de tendência

### `getEvolutionSummary(dataset)`
Retorna estatísticas:
- Médias
- Picos (máximos)
- Ranges (min/max)

### `determineGranularity(days)`
Retorna granularidade ideal baseada no número de dias.

---

## 📋 Exemplo Completo

```javascript
const dataset = chartDataProcessor.generateCompleteEvolutionDataset(
  cards,
  periodRange,
  { cumulative: true, trend: true }
);

// Usar no gráfico
console.log(dataset.labels);              // Eixo X
console.log(dataset.series.created.data); // Série 1
console.log(dataset.series.completed.data); // Série 2
console.log(dataset.summary.averages);    // Médias
console.log(dataset.trends);              // up/down/stable
```

---

## 🎨 Formato para Chart.js

```javascript
const chartData = {
  labels: dataset.labels,
  datasets: [
    {
      label: dataset.series.created.label,
      data: dataset.series.created.data,
      borderColor: dataset.series.created.color,
      backgroundColor: dataset.series.created.color + '20',
      tension: 0.4,
    },
    {
      label: dataset.series.completed.label,
      data: dataset.series.completed.data,
      borderColor: dataset.series.completed.color,
      backgroundColor: dataset.series.completed.color + '20',
      tension: 0.4,
    }
  ]
};
```

---

## 📊 Análise de Tendência

```javascript
dataset.trends = {
  created: 'up',      // Crescendo
  completed: 'down'   // Decrescendo
}

// Valores possíveis: 'up' | 'down' | 'stable'
```

---

## 🔍 Granularidade Manual

```javascript
import { GRANULARITY } from './utils/chartDataProcessor';

// Forçar granularidade semanal
const dataset = chartDataProcessor.generateEvolutionDataset(
  cards,
  periodRange,
  GRANULARITY.WEEKLY
);
```

---

## 💡 Exemplos Práticos

Ver **[src/examples/evolutionChartExamples.jsx](src/examples/evolutionChartExamples.jsx)**:
- Dataset básico
- Com estatísticas
- Com acumulado
- Formato Chart.js
- Tabela de dados
- Indicador de desempenho

---

## 📈 Labels de Data

```javascript
// Diário
"18/02", "19/02", "20/02"

// Semanal
"18/02 - 24/02", "25/02 - 03/03"

// Mensal
"Jan/2026", "Fev/2026", "Mar/2026"
```

---

## ✅ Resultado

Sistema completo de agregação temporal pronto para integração com bibliotecas de gráficos (Chart.js, Recharts, etc).
