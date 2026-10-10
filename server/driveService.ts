import { storage } from './storage.js';

export interface DriveFolderInfo {
  id: string;
  name: string;
}

export interface DriveUploadResult {
  fileId: string;
  fileName: string;
  webViewLink?: string;
  byteLength: number;
}

export class DriveService {
  private async fetchDrive(
    url: string,
    accessToken: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${accessToken}`);
    return fetch(url, { ...options, headers });
  }

  // Find or create folder by name under an optional parent
  public async getOrCreateFolder(
    accessToken: string,
    folderName: string,
    parentId?: string
  ): Promise<string> {
    let q = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName.replace(/'/g, "\\'")}' and trashed = false`;
    if (parentId) {
      q += ` and '${parentId}' in parents`;
    }

    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`;
    const searchRes = await this.fetchDrive(searchUrl, accessToken);

    if (!searchRes.ok) {
      const err = await searchRes.text();
      throw new Error(`Failed to query Drive folder "${folderName}": ${err}`);
    }

    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }

    // Create folder
    const createRes = await this.fetchDrive('https://www.googleapis.com/drive/v3/files', accessToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : undefined,
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Failed to create Drive folder "${folderName}": ${err}`);
    }

    const folder = await createRes.json();
    return folder.id;
  }

  // Ensure standard hierarchy: Ninety Sense -> (Brand, Videos)
  public async ensureProductionHierarchy(accessToken: string): Promise<{
    rootId: string;
    brandId: string;
    videosId: string;
  }> {
    const rootId = await this.getOrCreateFolder(accessToken, 'Ninety Sense');
    const brandId = await this.getOrCreateFolder(accessToken, 'Brand', rootId);
    const videosId = await this.getOrCreateFolder(accessToken, 'Videos', rootId);

    const db = storage.getDb();
    db.driveConfig.rootFolderId = rootId;
    db.driveConfig.brandFolderId = brandId;
    db.driveConfig.videosFolderId = videosId;
    db.driveConfig.isConnected = true;
    storage.save(db);

    return { rootId, brandId, videosId };
  }

  // Ensure video hierarchy: Ninety Sense/Videos/<Video_Name>/ -> (Scenes, Manifest, Exports)
  public async ensureVideoFolders(
    accessToken: string,
    videosFolderId: string,
    videoFolderName: string
  ): Promise<{
    videoFolderId: string;
    scenesFolderId: string;
    manifestFolderId: string;
    exportsFolderId: string;
  }> {
    const videoFolderId = await this.getOrCreateFolder(accessToken, videoFolderName, videosFolderId);
    const scenesFolderId = await this.getOrCreateFolder(accessToken, 'Scenes', videoFolderId);
    const manifestFolderId = await this.getOrCreateFolder(accessToken, 'Manifest', videoFolderId);
    const exportsFolderId = await this.getOrCreateFolder(accessToken, 'Exports', videoFolderId);

    return { videoFolderId, scenesFolderId, manifestFolderId, exportsFolderId };
  }

  // Upload a file to Drive folder using multipart upload
  public async uploadFile(
    accessToken: string,
    fileName: string,
    mimeType: string,
    buffer: Buffer,
    parentFolderId: string
  ): Promise<DriveUploadResult> {
    const boundary = '-------NinetySenseBoundary' + Math.random().toString(36).substring(2);
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: fileName,
      parents: [parentFolderId],
    };

    const multipartRequestBody = Buffer.concat([
      Buffer.from(
        delimiter +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(metadata) +
          delimiter +
          `Content-Type: ${mimeType}\r\n\r\n`
      ),
      buffer,
      Buffer.from(closeDelimiter),
    ]);

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,size',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Content-Length': String(multipartRequestBody.length),
        },
        body: multipartRequestBody,
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      throw new Error(`Drive upload failed for ${fileName}: ${err}`);
    }

    const data = await uploadRes.json();
    return {
      fileId: data.id,
      fileName: data.name,
      webViewLink: data.webViewLink,
      byteLength: buffer.length,
    };
  }

  // Verify file can be retrieved and check byte integrity
  public async verifyFileBytes(accessToken: string, fileId: string): Promise<{ success: boolean; byteLength: number }> {
    const res = await this.fetchDrive(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, accessToken);
    if (!res.ok) {
      throw new Error(`Failed to download and verify Drive file ${fileId}: HTTP ${res.status}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    return {
      success: true,
      byteLength: arrayBuffer.byteLength,
    };
  }
}

export const driveService = new DriveService();
