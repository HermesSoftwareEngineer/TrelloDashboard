import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { PeriodFilterProvider } from './contexts/PeriodFilterContext'

createRoot(document.getElementById('root')).render(
  <PeriodFilterProvider>
    <App />
  </PeriodFilterProvider>,
)
