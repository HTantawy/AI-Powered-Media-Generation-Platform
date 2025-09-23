import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RUNWARE_API_URL = "https://api.runware.ai/v1";

interface FrameImagePayload {
  inputImage: string;
  frame?: string;
}

interface StartVideoRequest {
  positivePrompt: string;
  model?: string;
  width?: number;
  height?: number;
  duration?: number;
  fps?: number;
  inputImage?: string;
  frameImages?: FrameImagePayload[];
  taskUUID?: string;
  negativePrompt?: string;
  providerSettings?: {
    google?: {
      generateAudio?: boolean;
      enhancePrompt?: boolean;
    };
  };
}

interface PollVideoRequest {
  taskUUID: string;
}

type VideoRequest = Partial<StartVideoRequest & PollVideoRequest> & {
  mode?: "start" | "poll";
};

interface RunwareTaskResponse {
  taskUUID?: string;
  status?: string;
  state?: string;
  error?: unknown;
  errorMessage?: string;
  cost?: number;
  videoURL?: string;
  outputVideoURL?: string;
  url?: string;
  data?: unknown;
}

interface RunwareApiError extends Error {
  status?: number;
  runwareResponse?: unknown;
}

const DEFAULT_MODEL = "bytedance:1@1";
const DEFAULT_DURATION = 5;
const DEFAULT_FPS = 24;
const MAX_POLLS = 15;
const POLL_INTERVAL_MS = 4000;
const GOOGLE_ALLOWED_DURATIONS = new Set([4, 6, 8]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface Resolution {
  width: number;
  height: number;
}

const BYTEDANCE_ALLOWED_RESOLUTIONS: Resolution[] = [
  { width: 864, height: 480 },
  { width: 736, height: 544 },
  { width: 640, height: 640 },
  { width: 544, height: 736 },
  { width: 480, height: 864 },
  { width: 960, height: 416 },
  { width: 1248, height: 704 },
  { width: 1120, height: 832 },
  { width: 960, height: 960 },
  { width: 832, height: 1120 },
  { width: 704, height: 1248 },
  { width: 1504, height: 640 },
  { width: 1920, height: 1088 },
  { width: 1664, height: 1248 },
  { width: 1440, height: 1440 },
  { width: 1248, height: 1664 },
  { width: 1088, height: 1920 },
  { width: 2176, height: 928 },
];

const BYTEDANCE_RESOLUTION_GROUPS: Record<string, Resolution[]> = {
  "16:9": [
    { width: 864, height: 480 },
    { width: 1248, height: 704 },
    { width: 1920, height: 1088 },
  ],
  "4:3": [
    { width: 736, height: 544 },
    { width: 1120, height: 832 },
    { width: 1664, height: 1248 },
  ],
  "1:1": [
    { width: 640, height: 640 },
    { width: 960, height: 960 },
    { width: 1440, height: 1440 },
  ],
  "3:4": [
    { width: 544, height: 736 },
    { width: 832, height: 1120 },
    { width: 1248, height: 1664 },
  ],
  "9:16": [
    { width: 480, height: 864 },
    { width: 704, height: 1248 },
    { width: 1088, height: 1920 },
  ],
  "21:9": [
    { width: 960, height: 416 },
    { width: 1504, height: 640 },
    { width: 2176, height: 928 },
  ],
};

interface Resolution {
  width: number;
  height: number;
}

const ALLOWED_RESOLUTIONS: Resolution[] = [
  { width: 864, height: 480 },
  { width: 736, height: 544 },
  { width: 640, height: 640 },
  { width: 544, height: 736 },
  { width: 480, height: 864 },
  { width: 960, height: 416 },
  { width: 1248, height: 704 },
  { width: 1120, height: 832 },
  { width: 960, height: 960 },
  { width: 832, height: 1120 },
  { width: 704, height: 1248 },
  { width: 1504, height: 640 },
  { width: 1920, height: 1088 },
  { width: 1664, height: 1248 },
  { width: 1440, height: 1440 },
  { width: 1248, height: 1664 },
  { width: 1088, height: 1920 },
  { width: 2176, height: 928 },
];

const inferBytedanceAspectKey = (width?: number, height?: number): string | undefined => {
  if (!width || !height) return undefined;

  let bestKey: string | undefined;
  let bestDiff = Number.POSITIVE_INFINITY;

  for (const [key, resolutions] of Object.entries(BYTEDANCE_RESOLUTION_GROUPS)) {
    for (const res of resolutions) {
      const diff = Math.abs(res.width / res.height - width / height);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestKey = key;
      }
    }
  }

  return bestKey;
};

const normalizeBytedanceResolution = (width?: number, height?: number): Resolution => {
  const defaultRes = BYTEDANCE_RESOLUTION_GROUPS["16:9"][1];

  if (!width || !height) {
    return defaultRes;
  }

  const exact = BYTEDANCE_ALLOWED_RESOLUTIONS.find((res) => res.width === width && res.height === height);
  if (exact) {
    return exact;
  }

  const aspectKey = inferBytedanceAspectKey(width, height);
  if (aspectKey) {
    const candidates = BYTEDANCE_RESOLUTION_GROUPS[aspectKey];
    if (candidates && candidates.length > 0) {
      return candidates[1] ?? candidates[0];
    }
  }

  return defaultRes;
};

const snapToEight = (value: number) => Math.round(value / 8) * 8;

const normalizeGoogleResolution = (width?: number, height?: number): Resolution => {
  const minWidth = 256;
  const maxWidth = 1920;
  const minHeight = 256;
  const maxHeight = 1080;
  const defaultWidth = 1280;
  const defaultHeight = 720;

  let targetWidth = typeof width === "number" ? width : defaultWidth;
  let targetHeight = typeof height === "number" ? height : defaultHeight;

  if (!width && !height) {
    targetWidth = defaultWidth;
    targetHeight = defaultHeight;
  } else if (width && !height) {
    targetHeight = (width * defaultHeight) / defaultWidth;
  } else if (!width && height) {
    targetWidth = (height * defaultWidth) / defaultHeight;
  }

  const ratio = targetWidth / targetHeight || defaultWidth / defaultHeight;

  const clampWidth = (value: number) => Math.min(maxWidth, Math.max(minWidth, value));
  const clampHeight = (value: number) => Math.min(maxHeight, Math.max(minHeight, value));

  targetWidth = clampWidth(snapToEight(targetWidth));
  targetHeight = clampHeight(snapToEight(targetHeight));

  if (targetWidth / targetHeight !== ratio) {
    if (targetWidth >= targetHeight) {
      targetHeight = clampHeight(snapToEight(targetWidth / ratio));
    } else {
      targetWidth = clampWidth(snapToEight(targetHeight * ratio));
    }
  }

  targetWidth = clampWidth(snapToEight(targetWidth));
  targetHeight = clampHeight(snapToEight(targetHeight));

  return {
    width: targetWidth,
    height: targetHeight,
  };
};

const isPollRequest = (payload: VideoRequest): payload is PollVideoRequest => {
  if (payload.mode === "poll") return Boolean(payload.taskUUID);
  if (payload.taskUUID && !payload.positivePrompt && !payload.frameImages) return true;
  return false;
};

const fileToDataURI = async (file: File): Promise<string> => {
  const uint8Array = new Uint8Array(await file.arrayBuffer());
  const base64Data = base64Encode(uint8Array);
  return `data:${file.type || "application/octet-stream"};base64,${base64Data}`;
};

const callRunware = async <T>(payload: unknown, apiKey: string, endpoint: string = RUNWARE_API_URL): Promise<T> => {
  console.log(`📡 POST ${endpoint}`, JSON.stringify(payload));

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const rawBody = await response.text();
  let responseData: unknown = null;

  if (rawBody) {
    try {
      responseData = JSON.parse(rawBody);
    } catch (_error) {
      responseData = rawBody;
    }
  }

  console.log(`📥 Runware response ${response.status}:`, typeof responseData === "string" ? responseData : JSON.stringify(responseData));

  if (!response.ok) {
    let detail = "Unknown Runware error";

    if (typeof responseData === "string" && responseData.trim()) {
      detail = responseData;
    } else if (responseData && typeof responseData === "object") {
      const dataObj = responseData as Record<string, unknown>;
      const potential = dataObj.error ?? dataObj.errors ?? dataObj.message ?? dataObj.detail ?? dataObj.reason;

      if (typeof potential === "string" && potential.trim()) {
        detail = potential;
      } else if (Array.isArray(potential) && potential.length > 0) {
        const first = potential[0] as { message?: string } | string;
        if (typeof first === "string" && first.trim()) {
          detail = first;
        } else if (first && typeof first === "object" && typeof first.message === "string") {
          detail = first.message;
        } else {
          detail = JSON.stringify(potential);
        }
      } else {
        detail = JSON.stringify(responseData);
      }
    }

    const status = response.status;
    let message = detail;

    if (status === 401 || status === 403) {
      message = `Runware authentication failed (${status}). Verify the RUNWARE_API_KEY.`;
      if (detail && detail !== "Unknown Runware error") {
        message += ` Details: ${detail}`;
      }
    } else if (!detail.includes(String(status))) {
      message = `Runware API error (${status}): ${detail}`;
    }

    const error = new Error(message) as RunwareApiError;
    error.status = status;
    error.runwareResponse = responseData;
    throw error;
  }

  return responseData as T;
};

const pollForResult = async (taskUUID: string, apiKey: string) => {
  for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
    const pollPayload = [
      {
        taskType: "getResponse",
        taskUUID,
        includeCost: true,
        outputType: "URL",
      },
    ];

    const pollResponse = await callRunware<unknown>(pollPayload, apiKey);

    const candidates: RunwareTaskResponse[] = Array.isArray(pollResponse)
      ? pollResponse as RunwareTaskResponse[]
      : Array.isArray((pollResponse as { data?: unknown }).data)
        ? (pollResponse as { data: RunwareTaskResponse[] }).data
        : [];

    const match = candidates.find((item) => item.taskUUID === taskUUID) ?? candidates[0];

    if (!match) {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    if (match.error || match.errorMessage) {
      const detail = typeof match.errorMessage === "string" ? match.errorMessage : JSON.stringify(match.error);
      throw new Error(detail || "Video generation failed");
    }

    const status = (match.status || match.state || "").toLowerCase();
    const videoURL = match.videoURL || match.outputVideoURL || match.url;

    if (status === "completed" || status === "finished" || videoURL) {
      return {
        status: "completed" as const,
        taskUUID,
        videoURL,
        cost: match.cost,
      };
    }

    await sleep(POLL_INTERVAL_MS);
  }

  return {
    status: "pending" as const,
    taskUUID,
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("RUNWARE_API_KEY");
    if (!apiKey) {
      throw new Error("RUNWARE_API_KEY not configured");
    }

    const contentType = req.headers.get("content-type") ?? "";
    let requestData: VideoRequest = {};

    console.log('🔎 Environment check:', {
      hasRunwareKey: Boolean(Deno.env.get('RUNWARE_API_KEY')),
      runwareKeyLength: Deno.env.get('RUNWARE_API_KEY')?.length ?? 0,
    });

    const debugHeader = req.headers.get('x-debug-secrets');

  if (debugHeader === 'true') {
      const key = Deno.env.get('RUNWARE_API_KEY');
      return new Response(
        JSON.stringify({
          success: true,
          debug: {
            hasKey: Boolean(key),
            length: key?.length ?? 0,
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const parseFormValue = (value: FormDataEntryValue | null): string | undefined =>
        typeof value === "string" ? value.trim() || undefined : undefined;

      requestData.positivePrompt = (formData.get("positivePrompt") as string | null) ?? undefined;
      requestData.model = (formData.get("model") as string | null) ?? undefined;
      requestData.width = Number(formData.get("width")) || undefined;
      requestData.height = Number(formData.get("height")) || undefined;
      requestData.duration = Number(formData.get("duration")) || undefined;
      requestData.fps = Number(formData.get("fps")) || undefined;
      requestData.taskUUID = (formData.get("taskUUID") as string | null) ?? undefined;
      requestData.mode = (formData.get("mode") as "start" | "poll" | null) ?? undefined;

      const frame = formData.get("inputImage") ?? formData.get("frameImage");
      if (frame instanceof File) {
        requestData.inputImage = await fileToDataURI(frame);
      } else if (typeof frame === "string") {
        requestData.inputImage = frame;
      }

      const negativePrompt = parseFormValue(formData.get('negativePrompt'));
      if (negativePrompt) {
        requestData.negativePrompt = negativePrompt;
      }

      const providerSettingsRaw = parseFormValue(formData.get('providerSettings'));
      if (providerSettingsRaw) {
        try {
          requestData.providerSettings = JSON.parse(providerSettingsRaw);
        } catch (error) {
          console.error('Failed to parse providerSettings from form data', error);
        }
      }
    } else if (contentType.includes("application/json")) {
      requestData = await req.json();
      console.log('🧾 Parsed JSON body:', JSON.stringify(requestData));
    } else if (!contentType) {
      // allow empty content-type with JSON body
      try {
        requestData = await req.json();
        console.log('🧾 Parsed implicit JSON body:', JSON.stringify(requestData));
      } catch (_error) {
        // ignore; requestData stays empty
      }
    } else {
      throw new Error("Content-Type must be application/json or multipart/form-data");
    }

    if (!requestData) {
      throw new Error("Invalid request body");
    }

    if (isPollRequest(requestData)) {
      const pollResult = await pollForResult(requestData.taskUUID, apiKey);
      return new Response(
        JSON.stringify({ success: true, data: pollResult }),
        {
          status: pollResult.status === "completed" ? 200 : 202,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!requestData.positivePrompt || requestData.positivePrompt.trim().length < 2) {
      throw new Error("positivePrompt is required");
    }

    const taskUUID = requestData.taskUUID || crypto.randomUUID();
    const model = requestData.model || DEFAULT_MODEL;
    const isBytedanceModel = model === "bytedance:1@1";
    const isGoogleModel = model === "google:3@1";

    const requestedWidth = typeof requestData.width === 'number' ? requestData.width : undefined;
    const requestedHeight = typeof requestData.height === 'number' ? requestData.height : undefined;

    let duration = requestData.duration ?? (isGoogleModel ? 8 : DEFAULT_DURATION);
    if (isGoogleModel && !GOOGLE_ALLOWED_DURATIONS.has(duration)) {
      duration = 8;
    }

    let fps = requestData.fps ?? DEFAULT_FPS;
    if (isGoogleModel || isBytedanceModel) {
      fps = 24;
    }

    const frameImages: FrameImagePayload[] = [];

    if (Array.isArray(requestData.frameImages) && requestData.frameImages.length > 0) {
      requestData.frameImages.forEach((frame) => {
        if (frame?.inputImage) {
          frameImages.push(frame);
        }
      });
    }

    if (requestData.inputImage) {
      frameImages.push({ inputImage: requestData.inputImage, frame: "first" });
    }

    let resolution: Resolution | undefined;
    if (!frameImages.length) {
      if (isBytedanceModel) {
        resolution = normalizeBytedanceResolution(requestedWidth, requestedHeight);
      } else if (isGoogleModel) {
        resolution = normalizeGoogleResolution(requestedWidth, requestedHeight);
      } else if (requestedWidth && requestedHeight) {
        resolution = { width: requestedWidth, height: requestedHeight };
      }
    }

    if (resolution) {
      console.log('🎯 Normalized resolution:', resolution);
    }

    const payloadEntry: Record<string, unknown> = {
      taskType: "videoInference" as const,
      taskUUID,
      model,
      positivePrompt: requestData.positivePrompt,
      duration,
      fps,
      numberResults: 1,
      includeCost: true,
      outputType: "URL",
      deliveryMethod: "async",
      ...(!frameImages.length && resolution ? { width: resolution.width, height: resolution.height } : {}),
      ...(frameImages.length ? { frameImages } : {}),
    };

    if (requestData.negativePrompt && requestData.negativePrompt.trim().length > 0) {
      payloadEntry.negativePrompt = requestData.negativePrompt.trim();
    }

    if (isGoogleModel) {
      const existingGoogleSettings = requestData.providerSettings?.google ?? {};
      const generateAudioValue = existingGoogleSettings.generateAudio;
      const generateAudio =
        typeof generateAudioValue === "boolean"
          ? generateAudioValue
          : generateAudioValue === "true";

      payloadEntry.providerSettings = {
        google: {
          ...existingGoogleSettings,
          generateAudio,
          enhancePrompt: true,
        },
      };
    } else if (requestData.providerSettings) {
      payloadEntry.providerSettings = requestData.providerSettings;
    }

    const payload = [payloadEntry];

    await callRunware(payload, apiKey);

    const pollResult = await pollForResult(taskUUID, apiKey);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...pollResult,
          model,
          duration,
          fps,
        },
      }),
      {
        status: pollResult.status === "completed" ? 200 : 202,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    let status = 500;
    let message = "Unexpected error";
    let details: unknown;

    if (error instanceof Error) {
      message = error.message || message;
      const runwareError = error as RunwareApiError;

      if (typeof runwareError.status === "number" && runwareError.status >= 400 && runwareError.status < 600) {
        status = runwareError.status;
      }

      if (typeof runwareError.runwareResponse !== "undefined") {
        details = runwareError.runwareResponse;
      }
    }

    console.error("❌ generate-video error", { status, message, details, error });

    return new Response(
      JSON.stringify({
        success: false,
        error: message,
        ...(typeof details !== "undefined" ? { details } : {}),
      }),
      {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
