/**
 * Off-chain presentation metadata, keyed by on-chain project id. The contract
 * stores the project name and numbers (supply, price, minted, energy); the
 * location, image, capacity and description below are demo data only.
 *
 * `fallback` is shown ONLY when the chain is unreachable and is always
 * labelled DEMO in the UI. Its values mirror the testnet configuration at the
 * time of writing (price in stroops, 1 XLM = 10^7 stroops).
 *
 * A project without a sheet here (any project created on-chain later) gets
 * the generic presentation of getProjectMeta: its on-chain name and numbers,
 * a neutral placeholder instead of a photo, and no invented location,
 * capacity or DEMO values.
 */

import { xlmToStroops } from "./units";

/** Descriptive sheet of a demo project. */
export type ProjectSheet = {
  location: string;
  flag: string;
  asset: string;
  capacity: string;
  capacityKwp: number;
  image: string;
  description: string;
  fallback: {
    name: string;
    totalSupply: bigint;
    minted: bigint;
    price: bigint;
  };
};

/** What the UI renders for a project id: its sheet, or the generic presentation. */
export type ProjectMeta = Omit<ProjectSheet, "image" | "fallback"> & {
  /** false: no sheet, generic presentation (location, flag and asset are empty) */
  hasSheet: boolean;
  /** null: no image, the UI draws a neutral placeholder */
  image: string | null;
  /** null: nothing to show if the chain is unreachable */
  fallback: ProjectSheet["fallback"] | null;
};

const IMG_ROOFTOP =
  "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&h=500&fit=crop";
const IMG_DESERT =
  "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=800&h=500&fit=crop";

export const PROJECT_META: Readonly<Record<number, ProjectSheet>> = {
  1: {
    location: "Arequipa, Perú",
    flag: "🇵🇪",
    asset: "SUN-AQP",
    capacity: "320 kWp",
    capacityKwp: 320,
    image: IMG_DESERT,
    description:
      "Proyecto de demostración (datos ficticios): parque solar terrestre en una zona de alta irradiancia del sur del Perú.",
    fallback: {
      name: "Parque Solar Demo Arequipa",
      totalSupply: BigInt(1000),
      minted: BigInt(40),
      price: xlmToStroops("10"),
    },
  },
  2: {
    location: "Lima, Perú",
    flag: "🇵🇪",
    asset: "SUN-LIMA",
    capacity: "150 kWp",
    capacityKwp: 150,
    image: IMG_ROOFTOP,
    description:
      "Proyecto de demostración (datos ficticios): planta fotovoltaica en techo industrial al norte de Lima.",
    fallback: {
      name: "Solar Lima Norte",
      totalSupply: BigInt(1500),
      minted: BigInt(0),
      price: xlmToStroops("10"),
    },
  },
  3: {
    location: "Cusco, Perú",
    flag: "🇵🇪",
    asset: "SUN-CUSCO",
    capacity: "80 kWp",
    capacityKwp: 80,
    image: IMG_DESERT,
    description:
      "Proyecto de demostración (datos ficticios): microrred solar comunitaria con baterías en el Valle Sagrado.",
    fallback: {
      name: "Valle Sagrado Solar",
      totalSupply: BigInt(800),
      minted: BigInt(0),
      price: xlmToStroops("5"),
    },
  },
};

/** Ids that have a sheet (the labelled DEMO list when the chain is unreachable). */
export const META_PROJECT_IDS = Object.keys(PROJECT_META).map(Number);

/** Description of a project without a sheet. */
export const GENERIC_PROJECT_DESCRIPTION = "Proyecto registrado on-chain (sin ficha descriptiva).";

function sheetOf(id: number): ProjectSheet | null {
  return Object.prototype.hasOwnProperty.call(PROJECT_META, id) ? PROJECT_META[id] : null;
}

export function getProjectMeta(id: number): ProjectMeta {
  const sheet = sheetOf(id);
  if (sheet) return { ...sheet, hasSheet: true };
  return {
    hasSheet: false,
    location: "",
    flag: "",
    asset: "",
    capacity: "—",
    capacityKwp: 0,
    image: null,
    description: GENERIC_PROJECT_DESCRIPTION,
    fallback: null,
  };
}

/** The on-chain name; else the sheet's DEMO name; else "Proyecto #id". */
export function projectDisplayName(id: number, onChainName?: string | null): string {
  const name = (onChainName ?? "").trim();
  return name || sheetOf(id)?.fallback.name || `Proyecto #${id}`;
}
