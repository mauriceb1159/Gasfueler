'use server';

import { z } from 'zod';

import { db } from '@/lib/db/drizzle';
import { validatedAction } from '@/lib/auth/middleware';
import { contactInquiries, type NewContactInquiry } from '@/lib/db/schema';

const contactSchema = z.object({
  name: z.string().min(2, 'Name is required').max(100),
  email: z.string().email('Enter a valid email address'),
  company: z.string().max(120).optional(),
  inquiryType: z.enum(['consumer', 'partner', 'fleet']),
  message: z.string().min(20, 'Please include a little more detail').max(2000)
});

export const submitContactInquiry = validatedAction(
  contactSchema,
  async (data) => {
    const inquiry: NewContactInquiry = {
      name: data.name,
      email: data.email,
      company: data.company || null,
      inquiryType: data.inquiryType,
      message: data.message
    };

    await db.insert(contactInquiries).values(inquiry);

    return {
      success:
        'Thanks, your inquiry has been received. We will follow up through email.'
    };
  }
);
