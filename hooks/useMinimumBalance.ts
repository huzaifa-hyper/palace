"use client";

import { useAddress, useBalance } from "@thirdweb-dev/react";
import { useEffect, useState } from "react";

export const MIN_STT_REQUIRED = 1.0;

export function useMinimumBalance() {
  const address = useAddress();
  const { data: balanceData, isLoading, error } = useBalance();
  const [isEligible, setIsEligible] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(true);

  useEffect(() => {
    if (!address) {
      setIsEligible(false);
      setChecking(false);
      return;
    }

    if (!isLoading && balanceData) {
      // Thirdweb's displayValue is already pre-formatted with decimals
      const displayVal = parseFloat(balanceData.displayValue);
      setIsEligible(displayVal >= MIN_STT_REQUIRED);
      setChecking(false);
    } else if (!isLoading && !balanceData) {
      setIsEligible(false);
      setChecking(false);
    }
  }, [address, balanceData, isLoading]);

  return {
    isEligible,
    balance: balanceData?.displayValue || "0",
    symbol: balanceData?.symbol || "STT",
    isLoading: isLoading || checking,
    error
  };
}
