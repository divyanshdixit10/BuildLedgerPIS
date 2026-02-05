import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { useTheme } from '../context/ThemeProvider';
import { 
  LayoutDashboard, 
  Package, 
  Wallet, 
  Users, 
  ClipboardCheck, 
  FileBarChart, 
  Search, 
  LogOut, 
  Menu, 
  Sun, 
  Moon, 
  Laptop,
  ChevronLeft,
  ChevronRight,
  User,
  Bell,
  Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const MainLayout = () => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'EDITOR', 'VIEWER'] },
    { label: 'Materials & Services', path: '/materials', icon: Package, roles: ['ADMIN', 'EDITOR', 'VIEWER'] },
    { label: 'Payments', path: '/payments', icon: Wallet, roles: ['ADMIN', 'EDITOR', 'VIEWER'] },
    { label: 'Vendor Ledger', path: '/vendors', icon: Users, roles: ['ADMIN', 'EDITOR', 'VIEWER'] },
    { label: 'Asset Management', path: '/assets', icon: Monitor, roles: ['ADMIN', 'EDITOR', 'VIEWER'] },
    { label: 'Daily Work', path: '/daily-work', icon: ClipboardCheck, roles: ['ADMIN', 'EDITOR', 'VIEWER'] },
    { label: 'Reports', path: '/reports', icon: FileBarChart, roles: ['ADMIN', 'EDITOR', 'VIEWER'] },
  ];

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      
      {/* Sidebar (Desktop) */}
      <aside 
        className={cn(
          "hidden md:flex flex-col border-r bg-card/50 backdrop-blur-xl transition-all duration-300 z-30",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b">
          {!collapsed && (
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent truncate">
              BuildLedger
            </span>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <nav className="flex-1 py-4 space-y-1 px-2">
          {navItems.filter(item => item.roles.includes(user?.role)).map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center px-3 py-2.5 rounded-lg transition-all group relative overflow-hidden",
                isActive(item.path) 
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0 transition-transform duration-300", isActive(item.path) && "scale-110")} />
              
              {!collapsed && (
                <span className="ml-3 font-medium text-sm truncate">
                  {item.label}
                </span>
              )}

              {/* Tooltip for collapsed state */}
              {collapsed && (
                <div className="absolute left-14 bg-popover text-popover-foreground px-2 py-1 rounded-md text-xs shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                  {item.label}
                </div>
              )}
            </Link>
          ))}
        </nav>

        {/* User Profile Mini (Bottom Sidebar) */}
        <div className="p-4 border-t bg-muted/20">
            <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                    {user?.name?.charAt(0) || 'U'}
                </div>
                {!collapsed && (
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-semibold truncate">{user?.name}</span>
                        <span className="text-xs text-muted-foreground truncate capitalize">{user?.role?.toLowerCase()}</span>
                    </div>
                )}
            </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="h-16 border-b bg-background/80 backdrop-blur-md sticky top-0 z-20 px-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 md:hidden">
                <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(true)}>
                    <Menu className="h-5 w-5" />
                </Button>
                <span className="font-bold text-lg">BuildLedger</span>
            </div>

            {/* Global Search */}
            <div className="hidden md:flex flex-1 max-w-md relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search vendors, payments, items..." 
                    className="pl-9 bg-muted/50 border-none focus-visible:bg-background transition-colors"
                />
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-2 right-2 h-2 w-2 bg-destructive rounded-full" />
                </Button>
                
                {/* Theme Toggle */}
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                >
                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </Button>

                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={logout}
                    className="hidden md:flex text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                </Button>
            </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-muted/10 relative scroll-smooth">
            <AnimatePresence mode="wait">
                <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="mx-auto max-w-7xl space-y-6"
                >
                    <Outlet />
                </motion.div>
            </AnimatePresence>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileOpen(false)} />
            <div className="absolute left-0 top-0 bottom-0 w-64 bg-background border-r p-4 shadow-xl">
                <div className="flex items-center justify-between mb-8">
                    <span className="font-bold text-xl">BuildLedger</span>
                    <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(false)}>
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                </div>
                <nav className="space-y-1">
                    {navItems.filter(item => item.roles.includes(user?.role)).map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                                "flex items-center px-3 py-3 rounded-lg transition-all",
                                isActive(item.path) 
                                ? "bg-primary text-primary-foreground" 
                                : "text-muted-foreground hover:bg-accent"
                            )}
                        >
                            <item.icon className="h-5 w-5 mr-3" />
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    ))}
                    <div className="pt-4 mt-4 border-t">
                        <Button 
                            variant="ghost" 
                            className="w-full justify-start text-destructive"
                            onClick={logout}
                        >
                            <LogOut className="h-5 w-5 mr-3" />
                            Logout
                        </Button>
                    </div>
                </nav>
            </div>
        </div>
      )}
    </div>
  );
};

export default MainLayout;
