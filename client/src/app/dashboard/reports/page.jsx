'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { 
  BarChart3, Users, FileText, Key, Search, 
  Filter, Download, CheckCircle, 
  Plus
} from 'lucide-react';
import { academicApi } from '@/lib/academic-api';
import { resultApi } from '@/lib/result-api';
import { useToast } from '@/contexts/ToastProvider';

export default function ReportsPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('gradebook');
  const [loading, setLoading] = useState(false);
  const [grades, setGrades] = useState([]);
  const [reportCards, setReportCards] = useState([]);
  const [pins, setPins] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [terms, setTerms] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    grade_level_id: '',
    subject_id: '',
    term_id: '',
  });

  // --- Filtered lists (client-side search) ---
  const filteredGrades = grades.filter(g => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      g.student?.profile?.data?.first_name?.toLowerCase().includes(q) ||
      g.student?.profile?.data?.last_name?.toLowerCase().includes(q) ||
      g.student?.profile?.data?.admission_number?.toLowerCase().includes(q) ||
      g.subject?.name?.toLowerCase().includes(q)
    );
  });

  const filteredReportCards = reportCards.filter(rc => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      rc.student?.profile?.data?.first_name?.toLowerCase().includes(q) ||
      rc.student?.profile?.data?.last_name?.toLowerCase().includes(q) ||
      rc.student?.profile?.data?.admission_number?.toLowerCase().includes(q)
    );
  });

  const filteredPins = pins.filter(p => {
    if (!searchQuery) return true;
    return p.pin.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // --- Data Fetching ---
  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'gradebook') fetchGrades();
    if (activeTab === 'report_cards') fetchReportCards();
    if (activeTab === 'pins') fetchPins();
  }, [activeTab, filters]);

  const fetchInitialData = async () => {
    try {
      const [glRes, subRes, termRes] = await Promise.all([
        academicApi.gradeLevels.getAll().catch(() => ({ grade_levels: [] })),
        academicApi.subjects.getAll().catch(() => ({ subjects: [] })),
        academicApi.terms.getActive().catch(() => ({ terms: [] })),
      ]);
      setGradeLevels(glRes.grade_levels || glRes.data || []);
      setSubjects(subRes.subjects || subRes.data || []);
      setTerms(termRes.terms || termRes.data || []);
    } catch (error) {
      console.error('Error fetching filter data:', error);
    }
  };

  const fetchGrades = async () => {
    setLoading(true);
    try {
      const res = await resultApi.grades.getAll(filters);
      setGrades(res.data || []);
    } catch (error) {
      const errData = error?.data;
      const msg = errData?.message || error?.message || 'Failed to compute overall results';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const fetchPins = async () => {
    setLoading(true);
    try {
      const res = await resultApi.pins.getAll();
      setPins(res.data || []);
    } catch (error) {
      toast.error('Failed to load PINs');
    } finally {
      setLoading(false);
    }
  };

  const fetchReportCards = async () => {
    setLoading(true);
    try {
      const res = await resultApi.reports.getAll(filters);
      setReportCards(res.data || []);
    } catch (error) {
      toast.error('Failed to load report cards');
    } finally {
      setLoading(false);
    }
  };


  const handleGenerateReports = async () => {
    if (!filters.grade_level_id || !filters.term_id) {
      toast.error('Please select Grade Level and Term');
      return;
    }
    setLoading(true);
    try {
      await resultApi.reports.generate(filters);
      toast.success('Report cards generated successfully');
      fetchReportCards();
    } catch (error) {
      toast.error('Failed to generate report cards');
    } finally {
      setLoading(false);
    }
  };


  const handleGeneratePins = async () => {
    const count = prompt('How many PINs would you like to generate? (Max 500)', '50');
    if (!count) return;
    setLoading(true);
    try {
      await resultApi.pins.generate(parseInt(count));
      toast.success('PINs generated successfully');
      fetchPins();
    } catch (error) {
      toast.error('Failed to generate PINs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Reports & Grades" subtitle="Manage student performance and results" role="admin">
      <div className="space-y-6">

        {/* Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Students', value: [...new Set(grades.map(g => g.student_id))].length || 0, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Processed', value: `${reportCards.length > 0 ? Math.round((reportCards.filter(rc => rc.pdf_url).length / reportCards.length) * 100) : 0}%`, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
            { label: 'Reports', value: reportCards.length, icon: FileText, color: 'text-purple-400', bg: 'bg-purple-500/10' },
            { label: 'PINs Available', value: pins.filter(p => !p.used).length, icon: Key, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-bg-card p-4 rounded-card border border-white/5 shadow-soft flex items-center space-x-4"
            >
              <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-text-secondary text-sm">{stat.label}</p>
                <h3 className="text-2xl font-bold text-text-main">{stat.value}</h3>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Controls Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-bg-card p-4 rounded-card border border-white/5 shadow-soft">
          {/* Tabs */}
          <div className="flex items-center space-x-2 w-full md:w-auto">
            {[
              { id: 'gradebook', label: 'Gradebook', icon: BarChart3 },
              { id: 'report_cards', label: 'Report Cards', icon: FileText },
              { id: 'pins', label: 'Result PINs', icon: Key },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'text-text-secondary hover:bg-white/5 hover:text-text-main'
                }`}
              >
                <tab.icon size={16} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Right: Search + Filter + Actions */}
          <div className="flex items-center space-x-3 w-full md:w-auto">
            {/* Internal Search Bar */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-text-main focus:outline-none focus:border-primary transition-all"
              />
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-all ${
                showFilters
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'bg-white/5 border border-white/10 text-text-secondary hover:text-text-main hover:bg-white/10'
              }`}
            >
              <Filter size={20} />
            </button>

            {/* Action Buttons */}
            {activeTab === 'report_cards' && (
              <div className="flex space-x-2">
                <button
                  onClick={handleGenerateReports}
                  disabled={loading}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-primary to-primary-light text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  <FileText size={16} />
                  <span>Generate</span>
                </button>
              </div>
            )}
            {activeTab === 'pins' && (
              <button
                onClick={handleGeneratePins}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-primary to-primary-light text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                <Plus size={18} />
                <span>Generate PINs</span>
              </button>
            )}
          </div>
        </div>

        {/* Animated Filter Panel */}
        <AnimatePresence onExitComplete={() => {
          setFilters({ grade_level_id: '', subject_id: '', term_id: '' });
          setSearchQuery('');
        }}>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="bg-bg-card p-4 rounded-card border border-white/5 shadow-soft grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Grade Level</label>
                  <select
                    value={filters.grade_level_id}
                    onChange={(e) => setFilters(prev => ({ ...prev, grade_level_id: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-text-main focus:outline-none focus:border-primary transition-all"
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
                    onChange={(e) => setFilters(prev => ({ ...prev, subject_id: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-text-main focus:outline-none focus:border-primary transition-all"
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
                    onChange={(e) => setFilters(prev => ({ ...prev, term_id: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-text-main focus:outline-none focus:border-primary transition-all"
                  >
                    <option value="">All Terms</option>
                    {terms.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Card */}
        <div className="bg-bg-card rounded-card border border-white/5 shadow-soft overflow-hidden">
          <div className="p-6">

            {/* Gradebook Tab */}
            {activeTab === 'gradebook' && (
              <div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5 text-text-secondary text-xs uppercase tracking-wider">
                      <th className="px-4 py-3 font-medium">Student</th>
                      <th className="px-4 py-3 font-medium">Subject</th>
                      <th className="px-4 py-3 font-medium">CA Score</th>
                      <th className="px-4 py-3 font-medium">Exam Score</th>
                      <th className="px-4 py-3 font-medium">Total</th>
                      <th className="px-4 py-3 font-medium">Grade</th>
                      <th className="px-4 py-3 font-medium">Position</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredGrades.length > 0 ? filteredGrades.map((grade) => (
                      <tr key={grade.id} className="hover:bg-white/2 transition-colors">
                        <td className="px-4 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                              {grade.student?.profile?.data?.first_name?.[0] || 'S'}
                            </div>
                            <div>
                              <p className="text-text-main font-medium text-sm">
                                {grade.student?.profile?.data?.first_name} {grade.student?.profile?.data?.last_name}
                              </p>
                              <p className="text-text-secondary text-xs">{grade.student?.profile?.data?.admission_number}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-text-main text-sm">{grade.subject?.name}</td>
                        <td className="px-4 py-4 text-text-main text-sm font-medium">{grade.ca_score}</td>
                        <td className="px-4 py-4 text-text-main text-sm font-medium">{grade.exam_score}</td>
                        <td className="px-4 py-4">
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded font-bold text-sm">
                            {grade.total_score}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            grade.grade === 'A' ? 'bg-green-500/10 text-green-500' :
                            grade.grade === 'B' ? 'bg-blue-500/10 text-blue-500' :
                            grade.grade === 'F' ? 'bg-red-500/10 text-red-500' :
                            'bg-yellow-500/10 text-yellow-500'
                          }`}>
                            {grade.grade}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-text-secondary text-sm">
                          {grade.position}{grade.position === 1 ? 'st' : grade.position === 2 ? 'nd' : grade.position === 3 ? 'rd' : 'th'}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="7" className="px-4 py-20 text-center text-text-secondary">
                          {searchQuery ? 'No grades match your search.' : 'No grades found. Try adjusting your filters or click "Compute".'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              </div>
            )}

            {/* Result PINs Tab */}
            {activeTab === 'pins' && (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredPins.map((pin) => (
                  <div key={pin.id} className={`p-4 rounded-xl border border-white/5 shadow-soft transition-all ${
                    pin.used ? 'bg-white/2 opacity-60' : 'bg-primary/5 border-primary/20 hover:scale-105'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <Key size={16} className={pin.used ? 'text-text-secondary' : 'text-primary'} />
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        pin.used ? 'bg-white/5 text-text-secondary' : 'bg-green-500/10 text-green-500'
                      }`}>
                        {pin.used ? 'Used' : 'Available'}
                      </span>
                    </div>
                    <p className="text-xl font-mono font-bold text-text-main tracking-widest">{pin.pin}</p>
                    <p className="text-[10px] text-text-secondary mt-2">
                      Created: {new Date(pin.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
                {filteredPins.length === 0 && (
                  <div className="col-span-full py-20 text-center text-text-secondary">
                    {searchQuery ? 'No PINs match your search.' : 'No PINs generated yet.'}
                  </div>
                )}
              </div>
            )}

            {/* Report Cards Tab */}
            {activeTab === 'report_cards' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/20">
                  <div>
                    <h4 className="text-text-main font-bold">Process Class Reports</h4>
                    <p className="text-text-secondary text-sm">Generate PDF documents for the selected class.</p>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={handleGenerateReports}
                      disabled={loading}
                      className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-primary to-primary-light text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <FileText size={16} />
                      <span>Generate PDFs</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5 text-text-secondary text-xs uppercase tracking-wider">
                        <th className="px-4 py-3 font-medium">Student</th>
                        <th className="px-4 py-3 font-medium">Average</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredReportCards.length > 0 ? filteredReportCards.map((rc) => (
                        <tr key={rc.id} className="hover:bg-white/2 transition-colors">
                          <td className="px-4 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-500 flex items-center justify-center text-xs font-bold">
                                {rc.student?.profile?.data?.first_name?.[0]}
                              </div>
                              <p className="text-text-main font-medium text-sm">
                                {rc.student?.profile?.data?.first_name} {rc.student?.profile?.data?.last_name}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-text-main text-sm font-bold">{Number(rc.overall_average || 0).toFixed(2)}%</td>
                          <td className="px-4 py-4">
                            {rc.pdf_url ? (
                              <span className="flex items-center space-x-1 text-green-500 text-xs font-medium">
                                <CheckCircle size={12} />
                                <span>Generated</span>
                              </span>
                            ) : (
                              <span className="text-text-secondary text-xs">Pending PDF</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            {rc.pdf_url && (
                              <a
                                href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${rc.pdf_url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center space-x-1 text-primary hover:underline text-sm font-medium"
                              >
                                <Download size={16} />
                                <span>Download</span>
                              </a>
                            )}
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="5" className="px-4 py-20 text-center text-text-secondary">
                            {searchQuery ? 'No report cards match your search.' : 'No report cards found for the selected filters. Click "Generate PDFs" to create them if grades are available.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
