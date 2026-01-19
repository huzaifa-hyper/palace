"use client";

import { useEffect, useState } from "react";
import { useWallet } from "./useWallet";

// Requirement updated to 1.0 STT as per user request
export const MIN_STT_REQUIRED = 1.0;

export function useMinimumBalance() {
  const { address, balance, isConnected } = useWallet();
  const [isEligible, setIsEligible] = useState<boolean>(false);

  useEffect(() => {
    // If not connected or no address, explicitly not eligible
    if (!isConnected || !address) {
      setIsEligible(false);
      return;
    }

    const displayVal = parseFloat(balance);
    // Strict check: must be greater than or equal to 1.0 STT
    // Use a small epsilon or just direct comparison since ethers returns strings
    const eligible = !isNaN(displayVal) && displayVal >= MIN_STT_REQUIRED;
    setIsEligible(eligible);
  }, [address, balance, isConnected]);

  return {
    isEligible,
    balance,
    symbol: "STT",
    isLoading: false,
  };
}