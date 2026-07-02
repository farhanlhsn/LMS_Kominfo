const { PrismaClient } = require('../generated/client');

const prisma = new PrismaClient();

// Pre-computed bcrypt hash of 'Admin123' (12 rounds)
const HASH = '$2b$12$FCd9NthcjIk6YVPTIFnkveBh/3nj6Nc00zTPG8CUITfpZc0p1fSE2';

async function main() {
  console.log('Seeding database...');

  const regions = [
    { name: 'Aceh', slug: 'aceh', themeColor: '#E31E24', description: 'Wilayah Aceh' },
    { name: 'Medan', slug: 'medan', themeColor: '#0047BA', description: 'Wilayah Medan' },
    { name: 'Lampung', slug: 'lampung', themeColor: '#009944', description: 'Wilayah Lampung' },
    { name: 'Bengkulu', slug: 'bengkulu', themeColor: '#FF8C00', description: 'Wilayah Bengkulu' },
  ];

  for (const region of regions) {
    await prisma.region.upsert({ where: { slug: region.slug }, update: {}, create: region });
  }
  console.log('Regions seeded');

  const aceh = await prisma.region.findUnique({ where: { slug: 'aceh' } });

  const users = [
    { name: 'Super Admin', email: 'admin@lms.go.id', role: 'SUPER_ADMIN' },
    { name: 'Instructor', email: 'instructor@lms.go.id', role: 'INSTRUCTOR' },
    { name: 'Student', email: 'student@lms.go.id', role: 'STUDENT' },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { name: u.name, email: u.email, passwordHash: HASH, role: u.role, regionId: aceh.id },
    });
  }
  console.log('Users seeded');
  console.log('');
  console.log('Test accounts (pw: Admin123):');
  console.log('  admin@lms.go.id      - SUPER_ADMIN');
  console.log('  instructor@lms.go.id - INSTRUCTOR');
  console.log('  student@lms.go.id    - STUDENT');
}

main().catch(console.error).finally(() => prisma.$disconnect());
