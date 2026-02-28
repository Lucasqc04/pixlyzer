'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

interface ApiKey {
  id: string;
  usage: number;
  monthlyLimit: number;
  revoked: boolean;
  createdAt: string;
  lastUsedAt?: string;
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/v1/apikey');
      const data = await response.json();

      if (data.success) {
        setApiKeys(data.data);
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    setCreating(true);
    try {
      const response = await fetch('/api/v1/apikey', { method: 'POST' });
      const data = await response.json();

      if (data.success) {
        setNewKey(data.data.key);
        fetchApiKeys();
      }
    } catch (error) {
      console.error('Error creating API key:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm('Tem certeza que deseja revogar esta API key?')) return;

    try {
      const response = await fetch(`/api/v1/apikey?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchApiKeys();
      }
    } catch (error) {
      console.error('Error revoking API key:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">API Keys</h1>
          <p className="text-gray-600">
            Gerencie suas chaves de acesso à API pública
          </p>
        </div>
        <Button onClick={handleCreateKey} disabled={creating} className="gap-2">
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Nova API Key
        </Button>
      </div>

      {/* New Key Alert */}
      {newKey && (
        <Alert className="bg-green-50 border-green-200">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="flex flex-col gap-2">
            <p className="font-medium text-green-900">
              API Key criada com sucesso! Copie agora, pois não será mostrada novamente.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-green-100 px-3 py-2 rounded text-sm break-all">
                {newKey}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(newKey)}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setNewKey(null)}
              className="self-start"
            >
              Fechar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Warning */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Mantenha suas API keys seguras. Não compartilhe ou exponha em código cliente.
        </AlertDescription>
      </Alert>

      {/* API Keys List */}
      <div className="space-y-4">
        {apiKeys.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Key className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">Nenhuma API key criada</p>
              <Button onClick={handleCreateKey} variant="outline" className="mt-4">
                Criar primeira API key
              </Button>
            </CardContent>
          </Card>
        ) : (
          apiKeys.map((key) => (
            <Card key={key.id}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Key className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{key.id.slice(0, 8)}...</p>
                        {key.revoked ? (
                          <Badge variant="destructive">Revogada</Badge>
                        ) : (
                          <Badge variant="success">Ativa</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        Criada em {new Date(key.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold">
                        {key.usage} / {key.monthlyLimit}
                      </p>
                      <p className="text-xs text-gray-500">uso mensal</p>
                    </div>

                    {!key.revoked && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRevokeKey(key.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {key.lastUsedAt && (
                  <p className="text-sm text-gray-500 mt-4">
                    Último uso:{' '}
                    {new Date(key.lastUsedAt).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Usage Info */}
      <Card>
        <CardHeader>
          <CardTitle>Como Usar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Inclua sua API key no header de todas as requisições:
          </p>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">
              <code>{`curl -X POST ${(process.env.NEXT_PUBLIC_APP_URL || 'https://pixlyzer.vercel.app')}/api/v1/ocr \
  -H "x-api-key: sk_live_sua_chave_aqui" \
  -F "file=@comprovante.jpg"`}</code>
            </pre>
          </div>
          <p className="text-gray-600">
            Consulte a{' '}
            <a href={(process.env.NEXT_PUBLIC_APP_URL || 'https://pixlyzer.vercel.app') + '/docs'} className="text-blue-600 hover:underline">
              documentação completa
            </a>{' '}
            para mais detalhes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
