'use client';
import { useMemo, useState } from 'react';

export function DataTable<T extends Record<string, any>>({ rows, columns, pageSize = 8 }: { rows: T[]; columns: { key: string; label: string; render?: (row: T) => any }[]; pageSize?: number }) {
  const [sortKey, setSortKey] = useState(columns[0]?.key || '');
  const [dir, setDir] = useState<'asc'|'desc'>('asc');
  const [page, setPage] = useState(1);
  const sorted = useMemo(() => [...rows].sort((a,b)=>{const av=a[sortKey], bv=b[sortKey]; if(av===bv) return 0; const r=String(av??'').localeCompare(String(bv??''), 'pt-BR', { numeric:true }); return dir==='asc'?r:-r;}), [rows,sortKey,dir]);
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const chunk = sorted.slice((page-1)*pageSize, page*pageSize);

  return <div className='space-y-2'>
    <div className='border rounded bg-white overflow-auto'>
      <table className='w-full text-sm'>
        <thead><tr className='border-b bg-muted/40'>{columns.map(c => <th key={c.key} className='p-2 text-left cursor-pointer' onClick={() => { if (sortKey===c.key) setDir(dir==='asc'?'desc':'asc'); else { setSortKey(c.key); setDir('asc'); } }}>{c.label}</th>)}</tr></thead>
        <tbody>{chunk.map((row,idx)=><tr key={idx} className='border-b'>{columns.map(c => <td key={c.key} className='p-2'>{c.render ? c.render(row) : String(row[c.key] ?? '-')}</td>)}</tr>)}</tbody>
      </table>
    </div>
    <div className='flex justify-end gap-2 text-xs'><button disabled={page<=1} className='border rounded px-2 py-1 disabled:opacity-50' onClick={()=>setPage(page-1)}>Anterior</button><span>Página {page}/{pages}</span><button disabled={page>=pages} className='border rounded px-2 py-1 disabled:opacity-50' onClick={()=>setPage(page+1)}>Próxima</button></div>
  </div>;
}
