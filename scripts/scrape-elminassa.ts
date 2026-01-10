#!/usr/bin/env tsx
/**
 * elminassa.com scraper (v2)
 * - Fixes "all ads same coordinates" by reading real geometry from XHR JSON
 * - Loads more by scrolling + clicking "Load more" until no growth
 * - Hydrates missing coords from /adDetails/<id> pages (concurrency-limited)
 *
 * Usage:
 *   pnpm tsx scripts/scrape-elminassa.v2.ts
 *   pnpm tsx scripts/scrape-elminassa.v2.ts --output=scraped-elminassa-data.json
 *   pnpm tsx scripts/scrape-elminassa.v2.ts --url=https://www.elminassa.com/app.html?v=20250405
 *   pnpm tsx scripts/scrape-elminassa.v2.ts --max=2000 --scroll=80 --debug
 */

import puppeteer, { Browser, Page } from "puppeteer";
import { writeFileSync } from "fs";
import { resolve } from "path";

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};
function log(msg: string, color: string = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}

interface ScrapedListing {
  publisher: {
    userId?: string;
    name: string;
    phoneNumber: string;
    email: string | null;
  };
  photos: string[];
  videos: string[];
  sold: boolean;
  deleted: boolean;
  tobedeleted: boolean;
  visible: boolean;
  visitCount: number;
  lot: string[];
  isRealLocation: boolean;
  subPolygon: any[];
  subPolygonColor: string;
  _id?: string;

  clientName: string;
  clientPhoneNumber: string;
  title: string;
  description: string;
  category: string;
  subCategory: string;
  region: string;
  contractType: "sale" | "rent";
  professional: boolean;

  geometry: { type: "Point"; coordinates: [number, number] }; // [lng, lat]
  publicationDate: string;
  price: number;

  lotissement?: string;
  index?: string;
  ilotSize?: string;
  polygoneArea?: string;
  elevation?: string;
  sidesLength?: string;
  matterportLink?: string;
}

type AnyObj = Record<string, any>;

function parseArgs() {
  const get = (k: string) => process.argv.find(a => a.startsWith(`--${k}=`))?.split("=")[1];
  const has = (k: string) => process.argv.includes(`--${k}`);

  return {
    url: get("url") || "https://www.elminassa.com/app.html?v=20250405",
    output: get("output") || resolve(process.cwd(), "scraped-elminassa-data.json"),
    max: Number(get("max") || "1500"),
    scroll: Number(get("scroll") || "60"),
    debug: has("debug"),
    headful: has("headful"), // optional: run visible browser
    hydrateDetails: !has("no-details"), // default true
    concurrency: Number(get("concurrency") || "6"),
  };
}

/** Safe JSON parse even when server sets wrong content-type */
async function tryReadJsonFromResponse(resp: any): Promise<any | null> {
  try {
    // Fast path
    return await resp.json();
  } catch {
    try {
      const txt = await resp.text();
      if (!txt) return null;
      // Some endpoints return JSON as text/plain
      if (txt.trim().startsWith("{") || txt.trim().startsWith("[")) {
        return JSON.parse(txt);
      }
      return null;
    } catch {
      return null;
    }
  }
}

/** Heuristic: does an object look like a listing? */
function looksLikeListing(o: AnyObj): boolean {
  if (!o || typeof o !== "object") return false;
  const hasId = typeof o._id === "string" || typeof o.id === "string";
  const hasTitle = typeof o.title === "string" && o.title.trim().length > 0;
  const hasPrice = typeof o.price === "number" || typeof o.price === "string";
  const hasGeo =
    (o.geometry && Array.isArray(o.geometry.coordinates)) ||
    (Array.isArray(o.coordinates)) ||
    (typeof o.lat !== "undefined" && typeof o.lng !== "undefined") ||
    (typeof o.latitude !== "undefined" && typeof o.longitude !== "undefined");
  return (hasId && (hasTitle || hasPrice || hasGeo)) || (hasTitle && hasGeo);
}

/** Recursively collect listing-like objects from any JSON */
function collectListingsDeep(x: any, out: AnyObj[] = []): AnyObj[] {
  if (Array.isArray(x)) {
    for (const v of x) collectListingsDeep(v, out);
    return out;
  }
  if (x && typeof x === "object") {
    if (looksLikeListing(x)) out.push(x);
    for (const k of Object.keys(x)) {
      collectListingsDeep(x[k], out);
    }
  }
  return out;
}

function normalizeId(o: AnyObj): string | null {
  const id = (o?._id || o?.id) as string | undefined;
  return typeof id === "string" && id.length > 0 ? id : null;
}

function extractMediaArray(v: any): string[] {
  if (Array.isArray(v)) return v.filter((s) => typeof s === "string" && s.startsWith("http"));
  if (typeof v === "string" && v.startsWith("http")) return [v];
  return [];
}

/**
 * Calculate the center (centroid) of a polygon
 */
function calculatePolygonCenter(polygon: number[][]): [number, number] | null {
  if (!polygon || polygon.length < 3) return null;
  
  let sumLat = 0;
  let sumLng = 0;
  let validPoints = 0;
  
  for (const point of polygon) {
    if (Array.isArray(point) && point.length >= 2) {
      const [lng, lat] = point;
      if (Number.isFinite(lat) && Number.isFinite(lng) && 
          lat >= -90 && lat <= 90 && 
          lng >= -180 && lng <= 180) {
        sumLat += lat;
        sumLng += lng;
        validPoints++;
      }
    }
  }
  
  if (validPoints === 0) return null;
  
  return [sumLng / validPoints, sumLat / validPoints]; // [lng, lat]
}

/**
 * Extract [lng, lat] robustly from mixed formats.
 * Priority: subPolygon center > realLatitude/realLongitude > geometry.coordinates > other formats
 * Also tries to detect swapped order using Nouakchott-ish heuristics:
 * - lat ~ [10, 25]
 * - lng ~ [-25, -5]
 */
function extractCoordinates(item: AnyObj): { coords: [number, number] | null; isReal: boolean; hasSubPolygon: boolean } {
  let lng: number | null = null;
  let lat: number | null = null;
  let hasSubPolygon = false;

  // Priority 1: Use subPolygon center if available
  const subPoly = item?.subPolygon || item?.sub_polygon;
  if (Array.isArray(subPoly) && subPoly.length >= 3) {
    const center = calculatePolygonCenter(subPoly);
    if (center) {
      [lng, lat] = center;
      hasSubPolygon = true;
    }
  }

  // Priority 2: Use realLatitude/realLongitude if subPolygon not available
  if ((lng == null || lat == null) && item?.realLatitude != null && item?.realLongitude != null) {
    const a = Number(item.realLongitude);
    const b = Number(item.realLatitude);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      lng = a; lat = b;
    }
  }

  // Priority 3: Use geometry.coordinates
  if (lng == null || lat == null) {
    const geo = item?.geometry?.coordinates;
    if (Array.isArray(geo) && geo.length >= 2) {
      const a = Number(geo[0]);
      const b = Number(geo[1]);
      if (Number.isFinite(a) && Number.isFinite(b)) {
        lng = a; lat = b;
      }
    }
  }

  // Priority 4: Use coordinates array
  if (lng == null || lat == null) {
    if (Array.isArray(item?.coordinates) && item.coordinates.length >= 2) {
      const a = Number(item.coordinates[0]);
      const b = Number(item.coordinates[1]);
      if (Number.isFinite(a) && Number.isFinite(b)) {
        lng = a; lat = b;
      }
    }
  }

  // Priority 5: Use lat/lng properties
  if (lng == null || lat == null) {
    if (item?.lng != null && item?.lat != null) {
      const a = Number(item.lng);
      const b = Number(item.lat);
      if (Number.isFinite(a) && Number.isFinite(b)) {
        lng = a; lat = b;
      }
    }
  }

  // Priority 6: Use latitude/longitude properties
  if (lng == null || lat == null) {
    if (item?.longitude != null && item?.latitude != null) {
      const a = Number(item.longitude);
      const b = Number(item.latitude);
      if (Number.isFinite(a) && Number.isFinite(b)) {
        lng = a; lat = b;
      }
    }
  }

  if (lng == null || lat == null) return { coords: null, isReal: false, hasSubPolygon };

  // Treat near-zero as missing in this context (Nouakchott is not (0,0))
  if (Math.abs(lng) < 1e-8 && Math.abs(lat) < 1e-8) return { coords: null, isReal: false, hasSubPolygon };

  // If swapped, fix using Nouakchott-ish constraints
  const isLatLike = (x: number) => x >= 10 && x <= 25;
  const isLngLike = (x: number) => x >= -25 && x <= -5;

  // Expected: [lng, lat] => lng negative, lat positive
  // If we see opposite, swap.
  if (isLatLike(lng) && isLngLike(lat)) {
    const tmp = lng; lng = lat; lat = tmp;
  }

  return { coords: [lng, lat], isReal: true, hasSubPolygon };
}

function mapContractType(item: AnyObj): "sale" | "rent" {
  const v = (item.contractType || item.contract_type || item.type || item.op_type || "").toString().toLowerCase();
  return v.includes("rent") || v.includes("location") ? "rent" : "sale";
}

function cleanTitle(t: any): string {
  let s = (typeof t === "string" ? t : "Annonce sans titre").trim();
  // remove repeating price chunks and pager “1 / 3”
  s = s.replace(/\d+\s*\/\s*\d+/g, " ");
  s = s.replace(/^\d[\d\s]*\s*MRU\s*/gi, "");
  s = s.replace(/\s+/g, " ").trim();
  return s || "Annonce sans titre";
}

function toScrapedListing(item: AnyObj): ScrapedListing {
  const id = normalizeId(item) || undefined;

  // price
  let price = 0;
  if (typeof item.price === "number") price = item.price;
  else if (typeof item.price === "string") {
    const m = item.price.match(/(\d[\d\s]*\.?\d*)/);
    price = m ? parseInt(m[1].replace(/\s/g, "")) : 0;
  }

  const { coords, isReal, hasSubPolygon } = extractCoordinates(item);

  // Extract subPolygon (priority source for location)
  const subPoly = item?.subPolygon || item?.sub_polygon;
  const subPolygon = (Array.isArray(subPoly) && subPoly.length >= 3) ? subPoly : [];

  // media
  const photos =
    extractMediaArray(item.photos).length ? extractMediaArray(item.photos) :
    extractMediaArray(item.images).length ? extractMediaArray(item.images) :
    extractMediaArray(item.photo).length ? extractMediaArray(item.photo) :
    extractMediaArray(item.image);

  const videos = extractMediaArray(item.videos);

  return {
    publisher: {
      userId: item.publisher?.userId,
      name: item.publisher?.name || "elminassa.com",
      phoneNumber: item.publisher?.phoneNumber || "48036802",
      email: item.publisher?.email || null,
    },
    photos,
    videos,
    sold: !!item.sold,
    deleted: !!item.deleted,
    tobedeleted: !!item.tobedeleted,
    visible: item.visible !== false,
    visitCount: Number(item.visitCount || item.visit_count || item.views || 0),
    lot: Array.isArray(item.lot) ? item.lot.map(String) : (item.lot ? [String(item.lot)] : []),
    isRealLocation: (hasSubPolygon || isReal) && (item.isRealLocation !== false) && (item.is_real_location !== false),
    subPolygon: subPolygon, // Array of [lng, lat] coordinates forming a polygon
    subPolygonColor: item.subPolygonColor || item.sub_polygon_color || "",
    _id: id,

    clientName: item.clientName || item.client_name || item.ownerName || item.owner_name || "",
    clientPhoneNumber: item.clientPhoneNumber || item.client_phone_number || item.phoneNumber || item.phone_number || "",
    title: cleanTitle(item.title),
    description: item.description || "",
    category: item.category || "realEstate",
    subCategory: item.subCategory || item.sub_category || "land",
    region: item.region || "tevragh-zeina",
    contractType: mapContractType(item),
    professional: !!item.professional,

    geometry: {
      type: "Point",
      coordinates: coords ?? [-15.9582, 18.0735], // only used if coords missing; isRealLocation will be false
    },
    publicationDate: item.publicationDate || item.publication_date || item.createdAt || item.created_at || new Date().toISOString(),
    price: price || 1,

    lotissement: item.lotissement || item.lotissement_name,
    index: item.index || item.index_number ? String(item.index || item.index_number) : undefined,
    ilotSize: item.ilotSize || item.ilot_size || item.ilot,
    polygoneArea: item.polygoneArea || item.polygone_area || item.area || item.surface,
    elevation: item.elevation,
    sidesLength: item.sidesLength || item.sides_length || item.dimensions,
    matterportLink: item.matterportLink || item.matterport_link || item.matterport,
  };
}

/** Simple concurrency pool */
async function runPool<T, R>(items: T[], concurrency: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const res: R[] = [];
  let i = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (i < items.length) {
      const idx = i++;
      res[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return res;
}

/** Hydrate one listing via detail page; returns best listing object found, else null */
async function hydrateFromDetails(browser: Browser, id: string): Promise<AnyObj | null> {
  const url = `https://www.elminassa.com/adDetails/${id}`;
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1400, height: 900 });
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    const found: AnyObj[] = [];
    page.on("response", async (resp) => {
      try {
        const reqType = resp.request().resourceType();
        if (reqType !== "xhr" && reqType !== "fetch") return;
        const j = await tryReadJsonFromResponse(resp);
        if (!j) return;
        const hits = collectListingsDeep(j);
        for (const h of hits) {
          const hid = normalizeId(h);
          if (hid === id) found.push(h);
        }
      } catch {
        // ignore
      }
    });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, 4000));

    // Fallback: sometimes data is injected in window variables
    const windowCandidates = await page.evaluate(() => {
      const w: any = window as any;
      const keys = ["__INITIAL_STATE__", "__APP_STATE__", "__NEXT_DATA__", "appData", "initialData", "data", "props"];
      const out: any[] = [];
      for (const k of keys) if (w[k]) out.push(w[k]);
      return out;
    });

    for (const c of windowCandidates) {
      const hits = collectListingsDeep(c);
      for (const h of hits) {
        const hid = normalizeId(h);
        if (hid === id) found.push(h);
      }
    }

    // Pick the one with geometry if possible
    const best =
      found.find(x => Array.isArray(x?.geometry?.coordinates) && x.geometry.coordinates.length >= 2) ||
      found[0] ||
      null;

    return best;
  } catch {
    return null;
  } finally {
    await page.close();
  }
}

async function scrape() {
  const args = parseArgs();

  log("\n🕷️  Scraping elminassa.com (v2)\n", colors.cyan);
  log(`📍 URL: ${args.url}`, colors.blue);
  log(`💾 Output: ${args.output}`, colors.blue);
  log(`🔢 Max ads: ${args.max} | Scroll steps: ${args.scroll}`, colors.blue);
  log(`🧵 Details hydration: ${args.hydrateDetails ? "ON" : "OFF"} | Concurrency: ${args.concurrency}\n`, colors.blue);

  let browser: Browser | null = null;

  // Raw listing objects captured from XHR JSON
  const byId = new Map<string, AnyObj>();
  const debugApiDump: Array<{ url: string; sampleKeys: string[] }> = [];

  try {
    browser = await puppeteer.launch({
      headless: !args.headful,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    page.on("response", async (resp) => {
      try {
        const reqType = resp.request().resourceType();
        if (reqType !== "xhr" && reqType !== "fetch") return;

        const j = await tryReadJsonFromResponse(resp);
        if (!j) return;

        const hits = collectListingsDeep(j);
        if (hits.length === 0) return;

        if (args.debug) {
          const sample = hits[0];
          debugApiDump.push({ url: resp.url(), sampleKeys: Object.keys(sample || {}) });
        }

        for (const h of hits) {
          const id = normalizeId(h);
          if (!id) continue;
          if (!byId.has(id)) byId.set(id, h);
          else {
            // merge: prefer object that has geometry
            const prev = byId.get(id)!;
            const prevHasGeo = Array.isArray(prev?.geometry?.coordinates);
            const newHasGeo = Array.isArray(h?.geometry?.coordinates);
            if (!prevHasGeo && newHasGeo) byId.set(id, h);
          }
        }
      } catch {
        // ignore
      }
    });

    log(`📄 Opening page...`, colors.blue);
    await page.goto(args.url, { waitUntil: "networkidle2", timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, 4000));

    // Load more loop: scroll + click load-more if present, stop when stalls
    let stalls = 0;
    let prevCount = 0;

    for (let step = 1; step <= args.scroll; step++) {
      // Scroll
      await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));
      await new Promise(resolve => setTimeout(resolve, 1800));

      // Try click load-more button by id/class OR Arabic text
      const clicked = await page.evaluate(() => {
        const direct = document.querySelector<HTMLButtonElement>("#loadMoreBtn, button.load-more-btn, button[class*='load'], button[class*='more']");
        if (direct && !direct.disabled) {
          direct.click();
          return true;
        }
        const buttons = Array.from(document.querySelectorAll("button"));
        const b = buttons.find(x => {
          const t = (x.textContent || "").trim();
          return t.includes("تحميل") || t.includes("المزيد") || t.toLowerCase().includes("load") || t.toLowerCase().includes("more");
        }) as HTMLButtonElement | undefined;
        if (b && !b.disabled) {
          b.click();
          return true;
        }
        return false;
      });

      if (clicked) await new Promise(resolve => setTimeout(resolve, 2200));

      const now = byId.size;
      if (now >= args.max) {
        log(`✅ Reached max=${args.max}.`, colors.green);
        break;
      }

      const delta = now - prevCount;
      if (delta > 0) {
        log(`📈 Step ${step}/${args.scroll}: +${delta} ads (total: ${now})`, colors.green);
        stalls = 0;
        prevCount = now;
      } else {
        stalls++;
        log(`⏳ Step ${step}/${args.scroll}: no new ads (stall ${stalls}/4)`, colors.yellow);
        if (stalls >= 4) break;
      }
    }

    if (args.debug) {
      const dbgPath = resolve(process.cwd(), "debug-api-samples.json");
      writeFileSync(dbgPath, JSON.stringify(debugApiDump.slice(0, 200), null, 2), "utf-8");
      log(`🧪 Debug saved: ${dbgPath}`, colors.cyan);
    }

    const ids = Array.from(byId.keys());
    log(`\n📦 Captured unique ads from XHR: ${ids.length}`, colors.cyan);

    // Hydrate missing coords from details (optional)
    if (args.hydrateDetails) {
      const missing = ids.filter(id => {
        const it = byId.get(id)!;
        const { coords } = extractCoordinates(it);
        return coords == null;
      });

      if (missing.length > 0) {
        log(`🧭 Missing coords for ${missing.length} ads. Hydrating from details...`, colors.yellow);

        const hydrated = await runPool(missing, args.concurrency, async (id) => {
          const full = await hydrateFromDetails(browser!, id);
          if (full) {
            // merge preferring geometry
            const prev = byId.get(id)!;
            const prevHasGeo = Array.isArray(prev?.geometry?.coordinates);
            const newHasGeo = Array.isArray(full?.geometry?.coordinates);
            if (!prevHasGeo && newHasGeo) byId.set(id, full);
            else if (newHasGeo) byId.set(id, full);
          }
          return id;
        });

        log(`✅ Details hydration done (${hydrated.length} pages visited).`, colors.green);
      } else {
        log(`✅ All captured ads already have coordinates.`, colors.green);
      }
    }

    // Transform
    const finalListings: ScrapedListing[] = [];
    for (const [id, raw] of byId.entries()) {
      const listing = toScrapedListing({ ...raw, _id: normalizeId(raw) || id });
      finalListings.push(listing);
    }

    // Output
    const output = { collection: finalListings.slice(0, args.max) };
    writeFileSync(args.output, JSON.stringify(output, null, 2), "utf-8");

    log(`\n✅ Saved ${output.collection.length} ads to: ${args.output}`, colors.green);

    // Quick sanity: coords diversity
    const uniqCoords = new Set(output.collection.map(x => x.geometry.coordinates.join(",")));
    log(`📍 Unique coordinate pairs: ${uniqCoords.size}`, colors.cyan);

    return output.collection;
  } finally {
    if (browser) await browser.close();
    log("✅ Browser closed", colors.green);
  }
}

scrape().catch((e) => {
  log(`❌ Fatal: ${e?.message || e}`, colors.red);
  process.exit(1);
});
