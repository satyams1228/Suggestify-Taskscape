const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const flash = require('connect-flash');
const axios = require('axios');

const User = require('../models/User');

const authController = {
  register: async (req, res) => {
    try {
      const { name, username, password } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = new User({ name, username, password: hashedPassword, tasks: [] });
      await newUser.save();

      req.flash('successMessage', 'User registered successfully');
      res.redirect('/auth/login');
    } catch (error) {
      req.flash('errorMessage', 'Internal Server Error');
      res.redirect('/auth/login');
    }
  },

  getLogin: (req, res) => {
    try {
      res.render('login', {
        errorMessage: req.flash('errorMessage'),
        successMessage: req.flash('successMessage'), // Make sure to include this line
      });
    } catch (error) {
      req.flash('errorMessage', 'Internal Server Error');
      res.redirect('/auth/login');
    }
  } ,
  

  login: async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await User.findOne({ username });

      if (user && bcrypt.compareSync(password, user.password)) {
        const token = jwt.sign({ username: user.username }, 'secret-key');
        req.session.token = token;
        res.redirect('/auth/dashboard');
      } else {
        req.flash('errorMessage', 'Invalid credentials');
        res.redirect('/auth/login');
      }
    } catch (error) {
      req.flash('errorMessage', 'Internal Server Error');
      res.redirect('/auth/login');
    }
  },

  dashboard: async (req, res) => {
    try {
      const decodedToken = jwt.verify(req.session.token, 'secret-key');
      const username = decodedToken.username;
  
      const user = await User.findOne({ username });
      const tasks = user.tasks || [];
  
      // Make a request to the Flask API for each task to get recommendations
      const recommendationsPromises = tasks.map(async (task) => {
        try {
          const response = await axios.post('http://127.0.0.1:5000/recommend', {
            user_task: task.title,
          });
          //console.log(response.data.recommendations)
          const elementsArray = [];

          data = response.data.recommendations
 
          return data    // Assuming the recommendation is in the 'recommendation' field
        } catch (error) {
          console.error('Error fetching recommendation:', error.message);
          return null;
        }
      });
  
      // Wait for all recommendations to be fetched
      const recommendations = await Promise.all(recommendationsPromises);
  
      res.render('dashboard', { username, tasks, recommendations });
    } catch (error) {
      req.flash('errorMessage', 'Internal Server Error');
      res.redirect('/auth/login');
    }
  },

  isAuthenticated: (req, res, next) => {
    if (req.session.token) {
      next();
    } else {
      req.flash('errorMessage', 'You must be logged in to access the dashboard');
      res.redirect('/auth/login');
    }
  },

  logout: (req, res) => {
    req.session.destroy(() => {
      // Redirect to login page after destroying the session
      res.redirect('/auth/login');
    });
  },


  addTask: async (req, res) => {
    try {
      const decodedToken = jwt.verify(req.session.token, 'secret-key');
      const username = decodedToken.username;

      // Retrieve task details from request body
      const { title } = req.body;

      // Find the user by username
      const user = await User.findOne({ username });

      // Add the task to the user's tasks array
      user.tasks.push({ title });

      // Save the user document
      await user.save();

      res.redirect('/auth/dashboard');
    } catch (error) {
      req.flash('errorMessage', 'Internal Server Error');
      res.redirect('/auth/dashboard');
    }
  },

  editTask: async (req, res) => {
    try {
      // Retrieve task details from request body
      const { taskId, title } = req.body;
  
      // Find the user by username
      const decodedToken = jwt.verify(req.session.token, 'secret-key');
      const username = decodedToken.username;
      const user = await User.findOne({ username });
  
      // Find and update the corresponding task in the user's tasks array
      const taskIndex = user.tasks.findIndex(task => task._id.toString() === taskId);
      if (taskIndex !== -1) {
        user.tasks[taskIndex] = { title,};
        await user.save();
      }
  
      res.redirect('/auth/dashboard');
    } catch (error) {
      req.flash('errorMessage', 'Internal Server Error');
      res.redirect('/auth/dashboard');
    }
  },
  

  deleteTask: async (req, res) => {
    try {
      // Retrieve task ID from request parameters
      const taskId = req.params.taskId;
  
      // Find the user by username
      const decodedToken = jwt.verify(req.session.token, 'secret-key');
      const username = decodedToken.username;
      const user = await User.findOne({ username });
  
      // Remove the corresponding task from the user's tasks array
      user.tasks = user.tasks.filter(task => task._id.toString() !== taskId);
  
      // Save the user document
      await user.save();
  
      res.redirect('/auth/dashboard');
    } catch (error) {
      req.flash('errorMessage', 'Internal Server Error');
      res.redirect('/auth/dashboard');
    }
  },


};

module.exports = authController;
