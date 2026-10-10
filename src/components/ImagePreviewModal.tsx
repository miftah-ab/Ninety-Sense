import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

interface Props {
  isOpen: boolean;
  imageUrl: string | null;
  title: string;
  subtitle?: string;
  driveUrl?: string;
  onClose: () => void;
}

export const ImagePreviewModal: React.FC<Props> = ({
  isOpen,
  imageUrl,
  title,
  subtitle,
  driveUrl,
  onClose,
}) => {
  if (!isOpen || !imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1B19]/80 backdrop-blur-sm">
      <div className="bg-[#FAF8F2] border border-[#D7D0C0] rounded-lg max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-[#D7D0C0] flex items-center justify-between bg-[#ECE6D8]/50">
          <div>
            <h3 className="text-sm font-semibold text-[#1C1B19]">{title}</h3>
            {subtitle && <p className="text-xs text-[#625E56] mt-0.5 line-clamp-1">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            {driveUrl && (
              <a
                href={driveUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-[#1C1B19] bg-[#FAF8F2] border border-[#D7D0C0] hover:bg-[#ECE6D8] transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Drive</span>
              </a>
            )}
            <a
              href={imageUrl}
              download={title.replace(/\s+/g, '_') + '.png'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-[#F4F0E6] bg-[#A94336] hover:bg-[#91352A] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded text-[#625E56] hover:text-[#1C1B19] hover:bg-[#ECE6D8] ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 flex-1 flex items-center justify-center bg-[#1C1B19]/90 overflow-auto">
          <img
            src={imageUrl}
            alt={title}
            className="max-h-[75vh] max-w-full object-contain rounded border border-[#D7D0C0]/20 shadow-md"
          />
        </div>
      </div>
    </div>
  );
};
