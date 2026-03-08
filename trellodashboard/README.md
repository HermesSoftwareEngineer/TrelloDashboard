# Dashboard de Indicadores - Locação Stylus Imobiliária

Sistema de dashboard integrado com Trello para análise de indicadores do setor de locação.

## 🚀 Tecnologias

- **React** + **Vite** - Framework e build tool
- **Tailwind CSS** - Estilização
- **Trello API** - Fonte de dados

## 📋 Funcionalidades

- ✅ Integração completa com API do Trello
- ✅ Normalização e processamento de dados
- ✅ Cálculo de métricas e indicadores
- ✅ **Filtro global de período** (Esta Semana, Este Mês, Este Trimestre, Este Ano, Personalizado)
- ✅ **Agregação temporal para gráficos** (diário, semanal, mensal)
- ✅ Dataset estruturado para gráfico de evolução
- ✅ **Gráfico de status** (pizza) com classificação e métricas de desempenho
- ✅ **Visualização de gráficos** com Chart.js (linha + pizza/donut)
- ✅ **KPIs de vazão** (totais, médias diárias, tempo médio, throughput)
- ✅ **Análise por Tipo de Processo (Labels)** - Processos em andamento e tempo médio por tipo
- ✅ **Análise por Listas (Prioridade)** - Distribuição, evolução temporal e métricas por lista
- ✅ **Análise por Colaborador** - Produtividade, eficiência e performance individual
- ✅ **Adaptadores para Visualização** - Contratos de dados para Chart.js, Recharts e KPI Cards
- ✅ **Validação e Consistência** - Checklist completo, detecção de problemas e fallbacks
- ✅ Interface responsiva com tema claro/escuro
- ✅ Atualização manual e automática
- ✅ Filtros avançados de dados
- ✅ **Análise de produtividade com IA (Google AI Studio)** com persistência no Supabase
- 🔄 Dashboards interativos (em desenvolvimento)

## 🔧 Configuração

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_TRELLO_API_KEY=sua_api_key
VITE_TRELLO_TOKEN=seu_token
VITE_TRELLO_BOARD_ID=id_do_board
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_anon_key_supabase
VITE_GOOGLE_AI_API_KEY=sua_google_ai_api_key
VITE_GOOGLE_AI_MODEL=gemini-2.0-flash
VITE_LANGSMITH_TRACING=false
VITE_LANGSMITH_API_KEY=sua_langsmith_api_key
VITE_LANGSMITH_PROJECT=trellodashboard
VITE_LANGSMITH_ENDPOINT=https://api.smith.langchain.com
VITE_LANGSMITH_TIMEOUT_MS=2500
VITE_PRODUCTIVITY_ANALYSIS_PASSWORD=sua_senha_de_autorizacao
VITE_PRODUCTIVITY_AI_MAX_ACTIVITIES_PER_CALL=25
VITE_PRODUCTIVITY_INSTRUCTION_PROMPT="Seja extremamente critica: so pontue quando houver evidencia explicita de que o colaborador executou a atividade. Nao suponha, nao infira e nao complete lacunas. Se a descricao estiver vaga, implicita ou sem prova de execucao, atribua 0 ponto e registre evidencia insuficiente. Para cada atividade use o formato: Acao | Evidencia literal | Regra (action_type => pontos) | Motivo. No summary, liste apenas atividades com evidencia clara e explique brevemente os casos com 0 ponto por falta de certeza."
VITE_IMOVIEW_API_BASE_URL=https://api.imoview.com.br
VITE_IMOVIEW_API_KEY=sua_chave_imoview
VITE_IMOVIEW_USER_CODE=seu_codigo_usuario_imoview
VITE_IMOVIEW_API_KEY_HEADER=chave
VITE_IMOVIEW_USER_CODE_HEADER=codigoUsuario
```

**Como obter:**
- API Key: https://trello.com/power-ups/admin
- Token: https://trello.com/1/authorize (com sua API Key)
- Board ID: URL do board (`https://trello.com/b/BOARD_ID/nome`)
- Supabase URL / Anon Key: Settings > API no projeto Supabase
- Google AI API Key: Google AI Studio
- LangSmith API Key: Settings > API Keys no LangSmith
- Senha de autorização: valor definido por você no `.env`
- Chave Imoview / Codigo de usuario: conforme credenciais do seu ambiente Imoview
- No endpoint de locacao, `codigoCliente` (locador) e obtido automaticamente do campo personalizado `Cod. Locador` dos cards Trello

### 2.3 Lotes de atividades na análise de produtividade

- Use `VITE_PRODUCTIVITY_AI_MAX_ACTIVITIES_PER_CALL` para limitar quantas atividades cada chamada de IA processa.
- Exemplo: com limite `25` e total de `100` atividades, a análise fará `4` chamadas para a IA.
- A cada lote processado, os dados são salvos incrementalmente no Supabase e a tela é atualizada com o progresso.

### 2.2 Tracing de chamadas IA com LangSmith (opcional)

- Defina `VITE_LANGSMITH_TRACING=true` para ativar o tracing.
- As chamadas de análise em `googleAiService` serão rastreadas com inputs/outputs resumidos.
- Se o LangSmith falhar, a análise da IA continua normalmente (fallback silencioso).

### 2.1 Configurar tabelas da análise de produtividade

Execute o SQL de [SUPABASE_PRODUCTIVITY_SCHEMA.sql](SUPABASE_PRODUCTIVITY_SCHEMA.sql) no SQL Editor do Supabase.

### 3. Executar o projeto

```bash
npm run dev
```

## 📚 Documentação

### Documentação Geral
- **[INTEGRACAO_TRELLO.md](INTEGRACAO_TRELLO.md)** - Documentação completa da integração com Trello
- **[FILTRO_PERIODO.md](FILTRO_PERIODO.md)** - Documentação do filtro global de período
- **[GRAFICO_EVOLUCAO.md](GRAFICO_EVOLUCAO.md)** - Agregação temporal para gráfico de evolução
- **[GRAFICO_STATUS.md](GRAFICO_STATUS.md)** - Classificação por status e gráfico de pizza
- **[VISUALIZACAO_GRAFICOS.md](VISUALIZACAO_GRAFICOS.md)** - Implementação visual dos gráficos com Chart.js
- **[KPIs_VAZAO.md](KPIs_VAZAO.md)** - KPIs de vazão (totais, médias, tempo médio)

### Módulos de Análise
- **[IMPLEMENTACAO_PROMPT07-09.md](IMPLEMENTACAO_PROMPT07-09.md)** - Análise por Labels, Listas e Colaboradores
- **[IMPLEMENTACAO_PROMPT10-11.md](IMPLEMENTACAO_PROMPT10-11.md)** - Adaptação para Visualização e Validação de Dados

### Referências Técnicas
- **[src/utils/dataTypes.js](src/utils/dataTypes.js)** - Referência de estruturas de dados

### Exemplos de Uso
- **[src/examples/usageExamples.jsx](src/examples/usageExamples.jsx)** - Exemplos de uso geral
- **[src/examples/periodFilterExamples.jsx](src/examples/periodFilterExamples.jsx)** - Exemplos de uso do filtro de período
- **[src/examples/evolutionChartExamples.jsx](src/examples/evolutionChartExamples.jsx)** - Exemplos de gráfico de evolução
- **[src/examples/statusChartExamples.jsx](src/examples/statusChartExamples.jsx)** - Exemplos de gráfico de status
- **[src/examples/flowKPIsExamples.jsx](src/examples/flowKPIsExamples.jsx)** - Exemplos de KPIs de vazão
- **[src/examples/analysisExamples.jsx](src/examples/analysisExamples.jsx)** - Exemplos de análises por Label, Lista e Membro
- **[src/examples/validationAndAdaptationExamples.jsx](src/examples/validationAndAdaptationExamples.jsx)** - Exemplos de validação e adaptação

## 🏗️ Estrutura do Projeto

```
src/
├── components/         # Componentes React
│   ├── Dashboard.jsx
│   ├── DashboardV2.jsx
│   ├── Charts.jsx
│   ├── EvolutionChart.jsx
│   ├── StatusPieChart.jsx
│   ├── MetricCard.jsx
│   └── PeriodFilter.jsx
├── contexts/          # React Contexts
│   └── PeriodFilterContext.jsx
├── hooks/             # Custom hooks
│   ├── useTrello.js       # Hook de integração com Trello
│   └── usePeriodFilter.js # Hook de filtro de período
├── services/          # Serviços de API
│   └── trelloService.js
├── utils/             # Utilitários e Processadores
│   ├── dataProcessor.js          # Normalização e processamento base
│   ├── dataTypes.js              # Referência de tipos
│   ├── periodUtils.js            # Utilitários de período
│   ├── flowKPIs.js               # KPIs de vazão
│   ├── chartDataProcessor.js     # Agregação temporal
│   ├── statusChartProcessor.js   # Processador de status
│   ├── labelAnalysisProcessor.js # Análise por tipo de processo
│   ├── listAnalysisProcessor.js  # Análise por listas
│   ├── memberAnalysisProcessor.js # Análise por colaborador
│   ├── chartDataAdapter.js       # Adaptadores para visualização
│   └── dataValidation.js         # Validação e consistência
└── examples/          # Exemplos de uso
    ├── usageExamples.jsx
    ├── periodFilterExamples.jsx
    ├── evolutionChartExamples.jsx
    ├── statusChartExamples.jsx
    ├── flowKPIsExamples.jsx
    ├── analysisExamples.jsx
    └── validationAndAdaptationExamples.jsx
```

## 🔌 API do Trello

### Dados Capturados

- **Cards**: Processos de locação com todas as informações
- **Lists**: 5 níveis de prioridade/urgência
- **Labels**: Tipos de processos (Nova Locação, Renovação, etc)
- **Members**: Colaboradores da equipe
- **Dates**: Datas de criação, conclusão e prazos

### Exemplo de Uso

```javascript
import { useTrelloBoard } from './hooks/useTrello';
import dataProcessor from './utils/dataProcessor';

function MeuComponente() {
  const { normalizedData, isLoading } = useTrelloBoard();
  
  if (isLoading) return <div>Carregando...</div>;
  
  // Cards concluídos nos últimos 30 dias
  const completed = dataProcessor.getCompletedCardsInPeriod(
    normalizedData.cards, 
    30
  );
  
  // Tempo médio de processo
  const avgTime = dataProcessor.calculateAverageProcessTime(completed);
  
  return <div>Tempo médio: {avgTime} dias</div>;
}
```

## 📊 Métricas Disponíveis

- **Tempo médio de processo** (geral, por tipo, por colaborador)
- **Contadores por período** (novos, em andamento, concluídos)
- **Distribuições** (por tipo, por colaborador, por prioridade)
- **Análises temporais** (hoje, 7d, 30d, 90d, tudo)

## 📅 Filtro de Período

O dashboard possui um **filtro global de período** que impacta todas as métricas:

### Períodos Disponíveis:
- **Esta Semana** - Segunda a domingo da semana atual
- **Este Mês** - Do dia 1 ao último dia do mês
- **Este Trimestre** - 3 meses (Jan-Mar, Abr-Jun, Jul-Set, Out-Dez)
- **Este Ano** - 1º de janeiro a 31 de dezembro
- **Personalizado** - Selecione data inicial e final (máximo 365 dias)

### Como usar:

```javascript
import usePeriodFilter from './hooks/usePeriodFilter';
import { useTrelloBoard } from './hooks/useTrello';

function MeuComponente() {
  const { normalizedData } = useTrelloBoard({ normalize: true });
  const { filterCards, periodRange } = usePeriodFilter();
  
  // Aplicar filtro
  const { cards, counts } = filterCards(normalizedData.cards);
  
  return (
    <div>
      <h2>{periodRange.label}</h2>
      <p>Criados: {counts.created}</p>
      <p>Concluídos: {counts.completed}</p>
      <p>Em andamento: {counts.inProgress}</p>
    </div>
  );
}
```

Veja **[FILTRO_PERIODO.md](FILTRO_PERIODO.md)** para documentação completa e exemplos avançados.

## 📈 Gráfico de Evolução

Sistema de agregação temporal que prepara dados para gráfico de linhas:

### Granularidade Automática:
- **≤ 31 dias**: Agrupamento diário
- **32-365 dias**: Agrupamento semanal  
- **> 365 dias**: Agrupamento mensal

### Como usar:

```javascript
import chartDataProcessor from './utils/chartDataProcessor';

const dataset = chartDataProcessor.generateEvolutionDataset(
  normalizedData.cards,
  periodRange
);

// dataset.labels = ["18/02", "19/02", ...]
// dataset.series.created.data = [5, 3, 7, ...]
// dataset.series.completed.data = [4, 6, 5, ...]
```

Veja **[GRAFICO_EVOLUCAO.md](GRAFICO_EVOLUCAO.md)** para documentação completa.

## � Gráfico de Status (Pizza)

Sistema de classificação e agregação de cards por status para visualização em gráfico de pizza:

### Categorias:
- **Novos no período**: Cards criados no período (não concluídos nele)
- **Em andamento**: Cards ativos mas não concluídos no período
- **Concluídos no período**: Cards finalizados no período

### Como usar:

```javascript
import { generateStatusDataset, calculateStatusMetrics } from './utils/statusChartProcessor';

// Gerar dataset para gráfico
const dataset = generateStatusDataset(
  normalizedData.cards,
  periodRange.startDate,
  periodRange.endDate
);

// Obter métricas de desempenho
const metrics = calculateStatusMetrics(
  normalizedData.cards,
  periodRange.startDate,
  periodRange.endDate
);

// dataset.labels = ["Novos no período", "Em andamento", "Concluídos no período"]
// dataset.datasets[0].data = [12, 8, 15]
// metrics.completionRate = 42.9
// metrics.healthStatus = "Bom"
```

Veja **[GRAFICO_STATUS.md](GRAFICO_STATUS.md)** para documentação completa.
## 📊 Visualização dos Gráficos

O dashboard exibe os gráficos usando **Chart.js** com componentes React:

### Gráficos Disponíveis:

**1. Gráfico de Evolução (Linha)**
- Série temporal de processos novos e concluídos
- Granularidade automática baseada no período
- Área preenchida com transparência
- Tooltips interativos

**2. Gráfico de Status (Pizza/Donut)**
- Distribuição por status (Novos, Em Andamento, Concluídos)
- Métricas de desempenho integradas
- Health Score (0-100)
- Badges com contadores

### Como usar os componentes:

```javascript
import EvolutionChart from './components/EvolutionChart';
import StatusPieChart from './components/StatusPieChart';

function Dashboard() {
  const { normalizedData } = useTrelloBoard({ normalize: true });
  const { periodRange } = usePeriodFilter();
  
  return (
    <>
      <EvolutionChart 
        cards={normalizedData.cards} 
        periodRange={periodRange} 
        dark={true} 
      />
      
      <StatusPieChart 
        cards={normalizedData.cards} 
        periodRange={periodRange} 
        dark={true}
        variant="doughnut"
      />
    </>
  );
}
```

Veja **[VISUALIZACAO_GRAFICOS.md](VISUALIZACAO_GRAFICOS.md)** para documentação completa.
## 📊 KPIs de Vazão

Sistema de cálculo de indicadores de vazão de processos:

### KPIs Disponíveis:
- **Total de novos processos** - Cards criados no período
- **Total de concluídos** - Cards finalizados no período
- **Total em andamento** - Cards ativos (WIP)
- **Média de novos por dia** - Taxa de entrada diária
- **Média de concluídos por dia** - Taxa de saída diária
- **Tempo médio de processo** - Duração média em dias

### Métricas Avançadas:
- **Throughput Rate** - Taxa de conclusão (%) com classificação
- **Net Flow** - Diferença entre saída e entrada
- **WIP/Throughput Ratio** - Relação entre trabalho ativo e produtividade

### Como usar:

```javascript
import { calculateAllFlowKPIs } from './utils/flowKPIs';

function KPIsPanel() {
  const { normalizedData } = useTrelloBoard({ normalize: true });
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
      <div>Throughput: {kpis.throughput.rate}%</div>
    </div>
  );
}
```

**Validação matemática integrada:**
```javascript
import { validateKPIs } from './utils/flowKPIs';

const validation = validateKPIs(kpis);
if (!validation.isValid) {
  console.error('Inconsistências:', validation.errors);
}
```

Veja **[KPIs_VAZAO.md](KPIs_VAZAO.md)** para documentação completa.
## 📊 Análises Avançadas

### Análise por Tipo de Processo (Labels)
Sistema de análise que agrupa processos por labels/tipos e calcula métricas específicas:

```javascript
import { generateLabelAnalysisDataset } from './utils/labelAnalysisProcessor';

const labelAnalysis = generateLabelAnalysisDataset(
  normalizedData.cards,
  periodRange.startDate,
  periodRange.endDate
);

// Retorna para cada tipo:
// - Total, concluídos, em andamento
// - Tempo médio de conclusão
// - Taxa de conclusão
// - Referência aos cards
```

### Análise por Listas (Prioridade)
Sistema de análise que agrupa processos por listas (níveis de prioridade):

```javascript
import { generateListAnalysisDataset } from './utils/listAnalysisProcessor';

const listAnalysis = generateListAnalysisDataset(
  normalizedData.cards,
  periodRange.startDate,
  periodRange.endDate
);

// Retorna para cada lista:
// - Novos, em andamento, concluídos
// - Percentuais por status
// - Tempo médio de processo
// - Taxa de conclusão
```

### Análise por Colaborador
Sistema de análise individual e comparativa de performance:

```javascript
import { generateMemberAnalysisDataset } from './utils/memberAnalysisProcessor';

const memberAnalysis = generateMemberAnalysisDataset(
  normalizedData.cards,
  periodRange.startDate,
  periodRange.endDate
);

// Retorna para cada membro:
// - Total atribuídos, concluídos, em andamento
// - Taxa de conclusão e eficiência
// - Produtividade (cards/dia)
// - Distribuição por lista e por tipo
```

Veja **[IMPLEMENTACAO_PROMPT07-09.md](IMPLEMENTACAO_PROMPT07-09.md)** para documentação completa.

## 🎨 Adaptação para Visualização

Sistema de adaptadores que converte datasets processados para formatos consumíveis por bibliotecas de gráficos:

### Contratos de Dados Suportados:
- **LineChartData** - Gráficos de linha (evolução temporal)
- **BarChartData** - Gráficos de barra (comparações, rankings)
- **PieChartData** - Gráficos de pizza (proporções, distribuições)
- **MetricCardData** - Cards numéricos (KPIs, métricas resumidas)

### Bibliotecas Suportadas:
- **Chart.js** - Adaptadores completos para todos os tipos
- **Recharts** - Formato array de objetos
- **Cards/KPIs** - Formato para exibição direta

```javascript
import { adaptData } from './utils/chartDataAdapter';

// Adaptador universal - detecta formato automaticamente
const chartData = adaptData(
  labelAnalysis,      // Dados processados
  'label',            // Tipo da fonte
  'bar',              // Tipo do gráfico
  'chartjs',          // Biblioteca alvo
  { metric: 'avgTime' } // Opções
);

// Ou usar adaptadores específicos
import { 
  adaptLabelAnalysisToBarChart,
  adaptFlowKPIsToMetricCards
} from './utils/chartDataAdapter';
```

## ✅ Validação e Consistência de Dados

Sistema completo de validação que garante qualidade e confiabilidade dos dados:

### Validações Disponíveis:
- **Cards Individuais** - Detecta dados faltantes, inconsistências, problemas de qualidade
- **Duplicação** - Analisa contagem duplicada em análises por membro/label
- **Cobertura** - Verifica percentual de campos essenciais preenchidos
- **Filtros** - Valida impacto e retenção de filtros aplicados

### Checklist Completo:
```javascript
import { runValidationChecklist, printValidationReport } from './utils/dataValidation';

const report = runValidationChecklist(normalizedData.cards, filters);

// Relatório completo com:
// - Problemas críticos, avisos e informativos
// - Score de cobertura (0-100)
// - Análise de duplicação
// - Recomendações automáticas

printValidationReport(report); // Imprimir no console
```

### Estratégias de Fallback:
```javascript
import { applyCardsFallbacks } from './utils/dataValidation';

// Aplica correções automáticas
const enhancedCards = applyCardsFallbacks(normalizedData.cards);

// Correções aplicadas:
// - Nome vazio → "[Sem Título]"
// - Lista ausente → "Sem Lista"
// - Tempo negativo → null
// - Documentação de fallbacks aplicados
```

### Exemplo de Uso Integrado:
```javascript
function Dashboard() {
  const { normalizedData } = useTrelloBoard({ normalize: true });
  
  useEffect(() => {
    // Validar dados ao carregar
    const report = runValidationChecklist(normalizedData.cards);
    
    if (report.summary.criticalIssues > 0) {
      console.error('⚠️ Problemas críticos detectados');
    }
    
    // Aplicar fallbacks se necessário
    if (!report.checks.cardValidation.valid) {
      const enhanced = applyCardsFallbacks(normalizedData.cards);
      // Usar 'enhanced' ao invés de 'normalizedData.cards'
    }
  }, [normalizedData]);
  
  // Renderizar dashboard...
}
```

Veja **[IMPLEMENTACAO_PROMPT10-11.md](IMPLEMENTACAO_PROMPT10-11.md)** para documentação completa.
## �🔄 Atualização de Dados

### Manual
Clique no botão "Atualizar" no header do dashboard.

### Automática
```javascript
const { normalizedData } = useTrelloBoard({
  autoRefresh: true,
  refreshInterval: 5 * 60 * 1000 // 5 minutos
});
```

## 🐛 Troubleshooting

1. **Erro de conexão**: Verifique as credenciais no `.env`
2. **Dados não aparecem**: Confirme o Board ID correto
3. **Token expirado**: Gere um novo token no Trello
4. **CORS**: API do Trello permite requisições do browser

## 📝 Regras de Negócio

- **Data de início** = campo `start` do card (data de criação)
- **Data de conclusão** = campo `due` quando `dueComplete === true`
- **Tipo de processo** = labels do card
- **Prioridade** = lista onde o card está (5 níveis)
- **Colaboradores** = membros atribuídos ao card

## 🎨 Temas

O dashboard suporta tema claro e escuro (botão no header).

## 📄 Licença

Projeto interno - Stylus Imobiliária

---

**Última atualização**: Fevereiro 2026
