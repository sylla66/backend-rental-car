
// ─── Exemple de schéma complet après patch ──────────────────────────────────
'use strict';
 
const mongoose = require('mongoose');
 
const vehicleSchema = new mongoose.Schema(
  {
    // ── champs existants ──────────────────────────────────────────────────────
    name: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    year: { type: Number, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    dailyRate: { type: Number, required: true, min: 0 },      // tarif location (XOF)
    images: [{ type: String }],
    description: { type: String, trim: true },
    isAvailable: { type: Boolean, default: true },            // dispo pour location
    licensePlate: { type: String, unique: true, trim: true },
    mileage: { type: Number, default: 0 },
    fuelType: {
      type: String,
      enum: ['essence', 'diesel', 'electrique', 'hybride'],
      default: 'essence',
    },
    transmission: {
      type: String,
      enum: ['manuelle', 'automatique'],
      default: 'manuelle',
    },
 
    // ── nouveaux champs vente ─────────────────────────────────────────────────
    salePrice: {
      type: Number,
      default: null,        // null = véhicule non mis en vente
      min: 0,
    },
    isAvailableForSale: {
      type: Boolean,
      default: false,       // l'admin active explicitement la mise en vente
    },
    isSold: {
      type: Boolean,
      default: false,       // true une fois la livraison confirmée
    },
  },
  { timestamps: true }
);
 
module.exports = mongoose.model('Vehicle', vehicleSchema);