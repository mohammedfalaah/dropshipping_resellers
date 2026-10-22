const CodCollection = require("../models/CodCollection");
const codService = require("../services/codService");
const { successResponse, errorResponse } = require("../utils/response");
const { rupeesToPaise } = require("../utils/currency");

/**
 * Get COD Collections List (Admin)
 */
const getCodList = async (req, res, next) => {
  try {
    const { resellerId, collectionStatus, deliveryStatus, search, startDate, endDate, page = 1, limit = 20 } = req.query;

    const result = await codService.getCodList({
      resellerId,
      collectionStatus,
      deliveryStatus,
      search,
      startDate,
      endDate,
      page,
      limit,
    });

    return successResponse(res, "COD collection list retrieved.", result);
  } catch (err) {
    next(err);
  }
};

/**
 * Record COD Collection (Admin)
 */
const recordCollection = async (req, res, next) => {
  try {
    const { collectedAmount, collectionStatus, collectionReference, notes } = req.body;
    const codRecord = await codService.recordCodCollection(
      req.params.id,
      {
        collectedAmountPaise: rupeesToPaise(collectedAmount),
        collectionStatus,
        collectionReference,
        notes,
      },
      req.user
    );

    return successResponse(res, "COD collection recorded and credited successfully.", { codRecord });
  } catch (err) {
    next(err);
  }
};

/**
 * Update Delivery Status (Admin)
 */
const updateDeliveryStatus = async (req, res, next) => {
  try {
    const { deliveryStatus, courierName, trackingNumber } = req.body;
    const codRecord = await codService.updateCodDeliveryStatus(
      req.params.id,
      { deliveryStatus, courierName, trackingNumber },
      req.user
    );

    return successResponse(res, "Delivery status updated successfully.", { codRecord });
  } catch (err) {
    next(err);
  }
};

/**
 * Get My COD Orders (Reseller)
 */
const getMyCodOrders = async (req, res, next) => {
  try {
    const { collectionStatus, page = 1, limit = 20 } = req.query;
    const query = { reseller: req.user._id };
    if (collectionStatus) query.collectionStatus = collectionStatus;

    const skip = (Number(page) - 1) * Number(limit);

    const [records, total] = await Promise.all([
      CodCollection.find(query)
        .populate("order", "orderNumber totalPaise orderStatus paymentStatus")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      CodCollection.countDocuments(query),
    ]);

    return successResponse(res, "Your COD orders retrieved.", {
      records,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCodList,
  recordCollection,
  updateDeliveryStatus,
  getMyCodOrders,
};
