# نسخة كاملة من الباك اند (Backup / Restore)

كل حاجة محفوظة في الريبو:

| المحتوى | المكان |
| --- | --- |
| الجداول والسياسات والدوال | `supabase/migrations/*.sql` (بالترتيب) |
| بيانات الجداول (الدروس، الفصول، البروفايلات، الإعلانات، الإعدادات… إلخ) | `supabase/seed/data.sql` |
| الفيديوهات والصور والملفات المرفوعة | `supabase/storage-backup/<bucket>/<path>` + `manifest.json` |
| الملفات الأكبر من 10MB | ملفات `*.asset.json` جوه نفس المسار (فيها `url` للتحميل) |
| متغيرات البيئة وخطوات Vercel | `DEPLOY.md` |

## استرجاع على مشروع Supabase جديد

```bash
# 1) الهيكل
supabase db push          # أو نفّذ ملفات migrations بالترتيب

# 2) البيانات
psql "$DB_URL" -f supabase/seed/data.sql

# 3) الملفات
export SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
python3 supabase/restore_storage.py
```

## ملاحظات مهمة
- الـ buckets المطلوبة: `course-videos`, `course-covers`, `payment-proofs`, `assessment-files` (سكربت الاسترجاع بينشئها لو مش موجودة).
- حسابات المستخدمين نفسها (auth.users) مش بتنقل بالسكربت — الباسوردات محفوظة داخل نظام Auth ومش متاحة للتصدير. لو غيّرت مشروع الباك اند، الطلاب يسجّلوا من جديد أو تعمل لهم invite، وصفوف `profiles` بتربط بنفس الـ id لو نفس المشروع.
- لو هترفع على Vercel وبتستخدم **نفس** الباك اند الحالي، مش محتاج أي استرجاع — بس المتغيرات في `DEPLOY.md`.
