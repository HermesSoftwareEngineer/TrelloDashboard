import { useState } from 'react'
import { useTrelloConnection, useTrelloBoard } from './hooks/useTrello'
import DashboardV2 from './components/DashboardV2'
import './App.css'

function App() {
  const [dark, setDark] = useState(true);
  const connectionStatus = useTrelloConnection();
  const { board, lists, cards, members, actions, isLoading, error, refetch } = useTrelloBoard();

  const bg   = dark ? '#0c0c0c' : '#f5f5f5';
  const fg   = dark ? '#f5f5f5' : '#0c0c0c';
  const sub  = dark ? '#737373' : '#737373';
  const hdr  = dark ? '#111111' : '#ffffff';
  const bdr  = dark ? '#272727' : '#e5e5e5';
  const btnBase = `border text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-colors cursor-pointer`;
  const btnNeutral = dark
    ? `${btnBase} bg-transparent border-[#272727] text-[#737373] hover:text-[#f5f5f5] hover:border-[#3a3a3a]`
    : `${btnBase} bg-transparent border-[#e5e5e5] text-[#737373] hover:text-[#0c0c0c] hover:border-[#d4d4d4]`;
  const btnRed = `${btnBase} bg-[#dc2626] border-[#dc2626] text-white hover:bg-[#b91c1c] hover:border-[#b91c1c]`;

  if (connectionStatus.isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: bg, color: sub, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <p style={{ fontSize: '0.875rem', letterSpacing: '0.05em' }}>Verificando conexão...</p>
      </div>
    );
  }

  if (!connectionStatus.isConnected) {
    return (
      <div style={{ minHeight: '100vh', background: bg, color: fg, padding: '2rem', fontFamily: 'sans-serif' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#dc2626', marginBottom: '1rem' }}>Erro na conexão</p>
        <p style={{ fontSize: '0.875rem', color: sub, marginBottom: '1.5rem' }}>{connectionStatus.error}</p>
        <div style={{ border: `1px solid ${bdr}`, borderRadius: '12px', padding: '1.25rem', maxWidth: '480px', marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: sub, marginBottom: '0.75rem' }}>Como resolver</p>
          <ul style={{ fontSize: '0.8rem', color: sub, paddingLeft: '1rem', lineHeight: 2 }}>
            <li>Verifique as variáveis VITE_ no arquivo .env</li>
            <li>Reinicie o servidor após alterar o .env</li>
            <li>Confirme API Key, Token e Board ID no Trello</li>
          </ul>
        </div>
        <button onClick={() => window.location.reload()} className={btnRed}>Tentar novamente</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: bg, color: fg, transition: 'background 0.2s, color 0.2s' }}>
      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 36, height: 36, border: '2px solid #dc2626', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
            <p style={{ fontSize: '0.8rem', color: sub, letterSpacing: '0.05em' }}>Carregando dados...</p>
          </div>
        </div>
      ) : error ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1rem' }}>
          <div style={{ background: hdr, border: `1px solid ${bdr}`, borderRadius: 16, padding: '2rem', maxWidth: 380, width: '100%' }}>
            <p style={{ color: '#dc2626', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Erro ao conectar</p>
            <p style={{ color: sub, fontSize: '0.875rem', marginBottom: '1.5rem' }}>{error}</p>
            <button onClick={refetch} className={btnRed} style={{ width: '100%', display: 'block' }}>Tentar novamente</button>
          </div>
        </div>
      ) : (
        <>
          <header className="no-print" style={{ background: hdr, borderBottom: `1px solid ${bdr}`, position: 'sticky', top: 0, zIndex: 50 }}>
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 1.5rem', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: fg }}>
                  {connectionStatus.board?.name || 'Trello Dashboard'}
                </span>
                <span style={{ fontSize: '0.75rem', color: sub, marginLeft: '0.75rem' }}>
                  {cards.length} processos
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => window.print()} className={btnNeutral}>Imprimir</button>
                <button onClick={() => setDark(d => !d)} className={btnNeutral}>{dark ? 'Claro' : 'Escuro'}</button>
                <button onClick={refetch} className={btnRed}>Atualizar</button>
              </div>
            </div>
          </header>

          <DashboardV2
            cards={cards}
            lists={lists}
            members={members}
            actions={actions}
            dark={dark}
          />
        </>
      )}
    </div>
  )
}

export default App
