"""
Build a small offline BORIS BRW snapshot for Ratingen.

Source: Open.NRW / BORISplus.NRW Bodenrichtwerte (DL-DE Zero 2.0).
Run manually with: py scripts/build_boris_ratingen.py
Requires: pyshp, requests
"""

from __future__ import annotations

import json
import os
import tempfile
import zipfile
from datetime import date
from pathlib import Path

import requests
import shapefile

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "boris-ratingen.js"
CACHE = Path(tempfile.gettempdir()) / "vw-boris-ratingen"

# Only baureifes Land with residential or mixed use belongs in this tool.
# Agricultural/forest zones lead to BRWs of a few €/m², which are useless for
# the Sachwertverfahren implemented here.
RESIDENTIAL_NUTA = {"W", "WS", "WR", "WA", "WB", "M", "MD", "MDW", "MI", "MU"}
NUTA_LABELS = {
    "W": "Wohnbaufläche",
    "WS": "Kleinsiedlungsgebiet",
    "WR": "Reines Wohngebiet",
    "WA": "Allgemeines Wohngebiet",
    "WB": "Besonderes Wohngebiet",
    "M": "Gemischte Baufläche",
    "MD": "Dorfgebiet",
    "MDW": "Dörfliches Wohngebiet",
    "MI": "Mischgebiet",
    "MU": "Urbanes Gebiet",
}

SOURCES = [
    {
        "year": 2026,
        "url": "https://www.opengeodata.nrw.de/produkte/infrastruktur_bauen_wohnen/boris/BRW/BRW_EPSG25832_Shape.zip",
    }
] + [
    {
        "year": year,
        "url": f"https://www.opengeodata.nrw.de/produkte/infrastruktur_bauen_wohnen/boris/BRW/BRW_{year}_EPSG25832_Shape.zip",
    }
    for year in range(2025, 2019, -1)
]


def clean(value) -> str:
    return "" if value is None else str(value).strip()


def number(value):
    text = clean(value).replace(",", ".")
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def download(url: str, target: Path) -> None:
    if target.exists() and target.stat().st_size > 1_000_000:
        print(f"Using cached {target.name}")
        return
    print(f"Downloading {url}")
    response = requests.get(url, timeout=180, stream=True)
    response.raise_for_status()
    target.parent.mkdir(parents=True, exist_ok=True)
    with open(target, "wb") as file:
        for chunk in response.iter_content(1024 * 1024):
            if chunk:
                file.write(chunk)


def extract(zip_path: Path, target: Path) -> None:
    marker = target / ".extracted"
    if marker.exists():
        return
    target.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path) as archive:
        archive.extractall(target)
    marker.write_text("ok", encoding="utf-8")


def find_shapefile(folder: Path) -> Path:
    matches = sorted(folder.rglob("*.shp"))
    if not matches:
        raise RuntimeError(f"No shapefile found in {folder}")
    return matches[0]


def build() -> None:
    zones = []

    for source in SOURCES:
        year = source["year"]
        zip_path = CACHE / f"brw-{year}.zip"
        extract_path = CACHE / f"brw-{year}"
        download(source["url"], zip_path)
        extract(zip_path, extract_path)

        reader = shapefile.Reader(str(find_shapefile(extract_path)), encoding="utf-8", encodingErrors="replace")
        count = 0
        for record in reader.iterRecords():
            raw = record.as_dict()
            if clean(raw.get("GENA")).casefold() != "ratingen":
                continue

            brw = number(raw.get("BRW"))
            if brw is None or brw <= 0:
                continue

            entw = clean(raw.get("ENTW"))
            nuta_codes = [code.strip() for code in clean(raw.get("NUTA")).split("/") if code.strip()]
            if entw != "B" or not any(code in RESIDENTIAL_NUTA for code in nuta_codes):
                continue

            stag = clean(raw.get("STAG")) or f"{year}-01-01"
            record_year = int(stag[:4]) if stag[:4].isdigit() else year

            zones.append(
                {
                    "jahr": record_year,
                    "stag": stag,
                    "wnum": clean(raw.get("WNUM")),
                    "brw": brw,
                    "plz": clean(raw.get("PLZ")),
                    "gemarkung": clean(raw.get("GEMA")) or "Ratingen",
                    "ortsteil": clean(raw.get("ORTST")),
                    "nutzung": "/".join(nuta_codes),
                    "nutzungLabel": "/".join(NUTA_LABELS.get(code, code) for code in nuta_codes),
                    "x": number(raw.get("YWERT")),
                    "y": number(raw.get("XWERT")),
                }
            )
            count += 1
        print(f"{year}: {count} Ratingen BRW zones")

    unique = {}
    for zone in zones:
        key = (zone["jahr"], zone["wnum"])
        if key not in unique:
            unique[key] = zone

    ordered = sorted(unique.values(), key=lambda z: (-z["jahr"], z["brw"], z["wnum"]))

    payload = {
        "meta": {
            "source": "BORISplus.NRW / Open.NRW, Bodenrichtwerte NRW",
            "license": "Datenlizenz Deutschland - Zero - Version 2.0",
            "generated": date.today().isoformat(),
            "years": sorted({z["jahr"] for z in ordered}, reverse=True),
            "count": len(ordered),
            "filter": "ENTW=B and NUTA in " + "/".join(sorted(RESIDENTIAL_NUTA)),
            "sources": [s["url"] for s in SOURCES],
        },
        "zones": ordered,
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        "/* Generated by scripts/build_boris_ratingen.py. Do not edit manually. */\n"
        "window.VW_BORIS = "
        + json.dumps(payload, ensure_ascii=False, indent=2)
        + ";\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(ordered)} zones to {OUTPUT}")


if __name__ == "__main__":
    build()
