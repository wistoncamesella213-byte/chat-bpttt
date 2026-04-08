# 🚬 Smokes.uy — Bot de Instagram con Carlos

Bot de atención al cliente para Instagram, usando Claude (Anthropic) como motor de respuestas.

---

## Variables de entorno necesarias

Configurar estas 3 variables en Railway (o en un archivo `.env` local):

```
ANTHROPIC_API_KEY=    # Tu API key de Anthropic (console.anthropic.com)
INSTAGRAM_TOKEN=      # Token de acceso de tu página/Instagram (Meta for Developers)
VERIFY_TOKEN=         # Una palabra secreta que vos elegís, ej: smokes2024
```

---

## Deploy en Railway (paso a paso)

1. Subí este proyecto a un repositorio de GitHub (puede ser privado)
2. Entrá a https://railway.app y creá una cuenta (gratis)
3. Hacé clic en "New Project" → "Deploy from GitHub repo"
4. Seleccioná el repo
5. En la sección "Variables", agregá las 3 variables de arriba
6. Railway te va a dar una URL pública tipo: `https://smokes-bot-xxxx.railway.app`

---

## Configuración en Meta for Developers

### 1. Crear la app
- Entrá a https://developers.facebook.com
- "Mis apps" → "Crear app" → tipo "Business"
- Nombre: SmokesBot (o lo que quieras)

### 2. Agregar Instagram Messaging
- En el panel de la app, buscá "Instagram" y hacé clic en "Configurar"
- Vinculá tu cuenta de Instagram Business (@smokes.uy)
- Generá un Token de Acceso → copialo como `INSTAGRAM_TOKEN`

### 3. Configurar el Webhook
- En "Webhooks" → "Instagram" → "Configurar"
- URL de callback: `https://TU-URL-DE-RAILWAY.railway.app/webhook`
- Token de verificación: el mismo que pusiste en `VERIFY_TOKEN`
- Hacé clic en "Verificar y guardar"
- Suscribite al campo: `messages`

### 4. Listo 🎉
A partir de ahora, cada DM que llegue a @smokes.uy va a ser respondido automáticamente por Carlos.

---

## Probar localmente

```bash
npm install
cp .env.example .env   # completá las variables
npm run dev
```

Usá [ngrok](https://ngrok.com) para exponer localhost al webhook de Meta durante el desarrollo:
```bash
ngrok http 3000
```

---

## Notas
- El historial de conversación se guarda en memoria (se resetea si el servidor reinicia)
- Para persistencia permanente, se puede agregar Redis o una base de datos luego
