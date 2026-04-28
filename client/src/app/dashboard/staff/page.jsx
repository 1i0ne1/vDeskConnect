'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Plus, Search, Edit2, Ban, Trash2, X, RefreshCw,
  ChevronLeft, ChevronRight, Mail, Phone, AlertTriangle, Check, Eye, EyeOff, Shield, Hash
} from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastProvider';
import PasswordStrengthMeter from '@/components/ui/PasswordStrengthMeter';

const ROLES = [
  { value: 'principal', label: 'Principal', description: 'Can create teachers/students, manage academics' },
  { value: 'admin_staff', label: 'Admin Staff', description: 'Can create teachers/students' },
  { value: 'receptionist', label: 'Receptionist', description: 'Admin Staff with fee management access' },
];

export default function StaffPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [viewingStaff, setViewingStaff] = useState(null);
  const [actionModal, setActionModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', employee_number: '',
    gender: '', phone: '', address: '', designation: '',
    role: 'admin_staff',
    password: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [actionReason, setActionReason] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const DEFAULT_PASSWORD = 'Secret123!';

  const fetchStaff = useCallback(async (isFirstPage = false) => {
    if (isFirstPage) {
      setLoading(true);
      setPage(1);
      setHasMore(true);
    }
    
    try {
      const currentPage = isFirstPage ? 1 : page;
      const res = await api.get(`/staff?search=${encodeURIComponent(search)}&page=${currentPage}&per_page=20`);
      
      const newStaff = res.data || [];
      if (isFirstPage) {
        setStaff(newStaff);
      } else {
        setStaff(prev => [...prev, ...newStaff]);
      }
      
      setTotal(res.total || 0);
      setHasMore(newStaff.length === 20); // If we got a full page, there might be more
    } catch (err) {
      if (isFirstPage) {
        setStaff([]);
        setTotal(0);
      }
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchStaff(true);
  }, [search]); // Re-fetch on search change

  // Intersection Observer for infinite scroll
  const observerRef = useCallback(node => {
    if (loading || !hasMore) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setPage(prev => prev + 1);
      }
    });
    if (node) observer.observe(node);
  }, [loading, hasMore]);

  // Handle page change for loading more
  useEffect(() => {
    if (page > 1) {
      fetchStaff(false);
    }
  }, [page]);

  const resetForm = () => {
    setForm({
      first_name: '', last_name: '', email: '', employee_number: '',
      gender: '', phone: '', address: '', designation: '',
      role: 'admin_staff',
      password: DEFAULT_PASSWORD
    });
    setFormErrors({});
    setEditingStaff(null);
  };

  const openAddModal = () => { resetForm(); setShowModal(true); };
  const openEditModal = (s) => {
    setEditingStaff(s);
    setForm({
      first_name: s.first_name || '', last_name: s.last_name || '',
      email: s.email || '', employee_number: s.employee_number || '',
      gender: s.gender || '', phone: s.phone || '', address: s.address || '',
      designation: s.designation || '',
      role: s.role || 'admin_staff',
      password: ''
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingStaff ? `/staff/${editingStaff.id}` : '/staff';
      const method = editingStaff ? 'put' : 'post';
      const payload = { ...form };
      if (editingStaff) {
        Object.keys(payload).forEach(key => {
          if (payload[key] === '' || payload[key] === null) delete payload[key];
        });
        if (payload.password === '') delete payload.password;
      }
      await api[method](url, payload);
      toast.success(editingStaff ? 'Staff updated' : 'Staff created');
      setShowModal(false);
      resetForm();
      fetchStaff();
    } catch (err) {
      if (err.data?.errors) setFormErrors(err.data.errors);
      else toast.error(err.data?.message || 'Operation failed');
    } finally { setSubmitting(false); }
  };

  const handleAction = async () => {
    if (!actionReason.trim()) { toast.error('Please provide a reason'); return; }
    setActionLoading(true);
    try {
      const s = actionModal.staff;
      if (actionModal.type === 'ban') {
        await api.post(`/staff/${s.id}/ban`, { reason: actionReason });
        toast.success('Staff banned');
      } else {
        await api.delete(`/staff/${s.id}`, { body: { reason: actionReason } });
        toast.success('Staff deleted');
      }
      setActionModal(null);
      setActionReason('');
      fetchStaff();
    } catch (err) {
      toast.error(err.data?.message || 'Operation failed');
    } finally { setActionLoading(false); }
  };

  const fullName = (s) => `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.email;

  const DetailRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-bg-main/50">
      <Icon size={16} className="text-text-muted flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-text-muted">{label}</p>
        <p className="text-sm text-text-primary truncate">{value}</p>
      </div>
    </div>
  );

  const generateEmployeeNumber = () => {
    const year = new Date().getFullYear();
    const seq = Math.floor(Math.random() * 9000 + 1000);
    return `STF-${year}-${seq}`;
  };

  const getRoleBadge = (role) => {
    const config = {
      principal: { label: 'Principal', color: 'bg-purple-200 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
      admin_staff: { label: 'Admin Staff', color: 'bg-blue-200 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
      receptionist: { label: 'Receptionist', color: 'bg-green-200 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
    };
    const { label, color } = config[role] || { label: role, color: 'bg-bg-main text-text-secondary' };
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}><Shield size={10} />{label}</span>;
  };

  return (
    <DashboardLayout title="Staff" subtitle="Manage school administration staff" >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-text-primary">{total} Staff Members</h2>
            <p className="text-sm text-text-secondary">Manage principal, admin staff, and receptionists</p>
          </div>
          <button onClick={openAddModal} className="glass-button inline-flex items-center gap-2 px-4 py-2.5 text-sm">
            <Plus size={16} /> Add Staff
          </button>
        </div>

        {/* Search */}
        <div className="glass-input flex items-center gap-2 rounded-btn px-4 py-3">
          <Search size={18} className="text-text-muted flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, email, or employee number..."
            className="bg-transparent outline-none text-sm text-text-primary placeholder-text-muted w-full"
          />
        </div>

        {/* Table */}
        <div className="glass-card overflow-hidden">
          {loading ? (
            <div className="p-12 flex justify-center">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : staff.length === 0 ? (
            <div className="p-12 text-center">
              <Users size={40} className="text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary">No staff found</p>
              <button onClick={openAddModal} className="mt-4 glass-button text-sm px-4 py-2">
                <Plus size={14} className="inline mr-1" /> Add First Staff
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-text-secondary uppercase tracking-wider">Staff</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-text-secondary uppercase tracking-wider hidden sm:table-cell">Role</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-text-secondary uppercase tracking-wider hidden sm:table-cell">Designation</th>
                    <th className="text-center px-5 py-3.5 text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-text-secondary uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {staff.map((s) => (
                    <tr key={s.id} className="glass-row">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                            {(s.first_name?.[0] || s.email?.[0] || 'S').toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate">{fullName(s)}</p>
                            <p className="text-xs text-text-muted truncate">{s.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden sm:table-cell">
                        {getRoleBadge(s.role)}
                      </td>
                      <td className="px-5 py-4 hidden sm:table-cell">
                        <p className="text-sm text-text-secondary truncate max-w-[120px]">{s.designation || '—'}</p>
                      </td>
                      <td className="px-5 py-4 text-center">
                        {s.banned ? (
                          <span className="inline-flex items-center gap-1 text-error text-xs"><Ban size={12} /> Banned</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-success text-xs"><Check size={12} /> Active</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setViewingStaff(s)} className="p-2 rounded-lg hover:bg-info/10 text-text-muted hover:text-info transition-all" title="View">
                            <Eye size={16} />
                          </button>
                          <button onClick={() => openEditModal(s)} className="p-2 rounded-lg hover:bg-primary/10 text-text-muted hover:text-primary transition-all" title="Edit">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => setActionModal({ type: 'ban', staff: s })} className="p-2 rounded-lg hover:bg-warning/10 text-text-muted hover:text-warning transition-all" title="Ban">
                            <Ban size={16} />
                          </button>
                          <button onClick={() => setActionModal({ type: 'delete', staff: s })} className="p-2 rounded-lg hover:bg-error/10 text-text-muted hover:text-error transition-all" title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Loading more indicator */}
        {hasMore && staff.length > 0 && (
          <div ref={observerRef} className="py-8 flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-xs text-text-muted animate-pulse">Loading more staff...</p>
          </div>
        )}

        {!hasMore && staff.length > 0 && (
          <p className="text-center py-8 text-xs text-text-muted">You've reached the end of the staff list</p>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="glass-modal max-w-2xl w-full animate-scale-in flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
              <h3 className="text-lg font-bold text-text-primary">
                {editingStaff ? 'Edit Staff' : 'Add Staff Member'}
              </h3>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-text-muted hover:text-text-primary">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Role Selection */}
              <div>
                <label className="form-label">Role *</label>
                <div className="space-y-2">
                  {ROLES.map((role) => (
                    <label
                      key={role.value}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        form.role === role.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={role.value}
                        checked={form.role === role.value}
                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="text-sm font-medium text-text-primary">{role.label}</p>
                        <p className="text-xs text-text-muted">{role.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
                {formErrors.role && <p className="text-error text-xs mt-1">{formErrors.role[0]}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">First Name *</label>
                  <input type="text" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})}
                    className={`form-input ${formErrors.first_name ? 'border-error' : ''}`} placeholder="Jane" required />
                  {formErrors.first_name && <p className="text-error text-xs mt-1">{formErrors.first_name[0]}</p>}
                </div>
                <div>
                  <label className="form-label">Last Name *</label>
                  <input type="text" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})}
                    className={`form-input ${formErrors.last_name ? 'border-error' : ''}`} placeholder="Smith" required />
                  {formErrors.last_name && <p className="text-error text-xs mt-1">{formErrors.last_name[0]}</p>}
                </div>
              </div>
              <div>
                <label className="form-label">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                  className={`form-input ${formErrors.email ? 'border-error' : ''}`} placeholder="jane@school.edu" required />
                {formErrors.email && <p className="text-error text-xs mt-1">{formErrors.email[0]}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Employee Number *</label>
                  <div className="flex gap-2">
                    <input type="text" value={form.employee_number} onChange={e => setForm({...form, employee_number: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '')})}
                      className={`form-input flex-1 ${formErrors.employee_number ? 'border-error' : ''}`} placeholder="STF-2026-001" required />
                    <button type="button" onClick={() => setForm({...form, employee_number: generateEmployeeNumber()})}
                      className="px-3 py-2.5 rounded-btn bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-medium whitespace-nowrap flex items-center gap-1.5 flex-shrink-0"
                      title="Auto-generate employee number">
                      <Hash size={14} /> Auto
                    </button>
                  </div>
                  {formErrors.employee_number && <p className="text-error text-xs mt-1">{formErrors.employee_number[0]}</p>}
                </div>
                <div>
                  <label className="form-label">Designation</label>
                  <input type="text" value={form.designation} onChange={e => setForm({...form, designation: e.target.value})}
                    className="form-input" placeholder="e.g., Vice Principal" />
                </div>
              </div>
              <div>
                <label className="form-label">Password {!editingStaff && <span className="text-text-muted font-normal">(Default: {DEFAULT_PASSWORD})</span>}</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm({...form, password: e.target.value})}
                    className={`form-input pr-10 ${formErrors.password ? 'border-error' : ''}`}
                    placeholder={editingStaff ? 'Leave blank to keep current' : DEFAULT_PASSWORD}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {formErrors.password && <p className="text-error text-xs mt-1">{formErrors.password[0]}</p>}
                {!editingStaff && form.password && <PasswordStrengthMeter password={form.password} />}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Gender</label>
                  <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} className="form-input">
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Phone</label>
                  <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="form-input" placeholder="+234..." />
                </div>
              </div>
              <div>
                <label className="form-label">Address</label>
                <input type="text" value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="form-input" />
              </div>
            </form>
            <div className="flex gap-3 p-5 border-t border-border flex-shrink-0">
              <button type="button" onClick={() => { setShowModal(false); resetForm(); }}
                className="flex-1 px-4 py-2.5 rounded-btn border border-border text-sm font-medium text-text-secondary hover:bg-bg-main transition-colors">
                Cancel
              </button>
              <button type="submit" onClick={handleSubmit} disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-btn glass-button disabled:opacity-50">
                {submitting ? <span className="flex items-center justify-center gap-2"><RefreshCw size={14} className="animate-spin" /> Saving...</span> : editingStaff ? 'Update Staff' : 'Create Staff'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Staff Modal */}
      {viewingStaff && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewingStaff(null)}>
          <div className="glass-modal max-w-md w-full max-h-[85vh] flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
              <h3 className="text-lg font-bold text-text-primary">Staff Details</h3>
              <button onClick={() => setViewingStaff(null)} className="text-text-muted hover:text-text-primary">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-5">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 bg-primary/20 rounded-full flex items-center justify-center text-lg font-bold text-primary flex-shrink-0">
                  {(viewingStaff.first_name?.[0] || viewingStaff.email?.[0] || 'S').toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-base font-bold text-text-primary truncate">{fullName(viewingStaff)}</p>
                  <p className="text-sm text-text-muted truncate">{viewingStaff.email}</p>
                  <span className="inline-flex items-center gap-1 text-xs mt-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium capitalize">
                    <Shield size={12} /> {viewingStaff.role?.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <DetailRow icon={Hash} label="Employee #" value={viewingStaff.employee_number || '—'} />
                <DetailRow icon={Users} label="Designation" value={viewingStaff.designation || '—'} />
                <DetailRow icon={Users} label="Gender" value={viewingStaff.gender ? viewingStaff.gender.charAt(0).toUpperCase() + viewingStaff.gender.slice(1) : '—'} />
                <DetailRow icon={Phone} label="Phone" value={viewingStaff.phone || '—'} />
                <DetailRow icon={Mail} label="Email" value={viewingStaff.email || '—'} />
                <DetailRow icon={Check} label="Status" value={viewingStaff.banned ? 'Banned' : 'Active'} />
              </div>
            </div>
            <div className="flex gap-2 p-5 border-t border-border flex-shrink-0">
              <button onClick={() => { setViewingStaff(null); openEditModal(viewingStaff); }} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-btn bg-primary text-white text-sm hover:bg-primary-dark transition-colors">
                <Edit2 size={14} /> Edit
              </button>
              {!viewingStaff.banned && (
                <button onClick={() => { setViewingStaff(null); setActionModal({ type: 'ban', staff: viewingStaff }); }} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-btn bg-warning/10 text-warning text-sm hover:bg-warning/20 transition-colors">
                  <Ban size={14} /> Ban
                </button>
              )}
              <button onClick={() => { setViewingStaff(null); setActionModal({ type: 'delete', staff: viewingStaff }); }} className="flex items-center justify-center gap-2 px-3 py-2 rounded-btn bg-error/10 text-error text-sm hover:bg-error/20 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban/Delete Confirmation Modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setActionModal(null)}>
          <div className="glass-modal max-w-md w-full animate-scale-in p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${actionModal.type === 'delete' ? 'bg-error/20' : 'bg-warning/20'}`}>
                {actionModal.type === 'delete' ? <AlertTriangle size={20} className="text-error" /> : <Ban size={20} className="text-warning" />}
              </div>
              <h3 className="text-lg font-bold text-text-primary">
                {actionModal.type === 'delete' ? 'Delete' : 'Ban'} Staff
              </h3>
            </div>
            <p className="text-sm text-text-secondary mb-4">
              Are you sure you want to <strong>{actionModal.type}</strong> <strong>{fullName(actionModal.staff)}</strong>?
              {actionModal.type === 'delete' && ' This action cannot be undone.'}
            </p>
            <label className="form-label">Reason *</label>
            <textarea value={actionReason} onChange={e => setActionReason(e.target.value)} rows={3}
              className="form-input mb-4" placeholder="Provide a reason..." required />
            <div className="flex gap-3">
              <button onClick={() => setActionModal(null)} disabled={actionLoading}
                className="flex-1 px-4 py-2.5 rounded-btn border border-border text-sm font-medium text-text-secondary hover:bg-bg-main transition-colors">
                Cancel
              </button>
              <button onClick={handleAction} disabled={actionLoading}
                className={`flex-1 px-4 py-2.5 rounded-btn text-sm font-medium text-white transition-all ${
                  actionModal.type === 'delete' ? 'bg-error hover:bg-error/80' : 'bg-warning hover:bg-warning/80'
                } disabled:opacity-50`}>
                {actionLoading ? <span className="flex items-center justify-center gap-2"><RefreshCw size={14} className="animate-spin" /> Processing...</span> : `Confirm ${actionModal.type === 'delete' ? 'Delete' : 'Ban'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
