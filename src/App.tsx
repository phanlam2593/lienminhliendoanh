import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { Layout } from "@/components/Layout";
import Home from "./pages/Home";
import Businesses from "./pages/Businesses";
import BusinessDetail from "./pages/BusinessDetail";
import Offers from "./pages/Offers";
import Profile from "./pages/Profile";
import Suggest from "./pages/Suggest";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Admin from "./pages/Admin";
import Notifications from "./pages/Notifications";
import { MessagesInbox, MessagesThread } from "./pages/Messages";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/kham-pha" element={<Businesses />} />
              <Route path="/dn/:id" element={<BusinessDetail />} />
              <Route path="/uu-dai" element={<Offers />} />
              <Route path="/ho-so" element={<Profile />} />
              <Route path="/de-xuat" element={<Suggest />} />
              <Route path="/thong-bao" element={<Notifications />} />
              <Route path="/tin-nhan" element={<MessagesInbox />} />
              <Route path="/tin-nhan/:id" element={<MessagesThread />} />
              <Route path="/admin" element={<Admin />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
