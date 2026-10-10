import React from 'react';
import {
  FileText,
  Folder,
  Cpu,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Key,
  Database,
  Unlink,
} from 'lucide-react';
import { GoogleSignInButton } from './GoogleSignInButton';
import { User } from 'firebase/auth';

interface Props {
  notionConfig: any;
  driveConfig: any;
  providerStatus: any;
  user: User | null;
  onAuthChange: (user: User | null, token: string | null) => void;
  onConnectNotion: (token: string) => Promise<void>;
  onDisconnectNotion: () => Promise<void>;
  onGetNotionDatabases: () => Promise<any[]>;
  onImportNotionDatabase: (databaseId: string, fieldMapping: any) => Promise<void>;
}

export const IntegrationsView: React.FC<Props> = ({
  notionConfig,
  driveConfig,
  providerStatus,
  user,
  onAuthChange,
  onConnectNotion,
  onDisconnectNotion,
  onGetNotionDatabases,
  onImportNotionDatabase,
}) => {
  // Notion State
  const [notionToken, setNotionToken] = React.useState('');
  const [connectingNotion, setConnectingNotion] = React.useState(false);
  const [notionError, setNotionError] = React.useState<string | null>(null);
  const [databases, setDatabases] = React.useState<any[]>([]);
  const [selectedDbId, setSelectedDbId] = React.useState('');
  const [loadingDbs, setLoadingDbs] = React.useState(false);
  const [importing, setImporting] = React.useState(false);

  // Field mapping
  const [titleField, setTitleField] = React.useState('Title');
  const [promptField, setPromptField] = React.useState('Scene Prompt');
  const [numField, setNumField] = React.useState('Scene Number');
  const [statusField, setStatusField] = React.useState('Status');

  const handleConnectNotion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notionToken) return;
    setConnectingNotion(true);
    setNotionError(null);
    try {
      await onConnectNotion(notionToken);
      setNotionToken('');
      loadDatabases();
    } catch (err: any) {
      setNotionError(err.message || 'Connection failed');
    } finally {
      setConnectingNotion(false);
    }
  };

  const loadDatabases = async () => {
    setLoadingDbs(true);
    try {
      const dbs = await onGetNotionDatabases();
      setDatabases(dbs);
      if (dbs.length > 0) {
        setSelectedDbId(dbs[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDbs(false);
    }
  };

  const handleImport = async () => {
    if (!selectedDbId) return;
    setImporting(true);
    try {
      await onImportNotionDatabase(selectedDbId, {
        titleField,
        scenePromptField: promptField,
        sceneNumberField: numField,
        statusField,
      });
      alert('Approved videos and scene prompts successfully imported from Notion!');
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#FAF8F2] border border-[#D7D0C0] rounded-xl p-6 shadow-xs">
        <h1 className="text-2xl font-bold text-[#1C1B19] tracking-tight">External Service Integrations</h1>
        <p className="text-xs text-[#625E56] max-w-2xl mt-1 leading-relaxed">
          Configure secure connections to Notion, Google Drive, and the image generation service. All tokens and OAuth
          credentials are encrypted or stored server-side.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. NOTION INTEGRATION CARD */}
        <div className="bg-[#FAF8F2] border border-[#D7D0C0] rounded-xl p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#A94336]" />
                <h3 className="text-base font-bold text-[#1C1B19]">Notion Workspace</h3>
              </div>
              <span
                className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                  notionConfig.hasToken ? 'bg-[#E7EFE8] text-[#366340]' : 'bg-[#FBECEB] text-[#A94336]'
                }`}
              >
                {notionConfig.hasToken ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            <p className="text-xs text-[#625E56] leading-relaxed">
              Source of truth for approved scripts and visual prompts. Connect your internal integration to sync
              episodes.
            </p>

            {notionConfig.hasToken ? (
              <div className="space-y-3">
                <div className="p-3 bg-[#E7EFE8]/50 border border-[#C5D9C8] rounded-lg text-xs space-y-1">
                  <div className="font-semibold text-[#366340] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Workspace: {notionConfig.workspaceName || 'Ninety Sense'}</span>
                  </div>
                  <div className="text-[11px] text-[#625E56]">Token securely stored on backend server.</div>
                </div>

                {/* Databases dropdown */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#1C1B19]">
                    <span>Select Database:</span>
                    <button
                      onClick={loadDatabases}
                      disabled={loadingDbs}
                      className="text-[11px] text-[#A94336] hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingDbs ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {databases.length > 0 ? (
                    <select
                      value={selectedDbId}
                      onChange={(e) => setSelectedDbId(e.target.value)}
                      className="w-full text-xs p-2 rounded bg-[#FAF8F2] border border-[#D7D0C0] text-[#1C1B19]"
                    >
                      {databases.map((db) => (
                        <option key={db.id} value={db.id}>
                          {db.title} ({Object.keys(db.properties || {}).length} properties)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <button
                      onClick={loadDatabases}
                      className="w-full py-2 text-xs font-medium text-[#1C1B19] bg-[#ECE6D8] border border-[#D7D0C0] rounded"
                    >
                      Load Databases from Notion
                    </button>
                  )}

                  {/* Field Mapping */}
                  <div className="p-3 bg-[#ECE6D8]/50 rounded-lg border border-[#D7D0C0] space-y-2 text-xs">
                    <div className="font-semibold text-[#1C1B19] text-[11px] uppercase tracking-wider">
                      Property Mapping:
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-[#625E56] block">Title Prop:</span>
                        <input
                          type="text"
                          value={titleField}
                          onChange={(e) => setTitleField(e.target.value)}
                          className="w-full p-1 rounded bg-[#FAF8F2] border border-[#D7D0C0] text-[#1C1B19]"
                        />
                      </div>
                      <div>
                        <span className="text-[#625E56] block">Prompt Prop:</span>
                        <input
                          type="text"
                          value={promptField}
                          onChange={(e) => setPromptField(e.target.value)}
                          className="w-full p-1 rounded bg-[#FAF8F2] border border-[#D7D0C0] text-[#1C1B19]"
                        />
                      </div>
                      <div>
                        <span className="text-[#625E56] block">Scene #:</span>
                        <input
                          type="text"
                          value={numField}
                          onChange={(e) => setNumField(e.target.value)}
                          className="w-full p-1 rounded bg-[#FAF8F2] border border-[#D7D0C0] text-[#1C1B19]"
                        />
                      </div>
                      <div>
                        <span className="text-[#625E56] block">Status:</span>
                        <input
                          type="text"
                          value={statusField}
                          onChange={(e) => setStatusField(e.target.value)}
                          className="w-full p-1 rounded bg-[#FAF8F2] border border-[#D7D0C0] text-[#1C1B19]"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleImport}
                    disabled={importing || !selectedDbId}
                    className="w-full py-2 rounded text-xs font-semibold text-[#F4F0E6] bg-[#A94336] hover:bg-[#91352A] transition-colors"
                  >
                    {importing ? 'Importing...' : 'Sync Approved Prompts'}
                  </button>
                </div>
              </div>
            ) : (
              /* Connect form */
              <form onSubmit={handleConnectNotion} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#625E56] uppercase mb-1">
                    Notion Integration Token
                  </label>
                  <input
                    type="password"
                    placeholder="secret_..."
                    value={notionToken}
                    onChange={(e) => setNotionToken(e.target.value)}
                    className="w-full p-2 rounded text-xs bg-[#FAF8F2] border border-[#D7D0C0] text-[#1C1B19] focus:border-[#A94336] focus:outline-hidden"
                  />
                </div>
                {notionError && <p className="text-[11px] text-[#A94336]">{notionError}</p>}
                <button
                  type="submit"
                  disabled={connectingNotion || !notionToken}
                  className="w-full py-2 rounded text-xs font-semibold text-[#F4F0E6] bg-[#A94336] hover:bg-[#91352A] transition-colors"
                >
                  {connectingNotion ? 'Connecting...' : 'Connect Notion'}
                </button>
              </form>
            )}
          </div>

          {notionConfig.hasToken && (
            <div className="pt-3 border-t border-[#D7D0C0]">
              <button
                onClick={onDisconnectNotion}
                className="text-xs text-[#A94336] hover:underline flex items-center gap-1 font-medium"
              >
                <Unlink className="w-3.5 h-3.5" />
                <span>Disconnect Notion</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. GOOGLE DRIVE CARD */}
        <div className="bg-[#FAF8F2] border border-[#D7D0C0] rounded-xl p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Folder className="w-5 h-5 text-[#A94336]" />
                <h3 className="text-base font-bold text-[#1C1B19]">Google Drive</h3>
              </div>
              <span
                className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                  user ? 'bg-[#E7EFE8] text-[#366340]' : 'bg-[#FBECEB] text-[#A94336]'
                }`}
              >
                {user ? 'Authorized' : 'Disconnected'}
              </span>
            </div>

            <p className="text-xs text-[#625E56] leading-relaxed">
              Permanent destination for the official reference image, scene PNG artwork, and video manifest files.
            </p>

            <div className="space-y-3">
              <GoogleSignInButton user={user} onAuthChange={onAuthChange} />

              <div className="p-3 bg-[#ECE6D8]/50 border border-[#D7D0C0] rounded-lg text-xs space-y-1.5 font-mono text-[11px]">
                <div className="font-semibold text-[#1C1B19]">Target Folder Structure:</div>
                <div className="text-[#625E56]">Ninety Sense/</div>
                <div className="text-[#625E56] pl-3">├── Brand/official-reference.png</div>
                <div className="text-[#625E56] pl-3">└── Videos/Video_ID/Scenes/*.png</div>
              </div>

              <div className="text-[11px] text-[#625E56] leading-relaxed">
                Scope requested: <code className="bg-[#ECE6D8] px-1 py-0.5 rounded text-[#1C1B19]">drive.file</code> (Least privilege: only touches folders created by this production tool).
              </div>
            </div>
          </div>
        </div>

        {/* 3. IMAGE PROVIDER CARD ($0 BUDGET HONESTY) */}
        <div className="bg-[#FAF8F2] border border-[#D7D0C0] rounded-xl p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-[#A94336]" />
                <h3 className="text-base font-bold text-[#1C1B19]">Image Provider Adapter</h3>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded font-medium bg-[#E7EFE8] text-[#366340]">
                $0 Verified
              </span>
            </div>

            <p className="text-xs text-[#625E56] leading-relaxed">
              Server-side provider with mandatory image-reference input support and character consistency prompt
              enforcement.
            </p>

            <div className="space-y-2 text-xs bg-[#ECE6D8]/60 p-3.5 rounded-lg border border-[#D7D0C0]">
              <div className="flex justify-between">
                <span className="text-[#625E56]">Engine:</span>
                <span className="font-mono text-[#1C1B19]">Google GenAI SDK</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#625E56]">Model:</span>
                <span className="font-mono text-[#1C1B19] font-semibold">{providerStatus?.selectedModel || 'gemini-3.1-flash-lite-image'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#625E56]">Reference Support:</span>
                <span className="text-[#366340] font-medium">True (Image-to-Image bytes)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#625E56]">Aspect Ratio:</span>
                <span className="font-mono text-[#1C1B19]">16:9 YouTube standard</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#625E56]">Billing Safety:</span>
                <span className="text-[#366340] font-medium">Protected ($0 budget lock)</span>
              </div>
            </div>

            <p className="text-[11px] text-[#625E56] leading-relaxed">
              Zero unapproved billing: If free quota is exhausted or paid billing is required, requests pause safely
              without faking outputs or triggering charges.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
