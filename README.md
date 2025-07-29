# Just Speak MVP

An AI-powered language learning app focused on speaking practice. Track your speaking time, have natural conversations with AI, and build confidence in English.

## 🚀 Features

- **Push-to-Talk Interface**: Simple one-button speaking interface
- **AI Conversation Partners**: Natural conversations powered by GPT-4
- **Speaking Time Tracking**: Monitor your progress with detailed metrics
- **Conversation Feedback**: Review conversations and improvement areas
- **ESL-Focused Corrections**: Prioritized error feedback based on ESL hierarchy
- **Real-time Transcription**: See your words as you speak
- **Secure & Private**: End-to-end encryption for all conversations

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **AI**: OpenAI GPT-4 API
- **Speech**: Google Cloud Speech-to-Text
- **Deployment**: Vercel

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- OpenAI API key
- Google Cloud account (for Speech-to-Text)

## 🔧 Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/shojuro/JustSpeakMVP.git
   cd JustSpeakMVP/justspeakmvp
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Fill in your API keys and configuration

4. **Set up Supabase**
   - Create a new project on [Supabase](https://supabase.com)
   - Run the migration in `supabase/migrations/001_initial_schema.sql`
   - Copy your project URL and keys to `.env`

5. **Run development server**
   ```bash
   npm run dev
   ```

## 🔐 Security

- All API endpoints are rate-limited
- Authentication via Supabase Auth (JWT)
- Row Level Security (RLS) on all database tables
- Content Security Policy headers configured
- Input validation and sanitization
- HTTPS only in production

## 📁 Project Structure

```
justspeakmvp/
├── src/
│   ├── app/          # Next.js app router pages
│   ├── components/   # React components
│   ├── hooks/        # Custom React hooks
│   ├── lib/          # Utilities and configurations
│   ├── styles/       # Global styles and Tailwind
│   └── types/        # TypeScript type definitions
├── supabase/
│   ├── migrations/   # Database migrations
│   └── functions/    # Edge functions
└── public/           # Static assets
```

## 🎨 Design System

The app uses a carefully chosen color palette optimized for accessibility:

- **Primary**: `#2563EB` (Blue-600) - Trust and reliability
- **Success**: `#10B981` (Emerald-500) - Progress indicators
- **Warning**: `#F59E0B` (Amber-500) - Active states
- **Error**: `#EF4444` (Red-500) - Error states (used sparingly)

## 🚀 Deployment

### Vercel (Recommended)

```bash
npm run build
vercel --prod
```

### Docker

```bash
docker build -t justspeakmvp .
docker run -p 3000:3000 justspeakmvp
```

## 📝 Development Workflow

1. Create feature branch from `develop`
2. Make changes following TDD principles
3. Run tests: `npm test`
4. Create PR to `develop`
5. After review, merge to `develop`
6. Deploy to staging for testing
7. Merge to `main` for production

## 🧪 Testing

```bash
npm run test        # Unit tests
npm run test:e2e    # End-to-end tests
npm run lint        # ESLint
npm run typecheck   # TypeScript checks
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- OpenAI for GPT-4 API
- Google Cloud for Speech-to-Text
- Supabase for the backend infrastructure
- The amazing language learning community

---

**Remember**: You're not just building an app. You're breaking down barriers that have silenced millions of voices. 🚀
