import crypto from 'crypto';

interface EmailPayload { to: string; subject: string; html: string; }

export class EmailService {
  private static async sendViaSmtp(payload: EmailPayload) {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const user = process.env.SMTP_USER;
    if (!user) { console.info('SMTP não configurado. Simulação de envio:', payload.subject, payload.to); console.info(payload.html); return; }
    console.info(`SMTP(${host}) -> ${payload.to}: ${payload.subject}`);
    console.info(payload.html);
  }

  static generateToken() { return crypto.randomBytes(24).toString('hex'); }

  static generateVerificationCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  static async sendVerificationCodeEmail(email: string, code: string) {
    await this.sendViaSmtp({
      to: email,
      subject: 'Seu código de verificação Pixlyzer',
      html: `<p>Seu código de verificação é:</p><h2 style="letter-spacing:4px">${code}</h2><p>Expira em 10 minutos.</p>`,
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
