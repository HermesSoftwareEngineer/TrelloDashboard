import React, { useState, useEffect } from 'react';
import { FiX, FiTrash2, FiSave, FiPlus } from 'react-icons/fi';

const RewardsModal = ({ rewards, onClose, onSave, onDelete }) => {
  const [localRewards, setLocalRewards] = useState([]);
  const [newRewardName, setNewRewardName] = useState('');

  useEffect(() => {
    setLocalRewards([...rewards.map(r => ({ ...r, isDirty: false }))]);
  }, [rewards]);

  const handleNameChange = (id, newName) => {
    setLocalRewards(prev => 
      prev.map(r => (r.id === id ? { ...r, name: newName, isDirty: true } : r))
    );
  };
  
  const handleAddNew = async () => {
    if (newRewardName.trim() === '') return;
    try {
      const newReward = await onSave({ name: newRewardName.trim() });
      if (newReward) {
        setLocalRewards(prev => [...prev, { ...newReward, isDirty: false }]);
        setNewRewardName('');
      }
    } catch (error) {
      console.error("Failed to add new reward:", error);
    }
  };

  const handleUpdate = (reward) => {
    if (reward.isDirty) {
      onSave(reward);
    }
  };
  
  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que quer remover esta recompensa?')) {
      try {
        await onDelete(id);
        setLocalRewards(prev => prev.filter(r => r.id !== id));
      } catch (error) {
        console.error("Failed to delete reward:", error);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <h2 className="text-lg font-bold text-white">Gerenciar Recompensas</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition-all">
            <FiX size={18} />
          </button>
        </div>

        <div className="p-6 space-y-3 overflow-y-auto max-h-[60vh]">
          {localRewards.map((reward) => (
            <div key={reward.id} className="flex items-center gap-2">
              <input
                type="text"
                value={reward.name}
                onChange={(e) => handleNameChange(reward.id, e.target.value)}
                onBlur={() => handleUpdate(reward)}
                className="w-full px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30"
              />
              <button
                onClick={() => handleDelete(reward.id)}
                className="p-2 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-900/20 transition-all"
                title="Excluir"
              >
                <FiTrash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-900/50 rounded-b-2xl">
           <div className="flex items-center gap-2">
              <input
                type="text"
                value={newRewardName}
                onChange={(e) => setNewRewardName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddNew()}
                placeholder="Nome da nova recompensa..."
                className="w-full px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30"
              />
              <button
                onClick={handleAddNew}
                className="p-2 rounded-lg text-white bg-green-600 hover:bg-green-500 transition-all"
                title="Adicionar"
              >
                <FiPlus size={16} />
              </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default RewardsModal;
