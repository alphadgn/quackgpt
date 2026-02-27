import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Camera, Loader2, Save, User } from "lucide-react";
import { toast } from "sonner";

interface UserProfileCardProps {
  getAuthHeaders: () => Promise<Record<string, string>>;
}

interface UserProfile {
  external_user_id: string;
  display_name: string | null;
  email: string | null;
  profile_picture_url: string | null;
  is_banned: boolean;
  created_at: string;
}

export function UserProfileCard({ getAuthHeaders }: UserProfileCardProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      if (!headers["x-privy-token"]) { setLoading(false); return; }
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-profile?action=get`,
        { headers }
      );
      const data = await resp.json();
      if (resp.ok && data.profile) {
        setProfile(data.profile);
        setDisplayName(data.profile.display_name || "");
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-profile?action=update`,
        { method: "POST", headers, body: JSON.stringify({ display_name: displayName }) }
      );
      if (resp.ok) {
        toast.success("Profile updated");
        fetchProfile();
      } else {
        toast.error("Failed to update profile");
      }
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setUploading(true);
    try {
      // Convert to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Remove the data:image/xxx;base64, prefix
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const imageBase64 = await base64Promise;

      const headers = await getAuthHeaders();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-profile?action=upload-avatar`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ imageBase64, contentType: file.type }),
        }
      );
      const data = await resp.json();
      if (resp.ok && data.url) {
        toast.success("Profile picture updated");
        fetchProfile();
      } else {
        toast.error(data.error || "Failed to upload image");
      }
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Avatar */}
      <div className="relative group">
        <Avatar className="w-20 h-20 border-2 border-border">
          {profile?.profile_picture_url ? (
            <AvatarImage src={profile.profile_picture_url} alt="Profile" />
          ) : null}
          <AvatarFallback className="bg-muted text-muted-foreground">
            <User className="w-8 h-8" />
          </AvatarFallback>
        </Avatar>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          ) : (
            <Camera className="w-5 h-5 text-foreground" />
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Display name */}
      <div className="w-full max-w-xs flex flex-col gap-2">
        <label className="text-xs text-muted-foreground text-center">Display Name</label>
        <div className="flex gap-2">
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your display name"
            maxLength={50}
            className="text-sm"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={saving || displayName === (profile?.display_name || "")}
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {/* Info */}
      {profile?.email && (
        <p className="text-xs text-muted-foreground">{profile.email}</p>
      )}
      <p className="text-[10px] text-muted-foreground">
        Member since {new Date(profile?.created_at || "").toLocaleDateString()}
      </p>
    </div>
  );
}
