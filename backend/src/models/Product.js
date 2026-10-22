const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: 200,
      index: true,
    },
    sku: {
      type: String,
      required: [true, "SKU is required"],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    slug: {
      type: String,
      required: [true, "Slug is required"],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: ["Gadgets", "Watches", "Footwear", "Fashion"],
      index: true,
    },
    categorySlug: {
      type: String,
      required: true,
      enum: ["gadgets", "watches", "footwear", "fashion"],
      index: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    shortDescription: {
      type: String,
      default: "",
    },
    mainImage: {
      type: String,
      required: [true, "Main product image is required"],
    },
    gallery: {
      type: [String],
      default: [],
    },
    // Financial pricing stored in integer paise
    regularPricePaise: {
      type: Number,
      required: [true, "Regular price (MSRP) is required"],
      min: [0, "Price cannot be negative"],
    },
    resellerPricePaise: {
      type: Number,
      required: [true, "Reseller wholesale price is required"],
      min: [0, "Price cannot be negative"],
    },
    stockQuantity: {
      type: Number,
      required: [true, "Stock quantity is required"],
      min: [0, "Stock cannot be negative"],
      default: 0,
      index: true,
    },
    minOrderQuantity: {
      type: Number,
      default: 1,
      min: [1, "Minimum order quantity must be at least 1"],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isTrending: {
      type: Boolean,
      default: false,
    },
    badge: {
      type: String,
      default: "",
    },
    rating: {
      type: Number,
      default: 5,
      min: 1,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 0,
    },
    additionalInfo: {
      type: Map,
      of: String,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtuals for Rupees representation (e.g. for frontend compatibility)
ProductSchema.virtual("price").get(function () {
  return Number((this.resellerPricePaise / 100).toFixed(2));
});

ProductSchema.virtual("originalPrice").get(function () {
  return Number((this.regularPricePaise / 100).toFixed(2));
});

ProductSchema.virtual("image").get(function () {
  return this.mainImage;
});

ProductSchema.virtual("thumbnails").get(function () {
  return this.gallery && this.gallery.length > 0 ? this.gallery : [this.mainImage];
});

ProductSchema.virtual("inStock").get(function () {
  return this.stockQuantity > 0;
});

module.exports = mongoose.model("Product", ProductSchema);
