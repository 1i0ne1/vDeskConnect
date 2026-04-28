'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video, Plus, Trash2, Edit2, X, Play, PlayCircle, CheckCircle, Calendar,
  Clock, BookOpen, Users, Link as LinkIcon, FileText, Search,
  Filter, ChevronLeft, ChevronRight, ExternalLink, AlertCircle, Eye,
  File, Download, Save, Clock3, Image, Globe, Lock, Unlock, Sparkles,
  Layers, GripVertical, FormInput,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { academicApi } from '@/lib/academic-api';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastProvider';

const STATUS_COLORS = {
  scheduled: 'bg-info/10 text-info',
  in_progress: 'bg-warning/10 text-warning',
  completed: 'bg-success/10 text-success',
  cancelled: 'bg-error/10 text-error',
};

const STATUS_LABELS = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const TYPE_COLORS = {
  sync: 'bg-primary/10 text-primary',
  async: 'bg-purple-10 text-purple-600',
  hybrid: 'bg-warning/10 text-warning',
};

const TYPE_LABELS = {
  sync: 'Live (Sync)',
  async: 'Recorded (Async)',
  hybrid: 'Hybrid',
};

export default function LecturesPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [lectures, setLectures] = useState([]);
  const [filters, setFilters] = useState({ search: '', status: '', type: '', grade_level_id: '', subject_id: '', term_id: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  
  // --- Infinite Scroll States ---
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observer = useRef();

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingLecture, setEditingLecture] = useState(null);
  const [lectureForm, setLectureForm] = useState({
    title: '', description: '', content: '', teacher_id: '', grade_level_id: '', subject_id: '',
    section_id: '', scheduled_at: '', duration_minutes: 40, type: 'async',
    is_online: false, meeting_link: '', async_available_after: '', is_published: false,
  });
  const [formLoading, setFormLoading] = useState(false);

  // View modal
  const [viewingLecture, setViewingLecture] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [lectureResources, setLectureResources] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  // Add resource modal
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [resourceForm, setResourceForm] = useState({
    title: '', type: 'pdf', url: '', description: '',
    is_downloadable: false, is_savable: false, available_from: '', order_index: 0,
  });

  // Full page player state
  const [playingLecture, setPlayingLecture] = useState(null);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [lectureSections, setLectureSections] = useState([]);
  const [currentSection, setCurrentSection] = useState(0);
  const [sectionProgress, setSectionProgress] = useState({});

  // AI Builder modal
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiForm, setAiForm] = useState({
    title: '', description: '', grade_level_id: '', subject_id: '', sections: 5,
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPreview, setAiPreview] = useState(null);

  // Lecture Builder modal
  const [showBuilderModal, setShowBuilderModal] = useState(false);
  const [builderForm, setBuilderForm] = useState({
    title: '', description: '', content: '', teacher_id: '', grade_level_id: '',
    subject_id: '', scheduled_at: '', duration_minutes: 40, type: 'async',
    is_online: false, meeting_link: '', is_published: false,
    sections: [{ title: '', content: '', resources: [] }],
  });
  const [builderLoading, setBuilderLoading] = useState(false);
  const [builderUploading, setBuilderUploading] = useState({});

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

  const fetchLectures = useCallback(async (pageNum = 1, isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);
    try {
      const res = await academicApi.lectures.getAll({ ...filters, page: pageNum });
      const newData = res.data || [];
      setLectures(prev => pageNum === 1 ? newData : [...prev, ...newData]);
      setHasMore(res.meta?.has_more || false);
    } catch (err) {
      toast.error('Failed to load lectures');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, toast]);

  const fetchMeta = useCallback(async () => {
    try {
      const [gradesRes, subjectsRes, teachersRes] = await Promise.all([
        academicApi.gradeLevels.getAll().catch(() => ({ grade_levels: [] })),
        api.get('/academic/subjects').catch(() => ({ subjects: [] })),
        api.get('/teachers').catch(() => ({ data: [] })),
      ]);
      setGradeLevels(gradesRes.grade_levels || []);
      setSubjects(subjectsRes.subjects || []);
      setTeachers(teachersRes.data || []);
    } catch (err) {
      console.error('Failed to load meta:', err);
    }
  }, []);

  useEffect(() => {
    const token = api.getToken();
    if (!token) { router.push('/login'); return; }
    fetchMeta();
  }, [fetchMeta, router]);

  useEffect(() => {
    const token = api.getToken();
    if (!token) return;
    setPage(1);
    setHasMore(true);
    fetchLectures(1);
  }, [filters]);

  useEffect(() => {
    if (page > 1) {
      const token = api.getToken();
      if (!token) return;
      fetchLectures(page, true);
    }
  }, [page, fetchLectures]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (editingLecture) {
        await academicApi.lectures.update(editingLecture.id, lectureForm);
        toast.success('Lecture updated successfully');
      } else {
        await academicApi.lectures.create(lectureForm);
        toast.success('Lecture created successfully');
      }
      setShowModal(false);
      setEditingLecture(null);
      setLectureForm({
        title: '', description: '', content: '', teacher_id: '', grade_level_id: '', subject_id: '',
        section_id: '', scheduled_at: '', duration_minutes: 40, type: 'async',
        is_online: false, meeting_link: '', async_available_after: '', is_published: false,
      });
      fetchLectures();
    } catch (err) {
      toast.error(err.data?.message || 'Failed to save lecture');
    } finally {
      setFormLoading(false);
    }
  };

  const openEditModal = (lecture) => {
    setEditingLecture(lecture);
    setLectureForm({
      title: lecture.title || '',
      description: lecture.description || '',
      content: lecture.content || '',
      teacher_id: lecture.teacher_id || '',
      grade_level_id: lecture.grade_level_id || '',
      subject_id: lecture.subject_id || '',
      section_id: lecture.section_id || '',
      scheduled_at: lecture.scheduled_at ? lecture.scheduled_at.slice(0, 16) : '',
      duration_minutes: lecture.duration_minutes || 40,
      type: lecture.type || 'async',
      is_online: lecture.is_online || false,
      meeting_link: lecture.meeting_link || '',
      async_available_after: lecture.async_available_after ? lecture.async_available_after.slice(0, 16) : '',
      is_published: lecture.is_published || false,
    });
    setShowModal(true);
  };

  const openViewModal = async (lecture) => {
    setViewLoading(true);
    setActiveTab('overview');
    try {
      const [lectureRes, resourcesRes] = await Promise.all([
        academicApi.lectures.getOne(lecture.id),
        academicApi.lectureResources.getAll(lecture.id).catch(() => ({ resources: [] })),
      ]);
      setViewingLecture(lectureRes.lecture || lecture);
      setLectureResources(resourcesRes.resources || []);
    } catch (err) {
      toast.error('Failed to load lecture details');
      setViewingLecture(lecture);
    } finally {
      setViewLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this lecture?')) return;
    try {
      await academicApi.lectures.delete(id);
      toast.success('Lecture deleted');
      fetchLectures();
    } catch (err) {
      toast.error(err.data?.message || 'Failed to delete');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      if (status === 'in_progress') {
        await academicApi.lectures.start(id);
      } else if (status === 'completed') {
        await academicApi.lectures.complete(id);
      } else if (status === 'cancelled') {
        await academicApi.lectures.cancel(id);
      }
      toast.success('Status updated');
      fetchLectures();
    } catch (err) {
      toast.error(err.data?.message || 'Failed to update status');
    }
  };

  const handleAISubmit = async (e) => {
    e.preventDefault();
    setAiLoading(true);
    try {
      const res = await academicApi.aiLecture.generate(aiForm);
      const generated = res.lecture;
      
      const fullContent = (generated.sections || [])
        .map(s => `## ${s.title}\n\n${s.content}`)
        .join("\n\n\n");

      setBuilderForm({
        ...builderForm,
        title: aiForm.title || generated.title,
        description: aiForm.description || generated.description || "",
        grade_level_id: aiForm.grade_level_id,
        subject_id: aiForm.subject_id,
        type: "async",
        content: fullContent,
        sections: (generated.sections || []).map(s => ({
          title: s.title,
          content: s.content,
          resources: []
        }))
      });
      
      if (res.ai_unavailable) {
        toast.warning(
          `AI Limit Reached or Unavailable — Used smart academic template instead.`.trim()
        );
      } else {
        toast.success("AI generated lecture completed! Review and edit before saving.");
      }
      
      setShowAIModal(false);
      setShowBuilderModal(true);
    } catch (err) {
      toast.error(err.data?.message || "Failed to generate lecture");
    } finally {
      setAiLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const filteredGradeLevels = gradeLevels.filter(g => g.id == lectureForm.grade_level_id);
  const filteredSubjects = subjects.filter(s => s.id == lectureForm.subject_id);

  const totalPages = hasMore ? Math.ceil((lectures.length + 1) / 20) : 1;

  return (
    <DashboardLayout title="Lectures" subtitle="Manage your academic lectures and sessions">
      <div className="p-4 md:p-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-bg-card p-4 rounded-card border border-white/5 shadow-soft">
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
              <input
                type="text"
                placeholder="Search lectures..."
                value={filters.search}
                onChange={e => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary transition-all"
              />
            </div>
            
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-all ${showFilters ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 border border-white/10 text-text-secondary hover:text-text-primary hover:bg-white/10'}`}
            >
              <Filter size={20} />
            </button>
          </div>

          <div className="flex items-center space-x-4 w-full md:w-auto">
            <button
              onClick={() => { setAiForm({ title: "", description: "", grade_level_id: "", subject_id: "", sections: 5 }); setShowAIModal(true); }}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600"
            >
              <Sparkles className="w-4 h-4" /> AI Builder
            </button>
            <button
              onClick={() => {
                setBuilderForm({
                  title: '', description: '', content: '', teacher_id: '', grade_level_id: '',
                  subject_id: '', scheduled_at: '', duration_minutes: 40, type: 'async',
                  is_online: false, meeting_link: '', is_published: false,
                  sections: [{ title: '', content: '' }],
                  resources: [],
                });
                setShowBuilderModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark"
            >
              <Plus className="w-4 h-4" /> Create Lecture
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        <AnimatePresence onExitComplete={() => {
          setFilters({ search: '', status: '', type: '', grade_level_id: '', subject_id: '', term_id: '' });
        }}>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-bg-card p-4 rounded-card border border-white/5 shadow-soft grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <select
                  value={filters.status}
                  onChange={e => handleFilterChange('status', e.target.value)}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary transition-all"
                >
                  <option value="">All Status</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <select
                  value={filters.type}
                  onChange={e => handleFilterChange('type', e.target.value)}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary transition-all"
                >
                  <option value="">All Types</option>
                  <option value="sync">Live (Sync)</option>
                  <option value="async">Recorded (Async)</option>
                  <option value="hybrid">Hybrid</option>
                </select>
                <select
                  value={filters.grade_level_id}
                  onChange={e => handleFilterChange('grade_level_id', e.target.value)}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary transition-all"
                >
                  <option value="">All Grades</option>
                  {gradeLevels.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <select
                  value={filters.subject_id}
                  onChange={e => handleFilterChange('subject_id', e.target.value)}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary transition-all"
                >
                  <option value="">All Subjects</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lecture List */}
        {loading ? (
          <div className="text-center py-8 text-text-secondary">Loading...</div>
        ) : (
          <>
            {lectures.length === 0 ? (
              <div className="text-center py-8 bg-bg-card rounded-card border border-white/5 border-dashed">
                <Video className="w-12 h-12 mx-auto text-text-secondary mb-4 opacity-20" />
                <p className="text-text-secondary">No lectures found</p>
                <button
                  onClick={() => {
                    setBuilderForm({
                      title: '', description: '', content: '', teacher_id: '', grade_level_id: '',
                      subject_id: '', scheduled_at: '', duration_minutes: 40, type: 'async',
                      is_online: false, meeting_link: '', is_published: false,
                      sections: [{ title: '', content: '' }],
                      resources: [],
                    });
                    setShowBuilderModal(true);
                  }}
                  className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
                >
                  Create First Lecture
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {lectures.map((lecture, i) => (
                  <div 
                    key={lecture.id} 
                    ref={i === lectures.length - 1 ? lastElementRef : null} 
                    className="bg-bg-card p-4 rounded-card border border-white/5 flex flex-col h-[280px]"
                  >
                    <div className="flex flex-col h-full justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <h3 className="font-semibold text-text-primary truncate" title={lecture.title}>{lecture.title}</h3>
                          <div className="flex gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] whitespace-nowrap ${TYPE_COLORS[lecture.type] || TYPE_COLORS.async}`}>
                              {TYPE_LABELS[lecture.type] || 'Recorded (Async)'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] whitespace-nowrap ${STATUS_COLORS[lecture.status] || STATUS_COLORS.scheduled}`}>
                              {STATUS_LABELS[lecture.status] || 'Scheduled'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2 text-xs text-text-secondary">
                          <span className="flex items-center gap-1 truncate">
                            <BookOpen className="w-3.5 h-3.5" />
                            {lecture.subject_name || lecture.subject?.name || 'N/A'}
                          </span>
                          <span className="flex items-center gap-1 truncate">
                            <Users className="w-3.5 h-3.5" />
                            {lecture.grade_level_name || lecture.grade_level?.name || 'N/A'}
                          </span>
                          <span className="flex items-center gap-1 truncate">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(lecture.scheduled_at)}
                          </span>
                          <span className="flex items-center gap-1 truncate">
                            <Clock className="w-3.5 h-3.5" />
                            {lecture.duration_minutes} min
                          </span>
                        </div>
                        
                        <p className="text-xs text-text-muted mt-1.5 line-clamp-3 min-h-[48px]">{lecture.description || "No description provided."}</p>
                        
                        {lecture.meeting_link && (
                          <a
                            href={lecture.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-0.5"
                          >
                            <LinkIcon className="w-3 h-3" /> Join Meeting
                          </a>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between pt-0.5 border-t border-white/5 mt-auto">
                        <div className="flex items-center gap-1">

                          {lecture.status === 'in_progress' && (
                            <button
                              onClick={() => handleStatusChange(lecture.id, 'completed')}
                              className="p-1.5 text-success hover:bg-success/10 rounded-lg transition-all"
                              title="Complete"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => openViewModal(lecture)}
                            className="p-1 text-text-muted hover:text-text-primary hover:bg-white/5 rounded-lg transition-all"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          {(lecture.type === 'async' || lecture.type === 'hybrid') && lecture.is_published && (
                            <button
                              onClick={() => router.push(`/dashboard/lectures/${lecture.id}`)}
                              className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-all"
                              title="Play Lecture"
                            >
                              <PlayCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (lecture.type === 'async' || lecture.type === 'hybrid') {
                                router.push(`/dashboard/lectures/${lecture.id}?edit=true`);
                              } else {
                                openEditModal(lecture);
                              }
                            }}
                            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-white/5 rounded-lg transition-all"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(lecture.id)}
                            className="p-1.5 text-text-secondary hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {loadingMore && (
              <div className="py-4 flex items-center justify-center space-x-2 text-primary">
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <span className="text-sm font-medium">Loading more lectures...</span>
              </div>
            )}
          </>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-lg font-semibold text-text-primary">
                  {editingLecture ? 'Edit Lecture' : 'Create Lecture'}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-text-muted hover:text-text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={lectureForm.title}
                    onChange={e => setLectureForm({ ...lectureForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary"
                    placeholder="e.g., Introduction to Algebra"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Teacher *</label>
                    <select
                      required
                      value={lectureForm.teacher_id}
                      onChange={e => setLectureForm({ ...lectureForm, teacher_id: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary"
                    >
                      <option value="">Select Teacher</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.first_name} {t.last_name} ({t.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Grade Level *</label>
                    <select
                      required
                      value={lectureForm.grade_level_id}
                      onChange={e => setLectureForm({ ...lectureForm, grade_level_id: e.target.value, subject_id: '' })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary"
                    >
                      <option value="">Select Grade</option>
                      {gradeLevels.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Subject *</label>
                  <select
                    required
                    value={lectureForm.subject_id}
                    onChange={e => setLectureForm({ ...lectureForm, subject_id: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary"
                  >
                    <option value="">Select Subject</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Scheduled Date & Time *</label>
                    <input
                      type="datetime-local"
                      required
                      value={lectureForm.scheduled_at}
                      onChange={e => setLectureForm({ ...lectureForm, scheduled_at: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Duration (minutes)</label>
                    <input
                      type="number"
                      min="5"
                      max="180"
                      value={lectureForm.duration_minutes}
                      onChange={e => setLectureForm({ ...lectureForm, duration_minutes: parseInt(e.target.value) || 40 })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={lectureForm.description}
                    onChange={e => setLectureForm({ ...lectureForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary"
                    placeholder="Brief description..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Lecture Type *</label>
                  <select
                    required
                    value={lectureForm.type}
                    onChange={e => setLectureForm({ ...lectureForm, type: e.target.value, is_online: e.target.value === 'sync' || e.target.value === 'hybrid' })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary"
                  >
                    <option value="async">Recorded (Async) - Pre-recorded content</option>
                    <option value="sync">Live (Sync) - Video conference</option>
                    <option value="hybrid">Hybrid - Both live & async</option>
                  </select>
                </div>

                {(lectureForm.type === 'sync' || lectureForm.type === 'hybrid') && (
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Meeting Link</label>
                    <input
                      type="url"
                      value={lectureForm.meeting_link}
                      onChange={e => setLectureForm({ ...lectureForm, meeting_link: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary"
                      placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                    />
                  </div>
                )}

                {(lectureForm.type === 'async' || lectureForm.type === 'hybrid') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">Content (Markdown)</label>
                      <textarea
                        rows={6}
                        value={lectureForm.content}
                        onChange={e => setLectureForm({ ...lectureForm, content: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary font-mono text-sm"
                        placeholder="# Lecture Content&#10;&#10;## Introduction&#10;Write your lesson content here using Markdown...&#10;&#10;## Main Topic&#10;..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">Async Available After (optional)</label>
                      <input
                        type="datetime-local"
                        value={lectureForm.async_available_after}
                        onChange={e => setLectureForm({ ...lectureForm, async_available_after: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary"
                      />
                      <p className="text-xs text-text-muted mt-1">Leave empty to make available immediately</p>
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={lectureForm.is_published}
                          onChange={e => setLectureForm({ ...lectureForm, is_published: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-text-primary">Publish immediately</span>
                      </label>
                    </div>
                  </>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-border rounded-lg text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                  >
                    {formLoading ? 'Saving...' : editingLecture ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View/Detail Modal */}
        {viewingLecture && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewingLecture(null)}>
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-lg font-semibold text-text-primary">{viewingLecture.title}</h2>
                <button onClick={() => setViewingLecture(null)} className="text-text-muted hover:text-text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border">
                {['overview', 'content', 'resources', 'attendance'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-sm capitalize ${
                      activeTab === tab
                        ? 'border-b-2 border-primary text-primary'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="p-4">
                {viewLoading ? (
                  <div className="text-center py-8 text-text-secondary">Loading...</div>
                ) : (
                  <>
                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${TYPE_COLORS[viewingLecture.type]}`}>
                            {TYPE_LABELS[viewingLecture.type]}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[viewingLecture.status]}`}>
                            {STATUS_LABELS[viewingLecture.status]}
                          </span>
                          {viewingLecture.is_published && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-success/10 text-success">Published</span>
                          )}
                        </div>

                        <div>
                          <p className="text-sm text-text-muted">Teacher</p>
                          <p className="text-text-primary">{viewingLecture.teacher_name || viewingLecture.teacher_id}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-text-muted">Subject</p>
                            <p className="text-text-primary">{viewingLecture.subject_name || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-text-muted">Grade Level</p>
                            <p className="text-text-primary">{viewingLecture.grade_level_name || 'N/A'}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-text-muted">Scheduled</p>
                            <p className="text-text-primary">{formatDate(viewingLecture.scheduled_at)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-text-muted">Duration</p>
                            <p className="text-text-primary">{viewingLecture.duration_minutes} minutes</p>
                          </div>
                        </div>

                        {viewingLecture.description && (
                          <div>
                            <p className="text-sm text-text-muted mb-1">Description</p>
                            <p className="text-text-primary text-sm">{viewingLecture.description}</p>
                          </div>
                        )}

                        {viewingLecture.meeting_link && (
                          <div>
                            <p className="text-sm text-text-muted mb-1">Meeting Link</p>
                            <a href={viewingLecture.meeting_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                              <LinkIcon className="w-4 h-4" /> Join Meeting
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Content Tab */}
                    {activeTab === 'content' && (
                      <div>
                        {(viewingLecture.type === 'async' || viewingLecture.type === 'hybrid') ? (
                          viewingLecture.content ? (
                            <div className="prose dark:prose-invert max-w-none text-sm">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {viewingLecture.content}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <p className="text-text-muted text-center py-8">No content added yet. Edit to add content.</p>
                          )
                        ) : (
                          <p className="text-text-muted text-center py-8">Content only available for async lectures.</p>
                        )}
                      </div>
                    )}

                    {/* Resources Tab */}
                    {activeTab === 'resources' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-text-primary">Resources</h3>
                          <button
                            onClick={() => setShowResourceModal(true)}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Resource
                          </button>
                        </div>

                        {lectureResources.length === 0 ? (
                          <p className="text-text-muted text-center py-8">No resources added yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {lectureResources.map(resource => (
                              <div key={resource.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                                <div className="flex items-center gap-2">
                                  {resource.type === 'pdf' && <FileText className="w-4 h-4 text-error" />}
                                  {resource.type === 'video' && <Video className="w-4 h-4 text-purple-600" />}
                                  {resource.type === 'image' && <Image className="w-4 h-4 text-green-600" />}
                                  {resource.type === 'link' && <Globe className="w-4 h-4 text-blue-600" />}
                                  <div>
                                    <p className="text-sm font-medium text-text-primary">{resource.title}</p>
                                    <p className="text-xs text-text-muted">{resource.type}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {resource.is_downloadable && (
                                    <span className="p-1 text-text-muted" title="Downloadable"><Download className="w-4 h-4" /></span>
                                  )}
                                  {resource.is_savable && (
                                    <span className="p-1 text-text-muted" title="Savable"><Save className="w-4 h-4" /></span>
                                  )}
                                  <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">View</a>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Attendance Tab */}
                    {activeTab === 'attendance' && (
                      <div>
                        <p className="text-text-muted text-center py-8">Attendance tracking will be available in the student dashboard.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Add Resource Modal */}
        {showResourceModal && viewingLecture && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setShowResourceModal(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-semibold text-text-primary">Add Resource</h3>
                <button onClick={() => setShowResourceModal(false)} className="text-text-muted hover:text-text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await academicApi.lectureResources.add(viewingLecture.id, resourceForm);
                  toast.success('Resource added');
                  setShowResourceModal(false);
                  const res = await academicApi.lectureResources.getAll(viewingLecture.id);
                  setLectureResources(res.resources || []);
                  setResourceForm({ title: '', type: 'pdf', url: '', description: '', is_downloadable: false, is_savable: false, available_from: '', order_index: 0 });
                } catch (err) {
                  toast.error(err.data?.message || 'Failed to add resource');
                }
              }} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={resourceForm.title}
                    onChange={e => setResourceForm({ ...resourceForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary"
                    placeholder="Resource title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Type *</label>
                  <select
                    required
                    value={resourceForm.type}
                    onChange={e => setResourceForm({ ...resourceForm, type: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary"
                  >
                    <option value="pdf">PDF Document</option>
                    <option value="video">Video</option>
                    <option value="image">Image</option>
                    <option value="link">External Link</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">URL *</label>
                  <input
                    type="url"
                    required
                    value={resourceForm.url}
                    onChange={e => setResourceForm({ ...resourceForm, url: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary"
                    placeholder="https://..."
                  />
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={resourceForm.is_downloadable}
                      onChange={e => setResourceForm({ ...resourceForm, is_downloadable: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-text-primary">Downloadable</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={resourceForm.is_savable}
                      onChange={e => setResourceForm({ ...resourceForm, is_savable: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-text-primary">Savable</span>
                  </label>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowResourceModal(false)} className="flex-1 px-4 py-2 border border-border rounded-lg">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-primary text-white rounded-lg">Add</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ==================== AI BUILDER MODAL ==================== */}
        {showAIModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-4 md:p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base md:text-lg font-semibold text-text-primary flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  AI Lecture Builder
                </h3>
                <button onClick={() => setShowAIModal(false)} className="text-text-muted hover:text-text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAISubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Lecture Topic/Title *</label>
                  <input
                    type="text"
                    required
                    value={aiForm.title}
                    onChange={e => setAiForm({ ...aiForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary"
                    placeholder="e.g. Introduction to Quantum Physics"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Brief Description (Optional)</label>
                  <textarea
                    rows={2}
                    value={aiForm.description}
                    onChange={e => setAiForm({ ...aiForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary"
                    placeholder="Provide context for the AI..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Grade Level *</label>
                    <select
                      required
                      value={aiForm.grade_level_id}
                      onChange={e => setAiForm({ ...aiForm, grade_level_id: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary"
                    >
                      <option value="">Select Grade</option>
                      {gradeLevels.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Subject *</label>
                    <select
                      required
                      value={aiForm.subject_id}
                      onChange={e => setAiForm({ ...aiForm, subject_id: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary"
                    >
                      <option value="">Select Subject</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Number of Sections</label>
                  <input
                    type="number"
                    min="2"
                    max="10"
                    value={aiForm.sections}
                    onChange={e => setAiForm({ ...aiForm, sections: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary"
                  />
                </div>
                
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                  <p className="text-xs text-purple-700 dark:text-purple-300">
                    <strong>Pro Tip:</strong> AI will generate a structured lecture with multiple sections. You can add resources to each section in the next step.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAIModal(false)}
                    className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={aiLoading}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
                  >
                    {aiLoading ? 'Generating...' : 'Generate with AI'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ==================== LECTURE BUILDER MODAL ==================== */}
        {showBuilderModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold text-text-primary">Lecture Builder</h2>
                </div>
                <button onClick={() => setShowBuilderModal(false)} className="text-text-muted hover:text-text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                setBuilderLoading(true);
                try {
                  let content = builderForm.content || '';
                  
                  if (builderForm.type === 'async' || builderForm.type === 'hybrid') {
                    const hasSections = builderForm.sections.some(s => s.title || s.content);
                    if (hasSections) {
                      content = builderForm.sections
                        .map(s => `## ${s.title}\n\n${s.content}`)
                        .join('\n\n\n');
                    }
                  }
                  
                  const lectureRes = await academicApi.lectures.create({
                    ...builderForm,
                    content,
                  });
                  
                  const lectureId = lectureRes.lecture?.id || lectureRes.id;
                  
                  for (let rIndex = 0; rIndex < (builderForm.resources || []).length; rIndex++) {
                    const resource = builderForm.resources[rIndex];
                    const contentId = resource.target === 'all' ? 'all' : parseInt(resource.target);
                    if (resource.sourceType === 'file' && resource.file) {
                      setBuilderUploading(prev => ({ ...prev, [resource.file.name]: true }));
                      try {
                        await academicApi.lectureResources.upload(
                          lectureId,
                          resource.file,
                          resource.title,
                          resource.type || 'pdf',
                          contentId === 'all' ? 0 : contentId,
                          contentId,
                          false,
                          false
                        );
                      } finally {
                        setBuilderUploading(prev => ({ ...prev, [resource.file.name]: false }));
                      }
                    } else if (resource.sourceType === 'link' && resource.url) {
                      await academicApi.lectureResources.add(lectureId, {
                        title: resource.title,
                        url: resource.url,
                        type: resource.type || 'link',
                        content_id: contentId === 'all' ? null : contentId,
                        order_index: contentId === 'all' ? 0 : contentId,
                      });
                    }
                  }
                  
                  toast.success('Lecture created with resources!');
                  setShowBuilderModal(false);
                  fetchLectures();
                } catch (err) {
                  toast.error(err.data?.message || 'Failed to create lecture');
                } finally {
                  setBuilderLoading(false);
                }
              }} className="flex-1 overflow-y-auto p-4 space-y-6">
                <div className="space-y-4">
                  <h3 className="font-medium text-text-primary border-b pb-2">Basic Information</h3>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Lecture Type *</label>
                    <div className="flex gap-2">
                      {['async', 'sync', 'hybrid'].map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setBuilderForm({ ...builderForm, type, is_online: type === 'sync' || type === 'hybrid' })}
                          className={`flex-1 px-4 py-2 rounded-lg border ${
                            builderForm.type === type
                              ? 'border-primary bg-primary text-white'
                              : 'border-border bg-white dark:bg-gray-700 text-text-primary hover:border-primary'
                          }`}
                        >
                          {type === 'async' && 'Recorded (Async)'}
                          {type === 'sync' && 'Live (Sync)'}
                          {type === 'hybrid' && 'Hybrid'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">Title *</label>
                      <input
                        type="text"
                        required
                        value={builderForm.title}
                        onChange={e => setBuilderForm({ ...builderForm, title: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary"
                        placeholder="Lecture title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">Teacher *</label>
                      <select
                        required
                        value={builderForm.teacher_id}
                        onChange={e => setBuilderForm({ ...builderForm, teacher_id: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary"
                      >
                        <option value="">Select Teacher</option>
                        {teachers.map(t => (
                          <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {(builderForm.type === 'sync' || builderForm.type === 'hybrid') && (
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">Meeting Link</label>
                      <input
                        type="url"
                        value={builderForm.meeting_link || ''}
                        onChange={e => setBuilderForm({ ...builderForm, meeting_link: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary"
                        placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                      />
                    </div>
                  )}
                  {(builderForm.type === 'async' || builderForm.type === 'hybrid') && (
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">Content (Markdown)</label>
                      <textarea
                        rows={6}
                        value={builderForm.content || ''}
                        onChange={e => setBuilderForm({ ...builderForm, content: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary font-mono text-sm"
                        placeholder="Lecture content in Markdown..."
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">Grade Level *</label>
                      <select
                        required
                        value={builderForm.grade_level_id}
                        onChange={e => setBuilderForm({ ...builderForm, grade_level_id: e.target.value, subject_id: '' })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary"
                      >
                        <option value="">Select Grade</option>
                        {gradeLevels.map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">Subject *</label>
                      <select
                        required
                        value={builderForm.subject_id}
                        onChange={e => setBuilderForm({ ...builderForm, subject_id: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary"
                      >
                        <option value="">Select Subject</option>
                        {subjects.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Scheduled Date *</label>
                    <input
                      type="datetime-local"
                      required
                      value={builderForm.scheduled_at}
                      onChange={e => setBuilderForm({ ...builderForm, scheduled_at: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary"
                    />
                  </div>
                </div>

                {(builderForm.type === 'async' || builderForm.type === 'hybrid') && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="font-medium text-text-primary">Sections & Resources</h3>
                    <button
                      type="button"
                      onClick={() => setBuilderForm({ 
                        ...builderForm, 
                        sections: [...builderForm.sections, { title: '', content: '' }] 
                      })}
                      className="text-sm text-primary hover:underline"
                    >
                      + Add Section
                    </button>
                  </div>
                  
                  {builderForm.sections.map((section, index) => (
                    <div key={index} className="border border-border rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-text-muted cursor-move" />
                          <span className="text-sm font-medium text-text-primary">Section {index + 1}</span>
                        </div>
                        {builderForm.sections.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newSections = builderForm.sections.filter((_, i) => i !== index);
                              setBuilderForm({ ...builderForm, sections: newSections });
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={section.title}
                        onChange={e => {
                          const newSections = [...builderForm.sections];
                          newSections[index].title = e.target.value;
                          setBuilderForm({ ...builderForm, sections: newSections });
                        }}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary mb-2"
                        placeholder="Section title"
                      />
                      <textarea
                        rows={4}
                        value={section.content}
                        onChange={e => {
                          const newSections = [...builderForm.sections];
                          newSections[index].content = e.target.value;
                          setBuilderForm({ ...builderForm, sections: newSections });
                        }}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary font-mono text-sm mb-3"
                        placeholder="Section content (Markdown)"
                      />
                    </div>
                  ))}
                  
                  <div className="border-t border-border pt-6 mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-text-primary">Lecture Resources</h3>
                      <button
                        type="button"
                        onClick={() => {
                          setBuilderForm({
                            ...builderForm,
                            resources: [...(builderForm.resources || []), { title: '', type: 'pdf', sourceType: 'file', file: null, url: '', target: 'all' }]
                          });
                        }}
                        className="text-sm text-primary hover:underline"
                      >
                        + Add Resource
                      </button>
                    </div>
                    
                    {(builderForm.resources || []).map((resource, rIndex) => (
                      <div key={rIndex} className="border border-border rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50 mb-3">
                         <div className="flex justify-between items-center mb-3">
                            <h4 className="text-sm font-medium text-text-primary">Resource {rIndex + 1}</h4>
                            <button 
                              type="button" 
                              onClick={() => {
                                const newResources = [...builderForm.resources];
                                newResources.splice(rIndex, 1);
                                setBuilderForm({ ...builderForm, resources: newResources });
                              }} 
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                            <div>
                               <label className="block text-xs font-medium text-text-secondary mb-1">Title *</label>
                               <input 
                                 type="text" 
                                 value={resource.title} 
                                 onChange={e => {
                                    const newResources = [...builderForm.resources];
                                    newResources[rIndex].title = e.target.value;
                                    setBuilderForm({ ...builderForm, resources: newResources });
                                 }} 
                                 className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary text-sm" 
                                 placeholder="Resource title" 
                                 required 
                               />
                            </div>
                            <div>
                               <label className="block text-xs font-medium text-text-secondary mb-1">Attach To *</label>
                               <select 
                                 value={resource.target} 
                                 onChange={e => {
                                    const newResources = [...builderForm.resources];
                                    newResources[rIndex].target = e.target.value;
                                    setBuilderForm({ ...builderForm, resources: newResources });
                                 }} 
                                 className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary text-sm"
                               >
                                 <option value="all">Entire Lecture</option>
                                 {builderForm.sections.map((sec, sIdx) => (
                                    <option key={sIdx} value={sIdx}>Section {sIdx + 1}: {sec.title || 'Untitled'}</option>
                                 ))}
                               </select>
                            </div>
                         </div>
                         <div className="mb-3">
                            <label className="block text-xs font-medium text-text-secondary mb-1">Source Type</label>
                            <div className="flex gap-4">
                               <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                                 <input 
                                   type="radio" 
                                   checked={resource.sourceType === 'file'} 
                                   onChange={() => {
                                      const newResources = [...builderForm.resources];
                                      newResources[rIndex].sourceType = 'file';
                                      newResources[rIndex].type = 'pdf';
                                      setBuilderForm({ ...builderForm, resources: newResources });
                                   }} 
                                 /> File Upload
                               </label>
                               <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                                 <input 
                                   type="radio" 
                                   checked={resource.sourceType === 'link'} 
                                   onChange={() => {
                                      const newResources = [...builderForm.resources];
                                      newResources[rIndex].sourceType = 'link';
                                      newResources[rIndex].type = 'link';
                                      setBuilderForm({ ...builderForm, resources: newResources });
                                   }} 
                                 /> URL Link
                               </label>
                            </div>
                         </div>
                         {resource.sourceType === 'file' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <div>
                                  <label className="block text-xs font-medium text-text-secondary mb-1">File Type</label>
                                  <select 
                                    value={resource.type} 
                                    onChange={e => {
                                        const newResources = [...builderForm.resources];
                                        newResources[rIndex].type = e.target.value;
                                        setBuilderForm({ ...builderForm, resources: newResources });
                                    }} 
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary text-sm"
                                  >
                                    <option value="pdf">PDF</option>
                                    <option value="video">Video</option>
                                    <option value="image">Image</option>
                                  </select>
                               </div>
                               <div>
                                  <label className="block text-xs font-medium text-text-secondary mb-1">File *</label>
                                  <div className="flex items-center gap-2">
                                    <label className="cursor-pointer text-sm bg-primary text-white px-3 py-2 rounded-lg hover:bg-primary-dark whitespace-nowrap">
                                      <input 
                                        type="file" 
                                        className="hidden" 
                                        onChange={e => {
                                          const file = e.target.files[0];
                                          if (file) {
                                            const newResources = [...builderForm.resources];
                                            newResources[rIndex].file = file;
                                            newResources[rIndex].title = newResources[rIndex].title || file.name;
                                            setBuilderForm({ ...builderForm, resources: newResources });
                                          }
                                        }} 
                                      />
                                      Choose File
                                    </label>
                                    {resource.file && (
                                      <span className="text-xs text-success bg-success/10 px-2 py-1 rounded truncate">
                                        {resource.file.name}
                                      </span>
                                    )}
                                  </div>
                               </div>
                            </div>
                         ) : (
                            <div>
                               <label className="block text-xs font-medium text-text-secondary mb-1">URL *</label>
                               <input 
                                 type="url" 
                                 value={resource.url} 
                                 onChange={e => {
                                    const newResources = [...builderForm.resources];
                                    newResources[rIndex].url = e.target.value;
                                    setBuilderForm({ ...builderForm, resources: newResources });
                                 }} 
                                 className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary text-sm" 
                                 placeholder="https://..." 
                                 required 
                               />
                            </div>
                         )}
                      </div>
                    ))}
                  </div>
                </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowBuilderModal(false)}
                    className="px-4 py-2 border border-border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={builderLoading}
                    className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                  >
                    {builderLoading ? 'Creating...' : 'Create Lecture'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}