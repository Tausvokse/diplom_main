import { z } from 'zod';

const kaiEmailRegex = /^[a-zA-Z0-9._%+-]+@(stud\.kai\.edu\.ua|npp\.kai\.edu\.ua)$/;
const emailError = "Email повинен бути корпоративним (@stud.kai.edu.ua або @npp.kai.edu.ua)";

export const sendVerificationCodeSchema = z.object({
  body: z.object({
    email: z.string().email().regex(kaiEmailRegex, emailError),
  })
});

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email().regex(kaiEmailRegex, emailError),
    password: z.string().min(1),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().min(1),
    studentIdNumber: z.string().min(1),
    course: z.number().min(1).max(6),
    faculty: z.string().min(1),
    gender: z.enum(['MALE', 'FEMALE']),
    verificationCode: z.string().length(6, "Код підтвердження має містити 6 символів")
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1)
  })
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1)
  })
});
