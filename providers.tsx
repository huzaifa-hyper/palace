"use client";

import React, { useState, useEffect } from 'react';
import { ThirdwebProvider, MetaMaskWallet, CoinbaseWallet, WalletConnect, SafeWallet, darkTheme } from "@thirdweb-dev/react";
import { createConfig, WagmiConfig, configureChains } from "wagmi";
import { jsonRpcProvider } from "wagmi/providers/jsonRpc";

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

// Wagmi Chain Definition for redundant stability
const somniaWagmiChain = {
  id: 50312,
  name: "Somnia Testnet",
  network: "somnia-testnet",
  nativeCurrency: { name: "Somnia Token", symbol: "STT", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://dream-rpc.somnia.network"] },
    public: { http: ["https://dream-rpc.somnia.network"] },
  },
  blockExplorers: {
    default: { name: "SocialScan", url: "https://somnia-testnet.socialscan.io" },
  },
  testnet: true,
};

const { publicClient, webSocketPublicClient } = configureChains(
  [somniaWagmiChain],
  [jsonRpcProvider({ rpc: (chain) => ({ http: chain.rpcUrls.default.http[0] }) })]
);

const wagmiConfig = createConfig({
  autoConnect: true,
  publicClient,
  webSocketPublicClient,
});

export function Providers({ children }: { children?: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Critical: Prevents hydration mismatch by rendering nothing on the server
  if (!mounted) {
    return null;
  }

  const clientId = process.env.NEXT_PUBLIC_THIRDWEB_PROJECT_ID || "";

  return (
    <WagmiConfig config={wagmiConfig}>
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
          MetaMaskWallet(),
          CoinbaseWallet(),
          WalletConnect(),
          SafeWallet()
        ]}
      >
        {children}
      </ThirdwebProvider>
    </WagmiConfig>
  );
}
