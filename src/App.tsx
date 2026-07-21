// build-test-marker: kiểm tra chấm cập nhật đỏ/xanh
import { useEffect, useRef } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { toast } from "sonner";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import { OnlineUsersProvider } from "@/lib/onlineUsers";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useLanguage } from "@/lib/i18n";
import { Layout } from "@/components/Layout";
import Home from "./pages/Home";
import Businesses from "./pages/Businesses";
import BusinessDetail from "./pages/BusinessDetail";
import Offers from "./pages/Offers";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Admin from "./pages/Admin";
import Notifications from "./pages/Notifications";
import Community from "./pages/Community";
import Guide from "./pages/Guide";
import MyReports from "./pages/MyReports";
import Terms from "./pages/Terms";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import CookieThirdParty from "./pages/CookieThirdParty";
import { MessagesInbox, MessagesThread } from "./pages/Messages";
import NotFound from "./pages/NotFound";

const OFFLINE_TOAST_ID = "app-offline-toast";

function NetworkStatusWatcher() {
  const online = useOnlineStatus();
  const wasOffline = useRef(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      toast.error(t("network.offline"), {
        id: OFFLINE_TOAST_ID,
        duration: Infinity,
        description: t("network.offlineDesc"),
      });
    } else {
      toast.dismiss(OFFLINE_TOAST_ID);
      if (wasOffline.current) {
        wasOffline.current = false;
        toast.success(t("network.online"), { duration: 2500 });
      }
    }
  }, [online, t]);

  return null;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LanguageProvider>
          <AuthProvider>
            <OnlineUsersProvider>
              <Toaster />
              <Sonner position="top-center" />
              <NetworkStatusWatcher />
              <BrowserRouter>
                <Routes>
                  <Route path="/auth/login" element={<Login />} />
                  <Route path="/auth/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/dieu-khoan" element={<Terms />} />
                  <Route path="/chinh-sach-bao-mat" element={<PrivacyPolicy />} />
                  <Route path="/chinh-sach-cookie" element={<CookieThirdParty />} />
                  <Route element={<Layout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/kham-pha" element={<Businesses />} />
                    <Route path="/cong-dong" element={<Community />} />
                    <Route path="/dn/:id" element={<BusinessDetail />} />
                    <Route path="/uu-dai" element={<Offers />} />
                    <Route path="/ho-so" element={<Profile />} />
                    <Route path="/ho-so/:id" element={<UserProfile />} />
                    <Route path="/de-xuat" element={<Navigate to="/" replace />} />
                    <Route path="/thong-bao" element={<Notifications />} />
                    <Route path="/tin-nhan" element={<MessagesInbox />} />
                    <Route path="/tin-nhan/:id" element={<MessagesThread />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/huong-dan" element={<Guide />} />
                    <Route path="/bao-cao-cua-toi" element={<MyReports />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </OnlineUsersProvider>
          </AuthProvider>
        </LanguageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
