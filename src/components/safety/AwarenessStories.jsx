/* eslint-disable react/prop-types */
import React, { useState, useRef, useEffect } from 'react';
import { Share } from '@capacitor/share';

const StoryCard = ({ story, onClick, language, scrollX }) => {
    const cardRef = useRef(null);
    const [offsetLeft, setOffsetLeft] = useState(0);

    useEffect(() => {
        if (cardRef.current) {
            setOffsetLeft(cardRef.current.offsetLeft);
        }
    }, []);

    // Calculate parallax offset
    const x = offsetLeft - scrollX;
    const imageTransform = `translateX(${x * 0.15}px)`;
    const textTransform = `translateX(${x * 0.08}px)`;

    return (
        <div
            ref={cardRef}
            onClick={() => onClick(story)}
            className="flex-shrink-0 w-[280px] sm:w-[320px] snap-center relative aspect-[4/5] rounded-[2.5rem] overflow-hidden group cursor-pointer transition-all duration-500 hover:scale-[1.02] hover:-translate-y-2 shadow-2xl"
        >
            {/* Background Image with Parallax */}
            <img
                src={story.image}
                alt={story.title[language]}
                className="absolute inset-0 w-[120%] h-full object-cover transition-transform duration-1000 group-hover:scale-110 will-change-transform"
                style={{ transform: imageTransform, left: '-10%' }}
            />

            {/* Dark Dramatic Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-br from-red-600/20 via-transparent to-slate-950/40" />

            {/* Content Container with Parallax */}
            <div
                className="absolute inset-0 p-8 flex flex-col justify-end will-change-transform"
                style={{ transform: textTransform }}
            >
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-600/80 backdrop-blur-md rounded-full border border-red-400/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">
                            {story.category[language]}
                        </span>
                    </div>

                    <h3 className={`text-2xl font-black text-white leading-tight drop-shadow-2xl ${language === 'bn' ? 'font-bengali' : ''}`}>
                        {story.title[language]}
                    </h3>

                    <p className={`text-sm text-red-50/80 leading-relaxed line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${language === 'bn' ? 'font-bengali' : ''}`}>
                        {story.excerpt[language]}
                    </p>

                    <div className="flex items-center justify-between pt-2">
                        <span className="text-[10px] font-bold text-white/50 uppercase tracking-tighter">
                            {language === 'en' ? 'Click to Read' : 'বিস্তারিত পড়তে ক্লিক করুন'}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 group-hover:bg-red-600 group-hover:border-red-500 transition-all">
                            →
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const MoreCard = ({ language, scrollX }) => {
    const cardRef = useRef(null);
    const [offsetLeft, setOffsetLeft] = useState(0);

    useEffect(() => {
        if (cardRef.current) {
            setOffsetLeft(cardRef.current.offsetLeft);
        }
    }, []);

    const x = offsetLeft - scrollX;
    const contentTransform = `translateX(${x * 0.1}px)`;

    const openRepo = () => window.open('https://smartlinemanapp.github.io/accident_story/', '_system');

    return (
        <div
            ref={cardRef}
            onClick={openRepo}
            className="flex-shrink-0 w-[280px] sm:w-[320px] snap-center relative aspect-[4/5] rounded-[2.5rem] overflow-hidden group cursor-pointer transition-all duration-500 hover:scale-[1.02] hover:-translate-y-2 shadow-2xl bg-slate-900 border-2 border-dashed border-white/10"
        >
            {/* Background Texture/Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 via-slate-950 to-slate-950/40" />

            <div
                className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-6 will-change-transform"
                style={{ transform: contentTransform }}
            >
                <div className="w-16 h-16 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500 animate-pulse">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                </div>

                <div className="space-y-2">
                    <h3 className={`text-2xl font-black text-white leading-tight ${language === 'bn' ? 'font-bengali' : ''}`}>
                        {language === 'en' ? 'More True Stories' : 'আরও সত্য কাহিনী'}
                    </h3>
                    <p className={`text-xs text-slate-400 leading-relaxed ${language === 'bn' ? 'font-bengali' : ''}`}>
                        {language === 'en'
                            ? 'Protect your family. Read all real-life stories to stay safe at work.'
                            : 'নিজেকে এবং পরিবারকে বাঁচাতে সব বাস্তব কাহিনীগুলো পড়ুন।'}
                    </p>
                </div>

                <div className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-red-600/30 hover:bg-red-500 transition-all">
                    {language === 'en' ? 'Open All Stories' : 'সবগুলো দেখুন'}
                </div>
            </div>
        </div>
    );
};

const AwarenessStories = ({ setCurrentView, language = 'en' }) => {
    const [selectedStory, setSelectedStory] = useState(null);
    const [scrollX, setScrollX] = useState(0);
    const [detailScrollY, setDetailScrollY] = useState(0);
    const galleryRef = useRef(null);

    const scrollGallery = (direction) => {
        if (galleryRef.current) {
            const scrollAmount = direction === 'left' ? -350 : 350;
            galleryRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    const handleScroll = (e) => {
        setScrollX(e.target.scrollLeft);
    };

    const handleDetailScroll = (e) => {
        setDetailScrollY(e.target.scrollTop);
    };

    // High Impact Story Data (Inspired by Repo Content)
    const stories = [
        {
            id: 'back-feeding-tragedy',
            image: '/assets/emotional/mother.png',
            category: { en: 'Back-Feeding Hazard', bn: 'ব্যাক-ফিডিং বিপদ' },
            title: { en: 'The Fatal Invisible Current', bn: 'রবিকান্তের শেষ শাটডাউন' },
            excerpt: {
                en: 'Rabikanta thought the line was dead. He didn\'t know 11,000V was coming from the other side.',
                bn: 'রবিকান্ত ভেবেছিলেন লাইনটি বন্ধ। তিনি জানতেন না বিপরীত দিক থেকে ১১,০০০ ভোল্ট আসছে।'
            },
            fullContent: {
                en: "On Dec 31, 2023, Rabikanta Barman was working on an 11kV line near Balurghat. A shutdown was taken, but current was flowing from an unchecked 'back-feed' source. The moment he touched the wire, he was thrown off, breaking his spine. After a year of bedridden agony, he passed away. The tragedy turned into a nightmare when his wife abandoned his 60-year-old mother and two children with the insurance money. Today, his elderly mother works as a help to survive, reminding us that technically verifying a 'dead' line is a matter of life or death.",
                bn: "৩১/১২/২০২৩ তারিখে বালুরঘাটের রবিকান্ত বর্মন ১১ কেভি লাইনে কাজ করছিলেন। শাটডাউন নেওয়া হলেও 'ব্যাক-ফিডিং' সোর্স থেকে বিদ্যুৎ আসছিল। তারে হাত দেওয়া মাত্রই তিনি পোল থেকে ছিটকে পড়েন এবং মেরুদণ্ড ভেঙে যায়। এক বছর শয্যাশায়ী থাকার পর তিনি মারা যান। ট্র্যাজেডি এখানেই শেষ হয়নি—তার মৃত্যুর পর স্ত্রী বিমার টাকা নিয়ে বৃদ্ধ মা ও সন্তানদের ফেলে চলে যান। আজ শচী রাণী (৬০) অন্যের বাড়িতে কাজ করে কোনোমতে দিন কাটাচ্ছেন। সঠিক শাটডাউন যাচাই এবং ব্যাক-ফিডিং চেক করা থাকলে আজ এই পরিবারটি ধ্বংস হতো না।"
            }
        },
        {
            id: 'verbal-order-tragedy',
            image: '/assets/emotional/lineman.png',
            category: { en: 'Operational Error', bn: 'অপারেশনাল ভুল' },
            title: { en: 'Oral Orders: A Fatal Trap', bn: 'মৌখিক নির্দেশের মরণফাঁদ' },
            excerpt: {
                en: 'Najimul climbed the DP structure based on verbal orders without a formal shutdown. The line was active.',
                bn: 'যথাযথ শাটডাউন না নিয়ে শুধুমাত্র মৌখিক নির্দেশে লাইনে ওঠায় নাজিমুল ইসলাম মারাত্মক বিদ্যুৎস্পৃষ্ট হন।'
            },
            fullContent: {
                en: "On Nov 10, 2025, Najimul Islam (46) was performing maintenance on the Hatiduba 11kV feeder. Following a verbal instruction from a colleague to restore power, he scaled a DP structure without waiting for a formal shutdown from the operator. The line was still energized. He died instantly, leaving behind his wife Reba, son Rubel (19), daughter Riya (13), and elderly parents. This tragedy teaches us that verbal orders are never a substitute for a written Permit-To-Work. Always use discharge rods to ensure the line is dead and never trust verbal clearance.",
                bn: "১০/১১/২০২৫ তারিখে নাজিমুল ইসলাম (৪৬) হাটিদুবা ১১ কেভি ফিডারের রক্ষণাবেক্ষণের কাজে নিযুক্ত ছিলেন। সহকর্মীর মৌখিক নির্দেশে পাওয়ার রিস্টোরেশনের জন্য তিনি একটি DP স্ট্রাকচারে ওঠেন। কিন্তু তিনি অপারেটরের কাছ থেকে যথাযথ শাটডাউন নেননি। লাইনে তখনও বিদ্যুৎ ছিল, ফলে ঘটনাস্থলেই তার মৃত্যু ঘটে। নাজিমুলের ১৯ বছর বয়সী ছেলে রুবেলের ভবিষ্যৎ আজ অন্ধকারে ঢাকা। সপ্তম শ্রেণীতে পড়ুয়া মেয়ে রিয়া এবং বৃদ্ধ বাবা-মায়ের দায়িত্ব নেওয়ার মতো আর কেউ রইল না। এক মুহূর্তের অসাবধানতা কয়েকটি জীবনের ভবিষ্যৎ কেড়ে নিল। সর্বদা লিখিত অনুমতি নিন এবং ডিসচার্জ রড দিয়ে নিশ্চিত হোন যে লাইনটি মৃত।"
            }
        }
    ];

    const handleShare = async (story) => {
        try {
            await Share.share({
                title: story.title[language],
                text: `${story.title[language]}\n\n${story.excerpt[language]}\n\nStay Safe with SmartLineMan App!`,
                url: 'https://smartlinemanapp.github.io/accident_story/',
                dialogTitle: 'Share Tragic Story'
            });
        } catch (err) {
            console.error("Share Failed:", err);
        }
    };

    return (
        <div className="flex flex-col w-full h-full bg-slate-950 relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[120px] -mr-64 -mt-64" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-slate-800/20 rounded-full blur-[120px] -ml-64 -mb-64" />

            {/* Header */}
            <div className="py-3 flex items-center justify-between px-6 z-30 shrink-0">
                <button
                    onClick={() => selectedStory ? setSelectedStory(null) : setCurrentView('home')}
                    className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div className="text-center">
                    <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em]">Awareness</span>
                    <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none mt-1">
                        {language === 'en' ? 'Tragic Stories' : 'করুণ কাহিনী'}
                    </h2>
                </div>
                <div className="w-10" /> {/* Spacer */}
            </div>

            <div className="flex-1 overflow-y-auto z-10">
                {!selectedStory ? (
                    <div className="px-6 py-8 space-y-10 max-w-4xl mx-auto">
                        {/* ... existing gallery logic ... */}
                        <div className="text-center space-y-4 mb-8">
                            <h1 className={`text-4xl sm:text-5xl font-black text-white italic tracking-tight ${language === 'bn' ? 'font-bengali' : ''}`}>
                                {language === 'en' ? 'Shattered Dreams' : 'ছিন্ন ভিন্ন স্বপ্ন'}
                            </h1>
                            <p className={`text-slate-400 max-w-sm mx-auto text-sm leading-relaxed ${language === 'bn' ? 'font-bengali' : ''}`}>
                                {language === 'en'
                                    ? 'Awareness, Rights and Protection. Too many lives are lost to negligence and indifference.'
                                    : 'সচেতনতা, অধিকার এবং সুরক্ষার উদ্যোগ। উদাসীনতা আর অবহেলার নির্মম বলি হয়ে অকালে হারিয়ে যাচ্ছে কত প্রাণ!'}
                            </p>
                        </div>

                        <div className="relative group/gallery">
                            <button
                                onClick={() => scrollGallery('left')}
                                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 z-30 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 shadow-xl items-center justify-center text-white hover:bg-red-600 transition-all duration-300 hidden lg:flex opacity-0 group-hover/gallery:opacity-100 group-hover/gallery:translate-x-0"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>

                            <button
                                onClick={() => scrollGallery('right')}
                                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-6 z-30 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 shadow-xl items-center justify-center text-white hover:bg-red-600 transition-all duration-300 hidden lg:flex opacity-0 group-hover/gallery:opacity-100 group-hover/gallery:-translate-x-0"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                                </svg>
                            </button>

                            <div
                                ref={galleryRef}
                                onScroll={handleScroll}
                                className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-6 px-6 gap-6 pb-12 scroll-smooth"
                            >
                                {stories.map(story => (
                                    <StoryCard
                                        key={story.id}
                                        story={story}
                                        language={language}
                                        onClick={(s) => {
                                            setDetailScrollY(0);
                                            setSelectedStory(s);
                                        }}
                                        scrollX={scrollX}
                                    />
                                ))}
                                <MoreCard language={language} scrollX={scrollX} />
                            </div>
                        </div>

                        <div className="py-12 border-t border-white/5 flex flex-col items-center gap-4">
                            <p className="text-slate-600 text-[10px] uppercase tracking-widest font-black">
                                © 2026 SmartLineMan Awareness Initiative
                            </p>
                        </div>
                    </div>
                ) : (
                    <div
                        onScroll={handleDetailScroll}
                        className="animate-fadeIn min-h-full bg-slate-950 overflow-y-auto lg:overflow-visible"
                    >
                        <div className="lg:grid lg:grid-cols-2 lg:min-h-full">
                            {/* Story Media Section */}
                            <div className="relative h-[45vh] lg:h-screen w-full overflow-hidden lg:sticky lg:top-0">
                                <img
                                    src={selectedStory.image}
                                    alt={selectedStory.title[language]}
                                    className="w-full h-[120%] object-cover absolute top-0 lg:h-full lg:w-full will-change-transform"
                                    style={{
                                        transform: typeof window !== 'undefined' && window.innerWidth < 1024
                                            ? `translateY(${detailScrollY * 0.4}px)`
                                            : 'none'
                                    }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent z-10" />
                                <div className="absolute bottom-6 left-6 right-6 z-20 lg:bottom-12 lg:left-12 lg:right-12">
                                    <span className="px-3 py-1 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full mb-3 inline-block">
                                        {selectedStory.category[language]}
                                    </span>
                                    <h1 className={`text-3xl sm:text-4xl lg:text-6xl font-black text-white leading-tight ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {selectedStory.title[language]}
                                    </h1>
                                </div>
                            </div>

                            {/* Story Narrative Section */}
                            <div className="p-8 lg:p-20 space-y-12 max-w-2xl mx-auto z-20 relative bg-slate-950 lg:bg-transparent lg:max-w-none lg:w-full">
                                <div className="flex items-center justify-between py-6 border-y border-white/5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center text-white font-black shadow-lg shadow-red-600/30 text-lg">
                                            SLM
                                        </div>
                                        <div>
                                            <div className="text-white text-sm font-black uppercase tracking-widest">Safety Awareness</div>
                                            <div className="text-red-500/60 text-[10px] font-bold uppercase tracking-tighter italic">Verified Report</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleShare(selectedStory)}
                                        className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-2xl text-white transition-all border border-white/10 group"
                                    >
                                        <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                        </svg>
                                    </button>
                                </div>

                                <div className={`text-xl lg:text-2xl text-slate-300 leading-relaxed font-medium reading-content ${language === 'bn' ? 'font-bengali leading-snug' : ''}`}>
                                    {selectedStory.fullContent[language]}
                                </div>

                                <blockquote className="relative p-8 lg:p-12 border-l-8 border-red-600 bg-red-600/5 rounded-r-[3rem] overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 text-red-600/10 scale-150 group-hover:scale-[2] transition-transform duration-1000">
                                        <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C20.1216 16 21.017 16.8954 21.017 18V21C21.017 22.1046 20.1216 23 19.017 23H16.017C14.9124 23 14.017 22.1046 14.017 21ZM14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C20.1216 16 21.017 16.8954 21.017 18V21C21.017 22.1046 20.1216 23 19.017 23H16.017C14.9124 23 14.017 22.1046 14.017 21Z" />
                                        </svg>
                                    </div>
                                    <p className={`text-2xl lg:text-3xl italic text-red-50 font-black tracking-tight relative z-10 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                        {language === 'en'
                                            ? "Your family's happiness is more important than a few minutes saved by skipping rules."
                                            : "নিয়ম এড়িয়ে বাঁচানো কয়েক মিনিটের চেয়ে আপনার পরিবারের হাসি অনেক বেশি মূল্যবান।"}
                                    </p>
                                </blockquote>

                                <div className="flex flex-col sm:flex-row gap-4 pt-12">
                                    <button
                                        onClick={() => {
                                            setSelectedStory(null);
                                            setDetailScrollY(0);
                                        }}
                                        className="flex-1 py-5 bg-white text-slate-950 rounded-[2rem] font-black hover:bg-red-500 hover:text-white transition-all active:scale-[0.98] uppercase tracking-[0.2em] text-xs shadow-xl shadow-white/5"
                                    >
                                        {language === 'en' ? 'Back to Gallery' : 'গ্যালারিতে ফিরে যান'}
                                    </button>
                                    <button
                                        onClick={() => handleShare(selectedStory)}
                                        className="flex-1 py-5 bg-white/5 border border-white/10 text-white rounded-[2rem] font-black hover:bg-white/10 transition-all active:scale-[0.98] uppercase tracking-[0.2em] text-xs"
                                    >
                                        {language === 'en' ? 'Share Story' : 'শেয়ার করুন'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AwarenessStories;
