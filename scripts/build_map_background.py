"""Build a local OpenStreetMap background image for the offline BRW overview.

The wizard must work from file:// without live tile requests, so the map is
downloaded once at development time and bundled as a normal relative asset.
The geographic extent is derived from the BORIS snapshot (EPSG:25832) and
matches the SVG viewBox aspect ratio used in app.js.

Run with: py scripts\\build_map_background.py
Attribution: (c) OpenStreetMap contributors, ODbL (shown in the UI).
"""

import io
import math
import os
import urllib.request

from PIL import Image

# Extent of all Ratingen BRW representative points (EPSG:25832 / UTM 32N).
MIN_X, MAX_X = 347371.0, 356925.0
MIN_Y, MAX_Y = 5683667.0, 5692434.0

VIEW_W, VIEW_H = 720, 420
ZOOM = 13
TILE = 256
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "ratingen-basemap.png")
UA = "verkehrswert-ratingen-static-map/1.0 (offline teaching demo)"


def utm32n_to_wgs84(easting, northing):
    """Inverse transverse Mercator, EPSG:25832 (UTM zone 32N, WGS84)."""
    a = 6378137.0
    e2 = 0.00669437999014
    e1 = (1.0 - math.sqrt(1.0 - e2)) / (1.0 + math.sqrt(1.0 - e2))
    k0 = 0.9996
    lon0 = math.radians(9.0)

    x = easting - 500000.0
    y = northing
    m = y / k0
    mu = m / (a * (1.0 - e2 / 4.0 - 3.0 * e2**2 / 64.0 - 5.0 * e2**3 / 256.0))
    phi1 = (mu
            + (3.0 * e1 / 2.0 - 27.0 * e1**3 / 32.0) * math.sin(2 * mu)
            + (21.0 * e1**2 / 16.0 - 55.0 * e1**4 / 32.0) * math.sin(4 * mu)
            + (151.0 * e1**3 / 96.0) * math.sin(6 * mu)
            + (1097.0 * e1**4 / 512.0) * math.sin(8 * mu))
    c1 = e2 * math.cos(phi1) ** 2
    t1 = math.tan(phi1) ** 2
    n1 = a / math.sqrt(1.0 - e2 * math.sin(phi1) ** 2)
    r1 = a * (1.0 - e2) / (1.0 - e2 * math.sin(phi1) ** 2) ** 1.5
    d = x / (n1 * k0)
    phi = phi1 - (n1 * math.tan(phi1) / r1) * (
        d**2 / 2.0
        - (5.0 + 3.0 * t1 + 10.0 * c1 - 4.0 * c1**2 - 9.0 * e1**2) * d**4 / 24.0
        + (61.0 + 90.0 * t1 + 298.0 * c1 + 45.0 * t1**2
           - 252.0 * e1**2 - 3.0 * c1**2) * d**6 / 720.0)
    lon = lon0 + (d
                  - (1.0 + 2.0 * t1 + c1) * d**3 / 6.0
                  + (5.0 - 2.0 * c1 + 28.0 * t1 - 3.0 * c1**2
                     + 8.0 * e1**2 + 24.0 * t1**2) * d**5 / 120.0) / math.cos(phi1)
    return math.degrees(lon), math.degrees(phi)


def mercator(lon, lat):
    """Normalised Web Mercator coordinates in [0, 1]."""
    x = (lon + 180.0) / 360.0
    y = (1.0 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2.0
    return x, y


def main():
    pad_x = (MAX_X - MIN_X) * 0.06
    pad_y = (MAX_Y - MIN_Y) * 0.08
    min_x, max_x = MIN_X - pad_x, MAX_X + pad_x
    min_y, max_y = MIN_Y - pad_y, MAX_Y + pad_y

    # Match the SVG aspect ratio so no stretching is needed in app.js.
    height = max_y - min_y
    width = height * VIEW_W / VIEW_H
    centre = (min_x + max_x) / 2.0
    min_x, max_x = centre - width / 2.0, centre + width / 2.0

    west, north = utm32n_to_wgs84(min_x, max_y)
    east, south = utm32n_to_wgs84(max_x, min_y)
    left_x, top_y = mercator(west, north)
    right_x, bottom_y = mercator(east, south)

    scale = 2.0**ZOOM
    tx0, ty0 = left_x * scale, top_y * scale
    tx1, ty1 = right_x * scale, bottom_y * scale
    x_start, x_end = math.floor(tx0), math.floor(tx1)
    y_start, y_end = math.floor(ty0), math.floor(ty1)

    cols, rows = x_end - x_start + 1, y_end - y_start + 1
    canvas = Image.new("RGB", (cols * TILE, rows * TILE), "#ffffff")
    for ty in range(y_start, y_end + 1):
        for tx in range(x_start, x_end + 1):
            # The main openstreetmap.org tile host serves a 256x256 "access
            # blocked" PNG with HTTP 200 in some environments. The German
            # community mirror serves the same standard OSM style correctly.
            url = f"https://tile.openstreetmap.de/{ZOOM}/{tx}/{ty}.png"
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as resp:
                tile = Image.open(io.BytesIO(resp.read())).convert("RGB")
            canvas.paste(tile, ((tx - x_start) * TILE, (ty - y_start) * TILE))

    crop_box = (
        round((tx0 - x_start) * TILE),
        round((ty0 - y_start) * TILE),
        round((tx1 - x_start) * TILE),
        round((ty1 - y_start) * TILE),
    )
    image = canvas.crop(crop_box)
    image = image.resize((VIEW_W * 2, VIEW_H * 2), Image.LANCZOS)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    image.save(OUT, "PNG", optimize=True)
    print(f"Wrote {OUT} ({cols}x{rows} tiles, {image.width}x{image.height} px)")
    print(f"Extent WGS84: {west:.6f},{south:.6f} - {east:.6f},{north:.6f}")


if __name__ == "__main__":
    main()
