import React from 'react';
import { NavLink } from 'react-router-dom';
import { FiHome, FiTarget, FiAward, FiShuffle, FiChevronsLeft, FiChevronsRight, FiBookOpen } from 'react-icons/fi';

const Sidebar = ({ isOpen, onToggle }) => {
  const navLinkClass = ({ isActive }) =>
    `flex items-center p-3 text-sm font-medium rounded-lg transition-colors duration-200 group ${
      isActive
        ? 'bg-red-600 text-white shadow-lg'
        : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
    } ${!isOpen ? 'justify-center' : ''}`;

  return (
    <aside className={`relative flex-shrink-0 bg-neutral-950/70 border-r border-neutral-800/60 flex flex-col transition-all duration-300 ease-in-out ${isOpen ? 'w-64' : 'w-20'}`}>
      <div className={`flex items-center gap-3 h-16 border-b border-neutral-800/60 flex-shrink-0 ${isOpen ? 'px-4 justify-start' : 'px-0 justify-center'}`}>
        <FiTarget size={24} className="text-red-500 flex-shrink-0" />
        <h1 className={`text-xl font-bold text-white tracking-tighter whitespace-nowrap transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
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
      </nav>

      <div className="p-3 border-t border-neutral-800/60">
         <button 
          onClick={onToggle} 
          title={isOpen ? "Recolher menu" : "Expandir menu"}
          className={`w-full flex items-center p-3 text-sm font-medium rounded-lg transition-colors duration-200 text-neutral-400 hover:bg-neutral-800 hover:text-white ${!isOpen ? 'justify-center' : ''}`}
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

