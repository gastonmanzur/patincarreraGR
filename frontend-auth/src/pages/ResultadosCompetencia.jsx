import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';

const CATEGORIAS = [
  'CHP',
  'M7DE',
  'M7VE',
  'PDE',
  'PVE',
  '6DE',
  '6VE',
  '5DE',
  '5VE',
  '4DE',
  '4VE',
  'JDE',
  'JVE',
  'MDE',
  'MVE',
  'PDT',
  'PVT',
  '6DT',
  '6VT',
  '5DT',
  '5VT',
  '4DT',
  '4VT',
  'JDI',
  'JVI',
  'MDI',
  'MVI',
  'PDF',
  'PVF',
  '6DF',
  '6VF',
  '5DF',
  '5VF',
  '4DF',
  '4VF',
  'JDF',
  'JVF',
  'MDF',
  'MVF'
];

export default function ResultadosCompetencia() {
  const { id } = useParams();
  const [resultados, setResultados] = useState([]);
  const [patinadores, setPatinadores] = useState([]);
  const [externos, setExternos] = useState([]);
  const [clubes, setClubes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [archivo, setArchivo] = useState(null);

  const [categoria, setCategoria] = useState('');
  const [puntos, setPuntos] = useState('');
  const [dorsal, setDorsal] = useState('');
  const [tipo, setTipo] = useState('local');
  const [patinadorId, setPatinadorId] = useState('');
  const [externoSeleccionado, setExternoSeleccionado] = useState('');
  const [invitado, setInvitado] = useState({
    primerNombre: '',
    segundoNombre: '',
    apellido: '',
    club: ''
  });
  const rol = localStorage.getItem('rol');

  useEffect(() => {
    setPatinadorId('');
    setExternoSeleccionado('');
  }, [categoria]);

  const patinadoresFiltrados = categoria
    ? patinadores.filter((p) => p.categoria === categoria)
    : patinadores;

  const externosFiltrados = categoria
    ? externos.filter((e) => e.categoria === categoria)
    : externos;

  useEffect(() => {
    const cargar = async () => {
      try {
        const [resRes, resPat, resExt, resClubs] = await Promise.all([
          api.get(`/competitions/${id}/resultados`),
          api.get('/patinadores'),
          api.get('/patinadores-externos'),
          api.get('/clubs')
        ]);
        setResultados(resRes.data);
        setPatinadores(resPat.data);
        setExternos(resExt.data);
        setClubes(resClubs.data);
      } catch (err) {
        console.error(err);
        setError('Error al cargar resultados');
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [id]);

  const handleSelectExterno = (id) => {
    setExternoSeleccionado(id);
    const ext = externos.find((e) => e._id === id);
    if (ext) {
      setInvitado({
        primerNombre: ext.primerNombre,
        segundoNombre: ext.segundoNombre || '',
        apellido: ext.apellido,
        club: ext.club
      });
      setDorsal(ext.numeroCorredor || '');
    } else {
      setInvitado({ primerNombre: '', segundoNombre: '', apellido: '', club: '' });
      setDorsal('');
    }
  };

  const agregarManual = async (e) => {
    e.preventDefault();
    try {
      const payload = { categoria, puntos, dorsal };
      if (tipo === 'local') {
        if (!patinadorId) {
          alert('Seleccione un patinador');
          return;
        }
        payload.patinadorId = patinadorId;
      } else {
        if (!invitado.primerNombre || !invitado.apellido || !invitado.club) {
          alert('Complete los datos del patinador externo');
          return;
        }
        payload.invitado = invitado;
      }
      await api.post(`/competitions/${id}/resultados/manual`, payload);
      const [resRes, resExt, resClubs] = await Promise.all([
        api.get(`/competitions/${id}/resultados`),
        api.get('/patinadores-externos'),
        api.get('/clubs')
      ]);
      setResultados(resRes.data);
      setExternos(resExt.data);
      setClubes(resClubs.data);
      setPuntos('');
      setDorsal('');
      setPatinadorId('');
      setExternoSeleccionado('');
      setInvitado({ primerNombre: '', segundoNombre: '', apellido: '', club: '' });
    } catch (err) {
      console.error(err);
      alert('Error al guardar resultado');
    }
  };
  const importar = async (e) => {
    e.preventDefault();
    if (!archivo) return;
    try {
      const formData = new FormData();
      formData.append('archivo', archivo);
      await api.post(`/competitions/${id}/resultados/import-pdf`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const res = await api.get(`/competitions/${id}/resultados`);
      setResultados(res.data);
      setArchivo(null);
    } catch (err) {
      console.error(err);
      alert('Error al importar resultados');
    }
  };

  if (loading) return <div className="container mt-3">Cargando resultados...</div>;
  if (error) return <div className="container mt-3 text-danger">{error}</div>;

  return (
    <div className="container mt-3">
      <h2>Resultados</h2>
      {rol === 'Delegado' && (
        <>
          <form onSubmit={importar} className="mb-3">
            <div className="input-group">
              <input
                type="file"
                accept="application/pdf"
                className="form-control"
                onChange={(e) => setArchivo(e.target.files[0])}
              />
              <button
                className="btn btn-primary"
                type="submit"
                disabled={!archivo}
              >
                Importar PDF
              </button>
            </div>
          </form>
          <form onSubmit={agregarManual} className="mb-3">
            <div className="row g-2 align-items-end">
              <div className="col-md-2">
                <label className="form-label">Categoría</label>
                <select
                  className="form-select"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  required
                >
                  <option value="">Seleccione</option>
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">Puntos</label>
                <input
                  type="number"
                  className="form-control"
                  value={puntos}
                  onChange={(e) => setPuntos(e.target.value)}
                />
              </div>
              <div className="col-md-2">
                <label className="form-label">N° de patinador</label>
                <input
                  className="form-control"
                  value={dorsal}
                  onChange={(e) => setDorsal(e.target.value)}
                  readOnly={tipo === 'local'}
                />
              </div>
              <div className="col-12 mt-2">
                <div className="form-check form-check-inline">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="tipo"
                    id="tipoLocal"
                    value="local"
                    checked={tipo === 'local'}
                    onChange={() => setTipo('local')}
                  />
                  <label className="form-check-label" htmlFor="tipoLocal">
                    Club GR
                  </label>
                </div>
                <div className="form-check form-check-inline">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="tipo"
                    id="tipoExterno"
                    value="externo"
                    checked={tipo === 'externo'}
                    onChange={() => setTipo('externo')}
                  />
                  <label className="form-check-label" htmlFor="tipoExterno">
                    Otro club
                  </label>
                </div>
              </div>
              {tipo === 'local' ? (
                <div className="col-12 mt-2">
                  <select
                    className="form-select"
                    value={patinadorId}
                    onChange={(e) => {
                      setPatinadorId(e.target.value);
                      const seleccionado = patinadoresFiltrados.find(
                        (p) => p._id === e.target.value
                      );
                      setDorsal(seleccionado ? seleccionado.numeroCorredor : '');
                    }}
                    required
                  >
                    <option value="">Seleccione patinador</option>
                    {patinadoresFiltrados.map((p) => (
                      <option key={p._id} value={p._id}>
                        {`${p.primerNombre} ${p.segundoNombre || ''} ${p.apellido}`.trim()}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="col-12 mt-2">
                  <select
                    className="form-select mb-2"
                    value={externoSeleccionado}
                    onChange={(e) => handleSelectExterno(e.target.value)}
                  >
                    <option value="">Nuevo patinador</option>
                    {externosFiltrados.map((ex) => (
                      <option key={ex._id} value={ex._id}>
                        {`${ex.primerNombre} ${ex.segundoNombre || ''} ${ex.apellido} - ${ex.club}`.trim()}
                      </option>
                    ))}
                  </select>
                  <div className="row g-2">
                    <div className="col-md-3">
                      <input
                        className="form-control"
                        placeholder="Primer nombre"
                        value={invitado.primerNombre}
                        onChange={(e) =>
                          setInvitado({ ...invitado, primerNombre: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="col-md-3">
                      <input
                        className="form-control"
                        placeholder="Segundo nombre"
                        value={invitado.segundoNombre}
                        onChange={(e) =>
                          setInvitado({ ...invitado, segundoNombre: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-md-3">
                      <input
                        className="form-control"
                        placeholder="Apellido"
                        value={invitado.apellido}
                        onChange={(e) =>
                          setInvitado({ ...invitado, apellido: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="col-md-3">
                      <input
                        className="form-control"
                        placeholder="Club"
                        list="lista-clubes"
                        value={invitado.club}
                        onChange={(e) =>
                          setInvitado({ ...invitado, club: e.target.value })
                        }
                        required
                      />
                      <datalist id="lista-clubes">
                        {clubes.map((c) => (
                          <option key={c._id} value={c.nombre} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                </div>
              )}
              <div className="col-12 mt-3">
                <button className="btn btn-success" type="submit">
                  Agregar
                </button>
              </div>
            </div>
          </form>
        </>
      )}
      {resultados.length === 0 ? (
        <p>No hay resultados cargados.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Categoría</th>
                <th>Posición</th>
                <th>Nombre</th>
                <th>Puntos</th>
                <th>N° de patinador</th>
              </tr>
            </thead>
            <tbody>
              {resultados.map((r) => (
                <tr key={r._id}>
                  <td>{r.categoria}</td>
                  <td>{r.posicion}</td>
                  <td>
                    {r.deportistaId
                      ? `${r.deportistaId?.primerNombre || ''} ${r.deportistaId?.segundoNombre || ''} ${r.deportistaId?.apellido || ''}`.trim()
                      : `${r.invitadoId?.primerNombre || ''} ${r.invitadoId?.segundoNombre || ''} ${r.invitadoId?.apellido || ''}`.trim()}
                  </td>
                  <td>{r.puntos}</td>
                  <td>{r.dorsal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

