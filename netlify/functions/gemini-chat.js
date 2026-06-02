exports.handler = async function (event, context) {
    // Manejo de CORS para la pre-solicitud (preflight)
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            body: "OK",
        };
    }

    // Comprobar que sea petición POST
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    // Leer la API Key que configuramos en Netlify
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Falta configurar la Variable de Entorno GEMINI_API_KEY en Netlify" }),
        };
    }

    try {
        const body = JSON.parse(event.body);

        // Hacemos la petición real a Google directamente desde los servidores de Netlify
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ contents: body.contents }),
            }
        );

        const data = await response.json();

        return {
            statusCode: response.status,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
