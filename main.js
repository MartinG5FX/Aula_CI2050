/* main.js - Lógica Aula Virtual Chile Innova 2050 */
(function() {
    try {
        if (window.self !== window.top) {
            window.top.location = window.self.location;
        }
    } catch(e) {}
})();

// Docente único oficial fijo asignado con datos reales
const DOCENTE_OFICIAL = {
    id: 1,
    nombreCompleto: "Hugo Alberto Sánchez Vega",
    nombre: "Hugo",
    rut: "12.626.135-7",
    correo: "academia@chileinnova2050.cl",
    pass: "CasaAzul27$",
    pinEnc: [49, 57, 56, 56], // PIN '1988'
    fono: "+56 9 7528 0132",
    rol: "docente"
};

const DOMINIOS_REALES_PERMITIDOS = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com', 'chileinnova2050.cl', 'uc.cl', 'uchile.cl', 'usach.cl'];

function esCorreoRealValido(email) {
    if (!email || !email.includes('@')) return false;
    const partes = email.toLowerCase().split('@');
    if (partes.length !== 2) return false;
    const domain = partes[1].trim();
    return DOMINIOS_REALES_PERMITIDOS.includes(domain);
}

// PERSISTENCIA COMPARTIDA Y MULTI-DISPOSITIVO REAL (PeerJS + BroadcastChannel + IndexedDB + LocalStorage)
const DB_NAME = 'Aula_CI2050_DB';
const DB_VERSION = 1;
let idb = null;

const broadcastChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('aula_ci2050_sync_channel') : null;

let peer = null;
let peerConnections = [];
const ROOM_ID_PEER = 'aula-ci2050-shared-room';

function initPeerSync() {
    if (typeof Peer === 'undefined') return;
    try {
        peer = new Peer(ROOM_ID_PEER);
        peer.on('open', (id) => {});
        peer.on('connection', (conn) => {
            peerConnections.push(conn);
            setupConnEvents(conn);
            conn.send({
                type: 'FULL_STATE_SYNC',
                data: {
                    estudiantes: estudiantesDB,
                    cursos: cursosDB,
                    materiales: materialesDB,
                    complementarios: complementariosDB,
                    evaluaciones: evaluacionesDB,
                    progress: studentProgressDB,
                    submissions: studentSubmissionsDB
                }
            });
        });

        peer.on('error', (err) => {
            if (err.type === 'unavailable-id') {
                peer = new Peer();
                peer.on('open', () => {
                    const conn = peer.connect(ROOM_ID_PEER);
                    peerConnections.push(conn);
                    setupConnEvents(conn);
                });
            }
        });
    } catch(e) {}
}

function setupConnEvents(conn) {
    conn.on('data', (data) => {
        if (data && data.type === 'FULL_STATE_SYNC') {
            const d = data.data;
            if (d.estudiantes) estudiantesDB = d.estudiantes;
            if (d.cursos) cursosDB = d.cursos;
            if (d.materiales) materialesDB = d.materiales;
            if (d.complementarios) complementariosDB = d.complementarios;
            if (d.evaluaciones) evaluacionesDB = d.evaluaciones;
            if (d.progress) studentProgressDB = d.progress;
            if (d.submissions) studentSubmissionsDB = d.submissions;

            saveLocalOnly();
            if (currentUser) updateHeaderProfile();
        } else if (data && data.type === 'DATA_UPDATED') {
            const { key, value } = data;
            if (key === 'ci2050_estudiantes') estudiantesDB = value;
            if (key === 'ci2050_cursos') cursosDB = value;
            if (key === 'ci2050_materiales') materialesDB = value;
            if (key === 'ci2050_complementarios') complementariosDB = value;
            if (key === 'ci2050_evaluaciones') evaluacionesDB = value;
            if (key === 'ci2050_progress') studentProgressDB = value;
            if (key === 'ci2050_submissions') studentSubmissionsDB = value;

            saveLocalOnly();
            if (currentUser) updateHeaderProfile();
        }
    });

    conn.on('close', () => {
        peerConnections = peerConnections.filter(c => c !== conn);
    });
}

function broadcastPeerMessage(payload) {
    peerConnections.forEach(conn => {
        if (conn.open) {
            try { conn.send(payload); } catch(e) {}
        }
    });
}

function initIndexedDB() {
    return new Promise((resolve) => {
        try {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('app_data')) {
                    db.createObjectStore('app_data', { keyPath: 'key' });
                }
            };
            request.onsuccess = (e) => {
                idb = e.target.result;
                resolve(idb);
            };
            request.onerror = () => resolve(null);
        } catch(err) {
            resolve(null);
        }
    });
}

function saveLocalOnly() {
    try {
        localStorage.setItem('ci2050_estudiantes', JSON.stringify(estudiantesDB));
        localStorage.setItem('ci2050_cursos', JSON.stringify(cursosDB));
        localStorage.setItem('ci2050_materiales', JSON.stringify(materialesDB));
        localStorage.setItem('ci2050_complementarios', JSON.stringify(complementariosDB));
        localStorage.setItem('ci2050_evaluaciones', JSON.stringify(evaluacionesDB));
        localStorage.setItem('ci2050_progress', JSON.stringify(studentProgressDB));
        localStorage.setItem('ci2050_submissions', JSON.stringify(studentSubmissionsDB));
    } catch(e) {}
}

async function saveToDB(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch(e) {}

    if (idb) {
        try {
            const tx = idb.transaction('app_data', 'readwrite');
            tx.objectStore('app_data').put({ key: key, value: data });
        } catch(e) {}
    }

    if (broadcastChannel) {
        try {
            broadcastChannel.postMessage({ type: 'DATA_UPDATED', key: key, value: data });
        } catch(e) {}
    }

    broadcastPeerMessage({ type: 'DATA_UPDATED', key: key, value: data });
}

async function loadFromDB(key, defaultVal) {
    let val = null;
    try {
        const lsVal = localStorage.getItem(key);
        if (lsVal !== null) val = JSON.parse(lsVal);
    } catch(e) {}

    if (!val && idb) {
        try {
            val = await new Promise((resolve) => {
                const tx = idb.transaction('app_data', 'readonly');
                const req = tx.objectStore('app_data').get(key);
                req.onsuccess = () => resolve(req.result ? req.result.value : null);
                req.onerror = () => resolve(null);
            });
        } catch(e) {}
    }
    return val !== null ? val : defaultVal;
}

let docentesDB = [DOCENTE_OFICIAL];
let estudiantesDB = [];
let cursosDB = [];
let materialesDB = [];
let complementariosDB = [];
let evaluacionesDB = [];
let studentProgressDB = {};
let studentSubmissionsDB = [];

async function initStorage() {
    await initIndexedDB();
    estudiantesDB = await loadFromDB('ci2050_estudiantes', []);
    cursosDB = await loadFromDB('ci2050_cursos', []);
    materialesDB = await loadFromDB('ci2050_materiales', []);
    complementariosDB = await loadFromDB('ci2050_complementarios', []);
    evaluacionesDB = await loadFromDB('ci2050_evaluaciones', []);
    studentProgressDB = await loadFromDB('ci2050_progress', {});
    studentSubmissionsDB = await loadFromDB('ci2050_submissions', []);

    persistData();
    initPeerSync();
}

if (broadcastChannel) {
    broadcastChannel.onmessage = async (event) => {
        if (event.data && event.data.type === 'DATA_UPDATED') {
            const { key, value } = event.data;
            if (key === 'ci2050_estudiantes') estudiantesDB = value;
            if (key === 'ci2050_cursos') cursosDB = value;
            if (key === 'ci2050_materiales') materialesDB = value;
            if (key === 'ci2050_complementarios') complementariosDB = value;
            if (key === 'ci2050_evaluaciones') evaluacionesDB = value;
            if (key === 'ci2050_progress') studentProgressDB = value;
            if (key === 'ci2050_submissions') studentSubmissionsDB = value;

            if (currentUser) updateHeaderProfile();
        }
    };
}

window.addEventListener('storage', async (e) => {
    if (e.key === 'ci2050_estudiantes' && e.newValue) estudiantesDB = JSON.parse(e.newValue);
    if (e.key === 'ci2050_cursos' && e.newValue) cursosDB = JSON.parse(e.newValue);
    if (e.key === 'ci2050_materiales' && e.newValue) materialesDB = JSON.parse(e.newValue);
    if (e.key === 'ci2050_complementarios' && e.newValue) complementariosDB = JSON.parse(e.newValue);
    if (e.key === 'ci2050_evaluaciones' && e.newValue) evaluacionesDB = JSON.parse(e.newValue);
    if (e.key === 'ci2050_progress' && e.newValue) studentProgressDB = JSON.parse(e.newValue);
    if (e.key === 'ci2050_submissions' && e.newValue) studentSubmissionsDB = JSON.parse(e.newValue);

    if (currentUser) updateHeaderProfile();
});

let currentRole = null;
let currentUser = null;

let editingStudentId = null;
let editingCourseId = null;

let pendingVideoFiles = [];
let pendingCompFiles = [];

function persistData() {
    saveToDB('ci2050_estudiantes', estudiantesDB);
    saveToDB('ci2050_cursos', cursosDB);
    saveToDB('ci2050_materiales', materialesDB);
    saveToDB('ci2050_complementarios', complementariosDB);
    saveToDB('ci2050_evaluaciones', evaluacionesDB);
    saveToDB('ci2050_progress', studentProgressDB);
    saveToDB('ci2050_submissions', studentSubmissionsDB);
}

function togglePasswordVisibility(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (!input || !icon) return;

    if (input.type === "password") {
        input.type = "text";
        icon.className = "fa-solid fa-eye-slash text-chile-blue";
    } else {
        input.type = "password";
        icon.className = "fa-solid fa-eye";
    }
}

function selectRole(role) {
    currentRole = role;
    document.getElementById('role-selection-screen').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');

    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const labelIdent = document.getElementById('label-identifier');
    const inputIdent = document.getElementById('login-identifier');
    const inputPass = document.getElementById('login-password');
    const inputPin = document.getElementById('login-pin');
    const btnSubmit = document.getElementById('login-submit-btn');
    const docPinField = document.getElementById('docente-pin-field');

    inputIdent.value = "";
    inputPass.value = "";
    inputPin.value = "";

    if (role === 'docente') {
        title.innerText = "Acceso Docente";
        subtitle.innerText = "Ingrese su PIN de seguridad, correo y contraseña autorizados.";
        labelIdent.innerText = "Correo Electrónico Docente";
        inputIdent.placeholder = "Ingrese su correo";
        btnSubmit.className = "w-full bg-chile-purple hover:bg-chile-purple-dark text-white font-extrabold py-3 rounded-lg shadow-md transition text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center space-x-2 active:scale-98";
        docPinField.classList.remove('hidden');
        inputPin.required = true;
    } else {
        title.innerText = "Acceso Estudiante";
        subtitle.innerText = "Ingrese su correo y contraseña asignados por su docente.";
        labelIdent.innerText = "Correo Electrónico Estudiante";
        inputIdent.placeholder = "Ingrese su correo";
        btnSubmit.className = "w-full bg-chile-blue hover:bg-chile-blue-dark text-white font-extrabold py-3 rounded-lg shadow-md transition text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center space-x-2 active:scale-98";
        docPinField.classList.add('hidden');
        inputPin.required = false;
    }
}

function backToRoleSelection() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('role-selection-screen').classList.remove('hidden');
    currentRole = null;
}

function handleLogin(e) {
    e.preventDefault();
    const identifier = document.getElementById('login-identifier').value.trim().toLowerCase();
    const pass = document.getElementById('login-password').value;

    if (currentRole === 'docente') {
        const pinInput = document.getElementById('login-pin').value.trim();
        const realPin = DOCENTE_OFICIAL.pinEnc.map(c => String.fromCharCode(c)).join('');

        if (pinInput !== realPin || identifier !== DOCENTE_OFICIAL.correo.toLowerCase() || pass !== DOCENTE_OFICIAL.pass) {
            showToast("Credenciales o PIN de docente incorrectos. Verifique sus datos.");
            return;
        }

        currentUser = DOCENTE_OFICIAL;
        startSession();

    } else if (currentRole === 'estudiante') {
        const foundStudent = estudiantesDB.find(st => st.correo.toLowerCase() === identifier && st.pass === pass);
        if (foundStudent) {
            currentUser = foundStudent;
            startSession();
        } else {
            showToast("Credenciales de estudiante no encontradas o incorrectas.");
        }
    }
}

function startSession() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    setupRoleUI();
    showToast(`¡Hola! ${currentUser.nombre}`);
    verificarAvisoCursosCompletos();
}

function setupRoleUI() {
    const isDocente = (currentRole === 'docente');
    updateHeaderProfile();

    document.getElementById('panel-role-text').innerText = isDocente 
        ? '/ Panel Principal - Docente' 
        : '/ Panel Principal - Estudiante';

    document.getElementById('btn-label-1').innerText = isDocente ? "CURSOS Y CREDENCIALES" : "MIS CURSOS Y PROGRESO";
    document.getElementById('btn-label-2').innerText = isDocente ? "MATERIAL COMPLEMENTARIO" : "MATERIAL COMPLEMENTARIO";
    document.getElementById('btn-label-3').innerText = isDocente ? "CREAR EVALUACIÓN" : "EVALUACIÓN";
}

function updateHeaderProfile() {
    if (!currentUser) return;
    const isDocente = (currentRole === 'docente');

    document.getElementById('greeting-title').innerText = `¡Hola! ${currentUser.nombre}`;
    document.getElementById('display-nombre').innerText = currentUser.nombreCompleto || currentUser.nombre;
    document.getElementById('display-rol').innerText = isDocente ? 'Docente' : 'Estudiante';
    document.getElementById('display-rut').innerText = currentUser.rut || "Sin RUT";
    document.getElementById('display-correo').innerText = currentUser.correo;
    document.getElementById('display-fono').innerText = currentUser.fono || "Sin Fono";

    const courseStatusBox = document.getElementById('student-course-status-header');
    const courseStatusText = document.getElementById('display-curso-asignado');

    if (!isDocente && currentUser.cursoAsignado) {
        const cObj = cursosDB.find(c => c.id === currentUser.cursoAsignado);
        const nombreCurso = cObj ? cObj.nombre : "Sin curso asignado";
        courseStatusText.innerText = `Esta cursando: ${nombreCurso}`;
        courseStatusBox.classList.remove('hidden');
    } else {
        courseStatusBox.classList.add('hidden');
    }
}

function formatBytes(bytes) {
    if (bytes === 0 || isNaN(bytes)) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// --- GESTIÓN DE CURSOS ---
function guardarCursoDocente(e) {
    e.preventDefault();
    const nombre = document.getElementById('new-course-name').value.trim();
    const desc = document.getElementById('new-course-desc').value.trim();

    if (!nombre) return;

    if (editingCourseId) {
        const curso = cursosDB.find(c => c.id === editingCourseId);
        if (curso) {
            curso.nombre = nombre;
            curso.descripcion = desc || "Sin descripción.";
            showToast("Curso actualizado correctamente.");
        }
        editingCourseId = null;
    } else {
        cursosDB.push({
            id: Date.now(),
            nombre: nombre,
            descripcion: desc || "Sin descripción."
        });
        showToast(`Curso "${nombre}" creado con éxito.`);
    }

    persistData();
    openModal('courses');
}

function editarCurso(id) {
    const curso = cursosDB.find(c => c.id === id);
    if (!curso) return;

    editingCourseId = id;
    document.getElementById('new-course-name').value = curso.nombre;
    document.getElementById('new-course-desc').value = curso.descripcion;
    document.getElementById('btn-submit-course').innerText = "Guardar Cambios del Curso";
    document.getElementById('btn-cancel-course-edit').classList.remove('hidden');
}

function cancelarEdicionCurso() {
    editingCourseId = null;
    document.getElementById('new-course-name').value = "";
    document.getElementById('new-course-desc').value = "";
    document.getElementById('btn-submit-course').innerText = "+ Crear Curso";
    document.getElementById('btn-cancel-course-edit').classList.add('hidden');
}

function eliminarCurso(id) {
    if (confirm("¿Estás seguro de eliminar este curso? Se eliminarán también sus videos, material complementario y evaluaciones asociadas.")) {
        cursosDB = cursosDB.filter(c => c.id !== id);
        materialesDB = materialesDB.filter(m => m.cursoId !== id);
        complementariosDB = complementariosDB.filter(comp => comp.cursoId !== id);
        evaluacionesDB = evaluacionesDB.filter(ev => ev.cursoId !== id);
        persistData();
        showToast("Curso eliminado.");
        openModal('courses');
    }
}

// --- GESTIÓN DE ESTUDIANTES Y CREDENCIALES ---
function guardarEstudianteDocente(e) {
    e.preventDefault();
    const nombreComp = document.getElementById('st-nombre-completo').value.trim();
    const rut = document.getElementById('st-rut').value.trim();
    const correo = document.getElementById('st-correo').value.trim().toLowerCase();
    const fono = document.getElementById('st-fono').value.trim();
    const pass = document.getElementById('st-pass').value;
    const cursoAsignadoVal = document.getElementById('st-curso-asignado') ? parseInt(document.getElementById('st-curso-asignado').value) : null;

    if (!esCorreoRealValido(correo)) {
        showToast("Por favor ingrese un correo verdaderamente válido (Google, Outlook, Hotmail, etc.)");
        return;
    }

    const cursoObj = cursosDB.find(c => c.id === cursoAsignadoVal);
    const nombreCursoElegido = cursoObj ? cursoObj.nombre : "Sin curso asignado";

    if (editingStudentId) {
        const st = estudiantesDB.find(s => s.id === editingStudentId);
        if (st) {
            st.nombreCompleto = nombreComp;
            st.nombre = nombreComp.split(' ')[0] || nombreComp;
            st.rut = rut;
            st.correo = correo;
            st.fono = fono;
            st.pass = pass;
            st.cursoAsignado = cursoAsignadoVal;
            showToast(`Credenciales actualizadas. Esta cursando: ${nombreCursoElegido}`);
        }
        editingStudentId = null;
    } else {
        if (estudiantesDB.some(st => st.correo.toLowerCase() === correo)) {
            showToast("Este correo de estudiante ya está registrado.");
            return;
        }

        estudiantesDB.push({
            id: Date.now(),
            nombreCompleto: nombreComp,
            nombre: nombreComp.split(' ')[0] || nombreComp,
            rut: rut,
            correo: correo,
            fono: fono,
            pass: pass,
            cursoAsignado: cursoAsignadoVal
        });

        showToast(`Esta cursando: ${nombreCursoElegido}`);
    }

    persistData();
    openModal('courses');
}

function editarEstudiante(id) {
    const st = estudiantesDB.find(s => s.id === id);
    if (!st) return;

    editingStudentId = id;
    document.getElementById('st-nombre-completo').value = st.nombreCompleto;
    document.getElementById('st-rut').value = st.rut;
    document.getElementById('st-correo').value = st.correo;
    document.getElementById('st-fono').value = st.fono;
    document.getElementById('st-pass').value = st.pass;
    if (document.getElementById('st-curso-asignado') && st.cursoAsignado) {
        document.getElementById('st-curso-asignado').value = st.cursoAsignado;
    }

    document.getElementById('btn-submit-student').innerText = "Guardar Cambios del Estudiante";
    document.getElementById('btn-cancel-student-edit').classList.remove('hidden');
}

function cancelarEdicionEstudiante() {
    editingStudentId = null;
    document.getElementById('st-nombre-completo').value = "";
    document.getElementById('st-rut').value = "";
    document.getElementById('st-correo').value = "";
    document.getElementById('st-fono').value = "";
    document.getElementById('st-pass').value = "";

    document.getElementById('btn-submit-student').innerText = "Registrar Estudiante";
    document.getElementById('btn-cancel-student-edit').classList.add('hidden');
}

function eliminarEstudiante(stId) {
    const st = estudiantesDB.find(s => s.id === stId);
    if (!st) return;

    if (confirm(`¿Deseas eliminar las credenciales de ${st.nombreCompleto}?`)) {
        const correoBorrar = st.correo.toLowerCase();
        estudiantesDB = estudiantesDB.filter(s => s.id !== stId);
        
        delete studentProgressDB[correoBorrar];
        studentSubmissionsDB = studentSubmissionsDB.filter(sub => sub.studentCorreo.toLowerCase() !== correoBorrar);

        persistData();
        showToast("Credencial de estudiante eliminada.");
        openModal('courses');
    }
}

// --- SISTEMA DE CREACIÓN Y EDICIÓN DE EVALUACIÓN DE 21 PREGUNTAS ---
function abrirFormularioCrearEvaluacion(evalIdToEdit = null) {
    const modalBody = document.getElementById('modal-body');
    document.getElementById('modal-title').innerText = evalIdToEdit ? "EDITAR EVALUACIÓN" : "NUEVA EVALUACIÓN (21 PREGUNTAS)";

    let evalData = null;
    if (evalIdToEdit) {
        evalData = evaluacionesDB.find(e => e.id === evalIdToEdit);
    }

    let html = `
        <form onsubmit="guardarEvaluacion21Preguntas(event, ${evalIdToEdit})" class="space-y-4 text-xs">
            <div class="bg-purple-50 p-3.5 rounded-xl border border-purple-200 space-y-3">
                <div>
                    <label class="block font-bold text-gray-800 mb-1">Seleccionar Curso Asociado</label>
                    <select id="eval-form-curso-id" required class="w-full p-2 border rounded bg-white">
                        ${cursosDB.map(c => `<option value="${c.id}" ${evalData && evalData.cursoId === c.id ? 'selected' : ''}>${c.nombre}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block font-bold text-gray-800 mb-1">Título de la Evaluación</label>
                    <input type="text" id="eval-form-titulo" value="${evalData ? evalData.titulo : 'Evaluación Oficial del Curso'}" required class="w-full p-2 border rounded bg-white" placeholder="Ej: Evaluación Módulo 1">
                </div>
            </div>

            <div class="bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-900 font-semibold">
                <i class="fa-solid fa-lightbulb text-amber-600 mr-1"></i> Configura las 21 preguntas requeridas. Selecciona el tipo de pregunta (Alternativa A B C D o Verdadero/Falso) para cada una.
            </div>

            <div class="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
    `;

    for (let i = 0; i < 21; i++) {
        const qExist = (evalData && evalData.preguntas && evalData.preguntas[i]) ? evalData.preguntas[i] : null;
        const tipoVal = qExist ? qExist.tipo : 'mc';
        const pregTexto = qExist ? qExist.pregunta : `Pregunta de evaluación #${i + 1}`;
        const opcList = qExist ? qExist.opciones : ["Opción A", "Opción B", "Opción C", "Opción D"];
        const correctaIdx = qExist ? qExist.correcta : 0;

        html += `
            <div class="bg-white p-3.5 rounded-xl border space-y-2 shadow-sm">
                <div class="flex items-center justify-between">
                    <span class="font-black text-chile-purple">Pregunta #${i + 1}</span>
                    <div class="flex items-center space-x-2">
                        <label class="font-bold text-gray-700">Tipo:</label>
                        <select id="q_type_${i}" onchange="cambiarTipoPreguntaForm(${i})" class="p-1 border rounded bg-slate-50 font-bold text-xs">
                            <option value="mc" ${tipoVal === 'mc' ? 'selected' : ''}>Alternativa (A B C D)</option>
                            <option value="tf" ${tipoVal === 'tf' ? 'selected' : ''}>Verdadero / Falso</option>
                        </select>
                    </div>
                </div>

                <div>
                    <input type="text" id="q_text_${i}" value="${pregTexto}" required class="w-full p-2 border rounded font-semibold text-gray-800" placeholder="Escribe el enunciado de la pregunta...">
                </div>

                <div id="q_options_container_${i}" class="space-y-1.5 pt-1">
                    ${renderOpcionesPreguntaFormHTML(i, tipoVal, opcList, correctaIdx)}
                </div>
            </div>
        `;
    }

    html += `
            </div>

            <div class="pt-2 flex space-x-2">
                <button type="submit" class="flex-grow bg-chile-purple hover:bg-chile-purple-dark text-white font-extrabold py-3 rounded-lg uppercase shadow transition">
                    ${evalIdToEdit ? 'Guardar Cambios de Evaluación' : 'Crear Evaluación de 21 Preguntas'}
                </button>
                <button type="button" onclick="openModal('tests')" class="bg-gray-500 hover:bg-gray-600 text-white font-bold px-4 rounded-lg uppercase shadow transition">
                    Cancelar
                </button>
            </div>
        </form>
    `;

    modalBody.innerHTML = html;
}

function renderOpcionesPreguntaFormHTML(index, tipo, opciones, correcta) {
    let html = ``;
    if (tipo === 'mc') {
        const labels = ['A', 'B', 'C', 'D'];
        for (let k = 0; k < 4; k++) {
            const opText = opciones && opciones[k] !== undefined ? opciones[k] : `Opción ${labels[k]}`;
            html += `
                <div class="flex items-center space-x-2">
                    <input type="radio" name="correcta_${index}" value="${k}" ${correcta === k ? 'checked' : ''} class="w-4 h-4 text-chile-purple">
                    <span class="font-bold text-gray-600">${labels[k]})</span>
                    <input type="text" id="q_op_${index}_${k}" value="${opText}" required class="flex-grow p-1.5 border rounded bg-slate-50 text-xs">
                </div>
            `;
        }
    } else {
        const opTextV = opciones && opciones[0] ? opciones[0] : "Verdadero";
        const opTextF = opciones && opciones[1] ? opciones[1] : "Falso";
        html += `
            <div class="flex items-center space-x-2">
                <input type="radio" name="correcta_${index}" value="0" ${correcta === 0 ? 'checked' : ''} class="w-4 h-4 text-chile-purple">
                <span class="font-bold text-gray-700">Verdadero</span>
                <input type="hidden" id="q_op_${index}_0" value="${opTextV}">
            </div>
            <div class="flex items-center space-x-2">
                <input type="radio" name="correcta_${index}" value="1" ${correcta === 1 ? 'checked' : ''} class="w-4 h-4 text-chile-purple">
                <span class="font-bold text-gray-700">Falso</span>
                <input type="hidden" id="q_op_${index}_1" value="${opTextF}">
            </div>
        `;
    }
    return html;
}

function cambiarTipoPreguntaForm(index) {
    const selectType = document.getElementById(`q_type_${index}`);
    const container = document.getElementById(`q_options_container_${index}`);
    if (!selectType || !container) return;

    const tipo = selectType.value;
    if (tipo === 'mc') {
        container.innerHTML = renderOpcionesPreguntaFormHTML(index, 'mc', ["Opción A", "Opción B", "Opción C", "Opción D"], 0);
    } else {
        container.innerHTML = renderOpcionesPreguntaFormHTML(index, 'tf', ["Verdadero", "Falso"], 0);
    }
}

function guardarEvaluacion21Preguntas(e, evalIdEdit) {
    e.preventDefault();
    const cursoId = parseInt(document.getElementById('eval-form-curso-id').value);
    const titulo = document.getElementById('eval-form-titulo').value.trim();

    let preguntasArr = [];

    for (let i = 0; i < 21; i++) {
        const tipo = document.getElementById(`q_type_${i}`).value;
        const pregunta = document.getElementById(`q_text_${i}`).value.trim();

        const radioChecked = document.querySelector(`input[name="correcta_${i}"]:checked`);
        const correctaIdx = radioChecked ? parseInt(radioChecked.value) : 0;

        let opciones = [];
        if (tipo === 'mc') {
            for (let k = 0; k < 4; k++) {
                const opVal = document.getElementById(`q_op_${i}_${k}`).value.trim();
                opciones.push(opVal || `Opción ${['A','B','C','D'][k]}`);
            }
        } else {
            opciones = ["Verdadero", "Falso"];
        }

        preguntasArr.push({
            tipo: tipo,
            pregunta: pregunta,
            opciones: opciones,
            correcta: correctaIdx
        });
    }

    if (evalIdEdit) {
        const evObj = evaluacionesDB.find(ev => ev.id === evalIdEdit);
        if (evObj) {
            evObj.cursoId = cursoId;
            evObj.titulo = titulo;
            evObj.preguntas = preguntasArr;
            showToast("Evaluación actualizada correctamente.");
        }
    } else {
        evaluacionesDB.push({
            id: Date.now(),
            cursoId: cursoId,
            habilitadaDocente: false,
            titulo: titulo,
            preguntas: preguntasArr
        });
        showToast("Nueva evaluación de 21 preguntas creada.");
    }

    persistData();
    openModal('tests');
}

function toggleHabilitacionEvaluacionDocente(evalId) {
    const ev = evaluacionesDB.find(e => e.id === evalId);
    if (ev) {
        ev.habilitadaDocente = !ev.habilitadaDocente;
        persistData();
        showToast(ev.habilitadaDocente ? "Evaluación habilitada para el estudiante." : "Evaluación inhabilitada para el estudiante.");
        openModal('tests');
    }
}

function eliminarEvaluacion(evalId) {
    if (confirm("¿Estás seguro de eliminar esta evaluación?")) {
        evaluacionesDB = evaluacionesDB.filter(e => e.id !== evalId);
        persistData();
        showToast("Evaluación eliminada.");
        openModal('tests');
    }
}

// --- MANEJO DE ARCHIVOS PENDIENTES ---
function handleVideoSelection(input) {
    if (input.files && input.files.length > 0) {
        pendingVideoFiles = Array.from(input.files);
        document.getElementById('video-status-text').innerText = `${pendingVideoFiles.length} video(s) listo(s) en espera de subida`;
    }
}

function handleComplementarioSelection(input) {
    if (input.files && input.files.length > 0) {
        pendingCompFiles = Array.from(input.files);
        document.getElementById('comp-status-text').innerText = `${pendingCompFiles.length} archivo(s) listo(s) en espera de subida`;
    }
}

function procesarSubidaSimultanea(cursoId, filesVideo, filesComp, tituloComp, urlComp) {
    let subidosVideos = 0;
    let subidosComp = 0;

    if (filesVideo && filesVideo.length > 0) {
        for (let i = 0; i < filesVideo.length; i++) {
            const file = filesVideo[i];
            materialesDB.push({
                id: Date.now() + Math.random(),
                cursoId: cursoId,
                titulo: file.name,
                tipo: 'MP4_FILE',
                tamano: formatBytes(file.size),
                url: URL.createObjectURL(file)
            });
            subidosVideos++;
        }
    }

    if (filesComp && filesComp.length > 0) {
        for (let f = 0; f < filesComp.length; f++) {
            const file = filesComp[f];
            complementariosDB.push({
                id: Date.now() + Math.random(),
                cursoId: cursoId,
                titulo: `${tituloComp} - ${file.name}`,
                tipo: 'FILE',
                tamano: formatBytes(file.size),
                url: URL.createObjectURL(file)
            });
            subidosComp++;
        }
    }

    if (urlComp) {
        complementariosDB.push({
            id: Date.now() + Math.random(),
            cursoId: cursoId,
            titulo: `${tituloComp} (Enlace URL)`,
            tipo: 'URL',
            tamano: 'Enlace Web',
            url: urlComp
        });
        subidosComp++;
    }

    persistData();
    return { subidosVideos, subidosComp };
}

// --- VIDEOS Y MATERIAL COMPLEMENTARIO DOCENTE ---
function subirVideoDocente(e) {
    e.preventDefault();
    const cursoId = parseInt(document.getElementById('upload-vid-curso-id').value);
    const fileInput = document.getElementById('upload-video-file');
    const files = fileInput.files.length > 0 ? Array.from(fileInput.files) : pendingVideoFiles;

    if (!files || files.length === 0) {
        showToast("Seleccione al menos un video MP4.");
        return;
    }

    const res = procesarSubidaSimultanea(cursoId, files, pendingCompFiles, "Material Complementario", null);

    fileInput.value = "";
    pendingVideoFiles = [];
    pendingCompFiles = [];
    document.getElementById('video-status-text').innerText = "";
    showToast(`Cargado(s): ${res.subidosVideos} video(s) MP4 y ${res.subidosComp} material(es).`);
    openModal('resources');
}

function eliminarMaterial(id) {
    if (confirm("¿Eliminar este video? Afectará el porcentaje de los estudiantes.")) {
        materialesDB = materialesDB.filter(m => m.id !== id);
        persistData();
        showToast("Video eliminado.");
        openModal('resources');
    }
}

function reproducirVideoModal(titulo, url, tamano, materialId) {
    if (currentRole === 'estudiante' && currentUser) {
        const cursoMat = materialesDB.find(m => m.id === materialId);
        if (cursoMat) {
            const cursoId = cursoMat.cursoId;
            if (!studentProgressDB[currentUser.correo]) {
                studentProgressDB[currentUser.correo] = {};
            }
            if (!studentProgressDB[currentUser.correo][cursoId]) {
                studentProgressDB[currentUser.correo][cursoId] = { watchedVideos: [] };
            }
            if (!studentProgressDB[currentUser.correo][cursoId].watchedVideos) {
                studentProgressDB[currentUser.correo][cursoId].watchedVideos = [];
            }
            if (!studentProgressDB[currentUser.correo][cursoId].watchedVideos.includes(materialId)) {
                studentProgressDB[currentUser.correo][cursoId].watchedVideos.push(materialId);
                persistData();
                showToast("¡Video completado! Progreso actualizado.");
                verificarAvisoCursosCompletos();
            }
        }
    }

    const tempDiv = document.createElement('div');
    tempDiv.className = "fixed inset-0 bg-black/80 z-[10000] flex items-center justify-center p-3";
    tempDiv.id = "video-player-overlay";
    tempDiv.innerHTML = `
        <div class="bg-white rounded-xl overflow-hidden max-w-3xl w-full p-3 sm:p-4 relative" onclick="event.stopPropagation()">
            <div class="flex justify-between items-center mb-3">
                <div class="truncate pr-2">
                    <h3 class="font-bold text-xs sm:text-sm text-gray-800 truncate"><i class="fa-solid fa-circle-play text-chile-purple mr-2"></i>${titulo}</h3>
                    <span class="text-[11px] text-gray-500 font-semibold">Tamaño Real: ${tamano}</span>
                </div>
                <button onclick="document.getElementById('video-player-overlay').remove(); openModal('resources');" class="text-gray-500 hover:text-black font-bold text-xl">&times;</button>
            </div>
            <video controls class="w-full rounded bg-black max-h-[60vh]" autoplay src="${url}">
                Tu navegador no soporta el reproductor de video.
            </video>
        </div>
    `;
    document.body.appendChild(tempDiv);
}

// --- MATERIAL COMPLEMENTARIO ---
let complementarioSlotsCount = 1;

function agregarCasillaComplementaria() {
    complementarioSlotsCount++;
    const container = document.getElementById('complementario-slots-container');
    if (!container) return;

    const div = document.createElement('div');
    div.className = "bg-white p-3 rounded-lg border space-y-2 relative shadow-sm";
    div.innerHTML = `
        <div class="flex justify-between items-center">
            <span class="text-[11px] font-bold text-chile-purple">Ítem Complementario #${complementarioSlotsCount}</span>
            <button type="button" onclick="this.parentElement.parentElement.remove()" class="text-red-500 hover:text-red-700 text-xs font-bold"><i class="fa-solid fa-trash"></i> Eliminar</button>
        </div>
        <div>
            <label class="block text-[11px] font-semibold text-gray-700">Subir Archivo(s) (PDF, DOCX, XLSX, ZIP, etc.)</label>
            <input type="file" multiple class="comp-file-input w-full p-1 border rounded bg-slate-50 text-xs" onchange="handleComplementarioSelection(this)">
        </div>
        <div>
            <label class="block text-[11px] font-semibold text-gray-700">O Enlace URL</label>
            <input type="url" placeholder="https://ejemplo.com/recurso" class="comp-url-input w-full p-1.5 border rounded bg-slate-50 text-xs">
        </div>
    `;
    container.appendChild(div);
}

function subirComplementarioDocente(e) {
    e.preventDefault();
    const cursoId = parseInt(document.getElementById('comp-curso-id').value);
    const tituloGlobal = document.getElementById('comp-titulo').value.trim() || "Material Complementario";
    
    const fileInputs = document.querySelectorAll('.comp-file-input');
    const urlInputs = document.querySelectorAll('.comp-url-input');

    let filesCompAll = [];
    fileInputs.forEach((fi) => {
        if (fi.files && fi.files.length > 0) {
            filesCompAll = filesCompAll.concat(Array.from(fi.files));
        }
    });
    if (filesCompAll.length === 0 && pendingCompFiles.length > 0) {
        filesCompAll = pendingCompFiles;
    }

    let firstUrl = null;
    urlInputs.forEach((ui) => {
        if (ui.value.trim()) firstUrl = ui.value.trim();
    });

    const res = procesarSubidaSimultanea(cursoId, pendingVideoFiles, filesCompAll, tituloGlobal, firstUrl);

    document.getElementById('comp-titulo').value = "";
    pendingVideoFiles = [];
    pendingCompFiles = [];
    document.getElementById('comp-status-text').innerText = "";
    complementarioSlotsCount = 1;
    showToast(`Guardados: ${res.subidosComp} elemento(s) complementarios y ${res.subidosVideos} video(s).`);
    openModal('resources');
}

function eliminarComplementario(id) {
    if (confirm("¿Eliminar este material complementario?")) {
        complementariosDB = complementariosDB.filter(c => c.id !== id);
        persistData();
        showToast("Material complementario eliminado.");
        openModal('resources');
    }
}

function abrirComplementario(compId) {
    const comp = complementariosDB.find(c => c.id === compId);
    if (!comp) return;

    if (comp.tipo === 'URL') {
        window.open(comp.url, '_blank');
    } else {
        const a = document.createElement('a');
        a.href = comp.url;
        a.download = comp.titulo;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast(`Descargando ${comp.titulo}`);
    }
}

// --- CÁLCULO DE PROGRESO DE CURSOS ---
function calcularPorcentajeEstudiante(cursoId, studentCorreo) {
    const videosCurso = materialesDB.filter(m => m.cursoId === cursoId && m.tipo === 'MP4_FILE');
    if (videosCurso.length === 0) return 100;

    const stProg = studentProgressDB[studentCorreo] || {};
    const progCurso = stProg[cursoId] || { watchedVideos: [] };
    const watched = progCurso.watchedVideos || [];

    let watchedCount = 0;
    videosCurso.forEach(v => {
        if (watched.includes(v.id)) watchedCount++;
    });

    const porcentaje = Math.round((watchedCount / videosCurso.length) * 100);
    return Math.min(100, porcentaje);
}

function estudianteCompletoTodosLosCursos(studentCorreo) {
    if (cursosDB.length === 0) return true;
    for (let c of cursosDB) {
        if (calcularPorcentajeEstudiante(c.id, studentCorreo) < 100) {
            return false;
        }
    }
    return true;
}

function verificarAvisoCursosCompletos() {
    if (currentRole !== 'estudiante' || !currentUser) return;

    const todosListos = estudianteCompletoTodosLosCursos(currentUser.correo);

    if (todosListos) {
        showToast("¡Felicidades! Has completado el 100% de los videos. Estás listo para rendir la evaluación.");
    } else {
        let incompletos = 0;
        cursosDB.forEach(c => {
            if (calcularPorcentajeEstudiante(c.id, currentUser.correo) < 100) incompletos++;
        });
        showToast(`Te quedan ${incompletos} curso(s) por completar al 100% para rendir la evaluación.`);
    }
}

// --- RENDICIÓN DE EVALUACIÓN ESTUDIANTE Y REQUISITO DE APROBACIÓN (12 BUENAS / 60%) ---
function iniciarRendirEvaluacion(evalId) {
    const evalObj = evaluacionesDB.find(e => e.id === evalId);
    if (!evalObj) return;

    let sub = studentSubmissionsDB.find(s => s.studentCorreo === currentUser.correo && s.evaluacionId === evalId);
    let intentosRealizados = sub ? (sub.attemptsCount || 1) : 1;

    const modalBody = document.getElementById('modal-body');
    document.getElementById('modal-title').innerText = `Rindiendo: ${evalObj.titulo}`;

    let html = `
        <form onsubmit="revisarEvaluacionAntesDeEnviar(event, ${evalId})" class="space-y-4">
            <div class="bg-blue-50 p-4 rounded-xl border border-blue-200 text-center space-y-1">
                <p class="text-xs sm:text-sm font-black text-blue-900">¡Mucho éxito en esta evaluación! Demuestra todo lo aprendido y confía en tus capacidades.</p>
                <p class="text-[11px] text-blue-700 font-semibold">Intento actual: #${intentosRealizados} | Requisito de Aprobación: Mínimo 12 respuestas correctas de 21 (60%).</p>
            </div>
    `;

    evalObj.preguntas.forEach((p, pIdx) => {
        const esVerdaderoFalso = (p.tipo === 'tf');
        html += `
            <div class="bg-white border rounded-xl p-4 shadow-sm space-y-2">
                <div class="flex items-center justify-between border-b pb-1">
                    <h5 class="font-bold text-gray-900 text-xs sm:text-sm">Pregunta #${pIdx + 1}</h5>
                    <span class="text-[10px] font-black uppercase px-2 py-0.5 bg-slate-100 text-slate-700 rounded">${esVerdaderoFalso ? 'Verdadero o Falso' : 'Alternativas A B C D'}</span>
                </div>
                <p class="text-xs sm:text-sm font-semibold text-gray-800">${p.pregunta}</p>
                <div class="space-y-1.5 pt-1">
                    ${p.opciones.map((op, opIdx) => `
                        <label class="flex items-center space-x-2 p-2 rounded bg-slate-50 hover:bg-slate-100 cursor-pointer border">
                            <input type="radio" name="resp_${pIdx}" value="${opIdx}" required class="w-4 h-4 text-chile-blue">
                            <span class="text-xs font-medium text-gray-800">${esVerdaderoFalso ? '' : ['A', 'B', 'C', 'D'][opIdx] + ') '}${op}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `;
    });

    html += `
            <button type="submit" class="w-full bg-chile-blue hover:bg-chile-blue-dark text-white font-extrabold py-3 rounded-lg text-xs uppercase shadow transition">
                Enviar Respuesta y Evaluar
            </button>
        </form>
    `;
    modalBody.innerHTML = html;
}

function revisarEvaluacionAntesDeEnviar(e, evalId) {
    e.preventDefault();
    const evalObj = evaluacionesDB.find(ev => ev.id === evalId);
    if (!evalObj) return;

    let subAnterior = studentSubmissionsDB.find(s => s.studentCorreo === currentUser.correo && s.evaluacionId === evalId);
    let intentosCount = subAnterior ? (subAnterior.attemptsCount || 1) + 1 : 1;

    let correctasCount = 0;
    let incorrectasCount = 0;
    let detalles = [];

    evalObj.preguntas.forEach((p, pIdx) => {
        const seleccion = document.querySelector(`input[name="resp_${pIdx}"]:checked`);
        const valSeleccion = seleccion ? parseInt(seleccion.value) : 0;
        const esCorrecta = (valSeleccion === p.correcta);

        if (esCorrecta) correctasCount++;
        else incorrectasCount++;

        detalles.push({
            pregunta: p.pregunta,
            elegida: p.opciones[valSeleccion],
            correctaTexto: p.opciones[p.correcta],
            esCorrecta: esCorrecta
        });
    });

    const totalPreguntas = evalObj.preguntas.length; // 21
    const aprueba = (correctasCount >= 12);

    studentSubmissionsDB = studentSubmissionsDB.filter(sub => !(sub.studentCorreo === currentUser.correo && sub.evaluacionId === evalId));
    studentSubmissionsDB.push({
        studentCorreo: currentUser.correo,
        studentNombre: currentUser.nombreCompleto || currentUser.nombre,
        evaluacionId: evalId,
        evalTitulo: evalObj.titulo,
        buenas: correctasCount,
        malas: incorrectasCount,
        total: totalPreguntas,
        aprobado: aprueba,
        attemptsCount: intentosCount,
        detalles: detalles
    });

    persistData();

    const modalBody = document.getElementById('modal-body');
    document.getElementById('modal-title').innerText = "Resultado de Evaluación";

    let htmlResultado = "";

    if (aprueba) {
        htmlResultado = `
            <div class="p-5 rounded-xl border text-center bg-green-50 border-green-300 text-green-900 shadow-sm space-y-2">
                <h3 class="text-base sm:text-lg font-black uppercase">¡Felicidades! Has aprobado el curso.</h3>
                <p class="text-sm font-extrabold">Obtuviste <span class="text-green-700 font-black text-base">${correctasCount}</span> buenas y <span class="text-red-600 font-bold">${incorrectasCount}</span> malas (Cumple requisito del 60%).</p>
                <p class="text-xs text-gray-600">Evaluación aprobada con éxito. Intento #${intentosCount}.</p>
            </div>
        `;
    } else {
        htmlResultado = `
            <div class="p-5 rounded-xl border text-center bg-red-50 border-red-300 text-red-900 shadow-sm space-y-3">
                <h3 class="text-base sm:text-lg font-black uppercase">Has reprobado el curso. Vuelve a intentarlo.</h3>
                <p class="text-sm font-extrabold">Obtuviste <span class="font-black text-base">${correctasCount}</span> buenas y <span class="font-bold">${incorrectasCount}</span> malas.</p>
                <p class="text-xs font-semibold text-gray-700">Para aprobar necesitas un mínimo de 12 buenas con 9 malas (60% de aprobación).</p>
                <button onclick="iniciarRendirEvaluacion(${evalId})" class="mt-2 bg-chile-blue hover:bg-chile-blue-dark text-white font-bold px-6 py-2.5 rounded-lg text-xs uppercase shadow transition">
                    Rendir De Nuevo
                </button>
            </div>
        `;
    }

    modalBody.innerHTML = `
        <div class="space-y-4 text-xs sm:text-sm">
            ${htmlResultado}
            <button onclick="openModal('tests')" class="w-full bg-gray-700 hover:bg-gray-800 text-white font-bold py-3 rounded-lg text-xs uppercase shadow transition">
                Volver a Evaluación
            </button>
        </div>
    `;
    showToast(aprueba ? "¡Felicidades! Has aprobado el curso." : "Has reprobado el curso. Vuelve a intentarlo.");
}

// --- APERTURA DE MODALES ---
function openModal(key) {
    const modalIcon = document.getElementById('modal-icon');
    const isDocente = (currentRole === 'docente');

    if (key === 'courses') {
        document.getElementById('modal-title').innerText = isDocente ? "CURSOS Y CREDENCIALES" : "MIS CURSOS Y PROGRESO";
        modalIcon.className = 'fa-solid fa-graduation-cap text-amber-400 text-2xl';

        let html = `<div class="space-y-5">`;

        if (isDocente) {
            html += `
                <div class="bg-blue-50 p-4 rounded-xl border border-blue-200 space-y-3">
                    <h4 class="font-bold text-xs sm:text-sm text-blue-900">Gestor de Cursos</h4>
                    <form onsubmit="guardarCursoDocente(event)" class="space-y-3 text-xs">
                        <div>
                            <label class="block font-bold text-gray-700 mb-1">Nombre del Curso</label>
                            <input type="text" id="new-course-name" placeholder="Ej: Innovación Tecnológica y Transformación Digital 2050" required class="w-full p-2 border rounded bg-white">
                        </div>
                        <div>
                            <label class="block font-bold text-gray-700 mb-1">Descripción</label>
                            <textarea id="new-course-desc" placeholder="Descripción..." rows="2" class="w-full p-2 border rounded bg-white"></textarea>
                        </div>
                        <div class="flex gap-2">
                            <button type="submit" id="btn-submit-course" class="flex-grow bg-chile-blue hover:bg-chile-blue-dark text-white font-bold py-2.5 rounded-lg text-xs uppercase shadow">
                                + Crear Curso
                            </button>
                            <button type="button" id="btn-cancel-course-edit" onclick="cancelarEdicionCurso()" class="hidden bg-gray-500 text-white font-bold px-4 rounded-lg text-xs">
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>

                <div class="bg-slate-50 p-4 rounded-xl border border-gray-200">
                    <h4 class="font-bold text-xs sm:text-sm text-gray-800 mb-3">Cursos Registrados (${cursosDB.length})</h4>
                    ${cursosDB.length === 0 ? '<p class="text-xs text-gray-500 italic">No hay cursos creados.</p>' : `
                        <div class="space-y-2">
                            ${cursosDB.map(c => `
                                <div class="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
                                    <div>
                                        <h5 class="font-bold text-gray-900 text-xs sm:text-sm">${c.nombre}</h5>
                                        <p class="text-[11px] text-gray-500">${c.descripcion}</p>
                                    </div>
                                    <div class="flex items-center space-x-2">
                                        <button onclick="editarCurso(${c.id})" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-bold border"><i class="fa-solid fa-pen-to-square"></i></button>
                                        <button onclick="eliminarCurso(${c.id})" class="p-2 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold border"><i class="fa-solid fa-trash"></i></button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>

                <div class="bg-purple-50 p-4 rounded-xl border border-purple-200 space-y-3">
                    <h4 class="font-bold text-xs sm:text-sm text-purple-900">Crear y Editar Credenciales de Estudiante</h4>
                    <form onsubmit="guardarEstudianteDocente(event)" class="space-y-3 text-xs" autocomplete="on">
                        <div>
                            <label class="block font-bold text-gray-700 mb-1">Nombre Completo</label>
                            <input type="text" id="st-nombre-completo" name="name" placeholder="Ej: Juan Antonio Pérez González" required class="w-full p-2 border rounded bg-white" autocomplete="name">
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                                <label class="block font-bold text-gray-700 mb-1">RUT</label>
                                <input type="text" id="st-rut" name="rut" placeholder="18.432.910-K" required class="w-full p-2 border rounded bg-white">
                            </div>
                            <div>
                                <label class="block font-bold text-gray-700 mb-1">Correo Electrónico</label>
                                <input type="email" id="st-correo" name="email" placeholder="juan.perez.g@gmail.com" required class="w-full p-2 border rounded bg-white" autocomplete="email">
                            </div>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                                <label class="block font-bold text-gray-700 mb-1">Teléfono Fono</label>
                                <input type="text" id="st-fono" name="tel" placeholder="+56 9 8123 4567" required class="w-full p-2 border rounded bg-white" autocomplete="tel">
                            </div>
                            <div>
                                <label class="block font-bold text-gray-700 mb-1">Contraseña</label>
                                <div class="relative">
                                    <input type="password" id="st-pass" name="new-password" placeholder="••••••••" required class="w-full p-2 pr-9 border rounded bg-white" autocomplete="new-password">
                                    <button type="button" onclick="togglePasswordVisibility('st-pass', 'eye-st-pass')" class="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-purple-700 focus:outline-none" title="Ver contraseña">
                                        <i id="eye-st-pass" class="fa-solid fa-eye text-xs"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label class="block font-bold text-chile-purple uppercase mb-1"><i class="fa-solid fa-graduation-cap mr-1"></i> Asignar Curso Creado al Estudiante</label>
                            <select id="st-curso-asignado" required class="w-full p-2 border border-purple-300 rounded bg-white font-semibold">
                                ${cursosDB.length === 0 ? '<option value="">No hay cursos creados aun</option>' : cursosDB.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('')}
                            </select>
                        </div>
                        <div class="flex gap-2 pt-1">
                            <button type="submit" id="btn-submit-student" class="flex-grow bg-chile-purple hover:bg-chile-purple-dark text-white font-bold py-2.5 rounded-lg text-xs uppercase shadow">
                                Registrar Estudiante
                            </button>
                            <button type="button" id="btn-cancel-student-edit" onclick="cancelarEdicionEstudiante()" class="hidden bg-gray-500 text-white font-bold px-4 rounded-lg text-xs">
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>

                <div class="bg-slate-50 p-4 rounded-xl border border-gray-200">
                    <h4 class="font-bold text-xs sm:text-sm text-gray-800 mb-3">Estudiantes Registrados (${estudiantesDB.length})</h4>
                    ${estudiantesDB.length === 0 ? '<p class="text-xs text-gray-500 italic">No hay estudiantes registrados actualmente.</p>' : `
                        <div class="space-y-2">
                            ${estudiantesDB.map(s => {
                                const cursoAsig = cursosDB.find(c => c.id === s.cursoAsignado);
                                const cursoNombre = cursoAsig ? cursoAsig.nombre : "Sin curso asignado";
                                return `
                                    <div class="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
                                        <div>
                                            <h5 class="font-bold text-gray-900 text-xs sm:text-sm">${s.nombreCompleto}</h5>
                                            <p class="text-[11px] text-gray-500">${s.correo} | Clave: ${s.pass}</p>
                                            <p class="text-[11px] font-bold text-chile-purple mt-0.5"><i class="fa-solid fa-book-bookmark mr-1"></i>Esta cursando: ${cursoNombre}</p>
                                        </div>
                                        <div class="flex items-center space-x-2">
                                            <button onclick="editarEstudiante(${s.id})" class="p-2 text-purple-600 rounded text-xs border"><i class="fa-solid fa-pen-to-square"></i></button>
                                            <button onclick="eliminarEstudiante(${s.id})" class="p-2 text-red-600 rounded text-xs border" title="Eliminar estudiante"><i class="fa-solid fa-trash"></i></button>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `}
                </div>
            `;
        } else {
            html += `
                <div class="space-y-4">
                    <div class="bg-blue-50 border-l-4 border-chile-blue p-3 rounded-r">
                        <h4 class="font-bold text-blue-900 text-xs sm:text-sm">Tus Cursos y Progreso</h4>
                        <p class="text-xs text-blue-800">El 100% del curso se completa exclusivamente viendo todos los <strong>videos (.mp4)</strong>.</p>
                    </div>
                    ${cursosDB.length === 0 ? '<p class="text-xs text-gray-500">No hay cursos disponibles.</p>' : `
                        <div class="grid grid-cols-1 gap-3">
                            ${cursosDB.map(c => {
                                const porcentaje = calcularPorcentajeEstudiante(c.id, currentUser.correo);

                                return `
                                    <div class="p-4 bg-white border-2 border-blue-100 rounded-xl shadow-sm space-y-3">
                                        <div class="flex justify-between items-start">
                                            <div>
                                                <h5 class="font-bold text-gray-900 text-sm">${c.nombre}</h5>
                                                <p class="text-xs text-gray-600 mt-0.5">${c.descripcion}</p>
                                            </div>
                                            <span class="px-2.5 py-1 rounded-full text-xs font-extrabold ${porcentaje === 100 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}">
                                                Progreso Videos: ${porcentaje}%
                                            </span>
                                        </div>
                                        <div class="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                            <div class="bg-chile-blue h-2.5 rounded-full" style="width: ${porcentaje}%"></div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `}
                </div>
            `;
        }

        html += `</div>`;
        document.getElementById('modal-body').innerHTML = html;
    } else if (key === 'resources') {
        document.getElementById('modal-title').innerText = isDocente ? "GESTIÓN DE VIDEOS Y MATERIAL COMPLEMENTARIO" : "MATERIAL COMPLEMENTARIO Y VIDEOS";
        modalIcon.className = 'fa-solid fa-folder-open text-amber-400 text-2xl';

        let html = `<div class="space-y-5">`;

        if (isDocente) {
            html += `
                ${cursosDB.length === 0 ? '<p class="text-xs text-amber-700 font-semibold bg-amber-50 p-3 rounded">Crea primero un curso.</p>' : `
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="bg-purple-50 p-4 rounded-xl border border-purple-200 space-y-3">
                            <h4 class="font-bold text-xs text-purple-900"><i class="fa-solid fa-video mr-1"></i> Subir Videos (.mp4) - Clases Grabadas vía Zoom</h4>
                            <form onsubmit="subirVideoDocente(event)" class="space-y-3 text-xs">
                                <select id="upload-vid-curso-id" class="w-full p-2 border rounded bg-white">
                                    ${cursosDB.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('')}
                                </select>
                                <input type="file" id="upload-video-file" accept="video/mp4,.mp4" multiple class="w-full p-1.5 border rounded bg-white text-xs" onchange="handleVideoSelection(this)">
                                <p id="video-status-text" class="text-[11px] font-bold text-purple-700"></p>
                                <button type="submit" class="w-full bg-chile-purple text-white font-bold py-2 rounded text-xs uppercase shadow">Cargar Videos MP4</button>
                            </form>
                        </div>

                        <div class="bg-blue-50 p-4 rounded-xl border border-blue-200 space-y-3">
                            <h4 class="font-bold text-xs text-blue-900"><i class="fa-solid fa-paperclip mr-1"></i> Material Complementario</h4>
                            <form onsubmit="subirComplementarioDocente(event)" class="space-y-3 text-xs">
                                <select id="comp-curso-id" class="w-full p-2 border rounded bg-white">
                                    ${cursosDB.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('')}
                                </select>
                                <div>
                                    <label class="block font-bold text-gray-700 mb-1">Título del Material</label>
                                    <input type="text" id="comp-titulo" placeholder="Ej: Guía de Lectura Módulo 1" required class="w-full p-2 border rounded bg-white">
                                </div>
                                
                                <div id="complementario-slots-container" class="space-y-3">
                                    <div class="bg-white p-3 rounded-lg border space-y-2 shadow-sm">
                                        <span class="text-[11px] font-bold text-chile-purple">Ítem Complementario #1</span>
                                        <div>
                                            <label class="block text-[11px] font-semibold text-gray-700">Subir Archivo(s) (PDF, DOCX, XLSX, etc.)</label>
                                            <input type="file" multiple class="comp-file-input w-full p-1 border rounded bg-slate-50 text-xs" onchange="handleComplementarioSelection(this)">
                                        </div>
                                        <div>
                                            <label class="block text-[11px] font-semibold text-gray-700">O Enlace URL</label>
                                            <input type="url" placeholder="https://ejemplo.com/recurso" class="comp-url-input w-full p-1.5 border rounded bg-slate-50 text-xs">
                                        </div>
                                    </div>
                                </div>

                                <p id="comp-status-text" class="text-[11px] font-bold text-blue-700"></p>

                                <button type="button" onclick="agregarCasillaComplementaria()" class="w-full bg-slate-200 hover:bg-slate-300 text-gray-800 font-bold py-1.5 rounded text-xs">
                                    + Añadir más material complementario (Casilla extra)
                                </button>

                                <button type="submit" class="w-full bg-chile-blue text-white font-bold py-2 rounded text-xs uppercase shadow">Guardar Material Complementario</button>
                            </form>
                        </div>
                    </div>
                `}
            `;
        }

        const tituloSeccionVideo = isDocente ? "Clases Grabadas vía Zoom" : "Clases Grabadas vía Zoom";

        html += `
            <div class="space-y-4">
                <div class="bg-slate-50 p-4 rounded-xl border">
                    <h4 class="font-bold text-xs text-gray-900 mb-3"><i class="fa-solid fa-play-circle text-purple-700 mr-1"></i> ${tituloSeccionVideo} (${materialesDB.length})</h4>
                    ${materialesDB.length === 0 ? '<p class="text-xs text-gray-500 italic">No hay videos cargados.</p>' : `
                        <div class="space-y-2">
                            ${materialesDB.map(m => {
                                const curso = cursosDB.find(c => c.id === m.cursoId);
                                return `
                                    <div class="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
                                        <div class="truncate pr-2">
                                            <div class="flex items-center space-x-2">
                                                <i class="fa-solid fa-file-video text-purple-600"></i>
                                                <h5 class="font-bold text-gray-900 text-xs sm:text-sm truncate">${m.titulo}</h5>
                                            </div>
                                            <p class="text-[11px] text-gray-500">Curso: ${curso ? curso.nombre : 'General'} | Peso Real: ${m.tamano}</p>
                                        </div>
                                        <div class="flex items-center space-x-1">
                                            <button onclick="reproducirVideoModal('${m.titulo.replace(/'/g, "")}', '${m.url}', '${m.tamano}', ${m.id})" class="px-3 py-1.5 bg-purple-600 text-white rounded font-bold text-xs">
                                                Ver Video
                                            </button>
                                            ${isDocente ? `<button onclick="eliminarMaterial(${m.id})" class="p-1.5 text-red-600 border rounded" title="Eliminar"><i class="fa-solid fa-trash"></i></button>` : ''}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `}
                </div>

                <div class="bg-blue-50/50 p-4 rounded-xl border">
                    <h4 class="font-bold text-xs text-blue-900 mb-3"><i class="fa-solid fa-folder-open text-blue-600 mr-1"></i> Material Complementario (${complementariosDB.length})</h4>
                    ${complementariosDB.length === 0 ? '<p class="text-xs text-gray-500 italic">No hay material cargado.</p>' : `
                        <div class="space-y-2">
                            ${complementariosDB.map(comp => {
                                const curso = cursosDB.find(c => c.id === comp.cursoId);
                                const isUrl = (comp.tipo === 'URL');
                                return `
                                    <div class="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
                                        <div class="truncate pr-2">
                                            <div class="flex items-center space-x-2">
                                                <i class="${isUrl ? 'fa-solid fa-link text-blue-500' : 'fa-solid fa-file-arrow-down text-blue-700'}"></i>
                                                <h5 class="font-bold text-gray-900 text-xs sm:text-sm truncate">${comp.titulo}</h5>
                                            </div>
                                            <p class="text-[11px] text-gray-500">Curso: ${curso ? curso.nombre : 'General'} | ${comp.tamano}</p>
                                        </div>
                                        <div class="flex items-center space-x-1">
                                            <button onclick="abrirComplementario(${comp.id})" class="px-3 py-1.5 bg-blue-600 text-white rounded font-bold text-xs">
                                                ${isUrl ? 'Ver Link URL' : 'Descargar Archivo'}
                                            </button>
                                            ${isDocente ? `<button onclick="eliminarComplementario(${comp.id})" class="p-1.5 text-red-600 border rounded" title="Eliminar"><i class="fa-solid fa-trash"></i></button>` : ''}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;

        html += `</div>`;
        document.getElementById('modal-body').innerHTML = html;
    } else if (key === 'tests') {
        document.getElementById('modal-title').innerText = isDocente ? "SISTEMA DE CREACIÓN DE EVALUACIONES" : "EVALUACIÓN DE CURSOS";
        modalIcon.className = 'fa-solid fa-file-signature text-amber-400 text-2xl';

        let html = `<div class="space-y-5">`;

        if (isDocente) {
            html += `
                <div class="bg-purple-50 p-4 rounded-xl border border-purple-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div>
                        <h4 class="font-bold text-xs sm:text-sm text-purple-900"><i class="fa-solid fa-plus-circle mr-1"></i> Creación de Evaluaciones por Curso</h4>
                        <p class="text-xs text-gray-600 mt-0.5">Crea una plantilla estándar de 21 preguntas por cada curso registrado.</p>
                    </div>
                    <button onclick="abrirFormularioCrearEvaluacion()" class="bg-chile-purple hover:bg-chile-purple-dark text-white font-extrabold px-4 py-2.5 rounded-lg text-xs uppercase shadow transition whitespace-nowrap">
                        + NUEVA EVALUACIÓN
                    </button>
                </div>

                <div class="bg-slate-50 p-4 rounded-xl border border-gray-200 space-y-3">
                    <h4 class="font-bold text-xs sm:text-sm text-gray-800">Evaluaciones Creadas (${evaluacionesDB.length})</h4>
                    ${evaluacionesDB.length === 0 ? '<p class="text-xs text-gray-500 italic">No hay evaluaciones creadas. Haz clic en "NUEVA EVALUACIÓN" para crear una.</p>' : `
                        <div class="space-y-3">
                            ${evaluacionesDB.map(ev => {
                                const curso = cursosDB.find(c => c.id === ev.cursoId);
                                const estaHabilitada = ev.habilitadaDocente;

                                return `
                                    <div class="p-3.5 bg-white border rounded-xl shadow-sm space-y-2">
                                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                                            <div>
                                                <h5 class="font-black text-gray-900 text-xs sm:text-sm">${ev.titulo}</h5>
                                                <p class="text-[11px] text-gray-500 font-semibold">Curso: ${curso ? curso.nombre : 'General'} | 21 Preguntas Configurate</p>
                                            </div>
                                            <div class="flex items-center space-x-2">
                                                <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold ${estaHabilitada ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                                    ${estaHabilitada ? 'HABILITADA' : 'INHABILITADA'}
                                                </span>
                                                <button onclick="toggleHabilitacionEvaluacionDocente(${ev.id})" class="px-3 py-1 text-xs font-bold uppercase rounded text-white ${estaHabilitada ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'} shadow transition">
                                                    ${estaHabilitada ? 'Inhabilitar' : 'Habilitar'}
                                                </button>
                                                <button onclick="abrirFormularioCrearEvaluacion(${ev.id})" class="p-1.5 text-blue-600 border rounded" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
                                                <button onclick="eliminarEvaluacion(${ev.id})" class="p-1.5 text-red-600 border rounded" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                                            </div>
                                        </div>
                                        <div class="bg-blue-50/70 p-2 rounded text-[11px] text-blue-900 font-medium">
                                            <strong>Mensaje instalado para el estudiante:</strong> ¡Mucho éxito en esta evaluación! Demuestra todo lo aprendido y confía en tus capacidades.
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `}
                </div>

                <div class="bg-slate-50 p-4 rounded-xl border border-gray-200 space-y-3">
                    <h4 class="font-bold text-xs sm:text-sm text-gray-800">Resultados Rendidos por Estudiantes (${studentSubmissionsDB.length})</h4>
                    ${studentSubmissionsDB.length === 0 ? '<p class="text-xs text-gray-500 italic">Ningún estudiante ha rendido evaluaciones.</p>' : `
                        <div class="overflow-x-auto">
                            <table class="w-full text-left text-xs bg-white border rounded">
                                <thead class="bg-chile-purple text-white uppercase text-[11px]">
                                    <tr>
                                        <th class="p-2">Estudiante</th>
                                        <th class="p-2">Evaluación</th>
                                        <th class="p-2 text-center">Buenas / Malas</th>
                                        <th class="p-2 text-center">Intentos</th>
                                        <th class="p-2 text-center">Estado</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y">
                                    ${studentSubmissionsDB.map(sub => `
                                        <tr>
                                            <td class="p-2 font-bold">${sub.studentNombre}<br><span class="text-[10px] text-gray-500">${sub.studentCorreo}</span></td>
                                            <td class="p-2">${sub.evalTitulo}</td>
                                            <td class="p-2 text-center text-gray-800 font-bold"><span class="text-green-700">${sub.buenas}</span> / <span class="text-red-600">${sub.malas}</span></td>
                                            <td class="p-2 text-center text-purple-700 font-bold">${sub.attemptsCount || 1}</td>
                                            <td class="p-2 text-center"><span class="px-2 py-0.5 rounded text-[10px] font-extrabold ${sub.aprobado ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${sub.aprobado ? 'APROBADO' : 'REPROBADO'}</span></td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `}
                </div>
            `;
        } else {
            const todosCursosCompletos = estudianteCompletoTodosLosCursos(currentUser.correo);

            html += `
                <div class="space-y-4">
                    ${evaluacionesDB.length === 0 ? '<p class="text-xs text-gray-500 italic p-4 bg-white rounded border">No hay evaluaciones disponibles por el momento.</p>' : `
                        <div class="grid grid-cols-1 gap-3">
                            ${evaluacionesDB.map(ev => {
                                const habilitadaPorDocente = ev.habilitadaDocente;
                                const puedeRendir = todosCursosCompletos && habilitadaPorDocente;
                                const subEnviado = studentSubmissionsDB.find(sub => sub.studentCorreo === currentUser.correo && sub.evaluacionId === ev.id);
                                const intentosRealizados = subEnviado ? (subEnviado.attemptsCount || 1) : 0;
                                const curso = cursosDB.find(c => c.id === ev.cursoId);

                                return `
                                    <div class="p-4 bg-white border-2 border-blue-100 rounded-xl shadow-sm space-y-3">
                                        <div class="flex justify-between items-start">
                                            <div>
                                                <h5 class="font-bold text-gray-900 text-sm">${ev.titulo}</h5>
                                                <p class="text-xs text-gray-600 mt-1">Curso: ${curso ? curso.nombre : 'General'} (21 preguntas).</p>
                                                <p class="text-xs text-gray-500 mt-0.5">Intentos realizados: <strong class="text-chile-blue">${intentosRealizados}</strong>.</p>
                                            </div>
                                            <span class="px-2.5 py-1 rounded-full text-xs font-extrabold ${puedeRendir ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}">
                                                ${puedeRendir ? 'Habilitada' : 'Bloqueada'}
                                            </span>
                                        </div>

                                        <div class="space-y-1.5 pt-2 border-t text-xs">
                                            <div class="flex items-center space-x-2 ${todosCursosCompletos ? 'text-green-700' : 'text-amber-700'} font-semibold">
                                                <i class="fa-solid ${todosCursosCompletos ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
                                                <span>Requisito: Completar el 100% de los videos de cada curso estudiado (${todosCursosCompletos ? 'Cumplido' : 'Pendiente'}).</span>
                                            </div>
                                            <div class="flex items-center space-x-2 ${habilitadaPorDocente ? 'text-green-700' : 'text-amber-700'} font-semibold">
                                                <i class="fa-solid ${habilitadaPorDocente ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
                                                <span>Estado Docente: ${habilitadaPorDocente ? 'Habilitada por Docente' : 'Inhabilitada por Docente'}.</span>
                                            </div>
                                        </div>

                                        <div class="pt-3 flex justify-between items-center border-t">
                                            ${subEnviado ? `<span class="text-xs font-bold ${subEnviado.aprobado ? 'text-green-700' : 'text-red-600'}">${subEnviado.aprobado ? '¡Felicidades! Has aprobado el curso.' : 'Has reprobado el curso. Vuelve a intentarlo.'}</span>` : '<span></span>'}
                                            ${puedeRendir ? `
                                                <button onclick="iniciarRendirEvaluacion(${ev.id})" class="bg-chile-blue hover:bg-chile-blue-dark text-white font-bold px-5 py-2.5 rounded-lg text-xs uppercase shadow transition">
                                                    Rendir Evaluación
                                                </button>
                                            ` : `
                                                <span class="text-xs text-amber-800 font-bold bg-amber-50 px-3 py-1.5 rounded border border-amber-200">
                                                    Evaluación aún no disponible.
                                                </span>
                                            `}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `}
                </div>
            `;
        }

        html += `</div>`;
        document.getElementById('modal-body').innerHTML = html;
    }

    document.getElementById('modal-overlay').classList.remove('hidden');
}

function preventBackdropClose(event) {
    event.stopPropagation();
}

function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
}

function showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = "bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl mb-2 text-xs sm:text-sm flex items-center space-x-2 transition transform translate-y-2 opacity-0";
    toast.innerHTML = `<i class="fa-solid fa-circle-info text-blue-400 flex-shrink-0"></i><span>${message}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => toast.classList.remove('translate-y-2', 'opacity-0'), 10);
    setTimeout(() => {
        toast.classList.add('opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function handleLogout() {
    currentUser = null;
    currentRole = null;
    closeModal();
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('role-selection-screen').classList.remove('hidden');
    showToast("Sesión cerrada.");
}

window.addEventListener('DOMContentLoaded', () => {
    initStorage();
});
