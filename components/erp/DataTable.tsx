'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TableSkeleton } from '@/components/erp/shared';
import { cn } from '@/lib/utils';

type Column<T> = { key: string; label: string; render?: (row: T) => any; className?: string };

export function DataTable<T extends Record<string, any>>({
  rows,
  columns,
  pageSize = 8,
  loading,
  emptyState,
}: {
  rows: T[];
  columns: Column<T>[];
  pageSize?: number;
  loading?: boolean;
  emptyState?: React.ReactNode;
}) {
  const [sortKey, setSortKey] = useState(columns[0]?.key || '');
  const [dir, setDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (av === bv) return 0;
        const r = String(av ?? '').localeCompare(String(bv ?? ''), 'pt-BR', { numeric: true });
        return dir === 'asc' ? r : -r;
      }),
    [rows, sortKey, dir]
  );
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pages);
  const chunk = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (loading) return <TableSkeleton rows={pageSize} />;
  if (!rows.length) return <>{emptyState}</>;

  return (
    <div className="space-y-3">
      <div className="overflow-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b bg-slate-50">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className="cursor-pointer px-3 py-3 text-left font-semibold text-slate-700"
                  onClick={() => {
                    if (sortKey === c.key) setDir(dir === 'asc' ? 'desc' : 'asc');
                    else {
                      setSortKey(c.key);
                      setDir('asc');
                    }
                  }}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    {sortKey === c.key ? dir === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" /> : null}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chunk.map((row, idx) => (
              <tr key={idx} className="border-b last:border-b-0 hover:bg-slate-50/80 transition-colors">
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-3 py-3 align-middle text-slate-700', c.className)}>
                    {c.render ? c.render(row) : String(row[c.key] ?? '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-end gap-2 text-xs">
        <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
          Anterior
        </Button>
        <span className="text-muted-foreground">Página {currentPage}/{pages}</span>
        <Button variant="outline" size="sm" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}>
          Próxima
        </Button>
      </div>
    </div>
  );
}
