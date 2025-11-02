# RapidCare Frontend

Emergency Care, Delivered Fast. A modern, responsive web application for emergency medical resource booking built with Next.js 14, TypeScript, and Tailwind CSS.

## Features

- **Real-time Hospital Search**: Find hospitals with available beds, ICUs, and operation theatres
- **Resource Booking**: Book hospital resources with detailed patient information
- **Rapid Collection**: Home sample collection service for medical tests (no registration required)
- **Blood Donation Network**: Request and manage blood donations
- **User Dashboard**: Track bookings and blood requests
- **Responsive Design**: Mobile-first design for emergency situations
- **Modern UI**: Clean interface using shadcn/ui components

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Backend API running (see backend README)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Home page
│   ├── hospitals/         # Hospital listing and search
│   ├── booking/           # Resource booking form
│   ├── donate-blood/      # Blood donation requests
│   ├── rapid-collection/  # Sample collection service
│   └── dashboard/         # User dashboard
├── components/            # Reusable components
│   ├── ui/               # shadcn/ui components
│   └── Navigation.tsx    # Main navigation
├── lib/                  # Utilities and configurations
│   ├── api.ts           # API service functions
│   ├── types.ts         # TypeScript type definitions
│   └── utils.ts         # Utility functions
└── styles/              # Global styles
```

## Pages

### Home Page (`/`)
- Hero section with call-to-action
- Feature highlights
- Statistics and testimonials
- Footer with links

### Hospitals (`/hospitals`)
- Search and filter hospitals
- View resource availability
- Hospital details and ratings
- Quick booking actions

### Booking (`/booking`)
- Comprehensive booking form
- Hospital and resource selection
- Patient information
- Payment calculation
- Form validation

### Blood Donation (`/donate-blood`)
- Blood request creation
- View existing requests
- Donor matching system
- Urgency levels

### Rapid Collection (`/rapid-collection`)
- Home sample collection requests
- 3-step workflow (Hospital → Tests → Details)
- Pricing calculation for selected tests
- Accessible without user registration
- Agent assignment and contact information

### Dashboard (`/dashboard`)
- User statistics
- Booking history
- Blood request management
- Quick actions

## API Integration

The frontend communicates with the backend API through the `api.ts` service file:

- **Hospital API**: Search, filter, and get hospital details
- **Booking API**: Create and manage resource bookings
- **Blood API**: Handle blood donation requests
- **Sample Collection API**: Manage home sample collection requests

## Styling

The application uses Tailwind CSS with a custom design system:

- **Colors**: Blue primary theme with semantic colors
- **Typography**: Inter font family
- **Components**: shadcn/ui for consistent design
- **Responsive**: Mobile-first approach

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Adding New Components

1. Use shadcn/ui for new UI components:
   ```bash
   npx shadcn@latest add [component-name]
   ```

2. Create custom components in `src/components/`

### Environment Variables

- `NEXT_PUBLIC_API_URL` - Backend API URL

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, email support@rapidcare.com or create an issue in the repository.
