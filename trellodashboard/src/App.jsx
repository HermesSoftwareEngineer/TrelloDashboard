import { Routes, Route } from 'react-router-dom';
import { useTrelloConnection, useTrelloBoard } from './hooks/useTrello';
import dataProcessor from './utils/dataProcessor';
import { useTheme } from './contexts/ThemeContext';

import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import GoalManagementPage from './pages/GoalManagementPage';
import RoletaPage from './pages/RoletaPage';
import ResumePage from './pages/ResumePage';
import ProductivityAnalysisPage from './pages/ProductivityAnalysisPage';
import IndicadoresImoviewPage from './pages/IndicadoresImoviewPage';
import IndicadoresAtendimentosImoviewPage from './pages/IndicadoresAtendimentosImoviewPage';
import BottleneckAnalysisPage from './pages/BottleneckAnalysisPage';

const LoadingScreen = ({ text, dark = true }) => (
  <div className={`flex items-center justify-center h-screen ${dark ? 'bg-neutral-950 text-neutral-500' : 'bg-neutral-100 text-neutral-600'}`}>
    <div className="text-center">
      <div className="w-9 h-9 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-xs tracking-widest uppercase">{text}</p>
    </div>
  </div>
);

const ErrorScreen = ({ error, onRetry, dark = true }) => (
  <div className={`p-8 flex items-center justify-center h-screen ${dark ? 'bg-neutral-950 text-white' : 'bg-neutral-100 text-neutral-900'}`}>
    <div className={`rounded-2xl p-8 max-w-sm w-full text-center border ${dark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'}`}>
      <p className="text-red-500 text-xs font-bold uppercase tracking-widest mb-2">Erro de Conexão</p>
      <p className={`text-sm mb-6 ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>{error}</p>
      <button 
        onClick={onRetry} 
        className="w-full border border-red-600 bg-red-600 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg hover:bg-red-700 hover:border-red-700 transition-colors cursor-pointer"
      >
        Tentar Novamente
      </button>
    </div>
  </div>
);

function App() {
  const { dark } = useTheme();
  const connectionStatus = useTrelloConnection();
  const { board, cards, lists, labels, customFields, members, actions, isLoading, error, refetch } = useTrelloBoard();

  if (connectionStatus.isLoading) {
    return <LoadingScreen text="Verificando conexão..." dark={dark} />;
  }

  if (!connectionStatus.isConnected) {
    return <ErrorScreen error={connectionStatus.error} onRetry={() => window.location.reload()} dark={dark} />;
  }
  
  if (isLoading) {
    return <LoadingScreen text="Carregando dados do Trello..." dark={dark} />;
  }

  if (error) {
    return <ErrorScreen error={error} onRetry={refetch} dark={dark} />;
  }

  const normalizedData = dataProcessor.normalizeBoardData({ cards, board, lists, labels, customFields, members, actions });

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<DashboardPage normalizedData={normalizedData} refetch={refetch} />} />
        <Route path="metas" element={<GoalManagementPage />} />
        <Route path="roleta" element={<RoletaPage />} />
        <Route path="resumo" element={<ResumePage />} />
        <Route path="analise-produtividade" element={<ProductivityAnalysisPage />} />
        <Route
          path="analise-gargalos"
          element={<BottleneckAnalysisPage cards={cards} customFields={customFields} members={members} />}
        />
        <Route
          path="indicadores-imoview"
          element={<IndicadoresImoviewPage trelloCards={cards} trelloCustomFields={customFields} />}
        />
        <Route path="indicadores-atendimentos-imoview" element={<IndicadoresAtendimentosImoviewPage />} />
      </Route>
    </Routes>
  );
}

export default App;