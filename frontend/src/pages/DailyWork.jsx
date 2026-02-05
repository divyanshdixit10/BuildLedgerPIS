import { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { useAuth } from '../auth/AuthProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Calendar, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  FileText, 
  ExternalLink,
  Filter,
  X,
  Loader2
} from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";

// Simple Textarea component if not available in ui/textarea
const Textarea = ({ className, ...props }) => (
  <textarea 
    className={`flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    {...props}
  />
);

const DailyWork = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  
  // Create/Edit State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createData, setCreateData] = useState({
    work_date: new Date().toISOString().split('T')[0],
    description: '',
    media_url: '',
    media_type: 'IMAGE'
  });

  const canEdit = user?.role === 'ADMIN' || user?.role === 'EDITOR';

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/daily-work');
      // Sort by date descending
      const sortedLogs = res.data.sort((a, b) => new Date(b.work_date) - new Date(a.work_date));
      setLogs(sortedLogs);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        work_date: createData.work_date,
        description: createData.description,
        media: createData.media_url ? [{
            media_type: createData.media_type,
            drive_url: createData.media_url,
            caption: 'Work Log Attachment'
        }] : []
      };

      await api.post('/daily-work', payload);
      setShowCreateForm(false);
      setCreateData({
        work_date: new Date().toISOString().split('T')[0],
        description: '',
        media_url: '',
        media_type: 'IMAGE'
      });
      fetchLogs();
    } catch (error) {
      alert('Error creating work log');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.created_by?.toString().includes(searchTerm);
      
      let matchesDate = true;
      if (dateFilter.start) {
        matchesDate = matchesDate && new Date(log.work_date) >= new Date(dateFilter.start);
      }
      if (dateFilter.end) {
        matchesDate = matchesDate && new Date(log.work_date) <= new Date(dateFilter.end);
      }

      return matchesSearch && matchesDate;
    });
  }, [logs, searchTerm, dateFilter]);

  const clearFilters = () => {
    setSearchTerm('');
    setDateFilter({ start: '', end: '' });
  };

  return (
    <div className="space-y-6 p-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Daily Work</h1>
          <p className="text-muted-foreground mt-1">Track daily site progress and work logs</p>
        </div>
        {canEdit && (
          <Button onClick={() => setShowCreateForm(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" /> Log Work
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search description..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Input
                  type="date"
                  className="w-[160px]"
                  value={dateFilter.start}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                />
              </div>
              <span className="self-center text-gray-500">-</span>
              <div className="relative">
                <Input
                  type="date"
                  className="w-[160px]"
                  value={dateFilter.end}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
            </div>
            {(searchTerm || dateFilter.start || dateFilter.end) && (
              <Button variant="ghost" onClick={clearFilters} className="px-3">
                <X className="h-4 w-4 mr-2" /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <Skeleton className="h-12 w-12 rounded" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-lg font-medium text-gray-900">No work logs found</p>
              <p className="text-sm text-gray-500 max-w-sm mt-1">
                {searchTerm || dateFilter.start ? "Try adjusting your filters" : "Start by logging today's work progress"}
              </p>
              {canEdit && !searchTerm && !dateFilter.start && (
                <Button variant="outline" onClick={() => setShowCreateForm(true)} className="mt-4">
                  Log First Entry
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence>
              {filteredLogs.map((log, index) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-0">
                      <div className="flex flex-col md:flex-row">
                        {/* Date Column */}
                        <div className="bg-gray-50/50 md:w-48 p-4 md:p-6 flex flex-row md:flex-col items-center md:items-start justify-between md:justify-center border-b md:border-b-0 md:border-r border-gray-100">
                          <div className="flex items-center gap-2 text-blue-600 font-medium">
                            <Calendar className="h-4 w-4" />
                            {new Date(log.work_date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                          <div className="text-xs text-gray-500 mt-0 md:mt-2 bg-gray-100 px-2 py-1 rounded-full">
                            ID: {log.created_by}
                          </div>
                        </div>

                        {/* Content Column */}
                        <div className="flex-1 p-4 md:p-6">
                          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {log.description}
                          </p>
                          
                          {/* Media Attachments */}
                          {log.WorkMedia && log.WorkMedia.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {log.WorkMedia.map((m) => (
                                <a 
                                  key={m.id} 
                                  href={m.drive_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-200 bg-gray-50 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-colors text-sm font-medium text-gray-600 group"
                                >
                                  {m.media_type === 'IMAGE' ? (
                                    <ImageIcon className="h-4 w-4 text-gray-400 group-hover:text-blue-500" />
                                  ) : (
                                    <VideoIcon className="h-4 w-4 text-gray-400 group-hover:text-blue-500" />
                                  )}
                                  <span>View Attachment</span>
                                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Log Daily Work</DialogTitle>
            <DialogDescription>
              Record site progress, activities, and attach relevant media.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                required
                value={createData.work_date}
                onChange={e => setCreateData({...createData, work_date: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Work Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the work done today..."
                required
                rows={5}
                value={createData.description}
                onChange={e => setCreateData({...createData, description: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="mediaUrl">Media URL (Drive Link)</Label>
                <Input
                  id="mediaUrl"
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={createData.media_url}
                  onChange={e => setCreateData({...createData, media_url: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mediaType">Type</Label>
                <select
                  id="mediaType"
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={createData.media_type}
                  onChange={e => setCreateData({...createData, media_type: e.target.value})}
                >
                  <option value="IMAGE">Image</option>
                  <option value="VIDEO">Video</option>
                </select>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Log'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DailyWork;
