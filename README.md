# 🤠 Sheriff Report Maker (SRM) - RedM Roleplay

> [!TIP]
> **Demo en Vivo / Web de Prueba**: Puedes ver y probar el generador funcionando en el siguiente enlace: **[https://soyzaak.github.io/RedM---SRM/](https://soyzaak.github.io/RedM---SRM/)**

Un generador web interactivo y responsivo para crear informes policiales de época (ambientados en el año **1885**) para servidores de **RedM Roleplay** (RDR2). Permite a los agentes de la ley redactar actas realistas, previsualizarlas en tiempo real con una estética de papel pergamino antiguo, firmarlas de forma manuscrita y exportarlas o enviarlas automáticamente a canales de Discord.

---

## 🚀 Características Principales

* **Estética del Lejano Oeste (1885)**: Diseñado con texturas de pergamino envejecido, tipografía clásica de máquina de escribir (`Special Elite`), placa metálica de sheriff y sello de tinta oficial fusionado con la textura de fondo.
* **Reactividad en Tiempo Real**: Rellena el formulario interactivo en el panel izquierdo y mira cómo se redacta y adapta la hoja oficial al instante en el panel derecho.
* **Autoincremento de Registro**: Inicia de forma automática en el número `0` y se incrementa en uno de forma secuencial cada vez que descargas o imprimes el informe.
* **Firma Digital Híbrida**: Permite firmar de forma tipográfica (utilizando una elegante caligrafía cursiva) o dibujar la firma a mano alzada usando el ratón o pantalla táctil.
* **Integración con Discord Webhooks**:
  * Envía de forma automática una ficha/tarjeta premium (con color rojo carmesí e iconos temáticos) al canal de Discord de tu departamento cuando descargas o copias el informe.
  * Botón de prueba de conexión integrado.
  * **Seguridad Local**: La URL de tu webhook se almacena en el caché local de tu navegador (`localStorage`), de modo que nunca se expone públicamente en el código del repositorio de GitHub.
* **Múltiples Opciones de Exportación**:
  * **Descargar PNG**: Exporta la vista previa a una imagen PNG de alta calidad usando `html2canvas`.
  * **Copiar Texto**: Genera y copia una versión limpia formateada en **Markdown de Discord** para pegarla en foros o chats.
  * **Descargar PDF**: Imprime el informe usando las opciones de guardado de PDF nativas del navegador (Ctrl + P), adaptadas a escala A4.
* **Guardado de Borrador**: La web guarda automáticamente tu progreso localmente, por lo que no perderás el texto si cierras la pestaña por error.

---

## 🛠️ Tecnologías Utilizadas

* **HTML5** (Estructura semántica)
* **CSS3** (Estilos responsive y animaciones Western)
* **Vanilla JavaScript** (Lógica interactiva, canvas de firma y almacenamiento local)
* **html2canvas** (Generación y exportación de imágenes por CDN)
* **Google Fonts** (`Rye`, `Special Elite`, `Pinyon Script`, `Outfit`)

---

## 📦 Instalación y Despliegue en GitHub Pages

Al ser una aplicación 100% estática (frontend sin base de datos), puedes hospedarla de forma totalmente gratuita y segura en **GitHub Pages**:

1. Crea un repositorio público en tu cuenta de GitHub.
2. Sube todos los archivos del proyecto (`index.html`, `style.css`, `app.js`, `README.md` y la carpeta `assets`).
3. En la página de tu repositorio en GitHub, ve a **Settings** (Ajustes) > **Pages** (en el menú izquierdo).
4. En **Build and deployment**, bajo **Branch**, selecciona la rama **`main`** y la carpeta `/ (root)`.
5. Haz clic en **Save** (Guardar).
6. Espera un minuto y recarga la página. Tu enlace público aparecerá arriba del todo (ej: `https://tu_usuario.github.io/tu_repositorio/`).

---

## 🔒 Privacidad y Seguridad

La URL del Webhook de Discord ingresada en la web se almacena localmente en el navegador de cada usuario utilizando el espacio de almacenamiento `localStorage` cifrado del navegador del cliente. **Ninguna URL de webhook se envía o se guarda en servidores externos ni se sube a tu repositorio de GitHub**, por lo que es totalmente seguro para su uso en comunidades públicas.

---

## 🎨 Créditos y Estética
Diseñado para la comunidad de RedM Roleplay.
Estética inspirada en el arte y ambientación de Red Dead Redemption 2.
