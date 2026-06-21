require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');

// Force le chargement de tous les modèles Mongoose avant que les routes
// ne soient utilisées — nécessaire pour que populate() trouve toujours
// le modèle référencé (ex: Vehicle.populate('categoryId') a besoin que
// Category soit déjà enregistré auprès de mongoose).
require('./models');

const PORT = process.env.PORT || 3008;

// On se connecte à la DB AVANT de démarrer le serveur.
// Si la connexion échoue, connectDB() arrête déjà le process (voir config/db.js),
// donc app.listen() ne sera jamais atteint dans ce cas.
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
});