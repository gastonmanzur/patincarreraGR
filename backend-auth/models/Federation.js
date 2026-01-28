import mongoose from 'mongoose';

const federationSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true, unique: true },
    descripcion: { type: String, trim: true },
    sitioWeb: { type: String, trim: true },
    contacto: { type: String, trim: true }
  },
  { timestamps: true }
);

const Federation = mongoose.model('Federation', federationSchema);
export default Federation;
