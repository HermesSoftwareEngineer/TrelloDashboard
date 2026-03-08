import React from 'react';
import { NavLink } from 'react-router-dom';
import { FiHome, FiTarget, FiAward, FiShuffle, FiChevronsLeft, FiChevronsRight, FiBookOpen, FiBarChart2, FiMoon, FiSun, FiPieChart } from 'react-icons/fi';
import { useTheme } from '../contexts/ThemeContext';

const Sidebar = ({ isOpen, onToggle }) => {
  const { dark, toggleTheme } = useTheme();

  const navLinkClass = ({ isActive }) =>
    `flex items-center p-3 text-sm font-medium rounded-lg transition-colors duration-200 group ${
      isActive
        ? 'bg-red-600 text-white shadow-lg'
        : dark
          ? 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
          : 'text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900'
    } ${!isOpen ? 'justify-center' : ''}`;

  return (
    <aside className={`relative flex-shrink-0 border-r flex flex-col transition-all duration-300 ease-in-out ${dark ? 'bg-neutral-950/70 border-neutral-800/60' : 'bg-white border-neutral-200'} ${isOpen ? 'w-64' : 'w-20'}`}>
      <div className={`flex items-center gap-3 h-16 border-b flex-shrink-0 ${dark ? 'border-neutral-800/60' : 'border-neutral-200'} ${isOpen ? 'px-4 justify-start' : 'px-0 justify-center'}`}>
        <FiTarget size={24} className="text-red-500 flex-shrink-0" />
        <h1 className={`text-xl font-bold tracking-tighter whitespace-nowrap transition-opacity duration-200 ${dark ? 'text-white' : 'text-neutral-900'} ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
          TrelloDash
        </h1>
      </div>
      
      <nav className="flex-1 flex flex-col gap-2 p-3 overflow-y-auto">
        <NavLink to="/" end className={navLinkClass}>
          <FiHome size={18} className="flex-shrink-0" />
          <span className={`ml-3 whitespace-nowrap overflow-hidden transition-all ${isOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>Dashboard</span>
        </NavLink>
        <NavLink to="/metas" className={navLinkClass}>
          <FiAward size={18} className="flex-shrink-0" />
          <span className={`ml-3 whitespace-nowrap overflow-hidden transition-all ${isOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>Gestão de Metas</span>
        </NavLink>
        <NavLink to="/roleta" className={navLinkClass}>
          <FiShuffle size={18} className="flex-shrink-0" />
          <span className={`ml-3 whitespace-nowrap overflow-hidden transition-all ${isOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>Roleta</span>
        </NavLink>
        <NavLink to="/resumo" className={navLinkClass}>
          <FiBookOpen size={18} className="flex-shrink-0" />
          <span className={`ml-3 whitespace-nowrap overflow-hidden transition-all ${isOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>Resumo</span>
        </NavLink>
        <NavLink to="/analise-produtividade" className={navLinkClass}>
          <FiBarChart2 size={18} className="flex-shrink-0" />
          <span className={`ml-3 whitespace-nowrap overflow-hidden transition-all ${isOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>Análise de produtividade</span>
        </NavLink>
        <NavLink to="/indicadores-imoview" className={navLinkClass}>
          <FiPieChart size={18} className="flex-shrink-0" />
          <span className={`ml-3 whitespace-nowrap overflow-hidden transition-all ${isOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>Indicadores Imoview</span>
        </NavLink>
      </nav>

      <div className={`p-3 border-t space-y-2 ${dark ? 'border-neutral-800/60' : 'border-neutral-200'}`}>
        <button
          onClick={toggleTheme}
          title={dark ? 'Ativar modo claro' : 'Ativar modo escuro'}
          className={`w-full flex items-center p-3 text-sm font-medium rounded-lg transition-colors duration-200 ${dark ? 'text-neutral-400 hover:bg-neutral-800 hover:text-white' : 'text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900'} ${!isOpen ? 'justify-center' : ''}`}
        >
          <div className="flex items-center justify-center">
            {dark ? <FiSun size={18} className="flex-shrink-0" /> : <FiMoon size={18} className="flex-shrink-0" />}
            <span className={`ml-3 whitespace-nowrap overflow-hidden transition-all ${isOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>
              {dark ? 'Modo claro' : 'Modo escuro'}
            </span>
          </div>
        </button>

        <button 
          onClick={onToggle} 
          title={isOpen ? "Recolher menu" : "Expandir menu"}
          className={`w-full flex items-center p-3 text-sm font-medium rounded-lg transition-colors duration-200 ${dark ? 'text-neutral-400 hover:bg-neutral-800 hover:text-white' : 'text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900'} ${!isOpen ? 'justify-center' : ''}`}
        >
          <div className="flex items-center justify-center">
            {isOpen 
              ? <FiChevronsLeft size={18} className="flex-shrink-0" /> 
              : <FiChevronsRight size={18} className="flex-shrink-0" />
            }
            <span className={`ml-3 whitespace-nowrap overflow-hidden transition-all ${isOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>Recolher</span>
          </div>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

