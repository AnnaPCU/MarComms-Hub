/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pdf-spin': {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
      },
    },
  },
  plugins: [],
  // Safe-listing colores dinámicos que Tailwind no puede detectar en compile-time
  // (porque se construyen con template literals como `bg-${color}-500`)
  safelist: [
    // Pink (Content Hub)
    'text-pink-600', 'border-pink-500', 'bg-pink-50', 'bg-pink-100', 'bg-pink-500',
    // Blue
    'text-blue-600', 'border-blue-500', 'bg-blue-50', 'bg-blue-100', 'bg-blue-500',
    // Purple (Campaigns)
    'text-purple-600', 'border-purple-500', 'bg-purple-50', 'bg-purple-100', 'bg-purple-500',
    // Emerald (Facturación)
    'text-emerald-600', 'border-emerald-500', 'bg-emerald-50', 'bg-emerald-500',
    // Orange (Events)
    'text-orange-600', 'border-orange-500', 'bg-orange-50', 'bg-orange-100', 'bg-orange-500',
    // Amber
    'text-amber-600', 'border-amber-500', 'bg-amber-50', 'bg-amber-500',
    // Indigo (Webinars)
    'text-indigo-600', 'border-indigo-500', 'bg-indigo-50', 'bg-indigo-100', 'bg-indigo-500',
    // Cyan (Notifs assigned)
    'text-cyan-600', 'border-cyan-500', 'bg-cyan-50', 'bg-cyan-700',
    // Rose
    'text-rose-600', 'border-rose-500', 'bg-rose-50', 'bg-rose-500',
    // Fuchsia
    'text-fuchsia-600', 'border-fuchsia-500', 'bg-fuchsia-50', 'bg-fuchsia-500',
    // Sky
    'text-sky-600', 'border-sky-500', 'bg-sky-50', 'bg-sky-500',
    // Teal
    'text-teal-600', 'border-teal-500', 'bg-teal-50', 'bg-teal-500',
    // Violet
    'text-violet-600', 'border-violet-500', 'bg-violet-50', 'bg-violet-500',
    // Red
    'text-red-600', 'border-red-500', 'bg-red-50', 'bg-red-500',
    // Slate
    'text-slate-600', 'border-slate-500', 'bg-slate-50',
    // Gradients usados dinámicamente
    'from-indigo-500', 'to-purple-500',
    'from-purple-600', 'to-pink-600',
    'from-orange-500', 'to-red-500',
    'from-pink-500', 'to-rose-500',
    'from-emerald-500', 'to-teal-500',
    'from-cyan-500', 'to-teal-500',
    'from-orange-500', 'to-amber-500',
    'from-blue-600', 'to-indigo-600',
  ],
};
