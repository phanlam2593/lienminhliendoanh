import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StoreProvider } from "@/lib/store";
import { Layout } from "@/components/Layout";
import Home from "./pages/Home";
import Discover from "./pages/Discover";
import BusinessDetail from "./pages/BusinessDetail";
import Register from "./pages/Register";
import MyOffers from "./pages/MyOffers";
import MyProfile from "./pages/MyProfile";
import Admin from "./pages/Admin";
import Suggest from "./pages/Suggest";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <StoreProvider>
        <Toaster />
        <Sonner position="top-center" />
        <BrowserRouter>
          <Routes>
            <Route path="/dang-ky" element={<Register />} />
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/kham-pha" element={<Discover />} />
              <Route path="/dn/:id" element={<BusinessDetail />} />
              <Route path="/uu-dai" element={<MyOffers />} />
              <Route path="/toi" element={<MyProfile />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/de-xuat" element={<Suggest />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </StoreProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
