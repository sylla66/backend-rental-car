// Point d'entrée unique qui force le chargement de TOUS les modèles.
// Importer ce fichier (même sans utiliser son contenu) garantit que
// mongoose.model() a été appelé pour chaque schéma, évitant les
// erreurs "Schema hasn't been registered" lors d'un populate().

require('./User');
require('./Category');
require('./Vehicle');
require('./Booking');
require('./SaleOrder');
require('./Payment');
require('./Review');