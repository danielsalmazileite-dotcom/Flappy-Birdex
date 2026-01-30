import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatePresence } from "framer-motion";

// Pages
import Home from "@/pages/Home";
import Game from "@/pages/Game";
import OnlineMenu from "@/pages/OnlineMenu";
import CreateRoom from "@/pages/CreateRoom";
import JoinRoom from "@/pages/JoinRoom";
import OnlineGame from "@/pages/OnlineGame";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <AnimatePresence mode="wait">
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/play" component={Game} />
        <Route path="/online" component={OnlineMenu} />
        <Route path="/online/create" component={CreateRoom} />
        <Route path="/online/join" component={JoinRoom} />
        <Route path="/online/game/:code" component={OnlineGame} />
        <Route component={NotFound} />
      </Switch>
    </AnimatePresence>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
