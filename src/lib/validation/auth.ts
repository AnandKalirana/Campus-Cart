import { z } from "zod";

const email = z.string().trim().toLowerCase().email("Enter a valid email address.").max(254);

// Length over composition rules (NIST 800-63B). Max protects the hasher from huge inputs.
export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(128, "Use at most 128 characters.");

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your name.").max(80),
    email,
    password: passwordSchema,
    universityId: z.string().min(1, "Choose your campus.").max(40),
  })
  .refine(v => v.password.toLowerCase() !== v.email, { path: ["password"], message: "Password can't be your email." });

export const loginSchema = z.object({ email, password: z.string().min(1).max(128) });
export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z.object({ token: z.string().min(20).max(200), password: passwordSchema });
export const tokenSchema = z.object({ token: z.string().min(20).max(200) });

export type RegisterInput = z.infer<typeof registerSchema>;
