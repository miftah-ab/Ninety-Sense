import React from 'react';
import {
  Search,
  Film,
  CheckCircle2,
  Clapperboard,
  ArrowRight,
  RefreshCw,
  FileText,
  Download,
  Plus,
  Trash2,
  X,
  PlusCircle,
} from 'lucide-react';
import { Video } from '../../server/types';
import { TabKey } from './Navbar';
import { ConfirmationModal } from './ConfirmationModal';

interface Props {
  videos: Video[];
  selectedVideoId: string | null;
  onSelectVideo: (id: string) => void;
  onCreateVideo?: (video: {
    title: string;
    synopsis?: string;
    scenes: Array<{ sceneNumber?: number; approvedPrompt: string; characterConsistencyNotes?: string }>;
  }) => Promise<void>;
  onDeleteVideo?: (id: string) => Promise<void>;
  onTabChange: (tab: TabKey) => void;
  onOpenImage: (url: string, title: string, subtitle?: string, driveUrl?: string) => void;
}

export const VideosView: React.FC<Props> = ({
  videos,
  selectedVideoId,
  onSelectVideo,
  onCreateVideo,
  onDeleteVideo,
  onTabChange,
  onOpenImage,
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [previewingVideo, setPreviewingVideo] = React.useState<Video | null>(null);

  // Add Video Modal State
  const [addModalOpen, setAddModalOpen] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState('');
  const [newSynopsis, setNewSynopsis] = React.useState('');
  const [scenePromptsText, setScenePromptsText] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Delete Video Modal State
  const [videoToDelete, setVideoToDelete] = React.useState<Video | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const filteredVideos = videos.filter((v) => {
    const matchesSearch =
      v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.synopsis.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !onCreateVideo) return;

    // Split scenePromptsText by lines or semicolons
    const lines = scenePromptsText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const scenes = lines.map((line, idx) => {
      // Check if line starts with Scene X:
      const cleanPrompt = line.replace(/^scene\s*\d+[:\-.]\s*/i, '').trim();
      return {
        sceneNumber: idx + 1,
        approvedPrompt: cleanPrompt || line,
        characterConsistencyNotes: 'Ninety Figure and open-cube geometry mandatory.',
      };
    });

    setIsSubmitting(true);
    try {
      await onCreateVideo({
        title: newTitle.trim(),
        synopsis: newSynopsis.trim() || undefined,
        scenes: scenes.length > 0 ? scenes : [{ sceneNumber: 1, approvedPrompt: 'Ninety Figure within the open cube.' }],
      });
      setAddModalOpen(false);
      setNewTitle('');
      setNewSynopsis('');
      setScenePromptsText('');
    } catch (err: any) {
      alert(err.message || 'Failed to create video');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!videoToDelete || !onDeleteVideo) return;
    setIsDeleting(true);
    try {
      await onDeleteVideo(videoToDelete.id);
      setVideoToDelete(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete video');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Header */}
      <div className="bg-[#FAF8F2] border border-[#D7D0C0] rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#1C1B19]">Video Production Library</h2>
          <p className="text-xs text-[#625E56] mt-0.5">
            Approved scripts and scene prompts. Zero mock data — sync from Notion or add scripts directly.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#8E897E] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search videos or prompts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 rounded text-xs bg-[#FAF8F2] border border-[#D7D0C0] focus:border-[#A94336] focus:outline-hidden w-52 text-[#1C1B19]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded text-xs bg-[#FAF8F2] border border-[#D7D0C0] focus:border-[#A94336] focus:outline-hidden text-[#1C1B19]"
          >
            <option value="all">All Statuses</option>
            <option value="Script Approved">Script Approved</option>
            <option value="In Production">In Production</option>
            <option value="Completed">Completed</option>
          </select>

          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-[#F4F0E6] bg-[#A94336] hover:bg-[#91352A] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Video Script</span>
          </button>

          <button
            onClick={() => onTabChange('integrations')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-[#1C1B19] bg-[#ECE6D8] border border-[#D7D0C0] hover:bg-[#FAF8F2] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#A94336]" />
            <span>Sync Notion</span>
          </button>
        </div>
      </div>

      {/* Videos List */}
      {filteredVideos.length === 0 ? (
        <div className="bg-[#FAF8F2] border border-[#D7D0C0] rounded-xl p-12 text-center space-y-4">
          <Film className="w-10 h-10 text-[#8E897E] mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#1C1B19]">No Videos in Production Library</h3>
            <p className="text-xs text-[#625E56] max-w-md mx-auto">
              Your library has zero mock data. Connect your Notion database to import approved episodes, or add your video script and scene prompts directly.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onTabChange('integrations')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded text-xs font-semibold text-[#F4F0E6] bg-[#A94336] hover:bg-[#91352A] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Connect & Sync Notion Database</span>
            </button>
            <button
              onClick={() => setAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded text-xs font-semibold text-[#1C1B19] bg-[#ECE6D8] border border-[#D7D0C0] hover:bg-[#FAF8F2] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Real Video Script Directly</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredVideos.map((video) => {
            const isSelected = video.id === selectedVideoId;
            const completedCount = video.scenes.filter((s) => s.status === 'completed').length;
            const totalCount = video.scenes.length;
            const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

            return (
              <div
                key={video.id}
                className={`bg-[#FAF8F2] border rounded-xl p-5 space-y-4 transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#A94336] shadow-sm ring-1 ring-[#A94336]'
                    : 'border-[#D7D0C0] hover:border-[#1C1B19]/40'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#1C1B19] text-[#F4F0E6]">
                        {video.id}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded font-medium bg-[#ECE6D8] text-[#625E56]">
                        {video.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isSelected && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-[#A94336]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Active for Production</span>
                        </span>
                      )}
                      <button
                        onClick={() => setVideoToDelete(video)}
                        className="p-1 rounded text-[#8E897E] hover:text-[#A94336] hover:bg-[#FBECEB] transition-colors"
                        title="Delete video"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-[#1C1B19] leading-snug">{video.title}</h3>
                  <p className="text-xs text-[#625E56] leading-relaxed line-clamp-2">{video.synopsis}</p>
                </div>

                {/* Scenes progress */}
                <div className="space-y-1.5 pt-3 border-t border-[#D7D0C0]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#625E56] font-medium flex items-center gap-1.5">
                      <Clapperboard className="w-3.5 h-3.5" />
                      <span>{totalCount} Approved Scenes</span>
                    </span>
                    <span className="font-mono font-medium text-[#1C1B19]">
                      {completedCount} / {totalCount} ({percent}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#ECE6D8] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#A94336] rounded-full transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    onClick={() => setPreviewingVideo(video)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-[#1C1B19] bg-[#ECE6D8]/60 hover:bg-[#ECE6D8] border border-[#D7D0C0] transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Inspect Prompts</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {completedCount > 0 && (
                      <a
                        href={`/api/export/zip/${video.id}`}
                        download
                        className="p-1.5 rounded text-[#625E56] hover:text-[#1C1B19] hover:bg-[#ECE6D8] border border-[#D7D0C0]"
                        title="Export completed scenes as ZIP"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}

                    <button
                      onClick={() => {
                        onSelectVideo(video.id);
                        onTabChange('production');
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                        isSelected
                          ? 'bg-[#1C1B19] text-[#F4F0E6] hover:bg-[#2E2C28]'
                          : 'bg-[#A94336] text-[#F4F0E6] hover:bg-[#91352A]'
                      }`}
                    >
                      <span>{isSelected ? 'Open Workspace' : 'Select for Production'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Real Video Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1B19]/60 backdrop-blur-xs">
          <div className="bg-[#FAF8F2] border border-[#D7D0C0] rounded-xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-[#D7D0C0] bg-[#ECE6D8]/50 flex items-center justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-[#A94336] uppercase tracking-wider">
                  Real Production Input
                </span>
                <h3 className="text-base font-bold text-[#1C1B19]">Add Approved Video Script</h3>
              </div>
              <button
                onClick={() => setAddModalOpen(false)}
                className="p-1 text-[#625E56] hover:text-[#1C1B19]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1C1B19] mb-1">
                  Video Title <span className="text-[#A94336]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder='e.g., "The Architecture of Solitude"'
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2 text-xs rounded bg-[#FAF8F2] border border-[#D7D0C0] text-[#1C1B19] focus:border-[#A94336] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1B19] mb-1">
                  Synopsis / Concept
                </label>
                <input
                  type="text"
                  placeholder="e.g., An architectural examination of spatial boundaries and solitary contemplation."
                  value={newSynopsis}
                  onChange={(e) => setNewSynopsis(e.target.value)}
                  className="w-full p-2 text-xs rounded bg-[#FAF8F2] border border-[#D7D0C0] text-[#1C1B19] focus:border-[#A94336] focus:outline-hidden"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#1C1B19]">
                    Approved Scene Prompts (One per line) <span className="text-[#A94336]">*</span>
                  </label>
                  <span className="text-[10px] text-[#625E56]">1 line = 1 scene</span>
                </div>
                <textarea
                  rows={6}
                  required
                  placeholder={`Ninety Figure seated in solitary posture inside floating open cubic frame, minimalist void background
Ninety Figure standing at the geometric threshold of an open cube, looking outward
Top-down view of open cubic perimeter on parchment ivory background with vermilion accents`}
                  value={scenePromptsText}
                  onChange={(e) => setScenePromptsText(e.target.value)}
                  className="w-full p-2.5 text-xs rounded bg-[#FAF8F2] border border-[#D7D0C0] text-[#1C1B19] focus:border-[#A94336] focus:outline-hidden font-mono leading-relaxed"
                />
              </div>

              <div className="p-3 bg-[#ECE6D8]/50 border border-[#D7D0C0] rounded-lg text-[11px] text-[#625E56]">
                This creates a real video entry in your production database. Once created, you can run visual scene generation using your mandatory brand reference image and save outputs directly to Google Drive.
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-3.5 py-2 rounded text-xs font-medium text-[#1C1B19] bg-[#ECE6D8] border border-[#D7D0C0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newTitle.trim()}
                  className="px-4 py-2 rounded text-xs font-semibold text-[#F4F0E6] bg-[#A94336] hover:bg-[#91352A] disabled:opacity-50"
                >
                  {isSubmitting ? 'Adding...' : 'Save Video to Library'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {videoToDelete && (
        <ConfirmationModal
          isOpen={Boolean(videoToDelete)}
          title={`Delete "${videoToDelete.title}"?`}
          message={`Are you sure you want to remove ${videoToDelete.id} (${videoToDelete.title}) from the production library? This action cannot be undone.`}
          confirmLabel="Delete Video"
          isDestructive={true}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setVideoToDelete(null)}
        />
      )}

      {/* Scene Prompts Inspector Modal */}
      {previewingVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1B19]/60 backdrop-blur-xs">
          <div className="bg-[#FAF8F2] border border-[#D7D0C0] rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[#D7D0C0] bg-[#ECE6D8]/50 flex items-center justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-[#A94336]">{previewingVideo.id}</span>
                <h3 className="text-base font-bold text-[#1C1B19]">{previewingVideo.title}</h3>
              </div>
              <button
                onClick={() => setPreviewingVideo(null)}
                className="px-3 py-1 rounded text-xs font-medium text-[#1C1B19] bg-[#FAF8F2] border border-[#D7D0C0] hover:bg-[#ECE6D8]"
              >
                Close
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="text-xs text-[#625E56] italic">
                Exact approved prompts preserved faithfully without automated distortion:
              </div>

              {previewingVideo.scenes.map((scene) => (
                <div
                  key={scene.id}
                  className="bg-[#ECE6D8]/40 border border-[#D7D0C0] rounded-lg p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#1C1B19]">
                      Scene {String(scene.sceneNumber).padStart(3, '0')}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                        scene.status === 'completed' ? 'bg-[#E7EFE8] text-[#366340]' : 'bg-[#ECE6D8] text-[#625E56]'
                      }`}
                    >
                      {scene.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#1C1B19] leading-relaxed font-sans font-normal">
                    "{scene.approvedPrompt}"
                  </p>
                  {scene.characterConsistencyNotes && (
                    <p className="text-[11px] text-[#625E56] bg-[#FAF8F2] p-2 rounded border border-[#D7D0C0]">
                      <span className="font-semibold text-[#1C1B19]">Consistency Rule: </span>
                      {scene.characterConsistencyNotes}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 bg-[#ECE6D8]/50 border-t border-[#D7D0C0] flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  onSelectVideo(previewingVideo.id);
                  setPreviewingVideo(null);
                  onTabChange('production');
                }}
                className="px-4 py-2 rounded text-xs font-semibold text-[#F4F0E6] bg-[#A94336] hover:bg-[#91352A] transition-colors"
              >
                Select & Open Production
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
