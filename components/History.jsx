'use client';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function History({ refreshKey }) {
  const [rows, setRows] = useState(null); // null = loading
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('conversions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;

      const withUrls = await Promise.all(
        data.map(async (row) => {
          const paths = [row.preview_path, row.bmp_path, row.job_path].filter(Boolean);
          const { data: signed } = await supabase.storage.from('library').createSignedUrls(paths, 3600);
          const map = {};
          (signed || []).forEach((s) => { if (s.path && s.signedUrl) map[s.path] = s.signedUrl; });
          return {
            ...row,
            previewUrl: map[row.preview_path],
            bmpUrl: map[row.bmp_path],
            jobUrl: row.job_path ? map[row.job_path] : null,
          };
        })
      );
      setRows(withUrls);
    } catch (e) {
      setErr(String(e?.message || e));
      setRows([]);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  if (err) return <div className="notice">Couldn’t load the team library: {err}</div>;
  if (rows === null) return <p className="muted">Loading team library…</p>;
  if (rows.length === 0)
    return <p className="muted">No saved conversions yet. Convert a file above and click “Save to team library”.</p>;

  return (
    <div className="gallery">
      {rows.map((r) => (
        <div className="gcard" key={r.id}>
          <div className="thumb">{r.previewUrl && <img src={r.previewUrl} alt={r.out_filename} />}</div>
          <div className="body">
            <div className="fn">{r.out_filename}</div>
            <div className="by">from {r.source_filename}</div>
            <div className="by">{new Date(r.created_at).toLocaleString()} · {r.created_by_email}</div>
            <div className="by">
              {r.width}×{r.height} dots{r.barcode ? ` · EAN ${r.barcode}` : ''}
            </div>
          </div>
          <div className="acts">
            {r.bmpUrl && <a className="btn ghost" href={r.bmpUrl} download={r.out_filename}>⬇ .bmp</a>}
            {r.jobUrl && <a className="btn ghost" href={r.jobUrl} download={r.source_filename}>⬇ .job</a>}
          </div>
        </div>
      ))}
    </div>
  );
}
