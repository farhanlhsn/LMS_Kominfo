import { PrismaClient, Difficulty, CourseStatus, LessonType, QuestionType } from '../generated/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Regions
  const regions = [
    { name: 'Aceh', slug: 'aceh', themeColor: '#E31E24', description: 'Wilayah Aceh' },
    { name: 'Medan', slug: 'medan', themeColor: '#0047BA', description: 'Wilayah Medan' },
    { name: 'Lampung', slug: 'lampung', themeColor: '#009944', description: 'Wilayah Lampung' },
    { name: 'Bengkulu', slug: 'bengkulu', themeColor: '#FF8C00', description: 'Wilayah Bengkulu' },
  ];

  for (const region of regions) {
    await prisma.region.upsert({
      where: { slug: region.slug },
      update: {},
      create: region,
    });
  }
  console.log('Regions seeded');

  const acehRegion = await prisma.region.findUnique({ where: { slug: 'aceh' } });
  if (!acehRegion) throw new Error('Aceh region not found');

  const passwordHash = await bcrypt.hash('Admin123', 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@lms.go.id' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@lms.go.id',
      passwordHash,
      role: 'SUPER_ADMIN',
      regionId: acehRegion.id,
    },
  });

  const instructor = await prisma.user.upsert({
    where: { email: 'instructor@lms.go.id' },
    update: {},
    create: {
      name: 'Instructor',
      email: 'instructor@lms.go.id',
      passwordHash,
      role: 'INSTRUCTOR',
      regionId: acehRegion.id,
    },
  });

  const student = await prisma.user.upsert({
    where: { email: 'student@lms.go.id' },
    update: {},
    create: {
      name: 'Student',
      email: 'student@lms.go.id',
      passwordHash,
      role: 'STUDENT',
      regionId: acehRegion.id,
    },
  });
  console.log('Users seeded');

  // Seed Course
  const course = await prisma.course.upsert({
    where: { slug: 'pengenalan-ai-untuk-pemula' },
    update: {},
    create: {
      title: 'Pengenalan AI untuk Pemula',
      slug: 'pengenalan-ai-untuk-pemula',
      shortDescription: 'Pelajari dasar-dasar Kecerdasan Buatan dan aplikasinya dalam kehidupan sehari-hari.',
      description: 'Kursus ini dirancang untuk pemula yang ingin memahami apa itu Kecerdasan Buatan (AI), sejarahnya, konsep dasar seperti Machine Learning, dan bagaimana AI digunakan saat ini.',
      instructorId: instructor.id,
      regionId: acehRegion.id,
      difficulty: Difficulty.beginner,
      estimatedDuration: 120, // 120 minutes
      category: 'Teknologi',
      tags: ['AI', 'Machine Learning', 'Pemula'],
      status: CourseStatus.PUBLISHED,
      publishedAt: new Date(),
    }
  });

  // Seed Module
  const module1 = await prisma.module.upsert({
    where: { courseId_order: { courseId: course.id, order: 1 } },
    update: {},
    create: {
      courseId: course.id,
      title: 'Modul 1: Konsep Dasar AI',
      description: 'Pengantar ke dunia Kecerdasan Buatan.',
      order: 1,
      isPublished: true,
      estimatedDuration: 60,
    }
  });

  // Seed Lessons
  // 1. Text Lesson
  const textLesson = await prisma.lesson.upsert({
    where: { moduleId_order: { moduleId: module1.id, order: 1 } },
    update: {},
    create: {
      moduleId: module1.id,
      title: '1. Apa itu AI?',
      order: 1,
      type: LessonType.TEXT,
      duration: 15,
      isPublished: true,
      content: {
        create: {
          markdown: '# Apa itu Kecerdasan Buatan?\n\nKecerdasan Buatan (AI) adalah simulasi kecerdasan manusia yang dimodelkan di dalam mesin dan diprogram agar bisa berpikir seperti halnya manusia.',
          html: '<h1>Apa itu Kecerdasan Buatan?</h1><p>Kecerdasan Buatan (AI) adalah simulasi kecerdasan manusia yang dimodelkan di dalam mesin dan diprogram agar bisa berpikir seperti halnya manusia.</p>',
        }
      }
    }
  });

  // 2. Video Lesson
  const videoLesson = await prisma.lesson.upsert({
    where: { moduleId_order: { moduleId: module1.id, order: 2 } },
    update: {},
    create: {
      moduleId: module1.id,
      title: '2. Sejarah AI',
      order: 2,
      type: LessonType.VIDEO,
      duration: 20,
      isPublished: true,
      content: {
        create: {
          youtubeUrl: 'https://www.youtube.com/watch?v=ad79nYk2keg',
        }
      }
    }
  });

  // 3. Quiz Lesson
  const quizLesson = await prisma.lesson.upsert({
    where: { moduleId_order: { moduleId: module1.id, order: 3 } },
    update: {},
    create: {
      moduleId: module1.id,
      title: '3. Kuis Modul 1',
      order: 3,
      type: LessonType.QUIZ,
      duration: 10,
      isPublished: true,
    }
  });

  // Create Quiz for the lesson
  const quiz = await prisma.quiz.upsert({
    where: { lessonId: quizLesson.id },
    update: {},
    create: {
      lessonId: quizLesson.id,
      title: 'Kuis Pemahaman Modul 1',
      passingScore: 70,
      durationMinutes: 10,
      questions: {
        create: [
          {
            question: 'Apa kepanjangan dari AI?',
            type: QuestionType.MULTIPLE_CHOICE,
            score: 50,
            order: 1,
            choices: {
              create: [
                { label: 'A', value: 'Artificial Intelligence', isCorrect: true },
                { label: 'B', value: 'Artistic Intellect', isCorrect: false },
                { label: 'C', value: 'Automated Intelligence', isCorrect: false },
                { label: 'D', value: 'Automated Intellect', isCorrect: false },
              ]
            }
          },
          {
            question: 'Manakah dari berikut ini yang merupakan contoh penerapan AI dalam kehidupan sehari-hari?',
            type: QuestionType.MULTIPLE_CHOICE,
            score: 50,
            order: 2,
            choices: {
              create: [
                { label: 'A', value: 'Mesin Ketik', isCorrect: false },
                { label: 'B', value: 'Sistem Rekomendasi Film di Netflix', isCorrect: true },
                { label: 'C', value: 'Buku Cetak', isCorrect: false },
                { label: 'D', value: 'Sepeda Onthel', isCorrect: false },
              ]
            }
          }
        ]
      }
    }
  });

  // 4. Assignment Lesson
  const assignmentLesson = await prisma.lesson.upsert({
    where: { moduleId_order: { moduleId: module1.id, order: 4 } },
    update: {},
    create: {
      moduleId: module1.id,
      title: '4. Tugas: Ide Penerapan AI',
      order: 4,
      type: LessonType.ASSIGNMENT,
      duration: 15,
      isPublished: true,
    }
  });

  const assignment = await prisma.assignment.upsert({
    where: { lessonId: assignmentLesson.id },
    update: {},
    create: {
      lessonId: assignmentLesson.id,
      title: 'Ide Penerapan AI di Sektor Publik',
      instruction: 'Tuliskan satu ide bagaimana AI dapat digunakan untuk meningkatkan pelayanan publik di daerah Anda. Kumpulkan dalam format PDF.',
      maxScore: 100,
      allowedExtensions: ['pdf'],
    }
  });

  // Update course totals
  await prisma.course.update({
    where: { id: course.id },
    data: {
      totalModules: 1,
      totalLessons: 4,
    }
  });
  console.log('Courses, Modules, Lessons, Quizzes, and Assignments seeded');

  console.log('');
  console.log('Test accounts (password: Admin123):');
  console.log('  admin@lms.go.id      - SUPER_ADMIN');
  console.log('  instructor@lms.go.id - INSTRUCTOR');
  console.log('  student@lms.go.id    - STUDENT');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
