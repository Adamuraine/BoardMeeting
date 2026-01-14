import { Navigation } from "./Navigation";
import { Link } from "wouter";
import surfTribeLogo from "@assets/IMG_3279_1768282938756.jpeg";

interface LayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
  showHeader?: boolean;
}

export function Layout({ children, showNav = true, showHeader = true }: LayoutProps) {
  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <main className="flex-1 overflow-hidden">
        <div className="max-w-md mx-auto w-full h-full bg-background shadow-2xl shadow-black/5 overflow-hidden relative flex flex-col">
          {showHeader && (
            <header className="flex items-center justify-center p-2 border-b bg-background/80 backdrop-blur sticky top-0 z-10">
              <Link href="/home" data-testid="link-logo-home">
                <img 
                  src={surfTribeLogo} 
                  alt="SurfTribe" 
                  className="h-10 w-auto object-contain"
                />
              </Link>
            </header>
          )}
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </main>
      {showNav && <Navigation />}
    </div>
  );
}
