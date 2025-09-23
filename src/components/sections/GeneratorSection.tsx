import { useRef, useState, type ChangeEvent } from "react";
import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from "@supabase/supabase-js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ImageIcon, VideoIcon, Download, Copy, Code, Loader2, Upload, Edit, Dice5 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GeneratedImage {
  id: string;
  url: string;
  time: string;
  cost: string;
  model: string;
}

interface GeneratedVideo {
  id: string;
  taskUUID: string;
  url?: string;
  status: "pending" | "completed" | "unknown";
  model: string;
  duration: number;
  fps: number;
  cost?: string;
  createdAt: string;
}


interface AspectRatioOption {
  id: string;
  label: string;
  widthRatio: number;
  heightRatio: number;
}

type VideoModelOption = {
  id: string;
  name: string;
  description: string;
  modelId: string;
  durations: readonly number[];
  defaultDuration: number;
  defaultFps: number;
  fpsOptions: readonly number[];
  supportsAudio?: boolean;
};

const styleOptions = [
  {
    id: "auto-default",
    name: "Auto (Default)",
    description: "Let Runware choose the best engine for most prompts",
    modelId: "runware:100@1"
  },
  {
    id: "auto-pro",
    name: "Auto (Pro)",
    description: "Higher quality automatic routing using premium models",
    modelId: "runware:101@1"
  },
  {
    id: "seedream4",
    name: "Photoreal",
    description: "High realism for people, products, and nature",
    modelId: "bytedance:5@0"
  },
  {
    id: "realistic-vision",
    name: "Photoreal (Alt)",
    description: "Alternative photoreal look with softer lighting",
    modelId: "civitai:4201@130072"
  },
  {
    id: "qwen-balanced",
    name: "Balanced",
    description: "General-purpose style mixing realism and creativity",
    modelId: "runware:108@1"
  },
  {
    id: "flux-dev",
    name: "Creative",
    description: "Artistic, stylized, and surreal imagery",
    modelId: "bfl:2@1"
  },
  {
    id: "flux-schnell",
    name: "Fast Draft",
    description: "Rapid generations for quick concept previews",
    modelId: "civitai:618692@691639"
  },
  {
    id: "sdxl-base",
    name: "Studio XL",
    description: "Stable Diffusion XL base for detailed scenes",
    modelId: "civitai:101055@128078"
  },
  {
    id: "quick-generate",
    name: "Quick Generate",
    description: "Very fast iterations with decent quality",
    modelId: "rundiffusion:110@101"
  }
];

const editStyleOptions = [
  {
    id: "qwen-edit",
    name: "Rapid Generations ",
    description: "Fast and advanced image editing capabilities"
  },
  {
    id: "seededit-3",
    name: "High-Resolution Detailed Edits",
    description: "Reference-guided and global edits"
  },
  {
    id: "ideogram-3",
    name: "Creative Inpainting & Fixes",
    description: "Global semantic edits"
  }
];

const videoModelOptions: VideoModelOption[] = [
  {
    id: "bytedance-1@1",
    name: "Quick Draft",
    description: "Image-guided lightweight  video generations",
    modelId: "bytedance:1@1",
    durations: [5, 10] as const,
    defaultDuration: 5,
    defaultFps: 24,
    fpsOptions: [24] as const,
    supportsAudio: false,
  },
  {
    id: "google-veo3",
    name: "Cinematic Realism",
    description: "Up to 8s google's Veo 3 high quality videos with optional native audio",
    modelId: "google:3@1",
    durations: [4, 6, 8] as const,
    defaultDuration: 8,
    defaultFps: 24,
    fpsOptions: [24] as const,
    supportsAudio: true,
  },
];

const aspectRatioOptions: AspectRatioOption[] = [
  { id: "1:1", label: "1:1 (Square)", widthRatio: 1, heightRatio: 1 },
  { id: "21:9", label: "21:9 (Ultra-Wide / Landscape)", widthRatio: 21, heightRatio: 9 },
  { id: "16:9", label: "16:9 (Wide / Landscape)", widthRatio: 16, heightRatio: 9 },
  { id: "4:3", label: "4:3 (Standard / Landscape)", widthRatio: 4, heightRatio: 3 },
  { id: "3:2", label: "3:2 (Classic / Landscape)", widthRatio: 3, heightRatio: 2 },
  { id: "2:3", label: "2:3 (Classic / Portrait)", widthRatio: 2, heightRatio: 3 },
  { id: "3:4", label: "3:4 (Standard / Portrait)", widthRatio: 3, heightRatio: 4 },
  { id: "9:16", label: "9:16 (Tall / Portrait)", widthRatio: 9, heightRatio: 16 },
  { id: "9:21", label: "9:21 (Ultra-Tall / Portrait)", widthRatio: 9, heightRatio: 21 },
];

const promptPool = [
  // Photoreal
  "Ultra-photoreal portrait of a scientist illuminated by lab equipment, shallow depth of field",
  "Macro photograph of morning dew on a spiderweb in a mossy forest clearing",
  "Editorial product shot of a luxury watch on marble with dramatic lighting",
  "Aerial drone photo of terraced rice fields at sunrise with mist rolling over hills",
  "Cinematic still of a remote coastal village under stormy skies, photoreal style",
  // Abstract & surreal
  "Abstract fluid art with iridescent metallic swirls and neon highlights",
  "Surreal floating islands made of glass housing miniature ecosystems",
  "Geometric abstraction inspired by Bauhaus posters in bold complementary colors",
  "Fractal-inspired cosmic nebula rendered in luminous watercolor textures",
  "Dreamlike corridor of endless doors reflecting into infinity, cinematic lighting",
  // Cyberpunk & sci-fi
  "Cyberpunk street market at night with holographic signage and rainy reflections",
  "Futuristic mech garage full of engineers repairing a towering exosuit",
  "Stylized neon city skyline with hover cars and animated billboards, anime aesthetic",
  "Interior of a starship observation deck overlooking a binary star system",
  "High-speed chase through a cybernetic forest lit by bioluminescent flora",
  // Nature & landscapes
  "Serene alpine lake surrounded by autumn foliage, soft morning fog",
  "Dense rainforest canopy with rays of sunlight piercing through misty air",
  "Coastal cliffs battered by waves at golden hour, painterly realism",
  "Nighttime desert scene with glowing bioluminescent cacti and a star-filled sky",
  "Rolling lavender fields leading to a rustic farmhouse under pastel clouds",
  // Fantasy & concept art
  "Arcane wizard library filled with floating tomes and magical blue light",
  "Dragon roost carved into a mountain peak with lava rivers flowing below",
  "Elven glade lit by shimmering fireflies and crystalline waterfalls",
  "Storyboard frame of a heroine entering an ancient temple submerged in water",
  "Steampunk airship harbor bustling with inventors and brass machinery",
];






const shuffleArray = <T,>(input: T[]): T[] => {
  const array = [...input];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};


const DEFAULT_MAX_IMAGE_EDGE = 1024;
const GLOBAL_MAX_IMAGE_EDGE = 2048;
const MIN_IMAGE_EDGE = 128;
const DIMENSION_STEP = 64;

export const GeneratorSection = () => {
  const [activeTab, setActiveTab] = useState("image");
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("auto-default");
  const [aspectRatio, setAspectRatio] = useState(aspectRatioOptions[0].id);
  const [availablePrompts, setAvailablePrompts] = useState<string[]>(() => shuffleArray(promptPool));
  const [lastCustomPrompt, setLastCustomPrompt] = useState<string | null>(null);
  const [lastCustomStyleId, setLastCustomStyleId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [editedImages, setEditedImages] = useState<GeneratedImage[]>([]);
  

  const [editPrompt, setEditPrompt] = useState("");
  const [editStyle, setEditStyle] = useState("qwen-edit");
  const [editAspectRatio, setEditAspectRatio] = useState(aspectRatioOptions[0].id);
  const [editStrength, setEditStrength] = useState([0.8]);
  const [editCfgScale, setEditCfgScale] = useState([7]);
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [isEditGenerating, setIsEditGenerating] = useState(false);

  
  const [videoPrompt, setVideoPrompt] = useState("");
  const [videoModel, setVideoModel] = useState(videoModelOptions[0].id);
  const [videoDuration, setVideoDuration] = useState<number>(videoModelOptions[0].defaultDuration);
  const [videoFps, setVideoFps] = useState<number>(videoModelOptions[0].defaultFps);
  const [videoGenerateAudio, setVideoGenerateAudio] = useState<boolean>(videoModelOptions[0].supportsAudio ?? false);
  const [videoAspectRatio, setVideoAspectRatio] = useState("16:9");
  const [videoReferenceImage, setVideoReferenceImage] = useState<File | null>(null);
  const [isVideoGenerating, setIsVideoGenerating] = useState(false);
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([]);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);
  const activeVideoPolls = useRef(new Set<string>());

  const getModelFromStyle = (styleId: string) => {
    return styleOptions.find(option => option.id === styleId)?.modelId || "bytedance:1@1";
  };

  const getVideoModelConfig = (optionId: string): VideoModelOption => {
    return videoModelOptions.find(option => option.id === optionId) || videoModelOptions[0];
  };

  const getVideoModelId = (optionId: string) => getVideoModelConfig(optionId).modelId;

  const getMaxEdgeForModel = (modelId: string) => {

    switch (modelId) {
      default:
        return DEFAULT_MAX_IMAGE_EDGE;
    }
  };

  const toValidDimension = (value: number, cap: number) => {
    const effectiveCap = Math.min(Math.max(cap, MIN_IMAGE_EDGE), GLOBAL_MAX_IMAGE_EDGE);
    const flooredCap = Math.max(MIN_IMAGE_EDGE, Math.floor(effectiveCap / DIMENSION_STEP) * DIMENSION_STEP);
    const boundedValue = Math.max(MIN_IMAGE_EDGE, Math.min(effectiveCap, value));
    let dimension = Math.round(boundedValue / DIMENSION_STEP) * DIMENSION_STEP;
    dimension = Math.min(dimension, flooredCap);
    if (dimension < MIN_IMAGE_EDGE) {
      dimension = MIN_IMAGE_EDGE;
    }
    
    dimension = Math.round(dimension / DIMENSION_STEP) * DIMENSION_STEP;
    dimension = Math.min(dimension, flooredCap);
    if (dimension < MIN_IMAGE_EDGE) {
      dimension = MIN_IMAGE_EDGE;
    }
    return dimension;
  };

  const computeDimensions = (ratioId: string, modelId: string) => {
    const option = aspectRatioOptions.find(item => item.id === ratioId) || aspectRatioOptions[0];
    const baseMaxEdge = getMaxEdgeForModel(modelId);
    const maxEdge = Math.min(baseMaxEdge, GLOBAL_MAX_IMAGE_EDGE);

    const { widthRatio, heightRatio } = option;

    if (widthRatio === heightRatio) {
      const dimension = toValidDimension(maxEdge, maxEdge);
      return { width: dimension, height: dimension };
    }

    if (widthRatio > heightRatio) {
      const width = toValidDimension(maxEdge, maxEdge);
      const rawHeight = (width * heightRatio) / widthRatio;
      const height = toValidDimension(rawHeight, width);
      return { width, height };
    }

    const height = toValidDimension(maxEdge, maxEdge);
    const rawWidth = (height * widthRatio) / heightRatio;
    const width = toValidDimension(rawWidth, height);
    return { width, height };
  };


const computeVideoDimensions = (ratioId: string, modelId: string) => {
  const option = aspectRatioOptions.find(item => item.id === ratioId) ||
    aspectRatioOptions.find(item => item.id === "16:9") ||
    aspectRatioOptions[0];

  if (modelId === "bytedance:1@1") {
    const resolutionMap: Record<string, { width: number; height: number }> = {
      "16:9": { width: 1248, height: 704 },
      "4:3": { width: 1120, height: 832 },
      "1:1": { width: 960, height: 960 },
      "3:4": { width: 832, height: 1120 },
      "9:16": { width: 704, height: 1248 },
      "21:9": { width: 1504, height: 640 },
      "3:2": { width: 1248, height: 704 },
      "2:3": { width: 704, height: 1248 },
      "9:21": { width: 704, height: 1248 },
    };

    return resolutionMap[ratioId] || resolutionMap["16:9"];
  }

  if (modelId === "google:3@1") {
    const { widthRatio, heightRatio } = option;
    const isLandscape = widthRatio >= heightRatio;
    const baseWidth = 1280;
    const baseHeight = 720;
    const snapToEight = (value: number) => Math.max(256, Math.round(value / 8) * 8);
    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

    let width: number;
    let height: number;

    if (isLandscape) {
      width = baseWidth;
      height = (width * heightRatio) / widthRatio;
      if (height > 1080) {
        height = 1080;
        width = (height * widthRatio) / heightRatio;
      }
    } else {
      height = baseHeight;
      width = (height * widthRatio) / heightRatio;
      if (width > 1920) {
        width = 1920;
        height = (width * heightRatio) / widthRatio;
      }
    }

    width = clamp(snapToEight(width), 256, 1920);
    height = clamp(snapToEight(height), 256, 1080);

    const targetRatio = widthRatio / heightRatio || 16 / 9;

    if (isLandscape) {
      height = clamp(snapToEight(width / targetRatio), 256, 1080);
    } else {
      width = clamp(snapToEight(height * targetRatio), 256, 1920);
    }

    width = clamp(snapToEight(width), 256, 1920);
    height = clamp(snapToEight(height), 256, 1080);

    return { width, height };
  }

  return { width: 1280, height: 720 };
};


  const handleGenerateImage = async (overrides?: {
    prompt?: string;
    styleId?: string;
    aspectRatioId?: string;
  }) => {
    const promptValue = overrides?.prompt ?? prompt;
    const styleId = overrides?.styleId ?? style;
    const aspectRatioId = overrides?.aspectRatioId ?? aspectRatio;

    if (!promptValue.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setIsGenerating(true);

    try {
      const modelId = getModelFromStyle(styleId);
      const { width, height } = computeDimensions(aspectRatioId, modelId);

      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: {
          positivePrompt: promptValue,
          model: modelId,
          width,
          height
        }
      });

      if (error) throw error;

      if (data.success) {
        const newImage: GeneratedImage = {
          id: crypto.randomUUID(),
          url: data.data.imageURL,
          time: data.data.generationTime,
          cost: `$${data.data.cost}`,
          model: data.data.model
        };
        
        setGeneratedImages(prev => [newImage, ...prev]);
        toast.success("Image generated successfully!");
      } else {
        throw new Error(data.error || "Generation failed");
      }
    } catch (error: unknown) {
      console.error('Generation error:', error);
      const message = error instanceof Error ? error.message : "Failed to generate image";
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(blobUrl);
      toast.success("Image downloaded!");
    } catch (error) {
      toast.error("Failed to download image");
    }
  };

  const copyImageUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Image URL copied to clipboard!");
  };




  const handleEditImage = async () => {
    if (!editPrompt.trim() || editPrompt.length < 2) {
      toast.error("Please enter a prompt (at least 2 characters)");
      return;
    }

    if (!referenceImage) {
      toast.error("Please upload a reference image");
      return;
    }

    setIsEditGenerating(true);

    try {
      const { width, height } = computeDimensions(editAspectRatio, "dummy");

      const formData = new FormData();
      formData.append('positivePrompt', editPrompt);
      formData.append('editStyle', editStyle);
      formData.append('width', width.toString());
      formData.append('height', height.toString());
      formData.append('strength', editStrength[0].toString());
      formData.append('cfgScale', editCfgScale[0].toString());
      formData.append('referenceImage', referenceImage);

      const { data, error } = await supabase.functions.invoke('edit-image', {
        body: formData
      });

      console.log('🔍 Supabase response:', { data, error });

      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }

   
      if (data && data.data && Array.isArray(data.data) && data.data.length > 0) {
        const result = data.data[0];
        console.log('📦 Processing result:', result);

        if (result.error) {
          console.error('❌ Result error:', result.error);
          throw new Error(result.error.message || "Edit failed");
        }

        
        const imageUrl = result.imageURL || result.outputImageURL || result.image_url || result.url;

        if (imageUrl) {
          const newImage: GeneratedImage = {
            id: crypto.randomUUID(),
            url: imageUrl,
            time: result.executionTime ? `${result.executionTime}s` : "N/A",
            cost: result.cost ? `$${result.cost}` : "$0.00",
            model: editStyle
          };

          setEditedImages(prev => [newImage, ...prev]);
          toast.success("Image edited successfully!");
        } else {
          console.error('❌ No image URL found in result:', result);
          throw new Error("No image URL in response");
        }
      } else if (data && data.error) {
        // Handle function errors
        console.error('❌ Function error:', data.error);
        const errorMsg = Array.isArray(data.error) ? data.error[0]?.message : data.error;
        console.error('❌ Full error details:', data.error);
        throw new Error(errorMsg || "Edit failed");
      } else {
        console.error('❌ Unexpected response format:', data);
        console.error('❌ Data type:', typeof data);
        console.error('❌ Is array:', Array.isArray(data));
        throw new Error(`Unexpected response format. Data: ${JSON.stringify(data)}`);
      }
    } catch (error: unknown) {
      console.error('Edit error:', error);
      const message = error instanceof Error ? error.message : "Failed to edit image";
      toast.error(message);
    } finally {
      setIsEditGenerating(false);
    }
  };

  const handleFileUpload = (file: File) => {
    setReferenceImage(file);
    toast.success("Reference image uploaded!");
  };

  const updateVideoEntry = (taskUUID: string, changes: Partial<GeneratedVideo>) => {
    setGeneratedVideos(prev => prev.map(item => {
      if (item.taskUUID !== taskUUID) {
        return item;
      }
      return { ...item, ...changes };
    }));
  };

  const handleVideoFileButtonClick = () => {
    videoFileInputRef.current?.click();
  };

  const handleVideoFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideoReferenceImage(file);
      toast.success("Reference frame added!");
    }
    event.target.value = "";
  };

  const clearVideoReferenceImage = () => {
    setVideoReferenceImage(null);
    if (videoFileInputRef.current) {
      videoFileInputRef.current.value = "";
    }
    toast.message("Reference frame cleared");
  };

  const pollVideoTask = async (taskUUID: string) => {
    if (activeVideoPolls.current.has(taskUUID)) {
      return;
    }

    activeVideoPolls.current.add(taskUUID);

    try {
      for (let attempt = 0; attempt < 12; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 5000));

        const { data, error } = await supabase.functions.invoke('generate-video', {
          body: {
            mode: 'poll',
            taskUUID,
          }
        });

        if (error) {
          throw error;
        }

        if (!data?.success) {
          throw new Error(data?.error || "Video polling failed");
        }

        const payload = data.data as {
          status?: string;
          videoURL?: string;
          cost?: number;
          taskUUID: string;
        };

        if (!payload) {
          continue;
        }

        const status = (payload.status as GeneratedVideo['status']) || 'pending';

        updateVideoEntry(taskUUID, {
          status,
          url: payload.videoURL || undefined,
          cost: payload.cost ? `$${payload.cost}` : undefined,
        });

        if (status === 'completed' && payload.videoURL) {
          toast.success("Video ready!");
          break;
        }
      }
    } catch (error: unknown) {
      console.error('Video polling error:', error);
      const message = error instanceof Error ? error.message : "Failed to poll video status";
      toast.error(message);
    } finally {
      activeVideoPolls.current.delete(taskUUID);
    }
  };

  const handleGenerateVideo = async () => {
    if (!videoPrompt.trim()) {
      toast.error("Please enter a video prompt");
      return;
    }

    const modelConfig = getVideoModelConfig(videoModel);
    const modelId = modelConfig.modelId;
    const { width, height } = computeVideoDimensions(videoAspectRatio, modelId);

    const durationOptions = Array.from(modelConfig.durations);
    const fpsOptions = Array.from(modelConfig.fpsOptions);
    const normalizedDuration = durationOptions.includes(videoDuration) ? videoDuration : modelConfig.defaultDuration;
    const normalizedFps = fpsOptions.includes(videoFps) ? videoFps : modelConfig.defaultFps;

    const providerSettings = modelId === "google:3@1"
      ? {
          google: {
            generateAudio: (modelConfig.supportsAudio ?? false) ? videoGenerateAudio : false,
            enhancePrompt: true,
          },
        }
      : undefined;

    setIsVideoGenerating(true);

    try {
      const basePayload: Record<string, unknown> = {
        positivePrompt: videoPrompt,
        model: modelId,
        duration: normalizedDuration,
        fps: normalizedFps,
        mode: 'start' as const,
        deliveryMethod: 'async' as const,
        ...(providerSettings ? { providerSettings } : {}),
        ...(videoReferenceImage ? {} : { width, height }),
      };

      let response;

      if (videoReferenceImage) {
        const formData = new FormData();
        formData.append('positivePrompt', videoPrompt);
        formData.append('model', modelId);
        formData.append('duration', normalizedDuration.toString());
        formData.append('fps', normalizedFps.toString());
        formData.append('mode', 'start');
        formData.append('deliveryMethod', 'async');
        formData.append('inputImage', videoReferenceImage);

        if (providerSettings) {
          formData.append('providerSettings', JSON.stringify(providerSettings));
        }

        response = await supabase.functions.invoke('generate-video', {
          body: formData
        });
      } else {
        response = await supabase.functions.invoke('generate-video', {
          body: basePayload
        });
      }

      const { data, error } = response;

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || "Video generation failed");
      }

      const payload = data.data as {
        status?: string;
        videoURL?: string;
        cost?: number;
        taskUUID: string;
        duration?: number;
        fps?: number;
      };

      if (!payload?.taskUUID) {
        throw new Error("Runware did not return a task UUID");
      }

      const status = (payload.status as GeneratedVideo['status']) || 'unknown';

      const newVideo: GeneratedVideo = {
        id: crypto.randomUUID(),
        taskUUID: payload.taskUUID,
        status,
        url: payload.videoURL || undefined,
        model: modelId,
        duration: payload.duration ?? normalizedDuration,
        fps: payload.fps ?? normalizedFps,
        cost: payload.cost ? `$${payload.cost}` : undefined,
        createdAt: new Date().toISOString(),
      };

      setGeneratedVideos(prev => [newVideo, ...prev]);

      if (status === 'completed' && newVideo.url) {
        toast.success("Video generated successfully!");
      } else {
        toast.info("Video generation started. Polling for results...");
        void pollVideoTask(payload.taskUUID);
      }
    } catch (error: unknown) {
      console.error('Video generation error:', error);
      let message = "Failed to generate video";

      if (error instanceof FunctionsHttpError) {
        const context = error.context as { error?: string } | undefined;
        message = context?.error || error.message || message;
      } else if (error instanceof FunctionsRelayError || error instanceof FunctionsFetchError) {
        message = error.message || message;
      } else if (error instanceof Error && error.message) {
        message = error.message;
      }

      toast.error(message);
    } finally {
      setIsVideoGenerating(false);
    }
  };

  const downloadVideo = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(blobUrl);
      toast.success("Video downloaded!");
    } catch (error) {
      toast.error("Failed to download video");
    }
  };

  const copyVideoUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Video URL copied to clipboard!");
  };

  const handleGenerateCustomImage = () => {
    if (isGenerating) return;

    const modelWhitelist = [
      "auto-default",
      "auto-pro",
      "seedream4",
      "realistic-vision",
      "qwen-balanced",
      "flux-dev",
      "flux-schnell",
      "sdxl-base",
      "quick-generate",
    ];

    let promptsPool = availablePrompts;
    if (promptsPool.length === 0) {
      promptsPool = shuffleArray(promptPool);
      if (promptsPool.length > 1 && promptsPool[0] === lastCustomPrompt) {
        [promptsPool[0], promptsPool[1]] = [promptsPool[1], promptsPool[0]];
      }
    }

    const [selectedPromptRaw, ...remainingPrompts] = promptsPool;
    const randomPrompt = selectedPromptRaw ?? promptPool[Math.floor(Math.random() * promptPool.length)];
    setAvailablePrompts(remainingPrompts);
    setLastCustomPrompt(randomPrompt);

    const candidateStyles = modelWhitelist.filter(id => id !== lastCustomStyleId);
    const stylePool = candidateStyles.length > 0 ? candidateStyles : modelWhitelist;
    const randomStyleId = stylePool[Math.floor(Math.random() * stylePool.length)];
    const randomAspect = aspectRatioOptions[Math.floor(Math.random() * aspectRatioOptions.length)].id;

    setPrompt(randomPrompt);
    setStyle(randomStyleId);
    setAspectRatio(randomAspect);
    setLastCustomStyleId(randomStyleId);

    void handleGenerateImage({
      prompt: randomPrompt,
      styleId: randomStyleId,
      aspectRatioId: randomAspect,
    });
  };

  const selectedVideoConfig = getVideoModelConfig(videoModel);
  const availableVideoDurations = Array.from(selectedVideoConfig.durations);
  const availableVideoFpsOptions = Array.from(selectedVideoConfig.fpsOptions);
  const supportsAudio = selectedVideoConfig.supportsAudio ?? false;

  return (
    <section id="try-api" className="py-20 bg-background/50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold gradient-text mb-4">Experimenting with the API</h2>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-6xl mx-auto">
          <TabsList className="grid w-full grid-cols-3 glass-card">
            <TabsTrigger value="image" className="flex items-center space-x-2">
              <ImageIcon className="h-4 w-4" />
              <span>Image Generation</span>
            </TabsTrigger>
            <TabsTrigger value="edit" className="flex items-center space-x-2">
              <Edit className="h-4 w-4" />
              <span>Edit Image</span>
            </TabsTrigger>
            <TabsTrigger value="video" className="flex items-center space-x-2">
              <VideoIcon className="h-4 w-4" />
              <span>Video Generation</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="image" className="mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Input Panel */}
              <Card className="glass-card p-6 space-y-6 border-2 border-purple-600/30 hover:border-purple-500/60 transition-colors">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="prompt">Prompt</Label>
                    <Textarea
                      id="prompt"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="A beautiful landscape with mountains and a lake..."
                      className="mt-2 bg-surface border-white/10"
                      rows={3}
                    />
                  </div>
                  
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Style</Label>
                      <Select value={style} onValueChange={setStyle}>
                      <SelectTrigger className="mt-2 bg-surface border-white/10 [&_span.select-description]:hidden">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {styleOptions.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{option.name}</span>
                                <span className="text-xs text-muted-foreground select-description">{option.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Size</Label>
                      <Select value={aspectRatio} onValueChange={setAspectRatio}>
                        <SelectTrigger className="mt-2 bg-surface border-white/10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {aspectRatioOptions.map(option => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    className="btn-hero w-full sm:w-auto" 
                    onClick={() => handleGenerateImage()}
                    disabled={isGenerating || !prompt.trim()}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate Image"
                    )}
                  </Button>
                  <Button
                    className="btn-glass w-full sm:w-auto"
                    onClick={handleGenerateCustomImage}
                    disabled={isGenerating}
                  >
                    <Dice5 className="mr-2 h-4 w-4" />
                    Generate Custom Image
                  </Button>
                </div>

              </Card>

              {/* Output Panel */}
              <Card className="glass-card p-6 border-2 border-purple-600/30 hover:border-purple-500/60 transition-colors">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Generated Images</h3>
                    
                    {generatedImages.length === 0 ? (
                      <div className="text-center py-8 text-text-muted">
                        <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No images generated yet. Create your first image above!</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        {generatedImages.map((result) => (
                          <div key={result.id} className="relative group border-2 border-purple-600/30 hover:border-purple-500/60 rounded-lg transition-colors">
                            <img
                              src={result.url}
                              alt="Generated"
                              className="w-full h-48 object-cover rounded-lg"
                            />
                            
                            {/* Action Buttons */}
                            <div className="absolute bottom-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                size="sm" 
                                className="btn-glass"
                                onClick={() => downloadImage(result.url, `generated-${result.id}.webp`)}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                className="btn-glass"
                                onClick={() => copyImageUrl(result.url)}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button size="sm" className="btn-glass">
                                <Code className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="edit" className="mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Edit Input Panel */}
              <Card className="glass-card p-6 space-y-6 border-2 border-purple-600/30 hover:border-purple-500/60 transition-colors">
                <div className="space-y-4">
                  {/* Reference Image Upload */}
                  <div>
                    <Label htmlFor="reference-image">Reference Image (Required)</Label>
                    <div className="mt-2 border-2 border-dashed border-white/20 rounded-lg p-4 text-center">
                      <input
                        id="reference-image"
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                        className="hidden"
                      />
                      <label htmlFor="reference-image" className="cursor-pointer">
                        <Upload className="h-8 w-8 mx-auto mb-2 text-text-muted" />
                        <p className="text-sm text-text-muted">
                          {referenceImage ? referenceImage.name : "Click to upload reference image"}
                        </p>
                      </label>
                    </div>
                  </div>

                  
                  <div>
                    <Label htmlFor="edit-prompt">Prompt (What to change)</Label>
                    <Textarea
                      id="edit-prompt"
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      placeholder="Add a hat, change the background to a forest..."
                      className="mt-2 bg-surface border-white/10"
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Style/Mode</Label>
                      <Select value={editStyle} onValueChange={setEditStyle}>
                        <SelectTrigger className="mt-2 bg-surface border-white/10">
                          <SelectValue>
                            {editStyleOptions.find(option => option.id === editStyle)?.name}
                          </SelectValue>
                        </SelectTrigger>
                      <SelectContent>
                        {editStyleOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{option.name}</span>
                              <span className="text-xs text-muted-foreground select-description">{option.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label className={editStyle === 'seededit-3' ? 'text-muted-foreground' : ''}>
                        Size
                      </Label>
                      <Select
                        value={editAspectRatio}
                        onValueChange={setEditAspectRatio}
                        disabled={editStyle === 'seededit-3'}
                      >
                        <SelectTrigger className={`mt-2 bg-surface border-white/10 ${editStyle === 'seededit-3' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {aspectRatioOptions.map(option => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {editStyle === 'seededit-3' ? (
                      <div>
                        <Label>CFG Scale: {editCfgScale[0]}</Label>
                        <Slider
                          value={editCfgScale}
                          onValueChange={setEditCfgScale}
                          max={10}
                          min={1}
                          step={1}
                          className="mt-2"
                        />
                        <p className="text-xs text-text-muted mt-1">
                          Controls how closely the model follows your prompt
                        </p>
                      </div>
                    ) : (
                      <div>
                        <Label>Strength: {editStrength[0]}</Label>
                        <Slider
                          value={editStrength}
                          onValueChange={setEditStrength}
                          max={1}
                          min={0.1}
                          step={0.1}
                          className="mt-2"
                        />
                        <p className="text-xs text-text-muted mt-1">
                          Adjusts how closely the generated image aligns with the input prompt. A higher value enforces stronger adherence to the prompt, while a lower value allows for more creative freedom.
                        </p>
                      </div>
                    )}

                  </div>
                </div>
                
                <Button 
                  className="btn-hero w-full" 
                  onClick={handleEditImage}
                  disabled={isEditGenerating || !editPrompt.trim() || !referenceImage}
                >
                  {isEditGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Editing...
                    </>
                  ) : (
                    "Generate Image"
                  )}
                </Button>
              </Card>

              {/* Edit Output Panel */}
              <Card className="glass-card p-6 border-2 border-purple-600/30 hover:border-purple-500/60 transition-colors">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Edited Images</h3>
                  
                  {editedImages.length === 0 ? (
                    <div className="text-center py-8 text-text-muted">
                      <Edit className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No images edited yet. Upload an image and create your first edit above!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {editedImages.map((result) => (
                        <div key={result.id} className="relative group border-2 border-purple-600/30 hover:border-purple-500/60 rounded-lg transition-colors">
                          <img
                            src={result.url}
                            alt="Edited"
                            className="w-full h-48 object-cover rounded-lg"
                          />
                          
                          {/* Action Buttons */}
                          <div className="absolute bottom-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              size="sm" 
                              className="btn-glass"
                              onClick={() => downloadImage(result.url, `edited-${result.id}.webp`)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              className="btn-glass"
                              onClick={() => copyImageUrl(result.url)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button size="sm" className="btn-glass">
                              <Code className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="video" className="mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Video Input Panel */}
              <Card className="glass-card p-6 space-y-6 border-2 border-purple-600/30 hover:border-purple-500/60 transition-colors">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="video-prompt">Prompt</Label>
                    <Textarea
                      id="video-prompt"
                      value={videoPrompt}
                      onChange={(e) => setVideoPrompt(e.target.value)}
                      placeholder="Describe the scene you want to animate..."
                      className="mt-2 bg-surface border-white/10"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Style</Label>
                      <Select
                        value={videoModel}
                        onValueChange={(value) => {
                          setVideoModel(value);
                          const config = getVideoModelConfig(value);
                          const durations = Array.from(config.durations);

                          if (!durations.includes(videoDuration)) {
                            setVideoDuration(config.defaultDuration);
                          } else {
                            setVideoDuration(videoDuration);
                          }

                          setVideoFps(config.defaultFps);
                          setVideoGenerateAudio(config.supportsAudio ?? false);
                        }}
                      >
                        <SelectTrigger className="mt-2 bg-surface border-white/10 [&_span.select-description]:hidden">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {videoModelOptions.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{option.name}</span>
                                <span className="text-xs text-muted-foreground select-description">{option.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Duration (seconds)</Label>
                      <Select
                        value={videoDuration.toString()}
                        onValueChange={(value) => setVideoDuration(Number(value))}
                        disabled={availableVideoDurations.length <= 1}
                      >
                        <SelectTrigger className="mt-2 bg-surface border-white/10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableVideoDurations.map((durationOption) => (
                            <SelectItem key={durationOption} value={durationOption.toString()}>
                              {durationOption}s
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Frames per second</Label>
                      <Select
                        value={videoFps.toString()}
                        onValueChange={(value) => setVideoFps(Number(value))}
                        disabled={availableVideoFpsOptions.length <= 1}
                      >
                        <SelectTrigger className="mt-2 bg-surface border-white/10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableVideoFpsOptions.map((fpsOption) => (
                            <SelectItem key={fpsOption} value={fpsOption.toString()}>
                              {fpsOption} fps
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Size</Label>
                      <Select value={videoAspectRatio} onValueChange={setVideoAspectRatio}>
                        <SelectTrigger className="mt-2 bg-surface border-white/10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {aspectRatioOptions.map(option => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {supportsAudio && (
                    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-surface/60 px-4 py-3">
                      <div>
                        <Label className="text-sm">Generate Audio</Label>
                        <p className="text-xs text-text-muted mt-1">
                          Enable native audio when supported by the model.
                        </p>
                      </div>
                      <Switch
                        checked={videoGenerateAudio}
                        onCheckedChange={(checked) => setVideoGenerateAudio(checked)}
                      />
                    </div>
                  )}

                  <div>
                    <Label>Reference Frame (optional)</Label>
                    <input
                      ref={videoFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleVideoFileChange}
                    />
                    <div className="mt-2 border-2 border-dashed border-white/20 rounded-lg p-4 text-center flex flex-col items-center space-y-2">
                      {videoReferenceImage ? (
                        <>
                          <p className="text-sm text-text-muted">{videoReferenceImage.name}</p>
                          <div className="flex gap-2">
                            <Button size="sm" className="btn-glass" onClick={handleVideoFileButtonClick}>
                              <Upload className="mr-2 h-4 w-4" />
                              Change frame
                            </Button>
                            <Button size="sm" variant="ghost" className="text-text-muted" onClick={clearVideoReferenceImage}>
                              Clear
                            </Button>
                          </div>
                        </>
                      ) : (
                        <Button size="sm" className="btn-glass" onClick={handleVideoFileButtonClick}>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload reference image
                        </Button>
                      )}
                      <p className="text-xs text-text-muted">Add a starting frame to switch into image-to-video mode.</p>
                    </div>
                  </div>

                </div>

                <Button
                  className="btn-hero w-full"
                  onClick={handleGenerateVideo}
                  disabled={isVideoGenerating || !videoPrompt.trim()}
                >
                  {isVideoGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Generate Video"
                  )}
                </Button>
              </Card>

              {/* Video Output Panel */}
              <Card className="glass-card p-6 border-2 border-purple-600/30 hover:border-purple-500/60 transition-colors">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Generated Videos</h3>

                  {generatedVideos.length === 0 ? (
                    <div className="text-center py-8 text-text-muted">
                      <VideoIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Generated videos will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {generatedVideos.map((video) => {
                        const videoUrl = video.url;
                        const isPolling = activeVideoPolls.current.has(video.taskUUID);

                        return (
                          <div key={video.id} className="border-2 border-purple-600/30 hover:border-purple-500/60 rounded-lg overflow-hidden transition-colors">
                            <div className="aspect-video bg-black/80 flex items-center justify-center">
                              {videoUrl ? (
                                <video src={videoUrl} controls className="w-full h-full object-cover" />
                              ) : (
                                <div className="flex flex-col items-center justify-center py-10 space-y-2 text-text-muted">
                                  <Loader2 className="h-6 w-6 animate-spin" />
                                  <p className="text-sm capitalize">Processing... ({video.status})</p>
                                </div>
                              )}
                            </div>
                            <div className="p-4 space-y-3 text-sm">
                              <div className="flex flex-wrap gap-2">
                                {videoUrl && (
                                  <>
                                    <Button size="sm" className="btn-glass" onClick={() => downloadVideo(videoUrl, `runware-video-${video.id}.mp4`)}>
                                      <Download className="w-4 h-4 mr-1" />
                                      Download
                                    </Button>
                                    <Button size="sm" className="btn-glass" onClick={() => copyVideoUrl(videoUrl)}>
                                      <Copy className="w-4 h-4 mr-1" />
                                      Copy URL
                                    </Button>
                                  </>
                                )}
                                {video.status !== 'completed' && (
                                  <Button
                                    size="sm"
                                    className="btn-glass"
                                    onClick={() => pollVideoTask(video.taskUUID)}
                                    disabled={isPolling}
                                  >
                                    {isPolling ? (
                                      <>
                                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                        Polling...
                                      </>
                                    ) : (
                                      'Check status'
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
};
