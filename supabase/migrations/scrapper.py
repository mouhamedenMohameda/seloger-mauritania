import asyncio
import argparse
import hashlib
import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from playwright.async_api import async_playwright, Page, Browser

DEFAULT_URL = "https://elminassa.com/app.html?v=20250405"


# -----------------------------
# Utilities
# -----------------------------
def safe_name(url: str) -> str:
    h = hashlib.sha1(url.encode("utf-8")).hexdigest()[:12]
    slug = re.sub(r"[^a-zA-Z0-9._-]+", "_", url)[:140]
    return f"{slug}__{h}"


def looks_like_listing(o: Any) -> bool:
    if not isinstance(o, dict):
        return False
    has_id = isinstance(o.get("_id") or o.get("id"), str)
    has_title = isinstance(o.get("title"), str) and o["title"].strip() != ""
    has_price = isinstance(o.get("price"), (int, float, str))
    has_geo = (
        (isinstance(o.get("geometry"), dict) and isinstance(o["geometry"].get("coordinates"), list)) or
        isinstance(o.get("coordinates"), list) or
        ("lat" in o and "lng" in o) or
        ("latitude" in o and "longitude" in o)
    )
    # Strict enough to avoid random objects, flexible enough to catch variants
    return has_id and (has_title or has_price or has_geo)


def collect_listings_deep(x: Any, out: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
    if out is None:
        out = []
    if isinstance(x, list):
        for v in x:
            collect_listings_deep(v, out)
        return out
    if isinstance(x, dict):
        if looks_like_listing(x):
            out.append(x)
        for v in x.values():
            collect_listings_deep(v, out)
    return out


def normalize_id(o: Dict[str, Any]) -> Optional[str]:
    _id = o.get("_id") or o.get("id")
    if isinstance(_id, str) and _id.strip():
        return _id.strip()
    return None


def deep_merge(a: Any, b: Any) -> Any:
    """
    Merge b into a, preferring non-empty values from b.
    - dict: recursive merge
    - list: concatenate unique-ish (keeps order)
    - scalars: prefer b if it's "meaningful"
    """
    if isinstance(a, dict) and isinstance(b, dict):
        out = dict(a)
        for k, bv in b.items():
            av = out.get(k)
            out[k] = deep_merge(av, bv) if k in out else bv
        return out

    if isinstance(a, list) and isinstance(b, list):
        out = list(a)
        # Avoid duplicates for strings; keep other items
        seen = set(x for x in out if isinstance(x, str))
        for x in b:
            if isinstance(x, str):
                if x not in seen:
                    out.append(x)
                    seen.add(x)
            else:
                out.append(x)
        return out

    # Prefer b if it's not empty / not None / not "" / not 0-0 coords etc.
    if b is None:
        return a
    if isinstance(b, str) and b.strip() == "":
        return a
    if isinstance(b, (int, float)) and isinstance(a, (int, float)) and a != 0 and b == 0:
        return a
    return b


async def try_read_json(resp) -> Optional[Any]:
    # robust JSON even with wrong content-type
    try:
        return await resp.json()
    except Exception:
        try:
            txt = await resp.text()
            if not txt:
                return None
            s = txt.strip()
            if s.startswith("{") or s.startswith("["):
                return json.loads(s)
            return None
        except Exception:
            return None


def extract_coordinates(item: Dict[str, Any]) -> Tuple[Optional[Tuple[float, float]], bool]:
    """
    Returns ((lng, lat) or None, is_real).
    Fixes swapped order with Nouakchott-ish heuristics:
    lat ~ [10,25], lng ~ [-25,-5]
    """
    lng = lat = None

    geo = item.get("geometry", {}).get("coordinates") if isinstance(item.get("geometry"), dict) else None
    if isinstance(geo, list) and len(geo) >= 2:
        try:
            lng, lat = float(geo[0]), float(geo[1])
        except Exception:
            lng = lat = None
    elif isinstance(item.get("coordinates"), list) and len(item["coordinates"]) >= 2:
        try:
            lng, lat = float(item["coordinates"][0]), float(item["coordinates"][1])
        except Exception:
            lng = lat = None
    elif item.get("lng") is not None and item.get("lat") is not None:
        try:
            lng, lat = float(item["lng"]), float(item["lat"])
        except Exception:
            lng = lat = None
    elif item.get("longitude") is not None and item.get("latitude") is not None:
        try:
            lng, lat = float(item["longitude"]), float(item["latitude"])
        except Exception:
            lng = lat = None

    if lng is None or lat is None:
        return None, False

    # treat near (0,0) as missing
    if abs(lng) < 1e-8 and abs(lat) < 1e-8:
        return None, False

    def is_lat_like(x: float) -> bool:
        return 10 <= x <= 25

    def is_lng_like(x: float) -> bool:
        return -25 <= x <= -5

    # if swapped: [lat, lng]
    if is_lat_like(lng) and is_lng_like(lat):
        lng, lat = lat, lng

    return (lng, lat), True


async def click_load_more(page: Page) -> bool:
    return await page.evaluate(
        """
        () => {
          const direct = document.querySelector("#loadMoreBtn, button.load-more-btn, button[class*='load'], button[class*='more']");
          if (direct && !direct.disabled) { direct.click(); return true; }

          const buttons = Array.from(document.querySelectorAll("button"));
          const b = buttons.find(x => {
            const t = (x.textContent || "").trim();
            return t.includes("تحميل") || t.includes("المزيد") || t.toLowerCase().includes("load") || t.toLowerCase().includes("more");
          });
          if (b && !b.disabled) { b.click(); return true; }
          return false;
        }
        """
    )


async def run_pool(items: List[str], concurrency: int, fn):
    sem = asyncio.Semaphore(concurrency)
    results = []

    async def wrapped(x):
        async with sem:
            return await fn(x)

    tasks = [asyncio.create_task(wrapped(x)) for x in items]
    for t in tasks:
        results.append(await t)
    return results


# -----------------------------
# Detail hydration
# -----------------------------
async def hydrate_from_details(browser: Browser, ad_id: str, user_agent: str, out_dir: Path) -> Optional[Dict[str, Any]]:
    """
    Opens /adDetails/<id> and uses the same "response discovery" method to capture JSON.
    Returns the best listing object for that id (prefer one with geometry).
    """
    url = f"https://elminassa.com/adDetails/{ad_id}"
    page = await browser.new_page(viewport={"width": 1400, "height": 900}, user_agent=user_agent)

    found: List[Dict[str, Any]] = []
    url_count: Dict[str, int] = {}

    async def on_response(resp):
        try:
            if resp.request.resource_type not in ("xhr", "fetch"):
                return
            data = await try_read_json(resp)
            if data is None:
                return

            # Save raw JSON (same method as discovery)
            u = resp.url
            url_count[u] = url_count.get(u, 0) + 1
            fname = out_dir / f"{safe_name(u)}__n{url_count[u]}.json"
            fname.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

            hits = collect_listings_deep(data)
            for h in hits:
                hid = normalize_id(h)
                if hid == ad_id:
                    found.append(h)
        except Exception:
            return

    page.on("response", on_response)

    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_timeout(3500)

        # Also check common window globals (sometimes injected state)
        window_candidates = await page.evaluate(
            """
            () => {
              const w = window;
              const keys = ["__INITIAL_STATE__", "__APP_STATE__", "__NEXT_DATA__", "appData", "initialData", "data", "props"];
              const out = [];
              for (const k of keys) { if (w[k]) out.push(w[k]); }
              return out;
            }
            """
        )
        for c in window_candidates or []:
            hits = collect_listings_deep(c)
            for h in hits:
                hid = normalize_id(h)
                if hid == ad_id:
                    found.append(h)

        # pick best: has geometry
        for h in found:
            coords, _ = extract_coordinates(h)
            if coords is not None:
                return h
        return found[0] if found else None
    except Exception:
        return None
    finally:
        await page.close()


# -----------------------------
# Main discovery + extraction
# -----------------------------
async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default=DEFAULT_URL)
    ap.add_argument("--out", default="out_discovery")
    ap.add_argument("--output", default="scraped-elminassa-data.full.json")
    ap.add_argument("--scroll", type=int, default=80)
    ap.add_argument("--max", type=int, default=3000)
    ap.add_argument("--stall", type=int, default=4, help="stop after this many no-growth steps")
    ap.add_argument("--details", action="store_true", help="hydrate all ads via /adDetails/<id>")
    ap.add_argument("--concurrency", type=int, default=6)
    ap.add_argument("--headful", action="store_true")
    ap.add_argument("--debug", action="store_true")
    args, unknown = ap.parse_known_args() # Use parse_known_args to ignore Colab's arguments

    out_dir = Path(args.out)
    out_dir.mkdir(exist_ok=True)

    user_agent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

    # Store best raw listing object by id
    by_id: Dict[str, Dict[str, Any]] = {}

    # To avoid overwriting same URL file
    url_count: Dict[str, int] = {}

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=not args.headful)
        page = await browser.new_page(viewport={"width": 1920, "height": 1080}, user_agent=user_agent)

        async def on_response(resp):
            try:
                # Keep the "discovery method": capture JSON from all responses
                data = await try_read_json(resp)
                if data is None:
                    # still log XHR/fetch in debug mode
                    if args.debug and resp.request.resource_type in ("xhr", "fetch"):
                        ct = (resp.headers.get("content-type") or "").lower()
                        print(f"[XHR] {resp.status} {resp.url} (ct={ct})")
                    return

                # Save every JSON payload to disk (like your script)
                u = resp.url
                url_count[u] = url_count.get(u, 0) + 1
                fname = out_dir / f"{safe_name(u)}__n{url_count[u]}.json"
                fname.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

                if args.debug:
                    print(f"[JSON] {resp.status} {u} -> {fname}")

                # Extract listings from this JSON and merge into by_id
                hits = collect_listings_deep(data)
                for h in hits:
                    _id = normalize_id(h)
                    if not _id:
                        continue

                    if _id not in by_id:
                        by_id[_id] = h
                    else:
                        # merge payloads, prefer richer objects
                        by_id[_id] = deep_merge(by_id[_id], h)

            except Exception:
                return

        page.on("response", on_response)

        print(f"Opening: {args.url}")
        await page.goto(args.url, wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_timeout(6000)

        prev = 0
        stalls = 0

        for step in range(1, args.scroll + 1):
            # scroll to trigger lazy loads
            await page.mouse.wheel(0, 2800)
            await page.wait_for_timeout(1400)

            # try load more
            clicked = await click_load_more(page)
            if clicked:
                await page.wait_for_timeout(2200)

            now = len(by_id)
            delta = now - prev

            if now >= args.max:
                print(f"✅ Reached max={args.max}")
                break

            if delta > 0:
                print(f"📈 Step {step}/{args.scroll}: +{delta} ads (total={now})")
                stalls = 0
                prev = now
            else:
                stalls += 1
                print(f"⏳ Step {step}/{args.scroll}: no new ads (stall {stalls}/{args.stall})")
                if stalls >= args.stall:
                    break

        print(f"\n📦 Unique ads captured from discovery JSON: {len(by_id)}")

        # Optional: hydrate ALL ads (this is the closest to "extract everything")
        if args.details and by_id:
            ids = list(by_id.keys())
            print(f"🧩 Hydrating {len(ids)} ads via /adDetails/<id> (concurrency={args.concurrency}) ...")

            async def hydrate_one(_id: str):
                full = await hydrate_from_details(browser, _id, user_agent, out_dir)
                if full:
                    by_id[_id] = deep_merge(by_id.get(_id, {}), full)

            await run_pool(ids, args.concurrency, hydrate_one)
            print("✅ Hydration done.")

        await browser.close()

    # Build final output: raw merged payload + coordinates sanity
    collection: List[Dict[str, Any]] = []
    uniq_coords = set()

    for _id, raw in by_id.items():
        raw = dict(raw)
        if normalize_id(raw) is None:
            raw["_id"] = _id

        coords, is_real = extract_coordinates(raw)
        if coords is None:
            coords = DEFAULT_URL  # won't be used; but keep structure consistent
            is_real = False
        else:
            uniq_coords.add(f"{coords[0]},{coords[1]}")

        # Attach normalized geometry if missing (without destroying raw)
        if not isinstance(raw.get("geometry"), dict) or not isinstance(raw["geometry"].get("coordinates"), list):
            raw["geometry"] = {"type": "Point", "coordinates": [coords[0], coords[1]]}
        raw["isRealLocation"] = bool(is_real)

        collection.append(raw)

    out = {"collection": collection}
    Path(args.output).write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\n✅ Saved: {args.output}")
    print(f"📍 Unique coordinate pairs (sanity): {len(uniq_coords)}")
    print(f"🗂️  Raw JSON payloads saved in: {Path(args.out).resolve()}")


if __name__ == "__main__":
    # asyncio.run(main())  # This caused the RuntimeError in Colab
    await main() # Corrected for Colab environment