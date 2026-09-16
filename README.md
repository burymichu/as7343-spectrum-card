# AS7343 Light Spectrum Card for Home Assistant

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/default)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Home Assistant custom Lovelace card for visualizing spectral data from the **ams-OSRAM AS7343 14-channel spectral sensor**.

Draws a smooth curve across channels using Catmull-Rom spline interpolation, with color fill matching the spectrum bands, hover/touch tooltips, peak wavelength indication, and summary metric tiles.

![AS7343 Spectrum Card](screenshot.png)

---

## Features

- **Smooth Spectral Curve**: Connects channel readings (405nm to 855nm) using Catmull-Rom spline interpolation.
- **Spectrum Color Gradient**: Color fill across violet, blue, cyan, green, yellow, orange, red, far-red, and NIR bands.
- **Interactive Tooltips**: Hover or tap any data point to inspect the channel name, wavelength (nm), and raw count.
- **Peak Wavelength**: Displays the channel with the highest reading in the header.
- **Summary Tiles**: Shows R:FR, B:R, estimated PPFD, and VIS Clear if matching sensors are available.
- **Auto-Discovery**: Detects AS7343 entities automatically or accepts manual entity mapping in YAML.

---

## Installation

### Method 1: Via HACS (Recommended)

1. Open **HACS** in Home Assistant.
2. Click the three dots in the top right corner and select **Custom repositories**.
3. Paste this repository URL: `https://github.com/burymichu/as7343-spectrum-card`
4. Category: **Dashboard** (or **Lovelace**).
5. Click **Add**, find **AS7343 Light Spectrum Card** and click **Download**.
6. Refresh your browser (`Ctrl + F5`).

### Method 2: Manual Installation

1. Download `dist/as7343-spectrum-card.js`.
2. Copy it into your Home Assistant `<config>/www/` directory.
3. In Home Assistant, navigate to **Settings** > **Dashboards** > **Resources**.
4. Add resource:
   - URL: `/local/as7343-spectrum-card.js`
   - Resource type: `JavaScript Module`
5. Refresh your dashboard.

---

## Configuration

Add the card via the UI editor or YAML:

```yaml
type: custom:as7343-spectrum-card
title: LIGHT SPECTRUM
height: 260
show_badges: true
show_dots: true
show_clear_nir: true
```

### Options

| Name | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `type` | string | **Required** | `custom:as7343-spectrum-card` |
| `title` | string | `LIGHT SPECTRUM` | Card header title |
| `height` | number | `260` | Canvas graph height in pixels |
| `show_badges` | boolean | `true` | Show summary tiles (R:FR, B:R, PPFD, etc.) |
| `show_dots` | boolean | `true` | Show channel dots on the curve |
| `show_clear_nir` | boolean | `true` | Show VIS Clear tile in the summary grid |

---

## Sensor Auto-Discovery

The card automatically matches entities by default naming patterns:
- Channels: `sensor.*as7343_f1*`, `sensor.*as7343_fz*`, `sensor.*as7343_nir*`, etc.
- Derived metrics: `sensor.*ppfd*`, `sensor.*r_fr*`, `sensor.*b_r*`, `sensor.*clear*`.

---

## Acknowledgements & Credits

This project was inspired by and builds upon the work of **[goatboynz/HA-par-spectrum-card](https://github.com/goatboynz/HA-par-spectrum-card)** (originally created for the AS7341 sensor). Thanks to **@goatboynz** for pioneering spectral visualization in Home Assistant.

### Changes in this AS7343 version:
- Adapted for the 14-channel ams-OSRAM AS7343 sensor (F1–F8, FZ, FY, FXL, NIR, VIS).
- Uses Catmull-Rom spline interpolation for the curve.
- Added summary tiles for ratios (R:FR, B:R) and estimated PPFD.

---

## License

MIT License - see the [LICENSE](LICENSE) file for details.
