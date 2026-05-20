import { Prisma } from '@prisma/client';

/** True when the DB schema is behind the Prisma client (missing table/column/enum). */
export function isPrismaSchemaMismatchError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return ['P2021', 'P2022', 'P2010'].includes(error.code);
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('does not exist') ||
      msg.includes('studentweeklyclass') ||
      msg.includes('subjectscheduleslot') ||
      msg.includes('companyevent') ||
      msg.includes('studentcalendarevent')
    );
  }
  return false;
}
