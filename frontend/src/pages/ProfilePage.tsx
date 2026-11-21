import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Camera, Eye, EyeOff, KeyRound, Loader2, Lock, Mail, ShieldCheck, User } from "lucide-react";
import toast from "react-hot-toast";
import imageCompression from "browser-image-compression";

const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile, changePassword, isChangingPassword } =
    useAuthStore();
  const [selectedImg, setSelectedImg] = useState<string | null>(null);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const handleImageUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 800,
      useWebWorker: true,
    };

    try {
      const compressedFile = await imageCompression(file, options);
      const base64Image = await imageCompression.getDataUrlFromFile(
        compressedFile
      );

      setSelectedImg(base64Image);
      await updateProfile({ profilePic: base64Image });
    } catch (error) {
      console.error("Image compression failed:", error);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("All password fields are required");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (currentPassword === newPassword) {
      toast.error("New password cannot be the same as current password");
      return;
    }

    const success = await changePassword({ currentPassword, newPassword });
    if (success) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="max-w-2xl mx-auto p-4 py-8 space-y-8">
        {/* Profile Card */}
        <div className="bg-base-300 rounded-2xl p-6 sm:p-8 space-y-8 shadow-lg">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold">Profile</h1>
            <p className="mt-1 text-base-content/70 text-sm">
              Manage your personal profile and account credentials
            </p>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <img
                src={selectedImg || authUser?.profilePic || "/avatar.png"}
                alt="Profile"
                className="size-32 rounded-full object-cover border-4 border-primary/20 shadow-md"
              />
              <label
                htmlFor="avatar-upload"
                className={`absolute bottom-0 right-0 bg-primary hover:bg-primary/90 text-primary-content hover:scale-105 p-2.5 rounded-full cursor-pointer transition-all duration-200 shadow-lg ${
                  isUpdatingProfile ? "animate-pulse pointer-events-none" : ""
                }`}
              >
                <Camera className="w-5 h-5" />
                <input
                  type="file"
                  id="avatar-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUpdatingProfile}
                />
              </label>
            </div>
            <p className="text-xs text-base-content/60">
              {isUpdatingProfile
                ? "Uploading photo..."
                : "Click the camera icon to change your photo"}
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-base-content/70 flex items-center gap-1.5">
                <User className="w-4 h-4 text-primary" />
                Full Name
              </div>
              <p className="px-4 py-3 bg-base-200 rounded-xl border border-base-content/10 font-medium">
                {authUser?.fullName}
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-base-content/70 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-primary" />
                Email Address
              </div>
              <p className="px-4 py-3 bg-base-200 rounded-xl border border-base-content/10 font-medium">
                {authUser?.email}
              </p>
            </div>
          </div>

          <div className="border-t border-base-content/10 pt-6">
            <h2 className="text-base font-semibold mb-3">Account Information</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-base-content/5">
                <span className="text-base-content/70">Member Since</span>
                <span className="font-mono text-xs">
                  {authUser?.createdAt ? authUser.createdAt.split("T")[0] : "Recently joined"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-base-content/70">Account Status</span>
                <span className="badge badge-success badge-sm font-semibold gap-1">
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-base-300 rounded-2xl p-6 sm:p-8 space-y-6 shadow-lg">
          <div className="flex items-center gap-3 border-b border-base-content/10 pb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold">Security & Password</h2>
              <p className="text-xs text-base-content/70">
                Update your account password to keep your account safe
              </p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-base-content/70 block mb-1.5">
                Current Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="size-4 text-base-content/40" />
                </div>
                <input
                  type={showCurrentPass ? "text" : "password"}
                  required
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input input-bordered w-full pl-9 pr-10 rounded-xl text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-base-content/40 hover:text-base-content"
                >
                  {showCurrentPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-base-content/70 block mb-1.5">
                  New Password (min 6 chars)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="size-4 text-base-content/40" />
                  </div>
                  <input
                    type={showNewPass ? "text" : "password"}
                    required
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input input-bordered w-full pl-9 pr-10 rounded-xl text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-base-content/40 hover:text-base-content"
                  >
                    {showNewPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-base-content/70 block mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="size-4 text-base-content/40" />
                  </div>
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    required
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input input-bordered w-full pl-9 pr-10 rounded-xl text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-base-content/40 hover:text-base-content"
                  >
                    {showConfirmPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isChangingPassword}
                className="btn btn-primary rounded-xl px-6 flex items-center gap-2"
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="size-4" />
                    <span>Change Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
