import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function MyTools({ language, user, setCurrentView }) {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyTools();
  }, [user?.id]);

  const fetchMyTools = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_tools')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTools(data || []);
    } catch (error) {
      console.error('Error fetching tools:', error);
      setTools([]);
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
          {language === 'en' ? 'My Tools' : 'আমার সরঞ্জাম'}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          {language === 'en' 
            ? 'Track and manage your assigned tools and equipment' 
            : 'আপনার নির্ধারিত সরঞ্জাম ট্র্যাক করুন এবং পরিচালনা করুন'}
        </p>
      </div>

      {/* Tools List */}
      {tools.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-8 text-center">
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            {language === 'en' ? 'No tools assigned yet' : 'এখনো কোনো সরঞ্জাম বরাদ্দ করা হয়নি'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((tool) => (
            <div
              key={tool.id}
              className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-lg">
                    {tool.tool_name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {language === 'en' ? 'Serial' : 'সিরিয়াল'}: {tool.serial_number || 'N/A'}
                  </p>
                </div>
                <span className="text-2xl">🔧</span>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {language === 'en' ? 'Status' : 'অবস্থা'}: <span className="font-semibold text-green-600">{tool.status || 'Available'}</span>
                </p>
                {tool.last_serviced && (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {language === 'en' ? 'Last Serviced' : 'সর্বশেষ সেবা'}: {new Date(tool.last_serviced).toLocaleDateString()}
                  </p>
                )}
                {tool.next_maintenance && (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {language === 'en' ? 'Next Maintenance' : 'পরবর্তী রক্ষণাবেক্ষণ'}: {new Date(tool.next_maintenance).toLocaleDateString()}
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
