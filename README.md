# santafe-watershed-evi

Vegetation vigor across the **upper Santa Fe River watershed**, measured from a single cloud-free
Sentinel-2 scene and draped over Copernicus GLO-30 shaded relief.

An interactive map. Two things are adjustable — terrain strength and road visibility — and
everything else is frozen at publish time, deliberately.

> **Generated. Do not hand-edit `index.html`, `colormap.js`, `style.json`, or `data/`.**
> See [Regenerating](#regenerating) below.

---

## What it shows

The **Enhanced Vegetation Index (EVI)** measures how much living, photosynthesizing plant matter a
patch of ground carries. It is computed per-pixel from Sentinel-2 surface reflectance and shown at
the satellite's native **10 m** resolution — every pixel on screen is a real measurement, not an
interpolation.

The area is **HUC12 `130202010102`, "Headwaters Santa Fe River"** — the 140.7 km² municipal
watershed encompassing Nichols and McClure reservoirs. One frame holds both ends of the gradient:
the dry corridor running down through Santa Fe, and the forested headwaters at the crest. That
contrast is what the map is built to show.

Colors run **warm → green** as vigor rises. The ramp is *not* isoluminant: it also gets lighter
toward the green end, which is what makes boundaries visible (see [Why it looks the way it
does](#why-it-looks-the-way-it-does)).

## Controls

| control | | what it does |
|---|---|---|
| **Terrain strength** | | How hard the shaded relief is pressed into the color. At 0 the terrain disappears and you see the index alone. |
| **Roads & road labels** | <kbd>r</kbd> | Off by default — roads sit on top of the data. Water, terrain and place labels stay either way, so you keep your bearings. |
| **Reset view** | <kbd>b</kbd> | Eases back to the published camera. |
| **☰** | | Hides the panels to reveal more map. |

Zoom, compass and fullscreen sit in the top-left stack. The URL carries the camera as a
`#zoom/lat/lng` hash, so any view you navigate to is a shareable link — and a link wins over the
published camera on load.

---

## Why it looks the way it does

Two decisions here were settled by measurement rather than taste, in the experiment that produced
this map ([`../../evi-perceptual-experiment`](../../evi-perceptual-experiment), `docs/FINDINGS.md`).
Both look like odd choices until you know why:

**1. The palette is not isoluminant, and the tilt has a sign.** Human edge detection is
overwhelmingly luminance-driven, so a constant-lightness ramp removes the channel vision uses to
find boundaries. On this basin, **73% of the strongest EVI edges sit in the flattest third of the
map**, where there is no terrain shading to borrow an edge from — the map read as legible while
most of its real boundaries were invisible. The ramp therefore brightens as EVI rises. The
direction matters too: terrain compositing *scales* lightness, so the shading swing a pixel gets is
proportional to the lightness it already has. All the relief in this watershed is at high EVI, so
seating that end light is what buys the headwaters their structure.

**2. Terrain is a plain multiply.** A bespoke Oklab lightness-only composite was built and measured
against MapLibre's stock multiply. With lightness properly matched, they differ by about **one
just-noticeable-difference on a third of the map** — below the threshold where anyone could tell.
The stock path ships. One practical consequence: this site carries no hillshade texture at all,
since terrain comes from hosted raster tiles, which halves the payload.

---

## What is frozen, and what is not

| | |
|---|---|
| **Live for the viewer** | terrain strength, road visibility, camera |
| **Frozen at publish** | transfer function, color ramp and binning, palette chroma, lightness tilt ΔL\*, palette lightness L\*, compositing mode, opening camera |

The exact frozen state, the sRGB chroma ceiling it was validated against, and the source commit are
recorded in **`PUBLISH.json`**. That file is the answer to "what settings is this map actually
showing?"

Frozen values are also readable as a `CONFIG` literal at the top of the module in `index.html` —
`colormap.js` ships verbatim rather than having its lookup table baked into the page, so the
derivation from settings to pixels stays inspectable.

---

## Files

| path | |
|---|---|
| `index.html` | The viewer. Generated — the `CONFIG` literal at the top is the frozen state. |
| `colormap.js` | Transfer functions and the Oklab color ramp. Copied verbatim from the experiment; single source of truth. |
| `style.json` | Basemap cartography (LightField OMT, ecoregion layers stripped). Generated. |
| `data/evi_data.png` | EVI packed as a big-endian uint16 over a fixed [−1, 1] range in R,G; B carries validity. Decoded in a fragment shader. |
| `data/transfer_functions.json` | Value → [0,1] mappings, including the empirical CDF knots. |
| `data/assets.json` | Georeferencing for the data quad, plus the encoding range. |
| `PUBLISH.json` | The frozen state, chroma ceiling, source commit, timestamp. |
| `README.md`, `.gitignore` | Yours. Written once and never overwritten by the generator. |

Total payload is about **4.5 MB**, essentially all of it `data/evi_data.png`. There is no tile
pyramid: at 41 × 26 km the whole basin is one 4304 × 2760 texture, and a pyramid would be ceremony.

## Run locally

The basemap and hillshade tiles are hosted, so any static file server works:

```sh
python3 -m http.server 8000
# then open http://localhost:8000/index.html
```

## Regenerating

This directory is built by the tuning harness in
[`../../evi-perceptual-experiment`](../../evi-perceptual-experiment):

```sh
# in that repo, serve the harness and tune until you like it
python3 -m http.server 8000
open "http://localhost:8000/harness.html?tune=1"

# press "Publish current view", then
pbpaste | node build_published.mjs
```

The Publish button captures every control **plus the live camera**, so you publish the view you are
looking at rather than a transcription of it. The build validates that state — it refuses a camera
outside the data footprint, a chroma above the sRGB ceiling, or a capture made in Oklab compositing
mode — and rewrites everything except `README.md`, `.gitignore`, `CNAME` and `.git/`. Hand edits to
those survive every republish. Delete one to have it regenerated.

Verify a rebuild with the experiment's smoke test, which catches the load-time failures that
present as a blank map with no console error:

```sh
node test_harness.mjs ../published-maps/santafe-watershed-evi/index.html
```

## Deploying

Static hosting, no build step. For GitHub Pages, add a `CNAME` file with the target subdomain,
point a DNS CNAME record at the Pages host, and enable Pages on the default branch at root — the
same arrangement as the other maps in `published-maps/`.

---

## Data provenance

| | |
|---|---|
| Scene | `S2C_13SDV_20260701_0_L2A` |
| Acquired | 1 July 2026, 17:54 UTC |
| Cloud cover | 0.13% scene-wide |
| AOI | HUC12 `130202010102`, USGS Watershed Boundary Dataset |
| CRS / resolution | EPSG:32613, 10 m (scene-native; source is not resampled) |
| Valid pixels in basin | 99.1% |

**Caveats worth knowing before you read anything into it:**

- **One scene, one day.** This is a snapshot, not a time series or a seasonal composite. Mid-monsoon
  greenness on 1 July 2026 is not the year's average.
- **A thin western sliver is missing.** The AOI straddles MGRS tiles, and 13SDV covers 99.1%
  of it. The remainder is left as nodata rather than mosaicked from a second tile acquired on a
  different date, so it renders as a gap rather than as a seam.
- **Topographic shadow is kept, not masked.** Sentinel-2's scene classification flags dark
  north-facing slopes as "dark area"; dropping those would punch holes in exactly the terrain this
  map is about. Expect north aspects to read slightly darker.
- **EVI saturates over dense canopy.** Differences among the darkest greens are less meaningful than
  differences across the mid-range.

## Sources & license

- **Imagery** — Sentinel-2 L2A © ESA, via Element 84 Earth Search. Free and open under the
  [Copernicus data policy](https://sentinels.copernicus.eu/web/sentinel/terms-conditions).
- **Watershed boundary** — USGS Watershed Boundary Dataset (public domain).
- **Terrain** — hillshade derived from the Copernicus GLO-30 DEM.
- **Basemap** — © OpenMapTiles © OpenStreetMap contributors.
