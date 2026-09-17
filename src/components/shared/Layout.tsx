import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { SmoothScrollProvider } from './SmoothScrollProvider';

export function Layout() {
  return (
    <SmoothScrollProvider>
      <div className="min-h-[100dvh] flex flex-col bg-[#FAF9F6] text-[#222528]">
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
    </SmoothScrollProvider>
  );
}
