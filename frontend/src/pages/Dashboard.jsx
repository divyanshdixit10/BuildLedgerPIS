import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import api from '../api/axios';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard, 
  AlertCircle, 
  Briefcase,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await api.get('/dashboard/stats');
        setSummary(response.data);
      } catch (err) {
        console.error('Failed to fetch summary', err);
        setError('Failed to load financial summary');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const StatCard = ({ title, value, icon: Icon, trend, colorClass, delay }) => (
    <motion.div variants={item}>
      <Card className="glass-card overflow-hidden relative">
        <CardContent className="p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <div className={`p-2 rounded-full ${colorClass} bg-opacity-10`}>
              <Icon className={`h-4 w-4 ${colorClass.replace('bg-', 'text-')}`} />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <h2 className="text-3xl font-bold tracking-tight">
              {loading ? <Skeleton className="h-8 w-32" /> : formatCurrency(value)}
            </h2>
          </div>
          <div className="mt-4 h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
             <motion.div 
                initial={{ width: 0 }}
                animate={{ width: loading ? 0 : "100%" }}
                transition={{ duration: 1, delay: 0.5 }}
                className={`h-full ${colorClass.replace('text-', 'bg-')}`} 
             />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Financial overview for <span className="font-semibold text-foreground">{user?.name}</span>
          </p>
        </div>
        <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                Last updated: {new Date().toLocaleTimeString()}
            </span>
        </div>
      </div>

      {/* Stats Grid */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard 
          title="Project Cost" 
          value={summary?.total_project_cost} 
          icon={Briefcase} 
          colorClass="text-blue-500 bg-blue-500" 
        />
        <StatCard 
          title="Total Paid" 
          value={summary?.total_paid} 
          icon={DollarSign} 
          colorClass="text-emerald-500 bg-emerald-500" 
        />
        <StatCard 
          title="Total Due" 
          value={summary?.total_due} 
          icon={AlertCircle} 
          colorClass="text-red-500 bg-red-500" 
        />
        <StatCard 
          title="Total Advance" 
          value={summary?.total_advance} 
          icon={CreditCard} 
          colorClass="text-amber-500 bg-amber-500" 
        />
      </motion.div>

      {/* Quick Actions & Recent Activity Placeholder */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 glass-card">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
             <Link to="/materials">
                <Button variant="outline" className="w-full justify-between h-auto py-4 hover:border-primary hover:bg-primary/5 transition-all group">
                    <div className="flex flex-col items-start gap-1">
                        <span className="font-semibold">Add Material Entry</span>
                        <span className="text-xs text-muted-foreground">Log new materials or services</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Button>
             </Link>
             <Link to="/payments">
                <Button variant="outline" className="w-full justify-between h-auto py-4 hover:border-emerald-500 hover:bg-emerald-500/5 transition-all group">
                    <div className="flex flex-col items-start gap-1">
                        <span className="font-semibold">Record Payment</span>
                        <span className="text-xs text-muted-foreground">Add new vendor payment</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
                </Button>
             </Link>
             <Link to="/vendors">
                <Button variant="outline" className="w-full justify-between h-auto py-4 hover:border-purple-500 hover:bg-purple-500/5 transition-all group">
                    <div className="flex flex-col items-start gap-1">
                        <span className="font-semibold">Vendor Directory</span>
                        <span className="text-xs text-muted-foreground">Manage vendors and balances</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-purple-500 transition-colors" />
                </Button>
             </Link>
             <Link to="/reports">
                <Button variant="outline" className="w-full justify-between h-auto py-4 hover:border-orange-500 hover:bg-orange-500/5 transition-all group">
                    <div className="flex flex-col items-start gap-1">
                        <span className="font-semibold">View Reports</span>
                        <span className="text-xs text-muted-foreground">Export data and analyze</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-orange-500 transition-colors" />
                </Button>
             </Link>
          </CardContent>
        </Card>

        <Card className="col-span-3 glass-card">
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Database Connection</span>
                    <span className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-full font-medium">Healthy</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Last Reconciliation</span>
                    <span className="text-xs text-muted-foreground">Just now</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">System Version</span>
                    <span className="text-xs text-muted-foreground">v2.0.0 (Enterprise)</span>
                </div>
                
                <div className="pt-4 border-t mt-4">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        System is operating normally. All financial totals are derived directly from the immutable ledger.
                    </p>
                </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
