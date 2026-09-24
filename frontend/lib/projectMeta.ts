/**
 * Off-chain presentation metadata, keyed by on-chain project id. The contract
 * stores the project name and numbers (supply, price, minted, energy); the
 * location, image, capacity and description below are demo data only.
 *
 * `fallback` is shown ONLY when the chain is unreachable and is always
 * labelled DEMO in the UI. Its values mirror the testnet configuration at the
 * time of writing (price in stroops, 1 XLM = 10^7 stroops).
 */

import { xlmToStroops } from "./units";

export type ProjectMeta = {
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

const IMG_ROOFTOP =
  "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&h=500&fit=crop";
const IMG_DESERT =
  "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=800&h=500&fit=crop";

export const PROJECT_META: Readonly<Record<number, ProjectMeta>> = {
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

/** Ids that have presentation metadata (used when the chain is unreachable). */
export const META_PROJECT_IDS = Object.keys(PROJECT_META).map(Number);

const GENERIC_META: ProjectMeta = {
  location: "Perú",
  flag: "🇵🇪",
  asset: "SUN",
  capacity: "—",
  capacityKwp: 0,
  image: IMG_ROOFTOP,
  description: "Proyecto de demostración (datos ficticios) registrado on-chain en Stellar testnet.",
  fallback: { name: "Proyecto demo", totalSupply: BigInt(0), minted: BigInt(0), price: BigInt(0) },
};

export function getProjectMeta(id: number): ProjectMeta {
  return PROJECT_META[id] ?? { ...GENERIC_META, asset: `SUN-${id}` };
}
