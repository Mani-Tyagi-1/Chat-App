import { ArrowLeft, Search, Users, Volume2, VolumeX, X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { sound } from "../lib/sound";
import { useState } from "react";

const ChatHeader = () => {
  const {
    selectedUser,
    selectedGroup,
    setSelectedUser,
    setSelectedGroup,
    typingUsers,
    chatSearchQuery,
    setChatSearchQuery,
    isSearchOpen,
    setIsSearchOpen,
  } = useChatStore();
  const { onlineUsers } = useAuthStore() as { onlineUsers: string[] };
  const [soundEnabled, setSoundEnabled] = useState(sound.isEnabled());

  if (!selectedUser && !selectedGroup) return null;

  const isOnline = selectedUser ? onlineUsers?.includes(selectedUser._id) : false;
  const isTyping = selectedUser ? typingUsers[selectedUser._id] : false;

  const title = selectedGroup ? selectedGroup.name : selectedUser?.fullName;
  const avatar = selectedGroup
    ? selectedGroup.groupPic || "/avatar.png"
    : selectedUser?.profilePic || "/avatar.png";

  const closeChat = () => {
    setSelectedUser(null);
    setSelectedGroup(null);
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    sound.setEnabled(next);
    setSoundEnabled(next);
    if (next) sound.playReceive();
  };

  return (
    <div className="border-b border-base-300/60 bg-base-100/95 backdrop-blur-md shrink-0">
      <div className="px-3 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Back button for mobile */}
          <button
            onClick={closeChat}
            className="btn btn-ghost btn-circle btn-sm md:hidden -ml-1 text-base-content/80 hover:text-base-content"
            title="Back to conversations"
          >
            <ArrowLeft className="size-5" />
          </button>

          {/* Avatar with status ring */}
          <div className="avatar">
            <div className="size-9 sm:size-10 rounded-full relative">
              <img
                src={avatar}
                alt={title || "avatar"}
                className="rounded-full object-cover"
              />
              {selectedUser && isOnline && (
                <span className="absolute bottom-0 right-0 size-2.5 bg-green-500 rounded-full ring-2 ring-base-100" />
              )}
            </div>
          </div>

          {/* User / Group name & status info */}
          <div>
            <h3 className="font-semibold text-sm sm:text-base leading-tight tracking-tight flex items-center gap-1.5">
              <span>{title}</span>
              {selectedGroup && (
                <span className="badge badge-xs badge-primary/20 text-primary border-none font-semibold">
                  Group
                </span>
              )}
            </h3>
            {selectedGroup ? (
              <p className="text-xs text-base-content/60 flex items-center gap-1 mt-0.5">
                <Users className="size-3" />
                <span>{selectedGroup.members?.length || 0} members</span>
              </p>
            ) : isTyping ? (
              <p className="text-xs text-primary font-medium flex items-center gap-1.5 animate-pulse">
                <span className="size-1.5 bg-primary rounded-full animate-ping" />
                typing...
              </p>
            ) : (
              <p className="text-xs text-base-content/60 flex items-center gap-1 mt-0.5">
                <span
                  className={`inline-block size-1.5 rounded-full ${
                    isOnline ? "bg-green-500" : "bg-zinc-400"
                  }`}
                />
                {isOnline ? "Online" : "Offline"}
              </p>
            )}
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-1">
          {/* Sound Mute/Unmute */}
          <button
            onClick={toggleSound}
            className={`btn btn-ghost btn-circle btn-sm ${
              soundEnabled ? "text-base-content/70" : "text-base-content/30"
            }`}
            title={soundEnabled ? "Mute sounds" : "Enable sounds"}
          >
            {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
          </button>

          {/* Search messages in chat */}
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={`btn btn-ghost btn-circle btn-sm ${
              isSearchOpen ? "text-primary bg-primary/10" : "text-base-content/70"
            }`}
            title="Search in conversation"
          >
            <Search className="size-4" />
          </button>

          {/* Close button (desktop only) */}
          <button
            onClick={closeChat}
            className="btn btn-ghost btn-circle btn-sm hidden md:flex text-base-content/70 hover:text-base-content"
            title="Close chat"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      {/* Slide-down In-Chat Search Bar */}
      {isSearchOpen && (
        <div className="px-3 py-2 bg-base-200/70 border-t border-base-300/50 flex items-center gap-2">
          <Search className="size-4 text-base-content/50" />
          <input
            type="text"
            placeholder="Search messages in this chat..."
            value={chatSearchQuery}
            onChange={(e) => setChatSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-base-content/40"
            autoFocus
          />
          {chatSearchQuery && (
            <button
              onClick={() => setChatSearchQuery("")}
              className="text-base-content/50 hover:text-base-content"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
export default ChatHeader;
