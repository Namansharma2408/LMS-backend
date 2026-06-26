import mongoose from 'mongoose';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import Transaction from '../models/Transaction.js';
import Enrollment from '../models/Enrollment.js';
import {
  getTransactions,
  saveTransactions,
  getUsers,
  saveUsers,
  getCourses,
  saveCourses,
  getEnrollments,
  saveEnrollments,
  getCoupons,
  saveCoupons
} from '../data/db.js';

// Helper to format transaction for backward compatibility (attaching computed properties like studentName, studentEmail, courseName)
const formatTransaction = (t, users, courses) => {
  const user = users.find(u => u._id.toString() === t.student.toString());
  const courseObj = courses.find(c => c._id.toString() === t.course.toString());
  return {
    ...t,
    _id: t._id ? t._id.toString() : undefined,
    studentName: user ? user.name : (t.studentName || 'Unknown'),
    studentEmail: user ? user.email : (t.studentEmail || 'Unknown'),
    courseName: courseObj ? courseObj.name : (t.courseName || 'Unknown')
  };
};

// @desc    Get all transactions
// @route   GET /api/payments/transactions
// @access  Private (Admin)
export const getAllTransactions = async (req, res) => {
  try {
    const transactions = await getTransactions();
    const users = await getUsers();
    const courses = await getCourses();

    const populatedTransactions = transactions.map(t => formatTransaction(t, users, courses));
    res.json(populatedTransactions);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving transactions' });
  }
};

// @desc    Create a transaction record
// @route   POST /api/payments/transactions
// @access  Private
export const createTransaction = async (req, res) => {
  const { courseName, courseId, amount, gateway, status, paymentId, coupon, currency, invoiceUrl } = req.body;

  const queryCourse = courseId || courseName;
  if (!queryCourse || !amount) {
    return res.status(400).json({ message: 'Please provide courseName or courseId and amount' });
  }

  try {
    const courses = await getCourses();
    const courseObj = courses.find(c => c._id.toString() === queryCourse.toString() || c.name === queryCourse);
    const targetCourseId = courseObj ? courseObj._id.toString() : queryCourse;

    const transactions = await getTransactions();

    // Clean and convert amount to Number
    const numericAmount = typeof amount === 'string' ? Number(amount.replace(/[^0-9.]/g, '')) : Number(amount);

    const newTxObj = {
      _id: new mongoose.Types.ObjectId().toString(),
      student: req.user.id,
      course: targetCourseId,
      amount: numericAmount,
      gateway: gateway || 'Razorpay',
      date: new Date(),
      status: status || 'Success',
      paymentId: paymentId || `pay_mock_${Math.random().toString(36).substring(2, 10)}`,
      coupon: coupon || undefined,
      currency: currency || 'INR',
      invoiceUrl: invoiceUrl || ''
    };

    // Mongoose validation
    const txDoc = new Transaction(newTxObj);
    const validationError = txDoc.validateSync();
    if (validationError) {
      return res.status(400).json({ message: validationError.message });
    }

    const savedTxObj = txDoc.toObject();
    savedTxObj._id = txDoc._id.toString();

    transactions.unshift(savedTxObj);
    await saveTransactions(transactions);

    const users = await getUsers();
    res.status(201).json(formatTransaction(savedTxObj, users, courses));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating transaction record' });
  }
};

// @desc    Refund transaction
// @route   PUT /api/payments/transactions/:id/refund
// @access  Private (Admin)
export const refundTransaction = async (req, res) => {
  try {
    const transactions = await getTransactions();
    const index = transactions.findIndex(t => t._id.toString() === req.params.id.toString());

    if (index === -1) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    transactions[index].status = 'Refunded';
    await saveTransactions(transactions);

    const users = await getUsers();
    const courses = await getCourses();
    res.json(formatTransaction(transactions[index], users, courses));
  } catch (error) {
    res.status(500).json({ message: 'Error processing refund' });
  }
};

// @desc    Create Razorpay Order
// @route   POST /api/payments/razorpay/order
// @access  Private
export const createRazorpayOrder = async (req, res) => {
  const { courseId, couponCode } = req.body;

  if (!courseId) {
    return res.status(400).json({ message: 'Course ID is required' });
  }

  try {
    const courses = await getCourses();
    const course = courses.find(c => c._id.toString() === courseId.toString());

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const users = await getUsers();
    const user = users.find(u => u._id.toString() === req.user.id.toString());
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user already owns the course
    if (user.purchasedCourseIds.map(id => id.toString()).includes(courseId.toString())) {
      return res.status(400).json({ message: 'Already enrolled in this course' });
    }

    let finalPrice = Number(course.price);
    let appliedCoupon = null;

    if (couponCode) {
      const coupons = await getCoupons();
      const coupon = coupons.find(c => c.code.toUpperCase() === couponCode.toUpperCase());
      if (coupon) {
        const isExpired = new Date(coupon.expiry) < new Date();
        const limitReached = coupon.currentUses >= coupon.maxUses;
        const wrongCourse = coupon.courseId && coupon.courseId.toString() !== courseId.toString();
        const underMinAmount = coupon.minimumAmount && finalPrice < coupon.minimumAmount;

        if (!isExpired && !limitReached && !wrongCourse && !underMinAmount) {
          appliedCoupon = coupon.code;
          if (coupon.type === 'Percentage') {
            const discountAmt = (finalPrice * coupon.discount) / 100;
            const finalDiscount = coupon.maximumDiscount && discountAmt > coupon.maximumDiscount 
              ? coupon.maximumDiscount 
              : discountAmt;
            finalPrice = Math.max(0, finalPrice - finalDiscount);
          } else if (coupon.type === 'Flat') {
            finalPrice = Math.max(0, finalPrice - coupon.discount);
          }
        }
      }
    }

    const keyId = process.env.RAJORPAY_TEST_KEY || process.env.RAZORPAY_KEY_ID || 'rzp_test_T5rC2hDqONQ8Ga';
    const keySecret = process.env.RAJORPAY_TEST_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET || '4jMkFMWuS028uc7JdbB9NyjE';

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });

    const amountInPaise = Math.round(finalPrice * 100);
    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `receipt_${courseId.substring(0, 6)}_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    // Save pending transaction record
    const transactions = await getTransactions();
    const newTxDoc = new Transaction({
      student: req.user.id,
      course: course._id,
      amount: finalPrice,
      gateway: 'Razorpay',
      date: new Date(),
      status: 'Pending',
      paymentId: order.id,
      currency: 'INR',
      coupon: appliedCoupon || undefined
    });

    const txValidationError = newTxDoc.validateSync();
    if (txValidationError) {
      return res.status(400).json({ message: txValidationError.message });
    }

    const txObj = newTxDoc.toObject();
    txObj._id = newTxDoc._id.toString();
    transactions.unshift(txObj);
    await saveTransactions(transactions);

    res.status(201).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: keyId,
      course: {
        id: course._id.toString(),
        name: course.name,
        price: course.price
      }
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ message: 'Error creating Razorpay order', error: error.message });
  }
};

// @desc    Verify Razorpay Payment Signature
// @route   POST /api/payments/razorpay/verify
// @access  Private
export const verifyRazorpayPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courseId } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !courseId) {
    return res.status(400).json({ message: 'All fields (order_id, payment_id, signature, courseId) are required' });
  }

  try {
    const keySecret = process.env.RAJORPAY_TEST_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET || '4jMkFMWuS028uc7JdbB9NyjE';

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Invalid payment signature. Verification failed.' });
    }

    const courses = await getCourses();
    const course = courses.find(c => c._id.toString() === courseId.toString());
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const users = await getUsers();
    const userIndex = users.findIndex(u => u._id.toString() === req.user.id.toString());
    if (userIndex === -1) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user already has access
    const alreadyOwns = users[userIndex].purchasedCourseIds.map(id => id.toString()).includes(courseId.toString());
    if (!alreadyOwns) {
      users[userIndex].purchasedCourseIds.push(courseId.toString());
      await saveUsers(users);
    }

    // Find and update pending transaction or create a new success one
    const transactions = await getTransactions();
    const txIndex = transactions.findIndex(t => t.paymentId === razorpay_order_id && t.gateway === 'Razorpay');

    if (txIndex !== -1) {
      transactions[txIndex].status = 'Success';
      transactions[txIndex].paymentId = razorpay_payment_id;

      // Increment coupon uses if coupon was applied
      const appliedCouponCode = transactions[txIndex].coupon;
      if (appliedCouponCode) {
        const coupons = await getCoupons();
        const cpIdx = coupons.findIndex(cp => cp.code.toUpperCase() === appliedCouponCode.toUpperCase());
        if (cpIdx !== -1) {
          coupons[cpIdx].currentUses = (coupons[cpIdx].currentUses || 0) + 1;
          await saveCoupons(coupons);
        }
      }

      await saveTransactions(transactions);
    } else {
      // Create transaction if not found
      const newTxDoc = new Transaction({
        student: req.user.id,
        course: courseId,
        amount: Number(course.price),
        gateway: 'Razorpay',
        date: new Date(),
        status: 'Success',
        paymentId: razorpay_payment_id,
        currency: 'INR'
      });
      const txObj = newTxDoc.toObject();
      txObj._id = newTxDoc._id.toString();
      transactions.unshift(txObj);
      await saveTransactions(transactions);
    }

    // Create Enrollment record
    const enrollments = await getEnrollments();
    const alreadyEnrolled = enrollments.some(
      e => e.student.toString() === req.user.id.toString() && e.course.toString() === courseId.toString()
    );

    if (!alreadyEnrolled) {
      const newEnrollmentDoc = new Enrollment({
        student: req.user.id,
        course: courseId,
        enrollmentDate: new Date(),
        progress: 0,
        certificateStatus: 'In progress',
        completed: false,
        lastAccessed: new Date()
      });
      const enrollmentObj = newEnrollmentDoc.toObject();
      enrollmentObj._id = newEnrollmentDoc._id.toString();
      enrollments.unshift(enrollmentObj);
      await saveEnrollments(enrollments);
    }

    // Update course enrollments and revenue statistics
    const courseIndex = courses.findIndex(c => c._id.toString() === courseId.toString());
    if (courseIndex !== -1) {
      courses[courseIndex].enrollments = (courses[courseIndex].enrollments || 0) + 1;
      courses[courseIndex].revenue = (courses[courseIndex].revenue || 0) + Number(course.price);
      await saveCourses(courses);
    }

    res.json({
      message: 'Payment verified and enrollment successful',
      purchasedCourseIds: users[userIndex].purchasedCourseIds
    });
  } catch (error) {
    console.error('Error verifying Razorpay payment:', error);
    res.status(500).json({ message: 'Error verifying payment', error: error.message });
  }
};
