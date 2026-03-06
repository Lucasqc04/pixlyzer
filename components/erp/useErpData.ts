'use client';
import { useCallback, useEffect, useState } from 'react';

export function useErpData() {
  const [data, setData] = useState<any>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [allRes, dashRes, uploadsRes] = await Promise.all([fetch('/api/v1/erp/all'), fetch('/api/v1/erp/dashboard'), fetch('/api/uploads')]);
      const all = await allRes.json();
      const dash = await dashRes.json();
      const uploads = await uploadsRes.json();
      if (all.success) setData({ ...all.data, uploads: uploads?.data?.uploads || [] });
      if (dash.success) setDashboard(dash.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { data, dashboard, loading, refresh };
}
