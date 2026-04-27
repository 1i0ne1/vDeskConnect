'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, AlertCircle, CheckCircle, ChevronRight, 
  ChevronLeft, Send, Info, Eye, EyeOff 
} from 'lucide-react';
import { examsApi } from '@/lib/exams-api';
import { useToast } from '@/contexts/ToastProvider';

export default function ExamPlayer({ exam, onComplete }) {
  const toast = useToast();
  const [timeLeft, setTimeLeft] = useState(exam.duration_minutes * 60);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Initialize answers
  useEffect(() => {
    const initialAnswers = {};
    exam.questions.forEach(q => {
      initialAnswers[q.id] = q.type === 'mcq' ? '' : '';
    });
    setAnswers(initialAnswers);
  }, [exam]);

  // Timer logic
  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // In a real app, we'd send to a submission endpoint
      // For now, we'll simulate it
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Examination submitted successfully!');
      onComplete();
    } catch (error) {
      toast.error('Failed to submit examination');
    } finally {
      setIsSubmitting(false);
      setShowConfirm(false);
    }
  };

  const currentQuestion = exam.questions[currentQuestionIdx];
  const progress = ((Object.values(answers).filter(a => a !== '').length) / exam.questions.length) * 100;

  return (
    <div className="min-h-screen bg-bg-main flex flex-col">
      {/* Header */}
      <header className="bg-bg-card border-b border-white/5 p-4 sticky top-0 z-30 shadow-soft">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-main">{exam.title}</h1>
            <p className="text-xs text-text-secondary">{exam.subject?.name} • {exam.grade_level?.name}</p>
          </div>

          <div className="flex items-center space-x-6">
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-xl border ${
              timeLeft < 300 ? 'bg-red-500/10 border-red-500/50 text-red-500 animate-pulse' : 'bg-white/5 border-white/10 text-text-main'
            }`}>
              <Clock size={20} />
              <span className="font-mono text-xl font-bold">{formatTime(timeLeft)}</span>
            </div>
            <button 
              onClick={() => setShowConfirm(true)}
              className="px-6 py-2 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
            >
              Finish Exam
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-4 gap-6 p-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-bg-card rounded-card border border-white/5 p-6 shadow-soft">
            <h3 className="font-bold text-text-main mb-4 flex items-center justify-between">
              <span>Progress</span>
              <span className="text-primary text-sm">{Math.round(progress)}%</span>
            </h3>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mb-6">
              <motion.div 
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
              />
            </div>

            <div className="grid grid-cols-5 gap-2">
              {exam.questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIdx(idx)}
                  className={`w-10 h-10 rounded-lg text-xs font-bold transition-all border ${
                    currentQuestionIdx === idx 
                      ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-110' 
                      : answers[q.id] !== ''
                      ? 'bg-green-500/20 border-green-500/50 text-green-500'
                      : 'bg-white/5 border-white/10 text-text-secondary hover:border-white/20'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-primary/5 rounded-card border border-primary/20 p-6">
            <h4 className="font-bold text-primary mb-2 flex items-center space-x-2">
              <Info size={16} />
              <span>Instructions</span>
            </h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              {exam.description || "Answer all questions. Do not refresh the page. The exam will auto-submit when the timer hits zero."}
            </p>
          </div>
        </div>

        {/* Question Area */}
        <div className="lg:col-span-3 space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-bg-card rounded-card border border-white/5 p-8 shadow-soft min-h-[400px] flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-sm font-bold text-primary">
                  Question {currentQuestionIdx + 1} of {exam.questions.length}
                </span>
                <span className="text-sm text-text-secondary font-medium">
                  Marks: {currentQuestion.marks}
                </span>
              </div>

              <h2 className="text-2xl font-bold text-text-main mb-8 leading-tight">
                {currentQuestion.question_text}
              </h2>

              <div className="flex-1">
                {currentQuestion.type === 'mcq' ? (
                  <div className="space-y-4">
                    {currentQuestion.options.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAnswerChange(currentQuestion.id, opt)}
                        className={`w-full p-4 rounded-xl border text-left transition-all flex items-center space-x-4 group ${
                          answers[currentQuestion.id] === opt
                            ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                            : 'bg-white/2 border-white/5 text-text-secondary hover:bg-white/5 hover:border-white/10'
                        }`}
                      >
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                          answers[currentQuestion.id] === opt
                            ? 'bg-white/20 text-white'
                            : 'bg-white/5 text-text-secondary group-hover:text-primary group-hover:bg-primary/10'
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="font-medium">{opt}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <textarea
                    value={answers[currentQuestion.id]}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    placeholder="Type your answer here..."
                    className="w-full h-64 p-6 bg-white/2 border border-white/5 rounded-2xl text-text-main focus:outline-none focus:border-primary transition-all resize-none leading-relaxed"
                  />
                )}
              </div>

              <div className="mt-12 flex items-center justify-between">
                <button
                  disabled={currentQuestionIdx === 0}
                  onClick={() => setCurrentQuestionIdx(prev => prev - 1)}
                  className="flex items-center space-x-2 px-6 py-3 text-text-secondary hover:text-text-main disabled:opacity-0 transition-all font-bold"
                >
                  <ChevronLeft size={20} />
                  <span>Previous</span>
                </button>
                
                {currentQuestionIdx === exam.questions.length - 1 ? (
                  <button
                    onClick={() => setShowConfirm(true)}
                    className="flex items-center space-x-2 px-10 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                  >
                    <span>Finish Exam</span>
                    <Send size={18} />
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
                    className="flex items-center space-x-2 px-10 py-3 bg-white/5 border border-white/10 text-text-main rounded-xl font-bold hover:bg-white/10 transition-all"
                  >
                    <span>Next</span>
                    <ChevronRight size={20} />
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => !isSubmitting && setShowConfirm(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-bg-card rounded-card border border-white/10 p-8 shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={48} />
              </div>
              <h2 className="text-2xl font-bold text-text-main mb-2">Submit Examination?</h2>
              <p className="text-text-secondary mb-8">
                You have answered {Object.values(answers).filter(a => a !== '').length} out of {exam.questions.length} questions. Are you sure you want to finish?
              </p>
              
              <div className="space-y-3">
                <button
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                  className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle size={20} />
                      <span>Yes, Submit Now</span>
                    </>
                  )}
                </button>
                <button
                  disabled={isSubmitting}
                  onClick={() => setShowConfirm(false)}
                  className="w-full py-4 bg-white/5 text-text-main rounded-xl font-bold hover:bg-white/10 transition-all"
                >
                  No, Let me review
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
