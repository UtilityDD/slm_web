import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function SOP({ language, user, setCurrentView }) {
  const [sops, setSOPs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSOPs();
  }, []);

  const fetchSOPs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sops')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSOPs(data || []);
    } catch (error) {
      console.error('Error fetching SOPs:', error);
      setSOPs([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          {language === 'en' ? 'Standard Operating Procedures' : 'মান পরিচালনা প্রক্রিয়া'}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          {language === 'en' 
            ? 'Learn and follow the standard operating procedures for safety' 
            : 'নিরাপত্তার জন্য মানক পরিচালনা পদ্ধতি জানুন এবং অনুসরণ করুন'}
        </p>
      </div>

      {/* SOPs List */}
      {sops.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-8 text-center">
          <p className="text-slate-600 dark:text-slate-400">
            {language === 'en' ? 'No SOPs available yet' : 'এখনো কোনো এসওপি উপলব্ধ নেই'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sops.map((sop) => (
            <div
              key={sop.id}
              className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow p-4 cursor-pointer hover:border-blue-300 dark:hover:border-blue-600"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-lg">
                  {sop.title}
                </h3>
                <span className="text-2xl">{sop.icon || '📋'}</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                {sop.description}
              </p>
              <button className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline">
                {language === 'en' ? 'View Details →' : 'বিস্তারিত দেখুন →'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
