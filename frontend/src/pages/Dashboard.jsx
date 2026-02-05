import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../auth/AuthProvider';
import { 
  Briefcase, 
  DollarSign, 
  AlertCircle, 
  CreditCard, 
  TrendingUp, 
  ArrowRight,
  Package,
  Activity,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentMaterials, setRecentMaterials] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Parallel data fetching for performance
        const [statsRes, materialsRes, paymentsRes, vendorsRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/materials'), // In a real app, use ?limit=5
          api.get('/payments'),  // In a real app, use ?limit=5
          api.get('/vendors/ledger')
        ]);

        setStats(statsRes.data);
        
        // Process recent activity
        // Sort by date/id descending if backend doesn't
        const sortedMaterials = materialsRes.data
          .sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date))
          .slice(0, 5);
        setRecentMaterials(sortedMaterials);

        const sortedPayments = paymentsRes.data
          .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))
          .slice(0, 5);
        setRecentPayments(sortedPayments);

        // Generate Alerts
        const newAlerts = [];
        const vendors = vendorsRes.data;
        
        // 1. Over-advance vendors (Advance > 50k - arbitrary threshold for enterprise feel)
        const overAdvanceVendors = vendors.filter(v => parseFloat(v.balance) < -50000);
        overAdvanceVendors.forEach(v => {
          newAlerts.push({
            type: 'warning',
            title: 'High Advance Balance',
            message: `${v.name} has ${formatCurrency(Math.abs(v.balance))} in advance.`,
            action: '/vendors'
          });
        });

        // 2. High Dues (Due > 1 Lakh)
        const highDueVendors = vendors.filter(v => parseFloat(v.true_due) > 100000);
        highDueVendors.forEach(v => {
          newAlerts.push({
            type: 'danger',
            title: 'High Pending Dues',
            message: `${v.name} needs payment of ${formatCurrency(v.true_due)}.`,
            action: '/payments'
          });
        });

        setAlerts(newAlerts);

      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-7">
          <Skeleton className="col-span-4 h-96 rounded-xl" />
          <Skeleton className="col-span-3 h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Executive Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time financial overview for <span className="font-semibold text-slate-900 dark:text-slate-100">{user?.name}</span>
          </p>
        </div>
        <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-500">Current Session</p>
            <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard 
          title="Total Project Cost" 
          value={stats?.total_project_cost} 
          icon={Briefcase} 
          trend="+2.5% from last month"
          colorClass="text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30" 
        />
        <StatCard 
          title="Total Paid" 
          value={stats?.total_paid} 
          icon={DollarSign} 
          colorClass="text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30" 
        />
        <StatCard 
          title="Outstanding Dues" 
          value={stats?.total_due} 
          icon={AlertCircle} 
          colorClass="text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30" 
        />
        <StatCard 
          title="Active Advances" 
          value={stats?.total_advance} 
          icon={CreditCard} 
          colorClass="text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30" 
        />
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-7">
        
        {/* Left Column: Recent Activity & Quick Actions */}
        <div className="col-span-4 space-y-6">
          
          {/* Quick Actions */}
          <Card className="border-none shadow-sm bg-white dark:bg-slate-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <ActionCard 
                  to="/materials" 
                  title="Log Material / Service" 
                  desc="Record new expenses" 
                  color="hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20" 
               />
               <ActionCard 
                  to="/payments" 
                  title="Record Payment" 
                  desc="Pay vendor or advance" 
                  color="hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" 
               />
            </CardContent>
          </Card>

          {/* Recent Materials */}
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Recent Entries</CardTitle>
              <Link to="/materials">
                <Button variant="ghost" size="sm" className="text-xs">View All</Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {recentMaterials.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Package className="h-5 w-5 text-slate-500" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{item.Item?.name}</p>
                        <p className="text-xs text-muted-foreground">{item.PaidToVendor?.name} • {new Date(item.entry_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{formatCurrency(item.total_amount)}</p>
                      <Badge variant={item.paid_amount >= item.total_amount ? "success" : "secondary"} className="text-[10px] h-5 px-1.5">
                        {item.paid_amount >= item.total_amount ? 'Paid' : 'Pending'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Alerts & Recent Payments */}
        <div className="col-span-3 space-y-6">
          
          {/* System Alerts */}
          {alerts.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-500">
                  <AlertTriangle className="h-5 w-5" />
                  Attention Required
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {alerts.map((alert, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/60 dark:bg-black/20 border border-amber-100 dark:border-amber-900/50">
                    <div className={`mt-0.5 h-2 w-2 rounded-full ${alert.type === 'danger' ? 'bg-red-500' : 'bg-amber-500'}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{alert.title}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{alert.message}</p>
                    </div>
                    <Link to={alert.action}>
                      <Button variant="ghost" size="icon" className="h-6 w-6"><ArrowRight className="h-3 w-3" /></Button>
                    </Link>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Recent Payments */}
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Recent Payments</CardTitle>
              <Link to="/payments">
                <Button variant="ghost" size="sm" className="text-xs">View All</Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {recentPayments.map((payment, i) => (
                  <div key={i} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{payment.Vendor?.name}</p>
                        <p className="text-xs text-muted-foreground">{new Date(payment.payment_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(payment.amount)}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase">{payment.payment_mode}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Sub-components
const StatCard = ({ title, value, icon: Icon, trend, colorClass }) => {
  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);
  
  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className={`p-2 rounded-full ${colorClass}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-2xl font-bold tracking-tight">{formatCurrency(value)}</div>
          {trend && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              {trend}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const ActionCard = ({ to, title, desc, color }) => (
  <Link to={to}>
    <div className={`p-4 rounded-lg border bg-card text-card-foreground shadow-sm transition-all cursor-pointer group ${color}`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-sm">{title}</h3>
          <p className="text-xs text-muted-foreground mt-1">{desc}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  </Link>
);

export default Dashboard;
