import React from 'react';
import DashboardV2 from '../components/DashboardV2';
import { FiPrinter, FiRefreshCw } from 'react-icons/fi';
import { useTheme } from '../contexts/ThemeContext';

const DashboardPage = ({ normalizedData, refetch }) => {
  const { dark } = useTheme();

  const btnNeutral = dark 
    ? 'border-neutral-700 bg-neutral-800/50 hover:bg-neutral-700/60 text-neutral-300 hover:text-white' 
    : 'border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-600 hover:text-black';

  return (
    <div>
      <header className={`no-print sticky top-0 z-40 backdrop-blur-md border-b -mx-8 -mt-8 mb-8 px-8 ${dark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white/90 border-neutral-200'}`}>
        <div className="flex items-center justify-between h-16">
          <div>
            <h1 className={`text-xl font-bold ${dark ? 'text-white' : 'text-neutral-900'}`}>Dashboard</h1>
            <p className={`text-xs ${dark ? 'text-neutral-400' : 'text-neutral-600'}`}>Visão geral do seu projeto.</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => window.print()} 
              className={`p-2 rounded-lg transition-colors ${btnNeutral}`}
              title="Imprimir"
            >
              <FiPrinter size={16} />
            </button>
            <button 
              onClick={refetch} 
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white bg-red-600 hover:bg-red-500 rounded-lg transition-all"
            >
              <FiRefreshCw size={14} />
              Atualizar
            </button>
          </div>
        </div>
      </header>

      <DashboardV2 dark={dark} normalizedData={normalizedData} />
    </div>
  );
};

export default DashboardPage;
