import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../api';
import LogoutButton from '../components/LogoutButton';
import getImageUrl from '../utils/getImageUrl';

const initialFormState = {
  nombre: '',
  descripcion: '',
  sitioWeb: '',
  contacto: ''
};

const initialClubFormState = {
  nombre: '',
  federation: '',
  logo: null,
  removeLogo: false
};

const trimValue = (value) => (typeof value === 'string' ? value.trim() : '');

const ensureUrlHasProtocol = (value) => {
  const trimmed = trimValue(value);
  if (!trimmed) return '';
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

export default function PanelAdmin() {
  const [federaciones, setFederaciones] = useState([]);
  const [form, setForm] = useState(initialFormState);
  const [editingId, setEditingId] = useState(null);
  const [federationLoading, setFederationLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [clubs, setClubs] = useState([]);
  const [clubForm, setClubForm] = useState(initialClubFormState);
  const [clubEditingId, setClubEditingId] = useState(null);
  const [clubLoading, setClubLoading] = useState(false);
  const [clubLogoPreview, setClubLogoPreview] = useState('');
  const [clubExistingLogo, setClubExistingLogo] = useState('');
  const clubLogoInputRef = useRef(null);

  const showFeedback = useCallback((type, message) => {
    setFeedback({ type, message });
  }, []);

  const clearClubLogoPreview = () => {
    if (clubLogoPreview && clubLogoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(clubLogoPreview);
    }
    setClubLogoPreview('');
  };

  const resetClubForm = () => {
    clearClubLogoPreview();
    setClubForm(initialClubFormState);
    setClubEditingId(null);
    setClubExistingLogo('');
    if (clubLogoInputRef.current) {
      clubLogoInputRef.current.value = '';
    }
  };

  const loadFederaciones = useCallback(async () => {
    try {
      const res = await api.get('/federaciones');
      setFederaciones(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error al obtener federaciones', err);
      showFeedback('danger', err.response?.data?.mensaje || 'No se pudieron cargar las federaciones');
    }
  }, [showFeedback]);

  const loadClubs = useCallback(async () => {
    try {
      const res = await api.get('/clubs');
      const data = Array.isArray(res.data) ? res.data : [];
      setClubs(
        data.map((club) => ({
          ...club,
          logo: getImageUrl(club.logo),
          federation:
            club.federation && typeof club.federation === 'object'
              ? { _id: club.federation._id, nombre: club.federation.nombre || '' }
              : club.federation
                ? { _id: club.federation, nombre: '' }
                : null
        }))
      );
    } catch (err) {
      console.error('Error al obtener clubes', err);
      showFeedback('danger', err.response?.data?.mensaje || 'No se pudieron cargar los clubes');
    }
  }, [showFeedback]);

  useEffect(
    () => () => {
      if (clubLogoPreview && clubLogoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(clubLogoPreview);
      }
    },
    [clubLogoPreview]
  );

  useEffect(() => {
    void loadFederaciones();
    void loadClubs();
  }, [loadFederaciones, loadClubs]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm(initialFormState);
    setEditingId(null);
  };

  const handleClubInputChange = (event) => {
    const { name, value } = event.target;
    setClubForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleClubLogoChange = (event) => {
    const file = event.target.files?.[0] || null;
    if (clubLogoPreview && clubLogoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(clubLogoPreview);
    }
    if (file) {
      setClubLogoPreview(URL.createObjectURL(file));
    } else {
      setClubLogoPreview(clubExistingLogo);
    }
    setClubForm((prev) => ({ ...prev, logo: file, removeLogo: false }));
  };

  const handleToggleRemoveLogo = (event) => {
    const shouldRemove = event.target.checked;
    setClubForm((prev) => ({
      ...prev,
      removeLogo: shouldRemove,
      logo: shouldRemove ? null : prev.logo
    }));
    if (shouldRemove) {
      if (clubLogoPreview && clubLogoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(clubLogoPreview);
      }
      setClubLogoPreview('');
      if (clubLogoInputRef.current) {
        clubLogoInputRef.current.value = '';
      }
    } else {
      setClubLogoPreview(clubExistingLogo);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFederationLoading(true);
    showFeedback('', '');

    const payload = {
      nombre: trimValue(form.nombre),
      descripcion: trimValue(form.descripcion),
      contacto: trimValue(form.contacto),
      sitioWeb: trimValue(form.sitioWeb)
    };

    if (!payload.nombre) {
      setFederationLoading(false);
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
      setFederationLoading(false);
    }
  };

  const handleClubSubmit = async (event) => {
    event.preventDefault();
    setClubLoading(true);
    showFeedback('', '');

    const nombreNormalizado = trimValue(clubForm.nombre);
    if (!nombreNormalizado) {
      setClubLoading(false);
      showFeedback('danger', 'El nombre del club es obligatorio');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('nombre', nombreNormalizado);
      formData.append('federation', clubForm.federation || '');
      if (clubForm.logo) {
        formData.append('logo', clubForm.logo);
      }
      if (clubEditingId && clubForm.removeLogo) {
        formData.append('removeLogo', 'true');
      }

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (clubEditingId) {
        await api.put(`/admin/clubs/${clubEditingId}`, formData, config);
        showFeedback('success', 'Club actualizado correctamente');
      } else {
        await api.post('/admin/clubs', formData, config);
        showFeedback('success', 'Club creado correctamente');
      }

      await loadClubs();
      resetClubForm();
    } catch (err) {
      const apiMessage = err.response?.data?.mensaje;
      showFeedback('danger', apiMessage || 'No se pudo guardar el club');
    } finally {
      setClubLoading(false);
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

  const handleClubEdit = (club) => {
    showFeedback('', '');
    clearClubLogoPreview();
    setClubEditingId(club._id);
    setClubForm({
      nombre: club.nombre || '',
      federation: club.federation?._id || '',
      logo: null,
      removeLogo: false
    });
    const normalisedLogo = getImageUrl(club.logo);
    setClubExistingLogo(normalisedLogo || '');
    setClubLogoPreview(normalisedLogo || '');
    if (clubLogoInputRef.current) {
      clubLogoInputRef.current.value = '';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClubDelete = async (id) => {
    const confirmed = window.confirm('¿Seguro que querés eliminar este club?');
    if (!confirmed) return;
    showFeedback('', '');
    setClubLoading(true);

    try {
      await api.delete(`/admin/clubs/${id}`);
      showFeedback('success', 'Club eliminado correctamente');
      if (clubEditingId === id) {
        resetClubForm();
      }
      await loadClubs();
    } catch (err) {
      const apiMessage = err.response?.data?.mensaje;
      showFeedback('danger', apiMessage || 'No se pudo eliminar el club');
    } finally {
      setClubLoading(false);
    }
  };

  const cancelClubEdit = () => {
    resetClubForm();
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

  const federacionesPorId = useMemo(() => {
    const mapa = new Map();
    federaciones.forEach((fed) => {
      if (fed?._id) {
        mapa.set(fed._id, fed.nombre || '');
      }
    });
    return mapa;
  }, [federaciones]);

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
                <button type="submit" className="btn btn-primary" disabled={federationLoading}>
                  {federationLoading
                    ? editingId
                      ? 'Guardando...'
                      : 'Creando...'
                    : editingId
                      ? 'Guardar cambios'
                      : 'Crear federación'}
                </button>
                {editingId && (
                  <button type="button" className="btn btn-outline-secondary" onClick={cancelEdit} disabled={federationLoading}>
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
        <div className="card shadow-sm">
          <div className="card-body">
            <h2 className="h4 mb-3">{clubEditingId ? 'Editar club' : 'Crear club'}</h2>
            <p className="text-muted small">
              Administrá los clubes disponibles para los usuarios de la plataforma.
            </p>
            <form onSubmit={handleClubSubmit} className="row g-3">
              <div className="col-12 col-md-6">
                <label htmlFor="clubNombre" className="form-label">Nombre</label>
                <input
                  type="text"
                  id="clubNombre"
                  name="nombre"
                  className="form-control"
                  value={clubForm.nombre}
                  onChange={handleClubInputChange}
                  required
                  placeholder="Nombre del club"
                />
              </div>
              <div className="col-12 col-md-6">
                <label htmlFor="clubFederation" className="form-label">Federación</label>
                <select
                  id="clubFederation"
                  name="federation"
                  className="form-select"
                  value={clubForm.federation}
                  onChange={handleClubInputChange}
                >
                  <option value="">Sin federación</option>
                  {federaciones.map((fed) => (
                    <option key={fed._id} value={fed._id}>{fed.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-6">
                <label htmlFor="clubLogo" className="form-label">Logo</label>
                <input
                  type="file"
                  id="clubLogo"
                  name="logo"
                  className="form-control"
                  accept="image/*"
                  ref={clubLogoInputRef}
                  onChange={handleClubLogoChange}
                />
              </div>
              <div className="col-12 col-md-6 d-flex flex-column flex-md-row align-items-md-center gap-3">
                {clubLogoPreview || clubExistingLogo ? (
                  <img
                    src={clubLogoPreview || clubExistingLogo}
                    alt="Logo del club"
                    className="rounded"
                    style={{ width: '80px', height: '80px', objectFit: 'cover' }}
                  />
                ) : (
                  <span className="text-muted">Sin logo seleccionado</span>
                )}
                {clubEditingId && clubExistingLogo && (
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="removeLogo"
                      name="removeLogo"
                      checked={clubForm.removeLogo}
                      onChange={handleToggleRemoveLogo}
                    />
                    <label className="form-check-label" htmlFor="removeLogo">
                      Eliminar logo actual
                    </label>
                  </div>
                )}
              </div>
              <div className="col-12 d-flex gap-2">
                <button type="submit" className="btn btn-primary" disabled={clubLoading}>
                  {clubLoading
                    ? clubEditingId
                      ? 'Guardando...'
                      : 'Creando...'
                    : clubEditingId
                      ? 'Guardar cambios'
                      : 'Crear club'}
                </button>
                {clubEditingId && (
                  <button type="button" className="btn btn-outline-secondary" onClick={cancelClubEdit} disabled={clubLoading}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </section>

      <section className="mt-5">
        <h2 className="mb-3 text-center text-md-start">Clubs registrados</h2>
        <div className="table-responsive">
          <table className="table table-striped align-middle">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Federación</th>
                <th>Logo</th>
                <th className="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clubs.map((club) => {
                const federationId =
                  club.federation && typeof club.federation === 'object'
                    ? club.federation._id
                    : club.federation;
                const federationNombre =
                  club.federation && typeof club.federation === 'object'
                    ? club.federation.nombre
                    : federationId
                      ? federacionesPorId.get(federationId) || ''
                      : '';

                return (
                  <tr key={club._id}>
                    <td className="fw-semibold">{club.nombre}</td>
                    <td>{federationNombre ? federationNombre : <span className="text-muted">-</span>}</td>
                    <td>
                      {club.logo ? (
                        <img
                          src={club.logo}
                          alt={`Logo ${club.nombre}`}
                          style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                        />
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td className="text-center">
                      <div className="btn-group btn-group-sm" role="group">
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => handleClubEdit(club)}
                          disabled={clubLoading}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-danger"
                          onClick={() => handleClubDelete(club._id)}
                          disabled={clubLoading}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {clubs.length === 0 && (
          <p className="text-muted text-center mt-3">Todavía no hay clubes registrados.</p>
        )}
      </section>


    </div>
  );
}

