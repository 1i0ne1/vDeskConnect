'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { 
  Award, Lock, Unlock, Download, ChevronRight, 
  AlertCircle, CheckCircle, Search, RefreshCcw 
} from 'lucide-react';
import { api } from '@/lib/api';
import { academicApi } from '@/lib/academic-api';
import { resultApi } from '@/lib/result-api';
import { useToast } from '@/contexts/ToastProvider';

export default function StudentResultsPage() {
  const toast = useToast();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  
  const [terms, setTerms] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState('');
  
  const [pin, setPin] = useState('');
  const [unlockedResult, setUnlockedResult] = useState(null);
  
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [userData, termRes] = await Promise.all([
        api.get('/user'),
        academicApi.terms.getActive(),
      ]);
      
      setUser(userData.user);
      setTerms(termRes.terms || []);
      
      if (termRes.terms && termRes.terms.length > 0) {
        setSelectedTerm(termRes.terms[0].id);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast.error('Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckResult = async (e) => {
    e.preventDefault();
    if (!selectedTerm) {
      toast.error('Please select a term');
      return;
    }
    if (!pin.trim()) {
      toast.error('Please enter your Result PIN');
      return;
    }

    setChecking(true);
    setUnlockedResult(null);

    try {
      const res = await resultApi.check({
        student_id: user.id,
        term_id: selectedTerm,
        pin: pin.trim().toUpperCase()
      });
      
      setUnlockedResult(res);
      toast.success('Results unlocked successfully!');
    } catch (error) {
      console.error('Check result error:', error);
      toast.error(error.data?.message || error.message || 'Invalid PIN or error unlocking results');
    } finally {
      setChecking(false);
    }
  };

  // If student previously used a PIN, they can view it without entering PIN again by fetching previously unlocked result?
  // Our backend doesn't currently provide a way to "check if unlocked without PIN", so they enter the PIN each time, 
  // but since it's bound to them, it will work. We can auto-fill or just require it.

  if (loading) {
    return (
      <DashboardLayout title="My Results" subtitle="Loading..." >
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Results" subtitle="View your academic performance and download report cards" >
      <div className="space-y-6">
        
        {/* Term Selection & PIN Entry Card */}
        <div className="bg-bg-card rounded-card border border-white/5 shadow-soft p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
              <Lock size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-main">Unlock Results</h2>
              <p className="text-sm text-text-secondary">Select a term and enter your PIN to view grades</p>
            </div>
          </div>

          <form onSubmit={handleCheckResult} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Academic Term</label>
              <select 
                value={selectedTerm}
                onChange={(e) => {
                  setSelectedTerm(e.target.value);
                  setUnlockedResult(null); // Reset on term change
                }}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm text-text-main focus:outline-none focus:border-primary transition-colors"
              >
                <option value="">Select Term</option>
                {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Result PIN</label>
              <input 
                type="text" 
                placeholder="Enter 10-character PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm text-text-main focus:outline-none focus:border-primary uppercase tracking-widest font-mono transition-colors"
                maxLength={10}
              />
            </div>
            
            <div>
              <button 
                type="submit"
                disabled={checking || !pin || !selectedTerm}
                className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                {checking ? (
                  <RefreshCcw size={18} className="animate-spin" />
                ) : (
                  <Unlock size={18} />
                )}
                <span>{checking ? 'Verifying...' : 'Unlock Results'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Results View */}
        {unlockedResult && (
          <div className="space-y-6 animate-slide-up">
            
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-primary to-primary-dark rounded-card p-6 border border-primary/20 shadow-lg shadow-primary/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10">
                  <p className="text-white/80 text-sm font-medium uppercase tracking-wider mb-1">Overall Average</p>
                  <h3 className="text-4xl font-bold text-white">
                    {unlockedResult.reportCard?.overall_average ? Number(unlockedResult.reportCard.overall_average).toFixed(2) + '%' : 'N/A'}
                  </h3>
                </div>
              </div>
              
              <div className="bg-bg-card rounded-card p-6 border border-white/5 shadow-soft flex flex-col justify-center">
                <p className="text-text-secondary text-sm font-medium uppercase tracking-wider mb-1">Class Position</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-bold text-text-main">
                    {unlockedResult.reportCard?.overall_position || 'N/A'}
                  </h3>
                  {unlockedResult.reportCard?.total_students && (
                    <span className="text-text-secondary">/ {unlockedResult.reportCard.total_students}</span>
                  )}
                </div>
              </div>
              
              <div className="bg-bg-card rounded-card p-6 border border-white/5 shadow-soft flex flex-col justify-center">
                <p className="text-text-secondary text-sm font-medium uppercase tracking-wider mb-1">Total Subjects</p>
                <h3 className="text-3xl font-bold text-text-main">
                  {unlockedResult.data?.length || 0}
                </h3>
              </div>
            </div>

            {/* Grades Table */}
            <div className="bg-bg-card rounded-card border border-white/5 shadow-soft overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-white/5">
                <h3 className="text-lg font-bold text-text-main">Subject Details</h3>
                
                {unlockedResult.reportCard?.pdf_url ? (
                  <a 
                    href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${unlockedResult.reportCard.pdf_url}`} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-primary border border-primary/20 rounded-lg text-sm font-bold transition-all"
                  >
                    <Download size={16} />
                    <span>Download Official Report Card</span>
                  </a>
                ) : (
                  <span className="text-xs text-warning flex items-center gap-1 bg-warning/10 px-3 py-1.5 rounded-full">
                    <AlertCircle size={14} /> Official PDF pending generation
                  </span>
                )}
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5 text-text-secondary text-xs uppercase tracking-wider bg-white/2">
                      <th className="px-6 py-4 font-medium">Subject</th>
                      <th className="px-6 py-4 font-medium text-center">CA Score</th>
                      <th className="px-6 py-4 font-medium text-center">Exam Score</th>
                      <th className="px-6 py-4 font-medium text-center">Total Score</th>
                      <th className="px-6 py-4 font-medium text-center">Grade</th>
                      <th className="px-6 py-4 font-medium text-center">Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {unlockedResult.data && unlockedResult.data.length > 0 ? (
                      unlockedResult.data.map((grade) => (
                        <tr key={grade.id} className="hover:bg-white/2 transition-colors">
                          <td className="px-6 py-4 text-text-main font-medium">{grade.subject?.name}</td>
                          <td className="px-6 py-4 text-text-main text-center">{grade.ca_score}</td>
                          <td className="px-6 py-4 text-text-main text-center">{grade.exam_score}</td>
                          <td className="px-6 py-4 text-center">
                            <span className="px-2 py-1 bg-white/5 border border-white/10 rounded font-bold text-text-main text-sm">
                              {grade.total_score}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${
                              grade.grade === 'A' ? 'bg-green-500/20 text-green-500' :
                              grade.grade === 'B' ? 'bg-blue-500/20 text-blue-500' :
                              grade.grade === 'F' ? 'bg-red-500/20 text-red-500' :
                              'bg-yellow-500/20 text-yellow-500'
                            }`}>
                              {grade.grade}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-text-secondary text-sm text-center">{grade.remark}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center text-text-secondary">
                          No grades found for this term.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
