export const SITE = {
  name: "منصة المستر",
  tagline: "تعلم .. فهم .. استمر .. وتفوق",
  teacher: "المستر",
  subject: "البرمجة والذكاء الاصطناعي",
  phone: "01019209604",
  whatsapp: "201019209604",
  instagram: "https://instagram.com/",
};

export type FeatureItem = {
  key: string;
  title: string;
  desc: string;
  to: string;
};

/** الأقسام العشرة الأساسية للمنصة — تظهر في القائمة الجانبية وفي لوحة التحكم */
export const PLATFORM_SECTIONS: FeatureItem[] = [
  {
    key: "platform",
    title: "منصة تعليمية متكاملة",
    desc: "كورسات وفصول ودروس منظمة بالكامل",
    to: "/dashboard/courses",
  },
  {
    key: "video",
    title: "سيرفر رفع الفيديوهات",
    desc: "رفع فيديوهات بجودة عالية ومشغل محمي",
    to: "/dashboard/videos",
  },
  {
    key: "live",
    title: "بث مباشر للطلاب",
    desc: "حصص مباشرة مع دردشة تفاعلية وتسجيل",
    to: "/dashboard/live",
  },
  {
    key: "students",
    title: "حسابات طلاب بلا حدود",
    desc: "إضافة وإدارة عدد غير محدود من الطلاب",
    to: "/dashboard/students",
  },
  {
    key: "admin",
    title: "لوحة تحكم متكاملة",
    desc: "تحكم كامل في كل قسم: إضافة وتعديل وحذف",
    to: "/dashboard",
  },
  {
    key: "payments",
    title: "طرق دفع مختلفة",
    desc: "فودافون كاش، انستاباي، فيزا، وأكواد خصم",
    to: "/dashboard/payments",
  },
  {
    key: "comm",
    title: "أدوات اتصال متعددة",
    desc: "رسائل داخلية، إشعارات، وإعلانات عامة",
    to: "/dashboard/messages",
  },
  {
    key: "assignments",
    title: "واجبات بتصحيح ذكي",
    desc: "تصحيح تلقائي فوري بالذكاء الاصطناعي",
    to: "/dashboard/assignments",
  },
  {
    key: "quizzes",
    title: "اختبارات وبنك أسئلة",
    desc: "اختيار من متعدد، صح وخطأ، ومقالي",
    to: "/dashboard/quizzes",
  },
  {
    key: "reports",
    title: "تقارير وإحصائيات",
    desc: "متابعة الأداء والإيرادات ونسب الإنجاز",
    to: "/dashboard/reports",
  },
];
