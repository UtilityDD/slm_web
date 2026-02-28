const fs = require('fs');
const path = require('path');

const filePath = path.join('d:', 'Dipankar', 'MyCodes', 'AndroidProjects', 'slm_web', 'src', 'components', 'safety', 'Training.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const newBlock = `/* Nodes */
                                    <div className="relative z-10">
                                        {roadmapItems.map((item, index) => {
                                            const amplitude = isMobile ? 25 : 35;
                                            const xPos = 50 + Math.sin(index * 0.8) * amplitude;
                                            const yPos = index * nodeVerticalGap + 60;

                                            if (item.type === 'milestone') {
                                                const firstLesson = roadmapItems[index + 1];
                                                const milestoneUnlocked = firstLesson ? firstLesson.isUnlocked : true;
                                                return (
                                                    <div key={\`milestone-\${item.chapter.number}\`} className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-700" style={{ left: \`\${xPos}%\`, top: yPos }}>
                                                        <div className={\`p-4 rounded-[2rem] border-4 backdrop-blur-xl flex flex-col items-center gap-2 shadow-2xl transition-all \${milestoneUnlocked ? \`\${item.badge.color} scale-110 border-white dark:border-slate-700\` : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 grayscale opacity-60'}\`}>
                                                            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl shadow-inner">{milestoneUnlocked ? '🏆' : '🔒'}</div>
                                                            <div className="text-center">
                                                                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-0.5">{language === 'en' ? 'Rank' : 'পদমর্যাদা'}</p>
                                                                <h3 className={\`font-black whitespace-nowrap \${language === 'bn' ? 'font-bengali text-lg' : 'text-sm'}\`}>{language === 'en' ? item.badge.en : item.badge.bn}</h3>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            const isNext = !item.isCompleted && item.isUnlocked;
                                            return (
                                                <div 
                                                    key={\`lesson-\${item.id}\`}
                                                    onClick={() => handleChapterClick(journeyChapters.find(c => c.number === item.chapterNumber))}
                                                    className={\`absolute -translate-x-1/2 -translate-y-1/2 w-16 h-16 sm:w-20 sm:h-20 rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-500 z-20 group \${item.isCompleted ? 'bg-gradient-to-br from-emerald-500 to-teal-600 border-4 border-emerald-100 dark:border-emerald-500/30 text-white shadow-xl hover:scale-110' : item.isUnlocked ? \`\${item.badge.color} border-4 border-white dark:border-slate-700 text-slate-900 dark:text-white shadow-xl hover:scale-110 active:scale-95\` : 'bg-slate-100 dark:bg-slate-800 border-4 border-slate-200 dark:border-slate-700 text-slate-300 shadow-inner grayscale opacity-40'} \${isNext ? 'animate-float-y ring-4 ring-orange-500/30' : ''}\`}
                                                    style={{ left: \`\${xPos}%\`, top: yPos }}
                                                >
                                                    <span className={\`text-base sm:text-lg font-black \${language === 'bn' ? 'font-bengali' : ''}\`}>{toBengaliNumber(item.id, language)}</span>
                                                    <div className={\`absolute top-full mt-3 w-32 px-3 py-2 bg-slate-900/90 backdrop-blur-md rounded-xl text-[10px] text-white font-bold text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-50 \${language === 'bn' ? 'font-bengali' : ''}\`}>
                                                        {language === 'en' ? 'Quick Read' : 'দ্রুত পড়ুন'}
                                                    </div>
                                                    {item.isCompleted && (
                                                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg text-white">
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>\`;

// Targeted regex to find the roadmapItems map inside a div.relative z-10
const targetRegex = /<div className="relative z-10">[\s\S]*?roadmapItems\.map[\s\S]*?chapter-node-[\s\S]*?<\/div>\s*\}\)\s*<\/div>/;

if (targetRegex.test(content)) {
    fs.writeFileSync(filePath, content.replace(targetRegex, newBlock));
    console.log('Successfully replaced using targetRegex.');
} else {
    // Try a second variant if the first fails
    const secondRegex = /<div className="relative z-10">[\s\S]*?roadmapItems\.map[\s\S]*?isLocked[\s\S]*?<\/div>\s*\}\)\s*<\/div>/;
    if (secondRegex.test(content)) {
        fs.writeFileSync(filePath, content.replace(secondRegex, newBlock));
        console.log('Successfully replaced using secondRegex.');
    } else {
        console.error('Failed to find matching roadmap block.');
    }
}
