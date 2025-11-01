import { Button } from "@/components/ui/button";
import { Clipboard, Download } from "lucide-react";
import { toast } from "sonner";

const downloadMedia = async (url: string, filename: string) => {
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
    toast.success('Download started');
  } catch (error) {
    toast.error('Failed to download');
  }
};

export const ShowcaseSection = () => {
  const showcaseItems = [
    {
      id: 1,
      url: "https://im.runware.ai/image/ws/2/ii/4deb10e8-1ef8-43f7-8510-d9f80ecd4d8d.jpg",
      title: "ivan aivazovsky inspired landscape",
      prompt: "A serene seascape with golden sunset light reflecting on calm waters, fishing boats resting in the harbor, painted in the romantic, luminous style of Ivan Aivazovsky, with intricate brushwork and glowing atmosphere"
    },
    {
      id: 2,
      url: "/van.png",
      title: "Van Gogh inspired desert image",
      prompt: "A Van Gogh–inspired oil painting of a desert caravan at sunset. A line of camels and travelers crosses the crest of a sandy hill, silhouetted against a glowing orange sun and a radiant sky of swirling pink, red, and blue brushstrokes. The sand dunes are textured with thick, expressive strokes of paint, capturing the rhythmic patterns of wind-swept terrain. The atmosphere is dreamlike, impressionistic, with vivid colors and dynamic swirling skies reminiscent of Van Gogh’s post-impressionist style"
    },
    {
      id: 3,
      url: "/desert.webp",
      title: "Arabian desert with Northern lights",
      prompt: "Cinematic shot of a desert caravan under a sky of auroras"
    },
    {
      id: 4,
      url: "https://vm.runware.ai/video/ws/5/vi/fdc99ac2-435f-460c-8e02-645c74c6b7eb.mp4",
      title: "Aerial Island motion video",
      prompt: "A sweeping aerial shot over a turquoise tropical sea as powerful waves crash against the cliffs of a lush green island. The camera glides low across the rolling surf, then rises to reveal palm trees swaying in the wind and golden sunlight breaking through drifting clouds. The sound of roaring ocean waves, seagulls calling overhead, and rustling palm leaves fills the scene, creating an epic yet peaceful atmosphere"
    },
    {
      id: 5,
      url: "/mountain.png",
      title: "Mountain made of glass",
      prompt: "A surreal landscape where mountains are made of glass and rivers flow with liquid gold, painted in a dreamy style"
    },
    {
      id: 6,
      url: "https://im.runware.ai/image/ws/2/ii/dbaa3eb8-9fc0-4de4-8414-45c361f6fd04.jpg",
      title: "Abstract",
      prompt: "An astronaut floating inside a giant hourglass in space, surrounded by stars and glowing dust, with galaxies swirling faintly above and golden sand below. Dreamy, surreal, cinematic"
    }
  ];

  return (
    <section id="showcase" className="py-20 bg-surface/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold gradient-text mb-4">Showcase Gallery</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {showcaseItems.map((item) => (
            <div key={item.id} className="glass-card group overflow-hidden">
              <div className="relative">
                {item.url.endsWith('.mp4') ? (
                  <video
                    src={item.url}
                    className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-105"
                    controls
                    loop
                    playsInline
                    onPlay={(event) => {
                      event.currentTarget.muted = false;
                      if (event.currentTarget.volume === 0) {
                        event.currentTarget.volume = 1;
                      }
                    }}
                  />
                ) : (
                  <img
                    src={item.url}
                    alt={item.title}
                    className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                )}
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                <div className="absolute bottom-4 right-4 text-right opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none group-hover:pointer-events-auto">
                  <h3 className="text-lg font-semibold mb-2 text-right">{item.title}</h3>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      className="btn-hero h-8 px-3 text-xs"
                      onClick={() => {
                        if (!item.prompt) {
                          return;
                        }
                        navigator.clipboard.writeText(item.prompt).then(() => {
                          toast.success("Prompt copied to clipboard!", {
                            description: item.title,
                          });
                        }).catch(() => {
                          toast.error("Failed to copy prompt");
                        });
                      }}
                      disabled={!item.prompt}
                    >
                      <Clipboard className="w-3 h-3 mr-1.5" />
                      Copy Prompt
                    </Button>
                    <Button
                      size="sm"
                      className="btn-glass h-8 px-3 text-xs"
                      onClick={() => {
                        const filename = `${item.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}${item.url.endsWith('.mp4') ? '.mp4' : '.jpg'}`;
                        void downloadMedia(item.url, filename);
                      }}
                    >
                      <Download className="w-3 h-3 mr-1.5" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
