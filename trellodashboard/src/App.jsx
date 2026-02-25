import { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useTrelloConnection, useTrelloBoard } from './hooks/useTrello';
import dataProcessor from './utils/dataProcessor';

import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import GoalManagementPage from './pages/GoalManagementPage';
import RoletaPage from './pages/RoletaPage';
import { FiTarget } from 'react-icons/fi';

const LoadingScreen = ({ text }) => (
  <div className="bg-neutral-950 text-neutral-500 flex items-center justify-center h-screen">
    <div className="text-center">
      <div className="w-9 h-9 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-xs tracking-widest uppercase">{text}</p>
    </div>
  </div>
);

const ErrorScreen = ({ error, onRetry }) => (
  <div className="bg-neutral-950 text-white p-8 flex items-center justify-center h-screen">
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 max-w-sm w-full text-center">
      <p className="text-red-500 text-xs font-bold uppercase tracking-widest mb-2">Erro de Conexão</p>
      <p className="text-neutral-400 text-sm mb-6">{error}</p>
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
  const [dark, setDark] = useState(true);
  const connectionStatus = useTrelloConnection();
  const { board, cards, lists, labels, customFields, members, actions, isLoading, error, refetch } = useTrelloBoard();

  if (connectionStatus.isLoading) {
    return <LoadingScreen text="Verificando conexão..." />;
  }

  if (!connectionStatus.isConnected) {
    return <ErrorScreen error={connectionStatus.error} onRetry={() => window.location.reload()} />;
  }
  
  if (isLoading) {
    return <LoadingScreen text="Carregando dados do Trello..." />;
  }

  if (error) {
    return <ErrorScreen error={error} onRetry={refetch} />;
  }

  const normalizedData = dataProcessor.normalizeBoardData({ cards, board, lists, labels, customFields, members, actions });

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<DashboardPage dark={dark} setDark={setDark} normalizedData={normalizedData} refetch={refetch} />} />
        <Route path="metas" element={<GoalManagementPage />} />
        <Route path="roleta" element={<RoletaPage />} />
      </Route>
    </Routes>
  );
}

export default App;