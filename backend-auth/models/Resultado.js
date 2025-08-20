import mongoose from 'mongoose';

const resultadoSchema = new mongoose.Schema(
  {
    competenciaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Competencia',
      required: true
    },
    deportistaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patinador',
      required: function () {
        return !this.invitadoId;
      }
    },
    invitadoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PatinadorExterno',
      required: function () {
        return !this.deportistaId;
      }
    },
    categoria: { type: String, required: true },
    clubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Club' },
    posicion: Number,
    puntos: Number,
    dorsal: String,
    fuenteImportacion: {
      archivo: String,
      hash: String,
      fecha: { type: Date, default: Date.now }
    }
  },
  { timestamps: true }
);

resultadoSchema.index(
  { competenciaId: 1, deportistaId: 1, categoria: 1 },
  { unique: true, sparse: true }
);
resultadoSchema.index(
  { competenciaId: 1, invitadoId: 1, categoria: 1 },
  { unique: true, sparse: true }
);

export default mongoose.model('Resultado', resultadoSchema);
