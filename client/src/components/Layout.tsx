import { Navigation } from "./Navigation";
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
          <div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
          >
            <img 
              src={surfTribeLogo} 
              alt="" 
              className="w-64 h-64 object-contain opacity-50"
            />
          </div>
          <div className="flex-1 overflow-y-auto relative z-[1]">
            {children}
          </div>
        </div>
      </main>
      {showNav && <Navigation />}
    </div>
  );
}
