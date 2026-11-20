import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import { sound } from "../lib/sound";

export type Reaction = {
  userId: string;
  emoji: string;
};

export type Message = {
  _id: string;
  senderId: string | { _id: string; fullName: string; profilePic?: string };
  receiverId?: string;
  groupId?: string;
  text?: string;
  image?: string;
  audio?: string;
  replyTo?: {
    _id: string;
    text?: string;
    image?: string;
    audio?: string;
    senderId?: string | { _id: string; fullName: string };
    createdAt?: string;
  } | null;
  reactions?: Reaction[];
  seen?: boolean;
  createdAt: string;
};

export type ChatUser = {
  _id: string;
  fullName: string;
  name?: string;
  email?: string;
  profilePic?: string;
  lastMessage?: {
    _id?: string;
    text?: string;
    image?: string;
    audio?: string;
    senderId?: string;
    createdAt?: string;
  } | null;
  unreadCount?: number;
};

export type Group = {
  _id: string;
  name: string;
  description?: string;
  groupPic?: string;
  admin: ChatUser | string;
  members: ChatUser[];
  isGroup: true;
  lastMessage?: {
    _id?: string;
    text?: string;
    image?: string;
    audio?: string;
    senderId?: string | ChatUser;
    createdAt?: string;
  } | null;
  createdAt?: string;
};

type ChatStoreState = {
  messages: Message[];
  users: ChatUser[];
  groups: Group[];
  selectedUser: ChatUser | null;
  selectedGroup: Group | null;
  replyingTo: Message | null;
  isUsersLoading: boolean;
  isGroupsLoading: boolean;
  isMessagesLoading: boolean;
  typingUsers: Record<string, boolean>;
  chatSearchQuery: string;
  isSearchOpen: boolean;

  setChatSearchQuery: (query: string) => void;
  setIsSearchOpen: (open: boolean) => void;
  setReplyingTo: (message: Message | null) => void;
  setSelectedUser: (selectedUser: ChatUser | null) => void;
  setSelectedGroup: (selectedGroup: Group | null) => void;

  getUsers: () => Promise<void>;
  getGroups: () => Promise<void>;
  createGroup: (data: {
    name: string;
    description?: string;
    memberIds: string[];
    groupPic?: string;
  }) => Promise<Group | null>;

  getMessages: (targetId: string) => Promise<void>;
  sendMessage: (messageData: {
    text?: string;
    image?: string | null;
    audio?: string | null;
    replyToId?: string;
  }) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  reactToMessage: (messageId: string, emoji: string) => Promise<void>;

  subscribeToMessages: () => void;
  unsubscribeFromMessages: () => void;
  setTyping: (isTyping: boolean) => void;
};

export const useChatStore = create<ChatStoreState>((set, get) => ({
  messages: [],
  users: [],
  groups: [],
  selectedUser: null,
  selectedGroup: null,
  replyingTo: null,
  isUsersLoading: false,
  isGroupsLoading: false,
  isMessagesLoading: false,
  typingUsers: {},
  chatSearchQuery: "",
  isSearchOpen: false,

  setChatSearchQuery: (query: string) => set({ chatSearchQuery: query }),
  setIsSearchOpen: (open: boolean) =>
    set({ isSearchOpen: open, chatSearchQuery: open ? get().chatSearchQuery : "" }),
  setReplyingTo: (message: Message | null) => set({ replyingTo: message }),

  setSelectedUser: (selectedUser) => {
    if (selectedUser) {
      set((state) => ({
        selectedUser,
        selectedGroup: null,
        replyingTo: null,
        chatSearchQuery: "",
        isSearchOpen: false,
        users: state.users.map((u) =>
          u._id === selectedUser._id ? { ...u, unreadCount: 0 } : u
        ),
      }));

      // Immediately notify server that all unread messages from this user have been seen
      const socket = (useAuthStore.getState() as { socket: any }).socket;
      if (socket) {
        socket.emit("markAsSeen", { senderId: selectedUser._id });
      }
    } else {
      set({ selectedUser: null, replyingTo: null, chatSearchQuery: "", isSearchOpen: false });
    }
  },

  setSelectedGroup: (selectedGroup) => {
    if (selectedGroup) {
      set({
        selectedGroup,
        selectedUser: null,
        replyingTo: null,
        chatSearchQuery: "",
        isSearchOpen: false,
      });
    } else {
      set({ selectedGroup: null, replyingTo: null, chatSearchQuery: "", isSearchOpen: false });
    }
  },

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getGroups: async () => {
    set({ isGroupsLoading: true });
    try {
      const res = await axiosInstance.get("/groups");
      set({ groups: res.data });
    } catch (error: any) {
      console.log("Failed to load groups:", error.message);
    } finally {
      set({ isGroupsLoading: false });
    }
  },

  createGroup: async (data) => {
    try {
      const res = await axiosInstance.post("/groups/create", data);
      const newGroup = { ...res.data, isGroup: true };
      set((state) => ({
        groups: [newGroup, ...state.groups],
      }));
      toast.success("Group created successfully!");
      return newGroup;
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create group");
      return null;
    }
  },

  getMessages: async (targetId: string) => {
    const { selectedGroup } = get();
    set({ isMessagesLoading: true });
    try {
      const endpoint = selectedGroup ? `/groups/${targetId}/messages` : `/messages/${targetId}`;
      const res = await axiosInstance.get(endpoint);
      set({ messages: res.data });

      if (!selectedGroup) {
        set((state) => ({
          users: state.users.map((u) =>
            u._id === targetId ? { ...u, unreadCount: 0 } : u
          ),
        }));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, selectedGroup, messages, users, groups, replyingTo } = get();
    const payload = {
      ...messageData,
      replyToId: replyingTo?._id,
    };

    try {
      let sentMessage: Message;
      if (selectedGroup) {
        const res = await axiosInstance.post(
          `/groups/${selectedGroup._id}/messages`,
          payload
        );
        sentMessage = res.data;
        set({
          messages: [...messages, sentMessage],
          replyingTo: null,
        });

        // Update group last message
        const updatedGroups = groups.map((g) => {
          if (g._id === selectedGroup._id) {
            return {
              ...g,
              lastMessage: {
                _id: sentMessage._id,
                text: sentMessage.text,
                image: sentMessage.image,
                audio: sentMessage.audio,
                senderId: sentMessage.senderId,
                createdAt: sentMessage.createdAt,
              },
            };
          }
          return g;
        });
        set({ groups: updatedGroups });
      } else if (selectedUser) {
        const res = await axiosInstance.post(
          `/messages/send/${selectedUser._id}`,
          payload
        );
        sentMessage = res.data;
        set({
          messages: [...messages, sentMessage],
          replyingTo: null,
        });

        // Update user last message
        const updatedUsers = users.map((u) => {
          if (u._id === selectedUser._id) {
            return {
              ...u,
              lastMessage: {
                _id: sentMessage._id,
                text: sentMessage.text,
                image: sentMessage.image,
                audio: sentMessage.audio,
                senderId:
                  typeof sentMessage.senderId === "object"
                    ? sentMessage.senderId._id
                    : sentMessage.senderId,
                createdAt: sentMessage.createdAt,
              },
            };
          }
          return u;
        });

        updatedUsers.sort((a, b) => {
          const timeA = a.lastMessage?.createdAt
            ? new Date(a.lastMessage.createdAt).getTime()
            : 0;
          const timeB = b.lastMessage?.createdAt
            ? new Date(b.lastMessage.createdAt).getTime()
            : 0;
          return timeB - timeA;
        });

        set({ users: updatedUsers });
      } else {
        return;
      }

      sound.playSend();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  deleteMessage: async (messageId: string) => {
    try {
      await axiosInstance.delete(`/messages/${messageId}`);
      set((state) => ({
        messages: state.messages.filter((m) => m._id !== messageId),
      }));
      toast.success("Message deleted");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete message");
    }
  },

  reactToMessage: async (messageId: string, emoji: string) => {
    const authUser = (useAuthStore.getState() as { authUser: any }).authUser;
    if (!authUser) return;

    // Optimistic update
    set((state) => ({
      messages: state.messages.map((m) => {
        if (m._id !== messageId) return m;
        const reactions = m.reactions ? [...m.reactions] : [];
        const existingIdx = reactions.findIndex((r) => r.userId === authUser._id);
        if (existingIdx > -1) {
          if (reactions[existingIdx].emoji === emoji) {
            reactions.splice(existingIdx, 1);
          } else {
            reactions[existingIdx].emoji = emoji;
          }
        } else {
          reactions.push({ userId: authUser._id, emoji });
        }
        return { ...m, reactions };
      }),
    }));

    try {
      const res = await axiosInstance.put(`/messages/react/${messageId}`, { emoji });
      set((state) => ({
        messages: state.messages.map((m) =>
          m._id === messageId ? { ...m, reactions: res.data.reactions } : m
        ),
      }));
    } catch (error: any) {
      toast.error("Failed to add reaction");
    }
  },

  subscribeToMessages: () => {
    const socket = (useAuthStore.getState() as { socket: any }).socket;
    if (!socket) return;

    socket.off("newMessage");
    socket.off("newGroupMessage");
    socket.off("newGroupCreated");
    socket.off("messageDeleted");
    socket.off("messageReaction");
    socket.off("messagesSeen");
    socket.off("userTyping");
    socket.off("userStopTyping");

    // Incoming Direct Message
    socket.on("newMessage", (newMessage: Message) => {
      const { selectedUser, messages, users } = get();
      const senderId =
        typeof newMessage.senderId === "object"
          ? newMessage.senderId._id
          : newMessage.senderId;

      if (selectedUser && senderId === selectedUser._id) {
        // If receiver already has this conversation open, mark it seen right away & notify sender!
        const seenMessage = { ...newMessage, seen: true };
        set({ messages: [...messages, seenMessage] });
        sound.playReceive();

        // Emit markAsSeen back to server so sender gets instant double ticks!
        socket.emit("markAsSeen", { senderId });
      } else {
        sound.playReceive();
      }

      const updatedUsers = users.map((u) => {
        if (u._id === senderId) {
          const isCurrentChat = selectedUser?._id === senderId;
          return {
            ...u,
            lastMessage: {
              _id: newMessage._id,
              text: newMessage.text,
              image: newMessage.image,
              audio: newMessage.audio,
              senderId: senderId,
              createdAt: newMessage.createdAt,
            },
            unreadCount: isCurrentChat ? 0 : (u.unreadCount || 0) + 1,
          };
        }
        return u;
      });

      updatedUsers.sort((a, b) => {
        const timeA = a.lastMessage?.createdAt
          ? new Date(a.lastMessage.createdAt).getTime()
          : 0;
        const timeB = b.lastMessage?.createdAt
          ? new Date(b.lastMessage.createdAt).getTime()
          : 0;
        return timeB - timeA;
      });

      set({ users: updatedUsers });
    });

    // Incoming Group Message
    socket.on(
      "newGroupMessage",
      ({ groupId, message }: { groupId: string; message: Message }) => {
        const { selectedGroup, messages, groups } = get();

        if (selectedGroup && selectedGroup._id === groupId) {
          set({ messages: [...messages, message] });
          sound.playReceive();
        } else {
          sound.playReceive();
        }

        const updatedGroups = groups.map((g) => {
          if (g._id === groupId) {
            return {
              ...g,
              lastMessage: {
                _id: message._id,
                text: message.text,
                image: message.image,
                audio: message.audio,
                senderId: message.senderId,
                createdAt: message.createdAt,
              },
            };
          }
          return g;
        });

        set({ groups: updatedGroups });
      }
    );

    // Group created / added to group
    socket.on("newGroupCreated", (newGroup: Group) => {
      set((state) => ({
        groups: [{ ...newGroup, isGroup: true }, ...state.groups],
      }));
      toast.success(`You were added to "${newGroup.name}"!`, { icon: "👥" });
    });

    // Message Deleted
    socket.on("messageDeleted", ({ messageId }: { messageId: string }) => {
      set((state) => ({
        messages: state.messages.filter((m) => m._id !== messageId),
      }));
    });

    // Message Reaction
    socket.on(
      "messageReaction",
      ({ messageId, reactions }: { messageId: string; reactions: Reaction[] }) => {
        set((state) => ({
          messages: state.messages.map((m) =>
            m._id === messageId ? { ...m, reactions } : m
          ),
        }));
      }
    );

    // Real-time Read Receipts (Double Ticks)
    socket.on("messagesSeen", ({ seenBy }: { seenBy: string }) => {
      set((state) => ({
        messages: state.messages.map((m) => {
          const receiverId =
            typeof m.receiverId === "object"
              ? (m.receiverId as any)._id
              : m.receiverId;
          if (receiverId === seenBy || state.selectedUser?._id === seenBy) {
            return { ...m, seen: true };
          }
          return m;
        }),
      }));
    });

    // Typing Events
    socket.on("userTyping", ({ senderId }: { senderId: string }) => {
      set((state) => ({
        typingUsers: { ...state.typingUsers, [senderId]: true },
      }));
    });

    socket.on("userStopTyping", ({ senderId }: { senderId: string }) => {
      set((state) => ({
        typingUsers: { ...state.typingUsers, [senderId]: false },
      }));
    });
  },

  unsubscribeFromMessages: () => {
    const socket = (useAuthStore.getState() as { socket: any }).socket;
    if (!socket) return;
    socket.off("newMessage");
    socket.off("newGroupMessage");
    socket.off("newGroupCreated");
    socket.off("messageDeleted");
    socket.off("messageReaction");
    socket.off("messagesSeen");
    socket.off("userTyping");
    socket.off("userStopTyping");
  },

  setTyping: (isTyping: boolean) => {
    const { selectedUser } = get();
    const socket = (useAuthStore.getState() as { socket: any }).socket;
    if (!socket || !selectedUser) return;

    if (isTyping) {
      socket.emit("typing", { receiverId: selectedUser._id });
    } else {
      socket.emit("stopTyping", { receiverId: selectedUser._id });
    }
  },
}));
