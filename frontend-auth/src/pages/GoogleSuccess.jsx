import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import getImageUrl from '../utils/getImageUrl';
import { clearStoredClubId, setStoredClubId } from '../utils/clubContext';
import { notifyWrapperLogin } from '../utils/wrapperBridge';


export default function GoogleSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
 

  useEffect(() => {
    if (token) {
      const datos = jwtDecode(token);
      sessionStorage.setItem('token', token);
      notifyWrapperLogin({ userId: datos.id || datos._id || datos.userId, jwt: token });
      sessionStorage.setItem('rol', datos.rol);
      if (datos.club) {
        setStoredClubId(datos.club);
      } else {
        clearStoredClubId();
        sessionStorage.removeItem('clubLogo');
        sessionStorage.removeItem('clubNombre');
      }
      const foto = getImageUrl(datos.foto);
      if (foto) {
        sessionStorage.setItem('foto', foto);
      } else {
        sessionStorage.removeItem('foto');
      }

      if (datos.rol?.toLowerCase() === 'admin') {
        clearStoredClubId();
        sessionStorage.removeItem('clubLogo');
        sessionStorage.removeItem('clubNombre');
      }

      if (datos.needsClubSelection && datos.rol?.toLowerCase() !== 'admin') {
        navigate('/seleccionar-club');
      } else {
        navigate('/home');
      }
    }
  }, [token, navigate]);
  

  return <p>Redirigiendo...</p>;
}
