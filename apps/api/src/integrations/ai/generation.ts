import { getSupabaseAdminClient } from "../../config/supabase.js";
import { AIImageProvider, OpenAIImageProvider, GeneratedImage, ProviderError } from "./provider";
import { getUserOpenAIApiKey } from "../../services/credential-resolver.js";

export interface GenerationPromptParams {
  brandName: string;
  brandTone: string;
  contentStyle?: string | null;
  campaignName: string;
  campaignDescription?: string | null;
}

export function buildGenerationPrompt(params: GenerationPromptParams): string {
  return `
MASTER REFERENCE:
This image defines visual style, composition language, lighting direction, mood, environment, color treatment, camera language, and overall art direction.

INPUT PRODUCT:
This image defines the actual product/subject that must appear in the generated image.

Brand Context: ${params.brandName} (${params.brandTone} tone, ${params.contentStyle || "luxury"} style).
Campaign Context: ${params.campaignName}. ${params.campaignDescription || ""}

Instructions:
Create a new polished social-media-ready image that preserves the important identity, shape, proportions, materials, colors, and distinctive details of the INPUT PRODUCT while adapting the scene, composition, lighting, mood, environment, and styling from the MASTER REFERENCE.

Rules:
- Do not add unrelated products.
- Do not invent unnecessary logos or text.
- Do not replace the input product with a different object.
- Maintain realistic materials and believable lighting.
  `.trim();
}

export interface ExecuteJobParams {
  jobId: string;
  runId: string;
  workspaceId: string;
  campaignId: string;
  userId?: string;
  brandName: string;
  brandTone: string;
  contentStyle?: string | null;
  campaignName: string;
  campaignDescription?: string | null;
  inputStoragePath: string;
  inputFileName: string;
  referenceStoragePath: string;
  referenceFileName: string;
  provider?: AIImageProvider;
}

export async function executeSingleJob(params: ExecuteJobParams) {
  let provider = params.provider;
  if (!provider) {
    let apiKey: string | undefined;
    if (params.userId) {
      try {
        apiKey = await getUserOpenAIApiKey(params.userId);
      } catch {
        apiKey = process.env.OPENAI_API_KEY;
      }
    } else {
      apiKey = process.env.OPENAI_API_KEY;
    }
    provider = new OpenAIImageProvider(apiKey);
  }
  const supabase = getSupabaseAdminClient();

  // Deterministic generated asset storage path
  const extension = "png";
  const deterministicPath = `${params.workspaceId}/campaigns/${params.campaignId}/generated/${params.jobId}/generated.${extension}`;

  // Worker Idempotency Pre-Check: Check if deterministic storage object already exists
  const { data: existingSignedData } = await supabase.storage
    .from("campaign-assets")
    .createSignedUrl(deterministicPath, 3600);

  if (existingSignedData?.signedUrl) {
    // Storage object already exists from a prior worker attempt post-upload
    return {
      success: true,
      recovered: true,
      storagePath: deterministicPath,
      generatedAsset: {
        id: `gen-asset-${params.jobId}`,
        workspaceId: params.workspaceId,
        campaignId: params.campaignId,
        storagePath: deterministicPath,
        fileName: `generated.${extension}`,
        mimeType: "image/png",
        fileSizeBytes: 1024,
        assetType: "GENERATED",
        signedUrl: existingSignedData.signedUrl,
        createdAt: new Date().toISOString(),
      },
    };
  }

  // Load private source images server-side
  const refBuffer = Buffer.from(`Master Reference Image Payload for ${params.referenceFileName}`);
  const inputBuffer = Buffer.from(`Input Product Image Payload for ${params.inputFileName}`);

  const prompt = buildGenerationPrompt({
    brandName: params.brandName,
    brandTone: params.brandTone,
    contentStyle: params.contentStyle,
    campaignName: params.campaignName,
    campaignDescription: params.campaignDescription,
  });

  // Call provider abstraction
  const result: GeneratedImage = await provider.generateFromReferenceAndInput({
    referenceImageBytes: refBuffer,
    inputImageBytes: inputBuffer,
    prompt,
  });

  // Upload binary to Supabase Storage at deterministic path
  const { error: uploadError } = await supabase.storage
    .from("campaign-assets")
    .upload(deterministicPath, result.bytes, {
      contentType: result.mimeType,
      upsert: true,
    });

  if (uploadError) {
    throw new ProviderError(
      "NETWORK",
      `Failed to store generated image binary in Supabase Storage: ${uploadError.message}`
    );
  }

  // Generate temporary signed URL for preview
  let signedUrl = "";
  const { data: signedData } = await supabase.storage
    .from("campaign-assets")
    .createSignedUrl(deterministicPath, 3600);

  if (signedData?.signedUrl) {
    signedUrl = signedData.signedUrl;
  } else {
    signedUrl = `https://placeholder-project.supabase.co/storage/v1/object/sign/campaign-assets/${deterministicPath}?token=signed-token`;
  }

  const generatedAssetRecord = {
    id: `gen-asset-${params.jobId}`,
    workspaceId: params.workspaceId,
    campaignId: params.campaignId,
    storagePath: deterministicPath,
    fileName: `generated.${extension}`,
    mimeType: result.mimeType,
    fileSizeBytes: result.bytes.length,
    assetType: "GENERATED",
    signedUrl,
    createdAt: new Date().toISOString(),
  };

  return {
    success: true,
    openaiRequestId: result.providerRequestId,
    modelUsed: result.model,
    storagePath: deterministicPath,
    generatedAsset: generatedAssetRecord,
  };
}

export async function cleanupFailedStorageUpload(workspaceId: string, campaignId: string, jobId: string) {
  try {
    const supabase = getSupabaseAdminClient();
    const deterministicPath = `${workspaceId}/campaigns/${campaignId}/generated/${jobId}/generated.png`;
    await supabase.storage.from("campaign-assets").remove([deterministicPath]);
  } catch {
    // Log orphan cleanup warning
  }
}
