const collection = require("../model/users/userdb");
const Product = require("../model/product/productdb");
const Category = require("../model/category/categorydb");
const orderDb = require("../model/account/orderdb");
const offerdb = require("../model/offer/offerSchema");
const wallet = require("../model/users/wallet")
const PDFDocument = require("pdfkit-table");
const ExcelJS = require("exceljs");

// Unique Id Generator Function
function generateUniqueID() {
  // Generate a random four-digit number
  let id = Math.floor(100 + Math.random() * 900);
  // Prepend "USR" to the id
  return "USR" + id;
}


// Multer Syntax
const multer = require("multer");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads");
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now() + "-" + file.originalname);
  },
});
exports.uploads = multer({ storage: storage }).array("img");

// admin Get Login
exports.adminLogin = (req, res) => {
  if (req.session.username) {
    res.redirect("/admindashboard");
  } else {
    res.render("adminlogin");
  }
};
// admin Post Login
exports.adminLoginPost = async (req, res) => {
  try {
    const { username, password } = req.body;

    const admindata = {
      username: "admin",
      password: "admin123",
    };

    if (username === admindata.username && password === admindata.password) {
      req.session.username = admindata.username;
      res.redirect("/admindashboard");
    } else {
      res.render("adminlogin", { message: "Email Or Password is Incorrect" });
    }
  } catch (error) {
    console.log(error);
  }
};

// Admin Dashboard
exports.dashboard = async (req, res) => {
  try {
    // Daily Orders
    const dailyOrders = await orderDb.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$orderDate" } },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const { dates, orderCounts, totalOrderCount } = dailyOrders.reduce(
      (result, order) => {
        result.dates.push(order._id);
        result.orderCounts.push(order.orderCount);
        result.totalOrderCount += order.orderCount;
        return result;
      },
      { dates: [], orderCounts: [], totalOrderCount: 0 }
    );
    // monthly
    const monthlyOrders = await orderDb.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$orderDate" },
            month: { $month: "$orderDate" },
          },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);
    const monthlyData = monthlyOrders.reduce((result, order) => {
      const monthYearString = `${order._id.year}-${String(
        order._id.month
      ).padStart(2, "0")}`;
      result.push({
        month: monthYearString,
        orderCount: order.orderCount,
      });
      return result;
    }, []);
    let monthdata = orderCounts;

    //  Yearly Order
    const yearlyOrders = await orderDb.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y", date: "$orderDate" } },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const { years, orderCounts3, totalOrderCount3 } = yearlyOrders.reduce(
      (result, order) => {
        result.years.push(order._id);
        result.orderCounts3.push(order.orderCount);
        result.totalOrderCount3 += order.orderCount;
        return result;
      },
      { years: [], orderCounts3: [], totalOrderCount3: 0 }
    );

    res.render("admindashboard", {
      dates,
      orderCounts,
      totalOrderCount,
      monthdata,
      years,
      orderCounts3,
      totalOrderCount3,
    });
  } catch (error) {
    console.error("Error fetching and aggregating orders:", error);
    res.status(500).send("Internal Server Error");
  }
};

// User Management

exports.userlist = async (req, res) => {
  console.log("enetered User Management");

  const users = await collection.find();
  console.log(users);
  res.render("usermanagement", { users });
};

// Block User
exports.blockuser = async (req, res) => {
  console.log("hello");
  const userId = req.params.id;
  const user = await collection.findById(userId);
  console.log(user);
  user.isBlocked = !user.isBlocked;
  await user.save();
  const userlist = await collection.find();

  res.redirect("/usermanagement");
};
//Product List
exports.productslists = async (req, res) => {
  try {
    await Product.find().then((x) => {
      res.render("productlisting", { products: x });
    });
  } catch (error) {
    console.log(error);
  }
};
// Product Viewing Get
exports.addProductPage = async (req, res) => {
  const product = await Product.find();
  const categories = await Category.find();
  res.render("addproduct", { product, categories });
};

// add product post
exports.addProductPagepost = async (req, res) => {
  console.log("Entered Add Product Post");
  const { Productname, Category, Price, Rating, Model, Description, Stock } =
    req.body;
  const imageArray = req.body.croppedImages || [];
  for (const file of req.files) {
    imageArray.push(file.filename);
  }
  const newProduct = new Product({
    productname: Productname,
    category: Category,
    price: Price,
    rating: Rating,
    model: Model,
    description: Description,
    stock: Stock,
    image: imageArray,
    isListed: true,
  });
  try {
    console.log(newProduct);
    await newProduct.save();
    res.redirect("/productlisting");
  } catch (error) {
    console.log("Error:", error);
    res.status(500).send(error);
  }
};

// List Status

exports.toggleListProduct = async (req, res) => {
  const productId = req.params.id;
  const product = await Product.findById(productId);
  product.isListed = !product.isListed;
  await product.save();
  res.redirect("/productlisting");
};

// edit product
exports.editProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);
    const categories = await Category.find();
    res.render("editproduct", { product: product, categories });
  } catch (error) {
    console.log(error);
  }
};
// Edit Remove Image Post
exports.editRemoveImage = async (req, res) => {
  const productId = req.body.productId;
  const imageIndex = req.body.imageIndex;

  try {
    console.log("HOY");
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).send("Product not found");
    }

    if (imageIndex < 0 || imageIndex >= product.image.length) {
      return res.status(400).send("Invalid image index");
    }

    product.image.splice(imageIndex, 1);
    await product.save();

    res.status(200).send("Image removed successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

// edit Post Product
exports.updateProduct = async (req, res) => {
  console.log("Entered Update Post");

  const productId = req.params.id;
  const {
    Productname,
    Category,
    Price,
    Rating,
    Model,
    Description,
    Stock,
    isListed,
  } = req.body;
  try {
    const updateProduct = await Product.findByIdAndUpdate(
      productId,
      {
        productname: Productname,
        category: Category,
        price: Price,
        rating: Rating,
        model: Model,
        description: Description,
        stock: Stock,
        isListed: isListed,
      },
      { new: true } // This option returns the modified document rather than the original
    );
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file) => file.filename);
      updateProduct.image = updateProduct.image.concat(newImages);
    } else {
      updateProduct.image = updateProduct.image;
    }
    if (!updateProduct) {
      console.log("Product not found");
      res.status(404).send("Product not found");
      return;
    }
    await updateProduct.save();
    console.log(updateProduct);
    res.redirect("/productlisting");
  } catch (error) {
    console.log(error);
  }
};

// category Get
exports.category = async (req, res) => {
  const categories = await Category.find();
  res.render("category", { categories });
};
// edit Category
exports.editcategory = async (req, res) => {
  console.log("entered get edit category");

  try {
    const productId = req.params.id;
    const category = await Category.findById(productId);
    console.log(category);
    res.render("editcategory", { category });
  } catch (error) {
    console.log(error);
  }
};
// edit Post category
exports.updatecategory = async (req, res) => {
  console.log("Entered Update Category Post");

  const categoryId = req.params.id;
  const { categoryName } = req.body;
  console.log(categoryId);
  console.log(categoryName);
  try {
    // Find the category by ID and update its name
    await Category.findByIdAndUpdate(
      categoryId,
      { category: categoryName },
      { new: true }
    );

    // Redirect to the category management page or any other appropriate page
    res.redirect("/categorymanagement");
  } catch (error) {
    console.error(error);
    // Handle errors appropriately, e.g., render an error page
    res.render("error", {
      error: "An error occurred while updating the category.",
    });
  }
};

// add Get Category
exports.addcategoryget = async (req, res) => {
  console.log("entered addcategoryget");

  const categories = await Category.find();
  res.render("addcategory", { categories });
};

// add Post Category
exports.addcategory = async (req, res) => {
  console.log("entered in addcategory post");
  const category = req.body.categoryname;

  try {
    // Check if the category already exists (case-insensitive)
    const existingCategory = await Category.findOne({
      category: { $regex: new RegExp("^" + category + "$", "i") },
    });

    if (existingCategory) {
      // Category already exists, handle accordingly (e.g., show an error message)

      console.log("Category already exists:", category);

      return res.redirect("/categorymanagement");
    }

    // Category is unique, save it
    const newCategory = new Category({
      category: category,
    });

    await newCategory.save();
    res.redirect("/categorymanagement");
  } catch (error) {
    // Handle the error (e.g., show an error message)
    console.error("Error adding category:", error);
    res.redirect("/categorymanagement");
  }
};

// delete product
exports.deleteProduct = async (req, res) => {
  const productId = req.params.id;
  await Product.findByIdAndDelete(productId);
  res.redirect("/productlisting");
};

// delete Cateory
exports.deleteCategory = async (req, res) => {
  const categoryId = req.params.id;

  try {
    // Check if the category exists
    const category = await Category.findById(categoryId);

    if (!category) {
      console.log("Category not found");
      res.status(404).send("Category not found");
      return;
    }

    // Perform the delete operation
    await Category.findByIdAndDelete(categoryId);

    console.log(`Category with ID ${categoryId} deleted`);
    res.redirect("/categorymanagement"); // Redirect to the category listing page
  } catch (error) {
    console.error(error);
    res.status(500).send("Error deleting category");
  }
};

//Order Management
exports.orderManagement = async (req, res) => {
  let page = parseInt(req.query.page) || 1;
  let limit = 6;
  let skip = (page - 1) * limit;
  // Count total number of orders
  const totalOrdersCount = await orderDb.countDocuments();
// Calculate total pages based on the total number of orders and the limit per page
const totalPages = Math.ceil(totalOrdersCount / limit);
  const orders = await orderDb.find().skip(skip).limit(limit);
  orders.reverse();
  res.render("orderManagement", { orders,generateUniqueID ,totalPages, currentPage: page, });
};

// Status Update Post
exports.updateSatus = async (req, res) => {
  try {
    console.log("Received form data:", req.body);
    const userId = req.params.id;
    const productId = req.params._id;
    const newStatus = req.body.newStatus;
    console.log(userId, productId);
    console.log(
      "Updating status for userId:",
      userId,
      "and productId:",
      productId
    );
    console.log("New status:", newStatus);

    const result = await orderDb.updateOne(
      { userId, "products._id": productId },
      { $set: { "products.$.status": newStatus } }
    );

    console.log("MongoDB update result:", result);

    if (result.modifiedCount > 0) {
      console.log("Status updated successfully");
    } else {
      console.log("No documents matched or updated");
    }

    res.redirect("/orderManagement");
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).send("Internal Server Error");
  }
};
// Sales Report Get
exports.salesReport = async (req, res) => {
  const orders = await orderDb.find();
  res.render("salesReport", { orders,generateUniqueID });
};

// Sales Report Search Get
exports.search = async (req, res) => {
  const searchQuery = req.query.search;
  const regexPattern = new RegExp(`^${searchQuery}`, "i");

  const filteredOrder = await orderDb.find({
    username: { $regex: regexPattern },
  });
  res.json(filteredOrder);
};

// Offer Management
exports.offerManagement = async (req, res) => {
  const offers = await offerdb.find();
  for (const offer of offers) {
    if (offer.endDate < new Date()) {
      offer.isActive = false;
      await offer.save();
    }
  }
  res.render("offerManagement", { offers });
};
// Add Offer Get
exports.addOffer = async (req, res) => {
  const categories = await Category.find();
  const productdb = await Product.find();

  res.render("addOffer", { categories, productdb  });
};
// Add Offer Post
exports.addOfferPost = async (req, res) => {
  try {
    // Extract data from the form submission
    const {
      type,
      code,
      discount,
      startDate,
      endDate,
      isActive,
      selectedProducts,
      selectedCategories,
    } = req.body;
    console.log(req.body);

 // Check if there is already an offer for the selected products or categories
 const existingOffer = await offerdb.findOne({
  $or: [
    { applicableProducts: { $in: selectedProducts } },
    { applicableCategories: { $in: selectedCategories } },
  ],
});

if (existingOffer) {
  const error = "This product or category already has an offer.";
  return res.status(400).json({ error });

}
    // Create a new Offer instance
    const newOffer = new offerdb({
      type,
      code,
      discount,
      startDate,
      endDate,
      isActive: Boolean(isActive), // Convert to boolean
      applicableProducts: selectedProducts || [],
      applicableCategories: selectedCategories || [],
    });

    // Save the new offer to the database
    await newOffer.save();

    res.redirect("/offerManagement");
  } catch (error) {
    // Handle errors
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Chart Excel Download
exports.excelReport = async (req, res) => {
  try {
    console.log("Excel");

    const startdate = new Date(req.query.startingdate);
    const Endingdate = new Date(req.query.endingdate);
    console.log(startdate);
    console.log(Endingdate);
    Endingdate.setDate(Endingdate.getDate() + 1);

    const orderCursor = await orderDb.aggregate([
      {
        $match: {
          orderDate: { $gte: startdate, $lte: Endingdate },
        },
      },
    ]);
    console.log(orderCursor);
    if (orderCursor.length === 0) {
      return res.redirect("/admindashboard");
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sheet 1");

    // Add data to the worksheet
    worksheet.columns = [
      { header: "Username", key: "username", width: 15 },
      { header: "Product Name", key: "productname", width: 20 },
      { header: "Quantity", key: "quantity", width: 15 },
      { header: "Price", key: "price", width: 15 },
      { header: "Status", key: "status", width: 15 },
      { header: "Order Date", key: "orderdate", width: 18 },
      { header: "Address", key: "address", width: 30 },
      { header: "City", key: "city", width: 20 },
      { header: "Pincode", key: "pincode", width: 15 },
      { header: "State", key: "state", width: 15 },
    ];

    for (const orderItem of orderCursor) {
      // Fetch address details based on the address ID

      worksheet.addRow({
        username: orderItem.username,
        productname: orderItem.products
          .map((product) => product.product)
          .join(", "),
        quantity: orderItem.totalQuantity,
        price: orderItem.totalPrice,
        status: orderItem.products.map((product) => product.status).join(", "),
        orderdate: orderItem.orderDate,
        address: orderItem.address.address,
        city: orderItem.address.city,
        pincode: orderItem.address.pincode,
        state: orderItem.address.state,
      });
    }

    // Generate the Excel file and send it as a response
    workbook.xlsx.writeBuffer().then((buffer) => {
      const excelBuffer = Buffer.from(buffer);
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Disposition", "attachment; filename=excel.xlsx");
      res.send(excelBuffer);
    });
  } catch (error) {
    console.error("Error creating or sending Excel file:", error);
    res.status(500).send("Internal Server Error");
  }
};

// Pdf Download
exports.salesPdf = async (req, res) => {
  try {
    const startingDate = new Date(req.query.startingdate);
    const endingDate = new Date(req.query.endingdate);

    // Fetch orders within the specified date range
    const orders = await orderDb.find({
      orderDate: { $gte: startingDate, $lte: endingDate },
    });

    // Create a PDF document
    const doc = new PDFDocument();
    const filename = "sales_report.pdf";

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    // Add content to the PDF document
    doc.text("Sales Report", { align: "center", fontSize: 10, margin: 2 });

    // Define the table data
    const tableData = {
      headers: [
        "Username",
        "Product Name",
        "Price",
        "Quantity",
        "Address",
        "City",
        "Pincode",
        "State",
      ],
      rows: orders.map((order) => [
        order.username,
        order.products.map((product) => product.product).join(", "),
        order.products.map((product) => product.price).join(", "),
        order.products.map((product) => product.quantity).join(", "),
        order.address.address,
        order.address.city,
        order.address.pincode,
        order.address.state,
      ]),
    };

    // Draw the table
    await doc.table(tableData, {
      prepareHeader: () => doc.font("Helvetica-Bold"),
      prepareRow: () => doc.font("Helvetica"),
    });

    // Finalize the PDF document
    doc.end();
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).send("Internal Server Error");
  }
};

// acceptCancelRequest
exports.acceptCancelRequest = async (req, res) => {
  try {
    const userId = req.params.userId;
    const productId = req.params.productId;
    const orderId = req.params.orderId;
    const newStatus = "Returned"; 
    console.log(userId, productId);
    console.log("Updating status for userId:", userId, "and productId:", productId);
    console.log("New status:", newStatus);
    console.log(orderId);

    // Update product status in the order
    const result = await orderDb.updateOne(
      { userId, "products._id": productId },
      { $set: { "products.$.status": newStatus } }
    );

    console.log("MongoDB update result:", result);

    if (result.modifiedCount > 0) {
      let order = await orderDb.findOne({ _id: orderId });
      console.log("Status updated successfully");

      // Check if the new status is "Returned" and update the wallet balance
      if (newStatus === "Returned") {
        // Fetch the user's wallet balance
        let userDoc = await collection.findById(userId);

        if (!userDoc) {
          return res.status(404).send("User not found");
        }

        let walletBalance = userDoc.wallet || 0;
        let refundAmount = order.totalPrice;
        walletBalance += refundAmount;

        // Update wallet history
        const walletOrder = new wallet({
          Email: userDoc.email,
          date: new Date(),
          amount: refundAmount,
          creditordebit: "Credited",
        });
        await walletOrder.save();

        // Update user's wallet balance
        await collection.findByIdAndUpdate(userId, { wallet: walletBalance });

        console.log("Wallet updated successfully");
      }

      // Check if the order has a valid products array
      if (order.products && order.products.length > 0) {
        // Iterate over the products array
        for (const productData of order.products) {
          const productId = productData.productid;

          // Check if productId is valid
          if (productId) {
            // Increase product stock
            const product = await Product.findOne({ _id: productId });

            if (product) {
              const quantityToRestore = productData.quantity;
              await Product.updateOne(
                { _id: productId },
                { $inc: { stock: quantityToRestore } }
              );
              console.log(
                "Product stock restored:",
                product.productname,
                "Quantity:",
                quantityToRestore
              );
            } else {
              console.log(
                "Product not found for order:",
                order._id,
                "Product ID:",
                productId
              );
            }
          } else {
            console.log("Invalid product ID in order:", order._id);
          }
        }
      } else {
        console.log("No products found in order:", order._id);
      }
    } else {
      console.log("No documents matched or updated");
    }

    res.redirect("/orderManagement");
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).send("Internal Server Error");
  }
};


// rejectCancelRequest
exports.rejectCancelRequest = async (req, res) => {
  try {
    const userId = req.params.userId;
    const productId = req.params.productId;
    const newStatus = "Return Rejected";
    console.log(userId, productId);
    console.log(
      "Updating status for userId:",
      userId,
      "and productId:",
      productId
    );
    console.log("New status:", newStatus);

    const result = await orderDb.updateOne(
      { userId, "products._id": productId },
      { $set: { "products.$.status": newStatus } }
    );

    console.log("MongoDB update result:", result);

    if (result.modifiedCount > 0) {
      console.log("Status updated successfully");
    } else {
      console.log("No documents matched or updated");
    }
    console.log("cancel Rejection Successful");
    res.redirect("/orderManagement");
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).send("Internal Server Error");
  }
};

// Logout Route
exports.adminlogout = (req, res) => {
  req.session.destroy();
  res.redirect("/admin");
};
