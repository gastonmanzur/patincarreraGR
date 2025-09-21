// test-conn.js
const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://gastonmanzur:gastonmanzur@cluster0.0sd1y.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    console.log("✅ Conectado a Atlas correctamente");
    const db = client.db('myappdb');
    const col = db.collection('test_collection');
    const r = await col.insertOne({ ahora: new Date(), prueba: true });
    console.log("Insertado id:", r.insertedId);
    const docs = await col.find().limit(5).toArray();
    console.log("Documentos recientes:", docs);
  } catch (err) {
    console.error("❌ Error al conectar o operar:", err);
  } finally {
    await client.close();
  }
}

run();
