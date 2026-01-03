import { Navigation } from "./Navigation";

interface LayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
}

export function Layout({ children, showNav = true }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 pb-20">
        <div className="max-w-md mx-auto w-full min-h-screen bg-background shadow-2xl shadow-black/5 overflow-hidden relative">
          {children}
        </div>
      </main>
      {showNav && <Navigation />}
    </div>
  );
}
