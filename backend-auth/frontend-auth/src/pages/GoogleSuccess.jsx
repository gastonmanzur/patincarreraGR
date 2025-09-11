import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';


export default function GoogleSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
 

  useEffect(() => {
    if (token) {
      const datos = jwtDecode(token);
      localStorage.setItem('token', token);
      localStorage.setItem('rol', datos.rol);
      if (datos.foto) {
        localStorage.setItem('foto', datos.foto);
      }
  
      navigate('/dashboard');
    }
  }, [token, navigate]);
  

  return <p>Redirigiendo...</p>;
}
