'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Filter, Calendar, ClipboardList, 
  Award, CheckCircle, Clock, MoreVertical, Edit2, 
  Trash2, Send, Eye, Users, ChevronRight, AlertCircle,
  Sparkles
} from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ExamBuilder from '@/components/dashboard/exams/ExamBuilder';
import GradingInterface from '@/components/dashboard/exams/GradingInterface';
import { examsApi } from '@/lib/exams-api';
import { academicApi } from '@/lib/academic-api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function ExamsPage() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // all, ca, final
  const [searchQuery, setSearchQuery] = useState('');
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [isGradingOpen, setIsGradingOpen] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [selectedExamForGrading, setSelectedExamForGrading] = useState(null);
  const [filters, setFilters] = useState({
    grade_level_id: '',
    subject_id: '',
    term_id: '',
  });

  const [gradeLevels, setGradeLevels] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [terms, setTerms] = useState([]);

  useEffect(() => {
    fetchInitialData();
    fetchExams();
  }, [filters, activeTab]);

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
      console.error('Error fetching filter data:', error);
    }
  };

  const fetchExams = async () => {
    setLoading(true);
    try {
      const params = { ...filters };
      if (activeTab === 'ca') params.is_ca_test = true;
      if (activeTab === 'final') params.is_ca_test = false;
      
      const res = await examsApi.getExams(params);
      setExams(res.data || []);
    } catch (error) {
      toast.error('Failed to fetch exams');
    } finally {
      setLoading(false);
    }
  };

  const filteredExams = exams.filter(exam => 
    exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exam.subject?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (exam) => {
    if (!exam.published) return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20">Draft</span>;
    
    const now = new Date();
    const start = exam.start_at ? new Date(exam.start_at) : null;
    const end = exam.end_at ? new Date(exam.end_at) : null;

    if (start && now < start) return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">Scheduled</span>;
    if (start && end && now >= start && now <= end) return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">Ongoing</span>;
    if (end && now > end) return <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">Completed</span>;
    
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">Published</span>;
  };

  const handleEdit = async (exam) => {
    setLoading(true);
    try {
      const fullExam = await examsApi.getExam(exam.id);
      setEditingExam(fullExam.data);
      setIsBuilderOpen(true);
    } catch (error) {
      toast.error('Failed to load exam details');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this exam?')) return;
    try {
      await examsApi.deleteExam(id);
      toast.success('Exam deleted');
      fetchExams();
    } catch (error) {
      toast.error('Failed to delete exam');
    }
  };

  return (
    <DashboardLayout title="Exams & Assessments" subtitle="Create and manage school examinations" role="admin">
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Exams', value: exams.length, icon: ClipboardList, color: 'text-blue-400' },
            { label: 'Active Today', value: exams.filter(e => e.published).length, icon: Clock, color: 'text-green-400' },
            { label: 'CA Tests', value: exams.filter(e => e.is_ca_test).length, icon: Award, color: 'text-yellow-400' },
            { label: 'Pending Grading', value: '12', icon: AlertCircle, color: 'text-red-400' },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-bg-card p-4 rounded-card border border-white/5 shadow-soft flex items-center space-x-4"
            >
              <div className={`p-3 rounded-lg bg-white/5 ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-text-secondary text-sm">{stat.label}</p>
                <p className="text-xl font-bold text-text-main">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-bg-card p-4 rounded-card border border-white/5 shadow-soft">
          <div className="flex items-center space-x-2 w-full md:w-auto">
            {['all', 'ca', 'final'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                    : 'text-text-secondary hover:bg-white/5 hover:text-text-main'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)} {tab === 'ca' ? 'Tests' : tab === 'final' ? 'Exams' : ''}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-4 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
              <input
                type="text"
                placeholder="Search exams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-text-main focus:outline-none focus:border-primary transition-all"
              />
            </div>
            
            <button className="p-2 bg-white/5 border border-white/10 rounded-lg text-text-secondary hover:text-text-main hover:bg-white/10 transition-all">
              <Filter size={20} />
            </button>

            <button 
              onClick={() => { setEditingExam(null); setIsBuilderOpen(true); }}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-primary to-primary-light text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
            >
              <Sparkles size={18} />
              <span>AI Builder</span>
            </button>

            <button 
              onClick={() => { setEditingExam(null); setIsBuilderOpen(true); }}
              className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
            >
              <Plus size={18} />
              <span>Create Exam</span>
            </button>
          </div>
        </div>

        {/* Exams List */}
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence mode="popLayout">
            {loading && !isBuilderOpen ? (
              <div className="col-span-full py-20 flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-text-secondary">Loading examinations...</p>
              </div>
            ) : filteredExams.length > 0 ? (
              filteredExams.map((exam, i) => (
                <motion.div
                  key={exam.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                  className="group bg-bg-card p-5 rounded-card border border-white/5 shadow-soft hover:border-primary/30 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4" onClick={() => handleEdit(exam)}>
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        exam.is_ca_test ? 'bg-yellow-500/10 text-yellow-500' : 'bg-blue-500/10 text-blue-500'
                      }`}>
                        {exam.is_ca_test ? <Award size={24} /> : <ClipboardList size={24} />}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-text-main font-bold text-lg">{exam.title}</h3>
                          {getStatusBadge(exam)}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-text-secondary">
                          <span className="flex items-center space-x-1">
                            <Users size={14} />
                            <span>{exam.grade_level?.name}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <CheckCircle size={14} />
                            <span>{exam.subject?.name}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Clock size={14} />
                            <span>{exam.duration_minutes} mins</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right hidden md:block">
                        <p className="text-text-main font-medium">{exam.start_at ? format(new Date(exam.start_at), 'MMM d, h:mm a') : 'Not scheduled'}</p>
                        <p className="text-text-secondary text-xs">{exam.term?.name}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-all" 
                          title="View Details"
                          onClick={() => handleEdit(exam)}
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          className="p-2 text-text-secondary hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all" 
                          title="Edit Exam"
                          onClick={() => handleEdit(exam)}
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          className="p-2 text-text-secondary hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all" 
                          title="Delete Exam"
                          onClick={() => handleDelete(exam.id)}
                        >
                          <Trash2 size={18} />
                        </button>
                        <button 
                          className="p-2 text-text-secondary hover:text-green-400 hover:bg-green-400/10 rounded-lg transition-all" 
                          title="View Submissions"
                          onClick={() => { setSelectedExamForGrading(exam); setIsGradingOpen(true); }}
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-20 text-center bg-bg-card rounded-card border border-white/5 border-dashed">
                <ClipboardList className="mx-auto text-text-secondary mb-4 opacity-20" size={64} />
                <h3 className="text-xl font-bold text-text-main mb-2">No examinations found</h3>
                <p className="text-text-secondary max-w-md mx-auto mb-6">
                  {searchQuery || Object.values(filters).some(v => v) 
                    ? "Adjust your filters or search query to find what you're looking for." 
                    : "Get started by creating your first exam or use the AI builder to generate one in seconds."}
                </p>
                <div className="flex items-center justify-center space-x-4">
                  <button 
                    onClick={() => { setEditingExam(null); setIsBuilderOpen(true); }}
                    className="px-6 py-2 bg-primary text-white rounded-lg font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                  >
                    Create Exam
                  </button>
                  <button 
                    onClick={() => { setFilters({ grade_level_id: '', subject_id: '', term_id: '' }); setSearchQuery(''); }}
                    className="px-6 py-2 bg-white/5 text-text-main rounded-lg font-bold border border-white/10 hover:bg-white/10 transition-all"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <ExamBuilder 
        isOpen={isBuilderOpen} 
        onClose={() => { setIsBuilderOpen(false); setEditingExam(null); }} 
        onExamCreated={fetchExams}
        initialExam={editingExam}
      />

      {isGradingOpen && (
        <GradingInterface 
          exam={selectedExamForGrading}
          onClose={() => { setIsGradingOpen(false); setSelectedExamForGrading(null); }}
        />
      )}
    </DashboardLayout>
  );
}
