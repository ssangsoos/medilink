import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { ArrowLeft, Edit, Plus, Calendar, Infinity as InfinityIcon, Briefcase, AlertCircle, Trash2 } from 'lucide-react';
import type { JobPosting } from '../types/jobPosting';
import { formatHourlyRate, formatSchedule, formatJobCategory } from '../lib/jobPostingDisplay';

const needsUpdate = (job: JobPosting): boolean => {
  return !job.job_category;
};

export default function MyJobs() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data, error } = await supabase
        .from('job_postings')
        .select('*')
        .eq('hospital_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        alert(t('myJobs.fetchJobsFailed', { message: error.message }));
        setLoading(false);
        return;
      }

      setJobs((data ?? []) as JobPosting[]);
      setLoading(false);
    };

    load();
  }, [navigate]);

  const handleDelete = async (job: JobPosting) => {
    const ok = window.confirm(
      t('myJobs.deleteConfirm', { title: job.title })
    );
    if (!ok) return;

    setDeletingId(job.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t('myJobs.loginRequired'));

      const { data, error } = await supabase
        .from('job_postings')
        .delete()
        .eq('id', job.id)
        .eq('hospital_id', user.id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error(
          t('myJobs.deleteFailedRls')
        );
      }

      setJobs((prev) => prev.filter((j) => j.id !== job.id));
    } catch (error: any) {
      alert(t('myJobs.deleteFailed', { message: error.message }));
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">{t('myJobs.loadingList')}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-900 font-medium"
            >
              <ArrowLeft size={18} /> {t('myJobs.backToDashboard')}
            </button>
            <LanguageSwitcher />
          </div>
          <button
            onClick={() => navigate('/hospital/post')}
            className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 shadow"
          >
            <Plus size={18} /> {t('myJobs.newJobPosting')}
          </button>
        </div>

        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">{t('myJobs.title')}</h1>
        <p className="text-sm text-gray-500 mb-6">{t('myJobs.totalCount', { n: jobs.length })}</p>

        {jobs.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-10 text-center">
            <p className="text-gray-500 mb-4">{t('myJobs.emptyState')}</p>
            <button
              onClick={() => navigate('/hospital/post')}
              className="inline-flex items-center gap-1 bg-blue-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-blue-700"
            >
              <Plus size={18} /> {t('myJobs.firstJobPosting')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => {
              const requiresUpdate = needsUpdate(job);
              return (
                <div
                  key={job.id}
                  className={`bg-white rounded-2xl shadow-sm border p-5 ${requiresUpdate ? 'border-yellow-300' : 'border-gray-100'}`}
                >
                  {requiresUpdate && (
                    <div className="mb-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-900 flex items-start gap-2">
                      <AlertCircle size={14} className="mt-0.5 shrink-0" />
                      <span>
                        {t('myJobs.needsUpdateWarning')}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-start gap-3 mb-3">
                    <h2 className="text-lg font-bold text-gray-900 line-clamp-2">{job.title}</h2>
                    <span className={`shrink-0 text-xs px-2 py-1 rounded-full font-bold ${job.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {job.status === 'active' ? t('myJobs.statusActive') : job.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-gray-700 mb-4">
                    <div className="flex items-center gap-1">
                      <Briefcase size={14} className="text-blue-600" />
                      <span>{formatJobCategory(job)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {job.schedule_type === 'always' ? (
                        <InfinityIcon size={14} className="text-blue-600" />
                      ) : (
                        <Calendar size={14} className="text-blue-600" />
                      )}
                      <span className="truncate">{formatSchedule(job)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="inline-flex w-[14px] justify-center text-blue-600 font-bold">₩</span>
                      <span>{formatHourlyRate(job)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/hospital/jobs/${job.id}/edit`)}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl font-bold text-sm hover:bg-blue-100"
                    >
                      <Edit size={14} /> {t('myJobs.edit')}
                    </button>
                    <button
                      onClick={() => handleDelete(job)}
                      disabled={deletingId === job.id}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={14} /> {deletingId === job.id ? t('myJobs.deleting') : t('myJobs.delete')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
