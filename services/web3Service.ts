/**
 * Somnia Testnet Configuration
 */
export const SOMNIA_CHAIN_ID = 50312; 
export const SOMNIA_RPC_URL = 'https://dream-rpc.somnia.network';
export const SOMNIA_EXPLORER_URL = 'https://somnia-testnet.socialscan.io';
export const MIN_STT_REQUIRED = 1.0;

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
  
  shortenAddress: (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
};