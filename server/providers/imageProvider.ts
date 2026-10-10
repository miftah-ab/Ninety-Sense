import { GoogleGenAI } from '@google/genai';
import { storage } from '../storage.js';

export interface GenerateSceneOptions {
  prompt: string;
  sceneNumber: number;
  characterConsistencyNotes?: string;
  referenceImageBytes: Buffer;
  referenceMimeType: string;
  aspectRatio?: '16:9' | '1:1' | '9:16';
}

export interface GenerationResult {
  success: boolean;
  imageBase64?: string;
  mimeType?: string;
  modelName: string;
  referenceAttached: boolean;
  referenceByteLength: number;
  error?: string;
  isBillingOrQuotaError?: boolean;
  quotaDetails?: string;
}

export interface ProviderCapabilityReport {
  providerName: string;
  selectedModel: string;
  hasApiKey: boolean;
  referenceImageSupported: boolean;
  supportedAspectRatios: string[];
  costPerImage: string;
  freeTierStatus: string;
  isBlocked: boolean;
  blockerReason?: string;
}

export class GeminiImageProvider {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
  }

  public getCapabilities(): ProviderCapabilityReport {
    const hasKey = Boolean(this.apiKey && this.apiKey !== 'MY_GEMINI_API_KEY');

    return {
      providerName: 'Google GenAI SDK (@google/genai)',
      selectedModel: 'gemini-3.1-flash-lite-image',
      hasApiKey: hasKey,
      referenceImageSupported: true,
      supportedAspectRatios: ['16:9', '1:1', '9:16', '3:4', '4:3'],
      costPerImage: '$0.00 (Free Tier eligibility checked per project; paid tier required if project lacks free image credits)',
      freeTierStatus: hasKey
        ? 'Active Environment Key detected. Image models (gemini-3.1-flash-lite-image / nano-banana) depend on account quota tier.'
        : 'Missing or placeholder GEMINI_API_KEY in environment.',
      isBlocked: !hasKey,
      blockerReason: !hasKey
        ? 'GEMINI_API_KEY is not configured in environment.'
        : undefined,
    };
  }

  public async generateSceneImage(options: GenerateSceneOptions): Promise<GenerationResult> {
    const { prompt, sceneNumber, characterConsistencyNotes, referenceImageBytes, referenceMimeType, aspectRatio = '16:9' } = options;

    // 1. Mandatory verification of reference image bytes
    if (!referenceImageBytes || referenceImageBytes.length === 0) {
      const err = 'Mandatory official reference image is missing or empty. Request stopped before generation.';
      storage.log({
        level: 'error',
        category: 'generation',
        message: err,
        details: { sceneNumber },
      });
      return {
        success: false,
        modelName: 'gemini-3.1-flash-lite-image',
        referenceAttached: false,
        referenceByteLength: 0,
        error: err,
      };
    }

    const referenceBase64 = referenceImageBytes.toString('base64');
    const referenceByteLength = referenceImageBytes.length;

    // Build the complete prompt preserving the exact approved scene prompt while adding character/cube consistency guidance
    const fullPrompt = [
      `[SCENE CONTEXT - NINETY SENSE VISUAL PRODUCTION OS]`,
      `Exact Approved Scene Prompt: "${prompt}"`,
      characterConsistencyNotes ? `Character & Cube Consistency Instructions: ${characterConsistencyNotes}` : '',
      `MANDATORY VISUAL RULES:`,
      `- Authority: The attached reference image contains the official Ninety Figure and open-cube environment.`,
      `- Preserve the exact Ninety Figure silhouette, proportions, and tactile editorial illustration styling.`,
      `- Preserve the open-cube architectural framing and spatial tension.`,
      `- Visual Palette: Rooted in Warm Ivory (#F4F0E6), Dark Ink (#1C1B19), and Muted Vermilion (#A94336) accents.`,
      `- Prohibited: Photorealism, neon aesthetics, 3D CGI gloss, cartoon Pixar look, generic stick figures.`,
      `- Output format: High-resolution clean illustration in ${aspectRatio} aspect ratio.`,
    ].filter(Boolean).join('\n\n');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      const err = 'GEMINI_API_KEY is not configured on server. Image generation blocked to prevent unverified charges.';
      storage.log({
        level: 'error',
        category: 'generation',
        message: err,
        details: { sceneNumber, referenceAttached: true, byteLength: referenceByteLength },
      });
      return {
        success: false,
        modelName: 'gemini-3.1-flash-lite-image',
        referenceAttached: true,
        referenceByteLength,
        error: err,
        isBillingOrQuotaError: true,
        quotaDetails: 'Configure a valid GEMINI_API_KEY in the Secrets panel.',
      };
    }

    try {
      storage.log({
        level: 'info',
        category: 'generation',
        message: `Calling model 'gemini-3.1-flash-lite-image' for Scene ${sceneNumber}. Mandatory reference attached (${(referenceByteLength / 1024).toFixed(1)} KB).`,
        details: { sceneNumber, referenceByteLength, aspectRatio },
      });

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      // Construct request payload with inlineData reference image and text
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: referenceBase64,
                mimeType: referenceMimeType || 'image/png',
              },
            },
            {
              text: fullPrompt,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio === '16:9' ? '16:9' : aspectRatio === '9:16' ? '9:16' : '1:1',
          },
        },
      });

      // Find the generated image part
      let returnedImageBase64: string | undefined;
      let returnedMimeType: string = 'image/png';
      let returnedText: string | undefined;

      const candidates = response.candidates;
      if (candidates && candidates.length > 0 && candidates[0].content?.parts) {
        for (const part of candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            returnedImageBase64 = part.inlineData.data;
            if (part.inlineData.mimeType) {
              returnedMimeType = part.inlineData.mimeType;
            }
          } else if (part.text) {
            returnedText = part.text;
          }
        }
      }

      if (!returnedImageBase64) {
        const errorMsg = returnedText
          ? `Model responded with text instead of an image: "${returnedText.slice(0, 250)}"`
          : 'Model response did not contain inline image data.';

        storage.log({
          level: 'error',
          category: 'generation',
          message: errorMsg,
          details: { sceneNumber, returnedText },
        });

        return {
          success: false,
          modelName: 'gemini-3.1-flash-lite-image',
          referenceAttached: true,
          referenceByteLength,
          error: errorMsg,
        };
      }

      storage.log({
        level: 'success',
        category: 'generation',
        message: `Successfully received generated image for Scene ${sceneNumber} from 'gemini-3.1-flash-lite-image'.`,
        details: { sceneNumber, returnedMimeType },
      });

      return {
        success: true,
        imageBase64: returnedImageBase64,
        mimeType: returnedMimeType,
        modelName: 'gemini-3.1-flash-lite-image',
        referenceAttached: true,
        referenceByteLength,
      };
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const isQuotaOrBilling =
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('429') ||
        errMsg.includes('billing') ||
        errMsg.includes('Quota exceeded') ||
        errMsg.includes('permission');

      storage.log({
        level: 'error',
        category: 'generation',
        message: `Generation failed for Scene ${sceneNumber}: ${errMsg}`,
        details: { sceneNumber, isQuotaOrBilling, referenceAttached: true },
      });

      return {
        success: false,
        modelName: 'gemini-3.1-flash-lite-image',
        referenceAttached: true,
        referenceByteLength,
        error: errMsg,
        isBillingOrQuotaError: isQuotaOrBilling,
        quotaDetails: isQuotaOrBilling
          ? 'Quota limit or billing tier reached for image generation. System safely paused to prevent unverified charges.'
          : undefined,
      };
    }
  }
}

export const imageProvider = new GeminiImageProvider();
