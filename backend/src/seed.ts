import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Admin
  const adminEmail = 'admin@cinematic.com';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  let adminId = '';
  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    const admin = await prisma.user.create({
      data: {
        name: 'المشرف السينمائي (Admin)',
        email: adminEmail,
        password: hashedPassword,
        role: 'ADMIN',
      },
    });
    adminId = admin.id;
    console.log('Admin seeded: admin@cinematic.com / admin123');
  } else {
    adminId = existingAdmin.id;
    console.log('Admin already exists');
  }

  // 2. Create Student
  const studentEmail = 'student@cinematic.com';
  const existingStudent = await prisma.user.findUnique({ where: { email: studentEmail } });
  if (!existingStudent) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('student123', salt);
    await prisma.user.create({
      data: {
        name: 'طالب تجريبي (Student)',
        email: studentEmail,
        password: hashedPassword,
        role: 'STUDENT',
      },
    });
    console.log('Student seeded: student@cinematic.com / student123');
  }

  // 3. Create Categories
  const categoriesData = [
    { name: 'تطوير الويب ثلاثي الأبعاد (3D Web)', slug: '3d-web-development' },
    { name: 'التصميم الإبداعي (Creative Design)', slug: 'creative-design' },
    { name: 'موسيقى وصوتيات (Cinematic Audio)', slug: 'cinematic-audio' }
  ];

  const categories = [];
  for (const cat of categoriesData) {
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat
    });
    categories.push(category);
  }
  console.log('Categories seeded:', categories.length);

  // 4. Create Courses & Lessons
  // Course 1
  const course1 = await prisma.course.create({
    data: {
      title: 'تطوير المواقع ثلاثية الأبعاد بـ Three.js & React Fiber',
      description: 'تعلم كيفية بناء واجهات الويب السينمائية ثلاثية الأبعاد، واستخدام المظللات (Shaders)، وجزيئات الإضاءة (Particles)، وتحريك الكاميرا استجابةً للتمرير (GSAP ScrollTrigger). الكورس يأخذك من الصفر وحتى مستوى الاحتراف لتصميم مواقع مذهلة تثير إعجاب الزوار.',
      price: 49.99,
      thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1964&auto=format&fit=crop',
      categoryId: categories[0].id,
      instructorId: adminId,
      lessons: {
        create: [
          {
            title: 'المقدمة وتهيئة بيئة العمل ثلاثية الأبعاد',
            content: 'مرحباً بك في الكورس. في هذا الدرس سنتعرف على بنية الـ WebGL وكيف تعمل محركات الرسم في المتصفح، وسنقوم بتهيئة مشروع Vite جديد مع إضافة مكتبة Three.js و TypeScript.',
            videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
            duration: 600,
            order: 1
          },
          {
            title: 'إضافة الإضاءة والظلال التفاعلية (Lights & Shadows)',
            content: 'سنتعلم في هذا الدرس كيفية محاكاة إضاءة واقعية داخل المشهد ثلاثي الأبعاد باستخدام AmbientLight و PointLight والتحكم بكثافة الظلال للحصول على مظهر سينمائي فاخر.',
            videoUrl: 'https://www.w3schools.com/html/movie.mp4',
            duration: 900,
            order: 2
          },
          {
            title: 'تحريك الكاميرا والمجسمات باستخدام GSAP ScrollTrigger',
            content: 'تكامل رائع بين الرندر ثلاثي الأبعاد ومكتبة التحريك الاحترافية GSAP. سنتعلم تحريك زاوية الكاميرا بناءً على تصفح المستخدم وموقعه في الصفحة لخلق تجربة سرد بصرية مميزة.',
            videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
            duration: 1200,
            order: 3
          }
        ]
      }
    }
  });

  // Course 2
  const course2 = await prisma.course.create({
    data: {
      title: 'ماستر كلاس التصميم السينمائي وتجربة المستخدم (UI/UX)',
      description: 'انقل مهاراتك في التصميم الرقمي إلى مستوى آخر تماماً. سنتعلم المبادئ التي تجعل واجهة الويب تبدو مثل منتجات Apple الفاخرة: تدرجات النيون المتوهجة، تأثيرات الزجاج (Glassmorphism)، الخطوط الأنيقة، والتفاعلات الدقيقة (Micro-interactions).',
      price: 29.99,
      thumbnail: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=1935&auto=format&fit=crop',
      categoryId: categories[1].id,
      instructorId: adminId,
      lessons: {
        create: [
          {
            title: 'فلسفة التصميم الفاخر والتصميم التفاعلي',
            content: 'ما الذي يجعل التصميم يبدو فاخراً وثميناً؟ سنتطرق إلى مفهوم المساحة السلبية (Negative Space)، والتناغم اللوني، وتطبيق تأثيرات الزجاج الغامض في CSS.',
            videoUrl: 'https://www.w3schools.com/html/movie.mp4',
            duration: 450,
            order: 1
          },
          {
            title: 'تطبيق تأثيرات الزجاج والتدرجات اللونية النيونية',
            content: 'في هذا الدرس، سنقوم بكتابة كود CSS مخصص لتأثيرات Glassmorphism باستخدام backdrop-filter، وننشئ تدرجات نيونية متوهجة متحركة تعطي طابعاً مستقبلياً.',
            videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
            duration: 720,
            order: 2
          }
        ]
      }
    }
  });

  console.log('Courses and lessons seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
