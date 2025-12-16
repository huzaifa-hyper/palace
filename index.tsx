import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import sdk from '@farcaster/frame-sdk';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Initialize Farcaster SDK immediately
sdk.actions.ready().catch(err => {
  console.warn("Failed to call sdk.actions.ready():", err);
});

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);