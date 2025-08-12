import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    destinatario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    mensaje: { type: String, required: true },
    leido: { type: Boolean, default: false },
    competencia: { type: mongoose.Schema.Types.ObjectId, ref: 'Competencia' },
    estadoRespuesta: {
      type: String,
      enum: ['Pendiente', 'Participo', 'No Participo'],
      default: 'Pendiente'
    }
  },
  { timestamps: true }
);

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
