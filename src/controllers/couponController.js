import Coupon from '../models/Coupon.js';
import { getCoupons, saveCoupons } from '../data/db.js';

// Helper to format coupon output, dynamically computing the status field
const formatCoupon = (c) => {
  const isExpired = new Date(c.expiry) < new Date();
  return {
    ...c,
    status: isExpired ? 'Expired' : 'Active'
  };
};

// @desc    Get all coupons
// @route   GET /api/coupons
// @access  Private (Admin, Instructor)
export const getAllCoupons = async (req, res) => {
  try {
    const coupons = await getCoupons();
    const formatted = coupons.map(c => formatCoupon(c));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving coupons' });
  }
};

// @desc    Create a coupon
// @route   POST /api/coupons
// @access  Private (Admin, Instructor)
export const createCoupon = async (req, res) => {
  const { code, discount, type, maxUses, expiry, courseId, minimumAmount, maximumDiscount } = req.body;

  if (!code || !discount || !maxUses || !expiry) {
    return res.status(400).json({ message: 'Please provide coupon code, discount, maxUses, and expiry' });
  }

  try {
    const coupons = await getCoupons();
    const couponExists = coupons.some(c => c.code.toUpperCase() === code.toUpperCase());

    if (couponExists) {
      return res.status(400).json({ message: 'Coupon with this code already exists' });
    }

    // Clean and parse discount to Number
    const discountVal = typeof discount === 'string' 
      ? Number(discount.replace(/%/g, '').replace(/[^0-9.]/g, '')) 
      : Number(discount);

    // Parse expiry to Date
    let parsedExpiry;
    if (expiry.toLowerCase() === 'expired') {
      parsedExpiry = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
    } else if (expiry.includes('Jul 31')) {
      parsedExpiry = new Date('2026-07-31T23:59:59.000Z');
    } else if (expiry.includes('Aug 15')) {
      parsedExpiry = new Date('2026-08-15T23:59:59.000Z');
    } else if (expiry.includes('Dec 31')) {
      parsedExpiry = new Date('2026-12-31T23:59:59.000Z');
    } else {
      parsedExpiry = new Date(expiry);
    }

    const newCouponObj = {
      code: code.toUpperCase(),
      discount: discountVal,
      type: type || 'Percentage',
      maxUses: Number(maxUses),
      currentUses: 0,
      expiry: parsedExpiry,
      courseId: courseId || undefined,
      minimumAmount: minimumAmount ? Number(minimumAmount) : 0,
      maximumDiscount: maximumDiscount ? Number(maximumDiscount) : undefined
    };

    // Mongoose validation
    const couponDoc = new Coupon(newCouponObj);
    const validationError = couponDoc.validateSync();
    if (validationError) {
      return res.status(400).json({ message: validationError.message });
    }

    const savedCouponObj = couponDoc.toObject();
    coupons.unshift(savedCouponObj);
    await saveCoupons(coupons);

    res.status(201).json(formatCoupon(savedCouponObj));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating coupon' });
  }
};

// @desc    Validate a coupon code
// @route   POST /api/coupons/validate
// @access  Private
export const validateCoupon = async (req, res) => {
  const { code, courseId, purchaseAmount } = req.body;

  if (!code) {
    return res.status(400).json({ message: 'Please provide a coupon code' });
  }

  try {
    const coupons = await getCoupons();
    const coupon = coupons.find(c => c.code.toUpperCase() === code.toUpperCase());

    if (!coupon) {
      return res.status(404).json({ message: 'Coupon code not found' });
    }

    // Check expiry dynamically
    const isExpired = new Date(coupon.expiry) < new Date();
    if (isExpired) {
      return res.status(400).json({ message: 'This coupon is expired' });
    }

    if (coupon.currentUses >= coupon.maxUses) {
      return res.status(400).json({ message: 'This coupon has reached its usage limit' });
    }

    // Check minimum purchase amount constraint
    if (coupon.minimumAmount && purchaseAmount !== undefined && Number(purchaseAmount) < coupon.minimumAmount) {
      return res.status(400).json({ 
        message: `This coupon requires a minimum purchase amount of ${coupon.minimumAmount}` 
      });
    }

    // Check course applicability if the coupon is constrained to a specific course
    if (coupon.courseId) {
      if (!courseId) {
        return res.status(400).json({ message: 'This coupon is only applicable to a specific course' });
      }
      if (coupon.courseId.toString() !== courseId.toString()) {
        return res.status(400).json({ message: 'This coupon is not applicable to the selected course' });
      }
    }

    res.json({
      valid: true,
      code: coupon.code,
      discount: coupon.discount,
      type: coupon.type,
      courseId: coupon.courseId ? coupon.courseId.toString() : undefined,
      maximumDiscount: coupon.maximumDiscount
    });
  } catch (error) {
    res.status(500).json({ message: 'Error validating coupon' });
  }
};

// @desc    Delete a coupon
// @route   DELETE /api/coupons/:code
// @access  Private (Admin, Instructor)
export const deleteCoupon = async (req, res) => {
  try {
    const coupons = await getCoupons();
    const index = coupons.findIndex(c => c.code.toUpperCase() === req.params.code.toUpperCase());

    if (index === -1) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    coupons.splice(index, 1);
    await saveCoupons(coupons);

    res.json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting coupon' });
  }
};
