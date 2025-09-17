-- ------------------------------------------------------------
-- Esquema relacional para el sistema Patín Carrera (MySQL 8)
-- ------------------------------------------------------------
-- Ejecuta este script con un usuario que cuente con permisos para
-- crear bases de datos y tablas:
--   mysql -u <usuario> -p < backend-auth/database/mysql_schema.sql
-- ------------------------------------------------------------

CREATE DATABASE IF NOT EXISTS patincarrera
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE patincarrera;

-- ------------------------------------------------------------
-- Tabla: clubs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clubs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_clubs_nombre (nombre)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Tabla: users
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  email VARCHAR(191) NOT NULL,
  password VARCHAR(255) DEFAULT NULL,
  rol ENUM('Delegado', 'Tecnico', 'Deportista') NOT NULL DEFAULT 'Deportista',
  confirmado TINYINT(1) NOT NULL DEFAULT 0,
  token_confirmacion VARCHAR(255) DEFAULT NULL,
  google_id VARCHAR(255) DEFAULT NULL,
  foto VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Tabla: patinadores
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patinadores (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  primer_nombre VARCHAR(100) NOT NULL,
  segundo_nombre VARCHAR(100) DEFAULT NULL,
  apellido VARCHAR(100) NOT NULL,
  edad TINYINT UNSIGNED NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  dni VARCHAR(50) NOT NULL,
  cuil VARCHAR(50) NOT NULL,
  direccion VARCHAR(255) NOT NULL,
  dni_madre VARCHAR(50) NOT NULL,
  dni_padre VARCHAR(50) NOT NULL,
  telefono VARCHAR(50) NOT NULL,
  sexo ENUM('M', 'F') NOT NULL,
  nivel ENUM('Escuela', 'Transicion', 'Intermedia', 'Federados') NOT NULL,
  seguro ENUM('S/S', 'SA', 'SD') NOT NULL DEFAULT 'S/S',
  numero_corredor INT UNSIGNED NOT NULL,
  categoria VARCHAR(100) NOT NULL,
  foto_rostro VARCHAR(255) DEFAULT NULL,
  foto VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_patinadores_dni (dni),
  UNIQUE KEY uq_patinadores_cuil (cuil),
  UNIQUE KEY uq_patinadores_numero_corredor (numero_corredor)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Tabla: patinador_historial_seguros
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patinador_historial_seguros (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  patinador_id INT UNSIGNED NOT NULL,
  tipo ENUM('SD', 'SA') NOT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_historial_patinador
    FOREIGN KEY (patinador_id) REFERENCES patinadores(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Tabla: torneos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS torneos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Tabla: competencias
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS competencias (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  torneo_id INT UNSIGNED NOT NULL,
  fecha DATE NOT NULL,
  imagen VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_competencias_torneo
    FOREIGN KEY (torneo_id) REFERENCES torneos(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Tabla: competencia_lista_buena_fe (patinadores habilitados)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS competencia_lista_buena_fe (
  competencia_id INT UNSIGNED NOT NULL,
  patinador_id INT UNSIGNED NOT NULL,
  agregado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (competencia_id, patinador_id),
  CONSTRAINT fk_lista_competencia
    FOREIGN KEY (competencia_id) REFERENCES competencias(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_lista_patinador
    FOREIGN KEY (patinador_id) REFERENCES patinadores(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Tabla: patinador_externos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patinador_externos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  primer_nombre VARCHAR(100) NOT NULL,
  segundo_nombre VARCHAR(100) NOT NULL DEFAULT '',
  apellido VARCHAR(100) NOT NULL,
  club VARCHAR(150) NOT NULL,
  categoria VARCHAR(100) NOT NULL,
  numero_corredor INT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_patinador_externo (primer_nombre, segundo_nombre, apellido, club)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Tabla: news
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS news (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(200) NOT NULL,
  contenido TEXT NOT NULL,
  imagen VARCHAR(255) DEFAULT NULL,
  autor_id INT UNSIGNED NOT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_news_autor
    FOREIGN KEY (autor_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Tabla: entrenamientos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entrenamientos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  fecha DATETIME NOT NULL,
  tecnico_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_entrenamientos_tecnico
    FOREIGN KEY (tecnico_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Tabla: entrenamiento_asistencias
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entrenamiento_asistencias (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  entrenamiento_id INT UNSIGNED NOT NULL,
  patinador_id INT UNSIGNED NOT NULL,
  estado ENUM('Presente', 'Ausente', 'No entrena') NOT NULL DEFAULT 'Ausente',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_asistencias_entrenamiento
    FOREIGN KEY (entrenamiento_id) REFERENCES entrenamientos(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_asistencias_patinador
    FOREIGN KEY (patinador_id) REFERENCES patinadores(id)
    ON DELETE CASCADE,
  UNIQUE KEY uq_asistencia_entrenamiento_patinador (entrenamiento_id, patinador_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Tabla: progresos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS progresos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  patinador_id INT UNSIGNED NOT NULL,
  tecnico_id INT UNSIGNED NOT NULL,
  descripcion TEXT NOT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  enviado TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_progresos_patinador
    FOREIGN KEY (patinador_id) REFERENCES patinadores(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_progresos_tecnico
    FOREIGN KEY (tecnico_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Tabla: notifications
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  destinatario_id INT UNSIGNED NOT NULL,
  mensaje TEXT NOT NULL,
  leido TINYINT(1) NOT NULL DEFAULT 0,
  competencia_id INT UNSIGNED DEFAULT NULL,
  progreso_id INT UNSIGNED DEFAULT NULL,
  estado_respuesta ENUM('Pendiente', 'Participo', 'No Participo') NOT NULL DEFAULT 'Pendiente',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_destinatario
    FOREIGN KEY (destinatario_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_notifications_competencia
    FOREIGN KEY (competencia_id) REFERENCES competencias(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_notifications_progreso
    FOREIGN KEY (progreso_id) REFERENCES progresos(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Tabla: resultados
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resultados (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  competencia_id INT UNSIGNED NOT NULL,
  deportista_id INT UNSIGNED DEFAULT NULL,
  invitado_id INT UNSIGNED DEFAULT NULL,
  categoria VARCHAR(100) NOT NULL,
  club_id INT UNSIGNED DEFAULT NULL,
  posicion INT UNSIGNED DEFAULT NULL,
  puntos INT DEFAULT NULL,
  dorsal VARCHAR(50) DEFAULT NULL,
  fuente_archivo VARCHAR(255) DEFAULT NULL,
  fuente_hash VARCHAR(128) DEFAULT NULL,
  fuente_fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_resultados_competencia
    FOREIGN KEY (competencia_id) REFERENCES competencias(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_resultados_deportista
    FOREIGN KEY (deportista_id) REFERENCES patinadores(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_resultados_invitado
    FOREIGN KEY (invitado_id) REFERENCES patinador_externos(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_resultados_club
    FOREIGN KEY (club_id) REFERENCES clubs(id)
    ON DELETE SET NULL,
  CONSTRAINT chk_resultados_deportista_o_invitado
    CHECK ((deportista_id IS NOT NULL AND invitado_id IS NULL) OR (deportista_id IS NULL AND invitado_id IS NOT NULL)),
  UNIQUE KEY uq_resultados_deportista (competencia_id, deportista_id, categoria),
  UNIQUE KEY uq_resultados_invitado (competencia_id, invitado_id, categoria)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Tabla: user_patinadores (relación usuarios/patinadores)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_patinadores (
  user_id INT UNSIGNED NOT NULL,
  patinador_id INT UNSIGNED NOT NULL,
  rol ENUM('Tutor', 'Responsable', 'Otro') DEFAULT 'Tutor',
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, patinador_id),
  CONSTRAINT fk_user_patinadores_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_user_patinadores_patinador
    FOREIGN KEY (patinador_id) REFERENCES patinadores(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

