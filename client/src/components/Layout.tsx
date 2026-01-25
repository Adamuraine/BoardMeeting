import { Navigation } from "./Navigation";
import { useState } from "react";
import { QrCode, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
  showHeader?: boolean;
}

export function Layout({ children, showNav = true, showHeader = true }: LayoutProps) {
  const [showQR, setShowQR] = useState(false);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <main className="flex-1 overflow-hidden">
        <div className="max-w-md mx-auto w-full h-full bg-background shadow-2xl shadow-black/5 overflow-hidden relative flex flex-col">
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
          
          {/* QR Code Share Button - Top Right */}
          <button
            className="absolute top-2 right-2 flex flex-col items-center gap-0.5 z-50"
            onClick={() => setShowQR(true)}
            data-testid="button-show-qr"
          >
            <img 
              src="/boardmeeting-qr-code.png" 
              alt="Share App" 
              className="w-8 h-8 rounded shadow border border-border bg-white"
            />
            <span className="text-[8px] font-medium text-muted-foreground">Share</span>
          </button>
          
          {/* QR Code Modal */}
          {showQR && (
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
              onClick={() => setShowQR(false)}
            >
              <div 
                className="bg-card rounded-2xl p-6 max-w-xs w-full text-center shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => setShowQR(false)}
                  data-testid="button-close-qr"
                >
                  <X className="w-5 h-5" />
                </Button>
                <h3 className="font-bold text-lg mb-2">Share Board Meeting</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Scan to join the surf community!
                </p>
                <img 
                  src="/boardmeeting-qr-code.png" 
                  alt="Board Meeting QR Code" 
                  className="w-48 h-48 mx-auto rounded-lg"
                  data-testid="img-qr-code-modal"
                />
                <p className="text-xs text-muted-foreground mt-3 mb-4">boardmeetingsurf.com</p>
                <a
                  href="/boardmeeting-qr-code.png"
                  download="boardmeeting-qr-code.png"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  data-testid="link-download-qr-modal"
                >
                  <Download className="w-4 h-4" />
                  Download QR Code
                </a>
              </div>
            </div>
          )}
        </div>
      </main>
      {showNav && <Navigation />}
    </div>
  );
}
