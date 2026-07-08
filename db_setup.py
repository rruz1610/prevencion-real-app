import sqlite3
import os

DB_PATH = 'database.db'

def create_database():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Tabla de Proyectos
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS proyectos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        ubicacion TEXT NOT NULL,
        fecha_inicio TEXT
    )
    ''')

    # Tabla de Trabajadores
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS trabajadores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rut TEXT UNIQUE NOT NULL,
        nombre TEXT NOT NULL,
        cargo TEXT NOT NULL,
        proyecto_id INTEGER,
        odi_firmado BOOLEAN DEFAULT 0,
        estado TEXT DEFAULT 'Activo',
        email TEXT,
        telefono TEXT,
        FOREIGN KEY (proyecto_id) REFERENCES proyectos (id)
    )
    ''')

    # Tabla de Inspecciones
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS inspecciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha TEXT NOT NULL,
        proyecto_id INTEGER,
        inspector TEXT NOT NULL,
        puntaje INTEGER,
        observaciones TEXT,
        FOREIGN KEY (proyecto_id) REFERENCES proyectos (id)
    )
    ''')

    # Tabla de Stock EPP
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS epp_stock (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item TEXT NOT NULL,
        cantidad INTEGER NOT NULL
    )
    ''')

    # Tabla de Denuncias Ley Karin
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS denuncias_karin (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha_denuncia TEXT NOT NULL,
        denunciante TEXT NOT NULL,
        denunciado TEXT NOT NULL,
        descripcion TEXT,
        estado TEXT DEFAULT 'Ingresada',
        plazo_dias INTEGER DEFAULT 30
    )
    ''')

    # Tabla Entregas de Documentos
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS entregas_documentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trabajador_id INTEGER,
        tipo_documento TEXT NOT NULL,
        descripcion TEXT,
        estado_firma TEXT DEFAULT 'Pendiente',
        fecha TEXT NOT NULL,
        FOREIGN KEY (trabajador_id) REFERENCES trabajadores (id)
    )
    ''')

    # Tabla Codigos Verificacion
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS codigos_verificacion (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trabajador_id INTEGER,
        entrega_id INTEGER,
        codigo TEXT NOT NULL,
        expira_en TEXT NOT NULL,
        usado BOOLEAN DEFAULT 0,
        FOREIGN KEY (trabajador_id) REFERENCES trabajadores (id),
        FOREIGN KEY (entrega_id) REFERENCES entregas_documentos (id)
    )
    ''')

    # Tabla Maquinaria en Obra
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS maquinaria_obra (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        empresa_id INTEGER,
        obra_id INTEGER,
        maquinaria TEXT NOT NULL,
        marca TEXT,
        modelo TEXT,
        patente_codigo TEXT,
        requiere_permiso BOOLEAN DEFAULT 0,
        vigencia_permiso TEXT,
        vigencia_licencia TEXT,
        vigencia_examen TEXT,
        rut_conductor TEXT,
        nombre_conductor TEXT
    )
    ''')

    # Insertar datos de demostración
    cursor.execute("SELECT COUNT(*) FROM proyectos")
    if cursor.fetchone()[0] == 0:
        print("Insertando datos de demostración...")
        cursor.execute("INSERT INTO proyectos (nombre, ubicacion, fecha_inicio) VALUES ('Edificio Vista Andes', 'Providencia, RM', '2026-01-15')")
        cursor.execute("INSERT INTO proyectos (nombre, ubicacion, fecha_inicio) VALUES ('Puente Bicentenario', 'Concepción, Biobío', '2025-11-01')")
        
        cursor.execute("INSERT INTO trabajadores (rut, nombre, cargo, proyecto_id, odi_firmado, email, telefono) VALUES ('18.123.456-7', 'Juan Pérez', 'Jornal', 1, 1, 'juan@ejemplo.com', '+56912345678')")
        cursor.execute("INSERT INTO trabajadores (rut, nombre, cargo, proyecto_id, odi_firmado, email, telefono) VALUES ('17.987.654-3', 'María González', 'Prevencionista', 1, 1, 'maria@ejemplo.com', '+56987654321')")
        cursor.execute("INSERT INTO trabajadores (rut, nombre, cargo, proyecto_id, odi_firmado, email, telefono) VALUES ('19.555.444-K', 'Pedro Soto', 'Carpintero', 2, 0, 'pedro@ejemplo.com', '+56911223344')")
        
        cursor.execute("INSERT INTO epp_stock (item, cantidad) VALUES ('Casco Blanco', 50)")
        cursor.execute("INSERT INTO epp_stock (item, cantidad) VALUES ('Guantes de Cabritilla', 120)")
        cursor.execute("INSERT INTO epp_stock (item, cantidad) VALUES ('Lentes de Seguridad', 80)")
        cursor.execute("INSERT INTO epp_stock (item, cantidad) VALUES ('Arnés de Seguridad', 25)")
        
        cursor.execute("INSERT INTO denuncias_karin (fecha_denuncia, denunciante, denunciado, descripcion) VALUES ('2026-06-10', 'Anonimo', 'Jefe de Obra', 'Maltrato verbal constante')")

    conn.commit()
    conn.close()
    print("Base de datos creada/verificada correctamente en 'database.db'.")

if __name__ == '__main__':
    create_database()
