'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  Users,
  BookOpen,
  Clock,
  TrendingUp,
  Calendar,
  FileText,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import IllustrationDisplay from '@/components/ui/IllustrationDisplay';
import { api } from '@/lib/api';

const MY_NOTES = [
  { title: 'Prepare Questions for final test', desc: 'Prepare Questions for final test for the students of class A', color: 'bg-warning/10' },
  { title: 'Update Scheme of Work', desc: 'Update the scheme of work for Term 2 Science subjects', color: 'bg-primary/10' },
  { title: 'Parent-Teacher Meeting', desc: 'Schedule parent-teacher meeting for next week', color: 'bg-success/10' },
  { title: 'Exam Schedule', desc: 'Finalize exam schedule for mid-term assessments', color: 'bg-info/10' },
];

export default function SchoolAdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    stats: [],
    topStudents: [],
    schedule: []
  });

  const iconMap = {
    BookOpen: BookOpen,
    GraduationCap: GraduationCap,
    Users: Users,
    FileText: FileText,
    Clock: Clock
  };

  useEffect(() => {
    const token = api.getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const [userData, statsData] = await Promise.all([
          api.get('/user'),
          api.get('/dashboard/stats')
        ]);

        if (userData.user?.role === 'super_admin') {
          router.push('/admin/dashboard');
          return;
        }

        setUser(userData.user);
        setDashboardData(statsData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        api.logout();
        router.push('/login');
      }
    };

    fetchData();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const profileData = typeof user?.profile?.data === 'string' 
    ? JSON.parse(user.profile.data) 
    : user?.profile?.data;
  const userName = profileData?.first_name || user?.email?.split('@')[0] || 'Admin';

  return (
    <DashboardLayout title="Dashboard" subtitle={`${greeting}, ${userName}!`} >
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-br from-primary to-primary-dark rounded-hero p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <h2 className="text-xl font-bold">{greeting}, {userName}!</h2>
            <p className="text-white/80 text-sm mt-1">Here's what's happening with your school today.</p>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs bg-white/10 rounded-btn px-2 py-1">Trial Active</span>
              <span className="text-xs bg-white/10 rounded-btn px-2 py-1">12 days remaining</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {dashboardData.stats.map((stat, i) => {
            const Icon = iconMap[stat.icon] || BookOpen;
            return (
              <div
                key={i}
                className="bg-bg-card rounded-card shadow-soft p-5 card-hover-lift animate-slide-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                    <Icon size={20} />
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-medium ${
                    stat.trend === 'up' ? 'text-success' : 'text-error'
                  }`}>
                    {stat.trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {stat.change}
                  </div>
                </div>
                <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
                <p className="text-sm text-text-secondary mt-1">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Students Performance */}
          <div className="bg-bg-card rounded-card shadow-soft">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-semibold text-text-primary">Students Performance</h3>
              <button onClick={() => router.push('/dashboard/reports')} className="text-xs text-primary hover:text-primary-dark transition-colors">
                View all
              </button>
            </div>
            <div className="divide-y divide-border min-h-[300px]">
              {dashboardData.topStudents.length > 0 ? (
                dashboardData.topStudents.map((student, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-bg-main/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">{student.name}</p>
                        <p className="text-xs text-text-secondary">{student.grade} / {student.class}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-text-primary">{student.mastery}%</span>
                  </div>
                ))
              ) : (
                <div className="p-10 text-center">
                  <TrendingUp className="mx-auto text-text-muted mb-2 opacity-20" size={40} />
                  <p className="text-sm text-text-secondary">No performance data yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Calendar & Events */}
          <div className="bg-bg-card rounded-card shadow-soft">
            <div className="p-5 border-b border-border">
              <h3 className="font-semibold text-text-primary">Today's Schedule</h3>
            </div>
            <div className="p-5 space-y-4 min-h-[300px]">
              {dashboardData.schedule.length > 0 ? (
                dashboardData.schedule.map((event, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-text-secondary whitespace-nowrap">{event.time}</span>
                      <div className="w-px h-8 bg-border mt-1" />
                    </div>
                    <div className="flex-1 pb-4 border-l-2 border-primary pl-4">
                      <p className="text-sm font-medium text-text-primary">{event.title}</p>
                      <p className="text-xs text-text-secondary mt-0.5">{event.description}</p>
                      <p className="text-xs text-text-muted mt-1">{event.end}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-10 text-center">
                  <Calendar className="mx-auto text-text-muted mb-2 opacity-20" size={40} />
                  <p className="text-sm text-text-secondary">Nothing scheduled for today</p>
                </div>
              )}
            </div>
          </div>

          {/* My Notes (Keeping Static for now or we could pull from somewhere) */}
          <div className="bg-bg-card rounded-card shadow-soft">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-semibold text-text-primary">My Notes</h3>
              <button className="text-xs text-primary hover:text-primary-dark transition-colors">
                + Add Note
              </button>
            </div>
            <div className="divide-y divide-border">
              {MY_NOTES.map((note, i) => (
                <div key={i} className="flex items-start gap-3 px-5 py-3 hover:bg-bg-main/50 transition-colors">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${note.color}`}>
                    <CheckCircle size={12} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">{note.title}</p>
                    <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{note.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-bg-card rounded-card shadow-soft p-5">
          <h3 className="font-semibold text-text-primary mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Add Student', icon: GraduationCap, href: '/dashboard/students', color: 'bg-primary/10 text-primary hover:bg-primary/20' },
              { label: 'Add Teacher', icon: Users, href: '/dashboard/teachers', color: 'bg-success/10 text-success hover:bg-success/20' },
              { label: 'Create Class', icon: BookOpen, href: '/dashboard/classes', color: 'bg-warning/10 text-warning hover:bg-warning/20' },
              { label: 'View Fees', icon: CreditCard, href: '/dashboard/fees', color: 'bg-info/10 text-info hover:bg-info/20' },
            ].map((action, i) => (
              <button
                key={i}
                onClick={() => router.push(action.href)}
                className={`flex flex-col items-center gap-3 p-4 rounded-card ${action.color} transition-all duration-250 hover:scale-105`}
              >
                <action.icon size={24} />
                <span className="text-sm font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Trial Banner */}
        <div className="bg-warning/10 border border-warning/20 rounded-hero p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-warning/20 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={24} className="text-warning" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-text-primary">Your free trial is active</h4>
              <p className="text-sm text-text-secondary mt-0.5">
                You have 12 days remaining. Upgrade to a paid plan to continue using all features.
              </p>
            </div>
            <button className="px-4 py-2 rounded-btn bg-warning text-white text-sm font-medium hover:bg-warning/90 transition-colors flex-shrink-0">
              View Plans
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
