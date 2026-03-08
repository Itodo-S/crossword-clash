import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import 'react-toastify/dist/ReactToastify.css';
import App from './App';
import { ToastContainer } from 'react-toastify';
import { StarknetProvider } from './dojo/StarknetProvider';
import { init } from '@dojoengine/sdk';
import { DojoSdkProvider } from '@dojoengine/sdk/react';
import { setupWorld } from './dojo/contracts.gen';
import type { SchemaType } from './dojo/models.gen';
import { dojoConfig } from './dojo/dojoConfig';
import { DojoContractBridge } from './components/DojoContractBridge';

async function main() {
  let sdk;
  try {
    sdk = await init<SchemaType>({
      client: {
        worldAddress: dojoConfig.manifest.world.address,
        toriiUrl: dojoConfig.toriiUrl || 'http://localhost:8080',
      },
      domain: {
        name: 'crossword',
        version: '1.0',
        chainId: 'SN_SEPOLIA',
        revision: '1',
      },
    });
  } catch (err) {
    console.warn('[Dojo] SDK init failed (contract not deployed?):', err);
    // Render app without Dojo SDK — game still works locally
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <StarknetProvider>
          <App />
          <ToastContainer
            position="bottom-center"
            theme="dark"
            autoClose={3000}
            hideProgressBar
          />
        </StarknetProvider>
      </StrictMode>,
    );
    return;
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <StarknetProvider>
        <DojoSdkProvider
          sdk={sdk}
          dojoConfig={dojoConfig}
          clientFn={setupWorld}
        >
          <DojoContractBridge />
          <App />
          <ToastContainer
            position="bottom-center"
            theme="dark"
            autoClose={3000}
            hideProgressBar
          />
        </DojoSdkProvider>
      </StarknetProvider>
    </StrictMode>,
  );
}

main();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
