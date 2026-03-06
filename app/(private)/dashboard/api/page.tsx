import { PageHeader } from '@/components/erp/shared';

const routes = [
  ['POST','/api/auth/register','Cadastro + envio de código'],['POST','/api/auth/verify-email','Validar código 6 dígitos'],['POST','/api/auth/resend-verification-code','Reenviar código'],
  ['GET','/api/v1/erp/dashboard','KPIs executivos'],['GET','/api/v1/erp/all','Snapshot ERP'],
  ['CRUD','/api/v1/erp/products','Listar/criar/editar/arquivar produtos'],['CRUD','/api/v1/erp/customers','Listar/criar/editar/inativar clientes'],['CRUD','/api/v1/erp/sellers','Listar/criar/editar/inativar vendedores'],['CRUD','/api/v1/erp/sales','Listar/criar/editar/cancelar vendas'],['CRUD','/api/v1/erp/transactions','Listar/criar/editar transações'],
  ['GET/PATCH','/api/v1/erp/store','Configuração da loja'],['GET/PATCH','/api/v1/erp/profile','Perfil do usuário'],
  ['POST','/api/v1/erp/team/invite','Convidar membro'],['POST','/api/v1/erp/team/accept','Aceitar convite'],
  ['POST','/api/v1/ocr','OCR público por API Key'],['GET/PATCH','/api/uploads/:id','Revisão de OCR e vínculo ERP']
];

export default function ApiPage(){return <div className='space-y-4'>
  <PageHeader title='API do Pixlyzer ERP' subtitle='Documentação operacional com exemplos curl/fetch e envelopes padronizados.'/>
  <div className='bg-white border rounded overflow-hidden text-sm'><table className='w-full'><thead className='bg-muted/40 border-b'><tr><th className='p-2 text-left'>Método</th><th className='p-2 text-left'>Rota</th><th className='p-2 text-left'>Objetivo</th></tr></thead><tbody>{routes.map(([m,r,d])=><tr key={String(r)} className='border-b'><td className='p-2'>{m}</td><td className='p-2 font-mono'>{r}</td><td className='p-2'>{d}</td></tr>)}</tbody></table></div>
  <div className='grid lg:grid-cols-2 gap-3'>
    <pre className='bg-slate-950 text-slate-100 p-4 rounded text-xs overflow-auto'>{`curl -X POST "$BASE/api/v1/erp/products" \\
  -H "Content-Type: application/json" \\
  -H "Cookie: auth-token=..." \\
  -d '{"name":"Produto","price":10,"stock":5}'`}</pre>
    <pre className='bg-slate-950 text-slate-100 p-4 rounded text-xs overflow-auto'>{`const res = await fetch('/api/v1/erp/sales', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ items: [{ productId, quantity: 1 }] })
});`}</pre>
  </div>
  <pre className='bg-slate-950 text-slate-100 p-4 rounded text-xs overflow-auto'>{`{
  "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "Dados inválidos", "fields": {"email": ["Email inválido"]} }
}`}</pre>
</div>}
