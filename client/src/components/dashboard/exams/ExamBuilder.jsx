'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ChevronRight, ChevronLeft, Save, Plus, 
  Trash2, Sparkles, AlertCircle, CheckCircle, 
  Calendar, Clock, Award, ClipboardList, Send
} from 'lucide-react';
import { examsApi } from '@/lib/exams-api';
import { academicApi } from '@/lib/academic-api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function ExamBuilder({ isOpen, onClose, onExamCreated, initialExam = null }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [terms, setTerms] = useState([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject_id: '',
    grade_level_id: '',
    term_id: '',
    is_ca_test: false,
    week_number: '',
    duration_minutes: 60,
    start_at: '',
    end_at: '',
    type: 'MCQ',
  });

  const [questions, setQuestions] = useState([]);
  const [activeQuestion, setActiveQuestion] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchInitialData();
      if (initialExam) {
        setFormData({
          id: initialExam.id,
          title: initialExam.title,
          description: initialExam.description || '',
          subject_id: initialExam.subject_id,
          grade_level_id: initialExam.grade_level_id,
          term_id: initialExam.term_id,
          is_ca_test: initialExam.is_ca_test,
          week_number: initialExam.week_number || '',
          duration_minutes: initialExam.duration_minutes,
          start_at: initialExam.start_at ? initialExam.start_at.substring(0, 16) : '',
          end_at: initialExam.end_at ? initialExam.end_at.substring(0, 16) : '',
          type: initialExam.type || 'MCQ',
        });
        if (initialExam.questions) setQuestions(initialExam.questions);
        setStep(1);
      } else {
        setFormData({
          title: '',
          description: '',
          subject_id: '',
          grade_level_id: '',
          term_id: '',
          is_ca_test: false,
          week_number: '',
          duration_minutes: 60,
          start_at: '',
          end_at: '',
          type: 'MCQ',
        });
        setQuestions([]);
        setStep(1);
      }
      setActiveQuestion(null);
    }
  }, [isOpen, initialExam]);

  const fetchInitialData = async () => {
    try {
      const [glRes, subRes, termRes] = await Promise.all([
        academicApi.gradeLevels.getAll(),
        academicApi.subjects.getAll(),
        academicApi.terms.getActive(),
      ]);
      setGradeLevels(glRes.grade_levels || glRes.data || []);
      setSubjects(subRes.subjects || subRes.data || []);
      setTerms(termRes.terms || termRes.data || []);
    } catch (error) {
      toast.error('Failed to load form data');
    }
  };

  const handleCreateHeader = async () => {
    if (!formData.title || !formData.subject_id || !formData.grade_level_id || !formData.term_id) {
      toast.error('Please fill all required fields');
      return;
    }
    setLoading(true);
    try {
      let exam;
      if (formData.id || (initialExam && initialExam.id)) {
        const res = await examsApi.updateExam(formData.id || initialExam.id, formData);
        exam = res.data;
      } else {
        const res = await examsApi.createExam(formData);
        exam = res.data;
      }
      setFormData(prev => ({ ...prev, id: exam.id }));
      setStep(2);
    } catch (error) {
      toast.error(error.data?.message || error.message || 'Failed to save exam details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = (type = 'mcq') => {
    const newQuestion = {
      id: Date.now(),
      type,
      question_text: '',
      options: type === 'mcq' ? ['', '', '', ''] : null,
      correct_answer: type === 'mcq' ? '' : '',
      marks: type === 'mcq' ? 1 : 5,
    };
    setQuestions([...questions, newQuestion]);
    setActiveQuestion(newQuestion.id);
  };

  const handleUpdateQuestion = (id, field, value) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const handleRemoveQuestion = (id) => {
    setQuestions(questions.filter(q => q.id !== id));
    if (activeQuestion === id) setActiveQuestion(null);
  };

  const handleSyncQuestions = async () => {
    setLoading(true);
    try {
      await examsApi.syncQuestions(formData.id || initialExam.id, questions);
      setStep(3);
    } catch (error) {
      toast.error('Failed to sync questions');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    setLoading(true);
    try {
      await examsApi.publishExam(formData.id || initialExam.id);
      toast.success('Exam published successfully!');
      onExamCreated();
      onClose();
    } catch (error) {
      toast.error('Failed to publish exam');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    setLoading(true);
    try {
      if (step === 1) {
        let exam;
        if (formData.id || (initialExam && initialExam.id)) {
          const res = await examsApi.updateExam(formData.id || initialExam.id, formData);
          exam = res.data;
        } else {
          const res = await examsApi.createExam(formData);
          exam = res.data;
        }
        setFormData(prev => ({ ...prev, id: exam.id }));
        toast.success('Exam draft header saved');
      } else if (step === 2) {
        await examsApi.syncQuestions(formData.id, questions);
        toast.success('Questions saved to draft');
      }
      onExamCreated?.();
      onClose();
    } catch (error) {
      toast.error('Failed to save draft');
    } finally {
      setLoading(false);
    }
  };

  const handleAiGenerate = async () => {
    if (!formData.subject_id || !formData.grade_level_id) {
      toast.error('Please select subject and grade level first');
      return;
    }

    setLoading(true);
    try {
      const res = await examsApi.generateExamAI({
        subject_id: formData.subject_id,
        grade_level_id: formData.grade_level_id,
        topics: [formData.title], // Use title as primary topic for now
        mcq_count: 5,
        theory_count: 2,
      });

      const generatedQuestions = (res.exam?.questions || res.data?.questions || []).map(q => ({
        ...q,
        id: Date.now() + Math.random(),
      }));

      setQuestions([...questions, ...generatedQuestions]);
      toast.success('AI generated questions added!');
    } catch (error) {
      toast.error('AI generation failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-4xl bg-bg-card rounded-card border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-primary/10 to-transparent">
          <div>
            <h2 className="text-2xl font-bold text-text-main flex items-center space-x-2">
              <ClipboardList className="text-primary" />
              <span>{initialExam ? 'Edit' : 'Create'} Examination</span>
            </h2>
            <div className="flex items-center space-x-4 mt-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center space-x-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    step === s ? 'bg-primary text-white' : step > s ? 'bg-green-500 text-white' : 'bg-white/5 text-text-secondary'
                  }`}>
                    {step > s ? <CheckCircle size={14} /> : s}
                  </div>
                  <span className={`text-xs font-medium ${step === s ? 'text-text-main' : 'text-text-secondary'}`}>
                    {s === 1 ? 'Details' : s === 2 ? 'Questions' : 'Publish'}
                  </span>
                  {s < 3 && <div className="w-8 h-[1px] bg-white/5" />}
                </div>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-text-secondary hover:text-text-main hover:bg-white/5 rounded-lg transition-all">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Exam Title</label>
                    <input
                      type="text"
                      placeholder="e.g. First Term Mathematics Exam"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-text-main focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Assessment Type</label>
                    <select
                      value={formData.is_ca_test ? 'ca' : 'final'}
                      onChange={(e) => setFormData({ ...formData, is_ca_test: e.target.value === 'ca' })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-text-main focus:outline-none focus:border-primary"
                    >
                      <option value="final">Final Examination</option>
                      <option value="ca">Continuous Assessment (CA)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Grade Level</label>
                    <select
                      value={formData.grade_level_id}
                      onChange={(e) => setFormData({ ...formData, grade_level_id: e.target.value })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-text-main focus:outline-none focus:border-primary"
                    >
                      <option value="">Select Grade</option>
                      {gradeLevels.map(gl => <option key={gl.id} value={gl.id}>{gl.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Subject</label>
                    <select
                      value={formData.subject_id}
                      onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-text-main focus:outline-none focus:border-primary"
                    >
                      <option value="">Select Subject</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Term</label>
                    <select
                      value={formData.term_id}
                      onChange={(e) => setFormData({ ...formData, term_id: e.target.value })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-text-main focus:outline-none focus:border-primary"
                    >
                      <option value="">Select Term</option>
                      {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary flex items-center space-x-2">
                      <Calendar size={14} />
                      <span>Start Date & Time</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.start_at}
                      onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-text-main focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary flex items-center space-x-2">
                      <Clock size={14} />
                      <span>Duration (Minutes)</span>
                    </label>
                    <input
                      type="number"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-text-main focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Exam Type (Format)</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-text-main focus:outline-none focus:border-primary"
                    >
                      <option value="MCQ">Multiple Choice Questions (MCQ)</option>
                      <option value="Theory">Theory / Essay</option>
                      <option value="Mixed">Mixed (MCQ + Theory)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary flex items-center space-x-2">
                      <Award size={14} />
                      <span>CA Week (Optional)</span>
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 5"
                      value={formData.week_number}
                      onChange={(e) => setFormData({ ...formData, week_number: e.target.value })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-text-main focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Instructions / Description</label>
                  <textarea
                    rows={4}
                    placeholder="Provide clear instructions for students..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-text-main focus:outline-none focus:border-primary resize-none"
                  />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
                  <div>
                    <h3 className="font-bold text-text-main">Questions ({questions.length})</h3>
                    <p className="text-xs text-text-secondary">Total Marks: {questions.reduce((sum, q) => sum + parseInt(q.marks || 0), 0)}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={handleAiGenerate}
                      disabled={loading}
                      className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-primary to-primary-light text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 disabled:opacity-50 transition-all"
                    >
                      <Sparkles size={16} />
                      <span>AI Generate</span>
                    </button>
                    <div className="flex bg-white/5 rounded-lg border border-white/10 p-1">
                      <button 
                        onClick={() => handleAddQuestion('mcq')}
                        className="px-3 py-1 text-xs font-bold text-text-secondary hover:text-text-main transition-all"
                      >
                        + MCQ
                      </button>
                      <div className="w-[1px] bg-white/10 mx-1" />
                      <button 
                        onClick={() => handleAddQuestion('theory')}
                        className="px-3 py-1 text-xs font-bold text-text-secondary hover:text-text-main transition-all"
                      >
                        + Theory
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {questions.map((q, idx) => (
                    <motion.div 
                      key={q.id}
                      layout
                      className={`p-4 rounded-xl border transition-all ${
                        activeQuestion === q.id ? 'border-primary bg-primary/5' : 'border-white/5 bg-white/2 hover:border-white/10'
                      }`}
                      onClick={() => setActiveQuestion(q.id)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <span className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center font-bold text-primary">
                            {idx + 1}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            q.type === 'mcq' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                          }`}>
                            {q.type}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1 px-2 py-1 bg-white/5 rounded-md text-xs text-text-secondary">
                            <span>Marks:</span>
                            <input 
                              type="number"
                              value={q.marks}
                              onChange={(e) => handleUpdateQuestion(q.id, 'marks', e.target.value)}
                              className="w-8 bg-transparent text-text-main focus:outline-none font-bold"
                            />
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleRemoveQuestion(q.id); }}
                            className="p-1.5 text-text-secondary hover:text-red-400 hover:bg-red-400/10 rounded-md transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <textarea
                          placeholder="Type your question here..."
                          value={q.question_text}
                          onChange={(e) => handleUpdateQuestion(q.id, 'question_text', e.target.value)}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-text-main focus:outline-none focus:border-primary text-sm resize-none"
                          rows={2}
                        />

                        {q.type === 'mcq' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {q.options.map((opt, optIdx) => (
                              <div key={optIdx} className="flex items-center space-x-2 group">
                                <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold transition-all ${
                                  q.correct_answer === opt && opt !== '' ? 'bg-green-500 text-white' : 'bg-white/5 text-text-secondary'
                                }`}>
                                  {String.fromCharCode(65 + optIdx)}
                                </div>
                                <input
                                  type="text"
                                  placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                                  value={opt}
                                  onChange={(e) => {
                                    const newOpts = [...q.options];
                                    newOpts[optIdx] = e.target.value;
                                    handleUpdateQuestion(q.id, 'options', newOpts);
                                  }}
                                  className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-text-main text-xs focus:outline-none focus:border-primary"
                                />
                                <button 
                                  onClick={() => handleUpdateQuestion(q.id, 'correct_answer', opt)}
                                  className={`p-1.5 rounded-md transition-all ${
                                    q.correct_answer === opt && opt !== '' ? 'text-green-500 bg-green-500/10' : 'text-text-secondary opacity-0 group-hover:opacity-100 hover:bg-white/5'
                                  }`}
                                >
                                  <CheckCircle size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {q.type === 'theory' && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-text-secondary uppercase">Model Answer / Grading Key</label>
                            <textarea
                              placeholder="Provide points to look for in the student's answer..."
                              value={q.correct_answer}
                              onChange={(e) => handleUpdateQuestion(q.id, 'correct_answer', e.target.value)}
                              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-text-main text-xs focus:outline-none focus:border-primary resize-none"
                              rows={3}
                            />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}

                  {questions.length === 0 && (
                    <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-2xl">
                      <Plus className="mx-auto text-text-secondary mb-4 opacity-20" size={48} />
                      <p className="text-text-secondary">No questions added yet. Use AI or add manually.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center py-10 space-y-6"
              >
                <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle size={48} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-text-main mb-2">Ready to Publish?</h3>
                  <p className="text-text-secondary max-w-md mx-auto">
                    Review your exam details and questions. Once published, students will be able to see the exam on their dashboard.
                  </p>
                </div>

                <div className="max-w-md mx-auto bg-white/5 rounded-2xl border border-white/10 p-6 text-left space-y-4">
                  <div className="flex justify-between items-center border-b border-white/5 pb-4">
                    <div>
                      <p className="text-xs text-text-secondary">Examination</p>
                      <p className="font-bold text-text-main">{formData.title}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-text-secondary">Type</p>
                      <p className="font-bold text-primary">{formData.is_ca_test ? 'CA Test' : 'Final Exam'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-text-secondary">Total Questions</p>
                      <p className="font-bold text-text-main">{questions.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary">Total Marks</p>
                      <p className="font-bold text-text-main">{questions.reduce((sum, q) => sum + parseInt(q.marks || 0), 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary">Duration</p>
                      <p className="font-bold text-text-main">{formData.duration_minutes} mins</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary">Scheduled For</p>
                      <p className="font-bold text-text-main">{formData.start_at ? format(new Date(formData.start_at), 'MMM d, h:mm a') : 'TBD'}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-white/2 flex items-center justify-between">
          <button
            onClick={() => setStep(step - 1)}
            disabled={step === 1 || loading}
            className="flex items-center space-x-2 px-6 py-2 text-text-secondary hover:text-text-main disabled:opacity-0 transition-all"
          >
            <ChevronLeft size={18} />
            <span>Back</span>
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleSaveDraft}
              disabled={loading}
              className="px-6 py-2 text-text-secondary hover:text-text-main font-bold transition-all disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Draft'}
            </button>
            {step < 3 ? (
              <button
                onClick={step === 1 ? handleCreateHeader : handleSyncQuestions}
                disabled={loading}
                className="flex items-center space-x-2 px-8 py-2 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Next</span>
                    <ChevronRight size={18} />
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleFinalize}
                disabled={loading}
                className="flex items-center space-x-2 px-10 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-bold shadow-lg shadow-green-500/20 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send size={18} />
                    <span>Publish Exam</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
