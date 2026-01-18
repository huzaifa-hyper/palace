"use client";

import { useEffect, useState } from "react";
import { useWallet } from "./useWallet";

export const MIN_STT_REQUIRED = 0.25;

export function useMinimumBalance() {
  const { address, balance, isConnected } = useWallet();
  const [isEligible, setIsEligible] = useState<boolean>(false);

  useEffect(() => {
    if (!isConnected || !address) {
      setIsEligible(false);
      return;
    }

    const displayVal = parseFloat(balance);
    setIsEligible(displayVal >= MIN_STT_REQUIRED);
  }, [address, balance, isConnected]);

  return {
    isEligible,
    balance,
    symbol: "STT",
    isLoading: false,
  };
}
