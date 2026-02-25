import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { PeriodFilterProvider } from './contexts/PeriodFilterContext'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <PeriodFilterProvider>
        <App />
      </PeriodFilterProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
