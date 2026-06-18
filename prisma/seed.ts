/**
 * RocketCash seed.
 *
 * Real data comes from Plaid (link a bank, then sync). There's nothing to
 * pre-populate for a fresh install, so this is intentionally a no-op that
 * simply verifies the database connection.
 */
import { prisma } from "../src/lib/db";

async function main() {
  const users = await prisma.user.count();
  console.log(`Database reachable. Current user count: ${users}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
