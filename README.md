# XB Health Experiments App

A mobile-first health experiment tracking app built with React, TanStack Start, MongoDB, and Capacitor-ready architecture.

## Features

- **Multi-language support**: English and Spanish (browser-based detection)
- **Box-based organization**: Experiments grouped into health categories (Sleep, Eat, Move)
- **5-day experiments**: Structured daily tasks with markdown content, images, and YouTube videos
- **Today view**: See all your current tasks grouped by experiment
- **Experiments browser**: Browse boxes and explore available experiments
- **Journal**: Track your responses and progress with calendar filtering
- **Mobile-first**: Bottom tab navigation and drawer components for mobile UX

## Tech Stack

- **Frontend**: React 19 + TanStack Start (SPA mode)
- **Routing**: TanStack Router with file-based routing
- **Data Fetching**: TanStack Query + Server Functions (RPC)
- **Database**: MongoDB with Mongoose ODM
- **UI**: Tailwind CSS + shadcn/ui components
- **Mobile Components**: Vaul drawer for bottom sheets
- **Markdown**: react-markdown with YouTube embed support

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- MongoDB running locally or Atlas connection

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your MongoDB connection string:
   ```
   MONGODB_URI=mongodb://localhost:27017/xb-app
   # or for MongoDB Atlas:
   # MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/xb-app
   ```

4. Seed the database with sample data:
   ```bash
   pnpm seed
   ```

5. Start the development server:
   ```bash
   pnpm dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── mobile-nav.tsx   # Bottom tab navigation
│   └── markdown-renderer.tsx  # Content renderer
├── lib/
│   ├── utils.ts         # Utility functions
│   └── language-context.tsx   # Localization context
├── routes/
│   ├── __root.tsx       # Root layout
│   ├── index.tsx        # Redirect to /today
│   └── _app/            # Main app routes
│       ├── today.tsx    # Today's tasks
│       ├── experiments.tsx  # Browse experiments
│       ├── journal.tsx  # Journal entries
│       └── settings.tsx # Settings (placeholder)
├── server/
│   ├── db/
│   │   ├── connection.ts  # MongoDB connection
│   │   └── models.ts      # Mongoose schemas
│   ├── rpc/               # Server functions
│   │   ├── boxes.ts
│   │   ├── experiments.ts
│   │   ├── tasks.ts
│   │   └── journal.ts
│   └── scripts/
│       └── seed.ts        # Database seeding
└── index.css            # Global styles

```

## Data Model

- **Box**: Category of experiments (Sleep, Eat, Move) with thumbnail and description
- **Experiment**: 5-day structured program with daily tasks
- **Task**: Individual activity with icon, name, and content blocks
- **Content Block**: Markdown content with images and YouTube videos
- **Journal Entry**: User responses to tasks (for future implementation)

All content supports English and Spanish localization.

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm seed` - Seed database with sample data

## Future Enhancements

- User authentication
- User experiment enrollment and progress tracking
- Task completion and response submission
- Push notifications for daily reminders
- Capacitor integration for iOS/Android
- Analytics and insights
- Custom experiment creation (admin panel)

## License

Private
