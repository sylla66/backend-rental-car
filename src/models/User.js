const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Le nom complet est requis'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "L'email est requis"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email invalide'],
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // ne jamais renvoyer le hash dans les requêtes par défaut
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ['client', 'admin'],
      default: 'client',
    },
  },
  { timestamps: true }
);

// Méthode d'instance : compare le mot de passe fourni avec le hash stocké
userSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

// Empêche de renvoyer passwordHash même si on force select()
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);