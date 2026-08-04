import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: true, staleTime: 5000 } },
});

const root = createRoot(document.getElementById('root')!);
const path = window.location.pathname;

if (path === '/supaadmin') {
  import('./components/SuperAdmin').then(({ default: SuperAdmin }) => {
    root.render(<StrictMode><SuperAdmin /></StrictMode>);
  }).catch(err => {
    // Show error so admin knows what went wrong instead of blank screen
    document.getElementById('root')!.innerHTML = `
      <div style="min-height:100vh;background:#060912;color:#EEF4FF;display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;padding:24px">
        <div style="text-align:center;max-width:480px">
          <div style="width:64px;height:64px;border-radius:16px;background:linear-gradient(135deg,#00879A,#00C2D4);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:28px">🛡️</div>
          <h1 style="font-size:20px;font-weight:900;margin-bottom:8px">Admin Panel Error</h1>
          <p style="color:#4A6E88;font-size:13px;margin-bottom:16px">The admin panel failed to load. This is usually a build or deployment issue.</p>
          <code style="display:block;background:rgba(255,255,255,0.06);padding:12px;border-radius:8px;font-size:11px;color:#f87171;word-break:break-all;text-align:left">${err?.message || String(err)}</code>
          <button onclick="location.reload()" style="margin-top:16px;padding:10px 24px;background:linear-gradient(135deg,#00879A,#00C2D4);color:white;border:none;border-radius:12px;font-weight:700;cursor:pointer;font-size:13px">Try Again</button>
        </div>
      </div>`;
  });
} else if (path === '/terms' || path === '/privacy' || path === '/legal') {
  import('./components/LegalPage').then(({ default: LegalPage }) => {
    root.render(<StrictMode><LegalPage type={path.slice(1) as 'terms' | 'privacy' | 'legal'} /></StrictMode>);
  });
} else {
  import('./App').then(({ default: App }) => {
    root.render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </StrictMode>
    );
  });
}

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
