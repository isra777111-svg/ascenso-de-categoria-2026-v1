// State Management
let questionsData = [];
let activeQuestions = [];
let currentMode = 'estudio'; // 'estudio', 'simulacro'
let userAnswers = [];
let currentIndex = 0;
let currentCategory = ''; // 'normativa', 'textos', 'general_all'
let currentThemeId = ''; // specific id or 'general_category' or 'general_all'

let timerInterval = null;
let secondsRemaining = 0;
let secondsSpent = 0;
let timerStartVal = 0;

let examHistory = JSON.parse(localStorage.getItem('ascenso_exam_history')) || [];
let studyCompletedQuestions = new Set(JSON.parse(localStorage.getItem('ascenso_studied_questions')) || []);

// Configuration Data
const DB = {
    normativa: {
        title: 'Normativa Básica',
        items: {
            '1escalafon': { path: 'basica/1escalafon.json', name: 'Escalafón Nacional', fullName: '1.1.1. Reglamento del Escalafón Nacional DS 4688', icon: 'fa-file-contract' },
            '2faltas': { path: 'basica/2faltas.json', name: 'Faltas y Sanciones', fullName: '1.1.2. Reglamento de Faltas y Sanciones', icon: 'fa-gavel' },
            '3prevencion': { path: 'basica/3prevencion.json', name: 'Prevención y Actuación', fullName: '1.1.3. Protocolo de Prevención y Actuación', icon: 'fa-shield-halved' },
            '4violencia': { path: 'basica/4violencia.json', name: 'Violencia Intrafamiliar', fullName: '1.1.4. Guía de Identificación y Denuncia de Violencia Intrafamiliar', icon: 'fa-user-shield' },
            '5discapacidad': { path: 'basica/5discapacidad.json', name: 'Personas con Discapacidad', fullName: '1.1.5. Ley N.º 223 - Personas con Discapacidad', icon: 'fa-wheelchair' },
            '6inclusiva': { path: 'basica/6inclusiva.json', name: 'Educación Inclusiva', fullName: '1.1.6. Reglamento para el Fortalecimiento de la Educación Inclusiva en el SEP', icon: 'fa-people-group' }
        }
    },
    textos: {
        title: 'Textos Pedagógicos',
        items: {
            '1diseno': { path: 'textos/1diseño.json', name: 'Diseño e Innovación del Currículum', fullName: '1.2.1. Diseño, Desarrollo e Innovación del Currículum', icon: 'fa-pen-ruler' },
            '2estilos': { path: 'textos/2estilos.json', name: 'Estilos de Aprendizaje', fullName: '1.2.2. Estilos de Aprendizaje y Métodos', icon: 'fa-brain' },
            '3neurociencia': { path: 'textos/3neurociencia.json', name: 'Neurociencia y Neuroaprendizaje', fullName: '1.2.3. Neurociencia y Neuroaprendizaje', icon: 'fa-head-side-virus' },
            '4innovacion': { path: 'textos/4innovacion.json', name: 'Innovación Educativa UNESCO', fullName: '1.2.4. Innovación Educativa - UNESCO', icon: 'fa-lightbulb' }
        }
    }
};

// DOM Elements
const body = document.body;
const themeToggle = document.getElementById('theme-toggle');

const sections = {
    dashboard: document.getElementById('dashboard-section'),
    submenu: document.getElementById('submenu-section'),
    quiz: document.getElementById('quiz-section'),
    results: document.getElementById('results-section'),
    materials: document.getElementById('materials-section')
};

// Auth & Fullscreen Logic
const allowedPasswords = [
    "sistema78", "docente56", "proyecto45", "servidor89", "archivo67",
    "usuario58", "control9", "registro8", "soporte37", "modulo6",
    "acceso5", "codigo4", "interno3", "externo2", "privado1",
    "sistema34", "docente23", "proyecto12", "servidor45", "archivo56",
    "usuario67", "control8", "registro9", "soporte", "modulo5"
];

function enforceMobileFullscreen() {
    if (window.innerWidth <= 1024) {
        const docElm = document.documentElement;
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            if (docElm.requestFullscreen) {
                docElm.requestFullscreen().catch(e => console.warn(e));
            } else if (docElm.webkitRequestFullscreen) {
                docElm.webkitRequestFullscreen().catch(e => console.warn(e));
            } else if (docElm.msRequestFullscreen) {
                docElm.msRequestFullscreen().catch(e => console.warn(e));
            }
        }
    }
}

function checkLogin() {
    const psw = document.getElementById('login-password-input').value.trim();
    if (allowedPasswords.includes(psw)) {
        sessionStorage.setItem('ascenso_logged_in', 'true');
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('login-error-msg').style.display = 'none';

        // Iniciar en el dashoard con state validado
        if (!history.state || !history.state.section) {
            history.replaceState({ section: 'dashboard' }, '', '#dashboard');
        }

        // Ejecutar fullscreen
        enforceMobileFullscreen();
    } else {
        document.getElementById('login-error-msg').style.display = 'block';
    }
}

function togglePasswordVisibility() {
    const input = document.getElementById('login-password-input');
    const icon = document.getElementById('login-eye-icon');
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fa-solid fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fa-solid fa-eye';
    }
}

function logout() {
    sessionStorage.removeItem('ascenso_logged_in');
    document.getElementById('login-overlay').style.display = 'flex';
    document.getElementById('login-password-input').value = '';
    document.getElementById('login-error-msg').style.display = 'none';
    showDashboard();
}

function closeApp() {
    try {
        // Attempt to close the window securely (works organically in PWAs and Mobile Web View shortcuts)
        window.close();
    } catch (e) {
        console.warn("Navegador previno cierre nativo:", e);
    }

    // Fallback if browser blocks closing: Blank overlay layout to simulate a hard exit and secure data.
    setTimeout(() => {
        document.body.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#0f172a; color:#cbd5e1; font-family:sans-serif; text-align:center; padding:20px;">
                <i class="fa-solid fa-power-off" style="font-size:48px; color:#475569; margin-bottom:20px;"></i>
                <h2 style="margin:0; font-weight:600;">Aplicación Cerrada</h2>
                <p style="margin-top:10px; font-size:14px;">Has abandonado el sistema de forma segura. Ya puedes cerrar esta ventana.</p>
            </div>
        `;
    }, 100);
}

// PWA Installation Logic
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    // Mostramos el botón en todos los dispositivos (móvil y escritorio)
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) installBtn.style.display = 'flex';
});

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    updateDashboardStats();
    setupGlobalEvents();

    // Setup PWA Install Button (iOS fallback + Android/Desktop prompt)
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches || window.navigator.standalone;

        if (isIOS && !isStandalone) {
            installBtn.style.display = 'flex';
            installBtn.onclick = async () => {
                await customAlert("Para instalar en iPhone/iPad: Pulsa el icono de 'Compartir' en la barra inferior de Safari y selecciona 'Añadir a la pantalla de inicio'. Esto instalará el sistema con pantalla completa.", "Instalar en iOS");
            };
        } else {
            installBtn.onclick = async () => {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    if (outcome === 'accepted') {
                        installBtn.style.display = 'none';
                    }
                    deferredPrompt = null;
                } else if (!isIOS) {
                    await customAlert("Si ya aceptaste la instalación o cierras el aviso, puedes instalarlo desde el menú de opciones de tu navegador (3 puntos) seleccionando 'Añadir a la pantalla de inicio o Instalar aplicación'.", "Información");
                }
            };
        }
    }

    if (sessionStorage.getItem('ascenso_logged_in') === 'true') {
        document.getElementById('login-overlay').style.display = 'none';

        // Configurar estado inicial para el history API
        if (!history.state || !history.state.section) {
            history.replaceState({ section: 'dashboard' }, '', '#dashboard');
        } else {
            switchSection(history.state.section, false);
        }

        // Si recarga la página y ya estaba logueado, esperar el primer click/touch para entrar en fullscreen
        const initFullscreen = () => {
            enforceMobileFullscreen();
            document.removeEventListener('touchstart', initFullscreen);
            document.removeEventListener('click', initFullscreen);
        };
        document.addEventListener('touchstart', initFullscreen, { once: true });
        document.addEventListener('click', initFullscreen, { once: true });

    } else {
        document.getElementById('login-overlay').style.display = 'flex';
    }

    // Escuchar el evento PopState (Botón Atrás en móviles o navegador)
    window.addEventListener('popstate', (e) => {
        // En caso de estar en una evaluación, detener el temporizador
        if (sections.quiz && sections.quiz.classList.contains('active')) {
            clearInterval(timerInterval);
        }

        // Cerrar todos los modales abiertos preventivamente
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(modal => modal.classList.remove('active'));

        // Volver a la sección correspondiente del historial
        if (e.state && e.state.section) {
            switchSection(e.state.section, false);
        } else {
            switchSection('dashboard', false);
        }
    });
});

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    body.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = themeToggle.querySelector('i');
    if (theme === 'dark') {
        icon.className = 'fa-solid fa-sun';
        themeToggle.title = 'Cambiar a Tema Claro';
    } else {
        icon.className = 'fa-solid fa-moon';
        themeToggle.title = 'Cambiar a Tema Oscuro';
    }
}

function setupGlobalEvents() {
    themeToggle.addEventListener('click', toggleTheme);
    document.getElementById('history-btn').addEventListener('click', openHistoryModal);

    document.getElementById('quit-quiz-btn').addEventListener('click', confirmQuitQuiz);
    document.getElementById('prev-question-btn').addEventListener('click', navigatePrevious);
    document.getElementById('next-question-btn').addEventListener('click', navigateNext);
}

// ---------------------------------------------------------
// Navigation & Views
// ---------------------------------------------------------
function switchSection(sectionName, pushToHistory = true) {
    Object.values(sections).forEach(sec => sec.classList.remove('active'));
    sections[sectionName].classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Modificación para soportar el Navigation History (Botón Atrás)
    if (pushToHistory) {
        history.pushState({ section: sectionName }, '', `#${sectionName}`);
    }

    // Ocultar Asistente de IA estrictamente durante la evaluación (Cualquier Modo)
    const aiTrigger = document.getElementById('gemini-chat-trigger');
    const aiPanel = document.getElementById('gemini-chat-panel');

    if (sectionName === 'quiz') {
        if (aiTrigger) aiTrigger.style.display = 'none';
        if (aiPanel && aiPanel.style.display !== 'none' && typeof toggleChatPanel === 'function') {
            toggleChatPanel(); // Lo cierra y apaga micrófono si el usuario lo dejó abierto
        }
    } else {
        if (aiTrigger) aiTrigger.style.display = 'flex'; // Restaura el botón flotante en las demás pantallas
    }
}

function showDashboard() {
    updateDashboardStats();
    switchSection('dashboard');
}

function openSubmenu(category) {
    currentCategory = category;
    const catData = DB[category];
    document.getElementById('submenu-title').textContent = catData.title;

    renderThemesGrid(category);
    switchSection('submenu');
}

function renderThemesGrid(category) {
    const container = document.getElementById('themes-list');
    container.innerHTML = '';

    const items = DB[category].items;
    for (const [key, data] of Object.entries(items)) {
        const card = document.createElement('div');
        card.className = 'mode-card study';
        card.style.cursor = 'pointer';
        card.onclick = () => openConfig(key);

        card.innerHTML = `
            <div class="mode-header">
                <span class="mode-badge badge-primary">Tema</span>
                <div class="mode-icon"><i class="fa-solid ${data.icon}"></i></div>
            </div>
            <h3 style="font-size:16px;">${data.name}</h3>
        `;
        container.appendChild(card);
    }
}

// ---------------------------------------------------------
// Configuration Modal
// ---------------------------------------------------------
let configMin = 10;
let configMax = 100;
let isGeneralAll = false;

function openConfig(themeId) {
    currentThemeId = themeId;
    isGeneralAll = themeId === 'general_all';

    const overlay = document.getElementById('config-modal-overlay');
    overlay.classList.add('active');

    // Select default mode depending on general vs topic
    selectConfigMode(isGeneralAll ? 'simulacro' : 'estudio');

    if (isGeneralAll) {
        document.getElementById('btn-config-estudio').style.display = 'none'; // No study mode for General All, wait the user didn't say to remove it, but said Simulacro General has ONLY Simulacro. "Simulacro General (Normativa Básica y Textos Pedagógicos)"
        currentMode = 'simulacro';
        configMin = 50;
        configMax = 100;
        document.getElementById('config-questions-count').value = 50;
    } else {
        document.getElementById('btn-config-estudio').style.display = 'block';
        configMin = 10;
        configMax = 100;
        document.getElementById('config-questions-count').value = currentMode === 'estudio' ? 25 : 50;
    }

    updateConfigLimitsInfo();
}

function closeConfigModal() {
    document.getElementById('config-modal-overlay').classList.remove('active');
}

function selectConfigMode(mode) {
    currentMode = mode;
    const btnEstudio = document.getElementById('btn-config-estudio');
    const btnSimulacro = document.getElementById('btn-config-simulacro');
    const title = document.getElementById('config-mode-desc-title');
    const text = document.getElementById('config-mode-desc-text');
    const countInput = document.getElementById('config-questions-count');

    if (mode === 'estudio') {
        btnEstudio.className = 'btn-primary';
        btnSimulacro.className = 'btn-secondary';
        title.textContent = 'Modo Estudio';
        text.textContent = 'Retroalimentación inmediata sin tiempo límite.';
        if (!isGeneralAll) countInput.value = 25;
    } else {
        btnEstudio.className = 'btn-secondary';
        btnSimulacro.className = 'btn-primary';
        title.textContent = 'Modo Simulacro';
        text.innerHTML = 'Temporizador de <strong>2 minutos por pregunta</strong>. Estadísticas al finalizar.';
        if (!isGeneralAll) countInput.value = 50;
    }
}

function updateConfigLimitsInfo() {
    document.getElementById('config-questions-count').min = configMin;
    document.getElementById('config-questions-count').max = configMax;
    document.getElementById('config-questions-info').textContent = `Mínimo: ${configMin} | Máximo: ${configMax}`;
}

async function startConfiguredQuiz() {
    const input = document.getElementById('config-questions-count');
    let count = parseInt(input.value);

    if (isNaN(count) || count < configMin || count > configMax) {
        await customAlert(`Por favor, ingresa una cantidad entre ${configMin} y ${configMax}.`);
        return;
    }

    closeConfigModal();

    const loadingOverlay = document.getElementById('global-loading-overlay');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';

    // Fetch and combine questions
    try {
        await loadAndPrepareQuestions();

        // Take random slice based on count limit
        if (questionsData.length < count) {
            count = questionsData.length;
        }

        // Shuffle and slice
        activeQuestions = [...questionsData].sort(() => 0.5 - Math.random()).slice(0, count);

        if (loadingOverlay) loadingOverlay.style.display = 'none';

        initSession();
    } catch (err) {
        if (loadingOverlay) loadingOverlay.style.display = 'none';
        console.error(err);
        await customAlert('Error al cargar preguntas. Asegúrate de estar ejecutando la app en un servidor local.', 'Error de Conexión');
    }
}

async function loadAndPrepareQuestions() {
    questionsData = [];
    let pathsToFetch = [];

    if (currentThemeId === 'general_all') {
        // Fetch ALL
        Object.values(DB.normativa.items).forEach(item => pathsToFetch.push({ path: item.path, tema: item.fullName || item.name }));
        Object.values(DB.textos.items).forEach(item => pathsToFetch.push({ path: item.path, tema: item.fullName || item.name }));
    } else if (currentThemeId === 'general_category') {
        // Fetch ALL from current category
        Object.values(DB[currentCategory].items).forEach(item => pathsToFetch.push({ path: item.path, tema: item.fullName || item.name }));
    } else {
        // Fetch SPECIFIC Theme
        const item = DB[currentCategory].items[currentThemeId];
        pathsToFetch.push({ path: item.path, tema: item.fullName || item.name });
    }

    for (const req of pathsToFetch) {
        const response = await fetch(req.path);
        if (!response.ok) throw new Error('File not found: ' + req.path);
        const data = await response.json();

        // Meta tag questions with their theme (important requirement)
        data.forEach(q => {
            q.metaTema = req.tema;
            questionsData.push(q);
        });
    }
}

// ---------------------------------------------------------
// Quiz Session Logic
// ---------------------------------------------------------
function initSession() {
    currentIndex = 0;
    userAnswers = new Array(activeQuestions.length).fill(null);
    secondsSpent = 0;

    clearInterval(timerInterval);
    timerInterval = null;

    const badge = document.getElementById('quiz-mode-badge');
    const title = document.getElementById('quiz-mode-title');
    const timerContainer = document.getElementById('quiz-timer-container');
    const prevBtn = document.getElementById('prev-question-btn');
    const nextBtn = document.getElementById('next-question-btn');

    if (currentMode === 'estudio') {
        badge.className = 'badge badge-primary';
        badge.textContent = 'Modo Libre';
        title.textContent = 'Modo Estudio';
        timerContainer.style.display = 'none';
        prevBtn.style.display = 'none';
        nextBtn.innerHTML = `<span class="nav-text">Siguiente</span> <i class="fa-solid fa-arrow-right"></i>`;
    } else {
        badge.className = 'badge badge-danger';
        badge.textContent = 'Simulacro';
        title.textContent = 'Examen Simulacro';
        timerContainer.style.display = 'flex';
        timerContainer.classList.remove('urgent');
        prevBtn.style.display = 'inline-flex';
        nextBtn.innerHTML = `<span class="nav-text">Siguiente</span> <i class="fa-solid fa-arrow-right"></i>`;

        // 2 minutes per question
        secondsRemaining = activeQuestions.length * 120;
        timerStartVal = secondsRemaining;
        updateTimerDisplay();
        timerInterval = setInterval(handleExamCountdown, 1000);
    }

    // Always track general time spent
    if (currentMode === 'estudio') {
        timerInterval = setInterval(() => { secondsSpent++; }, 1000);
    }

    switchSection('quiz');
    renderQuestion();
}

function renderQuestion() {
    const q = activeQuestions[currentIndex];

    const progressPercent = ((currentIndex) / activeQuestions.length) * 100;
    document.getElementById('quiz-progress-fill').style.width = `${progressPercent}%`;
    document.getElementById('quiz-progress-text').textContent = `Pregunta ${currentIndex + 1} de ${activeQuestions.length}`;

    if (currentMode === 'estudio') {
        const correctCount = userAnswers.filter((ans, idx) => ans !== null && ans === activeQuestions[idx].correcta).length;
        const answeredCount = userAnswers.filter(ans => ans !== null).length;
        document.getElementById('quiz-score-text').textContent = `Progreso: ${answeredCount}/${activeQuestions.length} | Aciertos: ${correctCount}`;
    } else {
        document.getElementById('quiz-score-text').textContent = `Completado: ${Math.round(progressPercent)}%`;
    }

    document.getElementById('question-meta-info').innerHTML = `Tema: ${q.metaTema} <small style="display:block; font-weight:normal; color:var(--text-main); margin-top:5px;">(ID: #${q.id || 'N/A'})</small>`;
    document.getElementById('question-text-content').textContent = q.pregunta;

    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';
    document.getElementById('feedback-panel-container').style.display = 'none';

    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

    q.opciones.forEach((op, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-button';
        btn.innerHTML = `
            <span class="option-letter">${letters[index]}</span>
            <span class="option-text">${escapeHTML(op)}</span>
        `;

        const selectedAnswer = userAnswers[currentIndex];

        if (currentMode === 'estudio') {
            if (selectedAnswer !== null) {
                btn.classList.add('disabled');
                if (index === q.correcta) btn.classList.add('correct');
                else if (index === selectedAnswer) btn.classList.add('incorrect');
            } else {
                btn.onclick = () => selectOptionStudy(index);
            }
        } else {
            if (selectedAnswer === index) btn.classList.add('selected');
            btn.onclick = () => selectOptionExam(index);
        }

        optionsContainer.appendChild(btn);
    });

    const nextBtn = document.getElementById('next-question-btn');
    if (currentMode === 'estudio') {
        if (userAnswers[currentIndex] === null) {
            nextBtn.disabled = true;
            nextBtn.style.opacity = '0.5';
        } else {
            nextBtn.disabled = false;
            nextBtn.style.opacity = '1';
            showStudyFeedback(q, userAnswers[currentIndex]);
        }
    } else {
        nextBtn.disabled = false;
        nextBtn.style.opacity = '1';
    }

    const prevBtn = document.getElementById('prev-question-btn');
    if (currentMode !== 'estudio') {
        prevBtn.disabled = currentIndex === 0;
        prevBtn.style.opacity = currentIndex === 0 ? '0.5' : '1';
    }

    if (currentIndex === activeQuestions.length - 1 && currentMode !== 'estudio') {
        nextBtn.innerHTML = `<span class="nav-text">Finalizar</span> <i class="fa-solid fa-square-check"></i>`;
    } else {
        nextBtn.innerHTML = `<span class="nav-text">Siguiente</span> <i class="fa-solid fa-arrow-right"></i>`;
    }
}

function selectOptionStudy(index) {
    const q = activeQuestions[currentIndex];
    userAnswers[currentIndex] = index;

    const buttons = document.querySelectorAll('.option-button');
    buttons.forEach((btn, idx) => {
        btn.classList.add('disabled');
        if (idx === q.correcta) btn.classList.add('correct');
        else if (idx === index) btn.classList.add('incorrect');
    });

    if (index === q.correcta && q.id) {
        studyCompletedQuestions.add(q.id);
        localStorage.setItem('ascenso_studied_questions', JSON.stringify(Array.from(studyCompletedQuestions)));
    }

    const nextBtn = document.getElementById('next-question-btn');
    nextBtn.disabled = false;
    nextBtn.style.opacity = '1';

    showStudyFeedback(q, index);
}

function selectOptionExam(index) {
    userAnswers[currentIndex] = index;
    const buttons = document.querySelectorAll('.option-button');
    buttons.forEach((btn, idx) => {
        if (idx === index) btn.classList.add('selected');
        else btn.classList.remove('selected');
    });
}

function showStudyFeedback(question, selectedIndex) {
    const isCorrect = selectedIndex === question.correcta;
    const panel = document.getElementById('feedback-panel-container');
    const header = document.getElementById('feedback-header-title');
    const explanation = document.getElementById('feedback-explanation-content');

    panel.style.display = 'block';

    if (isCorrect) {
        panel.className = 'feedback-panel correct-feedback';
        header.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>¡Respuesta Correcta!</span>`;
    } else {
        panel.className = 'feedback-panel incorrect-feedback';
        header.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> <span>Respuesta Incorrecta</span>`;
    }

    explanation.innerHTML = `
        <p><strong>Justificación:</strong></p>
        <p>${escapeHTML(question.explicacion || 'No hay explicación disponible.')}</p>
    `;
}

async function navigateNext() {
    if (currentMode === 'estudio') {
        if (currentIndex < activeQuestions.length - 1) {
            currentIndex++;
            renderQuestion();
        } else {
            await customAlert('¡Has terminado todas las preguntas en este modo de estudio! Tu progreso ha sido guardado.', 'Modo Estudio Completado');
            showDashboard();
        }
    } else {
        if (currentIndex < activeQuestions.length - 1) {
            currentIndex++;
            renderQuestion();
        } else {
            await confirmFinishExam();
        }
    }
}

function navigatePrevious() {
    if (currentIndex > 0) {
        currentIndex--;
        renderQuestion();
    }
}

async function confirmQuitQuiz() {
    const msg = currentMode === 'estudio'
        ? '¿Estás seguro de que deseas salir del Modo Estudio? Tu progreso se guardará.'
        : '¿Estás seguro de que deseas abandonar la evaluación? Perderás tus respuestas actuales.';
    const proceed = await customConfirm(msg, 'Salir del cuestionario');
    if (proceed) {
        clearInterval(timerInterval);
        showDashboard();
    }
}

async function confirmFinishExam() {
    const unansweredCount = userAnswers.filter(ans => ans === null).length;
    let msg = '¿Deseas finalizar la evaluación y ver tus resultados?';
    if (unansweredCount > 0) {
        msg = `Tienes ${unansweredCount} pregunta(s) sin responder. ¿Estás seguro de que deseas finalizar la evaluación?`;
    }

    const proceed = await customConfirm(msg, 'Finalizar evaluación');
    if (proceed) {
        finishQuiz();
    }
}

// ---------------------------------------------------------
// Countdown Timer
// ---------------------------------------------------------
async function handleExamCountdown() {
    secondsRemaining--;
    updateTimerDisplay();

    const container = document.getElementById('quiz-timer-container');
    if (secondsRemaining <= 300) {
        container.classList.add('urgent');
    }

    if (secondsRemaining <= 0) {
        clearInterval(timerInterval);
        await customAlert('¡El tiempo ha terminado! Tu evaluación será enviada automáticamente.', 'Tiempo Agotado');
        finishQuiz();
    }
}

function updateTimerDisplay() {
    const mins = Math.floor(secondsRemaining / 60);
    const secs = secondsRemaining % 60;
    document.getElementById('quiz-timer-val').textContent = `${padZero(mins)}:${padZero(secs)}`;
}

// ---------------------------------------------------------
// Finish Quiz and Display Results
// ---------------------------------------------------------
function finishQuiz() {
    clearInterval(timerInterval);

    let correct = 0; let incorrect = 0; let unanswered = 0;
    activeQuestions.forEach((q, idx) => {
        const ans = userAnswers[idx];
        if (ans === null) unanswered++;
        else if (ans === q.correcta) correct++;
        else incorrect++;
    });

    const scorePct = (correct / activeQuestions.length) * 100;

    let totalSecondsSpent = currentMode === 'simulacro' ? timerStartVal - secondsRemaining : secondsSpent;
    const minsSpent = Math.floor(totalSecondsSpent / 60);
    const secsSpent = totalSecondsSpent % 60;
    const durationString = `${padZero(minsSpent)}:${padZero(secsSpent)}`;

    if (currentMode === 'simulacro') {
        const newRecord = {
            id: Date.now(),
            mode: 'Simulacro',
            theme: isGeneralAll ? 'Simulacro General' : (currentThemeId === 'general_category' ? 'General: ' + DB[currentCategory].title : DB[currentCategory].items[currentThemeId].name),
            score: `${correct}/${activeQuestions.length}`,
            percentage: scorePct,
            timeSpent: durationString,
            date: new Date().toLocaleString('es-ES')
        };
        examHistory.unshift(newRecord);
        localStorage.setItem('ascenso_exam_history', JSON.stringify(examHistory));
    }

    renderResultsView(correct, incorrect, unanswered, scorePct, durationString);
}

function renderResultsView(correct, incorrect, unanswered, scorePct, durationString) {
    let modeText = `Resultados - ${currentMode === 'simulacro' ? 'Modo Simulacro' : 'Modo Estudio'}`;
    document.getElementById('results-mode-info').textContent = modeText;
    document.getElementById('results-score-fraction').textContent = `${correct}/${activeQuestions.length}`;
    document.getElementById('results-score-percent').textContent = `${Math.round(scorePct)}%`;

    const msgCard = document.getElementById('results-message-card');
    if (scorePct >= 51) {
        msgCard.className = 'result-msg-card success-msg';
        msgCard.innerHTML = `<i class="fa-solid fa-circle-check"></i> ¡Excelente! Has aprobado con un buen puntaje.`;
        msgCard.style.color = 'var(--success)';
        msgCard.style.backgroundColor = 'var(--success-light)';
    } else {
        msgCard.className = 'result-msg-card fail-msg';
        msgCard.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Necesitas practicar más. Mínimo 51% requerido.`;
        msgCard.style.color = 'var(--danger)';
        msgCard.style.backgroundColor = 'var(--danger-light)';
    }

    document.getElementById('results-stat-correct').textContent = correct;
    document.getElementById('results-stat-incorrect').textContent = incorrect;
    document.getElementById('results-stat-unanswered').textContent = unanswered;
    document.getElementById('results-stat-time').textContent = durationString;

    renderReviewList();
    switchSection('results');
}

function renderReviewList() {
    const container = document.getElementById('review-questions-container');
    container.innerHTML = '';
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

    activeQuestions.forEach((q, idx) => {
        const ans = userAnswers[idx];
        const isCorrect = ans === q.correcta;

        const reviewItem = document.createElement('div');
        reviewItem.className = 'review-item';
        reviewItem.style.background = 'var(--bg-card)';
        reviewItem.style.border = '1px solid var(--border-color)';
        reviewItem.style.padding = '15px';
        reviewItem.style.borderRadius = '8px';

        let statusIcon = '';
        if (ans === null) statusIcon = `<i class="fa-solid fa-circle-question" style="color:var(--text-muted)"></i>`;
        else if (isCorrect) statusIcon = `<i class="fa-solid fa-circle-check" style="color:var(--success)"></i>`;
        else statusIcon = `<i class="fa-solid fa-circle-xmark" style="color:var(--danger)"></i>`;

        let optionsHtml = '';
        q.opciones.forEach((op, opIdx) => {
            let style = 'padding:8px; border-radius:4px; margin-bottom:5px; background:var(--bg-main); font-size:14px;';
            if (opIdx === q.correcta) style += ' border-left:3px solid var(--success);';
            else if (opIdx === ans) style += ' border-left:3px solid var(--danger);';

            optionsHtml += `<div style="${style}"><strong>${letters[opIdx]}.</strong> ${escapeHTML(op)}</div>`;
        });

        reviewItem.innerHTML = `
            <div style="cursor:pointer; display:flex; justify-content:space-between; font-weight:bold; font-size:15px;" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'">
                <div>${statusIcon} <span style="color:var(--primary); font-size:12px; margin:0 5px;">[${q.metaTema}]</span> ${idx + 1}. ${escapeHTML(q.pregunta)}</div>
                <i class="fa-solid fa-chevron-down"></i>
            </div>
            <div style="display:none; margin-top:15px; border-top:1px dashed var(--border-color); padding-top:15px;">
                ${optionsHtml}
                <div style="margin-top:15px; padding:10px; background:var(--primary-light); border-radius:6px; font-size:14px;">
                    <strong>Justificación Jurídica / Técnica:</strong>
                    <p style="margin-top:5px;">${escapeHTML(q.explicacion || 'No hay justificación provista para esta pregunta.')}</p>
                </div>
            </div>
        `;

        container.appendChild(reviewItem);
    });
}

// ---------------------------------------------------------
// Dashboard Stats
// ---------------------------------------------------------
function updateDashboardStats() {
    document.getElementById('stats-completed').textContent = examHistory.length;

    if (examHistory.length > 0) {
        const totalPct = examHistory.reduce((acc, curr) => acc + curr.percentage, 0);
        document.getElementById('stats-accuracy').textContent = Math.round(totalPct / examHistory.length) + '%';
        const maxPct = Math.max(...examHistory.map(h => h.percentage));
        document.getElementById('stats-best-score').textContent = Math.round(maxPct) + '%';
    } else {
        document.getElementById('stats-accuracy').textContent = '0%';
        document.getElementById('stats-best-score').textContent = '0%';
    }

    document.getElementById('stats-study-progress').textContent = studyCompletedQuestions.size;
}

// ---------------------------------------------------------
// History Modal Methods
// ---------------------------------------------------------
function openHistoryModal() {
    const container = document.getElementById('history-list-container');
    const emptyMsg = document.getElementById('history-empty-message');
    container.innerHTML = '';

    if (examHistory.length === 0) {
        emptyMsg.style.display = 'block';
    } else {
        emptyMsg.style.display = 'none';
        examHistory.forEach(item => {
            const el = document.createElement('div');
            el.className = 'history-item';
            el.innerHTML = `
                <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid var(--border-color);">
                    <div>
                        <strong style="color:var(--primary)">${item.theme}</strong><br>
                        <small style="color:var(--text-muted)">${item.date} | Tiempo: ${item.timeSpent}</small>
                    </div>
                    <div style="text-align:right;">
                        <strong>${Math.round(item.percentage)}%</strong><br>
                        <small style="color:var(--text-muted)">${item.score}</small>
                    </div>
                </div>
            `;
            container.appendChild(el);
        });
    }
    document.getElementById('history-modal-overlay').classList.add('active');
}

function closeHistoryModal() {
    document.getElementById('history-modal-overlay').classList.remove('active');
}

async function clearHistory() {
    const proceed = await customConfirm('¿Estás seguro de que deseas eliminar todo tu historial de exámenes? Esta acción no se puede deshacer.', 'Borrar Historial');
    if (proceed) {
        examHistory = [];
        localStorage.removeItem('ascenso_exam_history');
        openHistoryModal();
        updateDashboardStats();
    }
}

// ---------------------------------------------------------
// Utilities
// ---------------------------------------------------------
function padZero(num) {
    return num.toString().padStart(2, '0');
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// ---------------------------------------------------------
// Custom Dialog Modals (Alert & Confirm)
// ---------------------------------------------------------
function customAlert(message, title = 'Atención') {
    return new Promise(resolve => {
        const overlay = document.getElementById('custom-dialog-overlay');
        document.getElementById('custom-dialog-title').innerHTML = title;
        document.getElementById('custom-dialog-message').innerHTML = message;
        document.getElementById('custom-dialog-cancel').style.display = 'none';

        const confirmBtn = document.getElementById('custom-dialog-confirm');
        const closeBtn = document.getElementById('custom-dialog-close');

        const closeDialog = () => {
            overlay.classList.remove('active');
            confirmBtn.removeEventListener('click', closeDialog);
            closeBtn.removeEventListener('click', closeDialog);
            resolve();
        };

        confirmBtn.addEventListener('click', closeDialog);
        closeBtn.addEventListener('click', closeDialog);

        overlay.classList.add('active');
    });
}

function customConfirm(message, title = 'Confirmar Acción') {
    return new Promise(resolve => {
        const overlay = document.getElementById('custom-dialog-overlay');
        document.getElementById('custom-dialog-title').innerHTML = title;
        document.getElementById('custom-dialog-message').innerHTML = message;
        document.getElementById('custom-dialog-cancel').style.display = 'inline-flex';

        const confirmBtn = document.getElementById('custom-dialog-confirm');
        const cancelBtn = document.getElementById('custom-dialog-cancel');
        const closeBtn = document.getElementById('custom-dialog-close');

        const cleanup = () => {
            overlay.classList.remove('active');
            confirmBtn.removeEventListener('click', onConfirm);
            cancelBtn.removeEventListener('click', onCancel);
            closeBtn.removeEventListener('click', onCancel);
        };

        const onConfirm = () => { cleanup(); resolve(true); };
        const onCancel = () => { cleanup(); resolve(false); };

        confirmBtn.addEventListener('click', onConfirm);
        cancelBtn.addEventListener('click', onCancel);
        closeBtn.addEventListener('click', onCancel);

        overlay.classList.add('active');
    });
}

// ---------------------------------------------------------
// Material de Estudio Logic
// ---------------------------------------------------------
let currentMaterialTab = 'audios';
let currentAudio = null;

function openMaterials() {
    switchSection('materials');
    switchMaterialTab('audios'); // default show audios
}

function switchMaterialTab(tab) {
    currentMaterialTab = tab;
    // Update active tab buttons
    if (tab === 'audios') {
        document.getElementById('btn-tab-audios').className = 'btn-primary';
        document.getElementById('btn-tab-guias').className = 'btn-secondary';
    } else {
        document.getElementById('btn-tab-audios').className = 'btn-secondary';
        document.getElementById('btn-tab-guias').className = 'btn-primary';
    }
    document.getElementById('materials-search-input').value = '';
    document.getElementById('materials-category-filter').value = 'all';

    renderMaterialsList();
}

function renderMaterialsList() {
    const container = document.getElementById('materials-list-container');
    container.innerHTML = '';

    const searchVal = document.getElementById('materials-search-input').value.toLowerCase();
    const filterCat = document.getElementById('materials-category-filter').value;

    // Build list from DB
    let materialsList = [];
    ['normativa', 'textos'].forEach(cat => {
        if (filterCat !== 'all' && filterCat !== cat) return;

        const items = DB[cat].items;
        for (const [key, data] of Object.entries(items)) {
            if (data.name.toLowerCase().includes(searchVal)) {
                materialsList.push({
                    catName: DB[cat].title,
                    catEnum: cat,
                    ...data
                });
            }
        }
    });

    if (materialsList.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">No se encontraron materiales.</div>';
        return;
    }

    materialsList.forEach(item => {
        const card = document.createElement('div');
        card.style.cssText = "display:flex; justify-content:space-between; align-items:center; background:var(--bg-main); padding:15px; border-radius:8px; border:1px solid var(--border-color); flex-wrap:wrap; gap:10px;";

        let actionsHtml = '';
        if (currentMaterialTab === 'audios') {
            const filePath = item.path.replace('.json', '.mp3');
            actionsHtml = `
                <button class="btn-primary" onclick="playAudioMaterial('${filePath}', '${item.name}')" style="font-size:14px; padding:8px 15px;">
                    <i class="fa-solid fa-play"></i> Escuchar
                </button>
            `;
        } else {
            const filePath = item.path.replace('.json', '.pdf');
            actionsHtml = `
                <button class="btn-primary" onclick="openPdfViewer('${filePath}', '${item.name}')" style="font-size:14px; padding:8px 15px;">
                    <i class="fa-solid fa-eye"></i> Ver Guía
                </button>
                <a href="${filePath}" download class="btn-secondary" style="font-size:14px; padding:8px 15px; text-decoration:none;">
                    <i class="fa-solid fa-download"></i> Descargar
                </a>
            `;
        }

        const iconType = currentMaterialTab === 'audios' ? 'fa-music' : 'fa-file-pdf';
        const badgeColor = item.catEnum === 'normativa' ? 'badge-primary' : 'badge-success';

        card.innerHTML = `
            <div style="display:flex; gap:15px; align-items:center; flex:1; min-width:250px;">
                <div style="width:40px; height:40px; border-radius:8px; background:var(--primary-light); color:var(--primary); display:flex; justify-content:center; align-items:center; font-size:20px; flex-shrink:0;">
                    <i class="fa-solid ${iconType}"></i>
                </div>
                <div>
                    <h4 style="margin:0 0 5px 0; font-size:16px;">${item.name}</h4>
                    <span class="badge ${badgeColor}" style="font-size:11px;">${item.catName}</span>
                </div>
            </div>
            <div style="display:flex; gap:10px;">
                ${actionsHtml}
            </div>
        `;
        container.appendChild(card);
    });
}

// PDF Viewer
function openPdfViewer(filePath, title) {
    document.getElementById('pdf-modal-title').innerHTML = `<i class="fa-solid fa-file-pdf"></i> ${title}`;

    // Use an iframe to display the PDF natively.
    // #zoom=100 (Forza escala al 100% exacto) &navpanes=0 (Oculta panel lateral/miniaturas)
    const container = document.getElementById('pdf-content-container');
    const optimizedPdfUrl = filePath + '#zoom=100&navpanes=0';
    container.innerHTML = `<iframe src="${optimizedPdfUrl}" style="width: 100%; height: 100%; border: none;"></iframe>`;

    document.getElementById('pdf-modal-overlay').classList.add('active');
}

function closePdfModal() {
    document.getElementById('pdf-modal-overlay').classList.remove('active');
    document.getElementById('pdf-content-container').innerHTML = '';
}

// Audio Player
function playAudioMaterial(filePath, title) {
    if (currentAudio) {
        currentAudio.pause();
    }

    currentAudio = new Audio(filePath);
    document.getElementById('audio-player-title').textContent = title;

    // Reset controls
    document.getElementById('audio-play-btn').innerHTML = '<i class="fa-solid fa-pause"></i>';
    document.getElementById('audio-progress').value = 0;
    document.getElementById('audio-current-time').textContent = '00:00';
    document.getElementById('audio-total-time').textContent = '00:00';
    document.getElementById('custom-audio-player').style.display = 'block';
    document.body.classList.add('audio-player-active');

    // Set Speed & Volume based on current selects
    currentAudio.playbackRate = parseFloat(document.getElementById('audio-speed-select').value);
    currentAudio.volume = document.getElementById('audio-volume').value;

    currentAudio.addEventListener('loadedmetadata', () => {
        document.getElementById('audio-progress').max = currentAudio.duration;
        document.getElementById('audio-total-time').textContent = formatAudioTime(currentAudio.duration);
    });

    currentAudio.addEventListener('timeupdate', () => {
        document.getElementById('audio-progress').value = currentAudio.currentTime;
        document.getElementById('audio-current-time').textContent = formatAudioTime(currentAudio.currentTime);
    });

    currentAudio.addEventListener('ended', () => {
        document.getElementById('audio-play-btn').innerHTML = '<i class="fa-solid fa-play"></i>';
    });

    currentAudio.play().catch(e => {
        console.error("Audio playback error:", e);
        customAlert("No se pudo cargar el archivo <strong>" + filePath + "</strong>.<br>Verifica que el archivo .mp3 exista.", "Error de Reproducción");
        closeAudioPlayer();
    });
}

function toggleAudioPlay() {
    if (!currentAudio) return;

    const btn = document.getElementById('audio-play-btn');
    if (currentAudio.paused) {
        currentAudio.play();
        btn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    } else {
        currentAudio.pause();
        btn.innerHTML = '<i class="fa-solid fa-play"></i>';
    }
}

function stopAudio() {
    if (!currentAudio) return;
    currentAudio.pause();
    currentAudio.currentTime = 0;
    document.getElementById('audio-play-btn').innerHTML = '<i class="fa-solid fa-play"></i>';
}

function skipAudio(seconds) {
    if (!currentAudio) return;
    let newTime = currentAudio.currentTime + seconds;
    if (newTime < 0) newTime = 0;
    if (newTime > currentAudio.duration) newTime = currentAudio.duration;
    currentAudio.currentTime = newTime;
}

function changeAudioSpeed(speed) {
    if (!currentAudio) return;
    currentAudio.playbackRate = parseFloat(speed);
}

function closeAudioPlayer() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    document.getElementById('custom-audio-player').style.display = 'none';
    document.body.classList.remove('audio-player-active');
}

// UI listeners for audio progress and volume
document.addEventListener('DOMContentLoaded', () => {
    // Other events...
    if (document.getElementById('audio-progress')) {
        document.getElementById('audio-progress').addEventListener('input', (e) => {
            if (currentAudio) {
                currentAudio.currentTime = e.target.value;
            }
        });
    }

    if (document.getElementById('audio-volume')) {
        document.getElementById('audio-volume').addEventListener('input', (e) => {
            if (currentAudio) {
                currentAudio.volume = e.target.value;
            }
        });
    }
});

function formatAudioTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return padZero(m) + ":" + padZero(s);
}

// ---------------------------------------------------------
// Security & Anti-DevTools Measures
// ---------------------------------------------------------
(function initSecurity() {
    // 1. Deshabilitar Click Derecho (Menú Contextual)
    document.addEventListener('contextmenu', e => e.preventDefault());

    // 2. Deshabilitar atajos de teclado de herramientas de desarrollo y copiado
    document.addEventListener('keydown', e => {
        // Bloquear F12
        if (e.key === 'F12') {
            e.preventDefault();
            return false;
        }
        // Bloquear Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) {
            e.preventDefault();
            return false;
        }
        // Bloquear Ctrl+U (Ver código), Ctrl+S (Guardar), Ctrl+P (Imprimir)
        if ((e.ctrlKey || e.metaKey) && ['U', 'S', 'P'].includes(e.key.toUpperCase())) {
            e.preventDefault();
            return false;
        }
    });

    // 3. Deshabilitar arrastrar y soltar elementos (como imágenes o enlaces)
    document.addEventListener('dragstart', e => e.preventDefault());

    // 4. Bucle Anti-Debugger Activo y Borrado de Consola
    setInterval(() => {
        const start = performance.now();

        // Dispara el debugger automáticamente si las DevTools están abiertas
        (function () { return false; }["constructor"]("debugger")());

        console.clear();
        console.log("%c🛡️ ¡ACCESO DENEGADO! 🛡️", "color: #dc2626; font-size: 28px; font-weight: 800;");
        console.log("%cModificar o abstraer recursos, archivos internos, o inspeccionar el código fuente de esta aplicación está estrictamente prohibido por políticas de seguridad.", "color: #ef4444; font-size: 14px;");

        // Si el debugger se pausó, el tiempo de ejecución de la iteración será artificialmente alto
        if (performance.now() - start > 100) {
            // Acción defensiva: Redirigir, limpiar vista o destruir sesión si se detecta inspección
            document.body.innerHTML = '<div style="display:flex;height:100vh;flex-direction:column;align-items:center;justify-content:center;background:#0f172a;color:#ef4444;font-family:sans-serif;text-align:center;"><h2>ALERTA DE SEGURIDAD</h2><p>Intento de manipulación de sistema detectado. Sistema bloqueado.</p></div>';
            sessionStorage.clear();
        }
    }, 1500);
})();
