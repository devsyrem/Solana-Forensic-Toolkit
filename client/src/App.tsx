import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import Visualization from "@/pages/Visualization";
import Analytics from "@/pages/Analytics";
import Help from "@/pages/Help";
import NotFound from "@/pages/not-found";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ThemeProvider } from "next-themes";

function Router() {
  return (
    <div className="min-h-screen flex flex-col bg-solana-dark text-white">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/visualization/:walletAddress?" component={Visualization} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/help" component={Help} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
