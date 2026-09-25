/**
 * Contract error codes (contracts/niko_project/src/lib.rs, `enum Error`) mapped
 * to Spanish messages, the parser for "Error(Contract, #N)" strings that
 * simulations and failed transactions surface, and TxError, the failure type
 * of signed contract calls (lib/transactions.ts).
 *
 * Since v2.1 a payer who cannot cover a payment always gets #11
 * (InsufficientBalance): the contract maps the XLM SAC's BalanceError (#10)
 * to it, so #10 only ever means InsufficientSupply.
 */

export const PARTICIPANT_NOT_APPROVED_MESSAGE =
  "Tu cuenta aún no está aprobada como participante (KYC simulado para esta demo). Pide al administrador que la apruebe.";

export const XLM_BALANCE_TOO_LOW_MESSAGE =
  "Tu saldo de XLM no alcanza para pagar esta operación más las comisiones de red. Recarga tu cuenta de testnet (Friendbot) e inténtalo de nuevo.";

export type ContractErrorInfo = { name: string; message: string };

export const CONTRACT_ERRORS: Readonly<Record<number, ContractErrorInfo>> = {
  1: { name: "NotAdmin", message: "Solo el administrador del contrato puede hacer esta operación." },
  2: { name: "NotCreator", message: "Solo el emisor que creó este proyecto puede hacer esta operación." },
  3: {
    name: "NotIssuer",
    message:
      "Tu cuenta no es un emisor verificado. El administrador debe verificarla (set_issuer) antes de que puedas crear proyectos.",
  },
  4: { name: "NotParticipant", message: PARTICIPANT_NOT_APPROVED_MESSAGE },
  5: {
    name: "Paused",
    message:
      "El contrato está en pausa: las compras y los depósitos de ingresos están bloqueados temporalmente. Los reclamos y retiros siguen disponibles.",
  },
  6: { name: "ProjectNotFound", message: "El proyecto no existe en el contrato." },
  7: { name: "ProjectInactive", message: "El proyecto está inactivo y no acepta esta operación." },
  8: {
    name: "InvalidAmount",
    message: "Monto inválido: debe ser mayor que cero y estar dentro del rango permitido.",
  },
  9: { name: "BelowMinimum", message: "La cantidad está por debajo de la compra mínima del proyecto." },
  10: {
    name: "InsufficientSupply",
    message: "No queda suficiente supply disponible en el proyecto para esa cantidad.",
  },
  11: {
    name: "InsufficientBalance",
    message:
      "Saldo insuficiente: el monto supera el XLM disponible en la cuenta o, en un retiro, el saldo de ventas del proyecto.",
  },
  12: {
    name: "NoTokensMinted",
    message: "Aún no hay participaciones emitidas en este proyecto: todavía no se pueden depositar ingresos.",
  },
  13: { name: "Overflow", message: "Desbordamiento aritmético: el monto es demasiado grande." },
  14: {
    name: "RewardTooSmall",
    message:
      "El depósito es demasiado pequeño para repartirse entre las participaciones emitidas. Deposita un monto mayor.",
  },
  15: { name: "InvalidName", message: "El nombre del proyecto no puede estar vacío ni superar los 64 bytes." },
};

export type TxErrorKind =
  | "rejected"
  | "wrong_network"
  | "wallet_timeout"
  | "try_again_later"
  | "send_error"
  | "failed"
  | "unknown_status"
  | "signer_mismatch";

/**
 * Failure of a signed contract call. The message is ready to show (Spanish;
 * the "rejected" one is matched by the rejection branch of describeTxError)
 * and `txHash` is set once the transaction was signed and handed to the RPC.
 */
export class TxError extends Error {
  constructor(
    readonly kind: TxErrorKind,
    message: string,
    readonly txHash?: string
  ) {
    super(message);
    this.name = "TxError";
  }
}

/** Hash of the transaction behind a failure, when it was sent. */
export function txHashOf(err: unknown): string | undefined {
  return err instanceof TxError ? err.txHash : undefined;
}

/** Extract N from "Error(Contract, #N)" in an error, message or object. */
export function parseContractErrorCode(err: unknown): number | null {
  const text = errorText(err);
  const m = /Error\(Contract,\s*#(\d+)\)/.exec(text);
  return m ? Number(m[1]) : null;
}

export function errorText(err: unknown): string {
  if (err == null) return "";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/** Spanish message for a contract error code. */
export function describeContractError(code: number): string {
  const info = CONTRACT_ERRORS[code];
  return info
    ? `${info.message} (código #${code} ${info.name})`
    : `El contrato rechazó la operación (código #${code}).`;
}

/**
 * Spanish message for any failure of a simulation or transaction: contract
 * codes first, then wallet and network cases, then the raw message.
 */
export function describeTxError(err: unknown): string {
  const text = errorText(err);
  const code = parseContractErrorCode(text);
  if (code !== null) return describeContractError(code);
  if (/reject|cancel|declin|denied|Request closed/i.test(text)) {
    return "Cancelaste la firma en Freighter. No se envió ninguna transacción.";
  }
  if (/underfunded|insufficient balance|txInsufficientBalance|tx_insufficient_balance|NOT_ENOUGH_BALANCE/i.test(text)) {
    return XLM_BALANCE_TOO_LOW_MESSAGE;
  }
  if (/Error\(Auth/i.test(text)) {
    return "La firma no autoriza esta operación: firma con la misma cuenta que aparece como remitente.";
  }
  // Wallet timeout, wrong network, TRY_AGAIN_LATER, ERROR, FAILED, unknown status:
  // the message already explains it and carries the hash.
  if (err instanceof TxError) return err.message;
  if (/not installed|is not defined|window\.freighter/i.test(text)) {
    return "No se detectó Freighter. Instala la extensión desde freighter.app y recarga la página.";
  }
  if (/Wallet not connected/i.test(text)) {
    return "Conecta tu wallet Freighter para continuar.";
  }
  if (/Failed to fetch|NetworkError|ECONNRESET|timeout|503|502/i.test(text)) {
    return "No se pudo contactar la RPC de Stellar testnet. Revisa tu conexión e inténtalo de nuevo.";
  }
  return text ? `La operación falló: ${text.slice(0, 280)}` : "La operación falló por un error desconocido.";
}
