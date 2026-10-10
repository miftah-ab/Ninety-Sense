/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import { User } from 'firebase/auth';
import { initAuth } from './services/firebaseAuth';
import { api } from './services/api';
import { Navbar, TabKey } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { VideosView } from './components/VideosView';
import { SceneProductionView } from './components/SceneProductionView';
import { BrandAssetsView } from './components/BrandAssetsView';
import { IntegrationsView } from './components/IntegrationsView';
import { SettingsLogsView } from './components/SettingsLogsView';
import { ImagePreviewModal } from './components/ImagePreviewModal';
import { Video, BrandAsset, JobState, LogEntry } from '../server/types';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // App data state
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [brandAsset, setBrandAsset] = useState<BrandAsset | null>(null);
  const [hasReferenceImage, setHasReferenceImage] = useState<boolean>(false);
  const [activeJob, setActiveJob] = useState<JobState>({
    videoId: null,
    status: 'idle',
    currentSceneIndex: 0,
    totalScenes: 0,
    completedScenes: 0,
    failedScenes: 0,
    pendingScenes: 0,
    referenceVersionLocked: null,
    startedAt: null,
    lastUpdated: new Date().toISOString(),
  });
  const [providerStatus, setProviderStatus] = useState<any>(null);
  const [driveConfig, setDriveConfig] = useState<any>({ isConnected: false });
  const [notionConfig, setNotionConfig] = useState<any>({ hasToken: false });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Lightbox Modal state
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    title: string;
    subtitle?: string;
    driveUrl?: string;
  } | null>(null);

  // Initialize Firebase Auth listener
  useEffect(() => {
    initAuth(
      (authedUser, authedToken) => {
        setUser(authedUser);
        setToken(authedToken);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
  }, []);

  // Fetch full system state
  const refreshData = useCallback(async () => {
    try {
      const [statusRes, videosRes, logsRes] = await Promise.all([
        api.getStatus(),
        api.getVideos(),
        api.getLogs(),
      ]);

      if (statusRes) {
        setBrandAsset(statusRes.brandAsset);
        setHasReferenceImage(statusRes.hasReferenceImage);
        setActiveJob(statusRes.activeJob);
        setDriveConfig(statusRes.driveConfig);
        setNotionConfig(statusRes.notionConfig);
        setProviderStatus(statusRes.provider);
        if (statusRes.selectedVideoId) {
          setSelectedVideoId(statusRes.selectedVideoId);
        }
      }

      if (videosRes && videosRes.videos) {
        setVideos(videosRes.videos);
      }

      if (logsRes && logsRes.logs) {
        setLogs(logsRes.logs);
      }
    } catch (err) {
      console.error('Error refreshing app data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Periodic polling when a job is active
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (activeJob.status === 'running') {
      interval = setInterval(() => {
        refreshData();
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeJob.status, refreshData]);

  const selectedVideo = videos.find((v) => v.id === selectedVideoId) || videos[0];

  // Actions
  const handleSelectVideo = async (id: string) => {
    setSelectedVideoId(id);
    await api.selectVideo(id);
    refreshData();
  };

  const handleStartJob = async (videoId: string) => {
    try {
      await api.startJob(videoId);
      refreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to start job');
    }
  };

  const handlePauseJob = async () => {
    try {
      await api.pauseJob();
      refreshData();
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleResumeJob = async () => {
    try {
      await api.resumeJob();
      refreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to resume job');
    }
  };

  const handleStopJob = async () => {
    try {
      await api.stopJob();
      refreshData();
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleRetryScene = async (videoId: string, sceneId: string) => {
    try {
      await api.retryScene(videoId, sceneId);
      refreshData();
    } catch (err: any) {
      alert(err.message || 'Retry failed');
    }
  };

  const handleRegenerateScene = async (videoId: string, sceneId: string, confirmed: boolean) => {
    try {
      await api.regenerateScene(videoId, sceneId, confirmed);
      refreshData();
    } catch (err: any) {
      alert(err.message || 'Regeneration failed');
    }
  };

  const handleUploadReference = async (base64: string, filename: string, mimeType: string) => {
    await api.uploadReference(base64, filename, mimeType);
    await refreshData();
  };

  const handleSyncDriveReference = async () => {
    await api.syncDriveReference();
    await refreshData();
  };

  const handleVerifyDriveReference = async () => {
    await api.verifyDriveReference();
    await refreshData();
  };

  const handleConnectNotion = async (notionToken: string) => {
    await api.connectNotion(notionToken);
    await refreshData();
  };

  const handleDisconnectNotion = async () => {
    await api.disconnectNotion();
    await refreshData();
  };

  const handleGetNotionDatabases = async () => {
    const res = await api.getNotionDatabases();
    return res.databases || [];
  };

  const handleImportNotionDatabase = async (databaseId: string, fieldMapping: any) => {
    await api.importNotion(databaseId, fieldMapping);
    await refreshData();
  };

  const handleCreateVideo = async (videoData: any) => {
    await api.createVideo(videoData);
    await refreshData();
  };

  const handleDeleteVideo = async (videoId: string) => {
    await api.deleteVideo(videoId);
    await refreshData();
  };

  const handleOpenImage = (url: string, title: string, subtitle?: string, driveUrl?: string) => {
    setPreviewImage({ url, title, subtitle, driveUrl });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F0E6] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 rounded bg-[#1C1B19] text-[#F4F0E6] font-bold text-xs flex items-center justify-center mx-auto border border-[#1C1B19] animate-pulse">
            90
          </div>
          <div className="text-xs font-semibold text-[#1C1B19] uppercase tracking-wider">
            Loading Ninety Sense Visual Production OS...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F0E6] flex flex-col text-[#1C1B19]">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedVideoTitle={selectedVideo?.title}
        hasReferenceImage={hasReferenceImage}
        user={user}
        onAuthChange={(u, t) => {
          setUser(u);
          setToken(t);
          refreshData();
        }}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            selectedVideo={selectedVideo}
            allVideos={videos}
            brandAsset={brandAsset}
            hasReferenceImage={hasReferenceImage}
            activeJob={activeJob}
            providerStatus={providerStatus}
            driveConfig={driveConfig}
            isDriveConnected={Boolean(user)}
            onTabChange={setActiveTab}
            onStartJob={handleStartJob}
            onPauseJob={handlePauseJob}
            onResumeJob={handleResumeJob}
            onStopJob={handleStopJob}
            onOpenImage={handleOpenImage}
          />
        )}

        {activeTab === 'videos' && (
          <VideosView
            videos={videos}
            selectedVideoId={selectedVideoId}
            onSelectVideo={handleSelectVideo}
            onCreateVideo={handleCreateVideo}
            onDeleteVideo={handleDeleteVideo}
            onTabChange={setActiveTab}
            onOpenImage={handleOpenImage}
          />
        )}

        {activeTab === 'production' && (
          <SceneProductionView
            video={selectedVideo}
            activeJob={activeJob}
            hasReferenceImage={hasReferenceImage}
            onStartJob={handleStartJob}
            onPauseJob={handlePauseJob}
            onResumeJob={handleResumeJob}
            onStopJob={handleStopJob}
            onRetryScene={handleRetryScene}
            onRegenerateScene={handleRegenerateScene}
            onOpenImage={handleOpenImage}
          />
        )}

        {activeTab === 'brand' && (
          <BrandAssetsView
            brandAsset={brandAsset}
            hasReferenceImage={hasReferenceImage}
            isDriveConnected={Boolean(user)}
            user={user}
            onAuthChange={(u, t) => {
              setUser(u);
              setToken(t);
              refreshData();
            }}
            onUploadReference={handleUploadReference}
            onSyncDriveReference={handleSyncDriveReference}
            onVerifyDriveReference={handleVerifyDriveReference}
            onOpenImage={handleOpenImage}
          />
        )}

        {activeTab === 'integrations' && (
          <IntegrationsView
            notionConfig={notionConfig}
            driveConfig={driveConfig}
            providerStatus={providerStatus}
            user={user}
            onAuthChange={(u, t) => {
              setUser(u);
              setToken(t);
              refreshData();
            }}
            onConnectNotion={handleConnectNotion}
            onDisconnectNotion={handleDisconnectNotion}
            onGetNotionDatabases={handleGetNotionDatabases}
            onImportNotionDatabase={handleImportNotionDatabase}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsLogsView logs={logs} onRefreshLogs={refreshData} />
        )}
      </main>

      {/* Editorial Footer */}
      <footer className="border-t border-[#D7D0C0] bg-[#FAF8F2] py-6 mt-12 text-xs text-[#625E56]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#1C1B19]">NINETY SENSE</span>
            <span>// Visual Production Operating System</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Warm Ivory: #F4F0E6</span>
            <span>Dark Ink: #1C1B19</span>
            <span>Muted Vermilion: #A94336</span>
          </div>
        </div>
      </footer>

      {/* Lightbox Modal */}
      {previewImage && (
        <ImagePreviewModal
          isOpen={Boolean(previewImage)}
          imageUrl={previewImage.url}
          title={previewImage.title}
          subtitle={previewImage.subtitle}
          driveUrl={previewImage.driveUrl}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
}
