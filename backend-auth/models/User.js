import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true },
    apellido: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: {
      type: String,
      required: function () {
        return !this.googleId;
      }
    },
    rol: {
      type: String,
      enum: ['Delegado', 'Tecnico', 'Deportista', 'Admin'],
      default: 'Deportista'
    },
    confirmado: { type: Boolean, default: false },
    tokenConfirmacion: { type: String },
    googleId: { type: String }, // por si se loguea con Google
    foto: { type: String },
    club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club' },
    patinadores: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Patinador' }]
  },
  { timestamps: true }
);

const isAdminRole = (rol) => typeof rol === 'string' && rol.toLowerCase() === 'admin';

const scrubAdminAssociations = (doc) => {
  if (!doc) return;
  if (!isAdminRole(doc.rol)) return;
  doc.club = undefined;
  doc.patinadores = [];
  if (typeof doc.markModified === 'function') {
    doc.markModified('club');
    doc.markModified('patinadores');
  }
};

const transformAdminForSerialization = (_, ret) => {
  if (isAdminRole(ret.rol)) {
    ret.club = null;
    ret.patinadores = [];
  }
  return ret;
};

userSchema.pre('save', function (next) {
  scrubAdminAssociations(this);
  next();
});

const scrubUpdateForAdmin = function (next) {
  const update = this.getUpdate();
  if (!update) return next();

  const normaliseTarget = (target) => {
    if (!target) return;
    if (isAdminRole(target.rol)) {
      target.club = undefined;
      target.patinadores = [];
    }
  };

  normaliseTarget(update);
  normaliseTarget(update.$set);
  normaliseTarget(update.$setOnInsert);

  if (!update.rol && !update.$set?.rol && !update.$setOnInsert?.rol) {
    return this.model
      .findOne(this.getQuery())
      .select('rol')
      .then((doc) => {
        scrubAdminAssociations(doc);
        if (doc && isAdminRole(doc.rol)) {
          this.set({ club: undefined, patinadores: [] });
        }
        next();
      })
      .catch(next);
  }

  if (isAdminRole(update.rol) || isAdminRole(update.$set?.rol) || isAdminRole(update.$setOnInsert?.rol)) {
    this.set({ club: undefined, patinadores: [] });
  }

  next();
};

userSchema.pre('findOneAndUpdate', scrubUpdateForAdmin);
userSchema.pre('updateOne', scrubUpdateForAdmin);
userSchema.pre('updateMany', scrubUpdateForAdmin);

userSchema.set('toJSON', { transform: transformAdminForSerialization });
userSchema.set('toObject', { transform: transformAdminForSerialization });

const User = mongoose.model('User', userSchema);
export default User;
