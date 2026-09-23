const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Permitir que la página web se comunique con el servidor
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
    );
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }

    next();
});

// Permitir recibir JSON
app.use(express.json());

// Página principal
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "index.html"));
});

// Archivo CSS
app.get("/style.css", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "style.css"));
});

// Archivo JavaScript
app.get("/script.js", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "script.js"));
});

// Ruta de prueba
app.get("/api/test", (req, res) => {
    res.json({
        message: "El servidor de StudyAI funciona correctamente."
    });
});

// Generar material de estudio
app.post("/api/generate", (req, res) => {
    const { subject, topic } = req.body;

    if (!subject || !topic) {
        return res.status(400).json({
            error: "Falta la materia o el tema."
        });
    }

    const material = `
📚 MATERIAL DE ESTUDIO — STUDYAI

Materia: ${subject}
Tema: ${topic}

━━━━━━━━━━━━━━━━━━━━

📖 EXPLICACIÓN

Vamos a estudiar ${topic} de la materia de ${subject}.

Este material fue generado por el servidor de StudyAI como
prueba de funcionamiento.

━━━━━━━━━━━━━━━━━━━━

🧠 CONCEPTOS IMPORTANTES

• Comprender qué es ${topic}.
• Identificar sus conceptos principales.
• Aprender cómo se aplica.
• Practicar con ejercicios.

━━━━━━━━━━━━━━━━━━━━

✏️ EJEMPLO

Supongamos que estás estudiando ${topic}.

Primero debes identificar los datos importantes,
después aplicar el procedimiento correspondiente
y finalmente comprobar el resultado.

━━━━━━━━━━━━━━━━━━━━

📝 EJERCICIOS

1. Explica con tus propias palabras qué es ${topic}.

2. Escribe un ejemplo relacionado con ${topic}.

3. Explica qué pasos seguirías para resolver un problema
relacionado con ${topic}.

━━━━━━━━━━━━━━━━━━━━

✅ RESPUESTAS

Las respuestas definitivas se incorporarán cuando
conectemos StudyAI con un modelo de inteligencia artificial.
`;

    res.json({
        text: material
    });
});

// Iniciar servidor
app.listen(PORT, "0.0.0.0", () => {
    console.log(`StudyAI está funcionando en el puerto ${PORT}`);
});