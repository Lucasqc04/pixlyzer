import Link from 'next/link';
import { PageHeader } from '@/components/erp/shared';
export default function SettingsHub(){return <div className='space-y-4'><PageHeader title='Configurações' subtitle='Administração da loja, equipe e perfil.'/><div className='grid md:grid-cols-2 gap-3'>{[['/dashboard/settings/store','Loja'],['/dashboard/settings/team','Equipe'],['/dashboard/settings/billing','Plano e billing'],['/dashboard/settings/profile','Perfil']].map(([href,label])=><Link key={href} href={href} className='bg-white border rounded p-4 hover:bg-slate-50'>{label}</Link>)}</div></div>}
