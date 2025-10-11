import mongoose from 'mongoose';

const tituloSchema = new mongoose.Schema(
  {
    titulo: { type: String, required: true, trim: true },
    anio: { type: Number },
    descripcion: { type: String, trim: true },
    imagen: { type: String, trim: true },
    creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    creadoEn: { type: Date, default: Date.now }
  },
  { _id: true }
);

const clubSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, unique: true, trim: true },
    federation: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation' },
    logo: { type: String, trim: true },
    titulos: { type: [tituloSchema], default: [] },
    creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

clubSchema.pre('save', function (next) {
  this.nombre = this.nombre.trim().toUpperCase();
  next();
});

export default mongoose.model('Club', clubSchema);
