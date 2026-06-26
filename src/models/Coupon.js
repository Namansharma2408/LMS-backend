import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  discount: {
    type: Number, // Numeric value (e.g. 30 for 30% or 300 for ₹300)
    required: true
  },
  type: {
    type: String,
    enum: ['Percentage', 'Fixed'],
    default: 'Percentage'
  },
  maxUses: {
    type: Number,
    required: true
  },
  currentUses: {
    type: Number,
    default: 0
  },
  expiry: {
    type: Date,
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: false
  },
  minimumAmount: {
    type: Number,
    default: 0
  },
  maximumDiscount: {
    type: Number
  }
}, {
  timestamps: true
});

const Coupon = mongoose.model('Coupon', couponSchema);
export default Coupon;
