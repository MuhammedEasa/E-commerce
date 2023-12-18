const express = require("express");
const router = express.Router();
const nocache = require("nocache");
router.use(nocache());
const checkSession = async (req, res, next) => {
  if (req.session.username) {
    next();
  } else {
    // No userId in session, redirect to the default page
    res.redirect("/admin");
  }
};
// Get Request
const {
  adminLogin,
  dashboard,
  userlist,
  blockuser,
  adminlogout,
  productslists,
  addProductPage,
  toggleListProduct,
  editProduct,
  category,
  editcategory,
  uploads,
  addcategoryget,
  deleteCategory,
  deleteProduct,
  orderManagement,
  salesReport,
  search,
  offerManagement,
  addOffer,
  excelReport,
  salesPdf,

} = require("../controllers/admincontroller");

//Post Request

const {
  adminLoginPost,
  addProductPagepost,
  editRemoveImage,
  updateProduct,
  updatecategory,
  addcategory,
  updateSatus,
  addOfferPost,
  acceptCancelRequest,
  rejectCancelRequest
} = require("../controllers/admincontroller");

// Route to render the admin login page
router.get("/admin", adminLogin);

// Route to handle the admin login form submission
router.post("/admin", adminLoginPost);

// Route to render the admin dashboard
router.get("/admindashboard", checkSession,dashboard);

// Route to render the user management page
router.get("/usermanagement", checkSession, userlist);

// Route to block a user based on their ID
router.get("/blockuser/:id", blockuser);

// Route to render the product listing page
router.get("/productlisting",checkSession, productslists);

// Route to render the add product page
router.get("/addproduct", checkSession, addProductPage);

// Route to handle the submission of the add product form
router.post("/addproduct", uploads,checkSession, addProductPagepost);

// Route to toggle the listing status of a product based on its ID
router.get("/togglelist/:id", toggleListProduct);

// Route to render the edit product page based on its ID
router.get("/editproduct/:id",checkSession, editProduct);

// Route to  Remove Image From Edit Product
router.post('/remove-image',editRemoveImage)

// Route to handle the submission of the update product form based on its ID
router.post("/updateproduct/:id", uploads, checkSession,updateProduct);

// Route to render the category management page
router.get("/categorymanagement",checkSession, category);

// Route to render the edit category page based on its ID
router.get("/editcategory/:id",checkSession, editcategory);

// Route to handle the submission of the update category  based on its ID
router.post("/updatecategory/:id",checkSession, updatecategory);

// Route to render the add category page
router.get("/addcategory",checkSession, addcategoryget);

// Route to handle the submission of the add category form
router.post("/addcategory",checkSession, addcategory);

// Route to delete a category based on its ID
router.get("/deletecategory/:id", deleteCategory);

// Route to delete a product based on its ID
router.get("/deleteproduct/:id", deleteProduct);

// Route to render the Order management page
router.get("/orderManagement",checkSession, orderManagement);

// Route to Status Update Post
router.post("/updateStatus/:id/:_id", updateSatus);

// Route To SalesReport
router.get("/salesReport",checkSession,salesReport)

// Router for Seacrh
router.get('/search',search)

// Router to get Offer Mnagament
router.get('/offerManagement',checkSession, offerManagement)

//Router For Add Offer
router.get('/addOffer',checkSession,addOffer)

// post Router for Add Offer
router.post('/addOffer',checkSession,addOfferPost)
// Chart Excel Donwloading
router.get('/excelReport',excelReport)
// Router For Chart Pdf Downloading
router.get('/salesgeneratepdf',salesPdf)
// roiuter for cancel request accept
router.post('/acceptCancelRequest/:userId/:productId/:orderId',acceptCancelRequest)
// roiuter for cancel request accept
router.post('/rejectCancelRequest/:userId/:productId/:orderId',rejectCancelRequest)

// Logout Router
router.get("/adminlogout", adminlogout);
module.exports = router;
