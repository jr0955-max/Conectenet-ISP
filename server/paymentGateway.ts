import QRCode from 'qrcode';
import { db } from './db.js';
import { mikrotikService } from './mikrotik.js';

class PaymentGatewayService {
  // Generate EMV Pix payload string and QR Code Image
  public async generatePixPayload(invoiceId: string, amount: number, clientName: string): Promise<{ pixCopyPaste: string; qrCodeDataUrl: string }> {
    const pixKey = db.gatewayConfig.pixKey;
    const name = db.gatewayConfig.beneficiaryName.slice(0, 25);
    const city = db.gatewayConfig.beneficiaryCity.slice(0, 15);
    const formattedAmount = amount.toFixed(2);

    // Standard Brazilian EMV Pix String format
    const pixCopyPaste = `00020126580014br.gov.bcb.pix0136${pixKey}520400005303986540${formattedAmount}5802BR5925${name}6015${city}62170513${invoiceId.slice(0, 13)}6304E5F8`;

    let qrCodeDataUrl = '';
    try {
      qrCodeDataUrl = await QRCode.toDataURL(pixCopyPaste, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 320,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });
    } catch (err) {
      console.error('Failed to generate QR Code:', err);
    }

    return { pixCopyPaste, qrCodeDataUrl };
  }

  // Generate Bank Slip Barcode & Linha Digitável
  public generateBarcode(amount: number): string {
    const formattedVal = Math.floor(amount * 100).toString().padStart(10, '0');
    return `23793.38128 60000.010204 12000.123456 1 9652${formattedVal}`;
  }

  // Process payment confirmation (Automatic reconciliation & instant MikroTik unblock)
  public async processPaymentConfirmation(params: {
    invoiceId: string;
    gateway: 'asaas' | 'mercadopago' | 'efi';
    paymentMethod: 'pix' | 'boleto' | 'credit_card';
    externalId?: string;
    amountPaid?: number;
  }): Promise<{ success: boolean; message: string; unblocked: boolean }> {
    const invoice = db.invoices.find(inv => inv.id === params.invoiceId);
    if (!invoice) {
      throw new Error(`Fatura com ID ${params.invoiceId} não encontrada.`);
    }

    const previousStatus = invoice.status;
    invoice.status = 'paga';
    invoice.paymentDate = new Date().toISOString();

    const client = db.clients.find(c => c.id === invoice.clientId);
    let unblocked = false;

    // Check if client has other overdue invoices
    const otherOverdue = db.invoices.some(
      inv => inv.clientId === invoice.clientId && inv.id !== invoice.id && inv.status === 'atrasada'
    );

    if (client && !otherOverdue) {
      if (client.status === 'blocked') {
        // Trigger immediate unblock on MikroTik RouterOS!
        await mikrotikService.unblockClient(client);
        unblocked = true;
      }
    }

    // Log the automatic webhook reconciliation
    db.addAuditLog({
      type: 'payment',
      action: 'PAYMENT_CONFIRMED',
      message: `Baixa automática via Webhook (${params.gateway.toUpperCase()}): Fatura ${invoice.id} de R$ ${invoice.amount.toFixed(2)} (${invoice.clientName}) quitada com sucesso.${unblocked ? ' Cliente DESBLOQUEADO instantaneamente no MikroTik!' : ''}`,
      status: 'success'
    });

    return {
      success: true,
      message: `Pagamento da fatura ${invoice.id} confirmado com sucesso via ${params.gateway.toUpperCase()}.`,
      unblocked
    };
  }

  // Handle Asaas Webhook event
  public async handleAsaasWebhook(body: any) {
    const event = body.event; // e.g. "PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"
    const payment = body.payment || {};
    
    // Asaas externalReference usually matches our invoiceId
    const invoiceId = payment.externalReference || body.invoiceId;

    if (!invoiceId) {
      return { success: false, message: 'externalReference ou invoiceId ausente no payload do Asaas.' };
    }

    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      return await this.processPaymentConfirmation({
        invoiceId,
        gateway: 'asaas',
        paymentMethod: payment.billingType?.toLowerCase() === 'pix' ? 'pix' : 'boleto',
        externalId: payment.id,
        amountPaid: payment.value
      });
    }

    return { success: true, message: `Evento do Asaas '${event}' recebido e ignorado (não é confirmação de pagamento).` };
  }

  // Handle Mercado Pago Webhook event
  public async handleMercadoPagoWebhook(body: any) {
    const action = body.action || body.type;
    const invoiceId = body.data?.external_reference || body.external_reference || body.invoiceId;

    if (!invoiceId) {
      return { success: false, message: 'external_reference ausente no payload do Mercado Pago.' };
    }

    if (action === 'payment.created' || action === 'payment.updated' || body.status === 'approved') {
      return await this.processPaymentConfirmation({
        invoiceId,
        gateway: 'mercadopago',
        paymentMethod: 'pix',
        externalId: body.data?.id?.toString()
      });
    }

    return { success: true, message: `Evento Mercado Pago '${action}' registrado.` };
  }
}

export const paymentGatewayService = new PaymentGatewayService();
