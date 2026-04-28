'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Plus, Search, Edit2, Ban, Trash2, X, RefreshCw,
  ChevronLeft, ChevronRight, Mail, Phone, MapPin, Calendar,
  GraduationCap, Hash, AlertTriangle, Check, AlertCircle, Eye, EyeOff,
  History, UserPlus
} from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { api } from '@/lib/api';
import { academicApi } from '@/lib/academic-api';
import { useToast } from '@/contexts/ToastProvider';
import PasswordStrengthMeter from '@/components/ui/PasswordStrengthMeter';
import { format } from 'date-fns';

export default function StudentsPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [viewingStudent, setViewingStudent] = useState(null);
  const [actionModal, setActionModal] = useState(null); // { type: 'ban'|'delete', student }
  const [actionLoading, setActionLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Grade/Section States
  const [gradeLevels, setGradeLevels] = useState([]);
  const [sections, setSections] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [enrollmentHistory, setEnrollmentHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', admission_number: '',
    gender: '', date_of_birth: '', phone: '', address: '',
    guardian_name: '', guardian_phone: '', guardian_email: '',
    grade_level_id: '', section_id: '',
    password: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [actionReason, setActionReason] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const DEFAULT_PASSWORD = 'Secret123!';

  const fetchStudents = useCallback(async (isFirstPage = false) => {
    if (isFirstPage) {
      setLoading(true);
      setPage(1);
      setHasMore(true);
    }
    
    try {
      const currentPage = isFirstPage ? 1 : page;
      const res = await api.get(`/students?search=${encodeURIComponent(search)}&page=${currentPage}&per_page=20`);
      
      const newStudents = res.data || [];
      if (isFirstPage) {
        setStudents(newStudents);
      } else {
        setStudents(prev => [...prev, ...newStudents]);
      }
      
      setTotal(res.total || 0);
      setHasMore(newStudents.length === 20);
    } catch (err) {
      if (isFirstPage) {
        setStudents([]);
        setTotal(0);
      }
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  const fetchInitialData = async () => {
    try {
      const [gradesRes, sessionsRes] = await Promise.all([
        academicApi.gradeLevels.getAll(),
        academicApi.sessions.getAll()
      ]);
      setGradeLevels(gradesRes.grade_levels || gradesRes.data || []);
      setSessions(sessionsRes.sessions || sessionsRes.data || []);
    } catch (err) {
      console.error('Error fetching initial data:', err);
    }
  };

  useEffect(() => {
    fetchStudents(true);
    fetchInitialData();
  }, [search]);

  useEffect(() => {
    if (form.grade_level_id) {
      const fetchSections = async () => {
        try {
          const res = await academicApi.sections.getAll(form.grade_level_id);
          setSections(res.sections || res.data || []);
        } catch (err) {
          console.error('Error fetching sections:', err);
        }
      };
      fetchSections();
    } else {
      setSections([]);
    }
  }, [form.grade_level_id]);

  const fetchEnrollmentHistory = async (studentId) => {
    setLoadingHistory(true);
    try {
      const res = await api.get(`/students/${studentId}/enrollments`);
      setEnrollmentHistory(res || []);
    } catch (err) {
      toast.error('Failed to load enrollment history');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (viewingStudent) {
      fetchEnrollmentHistory(viewingStudent.id);
    }
  }, [viewingStudent]);

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
      fetchStudents(false);
    }
  }, [page]);

  useEffect(() => {
    const token = api.getToken();
    if (!token) { router.push('/login'); return; }
  }, [router]);

  const resetForm = () => {
    setForm({
      first_name: '', last_name: '', email: '', admission_number: '',
      gender: '', date_of_birth: '', phone: '', address: '',
      guardian_name: '', guardian_phone: '', guardian_email: '',
      grade_level_id: '', section_id: '',
      password: DEFAULT_PASSWORD
    });
    setFormErrors({});
    setEditingStudent(null);
  };

  const openAddModal = () => { resetForm(); setShowModal(true); };
  const openEditModal = (s) => {
    setEditingStudent(s);
    setForm({
      first_name: s.first_name || '', last_name: s.last_name || '',
      email: s.email || '', admission_number: s.admission_number || '',
      gender: s.gender || '', date_of_birth: s.date_of_birth || '',
      phone: s.phone || '', address: s.address || '',
      guardian_name: s.guardian_name || '', guardian_phone: s.guardian_phone || '',
      guardian_email: s.guardian_email || '',
      grade_level_id: s.grade_level_id || '',
      section_id: s.section_id || '',
      password: ''
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingStudent ? `/students/${editingStudent.id}` : '/students';
      const method = editingStudent ? 'put' : 'post';
      const payload = { ...form };
      
      if (editingStudent) {
        Object.keys(payload).forEach(key => {
          if (payload[key] === '' || payload[key] === null) delete payload[key];
        });
        if (payload.password === '') delete payload.password;
      }
      
      const res = await api[method](url, payload);
      
      // If creating a new student, also create an initial enrollment
      if (!editingStudent && res.student) {
        await api.post('/students/enroll', {
          student_id: res.student.id,
          grade_level_id: form.grade_level_id,
          section_id: form.section_id,
          enrollment_date: new Date().toISOString().split('T')[0],
          status: 'active'
        });
      }

      toast.success(editingStudent ? 'Student updated' : 'Student created and enrolled');
      setShowModal(false);
      resetForm();
      fetchStudents(true);
    } catch (err) {
      if (err.data?.errors) setFormErrors(err.data.errors);
      else toast.error(err.data?.message || 'Operation failed');
    } finally { setSubmitting(false); }
  };

  const handleAction = async () => {
    if (!actionReason.trim()) { toast.error('Please provide a reason'); return; }
    setActionLoading(true);
    try {
      const s = actionModal.student;
      if (actionModal.type === 'ban') {
        await api.post(`/students/${s.id}/ban`, { reason: actionReason });
        toast.success('Student banned');
      } else {
        await api.delete(`/students/${s.id}`, { body: { reason: actionReason } });
        toast.success('Student deleted');
      }
      setActionModal(null);
      setActionReason('');
      fetchStudents();
    } catch (err) {
      toast.error(err.data?.message || 'Operation failed');
    } finally { setActionLoading(false); }
  };

  const fullName = (s) => `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.email;

  const DetailRow = ({ icon: Icon, label, value, className = "" }) => (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg bg-bg-main/50 ${className}`}>
      <Icon size={16} className="text-text-muted flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-text-muted">{label}</p>
        <p className="text-sm text-text-primary truncate">{value || '—'}</p>
      </div>
    </div>
  );

  const generateAdmissionNumber = () => {
    const year = new Date().getFullYear();
    const seq = Math.floor(Math.random() * 9000 + 1000);
    return `STU-${year}-${seq}`;
  };

  return (
    <DashboardLayout title="Students" subtitle="Manage student records and academic enrollments" role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-text-primary">{total} Students</h2>
            <p className="text-sm text-text-secondary">Track academic history and grade placements</p>
          </div>
          <button onClick={openAddModal} className="glass-button inline-flex items-center gap-2 px-4 py-2.5 text-sm">
            <Plus size={16} /> Add Student
          </button>
        </div>

        {/* Search */}
        <div className="glass-input flex items-center gap-2 rounded-btn px-4 py-3">
          <Search size={18} className="text-text-muted flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, email, or admission number..."
            className="bg-transparent outline-none text-sm text-text-primary placeholder-text-muted w-full"
          />
        </div>

        {/* Table */}
        <div className="glass-card overflow-hidden">
          {loading ? (
            <div className="p-12 flex justify-center">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : students.length === 0 ? (
            <div className="p-12 text-center">
              <GraduationCap size={40} className="text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary">No students found</p>
              <button onClick={openAddModal} className="mt-4 glass-button text-sm px-4 py-2">
                <Plus size={14} className="inline mr-1" /> Add First Student
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="px-5 py-3.5 text-xs font-semibold text-text-secondary uppercase tracking-wider">Student</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-text-secondary uppercase tracking-wider hidden md:table-cell">Admission #</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-text-secondary uppercase tracking-wider hidden lg:table-cell">Placement</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-text-secondary uppercase tracking-wider text-center">Status</th>
                    <th className="px-5 py-3.5 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {students.map((s) => (
                    <tr key={s.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                            {(s.first_name?.[0] || s.email?.[0] || 'S').toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate group-hover:text-primary transition-colors">{fullName(s)}</p>
                            <p className="text-xs text-text-muted truncate">{s.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <span className="text-xs font-mono bg-bg-main px-2 py-1 rounded text-text-secondary border border-white/5">
                          {s.admission_number || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <div className="flex flex-col">
                          <span className="text-sm text-text-primary font-medium">{s.grade_level_name || 'Unassigned'}</span>
                          <span className="text-[10px] text-text-muted uppercase font-bold tracking-tight">Section: {s.section_name || 'None'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          s.banned ? 'text-error bg-error/10 border-error/20' : 'text-success bg-success/10 border-success/20'
                        }`}>
                          {s.banned ? <Ban size={10} /> : <Check size={10} />} {s.banned ? 'Banned' : 'Active'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setViewingStudent(s)} className="p-2 rounded-lg hover:bg-info/10 text-text-muted hover:text-info transition-all" title="Quick View">
                            <Eye size={16} />
                          </button>
                          <button onClick={() => setViewingStudent(s)} className="p-2 rounded-lg hover:bg-primary/10 text-text-muted hover:text-primary transition-all" title="Enrollment History">
                            <History size={16} />
                          </button>
                          <button onClick={() => openEditModal(s)} className="p-2 rounded-lg hover:bg-primary/10 text-text-muted hover:text-primary transition-all" title="Edit Profile">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => setActionModal({ type: 'ban', student: s })} className="p-2 rounded-lg hover:bg-warning/10 text-text-muted hover:text-warning transition-all" title="Ban">
                            <Ban size={16} />
                          </button>
                          <button onClick={() => setActionModal({ type: 'delete', student: s })} className="p-2 rounded-lg hover:bg-error/10 text-text-muted hover:text-error transition-all" title="Delete">
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
        {hasMore && students.length > 0 && (
          <div ref={observerRef} className="py-8 flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-xs text-text-muted animate-pulse">Loading more students...</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="glass-modal max-w-2xl w-full animate-scale-in flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 text-primary rounded-lg">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-primary">
                    {editingStudent ? 'Update Student Record' : 'Enroll New Student'}
                  </h3>
                  <p className="text-xs text-text-muted">Fill in basic and academic information</p>
                </div>
              </div>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-text-muted hover:text-text-primary">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
              {/* Profile Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                  <Users size={14} /> Basic Profile
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">First Name *</label>
                    <input type="text" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })}
                      className={`form-input ${formErrors.first_name ? 'border-error' : ''}`} placeholder="John" required />
                    {formErrors.first_name && <p className="text-error text-[10px] mt-1">{formErrors.first_name[0]}</p>}
                  </div>
                  <div>
                    <label className="form-label">Last Name *</label>
                    <input type="text" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })}
                      className={`form-input ${formErrors.last_name ? 'border-error' : ''}`} placeholder="Doe" required />
                    {formErrors.last_name && <p className="text-error text-[10px] mt-1">{formErrors.last_name[0]}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Email *</label>
                    <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                      className={`form-input ${formErrors.email ? 'border-error' : ''}`} placeholder="john@school.edu" required />
                    {formErrors.email && <p className="text-error text-[10px] mt-1">{formErrors.email[0]}</p>}
                  </div>
                  <div>
                    <label className="form-label">Admission # *</label>
                    <div className="flex gap-2">
                      <input type="text" value={form.admission_number} onChange={e => setForm({ ...form, admission_number: e.target.value.toUpperCase() })}
                        className={`form-input flex-1 ${formErrors.admission_number ? 'border-error' : ''}`} placeholder="STU-2026-001" required />
                      <button type="button" onClick={() => setForm({ ...form, admission_number: generateAdmissionNumber() })}
                        className="px-3 py-2.5 rounded-btn bg-white/5 border border-white/10 text-text-muted hover:text-primary hover:border-primary/50 transition-all">
                        <Hash size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Academic Placement */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <h4 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                  <GraduationCap size={14} /> Academic Placement
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Grade Level *</label>
                    <select 
                      value={form.grade_level_id} 
                      onChange={e => setForm({ ...form, grade_level_id: e.target.value })} 
                      className="form-input" 
                      required
                    >
                      <option value="">Select Grade</option>
                      {gradeLevels.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Section (Optional)</label>
                    <select 
                      value={form.section_id} 
                      onChange={e => setForm({ ...form, section_id: e.target.value })} 
                      className="form-input"
                      disabled={!form.grade_level_id}
                    >
                      <option value="">No Section</option>
                      {sections.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Security */}
              {!editingStudent && (
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                    <AlertCircle size={14} /> Security
                  </h4>
                  <div>
                    <label className="form-label">Temporary Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={e => setForm({ ...form, password: e.target.value })}
                        className="form-input pr-10"
                        placeholder={DEFAULT_PASSWORD}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {form.password && <PasswordStrengthMeter password={form.password} />}
                  </div>
                </div>
              )}

              {/* Additional Data */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <h4 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                  <MapPin size={14} /> Guardian & Contact
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Guardian Name</label>
                    <input type="text" value={form.guardian_name} onChange={e => setForm({ ...form, guardian_name: e.target.value })} className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">Guardian Phone</label>
                    <input type="text" value={form.guardian_phone} onChange={e => setForm({ ...form, guardian_phone: e.target.value })} className="form-input" />
                  </div>
                </div>
              </div>
            </form>

            <div className="flex gap-3 p-5 border-t border-white/10 flex-shrink-0 bg-white/[0.02]">
              <button type="button" onClick={() => { setShowModal(false); resetForm(); }}
                className="flex-1 px-4 py-2.5 rounded-btn border border-white/10 text-sm font-medium text-text-secondary hover:bg-white/5 transition-all">
                Cancel
              </button>
              <button type="submit" onClick={handleSubmit} disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-btn bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                {submitting ? <span className="flex items-center justify-center gap-2"><RefreshCw size={14} className="animate-spin" /> Saving...</span> : editingStudent ? 'Update Profile' : 'Enroll Student'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Student / Enrollment History Modal */}
      {viewingStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewingStudent(null)}>
          <div className="glass-modal max-w-2xl w-full max-h-[85vh] flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center text-lg font-bold text-primary">
                  {(viewingStudent.first_name?.[0] || viewingStudent.email?.[0] || 'S').toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-primary">{fullName(viewingStudent)}</h3>
                  <p className="text-xs text-text-muted">{viewingStudent.admission_number || 'No Admission #'}</p>
                </div>
              </div>
              <button onClick={() => setViewingStudent(null)} className="text-text-muted hover:text-text-primary">
                <X size={20} />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 p-6 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                 <DetailRow icon={Mail} label="Email Address" value={viewingStudent.email} />
                 <DetailRow icon={GraduationCap} label="Current Placement" value={viewingStudent.grade_level_name || 'Unassigned'} />
                 <DetailRow icon={Users} label="Guardian" value={viewingStudent.guardian_name} />
                 <DetailRow icon={Phone} label="Phone" value={viewingStudent.phone} />
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                  <History size={14} /> Enrollment History
                </h4>
                
                {loadingHistory ? (
                   <div className="py-10 flex justify-center">
                     <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                   </div>
                ) : enrollmentHistory.length > 0 ? (
                  <div className="space-y-3">
                    {enrollmentHistory.map((h) => (
                      <div key={h.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between group hover:border-primary/30 transition-all">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${h.status === 'active' ? 'bg-success/20 text-success' : 'bg-white/10 text-text-muted'}`}>
                            <GraduationCap size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-text-primary">{h.grade_level?.name}</p>
                            <p className="text-[10px] text-text-muted uppercase tracking-tight">
                              {h.session?.name} • Section: {h.section?.name || 'None'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium text-text-secondary">{format(new Date(h.enrollment_date), 'MMM d, yyyy')}</p>
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                            h.status === 'active' ? 'border-success/30 text-success' : 'border-white/10 text-text-muted'
                          }`}>
                            {h.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center bg-white/5 rounded-xl border border-dashed border-white/10">
                    <p className="text-sm text-text-muted">No historical enrollment records found.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 p-5 border-t border-white/10 flex-shrink-0 bg-white/[0.02]">
              <button onClick={() => { setViewingStudent(null); openEditModal(viewingStudent); }} className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-btn bg-primary text-white text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-all">
                <Edit2 size={14} /> Update Placement
              </button>
              <button onClick={() => { setViewingStudent(null); setActionModal({ type: 'ban', student: viewingStudent }); }} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-btn bg-warning/10 text-warning text-sm font-bold hover:bg-warning/20 transition-colors">
                <Ban size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban/Delete Confirmation Modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60] flex items-center justify-center p-4" onClick={() => setActionModal(null)}>
          <div className="glass-modal max-w-md w-full animate-scale-in p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${actionModal.type === 'delete' ? 'bg-error/20 text-error' : 'bg-warning/20 text-warning'}`}>
                {actionModal.type === 'delete' ? <AlertTriangle size={24} /> : <Ban size={24} />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-primary">
                  Confirm {actionModal.type === 'delete' ? 'Deletion' : 'Suspension'}
                </h3>
                <p className="text-xs text-text-muted">Action for student: {fullName(actionModal.student)}</p>
              </div>
            </div>
            <p className="text-sm text-text-secondary mb-6 leading-relaxed">
              Are you sure you want to <strong>{actionModal.type}</strong> this student? 
              {actionModal.type === 'delete' ? ' This will permanently remove their records from the active database.' : ' They will no longer be able to log in to their dashboard.'}
            </p>
            <div className="space-y-4 mb-6">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Reason for Action</label>
              <textarea value={actionReason} onChange={e => setActionReason(e.target.value)} rows={3}
                className="form-input resize-none bg-black/20" placeholder="e.g. Disciplinary action, Withdrawal, etc." required />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setActionModal(null)} disabled={actionLoading}
                className="flex-1 px-4 py-3 rounded-btn border border-white/10 text-sm font-medium text-text-secondary hover:bg-white/5 transition-all">
                Keep Record
              </button>
              <button onClick={handleAction} disabled={actionLoading}
                className={`flex-1 px-4 py-3 rounded-btn text-sm font-bold text-white shadow-lg transition-all ${
                  actionModal.type === 'delete' ? 'bg-error shadow-error/20' : 'bg-warning shadow-warning/20'
                } disabled:opacity-50 hover:scale-105`}>
                {actionLoading ? <RefreshCw size={16} className="animate-spin mx-auto" /> : `Confirm ${actionModal.type === 'delete' ? 'Delete' : 'Ban'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
