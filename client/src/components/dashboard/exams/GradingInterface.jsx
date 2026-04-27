'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, CheckCircle, AlertCircle, Save, 
  ChevronRight, ArrowLeft, User, Award, 
  ClipboardCheck, MessageSquare 
} from 'lucide-react';
import { examsApi } from '@/lib/exams-api';
import { useToast } from '@/contexts/ToastProvider';

export default function GradingInterface({ exam, onClose }) {
  const toast = useToast();
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gradingData, setGradingData] = useState({}); // { answerId: { score, feedback } }

  useEffect(() => {
    fetchSubmissions();
  }, [exam]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const res = await examsApi.getSubmissions(exam.id);
      setSubmissions(res.data || []);
    } catch (error) {
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleViewSubmission = async (submission) => {
    setLoading(true);
    try {
      const res = await examsApi.getSubmissionDetails(submission.id);
      setSelectedSubmission(res.data);
      
      // Initialize grading data
      const initialGrading = {};
      res.data.answers.forEach(ans => {
        if (ans.question.type === 'theory') {
          initialGrading[ans.id] = { 
            score: ans.score || 0, 
            feedback: ans.feedback || '' 
          };
        }
      });
      setGradingData(initialGrading);
    } catch (error) {
      toast.error('Failed to load submission details');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (answerId, field, value) => {
    setGradingData(prev => ({
      ...prev,
      [answerId]: { ...prev[answerId], [field]: value }
    }));
  };

  const handleSubmitGrades = async () => {
    setLoading(true);
    try {
      // Prepare grading payload
      const gradingArray = Object.keys(gradingData).map(answerId => ({
        answer_id: parseInt(answerId),
        score: parseFloat(gradingData[answerId].score),
        feedback: gradingData[answerId].feedback
      }));

      await examsApi.gradeSubmission(selectedSubmission.id, gradingArray);
      toast.success('Grading saved successfully!');
      setSelectedSubmission(null);
      fetchSubmissions();
    } catch (error) {
      toast.error('Failed to save grades');
    } finally {
      setLoading(false);
    }
  };

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
        className="relative w-full max-w-5xl bg-bg-card rounded-card border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-primary/10 to-transparent">
          <div className="flex items-center space-x-4">
            {selectedSubmission && (
              <button 
                onClick={() => setSelectedSubmission(null)}
                className="p-2 hover:bg-white/5 rounded-lg transition-all"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div>
              <h2 className="text-2xl font-bold text-text-main flex items-center space-x-2">
                <ClipboardCheck className="text-primary" />
                <span>{selectedSubmission ? 'Reviewing Submission' : 'Grading Dashboard'}</span>
              </h2>
              <p className="text-sm text-text-secondary">{exam.title} • {exam.subject?.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-text-secondary hover:text-text-main hover:bg-white/5 rounded-lg transition-all">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          {loading && !selectedSubmission ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-text-secondary">Loading submissions...</p>
            </div>
          ) : selectedSubmission ? (
            /* Individual Submission View */
            <div className="space-y-8 pb-10">
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/20 text-primary rounded-full flex items-center justify-center font-bold text-xl">
                    {selectedSubmission.student?.name?.charAt(0) || <User />}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-text-main">{selectedSubmission.student?.name}</h3>
                    <p className="text-sm text-text-secondary">Submitted on {new Date(selectedSubmission.submitted_at).toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-text-secondary mb-1">Current Score</div>
                  <div className="text-3xl font-black text-primary">
                    {selectedSubmission.total_score} <span className="text-sm text-text-secondary">/ {exam.total_marks}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {selectedSubmission.answers.map((ans, idx) => (
                  <div key={ans.id} className="bg-white/2 border border-white/5 rounded-2xl overflow-hidden">
                    <div className="p-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-bold text-sm">
                          {idx + 1}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          ans.question.type === 'mcq' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                        }`}>
                          {ans.question.type}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4">
                        {ans.question.type === 'mcq' ? (
                          <div className={`flex items-center space-x-2 font-bold ${ans.score > 0 ? 'text-green-500' : 'text-red-400'}`}>
                            {ans.score > 0 ? <CheckCircle size={16} /> : <X size={16} />}
                            <span>{ans.score} / {ans.question.marks} Marks</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-text-secondary font-medium uppercase tracking-wider">Score:</span>
                            <div className="flex items-center bg-white/10 rounded-lg p-1">
                              <input 
                                type="number"
                                max={ans.question.marks}
                                min={0}
                                step={0.5}
                                value={gradingData[ans.id]?.score}
                                onChange={(e) => handleGradeChange(ans.id, 'score', e.target.value)}
                                className="w-12 bg-transparent text-center font-bold text-primary focus:outline-none"
                              />
                              <span className="px-2 text-xs text-text-secondary border-l border-white/10">/ {ans.question.marks}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-6 space-y-6">
                      <div>
                        <p className="text-xs text-text-secondary font-bold uppercase tracking-widest mb-2">Question</p>
                        <p className="text-text-main font-medium text-lg">{ans.question.question_text}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                          <p className="text-[10px] text-text-secondary font-bold uppercase mb-2">Student's Answer</p>
                          <p className={`text-sm ${ans.question.type === 'mcq' ? (ans.score > 0 ? 'text-green-400' : 'text-red-400') : 'text-text-main'}`}>
                            {ans.answer_text || 'No answer provided'}
                          </p>
                        </div>
                        <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                          <p className="text-[10px] text-primary font-bold uppercase mb-2">Model Answer / Key</p>
                          <p className="text-sm text-text-secondary italic">
                            {ans.question.correct_answer}
                          </p>
                        </div>
                      </div>

                      {ans.question.type === 'theory' && (
                        <div className="space-y-2">
                          <label className="text-[10px] text-text-secondary font-bold uppercase tracking-widest flex items-center space-x-2">
                            <MessageSquare size={12} />
                            <span>Teacher Feedback</span>
                          </label>
                          <textarea
                            rows={3}
                            placeholder="Provide constructive feedback for the student..."
                            value={gradingData[ans.id]?.feedback}
                            onChange={(e) => handleGradeChange(ans.id, 'feedback', e.target.value)}
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-text-main text-sm focus:outline-none focus:border-primary resize-none"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Submissions List View */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {submissions.length > 0 ? (
                submissions.map((sub, i) => (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-bg-card p-5 rounded-2xl border border-white/5 shadow-soft hover:border-primary/30 transition-all cursor-pointer group"
                    onClick={() => handleViewSubmission(sub)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center font-bold text-primary group-hover:bg-primary/10 transition-all">
                          {sub.student?.name?.charAt(0) || <User />}
                        </div>
                        <div>
                          <h3 className="font-bold text-text-main group-hover:text-primary transition-all">{sub.student?.name}</h3>
                          <p className="text-xs text-text-secondary">Submitted {new Date(sub.submitted_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-text-secondary mb-1">Status</div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          sub.status === 'graded' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
                        }`}>
                          {sub.status}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <Award size={14} className="text-primary" />
                        <span className="text-sm font-bold text-text-main">{sub.total_score} / {exam.total_marks}</span>
                      </div>
                      <button className="flex items-center space-x-1 text-primary text-xs font-bold uppercase tracking-wider group-hover:translate-x-1 transition-all">
                        <span>Grade Now</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-2xl">
                  <AlertCircle className="mx-auto text-text-secondary mb-4 opacity-20" size={48} />
                  <p className="text-text-secondary">No submissions found for this exam yet.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-white/2 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-6 py-2 text-text-secondary hover:text-text-main font-bold transition-all"
          >
            Close
          </button>

          {selectedSubmission && (
            <button
              onClick={handleSubmitGrades}
              disabled={loading}
              className="flex items-center space-x-2 px-8 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={18} />
                  <span>Finalize & Save Grades</span>
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
