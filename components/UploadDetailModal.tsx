'use client';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface Upload {
  id: string;
  valor: number | null;
  data: string | null;
  banco: string | null;
  pagador: string | null;
  recebedor: string | null;
  txId: string | null;
  fileName: string | null;
  imageData: string | null;
  createdAt: string;
}

interface UploadDetailModalProps {
  readonly isOpen: boolean;
  readonly upload: Upload | null;
  readonly onClose: () => void;
  readonly onSave: (id: string, data: Partial<Upload>) => Promise<void>;
}

export default function UploadDetailModal({ isOpen, upload, onClose, onSave }: UploadDetailModalProps) {
  const [formData, setFormData] = useState<Partial<Upload> | null>(null);
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    if (isOpen && upload) {
      setFormData({
        valor: upload.valor,
        data: upload.data,
        banco: upload.banco,
        pagador: upload.pagador,
        recebedor: upload.recebedor,
        txId: upload.txId,
      });
    } else if (!isOpen) {
      setFormData(null);
    }
  }, [isOpen, upload]);

  const handleChange = (field: string, value: string | number | null) => {
    if (!formData) return;
    setFormData({
      ...formData,
      [field]: value === '' ? null : value
    });
  };

  const handleSave = async () => {
    if (!upload || !formData) return;
    setLoading(true);
    try {
      await onSave(upload.id, formData);
      toast.success('Comprovante atualizado com sucesso!');
      onClose();
    } catch {
      toast.error('Erro ao salvar alterações');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !upload || !formData) return null;

  const isMissingField = !upload.valor || !upload.data || !upload.pagador || !upload.recebedor || !upload.banco;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle>Editar Comprovante</CardTitle>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </CardHeader>

        <CardContent className="space-y-4">
          {isMissingField && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 font-medium">
                ⚠️ Campos faltando: Complete para melhor precisão
              </p>
            </div>
          )}

          {/* Valor */}
          <div>
            <label
              htmlFor="valor"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Valor {formData.valor ? '' : '*'}
            </label>
            <Input
              id="valor"
              type="number"
              step="0.01"
              value={formData.valor || ''}
              onChange={(e) => handleChange('valor', e.target.value ? Number.parseFloat(e.target.value) : null)}
              placeholder="0,00"
              className={formData.valor ? '' : 'border-yellow-300'}
            />
          </div>

          {/* Data */}
          <div>
            <label
              htmlFor="data"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Data {formData.data ? '' : '*'}
            </label>
            <Input
              id="data"
              type="date"
              value={formData.data || ''}
              onChange={(e) => handleChange('data', e.target.value)}
              className={formData.data ? '' : 'border-yellow-300'}
            />
          </div>

          {/* Banco */}
          <div>
            <label
              htmlFor="banco"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Banco {formData.banco ? '' : '*'}
            </label>
            <Input
              id="banco"
              type="text"
              value={formData.banco || ''}
              onChange={(e) => handleChange('banco', e.target.value)}
              placeholder="Ex: BANCO DO BRASIL"
              className={formData.banco ? '' : 'border-yellow-300'}
            />
          </div>

          {/* Pagador */}
          <div>
            <label
              htmlFor="pagador"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Pagador {formData.pagador ? '' : '*'}
            </label>
            <Input
              id="pagador"
              type="text"
              value={formData.pagador || ''}
              onChange={(e) => handleChange('pagador', e.target.value)}
              placeholder="Nome completo"
              className={formData.pagador ? '' : 'border-yellow-300'}
            />
          </div>

          {/* Recebedor */}
          <div>
            <label
              htmlFor="recebedor"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Recebedor {formData.recebedor ? '' : '*'}
            </label>
            <Input
              id="recebedor"
              type="text"
              value={formData.recebedor || ''}
              onChange={(e) => handleChange('recebedor', e.target.value)}
              placeholder="Nome completo"
              className={formData.recebedor ? '' : 'border-yellow-300'}
            />
          </div>

          {/* TX ID */}
          <div>
            <label
              htmlFor="txId"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              ID da Transação
            </label>
            <Input
              id="txId"
              type="text"
              value={formData.txId || ''}
              onChange={(e) => handleChange('txId', e.target.value)}
              placeholder="Ex: E123456789..."
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
