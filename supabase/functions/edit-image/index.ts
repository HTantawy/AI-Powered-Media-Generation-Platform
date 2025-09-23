import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RUNWARE_API_URL = "https://api.runware.ai/v1";


const MODEL_MAP = {
  'qwen-edit': 'runware:108@20',
  'seededit-3': 'bytedance:4@1',
  'ideogram-3': 'ideogram:4@3',
} as const;

type EditStyle = keyof typeof MODEL_MAP;

interface EditImageRequest {
  positivePrompt: string;
  editStyle: EditStyle;
  width: number;
  height: number;
  strength: number;
  cfgScale: number;
  seedImage: string; // URL/UUID/DataURI
  maskImage?: string; // Optional for inpainting
}

interface ImageInferenceTask {
  taskType: "imageInference";
  taskUUID: string;
  model: string;
  positivePrompt: string;
  width?: number;
  height?: number;
  steps?: number;
  CFGScale: number;
  numberResults: number;
  includeCost: boolean;
  checkNSFW?: boolean;
  outputType: "URL";
  referenceImages: string[];
  strength?: number;
  maskImage?: string;
}

const validateDimensions = (value: number): number => {
  
  const clamped = Math.max(128, Math.min(2048, value));
  return Math.round(clamped / 64) * 64;
};

const parseFormValue = (value: FormDataEntryValue | null): string | undefined => {
  return typeof value === "string" ? value.trim() || undefined : undefined;
};

const parseNumberValue = (value: FormDataEntryValue | null, fallback: number): number => {
  if (typeof value === "string") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const fileToDataURI = async (file: File): Promise<string> => {
  const uint8Array = new Uint8Array(await file.arrayBuffer());
  const base64Data = base64Encode(uint8Array);
  return `data:${file.type || 'image/png'};base64,${base64Data}`;
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Edit image request received');

    // Check API key
    const apiKey = Deno.env.get('RUNWARE_API_KEY');
    if (!apiKey) {
      throw new Error('RUNWARE_API_KEY not configured');
    }

    // Parse request data
    let requestData: Partial<EditImageRequest>;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      // Handle JSON request
      requestData = await req.json();
    } else if (contentType.includes('multipart/form-data')) {
      // Handle FormData request
      const formData = await req.formData();

      const positivePrompt = parseFormValue(formData.get('positivePrompt'));
      const editStyle = parseFormValue(formData.get('editStyle')) as EditStyle;
      const width = parseNumberValue(formData.get('width'), 1024);
      const height = parseNumberValue(formData.get('height'), 1024);
      const strength = parseNumberValue(formData.get('strength'), 0.8);
      const cfgScale = parseNumberValue(formData.get('cfgScale'), 7);

      
      const seedImageFile = formData.get('referenceImage') || formData.get('seedImage');
      let seedImage: string | undefined;

      if (seedImageFile instanceof File) {
      
        if (seedImageFile.size > 10 * 1024 * 1024) {
          throw new Error('Image file too large. Maximum size is 10MB.');
        }
        seedImage = await fileToDataURI(seedImageFile);
      } else if (typeof seedImageFile === 'string') {
        seedImage = seedImageFile;
      }

    
      const maskImageFile = formData.get('maskImage');
      let maskImage: string | undefined;
      if (maskImageFile instanceof File) {
        maskImage = await fileToDataURI(maskImageFile);
      } else if (typeof maskImageFile === 'string') {
        maskImage = maskImageFile;
      }

      requestData = {
        positivePrompt,
        editStyle,
        width,
        height,
        strength,
        cfgScale,
        seedImage,
        maskImage,
      };
    } else {
      throw new Error('Content-Type must be application/json or multipart/form-data');
    }

    
    if (!requestData.positivePrompt || requestData.positivePrompt.length < 2) {
      throw new Error('positivePrompt is required and must be at least 2 characters');
    }

    if (!requestData.seedImage) {
      throw new Error('seedImage is required');
    }

    if (!requestData.editStyle || !(requestData.editStyle in MODEL_MAP)) {
      throw new Error(`editStyle must be one of: ${Object.keys(MODEL_MAP).join(', ')}`);
    }

    
    const width = validateDimensions(requestData.width || 1024);
    const height = validateDimensions(requestData.height || 1024);

    
    const model = MODEL_MAP[requestData.editStyle];

    
    const task: ImageInferenceTask = {
      taskType: "imageInference",
      taskUUID: crypto.randomUUID(),
      model,
      positivePrompt: requestData.positivePrompt,
      CFGScale: requestData.editStyle === 'seededit-3' ? (requestData.cfgScale || 7) : 7,
      numberResults: 1,
      includeCost: true,
      outputType: "URL",
      referenceImages: [requestData.seedImage],
    };

 
    if (requestData.editStyle !== 'seededit-3') {
      task.width = width;
      task.height = height;
    }

   
    if (requestData.editStyle === 'qwen-edit') {
      task.steps = 20;
      task.checkNSFW = true;
      task.strength = Math.max(0, Math.min(1, requestData.strength || 0.8));
    } else if (requestData.editStyle === 'ideogram-3') {
      task.checkNSFW = true;
      task.strength = Math.max(0, Math.min(1, requestData.strength || 0.8));
      // No steps parameter for ideogram
    }
  
    if (requestData.maskImage) {
      task.maskImage = requestData.maskImage;
    }

    const payload = [task];

    console.log('📝 Sending request to Runware:', JSON.stringify(payload, null, 2));

    const response = await fetch(RUNWARE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

    
    const responseData = await response.json();

    console.log('📥 Runware response:', JSON.stringify(responseData, null, 2));
    console.log('📥 Response type:', typeof responseData);
    console.log('📥 Is array:', Array.isArray(responseData));

    
    if (!response.ok) {
      console.error('❌ Runware API error status:', response.status);
      console.error('❌ Error response:', responseData);

      
      const errorDetails = responseData.error || responseData.errors || responseData.message || 'Unknown error';
      console.error('❌ Error details:', errorDetails);

      
      return new Response(JSON.stringify({
        error: [{
          code: 'RUNWARE_API_ERROR',
          message: `Runware API error (${response.status}): ${JSON.stringify(errorDetails)}`,
          details: responseData
        }]
      }), {
        status: response.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
      });
    }

   
    return new Response(JSON.stringify(responseData), {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
    });

  } catch (error: unknown) {
    console.error('❌ Error in edit-image function:', error);
    const message = error instanceof Error ? error.message : 'Unexpected error';

    return new Response(JSON.stringify({
      error: [{
        code: 'FUNCTION_ERROR',
        message,
      }],
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
    });
  }
});

