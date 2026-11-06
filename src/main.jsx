import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { ConfirmProvider } from './hooks/useConfirm.jsx';
import './index.css';

// Link externo de un plan (/?plan=<token>): se abre sin login y sin cargar
// el resto del Hub. Ver src/components/plans/PublicPlanPage.jsx.
const params = new URLSearchParams(window.location.search);
const publicPlanToken = params.get('plan');
// Link externo de Facturación (/?facturacion=<token>): solo lectura, sin
// login. Ver src/components/invoicing/InvoicingPublicPage.jsx.
const publicInvoicingToken = params.get('facturacion');

const App = lazy(() => import('./App.jsx'));
const PublicPlanPage = lazy(() => import('./components/plans/PublicPlanPage.jsx'));
const InvoicingPublicPage = lazy(() => import('./components/invoicing/InvoicingPublicPage.jsx'));

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={null}>
      {publicPlanToken !== null ? (
        <PublicPlanPage token={publicPlanToken} />
      ) : publicInvoicingToken !== null ? (
        <InvoicingPublicPage token={publicInvoicingToken} />
      ) : (
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      )}
    </Suspense>
  </React.StrictMode>
);
