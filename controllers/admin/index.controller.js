const catchAsync = require("../../utils/catchAsync");
const Course = require("../../models/course.model");
const Category = require("../../models/category.model");
const Section = require("../../models/section.model");
const Lesson = require("../../models/lesson.model");
const formidable = require('formidable');
const cloudinary = require('../../utils/setup.cloudinary');
const fs = require('fs');

exports.getIndex = catchAsync(async (req, res, next) => {
  const { user } = req;
  const course = await Course.find({});
  res.render("admin/index", {
    title: "ADMIN PAGE",
    user,
    course
  });
});

exports.getPageCreateCourse = catchAsync(async (req, res, next) => {
  const { user } = req;
  const category = await Category.find({});
  res.render("admin/courses/create-course", { user, category })
})

exports.postPageCreateCourse = catchAsync(async (req, res, next) => {
  const { courseName, trainerName, categoryId, shortDescription, title1, title2, detailDescription1, detailDescription2, price } = req.body;
  const { files } = req;
  const urls = [];
  const data = {
    courseName,
    trainerName,
    categoryId,
    shortDescription,
    price,
  }
  for (const file of files) {
    let folder;
    const options = {};
    if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
      folder = "images";
    }
    else if (file.mimetype === "video/mp4") {
      folder = "video";
      options.resource_type = "video";
    }
    const nameVideos = file.filename.split(".").slice(0, -1).join(".");
    options.public_id = `${folder}/${nameVideos}`;
    const uploader = async path => await cloudinary.uploads(path, options);
    const newPath = await uploader(file.path);
    urls.push(newPath.url);
    fs.unlinkSync(file.path);
  }
  data.imageCover = urls[0];
  data.demoVideoId = urls[3];
  data.detailDescription = [
    {
      title: title1,
      content: detailDescription1,
      imgURL: urls[1]
    },
    {
      title: title2,
      content: detailDescription2,
      imgURL: urls[2]
    }
  ]
  await Course.create(data);

  res.redirect('/admin/index');
});

exports.getDetailCourse = catchAsync(async (req, res, next) => {
  const { user } = req;
  const { slug } = req.params;
  const course = await Course.findOne({ slug });
  res.render('admin/courses/course-detail', { user, course, title: course.slug.toUpperCase() })
});

exports.updateCourse = catchAsync(async (req, res, next) => {
  // get course by params
  const { courseName, price, shortDescription, trainerName, detailDescription1, title1, detailDescription2, title2 } = req.body;
  const urls = [];
  const { files } = req;
  const data = {
    courseName,
    trainerName,
    shortDescription,
    price: price.toString().split('.').splice(0, 1).join() * 1000
  }
  const _id = await (await Course.findOne({ slug: req.params.slug }))._id;
  if (!_id) {
    res.redirect('/admin/index');
  }
  // lấy dữ liệu gửi lên server
  for (const file of files) {
    let folder;
    const options = {}
    if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
      folder = "images"
    } else {
      folder = "video"
      options.resource_type = "video"
    }
    const nameVideos = file.filename.split(".").slice(0, -1).join(".");
    options.public_id = `${folder}/${nameVideos}`
    const uploader = async path => await cloudinary.uploads(path, options);
    const newPath = await uploader(file.path);
    urls.push(newPath.url);
    fs.unlinkSync(file.path);
  }
  data.imageCover = urls[0];
  data.detailDescription = [
    {
      title: title1,
      content: detailDescription1,
      imgURL: urls[1]
    },
    {
      title: title2,
      content: detailDescription2,
      imgURL: urls[2]
    }
  ]
  if (urls.length == 4) {
    data.demoVideoId = urls[3];
  }
  // update dữ liệu vào db
  await Course.findByIdAndUpdate({ _id }, data, { runValidators: true });
  res.redirect("back")
});


exports.getAddSection = catchAsync(async (req, res, next) => {
  const user = req.user
  res.render('admin/section/new-section', { user })
});

exports.postAddSection = catchAsync(async (req, res, next) => {
  const { sectionTitle, sectionDescription } = req.body
  const { file } = req;
  const { slug } = req.params;
  const courseId = (await Course.findOne({ slug }))._id;
  const nameVideos = file.filename.split(".").slice(0, -1).join(".");
  const options = {
    public_id: `images/${nameVideos}`
  }
  const uploader = async path => await cloudinary.uploads(path, options)
  const imageCover = (await uploader(file.path)).url
  fs.unlinkSync(file.path)
  const data = { sectionTitle, sectionDescription, imageCover, courseId }
  await Section.create(data);
  res.redirect("back")
});

exports.getAddLesion = catchAsync(async (req, res, next) => {
  const { user } = req
  res.render('admin/lession/new-lession', { user, title: "Add New Lession" })
});

exports.postAddLesion = catchAsync(async (req, res, next) => {
  const { user } = req
  const { lessonTitle, lessonDescription } = req.body
  const { file } = req;
  const { slug2 } = req.params;
  const sectionId = (await Section.findOne({ slug: slug2 }))._id;
  if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
    res.render('admin/lession/new-lession', { user, title: "Add New Lession", message: "vui long chon video" })
  }
  const nameVideos = file.filename.split(".").slice(0, -1).join(".");
  const options = {
    resource_type: "video",
    public_id: `video/${nameVideos}`
  }
  const uploader = async path => await cloudinary.uploads(path, options)
  const videoId = (await uploader(file.path)).url
  fs.unlinkSync(file.path)
  const data = { lessonTitle, lessonDescription, videoId, sectionId }
  await Lesson.create(data);
  res.redirect("back")
});