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
    // Fix: Access ethereum via window as any to resolve "Property 'ethereum' does not exist on type 'Window'" errors.
    if (!(window as any).ethereum) return;
    try {
      const provider = new (window as any).ethers.BrowserProvider((window as any).ethereum);
      const balance = await provider.getBalance(address);
      setState(prev => ({ ...prev, balance: (window as any).ethers.formatEther(balance) }));
    } catch (err) {
      console.error("Failed to fetch balance:", err);
    }
  }, []);

  const connect = useCallback(async () => {
    // Fix: Access ethereum via window as any to resolve property access errors.
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

      updateBalance(address);
    } catch (err: any) {
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
    // Fix: Access ethereum via window as any to resolve property access errors.
    if (!(window as any).ethereum) return;
    try {
      await (window as any).ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${SOMNIA_CHAIN_ID.toString(16)}` }],
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask.
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

  useEffect(() => {
    // Fix: Access ethereum via window as any to resolve property access errors.
    if ((window as any).ethereum) {
      (window as any).ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setState(prev => ({ ...prev, address: accounts[0], isConnected: true }));
          updateBalance(accounts[0]);
        } else {
          disconnect();
        }
      });

      (window as any).ethereum.on('chainChanged', (network: string) => {
        const chainId = parseInt(network, 16);
        setState(prev => ({ ...prev, chainId }));
      });
    }
  }, [disconnect, updateBalance]);

  return { ...state, connect, disconnect, switchChain };
}
