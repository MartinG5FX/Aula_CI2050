// Docente único oficial fijo asignado
const DOCENTE_OFICIAL = {
    id: 1,
    nombreCompleto: "Hugo Alberto Sánchez Vega",
    nombre: "Hugo",
    rut: "12.626.135-7",
    correo: "academia@chileinnova2050.cl",
    pass: "CasaAzul27$",
    pinEnc: [49, 57, 56, 56], // PIN '1988' protegido
    fono: "+56 9 7528 0132",
    rol: "docente"
};

// Bases de Datos con persistencia automática en localStorage
let docentesDB = [DOCENTE_OFICIAL];
let estudiantesDB = JSON.parse(localStorage.getItem('ci2050_estudiantes')) || [];
let cursosDB = JSON.parse(localStorage.getItem('ci2050_cursos')) || [];
let materialesDB = JSON.parse(localStorage.getItem('ci2050_materiales')) || [];
let complementariosDB = JSON.parse(localStorage.getItem('ci2050_complementarios')) || [];
let evaluacionesDB = JSON.parse(localStorage.getItem('ci2050_evaluaciones')) || [];
let studentProgressDB = JSON.parse(localStorage.getItem('ci2050_progress')) || {};
let studentSubmissionsDB = JSON.parse(localStorage.getItem('ci2050_submissions')) || [];

let currentRole = null;
let currentUser = null;

let editingStudentId = null;
let editingCourseId = null;

function persistData() {
    try {
        localStorage.setItem('ci2050_estudiantes', JSON.stringify(estudiantesDB));
        localStorage.setItem('ci2050_cursos', JSON.stringify(cursosDB));
        localStorage.setItem('ci2050_materiales', JSON.stringify(materialesDB));
        localStorage.setItem('ci2050_complementarios', JSON.stringify(complementariosDB));
        localStorage.setItem('ci2050_evaluaciones', JSON.stringify(evaluacionesDB));
        localStorage.setItem('ci2050_progress', JSON.stringify(studentProgressDB));
        localStorage.setItem('ci2050_submissions', JSON.stringify(studentSubmissionsDB));
    } catch (e) {
        console.warn("Storage warning:", e);
    }
}

// Función para alternar visibilidad de contraseña (Ojito)
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
        inputIdent.placeholder = "academia@chileinnova2050.cl";
        btnSubmit.className = "w-full bg-chile-purple hover:bg-chile-purple-dark text-white font-extrabold py-3 rounded-lg shadow-md transition text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center space-x-2 active:scale-98";
        docPinField.classList.remove('hidden');
        inputPin.required = true;
    } else {
        title.innerText = "Acceso Estudiante";
        subtitle.innerText = "Ingrese su correo y contraseña asignados por su docente.";
        labelIdent.innerText = "Correo Electrónico Estudiante";
        inputIdent.placeholder = "Ingrese su correo aqui";
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
}

function setupRoleUI() {
    const isDocente = (currentRole === 'docente');
    updateHeaderProfile();

    document.getElementById('panel-role-text').innerText = isDocente 
        ? '/ Panel Principal - Docente' 
        : '/ Panel Principal - Estudiante';

    document.getElementById('btn-label-1').innerText = isDocente ? "CURSOS Y CREDENCIALES" : "MIS CURSOS Y PROGRESO";
    document.getElementById('btn-label-2').innerText = isDocente ? "MATERIAL COMPLEMENTARIO" : "MATERIAL COMPLEMENTARIO";
    document.getElementById('btn-label-3').innerText = isDocente ? "EVALUACIONES" : "EVALUACIÓN";
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
    if (confirm("¿Estás seguro de eliminar este curso? Se eliminarán también sus videos y material complementario.")) {
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

    if (editingStudentId) {
        const st = estudiantesDB.find(s => s.id === editingStudentId);
        if (st) {
            st.nombreCompleto = nombreComp;
            st.nombre = nombreComp.split(' ')[0] || nombreComp;
            st.rut = rut;
            st.correo = correo;
            st.fono = fono;
            st.pass = pass;
            showToast("Credenciales de estudiante actualizadas.");
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
            pass: pass
        });

        showToast("Estudiante y credenciales registrados.");
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
    if (confirm("¿Deseas eliminar a este estudiante?")) {
        estudiantesDB = estudiantesDB.filter(s => s.id !== stId);
        persistData();
        showToast("Estudiante eliminado.");
        openModal('courses');
    }
}

// --- VIDEOS (CUENTAN PARA EL 100% DE CURSO) ---
function subirVideoDocente(e) {
    e.preventDefault();
    const cursoId = parseInt(document.getElementById('upload-vid-curso-id').value);
    const fileInput = document.getElementById('upload-video-file');
    const files = fileInput.files;

    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        materialesDB.push({
            id: Date.now() + i,
            cursoId: cursoId,
            titulo: file.name,
            tipo: 'MP4_FILE',
            tamano: formatBytes(file.size),
            url: URL.createObjectURL(file)
        });
    }

    fileInput.value = "";
    persistData();
    showToast("Video(s) MP4 cargados con éxito (Aportan al 100% de progreso).");
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
    // Registrar visualización del video para el cálculo del 100% de progreso
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
                    <span class="text-[11px] text-gray-500 font-semibold">Tamaño Real: ${tamano} (Ilimitado)</span>
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

// --- MATERIAL COMPLEMENTARIO (NO CUENTA PARA EL PORCENTAJE) ---
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
            <label class="block text-[11px] font-semibold text-gray-700">Subir Archivo(s) (Cualquier formato: PDF, DOCX, XLSX, ZIP, etc. Ilimitado)</label>
            <input type="file" multiple class="comp-file-input w-full p-1 border rounded bg-slate-50 text-xs">
        </div>
        <div>
            <label class="block text-[11px] font-semibold text-gray-700">O Enlace URL (Cualquier URL externa)</label>
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

    let subidosCount = 0;

    fileInputs.forEach((fi) => {
        if (fi.files && fi.files.length > 0) {
            for (let f = 0; f < fi.files.length; f++) {
                const file = fi.files[f];
                complementariosDB.push({
                    id: Date.now() + Math.random(),
                    cursoId: cursoId,
                    titulo: `${tituloGlobal} - ${file.name}`,
                    tipo: 'FILE',
                    tamano: formatBytes(file.size),
                    url: URL.createObjectURL(file)
                });
                subidosCount++;
            }
        }
    });

    urlInputs.forEach((ui) => {
        const valUrl = ui.value.trim();
        if (valUrl) {
            complementariosDB.push({
                id: Date.now() + Math.random(),
                cursoId: cursoId,
                titulo: `${tituloGlobal} (Enlace URL)`,
                tipo: 'URL',
                tamano: 'Enlace Web',
                url: valUrl
            });
            subidosCount++;
        }
    });

    if (subidosCount === 0) {
        showToast("Por favor adjunte al menos un archivo o URL.");
        return;
    }

    document.getElementById('comp-titulo').value = "";
    complementarioSlotsCount = 1;
    persistData();
    showToast(`Se subieron ${subidosCount} elementos de material complementario (No afectan porcentaje).`);
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

// --- EVALUACIONES ---
let preguntasFilas = [];

function iniciarPreguntasFilas() {
    preguntasFilas = [{ id: Date.now(), pregunta: "", opA: "", opB: "", opC: "", opD: "", correcta: 0 }];
    renderFilasPreguntas();
}

function agregarFilaPregunta() {
    preguntasFilas.push({ id: Date.now() + Math.random(), pregunta: "", opA: "", opB: "", opC: "", opD: "", correcta: 0 });
    renderFilasPreguntas();
}

function eliminarFilaPregunta(index) {
    if (preguntasFilas.length <= 1) return;
    preguntasFilas.splice(index, 1);
    renderFilasPreguntas();
}

function guardarValoresFilas() {
    preguntasFilas.forEach((item, idx) => {
        const txtPreg = document.getElementById(`fila_preg_${idx}`);
        const opA = document.getElementById(`fila_opA_${idx}`);
        const opB = document.getElementById(`fila_opB_${idx}`);
        const opC = document.getElementById(`fila_opC_${idx}`);
        const opD = document.getElementById(`fila_opD_${idx}`);
        const radCorr = document.querySelector(`input[name="fila_corr_${idx}"]:checked`);

        if (txtPreg) item.pregunta = txtPreg.value;
        if (opA) item.opA = opA.value;
        if (opB) item.opB = opB.value;
        if (opC) item.opC = opC.value;
        if (opD) item.opD = opD.value;
        if (radCorr) item.correcta = parseInt(radCorr.value);
    });
}

function renderFilasPreguntas() {
    guardarValoresFilas();
    const container = document.getElementById('filas-preguntas-container');
    if (!container) return;

    let html = ``;
    preguntasFilas.forEach((item, idx) => {
        html += `
            <div class="bg-white border-2 border-gray-200 rounded-xl p-3 sm:p-4 space-y-3 shadow-sm">
                <div class="flex items-center justify-between border-b pb-2">
                    <span class="font-extrabold text-xs sm:text-sm text-chile-purple flex items-center">
                        <i class="fa-solid fa-list-check mr-2 text-amber-500"></i> Pregunta #${idx + 1}
                    </span>
                    <button type="button" onclick="eliminarFilaPregunta(${idx})" class="text-red-600 hover:text-red-800 text-xs font-bold transition">
                        <i class="fa-solid fa-trash-can mr-1"></i> Eliminar
                    </button>
                </div>
                <div>
                    <label class="block text-[11px] font-bold text-gray-700 uppercase mb-1">Pregunta</label>
                    <input type="text" id="fila_preg_${idx}" value="${item.pregunta}" placeholder="Pregunta..." class="w-full p-2 border rounded text-xs bg-slate-50 focus:bg-white" required>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                    <div class="flex items-center space-x-2 bg-slate-50 p-2 rounded border">
                        <input type="radio" name="fila_corr_${idx}" value="0" ${item.correcta === 0 ? 'checked' : ''} class="w-4 h-4 text-purple-600">
                        <span class="font-bold text-xs text-gray-700">A)</span>
                        <input type="text" id="fila_opA_${idx}" value="${item.opA}" placeholder="Opción A" class="w-full p-1 border rounded text-xs bg-white" required>
                    </div>
                    <div class="flex items-center space-x-2 bg-slate-50 p-2 rounded border">
                        <input type="radio" name="fila_corr_${idx}" value="1" ${item.correcta === 1 ? 'checked' : ''} class="w-4 h-4 text-purple-600">
                        <span class="font-bold text-xs text-gray-700">B)</span>
                        <input type="text" id="fila_opB_${idx}" value="${item.opB}" placeholder="Opción B" class="w-full p-1 border rounded text-xs bg-white" required>
                    </div>
                    <div class="flex items-center space-x-2 bg-slate-50 p-2 rounded border">
                        <input type="radio" name="fila_corr_${idx}" value="2" ${item.correcta === 2 ? 'checked' : ''} class="w-4 h-4 text-purple-600">
                        <span class="font-bold text-xs text-gray-700">C)</span>
                        <input type="text" id="fila_opC_${idx}" value="${item.opC}" placeholder="Opción C" class="w-full p-1 border rounded text-xs bg-white" required>
                    </div>
                    <div class="flex items-center space-x-2 bg-slate-50 p-2 rounded border">
                        <input type="radio" name="fila_corr_${idx}" value="3" ${item.correcta === 3 ? 'checked' : ''} class="w-4 h-4 text-purple-600">
                        <span class="font-bold text-xs text-gray-700">D)</span>
                        <input type="text" id="fila_opD_${idx}" value="${item.opD}" placeholder="Opción D" class="w-full p-1 border rounded text-xs bg-white" required>
                    </div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function guardarEvaluacionFilasDocente(e) {
    e.preventDefault();
    guardarValoresFilas();

    const cursoSelect = document.getElementById('eval-docente-curso');
    if (!cursoSelect || !cursoSelect.value) return;

    const cursoId = parseInt(cursoSelect.value);
    let preguntasFormateadas = [];

    preguntasFilas.forEach((item) => {
        preguntasFormateadas.push({
            pregunta: item.pregunta,
            opciones: [item.opA, item.opB, item.opC, item.opD],
            correcta: item.correcta || 0
        });
    });

    const cursoObj = cursosDB.find(c => c.id === cursoId);

    evaluacionesDB.push({
        id: Date.now(),
        cursoId: cursoId,
        docenteCorreo: currentUser.correo,
        titulo: `Evaluación - ${cursoObj ? cursoObj.nombre : 'Curso'}`,
        preguntas: preguntasFormateadas
    });

    persistData();
    showToast("Evaluación publicada con éxito.");
    openModal('tests');
}

function iniciarRendirEvaluacion(evalId) {
    const evalObj = evaluacionesDB.find(e => e.id === evalId);
    if (!evalObj) return;

    let sub = studentSubmissionsDB.find(s => s.studentCorreo === currentUser.correo && s.evaluacionId === evalId);
    let intentosRealizados = sub ? (sub.attemptsCount || 1) : 1;

    const modalBody = document.getElementById('modal-body');
    document.getElementById('modal-title').innerText = `Rindiendo: ${evalObj.titulo} (Intento #${intentosRealizados} - Oportunidades Infinitas)`;

    let html = `
        <form onsubmit="revisarEvaluacionAntesDeEnviar(event, ${evalId})" class="space-y-4">
            <div class="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p class="text-xs text-blue-900 font-bold"><i class="fa-solid fa-infinity mr-1"></i> Intentos realizados: ${intentosRealizados} (Tienes infinitas oportunidades).</p>
            </div>
    `;

    evalObj.preguntas.forEach((p, pIdx) => {
        html += `
            <div class="bg-white border rounded-xl p-4 shadow-sm space-y-2">
                <h5 class="font-bold text-gray-900 text-xs sm:text-sm">Pregunta #${pIdx + 1}: ${p.pregunta}</h5>
                <div class="space-y-1.5 pt-1">
                    ${p.opciones.map((op, opIdx) => `
                        <label class="flex items-center space-x-2 p-2 rounded bg-slate-50 hover:bg-slate-100 cursor-pointer border">
                            <input type="radio" name="resp_${pIdx}" value="${opIdx}" required class="w-4 h-4 text-chile-blue">
                            <span class="text-xs font-medium text-gray-800">${['A', 'B', 'C', 'D'][opIdx]}) ${op}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `;
    });

    html += `
            <button type="submit" class="w-full bg-chile-blue hover:bg-chile-blue-dark text-white font-extrabold py-3 rounded-lg text-xs uppercase shadow transition">
                Enviar y Ver Resultado Inmediato
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

    const totalPreguntas = evalObj.preguntas.length;
    const notaPorcentaje = (correctasCount / totalPreguntas) * 100;
    const aprobado = notaPorcentaje >= 60;

    const nombrePrincipal = currentUser.nombre;

    studentSubmissionsDB = studentSubmissionsDB.filter(sub => !(sub.studentCorreo === currentUser.correo && sub.evaluacionId === evalId));
    studentSubmissionsDB.push({
        studentCorreo: currentUser.correo,
        studentNombre: currentUser.nombreCompleto || currentUser.nombre,
        cursoId: evalObj.cursoId,
        evaluacionId: evalId,
        evalTitulo: evalObj.titulo,
        buenas: correctasCount,
        malas: incorrectasCount,
        total: totalPreguntas,
        aprobado: aprobado,
        attemptsCount: intentosCount,
        detalles: detalles
    });

    persistData();

    const modalBody = document.getElementById('modal-body');
    document.getElementById('modal-title').innerText = "Resultado de Evaluación";

    let mensajeResultado = aprobado 
        ? `${nombrePrincipal}, aprobaste esta evaluación.` 
        : `${nombrePrincipal} vuelve a intentarlo, tu puedes!`;

    modalBody.innerHTML = `
        <div class="space-y-4 text-xs sm:text-sm">
            <div class="p-5 rounded-xl border text-center ${aprobado ? 'bg-green-50 border-green-300 text-green-900' : 'bg-red-50 border-red-300 text-red-900'} shadow-sm">
                <h3 class="text-base sm:text-lg font-black uppercase mb-2">
                    ${aprobado ? '¡FELICIDADES!' : '¡ÁNIMO!'}
                </h3>
                <p class="text-sm sm:text-base font-extrabold mb-1">${mensajeResultado}</p>
                <p class="text-xs font-semibold">Obtuviste ${correctasCount} de ${totalPreguntas} correctas (${notaPorcentaje.toFixed(0)}%).</p>
                <p class="mt-3 text-xs text-gray-600">Intentos totales realizados: <strong class="text-chile-blue">${intentosCount}</strong> (¡Oportunidades infinitas!)</p>
            </div>
            <button onclick="openModal('tests')" class="w-full bg-gray-700 hover:bg-gray-800 text-white font-bold py-3 rounded-lg text-xs uppercase shadow transition">
                Volver a Evaluaciones
            </button>
        </div>
    `;
    showToast(aprobado ? "¡Evaluación aprobada con éxito!" : "Intento registrado. ¡Puedes volver a intentarlo!");
}

// --- CÁLCULO DE PROGRESO 100% EXCLUSIVO DE VIDEOS (.mp4) ---
function calcularPorcentajeEstudiante(cursoId, studentCorreo) {
    const videosCurso = materialesDB.filter(m => m.cursoId === cursoId && m.tipo === 'MP4_FILE');
    if (videosCurso.length === 0) return 0;

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
                            <input type="text" id="new-course-name" placeholder="Ej: Transformación Digital" required class="w-full p-2 border rounded bg-white">
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
                    <form onsubmit="guardarEstudianteDocente(event)" class="space-y-3 text-xs">
                        <div>
                            <label class="block font-bold text-gray-700 mb-1">Nombre Completo</label>
                            <input type="text" id="st-nombre-completo" placeholder="Ej: Juan Pérez" required class="w-full p-2 border rounded bg-white">
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                                <label class="block font-bold text-gray-700 mb-1">RUT</label>
                                <input type="text" id="st-rut" placeholder="12.345.678-9" required class="w-full p-2 border rounded bg-white">
                            </div>
                            <div>
                                <label class="block font-bold text-gray-700 mb-1">Correo Electrónico</label>
                                <input type="email" id="st-correo" placeholder="estudiante@ejemplo.com" required class="w-full p-2 border rounded bg-white">
                            </div>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                                <label class="block font-bold text-gray-700 mb-1">Teléfono Fono</label>
                                <input type="text" id="st-fono" placeholder="+56 9 1234 5678" required class="w-full p-2 border rounded bg-white">
                            </div>
                            <div>
                                <label class="block font-bold text-gray-700 mb-1">Contraseña</label>
                                <div class="relative">
                                    <input type="password" id="st-pass" placeholder="••••••••" required class="w-full p-2 pr-9 border rounded bg-white">
                                    <button type="button" onclick="togglePasswordVisibility('st-pass', 'eye-st-pass')" class="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-purple-700 focus:outline-none">
                                        <i id="eye-st-pass" class="fa-solid fa-eye text-xs"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="flex gap-2">
                            <button type="submit" id="btn-submit-student" class="flex-grow bg-chile-purple text-white font-bold py-2.5 rounded-lg text-xs uppercase shadow">
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
                    ${estudiantesDB.length === 0 ? '<p class="text-xs text-gray-500 italic">No hay estudiantes.</p>' : `
                        <div class="space-y-2">
                            ${estudiantesDB.map(s => `
                                <div class="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
                                    <div>
                                        <h5 class="font-bold text-gray-900 text-xs sm:text-sm">${s.nombreCompleto}</h5>
                                        <p class="text-[11px] text-gray-500">${s.correo} | Clave: ${s.pass}</p>
                                    </div>
                                    <div class="flex items-center space-x-2">
                                        <button onclick="editarEstudiante(${s.id})" class="p-2 text-purple-600 rounded text-xs border"><i class="fa-solid fa-pen-to-square"></i></button>
                                        <button onclick="eliminarEstudiante(${s.id})" class="p-2 text-red-600 rounded text-xs border"><i class="fa-solid fa-trash"></i></button>
                                    </div>
                                </div>
                            `).join('')}
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
                                const evaluacionCurso = evaluacionesDB.find(ev => ev.cursoId === c.id);
                                const testDesbloqueado = (porcentaje === 100);

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
                                        <div class="pt-2 border-t flex justify-between items-center">
                                            <span class="text-xs font-bold ${testDesbloqueado ? 'text-green-600' : 'text-amber-600'}">
                                                <i class="fa-solid ${testDesbloqueado ? 'fa-unlock' : 'fa-lock'} mr-1"></i>
                                                ${testDesbloqueado ? 'Evaluación Desbloqueada' : 'Evaluación Bloqueada (Requiere 100% en videos)'}
                                            </span>
                                            ${evaluacionCurso && testDesbloqueado ? `
                                                <button onclick="closeModal(); iniciarRendirEvaluacion(${evaluacionCurso.id})" class="bg-chile-blue text-white px-3 py-1.5 rounded text-xs font-bold uppercase">
                                                    Rendir Evaluación
                                                </button>
                                            ` : ''}
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
                        <!-- SECCIÓN VIDEOS (CUENTAN PARA 100%) -->
                        <div class="bg-purple-50 p-4 rounded-xl border border-purple-200 space-y-3">
                            <h4 class="font-bold text-xs text-purple-900"><i class="fa-solid fa-video mr-1"></i> Subir Videos (.mp4) - <span class="text-chile-red">¡Afecta % de curso!</span></h4>
                            <form onsubmit="subirVideoDocente(event)" class="space-y-3 text-xs">
                                <select id="upload-vid-curso-id" class="w-full p-2 border rounded bg-white">
                                    ${cursosDB.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('')}
                                </select>
                                <input type="file" id="upload-video-file" accept="video/mp4,.mp4" multiple required class="w-full p-1.5 border rounded bg-white text-xs">
                                <button type="submit" class="w-full bg-chile-purple text-white font-bold py-2 rounded text-xs uppercase shadow">Cargar Videos MP4</button>
                            </form>
                        </div>

                        <!-- SECCIÓN MATERIAL COMPLEMENTARIO (NO CUENTA %) -->
                        <div class="bg-blue-50 p-4 rounded-xl border border-blue-200 space-y-3">
                            <h4 class="font-bold text-xs text-blue-900"><i class="fa-solid fa-paperclip mr-1"></i> Material Complementario (<span class="text-gray-600">No cuenta porcentaje</span>)</h4>
                            <form onsubmit="subirComplementarioDocente(event)" class="space-y-3 text-xs">
                                <select id="comp-curso-id" class="w-full p-2 border rounded bg-white">
                                    ${cursosDB.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('')}
                                </select>
                                <div>
                                    <label class="block font-bold text-gray-700 mb-1">Título del Material</label>
                                    <input type="text" id="comp-titulo" placeholder="Ej: Guía de Lectura Adicional" required class="w-full p-2 border rounded bg-white">
                                </div>
                                
                                <div id="complementario-slots-container" class="space-y-3">
                                    <div class="bg-white p-3 rounded-lg border space-y-2 shadow-sm">
                                        <span class="text-[11px] font-bold text-chile-purple">Ítem Complementario #1</span>
                                        <div>
                                            <label class="block text-[11px] font-semibold text-gray-700">Subir Archivo(s) (PDF, DOCX, XLSX, etc. Ilimitado)</label>
                                            <input type="file" multiple class="comp-file-input w-full p-1 border rounded bg-slate-50 text-xs">
                                        </div>
                                        <div>
                                            <label class="block text-[11px] font-semibold text-gray-700">O Enlace URL (Cualquier URL)</label>
                                            <input type="url" placeholder="https://ejemplo.com/recurso" class="comp-url-input w-full p-1.5 border rounded bg-slate-50 text-xs">
                                        </div>
                                    </div>
                                </div>

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

        // Listado de Videos (.mp4) y Material Complementario
        html += `
            <div class="space-y-4">
                <div class="bg-slate-50 p-4 rounded-xl border">
                    <h4 class="font-bold text-xs text-gray-900 mb-3"><i class="fa-solid fa-play-circle text-purple-700 mr-1"></i> Videos Oficiales del Curso (Aportan al 100% de Progreso) (${materialesDB.length})</h4>
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
                                            ${isDocente ? `<button onclick="eliminarMaterial(${m.id})" class="p-1.5 text-red-600 border rounded"><i class="fa-solid fa-trash"></i></button>` : ''}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `}
                </div>

                <div class="bg-blue-50/50 p-4 rounded-xl border">
                    <h4 class="font-bold text-xs text-blue-900 mb-3"><i class="fa-solid fa-folder-open text-blue-600 mr-1"></i> Material Complementario (No afecta porcentaje de curso) (${complementariosDB.length})</h4>
                    ${complementariosDB.length === 0 ? '<p class="text-xs text-gray-500 italic">No hay material complementario cargado.</p>' : `
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
                                            ${isDocente ? `<button onclick="eliminarComplementario(${comp.id})" class="p-1.5 text-red-600 border rounded"><i class="fa-solid fa-trash"></i></button>` : ''}
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
        document.getElementById('modal-title').innerText = isDocente ? "GESTIÓN Y RESULTADOS DE EVALUACIONES" : "EVALUACIÓN";
        modalIcon.className = 'fa-solid fa-file-signature text-amber-400 text-2xl';

        let html = `<div class="space-y-5">`;

        if (isDocente) {
            html += `
                <div class="bg-gray-50 p-4 rounded-xl border space-y-4">
                    <h4 class="font-bold text-xs text-gray-800"><i class="fa-solid fa-plus-circle text-chile-purple mr-1"></i> Crear Evaluación por Filas</h4>
                    ${cursosDB.length === 0 ? '<p class="text-xs text-amber-700 font-bold">Crea al menos un curso.</p>' : `
                        <form onsubmit="guardarEvaluacionFilasDocente(event)" class="space-y-4">
                            <select id="eval-docente-curso" class="w-full p-2 border rounded text-xs bg-white font-semibold">
                                ${cursosDB.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('')}
                            </select>
                            <div id="filas-preguntas-container" class="space-y-3"></div>
                            <button type="button" onclick="agregarFilaPregunta()" class="w-full bg-slate-200 py-2 rounded text-xs font-bold text-gray-800 border">
                                + AGREGAR PREGUNTA
                            </button>
                            <button type="submit" class="w-full bg-chile-purple text-white font-bold py-3 rounded text-xs uppercase shadow">
                                Publicar Evaluación
                            </button>
                        </form>
                    `}
                </div>

                <div class="bg-purple-50 p-4 rounded-xl border space-y-3">
                    <h4 class="font-bold text-xs text-purple-900">Evaluaciones Rendidas por Estudiantes (${studentSubmissionsDB.length})</h4>
                    ${studentSubmissionsDB.length === 0 ? '<p class="text-xs text-gray-500 italic">Ningún estudiante ha rendido evaluaciones.</p>' : `
                        <div class="overflow-x-auto">
                            <table class="w-full text-left text-xs bg-white border rounded">
                                <thead class="bg-chile-purple text-white uppercase text-[11px]">
                                    <tr>
                                        <th class="p-2">Estudiante</th>
                                        <th class="p-2">Evaluación</th>
                                        <th class="p-2 text-center">Buenas</th>
                                        <th class="p-2 text-center">Intentos</th>
                                        <th class="p-2 text-center">Estado</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y">
                                    ${studentSubmissionsDB.map(sub => `
                                        <tr>
                                            <td class="p-2 font-bold">${sub.studentNombre}<br><span class="text-[10px] text-gray-500">${sub.studentCorreo}</span></td>
                                            <td class="p-2">${sub.evalTitulo}</td>
                                            <td class="p-2 text-center text-green-700 font-bold">${sub.buenas} / ${sub.total}</td>
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
            html += `
                <div class="space-y-3">
                    <h4 class="font-bold text-sm text-gray-800">Evaluaciones Asignadas</h4>
                    ${evaluacionesDB.length === 0 ? '<p class="text-xs text-gray-500">No hay evaluaciones disponibles.</p>' : `
                        <div class="space-y-3">
                            ${evaluacionesDB.map(ev => {
                                const porcentaje = calcularPorcentajeEstudiante(ev.cursoId, currentUser.correo);
                                const testDesbloqueado = (porcentaje === 100);
                                const subEnviado = studentSubmissionsDB.find(sub => sub.studentCorreo === currentUser.correo && sub.evaluacionId === ev.id);
                                const intentosRealizados = subEnviado ? (subEnviado.attemptsCount || 1) : 0;

                                return `
                                    <div class="p-4 bg-white border rounded-xl shadow-sm space-y-2">
                                        <div class="flex justify-between items-start">
                                            <div>
                                                <h5 class="font-bold text-gray-900 text-sm">${ev.titulo}</h5>
                                                <p class="text-xs text-gray-500">Intentos realizados: <strong class="text-chile-blue">${intentosRealizados}</strong> (¡Infinitas oportunidades!)</p>
                                            </div>
                                            <span class="px-2 py-0.5 rounded text-[11px] font-bold ${testDesbloqueado ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}">
                                                ${testDesbloqueado ? 'Desbloqueado' : `Bloqueado (${porcentaje}% de videos)`}
                                            </span>
                                        </div>
                                        <div class="pt-2 flex justify-between items-center border-t">
                                            ${subEnviado ? `<span class="text-xs font-bold ${subEnviado.aprobado ? 'text-green-700' : 'text-amber-700'}">${subEnviado.aprobado ? 'Aprobado anteriormente' : 'Reprobado (Puedes reintentar)'}</span>` : ''}
                                            ${testDesbloqueado ? `<button onclick="iniciarRendirEvaluacion(${ev.id})" class="bg-chile-blue text-white font-bold px-4 py-2 rounded text-xs uppercase shadow">Rendir Evaluación</button>` : '<span class="text-xs text-gray-500 italic">Completa el 100% de los videos para desbloquear.</span>'}
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
        if (isDocente && cursosDB.length > 0) {
            iniciarPreguntasFilas();
        }
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