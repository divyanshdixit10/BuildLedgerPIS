import { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { useAuth } from '../auth/AuthProvider';
import { useToast } from '../context/ToastProvider';
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRightLeft,
  Banknote,
  CreditCard,
  Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Skeleton } from '../components/ui/skeleton';

const Payments = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  // Data State
  const [payments, setPayments] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Create Payment State
  const [createData, setCreateData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    vendor_id: '',
    amount: '',
    payment_mode: 'BANK_TRANSFER',
    payment_type: 'REGULAR',
    reference_no: '',
    remarks: ''
  });

  // Allocation State
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [allocationCandidates, setAllocationCandidates] = useState([]);
  const [allocations, setAllocations] = useState({}); // { entry_id: amount }
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  const canEdit = ['ADMIN', 'EDITOR'].includes(user?.role);

  useEffect(() => {
    fetchPayments();
    fetchVendors();
  }, []);

  const fetchPayments = async () => {
    try {
      const res = await api.get('/payments');
      setPayments(res.data);
    } catch (error) {
      console.error(error);
      addToast('Failed to load payments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const res = await api.get('/vendors');
      setVendors(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/payments', createData);
      setShowCreateForm(false);
      setCreateData({
        payment_date: new Date().toISOString().split('T')[0],
        vendor_id: '',
        amount: '',
        payment_mode: 'BANK_TRANSFER',
        payment_type: 'REGULAR',
        reference_no: '',
        remarks: ''
      });
      fetchPayments();
      addToast('Payment created successfully', 'success');
    } catch (error) {
      addToast(error.response?.data?.message || 'Error creating payment', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAllocationModal = async (payment) => {
    setSelectedPayment(payment);
    setAllocations({});
    setShowAllocateModal(true);
    setLoadingCandidates(true);
    try {
      const res = await api.get(`/materials?vendor_id=${payment.vendor_id}&payment_status=NOT_PAID`);
      setAllocationCandidates(res.data);
    } catch (error) {
      addToast('Error fetching pending materials', 'error');
      setShowAllocateModal(false);
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleAllocate = async () => {
    if (!selectedPayment) return;
    
    const payload = {
        allocations: Object.entries(allocations)
            .filter(([_, amount]) => parseFloat(amount) > 0)
            .map(([id, amount]) => ({
                entry_id: id,
                amount: parseFloat(amount)
            }))
    };
    
    setIsSubmitting(true);
    try {
        await api.post(`/payments/${selectedPayment.id}/allocate`, payload);
        addToast('Allocation successful', 'success');
        setShowAllocateModal(false);
        fetchPayments();
    } catch (error) {
        addToast(error.response?.data?.message || 'Allocation failed', 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  // Filter Logic
  const filteredPayments = useMemo(() => {
    return payments.filter(payment => 
      payment.Vendor?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.remarks?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.payment_mode.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [payments, searchTerm]);

  // Helpers
  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

  const getAllocationStatusBadge = (status) => {
    switch (status) {
      case 'FULLY_ALLOCATED':
        return <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Fully Allocated</Badge>;
      case 'PARTIAL':
        return <Badge variant="warning" className="gap-1"><Clock className="h-3 w-3" /> Partial</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1"><AlertCircle className="h-3 w-3" /> Unallocated</Badge>;
    }
  };

  const getPaymentModeIcon = (mode) => {
    switch (mode) {
      case 'CASH': return <Banknote className="h-4 w-4" />;
      case 'UPI': return <Wallet className="h-4 w-4" />;
      default: return <CreditCard className="h-4 w-4" />;
    }
  };

  // Allocation Calculations
  const totalAllocatedInSession = Object.values(allocations).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  const paymentRemaining = selectedPayment ? parseFloat(selectedPayment.amount) - (parseFloat(selectedPayment.allocated_amount) || 0) : 0;
  const availableToAllocate = paymentRemaining - totalAllocatedInSession;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground">Manage vendor payments and allocations</p>
        </div>
        
        {canEdit && (
          <Button onClick={() => setShowCreateForm(true)} className="shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-4 w-4" /> New Payment
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search by Vendor, Remarks, or Mode..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-background/50"
                />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" className="flex-1 sm:flex-none">
                    <Filter className="mr-2 h-4 w-4" /> Filter
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
                <th className="px-6 py-4">Vendor</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4">Mode</th>
                <th className="px-6 py-4 text-center">Allocation Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-20 ml-auto" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-24 mx-auto rounded-full" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-8 w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredPayments.length === 0 ? (
                <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                            <Banknote className="h-8 w-8 opacity-50" />
                            <p>No payments found matching your criteria</p>
                        </div>
                    </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <motion.tr 
                    key={payment.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    <td className="px-6 py-4 font-medium whitespace-nowrap">
                        {format(new Date(payment.payment_date), 'dd MMM yyyy')}
                    </td>
                    <td className="px-6 py-4 font-medium">
                        {payment.Vendor?.name}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-lg">
                        {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                            {getPaymentModeIcon(payment.payment_mode)}
                            <span className="capitalize">{payment.payment_mode.replace('_', ' ').toLowerCase()}</span>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                        {getAllocationStatusBadge(payment.allocation_status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                        {canEdit && payment.allocation_status !== 'FULLY_ALLOCATED' && (
                            <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => openAllocationModal(payment)}
                                className="gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
                            >
                                <ArrowRightLeft className="h-3 w-3" /> Allocate
                            </Button>
                        )}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Payment Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
                <DialogTitle>New Payment</DialogTitle>
                <DialogDescription>Record a new payment to a vendor.</DialogDescription>
            </DialogHeader>
            <form id="payment-form" onSubmit={handleCreateSubmit} className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Date</label>
                        <Input 
                            type="date" 
                            required 
                            value={createData.payment_date} 
                            onChange={e => setCreateData({...createData, payment_date: e.target.value})} 
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Amount (₹)</label>
                        <Input 
                            type="number" 
                            step="0.01" 
                            required 
                            placeholder="0.00"
                            value={createData.amount} 
                            onChange={e => setCreateData({...createData, amount: e.target.value})}
                            className="font-mono font-bold" 
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Vendor</label>
                    <select 
                        required 
                        value={createData.vendor_id} 
                        onChange={e => setCreateData({...createData, vendor_id: e.target.value})}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                        <option value="">Select Vendor</option>
                        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Mode</label>
                        <select 
                            value={createData.payment_mode} 
                            onChange={e => setCreateData({...createData, payment_mode: e.target.value})}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            <option value="BANK_TRANSFER">Bank Transfer</option>
                            <option value="CASH">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="CHEQUE">Cheque</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Reference No.</label>
                        <Input 
                            value={createData.reference_no} 
                            onChange={e => setCreateData({...createData, reference_no: e.target.value})}
                            placeholder="Txn ID / Cheque No"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Remarks</label>
                    <Input 
                        value={createData.remarks} 
                        onChange={e => setCreateData({...createData, remarks: e.target.value})}
                        placeholder="Optional notes"
                    />
                </div>
            </form>
            <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
                <Button type="submit" form="payment-form" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create Payment'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Allocation Dialog */}
      <Dialog open={showAllocateModal} onOpenChange={setShowAllocateModal}>
        <DialogContent className="sm:max-w-[900px] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
            {selectedPayment && (
                <>
                    <DialogHeader className="p-6 pb-2 border-b bg-muted/20">
                        <div className="flex justify-between items-start">
                            <div>
                                <DialogTitle>Allocate Payment</DialogTitle>
                                <DialogDescription className="mt-1">
                                    Allocating payment of <strong>{formatCurrency(selectedPayment.amount)}</strong> for <strong>{selectedPayment.Vendor?.name}</strong>
                                </DialogDescription>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-muted-foreground">Available to Allocate</div>
                                <div className={`text-xl font-bold font-mono ${availableToAllocate < 0 ? 'text-destructive' : 'text-success'}`}>
                                    {formatCurrency(availableToAllocate)}
                                </div>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-auto p-0">
                        {loadingCandidates ? (
                            <div className="p-8 space-y-4">
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                            </div>
                        ) : (
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-medium sticky top-0 z-10 backdrop-blur-sm shadow-sm">
                                    <tr>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Item Details</th>
                                        <th className="px-4 py-3 text-right">Total</th>
                                        <th className="px-4 py-3 text-right">Paid</th>
                                        <th className="px-4 py-3 text-right">Due</th>
                                        <th className="px-4 py-3 text-right w-[180px]">Allocate</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {allocationCandidates.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                                No pending bills found for this vendor.
                                            </td>
                                        </tr>
                                    ) : (
                                        allocationCandidates.map(candidate => {
                                            const due = parseFloat(candidate.due_amount);
                                            const paid = parseFloat(candidate.paid_amount);
                                            const total = parseFloat(candidate.total_amount);
                                            const currentAlloc = allocations[candidate.id] || '';
                                            
                                            return (
                                                <tr key={candidate.id} className="hover:bg-muted/30">
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        {format(new Date(candidate.entry_date), 'dd MMM')}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium">{candidate.Item?.name}</div>
                                                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{candidate.remarks}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                                                        {formatCurrency(total)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                                                        {formatCurrency(paid)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono font-medium text-destructive">
                                                        {formatCurrency(due)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="xs"
                                                                className="h-7 text-xs"
                                                                onClick={() => {
                                                                    // Auto-fill logic
                                                                    const otherAllocated = totalAllocatedInSession - (parseFloat(currentAlloc) || 0);
                                                                    const available = paymentRemaining - otherAllocated;
                                                                    const fillAmount = Math.min(due, available);
                                                                    if (fillAmount > 0) {
                                                                        setAllocations(prev => ({...prev, [candidate.id]: fillAmount.toFixed(2)}));
                                                                    }
                                                                }}
                                                            >
                                                                Max
                                                            </Button>
                                                            <Input 
                                                                type="number" 
                                                                step="0.01"
                                                                className="h-8 w-24 text-right font-mono"
                                                                value={currentAlloc}
                                                                onChange={(e) => setAllocations(prev => ({...prev, [candidate.id]: e.target.value}))}
                                                            />
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div className="p-4 border-t bg-background flex justify-between items-center">
                        <div className="text-sm">
                            {totalAllocatedInSession > paymentRemaining && (
                                <span className="text-destructive font-medium flex items-center gap-1">
                                    <AlertCircle className="h-4 w-4" /> Over-allocated by {formatCurrency(totalAllocatedInSession - paymentRemaining)}
                                </span>
                            )}
                            {totalAllocatedInSession <= paymentRemaining && totalAllocatedInSession > 0 && (
                                <span className="text-muted-foreground">
                                    Allocating <span className="text-foreground font-medium">{formatCurrency(totalAllocatedInSession)}</span>
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setShowAllocateModal(false)}>Cancel</Button>
                            <Button 
                                onClick={handleAllocate} 
                                disabled={isSubmitting || totalAllocatedInSession <= 0 || totalAllocatedInSession > paymentRemaining}
                            >
                                {isSubmitting ? 'Processing...' : 'Confirm Allocation'}
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payments;
