import { beforeEach, describe, expect, it, vi } from "vitest";

// ═══════════════════════════════════════════════════════════
// /project/?id=N: id parsing, URL shape and the "not found" decision
// ═══════════════════════════════════════════════════════════

const read = vi.hoisted(() => vi.fn());
vi.mock("@/lib/soroban", () => ({ readContractNative: read }));

import {
  decideProjectLookup,
  lookupOnChainProject,
  parseProject,
  parseProjectId,
  projectHref,
  projectPageState,
  type OnChainProject,
} from "@/lib/projects";

const NOT_FOUND_SIM = new Error("Simulation failed: HostError: Error(Contract, #6)\n\nEvent log (newest first): ...");
const NETWORK = new TypeError("Failed to fetch");

const project = (id: number): OnChainProject =>
  parseProject(id, { creator: "GABC", total_supply: BigInt(100), minted: BigInt(1), price: BigInt(10) }, `P${id}`);
const ok = <T>(value: T): PromiseSettledResult<T> => ({ status: "fulfilled", value });
const fail = (reason: unknown): PromiseSettledResult<never> => ({ status: "rejected", reason });

beforeEach(() => {
  read.mockReset();
});

describe("parseProjectId", () => {
  it.each([
    ["1", 1],
    ["42", 42],
    [" 7 ", 7],
    ["007", 7],
    ["9007199254740991", Number.MAX_SAFE_INTEGER],
  ])("accepts %j as %d", (raw, id) => {
    expect(parseProjectId(raw)).toBe(id);
  });

  it("returns null when the id is missing", () => {
    expect(parseProjectId(null)).toBeNull();
    expect(parseProjectId(undefined)).toBeNull();
    expect(parseProjectId("")).toBeNull();
    expect(parseProjectId("   ")).toBeNull();
  });

  it.each(["abc", "1abc", "0x10", "1e3", "NaN", "Infinity", "+1", "-1", "0", "00", "1.5", "1.0", "2,5", "9007199254740993"])(
    "rejects %j (non-numeric, <= 0, not an integer or unsafe)",
    (raw) => {
      expect(parseProjectId(raw)).toBeNull();
    }
  );
});

describe("projectHref", () => {
  it("points at the single static page with the id in the query string", () => {
    expect(projectHref(5)).toBe("/project/?id=5");
    expect(projectHref(123)).not.toMatch(/\/project\/\d/);
  });

  it("round-trips through the query string for any id, not only 1-3", () => {
    for (const id of [1, 2, 3, 4, 13, 250]) {
      const url = new URL(projectHref(id), "https://niko.example");
      expect(url.pathname).toBe("/project/");
      expect(parseProjectId(url.searchParams.get("id"))).toBe(id);
    }
  });
});

describe("decideProjectLookup", () => {
  it("found when get_project succeeded, even if next_project_id is stale", () => {
    const p = project(4);
    expect(decideProjectLookup(4, ok(p), ok(4))).toEqual({ status: "found", project: p });
    expect(decideProjectLookup(4, ok(p), fail(NETWORK))).toEqual({ status: "found", project: p });
  });

  it("not_found on Error(Contract, #6) ProjectNotFound", () => {
    expect(decideProjectLookup(9, fail(NOT_FOUND_SIM), fail(NETWORK))).toEqual({ status: "not_found" });
    expect(decideProjectLookup(9, fail("HostError: Error(Contract, #6)"), ok(4))).toEqual({ status: "not_found" });
  });

  it("not_found when id >= next_project_id, whatever get_project's error", () => {
    expect(decideProjectLookup(4, fail(NETWORK), ok(4))).toEqual({ status: "not_found" });
    expect(decideProjectLookup(40, fail(NETWORK), ok(4))).toEqual({ status: "not_found" });
  });

  it("unreachable (never not_found) when nothing proves the project is missing", () => {
    expect(decideProjectLookup(3, fail(NETWORK), ok(4))).toEqual({ status: "unreachable", error: NETWORK });
    expect(decideProjectLookup(3, fail(NETWORK), fail(NETWORK))).toEqual({ status: "unreachable", error: NETWORK });
    // another contract error is not "not found"
    const overflow = new Error("HostError: Error(Contract, #13)");
    expect(decideProjectLookup(2, fail(overflow), ok(4))).toEqual({ status: "unreachable", error: overflow });
  });

  it("ignores a next_project_id that cannot be real (the contract returns >= 1)", () => {
    expect(decideProjectLookup(2, fail(NETWORK), ok(0)).status).toBe("unreachable");
    expect(decideProjectLookup(2, fail(NETWORK), ok(Number.NaN)).status).toBe("unreachable");
  });
});

describe("projectPageState", () => {
  const base = { id: 3 as number | null, notFound: false, project: null as OnChainProject | null, loading: false };

  it("invalid or missing id is not_found, without waiting for any read", () => {
    expect(projectPageState({ ...base, id: null, loading: true })).toBe("not_found");
    expect(projectPageState({ ...base, id: null })).toBe("not_found");
  });

  it("a lookup that proved the id missing is not_found", () => {
    expect(projectPageState({ ...base, notFound: true })).toBe("not_found");
  });

  it("loading and unreachable stay distinct from not_found", () => {
    expect(projectPageState({ ...base, loading: true })).toBe("loading");
    expect(projectPageState({ ...base, loading: false })).toBe("unreachable");
  });

  it("found once the project is read", () => {
    expect(projectPageState({ ...base, project: project(3) })).toBe("found");
    expect(projectPageState({ ...base, project: project(3), loading: true })).toBe("found");
  });
});

describe("lookupOnChainProject (reads mocked)", () => {
  function chain(opts: { next: bigint | Error; existing: number[]; down?: boolean }) {
    read.mockImplementation(async (method: string, args: unknown[] = []) => {
      if (opts.down) throw NETWORK;
      const id = Number(args[0]);
      switch (method) {
        case "next_project_id":
          if (opts.next instanceof Error) throw opts.next;
          return opts.next;
        case "get_project":
          if (!opts.existing.includes(id)) throw NOT_FOUND_SIM;
          return { creator: "GCREATOR", total_supply: BigInt(500), minted: BigInt(5), price: BigInt(20_000_000), active: true };
        case "get_project_name":
          return opts.existing.includes(id) ? `Proyecto on-chain ${id}` : "";
        default:
          throw new Error(`unexpected ${method}`);
      }
    });
  }

  it("found for a project created after the build (id 7, no descriptive sheet)", async () => {
    chain({ next: BigInt(8), existing: [1, 2, 3, 4, 5, 6, 7] });
    const r = await lookupOnChainProject(7);
    expect(r.status).toBe("found");
    if (r.status !== "found") return;
    expect(r.project).toMatchObject({ id: 7, name: "Proyecto on-chain 7", totalSupply: BigInt(500), price: BigInt(20_000_000) });
  });

  it("not_found when the contract answers ProjectNotFound", async () => {
    chain({ next: BigInt(4), existing: [1, 2, 3] });
    expect(await lookupOnChainProject(99)).toEqual({ status: "not_found" });
  });

  it("not_found from next_project_id when get_project fails for another reason", async () => {
    read.mockImplementation(async (method: string) => {
      if (method === "next_project_id") return BigInt(4);
      throw NETWORK;
    });
    expect(await lookupOnChainProject(5)).toEqual({ status: "not_found" });
  });

  it("unreachable when the RPC is down: no silent fallback to another project", async () => {
    chain({ next: BigInt(4), existing: [1, 2, 3], down: true });
    const r = await lookupOnChainProject(2);
    expect(r.status).toBe("unreachable");
    // only project 2 was asked for
    for (const [method, args] of read.mock.calls) {
      if (method === "get_project" || method === "get_project_name") expect(args).toEqual([2]);
    }
  });
});
