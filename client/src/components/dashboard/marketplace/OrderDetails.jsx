'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, CheckCircle, Package, DollarSign, Clock, 
  User, Mail, Phone, MapPin, Hash, 
  RefreshCcw, AlertTriangle, ShieldCheck
} from 'lucide-react';
import marketplaceApi from '@/lib/marketplace-api';
import { useToast } from '@/contexts/ToastProvider';
import { format } from 'date-fns';

export default function OrderDetails({ isOpen, onClose, order, onStatusUpdate }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  if (!order) return null;

  const handleUpdateStatus = async (newStatus) => {
    setLoading(true);
    try {
      await marketplaceApi.updateOrderStatus(order.id, newStatus);
      toast.success(`Order marked as ${newStatus}`);
      onStatusUpdate();
      onClose();
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'delivered': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'refunded': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'cancelled': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-bg-card w-full max-w-xl rounded-card border border-white/10 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-text-secondary font-bold">Order Details</span>
                <h2 className="text-xl font-bold text-text-main flex items-center space-x-2">
                   <Hash size={18} className="text-primary" />
                   <span>#ORD-{order.id.toString().padStart(5, '0')}</span>
                </h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-text-secondary transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
              {/* Order Status Hero */}
              <div className={`p-4 rounded-xl border flex items-center justify-between ${getStatusBadge(order.status)}`}>
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-white/20">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-wider opacity-70">Current Status</p>
                    <p className="font-bold text-lg capitalize">{order.status}</p>
                  </div>
                </div>
                <div className="text-right">
                   <p className="text-[10px] uppercase font-bold tracking-wider opacity-70">Order Date</p>
                   <p className="font-bold">{format(new Date(order.order_date), 'MMM d, yyyy')}</p>
                </div>
              </div>

              {/* Student Info */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest flex items-center space-x-2">
                  <User size={14} />
                  <span>Student Information</span>
                </h3>
                <div className="bg-white/5 rounded-xl p-4 border border-white/5 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-text-secondary mb-1">Full Name</p>
                    <p className="text-text-main font-medium">{order.student?.profile?.data?.first_name} {order.student?.profile?.data?.last_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-secondary mb-1">Email</p>
                    <p className="text-text-main font-medium">{order.student?.email}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-secondary mb-1">Admission Number</p>
                    <p className="text-text-main font-medium font-mono">{order.student?.profile?.data?.admission_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-secondary mb-1">Phone</p>
                    <p className="text-text-main font-medium">{order.student?.profile?.data?.phone || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Item Info */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest flex items-center space-x-2">
                  <Package size={14} />
                  <span>Item Details</span>
                </h3>
                <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex items-center space-x-4">
                  <div className={`p-4 rounded-xl ${order.textbook?.is_electronic ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
                    <Package size={24} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-text-main font-bold">{order.textbook?.title}</h4>
                    <p className="text-text-secondary text-xs">{order.textbook?.is_electronic ? 'E-Book (Digital)' : 'Physical Textbook'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-primary font-bold text-lg">₦{parseFloat(order.amount).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest flex items-center space-x-2">
                  <DollarSign size={14} />
                  <span>Payment Verification</span>
                </h3>
                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-text-secondary mb-1">Transaction Reference</p>
                      <p className="text-text-main font-mono text-sm">{order.payment_ref || 'INTERNAL_CASH_ORDER'}</p>
                    </div>
                    <div className="flex items-center space-x-2 text-green-400">
                      <ShieldCheck size={20} />
                      <span className="text-xs font-bold">Verified</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-white/5 bg-white/[0.02]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-text-main">Update Order Status</span>
                <RefreshCcw className={`text-text-secondary ${loading ? 'animate-spin' : ''}`} size={16} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {order.status === 'pending' && (
                  <button 
                    onClick={() => handleUpdateStatus('paid')}
                    disabled={loading}
                    className="flex items-center justify-center space-x-2 py-3 bg-green-500/10 text-green-400 border border-green-500/20 rounded-xl font-bold hover:bg-green-500 hover:text-white transition-all disabled:opacity-50"
                  >
                    <CheckCircle size={18} />
                    <span>Confirm Payment</span>
                  </button>
                )}
                {order.status === 'paid' && !order.textbook?.is_electronic && (
                  <button 
                    onClick={() => handleUpdateStatus('delivered')}
                    disabled={loading}
                    className="flex items-center justify-center space-x-2 py-3 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl font-bold hover:bg-blue-500 hover:text-white transition-all disabled:opacity-50"
                  >
                    <Package size={18} />
                    <span>Mark Delivered</span>
                  </button>
                )}
                {(order.status === 'pending' || order.status === 'paid') && (
                  <button 
                    onClick={() => handleUpdateStatus('cancelled')}
                    disabled={loading}
                    className="flex items-center justify-center space-x-2 py-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl font-bold hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                  >
                    <X size={18} />
                    <span>Cancel Order</span>
                  </button>
                )}
                {order.status === 'paid' && (
                  <button 
                    onClick={() => handleUpdateStatus('refunded')}
                    disabled={loading}
                    className="flex items-center justify-center space-x-2 py-3 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-xl font-bold hover:bg-orange-500 hover:text-white transition-all disabled:opacity-50"
                  >
                    <AlertTriangle size={18} />
                    <span>Process Refund</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
