import {
    pipeline,
    env
} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0";


env.allowLocalModels = false;


// ============================================
// ELEMENTOS
// ============================================

const views =
    document.querySelectorAll(".view");


const navLinks =
    document.querySelectorAll(".nav-link");


const viewButtons =
    document.querySelectorAll("[data-view]");


const subjectCards =
    document.querySelectorAll("[data-subject]");


const subjectSelect =
    document.querySelector("#subject-select");


const topicInput =
    document.querySelector("#topic-input");


const generateButton =
    document.querySelector("#generate-button");


const resultTitle =
    document.querySelector("#result-title");


const resultMeta =
    document.querySelector("#result-meta");


const resultContent =
    document.querySelector("#result-content");


const materialsList =
    document.querySelector("#materials-list");


let generator = null;


// ============================================
// CAMBIAR DE SECCIÓN
// ============================================

function showView(viewId) {

    views.forEach(view => {

        view.classList.remove("active");

    });


    const target =
        document.getElementById(viewId);


    if (!target) {
        return;
    }


    target.classList.add("active");


    navLinks.forEach(link => {

        link.classList.remove("active");


        if (
            link.dataset.view === viewId
        ) {

            link.classList.add("active");

        }

    });


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


// Todos los botones que cambian de sección
viewButtons.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            showView(
                button.dataset.view
            );

        }
    );

});


// ============================================
// SELECCIONAR MATERIA
// ============================================

subjectCards.forEach(card => {

    card.addEventListener(
        "click",
        () => {

            const subject =
                card.dataset.subject;


            subjectSelect.value =
                subject;


            showView("study");


            topicInput.focus();

        }
    );

});


// ============================================
// LIMPIAR RESPUESTA DE LA IA
// ============================================

function cleanAIResponse(text) {

    // Eliminar <think>...</think>
    text = text.replace(
        /<think>[\s\S]*?<\/think>/gi,
        ""
    );


    // Eliminar etiquetas think sueltas
    text = text.replace(
        /<\/?think>/gi,
        ""
    );


    // Eliminar bloques de razonamiento comunes
    text = text.replace(
        /^Here is.*$/gim,
        ""
    );


    return text.trim();

}


// ============================================
// ESCAPAR HTML
// ============================================

function escapeHTML(text) {

    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// ============================================
// FORMATEAR LA RESPUESTA
// ============================================

function inlineMarkdown(text) {

    text = escapeHTML(text);


    // Código inline
    text = text.replace(
        /`([^`]+)`/g,
        "<code>$1</code>"
    );


    // Negrita
    text = text.replace(
        /\*\*(.+?)\*\*/g,
        "<strong>$1</strong>"
    );


    // Cursiva
    text = text.replace(
        /\*(.+?)\*/g,
        "<em>$1</em>"
    );


    return text;

}


function formatAIResponse(text) {

    text =
        cleanAIResponse(text);


    const lines =
        text.split(/\r?\n/);


    let html = "";

    let inUnorderedList = false;

    let inOrderedList = false;

    let inCodeBlock = false;

    let codeBuffer = [];


    function closeLists() {

        if (inUnorderedList) {

            html += "</ul>";

            inUnorderedList = false;

        }


        if (inOrderedList) {

            html += "</ol>";

            inOrderedList = false;

        }

    }


    function closeCode() {

        if (inCodeBlock) {

            html +=
                "<pre><code>" +
                escapeHTML(
                    codeBuffer.join("\n")
                ) +
                "</code></pre>";

            codeBuffer = [];

            inCodeBlock = false;

        }

    }


    for (
        let i = 0;
        i < lines.length;
        i++
    ) {

        const rawLine =
            lines[i];


        const line =
            rawLine.trim();


        // Bloque de código
        if (
            line.startsWith("```")
        ) {

            closeLists();


            if (inCodeBlock) {

                closeCode();

            } else {

                inCodeBlock = true;

            }


            continue;

        }


        if (inCodeBlock) {

            codeBuffer.push(
                rawLine
            );

            continue;

        }


        // Línea vacía
        if (line === "") {

            closeLists();

            continue;

        }


        // Títulos ###
        if (
            line.startsWith("### ")
        ) {

            closeLists();


            html +=
                `<h3>${inlineMarkdown(
                    line.substring(4)
                )}</h3>`;

            continue;

        }


        // Títulos ##
        if (
            line.startsWith("## ")
        ) {

            closeLists();


            html +=
                `<h2>${inlineMarkdown(
                    line.substring(3)
                )}</h2>`;

            continue;

        }


        // Título #
        if (
            line.startsWith("# ")
        ) {

            closeLists();


            html +=
                `<h2>${inlineMarkdown(
                    line.substring(2)
                )}</h2>`;

            continue;

        }


        // Separador
        if (
            /^[-*_]{3,}$/.test(line)
        ) {

            closeLists();

            html += "<hr>";

            continue;

        }


        // Lista con guion
        if (
            /^[-*]\s+/.test(line)
        ) {

            if (inOrderedList) {

                html += "</ol>";

                inOrderedList = false;

            }


            if (!inUnorderedList) {

                html += "<ul>";

                inUnorderedList = true;

            }


            html +=
                `<li>${inlineMarkdown(
                    line.replace(
                        /^[-*]\s+/,
                        ""
                    )
                )}</li>`;


            continue;

        }


        // Lista numerada
        if (
            /^\d+\.\s+/.test(line)
        ) {

            if (inUnorderedList) {

                html += "</ul>";

                inUnorderedList = false;

            }


            if (!inOrderedList) {

                html += "<ol>";

                inOrderedList = true;

            }


            html +=
                `<li>${inlineMarkdown(
                    line.replace(
                        /^\d+\.\s+/,
                        ""
                    )
                )}</li>`;


            continue;

        }


        // Texto normal
        closeLists();


        html +=
            `<p>${inlineMarkdown(
                line
            )}</p>`;

    }


    closeLists();

    closeCode();


    return html;

}


// ============================================
// CARGAR IA
// ============================================

async function loadAI() {

    if (generator) {

        return generator;

    }


    resultContent.innerHTML = `

        <div class="loading-box">

            <div class="loader"></div>

            <h3>
                Preparando StudyAI...
            </h3>

            <p>
                La primera vez se debe descargar
                el modelo de inteligencia artificial.
            </p>

        </div>

    `;


    try {

        let useWebGPU = false;


        if (
            navigator.gpu
        ) {

            const adapter =
                await navigator.gpu
                    .requestAdapter();


            if (adapter) {

                useWebGPU = true;

            }

        }


        generator = await pipeline(

            "text-generation",

            "onnx-community/Qwen3-0.6B-ONNX",

            {

                device:
                    useWebGPU
                        ? "webgpu"
                        : "wasm",

                dtype:
                    useWebGPU
                        ? "q4f16"
                        : "q4",


                progress_callback:
                    info => {

                        if (
                            info.status ===
                            "progress"
                            &&
                            typeof info.progress ===
                            "number"
                        ) {

                            const progress =
                                Math.round(
                                    info.progress
                                );


                            resultContent.innerHTML = `

                                <div class="loading-box">

                                    <div class="loading-title">

                                        🤖 Cargando StudyAI

                                    </div>

                                    <div class="progress-number">

                                        ${progress}%

                                    </div>

                                    <div class="progress-bar">

                                        <div
                                            class="progress-fill"
                                            style="
                                                width:${progress}%
                                            "
                                        ></div>

                                    </div>

                                    <p>

                                        Descargando
                                        el modelo de IA...

                                    </p>

                                </div>

                            `;

                        }

                    }

            }

        );


        return generator;


    } catch (error) {

        console.error(
            "Error cargando IA:",
            error
        );


        resultContent.innerHTML = `

            <div class="error-box">

                <strong>
                    ❌ No se pudo cargar la IA.
                </strong>

                <p>
                    ${escapeHTML(
                        error.message
                    )}
                </p>

            </div>

        `;


        throw error;

    }

}


// ============================================
// GUARDAR MATERIAL
// ============================================

function saveMaterial(
    subject,
    topic,
    text
) {

    const previous =
        JSON.parse(
            localStorage.getItem(
                "studyAI_materials"
            ) || "[]"
        );


    const material = {

        id:
            Date.now(),

        subject,

        topic,

        text,

        date:
            new Date().toLocaleDateString(
                "es-CL"
            )

    };


    previous.unshift(material);


    const limited =
        previous.slice(0, 10);


    localStorage.setItem(
        "studyAI_materials",
        JSON.stringify(limited)
    );


    renderMaterials();

}


// ============================================
// MOSTRAR MATERIALES GUARDADOS
// ============================================

function renderMaterials() {

    if (!materialsList) {
        return;
    }


    const materials =
        JSON.parse(
            localStorage.getItem(
                "studyAI_materials"
            ) || "[]"
        );


    if (materials.length === 0) {

        materialsList.innerHTML = `

            <div class="empty-materials">

                <div class="empty-icon">
                    📚
                </div>

                <h2>
                    Aún no tienes materiales
                </h2>

                <p>
                    Genera tu primer material y aparecerá
                    aquí automáticamente.
                </p>

                <button
                    class="primary-button"
                    data-view="study"
                >

                    Crear mi primer material

                    <span>→</span>

                </button>

            </div>

        `;


        // Volver a registrar el botón
        materialsList
            .querySelectorAll("[data-view]")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        showView(
                            button.dataset.view
                        );

                    }
                );

            });


        return;

    }


    materialsList.innerHTML = "";


    materials.forEach(material => {

        const card =
            document.createElement("button");


        card.className =
            "material-card";


        card.innerHTML = `

            <div class="material-icon">
                📚
            </div>

            <div>

                <strong>
                    ${escapeHTML(
                        material.topic
                    )}
                </strong>

                <small>

                    ${escapeHTML(
                        material.subject
                    )}

                    ·

                    ${material.date}

                </small>

            </div>

            <b>
                →
            </b>

        `;


        card.addEventListener(
            "click",
            () => {

                openSavedMaterial(
                    material
                );

            }
        );


        materialsList.appendChild(card);

    });

}


function openSavedMaterial(material) {

    resultTitle.textContent =
        material.topic;


    resultMeta.innerHTML = `

        <span class="meta-chip">

            ${escapeHTML(
                material.subject
            )}

        </span>

        <span class="meta-chip">

            Material guardado

        </span>

    `;


    resultContent.innerHTML =
        formatAIResponse(
            material.text
        );


    showView(
        "result-view"
    );

}


// Cargar materiales al abrir
renderMaterials();


// ============================================
// GENERAR MATERIAL
// ============================================

generateButton.addEventListener(
    "click",
    async () => {

        const subject =
            subjectSelect.value;


        const topic =
            topicInput.value.trim();


        // Validación
        if (
            subject === ""
            ||
            topic === ""
        ) {

            resultTitle.textContent =
                "Falta información";


            resultMeta.innerHTML = "";


            resultContent.innerHTML = `

                <div class="error-box">

                    ⚠️ Selecciona una materia
                    y escribe un tema.

                </div>

            `;


            showView(
                "result-view"
            );


            return;

        }


        // Preparar pantalla de resultados
        resultTitle.textContent =
            topic;


        resultMeta.innerHTML = `

            <span class="meta-chip">

                ${escapeHTML(subject)}

            </span>

            <span class="meta-chip">

                ✦ StudyAI

            </span>

        `;


        resultContent.innerHTML = `

            <div class="loading-placeholder">

                <div class="loader"></div>

                <p>
                    Preparando tu material...
                </p>

            </div>

        `;


        // Cambiar a pantalla de resultado
        showView(
            "result-view"
        );


        generateButton.disabled =
            true;


        try {

            const ai =
                await loadAI();


            resultContent.innerHTML = `

                <div class="loading-box">

                    <div class="loader"></div>

                    <p>
                        🤖 Generando tu material...
                    </p>

                </div>

            `;


            const messages = [

                {

                    role: "system",

                    content:

                        "Eres StudyAI, un asistente educativo " +

                        "para estudiantes de enseñanza media. " +

                        "Responde siempre en español. " +

                        "Sé claro, preciso y ordenado. " +

                        "No muestres razonamiento interno. " +

                        "No escribas etiquetas <think>. " +

                        "Entrega solamente la respuesta final."

                },

                {

                    role: "user",

                    content:

                        `Crea material de estudio sobre:

Materia: ${subject}

Tema: ${topic}

Organiza la respuesta así:

# ${topic}

## 📖 Explicación

Explica el tema de forma clara y sencilla.

## 🧠 Conceptos importantes

Explica los conceptos fundamentales.

## ✏️ Ejemplo paso a paso

Incluye un ejemplo explicado paso a paso.

## 📝 Ejercicios

Crea 3 ejercicios relacionados con el tema.

## ✅ Respuestas

Entrega las respuestas de los 3 ejercicios.

Reglas:

- Responde en español.
- Usa párrafos separados.
- Usa títulos claros.
- No escribas <think>.
- No muestres razonamiento interno.
- Entrega solamente el material final.
- Escribe /no_think al final.`

                }

            ];


            const output =
                await ai(
                    messages,
                    {

                        max_new_tokens: 800,

                        do_sample: true,

                        temperature: 0.7,

                        top_p: 0.8,

                        top_k: 20

                    }
                );


            let generatedText =
                output?.[0]
                    ?.generated_text
                    ?.at(-1)
                    ?.content;


            if (!generatedText) {

                throw new Error(
                    "La IA no devolvió una respuesta."
                );

            }


            generatedText =
                cleanAIResponse(
                    generatedText
                );


            // Mostrar resultado bonito
            resultContent.innerHTML =
                formatAIResponse(
                    generatedText
                );


            // Guardar en materiales
            saveMaterial(
                subject,
                topic,
                generatedText
            );


        } catch (error) {

            console.error(
                "Error generando:",
                error
            );


            resultContent.innerHTML = `

                <div class="error-box">

                    <strong>

                        ❌ Ocurrió un error
                        al generar el material.

                    </strong>

                    <p>

                        ${escapeHTML(
                            error.message
                        )}

                    </p>

                </div>

            `;

        }


        generateButton.disabled =
            false;

    }
);