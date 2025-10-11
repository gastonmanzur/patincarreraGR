import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import LogoutButton from '../components/LogoutButton';

const initialFormState = {
  nombre: '',
  descripcion: '',
  sitioWeb: '',
  contacto: ''
};

const trimValue = (value) => (typeof value === 'string' ? value.trim() : '');

const ensureUrlHasProtocol = (value) => {
  const trimmed = trimValue(value);
  if (!trimmed) return '';
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

export default function PanelAdmin() {
  const [usuarios, setUsuarios] = useState([]);
  const [federaciones, setFederaciones] = useState([]);
  const [form, setForm] = useState(initialFormState);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
  };

  const loadUsuarios = async () => {
    try {
      const res = await api.get('/protegido/usuarios');
      setUsuarios(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error al obtener usuarios', err);
      showFeedback('danger', err.response?.data?.mensaje || 'No se pudieron cargar los usuarios');
    }
  };

  const loadFederaciones = async () => {
    try {
      const res = await api.get('/federaciones');
      setFederaciones(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error al obtener federaciones', err);
      showFeedback('danger', err.response?.data?.mensaje || 'No se pudieron cargar las federaciones');
    }
  };

  useEffect(() => {
    void loadUsuarios();
    void loadFederaciones();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm(initialFormState);
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    showFeedback('', '');

    const payload = {
      nombre: trimValue(form.nombre),
      descripcion: trimValue(form.descripcion),
      contacto: trimValue(form.contacto),
      sitioWeb: trimValue(form.sitioWeb)
    };

    if (!payload.nombre) {
      setLoading(false);
      showFeedback('danger', 'El nombre de la federación es obligatorio');
      return;
    }

    try {
      if (editingId) {
        await api.put(`/federaciones/${editingId}`, payload);
        showFeedback('success', 'Federación actualizada correctamente');
      } else {
        await api.post('/federaciones', payload);
        showFeedback('success', 'Federación creada correctamente');
      }
      resetForm();
      await loadFederaciones();
    } catch (err) {
      const apiMessage = err.response?.data?.mensaje;
      showFeedback('danger', apiMessage || 'No se pudo guardar la federación');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (federacion) => {
    setEditingId(federacion._id);
    setForm({
      nombre: federacion.nombre || '',
      descripcion: federacion.descripcion || '',
      sitioWeb: federacion.sitioWeb || '',
      contacto: federacion.contacto || ''
    });
    showFeedback('', '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm('¿Seguro que querés eliminar esta federación?');
    if (!confirmed) return;

    showFeedback('', '');

    try {
      await api.delete(`/federaciones/${id}`);
      showFeedback('success', 'Federación eliminada correctamente');
      await loadFederaciones();
    } catch (err) {
      const apiMessage = err.response?.data?.mensaje;
      showFeedback('danger', apiMessage || 'No se pudo eliminar la federación');
    }
  };

  const cancelEdit = () => {
    resetForm();
    showFeedback('', '');
  };

  const federacionesConEnlace = useMemo(
    () =>
      federaciones.map((fed) => ({
        ...fed,
        sitioWebNormalizado: ensureUrlHasProtocol(fed.sitioWeb)
      })),
    [federaciones]
  );

  return (
    <div className="container mt-4">
      <div className="d-flex flex-column flex-md-row align-items-center mb-4">
        <h1 className="m-0 text-center flex-grow-1 w-100">Panel de Administración</h1>
        <div className="mt-3 mt-md-0 ms-md-3">
          <LogoutButton />
        </div>
      </div>

      {feedback.message && (
        <div className={`alert alert-${feedback.type === 'success' ? 'success' : 'danger'} mt-3`} role="alert">
          {feedback.message}
        </div>
      )}

      <section className="mt-4">
        <div className="card shadow-sm">
          <div className="card-body">
            <h2 className="h4 mb-3">{editingId ? 'Editar federación' : 'Crear federación'}</h2>
            <p className="text-muted small">
              Gestioná la información compartida para todos los clubes, como el listado de federaciones asociadas a la CAP.
            </p>
            <form onSubmit={handleSubmit} className="row g-3">
              <div className="col-12 col-md-6">
                <label htmlFor="nombre" className="form-label">Nombre</label>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  className="form-control"
                  value={form.nombre}
                  onChange={handleChange}
                  required
                  placeholder="Nombre de la federación"
                />
              </div>
              <div className="col-12 col-md-6">
                <label htmlFor="sitioWeb" className="form-label">Sitio web</label>
                <input
                  type="text"
                  id="sitioWeb"
                  name="sitioWeb"
                  className="form-control"
                  value={form.sitioWeb}
                  onChange={handleChange}
                  placeholder="https://www.federacion.com"
                />
              </div>
              <div className="col-12">
                <label htmlFor="descripcion" className="form-label">Descripción</label>
                <textarea
                  id="descripcion"
                  name="descripcion"
                  className="form-control"
                  rows="3"
                  value={form.descripcion}
                  onChange={handleChange}
                  placeholder="Breve reseña de la federación"
                />
              </div>
              <div className="col-12 col-md-6">
                <label htmlFor="contacto" className="form-label">Contacto</label>
                <input
                  type="text"
                  id="contacto"
                  name="contacto"
                  className="form-control"
                  value={form.contacto}
                  onChange={handleChange}
                  placeholder="Correo, teléfono u otra vía de contacto"
                />
              </div>
              <div className="col-12 d-flex gap-2">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading
                    ? editingId
                      ? 'Guardando...'
                      : 'Creando...'
                    : editingId
                      ? 'Guardar cambios'
                      : 'Crear federación'}
                </button>
                {editingId && (
                  <button type="button" className="btn btn-outline-secondary" onClick={cancelEdit} disabled={loading}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </section>

      <section className="mt-5">
        <h2 className="mb-3 text-center text-md-start">Federaciones asociadas a la CAP</h2>
        <div className="table-responsive">
          <table className="table table-striped align-middle">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Sitio web</th>
                <th>Contacto</th>
                <th className="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {federacionesConEnlace.map((fed) => (
                <tr key={fed._id}>
                  <td className="fw-semibold">{fed.nombre}</td>
                  <td>{fed.descripcion || <span className="text-muted">-</span>}</td>
                  <td>
                    {fed.sitioWeb ? (
                      <a href={fed.sitioWebNormalizado} target="_blank" rel="noreferrer">
                        {fed.sitioWeb}
                      </a>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td>{fed.contacto || <span className="text-muted">-</span>}</td>
                  <td className="text-center">
                    <div className="btn-group btn-group-sm" role="group">
                      <button type="button" className="btn btn-outline-secondary" onClick={() => handleEdit(fed)}>
                        Editar
                      </button>
                      <button type="button" className="btn btn-outline-danger" onClick={() => handleDelete(fed._id)}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {federacionesConEnlace.length === 0 && (
          <p className="text-muted text-center mt-3">Todavía no hay federaciones registradas.</p>
        )}
      </section>

      <section className="mt-5">
        <h2 className="mb-3 text-center text-md-start">Usuarios registrados</h2>
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Apellido</th>
                <th>Email</th>
                <th>Rol</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((user) => (
                <tr key={user._id}>
                  <td>{user.nombre}</td>
                  <td>{user.apellido}</td>
                  <td>{user.email}</td>
                  <td>{user.rol}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {usuarios.length === 0 && (
          <p className="text-muted text-center mt-3">Todavía no hay usuarios registrados.</p>
        )}
      </section>
    </div>
  );
}

