'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildLayout,
  padCenter,
  encodeBMP1bit,
  computeInkRows,
  ean13CheckDigit,
  makeCanvasTextRenderer,
} from '@/lib/engine';
import { createClient } from '@/lib/supabase/client';

// ---------- helpers ----------
const pad2 = (n) => String(n).padStart(2, '0');
function nowLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function parseDate(v) {
  const m = (v || '').match(/(\d+)-(\d+)-(\d+)T(\d+):(\d+)/);
  if (!m) { const d = new Date(); return { Y: String(d.getFullYear()), M: pad2(d.getMonth() + 1), D: pad2(d.getDate()), h: pad2(d.getHours()), m: pad2(d.getMinutes()) }; }
  return { Y: m[1], M: m[2], D: m[3], h: m[4], m: m[5] };
}
function latin1(bytes) { let s = ''; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return s; }
function cleanName(n) {
  n = n.replace(/\.job$/i, '').normalize('NFKD').replace(/[^\x00-\x7F]/g, '');
  n = n.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/_+/g, '_').replace(/^[_.]+|_+$/g, '');
  return (n || 'label') + '.bmp';
}
function downloadBytes(bytes, name, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([bytes], { type }));
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function gridToPngBlob(grid, W, H) {
  return new Promise((res) => {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(W, H);
    for (let i = 0; i < W * H; i++) { const v = grid[i] ? 0 : 255; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
    ctx.putImageData(img, 0, 0);
    c.toBlob((b) => res(b), 'image/png');
  });
}

// ---------- preview ----------
function PreviewCanvas({ grid, W, H }) {
  const ref = useRef(null);
  const [zoom, setZoom] = useState(3);
  const [wrap, setWrap] = useState(true);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const off = document.createElement('canvas'); off.width = W; off.height = H;
    const octx = off.getContext('2d');
    const img = octx.createImageData(W, H);
    for (let i = 0; i < W * H; i++) { const v = grid[i] ? 0 : 255; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
    octx.putImageData(img, 0, 0);
    const container = (canvas.parentElement?.clientWidth || 600) - 20;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    if (wrap) {
      const perRow = Math.max(1, Math.floor(container / zoom));
      const rows = Math.ceil(W / perRow); const gap = 6;
      canvas.width = Math.min(W, perRow) * zoom;
      canvas.height = rows * (H * zoom) + (rows - 1) * gap;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let r = 0; r < rows; r++) {
        const sx = r * perRow, sw = Math.min(perRow, W - sx);
        ctx.drawImage(off, sx, 0, sw, H, 0, r * (H * zoom + gap), sw * zoom, H * zoom);
      }
    } else {
      canvas.width = W * zoom; canvas.height = H * zoom;
      ctx.drawImage(off, 0, 0, W * zoom, H * zoom);
    }
  }, [grid, W, H, zoom, wrap]);
  return (
    <>
      <div className="pvctl">
        <label>Zoom <input type="range" min="1" max="8" value={zoom} onChange={(e) => setZoom(+e.target.value)} /></label>
        <label><input type="checkbox" checked={wrap} onChange={(e) => setWrap(e.target.checked)} /> Wrap wide label</label>
      </div>
      <div className="previewbox"><canvas ref={ref} /></div>
    </>
  );
}

// ---------- main ----------
export default function Converter({ canSave = false, onSaved }) {
  const [raster, setRaster] = useState(34);
  const [mfg, setMfg] = useState('');
  const [advOpen, setAdvOpen] = useState(false);
  const [incText, setIncText] = useState(true);
  const [incCode, setIncCode] = useState(true);
  const [incDate, setIncDate] = useState(true);
  const [msb, setMsb] = useState(false);
  const [hover, setHover] = useState(false);
  const [raw, setRaw] = useState([]);        // [{name, bytes}]
  const [results, setResults] = useState([]); // converted
  const fileInput = useRef(null);
  const trRef = useRef(null);

  useEffect(() => { setMfg(nowLocal()); }, []);
  useEffect(() => { trRef.current = makeCanvasTextRenderer(); }, []);

  const settings = useMemo(
    () => ({ raster: Math.max(1, parseInt(raster, 10) || 34), incText, incCode, incDate, msb, mfg }),
    [raster, incText, incCode, incDate, msb, mfg]
  );

  // (re)convert whenever inputs or settings change
  useEffect(() => {
    const tr = trRef.current || makeCanvasTextRenderer();
    const date = parseDate(settings.mfg);
    const out = raw.map((f) => {
      try {
        const text = latin1(f.bytes);
        const lay = buildLayout(text, {
          date, lsbTop: !settings.msb,
          includeText: settings.incText, includeCode: settings.incCode, includeDate: settings.incDate,
          textRenderer: tr,
        });
        const p = padCenter(lay.grid, lay.W, lay.H, settings.raster);
        const ink = computeInkRows(lay.grid, lay.W, lay.H);
        const bmp = encodeBMP1bit(p.grid, p.W, p.H);
        const barcodeOK = lay.barcode ? ean13CheckDigit(lay.barcode.slice(0, 12)) === lay.barcode[12] : null;
        return {
          key: f.name + ':' + f.bytes.length,
          name: f.name, outName: cleanName(f.name),
          bytes: f.bytes, grid: p.grid, W: p.W, H: p.H, bmp,
          info: { W: p.W, H: p.H, inkH: ink ? ink.height : 0, objects: lay.items.length, barcode: lay.barcode, barcodeOK, warning: p.warning },
          saving: false, saved: false, saveErr: null,
        };
      } catch (e) {
        return { key: f.name, name: f.name, outName: '(error)', error: String(e?.message || e), info: {} };
      }
    });
    setResults(out);
  }, [raw, settings]);

  async function addFiles(fileList) {
    const next = [];
    for (const f of fileList) {
      const bytes = new Uint8Array(await f.arrayBuffer());
      next.push({ name: f.name, bytes });
    }
    setRaw((prev) => [...prev, ...next]);
  }

  async function saveOne(idx) {
    setResults((rs) => rs.map((r, i) => (i === idx ? { ...r, saving: true, saveErr: null } : r)));
    const r = results[idx];
    try {
      const supabase = createClient();
      const id = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()) + Math.round(performance.now());
      const bmpPath = `${id}/out.bmp`, prevPath = `${id}/preview.png`, jobPath = `${id}/source.job`;
      const previewBlob = await gridToPngBlob(r.grid, r.W, r.H);
      const up = (path, blob, contentType) => supabase.storage.from('library').upload(path, blob, { contentType, upsert: false });
      let u;
      u = await up(bmpPath, new Blob([r.bmp], { type: 'image/bmp' }), 'image/bmp'); if (u.error) throw u.error;
      u = await up(prevPath, previewBlob, 'image/png'); if (u.error) throw u.error;
      u = await up(jobPath, new Blob([r.bytes], { type: 'application/octet-stream' }), 'application/octet-stream'); if (u.error) throw u.error;
      const d = parseDate(settings.mfg);
      const { error } = await supabase.from('conversions').insert({
        source_filename: r.name, out_filename: r.outName,
        width: r.W, height: r.H, raster: settings.raster,
        mfg_date: `${d.Y}-${d.M}-${d.D} ${d.h}:${d.m}`,
        include_text: settings.incText, include_code: settings.incCode, include_date: settings.incDate, msb: settings.msb,
        barcode: r.info.barcode || null, barcode_ok: r.info.barcodeOK,
        bmp_path: bmpPath, preview_path: prevPath, job_path: jobPath,
      });
      if (error) throw error;
      setResults((rs) => rs.map((x, i) => (i === idx ? { ...x, saving: false, saved: true } : x)));
      onSaved && onSaved();
    } catch (e) {
      setResults((rs) => rs.map((x, i) => (i === idx ? { ...x, saving: false, saveErr: String(e?.message || e) } : x)));
    }
  }

  return (
    <>
      <div className="card">
        <div className="settings">
          <div>
            <label className="fld">Raster height (dots) <span className="th">· ความสูง raster</span></label>
            <input type="number" value={raster} min="1" max="512" onChange={(e) => setRaster(e.target.value)} />
          </div>
          <div>
            <label className="fld">Manufacturing date / time <span className="th">· วันที่ผลิต</span></label>
            <input type="datetime-local" value={mfg} onChange={(e) => setMfg(e.target.value)} />
          </div>
        </div>
        <button className="linkbtn" onClick={() => setAdvOpen((v) => !v)}>Advanced options ▾</button>
        <div className={'adv' + (advOpen ? ' open' : '')}>
          <label className="chk"><input type="checkbox" checked={incText} onChange={(e) => setIncText(e.target.checked)} /> Text</label>
          <label className="chk"><input type="checkbox" checked={incCode} onChange={(e) => setIncCode(e.target.checked)} /> Barcode</label>
          <label className="chk"><input type="checkbox" checked={incDate} onChange={(e) => setIncDate(e.target.checked)} /> Date field</label>
          <label className="chk"><input type="checkbox" checked={msb} onChange={(e) => setMsb(e.target.checked)} /> MSB bit order</label>
        </div>
      </div>

      <div
        className={'drop' + (hover ? ' hover' : '')}
        onClick={() => fileInput.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setHover(true); }}
        onDragLeave={(e) => { e.preventDefault(); setHover(false); }}
        onDrop={(e) => { e.preventDefault(); setHover(false); addFiles(e.dataTransfer.files); }}
      >
        <strong>Drop .job files here, or click to browse</strong>
        <div className="sub">วางไฟล์ .job ที่นี่ · you can select several at once</div>
        <input ref={fileInput} type="file" accept=".job" multiple hidden onChange={(e) => addFiles(e.target.files)} />
      </div>

      {results.length > 0 && (
        <div className="toolbar">
          <button className="btn ghost" onClick={() => { setRaw([]); setResults([]); }}>Clear</button>
          <span className="count">{results.length} file(s)</span>
        </div>
      )}

      {results.map((r, idx) => (
        <div className="card result" key={r.key || idx}>
          <div className="row">
            <div>
              <h3>{r.name}</h3>
              {!r.error && <div className="out">→ {r.outName}</div>}
            </div>
            {!r.error && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn ghost" onClick={() => downloadBytes(r.bmp, r.outName, 'image/bmp')}>⬇ Download .bmp</button>
                {canSave && (
                  <button className="btn primary" disabled={r.saving || r.saved} onClick={() => saveOne(idx)}>
                    {r.saved ? '✓ Saved' : r.saving ? 'Saving…' : '☁ Save to team library'}
                  </button>
                )}
              </div>
            )}
          </div>
          {r.error ? (
            <div className="notice">Could not convert: {r.error}</div>
          ) : (
            <>
              <div className="meta">
                <span className="pill">{r.info.W} × {r.info.H} dots</span>
                <span className="pill">ink {r.info.inkH} dots</span>
                <span className="pill">{r.info.objects} objects</span>
                {r.info.barcode && (
                  <span className={'pill ' + (r.info.barcodeOK ? 'ok' : 'err')}>
                    EAN-13 {r.info.barcode} {r.info.barcodeOK ? '✓' : '✗'}
                  </span>
                )}
                {r.info.warning && <span className="pill warn">⚠ {r.info.warning}</span>}
              </div>
              {r.saveErr && <div className="notice">Save failed: {r.saveErr}</div>}
              <PreviewCanvas grid={r.grid} W={r.W} H={r.H} />
            </>
          )}
        </div>
      ))}
    </>
  );
}
