-- Safety Library Comprehensive Metadata Sync (55 Assets from GDrive)

-- 1. PPE Updates (Goggles, Helmet Torch, Arc Vest, etc.)
INSERT INTO public.safety_library (item_id, category, name_en, name_bn, function_en, function_bn, images, approx_price_inr, guide_en, guide_bn)
VALUES 
('goggles', 'PPE', 'Safety Goggles', 'সেফটি গগলস', 'Protects eyes from flying debris, dust, and chemical splashes.', 'উড়ন্ত ধুলিকণা এবং রাসায়নিক তরল থেকে চোখকে রক্ষা করে।', 
ARRAY['https://drive.google.com/file/d/1i67N2RXct3nnRP7sxFWJjb0VRxs_MDg-/view', 'https://drive.google.com/file/d/1huSa4pQdKiiWPLbk9SKxTSxfhrtHsnaj/view'], 
350, 'Ensure anti-fog coating is clean. Wear over prescription glasses if needed.', 'ব্যবহারের আগে গ্লাস পরিষ্কার করে নিন। এটি সাধারণ চশমার উপরেও পরা যায়।'),

('helmet_torch', 'PPE', 'Helmet Mounted Torch', 'হেলমেট মাউন্টেড টর্চ', 'Provides hands-free illumination for night work or dark spaces.', 'রাতের বেলা বা অন্ধকার জায়গায় কাজ করতে হাত মুক্ত রেখে আলো সরবরাহ করে।', 
ARRAY['https://drive.google.com/file/d/1JGqS3bVfFO4Yo2li8pjLMHHEy4yhRjjo/view', 'https://drive.google.com/file/d/1JEA3245guZz197ku16oILrDp9t_OoiOt/view'], 
1200, 'Check battery levels before ascending. Secure tightly to the helmet rim.', 'হেলমেটে শক্তভাবে আটকানো নিশ্চিত করুন এবং ব্যাটারি চার্জ পরীক্ষা করে নিন।'),

('arc_vest', 'PPE', 'Arc Fire Resistant Vest', 'আর্ক ফায়ার রেজিস্ট্যান্ট ভেস্ট', 'Protects against thermal burns from electrical arc flash.', 'বৈদ্যুতিক আর্ক ফ্ল্যাশ থেকে সৃষ্ট তাপীয় দহন থেকে সুরক্ষা দেয়।', 
ARRAY['https://drive.google.com/file/d/118dsL4WFsGJa7jBM8Q36UmJrYTXq15EC/view', 'https://drive.google.com/file/d/1p1Ay02CK0371uEDtYjbGRFmdNkHC3jd_/view', 'https://drive.google.com/file/d/14oUDwYP6mvNVDEJIx7_BiuMXVAz2_J4i/view'], 
4500, 'Always zip up fully. Do not wear synthetic materials underneath.', 'সবসময় জিপার বন্ধ রেখে পরুন। এর নিচে পাতলা সুতি কাপড় পরা ভালো।'),

('cut_gloves', 'PPE', 'Cut Resistant Gloves', 'কাট রেজিস্ট্যান্ট গ্লাভস', 'Protects hands from sharp edges, wires, and abrasive materials.', 'ধারালো তার বা অমসৃণ ধাতব বস্তু থেকে হাতকে রক্ষা করে।', 
ARRAY['https://drive.google.com/file/d/1MBGIMTeVdWb43P82CKCYeMe7carSKId8/view'], 
450, 'Replace if the coating wears thin. Not for high voltage insulation.', 'বেশি ঘর্ষণে আবরণ পাতলা হয়ে গেলে দ্রুত পরিবর্তন করুন। এটি লাইভ লাইনে ব্যবহারের জন্য নয়।'),

-- 2. Tools & Accessories Updates (Lanyards, Anchors, Ladders)
('anchor', 'Tools', 'Fall Arrest Anchor', 'ফল অ্যারেস্ট অ্যাঙ্কর', 'Provides a secure connection point for fall protection systems.', 'পতন রোধে সুরক্ষা ডিভাইসের জন্য একটি শক্ত সংযোগস্থল হিসেবে ব্যবহৃত হয়।', 
ARRAY['https://drive.google.com/file/d/1BmSeSF1hHAfslEbcpKRB5dOTO1-6O1R7/view', 'https://drive.google.com/file/d/16hIFr4J9DYtqdBUw5uepf2XUriqk25Xc/view'], 
2500, 'Ensure structural integrity of the anchoring point. Minimum 5000lbs rated.', 'অ্যাঙ্করিং পয়েন্টের সহনক্ষমতা পর্যাপ্ত কিনা তা ব্যবহারের আগে যাচাই করে নিন।'),

('lanyard', 'Tools', 'Lanyard & Hook', 'ল্যানইয়ার্ড এবং হুক', 'Connects the harness to the anchor to stop a fall.', 'হারনেসকে অ্যাঙ্করের সাথে যুক্ত করে পতন রোধ নিশ্চিত করে।', 
ARRAY['https://drive.google.com/file/d/1UDW3wQNHeG0OJjhxXpf6ybSzvo6QW091/view', 'https://drive.google.com/file/d/1SXtHws3ND9krBwltGAA_s69McXQ4JYx6/view', 'https://drive.google.com/file/d/1O-T3_eb0i4kI_js9ydNPhATC2E2IBdiF/view', 'https://drive.google.com/file/d/1QexG343UwwlNNvj0tiCEoj7GY0Z08tlW/view', 'https://drive.google.com/file/d/1RIYatL0PRJW48QseeGkzCh47-bN64qBI/view'], 
1800, 'Inspect hooks for functional gate locking. Check rope for fraying.', 'হুকগুলো ঠিকভাবে লক হচ্ছে কিনা এবং দড়িতে কোনো ছেঁড়া অংশ আছে কিনা দেখুন।'),

('frp_ladder', 'Tools', 'FRP Ladder', 'এফআরপি ল্যাডার', 'Heavy-duty non-conductive ladder for electrical maintenance.', 'উচ্চ ক্ষমতার বিদ্যুৎ অপরিবাহী মই যা রক্ষণাবেক্ষণ কাজের জন্য আদর্শ।', 
ARRAY['https://drive.google.com/file/d/1DSp4_c-JqkpMxs6rF4IxbDHA-hB4wz2G/view', 'https://drive.google.com/file/d/1CKfnvhgb_Byw5N1mIOotwt45w49fp5G_/view'], 
15000, 'Ensure non-slip feet are intact. Keep away from excessive sunlight exposure when storing.', 'মইয়ের পায়ের অ্যান্টি-স্লিপ গ্রিপগুলো ঠিক আছে কিনা দেখে নিন। রোদে বেশি সময় ফেলে রাখবেন না।'),

('brass_chain', 'Tools', 'Brass Shorting Chain', 'ব্রাস শর্টিং চেইন', 'Low resistance chain for grounding overhead lines.', 'ওভারহেড লাইন গ্রাউন্ডিং করার জন্য ব্যবহৃত নিম্নরোধের চেইন।', 
ARRAY['https://drive.google.com/file/d/1YULpo7Er8aAZefEgpiKUt9K91g2REMG6/view', 'https://drive.google.com/file/d/1H8417IHN-4Bgrv-uldSDNoYL2hD5rxkO/view'], 
2800, 'Clean clips of oxidation. Ensure tight clamp connection.', 'ক্লিপগুলো অক্সাইড মুক্ত রাখুন এবং শক্ত সংযোগ নিশ্চিত করুন।'),

('manila_rope', 'Tools', 'Manila Rope', 'ম্যানিলা রোপ', 'Natural fiber rope used for lifting materials and securement.', 'ভারী মালামাল তোলা এবং বাঁধার জন্য ব্যবহৃত প্রাকৃতিক তন্তুর দড়ি।', 
ARRAY['https://drive.google.com/file/d/1fviLskSzWZM3JpKxV9OIp-rSKrS9_0FU/view', 'https://drive.google.com/file/d/1hpWNElbr6IIu8FGh1EaLymqlRZFPAwR5/view'], 
1200, 'Store in a dry place to prevent rot. Inspect for inner fiber decay.', 'পচন রোধে দড়ি সবসময় শুকনো জায়গায় রাখুন। ব্যবহারের আগে ভেতরের আঁশগুলো পরীক্ষা করুন।'),

-- 3. SOP & Site Safety updates
('traffic_cone', 'SOP', 'Traffic Cone with Chain', 'ট্রাফিক কোন উইথ চেইন', 'Delineates hazardous areas for public and traffic safety.', 'জনসাধারণ এবং যানবাহনের সুরক্ষার জন্য বিপজ্জনক এলাকা চিহ্নিত করে।', 
ARRAY['https://drive.google.com/file/d/1FuB5WmM0Wr_EVoI5qXeI9aZgbsma-uRH/view'], 
850, 'Ensure high-reflectivity is visible to drivers. Place at safe buffer distances.', 'প্রতিফলক অংশটি পরিষ্কার রাখুন যাতে দূর থেকে চালকরা দেখতে পায়।'),

('hazard_ribbon', 'SOP', 'Worksite Hazard Ribbon', 'ওয়ার্কসাইট হ্যাজার্ড রিবন', 'Warns bystanders of operational zones and restricted areas.', 'কাজের জায়গা বা নিষিদ্ধ এলাকায় অন্যদের সতর্ক করতে ব্যবহৃত সতর্কতামূলক ফিতা।', 
ARRAY['https://drive.google.com/file/d/1hqkeVDRbhUrVJ1tLbgb1LnSw7NywZROB/view'], 
300, 'Tie at chest height for visibility. Do not leave as litter after work.', 'বুকের উচ্চতায় বেঁধে দিন যাতে চোখে পড়ে। কাজ শেষ হলে পরিষ্কার করতে ভুলবেন না।')

ON CONFLICT (item_id) DO UPDATE SET
    images = EXCLUDED.images,
    name_bn = EXCLUDED.name_bn,
    updated_at = now();

-- Update existing items with GDrive IDs for multi-view support
UPDATE public.safety_library SET images = ARRAY['https://drive.google.com/file/d/1MEIvUDmF_47rVwW7Yd-vcx6hi8UmfUxE/view', 'https://drive.google.com/file/d/1kYk9X4S2ZacobJTMu5sfQ7CirBSb14_U/view', 'https://drive.google.com/file/d/1R4IDx9DmEpBkjx9uMweVSJv-jMQz9TiS/view']
WHERE item_id = 'helmet';

UPDATE public.safety_library SET images = ARRAY['https://drive.google.com/file/d/14W1HZAb6ap3W1CDaH4sXD4x00zeSB7hh/view', 'https://drive.google.com/file/d/15RArX4g6JBB1lqPZAT9HQ7SmtKTNXj_n/view', 'https://drive.google.com/file/d/1eRf32_QtMhypm0Sbw-jOiaKySE22n-Yt/view']
WHERE item_id = 'gloves';

UPDATE public.safety_library SET images = ARRAY['https://drive.google.com/file/d/1u87lNqM6TO_oo0saHFSiatapq4m6AgG4/view', 'https://drive.google.com/file/d/1EkmTgYhtXmb_nchPs3NzBB4CycUXQ201/view', 'https://drive.google.com/file/d/1Fq9ytkY6-IXiKJQACstwdzVC3wKJoYVr/view']
WHERE item_id = 'harness';

UPDATE public.safety_library SET images = ARRAY['https://drive.google.com/file/d/1dLVcOVZixGNyRa1srYUw731AtFKNkT0T/view', 'https://drive.google.com/file/d/1XSlucUsiY24W1DJZveYNS0HlvVinXKwx/view', 'https://drive.google.com/file/d/1_8KCUgZScL3CrksEm5gnHxi-R4TgQuGf/view', 'https://drive.google.com/file/d/1t6F4BMf_aQc2PuWbQxZ_3wxCGOjhU0lD/view']
WHERE item_id = 'boots';

UPDATE public.safety_library SET images = ARRAY['https://drive.google.com/file/d/1NXpYep-YD4uDGJQnHf9SZatTbxHkFHVS/view', 'https://drive.google.com/file/d/1MdxK7-wA3FrRWuIMnth9eXmeo0GDoc34/view', 'https://drive.google.com/file/d/1MkjOtEjYZiU9g0gDn5QGLE0HpJBwGJ4K/view']
WHERE item_id = 'vest';
