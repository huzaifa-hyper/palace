// Soneium Minato Testnet Config
export const SONEIUM_CHAIN_ID = 1946; // Decimal
export const SONEIUM_CHAIN_ID_HEX = '0x79a'; // Hex representation of 1946
export const SONEIUM_RPC_URL = 'https://rpc.minato.soneium.org/';
export const MIN_USD_REQUIREMENT = 0.25;

declare global {
  interface Window {
    ethereum?: any;
    ethers?: any;
  }
}

// Access ethers from global window object injected by UMD script
const ethers = window.ethers;

export interface Web3Response {
  success: boolean;
  address?: string;
  balance?: string;
  isEligible?: boolean;
  message?: string;
  balanceUsd?: number;
}

export const web3Service = {
  // Helper to fetch ETH price with fallback
  getEthPrice: async (): Promise<number> => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      if (!response.ok) throw new Error('API limit');
      const data = await response.json();
      return data.ethereum.usd || 2500; 
    } catch (e) {
      console.warn("Failed to fetch ETH price, using fallback ($2500).");
      return 2500; 
    }
  },

  // Switch or Add Soneium Minato Network
  switchNetwork: async () => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SONEIUM_CHAIN_ID_HEX }],
      });
    } catch (switchError: any) {
      // Error code 4902 means the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: SONEIUM_CHAIN_ID_HEX,
                chainName: 'Soneium Minato Testnet',
                rpcUrls: [SONEIUM_RPC_URL],
                nativeCurrency: {
                  name: 'Ethereum',
                  symbol: 'ETH', 
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

  // Main connection logic
  connectWallet: async (): Promise<Web3Response> => {
    if (!window.ethereum) {
      return { success: false, message: "Metamask not installed" };
    }
    
    if (!ethers) {
        return { success: false, message: "Ethers.js library failed to load." };
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // 1. Request Account
      const accounts = await provider.send("eth_requestAccounts", []);
      if (!accounts || accounts.length === 0) {
        return { success: false, message: "No accounts found" };
      }

      // 2. Ensure Correct Network
      await web3Service.switchNetwork();
      
      // 3. Re-initialize provider/signer after switch to capture new context
      const updatedProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await updatedProvider.getSigner();
      const address = await signer.getAddress();
      
      // 4. Get Balance
      const balanceBigInt = await updatedProvider.getBalance(address);
      const balanceEth = ethers.formatEther(balanceBigInt);
      
      // 5. Calculate USD Value & Eligibility
      const ethPrice = await web3Service.getEthPrice();
      const balanceUsd = parseFloat(balanceEth) * ethPrice;
      const isEligible = balanceUsd >= MIN_USD_REQUIREMENT;

      if (!isEligible) {
          console.warn(`Insufficient funds: $${balanceUsd.toFixed(2)} < $${MIN_USD_REQUIREMENT}`);
      }

      return {
        success: true,
        address,
        balance: balanceEth,
        balanceUsd,
        isEligible
      };

    } catch (error: any) {
      console.error("Wallet connection error:", error);
      return { 
        success: false, 
        message: error.message || "Connection failed", 
        isEligible: false 
      };
    }
  }
};