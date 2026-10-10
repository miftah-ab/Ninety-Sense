import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FolderCheck,
  ShieldCheck,
  Download,
  ExternalLink,
  Eye,
  RefreshCw,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { Video, Scene, JobState } from '../../server/types';
import { ConfirmationModal } from './ConfirmationModal';

interface Props {
  video?: Video;
  activeJob: JobState;
  hasReferenceImage: boolean;
  onStartJob: (videoId: string) => void;
  onPauseJob: () => void;
  onResumeJob: () => void;
  onStopJob: () => void;
  onRetryScene: (videoId: string, sceneId: string) => void;
  onRegenerateScene: (videoId: string, sceneId: string, confirmed: boolean) => void;
  onOpenImage: (url: string, title: string, subtitle?: string, driveUrl?: string) => void;
}

export const SceneProductionView: React.FC<Props> = ({
  video,
  activeJob,
  hasReferenceImage,
  onStartJob,
  onPauseJob,
  onResumeJob,
  onStopJob,
  onRetryScene,
  onRegenerateScene,
  onOpenImage,
}) => {
  const [regeneratingScene, setRegeneratingScene] = React.useState<Scene | null>(null);

  if (!video) {
    return (
      <div className="bg-[#FAF8F2] border border-[#D7D0C0] rounded-xl p-12 text-center space-y-4">
        <h3 className="text-base font-bold text-[#1C1B19]">No Video Selected</h3>
        <p className="text-xs text-[#625E56] max-w-md mx-auto">
          Please select a video from the library to inspect and run scene visual production.
        </p>
      </div>
    );
  }

  const scenes = video.scenes || [];
  const completedCount = scenes.filter((s) => s.status === 'completed').length;
  const isRunning = activeJob.status === 'running' && activeJob.videoId === video.id;
  const isPaused = activeJob.status === 'paused' && activeJob.videoId === video.id;

  return (
    <div className="space-y-6">
      {/* Production Header Banner */}
      <div className="bg-[#FAF8F2] border border-[#D7D0C0] rounded-xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#1C1B19] text-[#F4F0E6]">
                {video.id}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#A94336]">
                Scene Production Pipeline
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#1C1B19] tracking-tight">{video.title}</h1>
            <p className="text-xs text-[#625E56] max-w-2xl leading-relaxed">{video.synopsis}</p>
          </div>

          {/* Action Strip */}
          <div className="flex flex-wrap items-center gap-2 bg-[#ECE6D8]/60 p-2.5 rounded-lg border border-[#D7D0C0]">
            {isRunning ? (
              <button
                onClick={onPauseJob}
                className="flex items-center gap-2 px-4 py-2 rounded text-xs font-semibold text-[#1C1B19] bg-[#FAF8F2] border border-[#D7D0C0] hover:bg-[#FAF8F2]/80 shadow-xs transition-colors"
              >
                <Pause className="w-4 h-4 text-[#875F20]" />
                <span>Pause Job</span>
              </button>
            ) : isPaused ? (
              <button
                onClick={onResumeJob}
                className="flex items-center gap-2 px-4 py-2 rounded text-xs font-semibold text-[#F4F0E6] bg-[#A94336] hover:bg-[#91352A] shadow-xs transition-colors"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Resume Production</span>
              </button>
            ) : (
              <button
                onClick={() => onStartJob(video.id)}
                disabled={!hasReferenceImage}
                className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-semibold shadow-xs transition-colors ${
                  !hasReferenceImage
                    ? 'bg-[#D7D0C0] text-[#625E56] cursor-not-allowed'
                    : 'text-[#F4F0E6] bg-[#A94336] hover:bg-[#91352A]'
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Run Entire Video</span>
              </button>
            )}

            {completedCount > 0 && (
              <a
                href={`/api/export/zip/${video.id}`}
                download
                className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-medium text-[#1C1B19] bg-[#FAF8F2] border border-[#D7D0C0] hover:bg-[#ECE6D8] transition-colors"
                title="Download all completed scenes and manifest.json as ZIP"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download ZIP</span>
              </a>
            )}

            <a
              href={`/api/videos/${video.id}/manifest`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-medium text-[#625E56] hover:text-[#1C1B19] bg-[#FAF8F2] border border-[#D7D0C0] hover:bg-[#ECE6D8] transition-colors"
              title="Inspect raw manifest JSON"
            >
              <span>Manifest JSON</span>
            </a>
          </div>
        </div>

        {/* Reference Image Mandatory Check Warning */}
        {!hasReferenceImage && (
          <div className="mt-4 p-3 rounded-lg bg-[#FBECEB] border border-[#EAC4C1] text-xs text-[#A94336] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              <strong>Mandatory Character Reference Required:</strong> Visual generation cannot proceed without the official
              character reference image. Please navigate to Brand Assets and upload the reference image first.
            </span>
          </div>
        )}
      </div>

      {/* Scenes Production List */}
      <div className="space-y-4">
        {scenes.length === 0 ? (
          <div className="bg-[#FAF8F2] border border-[#D7D0C0] rounded-xl p-10 text-center space-y-3">
            <h4 className="text-sm font-bold text-[#1C1B19]">No Approved Scenes in Video</h4>
            <p className="text-xs text-[#625E56] max-w-md mx-auto">
              This video record does not contain any approved scene prompts yet. Import or re-sync approved prompts from your Notion database.
            </p>
          </div>
        ) : (
          scenes.map((scene) => {
            const isCurrentScene =
              activeJob.status === 'running' &&
              activeJob.videoId === video.id &&
              activeJob.currentSceneIndex === scene.sceneNumber - 1;

            return (
              <div
                key={scene.id}
                className={`bg-[#FAF8F2] border rounded-xl p-5 transition-all shadow-xs ${
                  isCurrentScene
                    ? 'border-[#A94336] ring-1 ring-[#A94336]'
                    : 'border-[#D7D0C0] hover:border-[#1C1B19]/30'
                }`}
              >
              <div className="flex flex-col lg:flex-row gap-5">
                {/* Left: Image Preview Aspect Box (16:9) */}
                <div className="w-full lg:w-72 shrink-0">
                  <div className="relative aspect-video bg-[#1C1B19]/10 rounded-lg border border-[#D7D0C0] overflow-hidden flex items-center justify-center group">
                    {scene.imageUrl ? (
                      <>
                        <img
                          src={scene.imageUrl}
                          alt={`Scene ${scene.sceneNumber}`}
                          className="w-full h-full object-cover transition-transform group-hover:scale-103"
                        />
                        <div className="absolute inset-0 bg-[#1C1B19]/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            onClick={() =>
                              onOpenImage(
                                scene.imageUrl!,
                                `Scene ${scene.sceneNumber} - ${video.title}`,
                                scene.approvedPrompt,
                                scene.driveUrl
                              )
                            }
                            className="p-2 rounded-full bg-[#FAF8F2] text-[#1C1B19] hover:bg-[#FAF8F2]/90 shadow-md"
                            title="Expand preview"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-4 text-[#625E56]">
                        {scene.status === 'generating' ? (
                          <div className="space-y-2">
                            <RefreshCw className="w-6 h-6 text-[#A94336] animate-spin mx-auto" />
                            <div className="text-xs font-semibold text-[#A94336]">Generating Image...</div>
                            <div className="text-[10px] text-[#8E897E]">Applying character reference</div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <Clock className="w-5 h-5 text-[#8E897E] mx-auto" />
                            <div className="text-xs font-medium text-[#1C1B19]">Pending Generation</div>
                            <div className="text-[10px] text-[#8E897E]">16:9 YouTube format</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Output Filename & Format Tag */}
                  <div className="mt-2 flex items-center justify-between text-[11px] text-[#625E56]">
                    <span className="font-mono text-[10px] truncate max-w-[170px]">
                      {scene.outputFilename || `${video.id}_Scene_${String(scene.sceneNumber).padStart(3, '0')}.png`}
                    </span>
                    <span className="font-mono text-[10px] uppercase font-semibold text-[#8E897E]">16:9 PNG</span>
                  </div>
                </div>

                {/* Right: Scene Details & Metadata */}
                <div className="flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-[#1C1B19]">
                          Scene {String(scene.sceneNumber).padStart(3, '0')}
                        </span>
                        <span className="text-xs text-[#8E897E] font-mono">[{scene.id}]</span>
                      </div>

                      {/* Status Badges */}
                      <div className="flex items-center gap-2">
                        {/* Reference attachment status */}
                        <span
                          className={`text-[11px] px-2.5 py-0.5 rounded font-medium flex items-center gap-1 ${
                            scene.referenceAttached
                              ? 'bg-[#E7EFE8] text-[#366340]'
                              : 'bg-[#ECE6D8] text-[#625E56]'
                          }`}
                          title={
                            scene.referenceAttached
                              ? 'Mandatory reference image bytes attached to request'
                              : 'Reference will be attached on execution'
                          }
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Ref: {scene.referenceAttached ? 'Attached' : 'Pending'}</span>
                        </span>

                        {/* Overall Scene Status */}
                        <span
                          className={`text-[11px] px-2.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                            scene.status === 'completed'
                              ? 'bg-[#E7EFE8] text-[#366340]'
                              : scene.status === 'generating'
                              ? 'bg-[#FBECEB] text-[#A94336] animate-pulse'
                              : scene.status === 'saving'
                              ? 'bg-[#F8F1E2] text-[#875F20]'
                              : scene.status === 'failed'
                              ? 'bg-[#FBECEB] text-[#A94336]'
                              : 'bg-[#ECE6D8] text-[#625E56]'
                          }`}
                        >
                          {scene.status}
                        </span>
                      </div>
                    </div>

                    {/* Exact Approved Prompt */}
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold text-[#625E56] uppercase tracking-wider">
                        Approved Prompt:
                      </div>
                      <p className="text-xs text-[#1C1B19] leading-relaxed bg-[#ECE6D8]/40 p-3 rounded-lg border border-[#D7D0C0]">
                        "{scene.approvedPrompt}"
                      </p>
                    </div>

                    {/* Character Consistency Notes */}
                    {scene.characterConsistencyNotes && (
                      <div className="text-[11px] text-[#625E56] flex items-start gap-1.5 pt-1">
                        <span className="font-semibold text-[#1C1B19] shrink-0">Consistency Rule:</span>
                        <span>{scene.characterConsistencyNotes}</span>
                      </div>
                    )}

                    {/* Error display if failed */}
                    {scene.error && (
                      <div className="p-3 rounded-lg bg-[#FBECEB] border border-[#EAC4C1] text-xs text-[#A94336] space-y-1">
                        <div className="font-semibold flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Generation Error (Attempt #{scene.retryCount})</span>
                        </div>
                        <p className="font-mono text-[11px] leading-relaxed">{scene.error}</p>
                      </div>
                    )}
                  </div>

                  {/* Scene Footer Actions */}
                  <div className="pt-3 border-t border-[#D7D0C0] flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 text-[#625E56]">
                      {scene.driveFileId ? (
                        <span className="flex items-center gap-1 text-[#366340]">
                          <FolderCheck className="w-3.5 h-3.5" />
                          <span>Drive: Verified Saved</span>
                        </span>
                      ) : scene.status === 'completed' ? (
                        <span className="text-[#875F20]">Saved Locally (Drive Pending)</span>
                      ) : (
                        <span>Storage: Not saved</span>
                      )}

                      {scene.driveUrl && (
                        <a
                          href={scene.driveUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#A94336] hover:underline flex items-center gap-1 font-medium"
                        >
                          <span>Open in Drive</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      {scene.status === 'failed' && (
                        <button
                          onClick={() => onRetryScene(video.id, scene.id)}
                          disabled={!hasReferenceImage}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-[#F4F0E6] bg-[#A94336] hover:bg-[#91352A] transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Retry Scene</span>
                        </button>
                      )}

                      {scene.status === 'completed' && (
                        <button
                          onClick={() => setRegeneratingScene(scene)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-[#625E56] hover:text-[#1C1B19] bg-[#ECE6D8]/60 hover:bg-[#ECE6D8] border border-[#D7D0C0] transition-colors"
                          title="Regenerate this scene (requires explicit confirmation)"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Regenerate...</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        }))}
      </div>

      {/* Confirmation Modal for Single Scene Regeneration */}
      {regeneratingScene && (
        <ConfirmationModal
          isOpen={Boolean(regeneratingScene)}
          title={`Regenerate Scene ${regeneratingScene.sceneNumber}?`}
          message={`Are you sure you want to regenerate Scene ${regeneratingScene.sceneNumber} (${regeneratingScene.outputFilename})? The existing completed image will be replaced with a fresh generation pass using the mandatory official reference image.`}
          confirmLabel="Regenerate Scene"
          isDestructive={true}
          onConfirm={() => {
            onRegenerateScene(video.id, regeneratingScene.id, true);
            setRegeneratingScene(null);
          }}
          onCancel={() => setRegeneratingScene(null)}
        />
      )}
    </div>
  );
};
