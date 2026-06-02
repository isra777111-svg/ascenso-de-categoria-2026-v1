// Determinar si estamos en un entorno local (sin servidor o localhost) o en Netlify
const isLocalEnv = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
let GEMINI_API_KEY = "";

// Solo pedimos la clave si estamos probando localmente para facilitar el desarrollo
if (isLocalEnv) {
    GEMINI_API_KEY = localStorage.getItem('ascenso_gemini_key') || "";
    if (!GEMINI_API_KEY) {
        GEMINI_API_KEY = prompt("[MODO LOCAL] Ingresa tu clave de la API de Gemini para probar. En producción se usará de forma segura:");
        if (GEMINI_API_KEY) localStorage.setItem('ascenso_gemini_key', GEMINI_API_KEY);
    }
}

// Chat State
let chatHistory = [];
const SYSTEM_PROMPT = `Eres un tutor de Inteligencia Artificial experto en el examen de Ascenso de Categoría del Ministerio de Educación de Bolivia. Tu objetivo es ayudar a los maestros a prepararse resolviendo dudas. IMPORTANTE: Tus respuestas deben ser directas, claras y enfocadas en responder estrictamente la consulta de manera breve. Prioriza la respuesta solicitada y proporciona información útil. Bajo ninguna circunstancia des explicaciones innecesarias ni digas que un concepto "no es parte de la normativa legal" o que "es un concepto general"; si te preguntan algo, simplemente respóndelo como un experto sin agregar largas justificaciones institucionales.`;

function toggleChatPanel() {
    const panel = document.getElementById('gemini-chat-panel');
    if (panel.style.display === 'none' || panel.style.display === '') {
        panel.style.display = 'flex';
        // Add welcome message if empty
        if (chatHistory.length === 0) {
            addMessageToUI('¡Hola! Soy tu tutor experto en el examen de Ascenso de Categoría. ¿En qué puedo ayudarte hoy?', 'ai');
        }
        document.getElementById('gemini-chat-input').focus();
    } else {
        panel.style.display = 'none';
        if (recognition && isRecording) {
            toggleRecording(); // Stop recording if panel closed
        }
    }
}

function addMessageToUI(text, sender, isHtml = false) {
    const container = document.getElementById('gemini-chat-messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${sender}`;

    if (sender === 'ai') {
        // Parse markdown if marked.js is available
        if (typeof marked !== 'undefined') {
            msgDiv.innerHTML = marked.parse(text);
        } else {
            msgDiv.innerText = text;
        }
    } else {
        msgDiv.innerText = text;
    }

    container.appendChild(msgDiv);
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    return msgDiv;
}

function addLoadingBubble() {
    const container = document.getElementById('gemini-chat-messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ai loading-message`;
    msgDiv.id = 'chat-loading-bubble';
    msgDiv.innerHTML = `
        <div class="loading-dots">
            <div></div><div></div><div></div>
        </div>
    `;
    container.appendChild(msgDiv);
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
}

function removeLoadingBubble() {
    const bubble = document.getElementById('chat-loading-bubble');
    if (bubble) bubble.remove();
}

async function sendChatMessage(presetText = null) {
    const inputEl = document.getElementById('gemini-chat-input');
    const text = presetText || inputEl.value.trim();
    if (!text) return;

    inputEl.value = '';

    // Add user message to UI
    addMessageToUI(text, 'user');

    // Push parts format for Gemini
    chatHistory.push({
        role: "user",
        parts: [{ text: text }]
    });

    addLoadingBubble();

    try {
        // Prepend system prompt to the chat history securely for backward model compatibility
        const requestContents = chatHistory.map((item, index) => {
            if (index === 0 && item.role === 'user') {
                return {
                    role: item.role,
                    parts: [{ text: SYSTEM_PROMPT + "\n\nConsulta del usuario:\n" + item.parts[0].text }]
                };
            }
            return item;
        });

        let response;
        if (isLocalEnv) {
            // MODO LOCAL: Llamamos directo a la API de Google usando la key ingresada
            response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: requestContents })
            });
        } else {
            // MODO PRODUCCIÓN (Netlify): Usamos nuestro backend en Netlify Functions de forma segura
            response = await fetch('/.netlify/functions/gemini-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: requestContents })
            });
        }

        const data = await response.json();
        removeLoadingBubble();

        if (data.candidates && data.candidates[0].content) {
            const aiText = data.candidates[0].content.parts[0].text;
            chatHistory.push({
                role: "model",
                parts: [{ text: aiText }]
            });
            addMessageToUI(aiText, 'ai');
        } else {
            console.error("Gemini API Error or No Candidates:", data);
            await executeFallbackSearch(text);
        }
    } catch (e) {
        console.error("Connection or unexpected error:", e);
        removeLoadingBubble();
        await executeFallbackSearch(text);
    }
}

async function executeFallbackSearch(query) {
    try {
        chatHistory.pop(); // Remove failed user msg from history state to not pollute context

        const searchRes = await fetch(`https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*`);
        const searchData = await searchRes.json();

        if (searchData.query && searchData.query.search && searchData.query.search.length > 0) {
            const title = searchData.query.search[0].title;
            const detailRes = await fetch(`https://es.wikipedia.org/w/api.php?action=query&prop=extracts&exsentences=4&exlimit=1&titles=${encodeURIComponent(title)}&explaintext=1&format=json&origin=*`);
            const detailData = await detailRes.json();
            const pages = detailData.query.pages;
            const extract = Object.values(pages)[0].extract;

            if (extract) {
                const fallbackText = `**[Servicio Alterno Activo]**\n\n${extract}\n\n*(El tutor principal está experimentando alta demanda. Esta es una respuesta obtenida de la base de conocimientos pública).*`;
                addMessageToUI(fallbackText, 'ai');
                return;
            }
        }
    } catch (fallbackError) {
        console.error("Fallback search also failed:", fallbackError);
    }

    // If fallback fails or no results
    addMessageToUI("El servicio se encuentra experimentando un gran volumen de consultas en este momento. Por favor, aguarda un minuto e intenta nuevamente.", 'ai');
}

// -------------------------------------------------------------
// Voice Recognition Logic (Web Speech API)
// -------------------------------------------------------------
let recognition;
let isRecording = false;

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRec();
    recognition.lang = 'es-BO'; // Español Bolivia
    recognition.continuous = false; // Stop when the user stops talking
    recognition.interimResults = false;

    recognition.onresult = function (event) {
        const transcript = event.results[0][0].transcript;
        // Automatically send the transcribed message to Gemini
        sendChatMessage(transcript);
        stopRecordingUI();
    };

    recognition.onerror = function (event) {
        console.error("Speech recognition error:", event.error);
        stopRecordingUI();
    };

    recognition.onend = function () {
        stopRecordingUI();
    };
} else {
    // Hide mic button if Speech API is not supported by the browser
    document.addEventListener('DOMContentLoaded', () => {
        const micBtn = document.getElementById('gemini-chat-mic-btn');
        if (micBtn) micBtn.style.display = 'none';
    });
}

function toggleRecording() {
    if (!recognition) {
        alert("Tu navegador no soporta grabación de voz. Intenta usando Google Chrome.");
        return;
    }

    if (isRecording) {
        recognition.stop();
        stopRecordingUI();
    } else {
        try {
            recognition.start();
            isRecording = true;
            document.getElementById('gemini-chat-mic-btn').classList.add('recording');
            document.getElementById('gemini-chat-input').placeholder = "Escuchando...";
        } catch (e) {
            console.error("No se pudo iniciar la grabación", e);
        }
    }
}

function stopRecordingUI() {
    isRecording = false;
    const btn = document.getElementById('gemini-chat-mic-btn');
    if (btn) btn.classList.remove('recording');
    const input = document.getElementById('gemini-chat-input');
    if (input) input.placeholder = "Escribe o dicta tu pregunta...";
}
