import mongoose from 'mongoose';
import User from '../models/User.js';
import { getUsers, saveUsers } from '../data/db.js';

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
export const signup = async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please provide name, email and password' });
  }

  try {
    const users = await getUsers();
    const userExists = users.some(u => u.email.toLowerCase() === email.toLowerCase());

    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash password using our mongoose User static helper
    const hashedPassword = await User.hashPassword(password);

    // Create user object matching Mongoose model properties (generate genuine ObjectId hex)
    const newUser = {
      _id: new mongoose.Types.ObjectId().toString(),
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || 'student',
      joinedDate: new Date(),
      purchasedCourseIds: [],
      status: 'Active',
      avatar: '',
      phone: ''
    };

    // Save to JSON Database
    users.push(newUser);
    await saveUsers(users);

    // Instantiate User model to generate token and return clean user
    const userDoc = new User(newUser);
    const token = userDoc.generateAuthToken();

    res.status(201).json({
      token,
      user: {
        _id: userDoc._id.toString(),
        id: userDoc._id.toString(),
        name: userDoc.name,
        email: userDoc.email,
        role: userDoc.role,
        joinedDate: userDoc.joinedDate,
        purchasedCourseIds: userDoc.purchasedCourseIds,
        status: userDoc.status,
        phone: userDoc.phone || ''
      }
    });
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).json({ message: 'Server error during signup', error: error.message });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password' });
  }

  try {
    const users = await getUsers();
    const userData = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!userData) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (userData.status === 'Suspended') {
      return res.status(403).json({ message: 'Your account is suspended. Please contact admin.' });
    }

    // Instantiate Mongoose User to check password
    const userDoc = new User(userData);
    const isMatch = await userDoc.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = userDoc.generateAuthToken();

    res.json({
      token,
      user: {
        _id: userData._id.toString(),
        id: userData._id.toString(),
        name: userData.name,
        email: userData.email,
        role: userData.role,
        joinedDate: userData.joinedDate,
        purchasedCourseIds: userData.purchasedCourseIds || [],
        status: userData.status,
        phone: userData.phone || ''
      }
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const users = await getUsers();
    const user = users.find(u => u._id === req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      _id: user._id.toString(),
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      joinedDate: user.joinedDate,
      purchasedCourseIds: user.purchasedCourseIds || [],
      status: user.status,
      phone: user.phone || ''
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
