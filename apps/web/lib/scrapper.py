#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
elminassa.com scraper (v2) - Python/Playwright
- Fixes "all ads same coordinates" by reading geometry from XHR JSON (not DOM guessing)
- Loads more by scrolling + clicking "Load more" until no growth
- Hydrates missing coords from /adDetails/<id> (concurrency-limited)

Usage:
  python scrape_elminassa_v2.py
  python scrape_elminassa_v2.py --output scraped-elminassa.json
  python scrape_elminassa_v2.py --url "https://www.elminassa.com/app.html?v=20250405" --scroll 80 --max 2000
  python scrape_elminassa_v2.py --debug
"""

import argparse
import asyncio
import json
import re
from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional, Tuple

# Install playwright and its browsers
!pip install playwright
!playwright install
# Install system dependencies for playwright. This is often needed in environments like Colab
!apt-get install -y libxcomposite1 libgtk-3-0 libatk1.0-0

from playwright.async_api import async_playwright, Page, Browser

DEFAULT_CENTER = (-15.9582, 18.0735)  # (lng, lat) Nouakchott-ish center


def log(msg: str) -> None:
    print(msg, flush=True)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("--url", default="https://www.elminassa.com/app.html?v=20250405")
    p.add_argument("--output", default="scraped-elminassa-data.json")
    p.add_argument("--max", type=int, default=1500)
    p.add_argument("--scroll", type=int, default=60)
    p.add_argument("--debug", action="store_true")
    p.add_argument("--headful", action="store_true")
    p.add_argument("--no-details", action="store_true", help="Disable hydration from adDetails/<id>")
    p.add_argument("--concurrency", type=int, default=6)
    # Use parse_known_args to ignore arguments passed by the Colab kernel
    args, unknown = p.parse_known_args()
    return args


async def try_read_json(resp) -> Optional[Any]:
    # Some endpoints return JSON with wrong content-type.
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


def normalize_id(o: Dict[str, Any]) -> Optional[str]:
    _id = o.get("_id") or o.get("id")
    if isinstance(_id, str) and _id.strip():
        return _id.strip()
    return None


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
    return (has_id and (has_title or has_price or has_geo)) or (has_title and has_geo)


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


def extract_media(v: Any) -> List[str]:
    if isinstance(v, list):
        return [s for s in v if isinstance(s, str) and s.startswith("http")]
    if isinstance(v, str) and v.startswith("http"):
        return [v]
    return []


def map_contract_type(item: Dict[str, Any]) -> str:
    v = str(item.get("contractType") or item.get("contract_type") or item.get("type") or item.get("op_type") or "").lower()
    return "rent" if ("rent" in v or "location" in v) else "sale"


def clean_title(t: Any) -> str:
    s = t.strip() if isinstance(t, str) else "Annonce sans titre"
    s = re.sub(r"\d+\s*/\s*\d+", " ", s)         # remove pager 1/3
    s = re.sub(r"^\d[\d\s]*\s*MRU\s*", "", s, flags=re.I)  # remove leading price
    s = re.sub(r"\s+", " ", s).strip()
    return s or "Annonce sans titre"


def extract_coordinates(item: Dict[str, Any]) -> Tuple[Optional[Tuple[float, float]], bool]:
    """
    Returns ((lng, lat) or None, is_real)
    Also auto-fixes swapped order using Nouakchott-ish heuristics:
      lat ~ [10,25], lng ~ [-25,-5]
    """
    lng = lat = None

    geo = item.get("geometry", {}).get("coordinates") if isinstance(item.get("geometry"), dict) else None
    if isinstance(geo, list) and len(geo) >= 2:
        a, b = geo[0], geo[1]
        try:
            lng, lat = float(a), float(b)
        except Exception:
            lng = lat = None
    elif isinstance(item.get("coordinates"), list) and len(item["coordinates"]) >= 2:
        a, b = item["coordinates"][0], item["coordinates"][1]
        try:
            lng, lat = float(a), float(b)
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

    # treat (0,0) or near-zero as missing for this use case
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


@dataclass
class ScrapedListing:
    publisher: Dict[str, Any]
    photos: List[str]
    videos: List[str]
    sold: bool
    deleted: bool
    tobedeleted: bool
    visible: bool
    visitCount: int
    lot: List[str]
    isRealLocation: bool
    subPolygon: List[Any]
    subPolygonColor: str
    _id: Optional[str]
    clientName: str
    clientPhoneNumber: str
    title: str
    description: str
    category: str
    subCategory: str
    region: str
    contractType: str  # sale|rent
    professional: bool
    geometry: Dict[str, Any]  # {"type":"Point","coordinates":[lng,lat]}
    publicationDate: str
    price: int
    lotissement: Optional[str] = None
    index: Optional[str] = None
    ilotSize: Optional[str] = None
    polygoneArea: Optional[str] = None
    elevation: Optional[str] = None
    sidesLength: Optional[str] = None
    matterportLink: Optional[str] = None


def to_scraped_listing(item: Dict[str, Any]) -> ScrapedListing:
    _id = normalize_id(item)

    # price
    price = 0
    if isinstance(item.get("price"), (int, float)):
        price = int(item["price"])
    elif isinstance(item.get("price"), str):
        m = re.search(r"(\d[\d\s]*\.?[\d]*)", item["price"])
        price = int(m.group(1).replace(" ", "")) if m else 0
    if price <= 0:
        price = 1

    coords, is_real = extract_coordinates(item)
    if coords is None:
        coords = DEFAULT_CENTER
        is_real_loc = False
    else:
        is_real_loc = True

    photos = (
        extract_media(item.get("photos")) or
        extract_media(item.get("images")) or
        extract_media(item.get("photo")) or
        extract_media(item.get("image")) or
        []
    )
    videos = extract_media(item.get("videos")) or []

    pub = item.get("publisher") if isinstance(item.get("publisher"), dict) else {}
    publisher = {
        "userId": pub.get("userId"),
        "name": pub.get("name") or "elminassa.com",
        "phoneNumber": pub.get("phoneNumber") or "48036802",
        "email": pub.get("email") if pub.get("email") else None,
    }

    visit_count = item.get("visitCount") or item.get("visit_count") or item.get("views") or 0
    try:
        visit_count = int(visit_count)
    except Exception:
        visit_count = 0

    lot = item.get("lot")
    if isinstance(lot, list):
        lot_list = [str(x) for x in lot]
    elif lot is not None:
        lot_list = [str(lot)]
    else:
        lot_list = []

    return ScrapedListing(
        publisher=publisher,
        photos=photos,
        videos=videos,
        sold=bool(item.get("sold", False)),
        deleted=bool(item.get("deleted", False)),
        tobedeleted=bool(item.get("tobedeleted", False)),
        visible=item.get("visible", True) is not False,
        visitCount=visit_count,
        lot=lot_list,
        isRealLocation=is_real_loc and (item.get("isRealLocation", True) is not False) and (item.get("is_real_location", True) is not False),
        subPolygon=item.get("subPolygon") or item.get("sub_polygon") or [],
        subPolygonColor=item.get("subPolygonColor") or item.get("sub_polygon_color") or "",
        _id=_id,
        clientName=item.get("clientName") or item.get("client_name") or item.get("ownerName") or item.get("owner_name") or "",
        clientPhoneNumber=item.get("clientPhoneNumber") or item.get("client_phone_number") or item.get("phoneNumber") or item.get("phone_number") or "",
        title=clean_title(item.get("title")),
        description=item.get("description") or "",
        category=item.get("category") or "realEstate",
        subCategory=item.get("subCategory") or item.get("sub_category") or "land",
        region=item.get("region") or "tevragh-zeina",
        contractType=map_contract_type(item),
        professional=bool(item.get("professional", False)),
        geometry={"type": "Point", "coordinates": [coords[0], coords[1]]},
        publicationDate=item.get("publicationDate") or item.get("publication_date") or item.get("createdAt") or item.get("created_at") or "",
        price=price,
        lotissement=item.get("lotissement") or item.get("lotissement_name"),
        index=str(item.get("index") or item.get("index_number")) if (item.get("index") or item.get("index_number")) else None,
        ilotSize=item.get("ilotSize") or item.get("ilot_size") or item.get("ilot"),
        polygoneArea=item.get("polygoneArea") or item.get("polygone_area") or item.get("area") or item.get("surface"),
        elevation=item.get("elevation"),
        sidesLength=item.get("sidesLength") or item.get("sides_length") or item.get("dimensions"),
        matterportLink=item.get("matterportLink") or item.get("matterport_link") or item.get("matterport"),
    )


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


async def hydrate_from_details(browser: Browser, ad_id: str, user_agent: str) -> Optional[Dict[str, Any]]:
    url = f"https://www.elminassa.com/adDetails/{ad_id}"
    page = await browser.new_page(viewport={"width": 1400, "height": 900}, user_agent=user_agent)

    found: List[Dict[str, Any]] = []

    async def on_resp(resp):
        try:
            if resp.request.resource_type not in ("xhr", "fetch"):
                return
            j = await try_read_json(resp)
            if not j:
                return
            hits = collect_listings_deep(j)
            for h in hits:
                hid = normalize_id(h)
                if hid == ad_id:
                    found.append(h)
        except Exception:
            return

    page.on("response", on_resp)

    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_timeout(3500)

        # Also check window globals (sometimes data injected)
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

        # choose best (has geometry)
        for h in found:
            geo = h.get("geometry")
            if isinstance(geo, dict) and isinstance(geo.get("coordinates"), list) and len(geo["coordinates"]) >= 2:
                return h
        return found[0] if found else None
    except Exception:
        return None
    finally:
        await page.close()


async def main():
    args = parse_args()

    user_agent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    hydrate_details = not args.no_details

    log("\n🕷️  elminassa scraper (Python v2)")
    log(f"URL: {args.url}")
    log(f"Output: {args.output}")
    log(f"max={args.max} scroll={args.scroll} details={'ON' if hydrate_details else 'OFF'} concurrency={args.concurrency}\n")

    by_id: Dict[str, Dict[str, Any]] = {}
    debug_samples: List[Dict[str, Any]] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=not args.headful)
        page = await browser.new_page(viewport={"width": 1920, "height": 1080}, user_agent=user_agent)

        async def on_response(resp):
            try:
                if resp.request.resource_type not in ("xhr", "fetch"):
                    return
                j = await try_read_json(resp)
                if not j:
                    return
                hits = collect_listings_deep(j)
                if not hits:
                    return

                if args.debug and len(debug_samples) < 200:
                    debug_samples.append({"url": resp.url, "sampleKeys": list(hits[0].keys()) if isinstance(hits[0], dict) else []})

                for h in hits:
                    _id = normalize_id(h)
                    if not _id:
                        continue

                    if _id not in by_id:
                        by_id[_id] = h
                    else:
                        prev = by_id[_id]
                        prev_has_geo = isinstance(prev.get("geometry"), dict) and isinstance(prev["geometry"].get("coordinates"), list)
                        new_has_geo = isinstance(h.get("geometry"), dict) and isinstance(h["geometry"].get("coordinates"), list)
                        if (not prev_has_geo) and new_has_geo:
                            by_id[_id] = h
            except Exception:
                return

        page.on("response", on_response)

        await page.goto(args.url, wait_until="networkidle", timeout=60000)
        await page.wait_for_timeout(4000)

        stalls = 0
        prev_count = 0

        for step in range(1, args.scroll + 1):
            await page.evaluate("() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })")
            await page.wait_for_timeout(1800)

            clicked = await click_load_more(page)
            if clicked:
                await page.wait_for_timeout(2200)

            now = len(by_id)
            if now >= args.max:
                log(f"✅ Reached max={args.max}")
                break

            delta = now - prev_count
            if delta > 0:
                log(f"📈 Step {step}/{args.scroll}: +{delta} ads (total: {now})")
                stalls = 0
                prev_count = now
            else:
                stalls += 1
                log(f"⏳ Step {step}/{args.scroll}: no new ads (stall {stalls}/4)")
                if stalls >= 4:
                    break

        if args.debug:
            with open("debug-api-samples.json", "w", encoding="utf-8") as f:
                json.dump(debug_samples, f, ensure_ascii=False, indent=2)
            log("🧪 Saved debug-api-samples.json")

        log(f"\n📦 Captured unique ads from XHR: {len(by_id)}")

        # Hydrate missing coords
        if hydrate_details and by_id:
            missing = []
            for _id, raw in by_id.items():
                coords, _ = extract_coordinates(raw)
                if coords is None:
                    missing.append(_id)

            if missing:
                log(f"🧭 Missing coords for {len(missing)} ads. Hydrating via details...")
                sem = asyncio.Semaphore(args.concurrency)

                async def hydrate_one(_id: str):
                    async with sem:
                        full = await hydrate_from_details(browser, _id, user_agent)
                        if full:
                            prev = by_id.get(_id) or {}
                            prev_has_geo = isinstance(prev.get("geometry"), dict) and isinstance(prev["geometry"].get("coordinates"), list)
                            new_has_geo = isinstance(full.get("geometry"), dict) and isinstance(full["geometry"].get("coordinates"), list)
                            if new_has_geo or not prev_has_geo:
                                by_id[_id] = full

                await asyncio.gather(*[hydrate_one(_id) for _id in missing])
                log("✅ Details hydration done.")
            else:
                log("✅ All captured ads already have coords.")

        # Transform
        final_listings = []
        for _id, raw in by_id.items():
            if normalize_id(raw) is None:
                raw = {**raw, "_id": _id}
            final_listings.append(to_scraped_listing(raw))

        final_listings = final_listings[: args.max]

        uniq_coords = len({",".join(map(str, x.geometry["coordinates"])) for x in final_listings})
        log(f"📍 Unique coordinate pairs: {uniq_coords}")

        out = {"collection": [asdict(x) for x in final_listings]}
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=2)

        log(f"✅ Saved {len(final_listings)} ads to: {args.output}\n")
        await browser.close()


if __name__ == "__main__":
    # asyncio.run(main()) # This caused the RuntimeError in Colab
    await main() # Corrected for Colab environment