// ==========================================
// LÓGICA DE LA APLICACIÓN - SHERIFF REPORT
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Wrapper seguro para localStorage (evita SecurityError en protocolo file://)
    const safeStorage = {
        getItem(key) {
            try {
                return localStorage.getItem(key);
            } catch (e) {
                console.warn("Storage.getItem bloqueado en este navegador para archivos locales.", e);
                return null;
            }
        },
        setItem(key, value) {
            try {
                localStorage.setItem(key, value);
            } catch (e) {
                console.warn("Storage.setItem bloqueado en este navegador para archivos locales.", e);
            }
        },
        removeItem(key) {
            try {
                localStorage.removeItem(key);
            } catch (e) {
                console.warn("Storage.removeItem bloqueado en este navegador para archivos locales.", e);
            }
        }
    };

    // Estado de la aplicación
    let state = {
        regNum: 'INF-POL-0',
        subtitle: 'Posible Contratación de Pistoleros',
        caseDate: '',
        caseLocation: '',
        caseTitle: '',
        involvedAgents: '',
        involvedCriminals: 'N/A',
        involvedCivilians: 'N/A',
        involvedVictims: 'N/A',
        narrative: '',
        actions: [''],
        evidences: [''],
        observations: '',
        signatureName: 'Wesley Grant',
        sigMethod: 'font',
        sigDrawing: null
    };

    // Elementos del DOM - Formulario
    const form = document.getElementById('report-form');
    const inputRegNum = document.getElementById('input-reg-num');
    const btnNextReg = document.getElementById('btn-next-reg');
    const inputSubtitle = document.getElementById('input-subtitle');
    const inputDate = document.getElementById('input-date');
    const inputLocation = document.getElementById('input-location');
    const inputTitle = document.getElementById('input-title');
    const inputAgents = document.getElementById('input-agents');
    const inputCriminals = document.getElementById('input-criminals');
    const inputCivilians = document.getElementById('input-civilians');
    const inputVictims = document.getElementById('input-victims');
    const inputNarrative = document.getElementById('input-narrative');
    const inputObservations = document.getElementById('input-observations');
    const inputSignatureName = document.getElementById('input-signature-name');
    const radioSigMethods = document.getElementsByName('sigMethod');
    
    // Contenedores dinámicos
    const actionsContainer = document.getElementById('actions-list-container');
    const evidencesContainer = document.getElementById('evidences-list-container');
    const btnAddAction = document.getElementById('btn-add-action');
    const btnAddEvidence = document.getElementById('btn-add-evidence');
    
    // Firma Canvas
    const sigPadContainer = document.getElementById('signature-pad-container');
    const signatureCanvas = document.getElementById('signature-canvas');
    const btnClearSig = document.getElementById('btn-clear-sig');
    const ctxSig = signatureCanvas.getContext('2d');
    let isDrawing = false;

    // Elementos del DOM - Vista Previa
    const prevRegNum = document.getElementById('preview-reg-num');
    const prevSubtitle = document.getElementById('preview-subtitle');
    const prevDate = document.getElementById('preview-date');
    const prevLocation = document.getElementById('preview-location');
    const prevTitle = document.getElementById('preview-title');
    const prevAgents = document.getElementById('preview-agents');
    const prevCriminals = document.getElementById('preview-criminals');
    const prevCivilians = document.getElementById('preview-civilians');
    const prevVictims = document.getElementById('preview-victims');
    const prevNarrative = document.getElementById('preview-narrative');
    const prevObservations = document.getElementById('preview-observations');
    const prevActions = document.getElementById('preview-actions');
    const prevEvidences = document.getElementById('preview-evidences');
    const prevSigFont = document.getElementById('preview-sig-font');
    const prevSigImg = document.getElementById('preview-sig-img');

    // Discord Webhook DOM
    const inputWebhookUrl = document.getElementById('input-webhook-url');
    const chkAutoWebhook = document.getElementById('chk-auto-webhook');
    const btnToggleWebhook = document.getElementById('btn-toggle-webhook');
    const btnTestWebhook = document.getElementById('btn-test-webhook');

    // Botones de acción principal
    const btnDownloadPng = document.getElementById('btn-download-png');
    const btnCopyText = document.getElementById('btn-copy-text');
    const btnDownloadPdf = document.getElementById('btn-download-pdf');
    const btnReset = document.getElementById('btn-reset');

    // ==========================================
    // 1. INICIALIZACIÓN Y PERSISTENCIA
    // ==========================================

    function init() {
        // Cargar contador de registros de forma segura
        let currentCounter = safeStorage.getItem('sheriff_report_counter');
        if (currentCounter === null) {
            safeStorage.setItem('sheriff_report_counter', '0');
            currentCounter = '0';
        }
        
        // Formatear fecha por defecto
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const defaultDateStr = `${dd}/${mm}/1885`;
        
        // Datos por defecto iniciales limpios
        state.caseDate = defaultDateStr;
        state.regNum = `INF-POL-${currentCounter}`;
        
        state.caseLocation = '';
        state.caseTitle = '';
        state.involvedAgents = '';
        state.involvedCriminals = 'N/A';
        state.involvedCivilians = 'N/A';
        state.involvedVictims = 'N/A';
        state.narrative = '';
        state.actions = [''];
        state.evidences = [''];
        state.observations = '';
        state.signatureName = 'Wesley Grant';

        // Intentar recuperar borrador guardado
        const savedDraft = safeStorage.getItem('sheriff_report_draft');
        if (savedDraft) {
            try {
                const parsed = JSON.parse(savedDraft);
                state = { ...state, ...parsed };
            } catch (e) {
                console.error("Error al cargar el borrador", e);
            }
        }

        // Cargar configuraciones de Discord Webhook
        const savedWebhookUrl = safeStorage.getItem('sheriff_report_webhook_url') || '';
        const savedAutoWebhook = safeStorage.getItem('sheriff_report_auto_webhook');
        
        inputWebhookUrl.value = savedWebhookUrl;
        if (savedAutoWebhook !== null) {
            chkAutoWebhook.checked = savedAutoWebhook === 'true';
        } else {
            chkAutoWebhook.checked = true; // Activado por defecto
        }

        // Rellenar formulario
        updateFormInputs();
        
        // Renderizar listas dinámicas
        renderDynamicInputs('actions');
        renderDynamicInputs('evidences');
        
        // Configurar firma canvas
        setupSignatureCanvas();

        // Actualizar vista previa
        updatePreview();
    }

    // Actualiza los valores de los inputs del formulario basados en el estado
    function updateFormInputs() {
        inputRegNum.value = state.regNum;
        inputSubtitle.value = state.subtitle;
        inputDate.value = state.caseDate;
        inputLocation.value = state.caseLocation;
        inputTitle.value = state.caseTitle;
        inputAgents.value = state.involvedAgents;
        inputCriminals.value = state.involvedCriminals;
        inputCivilians.value = state.involvedCivilians;
        inputVictims.value = state.involvedVictims;
        inputNarrative.value = state.narrative;
        inputObservations.value = state.observations;
        inputSignatureName.value = state.signatureName;
        
        // Seleccionar método de firma correcto
        for (let radio of radioSigMethods) {
            if (radio.value === state.sigMethod) {
                radio.checked = true;
            }
        }
        
        if (state.sigMethod === 'draw') {
            sigPadContainer.style.display = 'flex';
        } else {
            sigPadContainer.style.display = 'none';
        }
    }

    // Guarda el estado actual de forma segura
    function saveDraft() {
        safeStorage.setItem('sheriff_report_draft', JSON.stringify(state));
    }

    // ==========================================
    // 2. ACTUALIZACIÓN DINÁMICA DE LA VISTA PREVIA
    // ==========================================

    function updatePreview() {
        prevRegNum.textContent = state.regNum;
        prevSubtitle.textContent = state.subtitle;
        prevDate.textContent = state.caseDate || '—';
        prevLocation.textContent = state.caseLocation || '—';
        prevTitle.textContent = state.caseTitle || '—';
        prevAgents.textContent = state.involvedAgents || '—';
        prevCriminals.textContent = state.involvedCriminals || '—';
        prevCivilians.textContent = state.involvedCivilians || '—';
        prevVictims.textContent = state.involvedVictims || '—';
        
        // Narrativa
        prevNarrative.textContent = state.narrative || 'Escriba la narrativa de los hechos...';
        
        // Observaciones
        prevObservations.textContent = state.observations || 'Sin observaciones adicionales.';
        
        // Listas
        renderPreviewList(prevActions, state.actions, 'No se registraron actuaciones.');
        renderPreviewList(prevEvidences, state.evidences, 'No se recogieron pruebas.');

        // Firma
        prevSigFont.textContent = state.signatureName || 'Wesley Grant';
        
        if (state.sigMethod === 'font') {
            prevSigFont.style.display = 'block';
            prevSigImg.style.display = 'none';
        } else {
            prevSigFont.style.display = 'none';
            prevSigImg.style.display = 'block';
            if (state.sigDrawing) {
                prevSigImg.src = state.sigDrawing;
            } else {
                prevSigImg.src = '';
                prevSigImg.style.display = 'none';
            }
        }
    }

    function renderPreviewList(element, itemsArray, emptyMessage) {
        element.innerHTML = '';
        const activeItems = itemsArray.filter(item => item.trim() !== '');
        
        if (activeItems.length === 0) {
            const li = document.createElement('li');
            li.textContent = emptyMessage;
            li.style.listStyle = 'none';
            li.style.paddingLeft = '0';
            element.appendChild(li);
            return;
        }

        activeItems.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            element.appendChild(li);
        });
    }

    // ==========================================
    // 3. ENTRADAS DINÁMICAS (Acciones y Pruebas)
    // ==========================================

    function renderDynamicInputs(type) {
        const container = type === 'actions' ? actionsContainer : evidencesContainer;
        const items = type === 'actions' ? state.actions : state.evidences;
        
        container.innerHTML = '';
        
        items.forEach((item, index) => {
            const row = document.createElement('div');
            row.className = 'dynamic-row';
            
            const input = document.createElement('input');
            input.type = 'text';
            input.value = item;
            input.placeholder = type === 'actions' ? `Actuación ${index + 1}` : `Prueba ${index + 1}`;
            
            input.addEventListener('input', (e) => {
                items[index] = e.target.value;
                saveDraft();
                updatePreview();
            });
            
            const btnRemove = document.createElement('button');
            btnRemove.type = 'button';
            btnRemove.className = 'btn-remove-row';
            btnRemove.innerHTML = '×';
            btnRemove.title = 'Eliminar ítem';
            
            btnRemove.addEventListener('click', () => {
                items.splice(index, 1);
                saveDraft();
                renderDynamicInputs(type);
                updatePreview();
            });
            
            row.appendChild(input);
            row.appendChild(btnRemove);
            container.appendChild(row);
        });
    }

    // Añadir nuevo ítem a las listas
    btnAddAction.addEventListener('click', () => {
        state.actions.push('');
        renderDynamicInputs('actions');
        saveDraft();
        updatePreview();
    });

    btnAddEvidence.addEventListener('click', () => {
        state.evidences.push('');
        renderDynamicInputs('evidences');
        saveDraft();
        updatePreview();
    });

    // ==========================================
    // 4. FORMULARIO EVENT LISTENERS
    // ==========================================

    form.addEventListener('input', (e) => {
        const target = e.target;
        
        if (target.name === 'regNum') state.regNum = target.value;
        if (target.name === 'subtitle') state.subtitle = target.value;
        if (target.name === 'caseDate') state.caseDate = target.value;
        if (target.name === 'caseLocation') state.caseLocation = target.value;
        if (target.name === 'caseTitle') state.caseTitle = target.value;
        if (target.name === 'involvedAgents') state.involvedAgents = target.value;
        if (target.name === 'involvedCriminals') state.involvedCriminals = target.value;
        if (target.name === 'involvedCivilians') state.involvedCivilians = target.value;
        if (target.name === 'involvedVictims') state.involvedVictims = target.value;
        if (target.name === 'narrative') state.narrative = target.value;
        if (target.name === 'observations') state.observations = target.value;
        if (target.name === 'signatureName') state.signatureName = target.value;
        
        saveDraft();
        updatePreview();
    });

    // Configuración Discord Webhook Event Listeners
    inputWebhookUrl.addEventListener('input', () => {
        safeStorage.setItem('sheriff_report_webhook_url', inputWebhookUrl.value.trim());
    });

    chkAutoWebhook.addEventListener('change', () => {
        safeStorage.setItem('sheriff_report_auto_webhook', chkAutoWebhook.checked ? 'true' : 'false');
    });

    btnToggleWebhook.addEventListener('click', () => {
        if (inputWebhookUrl.type === 'password') {
            inputWebhookUrl.type = 'text';
            btnToggleWebhook.textContent = '🙈';
        } else {
            inputWebhookUrl.type = 'password';
            btnToggleWebhook.textContent = '👁️';
        }
    });

    // Probar Webhook
    btnTestWebhook.addEventListener('click', () => {
        const url = inputWebhookUrl.value.trim();
        if (!url) {
            alert('Por favor, ingresa una URL de Webhook válida primero.');
            return;
        }

        btnTestWebhook.disabled = true;
        btnTestWebhook.textContent = 'Enviando...';

        const payload = {
            embeds: [{
                title: '✅ Conexión Webhook Exitosa',
                description: 'La web de **Informes de la Oficina del Sheriff 1885** se ha conectado correctamente a este canal. ¡Listo para recibir informes!',
                color: 13935452, // Oro/Bronce
                footer: {
                    text: 'Sheriff Report Maker • RedM Roleplay'
                },
                timestamp: new Date().toISOString()
            }]
        };

        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => {
            if (res.ok) {
                alert('¡Mensaje de prueba enviado con éxito a Discord!');
            } else {
                alert('Error al enviar el mensaje de prueba. Verifica la URL.');
            }
        })
        .catch(err => {
            console.error(err);
            alert('Error de conexión al enviar el webhook de prueba.');
        })
        .finally(() => {
            btnTestWebhook.disabled = false;
            btnTestWebhook.textContent = 'Probar Webhook';
        });
    });

    // Cambiar método de firma
    for (let radio of radioSigMethods) {
        radio.addEventListener('change', (e) => {
            state.sigMethod = e.target.value;
            if (state.sigMethod === 'draw') {
                sigPadContainer.style.display = 'flex';
                resizeCanvas();
            } else {
                sigPadContainer.style.display = 'none';
            }
            saveDraft();
            updatePreview();
        });
    }

    // Botón Siguiente Número de Registro
    btnNextReg.addEventListener('click', () => {
        incrementRegistryNumber();
    });

    function incrementRegistryNumber() {
        let count = parseInt(safeStorage.getItem('sheriff_report_counter') || '0', 10);
        count += 1;
        safeStorage.setItem('sheriff_report_counter', count.toString());
        state.regNum = `INF-POL-${count}`;
        inputRegNum.value = state.regNum;
        saveDraft();
        updatePreview();
    }

    // ==========================================
    // 5. SISTEMA DE DIBUJO DE FIRMA
    // ==========================================

    function setupSignatureCanvas() {
        ctxSig.strokeStyle = '#121c33'; // Tinta azul-negra
        ctxSig.lineWidth = 2.5;
        ctxSig.lineCap = 'round';
        ctxSig.lineJoin = 'round';

        // Eventos ratón
        signatureCanvas.addEventListener('mousedown', startDrawing);
        signatureCanvas.addEventListener('mousemove', draw);
        window.addEventListener('mouseup', stopDrawing);

        // Eventos táctiles
        signatureCanvas.addEventListener('touchstart', startDrawingTouch);
        signatureCanvas.addEventListener('touchmove', drawTouch);
        window.addEventListener('touchend', stopDrawing);
        
        btnClearSig.addEventListener('click', clearSignature);
    }

    function resizeCanvas() {
        const rect = signatureCanvas.getBoundingClientRect();
        signatureCanvas.width = rect.width || 300;
        signatureCanvas.height = rect.height || 100;
        clearSignature();
    }

    function startDrawing(e) {
        isDrawing = true;
        const pos = getMousePos(signatureCanvas, e);
        ctxSig.beginPath();
        ctxSig.moveTo(pos.x, pos.y);
    }

    function draw(e) {
        if (!isDrawing) return;
        const pos = getMousePos(signatureCanvas, e);
        ctxSig.lineTo(pos.x, pos.y);
        ctxSig.stroke();
    }

    function startDrawingTouch(e) {
        if (e.target === signatureCanvas) {
            e.preventDefault();
        }
        isDrawing = true;
        const touch = e.touches[0];
        const pos = getTouchPos(signatureCanvas, touch);
        ctxSig.beginPath();
        ctxSig.moveTo(pos.x, pos.y);
    }

    function drawTouch(e) {
        if (e.target === signatureCanvas) {
            e.preventDefault();
        }
        if (!isDrawing) return;
        const touch = e.touches[0];
        const pos = getTouchPos(signatureCanvas, touch);
        ctxSig.lineTo(pos.x, pos.y);
        ctxSig.stroke();
    }

    function stopDrawing() {
        if (isDrawing) {
            isDrawing = false;
            state.sigDrawing = signatureCanvas.toDataURL();
            saveDraft();
            updatePreview();
        }
    }

    function clearSignature() {
        ctxSig.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
        state.sigDrawing = null;
        saveDraft();
        updatePreview();
    }

    function getMousePos(canvasDom, mouseEvent) {
        const rect = canvasDom.getBoundingClientRect();
        return {
            x: mouseEvent.clientX - rect.left,
            y: mouseEvent.clientY - rect.top
        };
    }

    function getTouchPos(canvasDom, touchEvent) {
        const rect = canvasDom.getBoundingClientRect();
        return {
            x: touchEvent.clientX - rect.left,
            y: touchEvent.clientY - rect.top
        };
    }

    // ==========================================
    // 6. GENERACIÓN Y COPIADO DE TEXTO PLANO
    // ==========================================

    function generatePlaintextReport() {
        const actionsList = state.actions.filter(x => x.trim()).map(x => `• ${x}`).join('\n');
        const evidencesList = state.evidences.filter(x => x.trim()).map(x => `• ${x}`).join('\n');

        return `**🤠 INFORME - OFICINA DEL SHERIFF 🤠**
*1885*
***
**N.º DE REGISTRO:** \`${state.regNum}\`
**ASUNTO:** \`${state.subtitle}\`
***
**1. INFORMACIÓN DEL CASO**
• **Fecha y hora:** ${state.caseDate || '—'}
• **Lugar de los hechos:** ${state.caseLocation || '—'}
• **Título del informe:** ${state.caseTitle || '—'}

**2. PERSONAS INVOLUCRADAS**
• **Agentes involucrados:** ${state.involvedAgents || '—'}
• **Delincuentes involucrados:** ${state.involvedCriminals || '—'}
• **Civiles involucrados:** ${state.involvedCivilians || '—'}
• **Víctimas:** ${state.involvedVictims || '—'}

**3. INFORME DE LOS HECHOS**
\`\`\`
${state.narrative || '—'}
\`\`\`

**4. ACTUACIONES REALIZADAS**
${actionsList || 'Ninguna registrada.'}

**5. PRUEBAS O EVIDENCIAS RECOGIDAS**
${evidencesList || 'Ninguna recogida.'}

**6. OBSERVACIONES ADICIONALES**
${state.observations || 'Ninguna observación adicional.'}

**7. FIRMA**
• **Firma del sheriff responsable:** *${state.signatureName || '—'}*
***`;
    }

    // Botón Copiar Texto
    btnCopyText.addEventListener('click', () => {
        const textReport = generatePlaintextReport();

        navigator.clipboard.writeText(textReport).then(() => {
            const originalText = btnCopyText.textContent;
            btnCopyText.textContent = '¡Copiado!';
            btnCopyText.style.backgroundColor = 'var(--accent)';
            btnCopyText.style.color = '#000';

            // Intentar enviar a Discord de forma automática
            sendDiscordWebhook('copy');

            setTimeout(() => {
                btnCopyText.textContent = originalText;
                btnCopyText.style.backgroundColor = '';
                btnCopyText.style.color = '';
            }, 1500);
        }).catch(err => {
            console.error("Error al copiar texto: ", err);
            alert("No se pudo copiar el texto automáticamente. Revisa los permisos de tu navegador.");
        });
    });

    // ==========================================
    // 7. ENVÍO DE WEBHOOK A DISCORD
    // ==========================================

    function sendDiscordWebhook(actionType) {
        const url = inputWebhookUrl.value.trim();
        const autoSend = chkAutoWebhook.checked;

        if (!url || !autoSend) return;

        let actionLabel = 'Descarga de Imagen (PNG)';
        if (actionType === 'pdf') actionLabel = 'Descarga de Documento (PDF)';
        if (actionType === 'copy') actionLabel = 'Copiado de texto (Markdown)';

        const actionsList = state.actions.filter(x => x.trim()).map(x => `• ${x}`).join('\n') || 'Ninguna registrada.';
        const evidencesList = state.evidences.filter(x => x.trim()).map(x => `• ${x}`).join('\n') || 'Ninguna recogida.';

        // Construir embed del informe
        const payload = {
            embeds: [{
                title: `🤠 INFORME DE SHERIFF: ${state.regNum}`,
                description: `**${state.subtitle}**\n\n_${state.caseTitle || 'Sin título de informe.'}_`,
                color: 10365474, // Rojo RDR
                fields: [
                    {
                        name: '📅 Detalles del Suceso',
                        value: `**Fecha:** ${state.caseDate || '—'}\n**Lugar:** ${state.caseLocation || '—'}`
                    },
                    {
                        name: '👥 Personas Involucradas',
                        value: `**Agentes:** ${state.involvedAgents || '—'}\n**Delincuentes:** ${state.involvedCriminals || '—'}\n**Civiles:** ${state.involvedCivilians || '—'}\n**Víctimas:** ${state.involvedVictims || '—'}`
                    },
                    {
                        name: '📝 Narrativa de los Hechos',
                        value: state.narrative ? (state.narrative.substring(0, 1000) + (state.narrative.length > 1000 ? '...' : '')) : '—'
                    },
                    {
                        name: '🔧 Actuaciones Realizadas',
                        value: actionsList.substring(0, 1024)
                    },
                    {
                        name: '🔎 Pruebas o Evidencias Recogidas',
                        value: evidencesList.substring(0, 1024)
                    },
                    {
                        name: '✏️ Observaciones Adicionales',
                        value: state.observations ? state.observations.substring(0, 1024) : 'Ninguna'
                    }
                ],
                footer: {
                    text: `Firmado por: ${state.signatureName} | Acción: ${actionLabel}`
                },
                timestamp: new Date().toISOString()
            }]
        };

        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => {
            if (!res.ok) {
                console.warn('El Webhook de Discord respondió con un código de error:', res.status);
            }
        })
        .catch(err => {
            console.error('Error de red al intentar enviar el Webhook de Discord:', err);
        });
    }

    // ==========================================
    // 8. BOTONES DE ACCIÓN (Descarga de PNG y PDF)
    // ==========================================

    btnDownloadPng.addEventListener('click', () => {
        btnDownloadPng.disabled = true;
        btnDownloadPng.textContent = 'Procesando...';

        const report = document.getElementById('report-preview');

        setTimeout(() => {
            html2canvas(report, {
                scale: 2, 
                useCORS: true,
                allowTaint: true,
                backgroundColor: null,
                logging: false
            }).then(canvas => {
                const link = document.createElement('a');
                link.download = `informe-sheriff-${state.regNum.toLowerCase()}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
                
                // Enviar Webhook
                sendDiscordWebhook('png');

                // Autoincrementar
                incrementRegistryNumber();

                btnDownloadPng.disabled = false;
                btnDownloadPng.textContent = 'Descargar PNG';
            }).catch(err => {
                console.error("Error al generar la imagen", err);
                alert("Hubo un error al generar la imagen.");
                btnDownloadPng.disabled = false;
                btnDownloadPng.textContent = 'Descargar PNG';
            });
        }, 150);
    });

    btnDownloadPdf.addEventListener('click', () => {
        // Enviar Webhook antes de imprimir (abre diálogo)
        sendDiscordWebhook('pdf');
        
        window.print();

        setTimeout(() => {
            incrementRegistryNumber();
        }, 500);
    });

    btnReset.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres limpiar todo el informe? Se borrarán los textos actuales.')) {
            safeStorage.removeItem('sheriff_report_draft');
            const currentCounter = safeStorage.getItem('sheriff_report_counter') || '0';
            state = {
                regNum: `INF-POL-${currentCounter}`,
                subtitle: 'Posible Contratación de Pistoleros',
                caseDate: '',
                caseLocation: '',
                caseTitle: '',
                involvedAgents: '',
                involvedCriminals: 'N/A',
                involvedCivilians: 'N/A',
                involvedVictims: 'N/A',
                narrative: '',
                actions: [''],
                evidences: [''],
                observations: '',
                signatureName: '',
                sigMethod: 'font',
                sigDrawing: null
            };
            
            const today = new Date();
            const dd = String(today.getDate()).padStart(2, '0');
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            state.caseDate = `${dd}/${mm}/1885`;
            
            updateFormInputs();
            renderDynamicInputs('actions');
            renderDynamicInputs('evidences');
            clearSignature();
            updatePreview();
        }
    });

    // Inicializar la aplicación
    init();
});
