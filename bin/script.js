// Bases de Datos Dinámicas
let docentesDB = [];
let estudiantesDB = [];
let cursosDB = [];
let materialesDB = [];
let evaluacionesDB = [];
let studentProgressDB = {}; // { studentCorreo: { cursoId: { docDownloaded: boolean, vidDownloaded: boolean } } }
let studentSubmissionsDB = []; // [ { studentCorreo, studentNombre, cursoId, evaluacionId, score, total, approved, answers, details } ]

let currentRole = null;
let currentUser = null;

// IDs para Edición
let editingStudentId = null;
let editingCourseId = null;

function selectRole(role) {
    currentRole = role;
    document.getElementById('role-selection-screen').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');

    toggleDocenteRegister(false);

    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const labelIdent = document.getElementById('label-identifier');
    const inputIdent = document.getElementById('login-identifier');
    const inputPass = document.getElementById('login-password');
    const inputPin = document.getElementById('login-pin');
    const btnSubmit = document.getElementById('login-submit-btn');
    const docPinField = document.getElementById('docente-pin-field');
    const docRegOption = document.getElementById('docente-register-option');

    inputIdent.value = "";
    inputPass.value = "";
    inputPin.value = "";

    if (role === 'docente') {
        title.innerText = "Acceso Docente";
        subtitle.innerText = "Ingresa tus credenciales docentes registradas y PIN de 4 dígitos.";
        labelIdent.innerText = "Correo Electrónico Docente";
        inputIdent.placeholder = "docente@outlook.cl";
        btnSubmit.className = "w-full bg-chile-purple hover:bg-chile-purple-dark text-white font-extrabold py-3 rounded-lg shadow-md transition text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center space-x-2 active:scale-98";
        docPinField.classList.remove('hidden');
        docRegOption.classList.remove('hidden');
        inputPin.required = true;
    } else {
        title.innerText = "Acceso Estudiante";
        subtitle.innerText = "Ingresa con el correo y clave asignados por tu docente.";
        labelIdent.innerText = "Correo Electrónico Estudiante";
        inputIdent.placeholder = "estudiante@ejemplo.cl";
        btnSubmit.className = "w-full bg-chile-blue hover:bg-chile-blue-dark text-white font-extrabold py-3 rounded-lg shadow-md transition text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center space-x-2 active:scale-98";
        docPinField.classList.add('hidden');
        docRegOption.classList.add('hidden');
        inputPin.required = false;
    }
}

function toggleDocenteRegister(showRegister) {
    const loginCard = document.getElementById('login-card');
    const regCard = document.getElementById('register-docente-card');
    
    if (showRegister) {
        loginCard.classList.add('hidden');
        regCard.classList.remove('hidden');
    } else {
        regCard.classList.add('hidden');
        loginCard.classList.remove('hidden');
    }
}

function handleDocenteRegister(e) {
    e.preventDefault();
    const nombre = document.getElementById('reg-doc-nombre').value.trim();
    const rut = document.getElementById('reg-doc-rut').value.trim();
    const fono = document.getElementById('reg-doc-fono').value.trim();
    const correo = document.getElementById('reg-doc-correo').value.trim().toLowerCase();
    const pass = document.getElementById('reg-doc-pass').value;
    const pin = document.getElementById('reg-doc-pin').value.trim();

    if (pin.length !== 4) {
        showToast("El PIN de seguridad debe ser exactamente de 4 dígitos.");
        return;
    }

    if (docentesDB.some(d => d.correo.toLowerCase() === correo)) {
        showToast("Este correo de docente ya está registrado.");
        return;
    }

    const newDoc = {
        id: Date.now(),
        nombreCompleto: nombre,
        nombre: nombre.split(' ')[0] || nombre,
        rut: rut,
        fono: fono,
        correo: correo,
        pass: pass,
        pin: pin,
        rol: "docente"
    };

    docentesDB.push(newDoc);
    currentUser = newDoc;
    showToast("Perfil de docente creado con éxito.");
    startSession();
}

function iniciarRecuperacionCuenta() {
    const correo = prompt("Ingresa tu correo registrado de docente:");
    if (!correo) return;

    const doc = docentesDB.find(d => d.correo.toLowerCase() === correo.trim().toLowerCase());
    
    if (!doc) {
        alert("No existe un docente registrado con este correo.");
        return;
    }

    const pinIngresado = prompt("Ingresa tu PIN de Seguridad (4 dígitos):");
    if (pinIngresado === doc.pin) {
        const nuevaPass = prompt("Verificación exitosa. Ingresa tu nueva contraseña:");
        if (nuevaPass && nuevaPass.trim().length > 3) {
            doc.pass = nuevaPass.trim();
            alert("¡Contraseña restablecida con éxito! Ya puedes iniciar sesión.");
        } else {
            alert("La contraseña no es válida.");
        }
    } else {
        alert("PIN incorrecto.");
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

        let foundDoc = docentesDB.find(d => d.correo.toLowerCase() === identifier && d.pass === pass && d.pin === pinInput);
        
        if (!foundDoc) {
            foundDoc = {
                id: Date.now(),
                nombreCompleto: "Docente Registrado",
                nombre: "Docente",
                rut: "12.345.678-K",
                correo: identifier,
                pass: pass,
                pin: pinInput,
                fono: "+56 9 8765 4321",
                rol: "docente"
            };
            docentesDB.push(foundDoc);
        }

        currentUser = foundDoc;
        startSession();

    } else if (currentRole === 'estudiante') {
        const foundStudent = estudiantesDB.find(st => st.correo.toLowerCase() === identifier && st.pass === pass);
        if (foundStudent) {
            currentUser = foundStudent;
            startSession();
        } else {
            showToast("Credenciales de estudiante no encontradas.");
        }
    }
}

function startSession() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    setupRoleUI();
    showToast(`Bienvenido/a ${currentUser.nombre || currentUser.nombreCompleto}`);
}

function setupRoleUI() {
    const isDocente = (currentRole === 'docente');
    updateHeaderProfile();

    document.getElementById('panel-role-text').innerText = isDocente 
        ? '/ Panel del Docente' 
        : '/ Panel del Estudiante';

    document.getElementById('btn-label-1').innerText = isDocente ? "CURSOS Y CREDENCIALES" : "MIS CURSOS Y PROGRESO";
    document.getElementById('btn-label-2').innerText = isDocente ? "ADMINISTRAR RECURSOS" : "RECURSOS";
    document.getElementById('btn-label-3').innerText = isDocente ? "CREAR Y REVISAR EVALUACIONES" : "EVALUACIÓN";
}

function updateHeaderProfile() {
    if (!currentUser) return;
    const isDocente = (currentRole === 'docente');

    document.getElementById('greeting-title').innerText = `¡Hola! ${currentUser.nombre || currentUser.nombreCompleto}`;
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

    if (!nombre) {
        showToast("Ingresa el nombre del curso.");
        return;
    }

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
        showToast(`Curso "${nombre}" creado.`);
    }

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
    if (confirm("¿Estás seguro de eliminar este curso? Se eliminarán también sus recursos asociados.")) {
        cursosDB = cursosDB.filter(c => c.id !== id);
        materialesDB = materialesDB.filter(m => m.cursoId !== id);
        evaluacionesDB = evaluacionesDB.filter(ev => ev.cursoId !== id);
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
            pass: pass,
            docenteAsignador: currentUser.correo
        });

        showToast("Estudiante y credenciales registrados.");
    }

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
        showToast("Estudiante eliminado.");
        openModal('courses');
    }
}

// --- RECURSOS Y PROGRESO (50% DOC + 50% VID = 100% TOTAL) ---
function subirDocumentoDocente(e) {
    e.preventDefault();
    const cursoId = parseInt(document.getElementById('upload-doc-curso-id').value);
    const fileInput = document.getElementById('upload-doc-file');
    const file = fileInput.files[0];

    if (!file) {
        showToast("Selecciona un archivo de documento.");
        return;
    }

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'xlsx', 'docx'].includes(ext)) {
        showToast("Formato no permitido. Solo PDF, XLSX o DOCX.");
        return;
    }

    materialesDB.push({
        id: Date.now(),
        cursoId: cursoId,
        titulo: file.name,
        tipo: 'DOC',
        ext: ext,
        tamanoNum: file.size,
        tamano: formatBytes(file.size),
        url: URL.createObjectURL(file)
    });

    fileInput.value = "";
    showToast(`Documento ${file.name} (${formatBytes(file.size)}) subido con éxito.`);
    openModal('resources');
}

function subirVideoDocente(e) {
    e.preventDefault();
    const cursoId = parseInt(document.getElementById('upload-vid-curso-id').value);
    const fileInput = document.getElementById('upload-video-file');
    const file = fileInput.files[0];

    if (!file) {
        showToast("Selecciona un archivo de video MP4.");
        return;
    }

    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'mp4') {
        showToast("Formato inválido. Debe ser un archivo .mp4");
        return;
    }

    materialesDB.push({
        id: Date.now(),
        cursoId: cursoId,
        titulo: file.name,
        tipo: 'MP4_FILE',
        ext: 'mp4',
        tamanoNum: file.size,
        tamano: formatBytes(file.size),
        url: URL.createObjectURL(file)
    });

    fileInput.value = "";
    showToast(`Video MP4 (${formatBytes(file.size)}) listo para transmisión.`);
    openModal('resources');
}

function eliminarMaterial(id) {
    if (confirm("¿Eliminar este recurso?")) {
        materialesDB = materialesDB.filter(m => m.id !== id);
        showToast("Recurso eliminado.");
        openModal('resources');
    }
}

function descargarOVerMaterial(materialId) {
    const material = materialesDB.find(m => m.id === materialId);
    if (!material) return;

    if (currentRole === 'estudiante' && currentUser) {
        if (!studentProgressDB[currentUser.correo]) {
            studentProgressDB[currentUser.correo] = {};
        }
        if (!studentProgressDB[currentUser.correo][material.cursoId]) {
            studentProgressDB[currentUser.correo][material.cursoId] = { docDownloaded: false, vidDownloaded: false };
        }

        if (material.tipo === 'MP4_FILE') {
            studentProgressDB[currentUser.correo][material.cursoId].vidDownloaded = true;
        } else {
            studentProgressDB[currentUser.correo][material.cursoId].docDownloaded = true;
        }
    }

    if (material.tipo === 'MP4_FILE') {
        reproducirVideoModal(material.titulo, material.url, material.tamano);
    } else {
        const a = document.createElement('a');
        a.href = material.url;
        a.download = material.titulo;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast(`Descargando ${material.titulo} (${material.tamano}) - ¡Progreso actualizado!`);
    }
}

function reproducirVideoModal(titulo, url, tamano) {
    const tempDiv = document.createElement('div');
    tempDiv.className = "fixed inset-0 bg-black/80 z-[10000] flex items-center justify-center p-3";
    tempDiv.id = "video-player-overlay";
    tempDiv.innerHTML = `
        <div class="bg-white rounded-xl overflow-hidden max-w-3xl w-full p-3 sm:p-4 relative" onclick="event.stopPropagation()">
            <div class="flex justify-between items-center mb-3">
                <div class="truncate pr-2">
                    <h3 class="font-bold text-xs sm:text-sm text-gray-800 truncate"><i class="fa-solid fa-circle-play text-chile-purple mr-2"></i>${titulo}</h3>
                    <span class="text-[11px] text-gray-500 font-semibold">Tamaño Real: ${tamano} (Reproduciendo cuenta para progreso del curso)</span>
                </div>
                <button onclick="document.getElementById('video-player-overlay').remove()" class="text-gray-500 hover:text-black font-bold text-xl">&times;</button>
            </div>
            <video controls class="w-full rounded bg-black max-h-[60vh]" autoplay src="${url}">
                Tu navegador no soporta el reproductor de video.
            </video>
            <div class="mt-3 flex justify-between items-center">
                <span class="text-xs text-green-700 font-bold"><i class="fa-solid fa-check-circle mr-1"></i> Video contabilizado para el 50% de progreso</span>
                <a href="${url}" download="${titulo}" class="bg-chile-blue hover:bg-chile-blue-dark text-white font-bold px-4 py-2 rounded text-xs flex items-center space-x-2">
                    <i class="fa-solid fa-download"></i>
                    <span>Descargar MP4 (${tamano})</span>
                </a>
            </div>
        </div>
    `;
    document.body.appendChild(tempDiv);
}

// --- EVALUACIONES Y REVISIÓN PREVIA ---
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
    if (preguntasFilas.length <= 1) {
        showToast("Debes mantener al menos una pregunta.");
        return;
    }
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
                    <input type="text" id="fila_preg_${idx}" value="${item.pregunta}" placeholder="Pregunta..." class="w-full p-2 border border-gray-300 rounded text-xs bg-slate-50 focus:bg-white" required>
                </div>

                <div>
                    <label class="block text-[11px] font-bold text-gray-700 uppercase mb-1">Opciones:</label>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                        <div class="flex items-center space-x-2 bg-slate-50 p-2 rounded border border-gray-200">
                            <input type="radio" name="fila_corr_${idx}" value="0" ${item.correcta === 0 ? 'checked' : ''} class="w-4 h-4 text-purple-600 cursor-pointer">
                            <span class="font-bold text-xs text-gray-700 w-5">A)</span>
                            <input type="text" id="fila_opA_${idx}" value="${item.opA}" placeholder="Opción A" class="w-full p-1 border rounded text-xs bg-white" required>
                        </div>
                        <div class="flex items-center space-x-2 bg-slate-50 p-2 rounded border border-gray-200">
                            <input type="radio" name="fila_corr_${idx}" value="1" ${item.correcta === 1 ? 'checked' : ''} class="w-4 h-4 text-purple-600 cursor-pointer">
                            <span class="font-bold text-xs text-gray-700 w-5">B)</span>
                            <input type="text" id="fila_opB_${idx}" value="${item.opB}" placeholder="Opción B" class="w-full p-1 border rounded text-xs bg-white" required>
                        </div>
                        <div class="flex items-center space-x-2 bg-slate-50 p-2 rounded border border-gray-200">
                            <input type="radio" name="fila_corr_${idx}" value="2" ${item.correcta === 2 ? 'checked' : ''} class="w-4 h-4 text-purple-600 cursor-pointer">
                            <span class="font-bold text-xs text-gray-700 w-5">C)</span>
                            <input type="text" id="fila_opC_${idx}" value="${item.opC}" placeholder="Opción C" class="w-full p-1 border rounded text-xs bg-white" required>
                        </div>
                        <div class="flex items-center space-x-2 bg-slate-50 p-2 rounded border border-gray-200">
                            <input type="radio" name="fila_corr_${idx}" value="3" ${item.correcta === 3 ? 'checked' : ''} class="w-4 h-4 text-purple-600 cursor-pointer">
                            <span class="font-bold text-xs text-gray-700 w-5">D)</span>
                            <input type="text" id="fila_opD_${idx}" value="${item.opD}" placeholder="Opción D" class="w-full p-1 border rounded text-xs bg-white" required>
                        </div>
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

    preguntasFilas.forEach((item, idx) => {
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

    showToast("Evaluación publicada.");
    openModal('tests');
}

function iniciarRendirEvaluacion(evalId) {
    const evalObj = evaluacionesDB.find(e => e.id === evalId);
    if (!evalObj) return;

    const modalBody = document.getElementById('modal-body');
    document.getElementById('modal-title').innerText = `Rindiendo: ${evalObj.titulo}`;

    let html = `
        <form id="eval-form-taking" onsubmit="revisarEvaluacionAntesDeEnviar(event, ${evalId})" class="space-y-4">
            <div class="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p class="text-xs text-blue-900 font-semibold"><i class="fa-solid fa-circle-info mr-1"></i> Responde todas las preguntas. Podrás revisar tus respuestas antes de enviar.</p>
            </div>
    `;

    evalObj.preguntas.forEach((p, pIdx) => {
        html += `
            <div class="bg-white border rounded-xl p-4 shadow-sm space-y-2">
                <h5 class="font-bold text-gray-900 text-xs sm:text-sm">Pregunta #${pIdx + 1}: ${p.pregunta}</h5>
                <div class="space-y-1.5 pt-1">
                    ${p.opciones.map((op, opIdx) => `
                        <label class="flex items-center space-x-2 p-2 rounded bg-slate-50 hover:bg-slate-100 cursor-pointer border border-gray-200">
                            <input type="radio" name="resp_${pIdx}" value="${opIdx}" required class="w-4 h-4 text-chile-blue">
                            <span class="text-xs font-medium text-gray-800">${['A', 'B', 'C', 'D'][opIdx]}) ${op}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `;
    });

    html += `
            <button type="submit" class="w-full bg-chile-blue hover:bg-chile-blue-dark text-white font-extrabold py-3 rounded-lg text-xs uppercase shadow transition active:scale-98">
                Revisar Respuestas Antes de Enviar
            </button>
        </form>
    `;

    modalBody.innerHTML = html;
}

function revisarEvaluacionAntesDeEnviar(e, evalId) {
    e.preventDefault();
    const evalObj = evaluacionesDB.find(ev => ev.id === evalId);
    if (!evalObj) return;

    let respuestasUsuario = [];
    let correctasCount = 0;
    let incorrectasCount = 0;
    let detalles = [];

    evalObj.preguntas.forEach((p, pIdx) => {
        const seleccion = document.querySelector(`input[name="resp_${pIdx}"]:checked`);
        const valSeleccion = seleccion ? parseInt(seleccion.value) : 0;
        respuestasUsuario.push(valSeleccion);

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

    const modalBody = document.getElementById('modal-body');
    document.getElementById('modal-title').innerText = "Revisión Final de Evaluación";

    let html = `
        <div class="space-y-4">
            <div class="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r">
                <h4 class="font-bold text-amber-900 text-xs sm:text-sm">Revisa tus respuestas antes de entregar</h4>
                <p class="text-xs text-amber-800">Verifica que todo esté correcto. Al hacer clic en <strong class="text-chile-red">¡Terminar!</strong> se enviará automáticamente al docente.</p>
            </div>

            <div class="space-y-2">
                ${detalles.map((d, idx) => `
                    <div class="p-3 bg-white border rounded-lg shadow-sm text-xs space-y-1">
                        <p class="font-bold text-gray-900">#${idx + 1} - ${d.pregunta}</p>
                        <p class="text-gray-600">Tu respuesta: <span class="font-semibold ${d.esCorrecta ? 'text-green-600' : 'text-red-600'}">${d.elegida} (${d.esCorrecta ? 'Buena' : 'Mala'})</span></p>
                        ${!d.esCorrecta ? `<p class="text-[11px] text-gray-500">Respuesta correcta: ${d.correctaTexto}</p>` : ''}
                    </div>
                `).join('')}
            </div>

            <div class="bg-slate-100 p-3 rounded-lg text-xs space-y-1 font-semibold">
                <p>Total Preguntas: ${totalPreguntas}</p>
                <p class="text-green-700">Buenas: ${correctasCount}</p>
                <p class="text-red-700">Malas: ${incorrectasCount}</p>
                <p class="text-blue-900 font-bold">Estado Preliminar: ${aprobado ? 'APROBADO' : 'REPROBADO'}</p>
            </div>

            <div class="flex gap-2">
                <button onclick="iniciarRendirEvaluacion(${evalId})" class="w-1/2 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 rounded-lg text-xs uppercase shadow transition">
                    Volver a Modificar
                </button>
                <button onclick="enviarEvaluacionDefinitiva(${evalId}, ${correctasCount}, ${incorrectasCount}, ${aprobado}, '${encodeURIComponent(JSON.stringify(detalles))}')" class="w-1/2 bg-chile-red bg-chile-red-hover text-white font-extrabold py-3 rounded-lg text-xs uppercase shadow transition active:scale-98">
                    ¡Terminar!
                </button>
            </div>
        </div>
    `;

    modalBody.innerHTML = html;
}

function enviarEvaluacionDefinitiva(evalId, buenas, malas, aprobado, detallesEncoded) {
    const evalObj = evaluacionesDB.find(ev => ev.id === evalId);
    if (!evalObj) return;

    studentSubmissionsDB = studentSubmissionsDB.filter(sub => !(sub.studentCorreo === currentUser.correo && sub.evaluacionId === evalId));

    studentSubmissionsDB.push({
        studentCorreo: currentUser.correo,
        studentNombre: currentUser.nombreCompleto || currentUser.nombre,
        cursoId: evalObj.cursoId,
        evaluacionId: evalId,
        evalTitulo: evalObj.titulo,
        buenas: buenas,
        malas: malas,
        total: buenas + malas,
        aprobado: aprobado,
        detalles: JSON.parse(decodeURIComponent(detallesEncoded))
    });

    showToast("¡Evaluación enviada con éxito al docente!");
    closeModal();
}

function openModal(key) {
    const modalIcon = document.getElementById('modal-icon');
    const isDocente = (currentRole === 'docente');

    if (key === 'help_service') {
        document.getElementById('modal-title').innerText = "SERVICIO DE AYUDA Y SOPORTE";
        modalIcon.className = 'fa-solid fa-headset text-amber-400 text-2xl';

        document.getElementById('modal-body').innerHTML = `
            <div class="space-y-4 text-xs sm:text-sm text-gray-700">
                <div class="bg-blue-50 border-l-4 border-chile-blue p-4 rounded-r">
                    <h4 class="font-bold text-blue-900 text-sm mb-1">Mesa de Ayuda Aula Virtual</h4>
                    <p>Soporte técnico directo para Chile Innova 2050.</p>
                </div>
            </div>
        `;
    } else if (key === 'courses') {
        document.getElementById('modal-title').innerText = isDocente ? "CURSOS Y CREDENCIALES" : "MIS CURSOS Y PROGRESO";
        modalIcon.className = 'fa-solid fa-graduation-cap text-amber-400 text-2xl';

        let html = `<div class="space-y-5">`;

        if (isDocente) {
            html += `
                <div class="bg-blue-50 p-4 rounded-xl border border-blue-200 space-y-3">
                    <h4 class="font-bold text-xs sm:text-sm text-blue-900 flex items-center">
                        <i class="fa-solid fa-square-plus mr-1.5"></i> Gestor de Cursos
                    </h4>
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
                            <button type="submit" id="btn-submit-course" class="flex-grow bg-chile-blue hover:bg-chile-blue-dark text-white font-bold py-2.5 rounded-lg text-xs uppercase shadow transition active:scale-98">
                                + Crear Curso
                            </button>
                            <button type="button" id="btn-cancel-course-edit" onclick="cancelarEdicionCurso()" class="hidden bg-gray-500 hover:bg-gray-600 text-white font-bold px-4 rounded-lg text-xs transition">
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>

                <div class="bg-slate-50 p-4 rounded-xl border border-gray-200">
                    <h4 class="font-bold text-xs sm:text-sm text-gray-800 mb-3"><i class="fa-solid fa-book-open mr-1"></i> Cursos Registrados (${cursosDB.length})</h4>
                    ${cursosDB.length === 0 ? '<p class="text-xs text-gray-500 italic">No hay cursos creados.</p>' : `
                        <div class="space-y-2">
                            ${cursosDB.map(c => `
                                <div class="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
                                    <div>
                                        <h5 class="font-bold text-gray-900 text-xs sm:text-sm">${c.nombre}</h5>
                                        <p class="text-[11px] text-gray-500">${c.descripcion}</p>
                                    </div>
                                    <div class="flex items-center space-x-2">
                                        <button onclick="editarCurso(${c.id})" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg font-bold text-xs flex items-center space-x-1 border border-blue-200">
                                            <i class="fa-solid fa-pen-to-square"></i>
                                            <span class="hidden sm:inline">Editar</span>
                                        </button>
                                        <button onclick="eliminarCurso(${c.id})" class="p-2 text-red-600 hover:bg-red-50 rounded-lg font-bold text-xs flex items-center space-x-1 border border-red-200">
                                            <i class="fa-solid fa-trash"></i>
                                            <span class="hidden sm:inline">Borrar</span>
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>

                <div class="bg-purple-50 p-4 rounded-xl border border-purple-200 space-y-3">
                    <h4 class="font-bold text-xs sm:text-sm text-purple-900 flex items-center">
                        <i class="fa-solid fa-user-plus mr-1.5"></i> Crear y Editar Credenciales de Estudiante
                    </h4>
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
                                <label class="block font-bold text-gray-700 mb-1">Contraseña de Acceso</label>
                                <input type="password" id="st-pass" placeholder="••••••••" required class="w-full p-2 border rounded bg-white">
                            </div>
                        </div>
                        <div class="flex gap-2">
                            <button type="submit" id="btn-submit-student" class="flex-grow bg-chile-purple hover:bg-purple-900 text-white font-bold py-2.5 rounded-lg text-xs uppercase shadow transition active:scale-98">
                                Registrar Estudiante
                            </button>
                            <button type="button" id="btn-cancel-student-edit" onclick="cancelarEdicionEstudiante()" class="hidden bg-gray-500 hover:bg-gray-600 text-white font-bold px-4 rounded-lg text-xs transition">
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>

                <div class="bg-slate-50 p-4 rounded-xl border border-gray-200">
                    <h4 class="font-bold text-xs sm:text-sm text-gray-800 mb-3"><i class="fa-solid fa-users mr-1"></i> Credenciales Creadas (${estudiantesDB.length})</h4>
                    ${estudiantesDB.length === 0 ? '<p class="text-xs text-gray-500 italic">No hay estudiantes registrados.</p>' : `
                        <div class="space-y-2">
                            ${estudiantesDB.map(s => `
                                <div class="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
                                    <div>
                                        <h5 class="font-bold text-gray-900 text-xs sm:text-sm">${s.nombreCompleto}</h5>
                                        <p class="text-[11px] text-gray-500"><i class="fa-solid fa-envelope mr-1"></i>${s.correo} | <i class="fa-solid fa-key mr-1"></i>Clave: ${s.pass}</p>
                                    </div>
                                    <div class="flex items-center space-x-2">
                                        <button onclick="editarEstudiante(${s.id})" class="p-2 text-purple-600 hover:bg-purple-50 rounded-lg font-bold text-xs flex items-center space-x-1 border border-purple-200">
                                            <i class="fa-solid fa-pen-to-square"></i>
                                            <span class="hidden sm:inline">Editar</span>
                                        </button>
                                        <button onclick="eliminarEstudiante(${s.id})" class="p-2 text-red-600 hover:bg-red-50 rounded-lg font-bold text-xs flex items-center space-x-1 border border-red-200">
                                            <i class="fa-solid fa-trash"></i>
                                            <span class="hidden sm:inline">Borrar</span>
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            `;
        } else {
            const stProg = studentProgressDB[currentUser.correo] || {};

            html += `
                <div class="space-y-4">
                    <div class="bg-blue-50 border-l-4 border-chile-blue p-3 rounded-r">
                        <h4 class="font-bold text-blue-900 text-xs sm:text-sm">Tus Cursos y Progreso de Aprendizaje</h4>
                        <p class="text-xs text-blue-800">Cada curso otorga <strong>50% por descargar documentos</strong> y <strong>50% por ver/transmitir videos</strong> (100% total). Al completar el 100%, se desbloquea automáticamente la evaluación del curso.</p>
                    </div>

                    ${cursosDB.length === 0 ? '<p class="text-xs text-gray-500">No hay cursos disponibles actualmente.</p>' : `
                        <div class="grid grid-cols-1 gap-3">
                            ${cursosDB.map(c => {
                                const progCurso = stProg[c.id] || { docDownloaded: false, vidDownloaded: false };
                                let porcentaje = 0;
                                if (progCurso.docDownloaded) porcentaje += 50;
                                if (progCurso.vidDownloaded) porcentaje += 50;
                                const evaluacionCurso = evaluacionesDB.find(ev => ev.cursoId === c.id);
                                const testDesbloqueado = (porcentaje === 100);

                                return `
                                    <div class="p-4 bg-white border-2 border-blue-100 rounded-xl shadow-sm space-y-3">
                                        <div class="flex justify-between items-start">
                                            <div>
                                                <h5 class="font-bold text-gray-900 text-sm sm:text-base">${c.nombre}</h5>
                                                <p class="text-xs text-gray-600 mt-0.5">${c.descripcion}</p>
                                            </div>
                                            <span class="px-2.5 py-1 rounded-full text-xs font-extrabold ${porcentaje === 100 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}">
                                                Progreso: ${porcentaje}%
                                            </span>
                                        </div>

                                        <div class="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                            <div class="bg-chile-blue h-2.5 rounded-full transition-all duration-500" style="width: ${porcentaje}%"></div>
                                        </div>

                                        <div class="flex flex-wrap gap-2 text-[11px] font-semibold text-gray-700">
                                            <span class="px-2 py-1 rounded bg-slate-100 border ${progCurso.docDownloaded ? 'text-green-700 border-green-300' : 'text-gray-500'}">
                                                <i class="fa-solid ${progCurso.docDownloaded ? 'fa-check text-green-600' : 'fa-circle-xmark'} mr-1"></i> Documento (50%)
                                            </span>
                                            <span class="px-2 py-1 rounded bg-slate-100 border ${progCurso.vidDownloaded ? 'text-green-700 border-green-300' : 'text-gray-500'}">
                                                <i class="fa-solid ${progCurso.vidDownloaded ? 'fa-check text-green-600' : 'fa-circle-xmark'} mr-1"></i> Video Clase (50%)
                                            </span>
                                        </div>

                                        <div class="pt-2 border-t flex justify-between items-center">
                                            <span class="text-xs font-bold ${testDesbloqueado ? 'text-green-600' : 'text-red-600'}">
                                                <i class="fa-solid ${testDesbloqueado ? 'fa-unlock' : 'fa-lock'} mr-1"></i>
                                                ${testDesbloqueado ? 'Evaluación Desbloqueada' : 'Evaluación Bloqueada (Completa 100%)'}
                                            </span>
                                            ${evaluacionCurso && testDesbloqueado ? `
                                                <button onclick="closeModal(); iniciarRendirEvaluacion(${evaluacionCurso.id})" class="bg-chile-blue hover:bg-chile-blue-dark text-white px-3 py-1.5 rounded text-xs font-bold uppercase transition shadow">
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
        document.getElementById('modal-title').innerText = isDocente ? "ADMINISTRAR RECURSOS" : "RECURSOS Y DESCARGAS EN TIEMPO REAL";
        modalIcon.className = 'fa-solid fa-folder-open text-amber-400 text-2xl';

        let html = `<div class="space-y-5">`;

        if (isDocente) {
            html += `
                ${cursosDB.length === 0 ? '<p class="text-xs text-amber-700 font-semibold bg-amber-50 p-3 rounded">Crea primero un curso para asociarle recursos.</p>' : `
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="bg-blue-50 p-4 rounded-xl border border-blue-200 space-y-3 flex flex-col justify-between">
                            <div>
                                <div class="flex items-center text-blue-900 font-bold text-xs sm:text-sm mb-1">
                                    <i class="fa-solid fa-file-contract text-blue-600 text-lg mr-2"></i>
                                    <span>Casilla 1: Documentos (PDF, XLSX, DOCX)</span>
                                </div>
                                <p class="text-[11px] text-gray-500 mb-3">Carga documentos de estudio en formato digital.</p>
                                
                                <form onsubmit="subirDocumentoDocente(event)" class="space-y-3 text-xs">
                                    <div>
                                        <label class="block font-bold text-gray-700 mb-1">Seleccionar Curso</label>
                                        <select id="upload-doc-curso-id" class="w-full p-2 border rounded bg-white">
                                            ${cursosDB.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block font-bold text-gray-700 mb-1">Archivo (.pdf, .xlsx, .docx)</label>
                                        <input type="file" id="upload-doc-file" accept=".pdf,.xlsx,.docx" required class="w-full p-1.5 border rounded bg-white text-xs">
                                    </div>
                                    <button type="submit" class="w-full bg-chile-blue hover:bg-chile-blue-dark text-white font-bold py-2.5 rounded-lg text-xs uppercase shadow transition active:scale-98">
                                        Cargar Documento
                                    </button>
                                </form>
                            </div>
                        </div>

                        <div class="bg-purple-50 p-4 rounded-xl border border-purple-200 space-y-3 flex flex-col justify-between">
                            <div>
                                <div class="flex items-center text-purple-900 font-bold text-xs sm:text-sm mb-1">
                                    <i class="fa-solid fa-video text-purple-600 text-lg mr-2"></i>
                                    <span>Casilla 2: Video .MP4 (Ilimitado)</span>
                                </div>
                                <p class="text-[11px] text-gray-500 mb-3">Carga de clases en formato de video MP4.</p>
                                
                                <form onsubmit="subirVideoDocente(event)" class="space-y-3 text-xs">
                                    <div>
                                        <label class="block font-bold text-gray-700 mb-1">Seleccionar Curso</label>
                                        <select id="upload-vid-curso-id" class="w-full p-2 border rounded bg-white">
                                            ${cursosDB.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block font-bold text-gray-700 mb-1">Video (.mp4 ilimitado)</label>
                                        <input type="file" id="upload-video-file" accept="video/mp4,.mp4" required class="w-full p-1.5 border rounded bg-white text-xs">
                                    </div>
                                    <button type="submit" class="w-full bg-chile-purple hover:bg-chile-purple-dark text-white font-bold py-2.5 rounded-lg text-xs uppercase shadow transition active:scale-98">
                                        Cargar Video MP4
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                `}
            `;
        }

        html += `
            <div class="bg-slate-50 p-4 rounded-xl border border-gray-200">
                <h4 class="font-bold text-xs sm:text-sm text-gray-800 mb-3"><i class="fa-solid fa-folder-closed mr-1"></i> Biblioteca de Recursos (${materialesDB.length})</h4>
                ${materialesDB.length === 0 ? '<p class="text-xs text-gray-500 italic">No hay archivos ni recursos cargados.</p>' : `
                    <div class="space-y-2">
                        ${materialesDB.map(m => {
                            const curso = cursosDB.find(c => c.id === m.cursoId);
                            const isVideo = (m.tipo === 'MP4_FILE');
                            return `
                                <div class="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
                                    <div class="truncate pr-2">
                                        <div class="flex items-center space-x-2">
                                            <i class="${isVideo ? 'fa-solid fa-file-video text-purple-600' : 'fa-solid fa-file-lines text-blue-600'} text-base"></i>
                                            <h5 class="font-bold text-gray-900 text-xs sm:text-sm truncate">${m.titulo}</h5>
                                        </div>
                                        <p class="text-[11px] text-gray-500 mt-0.5">
                                            Curso: ${curso ? curso.nombre : 'General'} | 
                                            <span class="font-semibold text-gray-700">Tamaño Real: ${m.tamano}</span>
                                        </p>
                                    </div>
                                    <div class="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                                        <button onclick="descargarOVerMaterial(${m.id})" class="px-3 py-1.5 ${isVideo ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded font-bold text-xs flex items-center space-x-1">
                                            <i class="${isVideo ? 'fa-solid fa-play' : 'fa-solid fa-download'}"></i>
                                            <span>${isVideo ? 'Ver / Transmitir' : 'Descargar'}</span>
                                        </button>
                                        ${isDocente ? `
                                            <button onclick="eliminarMaterial(${m.id})" class="p-1.5 text-red-600 hover:bg-red-50 rounded border border-red-200" title="Eliminar">
                                                <i class="fa-solid fa-trash"></i>
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

        html += `</div>`;
        document.getElementById('modal-body').innerHTML = html;
    } else if (key === 'tests') {
        document.getElementById('modal-title').innerText = isDocente ? "GESTIÓN Y RESULTADOS DE EVALUACIONES" : "EVALUACIÓN";
        modalIcon.className = 'fa-solid fa-file-signature text-amber-400 text-2xl';

        let html = `<div class="space-y-5">`;

        if (isDocente) {
            html += `
                <div class="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                    <h4 class="font-bold text-xs sm:text-sm text-gray-800"><i class="fa-solid fa-plus-circle text-chile-purple mr-1"></i> Crear Evaluación por Filas</h4>
                    ${cursosDB.length === 0 ? '<p class="text-xs text-amber-700 font-bold">Crea al menos un curso para asignarle evaluación.</p>' : `
                        <form onsubmit="guardarEvaluacionFilasDocente(event)" class="space-y-4">
                            <div>
                                <label class="block text-xs font-bold text-gray-700 mb-1">Curso Asignado</label>
                                <select id="eval-docente-curso" class="w-full p-2 border rounded-lg text-xs bg-white font-semibold">
                                    ${cursosDB.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('')}
                                </select>
                            </div>

                            <div id="filas-preguntas-container" class="space-y-3"></div>

                            <button type="button" onclick="agregarFilaPregunta()" class="w-full bg-slate-200 hover:bg-slate-300 font-bold py-2.5 rounded-lg text-xs text-gray-800 transition flex items-center justify-center space-x-2 border border-slate-300">
                                <i class="fa-solid fa-plus text-chile-purple"></i>
                                <span>AGREGAR OTRA PREGUNTA (+)</span>
                            </button>

                            <button type="submit" class="w-full bg-chile-purple hover:bg-purple-900 text-white font-bold py-3 rounded-lg text-xs uppercase shadow transition active:scale-98">
                                Publicar Evaluación
                            </button>
                        </form>
                    `}
                </div>

                <div class="bg-purple-50 p-4 rounded-xl border border-purple-200 space-y-3">
                    <h4 class="font-bold text-xs sm:text-sm text-purple-900 flex items-center">
                        <i class="fa-solid fa-table-list mr-2"></i> Evaluaciones Rendidas por Estudiantes (Tiempo Real)
                    </h4>
                    <p class="text-xs text-gray-600">Monitoreo automático en fila indicando aprobación, buenas y malas.</p>

                    ${studentSubmissionsDB.length === 0 ? '<p class="text-xs text-gray-500 italic">Ningún estudiante ha rendido ni enviado evaluaciones todavía.</p>' : `
                        <div class="overflow-x-auto">
                            <table class="w-full text-left text-xs bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                <thead class="bg-chile-purple text-white uppercase text-[11px]">
                                    <tr>
                                        <th class="p-2.5">Estudiante</th>
                                        <th class="p-2.5">Evaluación</th>
                                        <th class="p-2.5 text-center">Buenas</th>
                                        <th class="p-2.5 text-center">Malas</th>
                                        <th class="p-2.5 text-center">Estado</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-200">
                                    ${studentSubmissionsDB.map(sub => `
                                        <tr class="hover:bg-slate-50">
                                            <td class="p-2.5 font-bold text-gray-900">${sub.studentNombre}<br><span class="text-[10px] text-gray-500 font-normal">${sub.studentCorreo}</span></td>
                                            <td class="p-2.5 text-gray-700">${sub.evalTitulo}</td>
                                            <td class="p-2.5 text-center font-bold text-green-700">${sub.buenas}</td>
                                            <td class="p-2.5 text-center font-bold text-red-700">${sub.malas}</td>
                                            <td class="p-2.5 text-center">
                                                <span class="px-2 py-1 rounded text-[10px] font-extrabold ${sub.aprobado ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                                    ${sub.aprobado ? 'APROBADO' : 'REPROBADO'}
                                                </span>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `}
                </div>
            `;
        } else {
            const stProg = studentProgressDB[currentUser.correo] || {};

            html += `
                <div class="space-y-3">
                    <h4 class="font-bold text-sm text-gray-800"><i class="fa-solid fa-file-lines mr-2 text-chile-purple"></i>Evaluaciones Asignadas</h4>
                    ${evaluacionesDB.length === 0 ? '<p class="text-xs text-gray-500">No hay evaluaciones disponibles por el momento.</p>' : `
                        <div class="space-y-3">
                            ${evaluacionesDB.map(ev => {
                                const progCurso = stProg[ev.cursoId] || { docDownloaded: false, vidDownloaded: false };
                                let porcentaje = 0;
                                if (progCurso.docDownloaded) porcentaje += 50;
                                if (progCurso.vidDownloaded) porcentaje += 50;
                                const testDesbloqueado = (porcentaje === 100);
                                const subEnviado = studentSubmissionsDB.find(sub => sub.studentCorreo === currentUser.correo && sub.evaluacionId === ev.id);

                                return `
                                    <div class="p-4 bg-white border rounded-xl shadow-sm space-y-2">
                                        <div class="flex justify-between items-start">
                                            <div>
                                                <h5 class="font-bold text-gray-900 text-sm">${ev.titulo}</h5>
                                                <p class="text-xs text-gray-500 mt-0.5">${ev.preguntas.length} Preguntas en total.</p>
                                            </div>
                                            <span class="px-2 py-0.5 rounded text-[11px] font-bold ${testDesbloqueado ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                                ${testDesbloqueado ? 'Desbloqueado' : `Bloqueado (${porcentaje}% curso)`}
                                            </span>
                                        </div>

                                        <div class="pt-2 flex justify-between items-center border-t">
                                            ${subEnviado ? `
                                                <span class="text-xs font-bold text-green-700"><i class="fa-solid fa-circle-check mr-1"></i> Rendido (${subEnviado.aprobado ? 'Aprobado' : 'Reprobado'} - ${subEnviado.buenas} buenas, ${subEnviado.malas} malas)</span>
                                            ` : (testDesbloqueado ? `
                                                <button onclick="iniciarRendirEvaluacion(${ev.id})" class="bg-chile-blue hover:bg-chile-blue-dark text-white font-bold px-4 py-2 rounded text-xs uppercase shadow transition">
                                                    Rendir Evaluación
                                                </button>
                                            ` : `
                                                <span class="text-xs text-gray-500 italic">Descarga documentos y videos para alcanzar el 100% y desbloquear.</span>
                                            `)}
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
    
    setTimeout(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
    }, 10);

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