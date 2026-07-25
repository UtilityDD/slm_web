import fs from 'fs';

const htmlPath = 'public/quiz_management/ls01_quiz_preview.html';
const quizPath = 'public/quizzes/questions_supp_10_1.json';

const quiz = fs.readFileSync(quizPath, 'utf8').trim();
let html = fs.readFileSync(htmlPath, 'utf8');

html = html.replace(
  /Source: <code>\/quizzes\/questions_supp_10_1\.json<\/code> · App picks 10 random per attempt/,
  'Embedded snapshot of <code>questions_supp_10_1.json</code> · open this file directly · App picks 10 random per attempt'
);

const loader = `    const QUIZ_DATA = ${quiz};

    render(QUIZ_DATA);`;

const next = html.replace(
  /    fetch\('\/quizzes\/questions_supp_10_1\.json'\)[\s\S]*?\}\);/,
  loader
);

if (next === html) {
  console.error('Failed to replace fetch block');
  process.exit(1);
}

fs.writeFileSync(htmlPath, next);
console.log('OK:', htmlPath);
