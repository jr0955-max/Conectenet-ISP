import { createRoot } from 'react-dom/client';
import App from './App.js';
import './index.css';
import { ThemeProvider } from './context/ThemeContext.js';

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);

