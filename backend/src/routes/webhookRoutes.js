const express = require("express");
const router = express.Router();
const webhookController = require("../controllers/webhookController");

// Booking events webhook (GET for testing, POST for events)
router.all("/indiapost/booking", webhookController.handleIndiaPostBooking);

// Journey / Tracking events webhook (GET for testing, POST for events)
router.all("/indiapost/events", webhookController.handleIndiaPostEvents);
router.all("/indiapost/other", webhookController.handleIndiaPostEvents);

module.exports = router;
