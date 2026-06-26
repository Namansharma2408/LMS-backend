import mongoose from 'mongoose';
import Enrollment from '../models/Enrollment.js';
import { getEnrollments, saveEnrollments, getUsers, saveUsers, getCourses } from '../data/db.js';

// Helper to format enrollment for backward compatibility (attaching computed properties like studentName, studentEmail, courseId, courseName)
const formatEnrollment = (e, users, courses) => {
  const user = users.find(u => u._id.toString() === e.student.toString());
  const courseObj = courses.find(c => c._id.toString() === e.course.toString());
  return {
    ...e,
    _id: e._id ? e._id.toString() : undefined,
    studentName: user ? user.name : (e.studentName || 'Unknown'),
    studentEmail: user ? user.email : (e.studentEmail || 'Unknown'),
    courseId: courseObj ? courseObj._id.toString() : (e.course ? e.course.toString() : 'Unknown'),
    courseName: courseObj ? courseObj.name : (e.courseName || 'Unknown')
  };
};

// @desc    Get all enrollments
// @route   GET /api/enrollments
// @access  Private (Admin)
export const getAllEnrollments = async (req, res) => {
  try {
    const enrollments = await getEnrollments();
    const users = await getUsers();
    const courses = await getCourses();

    const populated = enrollments.map(e => formatEnrollment(e, users, courses));
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving enrollments' });
  }
};

// @desc    Get current user's enrollments
// @route   GET /api/enrollments/my
// @access  Private
export const getMyEnrollments = async (req, res) => {
  try {
    const enrollments = await getEnrollments();
    const users = await getUsers();
    const courses = await getCourses();

    const myEnrollments = enrollments
      .filter(e => e.student.toString() === req.user.id.toString() || (e.studentEmail && e.studentEmail.toLowerCase() === req.user.email.toLowerCase()))
      .map(e => formatEnrollment(e, users, courses));

    res.json(myEnrollments);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving user enrollments' });
  }
};

// @desc    Update progress in a course
// @route   PUT /api/enrollments/progress
// @access  Private
export const updateProgress = async (req, res) => {
  const { courseId, progress } = req.body;

  if (!courseId || progress === undefined) {
    return res.status(400).json({ message: 'Please provide courseId and progress percentage' });
  }

  try {
    const enrollments = await getEnrollments();
    const index = enrollments.findIndex(
      e => (e.course.toString() === courseId.toString() || e.courseId === courseId) && 
           (e.student.toString() === req.user.id.toString() || (e.studentEmail && e.studentEmail.toLowerCase() === req.user.email.toLowerCase()))
    );

    if (index === -1) {
      return res.status(404).json({ message: 'Enrollment record not found' });
    }

    // Clean progress: parse percentage strings (e.g. "72%") or numbers
    const cleanProgress = typeof progress === 'string' 
      ? Number(progress.replace(/%/g, '').replace(/[^0-9.]/g, '')) 
      : Number(progress);

    enrollments[index].progress = cleanProgress;
    enrollments[index].lastAccessed = new Date();

    // Auto-update certificate status if 100% completed
    if (cleanProgress === 100) {
      enrollments[index].certificateStatus = 'Issued';
      enrollments[index].completed = true;
    } else {
      enrollments[index].certificateStatus = 'In progress';
      enrollments[index].completed = false;
    }

    // Mongoose validation
    const enrollmentDoc = new Enrollment(enrollments[index]);
    const validationError = enrollmentDoc.validateSync();
    if (validationError) {
      return res.status(400).json({ message: validationError.message });
    }

    const savedEnrollmentObj = enrollmentDoc.toObject();
    savedEnrollmentObj._id = enrollmentDoc._id.toString();

    enrollments[index] = savedEnrollmentObj;
    await saveEnrollments(enrollments);

    const users = await getUsers();
    const courses = await getCourses();
    res.json(formatEnrollment(enrollments[index], users, courses));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating course progress' });
  }
};

// @desc    Grant manual access to a course
// @route   POST /api/enrollments/grant
// @access  Private (Admin)
export const grantAccess = async (req, res) => {
  const { studentEmail, courseId, courseName } = req.body;

  if (!studentEmail || !courseId || !courseName) {
    return res.status(400).json({ message: 'Please provide studentEmail, courseId, and courseName' });
  }

  try {
    // 1. Find the user
    const users = await getUsers();
    const userIndex = users.findIndex(u => u.email.toLowerCase() === studentEmail.toLowerCase());

    if (userIndex === -1) {
      return res.status(404).json({ message: 'User not found with this email' });
    }

    const courses = await getCourses();
    const courseObj = courses.find(c => c._id === courseId || c.name === courseName);
    const targetCourseId = courseObj ? courseObj._id.toString() : courseId;

    if (users[userIndex].purchasedCourseIds.map(id => id.toString()).includes(targetCourseId.toString())) {
      return res.status(400).json({ message: 'User already has access to this course' });
    }

    // Grant access
    users[userIndex].purchasedCourseIds.push(targetCourseId.toString());
    await saveUsers(users);

    // 2. Create enrollment record
    const enrollments = await getEnrollments();
    const newEnrollment = {
      _id: new mongoose.Types.ObjectId().toString(),
      student: users[userIndex]._id,
      course: targetCourseId,
      enrollmentDate: new Date(),
      progress: 0,
      certificateStatus: 'In progress',
      completed: false,
      lastAccessed: new Date()
    };

    const enrollmentDoc = new Enrollment(newEnrollment);
    const validationError = enrollmentDoc.validateSync();
    if (validationError) {
      return res.status(400).json({ message: validationError.message });
    }

    const savedEnrollmentObj = enrollmentDoc.toObject();
    savedEnrollmentObj._id = enrollmentDoc._id.toString();

    enrollments.unshift(savedEnrollmentObj);
    await saveEnrollments(enrollments);

    res.status(201).json({
      message: 'Access granted successfully',
      enrollment: formatEnrollment(savedEnrollmentObj, users, courses)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error granting course access' });
  }
};
