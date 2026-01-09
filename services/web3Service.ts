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
    // Farcaster SDK path
    const frameProvider = (sdk as any)?.wallet?.ethProvider;
    if (frameProvider) return frameProvider;

    // Standard Metamask/In-app browser path
    if (window.ethereum) return window.ethereum;
  } catch (e) {
    console.warn("Error detecting provider source:", e);
  }
  
  return null;
};

export const web3Service = {
  /**
   * Fetches STNET price (using ETH as a proxy).
   * Defensive against malformed API responses.
   */
  getEthPrice: async (): Promise<number> => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      if (!response.ok) return 2500;
      const data = await response.json();
      // Added optional chaining to prevent "cannot read property 'usd' of undefined"
      return data?.ethereum?.usd || 2500; 
    } catch (e) {
      console.warn("Failed to fetch price, using fallback ($2500).");
      return 2500; 
    }
  },

  /**
   * Switches the user's wallet to Somnia Testnet or adds it if missing.
   */
  switchNetwork: async () => {
    const ethereum = getProviderSource();
    if (!ethereum) throw new Error('No ethereum provider found');

    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SOMNIA_CHAIN_ID_HEX }],
      });
    } catch (switchError: any) {
      // Robustly check for error code or message even if switchError is not a standard object
      const errorCode = switchError?.code;
      const errorMsg = switchError?.message?.toLowerCase() || '';
      
      // Error code 4902 means the chain has not been added to the wallet
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
          throw new Error(addError?.message || 'Failed to add Somnia Testnet to your wallet.');
        }
      } else {
        throw new Error(switchError?.message || 'Please switch your wallet to the Somnia Testnet.');
      }
    }
  },

  /**
   * Main connection logic.
   * Handles account requests, network switching, and balance checking.
   */
  connectWallet: async (): Promise<Web3Response> => {
    const ethereum = getProviderSource();
    if (!ethereum) {
      return { success: false, message: "Wallet provider not detected. Please open in a Web3 browser or Farcaster client." };
    }
    
    // Check if ethers library loaded correctly from index.html script tag
    const ethers = window.ethers;
    if (!ethers) {
        return { success: false, message: "The blockchain library (Ethers) failed to load. Please refresh the page." };
    }

    try {
      // 1. Request accounts using the low-level provider
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        return { success: false, message: "No wallet accounts found." };
      }

      // 2. Ensure we are on the correct network
      await web3Service.switchNetwork();
      
      // 3. Initialize Ethers provider
      // Re-request source to ensure we have current state
      const currentEthereum = getProviderSource();
      const provider = new ethers.BrowserProvider(currentEthereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      // 4. Fetch Balance
      const balanceBigInt = await provider.getBalance(address);
      const balanceEth = ethers.formatEther(balanceBigInt);
      
      // 5. Calculate eligibility based on $0.25 requirement
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
      console.error("Wallet connection error details:", error);
      
      // Defensive property access for errors
      const errorCode = error?.code;
      const errorMessage = error?.message || "Failed to connect wallet.";
      
      if (errorCode === 4001) {
        return { success: false, message: "Connection request was rejected in your wallet." };
      }
      
      return { 
        success: false, 
        message: errorMessage, 
        isEligible: false 
      };
    }
  }
};