"use client";

import React, { useState, useEffect } from 'react';
import { ThirdwebProvider, MetaMaskWallet, CoinbaseWallet, WalletConnect, SafeWallet } from "@thirdweb-dev/react";

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

  // Prevent hydration mismatch by only rendering the provider on the client
  if (!mounted) {
    return null;
  }

  return (
    <ThirdwebProvider
      activeChain={SOMNIA_CHAIN}
      clientId={process.env.NEXT_PUBLIC_THIRDWEB_PROJECT_ID}
      supportedWallets={[
        MetaMaskWallet(),
        CoinbaseWallet(),
        WalletConnect(),
        SafeWallet()
      ]}
    >
      {children}
    </ThirdwebProvider>
  );
}
