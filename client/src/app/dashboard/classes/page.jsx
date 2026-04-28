'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  School, Users, BookOpen, UserRound, Plus, Trash2, X, Edit2,
  GraduationCap, Layers, Tag, ChevronLeft, CheckCircle, Sparkles, Eye,
  Search, Filter
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import MarkdownEditor from '@/components/MarkdownEditor';
import { academicApi } from '@/lib/academic-api';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastProvider';

export default function ClassesPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [filters, setFilters] = useState({ search: '', cycle: '' });
  const [showFilters, setShowFilters] = useState(false);
  
  // --- Infinite Scroll States ---
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observer = useRef();

  const [selectedGrade, setSelectedGrade] = useState(null);
  const [gradeDetail, setGradeDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState('overview');

  // Teacher assignment state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({ teacher_id: '', subject_id: '', section_id: '' });
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);

  // Student assignment state
  const [showStudentAssignModal, setShowStudentAssignModal] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [studentAssignLoading, setStudentAssignLoading] = useState(false);

  // Scheme of Work state
  const [schemes, setSchemes] = useState([]);
  const [schemeFilters, setSchemeFilters] = useState({ subject_id: '', term_id: '' });
  const [showSchemeModal, setShowSchemeModal] = useState(false);
  const [schemeForm, setSchemeForm] = useState({ week_number: '', topic: '', aspects: { objectives: '', activities: '', resources: '', evaluation: '' } });
  const [schemeLoading, setSchemeLoading] = useState(false);
  const [editingScheme, setEditingScheme] = useState(null);
  const [viewingScheme, setViewingScheme] = useState(null);

  // Scheme AI Builder state
  const [showSchemeAIModal, setShowSchemeAIModal] = useState(false);
  const [schemeAIForm, setSchemeAIForm] = useState({ week_number: '', subject_id: '', term_id: '', topic: '' });
  const [schemeAILoading, setSchemeAILoading] = useState(false);

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

  const fetchData = useCallback(async (pageNum = 1, isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);
    try {
      const res = await academicApi.gradeLevels.getAll({ ...filters, page: pageNum });
      const newData = res.grade_levels || [];
      setGradeLevels(prev => pageNum === 1 ? newData : [...prev, ...newData]);
      setHasMore(res.current_page < res.last_page);
    } catch (err) {
      toast.error('Failed to load grade levels');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, toast]);

  useEffect(() => {
    const token = api.getToken();
    if (!token) return;
    setPage(1);
    setHasMore(true);
    fetchData(1);
  }, [filters]);

  useEffect(() => {
    if (page > 1) {
      const token = api.getToken();
      if (!token) return;
      fetchData(page, true);
    }
  }, [page, fetchData]);

  const fetchGradeDetail = useCallback(async (id) => {
    setDetailLoading(true);
    try {
      const [detailRes, teachersRes, subjectsRes, studentsRes] = await Promise.all([
        academicApi.gradeLevelDetail(id),
        academicApi.teachers.getAll().catch(() => ({ teachers: [] })),
        api.get('/academic/subjects').catch(() => ({ subjects: [] })),
        api.get('/students').catch(() => ({ data: [] })),
      ]);
      setGradeDetail(detailRes);
      setTeachers(teachersRes.teachers || []);
      setSubjects(subjectsRes.subjects || []);
      setSections(detailRes.sections || []);
      setStudents(studentsRes.data || []);
      setSelectedGrade(id);
      setActiveDetailTab('overview');
    } catch (err) {
      toast.error('Failed to load grade details');
    } finally {
      setDetailLoading(false);
    }
  }, [toast]);

  const fetchSchemes = useCallback(async (gradeLevelId, filters = {}) => {
    try {
      const res = await academicApi.schemes.getAll({ grade_level_id: gradeLevelId, ...filters });
      setSchemes(res.schemes || []);
    } catch (err) {
      toast.error('Failed to load schemes');
    }
  }, [toast]);

  useEffect(() => {
    const token = api.getToken();
    if (!token) { router.push('/login'); return; }
    fetchData();
  }, [fetchData, router]);

  // Load schemes when scheme tab is activated
  useEffect(() => {
    if (selectedGrade && activeDetailTab === 'scheme') {
      fetchSchemes(selectedGrade, schemeFilters);
    }
  }, [activeDetailTab, selectedGrade, schemeFilters, fetchSchemes]);

  const handleAssignTeacher = async (e) => {
    e.preventDefault();
    setAssignLoading(true);
    try {
      await academicApi.teacherAssignments.assign({
        ...assignForm,
        grade_level_id: selectedGrade,
      });
      toast.success('Teacher assigned successfully');
      setShowAssignModal(false);
      setAssignForm({ teacher_id: '', subject_id: '', section_id: '' });
      fetchGradeDetail(selectedGrade);
    } catch (err) {
      toast.error(err.data?.message || 'Failed to assign teacher');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleRemoveTeacher = async (id) => {
    if (!confirm('Remove this teacher assignment?')) return;
    try {
      await academicApi.teacherAssignments.remove(id);
      toast.success('Teacher assignment removed');
      fetchGradeDetail(selectedGrade);
    } catch (err) {
      toast.error('Failed to remove assignment');
    }
  };

  const handleRemoveStudent = async (studentId) => {
    if (!confirm('Remove this student from this grade?')) return;
    try {
      await api.put(`/students/${studentId}`, { grade_level_id: null });
      toast.success('Student removed from grade');
      fetchGradeDetail(selectedGrade);
    } catch (err) {
      toast.error(err.data?.message || 'Failed to remove student');
    }
  };

  // ==================== STUDENT ASSIGNMENT HANDLERS ====================
  const handleOpenStudentAssign = () => {
    // Filter out students already in this grade
    const alreadyAssignedIds = new Set((gradeDetail?.students || []).map(s => s.id));
    const availableStudents = students.filter(s => !alreadyAssignedIds.has(s.id));
    if (availableStudents.length === 0) {
      toast.info('No unassigned students available.');
      return;
    }
    setSelectedStudentIds([]);
    setShowStudentAssignModal(true);
  };

  const toggleStudent = (studentId) => {
    setSelectedStudentIds(prev =>
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const handleAssignStudents = async () => {
    if (selectedStudentIds.length === 0) {
      toast.error('Select at least one student');
      return;
    }
    setStudentAssignLoading(true);
    try {
      // Bulk update students grade_level_id
      await Promise.all(
        selectedStudentIds.map(id =>
          api.put(`/students/${id}`, { grade_level_id: selectedGrade })
        )
      );
      toast.success(`${selectedStudentIds.length} student(s) assigned successfully`);
      setShowStudentAssignModal(false);
      setSelectedStudentIds([]);
      fetchGradeDetail(selectedGrade);
    } catch (err) {
      toast.error(err.data?.message || 'Failed to assign students');
    } finally {
      setStudentAssignLoading(false);
    }
  };

  // ==================== SCHEME OF WORK HANDLERS ====================
  const handleSchemeSubmit = async (e) => {
    e.preventDefault();
    setSchemeLoading(true);
    try {
      const data = {
        ...schemeForm,
        grade_level_id: selectedGrade,
        aspects: schemeForm.aspects.objectives || schemeForm.aspects.activities || schemeForm.aspects.resources || schemeForm.aspects.evaluation
          ? schemeForm.aspects
          : null,
      };

      if (editingScheme) {
        await academicApi.schemes.update(editingScheme.id, data);
        toast.success('Scheme updated successfully');
      } else {
        await academicApi.schemes.create(data);
        toast.success('Scheme created successfully');
      }

      setShowSchemeModal(false);
      setSchemeForm({ week_number: '', topic: '', aspects: { objectives: '', activities: '', resources: '', evaluation: '' } });
      setEditingScheme(null);
      fetchSchemes(selectedGrade, schemeFilters);
    } catch (err) {
      toast.error(err.data?.message || 'Failed to save scheme');
    } finally {
      setSchemeLoading(false);
    }
  };

  const handleEditScheme = (scheme) => {
    setEditingScheme(scheme);
    setSchemeForm({
      week_number: scheme.week_number,
      topic: scheme.topic,
      aspects: scheme.aspects || { objectives: '', activities: '', resources: '', evaluation: '' },
    });
    setShowSchemeModal(true);
  };

  const handleDeleteScheme = async (id) => {
    if (!confirm('Delete this scheme entry?')) return;
    try {
      await academicApi.schemes.delete(id);
      toast.success('Scheme deleted');
      fetchSchemes(selectedGrade, schemeFilters);
    } catch (err) {
      toast.error('Failed to delete scheme');
    }
  };

  const handlePublishScheme = async (id) => {
    try {
      await academicApi.schemes.publish(id);
      toast.success('Scheme published');
      fetchSchemes(selectedGrade, schemeFilters);
    } catch (err) {
      toast.error('Failed to publish scheme');
    }
  };

  // Regenerate scheme aspects with AI
  const handleRegenerateSchemeAI = async () => {
    if (!editingScheme) return;
    setSchemeLoading(true);
    try {
      const aiRes = await academicApi.aiScheme.generate({
        grade_level_id: selectedGrade,
        subject_id: schemeForm.subject_id || editingScheme.subject_id,
        term_id: schemeForm.term_id || editingScheme.term_id,
        weeks: [safeInt(schemeForm.week_number || editingScheme.week_number, 1)],
        topics: [schemeForm.topic || editingScheme.topic],
      });

      // Always update the form aspects with whatever was returned
      const aiAspects = aiRes.schemes?.[0]?.aspects || {};
      setSchemeForm({
        ...schemeForm,
        aspects: {
          objectives: aiAspects.objectives || schemeForm.aspects.objectives,
          activities: aiAspects.activities || schemeForm.aspects.activities,
          resources: aiAspects.resources || schemeForm.aspects.resources,
          evaluation: aiAspects.evaluation || schemeForm.aspects.evaluation,
        },
      });

      // Check if AI was actually used or if it fell back to templates
      if (aiRes.ai_unavailable) {
        toast.warning(
          `AI unavailable — used template instead. ${aiRes.ai_reason || ''}`.trim(),
        );
      } else {
        toast.success('Scheme aspects regenerated with AI!');
      }
    } catch (err) {
      console.error('AI regeneration failed:', err);
      const msg = err.data?.message || err.data?.error || err.message || 'Failed to regenerate with AI';
      toast.error(msg);
    } finally {
      setSchemeLoading(false);
    }
  };

  // ==================== SCHEME AI BUILDER HANDLERS ====================
  const handleSchemeAISubmit = async (e) => {
    e.preventDefault();
    setSchemeAILoading(true);
    try {
      // First create a temporary scheme to get an ID for AI generation
      const schemeData = {
        week_number: safeInt(schemeAIForm.week_number, 1),
        topic: schemeAIForm.topic,
        grade_level_id: selectedGrade,
        subject_id: schemeAIForm.subject_id,
        term_id: schemeAIForm.term_id,
        aspects: { objectives: '', activities: '', resources: '', evaluation: '' },
        status: 'draft',
      };

      // Create scheme first
      const created = await academicApi.schemes.create(schemeData);
      const schemeId = created.scheme?.id || created.id;

      if (!schemeId) {
        throw new Error('Failed to create scheme - no ID returned');
      }

      // Now call AI to generate aspects
      const aiRes = await academicApi.aiScheme.generate({
        scheme_id: schemeId,
        grade_level_id: selectedGrade,
        subject_id: schemeAIForm.subject_id,
        term_id: schemeAIForm.term_id,
        weeks: [safeInt(schemeAIForm.week_number, 1)],
        topics: [schemeAIForm.topic],
      });

      // Update the scheme with AI-generated aspects
      const schemeData_item = aiRes.schemes?.[0] || aiRes.scheme || aiRes.data;
      if (schemeData_item && schemeData_item.aspects) {
        const aiAspects = schemeData_item.aspects;
        await academicApi.schemes.update(schemeId, {
          aspects: {
            objectives: aiAspects.objectives || '',
            activities: aiAspects.activities || '',
            resources: aiAspects.resources || '',
            evaluation: aiAspects.evaluation || '',
          },
        });
      }

      // Check if AI was actually used or if it fell back to templates
      if (aiRes.ai_unavailable) {
        toast.warning(
          `AI unavailable — scheme created with template. ${aiRes.ai_reason || ''}`.trim(),
        );
      } else if (aiRes.message && aiRes.source === 'smart_template') {
        toast.warning(aiRes.message);
      } else {
        toast.success('Scheme generated with AI!');
      }

      setShowSchemeAIModal(false);
      setSchemeAIForm({ week_number: '', subject_id: '', term_id: '', topic: '' });
      fetchSchemes(selectedGrade, schemeFilters);
    } catch (err) {
      console.error('AI Scheme generation failed:', err);
      const msg = err.data?.message || err.data?.error || err.message || 'Failed to generate scheme with AI';
      toast.error(msg);
    } finally {
      setSchemeAILoading(false);
    }
  };

  // Helper: safely parse number input
  const safeInt = (value, fallback = 1) => {
    if (value === '' || value == null) return fallback;
    const num = parseInt(value, 10);
    return isNaN(num) ? fallback : num;
  };

  // Helper: strip markdown formatting for clean text preview
  const stripMarkdown = (text) => {
    return text
      .replace(/!\[.*?\]\(.*?\)/g, '')      // images
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
      .replace(/^#{1,6}\s+/gm, '')           // headers
      .replace(/\*\*(.+?)\*\*/g, '$1')       // bold
      .replace(/\*(.+?)\*/g, '$1')           // italic
      .replace(/__(.+?)__/g, '$1')           // bold underscore
      .replace(/_(.+?)_/g, '$1')             // italic underscore
      .replace(/~~(.+?)~~/g, '$1')           // strikethrough
      .replace(/^>\s+/gm, '')                // blockquotes
      .replace(/^[-*+]\s+/gm, '')            // list items
      .replace(/^\d+\.\s+/gm, '')            // numbered list
      .replace(/`{1,3}[^`]*`{1,3}/g, '')     // code blocks
      .replace(/\n{2,}/g, ' ')               // multiple newlines
      .replace(/\n/g, ' ')                   // single newlines
      .replace(/\s+/g, ' ')                  // collapse whitespace
      .trim();
  };

  // ==================== RENDER ====================
  return (
    <DashboardLayout title="Classes" subtitle="Manage your classes and grade levels">
      <div className="space-y-4 md:space-y-6">
        {/* Back button when viewing detail */}
        {selectedGrade && (
          <button
            onClick={() => { setSelectedGrade(null); setGradeDetail(null); }}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors text-sm md:text-base"
          >
            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
            Back to Classes
          </button>
        )}

        {/* Classes List View - Search and Filter (Standardized) */}
        {!selectedGrade && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card dark:bg-gray-800 p-4 rounded-card border border-border shadow-soft">
              <div className="flex items-center space-x-2 w-full md:w-auto">
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                  <input
                    type="text"
                    placeholder="Search classes..."
                    value={filters.search}
                    onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 bg-white/5 border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary transition-all"
                  />
                </div>
                
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-2 rounded-lg transition-all ${showFilters ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 border border-border text-text-secondary hover:text-text-primary hover:bg-white/10'}`}
                >
                  <Filter size={20} />
                </button>
              </div>

              <div className="flex items-center space-x-4 w-full md:w-auto">
                <button
                  onClick={() => router.push('/dashboard/academic?tab=grades')}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark w-full md:w-auto justify-center"
                >
                  <Plus className="w-4 h-4" /> Add Grade Level
                </button>
              </div>
            </div>

            {/* Filters Panel */}
            <AnimatePresence onExitComplete={() => {
              setFilters({ search: '', cycle: '' });
            }}>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-card dark:bg-gray-800 p-4 rounded-card border border-border shadow-soft grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <select
                      value={filters.cycle}
                      onChange={e => setFilters(prev => ({ ...prev, cycle: e.target.value }))}
                      className="px-3 py-2 bg-white/5 border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary transition-all"
                    >
                      <option value="">All Cycles</option>
                      <option value="Junior">Junior</option>
                      <option value="Senior">Senior</option>
                      <option value="Primary">Primary</option>
                      <option value="Nursery">Nursery</option>
                    </select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-text-secondary">Loading classes...</div>
        ) : selectedGrade && gradeDetail ? (
          // ==================== GRADE LEVEL DETAIL VIEW ====================
          <div className="space-y-4 md:space-y-6">
            {/* Header */}
            <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-4 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-text-primary">{gradeDetail.grade_level.name}</h1>
                  <p className="text-sm text-text-secondary mt-1">
                    {gradeDetail.grade_level.short_name} • {gradeDetail.grade_level.cycle || 'No cycle'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-primary/10 text-primary text-xs md:text-sm rounded-full">
                    {gradeDetail.grade_level.students_count} Students
                  </span>
                  <span className="px-3 py-1 bg-success/10 text-success text-xs md:text-sm rounded-full">
                    {gradeDetail.grade_level.teachers_count} Teachers
                  </span>
                  <span className="px-3 py-1 bg-warning/10 text-warning text-xs md:text-sm rounded-full">
                    {gradeDetail.grade_level.subjects_count} Subjects
                  </span>
                </div>
              </div>
            </div>

            {/* Detail Tabs */}
            <div className="flex gap-1 md:gap-2 border-b border-border overflow-x-auto scrollbar-hide pb-1">
              {[
                { id: 'overview', label: 'Overview', icon: School },
                { id: 'sections', label: 'Sections', icon: Layers },
                { id: 'subjects', label: 'Subjects', icon: Tag },
                { id: 'students', label: 'Students', icon: GraduationCap },
                { id: 'teachers', label: 'Teachers', icon: UserRound },
                { id: 'scheme', label: 'Scheme of Work', icon: BookOpen },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveDetailTab(tab.id)}
                  className={`flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 md:py-3 rounded-t-lg transition-all whitespace-nowrap flex-shrink-0 text-xs md:text-sm ${
                    activeDetailTab === tab.id
                      ? 'bg-card border-b-2 border-primary text-primary font-semibold'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/5 dark:hover:bg-white/10'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span className="hidden md:inline">{tab.label}</span>
                  <span className="md:hidden">{tab.label.slice(0, 4)}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {detailLoading ? (
              <div className="text-center py-8 text-text-secondary">Loading details...</div>
            ) : (
              <>
                {/* Overview Tab */}
                {activeDetailTab === 'overview' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-4 md:p-6 text-center">
                      <GraduationCap className="w-6 h-6 md:w-8 md:h-8 text-primary mx-auto mb-2" />
                      <div className="text-2xl md:text-3xl font-bold text-text-primary">{gradeDetail.grade_level.students_count}</div>
                      <div className="text-xs md:text-sm text-text-secondary">Students</div>
                    </div>
                    <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-4 md:p-6 text-center">
                      <Layers className="w-6 h-6 md:w-8 md:h-8 text-success mx-auto mb-2" />
                      <div className="text-2xl md:text-3xl font-bold text-text-primary">{gradeDetail.grade_level.sections_count}</div>
                      <div className="text-xs md:text-sm text-text-secondary">Sections</div>
                    </div>
                    <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-4 md:p-6 text-center">
                      <Tag className="w-6 h-6 md:w-8 md:h-8 text-warning mx-auto mb-2" />
                      <div className="text-2xl md:text-3xl font-bold text-text-primary">{gradeDetail.grade_level.subjects_count}</div>
                      <div className="text-xs md:text-sm text-text-secondary">Subjects</div>
                    </div>
                    <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-4 md:p-6 text-center">
                      <UserRound className="w-6 h-6 md:w-8 md:h-8 text-info mx-auto mb-2" />
                      <div className="text-2xl md:text-3xl font-bold text-text-primary">{gradeDetail.grade_level.teachers_count}</div>
                      <div className="text-xs md:text-sm text-text-secondary">Teachers</div>
                    </div>
                  </div>
                )}

                {/* Sections Tab */}
                {activeDetailTab === 'sections' && (
                  <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-4 md:p-6">
                    <h2 className="text-base md:text-lg font-semibold text-text-primary mb-4">Sections</h2>
                    {gradeDetail.sections.length === 0 ? (
                      <p className="text-text-secondary text-center py-8 text-sm">No sections created yet.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                        {gradeDetail.sections.map(sec => (
                          <div key={sec.id} className="p-3 md:p-4 border border-border dark:border-gray-600 rounded-lg">
                            <h3 className="font-semibold text-text-primary text-sm md:text-base">{sec.name}</h3>
                            <p className="text-xs text-text-muted mt-1">Room: {sec.room_number || 'N/A'} • Capacity: {sec.capacity || 'N/A'}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Subjects Tab */}
                {activeDetailTab === 'subjects' && (
                  <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-4 md:p-6">
                    <h2 className="text-base md:text-lg font-semibold text-text-primary mb-4">Subjects</h2>
                    {gradeDetail.subjects.length === 0 ? (
                      <p className="text-text-secondary text-center py-8 text-sm">No subjects assigned yet.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                        {gradeDetail.subjects.map(sub => (
                          <div key={sub.id} className="p-3 md:p-4 border border-border dark:border-gray-600 rounded-lg">
                            <h3 className="font-semibold text-text-primary text-sm md:text-base">{sub.subject_name}</h3>
                            <p className="text-xs text-text-muted">{sub.subject_code}</p>
                            <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${
                              sub.is_compulsory ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                            }`}>{sub.is_compulsory ? 'Compulsory' : 'Elective'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Students Tab */}
                {activeDetailTab === 'students' && (
                  <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-4 md:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base md:text-lg font-semibold text-text-primary">Students</h2>
                      <button
                        onClick={handleOpenStudentAssign}
                        className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 text-xs md:text-sm bg-primary text-white rounded-lg hover:bg-primary-dark"
                      >
                        <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        Assign Students
                      </button>
                    </div>
                    {gradeDetail.students.length === 0 ? (
                      <p className="text-text-secondary text-center py-8 text-sm">No students enrolled in this grade. Assign students from the Students tab or use the button above.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm md:text-base">
                          <thead>
                            <tr className="border-b border-border dark:border-gray-600">
                              <th className="text-left py-2 md:py-3 px-2 text-text-secondary font-medium">Name</th>
                              <th className="text-left py-2 md:py-3 px-2 text-text-secondary font-medium hidden md:table-cell">Admission #</th>
                              <th className="text-left py-2 md:py-3 px-2 text-text-secondary font-medium hidden sm:table-cell">Email</th>
                              <th className="text-left py-2 md:py-3 px-2 text-text-secondary font-medium">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {gradeDetail.students.map(student => (
                              <tr key={student.id} className="border-b border-border dark:border-gray-600/50">
                                <td className="py-2 md:py-3 px-2 text-text-primary">{student.first_name} {student.last_name}</td>
                                <td className="py-2 md:py-3 px-2 text-text-secondary hidden md:table-cell">{student.admission_number}</td>
                                <td className="py-2 md:py-3 px-2 text-text-secondary hidden sm:table-cell">{student.email}</td>
                                <td className="py-2 md:py-3 px-2">
                                  <button
                                    onClick={() => handleRemoveStudent(student.id)}
                                    className="text-error hover:text-error/80"
                                    title="Remove from grade"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Teachers Tab */}
                {activeDetailTab === 'teachers' && (
                  <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-4 md:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base md:text-lg font-semibold text-text-primary">Teachers</h2>
                      <button
                        onClick={() => setShowAssignModal(true)}
                        className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 text-xs md:text-sm bg-primary text-white rounded-lg hover:bg-primary-dark"
                      >
                        <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        Assign Teacher
                      </button>
                    </div>
                    {gradeDetail.teachers.length === 0 ? (
                      <p className="text-text-secondary text-center py-8 text-sm">No teachers assigned yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm md:text-base">
                          <thead>
                            <tr className="border-b border-border dark:border-gray-600">
                              <th className="text-left py-2 md:py-3 px-2 text-text-secondary font-medium">Name</th>
                              <th className="text-left py-2 md:py-3 px-2 text-text-secondary font-medium hidden md:table-cell">Email</th>
                              <th className="text-left py-2 md:py-3 px-2 text-text-secondary font-medium">Subjects</th>
                              <th className="text-left py-2 md:py-3 px-2 text-text-secondary font-medium">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {gradeDetail.teachers.map(teacher => (
                              <tr key={teacher.teacher_id} className="border-b border-border dark:border-gray-600/50">
                                <td className="py-2 md:py-3 px-2 text-text-primary">{teacher.name}</td>
                                <td className="py-2 md:py-3 px-2 text-text-secondary hidden md:table-cell">{teacher.email}</td>
                                <td className="py-2 md:py-3 px-2">
                                  <div className="flex flex-wrap gap-1">
                                    {teacher.subjects.map((sub, i) => (
                                      <span key={i} className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">{sub}</span>
                                    ))}
                                  </div>
                                </td>
                                <td className="py-2 md:py-3 px-2">
                                  <button
                                    onClick={() => handleRemoveTeacher(teacher.teacher_id)}
                                    className="text-error hover:text-error/80"
                                    title="Remove from grade"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Scheme of Work Tab */}
                {activeDetailTab === 'scheme' && (
                  <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-4 md:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base md:text-lg font-semibold text-text-primary">Scheme of Work</h2>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowSchemeAIModal(true)}
                          className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 text-xs md:text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600"
                        >
                          <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4" />
                          AI Builder
                        </button>
                        <button
                          onClick={() => {
                            setEditingScheme(null);
                            setSchemeForm({ week_number: '', topic: '', aspects: { objectives: '', activities: '', resources: '', evaluation: '' } });
                            setShowSchemeModal(true);
                          }}
                          className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 text-xs md:text-sm bg-primary text-white rounded-lg hover:bg-primary-dark"
                        >
                          <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                          Add Week
                        </button>
                      </div>
                    </div>

                    {/* Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      <div>
                        <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Subject</label>
                        <select
                          value={schemeFilters.subject_id}
                          onChange={e => {
                            const newFilters = { ...schemeFilters, subject_id: e.target.value };
                            setSchemeFilters(newFilters);
                            fetchSchemes(selectedGrade, newFilters);
                          }}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary"
                        >
                          <option value="">All Subjects</option>
                          {gradeDetail.subjects.map(sub => (
                            <option key={sub.id} value={sub.subject_id}>{sub.subject_name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Term</label>
                        <select
                          value={schemeFilters.term_id}
                          onChange={e => {
                            const newFilters = { ...schemeFilters, term_id: e.target.value };
                            setSchemeFilters(newFilters);
                            fetchSchemes(selectedGrade, newFilters);
                          }}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary"
                        >
                          <option value="">All Terms</option>
                          {gradeDetail.terms?.map(term => (
                            <option key={term.id} value={term.id}>{term.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Schemes List */}
                    {schemes.length === 0 ? (
                      <p className="text-text-secondary text-center py-8 text-sm">No schemes created yet. Click "Add Week" to create one.</p>
                    ) : (
                      <div className="space-y-3">
                        {schemes.map(scheme => (
                          <div key={scheme.id} className="p-3 md:p-4 border border-border dark:border-gray-600 rounded-lg">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-semibold">Week {scheme.week_number}</span>
                                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                                    scheme.status === 'published' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                                  }`}>
                                    {scheme.status === 'published' ? 'Published' : 'Draft'}
                                  </span>
                                </div>
                                <h3 className="font-semibold text-text-primary text-sm md:text-base">{scheme.topic}</h3>
                                {scheme.subject && (
                                  <p className="text-xs text-text-muted mt-1">{scheme.subject.name} • {scheme.term?.name}</p>
                                )}
                                {scheme.aspects && (
                                  <div className="mt-2 space-y-1 text-xs text-text-secondary">
                                    {scheme.aspects.objectives && <p><strong>Objectives:</strong> {stripMarkdown(scheme.aspects.objectives).slice(0, 120)}…</p>}
                                    {scheme.aspects.activities && <p><strong>Activities:</strong> {stripMarkdown(scheme.aspects.activities).slice(0, 120)}…</p>}
                                  </div>
                                )}
                              </div>
                                <div className="flex gap-2 flex-shrink-0">
                                  <button
                                    onClick={() => setViewingScheme(scheme)}
                                    className="text-primary hover:text-primary/80"
                                    title="View Details"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  {scheme.status === 'draft' && (
                                  <button
                                    onClick={() => handlePublishScheme(scheme.id)}
                                    className="text-success hover:text-success/80"
                                    title="Publish"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleEditScheme(scheme)}
                                  className="text-info hover:text-info/80"
                                  title="Edit"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteScheme(scheme.id)}
                                  className="text-error hover:text-error/80"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          // ==================== GRADE LEVELS GRID VIEW ====================
          <div>
            <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-4 md:p-6">
              <h2 className="text-base md:text-lg font-semibold text-text-primary mb-4">All Classes</h2>
              {gradeLevels.length === 0 ? (
                <p className="text-text-secondary text-center py-8 text-sm md:text-base">No grade levels found matching your criteria.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  {gradeLevels.map((gl, idx) => (
                    <button
                      key={gl.id}
                      ref={idx === gradeLevels.length - 1 ? lastElementRef : null}
                      onClick={() => fetchGradeDetail(gl.id)}
                      className="text-left p-4 md:p-6 border border-border dark:border-gray-600 rounded-lg hover:border-primary dark:hover:border-primary transition-colors bg-bg-main dark:bg-gray-750"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <School className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-text-primary text-base md:text-lg">{gl.name}</h3>
                          <p className="text-xs text-text-muted">{gl.short_name}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs md:text-sm">
                        <div className="flex items-center gap-1.5 text-text-secondary">
                          <GraduationCap className="w-3.5 h-3.5" />
                          {gl.students_count} Students
                        </div>
                        <div className="flex items-center gap-1.5 text-text-secondary">
                          <Layers className="w-3.5 h-3.5" />
                          {gl.sections_count} Sections
                        </div>
                        <div className="flex items-center gap-1.5 text-text-secondary">
                          <Tag className="w-3.5 h-3.5" />
                          {gl.subjects_count} Subjects
                        </div>
                        <div className="flex items-center gap-1.5 text-text-secondary">
                          <UserRound className="w-3.5 h-3.5" />
                          {gl.teachers_count} Teachers
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {loadingMore && (
                <div className="py-4 flex items-center justify-center space-x-2 text-primary">
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span className="text-sm font-medium">Loading more classes...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TEACHER ASSIGNMENT MODAL ==================== */}
        {showAssignModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-4 md:p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base md:text-lg font-semibold text-text-primary">Assign Teacher</h3>
                <button onClick={() => setShowAssignModal(false)} className="text-text-muted hover:text-text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAssignTeacher} className="space-y-4">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Teacher *</label>
                  <select
                    value={assignForm.teacher_id}
                    onChange={e => setAssignForm({ ...assignForm, teacher_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                  >
                    <option value="">Select Teacher</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Subject *</label>
                  <select
                    value={assignForm.subject_id}
                    onChange={e => setAssignForm({ ...assignForm, subject_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                  >
                    <option value="">Select Subject</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Section (Optional)</label>
                  <select
                    value={assignForm.section_id}
                    onChange={e => setAssignForm({ ...assignForm, section_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">All Sections</option>
                    {sections.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowAssignModal(false)} className="flex-1 px-4 py-2 text-sm md:text-base border border-border dark:border-gray-600 rounded-lg hover:bg-bg-main dark:hover:bg-gray-700 text-text-primary">Cancel</button>
                  <button type="submit" disabled={assignLoading} className="flex-1 px-4 py-2 text-sm md:text-base bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50">{assignLoading ? 'Assigning...' : 'Assign Teacher'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ==================== VIEW SCHEME MODAL ==================== */}
        {viewingScheme && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setViewingScheme(null)}>
            <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-4 md:p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-semibold">Week {viewingScheme.week_number}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      viewingScheme.status === 'published' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                    }`}>
                      {viewingScheme.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-text-primary">{viewingScheme.topic}</h3>
                  <p className="text-sm text-text-muted mt-1">
                    {viewingScheme.subject?.name} • {viewingScheme.term?.name}
                  </p>
                </div>
                <button onClick={() => setViewingScheme(null)} className="text-text-muted hover:text-text-primary">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-8">
                {viewingScheme.aspects?.objectives && (
                  <div>
                    <h4 className="text-sm font-bold text-text-primary mb-2 border-b pb-1">Learning Objectives</h4>
                    <div className="prose dark:prose-invert max-w-none text-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{viewingScheme.aspects.objectives}</ReactMarkdown>
                    </div>
                  </div>
                )}
                
                {viewingScheme.aspects?.activities && (
                  <div>
                    <h4 className="text-sm font-bold text-text-primary mb-2 border-b pb-1">Activities</h4>
                    <div className="prose dark:prose-invert max-w-none text-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{viewingScheme.aspects.activities}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {viewingScheme.aspects?.resources && (
                  <div>
                    <h4 className="text-sm font-bold text-text-primary mb-2 border-b pb-1">Resources</h4>
                    <div className="prose dark:prose-invert max-w-none text-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{viewingScheme.aspects.resources}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {viewingScheme.aspects?.evaluation && (
                  <div>
                    <h4 className="text-sm font-bold text-text-primary mb-2 border-b pb-1">Evaluation</h4>
                    <div className="prose dark:prose-invert max-w-none text-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{viewingScheme.aspects.evaluation}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-6 border-t flex justify-end">
                <button
                  onClick={() => { setViewingScheme(null); handleEditScheme(viewingScheme); }}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Scheme
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SCHEME OF WORK MODAL ==================== */}
        {showSchemeModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-4 md:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base md:text-lg font-semibold text-text-primary">
                  {editingScheme ? 'Edit Scheme Entry' : 'Add Scheme Entry'}
                </h3>
                <div className="flex items-center gap-2">
                  {editingScheme && (
                    <button
                      type="button"
                      onClick={handleRegenerateSchemeAI}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600"
                      disabled={schemeLoading}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Regenerate with AI
                    </button>
                  )}
                  <button onClick={() => { setShowSchemeModal(false); setEditingScheme(null); }} className="text-text-muted hover:text-text-primary">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <form onSubmit={handleSchemeSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Week Number *</label>
                    <input
                      type="number"
                      value={schemeForm.week_number}
                      onChange={e => setSchemeForm({ ...schemeForm, week_number: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary"
                      min="1"
                      max="20"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Subject *</label>
                    <select
                      value={schemeForm.subject_id || ''}
                      onChange={e => setSchemeForm({ ...schemeForm, subject_id: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary"
                      required
                    >
                      <option value="">Select Subject</option>
                      {gradeDetail?.subjects.map(sub => (
                        <option key={sub.id} value={sub.subject_id}>{sub.subject_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Term *</label>
                  <select
                    value={schemeForm.term_id || ''}
                    onChange={e => setSchemeForm({ ...schemeForm, term_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary"
                    required
                  >
                    <option value="">Select Term</option>
                    {gradeDetail?.terms?.map(term => (
                      <option key={term.id} value={term.id}>{term.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Topic *</label>
                  <input
                    type="text"
                    value={schemeForm.topic}
                    onChange={e => setSchemeForm({ ...schemeForm, topic: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary"
                    required
                  />
                </div>

                {/* Aspects (Collapsible with Markdown Support) */}
                <div className="space-y-3">
                  <details className="border border-border dark:border-gray-600 rounded-lg" open>
                    <summary className="px-3 py-2 cursor-pointer text-sm font-medium text-text-primary">Objectives</summary>
                    <div className="p-3">
                      <MarkdownEditor
                        value={schemeForm.aspects.objectives}
                        onChange={value => setSchemeForm({
                          ...schemeForm,
                          aspects: { ...schemeForm.aspects, objectives: value }
                        })}
                        placeholder="Learning objectives..."
                        rows={3}
                      />
                    </div>
                  </details>

                  <details className="border border-border dark:border-gray-600 rounded-lg" open>
                    <summary className="px-3 py-2 cursor-pointer text-sm font-medium text-text-primary">Activities</summary>
                    <div className="p-3">
                      <MarkdownEditor
                        value={schemeForm.aspects.activities}
                        onChange={value => setSchemeForm({
                          ...schemeForm,
                          aspects: { ...schemeForm.aspects, activities: value }
                        })}
                        placeholder="Teaching activities..."
                        rows={3}
                      />
                    </div>
                  </details>

                  <details className="border border-border dark:border-gray-600 rounded-lg">
                    <summary className="px-3 py-2 cursor-pointer text-sm font-medium text-text-primary">Resources</summary>
                    <div className="p-3">
                      <MarkdownEditor
                        value={schemeForm.aspects.resources}
                        onChange={value => setSchemeForm({
                          ...schemeForm,
                          aspects: { ...schemeForm.aspects, resources: value }
                        })}
                        placeholder="Teaching resources/materials..."
                        rows={3}
                      />
                    </div>
                  </details>

                  <details className="border border-border dark:border-gray-600 rounded-lg">
                    <summary className="px-3 py-2 cursor-pointer text-sm font-medium text-text-primary">Evaluation</summary>
                    <div className="p-3">
                      <MarkdownEditor
                        value={schemeForm.aspects.evaluation}
                        onChange={value => setSchemeForm({
                          ...schemeForm,
                          aspects: { ...schemeForm.aspects, evaluation: value }
                        })}
                        placeholder="Assessment/evaluation methods..."
                        rows={3}
                      />
                    </div>
                  </details>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowSchemeModal(false); setEditingScheme(null); }}
                    className="flex-1 px-4 py-2 text-sm md:text-base border border-border dark:border-gray-600 rounded-lg hover:bg-bg-main dark:hover:bg-gray-700 text-text-primary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={schemeLoading}
                    className="flex-1 px-4 py-2 text-sm md:text-base bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                  >
                    {schemeLoading ? 'Saving...' : (editingScheme ? 'Update Scheme' : 'Add Scheme')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ==================== SCHEME AI BUILDER MODAL ==================== */}
        {showSchemeAIModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-4 md:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base md:text-lg font-semibold text-text-primary flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  AI Scheme Builder
                </h3>
                <button onClick={() => setShowSchemeAIModal(false)} className="text-text-muted hover:text-text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSchemeAISubmit} className="space-y-4">
                {/* User fills these */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Week Number *</label>
                    <input
                      type="number"
                      value={schemeAIForm.week_number}
                      onChange={e => setSchemeAIForm({ ...schemeAIForm, week_number: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm text-text-primary"
                      min="1"
                      max="20"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Subject *</label>
                    <select
                      value={schemeAIForm.subject_id}
                      onChange={e => setSchemeAIForm({ ...schemeAIForm, subject_id: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm text-text-primary"
                      required
                    >
                      <option value="">Select Subject</option>
                      {gradeDetail?.subjects.map(sub => (
                        <option key={sub.id} value={sub.subject_id}>{sub.subject_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Term *</label>
                  <select
                    value={schemeAIForm.term_id}
                    onChange={e => setSchemeAIForm({ ...schemeAIForm, term_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm text-text-primary"
                    required
                  >
                    <option value="">Select Term</option>
                    {gradeDetail?.terms?.map(term => (
                      <option key={term.id} value={term.id}>{term.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Topic *</label>
                  <input
                    type="text"
                    value={schemeAIForm.topic}
                    onChange={e => setSchemeAIForm({ ...schemeAIForm, topic: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary"
                    placeholder="e.g., Introduction to Algebra"
                    required
                  />
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                  <p className="text-xs text-purple-700 dark:text-purple-300">
                    <strong>AI will generate:</strong> Objectives, Activities, Resources, and Evaluation based on the grade level ({gradeDetail?.grade_level?.name}), subject, and topic you provide.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowSchemeAIModal(false)}
                    className="flex-1 px-4 py-2 text-sm md:text-base border border-border dark:border-gray-600 rounded-lg hover:bg-bg-main dark:hover:bg-gray-700 text-text-primary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={schemeAILoading || !schemeAIForm.week_number || !schemeAIForm.subject_id || !schemeAIForm.term_id || !schemeAIForm.topic}
                    className="flex-1 px-4 py-2 text-sm md:text-base bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
                  >
                    {schemeAILoading ? 'Generating...' : 'Generate with AI'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ==================== STUDENT ASSIGNMENT MODAL ==================== */}
        {showStudentAssignModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-4 md:p-6 w-full max-w-lg max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <h3 className="text-base md:text-lg font-semibold text-text-primary">Assign Students to {gradeDetail?.grade_level?.name}</h3>
                <button onClick={() => { setShowStudentAssignModal(false); setSelectedStudentIds([]); }} className="text-text-muted hover:text-text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto mb-4">
                <p className="text-xs text-text-secondary mb-3">Select students to assign to this grade level.</p>
                <div className="space-y-1">
                  {students
                    .filter(s => !(gradeDetail?.students || []).map(gs => gs.id).includes(s.id))
                    .map(student => (
                      <label
                        key={student.id}
                        className="flex items-center gap-3 p-3 border border-border dark:border-gray-600 rounded-lg cursor-pointer hover:bg-bg-main dark:hover:bg-gray-750 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.includes(student.id)}
                          onChange={() => toggleStudent(student.id)}
                          className="w-4 h-4 flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-text-primary truncate">{student.first_name} {student.last_name}</p>
                          <p className="text-xs text-text-muted truncate">{student.email}</p>
                        </div>
                        {student.admission_number && (
                          <span className="text-xs font-mono bg-bg-main px-2 py-1 rounded text-text-secondary flex-shrink-0">
                            {student.admission_number}
                          </span>
                        )}
                      </label>
                    ))}
                </div>
              </div>
              <div className="flex items-center justify-between flex-shrink-0">
                <p className="text-xs text-text-secondary">{selectedStudentIds.length} selected</p>
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setShowStudentAssignModal(false); setSelectedStudentIds([]); }} className="px-4 py-2 text-sm border border-border dark:border-gray-600 rounded-lg hover:bg-bg-main dark:hover:bg-gray-700 text-text-primary">Cancel</button>
                  <button type="button" disabled={studentAssignLoading || selectedStudentIds.length === 0} onClick={handleAssignStudents} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50">
                    {studentAssignLoading ? 'Assigning...' : `Assign ${selectedStudentIds.length} Student(s)`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
