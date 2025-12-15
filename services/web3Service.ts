import { ethers } from 'ethers';

// Soneium Minato Testnet Config
export const SONEIUM_CHAIN_ID = 1946; // Hex: 0x79A
export const SONEIUM_RPC_URL = 'https://rpc.minato.soneium.org/';
export const MIN_USD_REQUIREMENT = 0.25;

declare global {
  interface Window {
    ethereum?: any;
  }
}

export interface Web3Response {
  success: boolean;
  address?: string;
  balance?: string;
  isEligible?: boolean;
  message?: string;
  balanceUsd?: number;
}

export const web3Service = {
  getEthPrice: async (): Promise<number> => {
    try {
      // Fetch current ETH price from CoinGecko
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      const data = await response.json();
      return data.ethereum.usd || 2500; // Fallback to 2500 if API fails
    } catch (e) {
      console.warn("Failed to fetch ETH price, using fallback.");
      return 2500; // Fallback price
    }
  },

  switchNetwork: async () => {
    if (!window.ethereum) return;
    const chainIdHex = '0x' + SONEIUM_CHAIN_ID.toString(16);

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask.
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: chainIdHex,
                chainName: 'Soneium Minato Testnet',
                rpcUrls: [SONEIUM_RPC_URL],
                nativeCurrency: {
                  name: 'Ethereum',
                  symbol: 'ETH', // Minato uses testnet ETH
                  decimals: 18,
                },
                blockExplorerUrls: ['https://explorer-testnet.soneium.org/'],
              },
            ],
          });
        } catch (addError) {
          throw new Error('Failed to add Soneium Minato network.');
        }
      } else {
        throw new Error('Failed to switch network.');
      }
    }
  },

  connectWallet: async (): Promise<Web3Response> => {
    if (!window.ethereum) {
      return { success: false, message: "Metamask not installed" };
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Request account access
      const accounts = await provider.send("eth_requestAccounts", []);
      if (!accounts || accounts.length === 0) {
        return { success: false, message: "No accounts found" };
      }

      // Ensure we are on Soneium
      await web3Service.switchNetwork();
      
      // Re-initialize provider after switch to ensure correct chain context
      const updatedProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await updatedProvider.getSigner();
      const address = await signer.getAddress();
      
      // Get Balance
      const balanceBigInt = await updatedProvider.getBalance(address);
      const balanceEth = ethers.formatEther(balanceBigInt);
      
      // Check USD Value
      const ethPrice = await web3Service.getEthPrice();
      const balanceUsd = parseFloat(balanceEth) * ethPrice;
      const isEligible = balanceUsd >= MIN_USD_REQUIREMENT;

      // STRICT CHECK
      if (!isEligible) {
          console.warn(`Insufficient funds: ${balanceUsd} USD < ${MIN_USD_REQUIREMENT} USD`);
      }

      return {
        success: true,
        address,
        balance: balanceEth,
        balanceUsd,
        isEligible
      };

    } catch (error: any) {
      console.error(error);
      return { success: false, message: error.message || "Connection failed", isEligible: false };
    }
  }
};