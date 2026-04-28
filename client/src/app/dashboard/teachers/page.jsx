'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Plus, Search, Edit2, Ban, Trash2, X, RefreshCw,
  ChevronLeft, ChevronRight, Phone, MapPin, Award, Calendar,
  GraduationCap, AlertTriangle, Check, Mail, Eye, EyeOff, Hash
} from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastProvider';
import PasswordStrengthMeter from '@/components/ui/PasswordStrengthMeter';

export default function TeachersPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [viewingTeacher, setViewingTeacher] = useState(null);
  const [actionModal, setActionModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', employee_number: '',
    gender: '', phone: '', address: '', qualification: '', date_joined: '',
    password: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [actionReason, setActionReason] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const DEFAULT_PASSWORD = 'Secret123!';

  const fetchTeachers = useCallback(async (isFirstPage = false) => {
    if (isFirstPage) {
      setLoading(true);
      setPage(1);
      setHasMore(true);
    }
    
    try {
      const currentPage = isFirstPage ? 1 : page;
      const res = await api.get(`/teachers?search=${encodeURIComponent(search)}&page=${currentPage}&per_page=20`);
      
      const newTeachers = res.data || [];
      if (isFirstPage) {
        setTeachers(newTeachers);
      } else {
        setTeachers(prev => [...prev, ...newTeachers]);
      }
      
      setTotal(res.total || 0);
      setHasMore(newTeachers.length === 20);
    } catch (err) {
      if (isFirstPage) {
        setTeachers([]);
        setTotal(0);
      }
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchTeachers(true);
  }, [search]);

  const observerRef = useCallback(node => {
    if (loading || !hasMore) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setPage(prev => prev + 1);
      }
    });
    if (node) observer.observe(node);
  }, [loading, hasMore]);

  useEffect(() => {
    if (page > 1) {
      fetchTeachers(false);
    }
  }, [page]);

  useEffect(() => {
    const token = api.getToken();
    if (!token) { router.push('/login'); return; }
  }, [router]);

  const resetForm = () => {
    setForm({ first_name: '', last_name: '', email: '', employee_number: '',
      gender: '', phone: '', address: '', qualification: '', date_joined: '',
      password: DEFAULT_PASSWORD });
    setFormErrors({});
    setEditingTeacher(null);
  };

  const openAddModal = () => { resetForm(); setShowModal(true); };
  const openEditModal = (t) => {
    setEditingTeacher(t);
    setForm({
      first_name: t.first_name || '', last_name: t.last_name || '',
      email: t.email || '', employee_number: t.employee_number || '',
      gender: t.gender || '', phone: t.phone || '', address: t.address || '',
      qualification: t.qualification || '', date_joined: t.date_joined || '',
      password: '' // Leave empty when editing
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingTeacher ? `/teachers/${editingTeacher.id}` : '/teachers';
      const method = editingTeacher ? 'put' : 'post';
      const payload = { ...form };
      if (editingTeacher) {
        Object.keys(payload).forEach(key => {
          if (payload[key] === '' || payload[key] === null) delete payload[key];
        });
        if (payload.password === '') delete payload.password;
      }
      await api[method](url, payload);
      toast.success(editingTeacher ? 'Teacher updated' : 'Teacher created');
      setShowModal(false);
      resetForm();
      fetchTeachers(true);
    } catch (err) {
      if (err.data?.errors) setFormErrors(err.data.errors);
      else toast.error(err.data?.message || 'Operation failed');
    } finally { setSubmitting(false); }
  };

  const handleAction = async () => {
    if (!actionReason.trim()) { toast.error('Please provide a reason'); return; }
    setActionLoading(true);
    try {
      const t = actionModal.teacher;
      if (actionModal.type === 'ban') {
        await api.post(`/teachers/${t.id}/ban`, { reason: actionReason });
        toast.success('Teacher banned');
      } else {
        await api.delete(`/teachers/${t.id}`, { body: { reason: actionReason } });
        toast.success('Teacher deleted');
      }
      setActionModal(null);
      setActionReason('');
      fetchTeachers(true);
    } catch (err) {
      toast.error(err.data?.message || 'Operation failed');
    } finally { setActionLoading(false); }
  };

  const fullName = (t) => `${t.first_name || ''} ${t.last_name || ''}`.trim() || t.email;

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
    return `TCH-${year}-${seq}`;
  };

  return (
    <DashboardLayout title="Teachers" subtitle="Manage your teachers" role="admin">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-text-primary">{total} Teachers</h2>
            <p className="text-sm text-text-secondary">Manage teaching staff and assignments</p>
          </div>
          <button onClick={openAddModal} className="glass-button inline-flex items-center gap-2 px-4 py-2.5 text-sm">
            <Plus size={16} /> Add Teacher
          </button>
        </div>

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

        <div className="glass-card overflow-hidden">
          {loading && teachers.length === 0 ? (
            <div className="p-12 flex justify-center">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : teachers.length === 0 ? (
            <div className="p-12 text-center">
              <GraduationCap size={40} className="text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary">No teachers found</p>
              <button onClick={openAddModal} className="mt-4 glass-button text-sm px-4 py-2">
                <Plus size={14} className="inline mr-1" /> Add First Teacher
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-text-secondary uppercase tracking-wider">Teacher</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-text-secondary uppercase tracking-wider hidden md:table-cell">Employee #</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-text-secondary uppercase tracking-wider hidden lg:table-cell">Qualification</th>
                    <th className="text-center px-5 py-3.5 text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-text-secondary uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {teachers.map((t) => (
                    <tr key={t.id} className="glass-row">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                            {(t.first_name?.[0] || t.email?.[0] || 'T').toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate">{fullName(t)}</p>
                            <p className="text-xs text-text-muted truncate">{t.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <span className="text-xs font-mono bg-bg-main px-2 py-1 rounded text-text-secondary">
                          {t.employee_number || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <p className="text-sm text-text-secondary truncate max-w-[150px]">{t.qualification || '—'}</p>
                      </td>
                      <td className="px-5 py-4 text-center">
                        {t.banned ? (
                          <span className="inline-flex items-center gap-1 text-error text-xs"><Ban size={12} /> Banned</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-success text-xs"><Check size={12} /> Active</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setViewingTeacher(t)} className="p-2 rounded-lg hover:bg-info/10 text-text-muted hover:text-info transition-all" title="View">
                            <Eye size={16} />
                          </button>
                          <button onClick={() => openEditModal(t)} className="p-2 rounded-lg hover:bg-primary/10 text-text-muted hover:text-primary transition-all" title="Edit">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => setActionModal({ type: 'ban', teacher: t })} className="p-2 rounded-lg hover:bg-warning/10 text-text-muted hover:text-warning transition-all" title="Ban">
                            <Ban size={16} />
                          </button>
                          <button onClick={() => setActionModal({ type: 'delete', teacher: t })} className="p-2 rounded-lg hover:bg-error/10 text-text-muted hover:text-error transition-all" title="Delete">
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

        {hasMore && teachers.length > 0 && (
          <div ref={observerRef} className="py-8 flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-xs text-text-muted animate-pulse">Loading more teachers...</p>
          </div>
        )}

        {!hasMore && teachers.length > 0 && (
          <p className="text-center py-8 text-xs text-text-muted">You've reached the end of the teachers list</p>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="glass-modal max-w-2xl w-full animate-scale-in flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
              <h3 className="text-lg font-bold text-text-primary">
                {editingTeacher ? 'Edit Teacher' : 'Add Teacher'}
              </h3>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-text-muted hover:text-text-primary">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
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
              <div>
                <label className="form-label">Employee Number *</label>
                <div className="flex gap-2">
                  <input type="text" value={form.employee_number} onChange={e => setForm({...form, employee_number: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '')})}
                    className={`form-input flex-1 ${formErrors.employee_number ? 'border-error' : ''}`} placeholder="TCH-2026-001" required />
                  <button type="button" onClick={() => setForm({...form, employee_number: generateEmployeeNumber()})}
                    className="px-3 py-2.5 rounded-btn bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-medium whitespace-nowrap flex items-center gap-1.5 flex-shrink-0"
                    title="Auto-generate employee number">
                    <Hash size={14} /> Auto
                  </button>
                </div>
                {formErrors.employee_number && <p className="text-error text-xs mt-1">{formErrors.employee_number[0]}</p>}
              </div>
              <div>
                <label className="form-label">Password {!editingTeacher && <span className="text-text-muted font-normal">(Default: {DEFAULT_PASSWORD})</span>}</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm({...form, password: e.target.value})}
                    className={`form-input pr-10 ${formErrors.password ? 'border-error' : ''}`}
                    placeholder={editingTeacher ? 'Leave blank to keep current' : DEFAULT_PASSWORD}
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
                {!editingTeacher && form.password && <PasswordStrengthMeter password={form.password} />}
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
                  <label className="form-label">Date Joined</label>
                  <input type="date" value={form.date_joined} onChange={e => setForm({...form, date_joined: e.target.value})} className="form-input" />
                </div>
              </div>
              <div>
                <label className="form-label">Qualification</label>
                <input type="text" value={form.qualification} onChange={e => setForm({...form, qualification: e.target.value})} className="form-input" placeholder="B.Ed, M.Sc, etc." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Phone</label>
                  <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="form-input" placeholder="+234..." />
                </div>
                <div>
                  <label className="form-label">Address</label>
                  <input type="text" value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="form-input" />
                </div>
              </div>
            </form>
            <div className="flex gap-3 p-5 border-t border-border flex-shrink-0">
              <button type="button" onClick={() => { setShowModal(false); resetForm(); }}
                className="flex-1 px-4 py-2.5 rounded-btn border border-border text-sm font-medium text-text-secondary hover:bg-bg-main transition-colors">
                Cancel
              </button>
              <button type="submit" onClick={handleSubmit} disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-btn glass-button disabled:opacity-50">
                {submitting ? <span className="flex items-center justify-center gap-2"><RefreshCw size={14} className="animate-spin" /> Saving...</span> : editingTeacher ? 'Update Teacher' : 'Create Teacher'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Teacher Modal */}
      {viewingTeacher && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewingTeacher(null)}>
          <div className="glass-modal max-w-md w-full max-h-[85vh] flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
              <h3 className="text-lg font-bold text-text-primary">Teacher Details</h3>
              <button onClick={() => setViewingTeacher(null)} className="text-text-muted hover:text-text-primary">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-5">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 bg-primary/20 rounded-full flex items-center justify-center text-lg font-bold text-primary flex-shrink-0">
                  {(viewingTeacher.first_name?.[0] || viewingTeacher.email?.[0] || 'T').toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-base font-bold text-text-primary truncate">{fullName(viewingTeacher)}</p>
                  <p className="text-sm text-text-muted truncate">{viewingTeacher.email}</p>
                  <span className={`inline-flex items-center gap-1 text-xs mt-1 ${viewingTeacher.banned ? 'text-error' : 'text-success'}`}>
                    {viewingTeacher.banned ? <Ban size={12} /> : <Check size={12} />} {viewingTeacher.banned ? 'Banned' : 'Active'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <DetailRow icon={Hash} label="Employee #" value={viewingTeacher.employee_number || '—'} />
                <DetailRow icon={Award} label="Qualification" value={viewingTeacher.qualification || '—'} />
                <DetailRow icon={Users} label="Gender" value={viewingTeacher.gender ? viewingTeacher.gender.charAt(0).toUpperCase() + viewingTeacher.gender.slice(1) : '—'} />
                <DetailRow icon={Calendar} label="Date Joined" value={viewingTeacher.date_joined || '—'} />
                <DetailRow icon={Phone} label="Phone" value={viewingTeacher.phone || '—'} />
                <DetailRow icon={MapPin} label="Address" value={viewingTeacher.address || '—'} />
              </div>
            </div>
            <div className="flex gap-2 p-5 border-t border-border flex-shrink-0">
              <button onClick={() => { setViewingTeacher(null); openEditModal(viewingTeacher); }} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-btn bg-primary text-white text-sm hover:bg-primary-dark transition-colors">
                <Edit2 size={14} /> Edit
              </button>
              {!viewingTeacher.banned && (
                <button onClick={() => { setViewingTeacher(null); setActionModal({ type: 'ban', teacher: viewingTeacher }); }} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-btn bg-warning/10 text-warning text-sm hover:bg-warning/20 transition-colors">
                  <Ban size={14} /> Ban
                </button>
              )}
              <button onClick={() => { setViewingTeacher(null); setActionModal({ type: 'delete', teacher: viewingTeacher }); }} className="flex items-center justify-center gap-2 px-3 py-2 rounded-btn bg-error/10 text-error text-sm hover:bg-error/20 transition-colors">
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
                {actionModal.type === 'delete' ? 'Delete' : 'Ban'} Teacher
              </h3>
            </div>
            <p className="text-sm text-text-secondary mb-4">
              Are you sure you want to <strong>{actionModal.type}</strong> <strong>{fullName(actionModal.teacher)}</strong>?
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
