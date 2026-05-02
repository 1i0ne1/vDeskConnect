'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings, CalendarDays, BookOpen, Scale, Plus, Trash2, CheckCircle,
  AlertTriangle, X, Save, Star, Copy, Edit2, School, Tag, Layers,
  Percent,
} from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { academicApi } from '@/lib/academic-api';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastProvider';
import { caWeightConfigApi } from '@/lib/lecture-assignments-api';

const TABS = {
  SESSIONS: 'sessions',
  TERMS: 'terms',
  CA_WEEKS: 'ca_weeks',
  GRADE_SCALES: 'grade_scales',
  GRADE_LEVELS: 'grade_levels',
  SECTIONS: 'sections',
  SUBJECTS: 'subjects',
  MAPPINGS: 'mappings',
  SETTINGS: 'settings',
  CA_WEIGHT: 'ca_weight',
};

export default function AcademicPage() {
  const router = useRouter();
  const toast = useToast();
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState(TABS.SESSIONS);
  const [loading, setLoading] = useState(true);

  // Sessions state
  const [sessions, setSessions] = useState([]);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [sessionForm, setSessionForm] = useState({ name: '', start_date: '', end_date: '' });
  const [sessionLoading, setSessionLoading] = useState(false);

  // Terms state
  const [terms, setTerms] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [showTermModal, setShowTermModal] = useState(false);
  const [showBulkTermModal, setShowBulkTermModal] = useState(false);
  const [termForm, setTermForm] = useState({ name: '', start_date: '', end_date: '', order: 1, weeks_count: 12 });
  const [bulkTermForm, setBulkTermForm] = useState({ terms_count: 3, weeks_per_term: 12, term_prefix: 'Term', start_date: '' });
  const [termLoading, setTermLoading] = useState(false);
  const [editingTermId, setEditingTermId] = useState(null);

  // CA Weeks state
  const [caWeeks, setCaWeeks] = useState([]);
  const [caWeekForm, setCaWeekForm] = useState({
    term_id: '', grade_level_id: '', subject_id: '', weeks_count: 12,
    test_weeks: [], exam_week: 12
  });
  const [caWeekLoading, setCaWeekLoading] = useState(false);
  
  // CA Summary state
  const [caSummary, setCaSummary] = useState(null);
  const [caViewTermId, setCaViewTermId] = useState('');
  const [caViewGradeId, setCaViewGradeId] = useState('');
  const [caViewSubjectId, setCaViewSubjectId] = useState('');
  const [caEditMode, setCaEditMode] = useState(false);
  
  const [gradeLevels, setGradeLevels] = useState([]);
  const [subjects, setSubjects] = useState([]);

  // Grade Scales state
  const [gradeScales, setGradeScales] = useState([]);
  const [showScaleModal, setShowScaleModal] = useState(false);
  const [scaleForm, setScaleForm] = useState({ name: '', scale: {}, is_default: false });
  const [scaleLoading, setScaleLoading] = useState(false);
  const [editingScaleId, setEditingScaleId] = useState(null);

  // Phase 2 state
  const [sections, setSections] = useState([]);
  const [selectedGradeForSections, setSelectedGradeForSections] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [selectedGradeForMappings, setSelectedGradeForMappings] = useState(null);

  // CA Weight Config state
  const [caWeightConfigs, setCaWeightConfigs] = useState([]);
  const [caWeightForm, setCaWeightForm] = useState({
    grade_level_id: '', subject_id: '', term_id: '', total_ca_percentage: 40,
    assignment_weight_percentage: 50, test_weight_percentage: 50,
  });
  const [caWeightSaving, setCaWeightSaving] = useState(false);

  // Phase 2 modals
  const [showGradeLevelModal, setShowGradeLevelModal] = useState(false);
  const [gradeLevelForm, setGradeLevelForm] = useState({ name: '', short_name: '', order: 1, cycle: '' });
  const [showBulkGradeModal, setShowBulkGradeModal] = useState(false);
  const [bulkGradeForm, setBulkGradeForm] = useState({ prefix: 'JSS', start_order: 1, count: 3, cycle: 'Junior' });
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [sectionForm, setSectionForm] = useState({ grade_level_id: '', name: '', room_number: '', capacity: '' });
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', type: 'core', department_id: '' });
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [departmentForm, setDepartmentForm] = useState({ name: '', code: '' });
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [mappingForm, setMappingForm] = useState({ grade_level_ids: [], subject_ids: [], is_compulsory: true, department_id: '' });

  // Phase 2 loading
  const [gradeLevelLoading, setGradeLevelLoading] = useState(false);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [subjectLoading, setSubjectLoading] = useState(false);
  const [departmentLoading, setDepartmentLoading] = useState(false);
  const [mappingLoading, setMappingLoading] = useState(false);

  // School Settings state
  const [schoolConfig, setSchoolConfig] = useState({ ca_weight: 40, exam_weight: 60 });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [saveSettingsLoading, setSaveSettingsLoading] = useState(false);

  // Search filter icon component
  const Search = ({ className, size }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  );

  // Helper: safely parse number input
  const safeInt = (value, fallback = 1) => {
    if (value === '' || value == null) return fallback;
    const num = parseInt(value, 10);
    return isNaN(num) ? fallback : num;
  };

  // Client-side search and infinite scroll state
  const [searchQuery, setSearchQuery] = useState('');
  const [displayCount, setDisplayCount] = useState(20);

  // Reset search and count when tab changes
  useEffect(() => {
    setSearchQuery('');
    setDisplayCount(20);
  }, [activeTab]);

  // Observer for infinite scroll
  const observerRef = useCallback(node => {
    if (loading) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setDisplayCount(prev => prev + 20);
      }
    });
    if (node) observer.observe(node);
  }, [loading]);

  // Helper for filtering and slicing
  const getFilteredAndPaginated = (items, filterFn) => {
    if (!items) return { items: [], total: 0, hasMore: false };
    const filtered = searchQuery
      ? items.filter(filterFn)
      : items;
    return {
      items: filtered.slice(0, displayCount),
      total: filtered.length,
      hasMore: filtered.length > displayCount
    };
  };

  // --- Derived Data ---
  const { items: displaySessions, total: totalSessions, hasMore: hasMoreSessions } = getFilteredAndPaginated(sessions, s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const { items: displayTerms, total: totalTerms, hasMore: hasMoreTerms } = getFilteredAndPaginated(terms, t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const { items: displayGradeLevels, total: totalGradeLevels, hasMore: hasMoreGradeLevels } = getFilteredAndPaginated(gradeLevels, gl => 
    gl.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    gl.short_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const { items: displaySubjects, total: totalSubjects, hasMore: hasMoreSubjects } = getFilteredAndPaginated(subjects, sub => 
    sub.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    sub.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const { items: displaySections, total: totalSections, hasMore: hasMoreSectionsData } = getFilteredAndPaginated(sections, sec => 
    sec.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (sec.room_number || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const { items: displayMappings, total: totalMappings, hasMore: hasMoreMappings } = getFilteredAndPaginated(mappings, m => 
    m.subject_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.subject_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sessionsRes, gradeScalesRes] = await Promise.all([
        academicApi.sessions.getAll(),
        academicApi.gradeScales.getAll(),
      ]);
      setSessions(sessionsRes.sessions || []);
      setGradeScales(gradeScalesRes.grade_scales || []);

      // Fetch School Config
      try {
        const configRes = await academicApi.school.getConfig();
        setSchoolConfig(configRes.config);
      } catch (err) {
        console.error('Failed to fetch school config:', err);
      }

      // Fetch Phase 2 data
      const [gradesRes, subjectsRes, departmentsRes] = await Promise.all([
        academicApi.gradeLevels.getAll().catch(() => ({ grade_levels: [] })),
        academicApi.subjects.getAll().catch(() => ({ subjects: [] })),
        academicApi.departments.getAll().catch(() => ({ departments: [] })),
      ]);
      setGradeLevels(gradesRes.grade_levels || []);
      setSubjects(subjectsRes.subjects || []);
      setDepartments(departmentsRes.departments || []);

      // Fetch grade levels and subjects for CA weeks (reuse Phase 2 data)
      // (already fetched above as gradesRes and subjectsRes)

      // If there's an active session, fetch its terms
      const activeSession = sessionsRes.sessions?.find(s => s.active);
      if (activeSession) {
        setSelectedSessionId(activeSession.id);
        const termsRes = await academicApi.terms.getAll(activeSession.id);
        setTerms(termsRes.terms || []);
      }
    } catch (err) {
      console.error('Failed to fetch academic data:', err);
      toast.error('Failed to load academic data');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const token = api.getToken();
    if (!token) { router.push('/login'); return; }
    fetchData();
  }, [fetchData, router]);

  // ==================== SESSION HANDLERS ====================
  const handleCreateSession = async (e) => {
    e.preventDefault();
    setSessionLoading(true);
    try {
      const res = await academicApi.sessions.create(sessionForm);
      toast.success(res.message);
      setSessionForm({ name: '', start_date: '', end_date: '' });
      fetchData();
    } catch (err) {
      toast.error(err.data?.message || 'Failed to create session');
    } finally {
      setSessionLoading(false);
    }
  };

  const handleSetActiveSession = async (id) => {
    try {
      const res = await academicApi.sessions.setActive(id);
      toast.success(res.message);
      fetchData();
    } catch (err) {
      toast.error(err.data?.message || 'Failed to set active session');
    }
  };

  const handleUpdateSession = async (e) => {
    e.preventDefault();
    setSessionLoading(true);
    try {
      const res = await academicApi.sessions.update(editingSessionId, sessionForm);
      toast.success(res.message);
      setSessionForm({ name: '', start_date: '', end_date: '' });
      setEditingSessionId(null);
      fetchData();
    } catch (err) {
      toast.error(err.data?.message || 'Failed to update session');
    } finally {
      setSessionLoading(false);
    }
  };

  const handleDeleteSession = async (id, name) => {
    if (!confirm(`⚠️ WARNING: Deleting session "${name}" will also delete ALL associated terms, CA configurations, exams, and results for this year. This cannot be undone.\n\nAre you sure you want to continue?`)) return;
    try {
      await academicApi.sessions.delete(id);
      toast.success('Session and all associated data deleted');
      fetchData();
    } catch (err) {
      toast.error(err.data?.message || 'Failed to delete session');
    }
  };

  // ==================== TERM HANDLERS ====================
  const handleFetchTerms = async (sessionId) => {
    try {
      const res = await academicApi.terms.getAll(sessionId);
      setTerms(res.terms || []);
      setSelectedSessionId(sessionId);
    } catch (err) {
      toast.error('Failed to load terms');
    }
  };

  const handleCreateTerm = async (e) => {
    e.preventDefault();
    setTermLoading(true);
    try {
      if (editingTermId) {
        // Update existing term
        const res = await academicApi.terms.update(editingTermId, termForm);
        toast.success(res.message || 'Term updated successfully');
      } else {
        // Create new term
        const res = await academicApi.terms.create({ ...termForm, session_id: selectedSessionId });
        toast.success(res.message || 'Term created successfully');
      }
      setShowTermModal(false);
      setTermForm({ name: '', start_date: '', end_date: '', order: 1, weeks_count: 12 });
      setEditingTermId(null);
      handleFetchTerms(selectedSessionId);
    } catch (err) {
      toast.error(err.data?.message || (editingTermId ? 'Failed to update term' : 'Failed to create term'));
    } finally {
      setTermLoading(false);
    }
  };

  const handleBulkCreateTerms = async (e) => {
    e.preventDefault();
    setTermLoading(true);
    try {
      const res = await academicApi.terms.bulkCreate({ ...bulkTermForm, session_id: selectedSessionId });
      toast.success(res.message);
      setShowBulkTermModal(false);
      handleFetchTerms(selectedSessionId);
    } catch (err) {
      toast.error(err.data?.message || 'Failed to create terms');
    } finally {
      setTermLoading(false);
    }
  };

  const handleDeleteTerm = async (id) => {
    if (!confirm('Delete this term?')) return;
    try {
      await academicApi.terms.delete(id);
      toast.success('Term deleted');
      handleFetchTerms(selectedSessionId);
    } catch (err) {
      toast.error('Failed to delete term');
    }
  };

  const handleEditTerm = (term) => {
    setTermForm({
      name: term.name,
      start_date: term.start_date,
      end_date: term.end_date,
      order: term.order,
      weeks_count: term.weeks_count || 12,
    });
    setEditingTermId(term.id);
    setShowTermModal(true);
  };

  // ==================== CA WEEK HANDLERS ====================
  const toggleTestWeek = (week) => {
    setCaWeekForm(prev => ({
      ...prev,
      test_weeks: prev.test_weeks.includes(week)
        ? prev.test_weeks.filter(w => w !== week)
        : [...prev.test_weeks, week]
    }));
  };

  const handleSetCaWeeks = async (e) => {
    e.preventDefault();
    setCaWeekLoading(true);
    try {
      const res = await academicApi.caWeeks.set(caWeekForm);
      toast.success(res.message);
      setCaWeekForm({ ...caWeekForm, test_weeks: [], exam_week: caWeekForm.weeks_count });
      setCaEditMode(false);
      if (caViewTermId && caViewGradeId && caViewSubjectId) {
        handleFetchCaSummary(caViewTermId, caViewGradeId, caViewSubjectId);
      }
    } catch (err) {
      toast.error(err.data?.message || 'Failed to set CA weeks');
    } finally {
      setCaWeekLoading(false);
    }
  };

  const handleFetchCaSummary = async (termId, gradeId, subjectId) => {
    try {
      const res = await academicApi.caWeeks.getSummary(termId, gradeId, subjectId);
      setCaSummary(res.summary);
    } catch (err) {
      setCaSummary(null);
    }
  };

  const handleEditCaConfig = () => {
    if (!caSummary) return;
    setCaWeekForm({
      term_id: caViewTermId,
      grade_level_id: caViewGradeId,
      subject_id: caViewSubjectId,
      weeks_count: caSummary.total_weeks || 12,
      test_weeks: caSummary.test_weeks || [],
      exam_week: caSummary.exam_week || 12,
    });
    setCaEditMode(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteCaConfig = async () => {
    if (!confirm('Delete this CA configuration? This cannot be undone.')) return;
    try {
      await academicApi.caWeeks.delete(caViewTermId, caViewGradeId, caViewSubjectId);
      toast.success('CA configuration deleted');
      setCaSummary(null);
      setCaEditMode(false);
      setCaWeekForm({ term_id: '', grade_level_id: '', subject_id: '', weeks_count: 12, test_weeks: [], exam_week: 12 });
    } catch (err) {
      toast.error(err.data?.message || 'Failed to delete configuration');
    }
  };

  // ==================== GRADE SCALE HANDLERS ====================
  const addGradeRow = () => {
    setScaleForm(prev => ({
      ...prev,
      scale: { ...prev.scale, ['']: { min: 0, max: 100, remark: '' } }
    }));
  };

  const updateGradeRow = (letter, field, value) => {
    setScaleForm(prev => {
      const newScale = { ...prev.scale };
      if (newScale[letter]) {
        newScale[letter] = { ...newScale[letter], [field]: value };
      }
      return { ...prev, scale: newScale };
    });
  };

  const removeGradeRow = (letter) => {
    setScaleForm(prev => {
      const newScale = { ...prev.scale };
      delete newScale[letter];
      return { ...prev, scale: newScale };
    });
  };

  const handleCreateGradeScale = async (e) => {
    e.preventDefault();
    setScaleLoading(true);
    try {
      const payload = editingScaleId
        ? { ...scaleForm }
        : scaleForm;
      
      const res = editingScaleId
        ? await academicApi.gradeScales.update(editingScaleId, payload)
        : await academicApi.gradeScales.create(payload);
      
      toast.success(res.message);
      setShowScaleModal(false);
      setScaleForm({ name: '', scale: {}, is_default: false });
      setEditingScaleId(null);
      fetchData();
    } catch (err) {
      toast.error(err.data?.message || 'Failed to save grade scale');
    } finally {
      setScaleLoading(false);
    }
  };

  const handleSetDefaultScale = async (id) => {
    try {
      const res = await academicApi.gradeScales.setDefault(id);
      toast.success(res.message);
      fetchData();
    } catch (err) {
      toast.error('Failed to set default scale');
    }
  };

  const handleDeleteScale = async (id) => {
    if (!confirm('Delete this grade scale?')) return;
    try {
      await academicApi.gradeScales.delete(id);
      toast.success('Grade scale deleted');
      fetchData();
    } catch (err) {
      toast.error(err.data?.message || 'Failed to delete grade scale');
    }
  };

  // ==================== PHASE 2 HANDLERS ====================

  // Grade Level handlers
  const handleCreateGradeLevel = async (e) => {
    e.preventDefault();
    setGradeLevelLoading(true);
    try {
      const res = await academicApi.gradeLevels.create(gradeLevelForm);
      toast.success(res.message);
      setShowGradeLevelModal(false);
      setGradeLevelForm({ name: '', short_name: '', order: 1, cycle: '' });
      fetchData();
    } catch (err) {
      toast.error(err.data?.message || 'Failed to create grade level');
    } finally {
      setGradeLevelLoading(false);
    }
  };

  const handleBulkCreateGradeLevels = async (e) => {
    e.preventDefault();
    setGradeLevelLoading(true);
    try {
      const res = await academicApi.gradeLevels.bulkCreate(bulkGradeForm);
      toast.success(res.message);
      setShowBulkGradeModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.data?.message || 'Failed to create grade levels');
    } finally {
      setGradeLevelLoading(false);
    }
  };

  const handleDeleteGradeLevel = async (id) => {
    if (!confirm('Delete this grade level?')) return;
    try {
      await academicApi.gradeLevels.delete(id);
      toast.success('Grade level deleted');
      fetchData();
    } catch (err) {
      toast.error(err.data?.message || 'Failed to delete grade level');
    }
  };

  // Section handlers
  const handleFetchSections = async (gradeLevelId) => {
    try {
      const res = await academicApi.sections.getAll(gradeLevelId);
      setSections(res.sections || []);
      setSelectedGradeForSections(gradeLevelId);
    } catch (err) {
      toast.error('Failed to load sections');
    }
  };

  const handleCreateSection = async (e) => {
    e.preventDefault();
    setSectionLoading(true);
    try {
      const res = await academicApi.sections.create({ ...sectionForm, grade_level_id: selectedGradeForSections });
      toast.success(res.message);
      setShowSectionModal(false);
      setSectionForm({ grade_level_id: '', name: '', room_number: '', capacity: '' });
      handleFetchSections(selectedGradeForSections);
    } catch (err) {
      toast.error(err.data?.message || 'Failed to create section');
    } finally {
      setSectionLoading(false);
    }
  };

  const handleDeleteSection = async (id) => {
    if (!confirm('Delete this section?')) return;
    try {
      await academicApi.sections.delete(id);
      toast.success('Section deleted');
      handleFetchSections(selectedGradeForSections);
    } catch (err) {
      toast.error('Failed to delete section');
    }
  };

  // Subject handlers
  const handleCreateSubject = async (e) => {
    e.preventDefault();
    setSubjectLoading(true);
    try {
      const res = await academicApi.subjects.create(subjectForm);
      toast.success(res.message);
      setShowSubjectModal(false);
      setSubjectForm({ name: '', code: '', type: 'core', department_id: '' });
      fetchData();
    } catch (err) {
      toast.error(err.data?.message || 'Failed to create subject');
    } finally {
      setSubjectLoading(false);
    }
  };

  const handleDeleteSubject = async (id) => {
    if (!confirm('Delete this subject?')) return;
    try {
      await academicApi.subjects.delete(id);
      toast.success('Subject deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete subject');
    }
  };

  // Department handlers
  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    setDepartmentLoading(true);
    try {
      const res = await academicApi.departments.create(departmentForm);
      toast.success(res.message);
      setShowDepartmentModal(false);
      setDepartmentForm({ name: '', code: '' });
      fetchData();
    } catch (err) {
      toast.error(err.data?.message || 'Failed to create department');
    } finally {
      setDepartmentLoading(false);
    }
  };

  const handleDeleteDepartment = async (id) => {
    if (!confirm('Delete this department?')) return;
    try {
      await academicApi.departments.delete(id);
      toast.success('Department deleted');
      fetchData();
    } catch (err) {
      toast.error(err.data?.message || 'Failed to delete department');
    }
  };

  // Mapping handlers
  const handleFetchMappings = async (gradeLevelId) => {
    try {
      const res = await academicApi.mappings.getForGrade(gradeLevelId);
      setMappings(res.mappings || []);
      setSelectedGradeForMappings(gradeLevelId);
    } catch (err) {
      toast.error('Failed to load mappings');
    }
  };

  const handleBulkAssignSubjects = async (e) => {
    e.preventDefault();
    setMappingLoading(true);
    try {
      const res = await academicApi.mappings.bulkAssign(mappingForm);
      toast.success(res.message);
      setShowMappingModal(false);
      setMappingForm({ grade_level_ids: [], subject_ids: [], is_compulsory: true, department_id: '' });
      if (selectedGradeForMappings) handleFetchMappings(selectedGradeForMappings);
    } catch (err) {
      toast.error(err.data?.message || 'Failed to assign subjects');
    } finally {
      setMappingLoading(false);
    }
  };

  const handleRemoveMapping = async (id) => {
    if (!confirm('Remove this subject from grade level?')) return;
    try {
      await academicApi.mappings.remove(id);
      toast.success('Subject removed');
      handleFetchMappings(selectedGradeForMappings);
    } catch (err) {
      toast.error('Failed to remove mapping');
    }
  };

  const toggleMappingGrade = (gradeId) => {
    setMappingForm(prev => ({
      ...prev,
      grade_level_ids: prev.grade_level_ids.includes(gradeId)
        ? prev.grade_level_ids.filter(g => g !== gradeId)
        : [...prev.grade_level_ids, gradeId]
    }));
  };

  const toggleMappingSubject = (subjectId) => {
    setMappingForm(prev => ({
      ...prev,
      subject_ids: prev.subject_ids.includes(subjectId)
        ? prev.subject_ids.filter(s => s !== subjectId)
        : [...prev.subject_ids, subjectId]
    }));
  };

  // School Settings handlers
  const handleUpdateSchoolConfig = async (e) => {
    e.preventDefault();
    if (schoolConfig.ca_weight + schoolConfig.exam_weight !== 100) {
      toast.error('The sum of CA and Exam weights must be exactly 100%');
      return;
    }
    setSaveSettingsLoading(true);
    try {
      const res = await academicApi.school.updateConfig(schoolConfig);
      toast.success(res.message);
    } catch (err) {
      toast.error(err.data?.message || 'Failed to update settings');
    } finally {
      setSaveSettingsLoading(false);
    }
  };

  // ==================== RENDER ====================
  return (
    <DashboardLayout title="Academic" subtitle="Configure sessions, terms, continuous assessment, and grading scales">
      <div className="space-y-4 md:space-y-6">
        {/* Tabs - Horizontally scrollable on mobile */}
        <div className="relative">
          {/* Fade indicators for scroll awareness */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-bg-main dark:from-[#0F0E1A] to-transparent z-10 pointer-events-none md:hidden" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-bg-main dark:from-[#0F0E1A] to-transparent z-10 pointer-events-none md:hidden" />
          
          <div className="flex gap-1 md:gap-2 border-b border-border overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:pb-0 snap-x snap-mandatory" style={{ scrollBehavior: 'smooth' }}>
            {[
              { id: TABS.SESSIONS, label: 'Sessions', shortLabel: 'Sessions', icon: CalendarDays },
              { id: TABS.TERMS, label: 'Terms', shortLabel: 'Terms', icon: CalendarDays },
              { id: TABS.CA_WEEKS, label: 'CA Config', shortLabel: 'CA', icon: BookOpen },
              { id: TABS.GRADE_SCALES, label: 'Grade Scales', shortLabel: 'Scales', icon: Scale },
              { id: TABS.GRADE_LEVELS, label: 'Grades', shortLabel: 'Grades', icon: School },
              { id: TABS.SUBJECTS, label: 'Subjects', shortLabel: 'Subjects', icon: Tag },
              { id: TABS.SECTIONS, label: 'Sections', shortLabel: 'Sections', icon: Layers },
              { id: TABS.MAPPINGS, label: 'Mappings', shortLabel: 'Mappings', icon: BookOpen },
              { id: TABS.CA_WEIGHT, label: 'CA Weight', shortLabel: 'CA Weight', icon: Percent },
              { id: TABS.SETTINGS, label: 'Settings', shortLabel: 'Settings', icon: Settings },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2.5 md:py-3 rounded-t-lg transition-all whitespace-nowrap flex-shrink-0 text-xs md:text-sm snap-start ${
                  activeTab === tab.id
                    ? 'bg-card border-b-2 border-primary text-primary font-semibold'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/5 dark:hover:bg-white/10'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5 md:w-4 md:h-4 md:hidden" />
                <span className="hidden md:inline">{tab.label}</span>
                <span className="md:hidden">{tab.shortLabel}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="text-center py-12 text-text-secondary">Loading...</div>
        ) : (
          <>
            {/* ==================== SESSIONS TAB ==================== */}
            {activeTab === TABS.SESSIONS && (
              <div className="space-y-4 md:space-y-6">
                {/* Warning */}
                <div className="flex items-start gap-2 p-3 md:p-4 bg-error/5 dark:bg-error/10 border border-error/20 rounded-lg">
                  <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-error flex-shrink-0 mt-0.5" />
                  <p className="text-xs md:text-sm text-error">
                    Create one session per academic year. Last created session will be considered current.
                  </p>
                </div>

                {/* Create/Edit Session Card */}
                <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-4 md:p-6 shadow-sm">
                  <h2 className="text-base md:text-lg font-semibold text-text-primary mb-4">
                    {editingSessionId ? 'Edit Session' : 'Create Session'}
                  </h2>
                  <form onSubmit={editingSessionId ? handleUpdateSession : handleCreateSession} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                      <div>
                        <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Session Name *</label>
                        <input
                          type="text"
                          placeholder="2025 - 2026"
                          value={sessionForm.name}
                          onChange={e => setSessionForm({ ...sessionForm, name: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder-text-muted"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Start Date *</label>
                        <input
                          type="date"
                          value={sessionForm.start_date}
                          onChange={e => setSessionForm({ ...sessionForm, start_date: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">End Date *</label>
                        <input
                          type="date"
                          value={sessionForm.end_date}
                          onChange={e => setSessionForm({ ...sessionForm, end_date: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={sessionLoading}
                        className="flex items-center justify-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm md:text-base"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {sessionLoading ? 'Saving...' : editingSessionId ? 'Update Session' : 'Create Session'}
                      </button>
                      {editingSessionId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSessionId(null);
                            setSessionForm({ name: '', start_date: '', end_date: '' });
                          }}
                          className="px-6 py-2 border border-border dark:border-gray-600 rounded-lg hover:bg-bg-main dark:hover:bg-gray-700 text-sm md:text-base text-text-secondary"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Existing Sessions */}
                <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-4 md:p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <h2 className="text-base md:text-lg font-semibold text-text-primary">Academic Sessions ({totalSessions})</h2>
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={14} />
                      <input
                        type="text"
                        placeholder="Search sessions..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 md:py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary transition-all"
                      />
                    </div>
                  </div>
                  {displaySessions.length === 0 ? (
                    <p className="text-text-secondary text-center py-8 text-sm md:text-base">No sessions found.</p>
                  ) : (
                    <div className="space-y-3">
                      {displaySessions.map((session, idx) => (
                        <div
                          key={session.id}
                          ref={idx === displaySessions.length - 1 ? observerRef : null}
                          className={`p-3 md:p-4 rounded-lg border-2 ${
                            session.active ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-border dark:border-gray-600'
                          }`}
                        >
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-text-primary text-sm md:text-base truncate">{session.name}</h3>
                              <p className="text-xs md:text-sm text-text-secondary">
                                {session.start_date} → {session.end_date}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 md:gap-3">
                              <span className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm ${
                                session.active ? 'bg-success/10 text-success' : 'bg-text-muted/10 text-text-muted'
                              }`}>
                                {session.active ? 'Active' : 'Inactive'}
                              </span>
                              <span className="text-xs md:text-sm text-text-secondary">{session.terms_count} terms</span>
                              <button
                                onClick={() => {
                                  setEditingSessionId(session.id);
                                  setSessionForm({ name: session.name, start_date: session.start_date, end_date: session.end_date });
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="px-2 md:px-3 py-1 text-xs md:text-sm text-text-secondary border border-border dark:border-gray-600 rounded-lg hover:bg-bg-main dark:hover:bg-gray-700"
                              >
                                Edit
                              </button>
                              {!session.active && (
                                <button
                                  onClick={() => handleSetActiveSession(session.id)}
                                  className="px-2 md:px-3 py-1 text-xs md:text-sm text-primary border border-primary rounded-lg hover:bg-primary/5 dark:hover:bg-primary/10"
                                >
                                  Set Active
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteSession(session.id, session.name)}
                                className="px-2 md:px-3 py-1 text-xs md:text-sm text-error border border-error/30 rounded-lg hover:bg-error/10"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ==================== TERMS TAB ==================== */}
            {activeTab === TABS.TERMS && (
              <div className="space-y-4 md:space-y-6">
                {/* Session Selector */}
                <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-4 md:p-6 shadow-sm">
                  <h2 className="text-base md:text-lg font-semibold text-text-primary mb-4">Select Session</h2>
                  <select
                    value={selectedSessionId || ''}
                    onChange={e => handleFetchTerms(e.target.value)}
                    className="w-full md:w-1/2 px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">-- Select Session --</option>
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>{s.name} {s.active ? '(Active)' : ''}</option>
                    ))}
                  </select>
                </div>

                {selectedSessionId && (
                  <>
                    {/* Bulk Create Card */}
                    <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-4 md:p-6 shadow-sm">
                      <h2 className="text-base md:text-lg font-semibold text-text-primary mb-4">Quick Create Terms</h2>
                      <p className="text-xs md:text-sm text-text-secondary mb-4">
                        Automatically create all terms for this session at once.
                      </p>
                      <button
                        onClick={() => setShowBulkTermModal(true)}
                        className="flex items-center gap-2 px-4 md:px-6 py-2 text-sm md:text-base bg-primary text-white rounded-lg hover:bg-primary-dark"
                      >
                        <Copy className="w-4 h-4" />
                        Bulk Create Terms
                      </button>
                    </div>

                    {/* Existing Terms */}
                    <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-4 md:p-6 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <h2 className="text-base md:text-lg font-semibold text-text-primary">Terms ({totalTerms})</h2>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={14} />
                            <input
                              type="text"
                              placeholder="Search terms..."
                              value={searchQuery}
                              onChange={e => setSearchQuery(e.target.value)}
                              className="w-full pl-9 pr-3 py-1.5 md:py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary transition-all"
                            />
                          </div>
                          <button
                            onClick={() => setShowTermModal(true)}
                            className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark whitespace-nowrap"
                          >
                            <Plus className="w-4 h-4" />
                            Add Term
                          </button>
                        </div>
                      </div>

                      {displayTerms.length === 0 ? (
                        <p className="text-text-secondary text-center py-8 text-sm md:text-base">No terms found.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {displayTerms.map((term, idx) => (
                            <div key={term.id} ref={idx === displayTerms.length - 1 ? observerRef : null} className="p-3 md:p-4 border border-border dark:border-gray-600 rounded-lg bg-bg-main dark:bg-gray-750">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-text-primary text-sm md:text-base truncate flex-1">{term.name}</h3>
                                <div className="flex gap-2 flex-shrink-0">
                                  <button
                                    onClick={() => handleEditTerm(term)}
                                    className="text-info hover:text-info/80"
                                    title="Edit term"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTerm(term.id)}
                                    className="text-error hover:text-error/80"
                                    title="Delete term"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              <p className="text-xs md:text-sm text-text-secondary">
                                {term.start_date} → {term.end_date}
                              </p>
                              <p className="text-xs text-text-muted mt-1">{term.weeks_count} weeks</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ==================== CA WEEKS TAB ==================== */}
            {activeTab === TABS.CA_WEEKS && (
              <div className="space-y-4 md:space-y-6">
                <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-4 md:p-6 shadow-sm">
                  <h2 className="text-base md:text-lg font-semibold text-text-primary mb-2">Continuous Assessment Configuration</h2>
                  <p className="text-sm text-text-secondary mb-6">
                    Configure which weeks have tests (CA) and which week is the final exam for each grade and subject.
                  </p>

                  <form onSubmit={handleSetCaWeeks} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Term *</label>
                        <select
                          value={caWeekForm.term_id}
                          onChange={e => setCaWeekForm({ ...caWeekForm, term_id: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                          required
                        >
                          <option value="">Select Term</option>
                          {terms.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Grade Level *</label>
                        <select
                          value={caWeekForm.grade_level_id}
                          onChange={e => setCaWeekForm({ ...caWeekForm, grade_level_id: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                          value={caWeekForm.subject_id}
                          onChange={e => setCaWeekForm({ ...caWeekForm, subject_id: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                          required
                        >
                          <option value="">Select Subject</option>
                          {subjects.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Total Weeks *</label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={caWeekForm.weeks_count}
                          onChange={e => setCaWeekForm({ ...caWeekForm, weeks_count: safeInt(e.target.value, 12), exam_week: safeInt(e.target.value, 12) })}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                          required
                        />
                      </div>
                    </div>

                    {/* Week Grid */}
                    <div>
                      <label className="block text-xs md:text-sm font-medium text-text-secondary mb-3">
                        Configure Weeks (Toggle tests, select exam week)
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
                        {Array.from({ length: caWeekForm.weeks_count }, (_, i) => i + 1).map(week => (
                          <div key={week} className="space-y-2">
                            <div className="text-center text-xs md:text-sm font-semibold text-text-primary">Week {week}</div>
                            <button
                              type="button"
                              onClick={() => toggleTestWeek(week)}
                              className={`w-full py-1.5 md:py-2 rounded-lg text-xs md:text-sm border-2 transition-all ${
                                caWeekForm.test_weeks.includes(week)
                                  ? 'bg-warning/20 dark:bg-warning/30 border-warning text-warning font-semibold'
                                  : 'border-border dark:border-gray-600 text-text-muted hover:border-warning/50 dark:hover:border-warning/50'
                              }`}
                            >
                              {caWeekForm.test_weeks.includes(week) ? '✓ Test' : 'Test'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setCaWeekForm({ ...caWeekForm, exam_week: week })}
                              className={`w-full py-1.5 md:py-2 rounded-lg text-xs md:text-sm border-2 transition-all ${
                                caWeekForm.exam_week === week
                                  ? 'bg-error/20 dark:bg-error/30 border-error text-error font-semibold'
                                  : 'border-border dark:border-gray-600 text-text-muted hover:border-error/50 dark:hover:border-error/50'
                              }`}
                            >
                              {caWeekForm.exam_week === week ? '✓ Exam' : 'Exam'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="p-3 md:p-4 bg-primary/5 dark:bg-primary/10 rounded-lg">
                      <p className="text-sm text-text-primary">
                        <strong>Summary:</strong> Tests at weeks {caWeekForm.test_weeks.length > 0 ? caWeekForm.test_weeks.join(', ') : 'None'} | Exam at week {caWeekForm.exam_week}
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={caWeekLoading || caWeekForm.test_weeks.length === 0}
                      className="flex items-center gap-2 w-full md:w-auto px-4 md:px-6 py-2 text-sm md:text-base bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {caWeekLoading ? 'Saving...' : caEditMode ? 'Update Configuration' : 'Save CA Configuration'}
                    </button>
                  </form>
                </div>

                {/* View Current CA Configuration */}
                <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-4 md:p-6 shadow-sm">
                  <h2 className="text-base md:text-lg font-semibold text-text-primary mb-4">View Current Configuration</h2>
                  <p className="text-xs md:text-sm text-text-secondary mb-4">Select Term, Grade, and Subject to view saved CA settings.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-4">
                    <select
                      value={caViewTermId || ''}
                      onChange={e => {
                        setCaViewTermId(e.target.value);
                        if (e.target.value && caViewGradeId && caViewSubjectId) handleFetchCaSummary(e.target.value, caViewGradeId, caViewSubjectId);
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">Select Term</option>
                      {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <select
                      value={caViewGradeId || ''}
                      onChange={e => {
                        setCaViewGradeId(e.target.value);
                        if (caViewTermId && e.target.value && caViewSubjectId) handleFetchCaSummary(caViewTermId, e.target.value, caViewSubjectId);
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">Select Grade</option>
                      {gradeLevels.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                    <select
                      value={caViewSubjectId || ''}
                      onChange={e => {
                        setCaViewSubjectId(e.target.value);
                        if (caViewTermId && caViewGradeId && e.target.value) handleFetchCaSummary(caViewTermId, caViewGradeId, e.target.value);
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">Select Subject</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>

                  {caSummary ? (
                    <div className="p-4 bg-bg-main dark:bg-gray-750 rounded-lg border border-border dark:border-gray-600 space-y-4">
                      <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-warning"></div>
                          <span className="text-sm md:text-base text-text-primary"><strong>Tests:</strong> Week {caSummary.test_weeks.join(', ')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-error"></div>
                          <span className="text-sm md:text-base text-text-primary"><strong>Exam:</strong> Week {caSummary.exam_week}</span>
                        </div>
                      </div>
                      <div className="flex gap-3 pt-2 border-t border-border dark:border-gray-600">
                        <button
                          type="button"
                          onClick={handleEditCaConfig}
                          className="flex items-center gap-2 px-4 py-2 text-sm bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit Configuration
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteCaConfig}
                          className="flex items-center gap-2 px-4 py-2 text-sm bg-error/10 text-error rounded-lg hover:bg-error/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : (
                    caViewTermId && caViewGradeId && caViewSubjectId && (
                      <p className="text-text-muted text-center py-4 text-sm">No configuration found for this combination.</p>
                    )
                  )}
                </div>
              </div>
            )}

            {/* ==================== GRADE SCALES TAB ==================== */}
            {activeTab === TABS.GRADE_SCALES && (
              <div className="space-y-4 md:space-y-6">
                {/* Existing Scales */}
                <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-4 md:p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base md:text-lg font-semibold text-text-primary">Grade Scales</h2>
                    <button
                      onClick={() => {
                        setScaleForm({ name: '', scale: {}, is_default: false });
                        setEditingScaleId(null);
                        setShowScaleModal(true);
                      }}
                      className="flex items-center gap-2 px-3 md:px-4 py-2 text-xs md:text-sm bg-primary text-white rounded-lg hover:bg-primary-dark"
                    >
                      <Plus className="w-4 h-4" />
                      Create Scale
                    </button>
                  </div>

                  {gradeScales.length === 0 ? (
                    <p className="text-text-secondary text-center py-8">No grade scales created yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {gradeScales.map(scale => (
                        <div
                          key={scale.id}
                          className={`p-3 md:p-4 border-2 rounded-lg ${
                            scale.is_default ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-border dark:border-gray-600'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-text-primary">{scale.name}</h3>
                              {scale.is_default && (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-success/10 text-success text-xs rounded-full">
                                  <Star className="w-3 h-3" /> Default
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {!scale.is_default && (
                                <button
                                  onClick={() => handleSetDefaultScale(scale.id)}
                                  className="text-sm text-primary hover:underline"
                                >
                                  Set Default
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setScaleForm({ ...scale, scale: typeof scale.scale === 'string' ? JSON.parse(scale.scale) : scale.scale });
                                  setEditingScaleId(scale.id);
                                  setShowScaleModal(true);
                                }}
                                className="text-sm text-text-secondary hover:text-text-primary"
                              >
                                Edit
                              </button>
                              {!scale.is_default && (
                                <button
                                  onClick={() => handleDeleteScale(scale.id)}
                                  className="text-error hover:text-error/80"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                            {Object.entries(typeof scale.scale === 'string' ? JSON.parse(scale.scale) : scale.scale).map(([letter, range]) => (
                              <div key={letter} className="text-center p-1.5 md:p-2 bg-bg-main dark:bg-gray-700 rounded text-xs md:text-sm">
                                <div className="font-bold text-primary">{letter}</div>
                                <div className="text-xs text-text-secondary">{range.min}-{range.max}%</div>
                                <div className="text-xs text-text-muted">{range.remark}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ==================== PHASE 2: GRADE LEVELS TAB ==================== */}
            {activeTab === TABS.GRADE_LEVELS && (
              <div className="space-y-4 md:space-y-6">
                <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-4 md:p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <h2 className="text-base md:text-lg font-semibold text-text-primary">Grade Levels ({totalGradeLevels})</h2>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={14} />
                        <input
                          type="text"
                          placeholder="Search grades..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 md:py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary transition-all"
                        />
                      </div>
                      <button
                        onClick={() => setShowBulkGradeModal(true)}
                        className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 text-xs md:text-sm bg-primary/10 text-primary rounded-lg hover:bg-primary/20 whitespace-nowrap"
                      >
                        <Copy className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        Bulk Create
                      </button>
                      <button
                        onClick={() => {
                          setGradeLevelForm({ name: '', short_name: '', order: 1, cycle: '' });
                          setEditingId(null);
                          setShowGradeLevelModal(true);
                        }}
                        className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 text-xs md:text-sm bg-primary text-white rounded-lg hover:bg-primary-dark whitespace-nowrap"
                      >
                        <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        Add Grade
                      </button>
                    </div>
                  </div>

                  {displayGradeLevels.length === 0 ? (
                    <p className="text-text-secondary text-center py-8 text-sm md:text-base">No grade levels found.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                      {displayGradeLevels.map((gl, idx) => (
                        <div key={gl.id} ref={idx === displayGradeLevels.length - 1 ? observerRef : null} className="p-3 md:p-4 border border-border dark:border-gray-600 rounded-lg bg-bg-main dark:bg-gray-750">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-text-primary text-sm md:text-base">{gl.name}</h3>
                              <p className="text-xs text-text-muted">{gl.short_name} • Order: {gl.order}</p>
                            </div>
                            <button onClick={() => handleDeleteGradeLevel(gl.id)} className="text-error hover:text-error/80 flex-shrink-0">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          {gl.cycle && <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">{gl.cycle}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ==================== PHASE 2: SUBJECTS TAB ==================== */}
            {activeTab === TABS.SUBJECTS && (
              <div className="space-y-4 md:space-y-6">
                <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-4 md:p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <h2 className="text-base md:text-lg font-semibold text-text-primary">Subjects ({totalSubjects})</h2>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={14} />
                        <input
                          type="text"
                          placeholder="Search subjects..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 md:py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary transition-all"
                        />
                      </div>
                      <button
                        onClick={() => {
                          setSubjectForm({ name: '', code: '', type: 'core', department_id: '' });
                          setShowSubjectModal(true);
                        }}
                        className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 text-xs md:text-sm bg-primary text-white rounded-lg hover:bg-primary-dark whitespace-nowrap"
                      >
                        <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        Add Subject
                      </button>
                    </div>
                  </div>

                  {displaySubjects.length === 0 ? (
                    <p className="text-text-secondary text-center py-8 text-sm md:text-base">No subjects found.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                      {displaySubjects.map((sub, idx) => (
                        <div key={sub.id} ref={idx === displaySubjects.length - 1 ? observerRef : null} className="p-3 md:p-4 border border-border dark:border-gray-600 rounded-lg bg-bg-main dark:bg-gray-750">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-text-primary text-sm md:text-base">{sub.name}</h3>
                              <p className="text-xs text-text-muted">{sub.code}</p>
                            </div>
                            <button onClick={() => handleDeleteSubject(sub.id)} className="text-error hover:text-error/80 flex-shrink-0">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            sub.type === 'core' ? 'bg-success/10 text-success' :
                            sub.type === 'elective' ? 'bg-warning/10 text-warning' :
                            'bg-info/10 text-info'
                          }`}>{sub.type}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ==================== PHASE 2: SECTIONS TAB ==================== */}
            {activeTab === TABS.SECTIONS && (
              <div className="space-y-4 md:space-y-6">
                <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-4 md:p-6 shadow-sm">
                  <h2 className="text-base md:text-lg font-semibold text-text-primary mb-4">Sections</h2>
                  <p className="text-xs md:text-sm text-text-secondary mb-4">Select a grade level to view/manage its sections.</p>
                  
                  <select
                    value={selectedGradeForSections || ''}
                    onChange={e => handleFetchSections(e.target.value)}
                    className="w-full md:w-1/2 px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 mb-4"
                  >
                    <option value="">-- Select Grade Level --</option>
                    {gradeLevels.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>

                  {selectedGradeForSections && (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <h2 className="text-sm md:text-base font-semibold text-text-primary">Sections ({totalSections})</h2>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={14} />
                            <input
                              type="text"
                              placeholder="Search sections..."
                              value={searchQuery}
                              onChange={e => setSearchQuery(e.target.value)}
                              className="w-full pl-9 pr-3 py-1.5 md:py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary transition-all"
                            />
                          </div>
                          <button
                            onClick={() => {
                              setSectionForm({ grade_level_id: selectedGradeForSections, name: '', room_number: '', capacity: '' });
                              setShowSectionModal(true);
                            }}
                            className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 text-xs md:text-sm bg-primary text-white rounded-lg hover:bg-primary-dark whitespace-nowrap"
                          >
                            <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            Add Section
                          </button>
                        </div>
                      </div>

                      {displaySections.length === 0 ? (
                        <p className="text-text-secondary text-center py-6 text-sm">No sections found.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                          {displaySections.map((sec, idx) => (
                            <div key={sec.id} ref={idx === displaySections.length - 1 ? observerRef : null} className="p-3 md:p-4 border border-border dark:border-gray-600 rounded-lg bg-bg-main dark:bg-gray-750">
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="font-semibold text-text-primary text-sm md:text-base">{sec.name}</h3>
                                <button onClick={() => handleDeleteSection(sec.id)} className="text-error hover:text-error/80 flex-shrink-0">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              <p className="text-xs text-text-muted">Room: {sec.room_number || 'N/A'} • Capacity: {sec.capacity || 'N/A'}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ==================== PHASE 2: MAPPINGS TAB ==================== */}
            {activeTab === TABS.MAPPINGS && (
              <div className="space-y-4 md:space-y-6">
                <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-4 md:p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <h2 className="text-base md:text-lg font-semibold text-text-primary">Subject-to-Grade Mappings</h2>
                    <button
                      onClick={() => {
                        setMappingForm({ grade_level_ids: [], subject_ids: [], is_compulsory: true, department_id: '' });
                        setShowMappingModal(true);
                      }}
                      className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 text-xs md:text-sm bg-primary text-white rounded-lg hover:bg-primary-dark"
                    >
                      <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      Assign Subjects
                    </button>
                  </div>
                  <p className="text-xs md:text-sm text-text-secondary mb-4">Select a grade level to see its assigned subjects.</p>
                  
                  <select
                    value={selectedGradeForMappings || ''}
                    onChange={e => handleFetchMappings(e.target.value)}
                    className="w-full md:w-1/2 px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 mb-4"
                  >
                    <option value="">-- Select Grade Level --</option>
                    {gradeLevels.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>

                  {selectedGradeForMappings && (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <h2 className="text-sm md:text-base font-semibold text-text-primary">Mapped Subjects ({totalMappings})</h2>
                        <div className="relative w-full sm:w-64">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={14} />
                          <input
                            type="text"
                            placeholder="Search mappings..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 md:py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary transition-all"
                          />
                        </div>
                      </div>

                      {displayMappings.length === 0 ? (
                        <p className="text-text-secondary text-center py-6 text-sm">No subjects found.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                          {displayMappings.map((m, idx) => (
                            <div key={m.id} ref={idx === displayMappings.length - 1 ? observerRef : null} className="p-3 md:p-4 border border-border dark:border-gray-600 rounded-lg bg-bg-main dark:bg-gray-750">
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="font-semibold text-text-primary text-sm md:text-base">{m.subject_name}</h3>
                                <button onClick={() => handleRemoveMapping(m.id)} className="text-error hover:text-error/80 flex-shrink-0">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              <p className="text-xs text-text-muted">{m.subject_code} • {m.subject_type}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
                                m.is_compulsory ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                              }`}>{m.is_compulsory ? 'Compulsory' : 'Elective'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ==================== SETTINGS TAB ==================== */}
            {activeTab === TABS.SETTINGS && (
              <div className="space-y-4 md:space-y-6">
                <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-4 md:p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-6">
                    <Settings className="w-5 h-5 text-primary" />
                    <h2 className="text-base md:text-lg font-semibold text-text-primary">Academic Configuration</h2>
                  </div>

                  <form onSubmit={handleUpdateSchoolConfig} className="max-w-2xl space-y-8">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-text-primary mb-1">Grade Weighting</h3>
                        <p className="text-xs text-text-secondary mb-4">
                          Define how scores are distributed between Continuous Assessment (CA) and Exams. 
                          The total must equal 100%.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-xs md:text-sm font-medium text-text-secondary">CA Weight (%)</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={schoolConfig.ca_weight}
                              onChange={e => setSchoolConfig({ ...schoolConfig, ca_weight: safeInt(e.target.value, 40) })}
                              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                            <span className="text-text-muted">%</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs md:text-sm font-medium text-text-secondary">Exam Weight (%)</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={schoolConfig.exam_weight}
                              onChange={e => setSchoolConfig({ ...schoolConfig, exam_weight: safeInt(e.target.value, 60) })}
                              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                            <span className="text-text-muted">%</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 p-3 bg-bg-main dark:bg-gray-900 rounded-lg border border-border">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-medium text-text-secondary">Total Weight</span>
                          <span className={`text-sm font-bold ${schoolConfig.ca_weight + schoolConfig.exam_weight === 100 ? 'text-success' : 'text-error'}`}>
                            {schoolConfig.ca_weight + schoolConfig.exam_weight}%
                          </span>
                        </div>
                        <div className="w-full bg-border dark:bg-gray-700 h-2 rounded-full overflow-hidden flex">
                          <div 
                            className="bg-primary h-full transition-all duration-300" 
                            style={{ width: `${schoolConfig.ca_weight}%` }} 
                          />
                          <div 
                            className="bg-secondary h-full transition-all duration-300" 
                            style={{ width: `${schoolConfig.exam_weight}%` }} 
                          />
                        </div>
                        <div className="flex gap-4 mt-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            <span className="text-[10px] text-text-secondary uppercase tracking-wider">CA ({schoolConfig.ca_weight}%)</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-secondary" />
                            <span className="text-[10px] text-text-secondary uppercase tracking-wider">Exam ({schoolConfig.exam_weight}%)</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-start">
                      <button
                        type="submit"
                        disabled={saveSettingsLoading || (schoolConfig.ca_weight + schoolConfig.exam_weight !== 100)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-all disabled:opacity-50 shadow-sm shadow-primary/20"
                      >
                        <Save className="w-4 h-4" />
                        {saveSettingsLoading ? 'Saving...' : 'Save Configuration'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}

        {/* ==================== MODALS ==================== */}

        {/* Bulk Term Modal */}
        {showBulkTermModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-text-primary">Bulk Create Terms</h3>
                <button onClick={() => setShowBulkTermModal(false)} className="text-text-muted hover:text-text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleBulkCreateTerms} className="space-y-4">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Number of Terms *</label>
                  <select
                    value={bulkTermForm.terms_count}
                    onChange={e => setBulkTermForm({ ...bulkTermForm, terms_count: safeInt(e.target.value, 3) })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                  >
                    <option value="1">1 Term</option>
                    <option value="2">2 Terms</option>
                    <option value="3">3 Terms</option>
                    <option value="4">4 Terms</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Weeks Per Term *</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={bulkTermForm.weeks_per_term}
                    onChange={e => setBulkTermForm({ ...bulkTermForm, weeks_per_term: safeInt(e.target.value, 12) })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Term Prefix *</label>
                  <input
                    type="text"
                    placeholder="Term"
                    value={bulkTermForm.term_prefix}
                    onChange={e => setBulkTermForm({ ...bulkTermForm, term_prefix: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={bulkTermForm.start_date}
                    onChange={e => setBulkTermForm({ ...bulkTermForm, start_date: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowBulkTermModal(false)}
                    className="flex-1 px-4 py-2 text-sm md:text-base border border-border dark:border-gray-600 rounded-lg hover:bg-bg-main dark:hover:bg-gray-700 text-text-primary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={termLoading}
                    className="flex-1 px-4 py-2 text-sm md:text-base bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                  >
                    {termLoading ? 'Creating...' : 'Create Terms'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Single Term Modal */}
        {showTermModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-text-primary">{editingTermId ? 'Edit Term' : 'Add Term'}</h3>
                <button onClick={() => { setShowTermModal(false); setEditingTermId(null); }} className="text-text-muted hover:text-text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateTerm} className="space-y-4">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Term Name *</label>
                  <input
                    type="text"
                    placeholder="Term 1"
                    value={termForm.name}
                    onChange={e => setTermForm({ ...termForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Start Date *</label>
                    <input
                      type="date"
                      value={termForm.start_date}
                      onChange={e => setTermForm({ ...termForm, start_date: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">End Date *</label>
                    <input
                      type="date"
                      value={termForm.end_date}
                      onChange={e => setTermForm({ ...termForm, end_date: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Order *</label>
                    <input
                      type="number"
                      min="1"
                      value={termForm.order}
                      onChange={e => setTermForm({ ...termForm, order: safeInt(e.target.value, 1) })}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Weeks Count *</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={termForm.weeks_count}
                      onChange={e => setTermForm({ ...termForm, weeks_count: safeInt(e.target.value, 12) })}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setShowTermModal(false); setEditingTermId(null); }} className="flex-1 px-4 py-2 text-sm md:text-base border border-border dark:border-gray-600 rounded-lg hover:bg-bg-main dark:hover:bg-gray-700 text-text-primary">Cancel</button>
                  <button type="submit" disabled={termLoading} className="flex-1 px-4 py-2 text-sm md:text-base bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50">
                    {termLoading ? (editingTermId ? 'Updating...' : 'Creating...') : (editingTermId ? 'Update Term' : 'Create Term')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Grade Scale Modal */}
        {showScaleModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
            <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-4 md:p-6 w-full max-w-2xl my-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-text-primary">{editingScaleId ? 'Edit' : 'Create'} Grade Scale</h3>
                <button onClick={() => { setShowScaleModal(false); setEditingScaleId(null); }} className="text-text-muted hover:text-text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateGradeScale} className="space-y-4">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Scale Name *</label>
                  <input
                    type="text"
                    placeholder="Nigerian WAEC"
                    value={scaleForm.name}
                    onChange={e => setScaleForm({ ...scaleForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-medium text-text-secondary mb-2">Grade Rows</label>
                  <p className="text-xs text-text-muted mb-3">Add grade letters (A, B, C...) with their score ranges.</p>
                  
                  {/* Quick Add Templates */}
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setScaleForm({
                        ...scaleForm,
                        scale: {
                          A: { min: 70, max: 100, remark: 'Excellent' },
                          B: { min: 60, max: 69, remark: 'Good' },
                          C: { min: 50, max: 59, remark: 'Average' },
                          D: { min: 40, max: 49, remark: 'Below Average' },
                          F: { min: 0, max: 39, remark: 'Fail' },
                        }
                      })}
                      className="px-3 py-1 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20"
                    >
                      Load Standard Template
                    </button>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {Object.entries(scaleForm.scale).map(([letter, range]) => (
                      <div key={letter} className="flex gap-1 md:gap-2 items-center flex-wrap">
                        <input
                          type="text"
                          placeholder="A"
                          value={letter}
                          onChange={e => {
                            const newScale = { ...scaleForm.scale };
                            delete newScale[letter];
                            newScale[e.target.value] = range;
                            setScaleForm({ ...scaleForm, scale: newScale });
                          }}
                          className="w-12 md:w-16 px-2 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-center font-bold text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        <input
                          type="number"
                          placeholder="Min"
                          value={range.min}
                          onChange={e => updateGradeRow(letter, 'min', safeInt(e.target.value, 0))}
                          className="w-16 md:w-20 px-2 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        <span className="text-text-muted">-</span>
                        <input
                          type="number"
                          placeholder="Max"
                          value={range.max}
                          onChange={e => updateGradeRow(letter, 'max', safeInt(e.target.value, 100))}
                          className="w-16 md:w-20 px-2 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        <input
                          type="text"
                          placeholder="Remark"
                          value={range.remark}
                          onChange={e => updateGradeRow(letter, 'remark', e.target.value)}
                          className="flex-1 px-2 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        <button
                          type="button"
                          onClick={() => removeGradeRow(letter)}
                          className="text-error hover:text-error/80"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const letter = prompt('Enter grade letter (e.g., A, B+, F9):');
                      if (letter && !scaleForm.scale[letter]) {
                        setScaleForm({
                          ...scaleForm,
                          scale: { ...scaleForm.scale, [letter]: { min: 0, max: 100, remark: '' } }
                        });
                      }
                    }}
                    className="mt-2 flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Plus className="w-4 h-4" /> Add Grade Row
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_default"
                    checked={scaleForm.is_default}
                    onChange={e => setScaleForm({ ...scaleForm, is_default: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="is_default" className="text-xs md:text-sm text-text-secondary">Set as default grading scale</label>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => { setShowScaleModal(false); setEditingScaleId(null); }} className="flex-1 px-4 py-2 text-sm md:text-base border border-border dark:border-gray-600 rounded-lg hover:bg-bg-main dark:hover:bg-gray-700 text-text-primary">Cancel</button>
                  <button type="submit" disabled={scaleLoading || Object.keys(scaleForm.scale).length === 0} className="flex-1 px-4 py-2 text-sm md:text-base bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50">
                    {scaleLoading ? 'Saving...' : 'Save Scale'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ==================== PHASE 2 MODALS ==================== */}

        {/* Bulk Grade Level Modal */}
        {showBulkGradeModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-4 md:p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base md:text-lg font-semibold text-text-primary">Bulk Create Grade Levels</h3>
                <button onClick={() => setShowBulkGradeModal(false)} className="text-text-muted hover:text-text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleBulkCreateGradeLevels} className="space-y-4">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Prefix *</label>
                  <input type="text" placeholder="JSS" value={bulkGradeForm.prefix} onChange={e => setBulkGradeForm({ ...bulkGradeForm, prefix: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50" required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Start Order *</label>
                    <input type="number" min="1" value={bulkGradeForm.start_order} onChange={e => setBulkGradeForm({ ...bulkGradeForm, start_order: safeInt(e.target.value, 1) })} className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50" required />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Count *</label>
                    <input type="number" min="1" max="20" value={bulkGradeForm.count} onChange={e => setBulkGradeForm({ ...bulkGradeForm, count: safeInt(e.target.value, 3) })} className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50" required />
                  </div>
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Cycle</label>
                  <input type="text" placeholder="Junior" value={bulkGradeForm.cycle} onChange={e => setBulkGradeForm({ ...bulkGradeForm, cycle: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowBulkGradeModal(false)} className="flex-1 px-4 py-2 text-sm md:text-base border border-border dark:border-gray-600 rounded-lg hover:bg-bg-main dark:hover:bg-gray-700 text-text-primary">Cancel</button>
                  <button type="submit" disabled={gradeLevelLoading} className="flex-1 px-4 py-2 text-sm md:text-base bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50">{gradeLevelLoading ? 'Creating...' : 'Create'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Subject Modal */}
        {showSubjectModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-4 md:p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base md:text-lg font-semibold text-text-primary">Add Subject</h3>
                <button onClick={() => setShowSubjectModal(false)} className="text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleCreateSubject} className="space-y-4">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Subject Name *</label>
                  <input type="text" placeholder="Mathematics" value={subjectForm.name} onChange={e => setSubjectForm({ ...subjectForm, name: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50" required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Code</label>
                    <input type="text" placeholder="MTH" value={subjectForm.code} onChange={e => setSubjectForm({ ...subjectForm, code: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Type *</label>
                    <select value={subjectForm.type} onChange={e => setSubjectForm({ ...subjectForm, type: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50" required>
                      <option value="core">Core</option>
                      <option value="elective">Elective</option>
                      <option value="departmental">Departmental</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowSubjectModal(false)} className="flex-1 px-4 py-2 text-sm md:text-base border border-border dark:border-gray-600 rounded-lg hover:bg-bg-main dark:hover:bg-gray-700 text-text-primary">Cancel</button>
                  <button type="submit" disabled={subjectLoading} className="flex-1 px-4 py-2 text-sm md:text-base bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50">{subjectLoading ? 'Creating...' : 'Create Subject'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Section Modal */}
        {showSectionModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-4 md:p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base md:text-lg font-semibold text-text-primary">Add Section</h3>
                <button onClick={() => setShowSectionModal(false)} className="text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleCreateSection} className="space-y-4">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Section Name *</label>
                  <input type="text" placeholder="A" value={sectionForm.name} onChange={e => setSectionForm({ ...sectionForm, name: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50" required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Room Number</label>
                    <input type="text" placeholder="Room 101" value={sectionForm.room_number} onChange={e => setSectionForm({ ...sectionForm, room_number: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-text-secondary mb-1">Capacity</label>
                    <input type="number" min="1" placeholder="40" value={sectionForm.capacity} onChange={e => setSectionForm({ ...sectionForm, capacity: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg text-sm md:text-base text-text-primary dark:text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowSectionModal(false)} className="flex-1 px-4 py-2 text-sm md:text-base border border-border dark:border-gray-600 rounded-lg hover:bg-bg-main dark:hover:bg-gray-700 text-text-primary">Cancel</button>
                  <button type="submit" disabled={sectionLoading} className="flex-1 px-4 py-2 text-sm md:text-base bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50">{sectionLoading ? 'Creating...' : 'Create Section'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Mapping Modal */}
        {showMappingModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
            <div className="bg-card dark:bg-gray-800 rounded-card border border-border p-4 md:p-6 w-full max-w-2xl my-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base md:text-lg font-semibold text-text-primary">Assign Subjects to Grades</h3>
                <button onClick={() => setShowMappingModal(false)} className="text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleBulkAssignSubjects} className="space-y-4">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-text-secondary mb-2">Select Grade Levels *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                    {gradeLevels.map(g => (
                      <label key={g.id} className="flex items-center gap-2 p-2 border border-border dark:border-gray-600 rounded cursor-pointer hover:bg-bg-main dark:hover:bg-gray-700">
                        <input type="checkbox" checked={mappingForm.grade_level_ids.includes(g.id)} onChange={() => toggleMappingGrade(g.id)} className="w-4 h-4" />
                        <span className="text-xs md:text-sm text-text-primary">{g.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-text-secondary mb-2">Select Subjects *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                    {subjects.map(s => (
                      <label key={s.id} className="flex items-center gap-2 p-2 border border-border dark:border-gray-600 rounded cursor-pointer hover:bg-bg-main dark:hover:bg-gray-700">
                        <input type="checkbox" checked={mappingForm.subject_ids.includes(s.id)} onChange={() => toggleMappingSubject(s.id)} className="w-4 h-4" />
                        <span className="text-xs md:text-sm text-text-primary truncate">{s.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="is_compulsory" checked={mappingForm.is_compulsory} onChange={e => setMappingForm({ ...mappingForm, is_compulsory: e.target.checked })} className="w-4 h-4" />
                  <label htmlFor="is_compulsory" className="text-xs md:text-sm text-text-secondary">Mark as Compulsory</label>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowMappingModal(false)} className="flex-1 px-4 py-2 text-sm md:text-base border border-border dark:border-gray-600 rounded-lg hover:bg-bg-main dark:hover:bg-gray-700 text-text-primary">Cancel</button>
                  <button type="submit" disabled={mappingLoading || mappingForm.grade_level_ids.length === 0 || mappingForm.subject_ids.length === 0} className="flex-1 px-4 py-2 text-sm md:text-base bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50">{mappingLoading ? 'Assigning...' : 'Assign Subjects'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ==================== CA WEIGHT TAB ==================== */}
        {activeTab === TABS.CA_WEIGHT && (
          <div className="space-y-6">
            <div className="bg-card rounded-lg p-4 md:p-6 border border-border">
              <h3 className="text-base md:text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                <Percent className="w-4 h-4 md:w-5 md:h-5" /> CA Weight Configuration
              </h3>
              <p className="text-xs md:text-sm text-text-muted mb-4">
                Configure how the Continuous Assessment (CA) percentage is split between Assignments and Tests for each grade, subject, and term.
              </p>

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!caWeightForm.grade_level_id || !caWeightForm.subject_id || !caWeightForm.term_id) {
                  toast.error('Please select grade, subject, and term');
                  return;
                }
                if (caWeightForm.assignment_weight_percentage + caWeightForm.test_weight_percentage !== 100) {
                  toast.error('Assignment and test weights must sum to 100%');
                  return;
                }
                setCaWeightSaving(true);
                try {
                  await caWeightConfigApi.saveConfig(caWeightForm);
                  toast.success('CA weight configuration saved');
                  const res = await caWeightConfigApi.getConfigs();
                  setCaWeightConfigs(res.data || []);
                } catch (err) {
                  toast.error(err.data?.message || 'Failed to save');
                } finally {
                  setCaWeightSaving(false);
                }
              }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Grade Level</label>
                    <select value={caWeightForm.grade_level_id} onChange={e => setCaWeightForm({ ...caWeightForm, grade_level_id: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary text-sm">
                      <option value="">Select Grade</option>
                      {gradeLevels.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Subject</label>
                    <select value={caWeightForm.subject_id} onChange={e => setCaWeightForm({ ...caWeightForm, subject_id: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary text-sm">
                      <option value="">Select Subject</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Term</label>
                    <select value={caWeightForm.term_id} onChange={e => setCaWeightForm({ ...caWeightForm, term_id: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary text-sm">
                      <option value="">Select Term</option>
                      {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Total CA % of Final Grade</label>
                    <input type="number" value={caWeightForm.total_ca_percentage} onChange={e => setCaWeightForm({ ...caWeightForm, total_ca_percentage: parseInt(e.target.value) || 40 })} className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary" min="0" max="100" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Assignment Weight within CA (%)</label>
                    <input type="number" value={caWeightForm.assignment_weight_percentage} onChange={e => setCaWeightForm({ ...caWeightForm, assignment_weight_percentage: parseInt(e.target.value) || 0, test_weight_percentage: 100 - (parseInt(e.target.value) || 0) })} className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary" min="0" max="100" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Test Weight within CA (%)</label>
                    <input type="number" value={caWeightForm.test_weight_percentage} onChange={e => setCaWeightForm({ ...caWeightForm, test_weight_percentage: parseInt(e.target.value) || 0, assignment_weight_percentage: 100 - (parseInt(e.target.value) || 0) })} className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary" min="0" max="100" />
                  </div>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Preview:</p>
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                    Assignments: {caWeightForm.assignment_weight_percentage}% of {caWeightForm.total_ca_percentage}% CA = {(caWeightForm.assignment_weight_percentage / 100 * caWeightForm.total_ca_percentage).toFixed(1)}% of final grade
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    Tests: {caWeightForm.test_weight_percentage}% of {caWeightForm.total_ca_percentage}% CA = {(caWeightForm.test_weight_percentage / 100 * caWeightForm.total_ca_percentage).toFixed(1)}% of final grade
                  </p>
                </div>

                <button type="submit" disabled={caWeightSaving} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50">
                  <Save className="w-4 h-4" /> {caWeightSaving ? 'Saving...' : 'Save Configuration'}
                </button>
              </form>
            </div>

            {/* Existing Configurations */}
            <div className="bg-card rounded-lg p-4 md:p-6 border border-border">
              <h3 className="text-base md:text-lg font-semibold text-text-primary mb-4">Saved Configurations</h3>
              {caWeightConfigs.length === 0 ? (
                <p className="text-text-muted text-center py-4">No configurations yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-2 text-text-secondary font-medium">Grade</th>
                        <th className="text-left p-2 text-text-secondary font-medium">Subject</th>
                        <th className="text-left p-2 text-text-secondary font-medium">Term</th>
                        <th className="text-center p-2 text-text-secondary font-medium">CA %</th>
                        <th className="text-center p-2 text-text-secondary font-medium">Assignment %</th>
                        <th className="text-center p-2 text-text-secondary font-medium">Test %</th>
                        <th className="text-center p-2 text-text-secondary font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {caWeightConfigs.map(cfg => (
                        <tr key={cfg.id} className="border-b border-border hover:bg-bg-main">
                          <td className="p-2 text-text-primary">{cfg.grade_level?.name}</td>
                          <td className="p-2 text-text-primary">{cfg.subject?.name}</td>
                          <td className="p-2 text-text-primary">{cfg.term?.name}</td>
                          <td className="p-2 text-center text-text-primary">{cfg.total_ca_percentage}%</td>
                          <td className="p-2 text-center text-blue-600">{cfg.assignment_weight_percentage}%</td>
                          <td className="p-2 text-center text-green-600">{cfg.test_weight_percentage}%</td>
                          <td className="p-2 text-center">
                            <button onClick={async () => {
                              if (!confirm('Delete this configuration?')) return;
                              try {
                                await caWeightConfigApi.deleteConfig(cfg.id);
                                toast.success('Deleted');
                                const res = await caWeightConfigApi.getConfigs();
                                setCaWeightConfigs(res.data || []);
                              } catch (err) {
                                toast.error('Failed to delete');
                              }
                            }} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4 inline" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
