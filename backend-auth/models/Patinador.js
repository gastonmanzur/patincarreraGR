import mongoose from 'mongoose';

const patinadorSchema = new mongoose.Schema(
  {
    primerNombre: { type: String, required: true },
    segundoNombre: { type: String },
    apellido: { type: String, required: true },
    edad: { type: Number, required: true },
    fechaNacimiento: { type: Date, required: true },
    dni: { type: String, required: true, unique: true },
    cuil: { type: String, required: true, unique: true },
    direccion: { type: String, required: true },
    dniMadre: { type: String, required: true },
    dniPadre: { type: String, required: true },
    telefono: { type: String, required: true },
    sexo: { type: String, enum: ['M', 'F'], required: true },
    nivel: {
      type: String,
      enum: ['Escuela', 'Transicion', 'Intermedia', 'Federados'],
      required: true
    },
    seguro: {
      type: String,
      enum: ['S/S', 'SA', 'SD'],
      default: 'S/S'
    },
    historialSeguros: [
      {
        tipo: { type: String, enum: ['SD', 'SA'], required: true },
        fecha: { type: Date, default: Date.now }
      }
    ],
    numeroCorredor: { type: Number, required: true, unique: true },
    categoria: { type: String, required: true },
    fotoRostro: { type: String },
    foto: { type: String }
  },
  { timestamps: true }
);

const Patinador = mongoose.model('Patinador', patinadorSchema, 'patinadors');
export default Patinador;
