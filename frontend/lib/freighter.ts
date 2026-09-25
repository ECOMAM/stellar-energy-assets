/**
 * Freighter wrappers for @stellar/freighter-api 6. Version 6 never throws on
 * a user decision: each call resolves to an object whose `error` field
 * reports it (signTransaction resolves to { signedTxXdr: "", error } when the
 * user rejects), and isConnected() resolves to { isConnected }, an object that
 * is always truthy. Only isConnected and getAddress have a built-in timeout,
 * so every call here is bounded by WALLET_TIMEOUT_MS: an extension that never
 * answers must not leave the UI waiting forever.
 */

import {
  getAddress,
  getNetworkDetails,
  isConnected,
  requestAccess,
  signTransaction,
  WatchWalletChanges,
} from "@stellar/freighter-api";
import { TxError } from "./contractErrors";

export const WALLET_TIMEOUT_MS = 20_000;

export const FREIGHTER_NOT_INSTALLED_MESSAGE = "Freighter no está instalado. Instálalo desde https://freighter.app";

/** Reject with `onTimeout()` when `promise` has not settled after `ms`. */
export function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => Error): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(onTimeout()), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

const seconds = (ms: number) => Math.round(ms / 1000);

function connectTimeout(ms: number): TxError {
  return new TxError(
    "wallet_timeout",
    `Freighter no respondió en ${seconds(ms)} s. Abre la extensión, desbloquéala y vuelve a intentarlo.`
  );
}

function signTimeout(ms: number): TxError {
  return new TxError(
    "wallet_timeout",
    `Freighter no respondió en ${seconds(ms)} s. Abre la extensión, desbloquéala y vuelve a intentarlo. No se envió ninguna transacción.`
  );
}

function wrongNetwork(network?: string): TxError {
  return new TxError(
    "wrong_network",
    `Freighter está conectado a otra red${network ? ` (${network})` : ""}. Esta demo funciona solo en Stellar testnet: cambia la red de Freighter a Testnet y vuelve a intentarlo. No se envió ninguna transacción.`
  );
}

function signerMismatch(signerAddress: string): TxError {
  return new TxError(
    "signer_mismatch",
    `Freighter firmó con otra cuenta (${signerAddress}). Vuelve a conectar la cuenta correcta.`
  );
}

/** Ask Freighter for access (shows its prompt) and return the account. Throws on any failure. */
export async function connectFreighter(timeoutMs = WALLET_TIMEOUT_MS): Promise<string> {
  const status = await withTimeout(isConnected(), timeoutMs, () => connectTimeout(timeoutMs));
  if (!status.isConnected) throw new Error(FREIGHTER_NOT_INSTALLED_MESSAGE);
  const access = await withTimeout(requestAccess(), timeoutMs, () => connectTimeout(timeoutMs));
  if (access.error) throw new Error(`Freighter no autorizó la conexión: ${access.error.message}`);
  if (!access.address) throw new Error("Freighter no devolvió ninguna cuenta.");
  return access.address;
}

/** Account Freighter already shares with this site, or null. Never prompts. */
export async function restoreFreighterAddress(timeoutMs = WALLET_TIMEOUT_MS): Promise<string | null> {
  const status = await withTimeout(isConnected(), timeoutMs, () => connectTimeout(timeoutMs));
  if (!status.isConnected) return null;
  const access = await withTimeout(getAddress(), timeoutMs, () => connectTimeout(timeoutMs));
  return !access.error && access.address ? access.address : null;
}

/** Fail fast when Freighter is on another network: it would sign for the wrong one. */
export async function assertFreighterNetwork(passphrase: string, timeoutMs = WALLET_TIMEOUT_MS): Promise<void> {
  const net = await withTimeout(getNetworkDetails(), timeoutMs, () => signTimeout(timeoutMs));
  if (!net.error && net.networkPassphrase && net.networkPassphrase !== passphrase) {
    throw wrongNetwork(net.network);
  }
}

/** Sign `xdr` in Freighter. A rejection, an error or an empty XDR throws a TxError. */
export async function signWithFreighter(
  xdr: string,
  opts: { networkPassphrase: string; address: string; timeoutMs?: number }
): Promise<string> {
  const timeoutMs = opts.timeoutMs ?? WALLET_TIMEOUT_MS;
  const res = await withTimeout(
    signTransaction(xdr, { networkPassphrase: opts.networkPassphrase, address: opts.address }),
    timeoutMs,
    () => signTimeout(timeoutMs)
  );
  if (res.error || !res.signedTxXdr) {
    const detail = res.error?.message || "no signed transaction returned";
    if (/network|passphrase/i.test(detail)) throw wrongNetwork();
    throw new TxError("rejected", `Freighter rejected the signature request: ${detail}`);
  }
  // freighter-api 6.0.1 always includes `signerAddress` on a successful sign
  // (node_modules/@stellar/freighter-api/src/signTransaction.ts returns
  // `{ signedTxXdr: req.signedTransaction, signerAddress: req.signerAddress }`
  // with no error). If it is present and does not match the account we asked
  // Freighter to sign for, the extension must have switched accounts mid-flow:
  // stop here and throw, so the mismatched signature is never returned to the
  // caller and nothing can be submitted with it. If it is missing (undefined
  // or ""), that is only possible with a freighter-api build that does not
  // return the field at all — since there is no `error` either, we cannot
  // tell whether the signer matched, so we conservatively allow the
  // signature through rather than break signing on a version this app
  // doesn't control.
  if (res.signerAddress && res.signerAddress !== opts.address) {
    throw signerMismatch(res.signerAddress);
  }
  return res.signedTxXdr;
}

export type FreighterWalletChange = {
  address: string;
  network: string;
  networkPassphrase: string;
};

/** Default poll interval for watchFreighterChanges (matches Freighter's own default). */
export const WATCH_INTERVAL_MS = 3_000;

/**
 * Watch Freighter for account/network changes using freighter-api 6's
 * WatchWalletChanges, present in the installed 6.0.1 (see
 * node_modules/@stellar/freighter-api/src/watchWalletChanges.ts): internally
 * it polls getAddress/getNetworkDetails every `intervalMs` and calls back
 * only when something differs from what it last reported — including once
 * immediately on the first tick, to hand the caller the state at the moment
 * watching started (callers should treat that first call as a sync, not as
 * "the user switched"). A tick that failed (e.g. the extension is locked)
 * reports "" for address/network/passphrase, so it is routed to `onError`
 * instead of `cb` to avoid callers mistaking it for "switched to no account".
 *
 * Returns a stop function; callers must call it on disconnect/unmount so no
 * watcher (and its recurring setTimeout chain) is left running.
 */
export function watchFreighterChanges(
  cb: (change: FreighterWalletChange) => void,
  opts: { intervalMs?: number; onError?: (message: string) => void } = {}
): () => void {
  const watcher = new WatchWalletChanges(opts.intervalMs ?? WATCH_INTERVAL_MS);
  watcher.watch((params) => {
    if (params.error) {
      opts.onError?.(params.error.message);
      return;
    }
    cb({ address: params.address, network: params.network, networkPassphrase: params.networkPassphrase });
  });
  return () => watcher.stop();
}
