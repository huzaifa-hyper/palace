import sdk from '@farcaster/frame-sdk';

/**
 * Somnia Testnet Configuration
 */
export const SOMNIA_CHAIN_ID = 50370; 
export const SOMNIA_CHAIN_ID_HEX = '0xc4c2'; 
export const SOMNIA_RPC_URL = 'https://rpc.testnet.somnia.network';
export const SOMNIA_EXPLORER_URL = 'https://explorer.testnet.somnia.network';
export const MIN_USD_REQUIREMENT = 0.25;

declare global {
  interface Window {
    ethereum?: any;
    ethers?: any;
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

/**
 * Utility to get the most reliable provider available.
 */
const getProviderSource = () => {
  if (typeof window === 'undefined') return null;
  
  try {
    // 1. Farcaster Frame context
    const frameProvider = (sdk as any)?.wallet?.ethProvider;
    if (frameProvider && typeof frameProvider.request === 'function') {
      return frameProvider;
    }

    // 2. Standard Injected Provider
    if (window.ethereum && typeof window.ethereum.request === 'function') {
      return window.ethereum;
    }
    
    // 3. Fallback
    const anyEth = (window as any).ethereum;
    if (anyEth && typeof anyEth.request === 'function') {
      return anyEth;
    }
  } catch (e) {
    console.warn("Provider detection failed:", e);
  }
  
  return null;
};

/**
 * Safely extracts error code from various wallet error formats.
 */
const getErrorCode = (error: any): number | null => {
  if (!error || typeof error !== 'object') return null;
  
  // Try standard code
  if (typeof error.code === 'number') return error.code;
  
  // Try nested data code (MetaMask style)
  if (error.data && typeof error.data === 'object' && typeof error.data.code === 'number') return error.data.code;
  
  // Try nested error code
  if (error.error && typeof error.error === 'object' && typeof error.error.code === 'number') return error.error.code;

  // Try Ethers v6 style info
  if (error.info && error.info.error && typeof error.info.error.code === 'number') return error.info.error.code;

  return null;
};

/**
 * Safely extracts error message.
 */
const getErrorMessage = (error: any): string => {
  if (!error) return "Unknown error";
  if (typeof error === 'string') return error;
  if (error.message && typeof error.message === 'string') return error.message;
  return "An unexpected error occurred during the wallet operation.";
};

export const web3Service = {
  getEthPrice: async (): Promise<number> => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      if (!response.ok) return 2500;
      const data = await response.json();
      return data?.ethereum?.usd || 2500; 
    } catch (e) {
      return 2500; 
    }
  },

  switchNetwork: async (ethereum: any) => {
    if (!ethereum || typeof ethereum.request !== 'function') {
      throw new Error('No active wallet provider found.');
    }

    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SOMNIA_CHAIN_ID_HEX }],
      });
    } catch (switchError: any) {
      const errorCode = getErrorCode(switchError);
      const errorMsg = getErrorMessage(switchError).toLowerCase();
      
      // If network is missing, attempt to add it (4902 is "missing chain")
      if (errorCode === 4902 || errorMsg.includes('unrecognized') || errorMsg.includes('not found')) {
        try {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: SOMNIA_CHAIN_ID_HEX,
                chainName: 'Somnia Testnet',
                rpcUrls: [SOMNIA_RPC_URL],
                nativeCurrency: {
                  name: 'Somnia Token',
                  symbol: 'STNET', 
                  decimals: 18,
                },
                blockExplorerUrls: [SOMNIA_EXPLORER_URL],
              },
            ],
          });
        } catch (addError: any) {
          throw new Error(getErrorMessage(addError) || 'Failed to add Somnia Testnet.');
        }
      } else if (errorCode === 4001) {
        throw new Error('Connection to Somnia was rejected by the user.');
      } else {
        throw new Error(getErrorMessage(switchError) || 'Could not switch to Somnia Testnet.');
      }
    }
  },

  connectWallet: async (): Promise<Web3Response> => {
    try {
      const ethereum = getProviderSource();
      if (!ethereum) {
        return { success: false, message: "No Web3 wallet detected. Please open in Farcaster or a Web3 browser." };
      }
      
      const ethers = (window as any).ethers;
      if (!ethers || typeof ethers.BrowserProvider !== 'function') {
          return { success: false, message: "Web3 engine (Ethers) is not loaded. Please refresh the page." };
      }

      // 1. Request access
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
        return { success: false, message: "No wallet accounts found." };
      }

      // 2. Ensure Somnia Testnet is selected
      await web3Service.switchNetwork(ethereum);
      
      // 3. Initialize Ethers provider
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      // 4. Verification on Somnia Testnet
      const balanceBigInt = await provider.getBalance(address);
      const balanceEth = ethers.formatEther(balanceBigInt);
      
      const ethPrice = await web3Service.getEthPrice();
      const balanceUsd = (parseFloat(balanceEth) || 0) * ethPrice;
      const isEligible = balanceUsd >= MIN_USD_REQUIREMENT;

      return {
        success: true,
        address,
        balance: balanceEth,
        balanceUsd,
        isEligible
      };

    } catch (error: any) {
      console.error("Somnia Wallet Connection Error:", error);
      return { 
        success: false, 
        message: getErrorMessage(error), 
        isEligible: false 
      };
    }
  }
};