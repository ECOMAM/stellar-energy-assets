// NIKO SUN contract v2 on Stellar testnet (constructor-based deployment, no
// `initialize`). See docs/ciclo-onchain-testnet.md for the on-chain cycle.
export const CONTRACT_ID =
  process.env.NEXT_PUBLIC_CONTRACT_ID ||
  "CADAAIOMITOWW6MI5YF4UNE6T5GQWY7OF6SHRJNQS4ZGGQ4UDEQXCMNM";

/**
 * Ledger of the v2 deploy tx (55db825b…, 2026-09-24). Lower bound for event
 * scans; ignored when NEXT_PUBLIC_CONTRACT_ID points at another contract.
 */
export const CONTRACT_DEPLOY_LEDGER: number | null =
  CONTRACT_ID === "CADAAIOMITOWW6MI5YF4UNE6T5GQWY7OF6SHRJNQS4ZGGQ4UDEQXCMNM" ? 4852336 : null;

/** Native XLM Stellar Asset Contract (payment token of the v2 contract). */
export const NATIVE_XLM_SAC =
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

export const RPC_URL =
  process.env.NEXT_PUBLIC_STELLAR_RPC_URL ||
  "https://soroban-testnet.stellar.org";
export const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ||
  "Test SDF Network ; September 2015";
export const HORIZON_URL =
  process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL ||
  "https://horizon-testnet.stellar.org";

export const EXPLORER_URL = `https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`;
export const LEDGER_EXPLORER_URL = `https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`;
export const HOLDER_EXPLORER_URL = EXPLORER_URL;
export const TX_EXPLORER = (hash: string) =>
  `https://stellar.expert/explorer/testnet/tx/${hash}`;
export const HOLDER_EXPLORER = (address: string) =>
  `https://stellar.expert/explorer/testnet/account/${address}`;

/** Evidence of the full on-chain cycle run against this contract. */
export const ONCHAIN_CYCLE_DOC_URL =
  "https://github.com/ECOMAM/stellar-energy-assets/blob/integracion/niko-sun/docs/ciclo-onchain-testnet.md";

/**
 * Accounts approved as participants (simulated KYC) in the demo cycle.
 * Used as seeds by the holder indexer when RPC events are unavailable.
 */
export const DEMO_PARTICIPANTS = [
  "GBTNEHEDUS7X7MEU2RNAXLH5B52TPW44YZDQNFQMU2JPBMCXAXZ4LOUD",
  "GAP552XX3ZGQ7EXSICT7PHVXTK43ZPNVJ6LJZ7HFSZYGNEHEUBM3ST46",
] as const;
