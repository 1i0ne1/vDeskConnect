'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { 
  BarChart3, Users, FileText, Key, Search, 
  Filter, Download, RefreshCcw, CheckCircle, 
  AlertCircle, ChevronRight, MoreVertical, Plus
} from 'lucide-react';
import { academicApi } from '@/lib/academic-api';
import { resultApi } from '@/lib/result-api';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('gradebook');
  const [loading, setLoading] = useState(false);
  const [grades, setGrades] = useState([]);
  const [reportCards, setReportCards] = useState([]);
  const [pins, setPins] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [terms, setTerms] = useState([]);
  
  const [filters, setFilters] = useState({
    grade_level_id: '',
    subject_id: '',
    term_id: '',
  });

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
        academicApi.gradeLevels.getAll(),
        academicApi.subjects.getAll(),
        academicApi.terms.getActive(),
      ]);
      setGradeLevels(glRes.grade_levels || []);
      setSubjects(subRes.subjects || []);
      setTerms(termRes.terms || []);
    } catch (error) {
      console.error('Error fetching filter data:', error);
    }
  };

  const fetchGrades = async () => {
    if (!filters.grade_level_id || !filters.term_id) return;
    setLoading(true);
    try {
      const res = await resultApi.grades.getAll(filters);
      setGrades(res.data || []);
    } catch (error) {
      toast.error('Failed to load grades');
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
    if (!filters.grade_level_id || !filters.term_id) return;
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

  const handleComputeOverall = async () => {
    if (!filters.grade_level_id || !filters.term_id) {
      toast.error('Please select Grade Level and Term');
      return;
    }
    setLoading(true);
    try {
      await resultApi.grades.computeOverall(filters);
      toast.success('Overall positions calculated');
      fetchReportCards();
    } catch (error) {
      toast.error('Failed to calculate positions');
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

  const handleCompute = async () => {
    if (!filters.grade_level_id || !filters.term_id) {
      toast.error('Please select Grade Level and Term');
      return;
    }
    setLoading(true);
    try {
      await resultApi.grades.compute(filters);
      toast.success('Grades computed successfully');
      fetchGrades();
    } catch (error) {
      toast.error('Failed to compute grades');
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-bg-card p-6 rounded-card border border-white/5 shadow-soft flex items-center space-x-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Users size={24} />
            </div>
            <div>
              <p className="text-text-secondary text-xs font-medium uppercase tracking-wider">Students</p>
              <h3 className="text-2xl font-bold text-text-main">1,240</h3>
            </div>
          </div>
          <div className="bg-bg-card p-6 rounded-card border border-white/5 shadow-soft flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-text-secondary text-xs font-medium uppercase tracking-wider">Processed</p>
              <h3 className="text-2xl font-bold text-text-main">85%</h3>
            </div>
          </div>
          <div className="bg-bg-card p-6 rounded-card border border-white/5 shadow-soft flex items-center space-x-4">
            <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500">
              <FileText size={24} />
            </div>
            <div>
              <p className="text-text-secondary text-xs font-medium uppercase tracking-wider">Reports</p>
              <h3 className="text-2xl font-bold text-text-main">920</h3>
            </div>
          </div>
          <div className="bg-bg-card p-6 rounded-card border border-white/5 shadow-soft flex items-center space-x-4">
            <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center text-yellow-500">
              <Key size={24} />
            </div>
            <div>
              <p className="text-text-secondary text-xs font-medium uppercase tracking-wider">PINs Available</p>
              <h3 className="text-2xl font-bold text-text-main">{pins.filter(p => !p.used).length}</h3>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-bg-card rounded-card border border-white/5 shadow-soft overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-white/5">
            {[
              { id: 'gradebook', label: 'Gradebook', icon: BarChart3 },
              { id: 'report_cards', label: 'Report Cards', icon: FileText },
              { id: 'pins', label: 'Result PINs', icon: Key },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium transition-all relative ${
                  activeTab === tab.id ? 'text-primary' : 'text-text-secondary hover:text-text-main'
                }`}
              >
                <tab.icon size={18} />
                <span>{tab.label}</span>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />
                )}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Filters Row */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
              <div className="flex flex-wrap items-center gap-4">
                <select 
                  value={filters.grade_level_id}
                  onChange={(e) => setFilters({ ...filters, grade_level_id: e.target.value })}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-text-main focus:outline-none focus:border-primary"
                >
                  <option value="">All Grades</option>
                  {gradeLevels.map(gl => <option key={gl.id} value={gl.id}>{gl.name}</option>)}
                </select>
                <select 
                  value={filters.term_id}
                  onChange={(e) => setFilters({ ...filters, term_id: e.target.value })}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-text-main focus:outline-none focus:border-primary"
                >
                  <option value="">Select Term</option>
                  {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                {activeTab === 'gradebook' && (
                  <select 
                    value={filters.subject_id}
                    onChange={(e) => setFilters({ ...filters, subject_id: e.target.value })}
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-text-main focus:outline-none focus:border-primary"
                  >
                    <option value="">All Subjects</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                )}
              </div>

              <div className="flex items-center space-x-3">
                {activeTab === 'gradebook' && (
                  <button 
                    onClick={handleCompute}
                    disabled={loading}
                    className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                    <span>Compute Results</span>
                  </button>
                )}
                {activeTab === 'pins' && (
                  <button 
                    onClick={handleGeneratePins}
                    disabled={loading}
                    className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Plus size={18} />
                    <span>Generate Pins</span>
                  </button>
                )}
                <button className="p-2 text-text-secondary hover:text-text-main bg-white/5 border border-white/10 rounded-lg transition-all">
                  <Download size={20} />
                </button>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'gradebook' && (
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
                    {grades.length > 0 ? grades.map((grade) => (
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
                          {grade.position}
                          {grade.position === 1 ? 'st' : grade.position === 2 ? 'nd' : grade.position === 3 ? 'rd' : 'th'}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="7" className="px-4 py-20 text-center text-text-secondary">
                          {filters.grade_level_id && filters.term_id 
                            ? 'No grades found. Click "Compute Results" to process scores.' 
                            : 'Select a Grade and Term to view the gradebook.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'pins' && (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {pins.map((pin) => (
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
                {pins.length === 0 && (
                  <div className="col-span-full py-20 text-center text-text-secondary">
                    No PINs generated yet.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'report_cards' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/20">
                  <div>
                    <h4 className="text-text-main font-bold">Process Class Reports</h4>
                    <p className="text-text-secondary text-sm">Calculate class-wide rankings and generate PDF documents.</p>
                  </div>
                  <div className="flex space-x-3">
                    <button 
                      onClick={handleComputeOverall}
                      disabled={loading}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-text-main rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                    >
                      1. Calculate Ranks
                    </button>
                    <button 
                      onClick={handleGenerateReports}
                      disabled={loading}
                      className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all disabled:opacity-50"
                    >
                      2. Generate PDFs
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5 text-text-secondary text-xs uppercase tracking-wider">
                        <th className="px-4 py-3 font-medium">Student</th>
                        <th className="px-4 py-3 font-medium">Average</th>
                        <th className="px-4 py-3 font-medium">Position</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {reportCards.length > 0 ? reportCards.map((rc) => (
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
                          <td className="px-4 py-4 text-text-main text-sm font-bold">{rc.overall_average?.toFixed(2)}%</td>
                          <td className="px-4 py-4 text-text-secondary text-sm">
                            {rc.overall_position} / {rc.total_students}
                          </td>
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
                            No report cards found. Start by calculating ranks.
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
