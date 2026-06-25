import type { Config } from "tailwindcss";

// shadcn/ui token mapping. Colors resolve to the CSS variables defined in
// src/index.css. To apply the Jia brandbook, override those variables (see the
// marked block in index.css) rather than editing this file.
const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		fontFamily: {
  			// B1-9: defer to the CSS var so jia-tokens.css is the single source of truth
  			sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Helvetica', 'Arial', 'sans-serif']
  		},
  		fontSize: {
  			// Jia type scale — size + paired line-height, deferring to jia-tokens.css (single source).
  			// Tailwind's default leadings don't match Jia (e.g. xl 28→30, 3xl 36→38), so the scale is
  			// mapped here once and every text-* / display-* utility inherits the correct Jia leading.
  			xs:   ['var(--text-xs-size)', { lineHeight: 'var(--text-xs-lh)' }],
  			sm:   ['var(--text-sm-size)', { lineHeight: 'var(--text-sm-lh)' }],
  			base: ['var(--text-md-size)', { lineHeight: 'var(--text-md-lh)' }],
  			lg:   ['var(--text-lg-size)', { lineHeight: 'var(--text-lg-lh)' }],
  			xl:   ['var(--text-xl-size)', { lineHeight: 'var(--text-xl-lh)' }],
  			// Display scale, mapped onto 2xl–7xl so existing heading classes pick up Jia leadings.
  			'2xl': ['var(--display-xs-size)', { lineHeight: 'var(--display-xs-lh)' }],
  			'3xl': ['var(--display-sm-size)', { lineHeight: 'var(--display-sm-lh)' }],
  			'4xl': ['var(--display-md-size)', { lineHeight: 'var(--display-md-lh)' }],
  			'5xl': ['var(--display-lg-size)', { lineHeight: 'var(--display-lg-lh)' }],
  			'6xl': ['var(--display-xl-size)', { lineHeight: 'var(--display-xl-lh)' }],
  			'7xl': ['var(--display-2xl-size)', { lineHeight: 'var(--display-2xl-lh)' }],
  			// Semantic display aliases (preferred for new headings — include the −2% display tracking).
  			'display-xs':  ['var(--display-xs-size)',  { lineHeight: 'var(--display-xs-lh)',  letterSpacing: 'var(--display-tracking)' }],
  			'display-sm':  ['var(--display-sm-size)',  { lineHeight: 'var(--display-sm-lh)',  letterSpacing: 'var(--display-tracking)' }],
  			'display-md':  ['var(--display-md-size)',  { lineHeight: 'var(--display-md-lh)',  letterSpacing: 'var(--display-tracking)' }],
  			'display-lg':  ['var(--display-lg-size)',  { lineHeight: 'var(--display-lg-lh)',  letterSpacing: 'var(--display-tracking)' }],
  			'display-xl':  ['var(--display-xl-size)',  { lineHeight: 'var(--display-xl-lh)',  letterSpacing: 'var(--display-tracking)' }],
  			'display-2xl': ['var(--display-2xl-size)', { lineHeight: 'var(--display-2xl-lh)', letterSpacing: 'var(--display-tracking)' }],
  		},
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))',
  				hover: 'hsl(var(--primary-hover))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			// B1-8: gray-cool scale (fills/surfaces) — also aliased as default `gray`
  			// so `bg-gray-100` = brandbook #eff1f5 instead of Tailwind default #f3f4f6
  			gray: {
  				'25':  'var(--gray-25)',
  				'50':  'var(--gray-50)',
  				'100': 'var(--gray-100)',
  				'200': 'var(--gray-200)',
  				'300': 'var(--gray-300)',
  				'400': 'var(--gray-400)',
  				'500': 'var(--gray-500)',
  				'600': 'var(--gray-600)',
  				'700': 'var(--gray-700)',
  				'800': 'var(--gray-800)',
  				'900': 'var(--gray-900)',
  				'950': 'var(--gray-950)',
  			},
  			'gray-cool': {
  				'25':  'var(--gray-25)',
  				'50':  'var(--gray-50)',
  				'100': 'var(--gray-100)',
  				'200': 'var(--gray-200)',
  				'300': 'var(--gray-300)',
  				'400': 'var(--gray-400)',
  				'500': 'var(--gray-500)',
  				'600': 'var(--gray-600)',
  				'700': 'var(--gray-700)',
  				'800': 'var(--gray-800)',
  				'900': 'var(--gray-900)',
  				'950': 'var(--gray-950)',
  			},
  			'gray-neutral': {
  				'25':  'var(--gray-neutral-25)',
  				'50':  'var(--gray-neutral-50)',
  				'100': 'var(--gray-neutral-100)',
  				'200': 'var(--gray-neutral-200)',
  				'300': 'var(--gray-neutral-300)',
  				'400': 'var(--gray-neutral-400)',
  				'500': 'var(--gray-neutral-500)',
  				'600': 'var(--gray-neutral-600)',
  				'700': 'var(--gray-neutral-700)',
  				'800': 'var(--gray-neutral-800)',
  				'900': 'var(--gray-neutral-900)',
  				'950': 'var(--gray-neutral-950)',
  			},
  		},
  		borderRadius: {
  			// B1-5: full 13-tier branded radius scale
  			none: 'var(--radius-none)',
  			xxs:  'var(--radius-xxs)',
  			xs:   'var(--radius-xs)',
  			sm:   'var(--radius-sm)',
  			md:   'var(--radius-md)',
  			lg:   'var(--radius-lg)',
  			xl:   'var(--radius-xl)',
  			'2xl': 'var(--radius-2xl)',
  			'3xl': 'var(--radius-3xl)',
  			'4xl': 'var(--radius-4xl)',
  			'5xl': 'var(--radius-5xl)',
  			'6xl': 'var(--radius-6xl)',
  			full: 'var(--radius-full)',
  		},
  		boxShadow: {
  			// B1-6: branded shadow scale
  			xs:           'var(--shadow-xs)',
  			sm:           'var(--shadow-sm)',
  			md:           'var(--shadow-md)',
  			lg:           'var(--shadow-lg)',
  			xl:           'var(--shadow-xl)',
  			'2xl':        'var(--shadow-2xl)',
  			'3xl':        'var(--shadow-3xl)',
  			'inset-brand': 'var(--shadow-inset-brand)',
  		},
  		backgroundImage: {
  			// B1-7: brand gradient utilities
  			'gradient-jia':      'var(--gradient-jia)',
  			'gradient-badge-brand': 'var(--gradient-badge-brand)',
  			'gradient-jia-45':   'var(--gradient-jia-45)',
  			'gradient-jia-dark': 'var(--gradient-jia-dark)',
  			'scrim-brand-20':    'var(--scrim-brand-20)',
  			'scrim-brand':       'var(--scrim-brand)',
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
