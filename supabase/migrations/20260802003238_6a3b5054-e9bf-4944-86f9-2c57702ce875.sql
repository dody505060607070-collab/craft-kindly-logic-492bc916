INSERT INTO public.subjects (name, description, icon, sort_order, is_published)
VALUES ('البرمجة', 'كورسات البرمجة وتطوير الويب والذكاء الاصطناعي', 'Code', 1, true);

INSERT INTO public.courses (title, description, subject_id, grade, price, price_year, is_free, is_published, sort_order)
SELECT 'أساسيات البرمجة بـ Python', 'من الصفر للاحتراف: أساسيات البرمجة بلغة Python بشرح مبسط ومشاريع عملية.', s.id, 'من الصفر للاحتراف', 250, 2000, false, true, 1
FROM public.subjects s WHERE s.name = 'البرمجة';

INSERT INTO public.courses (title, description, subject_id, grade, price, price_year, is_free, is_published, sort_order)
SELECT 'تطوير مواقع الويب', 'HTML و CSS و JavaScript خطوة بخطوة مع بناء مواقع حقيقية.', s.id, 'HTML · CSS · JavaScript', 300, 2400, false, true, 2
FROM public.subjects s WHERE s.name = 'البرمجة';

INSERT INTO public.courses (title, description, subject_id, grade, price, price_year, is_free, is_published, sort_order)
SELECT 'مقدمة في الذكاء الاصطناعي', 'مقدمة عملية في الذكاء الاصطناعي وتعلم الآلة مع مشاريع تطبيقية.', s.id, 'مشاريع عملية', 350, 2800, false, true, 3
FROM public.subjects s WHERE s.name = 'البرمجة';