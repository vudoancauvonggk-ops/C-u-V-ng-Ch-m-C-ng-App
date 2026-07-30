import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Tab } from './types';
import { MainContent } from './MainContent';
import { AIChatBubble } from './AIChatBubble';
import { MobileHeader, MobileNav, MobileDrawer } from './MobileLayout';

interface OfficeAppContainerProps {
  currentUser?: any;
  hasPermission?: (perm: string) => boolean;
}

export default function OfficeAppContainer({ currentUser, hasPermission }: OfficeAppContainerProps) {
  const [activeTab, setActiveTab] = useState<Tab>('command-center');
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  useEffect(() => {
    // Detect mobile viewport
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    // No-op or custom action since integrated inside parent admin dashboard
  };

  return (
    <div className="flex w-full min-w-0 h-[calc(100vh-100px)] bg-slate-50 text-slate-900 font-sans overflow-hidden border border-slate-100 rounded-3xl mt-2 relative">
      {!isMobile && (
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          onLogout={handleLogout} 
          currentUser={currentUser}
          hasPermission={hasPermission}
        />
      )}
      <main className={`flex-1 flex flex-col h-full overflow-y-auto relative ${isMobile ? 'pb-16' : ''}`}>
        {isMobile && (
          <MobileHeader 
            activeTab={activeTab} 
            onLogout={handleLogout} 
            onMenuOpen={() => setIsDrawerOpen(true)} 
          />
        )}
        <MainContent activeTab={activeTab} />
      </main>

      {isMobile && (
        <MobileNav 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          onMoreClick={() => setIsDrawerOpen(true)} 
        />
      )}

      {isMobile && (
        <MobileDrawer 
          isOpen={isDrawerOpen} 
          onClose={() => setIsDrawerOpen(false)} 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          onLogout={handleLogout}
        />
      )}

      <AIChatBubble />
    </div>
  );
}
