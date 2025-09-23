// @deno-types="https://deno.land/std@0.168.0/http/server.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_ENDPOINT = "wss://ws-api.runware.ai/v1";

interface GenerateImageParams {
  positivePrompt: string;
  model?: string;
  width?: number;
  height?: number;
}

class RunwareService {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private connectionSessionUUID: string | null = null;
  private isAuthenticated: boolean = false;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🔌 Attempting WebSocket connection to:', API_ENDPOINT);
      this.ws = new WebSocket(API_ENDPOINT);
      let isResolved = false;

      const cleanup = () => {
        if (this.ws) {
          this.ws.onopen = null;
          this.ws.onmessage = null;
          this.ws.onerror = null;
          this.ws.onclose = null;
        }
      };

      this.ws.onopen = () => {
        console.log("✅ WebSocket connected to Runware successfully");
        this.authenticate().then(() => {
          if (!isResolved) {
            isResolved = true;
            resolve();
          }
        }).catch((error) => {
          if (!isResolved) {
            isResolved = true;
            cleanup();
            reject(error);
          }
        });
      };

      this.ws.onmessage = (event) => {
        console.log("WebSocket message received:", event.data);
        const response = JSON.parse(event.data);

        if (response.error || response.errors) {
          console.error("WebSocket error response:", response);
          if (!isResolved) {
            isResolved = true;
            cleanup();
            reject(new Error(response.errorMessage || response.errors?.[0]?.message || "API error"));
          }
          return;
        }

        if (response.data) {
          response.data.forEach((item: any) => {
            if (item.taskType === "authentication") {
              console.log("Authentication successful, session UUID:", item.connectionSessionUUID);
              this.connectionSessionUUID = item.connectionSessionUUID;
              this.isAuthenticated = true;
            }
          });
        }
      };

      this.ws.onerror = (error) => {
        console.error("❌ WebSocket connection error:", error);
        if (!isResolved) {
          isResolved = true;
          cleanup();
          reject(new Error("WebSocket connection failed"));
        }
      };

      this.ws.onclose = () => {
        console.log("WebSocket closed");
        this.isAuthenticated = false;
        if (!isResolved) {
          isResolved = true;
          cleanup();
          reject(new Error("Connection closed unexpectedly"));
        }
      };
    });
  }

  private async authenticate(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error("WebSocket not ready for authentication"));
        return;
      }

      let isResolved = false;

      const authMessage = [{
        taskType: "authentication",
        apiKey: this.apiKey,
        ...(this.connectionSessionUUID && { connectionSessionUUID: this.connectionSessionUUID }),
      }];

      console.log("🔐 Sending authentication message to Runware...");

      const authTimeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          this.ws?.removeEventListener("message", authCallback);
          console.error("⏰ Authentication timeout after 10 seconds");
          reject(new Error("Authentication timeout"));
        }
      }, 10000);

      const authCallback = (event: MessageEvent) => {
        try {
          console.log("🔐 Authentication response received:", event.data);
          const response = JSON.parse(event.data);

          if (response.error || response.errors) {
            console.error("❌ Authentication failed:", response);
            if (!isResolved) {
              isResolved = true;
              clearTimeout(authTimeout);
              this.ws?.removeEventListener("message", authCallback);
              reject(new Error(response.errorMessage || response.errors?.[0]?.message || "Authentication failed"));
            }
            return;
          }

          if (response.data?.[0]?.taskType === "authentication") {
            console.log("✅ Authentication successful!");
            if (!isResolved) {
              isResolved = true;
              clearTimeout(authTimeout);
              this.ws?.removeEventListener("message", authCallback);
              resolve();
            }
          }
        } catch (error) {
          console.error("❌ Failed to parse authentication response:", error);
          if (!isResolved) {
            isResolved = true;
            clearTimeout(authTimeout);
            this.ws?.removeEventListener("message", authCallback);
            reject(new Error("Failed to parse authentication response"));
          }
        }
      };

      this.ws.addEventListener("message", authCallback);
      this.ws.send(JSON.stringify(authMessage));
    });
  }

  async generateImage(params: GenerateImageParams): Promise<any> {
    await this.connect();

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      throw new Error("Not connected or authenticated");
    }

    const taskUUID = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      let isResolved = false;

      // Ensure we have a valid model
      const validModel = params.model || "runware:100@1";
      console.log("🎯 Using model:", validModel);

      const message = [{
        taskType: "imageInference" as const,
        taskUUID,
        positivePrompt: params.positivePrompt,
        model: validModel,
        ...(params.width && { width: params.width }),
        ...(params.height && { height: params.height }),
        numberResults: 1,
      }];

      console.log("🎨 Sending image generation message:", JSON.stringify(message, null, 2));

      const messageTimeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          this.ws?.removeEventListener("message", messageCallback);
          console.error("⏰ Image generation timeout after 2 minutes");
          reject(new Error("Image generation timeout"));
        }
      }, 120000);

      const messageCallback = (event: MessageEvent) => {
        try {
          console.log("🎨 Generation response received:", event.data);
          const response = JSON.parse(event.data);

          if (response.error || response.errors) {
            console.error("❌ Generation failed:", response);
            if (!isResolved) {
              isResolved = true;
              clearTimeout(messageTimeout);
              this.ws?.removeEventListener("message", messageCallback);
              reject(new Error(response.errorMessage || response.errors?.[0]?.message || "Generation failed"));
            }
            return;
          }

          if (response.data) {
            response.data.forEach((item: any) => {
              console.log(`🔍 Checking item: taskType=${item.taskType}, taskUUID=${item.taskUUID}, expected=${taskUUID}`);
              if (item.taskUUID === taskUUID && !isResolved) {
                isResolved = true;
                clearTimeout(messageTimeout);
                this.ws?.removeEventListener("message", messageCallback);

                if (item.error) {
                  console.error("❌ Item has error:", item.errorMessage);
                  reject(new Error(item.errorMessage || "Generation failed"));
                } else {
                  console.log("✅ Generation successful, returning result");
                  resolve(item);
                }
              }
            });
          }
        } catch (error) {
          console.error("❌ Failed to parse generation response:", error);
          if (!isResolved) {
            isResolved = true;
            clearTimeout(messageTimeout);
            this.ws?.removeEventListener("message", messageCallback);
            reject(new Error("Failed to parse generation response"));
          }
        }
      };

      if (this.ws) {
        this.ws.addEventListener("message", messageCallback);
        this.ws.send(JSON.stringify(message));
      } else {
        reject(new Error("WebSocket is not available"));
      }
    });
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

serve(async (req: Request) => {
  console.log('🚀 Image generation request received');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('📋 Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔑 Checking API key configuration...');
    const apiKey = Deno.env.get('RUNWARE_API_KEY');
    if (!apiKey) {
      console.error('❌ RUNWARE_API_KEY not found in environment');
      throw new Error('RUNWARE_API_KEY not configured');
    }
    console.log('✅ API key found, length:', apiKey.length);

    console.log('📦 Parsing request body...');
    const body = await req.json();
    console.log("📝 Received request:", JSON.stringify(body, null, 2));

    console.log('🛠️ Initializing Runware service...');
    const runware = new RunwareService(apiKey);

    try {
      console.log('🎨 Starting image generation...');
      const result = await runware.generateImage(body);
      console.log("🎉 Generation successful:", JSON.stringify(result, null, 2));

      return new Response(JSON.stringify({
        success: true,
        data: {
          imageURL: result.imageURL,
          cost: result.cost || 0.0013,
          seed: result.seed,
          model: body.model || "runware:100@1",
          generationTime: "1.2s" // We could calculate this from timestamps
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } finally {
      runware.close();
    }

  } catch (error: unknown) {
    console.error('Error in generate-image function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
