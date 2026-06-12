import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AdminGuard({ children }: { children: React.ReactNode }) {
  if (!isAdmin()) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
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
            <Route path="/admin" element={<AdminGuard><Admin /></AdminGuard>} />
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
