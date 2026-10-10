import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import JSZip from 'jszip';
import { storage } from './server/storage.js';
import { notionService } from './server/notionService.js';
import { driveService } from './server/driveService.js';
import { imageProvider } from './server/providers/imageProvider.js';
import { jobRunner } from './server/jobRunner.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Support large payload for high-res reference image uploads
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Helper to extract Bearer token from request headers
function getBearerToken(req: express.Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  return undefined;
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 1. System status
app.get('/api/status', (req, res) => {
  const db = storage.getDb();
  const brandData = storage.getBrandReferenceBytes();
  const providerCaps = imageProvider.getCapabilities();

  res.json({
    brandAsset: db.brandAsset,
    hasReferenceImage: Boolean(brandData),
    referenceVersion: db.brandAsset?.version || null,
    notionConfig: {
      hasToken: notionService.hasToken(),
      workspaceName: db.notionConfig.workspaceName,
      connectedAt: db.notionConfig.connectedAt,
    },
    driveConfig: db.driveConfig,
    provider: providerCaps,
    selectedVideoId: db.selectedVideoId,
    activeJob: storage.getActiveJob(),
  });
});

// 2. Brand Asset - Upload official reference image
app.post('/api/brand/upload', async (req, res) => {
  try {
    const { imageBase64, filename, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required.' });
    }

    // Clean data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const cleanFilename = filename || 'official-reference.png';
    const cleanMime = mimeType || 'image/png';

    const accessToken = getBearerToken(req);
    let driveFileId: string | null = null;
    let driveUrl: string | null = null;

    // If Google Drive token is provided, upload directly to Ninety Sense/Brand/
    if (accessToken) {
      try {
        const hierarchy = await driveService.ensureProductionHierarchy(accessToken);
        const uploadResult = await driveService.uploadFile(
          accessToken,
          cleanFilename,
          cleanMime,
          buffer,
          hierarchy.brandId
        );
        driveFileId = uploadResult.fileId;
        driveUrl = uploadResult.webViewLink || `https://drive.google.com/file/d/${driveFileId}/view`;

        // Verify retrievability immediately by downloading actual bytes back from Drive
        await driveService.verifyFileBytes(accessToken, driveFileId);
      } catch (driveErr: any) {
        console.warn('Google Drive reference upload failed:', driveErr.message);
        storage.log({
          level: 'warning',
          category: 'brand',
          message: `Saved reference locally, but Drive upload failed: ${driveErr.message}`,
        });
      }
    }

    const asset = storage.saveBrandReference(buffer, cleanFilename, cleanMime, driveFileId, driveUrl || undefined);

    res.json({
      success: true,
      asset,
      driveFileId,
      driveUrl,
      message: driveFileId
        ? 'Official reference image saved to Google Drive (Ninety Sense/Brand/official-reference.png) and byte-verified.'
        : 'Official reference image saved and cached locally. Sign in to Google Drive to sync to cloud storage.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save reference image' });
  }
});

// 2b. Brand Asset - Sync local reference image to Google Drive
app.post('/api/brand/sync-drive', async (req, res) => {
  const accessToken = getBearerToken(req);
  if (!accessToken) {
    return res.status(401).json({ error: 'Google Drive authorization token required.' });
  }

  const brandData = storage.getBrandReferenceBytes();
  if (!brandData) {
    return res.status(400).json({ error: 'No official reference image found to sync. Please upload an image first.' });
  }

  try {
    const hierarchy = await driveService.ensureProductionHierarchy(accessToken);
    const filename = brandData.asset.filename || 'official-reference.png';
    const uploadResult = await driveService.uploadFile(
      accessToken,
      filename,
      brandData.mimeType,
      brandData.buffer,
      hierarchy.brandId
    );

    // Verify retrievability
    const verified = await driveService.verifyFileBytes(accessToken, uploadResult.fileId);
    const driveUrl = uploadResult.webViewLink || `https://drive.google.com/file/d/${uploadResult.fileId}/view`;

    storage.updateBrandReferenceDriveId(uploadResult.fileId, driveUrl, 'Ninety Sense/Brand/official-reference.png');

    res.json({
      success: true,
      driveFileId: uploadResult.fileId,
      driveUrl,
      drivePath: 'Ninety Sense/Brand/official-reference.png',
      verifiedBytes: verified.byteLength,
      message: `Official reference image saved to Google Drive and verified (${(verified.byteLength / 1024).toFixed(1)} KB).`,
      asset: storage.getDb().brandAsset,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to sync reference to Google Drive' });
  }
});

// 2c. Brand Asset - Get reference status
app.get('/api/brand/reference', (req, res) => {
  const db = storage.getDb();
  const brandData = storage.getBrandReferenceBytes();
  res.json({
    success: true,
    asset: db.brandAsset,
    hasCachedBytes: Boolean(brandData),
    referenceVersion: db.brandAsset?.version || null,
  });
});

// 3. Brand Asset - Stream official reference image
app.get('/api/brand/image', (req, res) => {
  const brandData = storage.getBrandReferenceBytes();
  if (!brandData) {
    return res.status(404).json({ error: 'Official reference image not uploaded yet.' });
  }
  res.setHeader('Content-Type', brandData.mimeType);
  res.setHeader('Cache-Control', 'no-cache');
  res.send(brandData.buffer);
});

// 4. Brand Asset - Verify Drive Reference File
app.post('/api/brand/verify-drive', async (req, res) => {
  const accessToken = getBearerToken(req);
  if (!accessToken) {
    return res.status(401).json({ error: 'Google Drive authorization token required.' });
  }

  const asset = storage.getDb().brandAsset;
  if (!asset || !asset.driveFileId) {
    return res.status(400).json({ error: 'No Drive file ID recorded for reference image. Upload or sync to Drive first.' });
  }

  try {
    const verified = await driveService.verifyFileBytes(accessToken, asset.driveFileId);
    storage.updateBrandReferenceDriveId(asset.driveFileId, asset.driveUrl, asset.drivePath);
    res.json({
      success: true,
      driveFileId: asset.driveFileId,
      verifiedBytes: verified.byteLength,
      isRetrievable: true,
      message: `Verified retrievability: Successfully retrieved ${verified.byteLength} bytes from Google Drive for ${asset.drivePath}.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Drive file verification failed' });
  }
});

// 5. Videos & Scenes
app.get('/api/videos', (req, res) => {
  res.json({ videos: storage.getVideos() });
});

app.get('/api/videos/:id', (req, res) => {
  const video = storage.getVideo(req.params.id);
  if (!video) return res.status(404).json({ error: 'Video not found' });
  res.json({ video });
});

app.post('/api/videos/:id/select', (req, res) => {
  const video = storage.getVideo(req.params.id);
  if (!video) return res.status(404).json({ error: 'Video not found' });
  storage.setSelectedVideo(req.params.id);
  res.json({ success: true, selectedVideoId: req.params.id });
});

// 6. Manifest inspection
app.get('/api/videos/:id/manifest', (req, res) => {
  const manifest = storage.getManifest(req.params.id);
  res.json({ manifest });
});

// 7. Notion Endpoints
app.post('/api/notion/connect', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token is required' });

  notionService.setToken(token);
  const result = await notionService.testConnection();
  if (result.success) {
    res.json({ success: true, result });
  } else {
    res.status(400).json({ success: false, error: result.error });
  }
});

app.post('/api/notion/disconnect', (req, res) => {
  notionService.clearToken();
  res.json({ success: true });
});

app.get('/api/notion/databases', async (req, res) => {
  try {
    const dbs = await notionService.listDatabases();
    res.json({ databases: dbs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notion/import', async (req, res) => {
  try {
    const { databaseId, fieldMapping } = req.body;
    if (!databaseId) return res.status(400).json({ error: 'databaseId is required' });

    const result = await notionService.importFromDatabase(databaseId, fieldMapping || {
      titleField: 'Title',
      scenePromptField: 'Scene Prompt',
      sceneNumberField: 'Scene Number',
      statusField: 'Status',
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Provider Capability
app.get('/api/provider/status', (req, res) => {
  res.json(imageProvider.getCapabilities());
});

// 9. Job Queue Operations
app.post('/api/jobs/start', async (req, res) => {
  try {
    const { videoId } = req.body;
    const targetVideoId = videoId || storage.getDb().selectedVideoId;
    if (!targetVideoId) {
      return res.status(400).json({ error: 'No video selected. Please import and select a video from Notion first.' });
    }
    const accessToken = getBearerToken(req);

    await jobRunner.startJob(targetVideoId, accessToken);
    res.json({ success: true, activeJob: storage.getActiveJob() });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/jobs/pause', (req, res) => {
  jobRunner.pauseJob();
  res.json({ success: true, activeJob: storage.getActiveJob() });
});

app.post('/api/jobs/resume', (req, res) => {
  try {
    const accessToken = getBearerToken(req);
    jobRunner.resumeJob(accessToken);
    res.json({ success: true, activeJob: storage.getActiveJob() });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/jobs/stop', (req, res) => {
  jobRunner.stopJob();
  res.json({ success: true, activeJob: storage.getActiveJob() });
});

app.post('/api/jobs/retry-scene', async (req, res) => {
  try {
    const { videoId, sceneId } = req.body;
    if (!videoId || !sceneId) return res.status(400).json({ error: 'videoId and sceneId required' });
    const accessToken = getBearerToken(req);
    const updatedScene = await jobRunner.retryScene(videoId, sceneId, accessToken);
    res.json({ success: true, scene: updatedScene });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/jobs/regenerate-scene', async (req, res) => {
  try {
    const { videoId, sceneId, confirmed } = req.body;
    if (!confirmed) {
      return res.status(400).json({ error: 'Explicit user confirmation required to regenerate completed scene.' });
    }
    const accessToken = getBearerToken(req);
    const updatedScene = await jobRunner.regenerateScene(videoId, sceneId, accessToken);
    res.json({ success: true, scene: updatedScene });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Audit Logs
app.get('/api/logs', (req, res) => {
  res.json({ logs: storage.getDb().logs });
});

// 11. Static Scene Assets
app.get('/api/assets/scenes/:filename', (req, res) => {
  const filename = req.params.filename;
  const bytes = storage.getSceneImageBytes(filename);
  if (!bytes) {
    return res.status(404).send('Scene image not found');
  }
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(bytes);
});

// 12. ZIP Export for completed video scenes
app.get('/api/export/zip/:videoId', async (req, res) => {
  const videoId = req.params.videoId;
  const video = storage.getVideo(videoId);
  if (!video) return res.status(404).json({ error: 'Video not found' });

  const zip = new JSZip();
  const manifest = storage.getManifest(videoId);
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  // Add scenes
  const scenesFolder = zip.folder('Scenes');
  for (const scene of video.scenes) {
    if (scene.outputFilename) {
      const bytes = storage.getSceneImageBytes(scene.outputFilename);
      if (bytes && scenesFolder) {
        scenesFolder.file(scene.outputFilename, bytes);
      }
    }
  }

  // Include brand reference if present
  const brandData = storage.getBrandReferenceBytes();
  if (brandData) {
    const brandFolder = zip.folder('Brand');
    if (brandFolder) {
      brandFolder.file('official-reference.png', brandData.buffer);
    }
  }

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const sanitizedTitle = video.title.replace(/[^a-zA-Z0-9_-]/g, '_');
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${videoId}_${sanitizedTitle}_Assets.zip"`);
  res.send(zipBuffer);
});

// ----------------------------------------------------
// VITE DEV SERVER / PRODUCTION STATIC SERVING
// ----------------------------------------------------
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ninety Sense Visual Production OS running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
