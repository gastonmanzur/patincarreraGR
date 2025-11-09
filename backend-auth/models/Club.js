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

const contactInfoSchema = new mongoose.Schema(
  {
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    address: { type: String, trim: true },
    mapUrl: { type: String, trim: true },
    facebook: { type: String, trim: true },
    instagram: { type: String, trim: true },
    whatsapp: { type: String, trim: true },
    x: { type: String, trim: true },
    history: { type: String, trim: true }
  },
  { _id: false }
);

const clubSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, unique: true, trim: true },
    nombreAmigable: { type: String, trim: true },
    federation: { type: mongoose.Schema.Types.ObjectId, ref: 'Federation' },
    logo: { type: String, trim: true },
    titulos: { type: [tituloSchema], default: [] },
    contactInfo: { type: contactInfoSchema, default: () => ({}) },
    creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

clubSchema.pre('save', function (next) {
  this.nombre = this.nombre.trim().toUpperCase();
  if (typeof this.nombreAmigable === 'string') {
    this.nombreAmigable = this.nombreAmigable.trim();
    if (!this.nombreAmigable) {
      this.nombreAmigable = undefined;
    }
  }
  next();
});

export default mongoose.model('Club', clubSchema);
