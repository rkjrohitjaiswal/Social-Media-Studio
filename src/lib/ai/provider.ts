export interface GeneratedImage {
  bytes: Buffer;
  mimeType: string;
  width?: number;
  height?: number;
  providerRequestId?: string;
  model: string;
}

export type ProviderErrorCode =
  | "RATE_LIMIT"
  | "TIMEOUT"
  | "NETWORK"
  | "INVALID_REQUEST"
  | "CONTENT_POLICY"
  | "AUTHENTICATION"
  | "MODEL_UNAVAILABLE"
  | "UNKNOWN";

export class ProviderError extends Error {
  constructor(
    public code: ProviderErrorCode,
    message: string,
    public rawError?: unknown
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export interface GenerationParams {
  referenceImageBytes: Buffer;
  inputImageBytes: Buffer;
  prompt: string;
  quality?: string;
  size?: string;
  outputFormat?: string;
}

export interface AIImageProvider {
  generateFromReferenceAndInput(params: GenerationParams): Promise<GeneratedImage>;
}

// Magic Byte MIME Inspector for payload verification
export function detectImageMimeType(buffer: Buffer): string {
  if (buffer.length >= 4) {
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      return "image/png";
    }
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return "image/jpeg";
    }
    if (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46
    ) {
      return "image/webp";
    }
  }
  return "image/png";
}

export class OpenAIImageProvider implements AIImageProvider {
  private apiKey: string | undefined;
  private model: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
  }

  async generateFromReferenceAndInput(params: GenerationParams): Promise<GeneratedImage> {
    if (!this.apiKey || this.apiKey === "your-openai-api-key") {
      // Return simulated binary payload for development/mocking environment without real credentials
      const dummyBuffer = Buffer.from("Simulated generated luxury media asset payload");
      return {
        bytes: dummyBuffer,
        mimeType: detectImageMimeType(dummyBuffer),
        width: 1024,
        height: 1536,
        providerRequestId: `req-sim-${Date.now()}`,
        model: this.model,
      };
    }

    try {
      const response = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          prompt: params.prompt,
          n: 1,
          size: params.size || process.env.OPENAI_IMAGE_SIZE || "1024x1536",
          quality: params.quality || process.env.OPENAI_IMAGE_QUALITY || "high",
          response_format: "b64_json",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.normalizeAndThrowError(response.status, errorText);
      }

      const resJson = await response.json();
      const b64Data = resJson.data?.[0]?.b64_json;
      if (!b64Data) {
        throw new ProviderError("INVALID_REQUEST", "Malformed OpenAI response: missing image payload");
      }

      const imageBuffer = Buffer.from(b64Data, "base64");
      const detectedMime = detectImageMimeType(imageBuffer);

      return {
        bytes: imageBuffer,
        mimeType: detectedMime,
        width: 1024,
        height: 1536,
        providerRequestId: resJson.created ? `req-${resJson.created}` : `req-${Date.now()}`,
        model: this.model,
      };
    } catch (err: unknown) {
      if (err instanceof ProviderError) throw err;
      const msg = err instanceof Error ? err.message : "Unknown error connecting to OpenAI";
      throw new ProviderError("NETWORK", msg, err);
    }
  }

  private normalizeAndThrowError(status: number, errorText: string): never {
    let code: ProviderErrorCode = "UNKNOWN";
    if (status === 429) code = "RATE_LIMIT";
    else if (status === 401 || status === 403) code = "AUTHENTICATION";
    else if (status === 400 && errorText.includes("safety")) code = "CONTENT_POLICY";
    else if (status === 400) code = "INVALID_REQUEST";
    else if (status === 503 || status === 504) code = "MODEL_UNAVAILABLE";
    else if (status >= 500) code = "NETWORK";

    throw new ProviderError(code, `OpenAI API returned error ${status}: ${errorText}`);
  }
}
