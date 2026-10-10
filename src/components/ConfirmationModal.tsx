import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<Props> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  isDestructive = true,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1B19]/50 backdrop-blur-xs">
      <div className="bg-[#FAF8F2] border border-[#D7D0C0] rounded-lg max-w-md w-full shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-[#D7D0C0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isDestructive ? 'bg-[#FBECEB] text-[#A94336]' : 'bg-[#F8F1E2] text-[#875F20]'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-[#1C1B19]">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded text-[#625E56] hover:text-[#1C1B19] hover:bg-[#ECE6D8]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 text-sm text-[#625E56] leading-relaxed">
          {message}
        </div>

        <div className="p-4 bg-[#ECE6D8]/50 border-t border-[#D7D0C0] flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded text-xs font-medium text-[#1C1B19] bg-[#FAF8F2] border border-[#D7D0C0] hover:bg-[#ECE6D8] transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded text-xs font-medium text-[#F4F0E6] transition-colors ${
              isDestructive
                ? 'bg-[#A94336] hover:bg-[#91352A]'
                : 'bg-[#1C1B19] hover:bg-[#2E2C28]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
