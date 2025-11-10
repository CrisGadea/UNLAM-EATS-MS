import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import path from 'path';

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('=> Deleting all payments...');
    await prisma.payment.deleteMany({});
    console.log('=> Payments table cleared.');
  } catch (err) {
    console.error('Error deleting payments:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }

  const root = path.resolve(__dirname, '..');

  const tryCmd = (cmd: string) => {
    try {
      console.log(`=> Running: ${cmd}`);
      execSync(cmd, { stdio: 'inherit', cwd: root });
      return true;
    } catch (err) {
      console.warn(`=> Command failed: ${cmd}`, err);
      return false;
    }
  };

  if (!tryCmd('npm run seed')) {
    if (!tryCmd('npx prisma db seed')) {
      if (!tryCmd('node prisma/seed.js')) {
        console.error(
          'No seed executed. Crea un script "seed" en package.json o ajusta el comando en este archivo.',
        );
        process.exit(1);
      }
    }
  }

  console.log('=> Reset + seed finished.');
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
