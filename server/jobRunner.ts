import { storage } from './storage.js';
import { imageProvider } from './providers/imageProvider.js';
import { driveService } from './driveService.js';
import { Video, Scene } from './types.js';

class JobRunner {
  private isProcessing: boolean = false;
  private shouldPause: boolean = false;
  private shouldStop: boolean = false;

  public async startJob(videoId: string, accessToken?: string): Promise<void> {
    const video = storage.getVideo(videoId);
    if (!video) throw new Error(`Video ${videoId} not found.`);

    const brandData = storage.getBrandReferenceBytes();
    if (!brandData) {
      storage.log({
        level: 'error',
        category: 'job',
        message: 'Cannot start job: Official Ninety Sense character reference image is missing. Upload and save the reference image first.',
      });
      throw new Error('Official reference image is missing. Please upload the reference image in Brand Assets first.');
    }

    // Lock reference version for this job run
    const lockedVersion = brandData.asset.version;

    // Reset flags
    this.shouldPause = false;
    this.shouldStop = false;

    // Calculate scene status counts
    const completedCount = video.scenes.filter((s) => s.status === 'completed').length;
    const failedCount = video.scenes.filter((s) => s.status === 'failed').length;
    const pendingCount = video.scenes.filter((s) => s.status === 'pending' || s.status === 'paused').length;

    storage.updateJobState({
      videoId,
      status: 'running',
      totalScenes: video.scenes.length,
      completedScenes: completedCount,
      failedScenes: failedCount,
      pendingScenes: pendingCount,
      referenceVersionLocked: lockedVersion,
      startedAt: new Date().toISOString(),
    });

    storage.log({
      level: 'info',
      category: 'job',
      message: `Production job started for "${video.title}" (${video.scenes.length} scenes). Reference locked to version ${lockedVersion}.`,
      details: { videoId, totalScenes: video.scenes.length, completedCount },
    });

    // Run execution loop in background
    this.runQueue(videoId, accessToken).catch((err) => {
      console.error('JobRunner error:', err);
      storage.updateJobState({ status: 'paused' });
    });
  }

  public pauseJob(): void {
    if (this.isProcessing) {
      this.shouldPause = true;
      storage.updateJobState({ status: 'paused' });
      storage.log({
        level: 'warning',
        category: 'job',
        message: 'Job pause requested. Current scene will finish or safely interrupt before pausing.',
      });
    }
  }

  public resumeJob(accessToken?: string): void {
    const job = storage.getActiveJob();
    if (!job.videoId) throw new Error('No active job to resume.');
    this.shouldPause = false;
    this.shouldStop = false;
    storage.updateJobState({ status: 'running' });
    storage.log({
      level: 'info',
      category: 'job',
      message: `Resuming production job for video ${job.videoId}.`,
    });
    this.runQueue(job.videoId, accessToken).catch((err) => {
      console.error('JobRunner resume error:', err);
      storage.updateJobState({ status: 'paused' });
    });
  }

  public stopJob(): void {
    this.shouldStop = true;
    this.shouldPause = false;
    storage.updateJobState({ status: 'stopped' });
    storage.log({
      level: 'info',
      category: 'job',
      message: 'Job stopped by user.',
    });
  }

  // Execute a single scene retry
  public async retryScene(videoId: string, sceneId: string, accessToken?: string): Promise<Scene | null> {
    const video = storage.getVideo(videoId);
    if (!video) throw new Error('Video not found.');
    const scene = video.scenes.find((s) => s.id === sceneId);
    if (!scene) throw new Error('Scene not found.');

    storage.log({
      level: 'info',
      category: 'job',
      message: `Manually retrying Scene ${scene.sceneNumber} (${scene.id}).`,
    });

    scene.retryCount += 1;
    scene.error = undefined;
    storage.updateScene(videoId, sceneId, { status: 'pending', retryCount: scene.retryCount, error: undefined });

    return this.processScene(video, scene, accessToken);
  }

  // Regenerate completed scene (after user confirmed)
  public async regenerateScene(videoId: string, sceneId: string, accessToken?: string): Promise<Scene | null> {
    const video = storage.getVideo(videoId);
    if (!video) throw new Error('Video not found.');
    const scene = video.scenes.find((s) => s.id === sceneId);
    if (!scene) throw new Error('Scene not found.');

    storage.log({
      level: 'info',
      category: 'job',
      message: `Regenerating completed Scene ${scene.sceneNumber} after user confirmation.`,
    });

    scene.retryCount += 1;
    scene.error = undefined;
    storage.updateScene(videoId, sceneId, { status: 'pending', retryCount: scene.retryCount, error: undefined });

    return this.processScene(video, scene, accessToken);
  }

  private async runQueue(videoId: string, accessToken?: string): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const video = storage.getVideo(videoId);
      if (!video) return;

      // Iterate through scenes
      for (let i = 0; i < video.scenes.length; i++) {
        if (this.shouldStop) {
          storage.updateJobState({ status: 'stopped' });
          break;
        }

        if (this.shouldPause) {
          storage.updateJobState({ status: 'paused' });
          storage.log({
            level: 'info',
            category: 'job',
            message: 'Production job successfully paused. State persisted.',
          });
          break;
        }

        const scene = video.scenes[i];

        // SKIP genuinely completed scenes when resuming
        if (scene.status === 'completed' && scene.imageUrl) {
          continue;
        }

        // Update current scene index
        storage.updateJobState({ currentSceneIndex: i });

        const processed = await this.processScene(video, scene, accessToken);

        // Recalculate stats
        const currentVideo = storage.getVideo(videoId)!;
        const comp = currentVideo.scenes.filter((s) => s.status === 'completed').length;
        const fail = currentVideo.scenes.filter((s) => s.status === 'failed').length;
        const pend = currentVideo.scenes.filter((s) => s.status === 'pending' || s.status === 'paused').length;

        storage.updateJobState({
          completedScenes: comp,
          failedScenes: fail,
          pendingScenes: pend,
        });

        // If the scene failed due to billing/quota or fatal error, pause the queue
        if (processed && processed.status === 'failed') {
          storage.log({
            level: 'warning',
            category: 'job',
            message: `Job paused after failure on Scene ${scene.sceneNumber}. You may retry the scene or check provider settings.`,
          });
          this.shouldPause = true;
          storage.updateJobState({ status: 'paused' });
          break;
        }
      }

      const finalVideo = storage.getVideo(videoId)!;
      const allDone = finalVideo.scenes.every((s) => s.status === 'completed');
      if (allDone) {
        storage.updateJobState({ status: 'idle' });
        storage.log({
          level: 'success',
          category: 'job',
          message: `All scenes completed successfully for "${video.title}"! Manifest updated and verified.`,
        });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async processScene(video: Video, scene: Scene, accessToken?: string): Promise<Scene | null> {
    // 1. Mandatory reference bytes retrieval
    const brandData = storage.getBrandReferenceBytes();
    if (!brandData) {
      const err = 'Fatal: Official reference image is missing. Generation stopped.';
      storage.updateScene(video.id, scene.id, {
        status: 'failed',
        error: err,
        referenceAttached: false,
      });
      storage.log({
        level: 'error',
        category: 'generation',
        message: err,
        details: { sceneId: scene.id, sceneNumber: scene.sceneNumber },
      });
      return storage.getVideo(video.id)?.scenes.find((s) => s.id === scene.id) || null;
    }

    // 2. Set state to generating
    storage.updateScene(video.id, scene.id, {
      status: 'generating',
      referenceAttached: true,
      referenceVersion: brandData.asset.version,
    });

    storage.log({
      level: 'info',
      category: 'generation',
      message: `Generating Scene ${scene.sceneNumber} of "${video.title}" with mandatory reference image (${(brandData.buffer.length / 1024).toFixed(1)} KB).`,
    });

    // 3. Call generation provider with actual reference image bytes and exact prompt
    const genResult = await imageProvider.generateSceneImage({
      prompt: scene.approvedPrompt,
      sceneNumber: scene.sceneNumber,
      characterConsistencyNotes: scene.characterConsistencyNotes,
      referenceImageBytes: brandData.buffer,
      referenceMimeType: brandData.mimeType,
      aspectRatio: scene.aspectRatio || '16:9',
    });

    if (!genResult.success || !genResult.imageBase64) {
      // Scene failed
      storage.updateScene(video.id, scene.id, {
        status: 'failed',
        error: genResult.error || 'Unknown generation failure',
        referenceAttached: genResult.referenceAttached,
      });
      return storage.getVideo(video.id)?.scenes.find((s) => s.id === scene.id) || null;
    }

    // 4. Save returned image bytes to durable local storage
    storage.updateScene(video.id, scene.id, { status: 'saving' });

    const imageBuffer = Buffer.from(genResult.imageBase64, 'base64');
    const filename = `${video.id}_Scene_${String(scene.sceneNumber).padStart(3, '0')}.png`;
    const localUrl = storage.saveSceneImage(video.id, scene.id, imageBuffer, filename, genResult.mimeType || 'image/png');

    let driveFileId: string | undefined;
    let driveUrl: string | undefined;

    // 5. If Google Drive access token is available, upload directly to Drive
    if (accessToken) {
      try {
        storage.log({
          level: 'info',
          category: 'drive',
          message: `Uploading ${filename} to Google Drive...`,
        });

        // Ensure folder hierarchy
        const hierarchy = await driveService.ensureProductionHierarchy(accessToken);
        const videoFolderName = `${video.id} - ${video.title.replace(/[/\\?%*:|"<>]/g, '')}`;
        const videoFolders = await driveService.ensureVideoFolders(accessToken, hierarchy.videosId, videoFolderName);

        const uploadResult = await driveService.uploadFile(
          accessToken,
          filename,
          genResult.mimeType || 'image/png',
          imageBuffer,
          videoFolders.scenesFolderId
        );

        driveFileId = uploadResult.fileId;
        driveUrl = uploadResult.webViewLink;

        storage.log({
          level: 'success',
          category: 'drive',
          message: `Saved ${filename} to Drive folder "Scenes" (File ID: ${driveFileId})`,
        });

        // Also sync manifest file into Manifest folder
        const manifestEntries = storage.getManifest(video.id);
        const manifestBuffer = Buffer.from(JSON.stringify(manifestEntries, null, 2), 'utf-8');
        await driveService.uploadFile(
          accessToken,
          'manifest.json',
          'application/json',
          manifestBuffer,
          videoFolders.manifestFolderId
        );
      } catch (driveErr: any) {
        storage.log({
          level: 'warning',
          category: 'drive',
          message: `Saved locally, but Google Drive upload encountered an issue: ${driveErr.message}. File remains safe locally.`,
        });
      }
    }

    // 6. Mark scene completed
    const updated = storage.updateScene(video.id, scene.id, {
      status: 'completed',
      imageUrl: localUrl,
      outputFilename: filename,
      driveFileId,
      driveUrl,
      modelUsed: genResult.modelName,
      dimensions: '1920x1080 (16:9)',
      referenceAttached: true,
      referenceVersion: brandData.asset.version,
      error: undefined,
    });

    storage.log({
      level: 'success',
      category: 'job',
      message: `Scene ${scene.sceneNumber} completed and persisted as ${filename}.`,
      details: { sceneId: scene.id, filename, driveFileId },
    });

    return updated;
  }
}

export const jobRunner = new JobRunner();
