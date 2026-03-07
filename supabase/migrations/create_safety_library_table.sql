-- Create the Safety Library table
CREATE TABLE IF NOT EXISTS public.safety_library (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_id TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    name_en TEXT NOT NULL,
    name_bn TEXT NOT NULL,
    function_en TEXT NOT NULL,
    function_bn TEXT NOT NULL,
    images TEXT[] NOT NULL DEFAULT '{}',
    approx_price_inr INTEGER,
    guide_en TEXT,
    guide_bn TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.safety_library ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access
CREATE POLICY "Allow anonymous read access" ON public.safety_library
    FOR SELECT USING (true);

-- Insert current data
INSERT INTO public.safety_library (item_id, category, name_en, name_bn, function_en, function_bn, images, approx_price_inr, guide_en, guide_bn)
VALUES 
('helmet', 'PPE', 'Safety Helmet', 'সেফটি হেলমেট', 'Protects the head from falling objects and accidental impacts.', 'মাথাকে উপর থেকে পড়া বস্তু এবং আকস্মিক আঘাত থেকে রক্ষা করে।', ARRAY['/assets/safety/helmet.webp'], 450, 'Always wear with the chin strap fastened. Inspect for cracks before use. Replace after any major impact.', 'সবসময় চিন স্ট্র্যাপ (চিবুকের ফিতা) লাগিয়ে ব্যবহার করুন। ব্যবহারের আগে চির ধরেছে কিনা পরীক্ষা করুন।'),
('gloves', 'PPE', 'Insulated Gloves', 'ইনসুলেটেড গ্লাভস', 'Provides electrical insulation when working on live lines.', 'লাইভ লাইনে কাজ করার সময় বৈদ্যুতিক নিরোধক সরবরাহ করে।', ARRAY['/assets/safety/gloves.webp', '/assets/safety/gloves1.webp'], 3200, 'Perform air-leak test before every use. Use with leather protectors. Store in a cool, dry bag.', 'প্রতিবার ব্যবহারের আগে এয়ার-লিক টেস্ট (বাতাস দিয়ে পরীক্ষা) করুন। চামড়ার প্রোটেক্টর সহ ব্যবহার করুন।'),
('harness', 'PPE', 'Safety Harness', 'সেফটি হারনেস', 'Prevents falls from heights during pole or tower work.', 'পোল বা টাওয়ারে কাজ করার সময় উচ্চতা থেকে পড়ে যাওয়া রোধ করে।', ARRAY['/assets/safety/full_body_harness.webp', '/assets/safety/Full_Body_Harness1.webp'], 2400, 'Ensure all buckles are tight. Anchoring point must be above shoulder level. Check webbing for fraying.', 'সবগুলো বাকল শক্তভাবে আটকানো নিশ্চিত করুন। অ্যাঙ্করিং পয়েন্ট অবশ্যই কাঁধের উপরে হতে হবে।'),
('tester', 'Tools', 'Voltage Tester', 'ভোল্টেজ টেস্টার', 'Safely detects the presence of electrical voltage without contact.', 'স্পর্শ ছাড়াই নিরাপদে বৈদ্যুতিক ভোল্টেজের উপস্থিতি শনাক্ত করে।', ARRAY['/assets/safety/tester.webp'], 850, 'Test on a known live source first. Keep fingers behind the guard. Use only for rated voltage range.', 'প্রথমে একটি পরিচিত সোর্স দিয়ে পরীক্ষা করে নিন। আঙুল সবসময় সুরক্ষা গার্ডের পিছনে রাখুন।'),
('pliers', 'Tools', 'Insulated Pliers', 'ইনসুলেটেড প্লায়ার্স', 'Used for cutting and gripping wires with high-voltage insulation.', 'উচ্চ-ভোল্টেজ নিরোধক সহ তার কাটার এবং ধরার জন্য ব্যবহৃত হয়।', ARRAY['/assets/safety/pliers.webp'], 550, 'Check handle insulation for cuts or wear. Do not use for prying. Keep away from excessive heat.', 'হ্যান্ডেলের ইনসুলেশন বা আবরণ অক্ষত আছে কিনা পরীক্ষা করুন। এটি দিয়ে কোনো কিছু খোলার চেষ্টা করবেন না।'),
('boots', 'PPE', 'Safety Boots', 'সেফটি বুট', 'Slip-resistant and electrically insulated footwear for site safety.', 'সাইট সুরক্ষার জন্য পিচ্ছিল-রোধী এবং বৈদ্যুতিকভাবে নিরোধক জুতো।', ARRAY['/assets/safety/boots.webp', '/assets/safety/boots1.webp'], 1800, 'Keep dry for maximum electrical safety. Clean soles regularly for grip. Replace if sole is worn thin.', 'বৈদ্যুতিক নিরাপত্তার জন্য সবসময় শুকনো রাখুন। সোলে কাদা বা তেল জমলে তা ভালো করে পরিষ্কার করুন।'),
('bamboo_ladder', 'Tools', 'Bamboo Ladder', 'বাম্বু ল্যাডার', 'Lightweight and non-conductive access tool for climbing poles.', 'পোল এ ওঠার জন্য হালকা এবং বিদ্যুৎ অপরিবাহী সরঞ্জাম।', ARRAY['/assets/safety/Bamboo_Ladder.webp'], 1200, 'Inspect for cracks or insect damage. Ensure firm footing before climbing.', 'ফাটল বা পোকা ধরা আছে কিনা পরীক্ষা করুন। ওঠার আগে শক্ত ভূমি নিশ্চিত করুন।'),
('shorting_chain', 'Tools', 'Copper Shorting Chain', 'কপার শর্টিং চেইন', 'Used to ground the power lines after disconnection for safety.', 'বিদ্যুৎ সংযোগ বিচ্ছিন্ন করার পর নিরাপত্তার জন্য লাইন গ্রাউন্ডিং করতে ব্যবহৃত হয়।', ARRAY['/assets/safety/Copper_Shorting_Chain.webp'], 1500, 'Ensure solid contact with earth and line. Check for corrosion on clips.', 'মাটি এবং লাইনের সাথে শক্ত সংযোগ নিশ্চিত করুন। ক্লিপগুলোতে ক্ষয় আছে কিনা পরীক্ষা করুন।'),
('vest', 'PPE', 'High Visibility Vest', 'হাই ভিজিবিলিটি ভেস্ট', 'Makes the wearer clearly visible to others in low light or traffic.', 'স্বল্প আলোতে বা ট্রাফিকের মধ্যে ব্যবহারকারীকে অন্যদের কাছে স্পষ্টভাবে দৃশ্যমান করে তোলে।', ARRAY['/assets/safety/High_Visibility_Vest_2.webp'], 350, 'Ensure the reflective strips are clean. Wear over outward clothing.', 'রিফ্লেক্টিভ স্ট্রিপগুলো পরিষ্কার কিনা নিশ্চিত করুন। সাধারণ পোশাকের উপরে এটি পরুন।')
ON CONFLICT (item_id) DO UPDATE SET
    category = EXCLUDED.category,
    name_en = EXCLUDED.name_en,
    name_bn = EXCLUDED.name_bn,
    function_en = EXCLUDED.function_en,
    function_bn = EXCLUDED.function_bn,
    images = EXCLUDED.images,
    approx_price_inr = EXCLUDED.approx_price_inr,
    guide_en = EXCLUDED.guide_en,
    guide_bn = EXCLUDED.guide_bn,
    updated_at = now();
