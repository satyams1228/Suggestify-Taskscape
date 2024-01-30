const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

// Registration route
router.post('/register', authController.register);

// Login route
router.post('/login', authController.login);

// Render the login form
router.get('/login', authController.getLogin);

// Dashboard route (requires authentication)
router.get('/dashboard', authController.isAuthenticated, authController.dashboard);

// Logout route
router.get('/logout', authController.logout);

// Add task route
router.post('/addTask', authController.isAuthenticated, authController.addTask);

// Edit task route
router.post('/editTask/', authController.isAuthenticated, authController.editTask);

 

// Delete task route
router.get('/deleteTask/:taskId', authController.isAuthenticated, authController.deleteTask);


module.exports = router;
