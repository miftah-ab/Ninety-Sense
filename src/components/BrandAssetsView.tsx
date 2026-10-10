import React from 'react';
import {
  UploadCloud,
  ShieldCheck,
  AlertCircle,
  FileCheck,
  Hash,
  Folder,
  RefreshCw,
  ExternalLink,
  Layers,
  Palette,
  Eye,
  CheckCircle2,
  CloudUpload,
} from 'lucide-react';
import { BrandAsset } from '../../server/types';
import { ConfirmationModal } from './ConfirmationModal';
import { GoogleSignInButton } from './GoogleSignInButton';
import { User } from 'firebase/auth';

interface Props {
  brandAsset: BrandAsset | null;
  hasReferenceImage: boolean;
  isDriveConnected: boolean;
  user: User | null;
  onAuthChange: (user: User | null, token: string | null) => void;
  onUploadReference: (base64: string, filename: string, mimeType: string) => Promise<void>;
  onSyncDriveReference?: () => Promise<void>;
  onVerifyDriveReference: () => Promise<void>;
  onOpenImage: (url: string, title: string, subtitle?: string, driveUrl?: string) => void;
}

export const BrandAssetsView: React.FC<Props> = ({
  brandAsset,
  hasReferenceImage,
  isDriveConnected,
  user,
  onAuthChange,
  onUploadReference,
  onSyncDriveReference,
  onVerifyDriveReference,
  onOpenImage,
}) => {
  const [dragActive, setDragActive] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const [verifyMessage, setVerifyMessage] = React.useState<string | null>(null);
  const [replaceModalOpen, setReplaceModalOpen] = React.useState(false);
  const [pendingUploadData, setPendingUploadData] = React.useState<{ base64: string; name: string; mime: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPEG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      const data = { base64, name: file.name, mime: file.type };

      if (brandAsset) {
        // Deliberate replacement confirmation
        setPendingUploadData(data);
        setReplaceModalOpen(true);
      } else {
        executeUpload(data.base64, data.name, data.mime);
      }
    };
    reader.readAsDataURL(file);
  };

  const executeUpload = async (base64: string, name: string, mime: string) => {
    setUploading(true);
    setVerifyMessage(null);
    try {
      await onUploadReference(base64, name, mime);
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setPendingUploadData(null);
    }
  };

  const handleSyncToDrive = async () => {
    if (!onSyncDriveReference) return;
    setSyncing(true);
    setVerifyMessage(null);
    try {
      await onSyncDriveReference();
      setVerifyMessage('Official reference image successfully uploaded to Google Drive and verified!');
    } catch (err: any) {
      alert(err.message || 'Failed to sync to Google Drive');
    } finally {
      setSyncing(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyMessage(null);
    try {
      await onVerifyDriveReference();
      setVerifyMessage('Confirmed retrieveability: Successfully fetched and verified raw image bytes from Google Drive.');
    } catch (err: any) {
      alert(err.message || 'Drive file verification failed');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#FAF8F2] border border-[#D7D0C0] rounded-xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#1C1B19] text-[#F4F0E6]">
                Asset Authority
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#A94336]">
                Mandatory Character Reference
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#1C1B19] tracking-tight">Official Brand Reference Image</h1>
            <p className="text-xs text-[#625E56] max-w-2xl leading-relaxed">
              Upload your official Ninety Sense reference image once. The system permanently saves it in your private
              Google Drive at <code className="bg-[#ECE6D8] px-1 py-0.5 rounded text-[#1C1B19]">Ninety Sense/Brand/official-reference.png</code>,
              stores its Drive file ID, caches the actual image bytes on the server, and automatically attaches the raw image data to
              every scene-generation request without prompting again.
            </p>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-3">
            {hasReferenceImage ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#E7EFE8] border border-[#C5D9C8] text-[#366340] text-xs font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Reference Stored & Ready</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#FBECEB] border border-[#EAC4C1] text-[#A94336] text-xs font-semibold">
                <AlertCircle className="w-4 h-4" />
                <span>Reference Not Uploaded</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Dual Columns: Reference Asset & Visual Constitution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Reference Image Uploader & Status */}
        <div className="bg-[#FAF8F2] border border-[#D7D0C0] rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#1C1B19] uppercase tracking-wider">Reference Storage & Integrity</h2>
            {brandAsset?.driveFileId ? (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[#E7EFE8] text-[#366340] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Drive Synced & Verified</span>
              </span>
            ) : hasReferenceImage ? (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[#F8F1E2] text-[#875F20]">
                Local Cache (Drive Pending)
              </span>
            ) : null}
          </div>

          {/* Verification feedback message */}
          {verifyMessage && (
            <div className="p-3 rounded-lg bg-[#E7EFE8] border border-[#C5D9C8] text-xs text-[#366340] flex items-center gap-2 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{verifyMessage}</span>
            </div>
          )}

          {/* Reference Preview or Drag Area */}
          {hasReferenceImage && brandAsset ? (
            <div className="space-y-4">
              <div className="relative aspect-square max-w-sm mx-auto bg-[#1C1B19]/5 rounded-xl border border-[#D7D0C0] overflow-hidden group shadow-xs">
                <img
                  src="/api/brand/image"
                  alt="Official Ninety Sense Reference"
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 bg-[#1C1B19]/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() =>
                      onOpenImage('/api/brand/image', 'Official Ninety Sense Reference Image', brandAsset.version, brandAsset.driveUrl)
                    }
                    className="p-2.5 rounded-full bg-[#FAF8F2] text-[#1C1B19] hover:bg-[#FAF8F2]/90 shadow-lg"
                    title="Inspect reference image"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Asset Technical Audit Trail */}
              <div className="space-y-2 text-xs bg-[#ECE6D8]/60 p-4 rounded-lg border border-[#D7D0C0] font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-[#625E56]">Drive Path:</span>
                  <span className="text-[#1C1B19] font-medium">{brandAsset.drivePath}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#625E56]">Drive File ID:</span>
                  <span className="text-[#1C1B19] font-medium">
                    {brandAsset.driveFileId ? (
                      <span className="text-[#366340] flex items-center gap-1">
                        <span>{brandAsset.driveFileId}</span>
                        {brandAsset.driveUrl && (
                          <a
                            href={brandAsset.driveUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#A94336] hover:underline"
                            title="Open file in Google Drive"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </span>
                    ) : (
                      <span className="text-[#875F20]">Awaiting Drive Authorization</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#625E56]">Version ID:</span>
                  <span className="text-[#1C1B19] font-medium">{brandAsset.version}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#625E56]">SHA-256 Hash:</span>
                  <span className="text-[#1C1B19] truncate max-w-[200px]" title={brandAsset.sha256}>
                    {brandAsset.sha256}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#625E56]">File Size:</span>
                  <span className="text-[#1C1B19]">
                    {(brandAsset.fileSize / 1024).toFixed(1)} KB ({brandAsset.mimeType})
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#625E56]">Retrievability:</span>
                  <span className="font-semibold">
                    {brandAsset.isVerified ? (
                      <span className="text-[#366340]">✓ Byte-Verified Retrievable</span>
                    ) : (
                      <span className="text-[#875F20]">Pending Verification</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Notice if Google Drive is not connected yet */}
              {!isDriveConnected && (
                <div className="p-3 bg-[#F8F1E2] border border-[#E8DBBF] rounded-lg text-xs space-y-2">
                  <div className="font-semibold text-[#875F20] flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    <span>Google Drive Not Connected</span>
                  </div>
                  <p className="text-[#625E56] text-[11px] leading-relaxed">
                    To permanently save this reference to your cloud Google Drive folder (Ninety Sense/Brand/official-reference.png), sign in below.
                  </p>
                  <div>
                    <GoogleSignInButton user={user} onAuthChange={onAuthChange} />
                  </div>
                </div>
              )}

              {/* If Drive is connected but fileId is not yet linked */}
              {isDriveConnected && !brandAsset.driveFileId && (
                <div className="p-3 bg-[#E7EFE8] border border-[#C5D9C8] rounded-lg text-xs space-y-2">
                  <div className="font-semibold text-[#366340]">Google Drive Connected</div>
                  <p className="text-[#625E56] text-[11px]">
                    Click below to upload and save this reference image directly to your Google Drive folder hierarchy.
                  </p>
                  <button
                    onClick={handleSyncToDrive}
                    disabled={syncing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-[#F4F0E6] bg-[#A94336] hover:bg-[#91352A] transition-colors"
                  >
                    <CloudUpload className="w-3.5 h-3.5" />
                    <span>{syncing ? 'Saving to Google Drive...' : 'Save to Ninety Sense/Brand/'}</span>
                  </button>
                </div>
              )}

              {/* Actions: Replace reference or Verify Drive bytes */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="px-3.5 py-1.5 rounded text-xs font-medium text-[#1C1B19] bg-[#ECE6D8] border border-[#D7D0C0] hover:bg-[#FAF8F2] transition-colors"
                  >
                    Replace Reference...
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  />
                </div>

                {brandAsset.driveFileId && isDriveConnected && (
                  <button
                    onClick={handleVerify}
                    disabled={verifying}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-[#366340] bg-[#E7EFE8] border border-[#C5D9C8] hover:bg-[#D4E4D7] transition-colors"
                    title="Downloads bytes from Google Drive API to confirm access and retrievability"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>{verifying ? 'Testing Drive Bytes...' : 'Verify Drive Retrievability'}</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Upload Zone when reference is missing */
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors space-y-3 ${
                  dragActive ? 'border-[#A94336] bg-[#FBECEB]' : 'border-[#D7D0C0] hover:border-[#1C1B19] bg-[#FAF8F2]'
                }`}
              >
                <UploadCloud className="w-10 h-10 text-[#A94336] mx-auto" />
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-[#1C1B19]">Upload Official Reference Image</div>
                  <div className="text-xs text-[#625E56]">Drag and drop PNG, JPEG, or WebP (1024x1024 or 16:9)</div>
                  <div className="text-[11px] text-[#8E897E]">
                    Destination: <span className="font-mono text-[#1C1B19]">Ninety Sense/Brand/official-reference.png</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 rounded text-xs font-semibold text-[#F4F0E6] bg-[#A94336] hover:bg-[#91352A]"
                >
                  {uploading ? 'Saving & Encrypting...' : 'Browse Local Files'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right: Ninety Sense Visual Rules Authority */}
        <div className="bg-[#FAF8F2] border border-[#D7D0C0] rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-[#A94336]" />
            <h2 className="text-sm font-bold text-[#1C1B19] uppercase tracking-wider">
              Ninety Sense Visual Identity Constitution
            </h2>
          </div>

          <div className="space-y-3 text-xs text-[#625E56] leading-relaxed">
            <p>
              The official reference image serves as the permanent authority for all character proportions and environmental
              geometry. Every scene generation request automatically receives this image alongside the approved prompt.
            </p>

            <div className="bg-[#ECE6D8]/60 p-4 rounded-lg border border-[#D7D0C0] space-y-3">
              <h4 className="font-bold text-[#1C1B19] text-xs">MANDATORY PRESERVATIONS:</h4>
              <ul className="space-y-1.5 list-disc list-inside">
                <li>
                  <strong className="text-[#1C1B19]">The Ninety Figure:</strong> Defined proportions, elongated silhouette,
                  editorial faceless posture, clean ink boundary.
                </li>
                <li>
                  <strong className="text-[#1C1B19]">The Open Cube:</strong> Architectural cubic framing, floating geometric
                  edges, minimal spatial anchors.
                </li>
                <li>
                  <strong className="text-[#1C1B19]">Tactile Editorial Texture:</strong> Screenprint paper grain, risograph/ink
                  quality.
                </li>
                <li>
                  <strong className="text-[#1C1B19]">Brand Triad Palette:</strong> Warm Ivory (#F4F0E6), Dark Ink (#1C1B19),
                  and Muted Vermilion (#A94336).
                </li>
              </ul>
            </div>

            <div className="bg-[#FAF8F2] p-4 rounded-lg border border-[#D7D0C0] space-y-3">
              <h4 className="font-bold text-[#1C1B19] text-xs">SCENE-SPECIFIC FREEDOMS:</h4>
              <p>
                Approved visual prompts may freely specify new compositions, angles (top-down, threshold, perspective),
                gestures, symbolic objects (lanterns, threads, dials), and emotional tension—without altering the core
                character or cube design.
              </p>
            </div>

            <div className="p-3 bg-[#FBECEB] rounded-lg border border-[#EAC4C1] text-[#A94336] text-[11px]">
              <strong>STRICTLY PROHIBITED:</strong> Photorealism, neon gradients, 3D CGI gloss, cartoon Pixar styling, generic
              stick figures, and automated prompt destruction.
            </div>
          </div>
        </div>
      </div>

      {/* Deliberate Replacement Confirmation Modal */}
      {replaceModalOpen && pendingUploadData && (
        <ConfirmationModal
          isOpen={replaceModalOpen}
          title="Replace Official Reference Image?"
          message={`Replacing the official reference image will establish a new version (${pendingUploadData.name}) for subsequent video jobs. Any jobs currently in progress will remain safely locked to their existing reference version.`}
          confirmLabel="Confirm Replacement"
          isDestructive={true}
          onConfirm={() => {
            setReplaceModalOpen(false);
            executeUpload(pendingUploadData.base64, pendingUploadData.name, pendingUploadData.mime);
          }}
          onCancel={() => {
            setReplaceModalOpen(false);
            setPendingUploadData(null);
          }}
        />
      )}
    </div>
  );
};
