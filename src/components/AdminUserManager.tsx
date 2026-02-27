import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, User, Pencil, Trash2, Ban, CheckCircle2, Save, X } from "lucide-react";
import { toast } from "sonner";

interface AppUser {
  id: string;
  external_user_id: string;
  display_name: string | null;
  email: string | null;
  profile_picture_url: string | null;
  is_banned: boolean;
  notes: string | null;
  created_at: string;
}

interface AdminUserManagerProps {
  getAuthHeaders: () => Promise<Record<string, string>>;
}

export function AdminUserManager({ getAuthHeaders }: AdminUserManagerProps) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AppUser>>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [banningUser, setBanningUser] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-profile?action=admin-list`,
        { headers }
      );
      const data = await resp.json();
      if (resp.ok && data.users) setUsers(data.users);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleEdit = (user: AppUser) => {
    setEditingUser(user.external_user_id);
    setEditForm({
      display_name: user.display_name || "",
      email: user.email || "",
      notes: user.notes || "",
    });
  };

  const handleSave = async (targetUserId: string) => {
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-profile?action=admin-update`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ targetUserId, ...editForm }),
        }
      );
      if (resp.ok) {
        toast.success("User updated");
        setEditingUser(null);
        fetchUsers();
      } else {
        toast.error("Failed to update user");
      }
    } catch {
      toast.error("Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-profile?action=admin-delete`,
        { method: "POST", headers, body: JSON.stringify({ targetUserId: deleteTarget }) }
      );
      if (resp.ok) {
        toast.success("User deleted");
        setUsers(prev => prev.filter(u => u.external_user_id !== deleteTarget));
      } else {
        toast.error("Failed to delete user");
      }
    } catch {
      toast.error("Failed to delete user");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleBan = async (targetUserId: string, is_banned: boolean) => {
    setBanningUser(targetUserId);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-profile?action=admin-ban`,
        { method: "POST", headers, body: JSON.stringify({ targetUserId, is_banned }) }
      );
      if (resp.ok) {
        toast.success(is_banned ? "User banned" : "User unbanned");
        setUsers(prev => prev.map(u =>
          u.external_user_id === targetUserId ? { ...u, is_banned } : u
        ));
      } else {
        toast.error("Failed to update ban status");
      }
    } catch {
      toast.error("Failed to update ban status");
    } finally {
      setBanningUser(null);
    }
  };

  const shortenId = (id: string) => id.length <= 16 ? id : `${id.slice(0, 10)}…${id.slice(-4)}`;

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this user's profile and avatar. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No user profiles yet.</p>
        ) : (
          users.map((user) => {
            const isEditing = editingUser === user.external_user_id;
            return (
              <div
                key={user.id}
                className={`rounded-lg border p-3 transition-all ${
                  user.is_banned
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-border/50 bg-card/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10 shrink-0 border border-border">
                    {user.profile_picture_url ? (
                      <AvatarImage src={user.profile_picture_url} alt={user.display_name || "User"} />
                    ) : null}
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      <User className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="space-y-2">
                        <Input
                          value={editForm.display_name || ""}
                          onChange={(e) => setEditForm(prev => ({ ...prev, display_name: e.target.value }))}
                          placeholder="Display name"
                          className="text-xs h-7"
                        />
                        <Input
                          value={editForm.email || ""}
                          onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="Email"
                          className="text-xs h-7"
                        />
                        <Input
                          value={editForm.notes || ""}
                          onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="Admin notes"
                          className="text-xs h-7"
                        />
                        <div className="flex gap-1">
                          <Button size="sm" className="h-6 text-[10px] gap-1" onClick={() => handleSave(user.external_user_id)} disabled={saving}>
                            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setEditingUser(null)}>
                            <X className="w-3 h-3" /> Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">
                            {user.display_name || shortenId(user.external_user_id)}
                          </p>
                          {user.is_banned && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/20 text-destructive font-medium">Banned</span>
                          )}
                        </div>
                        {user.email && (
                          <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground font-mono">{shortenId(user.external_user_id)}</p>
                        {user.notes && (
                          <p className="text-[10px] text-muted-foreground mt-1 italic">📝 {user.notes}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                          Joined {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEdit(user)} title="Edit">
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleBan(user.external_user_id, !user.is_banned)}
                        disabled={banningUser === user.external_user_id}
                        title={user.is_banned ? "Unban" : "Ban"}
                      >
                        {banningUser === user.external_user_id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : user.is_banned ? (
                          <CheckCircle2 className="w-3 h-3 text-primary" />
                        ) : (
                          <Ban className="w-3 h-3 text-destructive" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(user.external_user_id)}
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
