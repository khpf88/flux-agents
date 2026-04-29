import { z } from 'zod';

// Regex for international phone numbers:
// Starts with optional +, followed by 8 to 15 digits
const phoneRegex = /^\+?[0-9]{8,15}$/;

export const LeadSchema = z.object({
  name: z.string()
    .min(2, "Name must be at least 2 characters")
    .trim(),
  email: z.string()
    .email("Please enter a valid email address")
    .trim(),
  phone: z.string()
    .regex(phoneRegex, "Phone must be at least 8 digits (e.g., +6512345678)")
    .trim(),
  message: z.string()
    .min(5, "Message must be at least 5 characters")
    .trim()
});

export const AgentDecisionSchema = z.object({
  tool: z.string(),
  parameters: z.object({
    phone: z.string().optional(),
    message: z.string()
  })
});
