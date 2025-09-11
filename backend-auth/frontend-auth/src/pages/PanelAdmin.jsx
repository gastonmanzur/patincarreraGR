import { useEffect, useState } from 'react';
import axios from 'axios';
import LogoutButton from '../components/LogoutButton';

export default function PanelAdmin() {
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    const fetchUsuarios = async () => {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/protegido/usuarios', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setUsuarios(res.data);
    };

    fetchUsuarios();
  }, []);

  return (
    <div>
      <h1>Panel de Administración</h1>
      <LogoutButton />
      <h2>Usuarios registrados</h2>
      <ul>
        {usuarios.map(user => (
          <li key={user._id}>{user.nombre} {user.apellido} - {user.email} ({user.rol})</li>
        ))}
      </ul>
    </div>
  );
}

