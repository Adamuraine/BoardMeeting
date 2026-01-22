import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Share, Plus } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isInStandaloneMode = window.matchMedia("(display-mode: standalone)").matches || 
                              (window.navigator as any).standalone === true;

  useEffect(() => {
    if (isInStandaloneMode) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, [isInStandaloneMode]);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  if (isInstalled) {
    return null;
  }

  return (
    <>
      <Button
        onClick={handleInstallClick}
        className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold"
        data-testid="button-install-app"
      >
        <Download className="w-5 h-5 mr-2" />
        Add Board Meeting to Home Screen
      </Button>

      <Dialog open={showIOSInstructions} onOpenChange={setShowIOSInstructions}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">Add to Home Screen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold">1</span>
              </div>
              <div>
                <p className="text-sm">
                  Tap the <Share className="inline w-4 h-4 mx-1" /> <strong>Share</strong> button at the bottom of Safari
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold">2</span>
              </div>
              <div>
                <p className="text-sm">
                  Scroll down and tap <Plus className="inline w-4 h-4 mx-1" /> <strong>Add to Home Screen</strong>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold">3</span>
              </div>
              <div>
                <p className="text-sm">
                  Tap <strong>Add</strong> in the top right corner
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center pt-2">
              Board Meeting will appear on your home screen like a regular app!
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
