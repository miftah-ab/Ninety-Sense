export interface Scene {
  id: string;
  sceneNumber: number;
  approvedPrompt: string;
  promptHash: string;
  characterConsistencyNotes: string;
  status: 'pending' | 'generating' | 'saving' | 'completed' | 'failed' | 'paused';
  referenceAttached: boolean;
  referenceVersion?: string;
  outputFilename?: string;
  driveFileId?: string;
  driveUrl?: string;
  imageUrl?: string;
  aspectRatio: '16:9' | '1:1' | '9:16';
  dimensions?: string;
  modelUsed?: string;
  retryCount: number;
  error?: string;
  updatedAt: string;
}

export interface Video {
  id: string;
  title: string;
  synopsis: string;
  notionPageId?: string;
  status: 'Script Approved' | 'In Production' | 'Completed' | 'Draft';
  createdAt: string;
  scenes: Scene[];
}

export interface BrandAsset {
  filename: string;
  mimeType: string;
  fileSize: number;
  driveFileId: string | null;
  drivePath: string;
  driveUrl?: string;
  version: string;
  sha256: string;
  uploadedAt: string;
  verifiedAt: string | null;
  isVerified: boolean;
  hasCachedBytes: boolean;
}

export interface NotionConfig {
  hasToken: boolean;
  databaseId?: string;
  fieldMapping?: {
    titleField: string;
    scenePromptField: string;
    sceneNumberField: string;
    statusField: string;
  };
  connectedAt?: string;
  workspaceName?: string;
}

export interface DriveConfig {
  rootFolderId: string | null;
  brandFolderId: string | null;
  videosFolderId: string | null;
  userEmail: string | null;
  isConnected: boolean;
}

export interface JobState {
  videoId: string | null;
  status: 'idle' | 'running' | 'paused' | 'stopped';
  currentSceneIndex: number;
  totalScenes: number;
  completedScenes: number;
  failedScenes: number;
  pendingScenes: number;
  referenceVersionLocked: string | null;
  startedAt: string | null;
  lastUpdated: string;
}

export interface ManifestEntry {
  videoId: string;
  videoTitle: string;
  sceneNumber: number;
  sceneId: string;
  approvedPrompt: string;
  promptHash: string;
  referenceImageVersion: string | null;
  referenceDriveFileId: string | null;
  referenceAttached: boolean;
  generationProvider: string;
  modelName: string;
  requestTimestamp: string;
  completedTimestamp?: string;
  generationStatus: 'pending' | 'generating' | 'saving' | 'completed' | 'failed';
  outputFilename?: string;
  driveFileId?: string;
  driveUrl?: string;
  imageFormat?: string;
  dimensions?: string;
  retryCount: number;
  errorDetails?: string;
  lastUpdateTimestamp: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  category: 'notion' | 'drive' | 'brand' | 'generation' | 'job' | 'system';
  message: string;
  details?: Record<string, unknown>;
}

export interface AppDatabase {
  brandAsset: BrandAsset | null;
  notionConfig: NotionConfig;
  driveConfig: DriveConfig;
  selectedVideoId: string | null;
  videos: Video[];
  activeJob: JobState;
  logs: LogEntry[];
}
