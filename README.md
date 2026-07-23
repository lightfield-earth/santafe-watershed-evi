# Upper Santa Fe River Watershed — Vegetation Vigor

The Enhanced Vegetation Index (EVI) across the upper Santa Fe River watershed, derived from a
single cloud-free Sentinel-2 scene and composited over Copernicus GLO-30 shaded relief.

**[santafe-evi.lightfield.earth](https://santafe-evi.lightfield.earth/)**

---

## What it shows

The **Enhanced Vegetation Index** quantifies how much living, photosynthesizing plant matter a
patch of ground carries. It is computed per pixel from Sentinel-2 surface reflectance and displayed
at the sensor's native **10 m** resolution.

The mapped area is **HUC12 130202010102, "Headwaters Santa Fe River"** — the 140.7 km² municipal
watershed containing the Nichols and McClure reservoirs. A single frame spans both ends of the
gradient, from the arid corridor running down through Santa Fe to the forested headwaters at the
crest.

## Controls

| Control | | Effect |
|---|---|---|
| **Terrain strength** | | Weight of the shaded relief in the composite. At zero the relief is absent and the index is shown alone. |
| **Roads and road labels** | <kbd>r</kbd> | Off by default, as roads occlude the data. Water, terrain and place labels are shown in either state. |
| **Reset view** | <kbd>b</kbd> | Returns to the published camera position. |
| **☰** | | Collapses the control panels. |

Zoom, compass and fullscreen controls are grouped at the upper left. The camera is encoded in the
URL as a `#zoom/lat/lng` fragment, so any view can be shared as a link; a fragment supplied on load
takes precedence over the published camera position.

Terrain strength and road visibility are the only adjustable parameters. The transfer function,
color ramp, and compositing method are fixed.

---

## Terrain, illumination, and north-facing slopes

The index is not corrected for the shape of the ground, and it is worth knowing what that means
before reading too much into the steep parts of the basin.

A satellite measures light reflected back toward it, and how much light a patch of ground receives
depends on the angle between that surface and the sun. Two slopes carrying identical vegetation
return different amounts of light if they face different directions. EVI is a ratio between
spectral bands, which cancels much of this — a shaded slope is darker in every band at once, and
dividing one band by another removes a good deal of the common factor — but it does not cancel all
of it. On steep, north-facing ground, EVI is expected to read somewhat low, measuring the
illumination as much as the vegetation.

This scene was acquired with the sun about 70° above the horizon, in the southeast. That is high,
and high sun is forgiving: most of the watershed is lit close to straight on, and genuine shadow is
confined to the steepest north-facing terrain. This is a caution for the steep ground, not a
correction the whole map needs. The magnitude has not been measured for this watershed.

The shaded relief is useful here beyond its appearance. It is derived from a digital elevation
model, independently of the imagery, so it shows where the ground is steep and which way it faces —
which is exactly where the caveat above applies. Raising terrain strength brings out the rugged
parts of the basin, and flat ground carries no such bias. One caution in reading it: the relief is
lit from a fixed direction chosen for legibility, not from the sun's actual position at
acquisition, so it is a picture of steepness and aspect rather than of what was in shadow that
morning.

---

## Data provenance

| | |
|---|---|
| Scene | `S2C_13SDV_20260701_0_L2A` |
| Acquired | 1 July 2026, 17:54 UTC |
| Cloud cover | 0.13% scene-wide |
| Area of interest | HUC12 130202010102, USGS Watershed Boundary Dataset |
| CRS / resolution | EPSG:32613, 10 m (scene-native; the source is not resampled) |
| Valid pixels in basin | 99.1% |

**Limitations to consider before drawing conclusions:**

- **A single scene from a single day.** This is a snapshot, not a time series or a seasonal
  composite. Mid-monsoon greenness on 1 July 2026 is not representative of the annual mean.
- **A narrow western sliver is absent.** The area of interest straddles MGRS tiles, and 13SDV
  covers 99.1% of it. The remainder is left as nodata rather than mosaicked from a second tile
  acquired on a different date, and so appears as a gap rather than a seam.
- **Topographic shadow is retained, not masked.** The Sentinel-2 L2A Scene Classification Layer
  flags dark north-facing slopes as "dark area" (class 2); removing them would excise much of the
  terrain this map is intended to show.
- **EVI saturates over dense canopy.** Differences among the darkest greens are less meaningful
  than differences across the mid-range.

## Sources and license

- **Imagery** — Sentinel-2 L2A © ESA, obtained via Element 84 Earth Search. Free and open under the
  [Copernicus data policy](https://sentinels.copernicus.eu/web/sentinel/terms-conditions).
- **Watershed boundary** — USGS Watershed Boundary Dataset (public domain).
- **Terrain** — hillshade derived from the Copernicus GLO-30 DEM.
- **Basemap** — © OpenMapTiles © OpenStreetMap contributors.
