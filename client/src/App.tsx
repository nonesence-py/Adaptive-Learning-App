import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import AppLayout from "./components/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Learn from "./pages/Learn";
import Challenge from "./pages/Challenge";
import WrongQuestions from "./pages/WrongQuestions";
import Review from "./pages/Review";
import Notes from "./pages/Notes";
import Achievements from "./pages/Achievements";
import KnowledgeGraph from "./pages/KnowledgeGraph";
import Report from "./pages/Report";
import Leaderboard from "./pages/Leaderboard";
import Insights from "./pages/Insights";
import Settings from "./pages/Settings";
import AlgorithmDemo from "./pages/AlgorithmDemo";
import { initializeDemoData } from "./lib/demo-data";

// Initialize demo accounts on first load
initializeDemoData();

function AppRoutes() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Switch>
        <Route path="/" component={Login} />
        <Route path="/login" component={Login} />
        <Route>
          <Redirect to="/" />
        </Route>
      </Switch>
    );
  }

  return (
    <AppLayout>
      <Switch>
        <Route path="/login">
          <Redirect to="/dashboard" />
        </Route>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/learn" component={Learn} />
        <Route path="/challenge" component={Challenge} />
        <Route path="/wrong-questions" component={WrongQuestions} />
        <Route path="/review" component={Review} />
        <Route path="/notes" component={Notes} />
        <Route path="/achievements" component={Achievements} />
        <Route path="/knowledge-graph" component={KnowledgeGraph} />
        <Route path="/report" component={Report} />
        <Route path="/leaderboard" component={Leaderboard} />
        <Route path="/insights" component={Insights} />
        <Route path="/settings" component={Settings} />
        <Route path="/algorithm" component={AlgorithmDemo} />
        <Route path="/" component={Dashboard} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <AppRoutes />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
