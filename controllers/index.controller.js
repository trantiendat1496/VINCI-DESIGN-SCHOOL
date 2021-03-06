const catchAsync = require('../utils/catchAsync');
const Course = require("../models/course.model");
const jwt = require('jsonwebtoken');

exports.getHomePage = catchAsync(async (req, res, next) => {
  const { user } = req;
  const course = await Course.find({});
  if (user) {
    res.render('index', {
      title: "VINCI DESIGN SCHOOL",
      course, user
    });
    return;
  }
  res.render('index', {
    title: "Home Page",
    course
  });
})
