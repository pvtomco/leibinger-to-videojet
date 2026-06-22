'use client';
import { useState } from 'react';
import Converter from '@/components/Converter';
import History from '@/components/History';

// Holds the shared refresh signal so the team library reloads right after a save.
export default function AppShell({ canSave }) {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <>
      <Converter canSave={canSave} onSaved={() => setRefreshKey((k) => k + 1)} />
      {canSave && (
        <>
          <h2 style={{ margin: '28px 0 4px', fontSize: 18 }}>
            Team library{' '}
            <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}>· shared saved conversions</span>
          </h2>
          <History refreshKey={refreshKey} />
        </>
      )}
    </>
  );
}
