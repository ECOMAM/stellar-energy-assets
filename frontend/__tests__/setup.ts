import "@testing-library/jest-dom";

// Mock window.freighter for wallet tests. Suites that serialize XDR run in the
// node environment (`@vitest-environment node`): under jsdom, TextEncoder
// returns a Uint8Array of another realm and SDK 17 rejects it, so there is
// no `window` there.
if (typeof window !== "undefined") {
  Object.defineProperty(window, "freighter", {
    value: {
      isConnected: () => Promise.resolve(true),
      requestAccess: () =>
        Promise.resolve({ address: "GABGH363YQNYYAUN2M6YAPYFLPDMU5GZIJDWOEC2G3AUEH3TLPSXN3TX" }),
      getAddress: () =>
        Promise.resolve({ address: "GABGH363YQNYYAUN2M6YAPYFLPDMU5GZIJDWOEC2G3AUEH3TLPSXN3TX" }),
      signTransaction: (xdr: string) =>
        Promise.resolve({ signedTxXdr: xdr, signerAddress: "GABGH363YQNYYAUN2M6YAPYFLPDMU5GZIJDWOEC2G3AUEH3TLPSXN3TX" }),
    },
    writable: true,
  });
}

// Mock fetch for Horizon API
const originalFetch = global.fetch;
global.fetch = async (url: string | URL | Request, init?: RequestInit) => {
  const urlStr = typeof url === "string" ? url : url.toString();
  if (urlStr.includes("/accounts/")) {
    return new Response(
      JSON.stringify({
        balances: [
          { asset_type: "native", balance: "10000.0000000" },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
  return originalFetch(url, init);
};
