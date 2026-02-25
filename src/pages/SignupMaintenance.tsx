import { useEffect, useState } from "react";

export default function SignupWizard() {
  const [progress, setProgress] = useState(0);
  const [countdown, setCountdown] = useState("Calculando tiempo...");

  useEffect(() => {
    const startDate = new Date();
    const endDate = new Date(new Date().getFullYear(), 3, 1, 0, 0, 0);

    const interval = setInterval(() => {
      const now = new Date();
      const total = endDate.getTime() - startDate.getTime();
      const elapsed = now.getTime() - startDate.getTime();
      const remaining = endDate.getTime() - now.getTime();

      let percent = (elapsed / total) * 100;
      if (percent < 0) percent = 0;
      if (percent > 100) percent = 100;
      setProgress(percent);

      if (remaining <= 0) {
        setCountdown("¡Disponible ahora!");
        setProgress(100);
        return;
      }

      const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
      const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((remaining / (1000 * 60)) % 60);
      const seconds = Math.floor((remaining / 1000) % 60);

      setCountdown(
        `Disponible en ${days}d ${hours}h ${minutes}m ${seconds}s`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center text-white bg-gradient-to-br from-slate-900 to-slate-950 overflow-hidden relative">
      
      {/* Rotating ring */}
      <div className="absolute w-72 h-72 border border-cyan-400/30 rounded-full animate-spin-slow"></div>

      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-12 text-center w-[400px] shadow-2xl">
        
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-cyan-400/20 flex items-center justify-center animate-pulse">
            <svg
              className="w-10 h-10 text-cyan-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-4 animate-pulse">
          En Mantenimiento
        </h1>

        <p className="text-gray-300 mb-6">
          Estamos trabajando para mejorar el sistema.
        </p>

        <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-cyan-400 transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="mt-3 text-sm text-gray-400">{countdown}</p>

        <p className="mt-6 text-sm text-gray-400">
          Contacto:
        </p>

        <a
          href="mailto:digitalsolutionsfp@gmail.com"
          className="text-cyan-300 hover:text-cyan-200 underline"
        >
          digitalsolutionsfp@gmail.com
        </a>
      </div>

      <style>
        {`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
      `}
      </style>
    </div>
  );
}