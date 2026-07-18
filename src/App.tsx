// build-test-marker: kiểm tra chấm cập nhật đỏ/xanh
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import { OnlineUsersProvider } from "@/lib/onlineUsers";
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

// Chiến lược cache cho React Query:
// - staleTime 30s: dùng ngay dữ liệu cache (không loading nhấp nháy) nhưng coi là "cũ" sau 30s
// - gcTime 5 phút: giữ cache trong bộ nhớ để điều hướng qua lại tức thì
// - refetchOnWindowFocus/refetchOnReconnect: tự làm mới khi quay lại tab hoặc mạng online lại
//   → luôn thấy bản mới nhất mà không cần bấm reload, đồng thời không spam request
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
        <AuthProvider>
          <OnlineUsersProvider>
            <Toaster />
            <Sonner position="top-center" />
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
);

export default App;
