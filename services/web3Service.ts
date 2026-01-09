
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
    if (!window.ethereum) return;

    try {
      // Fix: Corrected undefined variable SOMNIA_ID_HEX to SOMNIA_CHAIN_ID_HEX
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SOMNIA_CHAIN_ID_HEX }],
      });
    } catch (switchError: any) {
      // Error code 4902 means the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
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
          throw new Error('Failed to add Somnia Testnet.');
        }
      } else {
        // Some wallets use different error codes or don't provide them reliably
        try {
          await window.ethereum.request({
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
        } catch (e) {
          throw new Error('Failed to switch to Somnia Testnet.');
        }
      }
    }
  },

  // Main connection logic
  connectWallet: async (): Promise<Web3Response> => {
    if (!window.ethereum) {
      return { success: false, message: "Metamask not installed" };
    }
    
    const ethers = window.ethers;
    if (!ethers) {
        return { success: false, message: "Ethers.js library failed to load. Please refresh." };
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      const accounts = await provider.send("eth_requestAccounts", []);
      if (!accounts || accounts.length === 0) {
        return { success: false, message: "No accounts found" };
      }

      await web3Service.switchNetwork();
      
      const updatedProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await updatedProvider.getSigner();
      const address = await signer.getAddress();
      
      const balanceBigInt = await updatedProvider.getBalance(address);
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
      return { 
        success: false, 
        message: error.message || "Connection failed", 
        isEligible: false 
      };
    }
  }
};
