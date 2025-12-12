import React, { useState } from 'react';

export default function Community({ language = 'en' }) {
    const [activeTab, setActiveTab] = useState('discussions');

    const t = {
        en: {
            title: "Community Hub",
            subtitle: "Connect, share, and grow with linemen across West Bengal.",
            startDiscussion: "Start Discussion",
            discussions: "General Discussions",
            safety: "Safety First",
            stories: "Success Stories",
            jobs: "Career Growth",
            myGroups: "My Groups",
            trending: "Trending Topics",
            topContributors: "Top Contributors"
        },
        bn: {
            title: "কমিউনিটি হাব",
            subtitle: "পশ্চিমবঙ্গের লাইনম্যানদের সাথে সংযোগ স্থাপন করুন, শেয়ার করুন এবং এগিয়ে যান।",
            startDiscussion: "আলোচনা শুরু করুন",
            discussions: "সাধারণ আলোচনা",
            safety: "সুরক্ষা প্রথম",
            stories: "সাফল্যের গল্প",
            jobs: "ক্যারিয়ার বৃদ্ধি",
            myGroups: "আমার গ্রুপ",
            trending: "ট্রেন্ডিং বিষয়",
            topContributors: "সেরা অবদানকারী"
        }
    }[language];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header Section */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
                        {language === 'en' ? (
                            <>Community <span className="text-blue-700">Hub</span></>
                        ) : (
                            <>{t.title}</>
                        )}
                    </h1>
                    <p className="text-lg text-slate-600">
                        {t.subtitle}
                    </p>
                </div>
                <button className="px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 w-full md:w-auto justify-center">
                    <span>✍️</span> {t.startDiscussion}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Left Sidebar - Navigation & Groups */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Navigation Menu */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <nav className="flex flex-col">
                            <button
                                onClick={() => setActiveTab('discussions')}
                                className={`px-5 py-4 text-left font-medium flex items-center gap-3 transition-colors ${activeTab === 'discussions' ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                            >
                                <span>💬</span> {t.discussions}
                            </button>
                            <button
                                onClick={() => setActiveTab('safety')}
                                className={`px-5 py-4 text-left font-medium flex items-center gap-3 transition-colors ${activeTab === 'safety' ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                            >
                                <span>🦺</span> {t.safety}
                            </button>
                            <button
                                onClick={() => setActiveTab('stories')}
                                className={`px-5 py-4 text-left font-medium flex items-center gap-3 transition-colors ${activeTab === 'stories' ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                            >
                                <span>🌟</span> {t.stories}
                            </button>
                            <button
                                onClick={() => setActiveTab('jobs')}
                                className={`px-5 py-4 text-left font-medium flex items-center gap-3 transition-colors ${activeTab === 'jobs' ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                            >
                                <span>💼</span> {t.jobs}
                            </button>
                        </nav>
                    </div>

                    {/* My Groups */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-900">{t.myGroups}</h3>
                            <button className="text-xs text-blue-700 font-semibold hover:underline">View All</button>
                        </div>
                        <div className="space-y-3">
                            <GroupItem name="Kolkata Zone Linemen" members="1.2k" active={true} />
                            <GroupItem name="Safety Officers WB" members="850" active={false} />
                            <GroupItem name="WBSEDCL Tech Updates" members="3.4k" active={true} />
                        </div>
                    </div>

                    {/* Trending Tags */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                        <h3 className="font-bold text-slate-900 mb-4">{t.trending}</h3>
                        <div className="flex flex-wrap gap-2">
                            <Tag label="#Kalbaishakhi" />
                            <Tag label="#NewEquipment" />
                            <Tag label="#SalaryHike" />
                            <Tag label="#ExamPrep" />
                            <Tag label="#HeroLineman" />
                        </div>
                    </div>
                </div>

                {/* Main Content Feed */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Pinned Post */}
                    <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                        <div className="flex items-start gap-4">
                            <div className="text-3xl">📢</div>
                            <div>
                                <h3 className="font-bold text-blue-900 mb-1">Community Guidelines Updated</h3>
                                <p className="text-blue-800 text-sm mb-3">
                                    We've updated our posting rules to ensure a safer and more respectful environment for everyone. Please review them before posting.
                                </p>
                                <button className="text-xs font-bold text-blue-700 hover:underline">Read Guidelines</button>
                            </div>
                        </div>
                    </div>

                    {/* Discussion Posts */}
                    <PostCard
                        author="Sanjay Mehta"
                        role="Supervisor"
                        time="2 hours ago"
                        title="Best practices for transformer maintenance during high humidity?"
                        content="I've noticed increased arcing in some of our older distribution transformers with the current humidity levels (85%+). Apart from regular silica gel replacement, what other on-field quick fixes or preventive measures are you guys using in coastal areas like Digha?"
                        tags={["Maintenance", "Technical"]}
                        likes={45}
                        comments={12}
                        views={230}
                    />

                    <PostCard
                        author="Rahul Singh"
                        role="Lineman"
                        time="5 hours ago"
                        title="Finally got my certification! 🎓"
                        content="After 3 months of studying after shifts, I finally cleared the Advanced Safety Protocol certification exam today. Thanks to everyone in the #ExamPrep group for the study materials!"
                        image="https://via.placeholder.com/600x300/e2e8f0/64748b?text=Certificate+Achievement"
                        tags={["Success Story", "Certification"]}
                        likes={189}
                        comments={42}
                        views={850}
                    />

                    <PostCard
                        author="Vikram Reddy"
                        role="Safety Officer"
                        time="1 day ago"
                        title="Urgent: Check your safety belt harness clips"
                        content="We found a manufacturing defect in the batch of safety belts issued last month (Batch ID: SB-2024-05). The secondary lock spring seems weak. Please inspect yours immediately and report to the store if you find any looseness."
                        tags={["Safety Alert", "Equipment"]}
                        likes={342}
                        comments={89}
                        views={1500}
                        isAlert={true}
                    />
                </div>

                {/* Right Sidebar - Top Contributors */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                        <h3 className="font-bold text-slate-900 mb-4">{t.topContributors}</h3>
                        <div className="space-y-4">
                            <ContributorItem name="Amit Patel" points="12,450" badge="🥇" role="Supervisor" />
                            <ContributorItem name="Rajesh Kumar" points="11,200" badge="🥈" role="Lineman" />
                            <ContributorItem name="Priya Sharma" points="10,850" badge="🥉" role="Safety Officer" />
                            <ContributorItem name="David John" points="9,500" badge="🏅" role="Lineman" />
                        </div>
                        <button className="w-full mt-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 rounded-lg transition-colors">
                            View Leaderboard
                        </button>
                    </div>

                    <div className="bg-gradient-to-br from-blue-700 to-blue-900 rounded-2xl shadow-lg p-6 text-white text-center">
                        <div className="text-4xl mb-3">🤝</div>
                        <h3 className="font-bold text-lg mb-2">Invite a Colleague</h3>
                        <p className="text-blue-100 text-sm mb-4">
                            Grow our community! Invite fellow linemen and earn 500 bonus points.
                        </p>
                        <button className="w-full py-2 bg-white text-blue-800 font-bold rounded-lg hover:bg-blue-50 transition-colors">
                            Send Invite
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* Helper Components */

function GroupItem({ name, members, active }) {
    return (
        <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-lg group-hover:bg-white group-hover:shadow-sm transition-all">
                    👥
                </div>
                <div>
                    <div className="font-medium text-slate-900 text-sm">{name}</div>
                    <div className="text-xs text-slate-500">{members} members</div>
                </div>
            </div>
            {active && <div className="w-2 h-2 rounded-full bg-green-500"></div>}
        </div>
    );
}

function Tag({ label }) {
    return (
        <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors">
            {label}
        </span>
    );
}

function ContributorItem({ name, points, badge, role }) {
    return (
        <div className="flex items-center gap-3">
            <div className="text-xl">{badge}</div>
            <div className="flex-1">
                <div className="font-bold text-slate-900 text-sm">{name}</div>
                <div className="text-xs text-slate-500">{role}</div>
            </div>
            <div className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-md">
                {points}
            </div>
        </div>
    );
}

function PostCard({ author, role, time, title, content, image, tags, likes, comments, views, isAlert }) {
    return (
        <div className={`bg-white rounded-2xl shadow-sm border p-6 transition-all hover:shadow-md ${isAlert ? 'border-red-200 bg-red-50/30' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                        {author.charAt(0)}
                    </div>
                    <div>
                        <div className="font-bold text-slate-900 text-sm">{author}</div>
                        <div className="text-xs text-slate-500">{role} • {time}</div>
                    </div>
                </div>
                <button className="text-slate-400 hover:text-slate-600">•••</button>
            </div>

            <h3 className={`text-lg font-bold mb-2 ${isAlert ? 'text-red-700' : 'text-slate-900'}`}>
                {isAlert && <span className="mr-2">🚨</span>}
                {title}
            </h3>

            <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                {content}
            </p>

            {image && (
                <div className="mb-4 rounded-xl overflow-hidden border border-slate-100">
                    <div className="bg-slate-100 h-48 w-full flex items-center justify-center text-slate-400">
                        [Image Placeholder: {tags[0]}]
                    </div>
                </div>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
                {tags.map((tag, index) => (
                    <span key={index} className={`text-xs px-2 py-1 rounded-md font-medium ${isAlert ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                        #{tag}
                    </span>
                ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex gap-6">
                    <button className="flex items-center gap-2 text-slate-500 hover:text-blue-600 text-sm font-medium transition-colors">
                        <span>👍</span> {likes}
                    </button>
                    <button className="flex items-center gap-2 text-slate-500 hover:text-blue-600 text-sm font-medium transition-colors">
                        <span>💬</span> {comments}
                    </button>
                    <button className="flex items-center gap-2 text-slate-500 hover:text-blue-600 text-sm font-medium transition-colors">
                        <span>↗️</span> Share
                    </button>
                </div>
                <div className="text-xs text-slate-400">
                    {views} views
                </div>
            </div>
        </div>
    );
}
