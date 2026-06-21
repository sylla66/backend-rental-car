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
      // requis seulement si le véhicule est proposé à la location
      required: function () {
        return this.isForRent;
      },
    },
    salePrice: {
      type: Number,
      min: 0,
      // requis seulement si le véhicule est proposé à la vente
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
        type: String, // URLs des images
      },
    ],
  },
  { timestamps: true }
);

// Un véhicule doit être proposé à la location OU à la vente (ou les deux)
vehicleSchema.pre('validate', function () {
  if (!this.isForRent && !this.isForSale) {
    throw new Error('Le véhicule doit être proposé en location et/ou en vente');
  }
});

module.exports = mongoose.model('Vehicle', vehicleSchema);