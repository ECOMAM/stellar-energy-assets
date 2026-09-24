// Fallback is the v2 contract deployed with initialize. Replace when redeploying the constructor-based contract of feat/xlm-payments.
export const CONTRACT_ID =
  process.env.NEXT_PUBLIC_CONTRACT_ID ||
  "CB7V3676CQBO5OL6DEXI5FORLG37IR2GR7LXCZD7DUZTMSUT7BEEINR3";
export const EXPLORER_URL = `https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`;
export const TX_EXPLORER = (hash: string) =>
  `https://stellar.expert/explorer/testnet/tx/${hash}`;
