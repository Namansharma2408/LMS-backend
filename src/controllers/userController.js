import mongoose from 'mongoose';
import User from '../models/User.js';
import { getUsers, saveUsers } from '../data/db.js';

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin)
export const getAllUsers = async (req, res) => {
  try {
    const users = await getUsers();
    // Return users without sensitive password fields
    const usersClean = users.map(u => ({
      _id: u._id.toString(),
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      joinedDate: u.joinedDate,
      purchasesCount: u.purchasedCourseIds ? u.purchasedCourseIds.length : 0,
      status: u.status,
      purchasedCourseIds: u.purchasedCourseIds || [],
      avatar: u.avatar || '',
      phone: u.phone || ''
    }));
    res.json(usersClean);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving users' });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private (Admin)
export const getUserById = async (req, res) => {
  try {
    const users = await getUsers();
    const user = users.find(u => u._id === req.params.id);
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
      avatar: user.avatar || '',
      phone: user.phone || ''
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving user' });
  }
};

// @desc    Create user (Admin custom creation)
// @route   POST /api/users
// @access  Private (Admin)
export const createUser = async (req, res) => {
  const { name, email, password, role, phone, avatar } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please provide name, email, and password' });
  }

  try {
    const users = await getUsers();
    const userExists = users.some(u => u.email.toLowerCase() === email.toLowerCase());

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await User.hashPassword(password);

    const newUserObj = {
      _id: new mongoose.Types.ObjectId().toString(),
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || 'student',
      joinedDate: new Date(),
      purchasedCourseIds: [],
      status: 'Active',
      phone: phone || '',
      avatar: avatar || ''
    };

    const userDoc = new User(newUserObj);
    const validationError = userDoc.validateSync();
    if (validationError) {
      return res.status(400).json({ message: validationError.message });
    }

    users.push(userDoc.toObject());
    await saveUsers(users);

    res.status(201).json({
      _id: userDoc._id.toString(),
      id: userDoc._id.toString(),
      name: userDoc.name,
      email: userDoc.email,
      role: userDoc.role,
      joinedDate: userDoc.joinedDate,
      status: userDoc.status
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user' });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin)
export const updateUser = async (req, res) => {
  const { name, email, role, status, purchasedCourseIds, phone, avatar } = req.body;

  try {
    const users = await getUsers();
    const index = users.findIndex(u => u._id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updatedUser = {
      ...users[index],
      name: name !== undefined ? name : users[index].name,
      email: email !== undefined ? email.toLowerCase() : users[index].email,
      role: role !== undefined ? role : users[index].role,
      status: status !== undefined ? status : users[index].status,
      purchasedCourseIds: purchasedCourseIds !== undefined ? purchasedCourseIds : users[index].purchasedCourseIds,
      phone: phone !== undefined ? phone : users[index].phone,
      avatar: avatar !== undefined ? avatar : users[index].avatar
    };

    const userDoc = new User(updatedUser);
    const validationError = userDoc.validateSync();
    if (validationError) {
      return res.status(400).json({ message: validationError.message });
    }

    users[index] = userDoc.toObject();
    await saveUsers(users);

    res.json({
      _id: users[index]._id.toString(),
      id: users[index]._id.toString(),
      name: users[index].name,
      email: users[index].email,
      role: users[index].role,
      status: users[index].status,
      purchasedCourseIds: users[index].purchasedCourseIds,
      phone: users[index].phone,
      avatar: users[index].avatar
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user' });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin)
export const deleteUser = async (req, res) => {
  try {
    const users = await getUsers();
    const index = users.findIndex(u => u._id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ message: 'User not found' });
    }

    users.splice(index, 1);
    await saveUsers(users);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user' });
  }
};
