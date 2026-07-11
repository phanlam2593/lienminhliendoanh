import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usernameToEmail, BUSINESS_TYPES, BUSINESS_TYPE_LABEL, BusinessType } from "@/lib/types";
import { Logo } from "@/components/Logo";
import { uploadImage } from "@/lib/upload";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { maskPassword } from "@/lib/passwordHint";
import { useLanguage } from "@/lib/i18n";

type FieldStatus = "idle" | "checking" | "ok" | "taken" | "invalid";

export default function Register() {
  const nav = useNavigate();
  const { lang, setLang, t } = useLanguage();
  const [step, setStep] = useState(1);
  // step 1
  const [username, setU] = useState("");
  const [usernameStatus, setUS] = useState<FieldStatus>("idle");
  const [fullName, setFN] = useState("");
  const [email, setE] = useState("");
  const [emailStatus, setES] = useState<FieldStatus>("idle");
  const [phone, setPh] = useState("");
  const [phoneStatus, setPhS] = useState<FieldStatus>("idle");
  const [password, setP] = useState("");
  const [password2, setP2] = useState("");
  const [avatarFile, setAv] = useState<File | null>(null);
  const [isBiz, setBiz] = useState(false);
  // step 2
  const [bizName, setBN] = useState("");
  const [bizType, setBT] = useState<BusinessType>("food");
  const [open, setOpen] = useState("07:00");
  const [close, setClose] = useState("22:00");
  const [bizDesc, setBD] = useState("");
  const [bizOffer, setBO] = useState("");
  const [fbUrl, setFB] = useState("");
  const [webUrl, setW] = useState("");
  const [tiktokUrl, setTk] = useState("");
  const [instagramUrl, setIg] = useState("");
  const [youtubeUrl, setYt] = useState("");
  const [coverFile, setCov] = useState<File | null>(null);
  const [termsOpen, setTO] = useState(false);
  const [agree, setAgree] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const checkUnique = async (col: "username" | "email" | "phone", val: string) => {
    if (!val) return false;
    const value = col === "username" ? val.toLowerCase() : val;
    const { data, error } = await supabase.rpc("is_field_taken", { _field: col, _value: value });
    if (error) return false;
    return !data;
  };

  const onBlurUser = async () => {
    if (!username) {
      setUS("idle");
      return;
    }
    if (!/^[a-z0-9_]{3,20}$/i.test(username)) {
      setUS("invalid");
      return;
    }
    setUS("checking");
    setUS((await checkUnique("username", username.toLowerCase())) ? "ok" : "taken");
  };
  const onBlurEmail = async () => {
    if (!email) {
      setES("idle");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setES("invalid");
      return;
    }
    setES("checking");
    setES((await checkUnique("email", email)) ? "ok" : "taken");
  };
  const onBlurPhone = async () => {
    if (!phone) {
      setPhS("idle");
      return;
    }
    if (!/^\d{8,15}$/.test(phone)) {
      setPhS("invalid");
      return;
    }
    setPhS("checking");
    setPhS((await checkUnique("phone", phone)) ? "ok" : "taken");
  };

  const step1Valid =
    username &&
    fullName &&
    email &&
    phone &&
    password.length >= 6 &&
    password === password2 &&
    usernameStatus === "ok" &&
    emailStatus === "ok" &&
    phoneStatus === "ok";

  const goNext = () => {
    if (!step1Valid) {
      toast.error("Vui lòng điền đủ thông tin hợp lệ");
      return;
    }
    if (isBiz) setStep(2);
    else setTO(true);
  };

  const submitFinal = async () => {
    if (!agree || !ageConfirmed) {
      toast.error("Vui lòng xác nhận đầy đủ các mục bên dưới");
      return;
    }
    setSubmitting(true);
    try {
      const { data: sign, error } = await supabase.auth.signUp({
        email: usernameToEmail(username),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { username: username.toLowerCase(), full_name: fullName, phone, real_email: email },
        },
      });
      if (error) throw error;
      const uid = sign.user?.id;
      if (!uid) throw new Error("Không tạo được tài khoản");

      // Chờ trigger tạo profile xong (poll tối đa ~5s thay vì đoán 600ms)
      for (let i = 0; i < 10; i++) {
        const { data: prof } = await supabase.from("profiles").select("id").eq("id", uid).maybeSingle();
        if (prof) break;
        await new Promise((r) => setTimeout(r, 500));
      }

      let avatarPath: string | null = null;
      if (avatarFile) {
        avatarPath = await uploadImage(avatarFile, "avatars", uid);
      }
      await supabase
        .from("profiles")
        .update({ ...(avatarPath ? { avatar_url: avatarPath } : {}), password_hint: maskPassword(password) })
        .eq("id", uid);

      if (isBiz) {
        let coverPath: string | null = null;
        if (coverFile) coverPath = await uploadImage(coverFile, "covers", uid);
        const { data: biz, error: bErr } = await supabase
          .from("businesses")
          .insert({
            owner_id: uid,
            name: bizName,
            type: bizType,
            description: bizDesc,
            hours_open: open,
            hours_close: close,
            facebook_url: fbUrl || null,
            website_url: webUrl || null,
            tiktok_url: tiktokUrl || null,
            instagram_url: instagramUrl || null,
            youtube_url: youtubeUrl || null,
            cover_url: coverPath,
            status: "pending",
          })
          .select()
          .single();
        if (bErr) throw bErr;
        if (bizOffer) {
          await supabase.from("offers").insert({
            business_id: biz.id,
            title: bizOffer,
            status: "active",
          });
        }
      }

      if (isBiz) {
        toast.success("Đăng ký thành công! Doanh nghiệp của bạn đang chờ admin duyệt.");
      } else {
        toast.success(
          "👋 Xin chào thành viên mới! Từ giờ bạn đã là một phần của Liên Minh Liên Doanh. Bắt đầu khám phá ưu đãi từ cộng đồng thôi nào!",
        );
      }
      nav("/");
    } catch (e: any) {
      const msg = String(e?.message || "");
      // Dịch các lỗi tiếng Anh thường gặp từ Supabase sang tiếng Việt dễ hiểu
      if (/leaked|pwned|compromised|data breach/i.test(msg)) {
        toast.error("Mật khẩu này từng bị lộ trên mạng nên không an toàn. Vui lòng chọn mật khẩu khác mạnh hơn.");
      } else if (/password.*(short|least|6 char)/i.test(msg)) {
        toast.error("Mật khẩu quá ngắn. Vui lòng dùng ít nhất 6 ký tự.");
      } else if (/already registered|already exists|user.*exist/i.test(msg)) {
        toast.error("Tên đăng nhập này đã có người dùng. Vui lòng chọn tên khác.");
      } else if (/network|fetch|timeout/i.test(msg)) {
        toast.error("Lỗi kết nối mạng. Vui lòng kiểm tra internet và thử lại.");
      } else {
        toast.error(msg || "Đăng ký thất bại");
      }
    } finally {
      setSubmitting(false);
      setTO(false);
    }
  };

  const Status = ({ s }: { s: FieldStatus }) => {
    if (s === "ok") return <Check className="w-4 h-4 text-emerald-600" />;
    if (s === "taken") return <span className="text-xs text-destructive">{t("register.taken")}</span>;
    if (s === "invalid") return <span className="text-xs text-destructive">{t("register.invalid")}</span>;
    if (s === "checking") return <span className="text-xs text-muted-foreground">…</span>;
    return null;
  };

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-sm mx-auto space-y-5">
        <div className="flex justify-center">
          <div className="inline-flex rounded-full border overflow-hidden">
            <button
              type="button"
              onClick={() => setLang("vi")}
              className={`px-3 py-1 text-xs font-semibold ${lang === "vi" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}
            >
              VI
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`px-3 py-1 text-xs font-semibold ${lang === "en" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}
            >
              EN
            </button>
          </div>
        </div>
        <div className="text-center space-y-2 flex flex-col items-center">
          <Logo size={56} asLink />
          {/* DO NOT CHANGE: app name is "Liên Minh Liên Doanh" — hiện t("app.name") để đổi theo ngôn ngữ */}
          <Link to="/" className="text-xs font-semibold text-primary">
            {t("app.name")}
          </Link>
          <h1 className="text-xl font-bold">{step === 1 ? t("register.title") : t("register.bizInfoTitle")}</h1>
          <div className="text-xs text-muted-foreground">{t("register.step", { n: step, total: isBiz ? 2 : 1 })}</div>
        </div>

        {step === 1 ? (
          <div className="space-y-3">
            <Field
              label={t("register.username")}
              right={<Status s={usernameStatus} />}
              hint={t("register.usernameHint")}
            >
              <input
                value={username}
                onChange={(e) => {
                  setU(e.target.value);
                  setUS("idle");
                }}
                onBlur={onBlurUser}
                autoCapitalize="none"
                required
                className="w-full px-4 py-3 rounded-xl border bg-card"
                placeholder={t("register.usernamePlaceholder")}
              />
            </Field>
            <Field label={t("register.fullName")}>
              <input
                value={fullName}
                onChange={(e) => setFN(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border bg-card"
              />
            </Field>
            <Field label={t("register.email")} right={<Status s={emailStatus} />}>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setE(e.target.value);
                  setES("idle");
                }}
                onBlur={onBlurEmail}
                required
                className="w-full px-4 py-3 rounded-xl border bg-card"
              />
            </Field>
            <Field label={t("register.phone")} right={<Status s={phoneStatus} />}>
              <input
                value={phone}
                onChange={(e) => {
                  setPh(e.target.value);
                  setPhS("idle");
                }}
                onBlur={onBlurPhone}
                required
                className="w-full px-4 py-3 rounded-xl border bg-card"
              />
            </Field>
            <Field label={t("register.password")} hint={t("register.passwordHint")}>
              <input
                type="password"
                value={password}
                onChange={(e) => setP(e.target.value)}
                minLength={6}
                required
                className="w-full px-4 py-3 rounded-xl border bg-card"
              />
            </Field>
            <Field label={t("register.confirmPassword")}>
              <input
                type="password"
                value={password2}
                onChange={(e) => setP2(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border bg-card"
              />
              {password2 && password !== password2 && (
                <span className="text-xs text-destructive">{t("register.passwordMismatch")}</span>
              )}
            </Field>
            <Field label={t("register.avatar")}>
              <input type="file" accept="image/*" onChange={(e) => setAv(e.target.files?.[0] ?? null)} />
            </Field>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground">{t("register.addBizQuestion")}</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBiz(true)}
                  className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all ${isBiz ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}
                >
                  {t("register.yesHaveBiz")}
                </button>
                <button
                  type="button"
                  onClick={() => setBiz(false)}
                  className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all ${!isBiz ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}
                >
                  {t("register.noBiz")}
                </button>
              </div>
            </div>

            <button
              onClick={goNext}
              className="w-full py-3 rounded-xl bg-gradient-brand text-primary-foreground font-semibold"
            >
              {isBiz ? t("register.continue") : t("register.completeRegister")}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <Field label={t("bizForm.name")} hint={t("bizForm.nameHint")}>
              <input
                value={bizName}
                onChange={(e) => setBN(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border bg-card"
              />
            </Field>
            <Field label={t("bizForm.type")}>
              <div className="flex flex-wrap gap-2">
                {BUSINESS_TYPES.map((bt) => (
                  <button
                    type="button"
                    key={bt}
                    onClick={() => setBT(bt)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm border",
                      bizType === bt ? "bg-primary text-primary-foreground border-primary" : "bg-card",
                    )}
                  >
                    {BUSINESS_TYPE_LABEL[bt]}
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Giờ mở *" hint="Ví dụ: 07:00">
                <input
                  type="time"
                  value={open}
                  onChange={(e) => setOpen(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl border bg-card"
                />
              </Field>
              <Field label="Giờ đóng *" hint="Ví dụ: 22:00">
                <input
                  type="time"
                  value={close}
                  onChange={(e) => setClose(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl border bg-card"
                />
              </Field>
            </div>
            <Field label="Mô tả *" hint="Mô tả ngắn gọn về không gian, phong cách, món đặc trưng">
              <textarea
                value={bizDesc}
                onChange={(e) => setBD(e.target.value)}
                required
                rows={3}
                className="w-full px-4 py-3 rounded-xl border bg-card"
              />
            </Field>
            <Field
              label="Ưu đãi/Deal cho thành viên *"
              hint="Ví dụ: Giảm 20% toàn menu, Tặng 1 ly nước khi đặt nhóm 4 người"
            >
              <input
                value={bizOffer}
                onChange={(e) => setBO(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border bg-card"
              />
            </Field>
            <Field label="Facebook URL (tùy chọn)">
              <input
                value={fbUrl}
                onChange={(e) => setFB(e.target.value)}
                placeholder="Link Facebook của bạn"
                className="w-full px-4 py-3 rounded-xl border bg-card"
              />
            </Field>
            <Field label="Website (tùy chọn)">
              <input
                value={webUrl}
                onChange={(e) => setW(e.target.value)}
                placeholder="Website của bạn"
                className="w-full px-4 py-3 rounded-xl border bg-card"
              />
            </Field>
            <Field label="TikTok URL (tùy chọn)">
              <input
                value={tiktokUrl}
                onChange={(e) => setTk(e.target.value)}
                placeholder="Link TikTok của bạn"
                className="w-full px-4 py-3 rounded-xl border bg-card"
              />
            </Field>
            <Field label="Instagram URL (tùy chọn)">
              <input
                value={instagramUrl}
                onChange={(e) => setIg(e.target.value)}
                placeholder="Link Instagram của bạn"
                className="w-full px-4 py-3 rounded-xl border bg-card"
              />
            </Field>
            <Field label="YouTube URL (tùy chọn)">
              <input
                value={youtubeUrl}
                onChange={(e) => setYt(e.target.value)}
                placeholder="Link YouTube của bạn"
                className="w-full px-4 py-3 rounded-xl border bg-card"
              />
            </Field>
            <Field label="Ảnh bìa">
              <input type="file" accept="image/*" onChange={(e) => setCov(e.target.files?.[0] ?? null)} />
            </Field>
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl border">
                ← Quay lại
              </button>
              <button
                onClick={() => setTO(true)}
                disabled={!bizName || !bizDesc || !bizOffer}
                className="flex-1 py-3 rounded-xl bg-gradient-brand text-primary-foreground font-semibold disabled:opacity-50"
              >
                Hoàn tất
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-sm">
          {t("register.hasAccount")}{" "}
          <Link to="/auth/login" className="text-primary font-semibold">
            {t("common.login")}
          </Link>
        </p>
      </div>

      <Dialog open={termsOpen} onOpenChange={setTO}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("terms.title")}</DialogTitle>
          </DialogHeader>
          <div className="text-sm space-y-2 max-h-60 overflow-y-auto">
            {/* DO NOT CHANGE: app name is "Liên Minh Liên Doanh" — t("app.name") tự đổi theo ngôn ngữ */}
            <p>{t("terms.p1", { app: t("app.name") })}</p>
            <p>{t("terms.p2")}</p>
            <p>{t("terms.p3")}</p>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
              className="mt-0.5"
            />
            <span>{t("terms.ageConfirm")}</span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" />
            <span>
              {t("terms.agreePrefix")}{" "}
              <Link to="/dieu-khoan" target="_blank" className="text-primary font-semibold underline">
                Điều khoản sử dụng
              </Link>{" "}
              {t("terms.and")}{" "}
              <Link to="/chinh-sach-bao-mat" target="_blank" className="text-primary font-semibold underline">
                Chính sách bảo mật
              </Link>
            </span>
          </label>
          <button
            onClick={submitFinal}
            disabled={!agree || !ageConfirmed || submitting}
            className="w-full py-3 rounded-xl bg-gradient-brand text-primary-foreground font-semibold disabled:opacity-50"
          >
            {submitting ? t("terms.processing") : t("terms.confirmRegister")}
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  children,
  right,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        {right}
      </div>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </label>
  );
}
