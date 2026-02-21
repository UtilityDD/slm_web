import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wkunyvomogeazjwtenck.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrdW55dm9tb2dlYXpqd3RlbmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MDIwMDgsImV4cCI6MjA4MTA3ODAwOH0.iY8BjqhUn8rvOwul9a0625LQ_TGmauth5Ltml5mTcR0'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function updateVersion() {
    const { data, error } = await supabase
        .from('app_versions')
        .insert([
            {
                version_code: 29,
                version_name: '1.3.29',
                force_update: false,
                update_url: 'https://github.com/UtilityDD/slm_web/releases',
                release_notes: 'Integrated calendar.lottie animation for the Weekly Momentum card in the Training screen.'
            }
        ]);

    if (error) {
        console.error('Error updating version:', error);
    } else {
        console.log('Successfully updated Supabase to 1.3.29');
    }
}

updateVersion();
