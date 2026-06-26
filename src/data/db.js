import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Setup environment loading manually
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      if (key && !key.startsWith('#')) {
        process.env[key] = val;
      }
    }
  });
}

import User from '../models/User.js';
import Course from '../models/Course.js';
import Transaction from '../models/Transaction.js';
import Coupon from '../models/Coupon.js';
import Enrollment from '../models/Enrollment.js';

// MongoDB connection URI resolver
export const getMongoDBURI = () => {
  let uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexus';
  if (process.env.NODE_ENV === 'test') {
    if (uri.includes('?')) {
      const parts = uri.split('?');
      const url = parts[0];
      const query = parts[1];
      if (url.endsWith('/')) {
        return url + 'nexus_test?' + query;
      } else {
        const lastSlashIdx = url.lastIndexOf('/');
        return url.substring(0, lastSlashIdx + 1) + 'nexus_test?' + query;
      }
    } else {
      if (uri.endsWith('/')) {
        return uri + 'nexus_test';
      } else {
        const lastSlashIdx = uri.lastIndexOf('/');
        return uri.substring(0, lastSlashIdx + 1) + 'nexus_test';
      }
    }
  } else {
    if (uri.endsWith('/')) {
      return uri + 'nexus';
    }
  }
  return uri;
};

const generateCurriculumForCourse = (courseName) => {
  return [
    {
      type: "topic",
      title: `1. Welcome & Introduction to ${courseName}`,
      children: [
        {
          type: "lecture",
          title: `1.1 Syllabus Walkthrough & Key Milestones`,
          videoUrl: "https://res.cloudinary.com/dk6nbaps1/video/upload/v1782451962/output_144p_mw4twn.mp4",
          duration: "5:00",
          description: `An overview of what we will build and learn in the ${courseName} course.`,
          notes: "Welcome! Take a moment to read the prerequisites and download the course resource guide."
        },
        {
          type: "lecture",
          title: `1.2 Workspace Configuration & Dev Environment`,
          videoUrl: "https://res.cloudinary.com/dk6nbaps1/video/upload/v1782451962/output_144p_mw4twn.mp4",
          duration: "6:30",
          description: "Step-by-step setup guide for compiler/interpreter tools and local environment.",
          notes: "Ensure your dependencies are fully installed before starting the first project."
        }
      ]
    },
    {
      type: "topic",
      title: `2. Foundations & Core Concepts`,
      children: [
        {
          type: "lecture",
          title: `2.1 Essential Fundamentals Deep Dive`,
          videoUrl: "https://res.cloudinary.com/dk6nbaps1/video/upload/v1782451962/output_144p_mw4twn.mp4",
          duration: "8:15",
          description: "In-depth understanding of standard APIs, design patterns, and vocabulary.",
          notes: "Review the vocabulary cheat sheet attached in the course slides."
        },
        {
          type: "lecture",
          title: `2.2 Workshop: Developing Your First Model Project`,
          videoUrl: "https://res.cloudinary.com/dk6nbaps1/video/upload/v1782451962/output_144p_mw4twn.mp4",
          duration: "7:45",
          description: "Build, debug, and submit your first project for automated scoring.",
          notes: "Push your code to Git. A feedback summary will be generated within 10 minutes."
        }
      ]
    }
  ];
};

const seedDB = async () => {
  const isTest = process.env.NODE_ENV === 'test';

  // 1. Seed Users
  const userCount = await User.countDocuments();
  if (isTest || userCount < 10) {
    console.log('Seeding users database (50+ users)...');
    await User.deleteMany({});
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password', salt);
    
    // Core Mock Users
    const coreUsers = [
      {
        _id: new mongoose.Types.ObjectId('60d5ec4b1a4574a2dc907101'),
        name: 'Ava Admin',
        email: 'admin@nexus.dev',
        password: hashedPassword,
        role: 'admin',
        joinedDate: new Date('2026-04-29T10:00:00Z'),
        purchasedCourseIds: [],
        status: 'Active',
        avatar: '',
        phone: '9999999999'
      },
      {
        _id: new mongoose.Types.ObjectId('60d5ec4b1a4574a2dc907102'),
        name: 'Sam Instructor',
        email: 'instructor@nexus.dev',
        password: hashedPassword,
        role: 'instructor',
        joinedDate: new Date('2026-05-18T10:00:00Z'),
        purchasedCourseIds: [],
        status: 'Active',
        avatar: '',
        phone: '9876543210'
      },
      {
        _id: new mongoose.Types.ObjectId('60d5ec4b1a4574a2dc907103'),
        name: 'Sam Rivera',
        email: 'student@nexus.dev',
        password: hashedPassword,
        role: 'student',
        joinedDate: new Date('2026-04-12T10:00:00Z'),
        purchasedCourseIds: [],
        status: 'Active',
        avatar: '',
        phone: '9876543210'
      },
      {
        _id: new mongoose.Types.ObjectId('60d5ec4b1a4574a2dc907104'),
        name: 'Maya Chen',
        email: 'maya@nexus.dev',
        password: hashedPassword,
        role: 'student',
        joinedDate: new Date('2026-06-02T10:00:00Z'),
        purchasedCourseIds: [],
        status: 'Active',
        avatar: '',
        phone: '9765432109'
      },
      {
        _id: new mongoose.Types.ObjectId('60d5ec4b1a4574a2dc907105'),
        name: 'Jon Bell',
        email: 'jon@studio.io',
        password: hashedPassword,
        role: 'instructor',
        joinedDate: new Date('2026-05-18T10:00:00Z'),
        purchasedCourseIds: [],
        status: 'Active',
        avatar: '',
        phone: '9654321098'
      },
      {
        _id: new mongoose.Types.ObjectId('60d5ec4b1a4574a2dc907106'),
        name: 'Priya Nair',
        email: 'priya@edulab.co',
        password: hashedPassword,
        role: 'admin',
        joinedDate: new Date('2026-04-29T10:00:00Z'),
        purchasedCourseIds: [],
        status: 'Active',
        avatar: '',
        phone: '9543210987'
      }
    ];

    await User.insertMany(coreUsers);

    if (!isTest) {
      // Generate 45 more users to hit 51 total
      const firstNames = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy", "Daniel", "Lisa", "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley", "Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle", "Kenneth", "Dorothy", "Kevin", "Carol", "Brian", "Amanda", "George", "Melissa", "Edward"];
      const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson"];

      const seedUsers = [];
      for (let i = 0; i < 45; i++) {
        const fn = firstNames[i % firstNames.length];
        const ln = lastNames[i % lastNames.length];
        const name = `${fn} ${ln}`;
        const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@nexus.dev`;
        const role = i < 5 ? 'instructor' : 'student';
        
        seedUsers.push({
          name,
          email,
          password: hashedPassword,
          role,
          joinedDate: new Date(Date.now() - (i * 3 * 24 * 60 * 60 * 1000)), // dynamic older joined dates
          purchasedCourseIds: [],
          status: 'Active',
          avatar: '',
          phone: `+1 555-01${10 + i}`
        });
      }

      await User.insertMany(seedUsers);
    }
  }

  // 2. Seed Courses
  const courseCount = await Course.countDocuments();
  if (isTest || courseCount < 5) {
    console.log('Seeding courses database (25 courses)...');
    await Course.deleteMany({});

    const instructors = await User.find({ role: 'instructor' });
    const instructorIds = instructors.map(i => i._id);

    const baseCoursesData = [
      {
        _id: new mongoose.Types.ObjectId('60d5ec4b1a4574a2dc907201'),
        name: "Advanced React Systems",
        price: 129,
        status: "Published",
        gradient: "from-purple-500 to-blue-500",
        description: "Master React server components, concurrent rendering, state management at scale, and high-performance design patterns.",
        category: 'Web Development',
        duration: 40,
        level: 'Advanced'
      },
      {
        _id: new mongoose.Types.ObjectId('60d5ec4b1a4574a2dc907202'),
        name: "UX Research for SaaS",
        price: 89,
        status: "Published",
        gradient: "from-orange-500 to-yellow-500",
        description: "Learn user interview frameworks, usability testing protocols, and SaaS user onboarding optimization strategies.",
        category: 'Design',
        duration: 25,
        level: 'Intermediate'
      },
      {
        _id: new mongoose.Types.ObjectId('60d5ec4b1a4574a2dc907203'),
        name: "Payment Ops 101",
        price: 149,
        status: "Draft",
        gradient: "from-emerald-500 to-blue-500",
        description: "A complete guide to multi-gateway routing, ledger reconciliation, subscription billing logic, and payout compliance.",
        category: 'Web Development',
        duration: 18,
        level: 'Beginner'
      },
      {
        _id: new mongoose.Types.ObjectId('60d5ec4b1a4574a2dc907204'),
        name: "AI Course Creation",
        price: 199,
        status: "Review",
        gradient: "from-fuchsia-500 to-purple-700",
        description: "Leverage generative AI to script, outline, record, and market high-converting professional online courses.",
        category: 'Web Development',
        duration: 12,
        level: 'Beginner'
      }
    ];

    // 21 Additional Courses to reach 25 (only in non-test mode)
    if (!isTest) {
      baseCoursesData.push(
      { name: "Next.js Architecture at Scale", price: 159, status: "Published", gradient: "from-blue-600 to-indigo-800", description: "Design multi-zone builds, edge rendering rules, middleware filters, and database adapters for production scale.", category: "Web Development", duration: 32, level: "Advanced" },
      { name: "Introduction to Python Programming", price: 79, status: "Published", gradient: "from-teal-400 to-emerald-600", description: "Learn variables, loops, objects, file handling, unit testing, and popular packages like Pandas and NumPy.", category: "Web Development", duration: 20, level: "Beginner" },
      { name: "Full-Stack Web Development Boot Camp", price: 299, status: "Published", gradient: "from-pink-500 to-rose-600", description: "From HTML/CSS basics to MERN stack database APIs, security setups, deployment configs, and testing pipelines.", category: "Web Development", duration: 80, level: "Beginner" },
      { name: "Design Systems with Figma", price: 99, status: "Published", gradient: "from-purple-600 to-pink-500", description: "Master components, auto layouts, typography scales, spacing grids, token styles, and component documentation.", category: "Design", duration: 15, level: "Intermediate" },
      { name: "Mastering TypeScript & ES6+", price: 119, status: "Published", gradient: "from-cyan-500 to-blue-600", description: "Deep-dive into generic systems, interface patterns, decorators, module systems, bundling setups, and type safety.", category: "Web Development", duration: 22, level: "Advanced" },
      { name: "Kubernetes & Docker for DevOps", price: 179, status: "Published", gradient: "from-blue-500 to-cyan-700", description: "Containerize apps, configure ingress routing, setup persistent volumes, configure replica sets, and monitor metrics.", category: "Web Development", duration: 28, level: "Advanced" },
      { name: "Machine Learning Pipelines", price: 249, status: "Published", gradient: "from-indigo-500 to-purple-800", description: "Feature engineering, automated parameter tuning, model deployments, and real-time monitoring workflows.", category: "Web Development", duration: 45, level: "Advanced" },
      { name: "iOS App Development with Swift", price: 199, status: "Published", gradient: "from-orange-600 to-red-600", description: "Build modern native iOS applications using Swift, SwiftUI, Combine framework, and local databases.", category: "Web Development", duration: 38, level: "Intermediate" },
      { name: "Android App Development with Kotlin", price: 199, status: "Published", gradient: "from-emerald-500 to-teal-700", description: "Master coroutines, Jetpack Compose UI libraries, repository pattern adapters, and play store delivery guidelines.", category: "Web Development", duration: 35, level: "Intermediate" },
      { name: "Product Management Foundations", price: 139, status: "Published", gradient: "from-violet-500 to-indigo-600", description: "Learn backlog grooming, stakeholder mapping, user stories, metrics tracking, and product launch protocols.", category: "Design", duration: 18, level: "Beginner" },
      { name: "Growth Marketing Strategies", price: 89, status: "Published", gradient: "from-sky-400 to-blue-600", description: "Master A/B testing channels, SEO optimizations, paid ad scripts, funnel analysis, and referral setups.", category: "Design", duration: 14, level: "Intermediate" },
      { name: "Cloud Native AWS Architectures", price: 219, status: "Published", gradient: "from-amber-500 to-orange-600", description: "Setup serverless lambda handlers, API Gateway routes, Cognito identity pools, DynamoDB indexes, and IAM policy filters.", category: "Web Development", duration: 30, level: "Advanced" },
      { name: "Cybersecurity Fundamentals", price: 149, status: "Published", gradient: "from-red-500 to-slate-800", description: "Learn pen-testing protocols, OAuth identity validation flow, SQL injection mitigations, and CORS configurations.", category: "Web Development", duration: 24, level: "Beginner" },
      { name: "Clean Code & Software Principles", price: 129, status: "Published", gradient: "from-stone-600 to-neutral-800", description: "Apply SOLID design rules, mock patterns, dependency injection containers, and clean module refactoring.", category: "Web Development", duration: 16, level: "Intermediate" },
      { name: "Relational Databases & SQL Masterclass", price: 89, status: "Published", gradient: "from-blue-800 to-cyan-900", description: "Learn database design normalize forms, multi-table index keys, transaction lock modes, and raw queries.", category: "Web Development", duration: 18, level: "Intermediate" },
      { name: "NoSQL Databases & MongoDB Deep Dive", price: 99, status: "Published", gradient: "from-green-600 to-emerald-800", description: "Master document schema design, aggregation pipelines, replica clusters, shards, and mongoose validators.", category: "Web Development", duration: 20, level: "Intermediate" },
      { name: "UI/UX Design Principles for Mobile Apps", price: 109, status: "Published", gradient: "from-fuchsia-600 to-pink-500", description: "Design mobile wireframes, accessibility layouts, micro-interactions, responsive sizing, and export settings.", category: "Design", duration: 16, level: "Intermediate" },
      { name: "GraphQL API Design & Implementation", price: 129, status: "Published", gradient: "from-pink-600 to-purple-800", description: "Construct GraphQL schemas, query/mutation resolvers, dataloader batching, and Apollo server gateways.", category: "Web Development", duration: 21, level: "Advanced" },
      { name: "Agile Project Management with Scrum", price: 79, status: "Published", gradient: "from-emerald-400 to-blue-500", description: "Run sprint plannings, standups, retrospective logs, burn-down charts, and velocity metric audits.", category: "Design", duration: 12, level: "Beginner" },
      { name: "Introduction to Rust Programming", price: 149, status: "Published", gradient: "from-orange-500 to-stone-700", description: "Master ownership and borrowing mechanics, trait systems, concurrency safety, and compile tooling.", category: "Web Development", duration: 25, level: "Advanced" },
      { name: "Web3 & Blockchain Development", price: 249, status: "Published", gradient: "from-indigo-600 to-purple-900", description: "Implement Solidity smart contracts, ERC-20 token contracts, gas optimizations, and ethers.js integrations.", category: "Web Development", duration: 34, level: "Advanced" }
      );
    }

    const coursesToInsert = baseCoursesData.map((c, idx) => {
      // Pick instructor circularly
      const instId = instructorIds[idx % instructorIds.length] || new mongoose.Types.ObjectId('60d5ec4b1a4574a2dc907102');
      return {
        ...c,
        instructors: [instId],
        enrollments: 0,
        rating: parseFloat((4.5 + Math.random() * 0.5).toFixed(1)),
        revenue: 0,
        curriculum: generateCurriculumForCourse(c.name),
        thumbnail: '',
        language: 'English'
      };
    });

    await Course.insertMany(coursesToInsert);
    console.log('Seeded courses successfully.');
  }

  // 3. Seed Coupons
  const couponCount = await Coupon.countDocuments();
  if (isTest || couponCount < 2) {
    console.log('Seeding coupons database...');
    await Coupon.deleteMany({});
    
    const courses = await Course.find();
    
    const sampleCoupons = [
      {
        code: "SUMMER30",
        discount: 30,
        type: "Percentage",
        maxUses: 2000,
        currentUses: 891,
        expiry: new Date('2026-07-31T23:59:59Z'),
        courseId: courses[0]._id,
        minimumAmount: 0
      },
      {
        code: "INSTRUCTOR50",
        discount: 50,
        type: "Fixed",
        maxUses: 500,
        currentUses: 128,
        expiry: new Date('2026-08-15T23:59:59Z'),
        minimumAmount: 0
      },
      {
        code: "WELCOME10",
        discount: 10,
        type: "Percentage",
        maxUses: 5000,
        currentUses: 4912,
        expiry: new Date('2026-12-31T23:59:59Z'),
        minimumAmount: 0
      },
      {
        code: "SPRING24",
        discount: 25,
        type: "Percentage",
        maxUses: 2100,
        currentUses: 2104,
        expiry: new Date('2026-03-01T23:59:59Z'),
        minimumAmount: 0
      }
    ];

    await Coupon.insertMany(sampleCoupons);
    console.log('Seeded coupons successfully.');
  }

  // 4. Seed Enrollments & Transactions
  const enrollmentCount = await Enrollment.countDocuments();
  const studentsWithNoEnrollments = await User.find({ role: 'student', purchasedCourseIds: { $size: 0 } });
  if (isTest || enrollmentCount < 10 || studentsWithNoEnrollments.length > 0) {
    console.log('Seeding enrollments & transactions databases...');
    await Enrollment.deleteMany({});
    await Transaction.deleteMany({});

    const students = await User.find({ role: 'student' });
    const courses = await Course.find({ status: 'Published' });

    // Reset course enrollment/revenue stats before accumulating
    for (const course of courses) {
      course.enrollments = 0;
      course.revenue = 0;
      await course.save();
    }

    for (let idx = 0; idx < students.length; idx++) {
      const student = students[idx];
      student.purchasedCourseIds = [];

      const c1 = courses[idx % courses.length];
      const c2 = courses[(idx + 3) % courses.length];

      let coursesToEnroll = [];
      if (c1) coursesToEnroll.push(c1);
      if (c2 && c1 && c2._id.toString() !== c1._id.toString()) {
        coursesToEnroll.push(c2);
      }

      for (const course of coursesToEnroll) {
        const progress = Math.floor(Math.random() * 101);
        const certStatus = progress === 100 ? 'Issued' : (progress > 85 ? 'Pending' : 'In progress');
        
        // Spread dates systematically but with minor random hourly offsets
        const daysAgo = idx * 2 + (idx % 2);
        const hourOffset = Math.floor(Math.random() * 24);
        const minuteOffset = Math.floor(Math.random() * 60);
        const recordDate = new Date(Date.now() - (daysAgo * 24 * 3600 * 1000) - (hourOffset * 3600 * 1000) - (minuteOffset * 60 * 1000));

        // Add to user
        student.purchasedCourseIds.push(course._id);
        
        // Add Enrollment
        await Enrollment.create({
          student: student._id,
          course: course._id,
          enrollmentDate: recordDate,
          progress,
          certificateStatus: certStatus,
          completed: progress === 100,
          lastAccessed: new Date()
        });

        // Add Transaction
        await Transaction.create({
          student: student._id,
          course: course._id,
          amount: course.price,
          gateway: ['Razorpay', 'PayPal'][idx % 2],
          date: recordDate,
          status: 'Success',
          paymentId: `pay_mock_${Math.random().toString(36).substring(2, 10)}`,
          currency: 'INR'
        });

        // Update Course stats
        course.enrollments += 1;
        course.revenue += course.price;
        await course.save();
      }

      await student.save();
    }
    console.log('Seeded enrollments & transactions successfully.');
  }
};

export const initDB = async () => {
  try {
    mongoose.set('bufferCommands', false);
    if (mongoose.connection.readyState !== 1) {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      console.log('Connecting to MongoDB...');
      const uri = getMongoDBURI();
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000
      });
      console.log('Connected to MongoDB successfully.');
    }
    await seedDB();

    // Migrate all courses to use the new videoUrl
    const allCourses = await Course.find();
    for (const c of allCourses) {
      let modified = false;
      const updateChildren = (nodes) => {
        for (const node of nodes) {
          if (node.type === 'lecture') {
            node.videoUrl = "https://res.cloudinary.com/dk6nbaps1/video/upload/v1782451962/output_144p_mw4twn.mp4";
            modified = true;
          } else if (node.type === 'topic' && node.children) {
            updateChildren(node.children);
          }
        }
      };
      if (c.curriculum) {
        updateChildren(c.curriculum);
      }
      if (modified) {
        c.markModified('curriculum');
        await c.save();
      }
    }
  } catch (error) {
    console.error('Error connecting to/initializing MongoDB:', error);
    throw error;
  }
};

export const getUsers = async () => {
  const users = await User.find().lean();
  return users.map(u => ({ ...u, _id: u._id.toString(), id: u._id.toString() }));
};

export const saveUsers = async (users) => {
  for (const u of users) {
    const id = u._id || u.id;
    await User.findByIdAndUpdate(id, u, { upsert: true });
  }
};

export const getCourses = async () => {
  const courses = await Course.find().lean();
  return courses.map(c => ({ ...c, _id: c._id.toString(), id: c._id.toString() }));
};

export const saveCourses = async (courses) => {
  for (const c of courses) {
    const id = c._id || c.id;
    await Course.findByIdAndUpdate(id, c, { upsert: true });
  }
};

export const getTransactions = async () => {
  const txs = await Transaction.find().sort({ date: -1 }).lean();
  return txs.map(t => ({ ...t, _id: t._id.toString(), id: t._id.toString() }));
};

export const saveTransactions = async (transactions) => {
  for (const t of transactions) {
    const id = t._id || t.id;
    await Transaction.findByIdAndUpdate(id, t, { upsert: true });
  }
};

export const getCoupons = async () => {
  const coupons = await Coupon.find().lean();
  return coupons.map(c => ({ ...c, _id: c._id.toString(), id: c._id.toString() }));
};

export const saveCoupons = async (coupons) => {
  for (const c of coupons) {
    const id = c._id || c.id;
    await Coupon.findByIdAndUpdate(id, c, { upsert: true });
  }
};

export const getEnrollments = async () => {
  const enrolls = await Enrollment.find().lean();
  return enrolls.map(e => ({ ...e, _id: e._id.toString(), id: e._id.toString() }));
};

export const saveEnrollments = async (enrollments) => {
  for (const e of enrollments) {
    const id = e._id || e.id;
    await Enrollment.findByIdAndUpdate(id, e, { upsert: true });
  }
};
