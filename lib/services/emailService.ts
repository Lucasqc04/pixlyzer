import crypto from 'crypto';

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export class EmailService {
  private static async sendViaSmtp(payload: EmailPayload) {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const user = process.env.SMTP_USER;

    if (!user) {
      console.info('SMTP não configurado. Simulação de envio:', payload.subject, payload.to);
      return;
    }

    // Placeholder para SMTP real (Google SMTP): host/credenciais já suportados por variáveis de ambiente.
    // Em ambientes sem cliente SMTP disponível, registramos no log para rastreabilidade.
    console.info(`SMTP(${host}) -> ${payload.to}: ${payload.subject}`);
    console.info(payload.html);
  }

  static generateToken() {
    return crypto.randomBytes(24).toString('hex');
  }

  static async sendVerificationEmail(email: string, token: string) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const link = `${appUrl}/api/auth/verify-email?token=${token}`;
    await this.sendViaSmtp({
      to: email,
      subject: 'Verifique seu e-mail no Pixlyzer ERP',
      html: `<p>Olá!</p><p>Confirme seu e-mail clicando no botão abaixo:</p><p><a href="${link}">Verificar e-mail</a></p><p>Este link expira em 24h.</p>`,
    });
  }

  static async sendInvitationEmail(email: string, token: string, storeName: string) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const link = `${appUrl}/dashboard/erp?inviteToken=${token}`;
    await this.sendViaSmtp({
      to: email,
      subject: `Convite para a loja ${storeName}`,
      html: `<p>Você foi convidado para participar da loja <strong>${storeName}</strong>.</p><p><a href="${link}">Aceitar convite</a></p>`,
    });
  }
}
