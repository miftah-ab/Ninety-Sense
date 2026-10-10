import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { AppDatabase, BrandAsset, LogEntry, Video, JobState, ManifestEntry, Scene } from './types.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const BRAND_DIR = path.resolve(DATA_DIR, 'brand');
const SCENES_DIR = path.resolve(DATA_DIR, 'scenes');
const DB_FILE = path.resolve(DATA_DIR, 'db.json');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(BRAND_DIR)) fs.mkdirSync(BRAND_DIR, { recursive: true });
if (!fs.existsSync(SCENES_DIR)) fs.mkdirSync(SCENES_DIR, { recursive: true });

function computeHash(content: string | Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

const DEFAULT_DB: AppDatabase = {
  brandAsset: null,
  notionConfig: {
    hasToken: false,
    fieldMapping: {
      titleField: 'Title',
      scenePromptField: 'Scene Prompt',
      sceneNumberField: 'Scene Number',
      statusField: 'Status',
    },
  },
  driveConfig: {
    rootFolderId: null,
    brandFolderId: null,
    videosFolderId: null,
    userEmail: null,
    isConnected: false,
  },
  selectedVideoId: null,
  videos: [],
  activeJob: {
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
  },
  logs: [
    {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      level: 'info',
      category: 'system',
      message: 'Ninety Sense Visual Production OS initialized with persistent database storage.',
    },
  ],
};

class StorageManager {
  private db: AppDatabase;

  constructor() {
    this.db = this.load();
  }

  private load(): AppDatabase {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        const filteredVideos = (parsed.videos || []).filter(
          (v: Video) =>
            v.id !== 'V01' &&
            v.id !== 'V02' &&
            v.title !== 'The Architecture of Solitude' &&
            v.title !== 'The Mechanics of Time'
        );
        const selectedId = filteredVideos.some((v: Video) => v.id === parsed.selectedVideoId)
          ? parsed.selectedVideoId
          : filteredVideos[0]?.id || null;
        return {
          ...DEFAULT_DB,
          ...parsed,
          videos: filteredVideos,
          selectedVideoId: selectedId,
          notionConfig: { ...DEFAULT_DB.notionConfig, ...(parsed.notionConfig || {}) },
          driveConfig: { ...DEFAULT_DB.driveConfig, ...(parsed.driveConfig || {}) },
          activeJob: { ...DEFAULT_DB.activeJob, ...(parsed.activeJob || {}), videoId: selectedId },
        };
      }
    } catch (err) {
      console.error('Error loading DB, creating fresh store:', err);
    }
    this.save(DEFAULT_DB);
    return DEFAULT_DB;
  }

  public save(data?: AppDatabase): void {
    if (data) this.db = data;
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.db, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save DB:', err);
    }
  }

  public getDb(): AppDatabase {
    return this.db;
  }

  public log(entry: Omit<LogEntry, 'id' | 'timestamp'>): LogEntry {
    const fullEntry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.db.logs.unshift(fullEntry);
    if (this.db.logs.length > 500) {
      this.db.logs = this.db.logs.slice(0, 500);
    }
    this.save();
    return fullEntry;
  }

  // --- Brand Reference Asset Methods ---
  public saveBrandReference(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    driveFileId: string | null = null,
    driveUrl?: string
  ): BrandAsset {
    const sha256 = computeHash(buffer);
    const version = `v_${Date.now()}_${sha256.substring(0, 8)}`;
    const localFilePath = path.join(BRAND_DIR, 'official-reference.png');

    // Save actual bytes locally for fast reliable generation retrieval
    fs.writeFileSync(localFilePath, buffer);

    const asset: BrandAsset = {
      filename: filename || 'official-reference.png',
      mimeType: mimeType || 'image/png',
      fileSize: buffer.length,
      driveFileId,
      drivePath: 'Ninety Sense/Brand/official-reference.png',
      driveUrl,
      version,
      sha256,
      uploadedAt: new Date().toISOString(),
      verifiedAt: driveFileId ? new Date().toISOString() : null,
      isVerified: Boolean(driveFileId),
      hasCachedBytes: true,
    };

    this.db.brandAsset = asset;
    this.save();
    this.log({
      level: 'success',
      category: 'brand',
      message: `Official reference image saved: ${filename} (${(buffer.length / 1024).toFixed(1)} KB, version: ${version})`,
      details: { version, sha256, driveFileId, driveUrl },
    });

    return asset;
  }

  public getBrandReferenceBytes(): { buffer: Buffer; mimeType: string; asset: BrandAsset } | null {
    if (!this.db.brandAsset) return null;
    const localFilePath = path.join(BRAND_DIR, 'official-reference.png');
    if (fs.existsSync(localFilePath)) {
      const buffer = fs.readFileSync(localFilePath);
      return {
        buffer,
        mimeType: this.db.brandAsset.mimeType || 'image/png',
        asset: this.db.brandAsset,
      };
    }
    return null;
  }

  public updateBrandReferenceDriveId(driveFileId: string, driveUrl?: string, drivePath?: string): void {
    if (this.db.brandAsset) {
      this.db.brandAsset.driveFileId = driveFileId;
      if (driveUrl) this.db.brandAsset.driveUrl = driveUrl;
      if (drivePath) this.db.brandAsset.drivePath = drivePath;
      this.db.brandAsset.verifiedAt = new Date().toISOString();
      this.db.brandAsset.isVerified = true;
      this.save();
      this.log({
        level: 'success',
        category: 'drive',
        message: `Official reference Drive file ID updated: ${driveFileId}`,
        details: { driveFileId, driveUrl, drivePath },
      });
    }
  }

  // --- Scene File Storage Methods ---
  public saveSceneImage(
    videoId: string,
    sceneId: string,
    buffer: Buffer,
    filename: string,
    mimeType: string = 'image/png'
  ): string {
    const sceneFile = path.join(SCENES_DIR, filename);
    fs.writeFileSync(sceneFile, buffer);
    return `/api/assets/scenes/${filename}`;
  }

  public getSceneImageBytes(filename: string): Buffer | null {
    const sceneFile = path.join(SCENES_DIR, filename);
    if (fs.existsSync(sceneFile)) {
      return fs.readFileSync(sceneFile);
    }
    return null;
  }

  // --- Video & Scene Methods ---
  public getVideos(): Video[] {
    return this.db.videos;
  }

  public getVideo(id: string): Video | undefined {
    return this.db.videos.find((v) => v.id === id);
  }

  public addVideo(video: Video): Video {
    const existingIndex = this.db.videos.findIndex((v) => v.id === video.id);
    if (existingIndex >= 0) {
      this.db.videos[existingIndex] = video;
    } else {
      this.db.videos.push(video);
    }
    if (!this.db.selectedVideoId) {
      this.db.selectedVideoId = video.id;
    }
    this.save();
    this.log({
      level: 'info',
      category: 'system',
      message: `Video added to production library: "${video.title}" (${video.scenes.length} scenes).`,
    });
    return video;
  }

  public deleteVideo(id: string): boolean {
    const video = this.getVideo(id);
    this.db.videos = this.db.videos.filter((v) => v.id !== id);
    if (this.db.selectedVideoId === id) {
      this.db.selectedVideoId = this.db.videos[0]?.id || null;
    }
    this.save();
    if (video) {
      this.log({
        level: 'info',
        category: 'system',
        message: `Video removed from production library: "${video.title}" (${id}).`,
      });
    }
    return true;
  }

  public updateVideo(video: Video): void {
    const index = this.db.videos.findIndex((v) => v.id === video.id);
    if (index >= 0) {
      this.db.videos[index] = video;
    } else {
      this.db.videos.push(video);
    }
    this.save();
  }

  public updateScene(videoId: string, sceneId: string, updates: Partial<Scene>): Scene | null {
    const video = this.getVideo(videoId);
    if (!video) return null;
    const scene = video.scenes.find((s) => s.id === sceneId);
    if (!scene) return null;

    Object.assign(scene, updates, { updatedAt: new Date().toISOString() });
    this.save();
    return scene;
  }

  public setSelectedVideo(videoId: string): void {
    this.db.selectedVideoId = videoId;
    this.save();
  }

  // --- Manifest Generation & Storage ---
  public getManifest(videoId: string): ManifestEntry[] {
    const video = this.getVideo(videoId);
    if (!video) return [];

    return video.scenes.map((s) => ({
      videoId: video.id,
      videoTitle: video.title,
      sceneNumber: s.sceneNumber,
      sceneId: s.id,
      approvedPrompt: s.approvedPrompt,
      promptHash: s.promptHash,
      referenceImageVersion: s.referenceVersion || null,
      referenceDriveFileId: s.driveFileId || null,
      referenceAttached: s.referenceAttached,
      generationProvider: s.modelUsed ? 'Google GenAI (@google/genai)' : 'Not Started',
      modelName: s.modelUsed || 'Pending',
      requestTimestamp: s.updatedAt,
      completedTimestamp: s.status === 'completed' ? s.updatedAt : undefined,
      generationStatus: s.status as any,
      outputFilename: s.outputFilename,
      driveFileId: s.driveFileId,
      driveUrl: s.driveUrl,
      imageFormat: 'image/png',
      dimensions: s.dimensions || '1920x1080 (16:9)',
      retryCount: s.retryCount,
      errorDetails: s.error,
      lastUpdateTimestamp: s.updatedAt,
    }));
  }

  // --- Job Queue State ---
  public getActiveJob(): JobState {
    return this.db.activeJob;
  }

  public updateJobState(updates: Partial<JobState>): JobState {
    this.db.activeJob = {
      ...this.db.activeJob,
      ...updates,
      lastUpdated: new Date().toISOString(),
    };
    this.save();
    return this.db.activeJob;
  }
}

export const storage = new StorageManager();
export { computeHash };
