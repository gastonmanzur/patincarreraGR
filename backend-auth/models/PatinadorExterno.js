import mongoose from 'mongoose';

const patinadorExternoSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true },
    club: { type: String, required: true },
    numero: { type: Number },
    categoria: { type: String, required: true }
  },
  { timestamps: true }
);

const PatinadorExterno = mongoose.model(
  'PatinadorExterno',
  patinadorExternoSchema,
  'patinadorexternos'
);

export default PatinadorExterno;
