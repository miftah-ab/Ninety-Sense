import { getAccessToken } from './firebaseAuth';

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(url, { ...options, headers });
}

export const api = {
  async getStatus() {
    const res = await fetchWithAuth('/api/status');
    return res.json();
  },

  async getVideos() {
    const res = await fetchWithAuth('/api/videos');
    return res.json();
  },

  async getVideo(id: string) {
    const res = await fetchWithAuth(`/api/videos/${id}`);
    return res.json();
  },

  async selectVideo(id: string) {
    const res = await fetchWithAuth(`/api/videos/${id}/select`, { method: 'POST' });
    return res.json();
  },

  async getManifest(id: string) {
    const res = await fetchWithAuth(`/api/videos/${id}/manifest`);
    return res.json();
  },

  async getReference() {
    const res = await fetchWithAuth('/api/brand/reference');
    return res.json();
  },

  async uploadReference(imageBase64: string, filename: string, mimeType: string) {
    const res = await fetchWithAuth('/api/brand/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, filename, mimeType }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Upload failed (HTTP ${res.status})`);
    }
    return res.json();
  },

  async syncDriveReference() {
    const res = await fetchWithAuth('/api/brand/sync-drive', { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Sync to Drive failed (HTTP ${res.status})`);
    }
    return res.json();
  },

  async verifyDriveReference() {
    const res = await fetchWithAuth('/api/brand/verify-drive', { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Verification failed (HTTP ${res.status})`);
    }
    return res.json();
  },

  async connectNotion(token: string) {
    const res = await fetchWithAuth('/api/notion/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to connect to Notion');
    }
    return data;
  },

  async disconnectNotion() {
    const res = await fetchWithAuth('/api/notion/disconnect', { method: 'POST' });
    return res.json();
  },

  async getNotionDatabases() {
    const res = await fetchWithAuth('/api/notion/databases');
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to load databases');
    }
    return res.json();
  },

  async importNotion(databaseId: string, fieldMapping?: any) {
    const res = await fetchWithAuth('/api/notion/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ databaseId, fieldMapping }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to import Notion database');
    }
    return data;
  },

  async getProviderStatus() {
    const res = await fetchWithAuth('/api/provider/status');
    return res.json();
  },

  async startJob(videoId: string) {
    const res = await fetchWithAuth('/api/jobs/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to start job');
    }
    return data;
  },

  async pauseJob() {
    const res = await fetchWithAuth('/api/jobs/pause', { method: 'POST' });
    return res.json();
  },

  async resumeJob() {
    const res = await fetchWithAuth('/api/jobs/resume', { method: 'POST' });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to resume job');
    }
    return data;
  },

  async stopJob() {
    const res = await fetchWithAuth('/api/jobs/stop', { method: 'POST' });
    return res.json();
  },

  async retryScene(videoId: string, sceneId: string) {
    const res = await fetchWithAuth('/api/jobs/retry-scene', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId, sceneId }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Retry failed');
    }
    return data;
  },

  async regenerateScene(videoId: string, sceneId: string, confirmed: boolean) {
    const res = await fetchWithAuth('/api/jobs/regenerate-scene', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId, sceneId, confirmed }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Regeneration failed');
    }
    return data;
  },

  async getLogs() {
    const res = await fetchWithAuth('/api/logs');
    return res.json();
  },
};
