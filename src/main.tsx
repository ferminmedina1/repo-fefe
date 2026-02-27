import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Captura el 10% de las transacciones para performance
    tracesSampleRate: 0.1,
    // Graba sesiones solo cuando hay un error
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    environment: import.meta.env.MODE,
  });
}

const ErrorFallback = () => (
  <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6 text-center">
    <h2 className="text-xl font-semibold">Algo salió mal</h2>
    <p className="text-sm text-muted-foreground max-w-sm">
      Ocurrió un error inesperado. El equipo fue notificado automáticamente.
    </p>
    <button
      onClick={() => window.location.reload()}
      className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90"
    >
      Recargar página
    </button>
  </div>
);

const Root = sentryDsn
  ? ({ children }: { children: React.ReactNode }) => (
      <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
        {children}
      </Sentry.ErrorBoundary>
    )
  : ({ children }: { children: React.ReactNode }) => <>{children}</>;

createRoot(document.getElementById("root")!).render(
  <Root>
    <App />
  </Root>
);
