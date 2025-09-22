const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
require('dotenv').config(); // ← ¡Esto es clave si estás probando passport por separado!

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:5000/api/auth/google/callback"
  
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const existingUser = await User.findOne({ googleId: profile.id });
    console.log(profile)
    if (existingUser) return done(null, existingUser);

    const nuevoUsuario = new User({
        googleId: profile.id,
        nombre: profile.name.givenName,
        apellido: profile.name.familyName || '',
        email: profile.emails[0].value,
        confirmado: true,
        foto: profile.photos[0].value // asegurate de guardar esto
      });
      

    await nuevoUsuario.save();
    done(null, nuevoUsuario);
  } catch (err) {
    done(err, null);
  }
}));

