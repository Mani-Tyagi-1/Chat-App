import { useChatStore, type Message } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import {
  Copy,
  Pause,
  Play,
  Reply,
  Smile,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "🎉"];

function isSameDay(d1: string | Date, d2: string | Date) {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function formatDateDivider(date: string | Date) {
  const d = new Date(date);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

// Inline Audio Message Player Component
const AudioMessagePlayer = ({ audioUrl, isMe }: { audioUrl: string; isMe: boolean }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const formatAudioTime = (seconds: number) => {
    if (isNaN(seconds) || seconds <= 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="flex items-center gap-2.5 py-1 px-1 min-w-[200px] sm:min-w-[230px]">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <button
        type="button"
        onClick={togglePlay}
        className={`size-8 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-xs ${
          isMe
            ? "bg-primary-content text-primary"
            : "bg-primary text-primary-content"
        }`}
      >
        {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 translate-x-0.5" />}
      </button>

      <div className="flex-1 flex flex-col gap-1">
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="range range-xs accent-primary w-full h-1"
        />
        <div className="flex justify-between text-[10px] opacity-75 leading-none">
          <span>{formatAudioTime(currentTime)}</span>
          <span>{formatAudioTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    selectedGroup,
    typingUsers,
    deleteMessage,
    reactToMessage,
    setReplyingTo,
    chatSearchQuery,
  } = useChatStore();
  const { authUser } = useAuthStore() as { authUser: { _id: string; profilePic?: string } };
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  // Active message selected for Reaction or Action sheet (works on mobile tap + desktop)
  const [selectedActionMessage, setSelectedActionMessage] = useState<Message | null>(null);

  useEffect(() => {
    if (selectedUser?._id) {
      getMessages(selectedUser._id);
    } else if (selectedGroup?._id) {
      getMessages(selectedGroup._id);
    }
  }, [selectedUser?._id, selectedGroup?._id, getMessages]);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior,
      });
    }
  };

  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages, typingUsers, selectedUser, selectedGroup]);

  useEffect(() => {
    const handleResize = () => {
      scrollToBottom("auto");
      setTimeout(() => scrollToBottom("smooth"), 100);
      setTimeout(() => scrollToBottom("smooth"), 300);
    };

    window.visualViewport?.addEventListener("resize", handleResize);
    window.addEventListener("resize", handleResize);

    return () => {
      window.visualViewport?.removeEventListener("resize", handleResize);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleCopyText = (text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
    setSelectedActionMessage(null);
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
    setSelectedActionMessage(null);
  };

  const handleDelete = (messageId: string) => {
    deleteMessage(messageId);
    setSelectedActionMessage(null);
  };

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  // Filter messages for search if query is active
  const filteredMessages = messages.filter((m) => {
    if (!chatSearchQuery.trim()) return true;
    return m.text?.toLowerCase().includes(chatSearchQuery.toLowerCase());
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-base-100 relative">
      <ChatHeader />

      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-3 py-2 sm:px-4 sm:py-3 pb-6 space-y-1 bg-base-200/40"
      >
        {chatSearchQuery && (
          <div className="text-center text-xs text-base-content/60 py-2">
            Found {filteredMessages.length} message(s) matching "{chatSearchQuery}"
          </div>
        )}

        <div className="space-y-1">
          {filteredMessages.map((message, index) => {
            const senderId =
              typeof message.senderId === "object"
                ? message.senderId._id
                : message.senderId;
            const isMe = senderId === authUser._id;
            const prevMessage = filteredMessages[index - 1];
            const nextMessage = filteredMessages[index + 1];

            const prevSenderId =
              prevMessage &&
              (typeof prevMessage.senderId === "object"
                ? prevMessage.senderId._id
                : prevMessage.senderId);
            const nextSenderId =
              nextMessage &&
              (typeof nextMessage.senderId === "object"
                ? nextMessage.senderId._id
                : nextMessage.senderId);

            const showDateDivider =
              index === 0 || !isSameDay(message.createdAt, prevMessage.createdAt);

            const isFirstInGroup =
              !prevMessage ||
              prevSenderId !== senderId ||
              showDateDivider;

            const isLastInGroup =
              !nextMessage ||
              nextSenderId !== senderId ||
              !isSameDay(message.createdAt, nextMessage.createdAt);

            // Group reactions by emoji: { "❤️": 2, "👍": 1 }
            const reactionCounts = (message.reactions || []).reduce(
              (acc: Record<string, number>, r) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                return acc;
              },
              {}
            );
            const hasReactions = Object.keys(reactionCounts).length > 0;

            const senderAvatar =
              (typeof message.senderId === "object"
                ? message.senderId.profilePic
                : selectedUser?.profilePic) || "/avatar.png";

            const senderName =
              typeof message.senderId === "object"
                ? message.senderId.fullName
                : selectedUser?.fullName || "Member";

            return (
              <div key={message._id} id={`msg-${message._id}`}>
                {showDateDivider && (
                  <div className="flex justify-center my-3">
                    <span className="bg-base-300/80 text-base-content/70 text-[11px] font-medium px-3 py-1 rounded-full shadow-xs backdrop-blur-xs border border-base-content/5">
                      {formatDateDivider(message.createdAt)}
                    </span>
                  </div>
                )}

                <div
                  className={`group relative flex items-end gap-1.5 ${
                    isMe ? "justify-end" : "justify-start"
                  } ${isFirstInGroup ? "mt-2.5" : "mt-0.5"} ${hasReactions ? "mb-3.5" : ""}`}
                >
                  {/* Avatar for incoming messages */}
                  {!isMe && (
                    <div className="size-7 shrink-0">
                      {isLastInGroup ? (
                        <img
                          src={senderAvatar}
                          alt="avatar"
                          className="size-7 rounded-full object-cover border border-base-300/80"
                        />
                      ) : (
                        <div className="size-7" />
                      )}
                    </div>
                  )}

                  {/* Desktop Hover Trigger (Mobile uses direct tap on bubble) */}
                  <div
                    className={`hidden sm:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${
                      isMe ? "order-first" : "order-last"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setReplyingTo(message)}
                      className="btn btn-ghost btn-circle btn-xs text-base-content/50 hover:text-base-content"
                      title="Reply"
                    >
                      <Reply className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedActionMessage(message)}
                      className="btn btn-ghost btn-circle btn-xs text-base-content/50 hover:text-base-content"
                      title="Options & Reactions"
                    >
                      <Smile className="size-3.5" />
                    </button>
                  </div>

                  {/* Bubble body - Tapping opens Reaction & Action Sheet on Mobile & Desktop */}
                  <div
                    onClick={() => setSelectedActionMessage(message)}
                    className={`relative flex flex-col max-w-[82%] sm:max-w-[70%] px-3.5 py-2 shadow-xs transition-all cursor-pointer active:scale-[0.98] ${
                      isMe
                        ? `bg-primary text-primary-content ${
                            isLastInGroup ? "rounded-2xl rounded-br-xs" : "rounded-2xl"
                          }`
                        : `bg-base-200 text-base-content border border-base-300/60 ${
                            isLastInGroup ? "rounded-2xl rounded-bl-xs" : "rounded-2xl"
                          }`
                    }`}
                  >
                    {/* In Group Chat: Display Sender Name on incoming messages */}
                    {selectedGroup && !isMe && isFirstInGroup && (
                      <span className="text-[11px] font-bold text-primary mb-1 block leading-none">
                        {senderName}
                      </span>
                    )}

                    {/* Quoted Message Preview Header */}
                    {message.replyTo && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          const elem = document.getElementById(`msg-${message.replyTo?._id}`);
                          if (elem) {
                            elem.scrollIntoView({ behavior: "smooth", block: "center" });
                            elem.classList.add("ring-2", "ring-primary", "rounded-2xl");
                            setTimeout(() => {
                              elem.classList.remove("ring-2", "ring-primary", "rounded-2xl");
                            }, 1500);
                          }
                        }}
                        className={`mb-1.5 p-1.5 px-2.5 rounded-lg border-l-4 text-xs cursor-pointer select-none transition-all hover:opacity-90 ${
                          isMe
                            ? "bg-black/20 border-white/80 text-white"
                            : "bg-base-300/80 border-primary text-base-content"
                        }`}
                      >
                        <span className="font-semibold text-[11px] block leading-tight">
                          {typeof message.replyTo.senderId === "object"
                            ? message.replyTo.senderId._id === authUser._id
                              ? "You"
                              : message.replyTo.senderId.fullName
                            : message.replyTo.senderId === authUser._id
                            ? "You"
                            : "Quoted message"}
                        </span>
                        <span className="text-[11px] opacity-80 truncate block mt-0.5">
                          {message.replyTo.text ||
                            (message.replyTo.audio ? "🎤 Voice note" : "📷 Photo")}
                        </span>
                      </div>
                    )}

                    {/* Photo attachment */}
                    {message.image && (
                      <img
                        src={message.image}
                        alt="Attachment"
                        className="max-w-[200px] sm:max-w-[260px] rounded-lg mb-1.5 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(message.image, "_blank");
                        }}
                      />
                    )}

                    {/* Audio Voice Note attachment */}
                    {message.audio && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <AudioMessagePlayer audioUrl={message.audio} isMe={isMe} />
                      </div>
                    )}

                    {/* Text content & timestamp */}
                    <div className="flex items-end justify-between gap-3 flex-wrap">
                      {message.text && (
                        <p className="text-[14px] leading-relaxed break-words flex-1 select-text">
                          {message.text}
                        </p>
                      )}
                      <div
                        className={`flex items-center gap-1.5 text-[10px] select-none shrink-0 self-end ml-auto pt-1 ${
                          isMe ? "text-primary-content/75" : "text-base-content/50"
                        }`}
                      >
                        <span>{formatMessageTime(message.createdAt)}</span>
                        {isMe && (
                          <span
                            className="inline-flex items-center justify-center size-3 select-none"
                            title={message.seen ? "Seen by recipient" : "Sent"}
                          >
                            {message.seen ? (
                              <span className="relative flex size-2 items-center justify-center">
                                <span className="absolute inline-flex size-3 rounded-full bg-cyan-400/40 animate-pulse" />
                                <span className="relative inline-flex size-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_#38bdf8,0_0_12px_#0284c7]" />
                              </span>
                            ) : (
                              <span className="size-1.5 rounded-full bg-primary-content/40 ring-1 ring-primary-content/20" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Displayed reactions badge on bubble */}
                    {hasReactions && (
                      <div
                        className={`absolute -bottom-3 ${
                          isMe ? "right-2" : "left-2"
                        } inline-flex items-center gap-1 bg-base-100 border border-base-300/80 text-base-content text-xs font-semibold px-2 py-0.5 rounded-full shadow-md z-10 select-none`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedActionMessage(message);
                        }}
                      >
                        {Object.entries(reactionCounts).map(([emoji, count]) => (
                          <span key={emoji} className="flex items-center gap-0.5">
                            <span className="text-sm">{emoji}</span>
                            {count > 1 && (
                              <span className="text-[10px] text-base-content/70 font-bold">
                                {count}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Animated typing bubble */}
          {selectedUser && typingUsers[selectedUser._id] && (
            <div className="flex items-end gap-1.5 justify-start mt-2">
              <div className="size-7 shrink-0">
                <img
                  src={selectedUser.profilePic || "/avatar.png"}
                  alt="avatar"
                  className="size-7 rounded-full object-cover border border-base-300/80"
                />
              </div>
              <div className="bg-base-200 border border-base-300/60 rounded-2xl rounded-bl-xs px-3.5 py-2.5 shadow-xs flex items-center gap-1.5">
                <span className="size-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="size-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="size-2 bg-primary rounded-full animate-bounce" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile & Desktop Message Action Bottom Sheet */}
      {selectedActionMessage && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedActionMessage(null)}
        >
          <div
            className="w-full sm:max-w-xs bg-base-100 rounded-t-3xl sm:rounded-2xl p-4 shadow-2xl border border-base-300 space-y-4 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Quick Reaction Emojis */}
            <div>
              <p className="text-xs font-semibold text-base-content/50 mb-2 px-1">Add Reaction</p>
              <div className="flex items-center justify-between bg-base-200/80 rounded-2xl py-2 px-2">
                {REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      reactToMessage(selectedActionMessage._id, emoji);
                      setSelectedActionMessage(null);
                    }}
                    className="text-2xl hover:scale-125 active:scale-95 transition-transform p-1 rounded-xl hover:bg-base-300"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions list */}
            <div className="space-y-1">
              <button
                onClick={() => handleReply(selectedActionMessage)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-base-200 text-sm font-medium transition-colors"
              >
                <Reply className="size-4 text-primary" />
                <span>Reply to Message</span>
              </button>

              {selectedActionMessage.text && (
                <button
                  onClick={() => handleCopyText(selectedActionMessage.text)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-base-200 text-sm font-medium transition-colors"
                >
                  <Copy className="size-4 text-primary" />
                  <span>Copy Message Text</span>
                </button>
              )}

              {(typeof selectedActionMessage.senderId === "object"
                ? selectedActionMessage.senderId._id
                : selectedActionMessage.senderId) === authUser._id && (
                <button
                  onClick={() => handleDelete(selectedActionMessage._id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-error/15 text-error text-sm font-medium transition-colors"
                >
                  <Trash2 className="size-4" />
                  <span>Delete for Everyone</span>
                </button>
              )}
            </div>

            {/* Cancel button */}
            <button
              onClick={() => setSelectedActionMessage(null)}
              className="btn btn-ghost btn-sm w-full rounded-xl sm:hidden text-base-content/60"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <MessageInput />
    </div>
  );
};
export default ChatContainer;
