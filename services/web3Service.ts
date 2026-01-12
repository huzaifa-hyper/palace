import sdk from '@farcaster/frame-sdk';

/**
 * Somnia Testnet Configuration
 * Fully migrated from Soneium Minato.
 */
export const SOMNIA_CHAIN_ID = 50370; 
export const SOMNIA_CHAIN_ID_HEX = '0xc4c2'; 
export const SOMNIA_RPC_URL = 'https://rpc.testnet.somnia.network';
export const SOMNIA_EXPLORER_URL = 'https://explorer.testnet.somnia.network';
export const MIN_USD_REQUIREMENT = 0.25;

// Placeholder for future Somnia-specific smart contracts
export const SOMNIA_POOL_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000'; 

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
 * Prioritizes Farcaster SDK, then window.ethereum.
 */
const getProviderSource = () => {
  if (typeof window === 'undefined') return null;
  
  try {
    // 1. Farcaster Frame context
    const frameProvider = (sdk as any)?.wallet?.ethProvider;
    if (frameProvider && typeof frameProvider.request === 'function') {
      return frameProvider;
    }

    // 2. Standard Injected Provider (MetaMask / Brave / etc.)
    if (window.ethereum && typeof window.ethereum.request === 'function') {
      return window.ethereum;
    }
    
    // 3. Fallback for diverse browser injections
    const anyEth = (window as any).ethereum;
    if (anyEth && typeof anyEth.request === 'function') {
      return anyEth;
    }
  } catch (e) {
    console.warn("Provider detection failed:", e);
  }
  
  return null;
};

export const web3Service = {
  /**
   * Fetches STNET price proxy.
   */
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

  /**
   * Switches to Somnia Testnet with exhaustive safety checks to prevent 'undefined' crashes.
   */
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
      // Robustly extract error code using optional chaining to prevent "reading properties of undefined"
      const errorCode = switchError?.code || switchError?.data?.code || switchError?.error?.code;
      const errorMsg = (switchError?.message || "").toLowerCase();
      
      // If network is missing, attempt to add it
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
          throw new Error(addError?.message || 'Failed to add the Somnia Testnet to your wallet.');
        }
      } else if (errorCode === 4001) {
        throw new Error('Connection to Somnia was rejected.');
      } else {
        throw new Error(switchError?.message || 'Could not switch to Somnia Testnet.');
      }
    }
  },

  /**
   * Main connection entry point for Somnia.
   */
  connectWallet: async (): Promise<Web3Response> => {
    try {
      const ethereum = getProviderSource();
      if (!ethereum) {
        return { success: false, message: "No Web3 wallet detected. Please open in Farcaster or a Web3-enabled browser." };
      }
      
      const ethers = window.ethers;
      if (!ethers || typeof ethers.BrowserProvider !== 'function') {
          return { success: false, message: "Web3 engine (Ethers) failed to initialize. Please refresh." };
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
      
      // Prevent "Cannot read properties of undefined" inside the catch block itself
      const msg = error?.message || (typeof error === 'string' ? error : "An unexpected connection error occurred.");
      
      return { 
        success: false, 
        message: msg, 
        isEligible: false 
      };
    }
  }
};