# Synthora.AI Project Information

## Overall Project Purpose

Synthora.AI is a frontend landing page for an AI-powered recruitment platform. Its value proposition is to help recruiters, HR teams, placement teams, and hiring managers automate candidate evaluation through AI-led aptitude tests, technical interviews, coding rounds, HR conversations, scoring, ranking, and reporting.

The problem it solves is repetitive, inconsistent, and time-heavy hiring workflows. The site presents Synthora.AI as a professional SaaS-style hiring assistant that improves speed, consistency, and decision quality during large-scale recruitment.

## Technical Stack

### Frontend

- React 19
- TypeScript
- Vite 6
- React Router DOM 7
- Tailwind CSS 3
- Framer Motion for entrance and scroll animations
- Lucide React for icons

### Backend

- No backend code is present in this repository.
- No API routes, server framework, or service layer currently exists.

### Database

- No database integration is present.
- No Prisma, Supabase, Firebase, MongoDB, PostgreSQL, or SQL configuration found.

### State Management
d
- Local React state only.
- Example: navbar uses `useState` for mobile menu and scroll state.
- No Redux, Zustand, Context state layer, or server cache library.

### Deployment And Cloud

- No deployment provider config found.
- No Vercel, Netlify, Docker, GitHub Actions, or CI/CD config present.
- Production build is handled by `npm run build`, which runs TypeScript build plus Vite bundling.

### Major Libraries

From `package.json`:

- `react`, `react-dom`: UI framework
- `vite`: dev server and bundler
- `typescript`: static typing
- `tailwindcss`, `postcss`, `autoprefixer`: styling pipeline
- `framer-motion`: animation
- `lucide-react`: icon system
- `react-router-dom`: route management

## Directory And File-By-File Architecture

### Root Files

- `package.json`: Project metadata, scripts, dependencies, and dev dependencies.
- `package-lock.json`: Locked dependency versions for reproducible installs.
- `vite.config.ts`: Vite config using the React plugin.
- `tailwind.config.ts`: Tailwind theme extensions, brand colors, shadows, background gradients, and custom animations.
- `postcss.config.js`: Enables Tailwind and Autoprefixer.
- `index.html`: HTML shell, meta description, favicon, Google Fonts, and React mount point.
- `README.md`: Product-level documentation and platform vision.
- `modules_to_be_covered.md`: Rough planning notes for coding round, HR, and aptitude modules.
- `tsconfig.json`: TypeScript project references.
- `tsconfig.app.json`: Strict TypeScript settings for app source.
- `tsconfig.node.json`: TypeScript settings for Vite config.

### Source Files

- `src/main.tsx`: React entry point. Mounts the app into `#root`, wraps it in `BrowserRouter`, and imports global styles.
- `src/App.tsx`: Route definition. Currently only `/` maps to the homepage.
- `src/pages/Home.tsx`: Main landing page composition. Renders `Navbar`, `Hero`, `AssessmentMarquee`, `Stats`, `Features`, `HowItWorks`, and `Footer`.
- `src/styles.css`: Tailwind directives, global document styling, focus states, utility classes like `.glass-panel`, `.text-balance`, and `.no-scrollbar`.
- `src/vite-env.d.ts`: Vite TypeScript environment declarations.

### Components

- `src/components/Navbar.tsx`: Fixed responsive navigation with logo, desktop links, CTA buttons, mobile menu, scroll-based styling, and Framer Motion mobile menu animation.
- `src/components/Hero.tsx`: Primary landing hero with badge, headline, subtext, CTAs, and right-side image.
- `src/components/AssessmentMarquee.tsx`: Dark premium infinite marquee showcasing supported assessment types with Lucide icons and custom Tailwind animations.
- `src/components/Stats.tsx`: Metrics section showing hiring drives, interviews, accuracy, and availability.
- `src/components/Features.tsx`: Feature card grid for AI interviews, automation, analytics, security, and time savings.
- `src/components/HowItWorks.tsx`: Five-step process flow from candidate upload to final report.
- `src/components/Footer.tsx`: Footer brand block, demo CTA, navigation links, social icon placeholders, and copyright.

### Assets

- `images/logo.png`: Current site logo and favicon source.
- `images/Dashboard_girl.png`: Current hero image.
- `src/assets/images/logo.svg`: Older SVG logo asset, currently not used by navbar/footer after the PNG replacement.
- `Documents/SYNTHORA.docx`: Project document file; binary document content was not parsed in this code overview.

## Visual And Design Identity

### Logo And Branding

- Current logo path: `images/logo.png`
- Format: PNG
- Usage: navbar, footer, and favicon.
- Visual description: the logo combines a brain outline with a magnifying glass/checkmark motif. It uses a blue-to-cyan-to-purple gradient, suggesting AI intelligence, screening, verification, and recruitment confidence.
- Legacy logo: `src/assets/images/logo.svg`, a gradient SVG mark using white, lavender, violet, and pink tones.

### Typography

- Primary font: Inter from Google Fonts.
- Fallback stack: `Inter, ui-sans-serif, system-ui, sans-serif`.
- Visual tone: modern SaaS, clean, high-contrast, professional.

### Color Palette

#### Primary And Text Colors

- Primary navy / heading: `#0F172A`
- Secondary dark slate: `#1E293B`
- Body slate: `#475569`
- Muted text: `#64748B`

#### Brand And Accent Colors

- Primary blue: `#2563EB`
- Bright sky accent: `#0EA5E9`
- Tailwind brand sky: `#38BDF8`
- Violet accent: `#7C3AED`
- Indigo accent: `#6366F1`
- Pink accent: `#DB2777`
- Brand rose: `#FB7185`
- Brand pink accent: `#FF5DA2`

#### Background And Surface Colors

- Main background: `#FFFFFF`
- Soft app background: `#F8FAFC`
- Marquee dark background: `#121212`
- Glass surface: `rgba(255,255,255,0.86)`
- Border glass: `rgba(148,163,184,0.22)`

#### Interaction And Shadow Colors

- Focus ring: `rgba(37, 99, 235, 0.45)`
- Soft shadows: `rgba(15,23,42,.04-.10)`
- Button shadow: `rgba(30,41,59,.18)`
- Blue glow: `rgba(37,99,235,.16)`

## Design Summary

The project uses a light, polished AI SaaS landing page identity with dark-slate typography, blue/cyan technology accents, rounded surfaces, soft shadows, Framer Motion transitions, and a premium dark marquee contrast band below the hero.
