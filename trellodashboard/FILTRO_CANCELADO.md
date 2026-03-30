# 🏷️ Filtro de Cancelados - Documentação

## 📋 Visão Geral

Foi implementado um filtro global para controlar como os cards cancelados (com a tag "CANCELADO") são exibidos no dashboard.

## 🎯 Funcionalidades

### Opções de Filtro

O filtro possui 3 modos diferentes:

1. **Excluir Cancelados** (padrão)
   - Remove todos os cards com a tag "CANCELADO"
   - Mostra apenas processos ativos

2. **Mostrar Todos**
   - Exibe todos os cards, incluindo os cancelados
   - Sem filtragem de cancelados

3. **Só Cancelados**
   - Exibe apenas cards com a tag "CANCELADO"
   - Útil para análise de processos cancelados

## 📂 Arquivos Modificados

### 1. `src/contexts/PeriodFilterContext.jsx`
**Adições:**
- Estado: `canceledFilter` (valores: 'exclude', 'all', 'only')
- Função: `changeCanceledFilter(mode)` - muda o modo de filtro
- Lógica de filtragem: O `filterCards()` agora considera cards com tag "CANCELADO"

**Como funciona:**
- `isCanceledCard()` - verifica se um card possui a label/tag "CANCELADO"
- `matchesCanceledFilter()` - aplica a lógica de filtro baseado no modo escolhido
- O filtro é considerado junto com período, tipo de processo e membros

### 2. `src/components/PeriodFilter.jsx`
**Adições:**
- UI para o filtro de cancelados (element `<select>`)
- Integração com `changeCanceledFilter` do contexto
- Exibe a opção após os filtros de tipos de processo e colaboradores

## 🔍 Como Usar

### No Dashboard Principal (DashboardV2)

O filtro está automaticamente integrado e funciona através do hook `usePeriodFilter()`:

```jsx
const { canceledFilter, changeCanceledFilter } = usePeriodFilter();

// Alterar o modo do filtro
changeCanceledFilter('only');   // Mostrar só cancelados
changeCanceledFilter('all');    // Mostrar todos
changeCanceledFilter('exclude'); // Excluir cancelados (padrão)
```

## 📊 Impacto nos Dados

### Contadores
Os contadores de cards (created, completed, inProgress, active) são ajustados automaticamente baseado no filtro selecionado.

### Exemplo:
- **Sem Cancelados**: 45 processos novos
- **Todos**: 50 processos novos (5 cancelados)
- **Só Cancelados**: 5 processos

## ✅ Checklist de Verificação

- [x] Estado adicionado ao contexto
- [x] Lógica de detecção de cards cancelados
- [x] Aplicação do filtro aos dados
- [x] UI do filtro no componente
- [x] Integração com o resto do sistema de filtros
- [x] Padrão definido como "Excluir Cancelados"

## 🚀 Próximos Passos (opcional)

Se necessário em futuras iterações:
- Adicionar contadores mostrando quantos cards foram excluídos/incluídos
- Histórico de análises de cancelamentos
- Motivos para cancelamento (se houver)
- Relatórios de taxa de cancelamento
