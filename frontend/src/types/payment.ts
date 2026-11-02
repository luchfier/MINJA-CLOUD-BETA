export type PaymentMethod = 'qris' | 'cash';

export type PaymentStatus = 
  | 'pending'
  | 'settlement'
  | 'expire'
  | 'cancel'
  | 'deny';

export interface CreatePaymentRequest {
  sessionId: string;
  paymentMethod: PaymentMethod;
  voucherCode?: string;
}

export interface CreatePaymentResponse {
  paymentId: string;
  orderId: string;
  paymentMethod: PaymentMethod;
  qrString?: string;
  qrUrl?: string;
  simulatorUrl?: string;
  basePrice: number;
  additionalPrintsTotal: number;
  voucherCode?: string;
  discountAmount: number;
  grossAmount: number;
  expiryTime: string;
  status: PaymentStatus;
  cashDetails?: {
    cashierNote?: string;
    receivedAmount?: number;
    changeAmount?: number;
    confirmedBy?: string;
    confirmedAt?: string;
  };
}

export interface PaymentStatusCheckResponse {
  orderId: string;
  paymentMethod: PaymentMethod;
  transactionStatus: PaymentStatus;
  isVerified: boolean;
  basePrice?: number;
  discountAmount?: number;
  grossAmount: number;
  paymentType: string;
  settlementTime?: string;
  cashDetails?: {
    receivedAmount?: number;
    changeAmount?: number;
    confirmedBy?: string;
    confirmedAt?: string;
  };
}

export interface CashConfirmationRequest {
  orderId: string;
  adminPin: string;
  receivedAmount: number;
  operatorId?: string;
  cashierNote?: string;
}

export interface CashConfirmationResponse {
  orderId: string;
  status: 'settlement';
  grossAmount: number;
  receivedAmount: number;
  changeAmount: number;
  confirmedBy: string;
  confirmedAt: string;
}

export interface CashAuditLogItem {
  id: string;
  orderId: string;
  operatorId: string;
  grossAmount: number;
  receivedAmount: number;
  changeAmount: number;
  timestamp: string;
  note?: string;
}

export interface CashPendingTransaction {
  id: string;
  orderId: string;
  sessionCode: string;
  packageName: string;
  paymentMethod: 'cash';
  subtotal: number;
  voucherCode?: string;
  discountAmount: number;
  grossAmount: number;
  status: 'pending';
  createdAt: string;
  expiresAt: string;
}
