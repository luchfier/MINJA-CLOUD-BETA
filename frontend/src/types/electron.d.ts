// frontend/src/types/electron.d.ts
// Typed declaration for window.electronKiosk & window.electronPrinter injected by Electron preload

export interface ElectronKioskAPI {
  isElectron: boolean;
  platform: string;
  exitKiosk: (pin?: string) => Promise<{ success: boolean; message?: string }>;
  toggleFullscreen: () => Promise<boolean>;
  getSystemInfo: () => Promise<{
    platform: string;
    arch: string;
    osVersion: string;
    memory: { totalMB: number; freeMB: number };
    kioskMode: boolean;
  }>;
  onKioskEvent: (channel: string, callback: (...args: any[]) => void) => () => void;
}

export interface ElectronPrinterAPI {
  listDevices: () => Promise<any[]>;
  getStatus: (printerName: string) => Promise<any>;
  submitJob: (payload: any) => Promise<any>;
  getQueue: () => Promise<any>;
  manualResume: () => Promise<boolean>;
  cancelJob: () => Promise<boolean>;
  getAuditStats: (dateStr?: string) => Promise<any>;
  openPreferences: (printerName: string) => Promise<{ success: boolean; message: string }>;
  openProperties: (printerName: string) => Promise<{ success: boolean; message: string }>;
  reprintJob: (sessionId: string, reason: string, copies?: number, printerName?: string) => Promise<any>;
  onPrinterEvent: (event: string, callback: (...args: any[]) => void) => () => void;
}

export interface ElectronNativeRendererAPI {
  isAvailable: boolean;
  renderPhoto: (payload: any) => Promise<{
    success: boolean;
    data?: {
      success: boolean;
      printFilePath: string;
      webUrl: string;
      galleryUrl: string;
      thumbnailUrl: string;
      width: number;
      height: number;
      dpi: number;
      sizeBytes: number;
      processingTimeMs: number;
    };
    error?: {
      code: string;
      message: string;
    };
  }>;
}

declare global {
  interface Window {
    electronKiosk?: ElectronKioskAPI;
    electronPrinter?: ElectronPrinterAPI;
    electronNativeRenderer?: ElectronNativeRendererAPI;
  }
}

export {};
