import { useEffect, useState } from 'react';
import api from '../api';

const initialState = {
  phone: '',
  email: '',
  address: '',
  mapUrl: '',
  facebook: '',
  instagram: '',
  whatsapp: '',
  x: '',
  history: ''
};

const normaliseValue = (value) => (typeof value === 'string' ? value : '');

export default function ContactoClub() {
  const [form, setForm] = useState(initialState);
  const [clubName, setClubName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  useEffect(() => {
    let active = true;

    const loadContactInfo = async () => {
      setLoading(true);
      try {
        const res = await api.get('/clubs/contact');
        if (!active) return;
        const info = res.data?.contactInfo || {};
        setForm({
          phone: normaliseValue(info.phone),
          email: normaliseValue(info.email),
          address: normaliseValue(info.address),
          mapUrl: normaliseValue(info.mapUrl),
          facebook: normaliseValue(info.facebook),
          instagram: normaliseValue(info.instagram),
          whatsapp: normaliseValue(info.whatsapp),
          x: normaliseValue(info.x),
          history: normaliseValue(info.history)
        });
        const club = res.data?.club || {};
        setClubName(normaliseValue(club.nombreAmigable) || normaliseValue(club.nombre));
        setFeedback({ type: '', message: '' });
      } catch (err) {
        if (!active) return;
        console.error('Error al cargar la información de contacto del club', err);
        setFeedback({
          type: 'danger',
          message: err.response?.data?.mensaje || 'No se pudo cargar la información de contacto del club'
        });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadContactInfo();

    return () => {
      active = false;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFeedback({ type: '', message: '' });

    try {
      const res = await api.put('/clubs/contact', form);
      const info = res.data?.contactInfo || {};
      setForm({
        phone: normaliseValue(info.phone),
        email: normaliseValue(info.email),
        address: normaliseValue(info.address),
        mapUrl: normaliseValue(info.mapUrl),
        facebook: normaliseValue(info.facebook),
        instagram: normaliseValue(info.instagram),
        whatsapp: normaliseValue(info.whatsapp),
        x: normaliseValue(info.x),
        history: normaliseValue(info.history)
      });
      const updatedClub = res.data?.club || {};
      setClubName((prev) => normaliseValue(updatedClub.nombreAmigable) || normaliseValue(updatedClub.nombre) || prev);
      setFeedback({ type: 'success', message: res.data?.mensaje || 'Información de contacto actualizada' });
      window.dispatchEvent(
        new CustomEvent('clubContactInfoUpdated', {
          detail: {
            contactInfo: info,
            club: updatedClub || null
          }
        })
      );
    } catch (err) {
      console.error('Error al actualizar la información de contacto del club', err);
      setFeedback({
        type: 'danger',
        message: err.response?.data?.mensaje || 'No se pudo actualizar la información de contacto del club'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container py-4">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h1 className="h3 m-0">Información de contacto del club</h1>
            {clubName && <span className="badge bg-primary fs-6">{clubName}</span>}
          </div>

          {feedback.message && (
            <div className={`alert alert-${feedback.type}`} role="alert">
              {feedback.message}
            </div>
          )}

          <div className="card shadow-sm">
            <div className="card-body">
              <p className="text-muted">
                Definí los datos de contacto que se mostrarán en el pie de página del sitio para las personas que visitan tu club.
              </p>

              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label htmlFor="phone" className="form-label">
                        Teléfono de contacto
                      </label>
                      <input
                        type="text"
                        id="phone"
                        name="phone"
                        className="form-control"
                        placeholder="Ej: +54 9 11 1234-5678"
                        value={form.phone}
                        onChange={handleChange}
                        disabled={saving}
                      />
                      <div className="form-text">
                        Se mostrará como teléfono principal del club.
                      </div>
                    </div>

                    <div className="col-md-6">
                      <label htmlFor="whatsapp" className="form-label">
                        Número de WhatsApp
                      </label>
                      <input
                        type="text"
                        id="whatsapp"
                        name="whatsapp"
                        className="form-control"
                        placeholder="Ej: 5491112345678"
                        value={form.whatsapp}
                        onChange={handleChange}
                        disabled={saving}
                      />
                      <div className="form-text">
                        Usaremos este número para el enlace directo a WhatsApp.
                      </div>
                    </div>

                    <div className="col-md-6">
                      <label htmlFor="email" className="form-label">
                        Correo electrónico
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        className="form-control"
                        placeholder="Ej: contacto@club.com"
                        value={form.email}
                        onChange={handleChange}
                        disabled={saving}
                      />
                    </div>

                    <div className="col-md-6">
                      <label htmlFor="mapUrl" className="form-label">
                        Enlace al mapa
                      </label>
                      <input
                        type="url"
                        id="mapUrl"
                        name="mapUrl"
                        className="form-control"
                        placeholder="Ej: https://maps.google.com/..."
                        value={form.mapUrl}
                        onChange={handleChange}
                        disabled={saving}
                      />
                      <div className="form-text">
                        Si lo completás, la dirección abrirá esta ubicación en una nueva pestaña.
                      </div>
                    </div>

                    <div className="col-12">
                      <label htmlFor="address" className="form-label">
                        Dirección
                      </label>
                      <input
                        type="text"
                        id="address"
                        name="address"
                        className="form-control"
                        placeholder="Ej: Av. Siempre Viva 742, Buenos Aires"
                        value={form.address}
                        onChange={handleChange}
                        disabled={saving}
                      />
                    </div>

                    <div className="col-md-6">
                      <label htmlFor="facebook" className="form-label">
                        Facebook
                      </label>
                      <input
                        type="url"
                        id="facebook"
                        name="facebook"
                        className="form-control"
                        placeholder="https://www.facebook.com/tuclub"
                        value={form.facebook}
                        onChange={handleChange}
                        disabled={saving}
                      />
                    </div>

                    <div className="col-md-6">
                      <label htmlFor="instagram" className="form-label">
                        Instagram
                      </label>
                      <input
                        type="url"
                        id="instagram"
                        name="instagram"
                        className="form-control"
                        placeholder="https://www.instagram.com/tuclub"
                        value={form.instagram}
                        onChange={handleChange}
                        disabled={saving}
                      />
                    </div>

                    <div className="col-md-6">
                      <label htmlFor="x" className="form-label">
                        X (Twitter)
                      </label>
                      <input
                        type="url"
                        id="x"
                        name="x"
                        className="form-control"
                        placeholder="https://x.com/tuclub"
                        value={form.x}
                        onChange={handleChange}
                        disabled={saving}
                      />
                    </div>

                    <div className="col-12">
                      <label htmlFor="history" className="form-label">
                        Historia del club
                      </label>
                      <textarea
                        id="history"
                        name="history"
                        className="form-control"
                        placeholder="Contá cómo nació y creció el club"
                        value={form.history}
                        onChange={handleChange}
                        rows="6"
                        disabled={saving}
                      ></textarea>
                      <div className="form-text">
                        Este texto se mostrará en el recuadro de historia del pie de página.
                      </div>
                    </div>
                  </div>

                  <div className="d-flex justify-content-end mt-4">
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
