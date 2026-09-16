/**
 * AS7343 Light Spectrum Card for Home Assistant
 * https://github.com/<your-username>/as7343-spectrum-card
 *
 * Based on and inspired by HA-par-spectrum-card by goatboynz:
 * https://github.com/goatboynz/HA-par-spectrum-card
 * Copyright (c) 2025 goatboynz (MIT License)
 *
 * Universal edition for ams-OSRAM AS7343 14-channel spectral sensor:
 * continuous Catmull-Rom spline curves, photobiological evaluation,
 * and peak wavelength detection.
 */

class AS7343SpectrumCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.config = {};
    this._hass = null;
    this._channels = [];
    this._maxVal = 1;
    this._peakChannel = null;
    this._metrics = null;
    this._hoveredPoint = null;
    this._isDragging = false;
  }

  setConfig(config) {
    this.config = {
      title: config.title !== undefined ? config.title : 'LIGHT SPECTRUM',
      height: config.height || 260,
      show_badges: config.show_badges !== false,
      show_dots: config.show_dots !== false,
      show_clear_nir: config.show_clear_nir !== false,
      entities: config.entities || {},
      ...config
    };
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    this.updateData();
  }

  getChannelDefs() {
    return [
      { id: 'f1',  name: 'F1 (Violet)',       wl: 405, color: '#8A2BE2' },
      { id: 'f2',  name: 'F2 (Indigo)',       wl: 425, color: '#4169E1' },
      { id: 'fz',  name: 'FZ (Blue)',         wl: 450, color: '#0055FF' },
      { id: 'f3',  name: 'F3 (Cyan-Blue)',    wl: 475, color: '#00BFFF' },
      { id: 'f4',  name: 'F4 (Cyan)',         wl: 515, color: '#00FA9A' },
      { id: 'f5',  name: 'F5 (Green)',        wl: 550, color: '#00FF00' },
      { id: 'fy',  name: 'FY (Wide Green)',   wl: 555, color: '#7FFF00', isWide: true },
      { id: 'fxl', name: 'FXL (Orange)',      wl: 600, color: '#FFA500' },
      { id: 'f6',  name: 'F6 (Red)',          wl: 640, color: '#FF3300' },
      { id: 'f7',  name: 'F7 (Deep Red)',     wl: 690, color: '#DC143C' },
      { id: 'f8',  name: 'F8 (Far-Red)',      wl: 745, color: '#800000' },
      { id: 'nir', name: 'NIR (Near-IR)',     wl: 855, color: '#4A0E4E' }
    ];
  }

  resolveEntity(key, fallbackPatterns) {
    if (!this._hass || !this._hass.states) return null;

    if (this.config.entities && this.config.entities[key]) {
      const targetId = this.config.entities[key];
      if (this._hass.states[targetId]) {
        return this._hass.states[targetId];
      }
      const cleanTarget = targetId.replace(/^sensor\./, '');
      const matched = Object.keys(this._hass.states).find(id => id.endsWith(cleanTarget));
      if (matched) return this._hass.states[matched];
    }

    const allStates = Object.keys(this._hass.states);
    for (const pattern of fallbackPatterns) {
      const found = allStates.find(id => id.includes(pattern));
      if (found) return this._hass.states[found];
    }
    return null;
  }

  updateData() {
    if (!this._hass) return;

    const defs = this.getChannelDefs();
    const channels = [];
    let maxVal = 0;
    let peakChannel = null;

    for (const ch of defs) {
      const entity = this.resolveEntity(ch.id, [
        `as7343_${ch.id}`,
        `as7343_${ch.wl}`,
        `as7343_ch_${ch.id}`
      ]);
      const rawVal = entity ? parseFloat(entity.state) : 0;
      // Hardware glitch filter: discard corrupted values > 18000 counts
      const val = (!isNaN(rawVal) && rawVal <= 18000) ? rawVal : 0;

      if (val > maxVal) {
        maxVal = val;
        peakChannel = ch;
      }
      channels.push({
        ...ch,
        val: val,
        entity_id: entity ? entity.entity_id : null
      });
    }

    this._channels = channels;
    this._maxVal = Math.max(maxVal, 10);
    this._peakChannel = peakChannel;

    // Resolve metrics from Home Assistant
    const r_fr_entity = this.resolveEntity('r_fr', ['r_fr', 'wskaznik_r_fr']);
    const b_r_entity  = this.resolveEntity('b_r', ['b_r', 'wskaznik_b_r']);
    const par_entity  = this.resolveEntity('par', ['par_proxy', 'par']);
    const ppfd_entity = this.resolveEntity('ppfd', ['szacowane_ppfd', 'estimated_ppfd', 'ppfd']);
    const clear_entity= this.resolveEntity('clear', ['as7343_vis', 'as7343_clear', 'clear']);

    // R:FR ratio calculation
    let r_fr_num = null;
    if (r_fr_entity && !isNaN(parseFloat(r_fr_entity.state))) {
      r_fr_num = parseFloat(r_fr_entity.state);
    } else if (channels[10] && channels[10].val > 0) {
      r_fr_num = channels[9].val / channels[10].val;
    }

    // B:R ratio calculation
    let b_r_num = null;
    if (b_r_entity && !isNaN(parseFloat(b_r_entity.state))) {
      b_r_num = parseFloat(b_r_entity.state);
    } else if (channels[9] && channels[9].val > 0) {
      b_r_num = channels[2].val / channels[9].val;
    }

    // PAR proxy counts
    let par_num = null;
    if (par_entity && !isNaN(parseFloat(par_entity.state)) && parseFloat(par_entity.state) <= 180000) {
      par_num = parseFloat(par_entity.state);
    } else {
      par_num = channels.slice(0, 10).reduce((acc, c) => acc + c.val, 0);
    }

    // PPFD
    let ppfd_num = null;
    if (ppfd_entity && !isNaN(parseFloat(ppfd_entity.state)) && parseFloat(ppfd_entity.state) < 5000) {
      ppfd_num = parseFloat(ppfd_entity.state);
    }

    let clear_num = null;
    if (clear_entity && !isNaN(parseFloat(clear_entity.state))) {
      clear_num = parseFloat(clear_entity.state);
    }

    this._metrics = {
      r_fr: r_fr_num,
      b_r: b_r_num,
      par: par_num,
      ppfd: ppfd_num,
      clear: clear_num
    };

    this.renderBadges();
    this.drawSpectrum();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        ha-card {
          padding: 16px;
          background: var(--ha-card-background, var(--card-background-color, #1e1e24));
          border-radius: var(--ha-card-border-radius, 14px);
          box-shadow: var(--ha-card-box-shadow, 0 4px 16px rgba(0,0,0,0.25));
          color: var(--primary-text-color, #ffffff);
          position: relative;
          overflow: hidden;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .title {
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .peak-badge {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 14px;
          padding: 3px 10px;
          font-size: 11px;
          font-weight: 600;
          color: rgba(255,255,255,0.9);
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .canvas-container { position: relative; width: 100%; height: ${this.config.height}px; }
        canvas { width: 100%; height: 100%; display: block; cursor: crosshair; }
        .tooltip {
          position: absolute;
          background: rgba(18, 18, 24, 0.95);
          color: #fff;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12px;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.15s ease;
          border: 1px solid rgba(255,255,255,0.15);
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          z-index: 10;
          transform: translate(-50%, -120%);
          white-space: nowrap;
        }
        .tooltip.visible { opacity: 1; }
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(75px, 1fr));
          gap: 8px;
          margin-top: 14px;
          padding-top: 12px;
          border-top: 1px solid rgba(255,255,255,0.08);
        }
        .metric-card {
          background: rgba(255,255,255,0.04);
          border-radius: 8px;
          padding: 8px 6px;
          text-align: center;
        }
        .metric-title {
          font-size: 10.5px;
          color: var(--secondary-text-color, #a0a0a8);
          margin-bottom: 3px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .metric-val {
          font-size: 16px;
          font-weight: 700;
          color: var(--primary-text-color, #fff);
        }
        .metric-sub {
          font-size: 9.5px;
          margin-top: 3px;
          color: var(--secondary-text-color, #8e8e98);
        }
      </style>

      <ha-card>
        <div class="header">
          <div class="title">${this.config.title || 'LIGHT SPECTRUM'}</div>
          <div class="peak-badge" id="peak-badge">--</div>
        </div>

        <div class="canvas-container" id="container">
          <canvas id="canvas"></canvas>
          <div class="tooltip" id="tooltip"></div>
        </div>

        ${this.config.show_badges ? `<div class="metrics-grid" id="metrics"></div>` : ''}
      </ha-card>
    `;

    setTimeout(() => {
      this.initEvents();
      this.updateData();
    }, 0);
  }

  renderBadges() {
    const el = this.shadowRoot.getElementById('metrics');
    const peakEl = this.shadowRoot.getElementById('peak-badge');

    if (peakEl && this._peakChannel) {
      peakEl.textContent = `Peak: ${this._peakChannel.wl}nm (${this._peakChannel.id.toUpperCase()})`;
    }

    if (!el || !this._metrics) return;

    const rfr = this._metrics.r_fr !== null ? this._metrics.r_fr.toFixed(2) : '-';
    const br  = this._metrics.b_r  !== null ? this._metrics.b_r.toFixed(2)  : '-';

    const isPPFD = this._metrics.ppfd !== null;
    const badgeTitle = isPPFD ? 'PPFD' : 'PAR Proxy';
    const badgeVal = isPPFD
      ? `${this._metrics.ppfd.toFixed(0)} <span style="font-size:11px;font-weight:400;color:var(--secondary-text-color)">µmol</span>`
      : (this._metrics.par !== null ? this._metrics.par.toFixed(0) : '-');

    const cards = [
      {
        title: 'R:FR (690/745)',
        val: rfr,
        sub: 'Far-Red Balance',
        color: '#00E676'
      },
      {
        title: 'B:R (450/690)',
        val: br,
        sub: 'Blue-Red Ratio',
        color: '#4169E1'
      },
      {
        title: badgeTitle,
        val: badgeVal,
        sub: isPPFD ? 'Photosynthetic Flux' : '400-700nm Sum',
        color: '#FFB300'
      }
    ];

    if (this.config.show_clear_nir && this._metrics.clear !== null) {
      const cVal = this._metrics.clear;
      cards.push({
        title: 'VIS Clear',
        val: cVal >= 1000 ? `${(cVal/1000).toFixed(1)}k` : Math.round(cVal),
        sub: 'Broadband VIS',
        color: '#ffffff'
      });
    }

    el.innerHTML = cards.map(c => `
      <div class="metric-card">
        <div class="metric-title">${c.title}</div>
        <div class="metric-val" style="color:${c.color}">${c.val}</div>
        <div class="metric-sub">${c.sub}</div>
      </div>
    `).join('');
  }

  initEvents() {
    const container = this.shadowRoot.getElementById('container');
    const canvas = this.shadowRoot.getElementById('canvas');
    if (!container || !canvas) return;

    const handleMove = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      this.findHoveredPoint(x, y, rect.width, rect.height);
    };

    canvas.addEventListener('mousemove', (e) => handleMove(e.clientX, e.clientY));
    canvas.addEventListener('mouseleave', () => {
      this._hoveredPoint = null;
      this.hideTooltip();
      this.drawSpectrum();
    });

    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener('resize', () => {
      this.drawSpectrum();
    });
  }

  findHoveredPoint(mouseX, mouseY, width, height) {
    if (!this._channels || this._channels.length === 0) return;

    const padding = { top: 25, right: 20, bottom: 30, left: 35 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const minWl = 390;
    const maxWl = 870;

    let closest = null;
    let minDist = 25;

    for (const ch of this._channels) {
      const px = padding.left + ((ch.wl - minWl) / (maxWl - minWl)) * chartW;
      const py = padding.top + chartH - (ch.val / this._maxVal) * chartH;
      const dist = Math.hypot(px - mouseX, py - mouseY);

      if (dist < minDist) {
        minDist = dist;
        closest = { ...ch, px, py };
      }
    }

    if (closest) {
      this._hoveredPoint = closest;
      this.showTooltip(closest);
    } else {
      this._hoveredPoint = null;
      this.hideTooltip();
    }
    this.drawSpectrum();
  }

  showTooltip(pt) {
    const tt = this.shadowRoot.getElementById('tooltip');
    if (!tt) return;

    tt.innerHTML = `
      <div style="font-weight:700; color:${pt.color}; margin-bottom:2px;">${pt.name}</div>
      <div style="font-size:11px; opacity:0.8;">Wavelength: <b>${pt.wl} nm</b></div>
      <div style="font-size:13px; font-weight:700; margin-top:2px;">${Math.round(pt.val).toLocaleString()} counts</div>
    `;

    tt.style.left = `${pt.px}px`;
    tt.style.top = `${pt.py}px`;
    tt.classList.add('visible');
  }

  hideTooltip() {
    const tt = this.shadowRoot.getElementById('tooltip');
    if (tt) tt.classList.remove('visible');
  }

  drawSpectrum() {
    const canvas = this.shadowRoot.getElementById('canvas');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 350;
    const height = rect.height || this.config.height;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const padding = { top: 25, right: 20, bottom: 30, left: 35 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const minWl = 390;
    const maxWl = 870;

    ctx.clearRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartW, y);
      ctx.stroke();

      const val = Math.round(this._maxVal * (1 - i / 4));
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(val >= 1000 ? `${(val/1000).toFixed(1)}k` : val, padding.left - 6, y + 3);
    }

    const gridWls = [400, 450, 500, 550, 600, 650, 700, 750, 800, 850];
    for (const wl of gridWls) {
      const x = padding.left + ((wl - minWl) / (maxWl - minWl)) * chartW;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartH);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${wl}`, x, padding.top + chartH + 16);
    }

    if (!this._channels || this._channels.length === 0) return;

    // Catmull-Rom Points
    const pts = [];
    pts.push({
      x: padding.left,
      y: padding.top + chartH
    });

    for (const ch of this._channels) {
      const px = padding.left + ((ch.wl - minWl) / (maxWl - minWl)) * chartW;
      const py = padding.top + chartH - (ch.val / this._maxVal) * chartH;
      pts.push({ x: px, y: py, color: ch.color, wl: ch.wl, val: ch.val });
    }

    pts.push({
      x: padding.left + chartW,
      y: padding.top + chartH
    });

    // Spline Curve Fill with Spectrum Gradient
    ctx.save();
    const grad = ctx.createLinearGradient(padding.left, 0, padding.left + chartW, 0);
    grad.addColorStop(0.00, 'rgba(138, 43, 226, 0.45)'); // 405nm Violet
    grad.addColorStop(0.12, 'rgba(0, 85, 255, 0.55)');   // 450nm Blue
    grad.addColorStop(0.25, 'rgba(0, 191, 255, 0.50)');  // 475nm Cyan
    grad.addColorStop(0.38, 'rgba(0, 255, 0, 0.50)');    // 550nm Green
    grad.addColorStop(0.50, 'rgba(255, 165, 0, 0.55)');  // 600nm Orange
    grad.addColorStop(0.65, 'rgba(220, 20, 60, 0.60)');  // 660nm Red
    grad.addColorStop(0.78, 'rgba(128, 0, 0, 0.45)');    // 745nm Far-Red
    grad.addColorStop(1.00, 'rgba(74, 14, 78, 0.30)');   // 855nm NIR

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);

    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = i > 0 ? pts[i - 1] : pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = i != pts.length - 2 ? pts[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }

    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Spline stroke
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = i > 0 ? pts[i - 1] : pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = i != pts.length - 2 ? pts[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.restore();

    // Draw points
    if (this.config.show_dots) {
      for (let i = 1; i < pts.length - 1; i++) {
        const p = pts[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // Hovered point highlight
    if (this._hoveredPoint) {
      const p = this._hoveredPoint;
      ctx.beginPath();
      ctx.arc(p.px, p.py, 6.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  getCardSize() {
    return 4;
  }
}

customElements.define('as7343-spectrum-card', AS7343SpectrumCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'as7343-spectrum-card',
  name: 'AS7343 Light Spectrum Card',
  description: 'A universal 14-channel spectral visualization card with Catmull-Rom spline curves for Home Assistant and ams-OSRAM AS7343.'
});
