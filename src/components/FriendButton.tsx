import { useEffect, useState } from "react";
import { UserPlus, UserCheck, Clock, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Row = { id: string; requester_id: string; addressee_id: string; status: "pending" | "accepted" };

interface Props {
  targetId: string;
  targetName?: string;
  disabled?: boolean;
  onChanged?: () => void;
  className?: string;
}

export function FriendButton({ targetId, targetName, disabled, onChanged, className }: Props) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [row, setRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("friendships")
      .select("id, requester_id, addressee_id, status")
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${user.id})`)
      .maybeSingle();
    setRow((data as Row) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, targetId]);

  if (!user || user.id === targetId) return null;
  if (loading) return <div className={`h-10 rounded-xl bg-muted animate-pulse ${className ?? ""}`} />;

  const sendRequest = async () => {
    setBusy(true);
    const { data, error } = await supabase
      .from("friendships")
      .insert({ requester_id: user.id, addressee_id: targetId })
      .select("id, requester_id, addressee_id, status")
      .single();
    setBusy(false);
    if (error) return toast.error(error.message);
    setRow(data as Row);
    toast.success(t("friend.sentRequest"));
    onChanged?.();
  };

  const cancelRequest = async () => {
    if (!row) return;
    setBusy(true);
    const { error } = await supabase.from("friendships").delete().eq("id", row.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    setRow(null);
    onChanged?.();
  };

  const acceptRequest = async () => {
    if (!row) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("friendships")
      .update({ status: "accepted", responded_at: new Date().toISOString() })
      .eq("id", row.id)
      .select("id, requester_id, addressee_id, status")
      .single();
    setBusy(false);
    if (error) return toast.error(error.message);
    setRow(data as Row);
    toast.success(t("friend.acceptedRequest"));
    onChanged?.();
  };

  const declineRequest = async () => {
    if (!row) return;
    setBusy(true);
    const { error } = await supabase.from("friendships").delete().eq("id", row.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    setRow(null);
    onChanged?.();
  };

  const unfriend = async () => {
    if (!row) return;
    setBusy(true);
    const { error } = await supabase.from("friendships").delete().eq("id", row.id);
    setBusy(false);
    setConfirmOpen(false);
    if (error) return toast.error(error.message);
    setRow(null);
    onChanged?.();
  };

  if (!row) {
    return (
      <button
        type="button"
        onClick={sendRequest}
        disabled={disabled || busy}
        className={`h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 bg-primary text-primary-foreground disabled:opacity-50 ${className ?? ""}`}
      >
        <UserPlus className="w-4 h-4" /> {t("friend.add")}
      </button>
    );
  }

  if (row.status === "pending" && row.requester_id === user.id) {
    return (
      <button
        type="button"
        onClick={cancelRequest}
        disabled={disabled || busy}
        className={`h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 bg-muted text-foreground disabled:opacity-50 ${className ?? ""}`}
      >
        <Clock className="w-4 h-4" /> {t("friend.requested")}
      </button>
    );
  }

  if (row.status === "pending" && row.addressee_id === user.id) {
    return (
      <div className={`flex gap-2 ${className ?? ""}`}>
        <button
          type="button"
          onClick={acceptRequest}
          disabled={disabled || busy}
          className="flex-1 h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 bg-primary text-primary-foreground disabled:opacity-50"
        >
          <Check className="w-4 h-4" /> {t("friend.accept")}
        </button>
        <button
          type="button"
          onClick={declineRequest}
          disabled={disabled || busy}
          className="flex-1 h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 border disabled:opacity-50"
        >
          <X className="w-4 h-4" /> {t("friend.decline")}
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={disabled || busy}
        className={`h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 bg-primary/10 text-primary disabled:opacity-50 ${className ?? ""}`}
      >
        <UserCheck className="w-4 h-4" /> {t("friend.friends")}
      </button>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("friend.confirmUnfriendTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("friend.confirmUnfriendDesc", { name: targetName ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={unfriend} className="bg-destructive hover:bg-destructive/90">
              {t("friend.unfriend")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
