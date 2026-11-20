import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import {
  Download,
  MessageSquare,
  Plus,
  Search,
  Users,
  X,
  Check,
} from "lucide-react";
import { formatLastMessageTime } from "../lib/utils";
import toast from "react-hot-toast";

const Sidebar = () => {
  const {
    getUsers,
    users,
    selectedUser,
    setSelectedUser,
    getGroups,
    groups,
    selectedGroup,
    setSelectedGroup,
    createGroup,
    isUsersLoading,
    typingUsers,
  } = useChatStore();

  const { onlineUsers, authUser } = useAuthStore() as {
    onlineUsers: string[];
    authUser: { _id: string };
  };

  const [activeTab, setActiveTab] = useState<"chats" | "groups">("chats");
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Create Group Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  useEffect(() => {
    getUsers();
    getGroups();

    // Check if app is running in standalone window
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);
    };
    checkStandalone();

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, [getUsers, getGroups]);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          setDeferredPrompt(null);
          toast.success("ChitChat app installed!");
        }
      } catch (err) {
        setShowInstallGuide(true);
      }
    } else {
      setShowInstallGuide(true);
    }
  };

  const toggleMemberSelection = (userId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }
    if (selectedMemberIds.length === 0) {
      toast.error("Please select at least 1 member for the group");
      return;
    }

    setIsCreating(true);
    const created = await createGroup({
      name: groupName.trim(),
      description: groupDescription.trim(),
      memberIds: selectedMemberIds,
    });
    setIsCreating(false);

    if (created) {
      setGroupName("");
      setGroupDescription("");
      setSelectedMemberIds([]);
      setIsModalOpen(false);
      setSelectedGroup(created);
    }
  };

  const filteredUsers = (users || [])
    .filter((user) => (showOnlineOnly ? onlineUsers?.includes(user._id) : true))
    .filter((user) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        user.fullName.toLowerCase().includes(query) ||
        (user.email && user.email.toLowerCase().includes(query)) ||
        (user.lastMessage?.text && user.lastMessage.text.toLowerCase().includes(query))
      );
    });

  const filteredGroups = (groups || []).filter((group) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      group.name.toLowerCase().includes(query) ||
      (group.description && group.description.toLowerCase().includes(query)) ||
      (group.lastMessage?.text && group.lastMessage.text.toLowerCase().includes(query))
    );
  });

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-full md:w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200 bg-base-100">
      {/* Top Header & Tab Switcher */}
      <div className="border-b border-base-300 w-full p-3 sm:p-4 pb-3">
        {/* Chats / Groups Navigation Tabs */}
        <div className="flex items-center justify-between gap-1 mb-2.5">
          <div className="grid grid-cols-2 bg-base-200 p-0.5 rounded-xl w-full max-w-[200px] md:max-w-none lg:max-w-[200px]">
            <button
              onClick={() => setActiveTab("chats")}
              className={`flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "chats"
                  ? "bg-base-100 text-primary shadow-xs"
                  : "text-base-content/60 hover:text-base-content"
              }`}
            >
              <MessageSquare className="size-3.5" />
              <span className="inline md:hidden lg:inline">Chats</span>
            </button>
            <button
              onClick={() => setActiveTab("groups")}
              className={`flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "groups"
                  ? "bg-base-100 text-primary shadow-xs"
                  : "text-base-content/60 hover:text-base-content"
              }`}
            >
              <Users className="size-3.5" />
              <span className="inline md:hidden lg:inline">Groups</span>
              {groups.length > 0 && (
                <span className="text-[10px] bg-primary/20 text-primary rounded-full px-1 leading-none py-0.5 inline md:hidden lg:inline">
                  {groups.length}
                </span>
              )}
            </button>
          </div>

          {/* New Group Button */}
          {activeTab === "groups" && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn btn-primary btn-xs sm:btn-sm btn-circle shrink-0"
              title="Create new group"
            >
              <Plus className="size-4" />
            </button>
          )}
        </div>

        {/* Live Search Bar */}
        <div className="relative block md:hidden lg:block">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
          <input
            type="text"
            placeholder={activeTab === "chats" ? "Search contacts..." : "Search groups..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-base-200/80 rounded-full pl-9 pr-7 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary border border-base-300 placeholder:text-base-content/40"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Online filter toggle (for Chats tab) */}
        {activeTab === "chats" && (
          <div className="mt-2.5 flex md:hidden lg:flex items-center justify-between gap-2">
            <label className="cursor-pointer flex items-center gap-2">
              <input
                type="checkbox"
                checked={showOnlineOnly}
                onChange={(e) => setShowOnlineOnly(e.target.checked)}
                className="checkbox checkbox-xs checkbox-primary"
              />
              <span className="text-[11px] text-base-content/80">Online only</span>
            </label>
            <span className="text-[11px] text-base-content/50">
              ({Math.max((onlineUsers?.length || 1) - 1, 0)} online)
            </span>
          </div>
        )}
      </div>

      {/* Main List Section */}
      <div className="overflow-y-auto w-full py-1 flex-1">
        {/* DIRECT CHATS LIST */}
        {activeTab === "chats" && (
          <>
            {filteredUsers.map((user) => {
              const isTyping = typingUsers[user._id];
              const hasUnread = (user.unreadCount || 0) > 0;
              const isSelected = selectedUser?._id === user._id;

              let lastMessagePreview = "";
              if (user.lastMessage) {
                const isMe = user.lastMessage.senderId === authUser?._id;
                const prefix = isMe ? "You: " : "";
                if (user.lastMessage.audio) {
                  lastMessagePreview = `${prefix}🎤 Voice message`;
                } else if (user.lastMessage.image && !user.lastMessage.text) {
                  lastMessagePreview = `${prefix}📷 Photo`;
                } else {
                  lastMessagePreview = `${prefix}${user.lastMessage.text || ""}`;
                }
              }

              return (
                <button
                  key={user._id}
                  onClick={() => setSelectedUser(user)}
                  className={`
                    w-full p-3 flex items-center gap-3
                    hover:bg-base-200/60 transition-colors
                    ${isSelected ? "bg-base-200 ring-1 ring-base-300/80" : ""}
                  `}
                >
                  <div className="relative mx-0 md:mx-auto lg:mx-0 shrink-0">
                    <img
                      src={user.profilePic || "/avatar.png"}
                      alt={user.fullName}
                      className="size-10 md:size-11 object-cover rounded-full border border-base-300"
                    />
                    {onlineUsers?.includes(user._id) && (
                      <span className="absolute bottom-0 right-0 size-2.5 bg-green-500 rounded-full ring-2 ring-base-100" />
                    )}
                    {hasUnread && (
                      <span className="absolute -top-1 -right-1 size-5 bg-primary text-primary-content text-[11px] font-bold rounded-full flex items-center justify-center lg:hidden">
                        {(user.unreadCount || 0) > 9 ? "9+" : user.unreadCount}
                      </span>
                    )}
                  </div>

                  <div className="block md:hidden lg:block text-left min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-sm truncate">{user.fullName}</div>
                      {user.lastMessage?.createdAt && (
                        <span className="text-[11px] text-base-content/50 shrink-0 ml-1">
                          {formatLastMessageTime(user.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-0.5">
                      {isTyping ? (
                        <span className="text-xs text-primary font-medium animate-pulse">
                          typing...
                        </span>
                      ) : lastMessagePreview ? (
                        <span
                          className={`text-xs truncate max-w-[170px] ${
                            hasUnread ? "font-semibold text-base-content" : "text-base-content/55"
                          }`}
                        >
                          {lastMessagePreview}
                        </span>
                      ) : (
                        <span className="text-xs text-base-content/40">
                          {onlineUsers?.includes(user._id) ? "Online" : "Offline"}
                        </span>
                      )}

                      {hasUnread && (
                        <span className="badge badge-primary badge-sm font-bold text-xs shrink-0 ml-1">
                          {user.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {filteredUsers.length === 0 && (
              <div className="text-center text-base-content/50 py-8 text-xs">
                {searchQuery ? "No contacts match your search" : "No contacts found"}
              </div>
            )}
          </>
        )}

        {/* GROUPS LIST */}
        {activeTab === "groups" && (
          <>
            {filteredGroups.map((group) => {
              const isSelected = selectedGroup?._id === group._id;

              let groupLastMsg = "";
              if (group.lastMessage) {
                const sender = group.lastMessage.senderId;
                const senderName =
                  typeof sender === "object"
                    ? sender._id === authUser?._id
                      ? "You"
                      : sender.fullName
                    : sender === authUser?._id
                    ? "You"
                    : "Member";
                const prefix = `${senderName}: `;
                if (group.lastMessage.audio) {
                  groupLastMsg = `${prefix}🎤 Voice message`;
                } else if (group.lastMessage.image && !group.lastMessage.text) {
                  groupLastMsg = `${prefix}📷 Photo`;
                } else {
                  groupLastMsg = `${prefix}${group.lastMessage.text || ""}`;
                }
              }

              return (
                <button
                  key={group._id}
                  onClick={() => setSelectedGroup(group)}
                  className={`
                    w-full p-3 flex items-center gap-3
                    hover:bg-base-200/60 transition-colors
                    ${isSelected ? "bg-base-200 ring-1 ring-base-300/80" : ""}
                  `}
                >
                  <div className="relative mx-0 md:mx-auto lg:mx-0 shrink-0">
                    <div className="size-10 md:size-11 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-sm border border-primary/20">
                      {group.groupPic ? (
                        <img
                          src={group.groupPic}
                          alt={group.name}
                          className="size-full rounded-full object-cover"
                        />
                      ) : (
                        <Users className="size-5" />
                      )}
                    </div>
                  </div>

                  <div className="block md:hidden lg:block text-left min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-sm truncate">{group.name}</div>
                      {group.lastMessage?.createdAt && (
                        <span className="text-[11px] text-base-content/50 shrink-0 ml-1">
                          {formatLastMessageTime(group.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs truncate max-w-[170px] text-base-content/55">
                        {groupLastMsg || `${group.members?.length || 0} members`}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}

            {filteredGroups.length === 0 && (
              <div className="text-center text-base-content/50 py-8 px-4 text-xs space-y-2">
                <p>No groups found</p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="btn btn-primary btn-xs rounded-full"
                >
                  + Create First Group
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* PWA Install Button (Always visible on mobile & desktop until installed) */}
      {!isStandalone && (
        <div className="p-2 sm:p-2.5 border-t border-base-300 bg-base-200/50">
          <button
            onClick={handleInstallPWA}
            className="w-full btn btn-primary btn-sm rounded-xl flex items-center justify-center gap-2 text-xs font-semibold shadow-xs hover:shadow-md transition-all"
            title="Install ChitChat as a standalone app"
          >
            <Download className="size-4 shrink-0" />
            <span className="inline md:hidden lg:inline">Install ChitChat App</span>
          </button>
        </div>
      )}

      {/* PWA Install Guide Modal (When browser requires 3-dot menu or HTTP install) */}
      {showInstallGuide && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setShowInstallGuide(false)}
        >
          <div
            className="bg-base-100 rounded-3xl w-full max-w-sm p-5 shadow-2xl border border-base-300 space-y-4 animate-in zoom-in-95 duration-150 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-base-300/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Download className="size-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Install ChitChat</h3>
                  <p className="text-[11px] text-base-content/60">Standalone Full-Screen App</p>
                </div>
              </div>
              <button
                onClick={() => setShowInstallGuide(false)}
                className="btn btn-ghost btn-circle btn-xs text-base-content/60"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-base-200/80 p-3 rounded-2xl space-y-1.5">
                <p className="font-semibold text-primary flex items-center gap-1.5">
                  📱 On Android Chrome / Mobile:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-base-content/80 pl-1">
                  <li>Tap the <strong>three dots (⋮)</strong> at the top-right of Chrome.</li>
                  <li>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
                  <li>Open ChitChat from your home screen as a full-screen app!</li>
                </ol>
              </div>

              <div className="bg-base-200/80 p-3 rounded-2xl space-y-1.5">
                <p className="font-semibold text-primary flex items-center gap-1.5">
                  💻 On Laptop / Desktop Chrome:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-base-content/80 pl-1">
                  <li>Look for the <strong>Install icon (⊕)</strong> on the right of the URL address bar.</li>
                  <li>Or click Chrome menu <strong>(⋮)</strong> &gt; <strong>Save and share</strong> &gt; <strong>Install ChitChat</strong>.</li>
                </ol>
              </div>

              <p className="text-[11px] text-base-content/50 leading-relaxed">
                💡 <em>Tip: Because you are on a local network IP (<code className="text-primary">http://10.99.55.238</code>), Chrome uses the 3-dot menu to add it to your home screen.</em>
              </p>
            </div>

            <button
              onClick={() => setShowInstallGuide(false)}
              className="btn btn-primary btn-sm w-full rounded-xl text-xs font-semibold"
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* Create New Group Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div
            className="bg-base-100 rounded-2xl w-full max-w-md p-5 shadow-2xl border border-base-300 space-y-4 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-base-300 pb-3">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Users className="size-5 text-primary" />
                <span>Create New Group</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="btn btn-ghost btn-circle btn-xs text-base-content/60"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGroupSubmit} className="space-y-4 flex-1 overflow-hidden flex flex-col">
              <div>
                <label className="text-xs font-semibold text-base-content/70 block mb-1">
                  Group Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Project Team, Friends..."
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="input input-sm input-bordered w-full rounded-xl focus:outline-none focus:border-primary text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-base-content/70 block mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="What is this group about?"
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  className="input input-sm input-bordered w-full rounded-xl focus:outline-none focus:border-primary text-sm"
                />
              </div>

              {/* Members selection list */}
              <div className="flex-1 flex flex-col min-h-[160px] overflow-hidden">
                <div className="flex items-center justify-between text-xs font-semibold text-base-content/70 mb-1">
                  <span>Add Members ({selectedMemberIds.length} selected)</span>
                </div>
                <div className="flex-1 overflow-y-auto border border-base-300 rounded-xl p-1 divide-y divide-base-300/40">
                  {users.map((user) => {
                    const isSelected = selectedMemberIds.includes(user._id);
                    return (
                      <div
                        key={user._id}
                        onClick={() => toggleMemberSelection(user._id)}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                          isSelected ? "bg-primary/10" : "hover:bg-base-200"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={user.profilePic || "/avatar.png"}
                            alt={user.fullName}
                            className="size-8 rounded-full object-cover border border-base-300"
                          />
                          <div>
                            <p className="text-xs font-medium leading-tight">{user.fullName}</p>
                            <p className="text-[10px] text-base-content/50">{user.email || ""}</p>
                          </div>
                        </div>

                        <div
                          className={`size-5 rounded-md flex items-center justify-center border transition-colors ${
                            isSelected
                              ? "bg-primary border-primary text-primary-content"
                              : "border-base-300"
                          }`}
                        >
                          {isSelected && <Check className="size-3.5" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-base-300">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-ghost btn-sm rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="btn btn-primary btn-sm rounded-xl text-xs"
                >
                  {isCreating ? "Creating..." : "Create Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
