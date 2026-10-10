import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Square,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Folder,
  ShieldCheck,
  Cpu,
  Layers,
  ArrowRight,
  Download,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Video, BrandAsset, JobState } from '../../server/types';
import { TabKey } from './Navbar';

interface Props {
  selectedVideo?: Video;
  allVideos: Video[];
  brandAsset: BrandAsset | null;
  hasReferenceImage: boolean;
  activeJob: JobState;
  providerStatus: any;
  driveConfig: any;
  isDriveConnected: boolean;
  onTabChange: (tab: TabKey) => void;
  onStartJob: (videoId: string) => void;
  onPauseJob: () => void;
  onResumeJob: () => void;
  onStopJob: () => void;
  onOpenImage: (url: string, title: string, subtitle?: string, driveUrl?: string) => void;
}

export const DashboardView: React.FC<Props> = ({
  selectedVideo,
  allVideos,
  brandAsset,
  hasReferenceImage,
  activeJob,
  providerStatus,
  driveConfig,
  isDriveConnected,
  onTabChange,
  onStartJob,
  onPauseJob,
  onResumeJob,
  onStopJob,
  onOpenImage,
}) => {
  const scenes = selectedVideo?.scenes || [];
  const totalScenes = scenes.length;
  const completedScenes = scenes.filter((s) => s.status === 'completed').length;
  const failedScenes = scenes.filter((s) => s.status === 'failed').length;
  const pendingScenes = scenes.filter((s) => s.status === 'pending' || s.status === 'paused').length;

  const progressPercent = totalScenes > 0 ? Math.round((completedScenes / totalScenes) * 100) : 0;
  const isJobRunning = activeJob.status === 'running';
  const isJobPaused = activeJob.status === 'paused';

  return (
    <div className="space-y-6">
      {/* Editorial Header Banner */}
      <div className="bg-[#FAF8F2] border border-[#D7D0C0] rounded-xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold tracking-wider uppercase bg-[#1C1B19] text-[#F4F0E6]">
                Production Workspace
              </span>
              <span className="text-xs text-[#625E56]">Editorial Engine v1.0</span>
            </div>
            <h1 className="text-2xl font-bold text-[#1C1B19] tracking-tight">
              {selectedVideo ? selectedVideo.title : 'Select Video for Production'}
            </h1>
            <p className="text-xs text-[#625E56] max-w-2xl leading-relaxed">
              {selectedVideo?.synopsis ||
                'Sync video scripts and prompts from Notion, maintain character and cube consistency using the mandatory reference image, and export scene artwork directly to Google Drive.'}
            </p>
          </div>

          {/* Job Control Action Panel */}
          <div className="flex flex-wrap items-center gap-2 bg-[#ECE6D8]/60 p-2.5 rounded-lg border border-[#D7D0C0]">
            {isJobRunning ? (
              <button
                onClick={onPauseJob}
                className="flex items-center gap-2 px-4 py-2 rounded text-xs font-semibold text-[#1C1B19] bg-[#FAF8F2] border border-[#D7D0C0] hover:bg-[#FAF8F2]/80 shadow-xs transition-colors"
              >
                <Pause className="w-4 h-4 text-[#875F20]" />
                <span>Pause Job</span>
              </button>
            ) : isJobPaused ? (
              <button
                onClick={onResumeJob}
                className="flex items-center gap-2 px-4 py-2 rounded text-xs font-semibold text-[#F4F0E6] bg-[#A94336] hover:bg-[#91352A] shadow-xs transition-colors"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Resume Job</span>
              </button>
            ) : (
              <button
                onClick={() => selectedVideo && onStartJob(selectedVideo.id)}
                disabled={!selectedVideo || !hasReferenceImage}
                title={!hasReferenceImage ? 'Please upload the official reference image first' : undefined}
                className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-semibold shadow-xs transition-colors ${
                  !hasReferenceImage || !selectedVideo
                    ? 'bg-[#D7D0C0] text-[#625E56] cursor-not-allowed'
                    : 'text-[#F4F0E6] bg-[#A94336] hover:bg-[#91352A]'
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Production</span>
              </button>
            )}

            {(isJobRunning || isJobPaused) && (
              <button
                onClick={onStopJob}
                className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-medium text-[#A94336] bg-[#FAF8F2] border border-[#D7D0C0] hover:bg-[#FBECEB] transition-colors"
                title="Stop current job"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </button>
            )}

            {completedScenes > 0 && selectedVideo && (
              <a
                href={`/api/export/zip/${selectedVideo.id}`}
                download
                className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-medium text-[#1C1B19] bg-[#FAF8F2] border border-[#D7D0C0] hover:bg-[#ECE6D8] transition-colors"
                title="Download all completed scenes and manifest.json as ZIP"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export ZIP</span>
              </a>
            )}
          </div>
        </div>

        {/* Progress Bar Strip */}
        <div className="mt-6 pt-5 border-t border-[#D7D0C0] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#1C1B19] flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isJobRunning ? 'bg-[#366340] animate-pulse' : isJobPaused ? 'bg-[#875F20]' : 'bg-[#625E56]'
                }`}
              />
              Status:{' '}
              <span className="capitalize font-mono">
                {activeJob.status === 'running'
                  ? 'Generating Scenes'
                  : activeJob.status === 'paused'
                  ? 'Paused'
                  : activeJob.status === 'stopped'
                  ? 'Stopped'
                  : 'Ready'}
              </span>
            </span>
            <span className="text-[#625E56] font-mono">
              {completedScenes} / {totalScenes} Scenes Completed ({progressPercent}%)
            </span>
          </div>

          <div className="w-full h-2.5 bg-[#ECE6D8] rounded-full overflow-hidden border border-[#D7D0C0]">
            <div
              className="h-full bg-[#A94336] transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#FAF8F2] border border-[#D7D0C0] rounded-lg p-3.5">
          <div className="text-[11px] font-medium text-[#625E56] uppercase tracking-wider">Total Scenes</div>
          <div className="text-xl font-bold text-[#1C1B19] mt-1 font-mono">{totalScenes}</div>
          <div className="text-[11px] text-[#8E897E] mt-0.5">{selectedVideo?.id || 'No video'}</div>
        </div>

        <div className="bg-[#FAF8F2] border border-[#D7D0C0] rounded-lg p-3.5">
          <div className="text-[11px] font-medium text-[#366340] uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Completed</span>
          </div>
          <div className="text-xl font-bold text-[#366340] mt-1 font-mono">{completedScenes}</div>
          <div className="text-[11px] text-[#625E56] mt-0.5">{progressPercent}% done</div>
        </div>

        <div className="bg-[#FAF8F2] border border-[#D7D0C0] rounded-lg p-3.5">
          <div className="text-[11px] font-medium text-[#625E56] uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Pending</span>
          </div>
          <div className="text-xl font-bold text-[#1C1B19] mt-1 font-mono">{pendingScenes}</div>
          <div className="text-[11px] text-[#8E897E] mt-0.5">Queued</div>
        </div>

        <div className="bg-[#FAF8F2] border border-[#D7D0C0] rounded-lg p-3.5">
          <div className="text-[11px] font-medium text-[#A94336] uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Failed</span>
          </div>
          <div className="text-xl font-bold text-[#A94336] mt-1 font-mono">{failedScenes}</div>
          <div className="text-[11px] text-[#8E897E] mt-0.5">Retries enabled</div>
        </div>

        <div className="bg-[#FAF8F2] border border-[#D7D0C0] rounded-lg p-3.5">
          <div className="text-[11px] font-medium text-[#625E56] uppercase tracking-wider flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" />
            <span>Notion Videos</span>
          </div>
          <div className="text-xl font-bold text-[#1C1B19] mt-1 font-mono">{allVideos.length}</div>
          <div
            className="text-[11px] text-[#A94336] hover:underline cursor-pointer mt-0.5"
            onClick={() => onTabChange('videos')}
          >
            Browse library →
          </div>
        </div>

        <div className="bg-[#FAF8F2] border border-[#D7D0C0] rounded-lg p-3.5">
          <div className="text-[11px] font-medium text-[#625E56] uppercase tracking-wider flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Reference</span>
          </div>
          <div className="text-sm font-bold text-[#1C1B19] mt-1.5 truncate">
            {hasReferenceImage ? (
              <span className="text-[#366340]">Verified Ready</span>
            ) : (
              <span className="text-[#A94336]">Missing</span>
            )}
          </div>
          <div
            className="text-[11px] text-[#A94336] hover:underline cursor-pointer mt-0.5"
            onClick={() => onTabChange('brand')}
          >
            Manage assets →
          </div>
        </div>
      </div>

      {/* Integration & Storage Summary Dual Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Google Drive Status Box */}
        <div className="bg-[#FAF8F2] border border-[#D7D0C0] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-[#A94336]" />
              <h3 className="text-sm font-semibold text-[#1C1B19]">Google Drive Hierarchy</h3>
            </div>
            <span
              className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                isDriveConnected ? 'bg-[#E7EFE8] text-[#366340]' : 'bg-[#FBECEB] text-[#A94336]'
              }`}
            >
              {isDriveConnected ? 'Connected & Authorized' : 'Not Connected'}
            </span>
          </div>

          <div className="space-y-1.5 font-mono text-xs bg-[#ECE6D8]/60 p-3 rounded-lg border border-[#D7D0C0] text-[#1C1B19]">
            <div className="font-semibold text-[#1C1B19]">📁 Ninety Sense/</div>
            <div className="pl-4 text-[#625E56]">├── 📁 Brand/ (official-reference.png)</div>
            <div className="pl-4 text-[#625E56]">
              └── 📁 Videos/
              <span className="text-[#1C1B19] font-medium">
                {' '}
                {selectedVideo ? `${selectedVideo.id} - ${selectedVideo.title}/` : 'Video 01/'}
              </span>
            </div>
            <div className="pl-8 text-[#8E897E]">├── 📁 Scenes/ ({completedScenes} saved)</div>
            <div className="pl-8 text-[#8E897E]">├── 📁 Manifest/ (manifest.json)</div>
            <div className="pl-8 text-[#8E897E]">└── 📁 Exports/</div>
          </div>

          <p className="text-[11px] text-[#625E56] leading-relaxed">
            All generated PNG outputs and the manifest audit trail are automatically filed in their respective production
            folders without manual copying or renaming.
          </p>
        </div>

        {/* Image Generation Provider Status & Cost Verification */}
        <div className="bg-[#FAF8F2] border border-[#D7D0C0] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#A94336]" />
              <h3 className="text-sm font-semibold text-[#1C1B19]">Image Provider & Cost ($0 Verified)</h3>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded font-medium bg-[#E7EFE8] text-[#366340]">
              $0 Budget Target
            </span>
          </div>

          <div className="space-y-2 text-xs bg-[#ECE6D8]/60 p-3 rounded-lg border border-[#D7D0C0]">
            <div className="flex justify-between">
              <span className="text-[#625E56]">Model:</span>
              <span className="font-mono font-medium text-[#1C1B19]">
                {providerStatus?.selectedModel || 'gemini-3.1-flash-lite-image'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#625E56]">Reference Image Support:</span>
              <span className="font-medium text-[#366340]">Mandatory Attached (Byte-Verified)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#625E56]">Current Cost Per Image:</span>
              <span className="font-mono font-medium text-[#1C1B19]">$0.00 (Zero unapproved charges)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#625E56]">Aspect Ratio:</span>
              <span className="font-mono font-medium text-[#1C1B19]">16:9 (YouTube Production standard)</span>
            </div>
          </div>

          <p className="text-[11px] text-[#625E56] leading-relaxed">
            Strict $0 cost policy: No unapproved paid requests are executed. If provider quotas are met, the queue pauses
            safely with clear failure logs.
          </p>
        </div>
      </div>

      {/* Scene Production Preview Strip */}
      <div className="bg-[#FAF8F2] border border-[#D7D0C0] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#1C1B19]">Scene Production Gallery Preview</h3>
            <p className="text-xs text-[#625E56] mt-0.5">
              Approved scene breakdown for {selectedVideo ? `"${selectedVideo.title}"` : 'Active Video'}.
            </p>
          </div>
          <button
            onClick={() => onTabChange('production')}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#A94336] hover:underline"
          >
            <span>Open Full Scene Production</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {scenes.length === 0 ? (
          <div className="bg-[#ECE6D8]/40 border border-[#D7D0C0] rounded-lg p-8 text-center space-y-3">
            <Layers className="w-8 h-8 text-[#8E897E] mx-auto" />
            <h4 className="text-sm font-bold text-[#1C1B19]">No Video Scenes Loaded</h4>
            <p className="text-xs text-[#625E56] max-w-md mx-auto">
              Your video library is currently empty. Connect your Notion workspace in Integrations or sync your approved Ninety Sense video database to import real scenes.
            </p>
            <button
              onClick={() => onTabChange('integrations')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded text-xs font-semibold text-[#F4F0E6] bg-[#A94336] hover:bg-[#91352A] transition-colors"
            >
              <span>Connect Notion Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {scenes.map((scene) => (
              <div
                key={scene.id}
                className="bg-[#ECE6D8]/50 border border-[#D7D0C0] rounded-lg p-3.5 space-y-3 flex flex-col justify-between hover:border-[#1C1B19]/40 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-[#1C1B19]">
                      Scene {String(scene.sceneNumber).padStart(3, '0')}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                        scene.status === 'completed'
                          ? 'bg-[#E7EFE8] text-[#366340]'
                          : scene.status === 'generating'
                          ? 'bg-[#FAF8F2] text-[#A94336] animate-pulse border border-[#A94336]'
                          : scene.status === 'failed'
                          ? 'bg-[#FBECEB] text-[#A94336]'
                          : 'bg-[#ECE6D8] text-[#625E56]'
                      }`}
                    >
                      {scene.status}
                    </span>
                  </div>

                  <p className="text-xs text-[#1C1B19] leading-relaxed line-clamp-3">
                    "{scene.approvedPrompt}"
                  </p>
                </div>

                {/* Image Preview or Placeholder */}
                <div className="relative aspect-video bg-[#1C1B19]/10 rounded border border-[#D7D0C0] overflow-hidden flex items-center justify-center">
                  {scene.imageUrl ? (
                    <img
                      src={scene.imageUrl}
                      alt={`Scene ${scene.sceneNumber}`}
                      className="w-full h-full object-cover cursor-pointer hover:scale-102 transition-transform"
                      onClick={() =>
                        onOpenImage(
                          scene.imageUrl!,
                          `Scene ${scene.sceneNumber} - ${selectedVideo?.title}`,
                          scene.approvedPrompt,
                          scene.driveUrl
                        )
                      }
                    />
                  ) : (
                    <div className="text-center p-3 text-[#625E56]">
                      <div className="text-[11px] font-mono">
                        {scene.status === 'generating' ? 'Rendering with Reference...' : 'Awaiting Generation'}
                      </div>
                      <div className="text-[10px] text-[#8E897E] mt-1">
                        Ref attached: {scene.referenceAttached ? 'Yes' : 'Pending'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer metadata */}
                <div className="pt-2 border-t border-[#D7D0C0] flex items-center justify-between text-[11px] text-[#625E56]">
                  <span className="font-mono text-[10px] truncate max-w-[150px]">
                    {scene.outputFilename || `${selectedVideo?.id || 'Video'}_Scene_${String(scene.sceneNumber).padStart(3, '0')}.png`}
                  </span>
                  {scene.driveUrl && (
                    <a
                      href={scene.driveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#A94336] hover:underline flex items-center gap-1"
                    >
                      <span>Drive</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
