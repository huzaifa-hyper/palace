
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

// Utility to get the best available provider
const getProviderSource = () => {
  // Try Farcaster SDK provider first for native frame experience
  if (typeof window !== 'undefined' && (sdk as any).wallet?.ethProvider) {
    return (sdk as any).wallet.ethProvider;
  }
  // Fallback to window.ethereum
  if (typeof window !== 'undefined' && window.ethereum) {
    return window.ethereum;
  }
  return null;
};

export const web3Service = {
  // Helper to fetch STNET price (using ETH price as a proxy for testnet value/parity logic)
  getEthPrice: async (): Promise<number> => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      if (!response.ok) return 2500;
      const data = await response.json();
      return data.ethereum.usd || 2500; 
    } catch (e) {
      console.warn("Failed to fetch price, using fallback ($2500).");
      return 2500; 
    }
  },

  // Switch or Add Somnia Testnet Network
  switchNetwork: async () => {
    const ethereum = getProviderSource();
    if (!ethereum) throw new Error('No ethereum provider found');

    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SOMNIA_CHAIN_ID_HEX }],
      });
    } catch (switchError: any) {
      // Error code 4902 means the chain has not been added to the wallet
      if (switchError.code === 4902 || switchError.message?.toLowerCase().includes('unrecognized')) {
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
        } catch (addError) {
          throw new Error('Failed to add Somnia Testnet to your wallet.');
        }
      } else {
        throw new Error('Please switch your wallet to the Somnia Testnet.');
      }
    }
  },

  // Main connection logic
  connectWallet: async (): Promise<Web3Response> => {
    const ethereum = getProviderSource();
    if (!ethereum) {
      return { success: false, message: "Wallet provider not detected. Please open in a Web3 browser or Farcaster client." };
    }
    
    const ethers = window.ethers;
    if (!ethers) {
        return { success: false, message: "Ethers.js library failed to load. Please refresh the page." };
    }

    try {
      // 1. Request accounts
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        return { success: false, message: "No wallet accounts found." };
      }

      // 2. Ensure we are on Somnia Testnet
      await web3Service.switchNetwork();
      
      // 3. Re-initialize provider after possible network switch
      const updatedEthereum = getProviderSource();
      const provider = new ethers.BrowserProvider(updatedEthereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      // 4. Check Balance & Eligibility
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
      console.error("Wallet connection error:", error);
      
      // Handle user rejection specifically
      if (error.code === 4001) {
        return { success: false, message: "Connection request rejected by user." };
      }
      
      return { 
        success: false, 
        message: error.message || "Failed to connect wallet.", 
        isEligible: false 
      };
    }
  }
};
