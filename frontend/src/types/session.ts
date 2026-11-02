import { PackageItem } from './package';
import { CreatePaymentResponse } from './payment';

export type SessionState =
  | 'IDLE'
  | 'PACKAGE_SELECTION'
  | 'AWAITING_PAYMENT'
  | 'PAYMENT_CONFIRMED'
  | 'PHOTO_CAPTURE'
  | 'PHOTO_REVIEW'
  | 'PHOTO_EDITOR'
  | 'ADD_PRINT'
  | 'PRINTING'
  | 'DELIVERY'
  | 'COMPLETED'
  | 'CANCELLED';

export interface PhotoAsset {
  id: string;
  url: string;
  thumbnailUrl?: string;
  capturedAt: string;
  isSelected?: boolean;
}

export interface CustomerSession {
  sessionId: string;
  sessionCode: string;
  state: SessionState;
  package?: PackageItem;
  payment?: CreatePaymentResponse;
  photos: PhotoAsset[];
  selectedPhotoIds: string[];
  additionalPrints: number;
  templateId?: string;
  createdAt: string;
  expiresAt: string;
}
