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
}

class NotionService {
  private token: string | null = null;

  constructor() {
    this.token = process.env.NOTION_API_KEY || null;
  }

  public setToken(token: string): void {
    this.token = token.trim();
    const db = storage.getDb();
    db.notionConfig.hasToken = Boolean(this.token);
    storage.save(db);
  }

  public clearToken(): void {
    this.token = null;
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

    try {
      const res = await fetch('https://api.notion.com/v1/users/me', {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Notion-Version': '2022-06-28',
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const msg = errorData.message || `Notion API error (HTTP ${res.status})`;
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

  public async importFromDatabase(
    databaseId: string,
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
        throw new Error(errJson.message || `Query failed: HTTP ${res.status}`);
      }

      const data = await res.json();
      const rows = data.results || [];

      // We group rows by Video Title or process rows as videos
      // Check if rows represent videos with page blocks or individual scenes
      const videoMap = new Map<string, { title: string; synopsis: string; pageId: string; scenes: Scene[] }>();

      for (let i = 0; i < rows.length; i++) {
        const page = rows[i];
        const props = page.properties;

        // Extract title
        let titleVal = 'Untitled Video';
        const titleProp = props[fieldMapping.titleField];
        if (titleProp?.title && titleProp.title.length > 0) {
          titleVal = titleProp.title.map((t: any) => t.plain_text).join('');
        } else if (titleProp?.rich_text) {
          titleVal = titleProp.rich_text.map((t: any) => t.plain_text).join('');
        }

        // Extract prompt
        let promptVal = '';
        const promptProp = props[fieldMapping.scenePromptField];
        if (promptProp?.rich_text) {
          promptVal = promptProp.rich_text.map((t: any) => t.plain_text).join('').trim();
        } else if (promptProp?.title) {
          promptVal = promptProp.title.map((t: any) => t.plain_text).join('').trim();
        }

        // Extract scene number
        let sceneNum = i + 1;
        const sceneNumProp = props[fieldMapping.sceneNumberField];
        if (sceneNumProp?.number !== undefined && sceneNumProp.number !== null) {
          sceneNum = sceneNumProp.number;
        }

        if (promptVal) {
          // If this row has a prompt, group under this video title
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
            characterConsistencyNotes: 'Imported from Notion. Apply mandatory Ninety Figure and open cube guidelines.',
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
        // Sort scenes by sceneNumber
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
