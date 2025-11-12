# Blue Feathers Gym - Backend API

RESTful API backend for the Blue Feathers Gym membership management system.

## Tech Stack

- Node.js & Express.js
- MongoDB with Mongoose
- TypeScript
- JWT Authentication
- Passport.js for OAuth
- Nodemailer with Brevo SMTP

## Features

- User authentication (JWT & Google OAuth)
- Password reset with OTP via email
- User management with CRUD operations
- Role-based access control (Admin/User)
- Email notifications (welcome, password reset, membership activation)
- Membership plan management

## Prerequisites

- Node.js v16+
- MongoDB Atlas account
- Brevo account for email service
- Google OAuth credentials (optional)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Blue-Feathers-001/Back.git
cd Back
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:

```env
PORT=5000
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-secure-jwt-secret
JWT_EXPIRE=7d
NODE_ENV=development

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
FRONTEND_URL=http://localhost:3000

# Email Configuration (Brevo SMTP)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-brevo-smtp-user
SMTP_PASSWORD=your-brevo-smtp-password
EMAIL_FROM=Your Gym Name <your-email@example.com>
```

5. Start the development server:
```bash
npm run dev
```

The API will run on http://localhost:5000

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (Protected)
- `POST /api/auth/forgot-password` - Request password reset OTP
- `POST /api/auth/reset-password` - Reset password with OTP
- `GET /api/auth/google` - Google OAuth login
- `GET /api/auth/google/callback` - Google OAuth callback

### Users (Protected)
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/:id` - Get single user
- `POST /api/users` - Create user (Admin only)
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (Admin only)

## Scripts

```bash
npm run dev      # Development with hot reload
npm run build    # Compile TypeScript
npm start        # Run production build
```

## Project Structure

```
src/
├── config/
│   ├── database.ts      # MongoDB connection
│   └── passport.ts      # OAuth configuration
├── controllers/
│   ├── authController.ts
│   ├── oauthController.ts
│   └── userController.ts
├── middleware/
│   └── auth.ts          # JWT verification
├── models/
│   └── User.ts          # User schema
├── routes/
│   ├── authRoutes.ts
│   └── userRoutes.ts
├── utils/
│   └── emailService.ts  # Email templates and sending
└── server.ts            # Express app setup
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| PORT | Server port | No (default: 5000) |
| MONGODB_URI | MongoDB connection string | Yes |
| JWT_SECRET | Secret for JWT signing | Yes |
| JWT_EXPIRE | JWT expiration time | No (default: 7d) |
| GOOGLE_CLIENT_ID | Google OAuth client ID | No |
| GOOGLE_CLIENT_SECRET | Google OAuth secret | No |
| SMTP_USER | Brevo SMTP username | Yes (for emails) |
| SMTP_PASSWORD | Brevo SMTP password | Yes (for emails) |
| EMAIL_FROM | Sender email address | Yes (for emails) |
| FRONTEND_URL | Frontend application URL | Yes |

## Security Features

- Password hashing with bcryptjs
- JWT token authentication
- SHA-256 hashing for OTP storage
- Protected routes with middleware
- Role-based access control
- CORS enabled
- Environment variable protection

## Email Service Setup

This project uses Brevo (formerly Sendinblue) for email delivery:

1. Create account at https://www.brevo.com/
2. Navigate to SMTP & API settings
3. Create SMTP credentials
4. Add to `.env` file

## Deployment

### Recommended Platforms
- Railway
- Render
- Heroku
- DigitalOcean

### Production Environment Variables

Update these for production:
- `NODE_ENV=production`
- Strong `JWT_SECRET`
- Production `MONGODB_URI`
- Production `FRONTEND_URL`
- Production `GOOGLE_CALLBACK_URL`

## Frontend Repository

Frontend: https://github.com/Blue-Feathers-001/Front.git

## License

MIT
