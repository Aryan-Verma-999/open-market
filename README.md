# Equipment Marketplace

A lead-first marketplace platform for buying and selling used equipment.

## Features

- **Browse & Search**: Advanced filtering and search capabilities
- **Listing Management**: Create detailed equipment listings with photos and documents
- **Messaging System**: Real-time buyer-seller communication with quote negotiations
- **User Dashboards**: Separate interfaces for buyers and sellers
- **Admin Moderation**: Content review and user verification system
- **Optional Escrow**: Secure payment processing for transactions
- **Trust & Safety**: User verification, reviews, and reporting system

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- React Query for state management
- React Router for navigation
- Socket.io for real-time messaging

### Backend
- Node.js with Express and TypeScript
- PostgreSQL database with Prisma ORM
- Redis for caching and sessions
- JWT authentication
- Socket.io for real-time features
- AWS S3 for file storage

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- AWS S3 account (for file storage)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm run install:all
   ```

3. Set up environment variables:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

4. Configure your database and other services in the `.env` files

5. Run database migrations:
   ```bash
   cd backend && npm run migrate
   ```

6. Seed the database:
   ```bash
   cd backend && npm run db:seed
   ```

### Development

Start both frontend and backend in development mode:
```bash
npm run dev
```

Or run them separately:
```bash
# Backend (http://localhost:3001)
npm run dev:backend

# Frontend (http://localhost:3000)
npm run dev:frontend
```

### Testing

Run all tests:
```bash
npm test
```

Run tests for specific parts:
```bash
npm run test:backend
npm run test:frontend
```

### Building for Production

```bash
npm run build
```

## Project Structure

```
equipment-marketplace/
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Express middleware
│   │   ├── models/         # Data models and types
│   │   ├── utils/          # Utility functions
│   │   └── tests/          # Backend tests
│   ├── prisma/             # Database schema and migrations
│   └── package.json
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API client functions
│   │   ├── types/          # TypeScript type definitions
│   │   ├── utils/          # Utility functions
│   │   └── tests/          # Frontend tests
│   └── package.json
└── package.json            # Root package.json for scripts
```

## API Documentation

The API follows RESTful conventions. Key endpoints:

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/listings` - Browse listings
- `POST /api/listings` - Create listing
- `GET /api/messages/conversations` - Get user conversations
- `POST /api/messages` - Send message

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License