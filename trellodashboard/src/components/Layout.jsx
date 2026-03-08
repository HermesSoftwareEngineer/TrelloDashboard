import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useTheme } from '../contexts/ThemeContext';

const Layout = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const { dark } = useTheme();

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className={`flex h-screen ${dark ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-900'}`}>
      <Sidebar isOpen={isSidebarOpen} onToggle={toggleSidebar} />
      <main className={`flex-1 p-8 overflow-y-auto ${dark ? 'bg-neutral-900' : 'bg-neutral-50'}`}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;

