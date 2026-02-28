'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Code, FileText, Key, AlertTriangle, CheckCircle } from 'lucide-react';

export default function DocsPage() {
  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pixlyzer.vercel.app';
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-gray-900">
            Pixlyzer
          </Link>
          <nav className="flex gap-4">
            <Link href="/docs" className="text-blue-600 font-medium">
              Documentação
            </Link>
            <Link href="/pricing" className="text-gray-600 hover:text-gray-900">
              Preços
            </Link>
            <Link href="/login" className="text-gray-600 hover:text-gray-900">
              Login
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Documentação da API
          </h1>
          <p className="text-xl text-gray-600">
            Integre o Pixlyzer em suas aplicações com nossa API REST simples e poderosa.
          </p>
        </div>

        {/* Authentication */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Autenticação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Todas as requisições à API pública devem incluir sua API key no header{' '}
              <code className="bg-gray-100 px-2 py-1 rounded">x-api-key</code>.
            </p>

            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">
                <code></code>
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Endpoints */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Endpoints
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="curl">
              <TabsList className="mb-4">
                <TabsTrigger value="curl">cURL</TabsTrigger>
                <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                <TabsTrigger value="python">Python</TabsTrigger>
              </TabsList>

              <TabsContent value="curl">
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                  <pre className="text-sm">
                    <code>{`curl -X POST ${BASE_URL}/api/v1/ocr \\
          -H "x-api-key: SUA_API_KEY_AQUI" \\
          -F "file=@comprovante.jpg"`}</code>
                  </pre>
                </div>
              </TabsContent>

              <TabsContent value="javascript">
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                  <pre className="text-sm">
                    <code>{`const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('${BASE_URL}/api/v1/ocr', {
  method: 'POST',
  headers: {
    'x-api-key': 'SUA_API_KEY_AQUI',
  },
  body: formData,
});

const data = await response.json();
console.log(data);`}</code>
                  </pre>
                </div>
              </TabsContent>

              <TabsContent value="python">
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                  <pre className="text-sm">
                    <code>{`import requests

url = '${BASE_URL}/api/v1/ocr'
headers = {'x-api-key': 'SUA_API_KEY_AQUI'}
files = {'file': open('comprovante.jpg', 'rb')}

response = requests.post(url, headers=headers, files=files)
data = response.json()
print(data)`}</code>
                  </pre>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Response */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Resposta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              A API retorna os dados extraídos do comprovante em formato JSON:
            </p>

            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">
                <code>{`{
  "success": true,
  "data": {
    "id": "uuid-do-upload",
    "valor": 150.00,
    "data": "2024-01-15T10:30:00Z",
    "banco": "NUBANK",
    "pagador": "João Silva",
    "recebedor": "Maria Souza",
    "txId": "abc123def456",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}`}</code>
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Limits */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Limites</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Plano FREE</span>
                  <Badge variant="secondary">10 OCR/mês</Badge>
                </div>
                <p className="text-sm text-gray-600">
                  Ideal para testes e uso pessoal ocasional.
                </p>
              </div>

              <div className="border rounded-lg p-4 border-blue-500">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Plano PRO</span>
                  <Badge className="bg-blue-500">500 OCR/mês</Badge>
                </div>
                <p className="text-sm text-gray-600">
                  Para profissionais e empresas com maior volume.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Codes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Códigos de Erro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">Código</th>
                    <th className="text-left py-2 px-4">Status</th>
                    <th className="text-left py-2 px-4">Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 px-4 font-mono">API_KEY_REQUIRED</td>
                    <td className="py-2 px-4">401</td>
                    <td className="py-2 px-4">Header x-api-key não foi fornecido</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-4 font-mono">INVALID_KEY</td>
                    <td className="py-2 px-4">401</td>
                    <td className="py-2 px-4">API key inválida ou revogada</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-4 font-mono">LIMIT_EXCEEDED</td>
                    <td className="py-2 px-4">429</td>
                    <td className="py-2 px-4">Limite mensal de OCR excedido</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-4 font-mono">FILE_REQUIRED</td>
                    <td className="py-2 px-4">400</td>
                    <td className="py-2 px-4">Nenhum arquivo foi enviado</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-4 font-mono">INVALID_FILE_TYPE</td>
                    <td className="py-2 px-4">400</td>
                    <td className="py-2 px-4">Tipo de arquivo não suportado</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-4 font-mono">FILE_TOO_LARGE</td>
                    <td className="py-2 px-4">400</td>
                    <td className="py-2 px-4">Arquivo maior que 10MB</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 font-mono">PROCESSING_ERROR</td>
                    <td className="py-2 px-4">500</td>
                    <td className="py-2 px-4">Erro ao processar o arquivo</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="flex items-center gap-2 font-semibold text-blue-900 mb-2">
            <CheckCircle className="h-5 w-5" />
            Dicas para Melhores Resultados
          </h3>
          <ul className="space-y-2 text-blue-800">
            <li>• Use imagens com boa resolução (mínimo 300 DPI recomendado)</li>
            <li>• Evite fotos com reflexos ou sombras</li>
            <li>• Certifique-se de que todo o texto está visível</li>
            <li>• Formatos suportados: JPEG, PNG</li>
            <li>• Tamanho máximo: 10MB</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
