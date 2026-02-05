import { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { useAuth } from '../auth/AuthProvider';
import { useToast } from '../context/ToastProvider';
import { 
  Plus, 
  Search, 
  Building2,
  Phone,
  FileText,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';
import { motion } from 'framer-motion';

import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';

const Vendors = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  // Data State
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Create Vendor State
  const [createData, setCreateData] = useState({ name: '', contact_details: '', tax_id: '' });
  
  const canEdit = ['ADMIN', 'EDITOR'].includes(user?.role);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const res = await api.get('/vendors/ledger');
      setVendors(res.data);
    } catch (error) {
      console.error(error);
      addToast('Failed to load vendor data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/vendors', createData);
      setShowCreateForm(false);
      setCreateData({ name: '', contact_details: '', tax_id: '' });
      fetchVendors();
      addToast('Vendor created successfully', 'success');
    } catch (error) {
      addToast('Error creating vendor', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter Logic
  const filteredVendors = useMemo(() => {
    return vendors.filter(v => 
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.contact_details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.tax_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [vendors, searchTerm]);

  // Helpers
  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendor Ledger</h1>
          <p className="text-muted-foreground">Manage vendors and track balances</p>
        </div>
        
        {canEdit && (
          <Button onClick={() => setShowCreateForm(true)} className="shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-4 w-4" /> Add Vendor
          </Button>
        )}
      </div>

      {/* Search */}
      <Card className="glass-card">
        <CardContent className="p-4">
            <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search by Name, Contact, or Tax ID..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-background/50"
                />
            </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-medium sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-4">Vendor Details</th>
                <th className="px-6 py-4 text-right">Total Materials</th>
                <th className="px-6 py-4 text-right">Total Paid</th>
                <th className="px-6 py-4 text-right">Allocated</th>
                <th className="px-6 py-4 text-right">Due Balance</th>
                <th className="px-6 py-4 text-right">Advance Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-48" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-24 ml-auto" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-24 ml-auto" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-24 ml-auto" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-24 ml-auto" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-24 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredVendors.length === 0 ? (
                <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                            <Building2 className="h-8 w-8 opacity-50" />
                            <p>No vendors found matching your criteria</p>
                        </div>
                    </td>
                </tr>
              ) : (
                filteredVendors.map((vendor) => (
                  <motion.tr 
                    key={vendor.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    <td className="px-6 py-4">
                        <div className="flex flex-col">
                            <span className="font-semibold text-foreground flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                {vendor.name}
                            </span>
                            {(vendor.contact_details || vendor.tax_id) && (
                                <div className="flex flex-col mt-1 ml-6 gap-0.5 text-xs text-muted-foreground">
                                    {vendor.contact_details && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {vendor.contact_details}</span>}
                                    {vendor.tax_id && <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {vendor.tax_id}</span>}
                                </div>
                            )}
                        </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-muted-foreground">
                        {formatCurrency(vendor.total_material_cost || 0)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-muted-foreground">
                        {formatCurrency(vendor.total_paid_outflow || 0)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-muted-foreground">
                        {formatCurrency(vendor.total_allocated || 0)}
                    </td>
                    <td className="px-6 py-4 text-right">
                        {vendor.true_due > 0 ? (
                            <Badge variant="danger" className="font-mono">
                                {formatCurrency(vendor.true_due)}
                            </Badge>
                        ) : (
                            <span className="text-muted-foreground font-mono">-</span>
                        )}
                    </td>
                    <td className="px-6 py-4 text-right">
                        {vendor.advance_balance > 0 ? (
                            <Badge variant="warning" className="font-mono">
                                {formatCurrency(vendor.advance_balance)}
                            </Badge>
                        ) : (
                            <span className="text-muted-foreground font-mono">-</span>
                        )}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Vendor Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Add New Vendor</DialogTitle>
                <DialogDescription>Create a new vendor profile.</DialogDescription>
            </DialogHeader>
            <form id="vendor-form" onSubmit={handleCreateSubmit} className="grid gap-4 py-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Vendor Name</label>
                    <Input 
                        required 
                        value={createData.name} 
                        onChange={e => setCreateData({...createData, name: e.target.value})} 
                        placeholder="Enter vendor name"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Contact Details</label>
                    <Input 
                        value={createData.contact_details} 
                        onChange={e => setCreateData({...createData, contact_details: e.target.value})} 
                        placeholder="Phone, Email, Address"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Tax ID / GST</label>
                    <Input 
                        value={createData.tax_id} 
                        onChange={e => setCreateData({...createData, tax_id: e.target.value})} 
                        placeholder="Optional"
                    />
                </div>
            </form>
            <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
                <Button type="submit" form="vendor-form" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save Vendor'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Vendors;
