import { beforeEach, describe, expect, it, vi } from "vitest";

// ═══════════════════════════════════════════════════════════
// All on-chain projects (1..next_project_id-1), the landing's first-6 toggle,
// get_portfolio in chunks of 12 and the generic presentation without a sheet
// ═══════════════════════════════════════════════════════════

const read = vi.hoisted(() => vi.fn());
vi.mock("@/lib/soroban", () => ({ readContractNative: read }));

import {
  FEATURED_LIMIT,
  MAX_LISTED_PROJECTS,
  PORTFOLIO_CHUNK_SIZE,
  chunkIds,
  fetchOnChainProjects,
  fetchPortfolio,
  parsePortfolio,
  projectIdRange,
  visibleProjects,
} from "@/lib/projects";
import { GENERIC_PROJECT_DESCRIPTION, getProjectMeta, projectDisplayName } from "@/lib/projectMeta";

const ADDR = "GBTNEHEDUS7X7MEU2RNAXLH5B52TPW44YZDQNFQMU2JPBMCXAXZ4LOUD";
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

beforeEach(() => {
  read.mockReset();
});

describe("projectIdRange (all projects from next_project_id)", () => {
  it("is 1..next_project_id-1", () => {
    expect(projectIdRange(4)).toEqual([1, 2, 3]);
    expect(projectIdRange(2)).toEqual([1]);
  });

  it("covers more than 12 projects (the old cap)", () => {
    expect(projectIdRange(16)).toEqual(range(1, 15));
  });

  it("is empty when no project exists or the value is not an id", () => {
    for (const next of [1, 0, -3, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 60]) {
      expect(projectIdRange(next)).toEqual([]);
    }
  });

  it("stops at MAX_LISTED_PROJECTS (guard against a corrupt next_project_id)", () => {
    const ids = projectIdRange(1_000_000);
    expect(ids).toHaveLength(MAX_LISTED_PROJECTS);
    expect(ids[0]).toBe(1);
    expect(ids[ids.length - 1]).toBe(MAX_LISTED_PROJECTS);
    expect(projectIdRange(10, 3)).toEqual([1, 2, 3]);
  });
});

describe("fetchOnChainProjects (reads mocked)", () => {
  it("reads every project 1..next_project_id-1, in order", async () => {
    read.mockImplementation(async (method: string, args: unknown[] = []) => {
      if (method === "next_project_id") return BigInt(16);
      if (method === "get_project") return { creator: "GC", total_supply: BigInt(10), minted: BigInt(Number(args[0])), price: BigInt(1) };
      if (method === "get_project_name") return `Proyecto ${args[0]}`;
      throw new Error(`unexpected ${method}`);
    });
    const { projects, nextProjectId } = await fetchOnChainProjects();
    expect(nextProjectId).toBe(16);
    expect(projects.map((p) => p.id)).toEqual(range(1, 15));
    expect(projects[14]).toMatchObject({ id: 15, name: "Proyecto 15", minted: BigInt(15) });
    expect(read.mock.calls.filter(([m]) => m === "get_project")).toHaveLength(15);
  });

  it("is empty for a contract without projects", async () => {
    read.mockResolvedValueOnce(BigInt(1));
    expect(await fetchOnChainProjects()).toEqual({ projects: [], nextProjectId: 1 });
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("throws when the RPC is unreachable (the UI then shows its DEMO fallback)", async () => {
    read.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(fetchOnChainProjects()).rejects.toThrow("Failed to fetch");
  });
});

describe("visibleProjects (landing: first 6 + 'Ver todos los proyectos')", () => {
  it("shows everything when there are at most FEATURED_LIMIT", () => {
    expect(FEATURED_LIMIT).toBe(6);
    expect(visibleProjects(range(1, 5), false)).toEqual(range(1, 5));
    expect(visibleProjects(range(1, 6), false)).toEqual(range(1, 6));
  });

  it("shows the first 6 collapsed and all of them expanded", () => {
    const all = range(1, 9);
    expect(visibleProjects(all, false)).toEqual(range(1, 6));
    expect(visibleProjects(all, true)).toEqual(all);
    expect(all).toEqual(range(1, 9)); // input untouched
  });
});

describe("chunkIds (get_portfolio chunks)", () => {
  it("splits into consecutive chunks of at most 12", () => {
    expect(PORTFOLIO_CHUNK_SIZE).toBe(12);
    expect(chunkIds([])).toEqual([]);
    expect(chunkIds(range(1, 12))).toEqual([range(1, 12)]);
    expect(chunkIds(range(1, 13))).toEqual([range(1, 12), [13]]);
    const chunks = chunkIds(range(1, 30));
    expect(chunks.map((c) => c.length)).toEqual([12, 12, 6]);
    expect(chunks.flat()).toEqual(range(1, 30));
  });

  it("rejects a size that is not a positive integer", () => {
    expect(() => chunkIds([1, 2], 0)).toThrow(RangeError);
    expect(() => chunkIds([1, 2], 1.5)).toThrow(RangeError);
  });
});

describe("fetchPortfolio (chunked get_portfolio, merged)", () => {
  const position = (id: number) => ({
    project_id: BigInt(id),
    token_balance: BigInt(id * 10),
    claimable_amount: BigInt(id),
    total_claimed: BigInt(0),
  });
  const reader = () => vi.fn(async (_address: string, ids: number[]) => ids.map(position));

  it("covers every project with calls of at most 12 ids", async () => {
    const fake = reader();
    const map = await fetchPortfolio(ADDR, range(1, 30), fake);
    expect(fake).toHaveBeenCalledTimes(3);
    expect(fake.mock.calls.map(([address, ids]) => [address, ids.length])).toEqual([
      [ADDR, 12],
      [ADDR, 12],
      [ADDR, 6],
    ]);
    expect(map.size).toBe(30);
    expect(map.get(13)).toEqual({ balance: BigInt(130), claimable: BigInt(13), claimed: BigInt(0) });
    expect(map.get(30)).toEqual({ balance: BigInt(300), claimable: BigInt(30), claimed: BigInt(0) });
  });

  it("makes one call for up to 12 projects and none for an empty list", async () => {
    const fake = reader();
    expect((await fetchPortfolio(ADDR, [1, 2, 3], fake)).size).toBe(3);
    expect(fake).toHaveBeenCalledTimes(1);
    const none = reader();
    expect((await fetchPortfolio(ADDR, [], none)).size).toBe(0);
    expect(none).not.toHaveBeenCalled();
  });

  it("fails as a whole if one chunk fails (totals never skip projects)", async () => {
    const fake = vi.fn(async (_address: string, ids: number[]) => {
      if (ids.includes(20)) throw new Error("Simulation failed");
      return ids.map(position);
    });
    await expect(fetchPortfolio(ADDR, range(1, 30), fake)).rejects.toThrow("Simulation failed");
  });

  it("uses get_portfolio(address, ids) by default", async () => {
    read.mockResolvedValue([position(1)]);
    const map = await fetchPortfolio(ADDR, [1]);
    expect(read).toHaveBeenCalledWith("get_portfolio", [ADDR, [1]]);
    expect(map.get(1)?.balance).toBe(BigInt(10));
  });

  it("parsePortfolio tolerates a malformed answer", () => {
    expect(parsePortfolio(undefined).size).toBe(0);
    expect(parsePortfolio([{ project_id: "2", token_balance: 5 }]).get(2)).toEqual({
      balance: BigInt(5),
      claimable: BigInt(0),
      claimed: BigInt(0),
    });
  });
});

describe("generic presentation for a project without a sheet", () => {
  it("invents nothing: no location, flag, asset, image, capacity or DEMO values", () => {
    const meta = getProjectMeta(7);
    expect(meta).toMatchObject({
      hasSheet: false,
      location: "",
      flag: "",
      asset: "",
      capacity: "—",
      capacityKwp: 0,
      image: null,
      fallback: null,
      description: GENERIC_PROJECT_DESCRIPTION,
    });
    expect(GENERIC_PROJECT_DESCRIPTION).toContain("Proyecto registrado on-chain (sin ficha descriptiva)");
  });

  it("keeps the sheet for the demo projects", () => {
    expect(getProjectMeta(1)).toMatchObject({ hasSheet: true, asset: "SUN-AQP" });
    expect(getProjectMeta(1).fallback?.name).toBe("Parque Solar Demo Arequipa");
  });

  it("names a project by its on-chain name, else its sheet, else its id", () => {
    expect(projectDisplayName(7, "Solar Cusco Sur")).toBe("Solar Cusco Sur");
    expect(projectDisplayName(7, "  ")).toBe("Proyecto #7");
    expect(projectDisplayName(7)).toBe("Proyecto #7");
    expect(projectDisplayName(1, "")).toBe("Parque Solar Demo Arequipa");
  });
});
