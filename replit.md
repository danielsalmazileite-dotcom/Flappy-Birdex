# Flappi Birdex

## Overview

Flappi Birdex is a multiplayer Flappy Bird-style browser game with a glossy "Frutiger Aero" aesthetic. Players can play solo or compete in real-time online matches through room-based multiplayer. The game features unlockable characters, player progression tracking, and multiple game modes including a hardcore variant.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state, React hooks for local state
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Animations**: Framer Motion for smooth transitions and UI animations
- **Game Rendering**: Pure Canvas API within React refs for performance-critical game loop

### Backend Architecture
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript with ES modules
- **Build System**: Vite for frontend, esbuild for server bundling
- **API Design**: REST endpoints with Zod schema validation shared between client and server

### Data Layer
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema-to-validation integration
- **Schema Location**: Shared schema in `shared/schema.ts` for type consistency across client and server

### Real-time Communication
- **Protocol**: WebSocket (ws library) for multiplayer game state synchronization
- **Implementation**: WebSocket server attached to the HTTP server in routes.ts

### Project Structure
```
├── client/           # React frontend application
│   └── src/
│       ├── components/   # UI components including game canvas
│       ├── pages/        # Route-based page components
│       ├── hooks/        # Custom React hooks
│       └── lib/          # Utilities and query client
├── server/           # Express backend
│   ├── routes.ts     # API routes and WebSocket setup
│   ├── storage.ts    # Database access layer
│   └── db.ts         # Database connection
├── shared/           # Shared types and schemas
│   ├── schema.ts     # Drizzle database schema
│   └── routes.ts     # API route definitions with Zod validation
└── migrations/       # Drizzle database migrations
```

### Key Design Decisions

1. **Shared Schema Pattern**: Database schemas and API validation schemas live in `/shared` to ensure type safety across the full stack without duplication.

2. **Room-Based Multiplayer**: Rooms are created with unique codes, supporting both public and password-protected private rooms. Room state is persisted in PostgreSQL.

3. **Canvas-Based Game Engine**: The game loop runs in a Canvas element managed via React refs, keeping rendering performant while maintaining React's component model for UI.

4. **Player Stats Persistence**: Game statistics (flaps, best scores) are stored in localStorage on the client for offline persistence.

5. **Component Library**: shadcn/ui provides a comprehensive set of accessible, customizable UI primitives built on Radix UI.

## External Dependencies

### Database
- **PostgreSQL**: Primary data store accessed via `DATABASE_URL` environment variable
- **Drizzle Kit**: Database migrations via `npm run db:push`

### Third-Party Services
- None currently configured (no auth providers, payment systems, or external APIs)

### Key NPM Packages
- **drizzle-orm / drizzle-zod**: Database ORM and schema validation
- **ws**: WebSocket server for real-time multiplayer
- **zod**: Runtime type validation
- **@tanstack/react-query**: Server state management
- **framer-motion**: Animation library
- **Radix UI primitives**: Accessible component foundations