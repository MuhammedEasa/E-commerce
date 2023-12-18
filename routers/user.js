const express = require("express");
const collection = require("../model/users/userdb");
const router = express.Router();
const session = require("express-session");
router.use(
  session({
    secret: "secret key",
    resave: false,
    saveUninitialized: true,
  })
);

const checkSessionAndBlocked = async (req, res, next) => {
  console.log('middleware')
  if (req.session.user) {
    const userDetials = await collection.findOne({ _id: req.session.user.user_id });
    console.log(userDetials)
    if (!userDetials.isBlocked) {
      // User is not blocked, proceed to the next middleware or route handler
      next();
    } else {
      // User is blocked, destroy the session and redirect
      req.session.destroy((err) => {
        if (err) {
          console.log("Error destroying session: ", err);
          res.redirect("/login");
        } else {
          res.redirect("/login");
        }
      });
    }
  } else {
    // No userId in session, redirect to the default page
    res.redirect("/login");
  }
};

//Controller Programs Requiring
// Get Controller
const {
  homeRouter,
  loginRouter,
  signupRouter,
  otpRouter,
  otpResend,
  forgotpassword,
  forgototpget,
  Newpassword,
  products,
  productdetails,
  cart,
  addTocart,
  removeItem,
  increase,
  decrease,
  Account,
  uploads,
  editprofile,
  addAddress,
  placeOrder,
  orderconfirmed,
  yourOrders,
  cancelOrder,
  returnOrder,
  removeOrder,
  changepassword,
  orderView,
  generateInvoice,
  logoutRouter,
  cancelOrdersPage,
  wallet,
  contact,
  contactSubmitForm,
  addtoWishlist,
  wishlist,
  removeWishlist,
} = require("../controllers/usercontroller");
// Post Controller
const {
  signupPostRouter,
  loginPostRouter,
  otpPostRouter,
  forgotpasswordpost,
  forgototppost,
  Newpasswordpost,
  editprofilepost,
  addAddressPost,
  placeOrderPost,
  changepasswordpost,
} = require("../controllers/usercontroller");
const {razorPayment} = require('../controllers/paymentController')
//  Home router
router.get("/", checkSessionAndBlocked, homeRouter);

// login Get Router
router.get("/login", loginRouter);
//Login Post Router
router.post("/login", loginPostRouter);
// Signup Get Router
router.get("/signup", signupRouter);
// Signup Post Router
router.post("/signup", signupPostRouter);
//  Otp Get Router
router.get("/otp", otpRouter);
// Resend Otp
router.get('/resendotp',otpResend)
// Otp Post Router
router.post("/otp", otpPostRouter);
// router to Get forget Password
router.get("/forgotPassword", forgotpassword);
// router to Get forget Password
router.post("/forgotPassword", forgotpasswordpost);
// router to Get ForgotOtp  Get
router.get('/forgotOtp',forgototpget)
// router to Post Forgot Otp
router.post('/forgotOtp',forgototppost)
// router to Get forget New Password
router.get("/forgotNewpassword", Newpassword);
// router to Get forget New Password
router.post("/forgotNewpassword", Newpasswordpost)
//Contact Page
router.get('/contact',checkSessionAndBlocked,contact)
// Category Page (product Listing)
router.get("/Products",checkSessionAndBlocked, products);
// Product Details
router.get("/productdetails/:id",checkSessionAndBlocked, productdetails);

//router to get add to cart page
router.get("/cart/:user_id",checkSessionAndBlocked, cart);

// Route to adding  the cart  in database GET
router.get("/addtocart/:product_id/:user_id",checkSessionAndBlocked, addTocart);

// Router for Wishlist Adding
router.get("/addtoWishlist/:id", checkSessionAndBlocked, addtoWishlist)
// Router for wishlist 
router.get('/wishlist',checkSessionAndBlocked,wishlist)
// Router for remove Product From Wishlist
router.get('/removeFromWishlist/:id',removeWishlist )

// for removing cart product
router.get("/removeCartItem/:item_id/:user_id", removeItem);
// Increase , decrease JSON routes
router.get("/api/increase/:id/:user_id", increase);
router.get("/api/decrease/:id/:user_id", decrease);
//router to get User Profile  page
router.get("/Account/:user_id",checkSessionAndBlocked, Account);
//router to get User Profile  Edit  page
router.get("/editprofile/:user_id",uploads, checkSessionAndBlocked,editprofile);
//router to get User Profile  Edit  page
router.post('/updateProfile/:user_id', uploads,checkSessionAndBlocked, editprofilepost);
// router to get Add address Page
router.get('/addAddress/:user_id',checkSessionAndBlocked,addAddress)
// router to Post Add address Page
router.post('/addAddress/:user_id',checkSessionAndBlocked,addAddressPost)
//router to get Place Order   page
router.get("/placeOrder",checkSessionAndBlocked, placeOrder);
//router to post Place Order page
router.post("/placeOrder",checkSessionAndBlocked, placeOrderPost);
//router to Get OrderConfirmed Page
router.get("/orderconfirmed/:user_id", checkSessionAndBlocked,orderconfirmed);
// router to Get Your Order Details Page
router.get("/yourOrders/:user_id",checkSessionAndBlocked,yourOrders)
// router to cancel the Orders
router.get('/returnOrder/:id',returnOrder)
// router to cancel the Orders
router.get('/cancelOrder/:id',cancelOrder)
// router to remove the Orders
router.get('/removeOrder/:id',removeOrder)
// router to Get Change Password  Page
router.get("/changepassword/:user_id",checkSessionAndBlocked,changepassword)
// router to Post Change Password  Page
router.post("/changepassword/:user_id",checkSessionAndBlocked,changepasswordpost)              
// router for RazorPay Payment
router.post('/create/orderId',razorPayment)
// Order View Page
router.get('/orderView/:id',checkSessionAndBlocked,orderView)
// Router For downloading Order Invoice
router.get('/generateInvoice/:id',generateInvoice)
//router for cancelOrdersPage
router.get("/cancelOrdersPage/:user_id",checkSessionAndBlocked,cancelOrdersPage)
// router to Get Wallet History  Page
router.get("/wallet/:user_id",checkSessionAndBlocked,wallet)
// contact Mail 
router.post('/contactSubmitForm',contactSubmitForm)

// Logout Router
router.get("/logout", logoutRouter);
module.exports = router;
