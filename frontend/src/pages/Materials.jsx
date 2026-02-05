import { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { useAuth } from '../auth/AuthProvider';
import { useToast } from '../context/ToastProvider';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  FileText, 
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Skeleton } from '../components/ui/skeleton';

const Materials = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  // Data State
  const [entries, setEntries] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    paid_to_vendor_id: '',
    source_vendor_id: '', // Optional
    item_id: '',
    quantity: '',
    unit: '',
    total_amount: '',
    remarks: ''
  });

  const canEdit = ['ADMIN', 'EDITOR'].includes(user?.role);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [entriesRes, vendorsRes, itemsRes] = await Promise.all([
        api.get('/materials'),
        api.get('/vendors'),
        api.get('/items')
      ]);
      setEntries(entriesRes.data);
      setVendors(vendorsRes.data);
      setItems(itemsRes.data);
    } catch (error) {
      console.error('Error fetching data', error);
      addToast('Failed to load ledger data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'item_id') {
        const selectedItem = items.find(i => i.id === parseInt(value));
        setFormData(prev => ({ 
            ...prev, 
            [name]: value,
            unit: selectedItem ? selectedItem.unit : prev.unit
        }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/materials/${editingId}`, formData);
        addToast('Entry updated successfully', 'success');
      } else {
        await api.post('/materials', formData);
        addToast('Entry created successfully', 'success');
      }
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving entry', error);
      addToast(error.response?.data?.message || 'Error saving entry', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      entry_date: new Date().toISOString().split('T')[0],
      paid_to_vendor_id: '',
      source_vendor_id: '',
      item_id: '',
      quantity: '',
      unit: '',
      total_amount: '',
      remarks: ''
    });
  };

  const openEditDialog = (entry) => {
    setEditingId(entry.id);
    setFormData({
      entry_date: entry.entry_date,
      paid_to_vendor_id: entry.paid_to_vendor_id || '',
      source_vendor_id: entry.source_vendor_id || '',
      item_id: entry.item_id,
      quantity: entry.quantity,
      unit: entry.unit,
      total_amount: entry.total_amount,
      remarks: entry.remarks || ''
    });
    setIsDialogOpen(true);
  };

  // Filter Logic
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => 
      entry.Item?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.PaidToVendor?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.remarks?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [entries, searchTerm]);

  // Render Helpers
  const getStatusBadge = (paid, total) => {
    const paidAmount = parseFloat(paid || 0);
    const totalAmount = parseFloat(total || 0);
    
    if (paidAmount >= totalAmount - 1) return <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Paid</Badge>;
    if (paidAmount > 0) return <Badge variant="warning" className="gap-1"><Clock className="h-3 w-3" /> Partial</Badge>;
    return <Badge variant="danger" className="gap-1"><AlertCircle className="h-3 w-3" /> Unpaid</Badge>;
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ledger</h1>
          <p className="text-muted-foreground">Materials & Services Registry</p>
        </div>
        
        {canEdit && (
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-4 w-4" /> New Entry
          </Button>
        )}
      </div>

      {/* Filters & Search */}
      <Card className="glass-card">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search by Item, Vendor, or Remarks..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-background/50"
                />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" className="flex-1 sm:flex-none">
                    <Filter className="mr-2 h-4 w-4" /> Filter
                </Button>
                <Button variant="outline" className="flex-1 sm:flex-none">
                    <CalendarIcon className="mr-2 h-4 w-4" /> Date
                </Button>
            </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-medium sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Item Details</th>
                <th className="px-6 py-4">Payee Vendor</th>
                <th className="px-6 py-4 text-right">Quantity</th>
                <th className="px-6 py-4 text-right">Rate</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4 text-center">Status</th>
                {canEdit && <th className="px-6 py-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-12" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
                    {canEdit && <td className="px-6 py-4"><Skeleton className="h-8 w-8 rounded-md ml-auto" /></td>}
                  </tr>
                ))
              ) : filteredEntries.length === 0 ? (
                <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                            <FileText className="h-8 w-8 opacity-50" />
                            <p>No entries found matching your criteria</p>
                        </div>
                    </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <motion.tr 
                    key={entry.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    <td className="px-6 py-4 font-medium whitespace-nowrap">
                        {format(new Date(entry.entry_date), 'dd MMM yyyy')}
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex flex-col">
                            <span className="font-semibold text-foreground">{entry.Item?.name}</span>
                            {entry.remarks && <span className="text-xs text-muted-foreground truncate max-w-[200px]">{entry.remarks}</span>}
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex flex-col">
                            <span>{entry.PaidToVendor?.name}</span>
                            {entry.source_vendor_id !== entry.paid_to_vendor_id && (
                                <span className="text-xs text-muted-foreground">Src: {entry.SourceVendor?.name}</span>
                            )}
                        </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono">
                        {entry.quantity} <span className="text-muted-foreground text-xs">{entry.unit}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-muted-foreground">
                        {formatCurrency(entry.rate)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold">
                        {formatCurrency(entry.total_amount)}
                    </td>
                    <td className="px-6 py-4 text-center">
                        {getStatusBadge(entry.paid_amount, entry.total_amount)}
                    </td>
                    {canEdit && (
                        <td className="px-6 py-4 text-right">
                            <Button variant="ghost" size="sm" onClick={() => openEditDialog(entry)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                Edit
                            </Button>
                        </td>
                    )}
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <div className="space-y-4">
            <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Entry' : 'New Material/Service Entry'}</DialogTitle>
                <p className="text-sm text-muted-foreground">Record a new transaction in the ledger.</p>
            </DialogHeader>
            
            <form id="material-form" onSubmit={handleSubmit} className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Date</label>
                        <Input 
                            type="date" 
                            name="entry_date" 
                            value={formData.entry_date} 
                            onChange={handleInputChange} 
                            required 
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Payee Vendor</label>
                        <select 
                            name="paid_to_vendor_id" 
                            value={formData.paid_to_vendor_id} 
                            onChange={handleInputChange}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            required
                        >
                            <option value="">Select Vendor</option>
                            {vendors.map(v => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <label className="text-sm font-medium">Item</label>
                        <select 
                            name="item_id" 
                            value={formData.item_id} 
                            onChange={handleInputChange}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            required
                        >
                            <option value="">Select Item</option>
                            {items.map(i => (
                                <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Quantity</label>
                        <div className="flex gap-2">
                            <Input 
                                type="number" 
                                name="quantity" 
                                step="0.01"
                                placeholder="0.00"
                                value={formData.quantity} 
                                onChange={handleInputChange} 
                                required 
                            />
                            <div className="flex items-center justify-center bg-muted px-3 rounded-md text-sm text-muted-foreground min-w-[3rem]">
                                {formData.unit || '-'}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Total Amount (₹)</label>
                        <Input 
                            type="number" 
                            name="total_amount" 
                            step="0.01"
                            placeholder="0.00"
                            value={formData.total_amount} 
                            onChange={handleInputChange} 
                            required 
                            className="font-mono text-lg font-bold"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Remarks (Optional)</label>
                    <Input 
                        name="remarks" 
                        value={formData.remarks} 
                        onChange={handleInputChange} 
                        placeholder="Vehicle No, Site location, etc."
                    />
                </div>
            </form>

            <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" form="material-form" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : (editingId ? 'Update Entry' : 'Create Entry')}
                </Button>
            </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
};

export default Materials;
