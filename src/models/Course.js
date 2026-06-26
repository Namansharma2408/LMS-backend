import mongoose from 'mongoose';

// Recursive curriculum node schema to support nested topics and lectures with full validation
const curriculumNodeSchema = new mongoose.Schema();
curriculumNodeSchema.add({
  type: {
    type: String,
    enum: ['topic', 'lecture'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  videoUrl: {
    type: String,
    trim: true
  },
  duration: {
    type: String, // String to support "5:00", "3:40" formatted values from frontend
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  children: [curriculumNodeSchema] // Self-referencing recursive definition
});

const courseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  instructors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  price: {
    type: Number,
    required: true
  },
  enrollments: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 5.0
  },
  revenue: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Published', 'Draft', 'Review'],
    default: 'Published'
  },
  gradient: {
    type: String,
    default: 'from-purple-500 to-blue-500'
  },
  description: {
    type: String,
    required: true
  },
  curriculum: [curriculumNodeSchema],
  thumbnail: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    default: 'Web Development'
  },
  duration: {
    type: Number, // Total duration in hours
    default: 0
  },
  language: {
    type: String,
    default: 'English'
  },
  level: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Beginner'
  }
}, {
  timestamps: true
});

const Course = mongoose.model('Course', courseSchema);
export default Course;
