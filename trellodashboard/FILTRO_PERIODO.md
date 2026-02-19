# 📅 Filtro Global de Período - Documentação

## Visão Geral

Sistema de filtro global de período que impacta **todos os dados e métricas** do dashboard. O filtro é gerenciado através de um contexto React, tornando-o acessível de qualquer componente da aplicação.

---

## 🎯 Períodos Disponíveis

1. **Esta Semana** - De segunda-feira a domingo da semana atual
2. **Este Mês** - Do dia 1 até o último dia do mês atual
3. **Este Trimestre** - 3 meses (Jan-Mar, Abr-Jun, Jul-Set, Out-Dez)
4. **Este Ano** - De 1º de janeiro a 31 de dezembro
5. **Personalizado** - Data inicial e final definidas pelo usuário

---

## 📦 Arquivos Criados

### 1. **[src/utils/periodUtils.js](src/utils/periodUtils.js)**
Funções utilitárias para cálculo de períodos e filtros de data.

**Principais funções:**
- `calculatePeriodRange()` - Calcula intervalo de datas para um período
- `applyPeriodFilter()` - Aplica filtro a todos os cards
- `filterCardsByCreationPeriod()` - Filtra por data de criação
- `filterCardsByCompletionPeriod()` - Filtra por data de conclusão
- `getCardsInProgressDuringPeriod()` - Cards que estavam em andamento no período

### 2. **[src/contexts/PeriodFilterContext.jsx](src/contexts/PeriodFilterContext.jsx)**
Contexto global para gerenciar estado do filtro de período.

**Fornece:**
- Estado do período atual
- Funções para alterar período
- Função para aplicar filtro aos dados

### 3. **[src/hooks/usePeriodFilter.js](src/hooks/usePeriodFilter.js)**
Hook customizado para acessar o contexto de filtro.

**Uso:**
```javascript
const { periodRange, filterCards, changePeriodType } = usePeriodFilter();
```

### 4. **[src/components/PeriodFilter.jsx](src/components/PeriodFilter.jsx)**
Componente visual do filtro com inputs de data para período personalizado.

---

## 🚀 Como Usar

### Configuração (já feita no projeto)

O `PeriodFilterProvider` está configurado no [src/main.jsx](src/main.jsx):

```javascript
import { PeriodFilterProvider } from './contexts/PeriodFilterContext';

<PeriodFilterProvider>
  <App />
</PeriodFilterProvider>
```

### Usar o filtro em componentes

```javascript
import usePeriodFilter from '../hooks/usePeriodFilter';
import { useTrelloBoard } from '../hooks/useTrello';

function MeuComponente() {
  // Dados do Trello
  const { normalizedData } = useTrelloBoard({ normalize: true });
  
  // Filtro de período
  const { periodRange, filterCards, changePeriodType } = usePeriodFilter();
  
  // Aplicar filtro aos cards
  const filteredData = filterCards(normalizedData.cards);
  
  // Usar dados filtrados
  const { cards, counts, averages } = filteredData;
  
  return (
    <div>
      <p>Período: {periodRange.label}</p>
      <p>Cards criados: {counts.created}</p>
      <p>Cards concluídos: {counts.completed}</p>
      <p>Cards em andamento: {counts.inProgress}</p>
    </div>
  );
}
```

### Adicionar o componente visual

```javascript
import PeriodFilter from './PeriodFilter';

function Dashboard({ dark }) {
  return (
    <div>
      {/* Filtro de período */}
      <PeriodFilter dark={dark} />
      
      {/* Resto do dashboard */}
    </div>
  );
}
```

---

## 📊 Estrutura de Dados Retornada

### periodRange

```javascript
{
  startDate: Date,          // Início do período
  endDate: Date,            // Fim do período
  label: "Este Mês",        // Label do período
  days: 28,                 // Número de dias
  periodType: "this_month"  // Tipo do período
}
```

### filterCards(cards)

Retorna objeto com cards filtrados e estatísticas:

```javascript
{
  period: periodRange,      // Informações do período
  
  cards: {
    created: [...],         // Cards criados no período
    completed: [...],       // Cards concluídos no período
    inProgress: [...],      // Cards em andamento durante o período
    active: [...]           // Cards com atividade no período
  },
  
  counts: {
    created: 25,            // Quantidade criados
    completed: 20,          // Quantidade concluídos
    inProgress: 15,         // Quantidade em andamento
    active: 30              // Quantidade com atividade
  },
  
  averages: {
    createdPerDay: "0.9",   // Média de criados por dia
    completedPerDay: "0.7"  // Média de concluídos por dia
  }
}
```

---

## 🔧 API do Hook usePeriodFilter

### Estado

```javascript
const {
  // Estado atual
  periodType,          // Tipo do período selecionado
  periodRange,         // Objeto com dados do período
  customRange,         // Datas customizadas (se aplicável)
  periodDescription,   // Descrição formatada do período
  
  // Ações
  changePeriodType,    // Mudar tipo de período
  setCustomDateRange,  // Definir período customizado
  resetPeriod,         // Resetar para padrão (Este Mês)
  
  // Utilidades
  filterCards,         // Aplicar filtro aos cards
  isDateInCurrentPeriod // Verificar se data está no período
} = usePeriodFilter();
```

### Funções

#### changePeriodType(newPeriodType)
```javascript
import { PERIOD_TYPES } from '../utils/periodUtils';

// Mudar para esta semana
changePeriodType(PERIOD_TYPES.THIS_WEEK);

// Mudar para este ano
changePeriodType(PERIOD_TYPES.THIS_YEAR);
```

#### setCustomDateRange(startDate, endDate)
```javascript
// Definir período customizado
const success = setCustomDateRange('2026-02-01', '2026-02-28');

if (!success) {
  console.log('Datas inválidas');
}
```

#### filterCards(cards)
```javascript
const filteredData = filterCards(normalizedData.cards);

// Acessar diferentes conjuntos de cards
const createdCards = filteredData.cards.created;
const completedCards = filteredData.cards.completed;
const inProgressCards = filteredData.cards.inProgress;
```

---

## 📋 Exemplos Práticos

### Exemplo 1: Métricas Básicas

```javascript
function MetricasBasicas() {
  const { normalizedData } = useTrelloBoard({ normalize: true });
  const { filterCards, periodRange } = usePeriodFilter();
  
  const { counts } = filterCards(normalizedData.cards);
  
  return (
    <div>
      <h2>{periodRange.label}</h2>
      <p>Novos processos: {counts.created}</p>
      <p>Concluídos: {counts.completed}</p>
      <p>Em andamento: {counts.inProgress}</p>
    </div>
  );
}
```

### Exemplo 2: Tempo Médio no Período

```javascript
import dataProcessor from '../utils/dataProcessor';

function TempoMedioPeriodo() {
  const { normalizedData } = useTrelloBoard({ normalize: true });
  const { filterCards } = usePeriodFilter();
  
  const { cards } = filterCards(normalizedData.cards);
  const avgTime = dataProcessor.calculateAverageProcessTime(cards.completed);
  
  return (
    <div>
      <h3>Tempo Médio de Conclusão</h3>
      <p>{avgTime} dias</p>
      <p>Baseado em {cards.completed.length} processos</p>
    </div>
  );
}
```

### Exemplo 3: Estatísticas por Colaborador

```javascript
import dataProcessor from '../utils/dataProcessor';

function EstatisticasPorColaborador() {
  const { normalizedData } = useTrelloBoard({ normalize: true });
  const { filterCards } = usePeriodFilter();
  
  const { cards } = filterCards(normalizedData.cards);
  const byMember = dataProcessor.groupAndCalculate(cards.completed, 'member');
  
  return (
    <div>
      <h3>Desempenho por Colaborador</h3>
      {byMember.map(member => (
        <div key={member.id}>
          <p>{member.name}</p>
          <p>Concluídos: {member.count}</p>
          <p>Tempo médio: {member.averageProcessTime} dias</p>
        </div>
      ))}
    </div>
  );
}
```

### Exemplo 4: Botões de Período Rápido

```javascript
import { PERIOD_TYPES } from '../utils/periodUtils';

function BotoesPeriodoRapido() {
  const { changePeriodType, periodType } = usePeriodFilter();
  
  const periods = [
    { type: PERIOD_TYPES.THIS_WEEK, label: 'Semana' },
    { type: PERIOD_TYPES.THIS_MONTH, label: 'Mês' },
    { type: PERIOD_TYPES.THIS_QUARTER, label: 'Trimestre' },
    { type: PERIOD_TYPES.THIS_YEAR, label: 'Ano' },
  ];
  
  return (
    <div>
      {periods.map(period => (
        <button
          key={period.type}
          onClick={() => changePeriodType(period.type)}
          className={periodType === period.type ? 'active' : ''}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}
```

### Exemplo 5: Comparação com Período Anterior

```javascript
import periodUtils from '../utils/periodUtils';

function ComparacaoPeriodos() {
  const { normalizedData } = useTrelloBoard({ normalize: true });
  const { periodRange } = usePeriodFilter();
  
  // Período atual
  const currentData = periodUtils.applyPeriodFilter(
    normalizedData.cards, 
    periodRange
  );
  
  // Calcular período anterior (mesmo número de dias)
  const previousEnd = new Date(periodRange.startDate);
  previousEnd.setDate(previousEnd.getDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - periodRange.days + 1);
  
  const previousRange = {
    ...periodRange,
    startDate: previousStart,
    endDate: previousEnd,
  };
  
  const previousData = periodUtils.applyPeriodFilter(
    normalizedData.cards,
    previousRange
  );
  
  return (
    <div>
      <h3>Comparação</h3>
      <div>
        <p>Período Atual: {currentData.counts.completed} concluídos</p>
        <p>Período Anterior: {previousData.counts.completed} concluídos</p>
        <p>Diferença: {currentData.counts.completed - previousData.counts.completed}</p>
      </div>
    </div>
  );
}
```

---

## 🎨 Customização do Componente Visual

### Estilos Personalizados

```javascript
<PeriodFilter 
  dark={true} 
  className="my-custom-class shadow-lg"
/>
```

### Integração com Design System

O componente usa classes Tailwind e pode ser facilmente adaptado:

```javascript
// Em PeriodFilter.jsx, modificar:
const containerCls = `minha-classe-container ${className}`;
const fieldCls = 'minhas-classes-de-input';
```

---

## ⚙️ Funções Utilitárias Avançadas

### Validação de Datas

```javascript
import { validateCustomRange } from '../utils/periodUtils';

const validation = validateCustomRange('2026-02-01', '2026-02-28');

if (!validation.valid) {
  console.error(validation.error);
  // Erros possíveis:
  // - "Data inicial e final são obrigatórias"
  // - "Datas inválidas"
  // - "Data inicial deve ser anterior à data final"
  // - "O período não pode ser maior que 365 dias"
}
```

### Formatação de Datas

```javascript
import { formatDate, formatDateForInput } from '../utils/periodUtils';

// Para exibição
const displayDate = formatDate(new Date(), 'short'); // "18/02/2026"
const longDate = formatDate(new Date(), 'long'); // "terça-feira, 18 de fevereiro de 2026"

// Para input[type="date"]
const inputValue = formatDateForInput(new Date()); // "2026-02-18"
```

### Cálculo de Início/Fim de Períodos

```javascript
import {
  getStartOfWeek,
  getEndOfWeek,
  getStartOfMonth,
  getEndOfMonth,
  getStartOfQuarter,
  getEndOfQuarter,
  getStartOfYear,
  getEndOfYear
} from '../utils/periodUtils';

const startWeek = getStartOfWeek(new Date());
const endMonth = getEndOfMonth(new Date());
const startQuarter = getStartOfQuarter(new Date());
```

---

## 🔍 Tipos de Filtros de Cards

### 1. Por Data de Criação
Cards que foram **criados** no período:
```javascript
const created = filterCardsByCreationPeriod(cards, startDate, endDate);
```

### 2. Por Data de Conclusão
Cards que foram **concluídos** no período:
```javascript
const completed = filterCardsByCompletionPeriod(cards, startDate, endDate);
```

### 3. Em Andamento Durante o Período
Cards que estavam **em progresso** em algum momento do período:
```javascript
const inProgress = getCardsInProgressDuringPeriod(cards, startDate, endDate);
```

### 4. Por Atividade
Cards com **qualquer atividade** no período:
```javascript
const active = filterCardsByActivityPeriod(cards, startDate, endDate);
```

---

## 🧪 Testes e Debugging

### Ver Estado Atual do Filtro

```javascript
function DebugPeriodFilter() {
  const periodFilter = usePeriodFilter();
  
  console.log('Period Filter State:', {
    periodType: periodFilter.periodType,
    periodRange: periodFilter.periodRange,
    customRange: periodFilter.customRange,
  });
  
  return <pre>{JSON.stringify(periodFilter.periodRange, null, 2)}</pre>;
}
```

### Testar com Data Específica

```javascript
const { setReferenceDate } = usePeriodFilter();

// Simular que "hoje" é 1º de janeiro
setReferenceDate(new Date('2026-01-01'));
```

---

## 📌 Checklist de Implementação

- [x] Utilitários de cálculo de período
- [x] Contexto global de filtro
- [x] Hook customizado
- [x] Componente visual
- [x] Integração com App
- [x] Validação de datas customizadas
- [x] Filtros por criação, conclusão e progresso
- [x] Cálculo de médias por dia
- [x] Formatação de datas
- [x] Suporte a tema claro/escuro
- [x] Documentação completa

---

## 🎯 Próximos Passos

Com o filtro de período implementado, você pode:

1. Criar gráficos que usam dados filtrados
2. Implementar comparações entre períodos
3. Adicionar exportação de dados do período
4. Criar relatórios personalizados
5. Adicionar notificações de metas por período

---

## 💡 Dicas de Uso

1. **Sempre use `filterCards()`** ao trabalhar com cards no dashboard
2. **O filtro impacta todos os componentes** que usam o hook
3. **Período padrão é "Este Mês"** para novos usuários
4. **Validação automática** em períodos customizados
5. **Máximo de 365 dias** em períodos customizados

---

**Última atualização**: 18 de fevereiro de 2026
