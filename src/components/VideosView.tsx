import React from 'react';
import { Search, Film, CheckCircle2, Clapperboard, ArrowRight, RefreshCw, FileText, Download } from 'lucide-react';
import { Video } from '../../server/types';
import { TabKey } from './Navbar';

interface Props {
  videos: Video[];
  selectedVideoId: string | null;
  onSelectVideo: (id: string) => void;
  onTabChange: (tab: TabKey) => void;
  onOpenImage: (url: string, title: string, subtitle?: string, driveUrl?: string) => void;
}

export const VideosView: React.FC<Props> = ({
  videos,
  selectedVideoId,
  onSelectVideo,
  onTabChange,
  onOpenImage,
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [previewingVideo, setPreviewingVideo] = React.useState<Video | null>(null);

  const filteredVideos = videos.filter((v) => {
    const matchesSearch =
      v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.synopsis.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Search & Filter Header */}
      <div className="bg-[#FAF8F2] border border-[#D7D0C0] rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#1C1B19]">Video Production Library</h2>
          <p className="text-xs text-[#625E56] mt-0.5">
            Approved scripts and scene prompts retrieved from Notion. Select a video to begin generation.
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
              className="pl-9 pr-3 py-1.5 rounded text-xs bg-[#FAF8F2] border border-[#D7D0C0] focus:border-[#A94336] focus:outline-hidden w-56 text-[#1C1B19]"
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
              No videos match your filter or your workspace hasn't synced from Notion yet. Go to Integrations to connect your Notion database and retrieve your approved Ninety Sense episodes.
            </p>
          </div>
          <button
            onClick={() => onTabChange('integrations')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded text-xs font-semibold text-[#F4F0E6] bg-[#A94336] hover:bg-[#91352A] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Connect & Sync Notion Database</span>
          </button>
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

                  {isSelected && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-[#A94336]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Active for Production</span>
                    </span>
                  )}
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
                Exact approved prompts preserved faithfully from Notion without automated rewriting:
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
