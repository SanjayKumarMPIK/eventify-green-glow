
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ExploreEvents from "./pages/ExploreEvents";
import NotFound from "./pages/NotFound";
import { EVENTS, REGISTRATIONS } from "./lib/data";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

// Function to ensure dates are properly stringified before storage
const prepareEventsForStorage = (events: any[]) => {
  return events.map(event => ({
    ...event,
    date: event.date instanceof Date ? event.date.toISOString() : event.date,
    registrations: event.registrations.map((reg: any) => ({
      ...reg,
      registrationDate: reg.registrationDate instanceof Date ? 
        reg.registrationDate.toISOString() : reg.registrationDate
    }))
  }));
};

const prepareRegistrationsForStorage = (registrations: any[]) => {
  return registrations.map(reg => ({
    ...reg,
    registrationDate: reg.registrationDate instanceof Date ? 
      reg.registrationDate.toISOString() : reg.registrationDate
  }));
};

const App = () => {
  // Initialize localStorage data
  useEffect(() => {
    if (!localStorage.getItem("events")) {
      localStorage.setItem("events", JSON.stringify(prepareEventsForStorage(EVENTS)));
    }
    if (!localStorage.getItem("userRegistrations")) {
      localStorage.setItem("userRegistrations", JSON.stringify(prepareRegistrationsForStorage(REGISTRATIONS)));
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/explore" element={
                <ProtectedRoute>
                  <ExploreEvents />
                </ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
