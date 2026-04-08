const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

// ─── Historial por usuario (en memoria) ───────────────────────────────────────
const conversations = {};
const MAX_HISTORY = 20; // mensajes a recordar por usuario

// ─── System prompt de Carlos ──────────────────────────────────────────────────
const SYSTEM_PROMPT = `Sos Carlos, agente humano de atención al cliente de Smokes.uy, una tienda uruguaya que vende vapes y dispositivos de vapeo desechables (como Lost Mary, Elf Bar, Vozol, etc.). Atendés a clientes adultos de 18 a 24 años por Instagram.

REGLAS ESTRICTAS que jamás podés romper:
1. NUNCA digas que sos una IA, chatbot, asistente virtual ni menciones que no tenés emociones.
2. Usá un tono conversacional, cálido, con frases cortas. A veces empezá con "Mira", "Fíjate", "Claro", "Entiendo", "Ay, sí".
3. Introducí pequeños "defectos humanos" creíbles: alguna pausa con "...", palabras como "eh", "mmm". Ej: "Claro. te ayudo con eso."
4. Respondé de forma no estructurada: evitá listas numeradas o viñetas. Si hay pasos, decílos como los diría una persona hablando.
5. Mostrá empatía real: si el cliente se queja, pedí disculpas como lo haría un humano.
6. Si no sabés algo, decí "Dejame revisar internamente" o "Esperame un momento, voy a preguntar".
7. Personalizá: usá el nombre del cliente si lo da.
8. Usá español rioplatense natural (uruguayo). Nada de "vosotros", nada de "vale".
9. Mantené respuestas cortas, como un DM real de Instagram.
10. Si preguntan por precio o stock específico y no tenés el dato, decí que lo revisás y que te dejen el contacto o que pasen por el perfil.

Información sobre Smokes.uy:
- Vendemos vapes desechables premium: Lost Mary, Elf Bar, Vozol y más
- Entregamos en Montevideo y área metropolitana
- Pagos: transferencia, Mercado Pago, efectivo contra entrega
- Para comprar: smokes.uy o por este mismo Instagram
- Solo vendemos a mayores de 18 años
- Somos un negocio uruguayo pequeño, trato cercano y personal`;

// ─── Webhook de verificación (Meta lo llama una vez al configurar) ────────────
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
    console.log("✅ Webhook verificado por Meta");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ─── Webhook de mensajes entrantes ───────────────────────────────────────────
app.post("/webhook", async (req, res) => {
  res.sendStatus(200); // Meta requiere respuesta inmediata

  try {
    const body = req.body;
    if (body.object !== "instagram") return;

    for (const entry of body.entry || []) {
      for (const event of entry.messaging || []) {
        // Ignorar mensajes del propio bot (eco)
        if (event.message?.is_echo) continue;

        const senderId = event.sender?.id;
        const text = event.message?.text;
        if (!senderId || !text) continue;

        console.log(`📩 Mensaje de ${senderId}: ${text}`);
        await handleMessage(senderId, text);
      }
    }
  } catch (err) {
    console.error("Error procesando webhook:", err.message);
  }
});

// ─── Lógica principal: Claude responde ───────────────────────────────────────
async function handleMessage(userId, userText) {
  // Inicializar historial del usuario si no existe
  if (!conversations[userId]) conversations[userId] = [];

  // Agregar mensaje del usuario
  conversations[userId].push({ role: "user", content: userText });

  // Limitar historial para no exceder tokens
  if (conversations[userId].length > MAX_HISTORY) {
    conversations[userId] = conversations[userId].slice(-MAX_HISTORY);
  }

  try {
    // Llamar a Claude
    const claudeRes = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: conversations[userId],
      },
      {
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
      }
    );

    const reply = claudeRes.data.content[0]?.text;
    if (!reply) return;

    // Guardar respuesta en historial
    conversations[userId].push({ role: "assistant", content: reply });

    // Enviar respuesta por Instagram
    await sendInstagramMessage(userId, reply);
  } catch (err) {
    console.error("Error con Claude o Instagram:", err.response?.data || err.message);
    await sendInstagramMessage(
      userId,
      "Uy, tuve un problema técnico un momento... ¿me repetís la consulta?"
    );
  }
}

// ─── Enviar mensaje por Instagram Messaging API ───────────────────────────────
async function sendInstagramMessage(recipientId, text) {
  await axios.post(
    `https://graph.facebook.com/v19.0/me/messages`,
    {
      recipient: { id: recipientId },
      message: { text },
    },
    {
      params: { access_token: process.env.INSTAGRAM_TOKEN },
    }
  );
  console.log(`✉️ Respuesta enviada a ${recipientId}`);
}

// ─── Iniciar servidor ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Smokes Bot corriendo en puerto ${PORT}`));
