// import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  // Временно отключаем StrictMode чтобы избежать дублирования компонентов в разработке
  // <StrictMode>
    <App />
  // </StrictMode>
);
