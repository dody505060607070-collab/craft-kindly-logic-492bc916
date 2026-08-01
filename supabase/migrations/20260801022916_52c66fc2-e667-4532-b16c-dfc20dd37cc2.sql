DELETE FROM public.enrollments a USING public.enrollments b WHERE a.user_id=b.user_id AND a.course_id=b.course_id AND a.created_at < b.created_at;
ALTER TABLE public.enrollments ADD CONSTRAINT enrollments_user_course_unique UNIQUE (user_id, course_id);
ALTER TABLE public.assignment_submissions ADD COLUMN IF NOT EXISTS attachment_path text;