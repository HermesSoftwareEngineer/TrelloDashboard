import { useState } from 'react'
import { useTrelloConnection, useTrelloBoard } from './hooks/useTrello'
import dataProcessor from './utils/dataProcessor'
import DashboardV2 from './components/DashboardV2'

function App() {
  const [dark, setDark] = useState(true);
  const connectionStatus = useTrelloConnection();
  const { board, cards, lists, labels, customFields, members, actions, isLoading, error, refetch } = useTrelloBoard();

  const bgClass = dark ? 'bg-neutral-950' : 'bg-neutral-100';
  const fgClass = dark ? 'text-neutral-100' : 'text-neutral-950';
  const subClass = dark ? 'text-neutral-500' : 'text-neutral-500';
  const hdrClass = dark ? 'bg-neutral-900' : 'bg-white';
  const bdrClass = dark ? 'border-neutral-700' : 'border-neutral-200';
  const btnNeutral = dark 
    ? 'border border-neutral-700 text-neutral-500 hover:text-neutral-100 hover:border-neutral-600' 
    : 'border border-neutral-200 text-neutral-500 hover:text-neutral-950 hover:border-neutral-300';

  if (connectionStatus.isLoading) {
    return (
      <div className={`min-h-screen ${bgClass} ${subClass} flex items-center justify-center`}>
        <p className="text-xs tracking-widest">Verificando conexão...</p>
      </div>
    );
  }

  if (!connectionStatus.isConnected) {
    return (
      <div className={`min-h-screen ${bgClass} ${fgClass} p-8`}>
        <p className="text-xs font-bold uppercase tracking-widest text-red-600 mb-4">Erro na conexão</p>
        <p className={`text-sm ${subClass} mb-6`}>{connectionStatus.error}</p>
        <div className={`border ${bdrClass} rounded-xl p-5 max-w-lg mb-6`}>
          <p className={`text-xs font-bold uppercase tracking-widest ${subClass} mb-3`}>Como resolver</p>
          <ul className={`text-xs ${subClass} pl-4 leading-loose`}>
            <li>Verifique as variáveis VITE_ no arquivo .env</li>
            <li>Reinicie o servidor após alterar o .env</li>
            <li>Confirme API Key, Token e Board ID no Trello</li>
          </ul>
        </div>
        <button onClick={() => window.location.reload()} className="border border-red-600 bg-red-600 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg hover:bg-red-700 hover:border-red-700 transition-colors cursor-pointer">
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgClass} ${fgClass} transition-colors duration-200`}>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-9 h-9 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className={`text-xs ${subClass} tracking-widest`}>Carregando dados...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className={`${hdrClass} border ${bdrClass} rounded-2xl p-8 max-w-sm w-full`}>
            <p className="text-red-600 text-xs font-bold uppercase tracking-widest mb-2">Erro ao conectar</p>
            <p className={`${subClass} text-sm mb-6`}>{error}</p>
            <button onClick={refetch} className="w-full border border-red-600 bg-red-600 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg hover:bg-red-700 hover:border-red-700 transition-colors cursor-pointer">
              Tentar novamente
            </button>
          </div>
        </div>
      ) : (
        <>
          <header className="no-print sticky top-0 z-50" style={{ background: dark ? '#111111' : '#ffffff', borderBottom: `1px solid ${dark ? '#272727' : '#e5e5e5'}` }}>
            <div className="px-6 h-14 flex items-center justify-between">
              <div>
                <span className={`text-sm font-bold ${fgClass}`}>
                  Locação 3.0
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className={`border text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-colors cursor-pointer ${btnNeutral}`}>
                  Imprimir
                </button>
                <button onClick={() => setDark(d => !d)} className={`border text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-colors cursor-pointer ${btnNeutral}`}>
                  {dark ? 'Claro' : 'Escuro'}
                </button>
                <button onClick={refetch} className="border border-red-600 bg-red-600 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg hover:bg-red-700 hover:border-red-700 transition-colors cursor-pointer">
                  Atualizar
                </button>
              </div>
            </div>
          </header>

          <DashboardV2 dark={dark} normalizedData={dataProcessor.normalizeBoardData({ cards, board, lists, labels, customFields, members, actions })} />
        </>
      )}
    </div>
  )
}

export default App
