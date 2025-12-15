import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import sdk from '@farcaster/frame-sdk';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Initialize Farcaster Frame SDK if in that environment
const initFrame = async () => {
    try {
        await sdk.actions.ready();
    } catch (e) {
        // Ignore errors if not running in Farcaster Frame context
        console.log("Not running in Farcaster Frame context or SDK failed to ready.");
    }
};

initFrame();

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);