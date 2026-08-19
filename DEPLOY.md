# نقل منصة المستر إلى GitHub + Vercel

كل حاجة محفوظة في الريبو: الكود، الصفحات، السيرفر فنكشنز، وكل ملفات قاعدة البيانات (SQL) في `supabase/migrations/` — فأي نسخة جديدة تبقى طبق الأصل.

## 1) قاعدة البيانات والملفات (Backend)
- كل الجداول والسياسات (RLS) والدوال موجودة في `supabase/migrations/*.sql` بالترتيب.
- على مشروع Supabase جديد: `supabase db push` (أو نفّذ الملفات بالترتيب في SQL Editor).
- الـ Storage buckets المطلوبة: `course-videos`, `course-covers`, `payment-proofs`, `assessment-files`.
- الفيديوهات والملفات والصور المرفوعة موجودة داخل Storage — لازم تنقلها بنسخة من الـ bucket لو غيّرت مشروع الباك اند.

## 2) متغيرات البيئة على Vercel
Client (لازم بادئة VITE):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
```
Server (سرّي — Environment Variables في Vercel فقط):
```
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
LOVABLE_API_KEY=
```
ملاحظة: `LOVABLE_API_KEY` يشتغل مع Lovable AI Gateway فقط. خارج Lovable إمّا تسيبه، أو تستبدل `src/lib/ai-gateway.server.ts` بمفتاح OpenAI/Groq.

## 3) البناء على Vercel
المشروع TanStack Start + Vite ومبني على هدف Cloudflare افتراضيًا. لنشره على Vercel:
في `vite.config.ts` اضبط هدف nitro على `vercel`:
```ts
export default defineConfig({
  tanstackStart: { server: { entry: "server" } },
  nitro: { preset: "vercel" },
});
```
Framework Preset في Vercel: **Vite**، Build: `npm run build`، Output: يتولّد تلقائيًا من nitro.

## 4) الميزات اللي لازم تتأكد منها بعد النقل
- تسجيل/دخول بالإيميل + الموبايل، وقفل الحساب بجهاز واحد.
- الأدمن: `dody505060607070@gmail.com` (صف في `public.user_roles`).
- الكورسات والدروس والفيديوهات وحد المشاهدات.
- الاختبارات والواجبات: مؤقّت، عدد محاولات، تصحيح AI، بنك أسئلة ورفع ملفات.
- الاشتراكات: شهري / ترم (120 يوم) / سنوي + أكواد التفعيل + مراجعة إثباتات الدفع.
- الإعلانات: بوب-أب + الشريط المتحرك.
