const items = [
  ['Pigeon', 'https://amzn.in/d/05IggcI9'],
  ['Clay', 'https://amzn.in/d/0gd9H4Rr'],
  ['Perwal', 'https://amzn.in/d/0eRRig3M'],
  ['Duracell', 'https://amzn.in/d/05k2yQB2'],
];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0';

for (const [name, url] of items) {
  const first = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': UA } });
  const asin = first.url.match(/\/dp\/([A-Z0-9]{10})/i)?.[1];
  const pageUrl = `https://www.amazon.in/dp/${asin}`;
  const res = await fetch(pageUrl, { headers: { 'User-Agent': UA } });
  const t = await res.text();
  const hires = [...t.matchAll(/"hiRes":"([^"]+)"/g)].map((m) => m[1].replace(/\\u002F/g, '/'));
  console.log('\n', name, 'asin', asin, 'len', t.length, 'hiRes', hires.length);
  console.log(' first', hires[0]);
}
