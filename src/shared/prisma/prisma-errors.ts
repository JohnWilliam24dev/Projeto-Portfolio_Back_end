import { Prisma } from './prisma-client';

export function isPrismaError(error: unknown, code: 'P2002' | 'P2003' | 'P2025'): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}
