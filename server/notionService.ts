import fs from 'fs';
import path from 'path';
import { storage, computeHash } from './storage.js';
import { Video, Scene } from './types.js';

export interface NotionPropertyInfo {
  id: string;
  name: string;
  type: string;
}

export interface NotionDatabaseInfo {
  id: string;
  title: string;
  properties: Record<string, NotionPropertyInfo>;
}

export interface NotionTestResult {
  success: boolean;
  botName?: string;
  workspaceName?: string;
  error?: string;
  isFreeAccountSupported?: boolean;
}

// Extract 32-character Notion UUID from a string or URL
export function extractNotionId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  // If it's a URL like https://www.notion.so/workspace/My-Database-7a3b4c...?v=...
  const urlMatch = trimmed.match(/[a-f0-9]{32}/i);
  if (urlMatch) {
    const raw = urlMatch[0];
    // Return standard 8-4-4-4-12 UUID format
    return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
  }
  const dashedMatch = trimmed.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
  if (dashedMatch) {
    return dashedMatch[0];
  }
  return trimmed;
}

const TOKEN_FILE = path.join(process.cwd(), 'data', '.notion_token');

class NotionService {
  private token: string | null = null;

  constructor() {
    if (process.env.NOTION_API_KEY) {
      this.token = this.sanitizeToken(process.env.NOTION_API_KEY);
    } else if (fs.existsSync(TOKEN_FILE)) {
      try {
        const saved = fs.readFileSync(TOKEN_FILE, 'utf-8').trim();
        if (saved) this.token = saved;
      } catch (e) {
        // ignore
      }
    }
  }

  public sanitizeToken(input: string): string {
    if (!input) return '';
    return input
      .trim()
      .replace(/^['"`]/, '')
      .replace(/['"`]$/, '')
      .replace(/^Bearer\s+/i, '')
      .trim();
  }

  public setToken(token: string): void {
    const clean = this.sanitizeToken(token);
    this.token = clean;
    try {
      fs.writeFileSync(TOKEN_FILE, clean, 'utf-8');
    } catch (e) {
      console.error('Failed to persist token file:', e);
    }
    const db = storage.getDb();
    db.notionConfig.hasToken = Boolean(this.token);
    storage.save(db);
  }

  public clearToken(): void {
    this.token = null;
    try {
      if (fs.existsSync(TOKEN_FILE)) fs.unlinkSync(TOKEN_FILE);
    } catch (e) {
      // ignore
    }
    const db = storage.getDb();
    db.notionConfig.hasToken = false;
    db.notionConfig.workspaceName = undefined;
    storage.save(db);
    storage.log({
      level: 'info',
      category: 'notion',
      message: 'Notion integration disconnected and credentials cleared.',
    });
  }

  public hasToken(): boolean {
    return Boolean(this.token);
  }

  public async testConnection(): Promise<NotionTestResult> {
    if (!this.token) {
      return { success: false, error: 'No Notion integration token provided.' };
    }

    // Helpful pre-check for free Notion users
    if (!this.token.startsWith('ntn_') && !this.token.startsWith('secret_')) {
      return {
        success: false,
        error:
          "Invalid token format. Notion Internal Integration Secrets start with 'ntn_' (modern) or 'secret_' (legacy). Free Notion users can generate one at notion.so/profile/integrations.",
      };
    }

    try {
      const res = await fetch('https://api.notion.com/v1/users/me', {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Notion-Version': '2022-06-28',
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        let msg = errorData.message || `Notion API error (HTTP ${res.status})`;
        if (res.status === 401) {
          msg =
            "Notion API token is invalid or expired. Free users: ensure you copied the 'Internal Integration Secret' from https://www.notion.so/profile/integrations.";
        }
        storage.log({
          level: 'error',
          category: 'notion',
          message: `Notion connection test failed: ${msg}`,
        });
        return { success: false, error: msg };
      }

      const user = await res.json();
      const botName = user.name || 'Notion Integration';
      const workspaceName = user.bot?.workspace_name || 'Ninety Sense Workspace';

      const db = storage.getDb();
      db.notionConfig.hasToken = true;
      db.notionConfig.connectedAt = new Date().toISOString();
      db.notionConfig.workspaceName = workspaceName;
      storage.save(db);

      storage.log({
        level: 'success',
        category: 'notion',
        message: `Successfully connected to Notion: ${workspaceName} (${botName})`,
      });

      return {
        success: true,
        botName,
        workspaceName,
        isFreeAccountSupported: true,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error connecting to Notion' };
    }
  }

  public async listDatabases(): Promise<NotionDatabaseInfo[]> {
    if (!this.token) return [];

    try {
      const res = await fetch('https://api.notion.com/v1/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filter: {
            value: 'database',
            property: 'object',
          },
          page_size: 50,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const results: NotionDatabaseInfo[] = [];

      for (const item of data.results || []) {
        const title = item.title?.[0]?.plain_text || item.title?.[0]?.text?.content || 'Untitled Database';
        const props: Record<string, NotionPropertyInfo> = {};
        for (const [propName, propDef] of Object.entries<any>(item.properties || {})) {
          props[propName] = {
            id: propDef.id,
            name: propName,
            type: propDef.type,
          };
        }
        results.push({
          id: item.id,
          title,
          properties: props,
        });
      }

      return results;
    } catch (err: any) {
      storage.log({
        level: 'error',
        category: 'notion',
        message: `Failed to search Notion databases: ${err.message}`,
      });
      return [];
    }
  }

  // Direct fetch by Database ID or URL (critical for free users when search has not indexed yet)
  public async getDatabase(databaseIdOrUrl: string): Promise<NotionDatabaseInfo> {
    if (!this.token) {
      throw new Error('Notion token is missing. Please connect Notion in Integrations.');
    }

    const cleanId = extractNotionId(databaseIdOrUrl);
    if (!cleanId) {
      throw new Error('Please provide a valid Notion Database ID or URL.');
    }

    const res = await fetch(`https://api.notion.com/v1/databases/${cleanId}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Notion-Version': '2022-06-28',
      },
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      let msg = errJson.message || `HTTP ${res.status}`;
      if (res.status === 404) {
        msg =
          "Database not found. Make sure you shared the database with your integration in Notion: Open your database page in Notion > click '...' (top right) > Connections > Add your Ninety Sense integration.";
      }
      throw new Error(msg);
    }

    const item = await res.json();
    const title = item.title?.[0]?.plain_text || item.title?.[0]?.text?.content || 'Untitled Database';
    const props: Record<string, NotionPropertyInfo> = {};
    for (const [propName, propDef] of Object.entries<any>(item.properties || {})) {
      props[propName] = {
        id: propDef.id,
        name: propName,
        type: propDef.type,
      };
    }

    return {
      id: item.id,
      title,
      properties: props,
    };
  }

  public async importFromDatabase(
    databaseIdOrUrl: string,
    fieldMapping: {
      titleField: string;
      scenePromptField: string;
      sceneNumberField: string;
      statusField: string;
    }
  ): Promise<{ importedCount: number; videos: Video[]; errors: string[] }> {
    if (!this.token) {
      throw new Error('Notion token is missing.');
    }

    const databaseId = extractNotionId(databaseIdOrUrl);
    const errors: string[] = [];
    const videos: Video[] = [];

    try {
      const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ page_size: 100 }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        let msg = errJson.message || `Query failed: HTTP ${res.status}`;
        if (res.status === 404) {
          msg =
            "Database not found. In Notion, open your database > click '...' in top right > Connections > Add your integration.";
        }
        throw new Error(msg);
      }

      const data = await res.json();
      const rows = data.results || [];

      if (rows.length === 0) {
        return {
          importedCount: 0,
          videos: [],
          errors: ['Database returned 0 rows. Add rows in your Notion database and try syncing again.'],
        };
      }

      // Group rows by Video Title
      const videoMap = new Map<string, { title: string; synopsis: string; pageId: string; scenes: Scene[] }>();

      for (let i = 0; i < rows.length; i++) {
        const page = rows[i];
        const props = page.properties;

        // Extract title with smart auto-detection
        let titleVal = '';
        let titleProp = fieldMapping?.titleField ? props[fieldMapping.titleField] : undefined;
        if (!titleProp) {
          const titleKey = Object.keys(props).find((k) =>
            /^(title|name|video|episode|task|item)$/i.test(k.trim()) || props[k]?.type === 'title'
          );
          if (titleKey) titleProp = props[titleKey];
        }
        if (!titleProp) {
          const titleKey = Object.keys(props).find((k) => props[k]?.type === 'title');
          if (titleKey) titleProp = props[titleKey];
        }

        if (titleProp?.title && titleProp.title.length > 0) {
          titleVal = titleProp.title.map((t: any) => t.plain_text).join('');
        } else if (titleProp?.rich_text) {
          titleVal = titleProp.rich_text.map((t: any) => t.plain_text).join('');
        }
        if (!titleVal.trim()) titleVal = 'Untitled Video';

        // Extract prompt with smart auto-detection
        let promptVal = '';
        let promptProp = fieldMapping?.scenePromptField ? props[fieldMapping.scenePromptField] : undefined;
        if (!promptProp) {
          const promptKey = Object.keys(props).find((k) =>
            /(prompt|scene\s*prompt|approved\s*prompt|visual|script|description|text|content)/i.test(k.trim())
          );
          if (promptKey) promptProp = props[promptKey];
        }
        if (!promptProp) {
          const richTextKey = Object.keys(props).find((k) => props[k]?.type === 'rich_text');
          if (richTextKey) promptProp = props[richTextKey];
        }

        if (promptProp?.rich_text) {
          promptVal = promptProp.rich_text.map((t: any) => t.plain_text).join('').trim();
        } else if (promptProp?.title) {
          promptVal = promptProp.title.map((t: any) => t.plain_text).join('').trim();
        }

        // Extract scene number with smart auto-detection
        let sceneNum = i + 1;
        let sceneNumProp = fieldMapping?.sceneNumberField ? props[fieldMapping.sceneNumberField] : undefined;
        if (!sceneNumProp) {
          const numKey = Object.keys(props).find((k) =>
            /(scene\s*#|scene\s*number|scene|order|seq|number|#)/i.test(k.trim())
          );
          if (numKey) sceneNumProp = props[numKey];
        }
        if (sceneNumProp?.number !== undefined && sceneNumProp.number !== null) {
          sceneNum = sceneNumProp.number;
        }

        if (promptVal) {
          if (!videoMap.has(titleVal)) {
            videoMap.set(titleVal, {
              title: titleVal,
              synopsis: 'Imported from Notion workspace database.',
              pageId: page.id,
              scenes: [],
            });
          }

          const vidGroup = videoMap.get(titleVal)!;
          const sceneId = `S${String(sceneNum).padStart(3, '0')}`;
          vidGroup.scenes.push({
            id: `${vidGroup.pageId.slice(0, 6)}-${sceneId}`,
            sceneNumber: sceneNum,
            approvedPrompt: promptVal,
            promptHash: computeHash(promptVal),
            characterConsistencyNotes: 'Imported from Notion. Mandatory Ninety Figure and open cube guidelines apply.',
            status: 'pending',
            referenceAttached: false,
            aspectRatio: '16:9',
            retryCount: 0,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // Convert videoMap to Video array
      let index = 1;
      for (const [_, item] of videoMap.entries()) {
        const vidId = `V${String(index).padStart(2, '0')}`;
        item.scenes.sort((a, b) => a.sceneNumber - b.sceneNumber);

        const newVideo: Video = {
          id: vidId,
          title: item.title,
          synopsis: item.synopsis,
          notionPageId: item.pageId,
          status: 'Script Approved',
          createdAt: new Date().toISOString(),
          scenes: item.scenes,
        };
        videos.push(newVideo);
        storage.updateVideo(newVideo);
        index++;
      }

      if (videos.length > 0 && !storage.getDb().selectedVideoId) {
        storage.setSelectedVideo(videos[0].id);
      }

      storage.log({
        level: 'success',
        category: 'notion',
        message: `Imported ${videos.length} video(s) and ${videos.reduce((acc, v) => acc + v.scenes.length, 0)} approved scene prompt(s) from Notion database ${databaseId}.`,
      });

      return { importedCount: videos.length, videos, errors };
    } catch (err: any) {
      storage.log({
        level: 'error',
        category: 'notion',
        message: `Error importing from Notion database: ${err.message}`,
      });
      throw err;
    }
  }
}

export const notionService = new NotionService();
