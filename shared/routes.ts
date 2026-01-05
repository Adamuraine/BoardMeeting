import { z } from 'zod';
import { insertProfileSchema, insertSwipeSchema, insertTripSchema, insertPostSchema, insertMessageSchema, profiles, locations, trips, surfReports, posts, messages, type InsertTrip } from './schema';

export { insertProfileSchema, insertSwipeSchema, insertTripSchema, insertPostSchema, profiles, locations, trips, surfReports, posts };
export type CreateTripRequest = InsertTrip;

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  posts: {
    list: {
      method: 'GET' as const,
      path: '/api/posts',
      responses: {
        200: z.array(z.custom<typeof posts.$inferSelect & { user: typeof profiles.$inferSelect, location: typeof locations.$inferSelect }>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/posts',
      input: insertPostSchema,
      responses: {
        201: z.custom<typeof posts.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    byLocation: {
      method: 'GET' as const,
      path: '/api/locations/:id/posts',
      responses: {
        200: z.array(z.custom<typeof posts.$inferSelect & { user: typeof profiles.$inferSelect }>()),
      },
    },
  },
  profiles: {
    me: {
      method: 'GET' as const,
      path: '/api/profiles/me',
      responses: {
        200: z.custom<typeof profiles.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/profiles/me',
      input: insertProfileSchema.partial(),
      responses: {
        200: z.custom<typeof profiles.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    list: { // For swiping
      method: 'GET' as const,
      path: '/api/profiles',
      responses: {
        200: z.array(z.custom<typeof profiles.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/profiles/:id',
      responses: {
        200: z.custom<typeof profiles.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  swipes: {
    create: {
      method: 'POST' as const,
      path: '/api/swipes',
      input: z.object({ swipedId: z.string(), direction: z.enum(['left', 'right']) }),
      responses: {
        201: z.object({ match: z.boolean() }),
        400: errorSchemas.validation,
        403: z.object({ message: z.string(), code: z.literal('LIMIT_REACHED') }),
      },
    },
  },
  locations: {
    list: {
      method: 'GET' as const,
      path: '/api/locations',
      responses: {
        200: z.array(z.custom<typeof locations.$inferSelect & { reports: typeof surfReports.$inferSelect[] }>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/locations/:id',
      responses: {
        200: z.custom<typeof locations.$inferSelect & { reports: typeof surfReports.$inferSelect[] }>(),
        404: errorSchemas.notFound,
      },
    },
  },
  trips: {
    list: {
      method: 'GET' as const,
      path: '/api/trips',
      responses: {
        200: z.array(z.custom<typeof trips.$inferSelect & { organizer: typeof profiles.$inferSelect }>()),
      },
    },
    byUser: {
      method: 'GET' as const,
      path: '/api/trips/user/:userId',
      responses: {
        200: z.array(z.custom<typeof trips.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/trips',
      input: insertTripSchema,
      responses: {
        201: z.custom<typeof trips.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  premium: {
    upgrade: {
      method: 'POST' as const,
      path: '/api/premium/upgrade',
      responses: {
        200: z.object({ success: z.boolean() }),
      },
    },
  },
  messages: {
    conversations: {
      method: 'GET' as const,
      path: '/api/messages/conversations',
      responses: {
        200: z.array(z.object({
          buddy: z.custom<typeof profiles.$inferSelect>(),
          lastMessage: z.custom<typeof messages.$inferSelect>(),
          unreadCount: z.number(),
        })),
      },
    },
    thread: {
      method: 'GET' as const,
      path: '/api/messages/:buddyId',
      responses: {
        200: z.array(z.custom<typeof messages.$inferSelect>()),
      },
    },
    send: {
      method: 'POST' as const,
      path: '/api/messages',
      input: insertMessageSchema,
      responses: {
        201: z.custom<typeof messages.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    markRead: {
      method: 'POST' as const,
      path: '/api/messages/:buddyId/read',
      responses: {
        200: z.object({ success: z.boolean() }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
