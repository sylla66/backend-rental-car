// Point d'entrée unique qui force le chargement de TOUS les modèles.
// Importer ce fichier (même sans utiliser son contenu) garantit que
// mongoose.model() a été appelé pour chaque schéma, évitant les
// erreurs "Schema hasn't been registered" lors d'un populate().

const User = require('./User');
const Category = require('./Category');
const Vehicle = require('./Vehicle');
const Booking = require('./Booking');
const SaleOrder = require('./SaleOrder');
const Payment = require('./Payment');
const Review = require('./Review');

module.exports = {
  User,
  Category,
  Vehicle,
  Booking,
  SaleOrder,
  Payment,
  Review,
};