import api from '../api';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function RegisterForm() {
  const [mensaje, setMensaje] = useState('');
  const [rol, setRol] = useState('');
  const [codigo, setCodigo] = useState('');
  const [clubs, setClubs] = useState([]);
  const [federaciones, setFederaciones] = useState([]);
  const [clubId, setClubId] = useState('');
  const [crearNuevoClub, setCrearNuevoClub] = useState(false);
  const [nuevoClubNombre, setNuevoClubNombre] = useState('');
  const [nuevoClubFederacion, setNuevoClubFederacion] = useState('');
  const [clubLogo, setClubLogo] = useState(null);
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [clubsRes, fedRes] = await Promise.all([
          api.get('/public/clubs'),
          api.get('/federaciones')
        ]);

        setClubs(Array.isArray(clubsRes.data) ? clubsRes.data : []);
        setFederaciones(Array.isArray(fedRes.data) ? fedRes.data : []);
      } catch (error) {
        console.error('Error cargando datos iniciales', error);
      }
    };

    cargarDatos();
  }, []);

  const esPasswordSegura = (pwd) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
    return regex.test(pwd);
  };

  const resetClubFields = () => {
    setClubId('');
    setCrearNuevoClub(false);
    setNuevoClubNombre('');
    setNuevoClubFederacion('');
    setClubLogo(null);
  };

  const handleRolChange = (value) => {
    setRol(value);
    setCodigo('');
    resetClubFields();
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    const form = e.currentTarget;
    const nombre = form.nombre.value.trim();
    const apellido = form.apellido.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    const confirmarPassword = form.confirmarPassword.value;

    if (!esPasswordSegura(password)) {
      setMensaje('La contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas, números y un carácter especial.');
      return;
    }

    if (rol === 'delegado' && crearNuevoClub) {
      if (!nuevoClubNombre.trim()) {
        setMensaje('Debes indicar el nombre del nuevo club.');
        return;
      }
      if (!clubLogo) {
        setMensaje('Debes subir el logo del nuevo club.');
        return;
      }
    }

    if (['delegado', 'tecnico', 'deportista'].includes(rol) && !crearNuevoClub) {
      if (!clubId) {
        setMensaje('Seleccioná un club.');
        return;
      }
    }

    const formData = new FormData();
    formData.append('nombre', nombre);
    formData.append('apellido', apellido);
    formData.append('email', email);
    formData.append('password', password);
    formData.append('confirmarPassword', confirmarPassword);
    formData.append('rol', rol);
    if (codigo) formData.append('codigo', codigo);

    if (rol === 'delegado') {
      formData.append('crearNuevoClub', crearNuevoClub ? 'true' : 'false');
      if (crearNuevoClub) {
        formData.append('nuevoClubNombre', nuevoClubNombre.trim());
        if (nuevoClubFederacion) formData.append('nuevoClubFederacion', nuevoClubFederacion);
        if (clubLogo) formData.append('clubLogo', clubLogo);
      } else if (clubId) {
        formData.append('clubId', clubId);
      }
    } else if (['tecnico', 'deportista'].includes(rol) && clubId) {
      formData.append('clubId', clubId);
    }

    setCargando(true);
    try {
      const res = await api.post('/auth/registro', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMensaje(res.data.mensaje);
      setTimeout(() => {
        navigate('/');
      }, 2500);
    } catch (err) {
      setMensaje(err.response?.data?.mensaje || 'Error en el registro');
    } finally {
      setCargando(false);
    }
  };

  const requiereCodigo = ['delegado', 'tecnico', 'admin'].includes(rol);
  const debeElegirClub = ['delegado', 'tecnico', 'deportista'].includes(rol);

  return (
    <div>
      <form onSubmit={handleRegister}>
        <div className="mb-3">
          <label htmlFor="nombre" className="form-label">Nombre</label>
          <input type="text" className="form-control" name="nombre" id="nombre" required />
        </div>
        <div className="mb-3">
          <label htmlFor="apellido" className="form-label">Apellido</label>
          <input type="text" className="form-control" name="apellido" id="apellido" required />
        </div>
        <div className="mb-3">
          <label htmlFor="email" className="form-label">Email</label>
          <input type="email" className="form-control" name="email" id="email" required />
        </div>
        <div className="mb-3">
          <label htmlFor="password" className="form-label">Contraseña</label>
          <input type="password" className="form-control" name="password" id="password" required />
        </div>
        <div className="mb-3">
          <label htmlFor="confirmarPassword" className="form-label">Confirmar Contraseña</label>
          <input type="password" className="form-control" name="confirmarPassword" id="confirmarPassword" required />
        </div>
        <div className="mb-3">
          <label htmlFor="rol" className="form-label">Rol</label>
          <select
            name="rol"
            id="rol"
            className="form-select"
            value={rol}
            onChange={(e) => handleRolChange(e.target.value)}
            required
          >
            <option value="">Seleccione un rol</option>
            <option value="delegado">Delegado</option>
            <option value="tecnico">Técnico</option>
            <option value="deportista">Deportista</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
        {requiereCodigo && (
          <div className="mb-3">
            <label htmlFor="codigo" className="form-label">Código especial</label>
            <input
              type="text"
              className="form-control"
              name="codigo"
              id="codigo"
              placeholder="Código especial"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              required
            />
          </div>
        )}
        {debeElegirClub && (
          <div className="mb-3">
            {rol === 'delegado' && (
              <div className="form-check form-switch mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="crearNuevoClub"
                  checked={crearNuevoClub}
                  onChange={(e) => {
                    setCrearNuevoClub(e.target.checked);
                    setClubId('');
                  }}
                />
                <label className="form-check-label" htmlFor="crearNuevoClub">
                  Crear un nuevo club
                </label>
              </div>
            )}
            {!crearNuevoClub && (
              <div className="mb-3">
                <label htmlFor="clubId" className="form-label">Seleccioná un club</label>
                <select
                  id="clubId"
                  className="form-select"
                  value={clubId}
                  onChange={(e) => setClubId(e.target.value)}
                  required
                >
                  <option value="">Seleccioná un club</option>
                  {clubs.map((club) => (
                    <option key={club._id} value={club._id}>
                      {club.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {rol === 'delegado' && crearNuevoClub && (
              <div className="border rounded p-3 bg-light">
                <div className="mb-3">
                  <label htmlFor="nuevoClubNombre" className="form-label">Nombre del club</label>
                  <input
                    type="text"
                    className="form-control"
                    id="nuevoClubNombre"
                    value={nuevoClubNombre}
                    onChange={(e) => setNuevoClubNombre(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="nuevoClubFederacion" className="form-label">Federación</label>
                  <select
                    id="nuevoClubFederacion"
                    className="form-select"
                    value={nuevoClubFederacion}
                    onChange={(e) => setNuevoClubFederacion(e.target.value)}
                  >
                    <option value="">Seleccioná una federación (opcional)</option>
                    {federaciones.map((fed) => (
                      <option key={fed._id} value={fed._id}>
                        {fed.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label htmlFor="clubLogo" className="form-label">Logo del club</label>
                  <input
                    type="file"
                    id="clubLogo"
                    className="form-control"
                    accept="image/*"
                    onChange={(e) => setClubLogo(e.target.files?.[0] || null)}
                    required
                  />
                </div>
              </div>
            )}
          </div>
        )}
        <div className="d-grid">
          <button type="submit" className="btn btn-primary" disabled={cargando}>
            {cargando ? 'Registrando...' : 'Registrarse'}
          </button>
        </div>
      </form>
      {mensaje && <div className="alert alert-info mt-3">{mensaje}</div>}
    </div>
  );
}
