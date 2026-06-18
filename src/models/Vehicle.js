const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
    },
    model: {
      type: String,
      required: true,
      trim: true,
    },
    year: {
      type: Number,
      required: true,
    },
    transmission: {
      type: String,
      enum: ['manual', 'automatic'],
      required: true,
    },
    fuelType: {
      type: String,
      enum: ['petrol', 'diesel', 'electric', 'hybrid'],
      required: true,
    },
    dailyRate: {
      type: Number,
      min: 0,
      required: function () {
        return this.isForRent;
      },
    },
    salePrice: {
      type: Number,
      min: 0,
      required: function () {
        return this.isForSale;
      },
    },
    isForRent: {
      type: Boolean,
      default: true,
    },
    isForSale: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['available', 'rented', 'sold', 'maintenance'],
      default: 'available',
    },
    images: [
      {
        type: String,
      },
    ],
  },
  { timestamps: true }
);

vehicleSchema.pre('validate', function (next) {
  if (!this.isForRent && !this.isForSale) {
    return next(new Error('Le véhicule doit être proposé en location et/ou en vente'));
  }
  next();
});

module.exports = mongoose.model('Vehicle', vehicleSchema);