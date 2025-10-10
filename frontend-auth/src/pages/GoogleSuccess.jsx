import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import getImageUrl from '../utils/getImageUrl';


export default function GoogleSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
 

  useEffect(() => {
    if (token) {
      const datos = jwtDecode(token);
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('rol', datos.rol);
      const foto = getImageUrl(datos.foto);
      if (foto) {
        sessionStorage.setItem('foto', foto);
      } else {
        sessionStorage.removeItem('foto');
      }
  
      navigate('/home');
    }
  }, [token, navigate]);
  

  return <p>Redirigiendo...</p>;
}
