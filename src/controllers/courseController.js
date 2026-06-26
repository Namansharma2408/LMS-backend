import mongoose from 'mongoose';
import Course from '../models/Course.js';
import Transaction from '../models/Transaction.js';
import Enrollment from '../models/Enrollment.js';
import { getCourses, saveCourses, getUsers, saveUsers, getTransactions, saveTransactions, getEnrollments, saveEnrollments } from '../data/db.js';

// Helper to ensure course response contains both id and _id (backward compatible)
const formatCourse = (c, instructorName, enrollments = [], users = []) => {
  const courseEnrollments = enrollments.filter(
    e => e.course && e.course.toString() === c._id.toString()
  );
  const enrolledStudents = courseEnrollments.map(e => {
    const student = users.find(u => u._id.toString() === e.student.toString());
    return {
      id: student ? student._id.toString() : e.student.toString(),
      name: student ? student.name : 'Unknown Student',
      email: student ? student.email : 'Unknown Email',
      avatar: student ? student.avatar : '',
      progress: e.progress,
      completed: e.completed,
      enrollmentDate: e.enrollmentDate
    };
  });

  return {
    ...c,
    _id: c._id.toString(),
    id: c._id.toString(),
    instructor: instructorName,
    enrolledStudents
  };
};

// @desc    Get all courses
// @route   GET /api/courses
// @access  Public
export const getAllCourses = async (req, res) => {
  try {
    const courses = await getCourses();
    const users = await getUsers();
    const enrollments = await getEnrollments();
    const populatedCourses = courses.map(c => {
      let instructorName = "Unknown";
      if (c.instructors && c.instructors.length > 0) {
        const instUsers = users.filter(u => c.instructors.includes(u._id));
        instructorName = instUsers.length > 0 ? instUsers.map(u => u.name).join(", ") : "Unknown";
      }
      return formatCourse(c, instructorName, enrollments, users);
    });
    res.json(populatedCourses);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving courses' });
  }
};

// @desc    Get course by ID
// @route   GET /api/courses/:id
// @access  Public
export const getCourseById = async (req, res) => {
  try {
    const courses = await getCourses();
    const course = courses.find(c => c._id === req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    const users = await getUsers();
    const enrollments = await getEnrollments();
    let instructorName = "Unknown";
    if (course.instructors && course.instructors.length > 0) {
      const instUsers = users.filter(u => course.instructors.includes(u._id));
      instructorName = instUsers.length > 0 ? instUsers.map(u => u.name).join(", ") : "Unknown";
    }
    res.json(formatCourse(course, instructorName, enrollments, users));
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving course' });
  }
};

// @desc    Create a new course
// @route   POST /api/courses
// @access  Private (Admin, Instructor)
export const createCourse = async (req, res) => {
  const { name, price, status, gradient, description, curriculum, instructors, thumbnail, category, duration, language, level } = req.body;

  if (!name || !price || !description) {
    return res.status(400).json({ message: 'Please provide course name, price, and description' });
  }

  try {
    const courses = await getCourses();
    const targetInstructors = Array.isArray(instructors) && instructors.length > 0 ? instructors : [req.user.id];

    // Clean and convert price to Number
    const numericPrice = typeof price === 'string' ? Number(price.replace(/[^0-9.]/g, '')) : Number(price);

    // Instantiate Course mongoose model to validate structure
    const newCourseDoc = new Course({
      _id: new mongoose.Types.ObjectId().toString(),
      name,
      instructors: targetInstructors,
      price: numericPrice,
      enrollments: 0,
      rating: 5.0,
      revenue: 0,
      status: status || 'Published',
      gradient: gradient || 'from-purple-500 to-blue-500',
      description,
      curriculum: curriculum || [],
      thumbnail: thumbnail || '',
      category: category || 'Web Development',
      duration: duration ? Number(duration) : 0,
      language: language || 'English',
      level: level || 'Beginner'
    });

    // Check validation errors (if any)
    const validationError = newCourseDoc.validateSync();
    if (validationError) {
      return res.status(400).json({ message: validationError.message });
    }

    const newCourseObj = newCourseDoc.toObject();
    newCourseObj._id = newCourseDoc._id.toString();

    courses.unshift(newCourseObj);
    await saveCourses(courses);

    const users = await getUsers();
    const instUsers = users.filter(u => targetInstructors.includes(u._id));
    const instructorName = instUsers.length > 0 ? instUsers.map(u => u.name).join(", ") : "Unknown";

    res.status(201).json(formatCourse(newCourseObj, instructorName));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating course' });
  }
};

// @desc    Update a course
// @route   PUT /api/courses/:id
// @access  Private (Admin, Instructor)
export const updateCourse = async (req, res) => {
  const { name, price, status, gradient, description, curriculum, instructors, thumbnail, category, duration, language, level } = req.body;

  try {
    const courses = await getCourses();
    const index = courses.findIndex(c => c._id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Role check: Instructors can only edit their own courses
    const isAuthorized = req.user.role === 'admin' || (courses[index].instructors && courses[index].instructors.includes(req.user.id));
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized to edit this course' });
    }

    const updatedCourseObj = {
      ...courses[index],
      name: name !== undefined ? name : courses[index].name,
      price: price !== undefined ? (typeof price === 'string' ? Number(price.replace(/[^0-9.]/g, '')) : Number(price)) : courses[index].price,
      status: status !== undefined ? status : courses[index].status,
      gradient: gradient !== undefined ? gradient : courses[index].gradient,
      description: description !== undefined ? description : courses[index].description,
      curriculum: curriculum !== undefined ? curriculum : courses[index].curriculum,
      instructors: instructors !== undefined ? instructors : (courses[index].instructors || [req.user.id]),
      thumbnail: thumbnail !== undefined ? thumbnail : courses[index].thumbnail,
      category: category !== undefined ? category : courses[index].category,
      duration: duration !== undefined ? Number(duration) : courses[index].duration,
      language: language !== undefined ? language : courses[index].language,
      level: level !== undefined ? level : courses[index].level
    };

    // Validate using Mongoose
    const courseDoc = new Course(updatedCourseObj);
    const validationError = courseDoc.validateSync();
    if (validationError) {
      return res.status(400).json({ message: validationError.message });
    }

    const savedCourseObj = courseDoc.toObject();
    savedCourseObj._id = courseDoc._id.toString();

    courses[index] = savedCourseObj;
    await saveCourses(courses);

    const users = await getUsers();
    const instUsers = users.filter(u => courses[index].instructors.includes(u._id));
    const instructorName = instUsers.length > 0 ? instUsers.map(u => u.name).join(", ") : "Unknown";

    res.json(formatCourse(courses[index], instructorName));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating course' });
  }
};

// @desc    Delete a course
// @route   DELETE /api/courses/:id
// @access  Private (Admin)
export const deleteCourse = async (req, res) => {
  try {
    const courses = await getCourses();
    const index = courses.findIndex(c => c._id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ message: 'Course not found' });
    }

    courses.splice(index, 1);
    await saveCourses(courses);

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting course' });
  }
};

// @desc    Purchase/Enroll in a course
// @route   POST /api/courses/:id/enroll
// @access  Private (Student)
export const enrollInCourse = async (req, res) => {
  try {
    const courses = await getCourses();
    const course = courses.find(c => c._id === req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const users = await getUsers();
    const userIndex = users.findIndex(u => u._id === req.user.id);

    if (userIndex === -1) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already purchased
    const hasBought = users[userIndex].purchasedCourseIds.includes(course._id);
    if (hasBought) {
      return res.status(400).json({ message: 'Already enrolled in this course' });
    }

    // Add to student's purchased courses
    users[userIndex].purchasedCourseIds.push(course._id);
    await saveUsers(users);

    // Create a transaction record using our Mongoose Transaction model
    const transactions = await getTransactions();
    const newTxDoc = new Transaction({
      student: req.user.id,
      course: course._id,
      amount: Number(course.price),
      gateway: req.body?.gateway || 'Razorpay',
      date: new Date(),
      status: 'Success',
      paymentId: req.body?.paymentId || `pay_mock_${Math.random().toString(36).substring(2, 10)}`,
      currency: 'INR'
    });

    const txValidationError = newTxDoc.validateSync();
    if (txValidationError) {
      return res.status(400).json({ message: txValidationError.message });
    }

    const txObj = newTxDoc.toObject();
    txObj._id = newTxDoc._id.toString();
    transactions.unshift(txObj);
    await saveTransactions(transactions);

    // Create an enrollment record using our Mongoose Enrollment model
    const enrollments = await getEnrollments();
    const newEnrollmentDoc = new Enrollment({
      student: req.user.id,
      course: course._id,
      enrollmentDate: new Date(),
      progress: 0,
      certificateStatus: 'In progress',
      completed: false,
      lastAccessed: new Date()
    });

    const enrollmentValidationError = newEnrollmentDoc.validateSync();
    if (enrollmentValidationError) {
      return res.status(400).json({ message: enrollmentValidationError.message });
    }

    const enrollmentObj = newEnrollmentDoc.toObject();
    enrollmentObj._id = newEnrollmentDoc._id.toString();
    enrollments.unshift(enrollmentObj);
    await saveEnrollments(enrollments);

    // Update course enrollments & revenue counts
    const courseIndex = courses.findIndex(c => c._id === course._id);
    if (courseIndex !== -1) {
      courses[courseIndex].enrollments = (courses[courseIndex].enrollments || 0) + 1;
      courses[courseIndex].revenue = (courses[courseIndex].revenue || 0) + Number(course.price);
      await saveCourses(courses);
    }

    res.json({
      message: `Enrolled successfully in ${course.name}`,
      purchasedCourseIds: users[userIndex].purchasedCourseIds
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error enrolling in course' });
  }
};
