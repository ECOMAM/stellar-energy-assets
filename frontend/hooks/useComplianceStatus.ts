"use client";

import { useCallback, useEffect, useState } from "react";
import { readContractNative } from "@/lib/soroban";

export type ComplianceStatus = {
  /** is_participant(address): simulated-KYC allowlist; null = unknown / no wallet */
  isParticipant: boolean | null;
  /** is_issuer(address): may create projects; null = unknown / no wallet */
  isIssuer: boolean | null;
  /** is_paused(): purchases and revenue deposits blocked; null = unknown */
  paused: boolean | null;
  /** get_admin() */
  admin: string | null;
  loading: boolean;
  reload: () => Promise<void>;
};

/** Read-only compliance flags of the v2 contract for `address`. */
export function useComplianceStatus(address: string | null | undefined): ComplianceStatus {
  const [state, setState] = useState<Omit<ComplianceStatus, "reload">>({
    isParticipant: null,
    isIssuer: null,
    paused: null,
    admin: null,
    loading: true,
  });

  const reload = useCallback(async () => {
    const safe = async <T,>(p: Promise<T>): Promise<T | null> => {
      try {
        return await p;
      } catch (e) {
        console.warn("compliance read failed", e);
        return null;
      }
    };
    const [paused, admin, isParticipant, isIssuer] = await Promise.all([
      safe(readContractNative<boolean>("is_paused")),
      safe(readContractNative<string>("get_admin")),
      address ? safe(readContractNative<boolean>("is_participant", [address])) : Promise.resolve(null),
      address ? safe(readContractNative<boolean>("is_issuer", [address])) : Promise.resolve(null),
    ]);
    setState({
      paused: typeof paused === "boolean" ? paused : null,
      admin: typeof admin === "string" ? admin : null,
      isParticipant: typeof isParticipant === "boolean" ? isParticipant : null,
      isIssuer: typeof isIssuer === "boolean" ? isIssuer : null,
      loading: false,
    });
  }, [address]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { ...state, reload };
}

export default useComplianceStatus;
