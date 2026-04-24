const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src', 'components', 'ChapterQuizModal.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace the mess I made on 544
content = content.replace(
    /\{isPassed \? \(language === 'en' \? 'Passed' : \(language === 'en' \? 'Passed' : 'উত্তীর্ণ'\) : \(language === 'en' \? 'Retry' : 'আবার চেষ্টা করুন'\)\}/,
    "{isPassed ? (language === 'en' ? 'Passed' : 'উত্তীর্ণ') : (language === 'en' ? 'Retry' : 'আবার চেষ্টা করুন')}"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Final fix applied');
