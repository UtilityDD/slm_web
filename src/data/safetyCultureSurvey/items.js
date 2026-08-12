import { ITEM_SET_VERSION } from './topics.js';

/**
 * Safety culture dual bank v1.
 * text_* = কী করা উচিত (rule/action)
 * hoy_text_* = এলাকায় সাধারণত কী হয় (field practice wording — not the same as উচিত)
 */
export const SAFETY_CULTURE_ITEMS = [
  {
    id: 'ppe_01',
    topic: 'ppe',
    scenario_bn:
      'বৃষ্টির পর রাবার গ্লাভস ভিজে গেছে। ফিডার তাড়াতাড়ি চালু করতে চাপ আছে। সহকর্মী বলছে, “সামান্য কাজ তো, ভিজে গ্লাভসেই সেরে ফেলি।”',
    scenario_en:
      'Rubber gloves are wet after rain. Pressure to restore feeder quickly. Coworker says finish with wet gloves.',
    options: [
      {
        key: 'A',
        text_bn: 'ভিজে গ্লাভসেই কাজ করা',
        text_en: 'Work with wet gloves',
        hoy_text_bn: 'অনেকেই ভিজে গ্লাভসে কাজ করে ফেলে',
        hoy_text_en: 'Many finish the job with wet gloves',
        k_score: 0,
        p_score: 0,
      },
      {
        key: 'B',
        text_bn: 'শুকনো বা ভালো গ্লাভস পরে তবে কাজ করা',
        text_en: 'Put on dry/good gloves, then work',
        hoy_text_bn: 'বেশিরভাগই গ্লাভস ঠিক করে তবে কাজ করে',
        hoy_text_en: 'Most fix gloves first, then work',
        k_score: 3,
        p_score: 3,
      },
      {
        key: 'C',
        text_bn: 'সুপারভাইজার যা বলবে তাই করা',
        text_en: 'Do whatever the supervisor says',
        hoy_text_bn: 'সুপারভাইজার যা বলবে, সেটাই হয়ে থাকে',
        hoy_text_en: 'Whatever the supervisor says is what happens',
        k_score: 1,
        p_score: 1,
      },
    ],
  },
  {
    id: 'ppe_02',
    topic: 'ppe',
    scenario_bn:
      'পোলের নিচে ছোট কাজ। হেলমেট গাড়িতে আছে। কেউ বলছে, “নিচে তো, হেলমেট লাগবে না।”',
    scenario_en:
      'Small job under the pole. Helmet is in the vehicle. Someone says no helmet needed on the ground.',
    options: [
      {
        key: 'A',
        text_bn: 'হেলমেট ছাড়াই কাজ করা',
        text_en: 'Work without helmet',
        hoy_text_bn: 'অনেকেই নিচের কাজে হেলমেট ছাড়ে',
        hoy_text_en: 'Many skip helmet for ground jobs',
        k_score: 0,
        p_score: 0,
      },
      {
        key: 'B',
        text_bn: 'হেলমেট এনে পরে তবে কাজ করা',
        text_en: 'Bring and wear helmet first',
        hoy_text_bn: 'বেশিরভাগই হেলমেট পরে তবে কাজ করে',
        hoy_text_en: 'Most wear helmet before working',
        k_score: 3,
        p_score: 3,
      },
      {
        key: 'C',
        text_bn: 'উপরে কিছু থাকলে তবে হেলমেট পরা',
        text_en: 'Wear helmet only if something is overhead',
        hoy_text_bn: 'শুধু উপরে ঝুঁকি দেখলে হেলমেট পরে',
        hoy_text_en: 'They wear helmet only if overhead risk shows',
        k_score: 1,
        p_score: 1,
      },
    ],
  },
  {
    id: 'height_01',
    topic: 'height',
    scenario_bn:
      'পোলে ওঠার আগে দেখলেন হারনেস ঠিকমতো লক হয়নি। সহকর্মী ইতিমধ্যে উঠে গেছে। কেউ বলছে, “দেরি কোরো না।”',
    scenario_en:
      'Harness not locked properly. Coworkers already up. Someone says do not delay.',
    options: [
      {
        key: 'A',
        text_bn: 'থেমে না থেকে উঠে যাওয়া',
        text_en: 'Climb without stopping',
        hoy_text_bn: 'অনেকেই থেমে না থেকে উঠে যায়',
        hoy_text_en: 'Many climb without stopping',
        k_score: 0,
        p_score: 0,
      },
      {
        key: 'B',
        text_bn: 'হারনেস ঠিক করে উঠা; দরকার হলে সহকর্মীকেও বলা',
        text_en: 'Fix harness first; tell coworkers if needed',
        hoy_text_bn: 'বেশিরভাগই হারনেস ঠিক করে তবে ওঠে',
        hoy_text_en: 'Most fix harness before climbing',
        k_score: 3,
        p_score: 3,
      },
      {
        key: 'C',
        text_bn: 'নিজে ঠিক করে উঠা, কাউকে না বলা',
        text_en: 'Fix your own quietly and climb',
        hoy_text_bn: 'কেউ কেউ নিজে ঠিক করে ওঠে, কাউকে বলে না',
        hoy_text_en: 'Some fix quietly and tell no one',
        k_score: 2,
        p_score: 2,
      },
    ],
  },
  {
    id: 'height_02',
    topic: 'height',
    scenario_bn:
      'সিনিয়র বলছেন, “ঝট করে পোলে উঠে দেখে নে—পিন ইনসুলেটরটা ফাটা কিনা। এখন বেল্ট লাগবে না, কাজের সময় দেখা যাবে।”',
    scenario_en:
      'Senior says climb quickly to check pin insulator crack. No belt now; later during work.',
    options: [
      {
        key: 'A',
        text_bn: 'সিনিয়রের কথা মতো বেল্ট ছাড়াই উঠে দেখে নেওয়া',
        text_en: 'Climb without belt to check, as senior said',
        hoy_text_bn: 'অনেকেই বেল্ট ছাড়া উঠে দেখে নেয়',
        hoy_text_en: 'Many climb without belt just to check',
        k_score: 0,
        p_score: 0,
      },
      {
        key: 'B',
        text_bn: 'বেল্ট বা হারনেস ছাড়া পোলে না ওঠা',
        text_en: 'Do not climb without belt/harness',
        hoy_text_bn: 'বেশিরভাগই বেল্ট ছাড়া পোলে ওঠে না',
        hoy_text_en: 'Most do not climb without belt',
        k_score: 3,
        p_score: 3,
      },
      {
        key: 'C',
        text_bn: 'শুধু দেখে আসার জন্য বেল্ট ছাড়া উঠা চলবে',
        text_en: 'OK to climb without belt just to look',
        hoy_text_bn: 'শুধু দেখে আসার কাজে বেল্ট ছাড়ে',
        hoy_text_en: 'They skip belt for a quick look',
        k_score: 0,
        p_score: 0,
      },
    ],
  },
  {
    id: 'clearance_01',
    topic: 'clearance',
    scenario_bn:
      'লাইনে ছোট কাজ আছে। সিনিয়র বলছেন, “ট্রিপ করিয়ে কাজ করে নে। শাটডাউন ক্লিয়ারেন্সের দরকার নেই—দেরি হয়ে যাবে।”',
    scenario_en:
      'Small line job. Senior says trip and finish—no shutdown clearance, that delays.',
    options: [
      {
        key: 'A',
        text_bn: 'ট্রিপ করিয়ে ক্লিয়ারেন্স ছাড়াই কাজ সেরে ফেলা',
        text_en: 'Trip and finish without clearance',
        hoy_text_bn: 'অনেকেই ট্রিপ করিয়ে ক্লিয়ারেন্স ছাড়া কাজ করে ফেলে',
        hoy_text_en: 'Many trip and work without clearance',
        k_score: 0,
        p_score: 0,
      },
      {
        key: 'B',
        text_bn: 'শাটডাউন ক্লিয়ারেন্স ছাড়া হাত না দেওয়া',
        text_en: 'Do not touch without shutdown clearance',
        hoy_text_bn: 'বেশিরভাগই ক্লিয়ারেন্স ছাড়া হাত দেয় না',
        hoy_text_en: 'Most do not touch without clearance',
        k_score: 3,
        p_score: 3,
      },
      {
        key: 'C',
        text_bn: 'তাড়া থাকলে ট্রিপ করেই কাজ করা চলবে',
        text_en: 'OK to trip and work if rushed',
        hoy_text_bn: 'তাড়া থাকলে ট্রিপ করেই কাজ হয়ে যায়',
        hoy_text_en: 'When rushed, they trip and work',
        k_score: 0,
        p_score: 0,
      },
    ],
  },
  {
    id: 'clearance_02',
    topic: 'clearance',
    scenario_bn:
      'অপারেটর ফোনে বললেন, “লাইন কেটে দিয়েছি।” কাগজে ক্লিয়ারেন্স নেই। কেউ বলছে, “বিশ্বাস করেই কাজ শুরু করা যায়।”',
    scenario_en:
      'Operator said on phone line is cut. No written clearance. Someone says trust is enough.',
    options: [
      {
        key: 'A',
        text_bn: 'ফোনের কথায় বিশ্বাস করে কাজ শুরু করা',
        text_en: 'Start on phone trust alone',
        hoy_text_bn: 'অনেকেই ফোনের কথায় বিশ্বাস করে কাজ শুরু করে',
        hoy_text_en: 'Many start on phone trust alone',
        k_score: 0,
        p_score: 0,
      },
      {
        key: 'B',
        text_bn: 'ক্লিয়ারেন্স নিয়ে, পরে ডিসচার্জ রড ও আর্থ চেইন দিয়ে দেখে তবে কাজ করা',
        text_en: 'Get clearance, then check with discharge rod and earth chain',
        hoy_text_bn: 'বেশিরভাগই ক্লিয়ারেন্স নিয়ে, পরে রড ও আর্থ দিয়ে দেখে কাজ করে',
        hoy_text_en: 'Most get clearance then check with rod and earth',
        k_score: 3,
        p_score: 3,
      },
      {
        key: 'C',
        text_bn: 'কাগজের ক্লিয়ারেন্স পেলেই যথেষ্ট, আর দেখার দরকার নেই',
        text_en: 'Paper clearance is enough; no more check',
        hoy_text_bn: 'কাগজ পেলেই অনেকে আর সাইটে দেখে না',
        hoy_text_en: 'Many stop checking once paper is in hand',
        k_score: 1,
        p_score: 1,
      },
    ],
  },
  {
    id: 'earthing_01',
    topic: 'earthing',
    scenario_bn:
      'কন্ট্রোল বলছে লাইন ডেড। সহকর্মী বলছে, “ডিসচার্জ রড বা আর্থ চেইন আর লাগবে না। সময় নষ্ট কেন?”',
    scenario_en:
      'Control says line is dead. Coworker says no need for discharge rod or earth chain.',
    options: [
      {
        key: 'A',
        text_bn: 'কথায় বিশ্বাস করে ডিসচার্জ বা আর্থ ছাড়াই কাজ শুরু',
        text_en: 'Start on trust without discharge/earth',
        hoy_text_bn: 'অনেকেই কথায় বিশ্বাস করে ডিসচার্জ বা আর্থ ছাড়ে',
        hoy_text_en: 'Many skip discharge/earth on trust',
        k_score: 0,
        p_score: 0,
      },
      {
        key: 'B',
        text_bn: 'ভালো ডিসচার্জ রড দিয়ে দেখে, দরকারমতো আর্থ চেইন লাগিয়ে তবে কাজ',
        text_en: 'Check with proper discharge rod; fit earth chain as needed',
        hoy_text_bn: 'বেশিরভাগই রড দিয়ে দেখে, আর্থ চেইন লাগিয়ে তবে কাজ করে',
        hoy_text_en: 'Most check with rod and fit earth chain',
        k_score: 3,
        p_score: 3,
      },
      {
        key: 'C',
        text_bn: 'চোখে দেখে ডেড মনে হলেই এগোনো',
        text_en: 'Go ahead if it looks dead',
        hoy_text_bn: 'কেউ কেউ চোখে দেখে ডেড মনে করেই এগোয়',
        hoy_text_en: 'Some go ahead if it looks dead',
        k_score: 0,
        p_score: 0,
      },
    ],
  },
  {
    id: 'earthing_02',
    topic: 'earthing',
    scenario_bn:
      'ডিসচার্জ রড একবার ছুঁইয়ে দেখা হয়েছে। কেউ বলছে, “আর আর্থ চেইন লাগানোর দরকার নেই। তাড়াতাড়ি সেরে ফেলি।”',
    scenario_en:
      'Discharge rod touched once. Someone says skip earth chain to finish fast.',
    options: [
      {
        key: 'A',
        text_bn: 'একবার ডিসচার্জ দেখেই আর্থ চেইন বাদ দিয়ে কাজ',
        text_en: 'Skip earth chain after one discharge check',
        hoy_text_bn: 'অনেকেই একবার ডিসচার্জ দেখেই আর্থ চেইন বাদ দেয়',
        hoy_text_en: 'Many skip earth chain after one discharge',
        k_score: 0,
        p_score: 0,
      },
      {
        key: 'B',
        text_bn: 'ডিসচার্জ রড আর আর্থ চেইন—নিয়মমতো দুটোই করে তবে কাজ',
        text_en: 'Do both discharge rod and earth chain as required',
        hoy_text_bn: 'বেশিরভাগই রড আর আর্থ চেইন দুটোই করে',
        hoy_text_en: 'Most do both rod and earth chain',
        k_score: 3,
        p_score: 3,
      },
      {
        key: 'C',
        text_bn: 'তাড়া থাকলে শুধু ডিসচার্জ; সময় থাকলে আর্থ চেইন',
        text_en: 'Only discharge if rushed; earth chain if time',
        hoy_text_bn: 'তাড়া থাকলে শুধু ডিসচার্জ দিয়েই কাজ হয়',
        hoy_text_en: 'When rushed, only discharge is done',
        k_score: 0,
        p_score: 0,
      },
    ],
  },
  {
    id: 'approach_01',
    topic: 'approach',
    scenario_bn:
      'সিনিয়র বললেন, “লাইন নিশ্চয় ডেড।” কেউ ডিসচার্জ রড ছাড়াই কাছে যেতে চাইছে।',
    scenario_en:
      'Senior says line is surely dead. Someone wants to go close without discharge rod.',
    options: [
      {
        key: 'A',
        text_bn: 'সিনিয়রের কথায় বিশ্বাস করে কাছে যাওয়া',
        text_en: 'Go close on senior’s word',
        hoy_text_bn: 'অনেকেই সিনিয়রের কথায় বিশ্বাস করে কাছে যায়',
        hoy_text_en: 'Many go close on senior’s word',
        k_score: 0,
        p_score: 0,
      },
      {
        key: 'B',
        text_bn: 'নিজে ভালো ডিসচার্জ রড দিয়ে দেখে তবে কাছে যাওয়া',
        text_en: 'Check yourself with proper discharge rod first',
        hoy_text_bn: 'বেশিরভাগই নিজে রড দিয়ে দেখে তবে কাছে যায়',
        hoy_text_en: 'Most check with rod themselves first',
        k_score: 3,
        p_score: 3,
      },
      {
        key: 'C',
        text_bn: 'অন্য কেউ ছুঁয়ে দেখলে নিজে আর না দেখা',
        text_en: 'Skip your own check if someone else touched',
        hoy_text_bn: 'অন্য কেউ দেখলে অনেকে নিজে আর দেখে না',
        hoy_text_en: 'Many skip own check if someone else checked',
        k_score: 0,
        p_score: 0,
      },
    ],
  },
  {
    id: 'approach_02',
    topic: 'approach',
    scenario_bn:
      'জায়গা সরু। নিরাপদ দূরত্ব রাখলে কাজ করা কষ্ট। কেউ বলছে, “একটু কাছে গেলেই হয়।”',
    scenario_en:
      'Tight space. Safe distance makes work hard. Someone says move a bit closer.',
    options: [
      {
        key: 'A',
        text_bn: 'কাজের সুবিধায় দূরত্ব কমিয়ে দেওয়া',
        text_en: 'Reduce distance for ease of work',
        hoy_text_bn: 'অনেকেই কাজের সুবিধায় দূরত্ব কমিয়ে দেয়',
        hoy_text_en: 'Many reduce distance for convenience',
        k_score: 0,
        p_score: 0,
      },
      {
        key: 'B',
        text_bn: 'নিরাপদ দূরত্ব না ভাঙা; অন্য নিরাপদ উপায়ে কাজ করা',
        text_en: 'Do not break safe distance; use another safe way',
        hoy_text_bn: 'বেশিরভাগই নিরাপদ দূরত্ব রাখে',
        hoy_text_en: 'Most keep safe distance',
        k_score: 3,
        p_score: 3,
      },
      {
        key: 'C',
        text_bn: 'তাড়াতাড়ির জন্য একটু কাছে চলে যাওয়া',
        text_en: 'Move closer just to finish faster',
        hoy_text_bn: 'তাড়াতাড়িতে অনেকে একটু কাছে চলে যায়',
        hoy_text_en: 'When rushed, many move closer',
        k_score: 0,
        p_score: 0,
      },
    ],
  },
  {
    id: 'stop_work_01',
    topic: 'stop_work',
    scenario_bn:
      'নিরাপত্তা এখনো পুরো হয়নি। সুপারভাইজার বলছেন, “আজ শেষ করতেই হবে।”',
    scenario_en:
      'Safety setup not complete. Supervisor says finish today.',
    options: [
      {
        key: 'A',
        text_bn: 'চাপ মেনে অসম্পূর্ণ নিরাপত্তায় কাজ চালানো',
        text_en: 'Continue with incomplete safety under pressure',
        hoy_text_bn: 'অনেকেই চাপে অসম্পূর্ণ নিরাপত্তায় কাজ চালায়',
        hoy_text_en: 'Many continue under pressure with incomplete safety',
        k_score: 0,
        p_score: 0,
      },
      {
        key: 'B',
        text_bn: 'নিরাপদ না হওয়া পর্যন্ত কাজ না করা; স্পষ্ট করে বলা',
        text_en: 'Do not work until safe; say it clearly',
        hoy_text_bn: 'বেশিরভাগই নিরাপদ না হলে কাজ থামিয়ে বলে',
        hoy_text_en: 'Most stop and speak up until it is safe',
        k_score: 3,
        p_score: 3,
      },
      {
        key: 'C',
        text_bn: 'মন খারাপ হলেও নির্দেশ মেনে চলা',
        text_en: 'Follow the order even if unhappy',
        hoy_text_bn: 'মন খারাপ হলেও নির্দেশ মেনে চলে',
        hoy_text_en: 'They follow orders even if unhappy',
        k_score: 0,
        p_score: 0,
      },
    ],
  },
  {
    id: 'stop_work_02',
    topic: 'stop_work',
    scenario_bn:
      'এলাকায় লোকজন রেগে আছে। কেউ বলছে, “নিয়ম বাদ দিয়ে তাড়াতাড়ি লাইন চালু করো।”',
    scenario_en:
      'Locals are angry. Someone says skip rules and restore power fast.',
    options: [
      {
        key: 'A',
        text_bn: 'লোকজনের রাগ এড়াতে নিয়ম ভাঙা',
        text_en: 'Break rules to calm people',
        hoy_text_bn: 'অনেকেই লোকজনের রাগে নিয়ম ভাঙে',
        hoy_text_en: 'Many bend rules when people get angry',
        k_score: 0,
        p_score: 0,
      },
      {
        key: 'B',
        text_bn: 'নিয়ম রেখে যতটা নিরাপদে তাড়াতাড়ি করা; সংক্ষেপে বলা',
        text_en: 'Keep rules, work as fast as safely possible; explain briefly',
        hoy_text_bn: 'বেশিরভাগই নিয়ম রেখেই যতটা সম্ভব তাড়াতাড়ি করে',
        hoy_text_en: 'Most keep rules and still work as fast as safe',
        k_score: 3,
        p_score: 3,
      },
      {
        key: 'C',
        text_bn: 'লোকজনের সামনে দেখানোর জন্য ঝুঁকি নেওয়া',
        text_en: 'Take risk to look strong in front of people',
        hoy_text_bn: 'কেউ কেউ লোকজনের সামনে দেখাতে ঝুঁকি নেয়',
        hoy_text_en: 'Some take risk to look strong in public',
        k_score: 0,
        p_score: 0,
      },
    ],
  },
  {
    id: 'reporting_01',
    topic: 'reporting',
    scenario_bn:
      'কাজের পর মনে পড়ল আর্থ চেক ভুলে গিয়েছিলেন। কেউ দেখেনি। লাইন পরে ঠিকই চালু হয়েছে।',
    scenario_en:
      'After work you remember forgetting earth check. Nobody saw. Line later restored fine.',
    options: [
      {
        key: 'A',
        text_bn: 'চুপ থাকা—কিছু হয়নি তো',
        text_en: 'Stay quiet—nothing happened',
        hoy_text_bn: 'অনেকেই চুপ করে থাকে—কিছু হয়নি বলে',
        hoy_text_en: 'Many stay quiet saying nothing happened',
        k_score: 0,
        p_score: 0,
      },
      {
        key: 'B',
        text_bn: 'সঙ্গে সঙ্গে ইনচার্জকে বলে নিরাপদভাবে আবার চেক করা',
        text_en: 'Tell in-charge at once and recheck safely',
        hoy_text_bn: 'বেশিরভাগই ইনচার্জকে বলে আবার চেক করে',
        hoy_text_en: 'Most tell in-charge and recheck',
        k_score: 3,
        p_score: 3,
      },
      {
        key: 'C',
        text_bn: 'শুধু বন্ধুকে বলা, উপরের কাছে না বলা',
        text_en: 'Tell only a friend, not upward',
        hoy_text_bn: 'কেউ কেউ শুধু বন্ধুকে বলে, উপরে বলে না',
        hoy_text_en: 'Some tell only a friend, not upward',
        k_score: 1,
        p_score: 1,
      },
    ],
  },
  {
    id: 'reporting_02',
    topic: 'reporting',
    scenario_bn:
      'সহকর্মী প্রায় পড়ে যাচ্ছিলেন; আপনি ধরে ফেলেছেন। কেউ বলছে, “বড় কিছু হয়নি। রিপোর্ট করলে ঝামেলা।”',
    scenario_en:
      'Coworker almost fell; you caught him. Someone says do not report—trouble.',
    options: [
      {
        key: 'A',
        text_bn: 'না জানানো—ঝামেলা এড়ানো',
        text_en: 'Do not tell—avoid trouble',
        hoy_text_bn: 'অনেকেই না জানায়—ঝামেলা এড়াতে',
        hoy_text_en: 'Many do not report to avoid trouble',
        k_score: 0,
        p_score: 0,
      },
      {
        key: 'B',
        text_bn: 'জানানো—যাতে সবাই সাবধান হয়',
        text_en: 'Report so everyone stays careful',
        hoy_text_bn: 'বেশিরভাগই জানায়—যাতে সবাই সাবধান হয়',
        hoy_text_en: 'Most report so others stay careful',
        k_score: 3,
        p_score: 3,
      },
      {
        key: 'C',
        text_bn: 'শুধু নিজেদের মধ্যে সাবধান থাকা, উপরে না বলা',
        text_en: 'Warn only inside the crew',
        hoy_text_bn: 'শুধু নিজেদের মধ্যে সাবধান থাকে, উপরে বলে না',
        hoy_text_en: 'They warn only among themselves',
        k_score: 1,
        p_score: 1,
      },
    ],
  },
  {
    id: 'tools_01',
    topic: 'tools',
    scenario_bn:
      'ভালো ডিসচার্জ রড নেই বা নষ্ট। কেউ PVC পাইপ দিয়ে বানানো লোকাল রড এনেছে। বলছে, “এতেই চলে। অনেকেই এটাই ব্যবহার করে।”',
    scenario_en:
      'No proper discharge rod. Someone brings local PVC rod and says everyone uses it.',
    options: [
      {
        key: 'A',
        text_bn: 'PVC বা লোকাল রড দিয়েই ডিসচার্জ করে কাজ করা',
        text_en: 'Discharge with PVC/local rod and work',
        hoy_text_bn: 'অনেকেই PVC বা লোকাল রড দিয়েই কাজ করে',
        hoy_text_en: 'Many work with PVC/local rods',
        k_score: 0,
        p_score: 0,
      },
      {
        key: 'B',
        text_bn: 'সঠিক ডিসচার্জ রড ছাড়া কাজ না করা; ভালো রড এনে তবে এগোনো',
        text_en: 'Do not work without proper discharge rod',
        hoy_text_bn: 'বেশিরভাগই সঠিক রড ছাড়া কাজ করে না',
        hoy_text_en: 'Most do not work without proper rod',
        k_score: 3,
        p_score: 3,
      },
      {
        key: 'C',
        text_bn: 'লো ভোল্টেজে PVC রড চলবে, হাই-এ নয়',
        text_en: 'PVC rod OK on LV, not HV',
        hoy_text_bn: 'লো ভোল্টেজে PVC রড ব্যবহার হয়',
        hoy_text_en: 'PVC rods are used on LV',
        k_score: 0,
        p_score: 0,
      },
    ],
  },
  {
    id: 'tools_02',
    topic: 'tools',
    scenario_bn:
      'যে ডিসচার্জ রড বা টেস্টার আছে, অনেকদিন চেক হয়নি। এখনই লাইন দেখতে হবে।',
    scenario_en:
      'Discharge rod or tester not checked for a long time. Line must be checked now.',
    options: [
      {
        key: 'A',
        text_bn: 'যেমন আছে তেমন দিয়েই লাইন দেখা',
        text_en: 'Check the line with gear as-is',
        hoy_text_bn: 'অনেকেই যেমন আছে তেমন দিয়েই লাইন দেখে',
        hoy_text_en: 'Many check the line with gear as-is',
        k_score: 0,
        p_score: 0,
      },
      {
        key: 'B',
        text_bn: 'আগে রড বা টেস্টার ঠিক আছে কিনা দেখে, না হলে ভালো গিয়ার এনে ব্যবহার',
        text_en: 'First check the gear; if not OK, bring good gear',
        hoy_text_bn: 'বেশিরভাগই আগে গিয়ার চেক করে তবে ব্যবহার করে',
        hoy_text_en: 'Most check gear first, then use',
        k_score: 3,
        p_score: 3,
      },
      {
        key: 'C',
        text_bn: 'অন্যের গিয়ার ধার করে নেওয়া; নিজেরটা না দেখা',
        text_en: 'Borrow someone’s gear; skip checking your own',
        hoy_text_bn: 'কেউ কেউ অন্যের গিয়ার ধার করে, নিজেরটা দেখে না',
        hoy_text_en: 'Some borrow gear and skip checking their own',
        k_score: 1,
        p_score: 1,
      },
    ],
  },
];

export const SAFETY_CULTURE_PROMPTS = {
  uchit_bn: 'কী করা উচিত?',
  uchit_en: 'What should be done?',
  hoy_bn: 'আপনার এলাকায় সাধারণত কী হয়?',
  hoy_en: 'What usually happens in your area?',
};

export { ITEM_SET_VERSION };

export function getItemById(id) {
  return SAFETY_CULTURE_ITEMS.find((item) => item.id === id) || null;
}

export function getOptionScore(item, optionKey, layer) {
  const opt = item?.options?.find((o) => o.key === optionKey);
  if (!opt) return 0;
  return layer === 'hoy' ? opt.p_score : opt.k_score;
}

/** Label for উচিত vs হয় step. */
export function getOptionLabel(opt, { bn = true, step = 'uchit' } = {}) {
  if (!opt) return '';
  if (step === 'hoy') {
    if (bn) return opt.hoy_text_bn || opt.text_bn;
    return opt.hoy_text_en || opt.text_en;
  }
  return bn ? opt.text_bn : opt.text_en;
}
