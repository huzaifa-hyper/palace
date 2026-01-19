"use client";

import { useState, useEffect, useCallback } from 'react';
import { SOMNIA_CHAIN_ID, SOMNIA_RPC_URL } from '../services/web3Service';

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
  balance: string;
  isConnecting: boolean;
  error: string | null;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnected: false,
    chainId: null,
    balance: "0",
    isConnecting: false,
    error: null,
  });

  const updateBalance = useCallback(async (address: string) => {
    if (!(window as any).ethereum || !(window as any).ethers) return;
    try {
      const provider = new (window as any).ethers.BrowserProvider((window as any).ethereum);
      const balance = await provider.getBalance(address);
      setState(prev => ({ ...prev, balance: (window as any).ethers.formatEther(balance) }));
    } catch (err) {
      console.error("Failed to fetch balance:", err);
    }
  }, []);

  const connect = useCallback(async () => {
    if (!(window as any).ethereum) {
      setState(prev => ({ ...prev, error: "MetaMask or a Web3 wallet is not installed." }));
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      const network = await (window as any).ethereum.request({ method: 'eth_chainId' });
      const chainId = parseInt(network, 16);
      const address = accounts[0];

      setState(prev => ({
        ...prev,
        address,
        isConnected: true,
        chainId,
        isConnecting: false,
      }));

      await updateBalance(address);
    } catch (err: any) {
      console.error("Connection error:", err);
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: err.message || "Failed to connect wallet",
      }));
    }
  }, [updateBalance]);

  const disconnect = useCallback(() => {
    setState({
      address: null,
      isConnected: false,
      chainId: null,
      balance: "0",
      isConnecting: false,
      error: null,
    });
  }, []);

  const switchChain = useCallback(async () => {
    if (!(window as any).ethereum) return;
    try {
      await (window as any).ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${SOMNIA_CHAIN_ID.toString(16)}` }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await (window as any).ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${SOMNIA_CHAIN_ID.toString(16)}`,
                chainName: 'Somnia Testnet',
                rpcUrls: [SOMNIA_RPC_URL],
                nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 },
                blockExplorerUrls: ['https://somnia-testnet.socialscan.io'],
              },
            ],
          });
        } catch (addError) {
          console.error("Failed to add network:", addError);
        }
      }
    }
  }, []);

  // Check for existing connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      if ((window as any).ethereum) {
        try {
          const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            const network = await (window as any).ethereum.request({ method: 'eth_chainId' });
            const chainId = parseInt(network, 16);
            setState(prev => ({ ...prev, address: accounts[0], isConnected: true, chainId }));
            updateBalance(accounts[0]);
          }
        } catch (e) {
          console.error("Initial check failed", e);
        }
      }
    };
    checkConnection();
  }, [updateBalance]);

  useEffect(() => {
    if ((window as any).ethereum) {
      const handleAccounts = (accounts: string[]) => {
        if (accounts.length > 0) {
          setState(prev => ({ ...prev, address: accounts[0], isConnected: true }));
          updateBalance(accounts[0]);
        } else {
          disconnect();
        }
      };

      const handleChain = (network: string) => {
        const chainId = parseInt(network, 16);
        setState(prev => ({ ...prev, chainId }));
      };

      (window as any).ethereum.on('accountsChanged', handleAccounts);
      (window as any).ethereum.on('chainChanged', handleChain);

      return () => {
        (window as any).ethereum.removeListener('accountsChanged', handleAccounts);
        (window as any).ethereum.removeListener('chainChanged', handleChain);
      };
    }
  }, [disconnect, updateBalance]);

  return { ...state, connect, disconnect, switchChain };
}