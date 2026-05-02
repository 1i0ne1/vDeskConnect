'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Play, PlayCircle, Pause, CheckCircle, Lock, Unlock,
  ChevronDown, ChevronUp, ChevronRight, ChevronLeft, X,
  Eye, File, Download, Save, Clock, Loader, Edit2, Plus, Upload,
  FileText, Image, Globe, Video, ExternalLink, Trash2, Menu,
  ClipboardList, BookOpen, AlertCircle, Send, Award, Users,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { academicApi } from '@/lib/academic-api';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastProvider';
import { lectureAssignmentsApi } from '@/lib/lecture-assignments-api';

const TYPE_LABELS = {
  async: 'Recorded (Async)',
  sync: 'Live (Sync)',
  hybrid: 'Hybrid',
};

export default function LecturePlayerPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [lecture, setLecture] = useState(null);
  const [resources, setResources] = useState([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [completedSections, setCompletedSections] = useState([]);
  const [sectionContents, setSectionContents] = useState([]);
  const [expandedResource, setExpandedResource] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDirector, setIsDirector] = useState(false);

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Add resource modal
  const [showAddResource, setShowAddResource] = useState(false);
  const [showUploadTab, setShowUploadTab] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewResource, setPreviewResource] = useState(null);
  const [resourceForm, setResourceForm] = useState({
    title: '', type: 'pdf', url: '', description: '',
    is_downloadable: false, is_savable: false, available_from: '', order_index: 0, content_id: '',
  });
  const [resourceSaving, setResourceSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Assignments
  const [assignments, setAssignments] = useState([]);
  const [showAssignments, setShowAssignments] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [assignmentForm, setAssignmentForm] = useState({
    title: '', description: '', type: 'objective', max_score: 100,
    due_at: '', is_mandatory: true, allow_late_submission: false,
  });
  const [showQuestionBuilder, setShowQuestionBuilder] = useState(null);
  const [assignmentQuestions, setAssignmentQuestions] = useState([]);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionForm, setQuestionForm] = useState({
    question_type: 'mcq', question_text: '', options: [{ text: '', is_correct: false }, { text: '', is_correct: false }],
    correct_answer: '', max_points: 1,
  });
  const [showSubmissionForm, setShowSubmissionForm] = useState(null);
  const [submissionQuestions, setSubmissionQuestions] = useState([]);
  const [submissionAnswers, setSubmissionAnswers] = useState([]);
  const [showGradingView, setShowGradingView] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [gradingScore, setGradingScore] = useState('');
  const [gradingFeedback, setGradingFeedback] = useState('');
  const [mandatoryAssignmentsPending, setMandatoryAssignmentsPending] = useState([]);
  const [canCompleteLecture, setCanCompleteLecture] = useState(true);

  // Detect YouTube URL and set type automatically
  const detectResourceType = (url) => {
    if (!url) return 'link';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'video';
    if (url.includes('.pdf')) return 'pdf';
    if (url.match(/\.(jpg|jpeg|png|gif|webp)/i)) return 'image';
    if (url.match(/\.(mp4|webm|mov)/i)) return 'video';
    return 'link';
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const title = file.name.replace(/\.[^/.]+$/, '');
      setResourceForm(prev => ({
        ...prev,
        title: prev.title || title,
        type: file.type.includes('pdf') ? 'pdf' : 
              file.type.includes('image') ? 'image' : 
              file.type.includes('video') ? 'video' : 'pdf',
      }));
    }
  };

  // Handle upload with file
  const handleFileUpload = async () => {
    console.log('handleFileUpload - lecture:', lecture, 'lectureId:', lecture?.id);
    if (!selectedFile) return;
    if (!lecture?.id) {
      console.error('Lecture ID is undefined! lecture:', lecture);
      toast.error('Lecture not loaded properly');
      return;
    }
    setResourceSaving(true);
    setUploadProgress(0);
    console.log('Uploading to lecture ID:', lecture.id);
    try {
      const res = await academicApi.lectureResources.upload(
        lecture.id,
        selectedFile,
        resourceForm.title || selectedFile.name,
        resourceForm.type,
        resourceForm.order_index,
        resourceForm.content_id !== '' ? resourceForm.content_id : null,
        resourceForm.is_downloadable,
        resourceForm.is_savable,
        (progress) => setUploadProgress(progress)
      );
      
      if (res.resource) {
        toast.success('File uploaded successfully!');
        setShowAddResource(false);
        setShowUploadTab(false);
        setSelectedFile(null);
        setResourceForm({
          title: '', type: 'pdf', url: '', description: '',
          is_downloadable: false, is_savable: false, available_from: '', order_index: 0, content_id: '',
        });
        const resList = await academicApi.lectureResources.getAll(lecture.id);
        setResources(resList.resources || []);
      } else {
        throw new Error(res.message || 'Upload failed');
      }
    } catch (err) {
      toast.error(err.message || err.data?.message || 'Failed to upload');
    } finally {
      setResourceSaving(false);
    }
  };

  // Handle URL add
  const handleUrlAdd = async () => {
    setResourceSaving(true);
    try {
      const detectedType = detectResourceType(resourceForm.url);
      const payload = {
        ...resourceForm,
        type: detectedType,
        content_id: resourceForm.content_id !== '' ? resourceForm.content_id : null,
        order_index: resourceForm.content_id !== '' ? parseInt(resourceForm.content_id) : 0,
      };
      await academicApi.lectureResources.add(lecture.id, payload);
      toast.success('Resource added!');
      setShowAddResource(false);
      setResourceForm({
        title: '', type: 'pdf', url: '', description: '',
        is_downloadable: false, is_savable: false, available_from: '', order_index: 0, content_id: '',
      });
      const res = await academicApi.lectureResources.getAll(lecture.id);
      setResources(res.resources || []);
    } catch (err) {
      toast.error(err.data?.message || 'Failed to add resource');
    } finally {
      setResourceSaving(false);
    }
  };

  // Handle delete resource
  const handleDeleteResource = async (resourceId) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;
    try {
      await academicApi.lectureResources.delete(resourceId);
      toast.success('Resource deleted');
      const res = await academicApi.lectureResources.getAll(lecture.id);
      setResources(res.resources || []);
    } catch (err) {
      toast.error(err.data?.message || 'Failed to delete resource');
    }
  };

  // ==================== ASSIGNMENT FUNCTIONS ====================

  const handleSaveAssignment = async () => {
    if (!assignmentForm.title) { toast.error('Title is required'); return; }
    try {
      if (editingAssignment) {
        await lectureAssignmentsApi.updateAssignment(editingAssignment.id, assignmentForm);
        toast.success('Assignment updated');
      } else {
        await lectureAssignmentsApi.createAssignment(lecture.id, assignmentForm);
        toast.success('Assignment created');
      }
      setShowAssignmentForm(false);
      setEditingAssignment(null);
      setAssignmentForm({
        title: '', description: '', type: 'objective', max_score: 100,
        due_at: '', is_mandatory: true, allow_late_submission: false,
      });
      const res = await lectureAssignmentsApi.getAssignments(lecture.id);
      setAssignments(res.data || []);
    } catch (err) {
      toast.error(err.data?.message || 'Failed to save assignment');
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!confirm('Delete this assignment and all its submissions?')) return;
    try {
      await lectureAssignmentsApi.deleteAssignment(assignmentId);
      toast.success('Assignment deleted');
      const res = await lectureAssignmentsApi.getAssignments(lecture.id);
      setAssignments(res.data || []);
    } catch (err) {
      toast.error(err.data?.message || 'Failed to delete assignment');
    }
  };

  const handlePublishAssignment = async (assignmentId) => {
    try {
      await lectureAssignmentsApi.publishAssignment(assignmentId);
      toast.success('Assignment published');
      const res = await lectureAssignmentsApi.getAssignments(lecture.id);
      setAssignments(res.data || []);
    } catch (err) {
      toast.error(err.data?.message || 'Failed to publish');
    }
  };

  const handleCloseAssignment = async (assignmentId) => {
    try {
      await lectureAssignmentsApi.closeAssignment(assignmentId);
      toast.success('Assignment closed');
      const res = await lectureAssignmentsApi.getAssignments(lecture.id);
      setAssignments(res.data || []);
    } catch (err) {
      toast.error(err.data?.message || 'Failed to close');
    }
  };

  const openQuestionBuilder = async (assignment) => {
    setShowQuestionBuilder(assignment.id);
    try {
      const res = await lectureAssignmentsApi.getQuestions(assignment.id);
      setAssignmentQuestions(res.data || []);
    } catch {
      setAssignmentQuestions([]);
    }
  };

  const handleSaveQuestion = async () => {
    if (!questionForm.question_text) { toast.error('Question text required'); return; }
    const assignmentId = showQuestionBuilder;
    try {
      if (editingQuestion) {
        await lectureAssignmentsApi.updateQuestion(assignmentId, editingQuestion.id, questionForm);
        toast.success('Question updated');
      } else {
        await lectureAssignmentsApi.addQuestion(assignmentId, questionForm);
        toast.success('Question added');
      }
      setEditingQuestion(null);
      setQuestionForm({
        question_type: 'mcq', question_text: '', options: [{ text: '', is_correct: false }, { text: '', is_correct: false }],
        correct_answer: '', max_points: 1,
      });
      const res = await lectureAssignmentsApi.getQuestions(assignmentId);
      setAssignmentQuestions(res.data || []);
    } catch (err) {
      toast.error(err.data?.message || 'Failed to save question');
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    try {
      await lectureAssignmentsApi.deleteQuestion(showQuestionBuilder, questionId);
      toast.success('Question deleted');
      const res = await lectureAssignmentsApi.getQuestions(showQuestionBuilder);
      setAssignmentQuestions(res.data || []);
    } catch (err) {
      toast.error(err.data?.message || 'Failed to delete question');
    }
  };

  const handleSyncQuestions = async () => {
    try {
      await lectureAssignmentsApi.syncQuestions(showQuestionBuilder, assignmentQuestions);
      toast.success('Questions saved');
      const res = await lectureAssignmentsApi.getQuestions(showQuestionBuilder);
      setAssignmentQuestions(res.data || []);
    } catch (err) {
      toast.error(err.data?.message || 'Failed to sync questions');
    }
  };

  const openSubmissionForm = async (assignment) => {
    setShowSubmissionForm(assignment.id);
    try {
      const res = await lectureAssignmentsApi.getQuestions(assignment.id);
      setSubmissionQuestions(res.data || []);
      setSubmissionAnswers((res.data || []).map(q => ({
        question_id: q.id, answer_text: '', selected_option: '', uploaded_file_url: '',
      })));
    } catch {
      setSubmissionQuestions([]);
      setSubmissionAnswers([]);
    }
  };

  const handleSubmitAssignment = async (assignmentId) => {
    try {
      const answers = submissionAnswers.filter(a => a.answer_text || a.selected_option || a.uploaded_file_url);
      await lectureAssignmentsApi.submitAssignment(assignmentId, answers);
      toast.success('Assignment submitted');
      setShowSubmissionForm(null);
      const res = await lectureAssignmentsApi.getAssignments(lecture.id);
      setAssignments(res.data || []);
      const completionRes = await lectureAssignmentsApi.checkMandatoryAssignments(lecture.id).catch(() => null);
      if (completionRes) {
        setCanCompleteLecture(completionRes.can_complete);
        setMandatoryAssignmentsPending(completionRes.pending_assignments || []);
      }
    } catch (err) {
      toast.error(err.data?.message || 'Failed to submit');
    }
  };

  const openGradingView = async (assignment) => {
    setShowGradingView(assignment.id);
    try {
      const res = await lectureAssignmentsApi.getSubmissions(assignment.id);
      setSubmissions(res.data || []);
    } catch {
      setSubmissions([]);
    }
  };

  const handleGradeSubmission = async (submissionId) => {
    if (!gradingScore) { toast.error('Score required'); return; }
    try {
      await lectureAssignmentsApi.gradeSubmission(submissionId, parseFloat(gradingScore), gradingFeedback);
      toast.success('Submission graded');
      setGradingScore('');
      setGradingFeedback('');
      const res = await lectureAssignmentsApi.getSubmissions(showGradingView);
      setSubmissions(res.data || []);
    } catch (err) {
      toast.error(err.data?.message || 'Failed to grade');
    }
  };

  const handleAutoGrade = async (assignmentId) => {
    try {
      const res = await lectureAssignmentsApi.autoGrade(assignmentId);
      toast.success(res.message || 'Auto-grading done');
      const subRes = await lectureAssignmentsApi.getSubmissions(assignmentId);
      setSubmissions(subRes.data || []);
    } catch (err) {
      toast.error(err.data?.message || 'Failed to auto-grade');
    }
  };

  const getAssignmentStatusBadge = (status) => {
    const map = {
      draft: { label: 'Draft', color: 'bg-gray-200 text-gray-700' },
      published: { label: 'Published', color: 'bg-green-100 text-green-700' },
      closed: { label: 'Closed', color: 'bg-red-100 text-red-700' },
    };
    const s = map[status] || map.draft;
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>;
  };

  const getAssignmentTypeBadge = (type) => {
    const map = {
      objective: { label: 'Objective', color: 'bg-blue-100 text-blue-700' },
      theory: { label: 'Theory', color: 'bg-purple-100 text-purple-700' },
      resource: { label: 'Resource', color: 'bg-orange-100 text-orange-700' },
    };
    const s = map[type] || map.objective;
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>;
  };

  // Parse content into sections (split by ## Heading)
  const parseContentSections = useCallback((content) => {
    if (!content) return [];
    const sections = content.split(/(?=##\s)/).filter(s => s.trim());
    return sections.map((section, index) => {
      const lines = section.trim().split('\n');
      const titleMatch = lines[0].match(/^##\s+(.+)/);
      const title = titleMatch ? titleMatch[1].trim() : `Section ${index + 1}`;
      const body = lines.slice(1).join('\n').trim();
      return { id: index, title, content: body };
    });
  }, []);

  const fetchLecture = useCallback(async () => {
    setLoading(true);
    try {
      const [userRes, lectureRes, resourcesRes, progressRes, assignmentsRes] = await Promise.all([
        api.get('/user').catch(() => ({ user: null })),
        academicApi.lectures.getOne(params.id),
        academicApi.lectureResources.getAll(params.id).catch(() => ({ resources: [] })),
        academicApi.lectureProgress.get(params.id).catch(() => ({ progress: null })),
        lectureAssignmentsApi.getAssignments(params.id).catch(() => ({ data: [] })),
      ]);
      setUser(userRes.user);
      const isSchoolAdmin = userRes.user?.role === 'admin' || userRes.user?.role === 'director';
      setIsDirector(isSchoolAdmin);
      setLecture(lectureRes.lecture);
      setResources(resourcesRes.resources || []);
      setSectionContents(parseContentSections(lectureRes.lecture?.content));
      setAssignments(assignmentsRes.data || []);
      
      if (progressRes.progress) {
        setCompletedSections(progressRes.progress.progress_data?.completed_sections || []);
      }

      if (userRes.user?.role === 'student') {
        const completionRes = await lectureAssignmentsApi.checkMandatoryAssignments(params.id).catch(() => null);
        if (completionRes) {
          setCanCompleteLecture(completionRes.can_complete);
          setMandatoryAssignmentsPending(completionRes.pending_assignments || []);
        }
      }
    } catch (err) {
      toast.error('Failed to load lecture');
      router.push('/dashboard/lectures');
    } finally {
      setLoading(false);
    }
  }, [params.id, parseContentSections, router, toast]);

  useEffect(() => {
    const token = api.getToken();
    if (!token) { router.push('/login'); return; }
    fetchLecture();
  }, [fetchLecture, router]);

  useEffect(() => {
    const shouldEdit = searchParams.get('edit') === 'true';
    if (shouldEdit && isDirector && !loading && sectionContents.length > 0) {
      setEditedContent(buildFullContent(sectionContents));
      setEditMode(true);
    }
  }, [searchParams, isDirector, loading, sectionContents]);

  // Calculate progress
  // For director: show current section, for students: show completion percentage
  const progress = isDirector 
    ? ((currentSectionIndex + 1) / sectionContents.length) * 100
    : (sectionContents.length > 0 
        ? Math.round((completedSections.length / sectionContents.length) * 100) 
        : 0);

  // Build full content from sections
  const buildFullContent = (sections) => {
    return sections.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n\n');
  };

  // Save edited content
  const saveContent = async () => {
    setEditSaving(true);
    try {
      const newContent = buildFullContent(sectionContents);
      await academicApi.lectures.update(lecture.id, { content: newContent });
      toast.success('Content saved!');
      setLecture({ ...lecture, content: newContent });
      setSectionContents(parseContentSections(newContent));
      if (searchParams.get('edit') === 'true') {
        router.push('/dashboard/lectures');
      } else {
        setEditMode(false);
      }
    } catch (err) {
      toast.error(err.data?.message || 'Failed to save');
    } finally {
      setEditSaving(false);
    }
  };

  // Mark current section complete and move to next
  const markCompleteAndNext = async () => {
    if (!completedSections.includes(currentSectionIndex)) {
      const newCompleted = [...completedSections, currentSectionIndex];
      setCompletedSections(newCompleted);
      
      // If it's the last section, mark the whole lecture as completed for the student
      const isLastSection = currentSectionIndex === sectionContents.length - 1;
      
      try {
        await academicApi.lectureProgress.update(lecture.id, {
          is_completed: isLastSection,
          progress_data: { completed_sections: newCompleted }
        });
        if (isLastSection) {
          toast.success('Congratulations! You have completed this lecture.');
        }
      } catch (err) {
        console.error('Failed to save progress:', err);
      }
    }
  };

  // Go to next section
  const nextSection = () => {
    if (canGoNext && currentSectionIndex < sectionContents.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
    }
  };

  // Go to previous section
  const prevSection = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(currentSectionIndex - 1);
    }
  };

  // Can only go to next if current is completed (except for director who can navigate freely)
  const canGoNext = isDirector || completedSections.includes(currentSectionIndex);
  const canGoPrev = true; // Can always go back

  // Get resources for current section
  // If content_id is null or not set, it's for the entire lecture (shows in all sections)
  // If content_id equals currentSectionIndex, it's for this specific section
  const currentSectionResources = resources.filter(r => {
    const cid = r.content_id;
    // Show if: content_id is null/undefined OR content_id equals current section index
    return cid == null || Number(cid) === currentSectionIndex;
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!lecture) return null;

  const currentSection = sectionContents[currentSectionIndex] || { title: 'No Content', content: '' };

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row h-[calc(100vh-64px)] bg-gray-50 dark:bg-gray-900 overflow-hidden">
        
        {/* Sidebar - slides on mobile, toggles on desktop */}
        <aside className={`
          fixed inset-y-0 left-0 z-40 md:relative md:z-auto
          bg-white dark:bg-gray-800 border-r border-border
          flex flex-col shrink-0
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full md:translate-x-0 md:w-0 overflow-hidden'}
        `}>
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg md:block"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => router.push('/dashboard/lectures')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Progress */}
          <div className="p-4 border-b border-border shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-text-primary">Progress</span>
              <span className="text-sm text-text-muted">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-text-muted mt-2">
              {isDirector 
                ? `Section ${currentSectionIndex + 1} of ${sectionContents.length}`
                : `${completedSections.length} of ${sectionContents.length} complete`}
            </p>
          </div>

          {/* Timeline */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

              {sectionContents.map((section, index) => {
                const isCompleted = completedSections.includes(index);
                const isCurrent = currentSectionIndex === index;
                const isUnlocked = isDirector || index === 0 || completedSections.includes(index - 1);

                return (
                  <div key={section.id} className="relative mb-4">
                    {/* Timeline dot */}
                    <button
                      disabled={!isUnlocked}
                      onClick={() => isUnlocked && setCurrentSectionIndex(index)}
                      className={`absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center z-10 transition-all ${
                        isCurrent 
                          ? 'bg-primary text-white ring-4 ring-primary/20 scale-110' 
                          : isCompleted
                            ? 'bg-success text-white'
                            : isUnlocked
                              ? 'bg-gray-200 dark:bg-gray-700 text-text-muted hover:bg-primary hover:text-white'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {isCompleted ? <CheckCircle className="w-4 h-4" /> : isUnlocked ? <Play className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    </button>

                    {/* Section info */}
                    <div className="ml-12">
                      <button
                        disabled={!isUnlocked}
                        onClick={() => isUnlocked && setCurrentSectionIndex(index)}
                        className={`text-left w-full ${!isUnlocked && 'opacity-50'}`}
                      >
                        <p className={`text-sm font-medium ${isCurrent ? 'text-primary' : 'text-text-primary'}`}>
                          {section.title}
                        </p>
                        <p className="text-xs text-text-muted">
                          {isCompleted ? '✓ Completed' : isUnlocked ? (isCurrent ? '→ Current' : 'Tap to view') : '🔒 Locked - complete previous'}
                        </p>
                      </button>
                    </div>
                  </div>
                );
              })}

              {sectionContents.length === 0 && (
                <p className="text-sm text-text-muted text-center py-8">No sections</p>
              )}

              {editMode && (
                <div className="mt-4 pt-4 border-t border-border">
                  <button
                    onClick={() => {
                      const newSections = [...sectionContents, { id: `new_${Date.now()}`, title: 'New Section', content: '' }];
                      setSectionContents(newSections);
                      setCurrentSectionIndex(newSections.length - 1);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-primary text-primary rounded-lg hover:bg-primary/5"
                  >
                    <Plus className="w-4 h-4" /> Add Section
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 border-b border-border p-3 md:p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
              <div className="min-w-0">
                <h1 className="text-base md:text-lg font-bold text-text-primary truncate">{lecture.title}</h1>
                <p className="text-xs md:text-sm text-text-muted">{TYPE_LABELS[lecture.type]} • {lecture.subject_name}</p>
              </div>
            </div>

            <div className="flex items-center gap-1 md:gap-2">
              <span className="text-xs md:text-sm text-text-muted">
                {currentSectionIndex + 1} / {sectionContents.length}
              </span>
              {editMode ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (searchParams.get('edit') === 'true') {
                        router.push('/dashboard/lectures');
                      } else {
                        setEditMode(false);
                        setSectionContents(parseContentSections(lecture.content));
                      }
                    }}
                    className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 border border-border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <X className="w-4 h-4" /> <span className="hidden md:inline">Cancel</span>
                  </button>
                  <button
                    onClick={saveContent}
                    disabled={editSaving}
                    className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 bg-success text-white rounded-lg"
                  >
                    <Save className="w-4 h-4" /> <span className="hidden md:inline">{editSaving ? 'Saving...' : 'Save'}</span>
                  </button>
                </div>
              ) : isDirector && (
                <>
                  <button
                    onClick={() => {
                      setEditedContent(buildFullContent(sectionContents));
                      setEditMode(true);
                    }}
                    className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 border border-border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Edit2 className="w-4 h-4" /> <span className="hidden md:inline">Edit</span>
                  </button>
                  <button
                    onClick={() => {
                      setResourceForm({
                        title: '', type: 'pdf', url: '', description: '',
                        is_downloadable: false, is_savable: false, available_from: '',
                        order_index: currentSectionIndex,
                      });
                      setShowAddResource(true);
                    }}
                    className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary-dark"
                  >
                    <Plus className="w-4 h-4" /> <span className="hidden md:inline">Add</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto p-6">
              {/* Section Title */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-text-primary mb-2 flex items-center gap-2">
                  {currentSection.title}
                  {!canGoNext && !isDirector && (
                    <span className="flex items-center gap-1 text-xs px-2 py-1 bg-warning/10 text-warning rounded">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  )}
                </h2>
                {editMode && (
                  <input
                    type="text"
                    value={sectionContents[currentSectionIndex]?.title || ''}
                    onChange={(e) => {
                      const newSections = [...sectionContents];
                      newSections[currentSectionIndex] = { ...newSections[currentSectionIndex], title: e.target.value };
                      setSectionContents(newSections);
                    }}
                    className="text-xl font-bold w-full px-2 py-1 border border-primary rounded bg-transparent text-text-primary"
                  />
                )}
              </div>

              {/* Section Content */}
              <div className="prose dark:prose-invert max-w-none mb-8">
                {editMode ? (
                  <textarea
                    rows={15}
                    value={sectionContents[currentSectionIndex]?.content || ''}
                    onChange={(e) => {
                      const newSections = [...sectionContents];
                      newSections[currentSectionIndex] = { ...newSections[currentSectionIndex], content: e.target.value };
                      setSectionContents(newSections);
                    }}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary font-mono text-sm"
                    placeholder="Write content here using Markdown..."
                  />
                ) : (
                  <div className="prose dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {currentSection.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>

              {/* Section Resources */}
              {currentSectionResources.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-text-primary mb-4">
                    Resources for this Section
                  </h3>
                  <div className="grid gap-3">
                    {currentSectionResources.map(resource => (
                      <div 
                        key={resource.id} 
                        className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-border"
                      >
                        <div className="flex items-center gap-3">
                          {resource.type === 'pdf' && <FileText className="w-5 h-5 text-error" />}
                          {resource.type === 'video' && <Video className="w-5 h-5 text-purple-600" />}
                          {resource.type === 'image' && <Image className="w-5 h-5 text-green-600" />}
                          {resource.type === 'link' && <Globe className="w-5 h-5 text-blue-600" />}
                          <div>
                            <p className="font-medium text-text-primary">{resource.title}</p>
                            <p className="text-sm text-text-muted capitalize">{resource.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {resource.is_downloadable && (
                            <span className="p-1 text-xs text-text-muted" title="Can Download">
                              <Download className="w-3 h-3" />
                            </span>
                          )}
                          {resource.is_savable && (
                            <span className="p-1 text-xs text-text-muted" title="Can Save">
                              <Save className="w-3 h-3" />
                            </span>
                          )}
                          <button 
                            onClick={() => setPreviewResource(resource)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20"
                          >
                            <Eye className="w-4 h-4" /> View
                          </button>
                          {isDirector && (
                            <button 
                              onClick={() => handleDeleteResource(resource.id)}
                              className="flex items-center gap-1 px-3 py-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Resource Button for Director */}
              {isDirector && expandedResource === currentSectionIndex && (
                <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg mb-4">
                  <p className="text-sm text-text-muted mb-2">Quick add resource:</p>
                  <p className="text-xs text-text-muted">Use the lecture detail modal to add resources to sections.</p>
                </div>
              )}

              {/* Navigation & Complete */}
              <div className="flex items-center justify-between pt-6 border-t border-border">
                <button
                  onClick={prevSection}
                  disabled={!canGoPrev || currentSectionIndex === 0}
                  className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg disabled:opacity-50"
                >
                  <ChevronUp className="w-4 h-4" /> Previous
                </button>

                <div className="flex items-center gap-3">
                  {!completedSections.includes(currentSectionIndex) && !isDirector && (
                    <button
                      onClick={markCompleteAndNext}
                      disabled={lecture.type === 'sync' && lecture.status !== 'completed'}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        lecture.type === 'sync' && lecture.status !== 'completed'
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-success/10 text-success hover:bg-success/20'
                      }`}
                      title={lecture.type === 'sync' && lecture.status !== 'completed' ? 'Wait for teacher to complete live session' : ''}
                    >
                      <CheckCircle className="w-4 h-4" /> 
                      {lecture.type === 'sync' ? 'Mark Live Session Complete' : 'Mark Complete & Next'}
                    </button>
                  )}
                  {completedSections.includes(currentSectionIndex) && (
                    <span className="flex items-center gap-2 text-success">
                      <CheckCircle className="w-4 h-4" /> Completed
                    </span>
                  )}
                  {isDirector && (
                    <span className="flex items-center gap-2 text-sm px-3 py-1 bg-primary/10 text-primary rounded-lg">
                      Director Mode
                    </span>
                  )}
                </div>

                <button
                  onClick={nextSection}
                  disabled={!canGoNext || currentSectionIndex === sectionContents.length - 1}
                  className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg disabled:opacity-50"
                >
                  Next <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {/* Assignments Section */}
              <div className="mt-12 pt-8 border-t border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                    <ClipboardList className="w-5 h-5" /> Assignments
                  </h3>
                  {isDirector && (
                    <button
                      onClick={() => {
                        setEditingAssignment(null);
                        setAssignmentForm({
                          title: '', description: '', type: 'objective', max_score: 100,
                          due_at: '', is_mandatory: true, allow_late_submission: false,
                        });
                        setShowAssignmentForm(true);
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
                    >
                      <Plus className="w-4 h-4" /> Add Assignment
                    </button>
                  )}
                </div>

                {!canCompleteLecture && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">Mandatory assignments pending</p>
                      <p className="text-xs text-amber-700 mt-1">
                        You must submit: {mandatoryAssignmentsPending.map(a => a.title).join(', ')}
                      </p>
                    </div>
                  </div>
                )}

                {assignments.length === 0 ? (
                  <p className="text-text-muted text-center py-4">No assignments attached.</p>
                ) : (
                  <div className="grid gap-3">
                    {assignments.map(assignment => (
                      <div key={assignment.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-border">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-medium text-text-primary">{assignment.title}</h4>
                            {getAssignmentTypeBadge(assignment.type)}
                            {getAssignmentStatusBadge(assignment.status)}
                            {assignment.is_mandatory && (
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">Required</span>
                            )}
                          </div>
                        </div>
                        {assignment.description && <p className="text-sm text-text-muted mb-2">{assignment.description}</p>}
                        <div className="flex items-center gap-4 text-xs text-text-muted mb-3">
                          <span>Max: {assignment.max_score} pts</span>
                          {assignment.due_at && <span>Due: {new Date(assignment.due_at).toLocaleString()}</span>}
                          {assignment.questions && <span>{assignment.questions.length} question(s)</span>}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {user?.role === 'student' && assignment.status === 'published' && (
                            <>
                              {!assignment.my_submission ? (
                                <button onClick={() => openSubmissionForm(assignment)} className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 text-sm">
                                  <Send className="w-3.5 h-3.5" /> Submit
                                </button>
                              ) : (
                                <span className={`text-xs px-2 py-1 rounded ${assignment.my_submission.status === 'graded' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                  {assignment.my_submission.status === 'graded' ? `Graded: ${assignment.my_submission.score}/${assignment.my_submission.max_score}` : 'Submitted — Awaiting Grade'}
                                </span>
                              )}
                              {assignment.my_submission?.feedback && <p className="text-xs text-text-muted italic">Feedback: {assignment.my_submission.feedback}</p>}
                            </>
                          )}
                          {isDirector && (
                            <>
                              {assignment.status === 'draft' && <button onClick={() => handlePublishAssignment(assignment.id)} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">Publish</button>}
                              {assignment.status === 'published' && <button onClick={() => handleCloseAssignment(assignment.id)} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">Close</button>}
                              <button onClick={() => openGradingView(assignment)} className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"><Users className="w-3 h-3" /> Submissions</button>
                              <button onClick={() => openQuestionBuilder(assignment)} className="flex items-center gap-1 text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"><Edit2 className="w-3 h-3" /> Questions</button>
                              <button onClick={() => { setEditingAssignment(assignment); setAssignmentForm({ title: assignment.title, description: assignment.description || '', type: assignment.type, max_score: assignment.max_score, due_at: assignment.due_at ? assignment.due_at.slice(0, 16) : '', is_mandatory: assignment.is_mandatory, allow_late_submission: assignment.allow_late_submission }); setShowAssignmentForm(true); }} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">Edit</button>
                              <button onClick={() => handleDeleteAssignment(assignment.id)} className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3 h-3 inline" /></button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* All Resources */}
              <div className="mt-12 pt-8 border-t border-border">
                <h3 className="text-lg font-semibold text-text-primary mb-4">All Lecture Resources</h3>
                {resources.filter(r => r.content_id == null).length === 0 ? (
                  <p className="text-text-muted text-center py-8">No resources attached.</p>
                ) : (
                  <div className="grid gap-3">
                    {resources.filter(r => r.content_id == null || r.content_id === '').map(resource => (
                      <div 
                        key={resource.id} 
                        className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-border"
                      >
                        <div className="flex items-center gap-3">
                          {resource.type === 'pdf' && <FileText className="w-5 h-5 text-error" />}
                          {resource.type === 'video' && <Video className="w-5 h-5 text-purple-600" />}
                          {resource.type === 'image' && <Image className="w-5 h-5 text-green-600" />}
                          {resource.type === 'link' && <Globe className="w-5 h-5 text-blue-600" />}
                          <div>
                            <p className="font-medium text-text-primary">{resource.title}</p>
                            <p className="text-sm text-text-muted">
                              {resource.content_id != null && resource.content_id !== '' 
                                ? `Section ${parseInt(resource.content_id) + 1}` 
                                : 'Entire Lecture'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {resource.is_downloadable && <Download className="w-4 h-4 text-text-muted" />}
                          {resource.is_savable && <Save className="w-4 h-4 text-text-muted" />}
                          <button 
                            onClick={() => setPreviewResource(resource)}
                            className="text-primary hover:underline"
                          >
                            View
                          </button>
                          {isDirector && (
                            <button 
                              onClick={() => handleDeleteResource(resource.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Floating Progress - always visible for everyone - Hide on small mobile, show on md+ */}
          <div className="hidden md:flex fixed bottom-6 right-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl border border-border z-30">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12">
                <svg className="w-12 h-12 -rotate-90">
                  <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="none" className="text-gray-200 dark:text-gray-700" />
                  <circle 
                    cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="none" 
                    strokeDasharray={125.6}
                    strokeDashoffset={125.6 - (125.6 * progress / 100)}
                    className="text-primary transition-all duration-500"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-text-primary leading-none">
                  {isDirector 
                    ? `${currentSectionIndex + 1}/${sectionContents.length}`
                    : `${Math.round(progress)}%`}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">Progress</p>
                <p className="text-xs text-text-muted">
                  {isDirector 
                    ? `Section ${currentSectionIndex + 1} of ${sectionContents.length}`
                    : `${completedSections.length} of ${sectionContents.length}`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Add Resource Modal for Director */}
        {showAddResource && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => { setShowAddResource(false); setShowUploadTab(false); setSelectedFile(null); }}>
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-semibold text-text-primary">Add Resource to Section {resourceForm.order_index + 1}</h3>
                <button onClick={() => { setShowAddResource(false); setShowUploadTab(false); setSelectedFile(null); }} className="text-text-muted hover:text-text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border">
                <button
                  type="button"
                  onClick={() => setShowUploadTab(true)}
                  className={`flex-1 px-4 py-3 text-sm font-medium ${showUploadTab ? 'border-b-2 border-primary text-primary' : 'text-text-muted'}`}
                >
                  📁 Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setShowUploadTab(false)}
                  className={`flex-1 px-4 py-3 text-sm font-medium ${!showUploadTab ? 'border-b-2 border-primary text-primary' : 'text-text-muted'}`}
                >
                  🔗 Add Link/URL
                </button>
              </div>

              <div className="p-4 space-y-4">
                {showUploadTab ? (
                  /* Upload Tab */
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                      <input
                        type="file"
                        id="resourceFile"
                        onChange={handleFileSelect}
                        accept=".pdf,.mp4,.webm,.mov,.jpg,.jpeg,.png,.gif,.webp"
                        className="hidden"
                      />
                      <label htmlFor="resourceFile" className="cursor-pointer">
                        {selectedFile ? (
                          <div className="space-y-2">
                            <File className="w-12 h-12 mx-auto text-primary" />
                            <p className="text-text-primary font-medium">{selectedFile.name}</p>
                            <p className="text-text-muted text-sm">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <File className="w-12 h-12 mx-auto text-text-muted" />
                            <p className="text-text-primary font-medium">Click to select file</p>
                            <p className="text-text-muted text-sm">PDF, Video, Image (max 100MB)</p>
                          </div>
                        )}
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">Title</label>
                      <input
                        type="text"
                        value={resourceForm.title}
                        onChange={e => setResourceForm({ ...resourceForm, title: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary"
                        placeholder={selectedFile ? selectedFile.name : 'Resource title'}
                      />
                    </div>
                    
                    {resourceSaving && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-medium text-text-secondary">
                          <span>Uploading...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleFileUpload}
                      disabled={!selectedFile || resourceSaving}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                    >
                      {resourceSaving ? (
                        <Loader className="w-4 h-4 animate-spin" /> 
                      ) : (
                        <Upload className="w-4 h-4" />
                      )} 
                      {resourceSaving ? 'Uploading...' : 'Upload File'}
                    </button>
                  </div>
                ) : (
                  /* URL Tab */
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">Title</label>
                      <input
                        type="text"
                        value={resourceForm.title}
                        onChange={e => setResourceForm({ ...resourceForm, title: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary"
                        placeholder="Resource title"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1">Resource URL *</label>
                      <input
                        type="url"
                        value={resourceForm.url}
                        onChange={e => setResourceForm({ ...resourceForm, url: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary"
                        placeholder="https://..."
                      />
                      <p className="text-xs text-text-muted mt-1">
                        Auto-detects: YouTube, PDF, Image, Video links
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleUrlAdd}
                      disabled={!resourceForm.url || resourceSaving}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                    >
                      {resourceSaving ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      {resourceSaving ? 'Adding...' : 'Add Resource'}
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Attach To</label>
                  <select
                    value={resourceForm.content_id !== null && resourceForm.content_id !== '' ? resourceForm.content_id : 'all'}
                    onChange={e => setResourceForm({ 
                      ...resourceForm, 
                      content_id: e.target.value === 'all' ? '' : parseInt(e.target.value),
                    })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary"
                  >
                    <option value="all">Entire Lecture (All Sections)</option>
                    {sectionContents.map((s, i) => (
                      <option key={i} value={i}>Section {i + 1}: {s.title}</option>
                    ))}
                  </select>
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
              </div>
            </div>
          </div>
        )}

        {/* Resource Preview Modal */}
        {previewResource && (
          <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4" onClick={() => setPreviewResource(null)}>
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  {previewResource.type === 'pdf' && <FileText className="w-5 h-5 text-error" />}
                  {previewResource.type === 'video' && <Video className="w-5 h-5 text-purple-600" />}
                  {previewResource.type === 'image' && <Image className="w-5 h-5 text-green-600" />}
                  {previewResource.type === 'link' && <Globe className="w-5 h-5 text-blue-600" />}
                  <h3 className="font-semibold text-text-primary">{previewResource.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <a 
                    href={previewResource.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 text-text-muted hover:text-text-primary"
                  >
                    <ExternalLink className="w-4 h-4" /> Open in New Tab
                  </a>
                  <button onClick={() => setPreviewResource(null)} className="p-2 text-text-muted hover:text-text-primary">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto p-4 bg-gray-900">
                {previewResource.type === 'image' && (
                  <img src={previewResource.url} alt={previewResource.title} className="max-w-full mx-auto" />
                )}

                {previewResource.type === 'video' && (
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                    {previewResource.url.includes('youtube') || previewResource.url.includes('youtu.be') ? (
                      (() => {
                        let videoId = '';
                        if (previewResource.url.includes('youtu.be/')) {
                          videoId = previewResource.url.split('youtu.be/')[1]?.split('?')[0];
                        } else if (previewResource.url.includes('watch?v=')) {
                          const params = new URL(previewResource.url).searchParams;
                          videoId = params.get('v');
                        }
                        const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : null;
                        return embedUrl ? (
                          <iframe
                            src={embedUrl}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-white">
                            <Video className="w-12 h-12 mb-2 opacity-50" />
                            <p className="text-sm opacity-70">Preview unavailable</p>
                          </div>
                        );
                      })()
                    ) : (
                      <video 
                        src={previewResource.url} 
                        controls 
                        className="w-full h-full"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    )}
                    <div className="hidden flex-col items-center justify-center h-full text-white">
                      <Video className="w-12 h-12 mb-2 opacity-50" />
                      <p className="text-sm opacity-70">Video unavailable</p>
                    </div>
                  </div>
                )}

                {previewResource.type === 'pdf' && (
                  <iframe
                    src={previewResource.url}
                    className="w-full h-[70vh] rounded-lg"
                  />
                )}

                {previewResource.type === 'link' && (
                  <div className="text-center py-12">
                    <Globe className="w-16 h-16 mx-auto text-text-muted mb-4" />
                    <p className="text-text-secondary mb-4">External Link</p>
                    <a 
                      href={previewResource.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
                    >
                      <ExternalLink className="w-4 h-4" /> Open Link
                    </a>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {previewResource.is_downloadable && (
                    <span className="flex items-center gap-1 text-sm text-text-muted">
                      <Download className="w-4 h-4" /> Can Download
                    </span>
                  )}
                  {previewResource.is_savable && (
                    <span className="flex items-center gap-1 text-sm text-text-muted">
                      <Save className="w-4 h-4" /> Can Save
                    </span>
                  )}
                </div>
                <button 
                  onClick={() => setPreviewResource(null)}
                  className="px-4 py-2 border border-border rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assignment Create/Edit Modal */}
        {showAssignmentForm && (
          <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4" onClick={() => setShowAssignmentForm(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-semibold text-text-primary">{editingAssignment ? 'Edit Assignment' : 'New Assignment'}</h3>
                <button onClick={() => setShowAssignmentForm(false)} className="text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Title *</label>
                  <input type="text" value={assignmentForm.title} onChange={e => setAssignmentForm({ ...assignmentForm, title: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary" placeholder="Assignment title" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
                  <textarea value={assignmentForm.description} onChange={e => setAssignmentForm({ ...assignmentForm, description: e.target.value })} rows={3} className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary" placeholder="Instructions for students" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Type</label>
                  <select value={assignmentForm.type} onChange={e => setAssignmentForm({ ...assignmentForm, type: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary">
                    <option value="objective">Objective (MCQ/True-False/Fill-Blank)</option>
                    <option value="theory">Theory (Essay/Short Answer)</option>
                    <option value="resource">Resource-Based (File Upload)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Max Score</label>
                    <input type="number" value={assignmentForm.max_score} onChange={e => setAssignmentForm({ ...assignmentForm, max_score: parseInt(e.target.value) || 100 })} className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary" min="1" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Due Date (optional)</label>
                    <input type="datetime-local" value={assignmentForm.due_at} onChange={e => setAssignmentForm({ ...assignmentForm, due_at: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-700 text-text-primary" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={assignmentForm.is_mandatory} onChange={e => setAssignmentForm({ ...assignmentForm, is_mandatory: e.target.checked })} className="w-4 h-4" /><span className="text-sm text-text-primary">Mandatory (must submit to complete lecture)</span></label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={assignmentForm.allow_late_submission} onChange={e => setAssignmentForm({ ...assignmentForm, allow_late_submission: e.target.checked })} className="w-4 h-4" /><span className="text-sm text-text-primary">Allow late submissions</span></label>
                </div>
                <button onClick={handleSaveAssignment} className="w-full py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark">{editingAssignment ? 'Update' : 'Create'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Question Builder Modal */}
        {showQuestionBuilder && (
          <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4" onClick={() => setShowQuestionBuilder(null)}>
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-semibold text-text-primary">Question Builder</h3>
                <button onClick={() => setShowQuestionBuilder(null)} className="text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 space-y-4">
                {/* Question Form */}
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3">
                  <h4 className="text-sm font-medium text-text-primary">{editingQuestion ? 'Edit Question' : 'Add Question'}</h4>
                  <select value={questionForm.question_type} onChange={e => setQuestionForm({ ...questionForm, question_type: e.target.value, options: e.target.value === 'mcq' ? [{ text: '', is_correct: false }, { text: '', is_correct: false }] : [] })} className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-600 text-text-primary text-sm">
                    <option value="mcq">Multiple Choice</option>
                    <option value="true_false">True / False</option>
                    <option value="fill_blank">Fill in the Blank</option>
                    <option value="theory">Theory (Essay)</option>
                  </select>
                  <textarea value={questionForm.question_text} onChange={e => setQuestionForm({ ...questionForm, question_text: e.target.value })} rows={2} className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-600 text-text-primary text-sm" placeholder="Question text" />
                  {(questionForm.question_type === 'mcq') && (
                    <div className="space-y-2">
                      <p className="text-xs text-text-muted">Options (mark correct answer):</p>
                      {questionForm.options.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input type="radio" name="correctOpt" checked={opt.is_correct} onChange={() => setQuestionForm({ ...questionForm, options: questionForm.options.map((o, j) => ({ ...o, is_correct: j === i })) })} className="w-4 h-4" />
                          <input type="text" value={opt.text} onChange={e => { const opts = [...questionForm.options]; opts[i] = { ...opts[i], text: e.target.value }; setQuestionForm({ ...questionForm, options: opts }); }} className="flex-1 px-2 py-1 border border-border rounded text-sm bg-white dark:bg-gray-600 text-text-primary" placeholder={`Option ${i + 1}`} />
                          {questionForm.options.length > 2 && <button onClick={() => setQuestionForm({ ...questionForm, options: questionForm.options.filter((_, j) => j !== i) })} className="text-red-500"><X className="w-3 h-3" /></button>}
                        </div>
                      ))}
                      <button onClick={() => setQuestionForm({ ...questionForm, options: [...questionForm.options, { text: '', is_correct: false }] })} className="text-xs text-primary hover:underline">+ Add Option</button>
                    </div>
                  )}
                  {questionForm.question_type === 'true_false' && (
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1 text-sm"><input type="radio" name="tfAnswer" value="true" checked={questionForm.correct_answer === 'true'} onChange={e => setQuestionForm({ ...questionForm, correct_answer: e.target.value })} /> True</label>
                      <label className="flex items-center gap-1 text-sm"><input type="radio" name="tfAnswer" value="false" checked={questionForm.correct_answer === 'false'} onChange={e => setQuestionForm({ ...questionForm, correct_answer: e.target.value })} /> False</label>
                    </div>
                  )}
                  {(questionForm.question_type === 'fill_blank' || questionForm.question_type === 'theory') && (
                    <div>
                      {questionForm.question_type === 'fill_blank' && <p className="text-xs text-text-muted mb-1">Correct answer (exact match for auto-grading):</p>}
                      <input type="text" value={questionForm.correct_answer} onChange={e => setQuestionForm({ ...questionForm, correct_answer: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-600 text-text-primary text-sm" placeholder={questionForm.question_type === 'fill_blank' ? 'Correct answer' : 'Leave blank — teacher will grade manually'} />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input type="number" value={questionForm.max_points} onChange={e => setQuestionForm({ ...questionForm, max_points: parseInt(e.target.value) || 1 })} className="w-20 px-2 py-1 border border-border rounded text-sm bg-white dark:bg-gray-600 text-text-primary" min="1" />
                    <span className="text-xs text-text-muted">points</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveQuestion} className="flex-1 py-1.5 bg-primary text-white rounded-lg text-sm">{editingQuestion ? 'Update' : 'Add'} Question</button>
                    {editingQuestion && <button onClick={() => { setEditingQuestion(null); setQuestionForm({ question_type: 'mcq', question_text: '', options: [{ text: '', is_correct: false }, { text: '', is_correct: false }], correct_answer: '', max_points: 1 }); }} className="px-3 py-1.5 border border-border rounded-lg text-sm">Cancel</button>}
                  </div>
                </div>

                {/* Existing Questions List */}
                <div>
                  <h4 className="text-sm font-medium text-text-primary mb-2">Existing Questions ({assignmentQuestions.length})</h4>
                  {assignmentQuestions.length === 0 ? <p className="text-xs text-text-muted">No questions yet.</p> : (
                    <div className="space-y-2">
                      {assignmentQuestions.map((q, i) => (
                        <div key={q.id} className="p-2 bg-white dark:bg-gray-600 rounded border border-border text-sm">
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-xs text-text-muted">#{i + 1} [{q.question_type}]</span>
                              <p className="text-text-primary">{q.question_text}</p>
                              <span className="text-xs text-text-muted">{q.max_points} pt(s)</span>
                            </div>
                            <div className="flex gap-1">
                              <button onClick={() => { setEditingQuestion(q); setQuestionForm({ question_type: q.question_type, question_text: q.question_text, options: q.options || [{ text: '', is_correct: false }], correct_answer: q.correct_answer || '', max_points: q.max_points }); }} className="text-xs text-blue-600 hover:underline">Edit</button>
                              <button onClick={() => handleDeleteQuestion(q.id)} className="text-xs text-red-600 hover:underline">Del</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Student Submission Modal */}
        {showSubmissionForm && (
          <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4" onClick={() => setShowSubmissionForm(null)}>
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-semibold text-text-primary">Submit Assignment</h3>
                <button onClick={() => setShowSubmissionForm(null)} className="text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 space-y-4">
                {submissionAnswers.length === 0 ? <p className="text-text-muted text-center">No questions to answer.</p> : submissionAnswers.map((answer, i) => {
                  const question = assignmentQuestions[i] || {};
                  return (
                    <div key={answer.question_id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-sm font-medium text-text-primary mb-2">{i + 1}. {question.question_text}</p>
                      {question.question_type === 'mcq' && question.options && question.options.map((opt, j) => (
                        <label key={j} className="flex items-center gap-2 mb-1 text-sm"><input type="radio" name={`q_${answer.question_id}`} checked={answer.selected_option === opt.text} onChange={() => { const ans = [...submissionAnswers]; ans[i] = { ...ans[i], selected_option: opt.text }; setSubmissionAnswers(ans); }} className="w-4 h-4" />{opt.text}</label>
                      ))}
                      {question.question_type === 'true_false' && (
                        <div className="flex gap-4">
                          {['true', 'false'].map(val => (<label key={val} className="flex items-center gap-1 text-sm"><input type="radio" name={`q_${answer.question_id}`} checked={answer.selected_option === val} onChange={() => { const ans = [...submissionAnswers]; ans[i] = { ...ans[i], selected_option: val }; setSubmissionAnswers(ans); }} className="w-4 h-4" />{val.charAt(0).toUpperCase() + val.slice(1)}</label>))}
                        </div>
                      )}
                      {(question.question_type === 'fill_blank' || question.question_type === 'theory') && (
                        <textarea value={answer.answer_text} onChange={e => { const ans = [...submissionAnswers]; ans[i] = { ...ans[i], answer_text: e.target.value }; setSubmissionAnswers(ans); }} rows={question.question_type === 'theory' ? 6 : 2} className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-gray-600 text-text-primary text-sm" placeholder={question.question_type === 'theory' ? 'Write your answer here...' : 'Type your answer...'} />
                      )}
                    </div>
                  );
                })}
                <button onClick={() => handleSubmitAssignment(showSubmissionForm)} className="w-full flex items-center justify-center gap-2 py-2.5 bg-success text-white rounded-lg hover:bg-success/90"><Send className="w-4 h-4" /> Submit Assignment</button>
              </div>
            </div>
          </div>
        )}

        {/* Grading View Modal */}
        {showGradingView && (
          <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4" onClick={() => setShowGradingView(null)}>
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-semibold text-text-primary">Submissions</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleAutoGrade(showGradingView)} className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200">Auto-Grade</button>
                  <button onClick={() => setShowGradingView(null)} className="text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {submissions.length === 0 ? <p className="text-text-muted text-center">No submissions yet.</p> : submissions.map(sub => (
                  <div key={sub.id} className="p-3 bg-white dark:bg-gray-700 rounded border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-text-primary text-sm">{sub.student?.profile?.data?.first_name || ''} {sub.student?.profile?.data?.last_name || sub.student?.email}</p>
                        <p className="text-xs text-text-muted">Submitted: {sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : 'N/A'} • Status: {sub.status}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${sub.status === 'graded' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {sub.status === 'graded' ? `${sub.score}/${sub.max_score}` : 'Pending'}
                      </span>
                    </div>
                    {sub.status !== 'graded' && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                        <input type="number" placeholder="Score" value={gradingScore} onChange={e => setGradingScore(e.target.value)} className="w-20 px-2 py-1 border border-border rounded text-sm bg-white dark:bg-gray-600 text-text-primary" min="0" max={sub.max_score} step="0.5" />
                        <input type="text" placeholder="Feedback" value={gradingFeedback} onChange={e => setGradingFeedback(e.target.value)} className="flex-1 px-2 py-1 border border-border rounded text-sm bg-white dark:bg-gray-600 text-text-primary" />
                        <button onClick={() => handleGradeSubmission(sub.id)} className="px-3 py-1 bg-success text-white rounded text-sm">Grade</button>
                      </div>
                    )}
                    {sub.feedback && <p className="text-xs text-text-muted mt-1 italic">Feedback: {sub.feedback}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}