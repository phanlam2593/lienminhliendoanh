import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import Home from "./pages/Home";
import Businesses from "./pages/Businesses";
import BusinessDetail from "./pages/BusinessDetail";
import Offers from "./pages/Offers";
import Members from "./pages/Members";
import Profile from "./pages/Profile";
import Suggest from "./pages/Suggest";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminLogin from "./pages/AdminLogin";
import Admin from "./pages/Admin";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AdminRoute() {
  const { user, loading } = useAuth();
  const [role, setRole] = useState<"loading" | "admin" | "member" | "none">("loading");

  useEffect(() => {
    if (loading) return;
    if (!user) { setRole("none"); return; }
    (supabase as any).rpc("get_my_role").then(({ data }: any) => {
      setRole(data === "admin" ? "admin" : "member");
    });
  }, [user, loading]);

  if (isAdmin()) return <Admin />;
  if (loading || role === "loading") return <div className="p-10 text-center text-sm text-muted-foreground">Đang tải…</div>;
  if (role === "admin") return <AdminDashboard />;
  return <Navigate to="/admin/login" replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner position="top-center" />
        <BrowserRouter>
          <Routes>
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/register" element={<Register />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminRoute />} />
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/doanh-nghiep" element={<Businesses />} />
              <Route path="/dn/:id" element={<BusinessDetail />} />
              <Route path="/uu-dai" element={<Offers />} />
              <Route path="/thanh-vien" element={<Members />} />
              <Route path="/ho-so" element={<Profile />} />
              <Route path="/de-xuat" element={<Suggest />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
