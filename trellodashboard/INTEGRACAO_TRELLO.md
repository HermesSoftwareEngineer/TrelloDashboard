# 📡 Integração com API do Trello - Documentação

## Visão Geral

Este documento descreve a integração completa com a API do Trello para o Dashboard de Indicadores do Setor de Locação da Imobiliária Stylus.

---

## 🔑 Configuração

### Variáveis de Ambiente (`.env`)

```env
VITE_TRELLO_API_KEY=sua_api_key_aqui
VITE_TRELLO_TOKEN=seu_token_aqui
VITE_TRELLO_BOARD_ID=id_do_board_aqui
```

### Como obter as credenciais:

1. **API Key**: Acesse https://trello.com/power-ups/admin
2. **Token**: Gere em https://trello.com/1/authorize?key=SUA_API_KEY&name=Dashboard&expiration=never&response_type=token&scope=read
3. **Board ID**: Encontre na URL do board: `https://trello.com/b/BOARD_ID/nome-do-board`

---

## 📦 Dados Capturados

### 1. **Cards (Processos de Locação)**

Campos capturados da API:
```javascript
{
  id: "card123",                    // ID único
  name: "Contrato - Apt 101",       // Nome do processo
  desc: "Descrição detalhada",      // Descrição
  start: "2026-02-01T09:00:00Z",   // ✅ DATA DE CRIAÇÃO
  due: "2026-02-15T23:59:59Z",     // ✅ PRAZO FINAL
  dueComplete: true,                // ✅ STATUS DE CONCLUÍDO
  dateLastActivity: "2026-02-15T17:30:00Z", // Última atividade
  labels: [...],                    // ✅ LABELS (Tipos de processo)
  idList: "list123",               // ✅ LISTA (Prioridade)
  idMembers: ["mem1", "mem2"],     // ✅ MEMBROS (Colaboradores)
  url: "https://trello.com/c/...", // URL do card
  closed: false,                    // Se está arquivado
  badges: {...}                     // Metadados extras
}
```

### 2. **Lists (Níveis de Prioridade)**

As **5 listas** representam níveis de urgência/prioridade:
```javascript
{
  id: "list1",
  name: "Urgente",           // Nome da lista
  pos: 0,                    // Posição (ordem)
  closed: false              // Se está arquivada
}
```

Exemplo de estrutura típica:
1. Urgente
2. Alta Prioridade
3. Normal
4. Baixa Prioridade
5. Aguardando

### 3. **Labels (Tipos de Processo)**

```javascript
{
  id: "label1",
  name: "Nova Locação",      // Tipo de processo
  color: "green"             // Cor identificadora
}
```

Tipos comuns:
- Nova Locação
- Renovação
- Vistoria
- Rescisão
- Reajuste
- Manutenção

### 4. **Members (Colaboradores)**

```javascript
{
  id: "mem1",
  fullName: "João Silva",    // Nome completo
  username: "joaosilva",     // Username
  avatarUrl: "https://..."   // URL do avatar
}
```

---

## 🔄 Estrutura de Dados Normalizada

### Card Normalizado

Após o processamento pelo `dataProcessor.js`, cada card é transformado em:

```javascript
{
  // Identificação
  id: "card123",
  name: "Contrato - Apt 101",
  description: "Descrição detalhada",
  url: "https://trello.com/c/card123",
  
  // ⏰ Datas
  creationDate: Date,        // Data de início do processo (start)
  completionDate: Date,      // Data de conclusão (due quando dueComplete=true)
  dueDate: Date,            // Prazo estabelecido
  lastActivityDate: Date,    // Última atividade
  
  // 🚦 Status
  isComplete: true,          // Se foi marcado como concluído
  isClosed: false,           // Se foi arquivado
  status: "Concluído",       // "Novo" | "Em Andamento" | "Concluído" | "Arquivado"
  
  // 📊 Métricas calculadas
  processTimeDays: 14,       // Tempo do processo em dias (completionDate - creationDate)
  
  // 🔗 Relações
  list: {
    id: "list2",
    name: "Alta Prioridade",
    position: 1
  },
  
  members: [
    { id: "mem1", name: "João Silva", username: "joaosilva", avatarUrl: "..." }
  ],
  
  processTypes: [
    { id: "label1", name: "Nova Locação", color: "green" }
  ],
  
  // Raw data para debugging
  raw: {
    idList: "list2",
    idMembers: ["mem1"],
    badges: {}
  }
}
```

### Board Data Completo

Estrutura retornada por `normalizeBoardData()`:

```javascript
{
  board: {
    id: "board123",
    name: "Locação 3.0 - Stylus",
    description: "...",
    url: "https://trello.com/b/...",
    lastActivity: Date
  },
  
  lists: [...],              // Array de listas ativas (5 listas)
  labels: [...],             // Array de labels disponíveis
  members: [...],            // Array de colaboradores
  cards: [...],              // Array de cards NORMALIZADOS
  
  stats: {
    totalCards: 150,         // Total de cards
    activeCards: 120,        // Cards não arquivados
    completedCards: 80,      // Cards concluídos
    totalMembers: 5,         // Total de colaboradores
    totalLists: 5            // Total de listas ativas
  },
  
  rawActions: [...],         // Ações/histórico (para uso futuro)
  lastFetch: Date            // Timestamp da última busca
}
```

---

## 🛠️ Funções Disponíveis

### `dataProcessor.js`

#### Normalização

```javascript
import dataProcessor from './utils/dataProcessor';

// Normalizar card individual
const normalizedCard = dataProcessor.normalizeCard(rawCard, lists, members);

// Normalizar todos os cards
const normalizedCards = dataProcessor.normalizeCards(rawCards, lists, members);

// Normalizar dados completos do board
const boardData = dataProcessor.normalizeBoardData(rawData);
```

#### Filtros

```javascript
// Filtrar cards por diversos critérios
const filtered = dataProcessor.filterCards(cards, {
  excludeArchived: true,      // Excluir arquivados (padrão: true)
  status: 'Concluído',        // Filtrar por status
  isComplete: true,           // Filtrar concluídos
  listId: 'list123',         // Filtrar por lista
  memberId: 'mem1',          // Filtrar por membro
  labelId: 'label1',         // Filtrar por label
  startDate: '2026-02-01',   // Data início do filtro
  endDate: '2026-02-28'      // Data fim do filtro
});

// Cards concluídos nos últimos N dias
const completed = dataProcessor.getCompletedCardsInPeriod(cards, 30);

// Cards criados nos últimos N dias
const created = dataProcessor.getCardsCreatedInPeriod(cards, 7);
```

#### Cálculos

```javascript
// Calcular tempo médio de processo
const avgTime = dataProcessor.calculateAverageProcessTime(completedCards);

// Agrupar e calcular estatísticas
const byMember = dataProcessor.groupAndCalculate(cards, 'member');
const byType = dataProcessor.groupAndCalculate(cards, 'processType');
const byList = dataProcessor.groupAndCalculate(cards, 'list');

// Resultado de groupAndCalculate:
[
  {
    id: "mem1",
    name: "João Silva",
    cards: [...],              // Array de cards
    count: 25,                 // Quantidade de cards
    averageProcessTime: 12.5   // Tempo médio em dias
  },
  ...
]
```

---

## 🔄 Estratégia de Atualização

### 1. Atualização Manual

Através do botão "Atualizar" no header:

```javascript
const { refetch } = useTrelloBoard();

// Ao clicar no botão
<button onClick={refetch}>Atualizar</button>
```

### 2. Atualização Automática (Futura)

Para implementar polling automático:

```javascript
// No hook useTrelloBoard
useEffect(() => {
  const interval = setInterval(() => {
    fetchData(); // Buscar dados novamente
  }, 5 * 60 * 1000); // A cada 5 minutos
  
  return () => clearInterval(interval);
}, []);
```

### 3. Atualização em Tempo Real (Webhooks)

Para implementação futura com webhooks do Trello:
- Requer backend para receber notificações
- Trello notifica mudanças em tempo real
- Backend atualiza cache/frontend via WebSocket

---

## 📊 Exemplo de Uso Completo

```javascript
import { useTrelloBoard } from './hooks/useTrello';
import dataProcessor from './utils/dataProcessor';

function MyComponent() {
  const { board, lists, cards, labels, members, isLoading, error } = useTrelloBoard();
  
  if (isLoading) return <Loading />;
  if (error) return <Error message={error} />;
  
  // Normalizar dados
  const normalizedData = dataProcessor.normalizeBoardData({
    board, lists, cards, labels, members, actions: []
  });
  
  // Filtrar apenas concluídos dos últimos 30 dias
  const recentCompleted = dataProcessor.getCompletedCardsInPeriod(
    normalizedData.cards, 
    30
  );
  
  // Calcular tempo médio
  const avgTime = dataProcessor.calculateAverageProcessTime(recentCompleted);
  
  // Agrupar por colaborador
  const byMember = dataProcessor.groupAndCalculate(recentCompleted, 'member');
  
  return (
    <div>
      <h2>Tempo Médio: {avgTime} dias</h2>
      {byMember.map(member => (
        <div key={member.id}>
          {member.name}: {member.averageProcessTime} dias ({member.count} processos)
        </div>
      ))}
    </div>
  );
}
```

---

## ⚠️ Validações e Edge Cases

### 1. Cards sem data de início

Se `start` for null, não é possível calcular `processTimeDays`:
```javascript
const hasValidDates = card.creationDate && card.completionDate;
if (!hasValidDates) {
  // Card será ignorado nos cálculos de tempo médio
}
```

### 2. Cards com múltiplas labels

Um card pode ter várias labels (tipos de processo):
```javascript
// O card será contabilizado em TODOS os tipos
card.processTypes.forEach(type => {
  // Adicionar aos cálculos de cada tipo
});
```

### 3. Cards com múltiplos membros

Um card pode ter vários colaboradores:
```javascript
// O card será contabilizado para TODOS os membros
card.members.forEach(member => {
  // Adicionar aos cálculos de cada membro
});
```

### 4. Cards sem labels ou membros

```javascript
// Cards sem labels
processTypes: [] → Classificado como "Sem Tipo"

// Cards sem membros
members: [] → Classificado como "Sem Responsável"
```

### 5. Data de conclusão antes da criação

```javascript
if (processTimeDays < 0) {
  console.warn('Data de conclusão anterior à criação:', card);
  // Ignorar nos cálculos ou tratar como erro
}
```

---

## 🔒 Segurança

- **Nunca commite o arquivo `.env`** no Git
- As credenciais são apenas de leitura
- Token pode ser revogado a qualquer momento em https://trello.com/my/account
- API Key é pública mas requer Token para acesso

---

## 📈 Performance

### Otimizações implementadas:

1. **Busca paralela**: `Promise.all()` para buscar todos os dados simultaneamente
2. **Cache no hook**: Dados ficam em memória até próxima atualização
3. **Normalização única**: Processamento feito uma vez, reutilizado em todos os cálculos
4. **Filtros eficientes**: Uso de `Array.filter()` otimizado

### Limites da API Trello:

- **Rate Limit**: 300 requests por 10 segundos por token
- **Max Cards**: API retorna todos os cards (sem paginação para boards)
- **Timeout**: 30 segundos por request

---

## 🐛 Debugging

### Ver dados brutos

```javascript
const { cards } = useTrelloBoard();
console.log('Raw cards:', cards);
```

### Ver dados normalizados

```javascript
const normalized = dataProcessor.normalizeCard(card, lists, members);
console.log('Normalized:', normalized);
```

### Exemplo de payload

```javascript
import dataProcessor from './utils/dataProcessor';
console.log('Example payload:', dataProcessor.getExamplePayload());
```

---

## ✅ Checklist de Integração

- [x] Serviço Trello (`trelloService.js`)
- [x] Hooks React (`useTrello.js`)
- [x] Normalização de dados (`dataProcessor.js`)
- [x] Captura de data de criação (campo `start`)
- [x] Captura de data de conclusão (campo `due` quando `dueComplete`)
- [x] Captura de labels (tipos de processo)
- [x] Captura de listas (prioridades)
- [x] Captura de membros (colaboradores)
- [x] Filtros e validações
- [x] Cálculo de tempo de processo
- [x] Atualização manual
- [ ] Atualização automática (polling) - Futuro
- [ ] Webhooks em tempo real - Futuro

---

## 📞 Suporte

Em caso de erros:

1. Verifique as credenciais no `.env`
2. Confirme que o Board ID está correto
3. Teste a conexão com `testConnection()`
4. Verifique o console do navegador para erros detalhados
5. Confirme que o token tem permissões de leitura no board

---

**Última atualização**: 18 de fevereiro de 2026
