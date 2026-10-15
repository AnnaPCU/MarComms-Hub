import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { ConfirmProvider } from './hooks/useConfirm.jsx';
import './index.css';

// Link externo de un plan (/?plan=<token>): se abre sin login y sin cargar
// el resto del Hub. Ver src/components/plans/PublicPlanPage.jsx.
const publicPlanToken = new URLSearchParams(window.location.search).get('plan');

const App = lazy(() => import('./App.jsx'));
const PublicPlanPage = lazy(() => import('./components/plans/PublicPlanPage.jsx'));

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={null}>
      {publicPlanToken !== null ? (
        <PublicPlanPage token={publicPlanToken} />
      ) : (
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      )}
    </Suspense>
  </React.StrictMode>
);
