import './app/tokens.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { loadDependencies } from './adapters';
import { App } from './app/App';
import { DependenciesContext } from './app/dependencies';

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('index.html is missing the #root element');
}

const dependencies = await loadDependencies();

createRoot(rootElement).render(
  <StrictMode>
    <DependenciesContext value={dependencies}>
      <App />
    </DependenciesContext>
  </StrictMode>,
);
