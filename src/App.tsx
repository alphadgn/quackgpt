import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UGLY_DUCK_BACKGROUND } from "@/lib/brand-assets";
import Index from "./pages/Index";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import AIDisclosure from "./pages/AIDisclosure";
import NotFound from "./pages/NotFound";

const App = () => (
  <TooltipProvider>
      <Toaster />
      <Sonner />
      {/* Universal background */}
      <div className="app-background fixed inset-0 z-0 pointer-events-none overflow-hidden" style={{ backgroundImage: `linear-gradient(hsl(var(--background) / 0.68), hsl(var(--background) / 0.78)), url(${UGLY_DUCK_BACKGROUND})` }} />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/ai-disclosure" element={<AIDisclosure />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
  </TooltipProvider>
);

export default App;
