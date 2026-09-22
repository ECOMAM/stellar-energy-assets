// Fallback is the pre-XLM-payments (v2) contract ID, deployed with the old
// `initialize` entrypoint. It MUST be replaced with the new contract ID once
// the rewritten contract (constructor-based, real XLM payments) is redeployed.
export const CONTRACT_ID =
  process.env.NEXT_PUBLIC_CONTRACT_ID ||
  "CB7V3676CQBO5OL6DEXI5FORLG37IR2GR7LXCZD7DUZTMSUT7BEEINR3";
