'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Filter, ShoppingBag, BookOpen, 
  Package, DollarSign, Edit2, Trash2, Eye, 
  ChevronRight, AlertCircle, ShoppingCart, CheckCircle,
  Download, FileText, BarChart3, TrendingUp, History,
  ArrowUpRight, ArrowDownRight, Activity
} from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import marketplaceApi from '@/lib/marketplace-api';
import { academicApi } from '@/lib/academic-api';
import { format } from 'date-fns';
import { useToast } from '@/contexts/ToastProvider';
import BookModal from '@/components/dashboard/marketplace/BookModal';
import OrderDetails from '@/components/dashboard/marketplace/OrderDetails';

export default function MarketplacePage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('books'); // books, orders, analytics
  const [books, setBooks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  const [filters, setFilters] = useState({
    grade_level_id: '',
    status: '', // for orders
  });

  // --- Infinite Scroll States ---
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observer = useRef();

  const [gradeLevels, setGradeLevels] = useState([]);

  useEffect(() => {
    fetchInitialData();
    fetchStats();
  }, []);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    if (activeTab === 'books') fetchBooks(1);
    else if (activeTab === 'orders') fetchOrders(1);
    else if (activeTab === 'analytics') fetchStats();
  }, [filters, activeTab, searchQuery]);

  useEffect(() => {
    if (page > 1) {
      if (activeTab === 'books') fetchBooks(page, true);
      else if (activeTab === 'orders') fetchOrders(page, true);
    }
  }, [page]);

  const lastElementRef = useCallback(node => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  const fetchInitialData = async () => {
    try {
      const glRes = await academicApi.gradeLevels.getAll();
      setGradeLevels(glRes.grade_levels || glRes.data || []);
    } catch (error) {
      console.error('Error fetching filter data:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await marketplaceApi.getStats();
      setStats(res);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchBooks = async (pageNum = 1, isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);
    try {
      const params = { 
        grade_level_id: filters.grade_level_id,
        page: pageNum,
        search: searchQuery 
      };
      const res = await marketplaceApi.getBooks(params);
      const newData = res.data || [];
      setBooks(prev => pageNum === 1 ? newData : [...prev, ...newData]);
      setHasMore(res.next_page_url !== null);
    } catch (error) {
      toast.error('Failed to fetch books');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchOrders = async (pageNum = 1, isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);
    try {
      const params = { 
        status: filters.status,
        page: pageNum,
      };
      const res = await marketplaceApi.getOrders(params);
      const newData = res.data || [];
      setOrders(prev => pageNum === 1 ? newData : [...prev, ...newData]);
      setHasMore(res.next_page_url !== null);
    } catch (error) {
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleDeleteBook = async (id) => {
    if (!confirm('Are you sure you want to delete this book?')) return;
    try {
      await marketplaceApi.deleteBook(id);
      toast.success('Book removed from marketplace');
      fetchBooks();
      fetchStats();
    } catch (error) {
      toast.error('Failed to delete book');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'delivered': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'refunded': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'cancelled': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    }
  };

  return (
    <DashboardLayout title="Textbook Marketplace" subtitle="Manage school books and student orders" role="admin">
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Books', value: stats?.total_books || books.length, icon: BookOpen, color: 'text-blue-400' },
            { label: 'Orders Today', value: stats?.orders_today || '0', icon: ShoppingBag, color: 'text-green-400' },
            { label: 'Physical Stock', value: stats?.physical_stock || '0', icon: Package, color: 'text-yellow-400' },
            { label: 'Revenue (MTD)', value: `₦${parseFloat(stats?.revenue_mtd || 0).toLocaleString()}`, icon: DollarSign, color: 'text-purple-400' },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-bg-card p-4 rounded-card border border-white/5 shadow-soft flex items-center space-x-4"
            >
              <div className={`p-3 rounded-lg bg-white/5 ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-text-secondary text-sm">{stat.label}</p>
                <p className="text-xl font-bold text-text-main">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-bg-card p-4 rounded-card border border-white/5 shadow-soft">
          <div className="flex items-center space-x-2 w-full md:w-auto">
            {[
              { id: 'books', label: 'Books', icon: BookOpen },
              { id: 'orders', label: 'Orders', icon: ShoppingCart },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                    : 'text-text-secondary hover:bg-white/5 hover:text-text-main'
                }`}
              >
                <tab.icon size={16} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-4 w-full md:w-auto">
            {activeTab !== 'analytics' && (
              <>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                  <input
                    type="text"
                    placeholder={`Search ${activeTab}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-text-main focus:outline-none focus:border-primary transition-all"
                  />
                </div>
                
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-2 rounded-lg transition-all ${showFilters ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 border border-white/10 text-text-secondary hover:text-text-main hover:bg-white/10'}`}
                >
                  <Filter size={20} />
                </button>
              </>
            )}

            {activeTab === 'books' && (
              <button 
                onClick={() => { setEditingBook(null); setIsBookModalOpen(true); }}
                className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
              >
                <Plus size={18} />
                <span>Add Book</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters Panel */}
        <AnimatePresence onExitComplete={() => {
          setFilters({ grade_level_id: '', status: '' });
          setSearchQuery('');
        }}>
          {showFilters && activeTab !== 'analytics' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-bg-card p-4 rounded-card border border-white/5 shadow-soft grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Grade Level</label>
                  <select
                    value={filters.grade_level_id}
                    onChange={(e) => setFilters(prev => ({ ...prev, grade_level_id: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-text-main focus:outline-none focus:border-primary transition-all"
                  >
                    <option value="">All Grades</option>
                    {gradeLevels.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
                {activeTab === 'orders' && (
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Order Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-text-main focus:outline-none focus:border-primary transition-all"
                    >
                      <option value="">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Section */}
        <div className="grid grid-cols-1 gap-4">
          {activeTab === 'books' && (
            <AnimatePresence mode="popLayout">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-4">
                  <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <p className="text-text-secondary">Loading books...</p>
                </div>
              ) : books.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {books.map((book, i) => (
                      <motion.div
                        key={book.id}
                        ref={i === books.length - 1 ? lastElementRef : null}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="group bg-bg-card overflow-hidden rounded-card border border-white/5 shadow-soft hover:border-primary/30 transition-all flex flex-col"
                      >
                        <div className="p-5 flex-1">
                          <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl ${book.is_electronic ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
                              {book.is_electronic ? <Download size={24} /> : <BookOpen size={24} />}
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-lg font-bold text-primary">₦{parseFloat(book.price).toLocaleString()}</span>
                              <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full mt-1 ${book.available ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                {book.available ? 'Available' : 'Hidden'}
                              </span>
                            </div>
                          </div>
                          
                          <h3 className="text-text-main font-bold text-lg mb-1 line-clamp-1">{book.title}</h3>
                          <p className="text-text-secondary text-sm mb-4 line-clamp-2 min-h-[40px]">
                            {book.description || 'No description provided for this textbook.'}
                          </p>
                          
                          <div className="flex flex-wrap gap-2 mt-auto">
                            <span className="px-2 py-1 bg-white/5 rounded text-[11px] text-text-secondary border border-white/10">
                              {book.grade_level?.name}
                            </span>
                            {book.subject && (
                              <span className="px-2 py-1 bg-white/5 rounded text-[11px] text-text-secondary border border-white/10">
                                {book.subject.name}
                              </span>
                            )}
                            <span className="px-2 py-1 bg-white/5 rounded text-[11px] text-text-secondary border border-white/10">
                              {book.is_electronic ? 'E-Book' : 'Physical'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="p-3 bg-white/5 border-t border-white/5 flex items-center justify-between">
                          <div className="flex items-center space-x-1">
                            <button 
                              onClick={() => { setEditingBook(book); setIsBookModalOpen(true); }}
                              className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteBook(book.id)}
                              className="p-2 text-text-secondary hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <button 
                            className="flex items-center space-x-1 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary hover:text-white transition-all"
                          >
                            <span>View Sales</span>
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  {loadingMore && (
                    <div className="py-4 flex items-center justify-center space-x-2 text-primary">
                      <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      <span className="text-sm font-medium">Loading more books...</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-20 text-center bg-bg-card rounded-card border border-white/5 border-dashed">
                  <BookOpen className="mx-auto text-text-secondary mb-4 opacity-20" size={64} />
                  <h3 className="text-xl font-bold text-text-main mb-2">No books found</h3>
                  <p className="text-text-secondary max-w-md mx-auto mb-6">
                    Start by adding textbooks to your marketplace catalog.
                  </p>
                  <button 
                    onClick={() => { setEditingBook(null); setIsBookModalOpen(true); }}
                    className="px-6 py-2 bg-primary text-white rounded-lg font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                  >
                    Add Your First Book
                  </button>
                </div>
              )}
            </AnimatePresence>
          )}

          {activeTab === 'orders' && (
             <AnimatePresence mode="popLayout">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-4">
                  <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <p className="text-text-secondary">Loading orders...</p>
                </div>
              ) : orders.length > 0 ? (
                <div className="bg-bg-card rounded-card border border-white/5 overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/5">
                        <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Order ID</th>
                        <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Student</th>
                        <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Book</th>
                        <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {orders.map((order, i) => (
                        <motion.tr 
                          key={order.id}
                          ref={i === orders.length - 1 ? lastElementRef : null}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="hover:bg-white/[0.02] transition-all group"
                        >
                          <td className="px-6 py-4">
                            <span className="text-text-main font-mono text-xs">#ORD-{order.id.toString().padStart(5, '0')}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-text-main font-medium">{order.student?.profile?.data?.first_name} {order.student?.profile?.data?.last_name}</span>
                              <span className="text-text-secondary text-[10px]">{order.student?.email}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-text-main line-clamp-1 max-w-[200px]">{order.textbook?.title}</span>
                          </td>
                          <td className="px-6 py-4 text-text-main font-bold">₦{parseFloat(order.amount).toLocaleString()}</td>
                          <td className="px-6 py-4 text-text-secondary text-xs">
                            {format(new Date(order.order_date), 'MMM d, yyyy')}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => { setSelectedOrder(order); setIsOrderDetailsOpen(true); }}
                              className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                            >
                              <Eye size={18} />
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                  {loadingMore && (
                    <div className="py-4 flex items-center justify-center space-x-2 text-primary border-t border-white/5">
                      <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      <span className="text-sm font-medium">Loading more orders...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-20 text-center bg-bg-card rounded-card border border-white/5 border-dashed">
                  <ShoppingBag className="mx-auto text-text-secondary mb-4 opacity-20" size={64} />
                  <h3 className="text-xl font-bold text-text-main mb-2">No orders yet</h3>
                  <p className="text-text-secondary max-w-md mx-auto">
                    Orders from students will appear here once they start purchasing textbooks.
                  </p>
                </div>
              )}
            </AnimatePresence>
          )}

          {activeTab === 'analytics' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Sales History Chart (Simplified Visual) */}
                 <div className="lg:col-span-2 bg-bg-card p-6 rounded-card border border-white/5 shadow-soft">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-bold text-text-main">Sales Revenue</h3>
                        <p className="text-sm text-text-secondary">Last 6 months performance</p>
                      </div>
                      <div className="p-2 bg-green-500/10 text-green-400 rounded-lg">
                        <TrendingUp size={20} />
                      </div>
                    </div>
                    
                    <div className="h-64 flex items-end justify-between space-x-2 px-4">
                      {stats.sales_history?.map((data, i) => {
                        const maxRevenue = Math.max(...stats.sales_history.map(s => parseFloat(s.revenue) || 0), 1);
                        const heightPercentage = (parseFloat(data.revenue) / maxRevenue) * 100;
                        
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                            <motion.div 
                              initial={{ height: 0 }}
                              animate={{ height: `${Math.max(heightPercentage, 2)}%` }}
                              className="w-full bg-primary/20 border-t-2 border-primary rounded-t-lg transition-all group-hover:bg-primary/40"
                            >
                               <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-bg-card border border-white/10 px-2 py-1 rounded text-[10px] font-bold text-text-main opacity-0 group-hover:opacity-100 transition-all shadow-xl whitespace-nowrap z-10">
                                 ₦{parseFloat(data.revenue).toLocaleString()}
                               </div>
                            </motion.div>
                            <span className="mt-3 text-[10px] font-bold text-text-secondary uppercase">{data.month}</span>
                          </div>
                        );
                      })}
                    </div>
                 </div>

                 {/* Top Products */}
                 <div className="bg-bg-card p-6 rounded-card border border-white/5 shadow-soft">
                    <h3 className="text-lg font-bold text-text-main mb-6">Top Selling Books</h3>
                    <div className="space-y-4">
                      {stats.top_books?.map((book, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                           <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                                {i + 1}
                              </div>
                              <div className="max-w-[120px]">
                                <p className="text-sm font-bold text-text-main truncate">{book.title}</p>
                                <p className="text-[10px] text-text-secondary">{book.sales_count} sales</p>
                              </div>
                           </div>
                           <p className="text-sm font-bold text-primary">₦{parseFloat(book.total_revenue).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="bg-gradient-to-br from-blue-500/10 to-transparent p-6 rounded-card border border-blue-500/20 shadow-soft">
                    <div className="flex items-center space-x-4 mb-4">
                       <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl">
                          <Activity size={24} />
                       </div>
                       <div>
                          <p className="text-sm text-text-secondary">Conversion Rate</p>
                          <p className="text-2xl font-bold text-text-main">68.4%</p>
                       </div>
                    </div>
                    <div className="flex items-center space-x-2 text-green-400 text-xs font-bold">
                       <ArrowUpRight size={14} />
                       <span>+12% from last month</span>
                    </div>
                 </div>

                 <div className="bg-gradient-to-br from-purple-500/10 to-transparent p-6 rounded-card border border-purple-500/20 shadow-soft">
                    <div className="flex items-center space-x-4 mb-4">
                       <div className="p-3 bg-purple-500/20 text-purple-400 rounded-xl">
                          <ShoppingCart size={24} />
                       </div>
                       <div>
                          <p className="text-sm text-text-secondary">Average Order</p>
                          <p className="text-2xl font-bold text-text-main">₦8,450</p>
                       </div>
                    </div>
                    <div className="flex items-center space-x-2 text-green-400 text-xs font-bold">
                       <ArrowUpRight size={14} />
                       <span>+5.2% from last month</span>
                    </div>
                 </div>

                 <div className="bg-gradient-to-br from-yellow-500/10 to-transparent p-6 rounded-card border border-yellow-500/20 shadow-soft">
                    <div className="flex items-center space-x-4 mb-4">
                       <div className="p-3 bg-yellow-500/20 text-yellow-400 rounded-xl">
                          <AlertCircle size={24} />
                       </div>
                       <div>
                          <p className="text-sm text-text-secondary">Pending Orders</p>
                          <p className="text-2xl font-bold text-text-main">{stats.pending_orders}</p>
                       </div>
                    </div>
                    <div className="flex items-center space-x-2 text-red-400 text-xs font-bold">
                       <ArrowDownRight size={14} />
                       <span>Needs attention</span>
                    </div>
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <BookModal 
        isOpen={isBookModalOpen} 
        onClose={() => { setIsBookModalOpen(false); setEditingBook(null); }} 
        onSaved={() => { setIsBookModalOpen(false); fetchBooks(); fetchStats(); }}
        book={editingBook}
        gradeLevels={gradeLevels}
      />

      <OrderDetails 
        isOpen={isOrderDetailsOpen}
        onClose={() => { setIsOrderDetailsOpen(false); setSelectedOrder(null); }}
        order={selectedOrder}
        onStatusUpdate={() => { fetchOrders(); fetchStats(); }}
      />
    </DashboardLayout>
  );
}
