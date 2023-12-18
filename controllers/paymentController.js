const express = require('express');
const Razorpay = require('razorpay');
require('dotenv').config();
const cartcollection = require('../model/addToCart/cartSchema')
const ordercollection = require('../model/account/orderdb')




exports.razorPayment = async (req, res) => {
   try {
    var instance = new Razorpay({ key_id: process.env.KEY_ID, key_secret: process.env.KEY_SECRET });
    var options = {
      amount: totalPrice,
      currency: "INR",
      receipt: "order_rcptid_11",
    };

    // Creating the order
    instance.orders.create(options, function (err, order) {
      if (err) {
        console.error(err);
        res.status(500).send("Error creating order");
        return;
      }

      console.log(order);
      // Add orderprice to the response object
      res.send({ orderId: order.id });

      // Replace razorpayOrderId and razorpayPaymentId with actual values
      var { validatePaymentVerification, validateWebhookSignature } = require('./dist/utils/razorpay-utils');
      validatePaymentVerification(
        { "order_id": order.id, "payment_id": razorpayPaymentId }, // Make sure razorpayPaymentId is defined
        signature, // Make sure signature is defined
        secret
      );
    });
   } catch (error) {
    console.log(error);
   }
  };
  