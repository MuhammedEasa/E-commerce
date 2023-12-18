const collection = require("../model/users/userdb");
const nodemailer = require("nodemailer");
const Product = require("../model/product/productdb");
const Cart = require("../model/addToCart/cartSchema");
const accountPic = require("../model/account/profileImagedb");
const addressdbs = require("../model/account/addressdb");
const orderDb = require("../model/account/orderdb");
const offerdb = require("../model/offer/offerSchema");
const wallet = require("../model/users/wallet");
const wishlistDb = require("../model/wishlist/wishlist");
const multer = require("multer");
const PDFDocument = require("pdfkit");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads");
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now() + "-" + file.originalname);
  },
});
exports.uploads = multer({ storage: storage }).single("img");

// Creating a Nodemailer Transporter For sending OTP emails
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.Email,
    pass: process.env.EmailPassword,
  },
});
// Store  the user details

let userdetails;

const generateOtp = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

const generateReferralCode = (length) => {
  const characters =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let referralCode = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    referralCode += characters[randomIndex];
  }
  return referralCode;
};
// home router
exports.homeRouter = async (req, res) => {
  try {
    let user = req.session.user;
    const products = await Product.find({ isListed: true });
    let userName = user.username;
    let userId = user.user_id;
    res.render("home", { userName: userName, userId: userId, products });
  } catch (error) {
    console.log(error);
  }
};
// Login Get Router
exports.loginRouter = (req, res) => {
  if (req.session.user) {
    res.redirect("/");
  } else {
    res.render("login");
  }
};
//SignUp Router
exports.signupRouter = (req, res) => {
  res.render("signup");
};

//Email validation
function isEmailValid(email) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

// Otp Get Router
exports.otpRouter = (req, res) => {
  console.log("Otp Get");
  res.render("otp");
};
// Otp Resend
exports.otpResend = async (req, res) => {
  console.log(userdetails.email);

  // Set OTP to null
  await collection.updateOne(
    { email: userdetails.email },
    {
      $set: {
        otp: null, // Set OTP to null after verification
      },
    }
  );

  const resendotp = generateOtp();
  console.log("resendotp is:" + resendotp);

  // Update with new OTP
  await collection.updateOne(
    { email: userdetails.email },
    {
      $set: {
        otp: resendotp,
      },
    }
  );

  const mailOptions = {
    from: process.env.Email,
    to: userdetails.email,
    subject: "OTP Verification",
    text: `Your OTP is: ${resendotp}. Please don't share your OTP with others`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
      return res.render("signup", { message: "Failed to send OTP" });
    }

    console.log("OTP sent: " + info.response);

    res.render("otp", {
      message: "New OTP sent successfully. Check your email.",
    });
  });
};
let users;

// Signup Post Router
exports.signupPostRouter = async (req, res) => {
  const data = {
    username: req.body.username,
    email: req.body.email,
    phoneNumber: req.body.phoneNumber,
    password: req.body.password,
  };
  if (!isEmailValid(data.email)) {
    return res
      .status(400)
      .json({ success: false, message: "Email is not valid" });
  }

  try {
    // Checking duplicate email
    const userExists = await collection.findOne({ email: data.email });
    const numExists = await collection.findOne({
      phoneNumber: data.phoneNumber,
    });

    if (!userExists) {
      if (!numExists) {
        if (req.body.referralCode) {
          let code = req.body.referralCode;
          users = await collection.findOne({ referralCode: code });
          if (users) {
            const referaluser = await collection.findOne({
              referralCode: code,
            });
            await collection
              .updateOne({ referralCode: code }, { $inc: { wallet: 100 } })
              .then((x) => {
                console.log("100 rs added");
              });
            // Update the wallet for the user
            const walletUpdate = new wallet({
              Email: referaluser.email,
              date: new Date(),
              amount: 100,
              creditordebit: "Credited",
            });

            await walletUpdate.save();
          } else {
            return res
              .status(400)
              .json({ success: false, message: "Referral code not found" });
          }
        }

        // Generating Otp
        const otp = generateOtp();
        console.log(otp);
        // Store OTP in the database
        await collection.create({ email: data.email, otp: otp });
        const mailOptions = {
          from: process.env.Email,
          to: data.email,
          subject: "OTP Verification",
          text: `Your OTP is: ${otp}. Please don't share your OTP with others`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error(error);
            return res
              .status(500)
              .json({ success: false, message: "Failed to send OTP" });
          }

          console.log("OTP sent: " + info.response);
          let referalgenerate = generateReferralCode(8);
          console.log("Gneerate", referalgenerate);
          // Store user details and OTP in memory
          console.log("users", users);
          userdetails = {
            username: data.username,
            email: data.email,
            phoneNumber: data.phoneNumber,
            password: data.password,
            referralCode: referalgenerate,
            wallet: users ? 50 : 0,
          };
          console.log(userdetails);
          res.status(200).json({ success: true, redirect: "/otp" });
        });
      } else {
        res
          .status(400)
          .json({ success: false, message: "Phone number already exists." });
      }
    } else {
      res
        .status(400)
        .json({ success: false, message: "Email already exists!!" });
    }
  } catch (e) {
    console.log(e);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Otp Post Router
exports.otpPostRouter = async (req, res) => {
  const { digit1, digit2, digit3, digit4 } = req.body;
  const userEnteredOTP = digit1 + digit2 + digit3 + digit4;
  const userRecord = await collection.findOne({ email: userdetails.email });

  if (userEnteredOTP === userRecord.otp) {
    // Update user details in the database
    userRecord.set({
      username: userdetails.username,
      phoneNumber: userdetails.phoneNumber,
      password: userdetails.password,
      isOtpVerified: true,
      otp: null, // Set OTP to null after verification
      referralCode: userdetails.referralCode,
      wallet: userdetails.wallet, // Assuming wallet is a property of userdetails
    });

    const walletHistory = new wallet({
      Email: userdetails.email,
      date: new Date(),
      amount: userdetails.wallet,
      creditordebit: "Credited",
    });

    await walletHistory.save();

    await userRecord.save(); // Save the changes to the user record

    console.log(userRecord);
    console.log("User registered successfully!!");
    res.redirect("/login");
  } else {
    res.render("otp", { message: "Invalid OTP Entered!" });
  }
};

//Login Post Router
exports.loginPostRouter = async (req, res) => {
  const { email, password } = req.body;
  console.log(email, password);
  if (!isEmailValid(email)) {
    console.log("Invalid Email Format");
    return res.render("login", { message: "Invalid Email format" });
  }

  if (!password || password.trim() === "") {
    console.log("Password Must Be filled");
    return res.render("login", { message: "Please fill the Password field" });
  } else {
    try {
      const check = await collection.findOne({ email: email });

      if (!check) {
        res.render("signup", {
          message: "You Dont Have Account Please Create One",
        });
      } else {
        if (check) {
          if (
            req.body.password === check.password &&
            req.body.email === check.email
          ) {
            console.log(check._id);
            req.session.user = {
              username: check.username,
              user_id: check._id,
            };
            res.redirect("/");
          } else {
            res.render("login", { message: "Wrong password or username" });
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  }
};

//Forget Password Get Request
exports.forgotpassword = (req, res) => {
  res.render("forgotpassword");
};
// Forget password Post Request
exports.forgotpasswordpost = async (req, res) => {
  const email = req.body.email;
  try {
    const user = await collection.findOne({ email });
    if (!user) {
      res.render("forgotpassword", { message: "Email not found" });
    } else {
      // Generating Otp
      const otp = generateOtp();
      console.log(otp);
      // Store OTP in the database
      await collection.updateOne({ email: email, otp: otp });
      const mailOptions = {
        from: process.env.Email,
        to: email,
        subject: "OTP Verification",
        text: `Your OTP is: ${otp} for Password Changing. Please don't share your OTP with others`,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error(error);
          return res.render("forgotOtp", {
            message: "Failed to send OTP",
          });
        }

        console.log("OTP sent: " + info.response);
        // Store user details and OTP in memory
        userdetails = { email: email };
        res.render("forgotOtp", {
          message: "OTP sent successfully. Check your email.",
        });
      });
    }
  } catch (error) {}
};

// forgot Otp Get
exports.forgototpget = (req, res) => {
  res.render("forgotOtp");
};
// Forgot Otp post
exports.forgototppost = async (req, res) => {
  const { digit1, digit2, digit3, digit4 } = req.body;
  const userEnteredOTP = digit1 + digit2 + digit3 + digit4;
  const userRecord = await collection.findOne({ email: userdetails.email });
  console.log(userRecord);
  if (userEnteredOTP === userRecord.otp) {
    // Store user details in the database
    await collection.updateOne(
      { email: userdetails.email },
      {
        $set: {
          isOtpVerified: true,
          otp: null, // Set OTP to null after verification
        },
      }
    );

    console.log(" Forgot Password Otp Authentication Successfull !!");

    res.redirect("/forgotNewpassword");
  } else {
    res.render("otp", { message: "Invalid OTP Entered!" });
  }
};
// Forgot New password get
exports.Newpassword = (req, res) => {
  res.render("forgotNewpassword");
};
// forgot New Password Post
exports.Newpasswordpost = async (req, res) => {
  let newPassword = req.body.newPassword;
  let confirmPassword = req.body.confirmPassword;

  // Check if new password is empty or whitespace

  if (newPassword === confirmPassword) {
    // Update the password
    await collection.updateOne(
      { email: userdetails.email },
      { $set: { password: newPassword } }
    );
    res.redirect("/login");
  } else {
    // confirm password is not correct . render the  error Page
    res.render("error");
  }
};

// Category Page (Product Listing)
exports.products = async (req, res) => {
  let user = req.session.user;
  let userName = user.username;
  let userId = user.user_id;
  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = 6;
  const skip = (page - 1) * limit;

  // Count total number of orders
  const totalOrdersCount = await Product.countDocuments({ isListed: true });
  // Calculate total pages based on the total number of orders and the limit per page
  const totalPages = Math.ceil(totalOrdersCount / limit);

  // Fetch products with pagination
  const products = await Product.find({ isListed: true })
    .skip(skip)
    .limit(limit);

  res.render("Products", {
    userName: userName,
    products,
    userId: userId,
    currentPage: page,
    totalPages,
  });
};

// Product details
exports.productdetails = async (req, res) => {
  let user = req.session.user;
  console.log("entered in productdetails router");
  console.log(user);

  const id = req.params.id;
  // const products = await Product.find({ isListed: true })
  let userName = user.username;
  let userId = user.user_id;
  const products = await Product.findById(id);
  const currentDate = new Date();
  const offers = await offerdb.find({
    startDate: { $lte: currentDate },
    endDate: { $gte: currentDate },
  });
  res.render("productdetails", {
    userName: userName,
    userId: userId,
    products,
    offers,
  });
};

// Cart Get Render
exports.cart = async (req, res) => {
  try {
    const user = req.session.user;
    const { user_id } = req.params;
    const userName = user.username;

    const cartItems = await Cart.find({ userid: user_id });
    const offers = await offerdb.find();

    // Calculate total price using reduce
    const totalPrice = cartItems.reduce((acc, item) => {
      return acc + item.price * item.quantity;
    }, 0);

    let isOfferApplicable = false;
    let discount = 0.0;

    offers.forEach((offer) => {
      if (
        offer.applicableProducts &&
        offer.applicableProducts.some((item) =>
          cartItems.some((cartItem) => item === cartItem.product)
        )
      ) {
        // If any product is applicable for the offer
        isOfferApplicable = true;
        discount = totalPrice * (offer.discount / 100);
        return;
      }
    });
    // Calculate tax (15% of the total price)
    const tax = totalPrice * 0.15;

    // Calculate the final total price
    const finalTotalPrice = totalPrice - discount + tax;

    res.render("Cart", {
      cartItems,
      userName,
      userid: user_id,
      totalPrice: totalPrice.toFixed(2),
      discount: discount.toFixed(2),
      tax: tax.toFixed(2),
      finalTotalPrice: finalTotalPrice.toFixed(2),
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

// functions
// Helper function to get updated cart information
async function getUpdatedCart(user_id) {
  const cartItems = await Cart.find({ userid: user_id });
  const offers = await offerdb.find();
  // Calculate total price using reduce
  const totalPrice = cartItems.reduce((acc, item) => {
    return acc + item.price * item.quantity;
  }, 0);

  let isOfferApplicable = false;
  let discount = 0.0;

  offers.forEach((offer) => {
    if (
      offer.applicableProducts &&
      offer.applicableProducts.some((item) =>
        cartItems.some((cartItem) => item === cartItem.product)
      )
    ) {
      // If any product is applicable for the offer
      isOfferApplicable = true;
      discount = totalPrice * (offer.discount / 100);
      return;
    }
  });

  // Calculate tax (15% of the total price)
  const tax = totalPrice * 0.15;

  // Calculate the final total price
  const finalTotalPrice = totalPrice - discount + tax;

  return { cartItems, totalPrice, discount, tax, finalTotalPrice };
}

// Add to Cart Get Request
exports.addTocart = async (req, res) => {
  console.log("Entered Cart Get");
  const { product_id, user_id } = req.params;
  // Fetch product details
  const product = await Product.findById(product_id);

  // Check if product already exists in cart
  const existingProduct = await Cart.findOne({
    productid: product_id,
    userid: user_id,
  });

  if (existingProduct) {
    // If product exists, increase the quantity and update the total
    console.log("Before increment:", existingProduct.quantity);
    existingProduct.quantity = existingProduct.quantity + 1;
    console.log("After increment:", existingProduct.quantity);

    existingProduct.total = existingProduct.quantity * product.price;
    await existingProduct.save();
  } else {
    // If product doesn't exist, add a new entry to the cart
    const newProduct = new Cart({
      userid: user_id,
      productid: product_id,
      product: product.productname,
      price: product.price,
      total: product.price,
      quantity: 1,
      image: product.image,
    });
    await newProduct.save();
  }
  res.redirect("/Products");
};

// Cart remove Get
exports.removeItem = async (req, res) => {
  console.log("remove");
  const item_id = req.params.item_id;
  const user_id = req.params.user_id;
  console.log(user_id);
  // Remove the item from the cart
  await Cart.findByIdAndDelete(item_id);

  res.redirect(`/cart/${user_id}`);
};

// Quantity Increase
exports.increase = async (req, res) => {
  const { id, user_id } = req.params;
  const item = await Cart.findOne({ _id: id });
  const product = await Product.findOne({ _id: item.productid });
  if (item.quantity < product.stock) {
    item.quantity++;
    await item.save();
    console.log(user_id);
    const updatedCart = await getUpdatedCart(user_id);

    if (req.headers.accept.includes("json")) {
      // If JSON request, send JSON response with updated cart info
      return res.json({ success: true, item, ...updatedCart });
    } else {
      // If HTML request, redirect
      return res.redirect(`/cart/${user_id}`);
    }
  } else {
    const errorMessage = "Not enough stock available.";
    if (req.headers.accept.includes("json")) {
      // If JSON request, send JSON response with the error message
      return res.status(400).json({ success: false, message: errorMessage });
    }
  }
};

// Quantity decrease

exports.decrease = async (req, res) => {
  const { id, user_id } = req.params;
  const item = await Cart.findOne({ _id: id });

  if (item.quantity > 1) {
    item.quantity--;
    await item.save();
  }

  const updatedCart = await getUpdatedCart(user_id);

  if (req.headers.accept.includes("json")) {
    // If JSON request, send JSON response with updated cart info
    return res.json({ success: true, item, ...updatedCart });
  } else {
    return res.redirect(`/cart/${user_id}`);
  }
};
// Add to Wishlist
exports.addtoWishlist = async (req, res) => {
  console.log("entered");
  const user = req.session.user;
  const username = user.username;
  let userId = user.user_id;
  const productId = req.params.id;
  console.log("userID", userId);
  console.log("productID", productId);
  const productitem = await Product.findOne({ _id: productId });
  console.log("aaa", productitem);

  // Check if product already exists in wishlist
  const existingProduct = await wishlistDb.findOne({
    productId: productId,
    userId: userId,
  });

  if (existingProduct) {
    console.log("entered in existing");
    res.redirect(`/productdetails/${productId}`);
  } else {
    try {
      const newWishlist = await wishlistDb.create({
        userId: userId,
        user: username,
        productId: productId,
        product: productitem.productname,
        price: productitem.price,
        image: productitem.image[0],
      });

      console.log('Wishlist item saved:', newWishlist);
      res.redirect(`/productdetails/${productId}`);
    } catch (error) {
      console.error('Error saving wishlist item:', error);
      // Handle the error appropriately, you may want to send an error response or redirect to an error page
      res.status(500).send('Internal Server Error');
    }
  }
};

exports.wishlist = async (req, res) => {
  let user = req.session.user;
  let userName = user.username;
  let userId = user.user_id;
  console.log(userId);
  const wishlistshow = await wishlistDb.find({userId:userId})
  res.render("wishlist", { userName: userName, userid: userId ,wishlistshow});
};

//remove wishlist
exports.removeWishlist = async (req,res)=>{
  try {
    await wishlistDb.findByIdAndDelete(req.params.id)
    res.redirect('/wishlist')
  } catch (err) {
    console.log(err)
    res.send('Error while trying to remove product from wishlist.')
  }
}

// User Account Profile Get
exports.Account = async (req, res) => {
  let user = req.session.user;

  let userName = user.username;
  let userId = user.user_id;
  let userdetails = await collection.findOne({ _id: userId });
  console.log(userId);
  let profileImg = await accountPic.findOne({ userid: userId });
  let address = await addressdbs.find({ userId: userId });
  console.log(profileImg);
  console.log(address);
  res.render("Profile", {
    userName: userName,
    userId: userId,
    userdetails,
    profileImg,
    address,
  });
};
// Profile Editing Get
exports.editprofile = async (req, res) => {
  try {
    let user = req.session.user;
    console.log("entered Editprofile get router");

    let userName = user.username;
    let userId = user.user_id;
    let userdetails = await collection.findOne({ _id: userId });
    let profileImg = await accountPic.findOne({ userid: userId });

    res.render("editprofile", {
      userName: userName,
      userId: userId,
      userdetails,
      profileImg,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};
// Profile editing Post
exports.editprofilepost = async (req, res) => {
  try {
    let user = req.session.user;

    let userId = user.user_id;
    let userName = user.username;
    const newName = req.body.name;
    const newEmail = req.body.email;

    let newProfilePic;

    // Check if req.file is defined
    if (req.file) {
      newProfilePic = req.file.path;
      console.log("New profile picture uploaded:", req.file);
    } else {
      // Use the previous profile picture path
      let profileImg = await accountPic.findOne({ userid: userId });
      if (profileImg) {
        newProfilePic = profileImg.profilePic;
        console.log("No new profile picture uploaded. Using the previous one.");
      }
    }

    await collection.updateOne(
      { _id: userId },
      {
        $set: {
          username: newName,
          email: newEmail,
        },
      },
      { upsert: true }
    );

    // Update the existing document for the user
    let newPic = await accountPic.updateOne(
      { userid: userId },
      { $set: { profilePic: newProfilePic } },
      { upsert: true } // Create a new document if it doesn't exist
    );

    try {
      console.log(newPic);
      res.redirect(`/Account/${userId}`);
    } catch (error) {
      console.log("Error:", error);
      res.status(500).send(error);
    }
  } catch (err) {
    console.error(err);
  }
};

// Add address Get
exports.addAddress = (req, res) => {
  let user = req.session.user;

  let userName = user.username;
  let userId = user.user_id;
  res.render("addAddress", { userName: userName, userId: userId });
};

// Add address Post
exports.addAddressPost = async (req, res) => {
  let user = req.session.user;

  let userId = user.user_id;

  try {
    const { firstname, lastname, address, city, state, pincode } = req.body;
    // Create a new address instance
    const newAddress = new addressdbs({
      userId,
      firstname,
      lastname,
      address,
      city,
      state,
      pincode,
    });
    console.log(newAddress);
    // Save the new address to MongoDB
    await newAddress.save();

    res.redirect(`/Account/${userId}`);
  } catch (error) {
    console.error("Error saving address to MongoDB:", error);
    res.status(500).send("Internal Server Error");
  }
};

// Place Order Get
exports.placeOrder = async (req, res) => {
  let user = req.session.user;

  let userName = user.username;
  let userId = user.user_id;
  const cart = await Cart.find({ userid: userId });
  const userde = await collection.findOne({ _id: userId });
  let address = await addressdbs.find({ userId: userId });
  const offers = await offerdb.find();

  // Calculate total price using reduce
  const totalPrice = cart.reduce((acc, item) => {
    return acc + item.price * item.quantity;
  }, 0);

  let isOfferApplicable = false;
  let discount = 0.0;

  offers.forEach((offer) => {
    if (
      offer.applicableProducts &&
      offer.applicableProducts.some((item) =>
        cart.some((cartItem) => item === cartItem.product)
      )
    ) {
      // If any product is applicable for the offer
      isOfferApplicable = true;
      discount = totalPrice * (offer.discount / 100);
      return;
    }
  });
  // Calculate tax (15% of the total price)
  const tax = totalPrice * 0.15;

  // Calculate the final total price
  const finalTotalPrice = totalPrice - discount + tax;
  res.render("placeOrder", {
    userName,
    userId,
    userde,
    address,
    cart,
    finalTotalPrice,
  });
};

// Place Order Post
exports.placeOrderPost = async (req, res) => {
  try {
    let user = req.session.user;
    console.log("request body is", req.body);
    const selectedAddress = JSON.parse(req.body.selectedAddress);
    console.log(selectedAddress);
    const paymentMethod = req.body.paymentmode;
    let userId = user.user_id;
    let userName = user.username;
    const cart = await Cart.find({ userid: userId });
    const user1 = await collection.find({ _id: userId });
    console.log("Place Order collection", user1);
    console.log("User id ", userId);

    const offers = await offerdb.find();

    let products = [];
    let totalQuantity = 0;
    let totalCartPrice = 0;

    for (const cartItem of cart) {
      products.push({
        productid: cartItem.productid,
        product: cartItem.product,
        quantity: cartItem.quantity,
        price: cartItem.price,
        status: "Pending",
      });

      const totalsPrice = cart.reduce((acc, item) => {
        return acc + item.price * item.quantity;
      }, 0);

      let isOfferApplicable = false;
      let discount = 0.0;

      offers.forEach((offer) => {
        if (
          offer.applicableProducts &&
          offer.applicableProducts.some((item) =>
            cart.some((cartItem) => item === cartItem.product)
          )
        ) {
          // If any product is applicable for the offer
          isOfferApplicable = true;
          discount = totalsPrice * (offer.discount / 100);
          return;
        }
      });

      // Calculate tax (15% of the total price)
      const tax = totalsPrice * 0.15;

      // Calculate the final total price
      totalCartPrice += totalsPrice - discount + tax;

      totalQuantity += cartItem.quantity;

      await Product.updateOne(
        { _id: cartItem.productid },
        { $inc: { stock: -cartItem.quantity } }
      );
    }

    // Deduct wallet balance if payment method is a wallet
    if (paymentMethod === "wallet") {
      // Fetch user's wallet balance
      const userWalletDoc = await collection.findOne({ username: userName });
      console.log(userWalletDoc);
      if (userWalletDoc && userWalletDoc.wallet) {
        let userWallet = userWalletDoc.wallet;
        console.log(totalCartPrice);
        if (userWallet >= totalCartPrice) {
          // Sufficient balance in the wallet
          userWallet -= totalCartPrice;

          // Update the user's wallet balance
          await collection.updateOne(
            { username: userName },
            { $set: { wallet: userWallet } }
          );

          // the wallet History
          const walletOrder = new wallet({
            Email: user1[0].email,
            date: new Date(),
            amount: -totalCartPrice,
            creditordebit: "Debited",
          });

          await walletOrder.save();
        } else {
          // Insufficient balance, handle accordingly (e.g., show an error message)
          return res.status(400).send("Insufficient wallet balance");
        }
      } else {
        // User document or wallet field not found, handle accordingly
        return res.status(400).send("User not found or wallet field missing");
      }
    }

    const newOrder = new orderDb({
      userId: userId,
      username: userName,
      products: products,
      totalQuantity: totalQuantity,
      totalPrice: totalCartPrice,
      address: {
        address: selectedAddress.address,
        city: selectedAddress.city,
        state: selectedAddress.state,
        pincode: selectedAddress.pincode,
      },
      paymentMethod: paymentMethod,
      orderDate: new Date(),
      deliveryDate: new Date().setDate(new Date().getDate() + 7), // set delivery date to one week from now
    });

    await newOrder.save();
    console.log(newOrder);
    await Cart.deleteMany({ userid: userId });
    res.redirect(`/orderconfirmed/${userId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

//orderConfirmed Get
exports.orderconfirmed = (req, res) => {
  res.render("orderConfirmed");
};

// Your Orders Get
exports.yourOrders = async (req, res) => {
  let user = req.session.user;
  let page = parseInt(req.query.page) || 1;
  let limit = 8;
  let skip = (page - 1) * limit;

  try {
    let userName = user.username;
    let userId = user.user_id;

    // Count total number of orders
    const totalOrdersCount = await orderDb.countDocuments({ userId: userId });

    // Calculate total pages based on the total number of orders and the limit per page
    const totalPages = Math.ceil(totalOrdersCount / limit);

    // Retrieve orders for the current page
    const orders = await orderDb
      .find({ userId: userId })
      .skip(skip)
      .limit(limit);
    // Generate unique order IDs
    const orderIds = orders.map((order, orderIndex) => {
      return order.products.map((product, productIndex) => {
        const uniqueId = totalOrdersCount + orderIndex + 1;
        const pageSpecificId = `ODR${uniqueId
          .toString()
          .padStart(4, "0")}-${page}-${productIndex + 1}`;
        return pageSpecificId;
      });
    });

    res.render("yourOrders", {
      userName: userName,
      userId: userId,
      orders,
      orderIds,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Server Error");
  }
};
//Cancel Order
exports.cancelOrder = async (req, res) => {
  try {
    console.log("Hey");
    const user = req.session.user;
    const userId = user.user_id;
    console.log(req.params.id);

    // Find the order and update its status
    const order = await orderDb.findOne({ _id: req.params.id });

    if (!order) {
      return res.status(404).send("Order not found");
    }

    // Update status for each product in the order
    order.products.forEach((productData) => {
      productData.status = "Cancelled";
    });

    await order.save();

    if (
      order.paymentMethod === "wallet" ||
      order.paymentMethod === "net-banking"
    ) {
      // If the payment was made using wallet or net banking, add back the amount to the user's wallet balance
      let user1 = await collection.findById(userId);

      if (!user1) {
        return res.status(404).send("User not found");
      }

      let walletBalance = user1.wallet || 0;
      console.log("Before", walletBalance);

      let refundAmount = order.totalPrice;
      walletBalance += refundAmount;

      // Save the wallet transaction
      const walletOrder = new wallet({
        Email: user1.email,
        date: new Date(),
        amount: refundAmount,
        creditordebit: "Credited",
      });

      await walletOrder.save();

      // Update the user's wallet balance
      user1.wallet = walletBalance;
      await user1.save();
    }

    console.log("Order Cancel Was Successful");
    res.redirect(`/yourOrders/${userId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// Return Order
exports.returnOrder = async (req, res) => {
  try {
    let user = req.session.user;
    let userId = user.user_id;

    // Find the order and update its status
    let order = await orderDb.findOne({ _id: req.params.id });

    if (!order) {
      return res.status(404).send("Order not found");
    }

    order.products.forEach((productData) => {
      productData.status = "Return Requested";
    });

    await order.save();

    console.log("Return request submitted successfully");
    res.redirect(`/yourOrders/${userId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

//remove Orders
exports.removeOrder = async (req, res) => {
  try {
    let user = req.session.user;
    let userId = user.user_id;
    await orderDb.findByIdAndDelete(req.params.id);
    console.log("deletion Successfull");
    res.redirect(`/yourOrders/${userId}`);
  } catch (err) {
    res.status(500).send("Server Error");
  }
};
// Change Password Get
exports.changepassword = (req, res) => {
  let user = req.session.user;

  let userId = user.user_id;
  res.render("changepassword", { userId });
};
// Change Password Post
exports.changepasswordpost = async (req, res) => {
  let user = req.session.user;

  let userId = user.user_id;
  let oldPassword = req.body.oldPassword;
  let newPassword = req.body.newPassword;
  let confirmPassword = req.body.confirmPassword;

  if (newPassword === confirmPassword) {
    // Find the user
    let currentUser = await collection.findOne({ _id: userId });

    // Check if old password is correct
    if (currentUser && currentUser.password === oldPassword) {
      // Update the password
      await collection.updateOne(
        { _id: userId },
        { $set: { password: newPassword } }
      );
      res.redirect("/login");
    }
  }
};

exports.orderView = async (req, res) => {
  const orderId = req.params.id;
  let user = req.session.user;
  const order = await orderDb.findOne({ _id: orderId });
  let userName = user.username;
  let userId = user.user_id;
  res.render("orderView", {
    order,
    generateUniqueID,
    generateUniqueProductID,
    userName,
    userId,
  });
};

// Downloading Order Details Invoice
exports.generateInvoice = async (req, res) => {
  try {
    let user = req.session.user;
    let userId = user.user_id;
    console.log(userId);
    const orderId = req.params.id;
    console.log("Entered");

    const invoiceDetails = await collection.findOne({ _id: userId });
    console.log("Invoice", invoiceDetails);

    const specificOrder = await orderDb.findById(orderId).populate("products");
    console.log("Invoice", specificOrder);

    // Create a new PDF document
    const doc = new PDFDocument();

    // Set response headers to trigger a download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="invoice.pdf"');
    // Pipe the PDF document to the response
    doc.pipe(res);
    const imagePath = "public/img/logo.png"; // Change this to the path of your image
    const imageWidth = 100; // Adjust image width based on your layout
    const imageX = 550 - imageWidth; // Adjust X-coordinate based on your layout
    const imageY = 50; // Adjust Y-coordinate to place the image at the top
    doc.image(imagePath, imageX, imageY, { width: imageWidth });

    // Move to the next section after the image
    doc.moveDown(1);

    // Add content to the PDF document
    doc.fontSize(16).text("Billing Details", { align: "center" });
    doc.moveDown(1);
    doc.fontSize(10).text("Customer Details", { align: "center" });
    doc.text(`Order ID: ${orderId}`);
    doc.moveDown(0.3);
    doc.text(`Name: ${invoiceDetails.username || ""}`);
    doc.moveDown(0.3);
    doc.text(`Email: ${invoiceDetails.email || ""}`);
    doc.moveDown(0.3);
    doc.text(`Phone: ${invoiceDetails.phoneNumber || ""}`);

    doc.moveDown(0.3);
    const address = specificOrder.address;
    doc.text(
      `Address: ${address.address}, ${address.city}, ${address.state} ${
        address.pincode || ""
      }`
    );
    doc.moveDown(0.3);
    doc.text(`Payment Method: ${specificOrder.paymentMethod || ""}`);

    doc.moveDown(0.3);

    const headerY = 300; // Adjust this value based on your layout
    doc.font("Helvetica-Bold");
    doc.text("Name", 100, headerY, { width: 150, lineGap: 5 });
    doc.text("Status", 300, headerY, { width: 150, lineGap: 5 });
    doc.text("Quantity", 400, headerY, { width: 50, lineGap: 5 });
    doc.text("Price", 500, headerY, { width: 50, lineGap: 5 });
    doc.font("Helvetica");

    // Table rows
    const contentStartY = headerY + 30; // Adjust this value based on your layout
    let currentY = contentStartY;
    specificOrder.products.forEach((product, index) => {
      doc.text(product.product || "", 100, currentY, {
        width: 150,
        lineGap: 5,
      });

      doc.text(product.status || "", 300, currentY, {
        width: 50,
        lineGap: 5,
      });
      doc.text(product.quantity || "", 400, currentY, {
        width: 50,
        lineGap: 5,
      });

      doc.text(product.price || "", 500, currentY, {
        width: 50,
        lineGap: 5,
      });
      console.log("Reached Here");

      // Calculate the height of the current row and add some padding
      const lineHeight = Math.max(
        doc.heightOfString(product.product || "", { width: 150 }),
        doc.heightOfString(product.status || "", { width: 150 }),
        doc.heightOfString(specificOrder.totalQuantity[index] || "", {
          width: 50,
        }),
        doc.heightOfString(product.price || "", { width: 50 })
      );
      currentY += lineHeight + 10; // Adjust this value based on your layout
    });
    doc.text(`Total Price: ${specificOrder.totalPrice || ""}`, {
      width: 400, // Adjust the width based on your layout
      lineGap: 5,
    });

    // Set the y-coordinate for the "Thank you" section
    const separation = 50; // Adjust this value based on your layout
    const thankYouStartY = currentY + separation; // Update this line

    // Move to the next section
    doc.y = thankYouStartY; // Change this line

    // Move the text content in the x-axis
    const textX = 60; // Adjust this value based on your layout
    const textWidth = 500; // Adjust this value based on your layout
    doc
      .fontSize(16)
      .text(
        "Thank you for choosing E-Cart! We appreciate your support and are excited to have you as part of our  family.",
        textX,
        doc.y,
        { align: "left", width: textWidth, lineGap: 10 }
      );

    doc.end();
  } catch (error) {
    res.render("error");
  }
};

// Gerate Id Functions Starts
function generateUniqueID() {
  // Generate a random four-digit number
  let id = Math.floor(100 + Math.random() * 900);
  // Prepend "ORD" to the id
  return "ORD" + id;
}

function generateUniqueProductID(orderID, index) {
  // Generate a random four-digit number
  let id = Math.floor(100 + Math.random() * 900);
  // Prepend "PRD" and order ID to the id
  return "PRD" + orderID.slice(-4) + "-" + id + "-" + index;
}
// Gerate Id Functions Ends

//cancelOrdersPage Get
exports.cancelOrdersPage = async (req, res) => {
  try {
    let user = req.session.user;
    let page = parseInt(req.query.page) || 1;
    let limit = 6;
    let skip = (page - 1) * limit;
    let userName = user.username;
    let userId = user.user_id;
    // Count total number of orders
    const totalOrdersCount = await orderDb.countDocuments({
      "products.status": "Cancelled",
      userId: userId,
    });
    // Calculate total pages based on the total number of orders and the limit per page
    const totalPages = Math.ceil(totalOrdersCount / limit);

    // Retrieve orders for the current page
    const order = await orderDb
      .find({ "products.status": "Cancelled", userId: userId })
      .skip(skip)
      .limit(limit);
    if (!order) {
      // Order not found
      return res.status(404).send("Order not found");
    }
    // Render the order details on the cancel order page
    res.render("cancelOrderpage", {
      userName: userName,
      userId: userId,
      order,
      generateUniqueID,
      currentPage: page,
      generateUniqueProductID,
      totalPages,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

// wallet Page
exports.wallet = async (req, res) => {
  let user = req.session.user;

  let userName = user.username;
  let userId = user.user_id;
  let userdetails = await collection.findOne({ _id: userId });
  console.log(userId);
  let walletHistory = await wallet.find({ Email: userdetails.email });
  console.log(walletHistory);
  res.render("walletPage", {
    userName: userName,
    userId: userId,
    walletHistory,
    userdetails,
    generateUniqueID,
  });
};
// Contact Get
exports.contact = (req, res) => {
  let user = req.session.user;
  let userName = user.username;
  let userId = user.user_id;
  res.render("contact", { userName: userName, userId: userId });
};

// Contact Mail Post
exports.contactSubmitForm = (req, res) => {
  const { name, email, subject, message } = req.body;
  console.log("aaa", req.body);
  // Create a nodemailer transporter using your email credentials
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.Email,
      pass: process.env.EmailPassword,
    },
  });
  // Set up email data
  const mailOptions = {
    from: email,
    to: process.env.Email,
    subject: subject || "Default Subject",
    text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
  };
  //Send the Mail
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
      res.status(500).send("Error sending email");
    } else {
      console.log("Email sent: " + info.response);
      res.redirect("/contact");
    }
  });
};

// Logout Route
exports.logoutRouter = (req, res) => {
  req.session.destroy();
  res.redirect("/signup");
};
