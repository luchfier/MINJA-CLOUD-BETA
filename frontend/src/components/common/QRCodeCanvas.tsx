import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export interface QRCodeCanvasProps {
  value: string;
  size?: number;
  level?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
  fgColor?: string;
  bgColor?: string;
  className?: string;
  onClick?: () => void;
}

export const QRCodeCanvas: React.FC<QRCodeCanvasProps> = ({
  value,
  size = 180,
  level = 'M',
  margin = 1,
  fgColor = '#000000',
  bgColor = '#ffffff',
  className = '',
  onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;

    QRCode.toCanvas(
      canvasRef.current,
      value,
      {
        width: size,
        margin,
        errorCorrectionLevel: level,
        color: {
          dark: fgColor,
          light: bgColor,
        },
      },
      (error) => {
        if (error) {
          console.warn('[QRCodeCanvas] Gagal membuat QR code lokal:', error);
        }
      }
    );
  }, [value, size, level, margin, fgColor, bgColor]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`rounded-lg select-none ${className}`}
      onClick={onClick}
    />
  );
};
