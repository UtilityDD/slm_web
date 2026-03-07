-- Sync redesigned Safety Library V2 assets
-- Categories: PPE, Tools, Insulators, Charts, Others
-- Mapped from Google Drive folder structure provided by user.

DO $$
BEGIN

-- PPE CATEGORY
INSERT INTO public.safety_library (item_id, category, name_en, name_bn, function_en, function_bn, images, approx_price_inr, guide_en, guide_bn)
VALUES 
('helmet', 'PPE', 'Safety Helmet', 'সেফটি হেলমেট', 'Protects the head from falling objects and accidental impacts.', 'মাথাকে উপর থেকে পড়া বস্তু এবং আকস্মিক আঘাত থেকে রক্ষা করে।', 
    ARRAY[
        'https://drive.google.com/file/d/1MEIvUDmF_47rVwW7Yd-vcx6hi8UmfUxE/view', 
        'https://drive.google.com/file/d/1XSlucUsiY24W1DJZveYNS0HlvVinXKwx/view', 
        'https://drive.google.com/file/d/1R4IDx9DmEpBkjx9uMweVSJv-jMQz9TiS/view', 
        'https://drive.google.com/file/d/1yjeNC2T-pVJ-EdnFLOel2xVojfl9Es9x/view', 
        'https://drive.google.com/file/d/1JEA3245guZz197ku16oILrDp9t_OoiOt/view'
    ], 450, 'Always wear with the chin strap fastened. Inspect for cracks before use.', 'সবসময় চিন স্ট্র্যাপ লাগিয়ে ব্যবহার করুন। ব্যবহারের আগে পরীক্ষা করুন।'),

('gloves_electrical', 'PPE', 'Electrical Gloves', 'ইনসুলেটেড গ্লাভস', 'Provides electrical insulation when working on live lines.', 'লাইভ লাইনে কাজ করার সময় বৈদ্যুতিক নিরোধক সরবরাহ করে।', 
    ARRAY[
        'https://drive.google.com/file/d/117JetFwXtpyL9Omm1Cbjoqebq3lqsVXp/view', 
        'https://drive.google.com/file/d/1eRf32_QtMhypm0Sbw-jOiaKySE22n-Yt/view', 
        'https://drive.google.com/file/d/1CKfnvhgb_Byw5N1mIOotwt45w49fp5G_/view', 
        'https://drive.google.com/file/d/1_8KCUgZScL3CrksEm5gnHxi-R4TgQuGf/view', 
        'https://drive.google.com/file/d/1DSp4_c-JqkpMxs6rF4IxbDHA-hB4wz2G/view'
    ], 3200, 'Perform air-leak test before every use. Use with leather protectors.', 'প্রতিবার ব্যবহারের আগে এয়ার-লিক টেস্ট করুন। চামড়ার প্রোটেক্টর সহ ব্যবহার করুন।'),

('harness_full', 'PPE', 'Full Body Harness', 'সেফটি হারনেস', 'Prevents falls from heights during pole or tower work.', 'পোল বা টাওয়ারে কাজ করার সময় উচ্চতা থেকে পড়ে যাওয়া রোধ করে।', 
    ARRAY[
        'https://drive.google.com/file/d/1u87lNqM6TO_oo0saHFSiatapq4m6AgG4/view', 
        'https://drive.google.com/file/d/1EkmTgYhtXmb_nchPs3NzBB4CycUXQ201/view', 
        'https://drive.google.com/file/d/1JGqS3bVfFO4Yo2li8pjLMHHEy4yhRjjo/view', 
        'https://drive.google.com/file/d/1pVfBhsjoA00-gXQiaURTAWXgIK3qxEQQ/view', 
        'https://drive.google.com/file/d/1huSa4pQdKiiWPLbk9SKxTSxfhrtHsnaj/view'
    ], 2400, 'Ensure all buckles are tight. Anchoring point must be above shoulder level.', 'সবগুলো বাকল শক্তভাবে আটকানো নিশ্চিত করুন। কাঁধের উপরে অ্যাঙ্কর করুন।'),

('boots_lineman', 'PPE', 'Lineman Boots', 'সেফটি বুট', 'Slip-resistant and electrically insulated footwear for site safety.', 'সাইট সুরক্ষার জন্য পিচ্ছিল-রোধী এবং বৈদ্যুতিকভাবে নিরোধক জুতো।', 
    ARRAY[
        'https://drive.google.com/file/d/1t6F4BMf_aQc2PuWbQxZ_3wxCGOjhU0lD/view', 
        'https://drive.google.com/file/d/1hpWNElbr6IIu8FGh1EaLymqlRZFPAwR5/view', 
        'https://drive.google.com/file/d/14W1HZAb6ap3W1CDaH4sXD4x00zeSB7hh/view', 
        'https://drive.google.com/file/d/1RIYatL0PRJW48QseeGkzCh47-bN64qBI/view', 
        'https://drive.google.com/file/d/1w-BhFDz6aW6RSQtxj8w3AQ8v2h5RL9og/view', 
        'https://drive.google.com/file/d/1Fq9ytkY6-IXiKJQACstwdzVC3wKJoYVr/view'
    ], 1800, 'Keep dry for maximum electrical safety. Clean soles regularly.', 'বৈদ্যুতিক নিরাপত্তার জন্য শুকনো রাখুন। সোলে কাদা জমলে পরিষ্কার করুন।'),

('gumboot', 'PPE', 'Gumboot', 'গামবুট', 'Waterproof footwear for wet terrain and sludge.', 'ভেজা এবং কাদাযুক্ত জায়গায় কাজ করার জন্য জলরোধী জুতো।', 
    ARRAY[
        'https://drive.google.com/file/d/1kYk9X4S2ZacobJTMu5sfQ7CirBSb14_U/view', 
        'https://drive.google.com/file/d/1BmSeSF1hHAfslEbcpKRB5dOTO1-6O1R7/view', 
        'https://drive.google.com/file/d/1-QUY1CSR-wpnusP4ScMhMsm10opqtc4E/view'
    ], 800, 'Check for punctures. Clean after use in chemical environments.', 'ছিদ্র আছে কিনা পরীক্ষা করুন। ব্যবহারের পর ভালো করে পরিষ্কার করুন।'),

('vest_high_vis', 'PPE', 'High Visibility Vest', 'সেফটি ভেস্ট', 'Highly reflective vest for site visibility.', 'সাইট সুরক্ষার জন্য উচ্চ রিফ্লেক্টিভ ভেস্ট।', 
    ARRAY[
        'https://drive.google.com/file/d/1O-T3_eb0i4kI_js9ydNPhATC2E2IBdiF/view', 
        'https://drive.google.com/file/d/1k2sP5lF_jWm5oBp9Lfk9XZ3b_lfOzdHd/view', 
        'https://drive.google.com/file/d/1i67N2RXct3nnRP7sxFWJjb0VRxs_MDg-/view'
    ], 350, 'Keep reflective strips clean.', 'রিফ্লেক্টিভ স্ট্রিপগুলো পরিষ্কার রাখুন।'),

('arc_fire_vest', 'PPE', 'Arc/Fire Resistant Vest', 'আর্ক/ফায়ার রেজিস্ট্যান্ট ভেস্ট', 'Protects against electrical arc flashes and heat.', 'বৈদ্যুতিক আর্ক ফ্লাশ এবং তাপ থেকে রক্ষা করে।', 
    ARRAY[
        'https://drive.google.com/file/d/118dsL4WFsGJa7jBM8Q36UmJrYTXq15EC/view', 
        'https://drive.google.com/file/d/1p1Ay02CK0371uEDtYjbGRFmdNkHC3jd_/view', 
        'https://drive.google.com/file/d/14oUDwYP6mvNVDEJIx7_BiuMXVAz2_J4i/view'
    ], 4500, 'Inspect for tears or degradation of fire-retardant material.', 'আগুনে পোড়া বা ছিঁড়ে যাওয়া অংশ আছে কিনা দেখে নিন।'),

('ladder_industrial', 'PPE', 'Utility Ladder', 'ইন্ডাস্ট্রিয়াল ল্যাডার', 'Access tools for climbing poles and structures.', 'পোল এবং টাওয়ার এ ওঠার জন্য ব্যবহৃত সরঞ্জাম।', 
    ARRAY[
        'https://drive.google.com/file/d/1eckJbgRfHg8Nw9UrNz0DO23dIff884c5/view', 
        'https://drive.google.com/file/d/1Ruq34kQ_cbTW7ENVmv2_quUGo8R8QvX4/view', 
        'https://drive.google.com/file/d/1SXtHws3ND9krBwltGAA_s69McXQ4JYx6/view', 
        'https://drive.google.com/file/d/1uWjj1o5eMSxho6uw4eiJe2-KSmHhIwS7/view'
    ], 5500, 'Ensure firm footing and stable angle before climbing.', 'ওঠার আগে শক্ত ভূমি এবং সঠিক কোণ নিশ্চিত করুন।'),

('shorting_chain_utility', 'PPE', 'Shorting Chain', 'শর্টিং চেইন', 'Grounds power lines after disconnection for safety.', 'নিরাপত্তার জন্য সংযোগ বিচ্ছিন্ন করে গ্রাউন্ডিং করতে ব্যবহৃত হয়।', 
    ARRAY[
        'https://drive.google.com/file/d/1GoQTUAOjGWQPcrVT_0vZdsAMuDSPfHqV/view', 
        'https://drive.google.com/file/d/1MkjOtEjYZiU9g0gDn5QGLE0HpJBwGJ4K/view', 
        'https://drive.google.com/file/d/1YULpo7Er8aAZefEgpiKUt9K91g2REMG6/view', 
        'https://drive.google.com/file/d/1H8417IHN-4Bgrv-uldSDNoYL2hD5rxkO/view'
    ], 1500, 'Ensure solid contact with earth and line.', 'মাটি এবং লাইনের সাথে শক্ত সংযোগ নিশ্চিত করুন।'),

('lanyard_hook_system', 'PPE', 'Lanyard & Hook System', 'ল্যানিয়ার্ড এবং হুক', 'Connecting element for fall arrest systems.', 'পতন রোধ ব্যবস্থার জন্য সংযোগকারী সরঞ্জাম।', 
    ARRAY[
        'https://drive.google.com/file/d/15RArX4g6JBB1lqPZAT9HQ7SmtKTNXj_n/view', 
        'https://drive.google.com/file/d/1B0dGKUEppsmobdOWHCsKhwMYUXTFIL1K/view', 
        'https://drive.google.com/file/d/1fviLskSzWZM3JpKxV9OIp-rSKrS9_0FU/view', 
        'https://drive.google.com/file/d/1dLVcOVZixGNyRa1srYUw731AtFKNkT0T/view', 
        'https://drive.google.com/file/d/1rvnq6MBLT9GJuo2H3MI62JDnxbZSbE4p/view', 
        'https://drive.google.com/file/d/16hIFr4J9DYtqdBUw5uepf2XUriqk25Xc/view'
    ], 1200, 'Check hook mechanism for smooth operation.', 'হুক ঠিকমতো কাজ করছে কিনা দেখে নিন।'),

('goggles_safety', 'PPE', 'Safety Goggles', 'সেফটি চশমা', 'Protects eyes from dust, sparks, and impacts.', 'ধুলাবালি এবং স্ফুলিঙ্গ থেকে চোখ রক্ষা করে।', 
    ARRAY[
        'https://drive.google.com/file/d/15N4LjbykEoZjrPrKnCHLJznmfu7yaoQj/view', 
        'https://drive.google.com/file/d/1NXpYep-YD4uDGJQnHf9SZatTbxHkFHVS/view'
    ], 250, 'Ensure clear visibility. Replace if heavily scratched.', 'পরিষ্কার দৃষ্টি নিশ্চিত করুন। অতিরিক্ত দাগ হলে বদলে ফেলুন।'),

('torch_helmet', 'PPE', 'Helmet Mounted Torch', 'হেলমেট টর্চ', 'Hands-free lighting for night work.', 'রাতে কাজের জন্য হ্যান্ডস-ফ্রি আলো।', 
    ARRAY[
        'https://drive.google.com/file/d/1UDW3wQNHeG0OJjhxXpf6ybSzvo6QW091/view', 
        'https://drive.google.com/file/d/1a-ahZlHHctL1keEfUBzNqXOAj3FOVowx/view'
    ], 850, 'Maintain charged batteries/cells.', 'ব্যাটারি চার্জ আছে কিনা নিশ্চিত করুন।'),

('rope_manila', 'PPE', 'Manila Rope', 'ম্যানিলা রোপ', 'High-strength rope for lifting and securing.', 'ভারী মালামাল তোলা এবং বাঁধার জন্য উচ্চ-শক্তির দড়ি।', 
    ARRAY[
        'https://drive.google.com/file/d/1MdxK7-wA3FrRWuIMnth9eXmeo0GDoc34/view', 
        'https://drive.google.com/file/d/1Yzvpy8jo8TqylnwuEuLcwavHVlEtLsOp/view'
    ], 1200, 'Inspect for fraying or rotting.', 'ছিঁড়ে যাওয়া বা পচন ধরা আছে কিনা পরীক্ষা করুন।'),

('hazard_ribbon', 'PPE', 'Hazard Ribbon', 'হ্যাজার্ড রিবন', 'Marks dangerous areas on worksites.', 'কাজের সাইটে বিপজ্জনক এলাকা চিহ্নিত করতে ব্যবহৃত হয়।', 
    ARRAY['https://drive.google.com/file/d/1hqkeVDRbhUrVJ1tLbgb1LnSw7NywZROB/view'], 150, 'Ensure visibility around entire hazard zone.', 'বিপজ্জনক এলাকার কিস্তৃর্ণ অংশ চিহ্নিত করুন।'),

('traffic_cone', 'PPE', 'Traffic Cone', 'ট্রাফিক কোন', 'Alerts traffic and workers to site hazards.', 'রাস্তার ট্রাফিক এবং কর্মীদের বিপদ সম্পর্কে সতর্ক করে।', 
    ARRAY['https://drive.google.com/file/d/1FuB5WmM0Wr_EVoI5qXeI9aZgbsma-uRH/view'], 450, 'Use with chains for better blockades.', 'উত্তম ব্লকেডের জন্য চেইন সহ ব্যবহার করুন।'),

('fall_anchor', 'PPE', 'Fall Arrest Anchor', 'ফল অ্যালেস্ট অ্যাঙ্কর', 'Anchoring point for safety harness.', 'সেফটি হারনেস আটকানোর নির্ভরযোগ্য পয়েন্ট।', 
    ARRAY[
        'https://drive.google.com/file/d/1HqZ_N2tsWpUKevs-JsxQtZc1VR1uKJlR/view', 
        'https://drive.google.com/file/d/1QexG343UwwlNNvj0tiCEoj7GY0Z08tlW/view'
    ], 1100, 'Must be able to support person load.', 'মানুষের ওজন বহন ক্ষমতা নিশ্চিত করুন।'),

('gloves_cut_resistant', 'PPE', 'Cut Resistant Gloves', 'কাট রেজিস্ট্যান্ট গ্লাভস', 'Protects hands from sharp objects.', 'ধারালো বস্তু থেকে হাত রক্ষা করে।', 
    ARRAY['https://drive.google.com/file/d/1MBGIMTeVdWb43P82CKCYeMe7carSKId8/view'], 350, 'Not for electrical use.', 'এটি বিদ্যুৎ সংক্রান্ত কাজে ব্যবহারের যোগ্য নয়।'),


-- TOOLS CATEGORY (Including Testing Equipment as provided in user's Tools folder)
('voltage_tester_non_contact', 'Tools', 'Non-Contact Voltage Tester', 'ভোল্টেজ টেস্টার (নন-কন্টাক্ট)', 'Safely detects electrical voltage.', 'নিরাপদে বৈদ্যুতিক ভোল্টেজ শনাক্ত করে।', 
    ARRAY[
        'https://drive.google.com/file/d/1-uxdqr7I2qB2-Z8GZbKy0ktmKX8pYvFz/view', 
        'https://drive.google.com/file/d/17Gf3w8s5OvNq-eKTYCPlPQfekWom3okW/view', 
        'https://drive.google.com/file/d/1Rt8NQINl6aWAYnI5s1HRCGwxIqfjA0r6/view'
    ], 1500, 'Test on known live source first. Keep fingers behind guard.', 'সোর্স দিয়ে পরীক্ষা করে নিন। আঙুল গার্ডের পিছনে রাখুন।'),

('insulation_tester_digital', 'Tools', 'Digital Insulation Tester', 'ডিজিটাল ইনসুলেশন টেস্টার', 'Measures resistance of insulators.', 'ইনসুলেটরের রেজিস্ট্যান্স পরিমাপ করে।', 
    ARRAY[
        'https://drive.google.com/file/d/1cr44PHeK4AbBjlH36km3Dkn6c8t_OFhN/view', 
        'https://drive.google.com/file/d/1VtrIp2IQ9mkXF10R-lxnJhWMnNR1GUtf/view', 
        'https://drive.google.com/file/d/1e_jdFvFdDvPsTQA5JE96GgVZHNCsAb5r/view'
    ], 18000, 'Discharge cables after test.', 'পরীক্ষার পর কেবল ডিসচার্জ করুন।'),

('clamp_meter_digital', 'Tools', 'Digital Clamp Meter', 'ডিজিটাল ক্ল্যাম্প মিটার', 'Measures current safely.', 'নিরাপদে কারেন্ট পরিমাপ করে।', 
    ARRAY[
        'https://drive.google.com/file/d/173t_yLlpdtnSWTjum5Rq7cfMIg-ISEb5/view', 
        'https://drive.google.com/file/d/1UMsG2NmcR9WdHhifKufaP16xA5LMLByi/view', 
        'https://drive.google.com/file/d/1qFyRsDiK_0-C2n_J_j0tLJESomvvHzOG/view'
    ], 6500, 'Ensure clamp is fully closed.', 'জ্যাহ পুরোপুরি বন্ধ নিশ্চিত করুন।'),

('multimeter_digital', 'Tools', 'Digital Multimeter', 'ডিজিটাল মাল্টিমিটার', 'Universal electrical measurement.', 'সার্বজনীন বৈদ্যুতিক পরিমাপ সরঞ্জাম।', 
    ARRAY[
        'https://drive.google.com/file/d/1hJXuP7AJE3vPaN-BYzL3K2Cu1HY9gcEo/view', 
        'https://drive.google.com/file/d/1gBDWJE31Kg9NpT1zwDwlA0_8kOrvT14d/view', 
        'https://drive.google.com/file/d/1vVKjcqas7k9ZfDWR6l_mp3LFDsXWjQj1/view'
    ], 4500, 'Select correct measurement range.', 'সঠিক মেজারমেন্ট রেঞ্জ নির্বাচন করুন।'),

('thermal_imager_pro', 'Tools', 'Thermal Imager', 'থার্মাল ইমেজার', 'Finds hot connections.', 'উচ্চ তাপমাত্রার সংযোগ শনাক্ত করে।', 
    ARRAY[
        'https://drive.google.com/file/d/1DKP7lZL3xRwSjEsr7gRlv_WKTpVcBnCo/view', 
        'https://drive.google.com/file/d/1UbxNmPiLB9RqIZ8uSHJn3HsnfkUOMH_L/view'
    ], 120000, 'Handle with care. Avoid direct sun on lens.', 'যত্মসহকারে ব্যবহার করুন। লেন্সে সরাসরি সূর্যালোক এড়িয়ে চলুন।'),

('pd_acoustic_imager', 'Tools', 'Acoustic PD Imager', 'অ্যাকুস্টিক পিডি ইমেজার', 'Detects partial discharge visually.', 'আংশিক ডিসচার্জ দৃশ্যমানভাবে শনাক্ত করে।', 
    ARRAY[
        'https://drive.google.com/file/d/1hEsRhC7QaLT_GA8g9buJ1I9QG1vDT0cM/view', 
        'https://drive.google.com/file/d/10H8lbdvR-x_6_paqGsTY8G2XTvI8fO3v/view'
    ], 250000, 'Precision tool for substation health.', 'সাবস্টেশন হেলথ চেকের জন্য উন্নত সরঞ্জাম।'),

('earth_tester_digital', 'Tools', 'Digital Earth Tester', 'ডিজিটাল আর্থ টেস্টার', 'Measures earthing resistance.', 'আর্থিং রেজিস্ট্যান্স পরিমাপ করে।', 
    ARRAY[
        'https://drive.google.com/file/d/1zPMZuS_bWNCeTcrL4pizwLlOpMsyKhLU/view', 
        'https://drive.google.com/file/d/1MhxPrh3ecSe1U90ftAPwAzjnEN39uYjE/view'
    ], 8500, 'Firm spike grounding required.', 'মাটিতে স্পাইক শক্তভাবে গেঁথে নিন।'),

('insulation_tester_analog', 'Tools', 'Analog Insulation Tester', 'অ্যানালগ ইনসুলেশন টেস্টার', 'Crank-type insulation measurement.', 'ক্র্যাঙ্ক-টাইপ ইনসুলেশন পরিমাপ।', 
    ARRAY[
        'https://drive.google.com/file/d/1CTjmkk0mtVOn8cHKLWjfJgahdJx19d6h/view', 
        'https://drive.google.com/file/d/1Jpyk-yVcYBsJyauoD5LV6enaRXoLiy-M/view'
    ], 12000, 'Operate crank at steady speed.', 'নির্দিষ্ট গতিতে হ্যান্ডেল ঘুরান।'),

('high_voltage_detector', 'Tools', 'High Voltage Detector', 'এইচভি ডিটেক্টর', 'Detects high voltage from distance.', 'দূর থেকে হাই ভোল্টেজ শনাক্ত করে।', 
    ARRAY[
        'https://drive.google.com/file/d/1XAgwyx6TEZPoIDWNuaMqakgRGPCRcXwz/view', 
        'https://drive.google.com/file/d/1HgVwnWhlJjZFL9jH7-MOxBOffe_G9bsu/view'
    ], 15000, 'Keep safe clearance from live parts.', 'লাইভ অংশ থেকে নিরাপদ দূরত্ব বজায় রাখুন।'),

('power_analyzer_utility', 'Tools', 'Power Analyzer', 'পাওয়ার অ্যানালাইজার', 'Comprehensive power quality tool.', 'উন্নত মানের বিদ্যুৎ গুণমান পরিমাপ সরঞ্জাম।', 
    ARRAY[
        'https://drive.google.com/file/d/1K2U1u0iPM0BGA6cj3OSd3sXrd5viUthG/view', 
        'https://drive.google.com/file/d/1jntvqdUjeQUxNIG02fq63WDhQK9Qoajg/view'
    ], 85000, 'Requires expert configuration.', 'সঠিক কনফিগারেশন নিশ্চিত করুন।'),

('transformer_ttr_meter', 'Tools', 'TTR Meter', 'টিটিআর মিটার', 'Measures transformer turns ratio.', 'ট্রান্সফরমার টার্নস রেশিও পরিমাপ করে।', 
    ARRAY['https://drive.google.com/file/d/1hkcIymBXmvh6G7mBSt2_KKOyw7xoePNa/view'], 150000, 'Precision diagnostics for transformers.', 'ট্রান্সফরমার ডায়াগনস্টিকের জন্য নির্ভুল সরঞ্জাম।'),

('phase_rotation_indicator', 'Tools', 'Phase Indicator', 'ফেজ ইন্ডিকেটর', 'Identifies phase sequence.', 'ফেজ সিকোয়েন্স শনাক্ত করে।', 
    ARRAY[
        'https://drive.google.com/file/d/1gQ8bd4xW0uHn1UBxfe_M3EJXFcBFl_hu/view', 
        'https://drive.google.com/file/d/1pemc3yncWxRXduw6kftoGKYkE1GW_5ib/view'
    ], 2500, 'Verify before coupling motors/systems.', 'সিস্টেম কাপলিং এর আগে নিশ্চিত হয়ে নিন।'),

('pd_ultrasonic_probe', 'Tools', 'Ultrasonic PD Probe', 'আল্ট্রাসনিক পিডি প্রোব', 'Finds discharges via sound waves.', 'শব্দ তরঙ্গের মাধ্যমে ডিসচার্জ শনাক্ত করে।', 
    ARRAY['https://drive.google.com/file/d/1cRZvWv_XkBcQr28jaX7Ez0lkpisxuI7O/view'], 45000, 'Use targeting system for accuracy.', 'সঠিক নিশানার জন্য টার্গেটিং সিস্টেম ব্যবহার করুন।'),


-- INSULATORS CATEGORY
('insulator_pin_types', 'Insulators', 'Pin Insulator', 'পিন ইনসুলেটর', 'Supports lines on crossarms.', 'ক্রসআর্মে লাইনের ভার বহনে সাহায্য করে।', 
    ARRAY[
        'https://drive.google.com/file/d/1oLGvxOapjPqZgUpHC0mi3uBHfoQw4lN2/view', 
        'https://drive.google.com/file/d/12B7OJiR5Mx4j687AgVIyg0-o3KGdkX_e/view', 
        'https://drive.google.com/file/d/1NYJY9suOCI3JY0gfYecOMOGZYBKL6yhR/view', 
        'https://drive.google.com/file/d/1ecQeNeXryomfE-QZloYErap-phLIdhTh/view'
    ], NULL, 'Distribution voltage support.', 'ডিস্ট্রিবিউশন লাইনে ভোল্টেজ সাপোর্ট দেয়।'),

('insulator_disc_types', 'Insulators', 'Disc Insulator', 'ডিস্ক ইনসুলেটর', 'Strain/Suspension insulation.', 'স্টেইন বা সাসপেনশন ইনসুলেশন।', 
    ARRAY[
        'https://drive.google.com/file/d/1G0hYQMB31l-Xir3j2gMhe-xIjzhN5ijI/view', 
        'https://drive.google.com/file/d/1kBkCUJU7sUdxqBmu2GKoi5HqCk11fTyN/view', 
        'https://drive.google.com/file/d/1J5-XqhD9DBmGNaZQDKIy2AOOXqhEpke6/view', 
        'https://drive.google.com/file/d/1Wxj-i8uCSKyQvJA3jtPorHy82MWAgUTY/view', 
        'https://drive.google.com/file/d/1ajeUeQAyIohICBN7_5fv2kIEU0Nps-b7/view'
    ], NULL, 'Inspect surface for damage.', 'আচ্ছাদনের উপরে কোনো ক্ষতি আছে কিনা দেখুন।'),

('insulator_guy_types', 'Insulators', 'Guy/Stay Insulator', 'গাই ইনসুলেটর', 'Stay wire insulation.', 'স্টে ওয়্যারকে আলাদা করে।', 
    ARRAY[
        'https://drive.google.com/file/d/1JE62cwo1TG9hYqkEnZrc7DSHkbRDkzRB/view', 
        'https://drive.google.com/file/d/13rktahOy4cppfYAfHFfeGlNM4sT1Cb1z/view'
    ], NULL, 'Isolates stay wire electrical path.', 'স্টে ওয়্যারের বৈদ্যুতিক পথ আলাদা করে।'),

('insulator_shackle_types', 'Insulators', 'Shackle Insulator', 'শ্যাকেল ইনসুলেটর', 'Distribution terminal insulation.', 'ডিস্ট্রিবিউশন টার্মিনাল ইনসুলেশন।', 
    ARRAY[
        'https://drive.google.com/file/d/1922EQ6pIKSKY4wlyTGhJeziZ3DT_NPIL/view', 
        'https://drive.google.com/file/d/1nNeLq0f-J_5AMZp8iq_mpchRvaIWrmuZ/view'
    ], NULL, 'Used for low-voltage angles.', 'নিম্ন-ভোল্টেজের বাঁকে ব্যবহৃত হয়।'),

('insulator_reel_types', 'Insulators', 'Reel Insulator', 'রিল ইনসুলেটর', 'Secondary distribution line isolation.', 'সেকেন্ডারি ডিস্ট্রিবিউশন ইনসুলেশন।', 
    ARRAY[
        'https://drive.google.com/file/d/1HfxYMLQSoAz-OXsIZcrEhzDhIMw5T8tG/view', 
        'https://drive.google.com/file/d/1DSpdtOLGF3WUzSmcOzkUoSc7EuD7IAeu/view'
    ], NULL, 'Safe secondary wiring passage.', 'সেকেন্ডারি ওয়্যারিং এর জন্য নিরাপদ।')

ON CONFLICT (item_id) DO UPDATE SET
    category = EXCLUDED.category,
    name_en = EXCLUDED.name_en,
    name_bn = EXCLUDED.name_bn,
    function_en = EXCLUDED.function_en,
    function_bn = EXCLUDED.function_bn,
    images = EXCLUDED.images,
    approx_price_inr = COALESCE(EXCLUDED.approx_price_inr, safety_library.approx_price_inr),
    guide_en = COALESCE(EXCLUDED.guide_en, safety_library.guide_en),
    guide_bn = COALESCE(EXCLUDED.guide_bn, safety_library.guide_bn),
    updated_at = now();

END $$;
