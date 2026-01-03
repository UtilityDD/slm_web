import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import GridSkeleton from './loaders/GridSkeleton';

export default function MyPPE({ language, user, setCurrentView }) {
  const [ppes, setPPEs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyPPEs();
  }, [user?.id]);

  const fetchMyPPEs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_ppes')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPPEs(data || []);
    } catch (error) {
      console.error('Error fetching PPEs:', error);
      setPPEs([]);
    } finally {
      setLoading(false);
    }
  };

  <div className="p-4 md:p-6 max-w-6xl mx-auto">
    {/* Header */}
    <div className="mb-6">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
        {language === 'en' ? 'Personal Protective Equipment' : 'ব্যক্তিগত সুরক্ষা সরঞ্জাম'}
      </h1>
      <p className="text-slate-600 dark:text-slate-400 mt-2">
        {language === 'en'
          ? 'Manage and track your personal protective equipment'
          : 'আপনার ব্যক্তিগত সুরক্ষা সরঞ্জাম পরিচালনা করুন'}
      </p>
    </div>

    {loading ? (
      <GridSkeleton />
    ) : ppes.length === 0 ? (
      <div className="bg-white dark:bg-slate-800 rounded-lg p-8 text-center">
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          {language === 'en' ? 'No PPE assigned yet' : 'এখনো কোনো পিপিই বরাদ্দ করা হয়নি'}
        </p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ppes.map((ppe) => (
          <div
            key={ppe.id}
            className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow p-4"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-lg">
                  {ppe.ppe_name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {language === 'en' ? 'Status' : 'অবস্থা'}: <span className="font-semibold text-green-600">{ppe.status || 'Good'}</span>
                </p>
              </div>
              <span className="text-2xl">👷</span>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {language === 'en' ? 'Issued' : 'জারি করা হয়েছে'}: {new Date(ppe.issued_date).toLocaleDateString()}
              </p>
              {ppe.expiry_date && (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {language === 'en' ? 'Expires' : 'মেয়াদ শেষ'}: {new Date(ppe.expiry_date).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
  );
}
