import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "../lib/auth";
import { AIChat } from "@/components/AIChat";
import { useRouterState } from "@tanstack/react-router";
import { MarqueeBar } from "@/components/MarqueeBar";
import { PopupAnnouncement } from "@/components/PopupAnnouncement";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">الصفحة غير موجودة</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          الرابط اللي بتحاول تفتحه مش موجود أو تم نقله.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-colors hover:opacity-90"
          >
            الرجوع للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">حصلت مشكلة</h1>
        <p className="mt-2 text-sm text-muted-foreground">جرّب تحديث الصفحة أو الرجوع للرئيسية.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            إعادة المحاولة
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground"
          >
            الرئيسية
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "منصة السيد عبدالعاطي | كورسات برمجة وذكاء اصطناعي" },
      {
        name: "description",
        content:
          "كورسات برمجة وذكاء اصطناعي مع الأستاذ السيد عبدالعاطي — شرح مبسط، فيديوهات منظمة، ومتابعة خطوة بخطوة.",
      },
      { name: "author", content: "السيد عبدالعاطي" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "منصة السيد عبدالعاطي | كورسات برمجة وذكاء اصطناعي" },
      { name: "twitter:title", content: "منصة السيد عبدالعاطي | كورسات برمجة وذكاء اصطناعي" },
      { property: "og:description", content: "كورسات برمجة وذكاء اصطناعي مع الأستاذ السيد عبدالعاطي — شرح مبسط، فيديوهات منظمة، ومتابعة خطوة بخطوة." },
      { name: "twitter:description", content: "كورسات برمجة وذكاء اصطناعي مع الأستاذ السيد عبدالعاطي — شرح مبسط، فيديوهات منظمة، ومتابعة خطوة بخطوة." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/139cfe09-ee4c-4bd1-a4d0-0c2a9cf7dacc/id-preview-420c7b92--5d23927e-1197-4740-b27f-179f0ab38191.lovable.app-1785175907406.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/139cfe09-ee4c-4bd1-a4d0-0c2a9cf7dacc/id-preview-420c7b92--5d23927e-1197-4740-b27f-179f0ab38191.lovable.app-1785175907406.png" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800;900&family=Tajawal:wght@400;500;700;800&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const onAdmin = path.startsWith("/dashboard");
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {!onAdmin && <MarqueeBar />}
        <Outlet />
        {!onAdmin && <PopupAnnouncement />}
        {!onAdmin && <AIChat mode="student" context={`المسار الحالي: ${path}`} />}
        <Toaster position="top-center" richColors theme="dark" dir="rtl" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
