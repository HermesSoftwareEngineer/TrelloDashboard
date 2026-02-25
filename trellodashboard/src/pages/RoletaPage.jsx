import React, { useState, useEffect } from 'react';
import { getRewards, addReward, updateReward, deleteReward } from '../services/roletaService';
import Spinner from '../components/Spinner';
import RewardsModal from '../components/RewardsModal';
import { FiSettings, FiX } from 'react-icons/fi';

const RoletaPage = () => {
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchRewards = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getRewards();
      setRewards(data || []);
    } catch (err) {
      setError('Não foi possível carregar as recompensas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRewards();
  }, []);

  const handleSpin = () => {
    if (isSpinning || rewards.length === 0) return;

    setWinner(null);
    const randomIndex = Math.floor(Math.random() * rewards.length);
    const selectedReward = rewards[randomIndex];
    setWinner(selectedReward);

    setTimeout(() => {
      setIsSpinning(true);
    }, 50);

    setTimeout(() => {
      setIsSpinning(false);
    }, 5500); 
  };
  
  const handleSaveReward = async (rewardData) => {
    try {
      setError(null);
      if (rewardData.id) {
        // Update
        const updated = await updateReward(rewardData.id, rewardData.name);
        setRewards(prev => prev.map(r => r.id === updated.id ? { ...r, name: updated.name } : r));
      } else {
        // Add
        const newReward = await addReward(rewardData.name);
        setRewards(prev => [...prev, newReward]);
        return newReward;
      }
    } catch (error) {
      setError("Erro ao salvar recompensa. Verifique as permissões no Supabase (é preciso estar logado).");
      // Re-fetch to ensure UI is in sync with DB
      fetchRewards(); 
    }
  };
  
  const handleDeleteReward = async (id) => {
    try {
      setError(null);
      await deleteReward(id);
      setRewards(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      setError("Erro ao deletar recompensa. Verifique as permissões no Supabase (é preciso estar logado).");
       // Re-fetch to ensure UI is in sync with DB
       fetchRewards();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-neutral-500 tracking-widest uppercase">Carregando Recompensas...</p>
      </div>
    );
  }

return (
    <>
      <div className="flex flex-col h-full text-center">
        {/* CabeÃ§alho */}
        <div className="w-full flex justify-between items-start pt-8 px-8 flex-shrink-0">
            <div className="text-left">
                <h1 className="text-2xl font-bold text-white tracking-tight">Roleta de Recompensas</h1>
                <p className="text-sm text-neutral-500 mt-1">Gire para descobrir seu prêmio.</p>
            </div>
            <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest text-neutral-300 bg-neutral-800/50 hover:bg-neutral-700/70 border border-neutral-700 rounded-lg transition-all"
            >
                <FiSettings size={14} />
                Gerenciar
            </button>
        </div>

        {/* NotificaÃ§Ã£o de Erro */}
        {error && (
            <div className="w-full max-w-md mx-auto mt-4 flex items-center justify-between bg-red-900/40 border border-red-800/50 rounded-xl px-5 py-3">
              <p className="text-sm text-red-400">{error}</p>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
                <FiX size={16} />
              </button>
            </div>
        )}

        {/* ConteÃºdo Principal (Roleta) */}
        <div className="flex-grow flex flex-col items-center justify-center">
          {rewards.length > 0 ? (
            <>
              <div className="my-8">
                <Spinner 
                  rewards={rewards} 
                  targetReward={winner} 
                  isSpinning={isSpinning} 
                />
              </div>

              <div className="flex flex-col items-center">
                <button
                  onClick={handleSpin}
                  disabled={isSpinning || loading}
                  className="px-8 py-4 text-lg font-bold uppercase tracking-widest text-white bg-red-600 hover:bg-red-500 rounded-xl transition-all shadow-lg shadow-red-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSpinning ? 'Girando...' : 'Girar a Roleta'}
                </button>
                {winner && !isSpinning && (
                  <div className="mt-8 p-6 bg-neutral-800 border border-neutral-700 rounded-xl animate-fade-in">
                    <p className="text-sm text-neutral-400">Parabéns! Você ganhou:</p>
                    <p className="text-2xl font-bold text-amber-400 mt-1">{winner.name}</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center p-16 bg-neutral-900 border border-neutral-800 border-dashed rounded-2xl">
              <p className="font-bold text-white text-base">Nenhuma recompensa cadastrada.</p>
              <p className="text-sm text-neutral-500 mt-2">Clique em "Gerenciar" para adicionar recompensas à roleta.</p>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <RewardsModal
          rewards={rewards}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveReward}
          onDelete={handleDeleteReward}
        />
      )}
    </>
  );
};

export default RoletaPage;
