'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { Loader2, Upload, FileImage, CheckCircle, X } from 'lucide-react';

import { formatCurrency } from '@/lib/utils';


interface UploadResult {
  id?: string;
  valor?: number;
  data?: string;
  banco?: string;
  pagador?: string;
  recebedor?: string;
  txId?: string;
  status?: 'pending' | 'processing' | 'success' | 'error';
  errorMessage?: string;
}
type UploadResultArray = UploadResult[];
export default function UploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<UploadResultArray | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Definir label do botão de upload
  let uploadButtonLabel = '';
  if (loading) {
    uploadButtonLabel = 'Processando...';
  } else if (files.length === 1) {
    uploadButtonLabel = 'Processar 1 Comprovante';
  } else if (files.length > 1) {
    uploadButtonLabel = `Processar ${files.length} Comprovantes`;
  } else {
    uploadButtonLabel = 'Processar Comprovante';
  }
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFiles(acceptedFiles);
      setError('');
      setResults(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png'],
    },
    maxFiles: 1000,
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true,
  });

  // Processa arquivos sequencialmente
  const handleUpload = async () => {
    if (!files.length) return;
    setLoading(true);
    setError('');
    setProgress({ current: 0, total: files.length });

    const resultsArr: UploadResultArray = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress({ current: i + 1, total: files.length });
      resultsArr.push({ status: 'processing' });
      setResults([...resultsArr]);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch('/api/uploads', {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        if (!response.ok) {
          let msg = data.message || 'Erro ao processar arquivo';
          if (data.error === 'LIMIT_EXCEEDED') {
            msg = 'Limite mensal excedido. Faça upgrade para PRO.';
          }
          resultsArr[i] = {
            status: 'error',
            errorMessage: msg,
          };
        } else {
          // Sucesso
          const result = Array.isArray(data.data) ? data.data[0] : data.data;
          resultsArr[i] = {
            ...result,
            status: 'success',
          };
        }
        setResults([...resultsArr]);
      } catch (err: any) {
        resultsArr[i] = {
          status: 'error',
          errorMessage: err.message,
        };
        setResults([...resultsArr]);
      }
    }
    setLoading(false);
    setFiles([]);
  };

  const clearResult = () => {
    setResults(null);
    setFiles([]);
    setError('');
    setProgress({ current: 0, total: 0 });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Upload de Comprovante</h1>
        <p className="text-gray-600">
          Envie seu comprovante PIX para extração automática de dados
        </p>
      </div>

      {/* Upload Area */}
      {!results && (
        <Card>
          <CardContent className="pt-6">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              {isDragActive ? (
                <p className="text-lg text-blue-600">Solte os arquivos aqui...</p>
              ) : (
                <>
                  <p className="text-lg text-gray-600 mb-2">
                    Arraste e solte um ou mais arquivos aqui, ou clique para selecionar
                  </p>
                  <p className="text-sm text-gray-400">
                    JPEG, PNG até 10MB cada (máx. 1000 arquivos)
                  </p>
                </>
              )}
            </div>

            {files.length > 0 && (
              <div className="mt-6 space-y-2">
                {files.map((file) => (
                  <div key={file.name + file.size} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <FileImage className="h-8 w-8 text-blue-500" />
                    <div className="flex-1">
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={() => setFiles(files.filter((f) => f !== file))}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ))}

                {error && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Barra de progresso */}
                {loading && (
                  <div className="w-full bg-gray-200 rounded-full h-3 mt-4">
                    <div
                      className="bg-blue-500 h-3 rounded-full transition-all"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    ></div>
                  </div>
                )}
                {loading && (
                  <div className="text-center text-sm text-gray-500 mt-2">
                    Processando {progress.current} de {progress.total} comprovantes...
                  </div>
                )}

                <Button
                  className="w-full mt-4"
                  onClick={handleUpload}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {uploadButtonLabel}
                    </>
                  ) : (
                    uploadButtonLabel
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {results && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <CardTitle>Dados Extraídos</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              {results.map((result, idx) => (
                <div key={result.id || idx} className="p-4 bg-gray-50 rounded-lg mb-2">
                  <div className="mb-2 font-semibold text-blue-600">Comprovante {idx + 1}</div>
                  {result.status === 'processing' && (
                    <div className="flex items-center gap-2 text-blue-500 mb-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Processando...
                    </div>
                  )}
                  {result.status === 'error' && (
                    <div className="flex items-center gap-2 text-red-500 mb-2">
                      <X className="h-4 w-4" /> Erro: {result.errorMessage}
                    </div>
                  )}
                  {result.status === 'success' && (
                    <>
                      <div className="mb-1 text-sm text-gray-500">Valor</div>
                      <div className="text-xl font-semibold mb-2">{result.valor ? formatCurrency(result.valor) : '-'}</div>
                      <div className="mb-1 text-sm text-gray-500">Data</div>
                      <div className="text-xl font-semibold mb-2">{result.data ? new Date(result.data).toLocaleDateString('pt-BR') : '-'}</div>
                      <div className="mb-1 text-sm text-gray-500">Banco</div>
                      <div className="text-xl font-semibold mb-2">{result.banco || '-'}</div>
                      <div className="mb-1 text-sm text-gray-500">Pagador</div>
                      <div className="text-xl font-semibold mb-2">{result.pagador || '-'}</div>
                      <div className="mb-1 text-sm text-gray-500">Recebedor</div>
                      <div className="text-xl font-semibold mb-2">{result.recebedor || '-'}</div>
                      {result.txId && (
                        <>
                          <div className="mb-1 text-sm text-gray-500">ID da Transação</div>
                          <div className="text-lg font-mono break-all mb-2">{result.txId}</div>
                        </>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={clearResult} variant="outline" className="flex-1">
                Novo Upload
              </Button>
              <Button
                onClick={() => router.push('/dashboard')}
                className="flex-1"
              >
                Ver Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dicas para Melhores Resultados</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              Use imagens com boa resolução (mínimo 300 DPI)
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              Evite fotos com reflexos ou sombras
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              Certifique-se de que todo o texto está visível
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              Formatos suportados: JPEG, PNG (máx. 10MB)
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
