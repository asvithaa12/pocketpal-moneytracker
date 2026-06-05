import { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const COLORS = {
  success: { bg: '#F8F7F2', border: '#D4AF37', text: '#3D4A20', icon: '#D4AF37' },
  error: { bg: '#FEF2F2', border: '#EF4444', text: '#991B1B', icon: '#EF4444' },
  info: { bg: '#EFF6FF', border: '#3B82F6', text: '#1E40AF', icon: '#3B82F6' },
};

export function Toast({ message, type = 'success', onDismiss }) {
  const colors = COLORS[type] || COLORS.info;
  const Icon = ICONS[type] || Info;

  useEffect(() => {
    const t = setTimeout(() => onDismiss?.(), 2500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className="toast-enter fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-pill shadow-lg max-w-xs w-full mx-4 border"
      style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
    >
      <Icon size={16} style={{ color: colors.icon }} className="flex-shrink-0" />
      <span className="text-sm font-medium flex-1">{message}</span>
      <button onClick={onDismiss} className="flex-shrink-0">
        <X size={14} />
      </button>
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState(null);

  const show = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
  };

  const dismiss = () => setToast(null);

  return { toast, show, dismiss };
}
