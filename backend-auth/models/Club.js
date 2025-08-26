import mongoose from 'mongoose';

const clubSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, unique: true, trim: true }
  },
  { timestamps: true }
);

clubSchema.pre('save', function (next) {
  this.nombre = this.nombre.trim().toUpperCase();
  next();
});

export default mongoose.model('Club', clubSchema);
