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
  Copy,
  Check,
  HelpCircle,
  Link as LinkIcon,
} from 'lucide-react';
import { GoogleSignInButton } from './GoogleSignInButton';
import { User } from 'firebase/auth';
import { api } from '../services/api';

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
  const [directDbInput, setDirectDbInput] = React.useState('');
  const [inspectingDirect, setInspectingDirect] = React.useState(false);
  const [loadingDbs, setLoadingDbs] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [copiedSchema, setCopiedSchema] = React.useState(false);
  const [showHelpDetails, setShowHelpDetails] = React.useState(true);

  // Field mapping
  const [titleField, setTitleField] = React.useState('Title');
  const [promptField, setPromptField] = React.useState('Scene Prompt');
  const [numField, setNumField] = React.useState('Scene Number');
  const [statusField, setStatusField] = React.useState('Status');

  const handleConnectNotion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notionToken.trim()) return;

    const trimmed = notionToken.trim();
    if (!trimmed.startsWith('ntn_') && !trimmed.startsWith('secret_')) {
      setNotionError(
        "Invalid format: Notion Internal Integration Secrets start with 'ntn_' or 'secret_'. Get yours for free at notion.so/profile/integrations."
      );
      return;
    }

    setConnectingNotion(true);
    setNotionError(null);
    try {
      await onConnectNotion(trimmed);
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

  const handleInspectDirectDb = async () => {
    if (!directDbInput.trim()) return;
    setInspectingDirect(true);
    setNotionError(null);
    try {
      const dbInfo = await api.inspectNotionDatabase(directDbInput.trim());
      setDatabases((prev) => {
        const exists = prev.some((d) => d.id === dbInfo.id);
        return exists ? prev : [dbInfo, ...prev];
      });
      setSelectedDbId(dbInfo.id);
      setDirectDbInput('');
      alert(`Found database: "${dbInfo.title}"! Properties mapped automatically.`);
    } catch (err: any) {
      setNotionError(err.message || 'Could not find database with that ID or URL');
    } finally {
      setInspectingDirect(false);
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

  const handleCopySchema = () => {
    const schemaText = `Ninety Sense Database Schema:
- Title (Property type: Title) -> Video title (e.g., "The Architecture of Solitude")
- Scene Prompt (Property type: Text / Rich text) -> Exact approved visual prompt
- Scene Number (Property type: Number) -> 1, 2, 3...
- Status (Property type: Select or Status) -> "Script Approved"`;
    navigator.clipboard.writeText(schemaText);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#FAF8F2] border border-[#D7D0C0] rounded-xl p-6 shadow-xs">
        <h1 className="text-2xl font-bold text-[#1C1B19] tracking-tight">External Service Integrations</h1>
        <p className="text-xs text-[#625E56] max-w-2xl mt-1 leading-relaxed">
          Configure real, secure connections to Notion, Google Drive, and the image generation service. All secrets and OAuth tokens are handled server-side with zero mock data.
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
                    <span>Workspace: {notionConfig.workspaceName || 'Connected'}</span>
                  </div>
                  <div className="text-[11px] text-[#625E56]">Token securely verified with Notion API.</div>
                </div>

                {/* Databases dropdown */}
                <div className="space-y-3 pt-2">
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
                    <div className="space-y-2">
                      <p className="text-[11px] text-[#625E56]">
                        No database auto-detected yet. In Notion, make sure you shared your database with the integration (click <code className="bg-[#ECE6D8] px-1 rounded">···</code> &gt; Connections &gt; Add Ninety Sense OS).
                      </p>
                      <button
                        onClick={loadDatabases}
                        className="w-full py-1.5 text-xs font-medium text-[#1C1B19] bg-[#ECE6D8] border border-[#D7D0C0] rounded hover:bg-[#FAF8F2]"
                      >
                        Search Shared Databases
                      </button>
                    </div>
                  )}

                  {/* Direct Database ID / URL input */}
                  <div className="p-2.5 bg-[#ECE6D8]/40 rounded-lg border border-[#D7D0C0] space-y-1.5 text-xs">
                    <div className="text-[11px] font-semibold text-[#1C1B19] flex items-center gap-1">
                      <LinkIcon className="w-3 h-3 text-[#A94336]" />
                      <span>Or Connect Directly by Notion Link / ID:</span>
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Paste Notion database URL or 32-char ID..."
                        value={directDbInput}
                        onChange={(e) => setDirectDbInput(e.target.value)}
                        className="flex-1 p-1.5 text-[11px] rounded bg-[#FAF8F2] border border-[#D7D0C0] text-[#1C1B19] font-mono"
                      />
                      <button
                        onClick={handleInspectDirectDb}
                        disabled={inspectingDirect || !directDbInput}
                        className="px-2.5 py-1 text-[11px] font-medium text-[#F4F0E6] bg-[#1C1B19] rounded hover:bg-[#1C1B19]/80 disabled:opacity-50"
                      >
                        {inspectingDirect ? 'Loading...' : 'Load'}
                      </button>
                    </div>
                  </div>

                  {/* Smart Auto-Detection & Property Mapping Info */}
                  <div className="p-3 bg-[#E7EFE8]/60 rounded-lg border border-[#C5D9C8] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-semibold text-[#366340]">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Smart Auto-Detection: Enabled</span>
                      </div>
                      <span className="text-[10px] font-medium bg-[#366340]/10 text-[#366340] px-1.5 py-0.5 rounded">
                        Zero Config
                      </span>
                    </div>
                    <p className="text-[11px] text-[#625E56] leading-relaxed">
                      Ninety Sense automatically detects your columns (Title / Name, Scene Prompt / Script, Scene #, Status). No manual mapping is required!
                    </p>

                    {/* Explanatory dropdown for curious users */}
                    <details className="pt-1 text-[11px] group cursor-pointer">
                      <summary className="text-[#A94336] font-semibold hover:underline flex items-center gap-1 select-none">
                        <span>What is Property Mapping? (Click to view)</span>
                      </summary>
                      <div className="mt-2 p-2.5 bg-[#FAF8F2] rounded border border-[#D7D0C0] space-y-2 text-[#625E56]">
                        <p className="leading-relaxed">
                          <strong>In plain terms:</strong> Every Notion database has columns (called "properties"). One person might name their column <em>"Scene Prompt"</em>, while another names it <em>"Prompt"</em> or <em>"Script"</em>. "Property Mapping" is just telling the app which column has which information.
                        </p>
                        <p className="text-[#366340] font-medium">
                          ✓ You do <u>not</u> need to touch this! The app automatically finds your Title and Prompt columns.
                        </p>

                        <div className="pt-2 border-t border-[#D7D0C0] space-y-1.5">
                          <span className="font-semibold text-[#1C1B19] block">Optional Manual Overrides:</span>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-[#625E56] block text-[10px]">Title Column:</span>
                              <input
                                type="text"
                                value={titleField}
                                onChange={(e) => setTitleField(e.target.value)}
                                placeholder="Auto-detect (Title / Name)"
                                className="w-full p-1 text-[11px] rounded bg-[#FAF8F2] border border-[#D7D0C0] text-[#1C1B19]"
                              />
                            </div>
                            <div>
                              <span className="text-[#625E56] block text-[10px]">Prompt Column:</span>
                              <input
                                type="text"
                                value={promptField}
                                onChange={(e) => setPromptField(e.target.value)}
                                placeholder="Auto-detect (Prompt / Script)"
                                className="w-full p-1 text-[11px] rounded bg-[#FAF8F2] border border-[#D7D0C0] text-[#1C1B19]"
                              />
                            </div>
                            <div>
                              <span className="text-[#625E56] block text-[10px]">Scene # Column:</span>
                              <input
                                type="text"
                                value={numField}
                                onChange={(e) => setNumField(e.target.value)}
                                placeholder="Auto-detect (Scene #)"
                                className="w-full p-1 text-[11px] rounded bg-[#FAF8F2] border border-[#D7D0C0] text-[#1C1B19]"
                              />
                            </div>
                            <div>
                              <span className="text-[#625E56] block text-[10px]">Status Column:</span>
                              <input
                                type="text"
                                value={statusField}
                                onChange={(e) => setStatusField(e.target.value)}
                                placeholder="Auto-detect (Status)"
                                className="w-full p-1 text-[11px] rounded bg-[#FAF8F2] border border-[#D7D0C0] text-[#1C1B19]"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </details>
                  </div>

                  <button
                    onClick={handleImport}
                    disabled={importing || !selectedDbId}
                    className="w-full py-2 rounded text-xs font-semibold text-[#F4F0E6] bg-[#A94336] hover:bg-[#91352A] transition-colors disabled:opacity-50"
                  >
                    {importing ? 'Importing...' : 'Sync Approved Prompts from Notion'}
                  </button>
                </div>
              </div>
            ) : (
              /* Connect form with Free User Guide */
              <div className="space-y-4">
                {/* 100% Free Notion instructions box */}
                <div className="p-3.5 bg-[#FAF8F2] border border-[#D7D0C0] rounded-lg text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#1C1B19] uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-[#A94336]" />
                      <span>Free Notion User Setup ($0)</span>
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#E7EFE8] text-[#366340]">
                      100% Free
                    </span>
                  </div>

                  <p className="text-[#625E56] text-[11px] leading-relaxed">
                    Where to get your Notion secret as a free user: The Notion API is completely free for all Notion accounts (Free, Plus, or Team). Follow these 4 simple steps:
                  </p>

                  <ol className="text-[11px] text-[#625E56] space-y-2 list-decimal list-inside leading-relaxed bg-[#ECE6D8]/50 p-2.5 rounded border border-[#D7D0C0]">
                    <li>
                      Open{' '}
                      <a
                        href="https://www.notion.so/profile/integrations"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#A94336] font-semibold underline inline-flex items-center gap-0.5"
                      >
                        <span>notion.so/profile/integrations</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </li>
                    <li>
                      Click <strong>"+ New integration"</strong>, name it <em>Ninety Sense OS</em>, select your workspace, and click <strong>Save</strong>.
                    </li>
                    <li>
                      Under "Secrets", copy the <strong>Internal Integration Secret</strong> (starts with <code className="bg-[#FAF8F2] px-1 rounded font-mono">ntn_...</code> or <code className="bg-[#FAF8F2] px-1 rounded font-mono">secret_...</code>).
                    </li>
                    <li className="text-[#1C1B19] font-medium">
                      <strong>Crucial step:</strong> Open your database in Notion, click the <code className="bg-[#FAF8F2] px-1 rounded font-mono">···</code> icon in the top-right corner &gt; <strong>"Connections"</strong> &gt; Add <em>Ninety Sense OS</em>. (Notion grants 0 access until shared!).
                    </li>
                  </ol>

                  <div className="flex items-center gap-2">
                    <a
                      href="https://www.notion.so/profile/integrations"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 flex-1 py-1.5 rounded text-[11px] font-semibold text-[#1C1B19] bg-[#ECE6D8] border border-[#D7D0C0] hover:bg-[#FAF8F2] transition-colors"
                    >
                      <span>Open Notion Integrations Portal</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <button
                      type="button"
                      onClick={handleCopySchema}
                      className="inline-flex items-center justify-center gap-1 py-1.5 px-2.5 rounded text-[11px] font-medium text-[#625E56] bg-[#ECE6D8] border border-[#D7D0C0] hover:text-[#1C1B19]"
                      title="Copy database columns template"
                    >
                      {copiedSchema ? <Check className="w-3 h-3 text-[#366340]" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSchema ? 'Copied' : 'Schema'}</span>
                    </button>
                  </div>
                </div>

                <form onSubmit={handleConnectNotion} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#625E56] uppercase mb-1">
                      Paste Internal Integration Secret
                    </label>
                    <input
                      type="password"
                      placeholder="ntn_... or secret_..."
                      value={notionToken}
                      onChange={(e) => {
                        setNotionToken(e.target.value);
                        setNotionError(null);
                      }}
                      className="w-full p-2 rounded text-xs bg-[#FAF8F2] border border-[#D7D0C0] text-[#1C1B19] focus:border-[#A94336] focus:outline-hidden font-mono"
                    />
                    {notionToken && !notionToken.startsWith('ntn_') && !notionToken.startsWith('secret_') && (
                      <p className="text-[10px] text-[#A94336] mt-1">
                        Notice: Notion secrets typically begin with <code className="font-mono">ntn_</code> or <code className="font-mono">secret_</code>.
                      </p>
                    )}
                  </div>
                  {notionError && <p className="text-[11px] text-[#A94336] leading-relaxed">{notionError}</p>}
                  <button
                    type="submit"
                    disabled={connectingNotion || !notionToken.trim()}
                    className="w-full py-2 rounded text-xs font-semibold text-[#F4F0E6] bg-[#A94336] hover:bg-[#91352A] transition-colors disabled:opacity-50"
                  >
                    {connectingNotion ? 'Validating Token...' : 'Connect Notion Workspace'}
                  </button>
                </form>
              </div>
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
