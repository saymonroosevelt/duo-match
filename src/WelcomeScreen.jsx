export default function WelcomeScreen({ onStart, onEnterAccount }) {
  return (
    <main className="relative min-h-[100dvh] w-full bg-[#2a0610] text-[#f8e3d8]">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/silk.jpg')" }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(10,0,0,0.10),transparent_58%)]"
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/45 to-transparent"
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/60 via-black/20 to-transparent"
        aria-hidden="true"
      />

      <div
        className="relative z-10 flex min-h-[100dvh] flex-col items-center px-8"
        style={{
          paddingTop:
            'max(6.5rem, 20vh, calc(env(safe-area-inset-top) + 3rem))',
          paddingBottom:
            'max(3.5rem, calc(env(safe-area-inset-bottom) + 2rem))',
        }}
      >
        <div className="flex flex-col items-center text-center">
          <MatchMark className="h-[120px] w-[120px] drop-shadow-[0_10px_28px_rgba(0,0,0,0.38)] sm:h-[135px] sm:w-[135px]" />
          <h1 className="-mt-1 font-logo text-[64px] font-medium leading-none tracking-[-0.055em] text-[#f8e3d8] sm:text-[72px]">
            match
          </h1>
          <p className="mt-6 max-w-[280px] font-sans text-[15px] font-normal leading-[1.55] text-[#e8cbc4]/90 sm:text-base">
            Conexões reais.
            <br />
            Relacionamentos de verdade.
          </p>
        </div>

        <div className="mt-auto flex w-full max-w-[320px] flex-col items-center gap-5">
          <button
            type="button"
            onClick={onStart}
            className="w-full rounded-full bg-[#f8e3d8] py-3.5 text-[15px] font-semibold text-[#3a1219] shadow-[0_14px_40px_rgba(0,0,0,0.30)] transition-all duration-200 hover:bg-white active:scale-[0.985]"
          >
            Começar
          </button>
          <button
            type="button"
            onClick={onEnterAccount}
            className="text-sm font-medium text-[#f3d8d0] underline decoration-[#f3d8d0]/55 decoration-1 underline-offset-4 transition-colors hover:text-white"
          >
            Entrar na sua conta
          </button>
        </div>
      </div>
    </main>
  );
}

function MatchMark({ className }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="duo-match-base"
          x1="13"
          y1="32"
          x2="60"
          y2="102"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FDF1E8" />
          <stop offset="0.45" stopColor="#F9E4D9" />
          <stop offset="0.75" stopColor="#F5D0C2" />
          <stop offset="1" stopColor="#EFC4B4" />
        </linearGradient>
        <linearGradient
          id="duo-match-right"
          x1="64"
          y1="36"
          x2="100"
          y2="100"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F5C4B4" />
          <stop offset="0.1" stopColor="#F0B6A6" />
          <stop offset="0.5" stopColor="#E39B91" />
          <stop offset="0.8" stopColor="#D48686" />
          <stop offset="1" stopColor="#C97874" />
        </linearGradient>
        <linearGradient
          id="duo-match-stick"
          x1="65"
          y1="49"
          x2="76"
          y2="66"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F0B6A6" />
          <stop offset="1" stopColor="#DD8A80" />
        </linearGradient>
      </defs>

      {/* Continuous heart outline: clean cusp and open bottom point. */}
      <path
        d="M60 102C38 82 14 70 13 52C12 38 23 27 36 26C50 25 55 33 60 43C65 33 72 25 90 26C100 27 108 38 107 52C106 70 89 80 71 98"
        stroke="url(#duo-match-base)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Short diagonal matchstick inside the heart. */}
      <path
        d="M64 47L76 66"
        stroke="url(#duo-match-base)"
        strokeWidth="10"
        strokeLinecap="round"
      />
    </svg>
  );
}
