import sdk from '@farcaster/frame-sdk';

// Somnia Testnet Config
export const SOMNIA_CHAIN_ID = 50370; // Decimal
export const SOMNIA_CHAIN_ID_HEX = '0xc4c2'; // Hex representation of 50370
export const SOMNIA_RPC_URL = 'https://rpc.testnet.somnia.network';
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
 * Utility to get the best available provider.
 * Prioritizes Farcaster SDK provider then falls back to window.ethereum.
 */
const getProviderSource = () => {
  if (typeof window === 'undefined') return null;
  
  try {
    // 1. Check Farcaster Frame environment
    const frameProvider = (sdk as any)?.wallet?.ethProvider;
    if (frameProvider) return frameProvider;

    // 2. Check injected window.ethereum (MetaMask, etc.)
    if (window.ethereum) return window.ethereum;
    
    // 3. Last ditch: check for any provider on window
    if ((window as any).ethereum) return (window as any).ethereum;
  } catch (e) {
    console.warn("Error detecting provider source:", e);
  }
  
  return null;
};

export const web3Service = {
  /**
   * Fetches STNET price (using ETH as a proxy).
   */
  getEthPrice: async (): Promise<number> => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      if (!response.ok) return 2500;
      const data = await response.json();
      if (!data || !data.ethereum) return 2500;
      return data.ethereum.usd || 2500; 
    } catch (e) {
      console.warn("Failed to fetch price, using fallback ($2500).");
      return 2500; 
    }
  },

  /**
   * Switches the user's wallet to Somnia Testnet.
   * Uses extremely defensive error parsing.
   */
  switchNetwork: async (ethereum: any) => {
    if (!ethereum || typeof ethereum.request !== 'function') {
      throw new Error('Valid wallet provider not found');
    }

    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SOMNIA_CHAIN_ID_HEX }],
      });
    } catch (switchError: any) {
      // Extremely defensive check for error codes
      const errorCode = switchError ? (switchError.code || (switchError.data && switchError.data.code)) : null;
      const errorMsg = switchError && switchError.message ? switchError.message.toLowerCase() : '';
      
      // Error code 4902 or 'unrecognized' indicates chain needs adding
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
                blockExplorerUrls: ['https://explorer.testnet.somnia.network'],
              },
            ],
          });
        } catch (addError: any) {
          const addMsg = addError && addError.message ? addError.message : 'Failed to add Somnia Testnet.';
          throw new Error(addMsg);
        }
      } else if (errorCode === 4001) {
        throw new Error('Network switch was rejected.');
      } else {
        const finalMsg = switchError && switchError.message ? switchError.message : 'Failed to switch to Somnia Testnet.';
        throw new Error(finalMsg);
      }
    }
  },

  /**
   * Main connection logic.
   */
  connectWallet: async (): Promise<Web3Response> => {
    const ethereum = getProviderSource();
    
    if (!ethereum) {
      return { success: false, message: "No Web3 wallet detected. Please open in a crypto browser or Farcaster." };
    }
    
    const ethers = window.ethers;
    if (!ethers) {
        return { success: false, message: "Blockchain library (Ethers) failed to load. Please refresh." };
    }

    try {
      // 1. Request accounts
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
        return { success: false, message: "No wallet accounts were returned." };
      }

      // 2. Network verification
      await web3Service.switchNetwork(ethereum);
      
      // 3. Finalize connection with Ethers
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      // 4. State checks
      const balanceBigInt = await provider.getBalance(address);
      const balanceEth = ethers.formatEther(balanceBigInt);
      
      const ethPrice = await web3Service.getEthPrice();
      const balanceUsd = Math.max(0, parseFloat(balanceEth) * ethPrice) || 0;
      const isEligible = balanceUsd >= MIN_USD_REQUIREMENT;

      return {
        success: true,
        address,
        balance: balanceEth,
        balanceUsd,
        isEligible
      };

    } catch (error: any) {
      console.error("ConnectWallet Error:", error);
      
      // Check for common rejection codes
      if (error && (error.code === 4001 || (error.message && error.message.includes('rejected')))) {
        return { success: false, message: "Request was rejected in your wallet." };
      }
      
      // Safely extract message
      let message = "An unknown connection error occurred.";
      if (typeof error === 'string') message = error;
      else if (error && error.message) message = error.message;
      else if (error && typeof error === 'object') message = JSON.stringify(error);

      return { 
        success: false, 
        message: message, 
        isEligible: false 
      };
    }
  }
};