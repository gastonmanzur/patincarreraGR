import { useState } from 'react';
import axios from 'axios';

export default function FotoUploader() {
  const [foto, setFoto] = useState(null);

  const handleUpload = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('foto', foto);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5000/api/protegido/foto-perfil', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      alert('Foto actualizada correctamente');
      localStorage.setItem('foto', res.data.foto);
      window.location.reload();
    } catch (err) {
      alert('Error al subir la foto');
    }
  };

  return (
    <form onSubmit={handleUpload}>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFoto(e.target.files[0])}
        required
        style={{ fontSize: 12 }}
      />
      <button type="submit" style={{ fontSize: 12, marginTop: 5 }}>
        Subir
      </button>
    </form>
  );
}
