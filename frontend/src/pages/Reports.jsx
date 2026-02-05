import { useState, useEffect } from 'react';
import api from '../api/axios';
import { 
  Download, 
  Calendar as CalendarIcon, 
  Filter, 
  FileBarChart, 
  Package, 
  Users 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';

const Reports = () => {
  const [activeTab, setActiveTab] = useState('DATE_WISE');
  const [dateWiseData, setDateWiseData] = useState([]);
  const [itemWiseData, setItemWiseData] = useState([]);
  const [vendorWiseData, setVendorWiseData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
        if (activeTab === 'DATE_WISE') {
            const params = {};
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;
            const res = await api.get('/reports/expenses', { params });
            setDateWiseData(res.data);
        } else if (activeTab === 'ITEM_WISE') {
            const res = await api.get('/reports/items');
            setItemWiseData(res.data);
        } else if (activeTab === 'VENDOR_WISE') {
            const res = await api.get('/reports/vendors');
            setVendorWiseData(res.data);
        }
    } catch (error) {
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  const handleDateFilter = () => {
      if (activeTab === 'DATE_WISE') {
          fetchData();
      }
  };

  const exportToCSV = () => {
      let dataToExport = [];
      let filename = 'report.csv';

      if (activeTab === 'DATE_WISE') {
          dataToExport = dateWiseData;
          filename = 'date_wise_expenses.csv';
      } else if (activeTab === 'ITEM_WISE') {
          dataToExport = itemWiseData;
          filename = 'item_wise_consumption.csv';
      } else if (activeTab === 'VENDOR_WISE') {
          dataToExport = vendorWiseData;
          filename = 'vendor_wise_ledger.csv';
      }

      if (dataToExport.length === 0) {
          alert('No data to export');
          return;
      }

      const headers = Object.keys(dataToExport[0]);
      const csvContent = [
          headers.join(','),
          ...dataToExport.map(row => headers.map(fieldName => JSON.stringify(row[fieldName])).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      if (link.download !== undefined) {
          const url = URL.createObjectURL(blob);
          link.setAttribute('href', url);
          link.setAttribute('download', filename);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">View expenses, item consumption, and vendor summaries</p>
        </div>
        
        <Button onClick={exportToCSV} variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b overflow-x-auto pb-1">
        <Button 
            variant={activeTab === 'DATE_WISE' ? 'default' : 'ghost'} 
            onClick={() => setActiveTab('DATE_WISE')}
            className="gap-2"
        >
            <FileBarChart className="h-4 w-4" /> Date-wise Expenses
        </Button>
        <Button 
            variant={activeTab === 'ITEM_WISE' ? 'default' : 'ghost'} 
            onClick={() => setActiveTab('ITEM_WISE')}
            className="gap-2"
        >
            <Package className="h-4 w-4" /> Item-wise Consumption
        </Button>
        <Button 
            variant={activeTab === 'VENDOR_WISE' ? 'default' : 'ghost'} 
            onClick={() => setActiveTab('VENDOR_WISE')}
            className="gap-2"
        >
            <Users className="h-4 w-4" /> Vendor Ledger
        </Button>
      </div>

      <Card className="min-h-[400px]">
        <CardContent className="p-6">
            {/* Filters for Date Wise */}
            {activeTab === 'DATE_WISE' && (
                <div className="flex flex-col sm:flex-row gap-4 mb-6 items-end">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Start Date</label>
                        <Input 
                            type="date" 
                            value={startDate} 
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">End Date</label>
                        <Input 
                            type="date" 
                            value={endDate} 
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    <Button onClick={handleDateFilter} className="gap-2">
                        <Filter className="h-4 w-4" /> Filter
                    </Button>
                </div>
            )}

            {/* Content Area */}
            {loading ? (
                 <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                 </div>
            ) : (
                <div className="overflow-x-auto">
                    {activeTab === 'DATE_WISE' && (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-medium">
                                <tr>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3 text-right">Total Expense</th>
                                    <th className="px-4 py-3 text-right">Materials Cost</th>
                                    <th className="px-4 py-3 text-right">Services Cost</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {dateWiseData.length === 0 ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No data found for selected period</td></tr>
                                ) : (
                                    dateWiseData.map((row, i) => (
                                        <tr key={i} className="hover:bg-muted/30">
                                            <td className="px-4 py-3 font-medium">{row.date}</td>
                                            <td className="px-4 py-3 text-right font-mono font-bold">{formatCurrency(row.total_expense)}</td>
                                            <td className="px-4 py-3 text-right font-mono text-muted-foreground">{formatCurrency(row.material_cost)}</td>
                                            <td className="px-4 py-3 text-right font-mono text-muted-foreground">{formatCurrency(row.service_cost)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}

                    {activeTab === 'ITEM_WISE' && (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-medium">
                                <tr>
                                    <th className="px-4 py-3">Item Name</th>
                                    <th className="px-4 py-3 text-right">Total Quantity</th>
                                    <th className="px-4 py-3 text-center">Unit</th>
                                    <th className="px-4 py-3 text-right">Avg Rate</th>
                                    <th className="px-4 py-3 text-right">Total Cost</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {itemWiseData.length === 0 ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No item consumption data available</td></tr>
                                ) : (
                                    itemWiseData.map((row, i) => (
                                        <tr key={i} className="hover:bg-muted/30">
                                            <td className="px-4 py-3 font-medium">{row.Item?.name}</td>
                                            <td className="px-4 py-3 text-right font-mono">{row.total_quantity}</td>
                                            <td className="px-4 py-3 text-center text-muted-foreground text-xs">{row.unit}</td>
                                            <td className="px-4 py-3 text-right font-mono text-muted-foreground">{formatCurrency(row.avg_rate)}</td>
                                            <td className="px-4 py-3 text-right font-mono font-bold">{formatCurrency(row.total_cost)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}

                    {activeTab === 'VENDOR_WISE' && (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-medium">
                                <tr>
                                    <th className="px-4 py-3">Vendor Name</th>
                                    <th className="px-4 py-3 text-right">Total Material Cost</th>
                                    <th className="px-4 py-3 text-right">Total Paid</th>
                                    <th className="px-4 py-3 text-right">Due Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {vendorWiseData.length === 0 ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No vendor data available</td></tr>
                                ) : (
                                    vendorWiseData.map((row, i) => (
                                        <tr key={i} className="hover:bg-muted/30">
                                            <td className="px-4 py-3 font-medium">{row.name}</td>
                                            <td className="px-4 py-3 text-right font-mono text-muted-foreground">{formatCurrency(row.total_material_cost)}</td>
                                            <td className="px-4 py-3 text-right font-mono text-muted-foreground">{formatCurrency(row.total_paid_outflow)}</td>
                                            <td className="px-4 py-3 text-right font-mono font-bold text-destructive">{formatCurrency(row.true_due)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
