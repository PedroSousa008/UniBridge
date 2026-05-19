import { prisma } from '../src/lib/db';

async function main() {
  await prisma.platformConfig.upsert({
    where: { id: 'platform' },
    update: {},
    create: { id: 'platform', ownerSlotTaken: false },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
