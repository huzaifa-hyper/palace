
"use client";

import React, { useState, useEffect } from 'react';
import { ThirdwebProvider, metamaskWallet, coinbaseWallet, walletConnect, safeWallet, darkTheme } from "@thirdweb-dev/react";

// Somnia Testnet Configuration
export const SOMNIA_CHAIN = {
  chainId: 50312,
  rpc: ["https://dream-rpc.somnia.network"],
  nativeCurrency: {
    name: "Somnia Token",
    symbol: "STT",
    decimals: 18,
  },
  shortName: "somnia",
  slug: "somnia-testnet",
  testnet: true,
  chain: "Somnia",
  name: "Somnia Testnet",
  explorers: [
    {
      name: "SocialScan",
      url: "https://somnia-testnet.socialscan.io",
      standard: "EIP3091",
    },
  ],
};

export function Providers({ children }: { children?: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Critical: Prevents hydration mismatch by rendering nothing on the server
  if (!mounted) {
    return null;
  }

  // Use a fallback client ID if env is missing to prevent silent crashes
  const clientId = process.env.NEXT_PUBLIC_THIRDWEB_PROJECT_ID || "";

  return (
    <ThirdwebProvider
      activeChain={SOMNIA_CHAIN}
      clientId={clientId}
      theme={darkTheme({
        colors: {
          accentText: "#f59e0b", // Amber 500
          accentButtonBg: "#f59e0b",
          primaryButtonBg: "#1e293b", // Slate 800
        },
      })}
      supportedWallets={[
        // Fix: Use lowercase factory functions instead of PascalCase classes to define supported wallets
        metamaskWallet(),
        coinbaseWallet(),
        walletConnect(),
        safeWallet()
      ]}
    >
      {children}
    </ThirdwebProvider>
  );
}
