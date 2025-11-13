# GORGONE V2

Enterprise-grade social media monitoring platform for large organizations and government.

## ✨ Features

- 🎨 Modern, minimalist UI with dark/light mode
- 📱 Fully responsive (mobile-first)
- 🔒 Security headers & middleware
- ⚡ Optimized performance with Redis cache
- 🎯 SEO-ready (metadata, sitemap, robots.txt)
- 🛡️ Professional error handling
- 📊 Component-level loading skeletons
- 🎭 Shadcn UI design system
- 🌍 English-first (all content in English)

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **Styling**: Tailwind CSS 4 + Shadcn UI
- **Database**: Supabase (PostgreSQL)
- **Cache**: Upstash Redis
- **Workers**: QStash (Upstash)
- **Deploy**: Render

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Copy environment template
cp env.template .env.local

# Configure environment variables in .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

## 📝 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors
npm run format       # Format code with Prettier
npm run format:check # Check code formatting
npm run type-check   # Run TypeScript type checking
```

## 🔐 Environment Variables

See `env.template` for the complete list. Required variables:

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `UPSTASH_REDIS_REST_URL` - Upstash Redis REST URL
- `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis token
- `QSTASH_TOKEN` - QStash token

## 🌐 Deployment (Render)

1. **Build Command**: `npm install && npm run build`
2. **Start Command**: `npm start`
3. **Node Version**: 18+

The `render.yaml` file is included for automatic configuration.

Configure all environment variables in the Render dashboard.

## 📚 Documentation

- **Architecture**: See `context.md` for detailed technical documentation
- **Components**: All UI components in `/components/ui`
- **Data Layer**: Centralized in `/lib/data`
- **Types**: Centralized in `/types`

## 🎯 Code Quality

- **ESLint** configured with Next.js rules
- **Prettier** for consistent formatting
- **TypeScript** strict mode enabled
- Run `npm run format` before committing

## 🔒 Security

- Security headers via middleware
- HSTS, CSP, X-Frame-Options configured
- Environment validation
- Error logging & monitoring ready

## 📱 Pages

- `/` - Landing page with login
- `/dashboard` - Main dashboard (header, sidebar, footer)
- `/not-found` - Custom 404 page
- Error boundaries for graceful error handling

## 🤝 Contributing

1. Follow the English-only rule (UI, code, comments)
2. Use Shadcn typography components
3. Use component-level skeletons (no global loaders)
4. Run `npm run format` before committing
5. Ensure `npm run build` succeeds

## 📄 License

Private - Enterprise use only

---

Built with ❤️ for enterprise and government use
