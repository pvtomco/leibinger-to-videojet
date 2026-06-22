/* Leibinger .job -> VideoJet BMP engine (ES module).
 * Ported verbatim from the verified converter: the deterministic parts
 * (parse, $GRAFIC decode, EAN-13 bars, layout, padding, 1-bit BMP encoder)
 * render pixel-identical to the validated Python tool. Text rasterization is
 * injected (textRenderer) because only a browser <canvas> can draw fonts.
 *
 * Grid = Uint8Array length W*H, row-major (index y*W+x), value 1 = ink.
 */

// ---------------------------------------------------------------- tokenizer
export function tokenize(body) {
  const toks = [];
  let i = 0;
  const n = body.length;
  while (i < n) {
    const c = body[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '(') {
      let depth = 1, j = i + 1;
      while (j < n && depth > 0) {
        if (body[j] === '(') depth++;
        else if (body[j] === ')') depth--;
        j++;
      }
      toks.push(['p', body.slice(i + 1, j - 1)]);
      i = j;
    } else {
      let j = i;
      while (j < n && !/\s/.test(body[j])) j++;
      toks.push(['a', body.slice(i, j)]);
      i = j;
    }
  }
  return toks;
}

export function parseJob(text) {
  const objs = [];
  let timefmt = null;
  for (let line of text.split(/\r?\n/)) {
    line = line.trim();
    const m = line.match(/^([A-Z]+)\s*\[(.*)\]\s*$/);
    if (!m) continue;
    const kind = m[1], body = m[2];
    if (kind === 'TIME') {
      const t = tokenize(body);
      if (t.length && t[0][0] === 'p') timefmt = t[0][1];
    } else if (kind === 'OBJ') {
      const t = tokenize(body);
      if (t.length < 6) continue;
      const oid = parseInt(t[0][1], 10);
      const x = parseInt(t[1][1], 10);
      const y = parseInt(t[2][1], 10);
      const rot = parseInt(t[3][1], 10);
      if ([oid, x, y, rot].some((v) => Number.isNaN(v))) continue;
      const ftype = t[4][0] === 'p' ? t[4][1] : '';
      const content = t.length > 5 && t[5][0] === 'p' ? t[5][1] : '';
      let unit = '';
      for (let k = t.length - 1; k >= 6; k--) {
        if (t[k][0] === 'p') {
          const v = t[k][1];
          if (v && !['US', 'UK', 'EXT'].includes(v) && v.length <= 3) unit = v;
          break;
        }
      }
      objs.push({ id: oid, x, y, rot, ftype, content, unit });
    }
  }
  return { objs, timefmt };
}

// ---------------------------------------------------------------- bitmap decode
export function hexToBytes(h) {
  h = h.replace(/\s+/g, '');
  const n = h.length >> 1;
  const a = new Uint8Array(n);
  for (let i = 0; i < n; i++) a[i] = parseInt(h.substr(i * 2, 2), 16);
  return a;
}

export function decodeGrafic(content, lsbTop = true, flipV = true) {
  const m = content.trim().match(/^(\d+)\s+(\d+)\s+([\s\S]*)$/);
  if (!m) throw new Error('bad $GRAFIC content');
  const H = parseInt(m[1], 10), W = parseInt(m[2], 10);
  const data = hexToBytes(m[3]);
  const bpc = (H + 7) >> 3;
  let grid = new Uint8Array(W * H);
  for (let col = 0; col < W; col++) {
    const base = col * bpc;
    if (base + bpc > data.length) break;
    for (let row = 0; row < H; row++) {
      const byte = data[base + (row >> 3)];
      const bit = row & 7;
      const on = lsbTop ? (byte >> bit) & 1 : (byte >> (7 - bit)) & 1;
      if (on) grid[row * W + col] = 1;
    }
  }
  if (flipV) {
    const g2 = new Uint8Array(W * H);
    for (let row = 0; row < H; row++)
      for (let col = 0; col < W; col++)
        g2[(H - 1 - row) * W + col] = grid[row * W + col];
    grid = g2;
  }
  return { grid, W, H };
}

// ---------------------------------------------------------------- EAN-13
const _L = {
  '0': '0001101', '1': '0011001', '2': '0010011', '3': '0111101', '4': '0100011',
  '5': '0110001', '6': '0101111', '7': '0111011', '8': '0110111', '9': '0001011',
};
const _G = {}, _R = {};
for (const k in _L) {
  const v = _L[k];
  _G[k] = v.split('').reverse().map((c) => (c === '0' ? '1' : '0')).join('');
  _R[k] = v.split('').map((c) => (c === '0' ? '1' : '0')).join('');
}
const _PARITY = {
  '0': 'LLLLLL', '1': 'LLGLGG', '2': 'LLGGLG', '3': 'LLGGGL', '4': 'LGLLGG',
  '5': 'LGGLLG', '6': 'LGGGLL', '7': 'LGLGLG', '8': 'LGLGGL', '9': 'LGGLGL',
};

export function ean13CheckDigit(d12) {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += +d12[i] * (i % 2 === 0 ? 1 : 3);
  return String((10 - (sum % 10)) % 10);
}

export function ean13Modules(digits) {
  let d = (digits.match(/\d/g) || []).join('').slice(0, 13);
  while (d.length < 13) d = '0' + d;
  const par = _PARITY[d[0]];
  let s = '101';
  for (let i = 0; i < 6; i++) s += (par[i] === 'L' ? _L : _G)[d[1 + i]];
  s += '01010';
  for (let i = 0; i < 6; i++) s += _R[d[7 + i]];
  s += '101';
  return { mods: s, d };
}

function fillRect(grid, W, H, x0, y0, x1, y1) {
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++)
      if (x >= 0 && x < W && y >= 0 && y < H) grid[y * W + x] = 1;
}

function pasteGrid(dst, DW, DH, src, SW, SH, ox, oy) {
  for (let y = 0; y < SH; y++)
    for (let x = 0; x < SW; x++)
      if (src[y * SW + x]) {
        const X = ox + x, Y = oy + y;
        if (X >= 0 && X < DW && Y >= 0 && Y < DH) dst[Y * DW + X] = 1;
      }
}

export function renderEan13(digits, module = 1, barH = 14, hriH = 7, gap = 1, textRenderer = null) {
  const { mods, d } = ean13Modules(digits);
  const n = mods.length;
  const leadW = 6 * module;
  const W = leadW + n * module + 2;
  const H = barH + gap + hriH;
  const grid = new Uint8Array(W * H);
  const guard = new Set();
  for (let i = 0; i < 3; i++) guard.add(i);
  for (let i = 45; i < 50; i++) guard.add(i);
  for (let i = 92; i < 95; i++) guard.add(i);
  for (let i = 0; i < n; i++) {
    if (mods[i] === '1') {
      const x0 = leadW + i * module;
      const h = guard.has(i) ? H : barH;
      fillRect(grid, W, H, x0, 0, x0 + module - 1, h - 1);
    }
  }
  if (textRenderer) {
    const put = (s, centerX) => {
      const t = textRenderer(s, hriH);
      if (!t) return;
      let x = Math.round(centerX - t.w / 2);
      x = Math.max(0, Math.min(x, W - t.w));
      pasteGrid(grid, W, H, t.grid, t.w, t.h, x, barH + gap);
    };
    put(d[0], leadW / 2);
    put(d.slice(1, 7), leadW + ((3 + 45) / 2) * module);
    put(d.slice(7, 13), leadW + ((50 + 92) / 2) * module);
  }
  return { grid, W, H, d };
}

// ---------------------------------------------------------------- date
export function formatDate(fmt, dt) {
  return (fmt || 'yyyy-mm-dd  HH:MM  ')
    .replace(/yyyy/g, dt.Y).replace(/mm/g, dt.M).replace(/dd/g, dt.D)
    .replace(/HH/g, dt.h).replace(/MM/g, dt.m);
}

// ---------------------------------------------------------------- layout
export function buildLayout(text, opts = {}) {
  const lsbTop = opts.lsbTop !== false;
  const includeText = opts.includeText !== false;
  const includeCode = opts.includeCode !== false;
  const includeDate = opts.includeDate !== false;
  const textH = opts.textH || 14;
  const textRenderer = opts.textRenderer || null;
  const date = opts.date || { Y: '2026', M: '01', D: '01', h: '12', m: '00' };

  const { objs, timefmt } = parseJob(text);
  const placed = [];
  const items = [];
  let barcode = null;

  for (const o of objs) {
    if (o.ftype === '$GRAFIC') {
      let g;
      try { g = decodeGrafic(o.content, lsbTop, true); }
      catch (e) { items.push({ id: o.id, type: 'graphic', error: String(e) }); continue; }
      placed.push({ x: o.x, y: o.y, grid: g.grid, w: g.W, h: g.H });
      items.push({ id: o.id, type: 'graphic', x: o.x, y: o.y, w: g.W, h: g.H });
    } else if (o.ftype === '$CODE') {
      if (!includeCode) { items.push({ id: o.id, type: 'barcode', skipped: true, content: o.content }); continue; }
      const r = renderEan13(o.content, 1, 14, 7, 1, textRenderer);
      placed.push({ x: o.x, y: o.y, grid: r.grid, w: r.W, h: r.H });
      barcode = r.d;
      items.push({ id: o.id, type: 'barcode', x: o.x, y: o.y, w: r.W, h: r.H, digits: r.d });
    } else {
      let s = o.content;
      const isDate = s.indexOf('{t}') !== -1;
      if (isDate) {
        if (!includeDate) { items.push({ id: o.id, type: 'date', skipped: true }); continue; }
        s = formatDate(timefmt, date);
      } else {
        if (!includeText) { items.push({ id: o.id, type: 'text', skipped: true, text: s }); continue; }
        if (o.unit) s = s.replace(/\s+$/, '') + ' ' + o.unit;
      }
      const t = textRenderer ? textRenderer(s, textH) : null;
      if (t) {
        placed.push({ x: o.x, y: o.y, grid: t.grid, w: t.w, h: t.h });
        items.push({ id: o.id, type: isDate ? 'date' : 'text', x: o.x, y: o.y, w: t.w, h: t.h, text: s });
      } else {
        items.push({ id: o.id, type: isDate ? 'date' : 'text', text: s, noRender: !textRenderer });
      }
    }
  }

  let maxx = 1, maxy = 1;
  for (const p of placed) { maxx = Math.max(maxx, p.x + p.w); maxy = Math.max(maxy, p.y + p.h); }
  const grid = new Uint8Array(maxx * maxy);
  for (const p of placed) pasteGrid(grid, maxx, maxy, p.grid, p.w, p.h, p.x, p.y);

  return { grid, W: maxx, H: maxy, items, barcode, timefmt };
}

export function computeInkRows(grid, W, H) {
  let top = -1, bottom = -1;
  for (let y = 0; y < H; y++) {
    let any = false;
    for (let x = 0; x < W; x++) if (grid[y * W + x]) { any = true; break; }
    if (any) { if (top < 0) top = y; bottom = y; }
  }
  return top < 0 ? null : { top, bottom, height: bottom - top + 1 };
}

export function padCenter(grid, W, H, padH) {
  if (!padH || padH === H) return { grid, W, H, offset: 0 };
  if (padH < H) return { grid, W, H, offset: 0, warning: `content ${H} dots > raster ${padH}; not cropped` };
  const offset = (padH - H) >> 1;
  const g2 = new Uint8Array(W * padH);
  pasteGrid(g2, W, padH, grid, W, H, 0, offset);
  return { grid: g2, W, H: padH, offset };
}

// ---------------------------------------------------------------- 1-bit BMP
// Matches PIL mode-'1' save: ink -> black, bg -> white.
export function encodeBMP1bit(grid, W, H) {
  const rowStride = Math.floor((W + 31) / 32) * 4;
  const imgSize = rowStride * H;
  const offset = 14 + 40 + 8;
  const fileSize = offset + imgSize;
  const buf = new ArrayBuffer(fileSize);
  const dv = new DataView(buf);
  const u8 = new Uint8Array(buf);
  dv.setUint8(0, 0x42); dv.setUint8(1, 0x4d);
  dv.setUint32(2, fileSize, true);
  dv.setUint32(6, 0, true);
  dv.setUint32(10, offset, true);
  dv.setUint32(14, 40, true);
  dv.setInt32(18, W, true);
  dv.setInt32(22, H, true);
  dv.setUint16(26, 1, true);
  dv.setUint16(28, 1, true);
  dv.setUint32(30, 0, true);
  dv.setUint32(34, imgSize, true);
  dv.setInt32(38, 2835, true);
  dv.setInt32(42, 2835, true);
  dv.setUint32(46, 2, true);
  dv.setUint32(50, 2, true);
  dv.setUint8(54, 0); dv.setUint8(55, 0); dv.setUint8(56, 0); dv.setUint8(57, 0);
  dv.setUint8(58, 255); dv.setUint8(59, 255); dv.setUint8(60, 255); dv.setUint8(61, 0);
  for (let y = 0; y < H; y++) {
    const rowBase = offset + (H - 1 - y) * rowStride;
    for (let x = 0; x < W; x++) {
      if (!grid[y * W + x]) u8[rowBase + (x >> 3)] |= 0x80 >> (x & 7);
    }
  }
  return u8;
}

// ---------------------------------------------------------------- browser text
// Mirrors the Python render_text: draw at 64px, crop to ink, scale to target
// height, threshold. Only call in the browser (needs <canvas>).
export function makeCanvasTextRenderer() {
  const meas = document.createElement('canvas').getContext('2d');
  const FONT = (px) => `bold ${px}px Arial, "Helvetica Neue", Helvetica, "Noto Sans Thai", sans-serif`;
  return function (s, targetH) {
    if (!s) return null;
    const fontPx = 64;
    meas.font = FONT(fontPx);
    const cw = Math.max(8, Math.ceil(meas.measureText(s).width) + 8), ch = 120;
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cw, ch);
    ctx.font = FONT(fontPx); ctx.textBaseline = 'top'; ctx.fillStyle = '#fff';
    ctx.fillText(s, 4, 4);
    const img = ctx.getImageData(0, 0, cw, ch).data;
    let minx = cw, miny = ch, maxx = -1, maxy = -1;
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      if (img[(y * cw + x) * 4] > 80) { if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
    }
    if (maxx < 0) return null;
    const bw = maxx - minx + 1, bh = maxy - miny + 1;
    const tw = Math.max(1, Math.round(bw * (targetH / bh)));
    const out = document.createElement('canvas'); out.width = tw; out.height = targetH;
    const octx = out.getContext('2d', { willReadFrequently: true });
    octx.imageSmoothingEnabled = true; octx.imageSmoothingQuality = 'high';
    octx.fillStyle = '#000'; octx.fillRect(0, 0, tw, targetH);
    octx.drawImage(cv, minx, miny, bw, bh, 0, 0, tw, targetH);
    const od = octx.getImageData(0, 0, tw, targetH).data;
    const grid = new Uint8Array(tw * targetH);
    for (let i = 0; i < tw * targetH; i++) if (od[i * 4] > 80) grid[i] = 1;
    return { grid, w: tw, h: targetH };
  };
}
