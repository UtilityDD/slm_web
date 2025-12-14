import React, { useState, useEffect } from "react";
import Competitions from "./components/Competitions";
import Community from "./components/Community";
import Emergency from "./components/Emergency";
import SafetyHub from "./components/SafetyHub";
import Login from "./components/Login";
import { supabase } from "./supabaseClient";

export default function SmartLinemanUI() {
  const [hoveredCard, setHoveredCard] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentView, setCurrentView] = useState('home');
  const [language, setLanguage] = useState('en');
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Scroll to top when view changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentView]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCurrentView('home');
  };

  const translations = {
    en: {
      nav: {
        safety: "Safety Hub",
        community: "Community",
        competitions: "Competitions",
        leaderboard: "Leaderboard",
        emergency: "Emergency",
        login: "Login",
        logout: "Logout"
      },
      hero: {
        title: "SmartLineman",
        subtitle: "Empowering West Bengal's electrical linemen through safety, community & recognition",
        stats: {
          linemen: "Active Linemen",
          supervisors: "Supervisors",
          safety: "Safety Record"
        }
      },
      footer: {
        desc: "Empowering electrical linemen across West Bengal through safety, community and continuous learning.",
        quickLinks: "Quick Links",
        resources: "Resources",
        emergency: "Emergency"
      }
    },
    bn: {
      nav: {
        safety: "সেফটি হাব",
        community: "কমিউনিটি",
        competitions: "প্রতিযোগিতা",
        leaderboard: "লিডারবোর্ড",
        emergency: "জরুরি",
        login: "লগ ইন",
        logout: "লগ আউট"
      },
      hero: {
        title: "স্মার্ট লাইনম্যান",
        subtitle: "সুরক্ষা, কমিউনিটি এবং স্বীকৃতির মাধ্যমে পশ্চিমবঙ্গের লাইনম্যানদের ক্ষমতায়ন",
        stats: {
          linemen: "সক্রিয় লাইনম্যান",
          supervisors: "সুপারভাইজার",
          safety: "সুরক্ষা রেকর্ড"
        }
      },
      footer: {
        desc: "সুরক্ষা, কমিউনিটি এবং ক্রমাগত শিক্ষার মাধ্যমে পশ্চিমবঙ্গের লাইনম্যানদের ক্ষমতায়ন।",
        quickLinks: "দ্রুত লিঙ্ক",
        resources: "রিসোর্স",
        emergency: "জরুরি পরিষেবা"
      }
    }
  };

  const t = translations[language];

  const renderContent = () => {
    if (currentView === 'login' && !user) {
      return <Login onLogin={(u) => { setUser(u); setCurrentView('home'); }} />;
    }

    switch (currentView) {
      case 'competitions':
        return <Competitions language={language} user={user} />;
      case 'community':
        return <Community language={language} user={user} />;
      case 'emergency':
        return <Emergency language={language} user={user} />;
      case 'safety':
        return <SafetyHub language={language} user={user} />;
      case 'home':
      default:
        return <HomeContent
          hoveredCard={hoveredCard}
          setHoveredCard={setHoveredCard}
          setCurrentView={setCurrentView}
          language={language}
          t={t}
          user={user}
        />;
    }
  };

  return (
    <div className={`min-h-screen bg-slate-50 text-slate-900 ${language === 'bn' ? 'font-bengali' : 'font-sans'}`}>
      {/* Background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-blue-100/40 rounded-full blur-3xl translate-x-1/4 -translate-y-1/4"></div>
        <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] bg-cyan-100/40 rounded-full blur-3xl -translate-x-1/4 translate-y-1/4"></div>
      </div>

      {/* Header - Material Design */}
      <header className="bg-white elevation-2 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto mobile-container">
          <div className="flex justify-between items-center h-14 md:h-16">
            <div
              className="flex items-center gap-2 sm:gap-3 group cursor-pointer ripple-dark rounded-lg px-2 py-1 -ml-2"
              onClick={() => setCurrentView('home')}
            >
              <div className="relative">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-700 to-blue-600 rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm text-white elevation-2 transition-all duration-300 group-hover:scale-105">
                  SL
                </div>
              </div>
              <div className="hidden sm:block">
                <div className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  {language === 'en' ? 'SmartLineman' : 'স্মার্ট লাইনম্যান'}
                </div>
                <div className="text-[10px] sm:text-xs text-slate-500 font-medium">
                  {language === 'en' ? 'West Bengal' : 'পশ্চিমবঙ্গ'}
                </div>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-medium text-slate-600">
              <a
                className={`hover:text-blue-700 transition-colors duration-200 cursor-pointer relative group py-2 ${currentView === 'safety' ? 'text-blue-700 font-semibold' : ''}`}
                onClick={() => setCurrentView('safety')}
              >
                {t.nav.safety}
                <span className={`absolute bottom-0 left-0 h-0.5 bg-blue-600 transition-all duration-300 ${currentView === 'safety' ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
              </a>
              <a
                className={`hover:text-blue-700 transition-colors duration-200 cursor-pointer relative group py-2 ${currentView === 'community' ? 'text-blue-700 font-semibold' : ''}`}
                onClick={() => setCurrentView('community')}
              >
                {t.nav.community}
                <span className={`absolute bottom-0 left-0 h-0.5 bg-blue-600 transition-all duration-300 ${currentView === 'community' ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
              </a>
              <a
                className={`hover:text-blue-700 transition-colors duration-200 cursor-pointer relative group py-2 ${currentView === 'competitions' ? 'text-blue-700 font-semibold' : ''}`}
                onClick={() => setCurrentView('competitions')}
              >
                {t.nav.competitions}
                <span className={`absolute bottom-0 left-0 h-0.5 bg-blue-600 transition-all duration-300 ${currentView === 'competitions' ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
              </a>
              <a
                className={`hover:text-blue-700 transition-colors duration-200 cursor-pointer relative group py-2 ${currentView === 'emergency' ? 'text-blue-700 font-semibold' : ''}`}
                onClick={() => setCurrentView('emergency')}
              >
                <span className="text-red-600 hover:text-red-700 font-bold">{t.nav.emergency}</span>
                <span className={`absolute bottom-0 left-0 h-0.5 bg-red-600 transition-all duration-300 ${currentView === 'emergency' ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
              </a>
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Language Switcher - More compact on mobile */}
              <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-1.5 sm:px-2 py-1 text-xs font-bold rounded-md transition-all touch-target ${language === 'en' ? 'bg-white text-blue-700 elevation-1' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLanguage('bn')}
                  className={`px-1.5 sm:px-2 py-1 text-xs font-bold rounded-md transition-all touch-target ${language === 'bn' ? 'bg-white text-blue-700 elevation-1' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  বাং
                </button>
              </div>

              {/* User menu - Desktop only */}
              {user ? (
                <div className="hidden md:flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-xs elevation-1">
                    {user.email ? user.email[0].toUpperCase() : 'U'}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-slate-500 hover:text-slate-700 text-xs sm:text-sm font-medium ripple-dark px-2 py-1 rounded"
                  >
                    {t.nav.logout}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setCurrentView('login')}
                  className="hidden md:inline-block material-button-primary text-xs sm:text-sm"
                >
                  {t.nav.login}
                </button>
              )}

              {/* Mobile User Icon */}
              <div className="md:hidden">
                {user ? (
                  <button
                    onClick={handleLogout}
                    className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm elevation-1 ripple-dark touch-target"
                    title={t.nav.logout}
                  >
                    {user.email ? user.email[0].toUpperCase() : 'U'}
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentView('login')}
                    className="w-10 h-10 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center elevation-1 ripple-dark touch-target hover:bg-blue-50 hover:text-blue-700 transition-colors"
                    title={t.nav.login}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation - Material Design */}
      <nav className="md:hidden bottom-nav">
        <div className="flex items-center justify-around h-full">
          <button
            onClick={() => setCurrentView('home')}
            className={`bottom-nav-item ripple-dark ${currentView === 'home' ? 'active' : ''}`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" strokeWidth={currentView === 'home' ? 2.5 : 1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-[10px] font-medium">{language === 'en' ? 'Home' : 'হোম'}</span>
          </button>

          <button
            onClick={() => setCurrentView('safety')}
            className={`bottom-nav-item ripple-dark ${currentView === 'safety' ? 'active' : ''}`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" strokeWidth={currentView === 'safety' ? 2.5 : 1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-[10px] font-medium">{language === 'en' ? 'Safety' : 'নিরাপত্তা'}</span>
          </button>

          <button
            onClick={() => setCurrentView('community')}
            className={`bottom-nav-item ripple-dark ${currentView === 'community' ? 'active' : ''}`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" strokeWidth={currentView === 'community' ? 2.5 : 1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-[10px] font-medium">{language === 'en' ? 'Community' : 'সম্প্রদায়'}</span>
          </button>

          <button
            onClick={() => setCurrentView('competitions')}
            className={`bottom-nav-item ripple-dark ${currentView === 'competitions' ? 'active' : ''}`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" strokeWidth={currentView === 'competitions' ? 2.5 : 1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            <span className="text-[10px] font-medium">{language === 'en' ? 'Compete' : 'প্রতিযোগিতা'}</span>
          </button>

          <button
            onClick={() => setCurrentView('emergency')}
            className={`bottom-nav-item ripple-dark ${currentView === 'emergency' ? 'active' : ''}`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" strokeWidth={currentView === 'emergency' ? 2.5 : 1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-[10px] font-medium text-red-600">{language === 'en' ? 'SOS' : 'জরুরি'}</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      {renderContent()}

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-sm text-white">
                  SL
                </div>
                <span className="font-bold text-white text-lg">
                  {language === 'en' ? 'SmartLineman' : 'স্মার্ট লাইনম্যান'}
                </span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                {t.footer.desc}
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">{t.footer.quickLinks}</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-blue-400 transition-colors">{t.nav.safety}</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">{t.nav.community}</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">{t.nav.competitions}</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Events</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">{t.footer.resources}</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-blue-400 transition-colors">Safety Protocols</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Training Materials</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Guidelines</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">FAQs</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">{t.footer.emergency}</h3>
              <div className="space-y-3">
                <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                  <div className="text-xs text-slate-400">Emergency Hotline (WB)</div>
                  <div className="text-lg font-bold text-red-500">1912 / 1800-345-5220</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                  <div className="text-xs text-slate-400">Safety Support</div>
                  <div className="text-lg font-bold text-yellow-500">24/7 Available</div>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-500">
            <p>&copy; 2024 SmartLineman West Bengal.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function HomeContent({ hoveredCard, setHoveredCard, setCurrentView, language, t, user }) {
  return (
    <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20">

      {/* Hero Banner */}
      <div className="text-center mb-16 sm:mb-20">
        <div className="flex flex-col items-center gap-6 sm:gap-8">
          {/* Logo Badge */}
          <div className="relative animate-float">
            <div className="absolute inset-0 bg-blue-200 rounded-3xl blur-2xl opacity-30"></div>
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-2xl sm:rounded-3xl flex items-center justify-center text-3xl sm:text-4xl font-bold shadow-xl shadow-blue-900/5 border border-slate-100 text-blue-700">
              ⚡
            </div>
          </div>

          {/* Title */}
          <div className="space-y-4 sm:space-y-5 max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight text-slate-900 tracking-tight">
              <span className="text-blue-700">Smart</span>Lineman
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-slate-600 max-w-2xl mx-auto font-normal px-4 leading-relaxed">
              {t.hero.subtitle}
            </p>
          </div>

          {/* Platform Stats */}
          <div className="grid grid-cols-3 gap-4 sm:gap-8 mt-8 w-full max-w-3xl">
            <StatCard number="12,500+" label={t.hero.stats.linemen} icon="👷" />
            <StatCard number="450" label={t.hero.stats.supervisors} icon="👨‍💼" />
            <StatCard number="99.2%" label={t.hero.stats.safety} icon="🛡️" />
          </div>
        </div>
      </div>

      {/* Quick Access Features */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
        <div onClick={() => setCurrentView('safety')}>
          <QuickFeatureCard
            icon="🦺"
            title={t.nav.safety}
            description="Emergency protocols & safety resources"
            color="bg-orange-50 text-orange-600"
            hoverColor="group-hover:bg-orange-600 group-hover:text-white"
          />
        </div>
        <div onClick={() => setCurrentView('competitions')}>
          <QuickFeatureCard
            icon="🏆"
            title={language === 'en' ? "This Week's Quiz" : "সাপ্তাহিক কুইজ"}
            description="Test your knowledge, win badges"
            color="bg-yellow-50 text-yellow-600"
            hoverColor="group-hover:bg-yellow-600 group-hover:text-white"
          />
        </div>
        <div onClick={() => setCurrentView('community')}>
          <QuickFeatureCard
            icon="💬"
            title={t.nav.community}
            description="Connect with fellow linemen"
            color="bg-blue-50 text-blue-600"
            hoverColor="group-hover:bg-blue-600 group-hover:text-white"
          />
        </div>
        <QuickFeatureCard
          icon="📊"
          title={t.nav.leaderboard}
          description="Top performers this month"
          color="bg-purple-50 text-purple-600"
          hoverColor="group-hover:bg-purple-600 group-hover:text-white"
        />
      </div>

      {/* Safety Alert */}
      <SafetyAlert language={language} />

      {/* Leaderboard Section */}
      <section className="mb-16">
        <SectionHeader
          title={language === 'en' ? "🏆 Top Performers (West Bengal)" : "🏆 সেরা পারফর্মার (পশ্চিমবঙ্গ)"}
          subtitle={language === 'en' ? "Weekly Quiz Champions" : "সাপ্তাহিক কুইজ চ্যাম্পিয়ন"}
        />
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 mt-6">
          <LeaderboardTable language={language} />
        </div>
      </section>

      {/* Community Highlights */}
      <section className="mb-16">
        <SectionHeader
          title={language === 'en' ? "💡 Community Highlights" : "💡 কমিউনিটি হাইলাইট"}
          subtitle={language === 'en' ? "Recent discussions and success stories" : "সাম্প্রতিক আলোচনা এবং সাফল্যের গল্প"}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <CommunityCard
            title={language === 'en' ? "Safety Best Practices for Monsoon" : "বর্ষার জন্য নিরাপত্তা টিপস"}
            author={language === 'en' ? "Rajesh Kumar, Senior Lineman" : "রাজেশ কুমার, সিনিয়র লাইনম্যান"}
            replies={24}
            likes={156}
            time="2 hours ago"
          />
          <CommunityCard
            title={language === 'en' ? "Career Growth: My Journey to Supervisor" : "ক্যারিয়ার বৃদ্ধি: সুপারভাইজার হওয়ার গল্প"}
            author={language === 'en' ? "Amit Sharma, Supervisor" : "অমিত শর্মা, সুপারভাইজার"}
            replies={38}
            likes={289}
            time="5 hours ago"
          />
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="mb-20">
        <SectionHeader
          title={language === 'en' ? "📅 Upcoming Events" : "📅 আসন্ন ইভেন্ট"}
          subtitle={language === 'en' ? "Competitions, seminars and community meetups" : "প্রতিযোগিতা, সেমিনার এবং মিটআপ"}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <EventCard
            title={language === 'en' ? "Weekly Safety Quiz" : "সাপ্তাহিক সুরক্ষা কুইজ"}
            date={language === 'en' ? "This Saturday, 6 PM" : "এই শনিবার, সন্ধ্যা ৬টা"}
            participants="2,340 registered"
            type="Competition"
            typeColor="bg-blue-100 text-blue-700"
          />
          <EventCard
            title={language === 'en' ? "WBSEDCL Safety Seminar" : "WBSEDCL সুরক্ষা সেমিনার"}
            date="Dec 18, 10 AM"
            participants="450 registered"
            type="Seminar"
            typeColor="bg-purple-100 text-purple-700"
          />
          <EventCard
            title={language === 'en' ? "Kolkata Zone Meetup" : "কলকাতা জোন মিটআপ"}
            date="Dec 20, 4 PM"
            participants="680 interested"
            type="Workshop"
            typeColor="bg-emerald-100 text-emerald-700"
          />
        </div>
      </section>

      {/* Call to Action */}
      <div className="bg-blue-700 rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden shadow-xl shadow-blue-900/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3"></div>

        <div className="relative z-10">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">
            {language === 'en' ? "Join West Bengal's Largest Lineman Community" : "পশ্চিমবঙ্গের বৃহত্তম লাইনম্যান কমিউনিটিতে যোগ দিন"}
          </h2>
          <p className="text-blue-100 mb-8 text-lg max-w-2xl mx-auto">
            {language === 'en'
              ? "Get access to safety resources, compete in quizzes, connect with peers, and grow your career"
              : "সুরক্ষা রিসোর্স অ্যাক্সেস করুন, কুইজে অংশ নিন এবং আপনার ক্যারিয়ার গড়ুন"}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-3 bg-white text-blue-700 rounded-lg font-bold hover:bg-blue-50 transition-all duration-300 shadow-lg">
              {language === 'en' ? "Sign Up Free" : "ফ্রি সাইন আপ"}
            </button>
            <button className="px-8 py-3 bg-blue-800/50 text-white border border-blue-500/30 rounded-lg font-semibold hover:bg-blue-800 transition-all duration-200">
              {language === 'en' ? "Learn More" : "আরও জানুন"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

/* =================== COMPONENTS =================== */

function StatCard({ number, label, icon }) {
  return (
    <div className="material-card p-5 sm:p-6 text-center group">
      <div className="text-3xl sm:text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">{icon}</div>
      <div className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">{number}</div>
      <div className="text-sm sm:text-base text-slate-500 font-medium">{label}</div>
    </div>
  );
}

function QuickFeatureCard({ icon, title, description, color, hoverColor }) {
  return (
    <div className="material-card p-6 sm:p-8 group cursor-pointer ripple-dark touch-target">
      <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl elevation-2 ${color} ${hoverColor} flex items-center justify-center text-3xl sm:text-4xl mb-5 transition-all duration-300 group-hover:scale-110`}>
        {icon}
      </div>
      <h3 className="font-bold text-base sm:text-lg text-slate-900 mb-2 group-hover:text-blue-700 transition-colors">{title}</h3>
      <p className="text-sm sm:text-base text-slate-500 leading-relaxed">{description}</p>
    </div>
  );
}

function SafetyAlert({ language }) {
  return (
    <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-6 sm:p-8 mb-16 relative overflow-hidden elevation-2">
      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
      <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 relative z-10">
        <div className="text-4xl sm:text-5xl bg-white rounded-full p-3 sm:p-4 elevation-2 flex-shrink-0">⚠️</div>
        <div className="flex-1">
          <h3 className="text-xl sm:text-2xl font-bold text-orange-800 mb-3">
            {language === 'en' ? "Safety Alert: Nor'wester (Kalbaishakhi)" : "সতর্কতা: কালবৈশাখী ঝড়"}
          </h3>
          <p className="text-orange-700 mb-5 text-base sm:text-lg leading-relaxed">
            {language === 'en'
              ? "Storms expected in Kolkata, Howrah, and Hooghly districts. Review storm protocols."
              : "কলকাতা, হাওড়া এবং হুগলি জেলায় ঝড়ের সম্ভাবনা। ঝড়ের প্রোটোকল মেনে চলুন।"}
          </p>
          <button className="material-button-primary ripple">
            {language === 'en' ? "View Guidelines" : "নির্দেশিকা দেখুন"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">{title}</h2>
      {subtitle && <p className="text-slate-500 mt-2 text-lg">{subtitle}</p>}
    </div>
  );
}

function LeaderboardTable({ language }) {
  const leaders = [
    { rank: 1, name: "Rajesh Kumar", score: 980, badge: "🥇", region: "Kolkata" },
    { rank: 2, name: "Amit Patel", score: 965, badge: "🥈", region: "Howrah" },
    { rank: 3, name: "Suresh Singh", score: 950, badge: "🥉", region: "Siliguri" },
    { rank: 4, name: "Vikram Rao", score: 940, badge: "🏅", region: "Durgapur" },
    { rank: 5, name: "Manoj Sharma", score: 935, badge: "🏅", region: "Asansol" },
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-12 gap-4 px-4 sm:px-6 py-3 text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-200 mb-3">
        <div className="col-span-8 sm:col-span-6">{language === 'en' ? "Lineman" : "লাইনম্যান"}</div>
        <div className="col-span-4 sm:col-span-6 text-right">{language === 'en' ? "Score" : "স্কোর"}</div>
      </div>
      {leaders.map((leader, index) => (
        <div key={leader.rank} className={`flex items-center justify-between p-4 sm:p-5 rounded-xl transition-all touch-target ${index === 0 ? 'bg-blue-50 border-2 border-blue-200 elevation-1' : 'hover:bg-slate-50 border border-transparent hover:border-slate-200'}`}>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-2xl sm:text-3xl w-10 text-center font-bold">{leader.badge}</div>
            <div>
              <div className="font-bold text-base sm:text-lg text-slate-900">{leader.name}</div>
              <div className="text-sm sm:text-base text-slate-500">{leader.region}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl sm:text-2xl font-bold text-blue-700">{leader.score}</div>
            <div className="text-xs sm:text-sm text-slate-400">points</div>
          </div>
        </div>
      ))}
      <button className="w-full material-button-outlined ripple-dark mt-5">
        {language === 'en' ? "View Full Leaderboard →" : "সম্পূর্ণ লিডারবোর্ড দেখুন →"}
      </button>
    </div>
  );
}

function CommunityCard({ title, author, replies, likes, time }) {
  return (
    <div className="material-card p-6 sm:p-8 cursor-pointer group ripple-dark">
      <div className="flex items-start justify-between mb-4">
        <div className="inline-block px-3 py-1.5 bg-blue-50 text-blue-700 text-xs sm:text-sm font-semibold rounded-lg elevation-1">Discussion</div>
        <span className="text-xs sm:text-sm text-slate-400">{time}</span>
      </div>
      <h3 className="font-bold text-lg sm:text-xl mb-4 text-slate-900 group-hover:text-blue-700 transition-colors leading-snug">{title}</h3>
      <div className="flex items-center gap-2 text-sm sm:text-base text-slate-500 mb-5">
        <span className="font-medium text-slate-700 text-base">👤 {author}</span>
      </div>
      <div className="flex items-center gap-6 sm:gap-8 text-sm sm:text-base border-t border-slate-100 pt-5">
        <div className="flex items-center gap-2 text-slate-500 touch-target">
          <span className="text-lg">💬</span>
          <span>{replies} replies</span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 touch-target">
          <span className="text-lg">❤️</span>
          <span>{likes} likes</span>
        </div>
      </div>
    </div>
  );
}

function EventCard({ title, date, participants, type, typeColor }) {
  return (
    <div className="material-card p-6 sm:p-8 group">
      <div className={`inline-block px-4 py-2 rounded-full text-xs sm:text-sm font-bold ${typeColor} mb-5 elevation-1`}>
        {type}
      </div>
      <h3 className="font-bold text-lg sm:text-xl mb-4 text-slate-900 group-hover:text-blue-700 transition-colors leading-snug">{title}</h3>
      <div className="text-sm sm:text-base text-slate-500 mb-6 space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-lg">📅</span>
          <span className="font-medium">{date}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg">👥</span>
          <span>{participants}</span>
        </div>
      </div>
      <button className="w-full material-button-outlined ripple-dark">
        Register Now
      </button>
    </div>
  );
}
