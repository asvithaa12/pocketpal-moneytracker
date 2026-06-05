import { useEffect, useRef, useState } from 'react';
import { X, Camera } from 'lucide-react';

export default function QRScanner({ onScan, onClose }) {
  const containerRef = useRef(null);
  const scannerRef = useRef(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (!mounted || !containerRef.current) return;

        const scanner = new Html5Qrcode('qr-reader-container');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decoded) => {
            if (mounted) {
              onScan?.(decoded);
              scanner.stop().catch(() => {});
            }
          },
          () => {}
        );

        if (mounted) setReady(true);
      } catch (err) {
        if (mounted) {
          if (err?.message?.includes('permission') || err?.name === 'NotAllowedError') {
            setError('Camera permission denied. Please allow camera access and try again.');
          } else {
            setError('Unable to start camera. Please use manual entry.');
          }
        }
      }
    }

    init();

    return () => {
      mounted = false;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-card w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2">
            <Camera size={20} className="text-[#556B2F]" />
            <h3 className="font-semibold text-[#1F2937]">Scan QR Code</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {error ? (
          <div className="p-6 text-center">
            <div className="text-4xl mb-3">📷</div>
            <p className="text-sm text-slate-600 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="bg-[#556B2F] text-white px-6 py-2 rounded-btn text-sm font-medium"
            >
              Use Manual Entry
            </button>
          </div>
        ) : (
          <div className="p-4">
            <div
              id="qr-reader-container"
              ref={containerRef}
              className="w-full rounded-lg overflow-hidden bg-slate-100"
              style={{ minHeight: '280px' }}
            />
            {!ready && !error && (
              <p className="text-center text-sm text-slate-400 mt-3">Starting camera…</p>
            )}
            {ready && (
              <p className="text-center text-sm text-[#556B2F] mt-3 font-medium">
                Point at a merchant QR code
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
