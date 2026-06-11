import { ReactNode, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { useSimulation } from '@/hooks/useSimulation';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  useSimulation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  const isFullScreenRoute = location.pathname === '/scan';

  if (isFullScreenRoute) {
    return (
      <div className="h-screen w-screen overflow-hidden">
        {children}
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden text-slate-100">
      <Header />
      <div className="flex-1 flex overflow-hidden min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-hidden min-w-0 flex flex-col relative">
          <div
            className="absolute inset-0 pointer-events-none z-0 opacity-70"
            style={{
              background:
                'radial-gradient(circle at 15% 20%, rgba(14,165,233,0.08), transparent 45%), radial-gradient(circle at 85% 80%, rgba(139,92,246,0.08), transparent 45%)',
            }}
          />
          <div className="flex-1 overflow-auto custom-scrollbar relative z-10">
            {children}
          </div>
        </main>
      </div>
      <StatusBar />
    </div>
  );
}
