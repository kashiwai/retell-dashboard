'use client';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Logo({ className = "", showText = true, size = 'md' }: LogoProps) {
  const sizes = {
    sm: { icon: 32, text: 'text-xl' },
    md: { icon: 40, text: 'text-2xl' },
    lg: { icon: 48, text: 'text-3xl' },
    xl: { icon: 64, text: 'text-4xl' }
  };

  const currentSize = sizes[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo Icon */}
      <div className="relative">
        <svg
          width={currentSize.icon}
          height={currentSize.icon}
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-lg"
        >
          {/* Heart shape with gradient */}
          <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0EA5E9" />
              <stop offset="50%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#22C55E" />
            </linearGradient>
            <linearGradient id="logoGradientBlue" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#0EA5E9" />
            </linearGradient>
          </defs>
          
          {/* Main heart shape */}
          <path
            d="M40 70C20 60 5 45 5 28C5 18 12 10 22 10C28 10 34 13 40 18C46 13 52 10 58 10C68 10 75 18 75 28C75 45 60 60 40 70Z"
            fill="url(#logoGradient)"
            opacity="0.9"
          />
          
          {/* Connection lines representing AI/network */}
          <g opacity="0.8">
            {/* Hand/connection symbol */}
            <path
              d="M25 30C25 30 30 25 35 25C40 25 42 28 42 30C42 32 40 35 35 35M35 35C35 35 38 38 40 40M35 35C35 35 32 38 30 40"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M45 30C45 30 50 25 55 25C60 25 62 28 62 30C62 32 60 35 55 35"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.7"
            />
            
            {/* Connecting wave */}
            <path
              d="M30 45Q40 40 50 45"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              opacity="0.6"
            />
          </g>
          
          {/* AI dots */}
          <circle cx="20" cy="28" r="2" fill="white" opacity="0.8" />
          <circle cx="60" cy="28" r="2" fill="white" opacity="0.8" />
          <circle cx="40" cy="50" r="2" fill="white" opacity="0.6" />
        </svg>
      </div>

      {/* Logo Text */}
      {showText && (
        <div className={`font-bold ${currentSize.text} tracking-tight`}>
          <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
            TSUNA
          </span>
          <span className="bg-gradient-to-r from-emerald-500 to-green-500 bg-clip-text text-transparent">
            GARU
          </span>
          <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
            .AI
          </span>
        </div>
      )}
    </div>
  );
}