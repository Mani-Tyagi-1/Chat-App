import { useRef, useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Image, Mic, Reply, Send, Smile, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";

const EMOJI_LIST = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇",
  "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚",
  "😋", "😛", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳",
  "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "😣", "😖", "😫",
  "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳",
  "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭",
  "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧",
  "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢",
  "👍", "👎", "👏", "🙌", "🤝", "👊", "✊", "🤛", "🤜", "🤞",
  "✌️", "🤟", "🤘", "👌", "🤌", "🤏", "👈", "👉", "👆", "👇",
  "☝️", "✋", "🤚", "🖐", "🖖", "👋", "🤙", "💪", "✍️", "🙏",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
  "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "🔥", "✨",
  "🌟", "💫", "💥", "💯", "🎉", "🎊", "🎈", "🎂", "☕", "🍕"
];

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentTimeRef = useRef<number>(0);
  const lastTouchTimeRef = useRef<number>(0);

  const {
    sendMessage,
    setTyping,
    selectedUser,
    selectedGroup,
    replyingTo,
    setReplyingTo,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Focus input whenever reply mode is activated
  useEffect(() => {
    if (replyingTo) {
      inputRef.current?.focus();
    }
  }, [replyingTo]);

  // Stop typing on unmount or chat switch
  useEffect(() => {
    return () => {
      if (isTypingRef.current) {
        setTyping(false);
        isTypingRef.current = false;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [selectedUser?._id, selectedGroup?._id, setTyping]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setText(value);

    if (value.trim()) {
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        setTyping(true);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        if (isTypingRef.current) {
          isTypingRef.current = false;
          setTyping(false);
        }
      }, 2000);
    } else {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        setTyping(false);
      }
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const addEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  // Voice Note Recording Handlers
  const startRecording = async () => {
    // Prevent ghost click / simultaneous activation right after sending a message
    if (Date.now() - lastSentTimeRef.current < 600) {
      return;
    }

    // Check if Secure Context or MediaDevices is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (!window.isSecureContext) {
        toast.error(
          "Microphone is blocked by Chrome because connection is HTTP. Open chrome://flags/#unsafely-treat-insecure-origin-as-secure in Chrome and add this URL to allow mic.",
          { duration: 6000 }
        );
      } else {
        toast.error("Microphone access is not supported on this browser.");
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn("Microphone access error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        toast.error("Microphone permission was denied. Please allow mic in browser settings.");
      } else {
        toast.error("Could not access microphone: " + (err.message || "Unknown error"));
      }
    }
  };

  const stopAndSendRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        await sendMessage({ audio: base64Audio });
      };
      reader.readAsDataURL(audioBlob);
    };

    mediaRecorderRef.current.stop();
    setIsRecording(false);
    setRecordingDuration(0);
  };

  const cancelRecording = () => {
    if (!mediaRecorderRef.current) return;
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    mediaRecorderRef.current.stop();
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingDuration(0);
    toast("Voice recording cancelled", { icon: "🗑️" });
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!text.trim() && !imagePreview) return;

    lastSentTimeRef.current = Date.now();
    const messageText = text.trim();
    const messageImage = imagePreview;

    // Clear input state immediately
    setText("");
    setImagePreview(null);
    setShowEmojiPicker(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    // Keep input focused so mobile virtual keypad stays open!
    inputRef.current?.focus();

    if (isTypingRef.current) {
      isTypingRef.current = false;
      setTyping(false);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      await sendMessage({ text: messageText, image: messageImage });
      inputRef.current?.focus();
    } catch (error) {
      console.log("Failed to send message", error);
    }
  };

  const handleFocus = () => {
    // Scroll chat messages to bottom when mobile keyboard pops up
    setTimeout(() => {
      const container = document.querySelector(".overflow-y-auto");
      if (container) {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      }
    }, 250);
  };

  const hasContent = Boolean(text.trim() || imagePreview);

  // Compute Reply Preview Label
  let replySenderName = "Message";
  let replyPreviewText = "Attachment";
  if (replyingTo) {
    const senderId =
      typeof replyingTo.senderId === "object"
        ? replyingTo.senderId._id
        : replyingTo.senderId;
    const isMe = senderId === authUser?._id;
    if (isMe) {
      replySenderName = "You";
    } else if (typeof replyingTo.senderId === "object" && replyingTo.senderId.fullName) {
      replySenderName = replyingTo.senderId.fullName;
    } else if (selectedUser) {
      replySenderName = selectedUser.fullName;
    }

    if (replyingTo.text) {
      replyPreviewText = replyingTo.text;
    } else if (replyingTo.audio) {
      replyPreviewText = "🎤 Voice note";
    } else if (replyingTo.image) {
      replyPreviewText = "📷 Photo";
    }
  }

  return (
    <div className="relative border-t border-base-300/60 bg-base-100/95 backdrop-blur-md shrink-0">
      {/* Floating Quoted Message Reply Banner */}
      {replyingTo && (
        <div className="px-3 py-2 flex items-center justify-between gap-3 bg-base-200/70 border-b border-base-300/50 animate-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center gap-2.5 overflow-hidden flex-1">
            <div className="w-1 h-8 bg-primary rounded-full shrink-0" />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[11px] font-semibold text-primary leading-tight flex items-center gap-1">
                <Reply className="size-3" />
                Replying to {replySenderName}
              </span>
              <span className="text-xs text-base-content/75 truncate mt-0.5">
                {replyPreviewText}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="btn btn-ghost btn-circle btn-xs text-base-content/50 hover:text-base-content shrink-0"
            title="Cancel reply"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Floating Emoji Picker Popover */}
      {showEmojiPicker && (
        <div className="absolute bottom-full left-2 right-2 sm:left-4 sm:w-80 bg-base-100 border border-base-300 rounded-2xl shadow-xl p-3 mb-2 z-40 max-h-56 overflow-y-auto">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-base-300/50">
            <span className="text-xs font-semibold text-base-content/70">Emojis</span>
            <button
              onClick={() => setShowEmojiPicker(false)}
              className="text-base-content/50 hover:text-base-content"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-8 gap-1 text-xl select-none">
            {EMOJI_LIST.map((emoji, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => addEmoji(emoji)}
                className="hover:scale-125 transition-transform p-1 rounded hover:bg-base-200"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Image Preview thumbnail */}
      {imagePreview && (
        <div className="p-2 px-3 sm:px-4 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl border border-primary/30 shadow-md"
            />
            <button
              onClick={removeImage}
              className="absolute -top-2 -right-2 size-5 rounded-full bg-base-300 text-base-content
              flex items-center justify-center hover:bg-error hover:text-white transition-colors"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      <div className="p-2 sm:p-3">
        {/* Active Audio Recording Mode */}
        {isRecording ? (
          <div className="flex items-center justify-between gap-3 bg-base-200/90 rounded-full px-4 py-2 border border-error/30 animate-in fade-in duration-150">
            <div className="flex items-center gap-2.5">
              <span className="size-3 bg-error rounded-full animate-ping" />
              <span className="text-xs font-semibold text-error">
                Recording {formatRecordingTime(recordingDuration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelRecording}
                className="btn btn-ghost btn-circle btn-sm text-error hover:bg-error/15"
                title="Cancel recording"
              >
                <Trash2 className="size-4" />
              </button>
              <button
                type="button"
                onClick={stopAndSendRecording}
                className="btn btn-primary btn-circle btn-sm shadow-sm"
                title="Send voice note"
              >
                <Send className="size-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Normal Message Input Mode */
          <form onSubmit={handleSendMessage} className="flex items-center gap-1.5 sm:gap-2">
            {/* Hidden file input */}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageChange}
            />

            {/* Emoji toggle button */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`btn btn-circle btn-sm sm:btn-md btn-ghost ${
                showEmojiPicker ? "text-primary" : "text-base-content/60"
              } hover:text-primary transition-colors`}
              title="Add emoji"
            >
              <Smile className="size-5" />
            </button>

            {/* Photo Attachment button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`btn btn-circle btn-sm sm:btn-md btn-ghost text-base-content/60 hover:text-primary transition-colors ${
                imagePreview ? "text-primary" : ""
              }`}
              title="Attach photo"
            >
              <Image className="size-5" />
            </button>

            {/* Text input field */}
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                className="w-full bg-base-200/80 hover:bg-base-200 focus:bg-base-100 border border-base-300/80 focus:border-primary rounded-full h-10 sm:h-11 px-4 text-sm focus:outline-none transition-all placeholder:text-base-content/40"
                placeholder="Type a message..."
                value={text}
                onChange={handleInputChange}
                onFocus={handleFocus}
              />
            </div>

            {/* Unified Stable Send / Mic Action Button (Prevents ghost tap crossover) */}
            <button
              type={hasContent ? "submit" : "button"}
              onMouseDown={(e) => e.preventDefault()}
              onTouchStart={(e) => {
                e.preventDefault();
                lastTouchTimeRef.current = Date.now();
                if (hasContent) {
                  handleSendMessage();
                } else {
                  startRecording();
                }
              }}
              onClick={(e) => {
                e.preventDefault();
                if (Date.now() - lastTouchTimeRef.current < 500) {
                  return; // Ignored on touch devices where onTouchStart already handled it
                }
                if (hasContent) {
                  handleSendMessage();
                } else {
                  startRecording();
                }
              }}
              className={`size-10 sm:size-11 rounded-full flex items-center justify-center transition-all duration-150 shrink-0 cursor-pointer ${
                hasContent
                  ? "bg-primary text-primary-content shadow-md shadow-primary/25 scale-100 hover:scale-105 active:scale-95"
                  : "btn btn-circle btn-sm sm:btn-md btn-ghost text-base-content/70 hover:text-primary hover:bg-primary/10"
              }`}
              aria-label={hasContent ? "Send message" : "Record voice note"}
              title={hasContent ? "Send message" : "Record voice note"}
            >
              {hasContent ? (
                <Send className="size-4 sm:size-5 translate-x-0.5" />
              ) : (
                <Mic className="size-5" />
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default MessageInput;
