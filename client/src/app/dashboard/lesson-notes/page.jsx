'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Plus, Trash2, X, Edit2, CheckCircle, Sparkles,
  Filter, Calendar, Tag, Clock, Eye, Search
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import MarkdownEditor from '@/components/MarkdownEditor';
import { academicApi } from '@/lib/academic-api';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastProvider';

export default function LessonNotesPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [lessonNotes, setLessonNotes] = useState([]);
  const [filters, setFilters] = useState({ grade_level_id: '', subject_id: '', term_id: '', status: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeLevels, setGradeLevels] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [terms, setTerms] = useState([]);
  const [schemes, setSchemes] = useState([]);

  // --- Infinite Scroll States ---
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observer = useRef();

  // Helper: strip markdown formatting for clean text preview
  const stripMarkdown = (text) => {
    return text
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      .replace(/~~(.+?)~~/g, '$1')
      .replace(/^>\s+/gm, '')
      .replace(/^[-*+]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      .replace(/\n{2,}/g, ' ')
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [viewingNote, setViewingNote] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [noteForm, setNoteForm] = useState({
    scheme_id: '',
    grade_level_id: '',
    subject_id: '',
    term_id: '',
    week_number: '',
    topic: '',
    aspects: { objective: '', content: '', methodology: '', evaluation: '', materials: '' },
    contact_number: 40,
  });
  const [aiForm, setAiForm] = useState({ scheme_id: '', aspects: [], target_audience_size: 30 });
  const [submitting, setSubmitting] = useState(false);

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

  const fetchInitialData = useCallback(async () => {
    try {
      const [gradesRes, subjectsRes, termsRes, schemesRes] = await Promise.all([
        academicApi.gradeLevels.getAll().catch(() => ({ grade_levels: [] })),
        api.get('/academic/subjects').catch(() => ({ subjects: [] })),
        api.get('/academic/terms').catch(() => ({ terms: [] })),
        academicApi.schemes.getAll().catch(() => ({ schemes: [] })),
      ]);
      setGradeLevels(gradesRes.grade_levels || []);
      setSubjects(subjectsRes.subjects || []);
      setTerms(termsRes.terms || []);
      setSchemes(schemesRes.schemes || []);
    } catch (err) {
      toast.error('Failed to load initial data');
    }
  }, [toast]);

  const fetchNotes = useCallback(async (pageNum = 1, isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);
    try {
      const params = { ...filters, page: pageNum, search: searchQuery };
      const notesRes = await academicApi.lessonNotes.getAll(params);
      const newData = notesRes.lesson_notes || notesRes.data || [];
      setLessonNotes(prev => pageNum === 1 ? newData : [...prev, ...newData]);
      setHasMore(notesRes.meta?.has_more || false);
    } catch (err) {
      toast.error('Failed to load lesson notes');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, searchQuery, toast]);

  useEffect(() => {
    const token = api.getToken();
    if (!token) { router.push('/login'); return; }
    fetchInitialData();
  }, [fetchInitialData, router]);

  useEffect(() => {
    const token = api.getToken();
    if (!token) return;
    setPage(1);
    setHasMore(true);
    fetchNotes(1);
  }, [filters, searchQuery, fetchNotes, router]);

  useEffect(() => {
    if (page > 1) {
      const token = api.getToken();
      if (!token) return;
      fetchNotes(page, true);
    }
  }, [page, fetchNotes]);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = {
        ...noteForm,
        aspects: noteForm.aspects.objective || noteForm.aspects.content || noteForm.aspects.methodology || noteForm.aspects.evaluation || noteForm.aspects.materials
          ? noteForm.aspects
          : null,
      };

      if (editingNote) {
        await academicApi.lessonNotes.update(editingNote.id, data);
        toast.success('Lesson note updated successfully');
      } else {
        await academicApi.lessonNotes.create(data);
        toast.success('Lesson note created successfully');
      }

      setShowModal(false);
      setEditingNote(null);
      resetForm();
      fetchNotes();
    } catch (err) {
      toast.error(err.data?.message || 'Failed to save lesson note');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (note) => {
    setEditingNote(note);
    setNoteForm({
      scheme_id: note.scheme_id || '',
      grade_level_id: note.grade_level_id || '',
      subject_id: note.subject_id || '',
      term_id: note.term_id || '',
      week_number: note.week_number || '',
      topic: note.topic || '',
      aspects: note.aspects || { objective: '', content: '', methodology: '', evaluation: '', materials: '' },
      contact_number: note.contact_number || 40,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this lesson note?')) return;
    try {
      await academicApi.lessonNotes.delete(id);
      toast.success('Lesson note deleted');
      fetchNotes();
    } catch (err) {
      toast.error('Failed to delete lesson note');
    }
  };

  const handlePublish = async (id) => {
    try {
      await academicApi.lessonNotes.publish(id);
      toast.success('Lesson note published');
      fetchNotes();
    } catch (err) {
      toast.error('Failed to publish lesson note');
    }
  };

  const handleAISubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await academicApi.aiLessonNote.generate({
        scheme_id: aiForm.scheme_id,
        aspects: aiForm.aspects,
        target_audience_size: aiForm.target_audience_size,
      });

      // Pre-fill the manual form with AI-generated content
      const aiNote = res.lesson_note;
      const scheme = schemes.find(s => s.id == aiForm.scheme_id);

      setNoteForm({
        scheme_id: aiForm.scheme_id,
        grade_level_id: scheme?.grade_level_id || '',
        subject_id: scheme?.subject_id || '',
        term_id: scheme?.term_id || '',
        week_number: aiNote.week_number,
        topic: aiNote.topic,
        aspects: aiNote.aspects,
        contact_number: aiNote.contact_number,
      });

      // Check if AI was actually used or if it fell back to templates
      if (res.ai_unavailable) {
        toast.warning(
          `AI unavailable — used template instead. ${res.ai_reason || ''}`.trim(),
        );
      } else {
        toast.success('AI generated lesson note! Review and edit before saving.');
      }

      setShowAIModal(false);
      setShowModal(true);
    } catch (err) {
      console.error('AI lesson note generation failed:', err);
      const msg = err.data?.message || err.data?.error || err.message || 'Failed to generate lesson note';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setNoteForm({
      scheme_id: '',
      grade_level_id: '',
      subject_id: '',
      term_id: '',
      week_number: '',
      topic: '',
      aspects: { objective: '', content: '', methodology: '', evaluation: '', materials: '' },
      contact_number: 40,
    });
  };

  const handleRegenerateWithAI = async () => {
    if (!noteForm.scheme_id) {
      toast.error('Please link to a scheme entry first');
      return;
    }
    setSubmitting(true);
    try {
      // Send the user's EDITED topic to AI so it generates content for the NEW topic
      const res = await academicApi.aiLessonNote.generate({
        scheme_id: noteForm.scheme_id,
        target_audience_size: 30,
        topic_override: noteForm.topic, // Pass user's edited topic
      });
      const aiNote = res.lesson_note;
      setNoteForm({
        ...noteForm,
        week_number: aiNote.week_number || noteForm.week_number,
        topic: noteForm.topic, // KEEP user's edited topic, don't revert to AI's
        aspects: aiNote.aspects || noteForm.aspects,
        contact_number: aiNote.contact_number || noteForm.contact_number,
      });

      // Check if AI was actually used or if it fell back to templates
      if (res.ai_unavailable) {
        toast.warning(
          `AI unavailable — used template instead. ${res.ai_reason || ''}`.trim(),
        );
      } else {
        toast.success('Lesson note regenerated with AI!');
      }
    } catch (err) {
      console.error('AI regeneration failed:', err);
      const msg = err.data?.message || err.data?.error || err.message || 'Failed to regenerate with AI';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSchemeSelect = (schemeId) => {
    const scheme = schemes.find(s => s.id == schemeId);
    if (scheme) {
      setNoteForm({
        ...noteForm,
        scheme_id: schemeId,
        grade_level_id: scheme.grade_level_id,
        subject_id: scheme.subject_id,
        term_id: scheme.term_id,
        week_number: scheme.week_number,
        topic: scheme.topic,
      });
    }
  };

  // Note: filtering is now done server-side via API
  const notes = lessonNotes;

  // ==================== RENDER ====================
  return (
    <DashboardLayout title="Lesson Notes" subtitle="Create and manage your lesson notes">
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-text-primary">Lesson Notes</h1>
            <p className="text-sm text-text-secondary">Plan your lessons based on schemes of work</p>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
              <input
                type="text"
                placeholder="Search lesson notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
          <div className="flex gap-2">
            <button
              onClick={() => { setShowAIModal(true); setAiForm({ scheme_id: '', aspects: [], target_audience_size: 30 }); }}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600"
            >
              <Sparkles className="w-4 h-4" />
              AI Builder
            </button>
            <button
              onClick={() => { setShowModal(true); setEditingNote(null); resetForm(); }}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark"
            >
              <Plus className="w-4 h-4" />
              New Note
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        <AnimatePresence onExitComplete={() => {
          setFilters({ grade_level_id: '', subject_id: '', term_id: '', status: '' });
          setSearchQuery('');
        }}>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-bg-card p-4 rounded-card border border-white/5 shadow-soft grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Grade Level</label>
                  <select
                    value={filters.grade_level_id}
                    onChange={e => handleFilterChange('grade_level_id', e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary transition-all"
                  >
                    <option value="">All Grades</option>
                    {gradeLevels.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Subject</label>
                  <select
                    value={filters.subject_id}
                    onChange={e => handleFilterChange('subject_id', e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary transition-all"
                  >
                    <option value="">All Subjects</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Term</label>
                  <select
                    value={filters.term_id}
                    onChange={e => handleFilterChange('term_id', e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary transition-all"
                  >
                    <option value="">All Terms</option>
                    {terms.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Status</label>
                  <select
                    value={filters.status}
                    onChange={e => handleFilterChange('status', e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary transition-all"
                  >
                    <option value="">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lesson Notes List */}
        {loading ? (
          <div className="text-center py-12 text-text-secondary">Loading lesson notes...</div>
        ) : filteredLessonNotes.length === 0 ? (
          <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-8 text-center">
            <BookOpen className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              {searchQuery ? 'No lesson notes match your search' : 'No lesson notes yet'}
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              {searchQuery ? 'Try adjusting your search or filters' : 'Create your first lesson note to get started'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => { setShowModal(true); setEditingNote(null); resetForm(); }}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark"
              >
                Create Note
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLessonNotes.map(note => (
              <div key={note.id} className="bg-card dark:bg-gray-800 rounded-card border border-border p-4 md:p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-semibold">Week {note.week_number}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        note.status === 'published' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                      }`}>
                        {note.status === 'published' ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <h3 className="font-semibold text-text-primary text-sm md:text-base truncate">{note.topic}</h3>
                  </div>
                  <div className="flex gap-1 flex-shrink-0 ml-2">
                    <button
                      onClick={() => setViewingNote(note)}
                      className="p-1 text-primary hover:text-primary/80"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {note.status === 'draft' && (
                      <button
                        onClick={() => handlePublish(note.id)}
                        className="p-1 text-success hover:text-success/80"
                        title="Publish"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(note)}
                      className="p-1 text-info hover:text-info/80"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="p-1 text-error hover:text-error/80"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-text-secondary">
                  {note.subject && <p className="flex items-center gap-1"><Tag className="w-3 h-3" />{note.subject.name}</p>}
                  {note.gradeLevel && <p className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{note.gradeLevel.name}</p>}
                  {note.term && <p className="flex items-center gap-1"><Calendar className="w-3 h-3" />{note.term.name}</p>}
                  {note.contact_number && <p className="flex items-center gap-1"><Clock className="w-3 h-3" />{note.contact_number} minutes</p>}
                </div>

                {note.aspects && note.aspects.objective && (
                  <p className="mt-3 text-xs text-text-muted line-clamp-2">
                    <strong>Objective:</strong> {stripMarkdown(note.aspects.objective).slice(0, 120)}…
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ==================== VIEW MODAL ==================== */}
        {viewingNote && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewingNote(null)}>
            <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-4 md:p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-semibold">Week {viewingNote.week_number}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      viewingNote.status === 'published' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                    }`}>
                      {viewingNote.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-text-primary">{viewingNote.topic}</h3>
                </div>
                <button onClick={() => setViewingNote(null)} className="text-text-muted hover:text-text-primary">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 bg-bg-main dark:bg-gray-700/50 p-4 rounded-lg border border-border">
                <div>
                  <p className="text-xs text-text-muted uppercase font-semibold">Subject</p>
                  <p className="text-sm font-medium text-text-primary">{viewingNote.subject?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted uppercase font-semibold">Grade</p>
                  <p className="text-sm font-medium text-text-primary">{viewingNote.gradeLevel?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted uppercase font-semibold">Term</p>
                  <p className="text-sm font-medium text-text-primary">{viewingNote.term?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted uppercase font-semibold">Duration</p>
                  <p className="text-sm font-medium text-text-primary">{viewingNote.contact_number || 40} mins</p>
                </div>
              </div>

              <div className="space-y-8">
                {viewingNote.aspects?.objective && (
                  <div>
                    <h4 className="text-sm font-bold text-text-primary mb-2 border-b pb-1">Learning Objective</h4>
                    <div className="prose dark:prose-invert max-w-none text-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{viewingNote.aspects.objective}</ReactMarkdown>
                    </div>
                  </div>
                )}
                
                {viewingNote.aspects?.content && (
                  <div>
                    <h4 className="text-sm font-bold text-text-primary mb-2 border-b pb-1">Content</h4>
                    <div className="prose dark:prose-invert max-w-none text-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{viewingNote.aspects.content}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {viewingNote.aspects?.methodology && (
                  <div>
                    <h4 className="text-sm font-bold text-text-primary mb-2 border-b pb-1">Methodology</h4>
                    <div className="prose dark:prose-invert max-w-none text-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{viewingNote.aspects.methodology}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {viewingNote.aspects?.materials && (
                  <div>
                    <h4 className="text-sm font-bold text-text-primary mb-2 border-b pb-1">Materials & Resources</h4>
                    <div className="prose dark:prose-invert max-w-none text-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{viewingNote.aspects.materials}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {viewingNote.aspects?.evaluation && (
                  <div>
                    <h4 className="text-sm font-bold text-text-primary mb-2 border-b pb-1">Evaluation</h4>
                    <div className="prose dark:prose-invert max-w-none text-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{viewingNote.aspects.evaluation}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-6 border-t flex justify-end">
                <button
                  onClick={() => { setViewingNote(null); handleEdit(viewingNote); }}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Note
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== LESSON NOTE MODAL ==================== */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-4 md:p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base md:text-lg font-semibold text-text-primary">
                  {editingNote ? 'Edit Lesson Note' : 'Create Lesson Note'}
                </h3>
                <div className="flex items-center gap-2">
                  {editingNote && editingNote.scheme_id && (
                    <button
                      type="button"
                      onClick={handleRegenerateWithAI}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600"
                      disabled={submitting}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Regenerate with AI
                    </button>
                  )}
                  <button onClick={() => { setShowModal(false); setEditingNote(null); }} className="text-text-muted hover:text-text-primary">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Scheme Selector */}
                <div>
                  <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Link to Scheme of Work</label>
                  <select
                    value={noteForm.scheme_id}
                    onChange={e => handleSchemeSelect(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary"
                  >
                    <option value="">Select Scheme Entry (optional)</option>
                    {schemes.map(s => (
                      <option key={s.id} value={s.id}>Week {s.week_number} — {s.topic} — {s.subject?.name || ''}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Grade Level *</label>
                    <select
                      value={noteForm.grade_level_id}
                      onChange={e => setNoteForm({ ...noteForm, grade_level_id: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm text-text-primary"
                      required
                    >
                      <option value="">Select Grade</option>
                      {gradeLevels.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Subject *</label>
                    <select
                      value={noteForm.subject_id}
                      onChange={e => setNoteForm({ ...noteForm, subject_id: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm text-text-primary"
                      required
                    >
                      <option value="">Select Subject</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Term *</label>
                    <select
                      value={noteForm.term_id}
                      onChange={e => setNoteForm({ ...noteForm, term_id: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm text-text-primary"
                      required
                    >
                      <option value="">Select Term</option>
                      {terms.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Duration (minutes)</label>
                    <input
                      type="number"
                      value={noteForm.contact_number || 40}
                      onChange={e => setNoteForm({ ...noteForm, contact_number: e.target.value === '' ? 40 : parseInt(e.target.value, 10) || 40 })}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm text-text-primary"
                      min="1"
                      max="180"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Topic *</label>
                  <input
                    type="text"
                    value={noteForm.topic}
                    onChange={e => setNoteForm({ ...noteForm, topic: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary"
                    required
                  />
                </div>

                {/* Aspects (Collapsible with Markdown Support) */}
                <div className="space-y-3">
                  <details className="border border-border dark:border-gray-600 rounded-lg" open>
                    <summary className="px-3 py-2 cursor-pointer text-sm font-medium text-text-primary">Learning Objective *</summary>
                    <div className="p-3">
                      <MarkdownEditor
                        value={noteForm.aspects.objective}
                        onChange={value => setNoteForm({
                          ...noteForm,
                          aspects: { ...noteForm.aspects, objective: value }
                        })}
                        placeholder="What students should learn..."
                        rows={3}
                      />
                    </div>
                  </details>

                  <details className="border border-border dark:border-gray-600 rounded-lg" open>
                    <summary className="px-3 py-2 cursor-pointer text-sm font-medium text-text-primary">Content *</summary>
                    <div className="p-3">
                      <MarkdownEditor
                        value={noteForm.aspects.content}
                        onChange={value => setNoteForm({
                          ...noteForm,
                          aspects: { ...noteForm.aspects, content: value }
                        })}
                        placeholder="Detailed lesson content and explanations..."
                        rows={5}
                      />
                    </div>
                  </details>

                  <details className="border border-border dark:border-gray-600 rounded-lg">
                    <summary className="px-3 py-2 cursor-pointer text-sm font-medium text-text-primary">Methodology</summary>
                    <div className="p-3">
                      <MarkdownEditor
                        value={noteForm.aspects.methodology}
                        onChange={value => setNoteForm({
                          ...noteForm,
                          aspects: { ...noteForm.aspects, methodology: value }
                        })}
                        placeholder="Teaching methods: discussion, demonstration, group work..."
                        rows={3}
                      />
                    </div>
                  </details>

                  <details className="border border-border dark:border-gray-600 rounded-lg">
                    <summary className="px-3 py-2 cursor-pointer text-sm font-medium text-text-primary">Materials/Resources</summary>
                    <div className="p-3">
                      <MarkdownEditor
                        value={noteForm.aspects.materials}
                        onChange={value => setNoteForm({
                          ...noteForm,
                          aspects: { ...noteForm.aspects, materials: value }
                        })}
                        placeholder="Textbook, whiteboard, handouts, projector..."
                        rows={3}
                      />
                    </div>
                  </details>

                  <details className="border border-border dark:border-gray-600 rounded-lg">
                    <summary className="px-3 py-2 cursor-pointer text-sm font-medium text-text-primary">Evaluation</summary>
                    <div className="p-3">
                      <MarkdownEditor
                        value={noteForm.aspects.evaluation}
                        onChange={value => setNoteForm({
                          ...noteForm,
                          aspects: { ...noteForm.aspects, evaluation: value }
                        })}
                        placeholder="Assessment questions and criteria..."
                        rows={3}
                      />
                    </div>
                  </details>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setEditingNote(null); }}
                    className="flex-1 px-4 py-2 text-sm md:text-base border border-border dark:border-gray-600 rounded-lg hover:bg-bg-main dark:hover:bg-gray-700 text-text-primary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 text-sm md:text-base bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : (editingNote ? 'Update Note' : 'Create Note')}
                  </button>
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
                  AI Lesson Note Builder
                </h3>
                <button onClick={() => setShowAIModal(false)} className="text-text-muted hover:text-text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAISubmit} className="space-y-4">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Select Scheme Entry *</label>
                  <select
                    value={aiForm.scheme_id}
                    onChange={e => setAiForm({ ...aiForm, scheme_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm text-text-primary"
                    required
                  >
                    <option value="">Select Scheme</option>
                    {schemes.map(s => (
                      <option key={s.id} value={s.id}>Week {s.week_number} — {s.topic}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Target Audience Size</label>
                  <input
                    type="number"
                    value={aiForm.target_audience_size || 30}
                    onChange={e => setAiForm({ ...aiForm, target_audience_size: e.target.value === '' ? 30 : parseInt(e.target.value, 10) || 30 })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm text-text-primary"
                    min="1"
                    max="200"
                  />
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                  <p className="text-xs text-purple-700 dark:text-purple-300">
                    <strong>Note:</strong> AI will generate a complete lesson note based on your scheme entry. You can review and edit it before saving.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAIModal(false)}
                    className="flex-1 px-4 py-2 text-sm md:text-base border border-border dark:border-gray-600 rounded-lg hover:bg-bg-main dark:hover:bg-gray-700 text-text-primary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !aiForm.scheme_id}
                    className="flex-1 px-4 py-2 text-sm md:text-base bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
                  >
                    {submitting ? 'Generating...' : 'Generate with AI'}
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
