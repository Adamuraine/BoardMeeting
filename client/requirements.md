## Packages
framer-motion | Essential for Tinder-style swipe animations and smooth page transitions
lucide-react | Beautiful icons for navigation and UI elements
date-fns | Formatting dates for surf reports and trips
clsx | Utility for conditional class names
tailwind-merge | Utility for merging tailwind classes

## Notes
Tailwind Config - extend fontFamily:
fontFamily: {
  display: ["'Outfit'", "sans-serif"],
  body: ["'DM Sans'", "sans-serif"],
}

Integration assumptions:
- Auth uses /api/auth/user and /api/login endpoints
- Images are handled via URL strings (unsplash for demo, user uploads later)
- Maps and complex charts are simplified for MVP
