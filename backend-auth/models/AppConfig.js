import mongoose from 'mongoose';

const APP_CONFIG_KEY = 'app';

const appConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      unique: true,
      default: APP_CONFIG_KEY
    },
    defaultBrandLogo: {
      type: String,
      default: ''
    },
    categoriasPorEdad: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

appConfigSchema.statics.getSingleton = async function getSingleton() {
  try {
    const existing = await this.findOne({ key: APP_CONFIG_KEY }).lean();
    if (existing) return existing;

    const created = await this.create({ key: APP_CONFIG_KEY });
    return created.toObject();
  } catch (err) {
    if (err?.code === 11000) {
      const recovered = await this.findOne({ key: APP_CONFIG_KEY }).lean();
      if (recovered) return recovered;
    }
    throw err;
  }
};

appConfigSchema.statics.updateSingleton = async function updateSingleton(update) {
  const doc = await this.findOneAndUpdate(
    { key: APP_CONFIG_KEY },
    { $set: update, $setOnInsert: { key: APP_CONFIG_KEY } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return doc.toObject();
};

const AppConfig = mongoose.model('AppConfig', appConfigSchema);

export default AppConfig;
