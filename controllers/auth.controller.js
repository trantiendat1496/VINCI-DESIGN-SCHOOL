const User = require("../models/user.model");
const jwt = require("jsonwebtoken");
const expressJwt = require("express-jwt");
const catchAsync = require('../utils/catchAsync');
const sgMail = require('@sendgrid/mail');

const signToken = _id => {
  return jwt.sign({ _id }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

const createSendToken = catchAsync(async (user, res) => {
  const token = signToken(user._id);
  cookieOptions = {
    signed: true,
    httpOnly: true,
  }
  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;
  res.cookie("token", token, cookieOptions);
  user.password = undefined;
  // là admin thì chuyển vào trang admin
  // tạm thời chưa tạo token --- sửa sau khi hoàn thành giao diện
  if (user.role === 1) {
    res.redirect('/admin/index');
    return;
  }
  res.redirect('/');
});

exports.getSignup = function (req, res, next) {
  res.render('auth/signup');
};
module.exports.signup = catchAsync(async (req, res, next) => {
  const { username, email, password, ConfirmPassword } = req.body;
  if (password !== ConfirmPassword) {
    res.render('auth/signup', {
      message: "Password and password confirm is not correct !"
    });
    return;
  }
  const user = await User.findOne({ email });
  const userOther = await User.findOne({ username });
  if (user) {
    res.render('auth/signup', {
      message: "Email is taken !"
    });
    return;
  };
  if (userOther) {
    res.render('auth/signup', {
      message: "User Name is taken !"
    });
    return;
  };
  const userNew = await User.create({
    username,
    email,
    password,
    photo: '/image/avatar-1.png'
  });
  const emailNew = userNew.email;
  const msg = {
    to: emailNew,
    from: 'chunguyenchuong2014bg@gmail.com', // Use the email address or domain you verified above
    subject: "Welcome to VINCI DESIGN SCHOOL",
    text: `Thank you for your interest in the services of VINCI DESIGN SCHOOL, please enter ${userNew.codeActive} on the page below to complete the last step of registering an account on VINCI DESIGN SCHOOL.`,
    html: `<div>Thank you for your interest in the services of VINCI DESIGN SCHOOL, please enter <span style="font-weight: 700;"> ${userNew.codeActive} </span> on the page below to complete the last step of registering an account on VINCI DESIGN SCHOOL.</div><a href="http://localhost:8000/auth/signup-success/${emailNew}">Click Here !!</a>`
  };
  sgMail
    .send(msg)
    .then(() => { }, error => {
      console.error(error);
      if (error.response) {
        console.error(error.response.body)
      }
    });
  res.redirect(`/auth/signup-success/${userNew.email}`);
});

exports.getSignUpSuccess = function (req, res, next) {
  res.render("auth/signup-success", {
    title: 'Thank you for your interest in the service of VINCI DESIGN SCHOOL, please enter the code we sent to your email to use to register our service :'
  });
}

exports.postSignupSuccess = catchAsync(async (req, res, next) => {
  const { slug } = req.params;
  const { code } = req.body;
  const user = await User.findOne({ email: slug });
  if (user.codeActive != code) {
    res.render(res.render("auth/signup-success", {
      title: 'Singup success, Please check your email account for account confirmation, and enter the code we sent you here :',
      message: "Code is not correct !!! please, check again email and enter your code"
    }))
  }
  user.isActive = true;
  user.codeActive = "";
  await User.findByIdAndUpdate({ _id: user._id }, user);
  createSendToken(user, res);
});

exports.getLogin = function (req, res, next) {
  res.render('auth/login');
};
module.exports.signin = catchAsync(async (req, res, next) => {
  // check if user exists
  const { email, password } = req.body;
  if (!email || !password) {
    res.render('auth/login', {
      message: "email or password can't empty !!!"
    });
    return;
  };
  const user = await User.findOne({ email });
  if (!user) {
    res.render('auth/login', {
      message: `Can Not Find This Email !!! `
    });
    return;
  }
  if (!user.authenticate(password)) {
    res.render('auth/login', {
      message: `Password is not correct`,
      email
    });
    return;
  }
  if (!user.isActive) {
    res.redirect(`/auth/signup-success/${user.email}`);
  }

  createSendToken(user, res);
});

exports.checkUser = catchAsync(async (req, res, next) => {
  const { token } = req.signedCookies;
  if (!token) {
    next();
    return;
  }
  const { _id } = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById({ _id });
  req.user = user;
  next();
});

module.exports.signout = (req, res) => {
  res.clearCookie("token");
  res.render('auth/login', {
    message: "Signout success",
  })
};

exports.restrictTo = (...role) => {
  return (req, res, next) => {
    if (!req.user || !role.includes(req.user.role)) {
      return res.render('err/Error404', { code: 404 });
    }
    return next();
  }
};

module.exports.requireSignin = expressJwt({
  secret: process.env.JWT_SECRET,
  algorithms: ["HS256"], // added later
  // userProperty: "auth",
});

module.exports.authMiddleware = (req, res, next) => {
  const authUserId = req.user._id;
  User.findById({ _id: authUserId }, (err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: "User not found",
      });
    }
    req.profile = user;
    next();
  });
};

module.exports.adminMiddleware = (req, res, next) => {
  const adminUserId = req.user._id;
  User.findById({ _id: adminUserId }, (err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: "User not found",
      });
    }

    if (user.role !== 1) {
      return res.status(400).json({
        error: "Admin resources. Access denied ",
      });
    }

    req.profile = user;
    next();
  });
};


