# AS7343 Light Spectrum Card for Home Assistant

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/default)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern, universal multi-spectral visualization card for Home Assistant, designed specifically for the **ams-OSRAM AS7343 14-channel spectral sensor**.

Features continuous **Catmull-Rom spline curve interpolation**, a physics-based wavelength color gradient, interactive hover/touch tooltips, peak wavelength identification, and optional telemetry badges (PPFD, R:FR, B:R, VIS Clear, NIR).

![AS7343 Spectrum Card](screenshot.png)

---

## Features

- **Continuous Spectral Spline Graph**: Generates a smooth, continuous curve across all 14 optical channels (405nm to 855nm) using Catmull-Rom spline interpolation.
- **Physics-Based Photon Wavelength Gradient**: Realistic visual spectrum color fill across Violet, Blue, Cyan, Green, Yellow, Orange, Red, Deep-Red, Far-Red, and Near-Infrared bands.
- **Universal & Agnostic**: Designed for any lighting application (horticulture, aquarium lighting, photography, lab analysis, or smart home light quality monitoring).
- **Interactive Tooltips**: Hover or touch any spectral data point on desktop or mobile to inspect the exact channel name, wavelength (nm), and measured intensity.
- **Peak Wavelength Detection**: Automatically flags the dominant optical wavelength in real time.
- **Telemetry Metric Badges**: Clean, optional parameter tiles displaying PPFD, R:FR ratio, B:R ratio, VIS Clear, and NIR readings.

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
3. In Home Assistant, navigate to **Settings** > **Dashboards** > **Resources** (top-right menu).
4. Add resource:
   - URL: `/local/as7343-spectrum-card.js`
   - Resource type: `JavaScript Module`
5. Refresh your dashboard.

---

## Configuration

Add the card to your dashboard via the visual editor or YAML:

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
| `show_badges` | boolean | `true` | Display metric summary badges (PPFD, R:FR, B:R, etc.) |
| `show_dots` | boolean | `true` | Display channel data points on the curve |
| `show_clear_nir` | boolean | `true` | Display VIS Clear and NIR badges in the metrics grid |

---

## Sensor Auto-Discovery

The card automatically detects AS7343 sensor entities matching standard ESPHome naming patterns:
- Channels: `sensor.*as7343_f1*`, `sensor.*as7343_fz*`, `sensor.*as7343_nir*`, etc.
- Derived metrics: `sensor.*ppfd*`, `sensor.*r_fr*`, `sensor.*b_r*`, `sensor.*clear*`.

---

## Acknowledgements & Credits

This project was inspired by and builds upon the excellent work of **[goatboynz/HA-par-spectrum-card](https://github.com/goatboynz/HA-par-spectrum-card)** (originally created for the AS7341 sensor). I extend my sincere gratitude and appreciation to **@goatboynz** for pioneering spectral visualization in Home Assistant.

### Key Evolutions in this AS7343 Edition:
- **14 Optical Channels**: Upgraded from 8-channel setups to the full 14-channel optical matrix of the ams-OSRAM AS7343 (F1–F8, FZ, FY, FXL, NIR, VIS).
- **Smooth Spline Mapping**: Implemented continuous Catmull-Rom cubic spline interpolation for high-resolution physics curves.
- **Universal Architecture**: Built as a lightweight, generic Lovelace component compatible with any smart home lighting environment.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
