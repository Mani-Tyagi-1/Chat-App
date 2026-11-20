import { useEffect, useState } from 'react';
import ChatContainer from '../components/ChatContainer';
import NoChatSelected from '../components/NoChatSelected';
import Sidebar from '../components/Sidebar';
import { useChatStore } from '../store/useChatStore';

const HomePage = () => {
  const { selectedUser, selectedGroup } = useChatStore();
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const isChatOpen = Boolean(selectedUser || selectedGroup);

  // Dynamically track visual viewport height when mobile keyboard opens/closes
  useEffect(() => {
    const updateHeight = () => {
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
      }
    };

    updateHeight();
    window.visualViewport?.addEventListener("resize", updateHeight);
    window.visualViewport?.addEventListener("scroll", updateHeight);

    return () => {
      window.visualViewport?.removeEventListener("resize", updateHeight);
      window.visualViewport?.removeEventListener("scroll", updateHeight);
    };
  }, []);

  return (
    <div
      style={viewportHeight ? { height: `${viewportHeight}px` } : undefined}
      className={`fixed top-0 left-0 right-0 md:static md:h-screen bg-base-200 overflow-hidden ${
        isChatOpen ? "pt-0 md:pt-20" : "pt-16 md:pt-20"
      }`}
    >
      <div className="flex items-center justify-center h-full md:px-4">
        <div className="bg-base-100 md:rounded-lg shadow-cl w-full max-w-7xl h-full md:h-[calc(100vh-6rem)] flex flex-col overflow-hidden">
          <div className="flex h-full md:rounded-lg overflow-hidden">
            {/* On mobile: show Sidebar only when no chat is open. On md+: always show Sidebar */}
            <div
              className={`h-full ${
                isChatOpen ? "hidden md:flex" : "flex w-full md:w-auto"
              }`}
            >
              <Sidebar />
            </div>

            {/* On mobile: show Chat only when chat is open. On md+: show Chat or NoChatSelected */}
            <div
              className={`h-full flex-1 ${
                !isChatOpen ? "hidden md:flex" : "flex"
              }`}
            >
              {!isChatOpen ? <NoChatSelected /> : <ChatContainer />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
