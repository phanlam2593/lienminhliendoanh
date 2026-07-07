import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
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
import Nearby from "./pages/Nearby";
import { MessagesInbox, MessagesThread } from "./pages/Messages";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <OnlineUsersProvider>
          <Toaster />
          <Sonner position="top-center" />
          <BrowserRouter>
            <Routes>
              <Route path="/auth/login" element={<Login />} />
              <Route path="/auth/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
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
                <Route path="/quanh-ban" element={<Nearby />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </OnlineUsersProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
