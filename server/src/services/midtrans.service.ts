// src/services/midtrans.service.ts
// Service integrasi Midtrans Core API (QRIS Dinamis)
// Sesuai ARCHITECTURE.md §6.4 & API_CONTRACT.md §3.6

import crypto from 'node:crypto';
import { getEnv } from '../config/env.js';
import { AppError, ErrorCode } from '../types/common.types.js';

export interface MidtransChargeQrisResult {
  transactionId: string;
  orderId: string;
  grossAmount: number;
  transactionStatus: string;
  qrString: string;
  qrImageUrl?: string;
  simulatorUrl?: string;
  expiryTime: Date;
  rawPayload: any;
}

export interface MidtransStatusResult {
  statusCode: string;
  transactionId: string;
  orderId: string;
  grossAmount: number;
  transactionStatus: string;
  fraudStatus?: string;
  settlementTime?: string;
  signatureKey?: string;
  rawPayload: any;
}

export class MidtransService {
  private serverKey: string;
  private isProduction: boolean;

  constructor() {
    const env = getEnv();
    this.serverKey = env.MIDTRANS_SERVER_KEY || '';
    this.isProduction = env.MIDTRANS_IS_PRODUCTION || false;
  }

  public isConfigured(): boolean {
    return this.serverKey.trim().length > 0;
  }

  private getBaseUrl(): string {
    return this.isProduction
      ? 'https://api.midtrans.com'
      : 'https://api.sandbox.midtrans.com';
  }

  private getAuthHeader(): string {
    return `Basic ${Buffer.from(`${this.serverKey}:`).toString('base64')}`;
  }

  /**
   * Mengirim charge request QRIS ke Midtrans Core API
   */
  async createQrisCharge(orderId: string, grossAmount: number): Promise<MidtransChargeQrisResult> {
    if (!this.isConfigured() || process.env['NODE_ENV'] === 'test') {
      // Fallback offline mock jika server key belum dikonfigurasi atau mode unit test
      const mockQr = `00020101021226670016ID.CO.MIDTRANS.WWW01189360091800000000000215${orderId}51450015ID.OR.GPN.WWW02150000000000000005204581253033605405500005802ID5915MINJA PHOTOBOOTH6007JAKARTA61051234062070703A0163041A2F`;
      return {
        transactionId: `mock-tx-${Date.now()}`,
        orderId,
        grossAmount,
        transactionStatus: 'pending',
        qrString: mockQr,
        qrImageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(mockQr)}`,
        expiryTime: new Date(Date.now() + 15 * 60 * 1000),
        rawPayload: { simulated: true },
      };
    }

    const endpoint = `${this.getBaseUrl()}/v2/charge`;
    const payload = {
      payment_type: 'qris',
      transaction_details: {
        order_id: orderId,
        gross_amount: Math.round(grossAmount),
      },
      qris: {
        acquirer: 'gopay',
      },
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: this.getAuthHeader(),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000), // 10s connection timeout
      });

      const data = (await response.json()) as any;

      if (!response.ok || (data.status_code && !data.status_code.startsWith('2'))) {
        throw new AppError(
          response.status || 500,
          ErrorCode.PAYMENT_CREATION_FAILED,
          `Gagal membuat transaksi QRIS Midtrans: ${data.status_message || response.statusText}`,
          { midtransResponse: data }
        );
      }

      // Cari URL QR code dan Deeplink simulator dari array actions
      const qrAction = Array.isArray(data.actions)
        ? data.actions.find((a: any) => a.name === 'generate-qr-code')
        : null;

      const deeplinkAction = Array.isArray(data.actions)
        ? data.actions.find((a: any) => a.name === 'deeplink-redirect')
        : null;

      // Expiry time (default 15 menit dari sekarang)
      const expiryTime = data.expiry_time
        ? new Date(data.expiry_time)
        : new Date(Date.now() + 15 * 60 * 1000);

      return {
        transactionId: data.transaction_id || `midtrans-${orderId}`,
        orderId: data.order_id || orderId,
        grossAmount: Math.round(Number(data.gross_amount) || grossAmount),
        transactionStatus: data.transaction_status || 'pending',
        qrString: data.qr_string || (qrAction ? qrAction.url : ''),
        qrImageUrl: qrAction?.url || undefined,
        simulatorUrl: deeplinkAction?.url || undefined,
        expiryTime,
        rawPayload: data,
      };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError(
        500,
        ErrorCode.PAYMENT_CREATION_FAILED,
        `Koneksi ke Midtrans gagal: ${err.message}`,
        { error: err }
      );
    }
  }

  /**
   * Mengecek status transaksi langsung ke Midtrans API
   */
  async checkTransactionStatus(orderId: string): Promise<MidtransStatusResult | null> {
    if (!this.isConfigured()) {
      return null;
    }

    const endpoint = `${this.getBaseUrl()}/v2/${encodeURIComponent(orderId)}/status`;

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: this.getAuthHeader(),
        },
        signal: AbortSignal.timeout(8000), // 8s timeout
      });

      const data = (await response.json()) as any;

      if (!response.ok) {
        if (response.status === 404) return null;
        return null;
      }

      return {
        statusCode: data.status_code,
        transactionId: data.transaction_id,
        orderId: data.order_id,
        grossAmount: Math.round(Number(data.gross_amount) || 0),
        transactionStatus: data.transaction_status,
        fraudStatus: data.fraud_status,
        settlementTime: data.settlement_time,
        signatureKey: data.signature_key,
        rawPayload: data,
      };
    } catch (err) {
      console.warn(`[MidtransService] Gagal cek status untuk order ${orderId}:`, err);
      return null;
    }
  }

  /**
   * Validasi signature key SHA512 dari webhook notification Midtrans
   */
  verifySignatureKey(
    orderId: string,
    statusCode: string,
    grossAmount: string,
    signatureKey: string
  ): boolean {
    if (!this.serverKey) return false;

    const source = `${orderId}${statusCode}${grossAmount}${this.serverKey}`;
    const expected = crypto.createHash('sha512').update(source).digest('hex');

    return expected.toLowerCase() === signatureKey.toLowerCase();
  }
}
