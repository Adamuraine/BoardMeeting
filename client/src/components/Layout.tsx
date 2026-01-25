import { Navigation } from "./Navigation";

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
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </main>
      {showNav && <Navigation />}
    </div>
  );
}
