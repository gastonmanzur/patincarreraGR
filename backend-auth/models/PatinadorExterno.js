import mongoose from 'mongoose';

const patinadorExternoSchema = new mongoose.Schema(
  {
    primerNombre: { type: String, required: true },
    segundoNombre: { type: String },
    apellido: { type: String, required: true },
    club: { type: String, required: true },
    categoria: { type: String, required: true },
    numeroCorredor: { type: Number }
  },
  { timestamps: true }
);

patinadorExternoSchema.index(
  { primerNombre: 1, segundoNombre: 1, apellido: 1, club: 1 },
  {
    unique: true,
    partialFilterExpression: {
      primerNombre: { $type: 'string' },
      segundoNombre: { $type: 'string' },
      apellido: { $type: 'string' },
      club: { $type: 'string' }
    }
  }
);

patinadorExternoSchema.pre('save', function (next) {
  if (this.club) {
    this.club = this.club.trim().toUpperCase();
  }
  next();
});

export default mongoose.model('PatinadorExterno', patinadorExternoSchema);
