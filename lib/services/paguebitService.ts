import axios from 'axios';
import { prisma } from '@/lib/prisma';
import { $Enums } from '@prisma/client';

const PAGUEBIT_API_URL = 'https://public-api-prod.paguebit.com';
const PAGUEBIT_API_TOKEN = process.env.PAGUEBIT_API_TOKEN!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

export interface PaguebitPaymentRequest {
  amount: number;
  email: string;
  observation?: string;
  webhookUrl?: string;
}

export interface PaguebitPaymentResponse {
  id: string;
  status: string;
  amount: number;
  qrCodeUrl?: string;
  qrCopyPaste?: string;
  observation?: string;
  createdAt: string;
}

export interface PaguebitWebhookPayload {
  id: string;
  status: string;
  previousStatus?: string;
  amount: number;
  paidAt?: string;
}

export class PaguebitService {
  private static getHeaders() {
    return {
      Authorization: `Bearer ${PAGUEBIT_API_TOKEN}`,
      'Content-Type': 'application/json',
    };
  }

  static async createPayment(data: PaguebitPaymentRequest): Promise<PaguebitPaymentResponse> {
    try {
      // Garante que o webhookUrl seja uma URL absoluta válida
      let webhookUrl = data.webhookUrl;
      if (!webhookUrl) {
        webhookUrl = APP_URL;
        if (webhookUrl.endsWith('/')) webhookUrl = webhookUrl.slice(0, -1);
        webhookUrl += '/api/v1/webhooks/paguebit';
      }
      const payload = {
        amount: data.amount,
        email: data.email,
        observation: data.observation || 'Pagamento Pixlyzer',
        webhookUrl,
      };
      console.log('Enviando para Paguebit:', payload);
      const response = await axios.post(
        `${PAGUEBIT_API_URL}/api-public/payments`,
        payload,
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error: any) {
      console.error('Paguebit create payment error:', error.response?.data || error.message);
      throw new Error('Falha ao criar pagamento no Paguebit');
    }
  }

  static async getPayment(paymentId: string): Promise<PaguebitPaymentResponse> {
    try {
      const response = await axios.get(
        `${PAGUEBIT_API_URL}/api-public/payments/${paymentId}`,
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error: any) {
      console.error('Paguebit get payment error:', error.response?.data || error.message);
      throw new Error('Falha ao consultar pagamento no Paguebit');
    }
  }

  static async processWebhook(payload: PaguebitWebhookPayload): Promise<void> {
    const { id: paguebitPaymentId, status } = payload;

    // Buscar pagamento no banco
    const payment = await prisma.payment.findUnique({
      where: { paguebitPaymentId },
    });

    if (!payment) {
      console.error(`Pagamento não encontrado: ${paguebitPaymentId}`);
      return;
    }

    // Atualizar status do pagamento
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: status.toUpperCase() as $Enums.PaymentStatus },
    });

    // Se o pagamento foi aprovado, atualizar plano do usuário
    if (status === 'approved') {
      await this.activateProPlan(payment.userId);
    }
  }

  private static async activateProPlan(userId: string): Promise<void> {
    // Atualizar plano do usuário para PRO
    await prisma.user.update({
      where: { id: userId },
      data: { plan: 'PRO' },
    });

    // Atualizar limite das API keys
    await prisma.apiKey.updateMany({
      where: { userId },
      data: { monthlyLimit: 500 },
    });

    console.log(`Plano PRO ativado para usuário: ${userId}`);
  }

  static async createProPayment(userId: string, email: string): Promise<PaguebitPaymentResponse> {
    const amount = 29.9; // Valor do plano PRO

    // Criar pagamento no Paguebit
    const paguebitPayment = await this.createPayment({
      amount,
      email,
      observation: 'Upgrade PRO Pixlyzer',
    });

    // Salvar no banco
    await prisma.payment.create({
      data: {
        userId,
        paguebitPaymentId: paguebitPayment.id,
        status: paguebitPayment.status.toUpperCase() as $Enums.PaymentStatus,
        amount: paguebitPayment.amount,
        qrCodeUrl: paguebitPayment.qrCodeUrl,
        qrCopyPaste: paguebitPayment.qrCopyPaste,
        observation: paguebitPayment.observation,
      },
    });

    return paguebitPayment;
  }

  static async getUserPayments(userId: string) {
    return prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  static verifyWebhookSignature(payload: string, signature: string): boolean {
    // Em produção, implementar verificação de assinatura do webhook
    // Isso depende da documentação específica do Paguebit
    // Por enquanto, retornamos true
    return true;
  }
}
