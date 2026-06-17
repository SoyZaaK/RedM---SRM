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

    // ==========================================
    // CONFIGURACIÓN Y CONSTANTES DE TIPOS DE DOCUMENTO
    // ==========================================
    const DOC_PREFIXES = {
        police_report: 'INF-POL-',
        evaluation: 'EVAL-',
        complaint: 'DEN-',
        seizure: 'ACT-INC-',
        warrant: 'ORD-ARR-'
    };

    const DOC_DEFAULTS = {
        police_report: {
            subtitle: 'Posible Contratación de Pistoleros',
            caseTitle: 'Posible contratación irregular de personal armado...',
            narrative: 'Escribe aquí los detalles del informe redactados a máquina...',
            observations: 'Sin observaciones adicionales.'
        },
        evaluation: {
            subtitle: 'Rango: Recluta',
            caseTitle: 'Wesley Grant',
            narrative: 'El agente en evaluación ha demostrado un comportamiento ejemplar durante las patrullas en Valentine. Su desempeño general es óptimo.',
            observations: 'APROBADO CON RECOMENDACIÓN DE ASCENSO'
        },
        complaint: {
            subtitle: 'Estado: Pendiente de Investigación',
            caseTitle: 'Arthur Doe',
            narrative: 'El denunciante manifiesta que el día de ayer, aproximadamente a las seis de la tarde, fue abordado por un sujeto armado en los senderos de Dakota River...',
            observations: 'Se solicita patrullaje preventivo en las inmediaciones del río.'
        },
        seizure: {
            subtitle: 'Bienes: Armas y Contrabando',
            caseTitle: 'Banda de los O\'Driscoll',
            narrative: 'Tras una inspección rutinaria en una carreta sospechosa al norte de Strawberry, se procedió al registro hallando mercancía no declarada y armamento sin licencia...',
            observations: 'Los bienes incautados quedan guardados bajo llave en el almacén de la oficina.'
        },
        warrant: {
            subtitle: '$50.00 ORO',
            caseTitle: 'Dutch van der Linde',
            narrative: 'Se busca vivo o muerto. Entregar a cualquier oficial de la ley en el Territorio. Se desaconseja intentar su captura en solitario.',
            observations: ''
        }
    };

    const defaultState = (type, counter) => {
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const defaultDateStr = `${dd}/${mm}/1885`;
        
        const prefix = DOC_PREFIXES[type] || 'INF-';
        const defs = DOC_DEFAULTS[type] || {};

        return {
            docType: type,
            regNum: `${prefix}${counter}`,
            subtitle: defs.subtitle || '',
            caseDate: defaultDateStr,
            caseLocation: type === 'evaluation' ? '' : 'Valentine, New Hanover',
            caseTitle: defs.caseTitle || '',
            involvedAgents: '',
            involvedCriminals: 'N/A',
            involvedCivilians: 'N/A',
            involvedVictims: 'N/A',
            narrative: defs.narrative || '',
            actions: [''],
            evidences: [''],
            observations: defs.observations || '',
            signatureName: 'Wesley Grant',
            sigMethod: 'font',
            sigDrawing: null,
            
            // Campos específicos
            evaluatorName: 'Wesley Grant',
            evalConduct: 'Bueno',
            evalCombat: 'Bueno',
            evalRiding: 'Bueno',
            evalLaws: 'Bueno',
            complainantAddress: 'Rancho Emerald, New Hanover',
            accusedName: 'Sujeto Desconocido',
            accusedDesc: 'Sombrero negro, abrigo marrón, cicatriz en la mejilla.',
            accusedLocation: 'Merodeando por los bosques de Cumberland',
            seizureOwner: 'Desconocido',
            seizureAgents: 'Sheriff Grant',
            warrantCrimes: 'Asalto al tren de Cornwall, robo de ganado y desacato',
            warrantPhysical: 'Estatura media, barba canosa, viste chaleco elegante y sombrero negro.',
            warrantDanger: 'Extremadamente Peligroso • Armado',
            warrantPhotoUrl: '',
            warrantPhotoData: null,
            signatureName2: 'Arthur Doe',
            recipientAgent: 'Wesley Grant'
        };
    };

    // Estado activo
    let state = {};
    let showManual = false;
    let zoomMode = 'auto';
    let zoomScale = 1;

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
        // Cargar tipo activo
        let activeType = safeStorage.getItem('sheriff_report_active_type');
        if (!activeType) {
            activeType = 'none';
            safeStorage.setItem('sheriff_report_active_type', 'none');
        }

        if (activeType === 'none') {
            state = { docType: 'none' };
        } else {
            // Cargar borrador para el tipo activo
            const savedDraft = safeStorage.getItem('sheriff_report_draft_' + activeType);
            if (savedDraft) {
                try {
                    state = JSON.parse(savedDraft);
                } catch (e) {
                    console.error("Error al cargar borrador", e);
                    initializeDefaultStateForType(activeType);
                }
            } else {
                initializeDefaultStateForType(activeType);
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

        // Rellenar formulario e interactuar con DOM
        updateFormVisibility();
        updateFormInputs();
        
        // Renderizar listas dinámicas
        if (state.docType !== 'none') {
            renderDynamicInputs('actions');
            renderDynamicInputs('evidences');
        }
        
        // Configurar firma canvas
        setupSignatureCanvas();

        // Configurar escuchadores condicionales para Wanted Photo y Document Selector
        setupSpecialInputs();

        // Actualizar firma canvas dibujada si existía
        if (state.docType !== 'none' && state.sigMethod === 'draw' && state.sigDrawing) {
            const img = new Image();
            img.onload = () => {
                ctxSig.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
                ctxSig.drawImage(img, 0, 0);
            };
            img.src = state.sigDrawing;
        }

        // Configurar botones de zoom
        const btnZoomIn = document.getElementById('btn-zoom-in');
        const btnZoomOut = document.getElementById('btn-zoom-out');
        const btnZoomAuto = document.getElementById('btn-zoom-auto');
        
        if (btnZoomIn) {
            btnZoomIn.addEventListener('click', () => {
                zoomMode = 'manual';
                zoomScale = Math.min(1.5, Math.round((zoomScale + 0.1) * 10) / 10);
                updatePreviewScale();
            });
        }
        
        if (btnZoomOut) {
            btnZoomOut.addEventListener('click', () => {
                zoomMode = 'manual';
                zoomScale = Math.max(0.35, Math.round((zoomScale - 0.1) * 10) / 10);
                updatePreviewScale();
            });
        }
        
        if (btnZoomAuto) {
            btnZoomAuto.addEventListener('click', () => {
                zoomMode = 'auto';
                updatePreviewScale();
            });
        }

        // Configurar botón para alternar manual de uso
        const btnToggleManual = document.getElementById('btn-toggle-manual');
        if (btnToggleManual) {
            btnToggleManual.addEventListener('click', () => {
                showManual = !showManual;
                if (showManual) {
                    btnToggleManual.classList.add('active');
                    btnToggleManual.style.backgroundColor = 'var(--primary)';
                    btnToggleManual.style.color = '#fff';
                } else {
                    btnToggleManual.classList.remove('active');
                    btnToggleManual.style.backgroundColor = 'var(--accent)';
                    btnToggleManual.style.color = '#000';
                }
                updateFormVisibility();
                updatePreviewScale();
            });
        }

        // Evento de redimensión para auto-zoom
        window.addEventListener('resize', () => {
            if (zoomMode === 'auto') {
                updatePreviewScale();
            }
        });

        // Actualizar vista previa
        updatePreview();
        updatePreviewScale();
    }

    function updatePreviewScale() {
        const wrapper = document.querySelector('.report-wrapper');
        if (!wrapper) return;
        
        if (zoomMode === 'auto') {
            const padding = 40;
            const availableWidth = wrapper.clientWidth - (padding * 2);
            const targetWidth = 800; // Ancho natural del papel A4
            
            let scale = availableWidth / targetWidth;
            if (scale > 1) scale = 1;
            if (scale < 0.35) scale = 0.35;
            zoomScale = scale;
            
            const zoomLevelText = document.getElementById('zoom-level');
            if (zoomLevelText) {
                zoomLevelText.textContent = `Auto (${Math.round(scale * 100)}%)`;
            }
        } else {
            const zoomLevelText = document.getElementById('zoom-level');
            if (zoomLevelText) {
                zoomLevelText.textContent = `${Math.round(zoomScale * 100)}%`;
            }
        }
        
        document.documentElement.style.setProperty('--preview-scale', zoomScale);
    }

    function initializeDefaultStateForType(type) {
        let counter = safeStorage.getItem('sheriff_report_counter_' + type);
        if (counter === null) {
            safeStorage.setItem('sheriff_report_counter_' + type, '0');
            counter = '0';
        }
        state = defaultState(type, counter);
    }

    function setupSpecialInputs() {
        const inputDocType = document.getElementById('input-doc-type');
        if (inputDocType) {
            inputDocType.addEventListener('change', (e) => {
                const newType = e.target.value;
                if (newType !== state.docType) {
                    switchDocumentType(newType);
                }
            });
        }

        // Registrar clics en las tarjetas del selector
        const selectorCards = document.querySelectorAll('.selector-card');
        selectorCards.forEach(card => {
            card.addEventListener('click', () => {
                const type = card.getAttribute('data-type');
                if (type) {
                    switchDocumentType(type);
                }
            });
        });

        // Registrar clic en botón volver al selector
        const btnBackToSelector = document.getElementById('btn-back-to-selector');
        if (btnBackToSelector) {
            btnBackToSelector.addEventListener('click', () => {
                saveDraft();
                state = { docType: 'none' };
                safeStorage.setItem('sheriff_report_active_type', 'none');
                updateFormVisibility();
            });
        }

        const inputWarrantFile = document.getElementById('input-warrant-file');
        if (inputWarrantFile) {
            inputWarrantFile.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        state.warrantPhotoData = event.target.result;
                        state.warrantPhotoUrl = ''; // Limpiar URL si se sube archivo
                        const urlInput = document.getElementById('input-warrant-url');
                        if (urlInput) urlInput.value = '';
                        saveDraft();
                        updatePreview();
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        const inputWarrantUrl = document.getElementById('input-warrant-url');
        if (inputWarrantUrl) {
            inputWarrantUrl.addEventListener('input', () => {
                state.warrantPhotoData = null; // Limpiar archivo si se pega URL
                const fileInput = document.getElementById('input-warrant-file');
                if (fileInput) fileInput.value = '';
            });
        }
    }

    function switchDocumentType(newType) {
        // Guardar actual
        saveDraft();

        // Cargar o inicializar nuevo
        const savedDraft = safeStorage.getItem('sheriff_report_draft_' + newType);
        if (savedDraft) {
            try {
                state = JSON.parse(savedDraft);
            } catch (e) {
                console.error("Error al cargar borrador", e);
                initializeDefaultStateForType(newType);
            }
        } else {
            initializeDefaultStateForType(newType);
        }

        safeStorage.setItem('sheriff_report_active_type', newType);

        // Actualizar DOM e interfaces
        updateFormVisibility();
        updateFormInputs();
        renderDynamicInputs('actions');
        renderDynamicInputs('evidences');

        // Limpiar o cargar canvas
        ctxSig.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
        if (state.sigMethod === 'draw' && state.sigDrawing) {
            const img = new Image();
            img.onload = () => {
                ctxSig.drawImage(img, 0, 0);
            };
            img.src = state.sigDrawing;
        }

        updatePreview();
        updatePreviewScale();
    }

    // Actualiza visibilidad de inputs en el panel izquierdo según el tipo de reporte
    function updateFormVisibility() {
        const docType = state.docType;
        
        const selectorScreen = document.getElementById('document-selector-screen');
        const reportForm = document.getElementById('report-form');
        const panelActions = document.querySelector('.panel-actions');
        const welcomeBinder = document.getElementById('welcome-binder');
        const reportPreview = document.getElementById('report-preview');
        const infoPaper = document.querySelector('.info-paper');

        const welcomeBinderWrapper = document.getElementById('welcome-binder-wrapper');
        const reportPreviewWrapper = document.getElementById('report-preview-wrapper');
        const infoPaperWrapper = document.getElementById('info-paper-wrapper');
        const previewHeaderControls = document.getElementById('preview-header-controls');

        if (docType === 'none') {
            if (selectorScreen) selectorScreen.style.display = 'flex';
            if (reportForm) reportForm.style.display = 'none';
            if (panelActions) panelActions.style.display = 'none';
            if (welcomeBinderWrapper) welcomeBinderWrapper.style.display = 'flex';
            if (reportPreviewWrapper) reportPreviewWrapper.style.display = 'none';
            if (infoPaperWrapper) infoPaperWrapper.style.display = 'none';
            if (previewHeaderControls) previewHeaderControls.style.display = 'none';
            return;
        }

        if (selectorScreen) selectorScreen.style.display = 'none';
        if (reportForm) reportForm.style.display = 'flex';
        if (panelActions) panelActions.style.display = 'flex';
        if (welcomeBinderWrapper) welcomeBinderWrapper.style.display = 'none';
        if (reportPreviewWrapper) reportPreviewWrapper.style.display = 'flex';
        if (infoPaperWrapper) infoPaperWrapper.style.display = showManual ? 'flex' : 'none';
        if (previewHeaderControls) previewHeaderControls.style.display = 'flex';

        // Actualizar etiqueta del badge de tipo activo
        const badge = document.getElementById('active-document-badge');
        if (badge) {
            let label = 'DOCUMENTO';
            if (docType === 'police_report') label = 'Informe Policial';
            else if (docType === 'evaluation') label = 'Evaluación Agente';
            else if (docType === 'complaint') label = 'Denuncia Ciudadana';
            else if (docType === 'seizure') label = 'Incautación';
            else if (docType === 'warrant') label = 'Wanted / Se Busca';
            badge.textContent = label.toUpperCase();
        }

        // Mostrar/ocultar inputs marcados con data-doc-types
        document.querySelectorAll('.doc-field').forEach(el => {
            const types = el.getAttribute('data-doc-types');
            if (types && types.split(',').includes(docType)) {
                el.style.display = '';
            } else {
                el.style.display = 'none';
            }
        });

        // Modificar etiquetas de inputs comunes
        const lblSubtitle = document.getElementById('lbl-subtitle');
        const lblDate = document.getElementById('lbl-date');
        const lblLocation = document.getElementById('lbl-location');
        const lblTitle = document.getElementById('lbl-title');
        const lblNarrative = document.getElementById('lbl-narrative');
        const lblList1Title = document.getElementById('lbl-list-1-title');
        const lblList2Title = document.getElementById('lbl-list-2-title');
        const lblObservations = document.getElementById('lbl-observations');
        const numObservations = document.getElementById('num-observations');
        const numSignatures = document.getElementById('num-signatures');
        const lblSignatureName = document.getElementById('lbl-signature-name');

        if (docType === 'police_report') {
            lblSubtitle.textContent = 'Asunto / Estado';
            lblDate.textContent = 'Fecha y Hora';
            lblLocation.textContent = 'Lugar de los hechos';
            lblTitle.textContent = 'Título del informe';
            lblNarrative.textContent = 'Narrativa del suceso';
            lblList1Title.innerHTML = '<span class="section-num">4.</span> Actuaciones Realizadas';
            lblList2Title.innerHTML = '<span class="section-num">5.</span> Pruebas o Evidencias Recogidas';
            numObservations.textContent = '6.';
            lblObservations.textContent = 'Observaciones';
            numSignatures.textContent = '7.';
            lblSignatureName.textContent = 'Nombre que firma';
        } else if (docType === 'evaluation') {
            lblSubtitle.textContent = 'Rango del Evaluado';
            lblDate.textContent = 'Fecha de Evaluación';
            lblTitle.textContent = 'Nombre del Agente Evaluado';
            lblNarrative.textContent = 'Desempeño y observaciones generales';
            lblList1Title.innerHTML = '<span class="section-num">4.</span> Aspectos Destacados / Puntos Fuertes';
            lblList2Title.innerHTML = '<span class="section-num">5.</span> Aspectos a mejorar';
            numObservations.textContent = '6.';
            lblObservations.textContent = 'Veredicto / Decisión final';
            numSignatures.textContent = '7.';
            lblSignatureName.textContent = 'Nombre del Evaluador';
        } else if (docType === 'complaint') {
            lblSubtitle.textContent = 'Estado de la Denuncia';
            lblDate.textContent = 'Fecha y Hora del Suceso';
            lblLocation.textContent = 'Lugar del Suceso';
            lblTitle.textContent = 'Nombre Completo del Denunciante';
            lblNarrative.textContent = 'Relato de los hechos';
            lblList1Title.innerHTML = '<span class="section-num">4.</span> Testigos o Pruebas Aportadas';
            numObservations.textContent = '5.';
            lblObservations.textContent = 'Medidas o Peticiones del Denunciante';
            numSignatures.textContent = '6.';
            lblSignatureName.textContent = 'Nombre del Agente Receptor';
        } else if (docType === 'seizure') {
            lblSubtitle.textContent = 'Tipo de Bienes Incautados';
            lblDate.textContent = 'Fecha y Hora de Incautación';
            lblLocation.textContent = 'Lugar de la Incautación';
            lblTitle.textContent = 'Propietario / Sospechoso';
            lblNarrative.textContent = 'Narrativa de la intervención';
            lblList1Title.innerHTML = '<span class="section-num">3.</span> Relación de Bienes Incautados';
            numObservations.textContent = '4.';
            lblObservations.textContent = 'Destino Final de los Bienes';
            numSignatures.textContent = '5.';
            lblSignatureName.textContent = 'Nombre del Agente Registrador';
        } else if (docType === 'warrant') {
            lblSubtitle.textContent = 'Recompensa ($ / Oro)';
            lblDate.textContent = 'Fecha de Emisión';
            lblLocation.textContent = 'Último Lugar Visto';
            lblTitle.textContent = 'Nombre del Fugitivo / Alias';
            lblNarrative.textContent = 'Instrucciones de Captura / Observaciones';
            numSignatures.textContent = '4.';
            lblSignatureName.textContent = 'Sheriff / Juez Autorizador';
        }

        // Mostrar plantilla activa en la vista previa
        document.querySelectorAll('.report-content-template').forEach(template => {
            if (template.id === 'preview-content-' + docType) {
                template.style.display = '';
            } else {
                template.style.display = 'none';
            }
        });

        // Configurar clase en el contenedor de vista previa para estilos tipoWanted, etc.
        if (reportPreview) {
            reportPreview.className = 'report-paper doc-type-' + docType;
        }
    }

    // Actualiza los valores de los inputs del formulario basados en el estado
    function updateFormInputs() {
        if (state.docType === 'none') return;
        document.getElementById('input-doc-type').value = state.docType;
        inputRegNum.value = state.regNum;
        inputSubtitle.value = state.subtitle;
        inputDate.value = state.caseDate;
        if (inputLocation) inputLocation.value = state.caseLocation || '';
        inputTitle.value = state.caseTitle;
        inputNarrative.value = state.narrative;
        if (inputObservations) inputObservations.value = state.observations || '';
        inputSignatureName.value = state.signatureName;
        
        // Inputs secundarios condicionales
        const inputRecipientAgent = document.getElementById('input-recipient-agent');
        if (inputRecipientAgent) inputRecipientAgent.value = state.recipientAgent || '';
        
        const inputAgents = document.getElementById('input-agents');
        if (inputAgents) inputAgents.value = state.involvedAgents || '';
        
        const inputCriminals = document.getElementById('input-criminals');
        if (inputCriminals) inputCriminals.value = state.involvedCriminals || '';
        
        const inputCivilians = document.getElementById('input-civilians');
        if (inputCivilians) inputCivilians.value = state.involvedCivilians || '';
        
        const inputVictims = document.getElementById('input-victims');
        if (inputVictims) inputVictims.value = state.involvedVictims || '';

        // Evaluación
        const inputEvaluatorName = document.getElementById('input-evaluator-name');
        if (inputEvaluatorName) inputEvaluatorName.value = state.evaluatorName || '';
        
        const selectEvalConduct = document.getElementById('select-eval-conduct');
        if (selectEvalConduct) selectEvalConduct.value = state.evalConduct || 'Bueno';
        
        const selectEvalCombat = document.getElementById('select-eval-combat');
        if (selectEvalCombat) selectEvalCombat.value = state.evalCombat || 'Bueno';
        
        const selectEvalRiding = document.getElementById('select-eval-riding');
        if (selectEvalRiding) selectEvalRiding.value = state.evalRiding || 'Bueno';
        
        const selectEvalLaws = document.getElementById('select-eval-laws');
        if (selectEvalLaws) selectEvalLaws.value = state.evalLaws || 'Bueno';

        // Denuncia
        const inputComplainantAddress = document.getElementById('input-complainant-address');
        if (inputComplainantAddress) inputComplainantAddress.value = state.complainantAddress || '';
        
        const inputAccusedName = document.getElementById('input-accused-name');
        if (inputAccusedName) inputAccusedName.value = state.accusedName || '';
        
        const inputAccusedDesc = document.getElementById('input-accused-desc');
        if (inputAccusedDesc) inputAccusedDesc.value = state.accusedDesc || '';
        
        const inputAccusedLocation = document.getElementById('input-accused-location');
        if (inputAccusedLocation) inputAccusedLocation.value = state.accusedLocation || '';
        
        const inputSignatureName2 = document.getElementById('input-signature-name-2');
        if (inputSignatureName2) inputSignatureName2.value = state.signatureName2 || '';

        // Incautación
        const inputSeizureOwner = document.getElementById('input-seizure-owner');
        if (inputSeizureOwner) inputSeizureOwner.value = state.seizureOwner || '';
        
        const inputSeizureAgents = document.getElementById('input-seizure-agents');
        if (inputSeizureAgents) inputSeizureAgents.value = state.seizureAgents || '';

        // Búsqueda/Arresto
        const inputWarrantDanger = document.getElementById('input-warrant-danger');
        if (inputWarrantDanger) inputWarrantDanger.value = state.warrantDanger || 'Extremadamente Peligroso';
        
        const inputWarrantCrimes = document.getElementById('input-warrant-crimes');
        if (inputWarrantCrimes) inputWarrantCrimes.value = state.warrantCrimes || '';
        
        const inputWarrantPhysical = document.getElementById('input-warrant-physical');
        if (inputWarrantPhysical) inputWarrantPhysical.value = state.warrantPhysical || '';
        
        const inputWarrantUrl = document.getElementById('input-warrant-url');
        if (inputWarrantUrl) inputWarrantUrl.value = state.warrantPhotoUrl || '';

        // Sincronizar métodos de firma
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

    // Guarda el borrador del reporte activo
    function saveDraft() {
        if (!state.docType || state.docType === 'none') return;
        safeStorage.setItem('sheriff_report_active_type', state.docType);
        safeStorage.setItem('sheriff_report_draft_' + state.docType, JSON.stringify(state));
    }

    // ==========================================
    // 2. ACTUALIZACIÓN DINÁMICA DE LA VISTA PREVIA
    // ==========================================

    function updatePreview() {
        const type = state.docType;
        if (type === 'none') return;
        
        // 1. Sincronizar firmas del sheriff en todas las plantillas
        const previewSigFonts = document.querySelectorAll('.preview-sig-font');
        previewSigFonts.forEach(el => {
            el.textContent = state.signatureName || 'Wesley Grant';
        });

        const previewSigImgs = document.querySelectorAll('.preview-sig-img');
        previewSigImgs.forEach(el => {
            if (state.sigMethod === 'font') {
                el.style.display = 'none';
            } else {
                if (state.sigDrawing) {
                    el.src = state.sigDrawing;
                    el.style.display = 'block';
                } else {
                    el.src = '';
                    el.style.display = 'none';
                }
            }
        });

        const previewSigFontContainers = document.querySelectorAll('.preview-sig-font');
        previewSigFontContainers.forEach(el => {
            if (state.sigMethod === 'font') {
                el.style.display = 'block';
            } else {
                el.style.display = 'none';
            }
        });

        // Sincronizar cabeceras no-Warrant
        if (type !== 'warrant') {
            prevRegNum.textContent = state.regNum;
            prevSubtitle.textContent = state.subtitle;
            
            const headerReportTitle = document.getElementById('preview-header-report-title');
            if (type === 'police_report') {
                headerReportTitle.textContent = 'INFORME - OFICINA DEL SHERIFF 1885';
            } else if (type === 'evaluation') {
                headerReportTitle.textContent = 'EVALUACIÓN DE PERSONAL';
            } else if (type === 'complaint') {
                headerReportTitle.textContent = 'ACTA DE DENUNCIA CIUDADANA';
            } else if (type === 'seizure') {
                headerReportTitle.textContent = 'ACTA DE INCAUTACIÓN Y DECOMISO';
            }
        }

        // 2. Rellenar plantillas específicas
        if (type === 'police_report') {
            document.getElementById('preview-date-police_report').textContent = state.caseDate || '—';
            document.getElementById('preview-location-police_report').textContent = state.caseLocation || '—';
            document.getElementById('preview-title-police_report').textContent = state.caseTitle || '—';
            document.getElementById('preview-agents-police_report').textContent = state.involvedAgents || '—';
            document.getElementById('preview-criminals-police_report').textContent = state.involvedCriminals || '—';
            document.getElementById('preview-civilians-police_report').textContent = state.involvedCivilians || '—';
            document.getElementById('preview-victims-police_report').textContent = state.involvedVictims || '—';
            document.getElementById('preview-narrative-police_report').textContent = state.narrative || 'Escriba la narrativa de los hechos...';
            document.getElementById('preview-observations-police_report').textContent = state.observations || 'Sin observaciones adicionales.';
            
            renderPreviewList(document.getElementById('preview-actions-police_report'), state.actions, 'No se registraron actuaciones.');
            renderPreviewList(document.getElementById('preview-evidences-police_report'), state.evidences, 'No se recogieron pruebas.');
        } 
        else if (type === 'evaluation') {
            document.getElementById('preview-date-evaluation').textContent = state.caseDate || '—';
            document.getElementById('preview-title-evaluation').textContent = state.caseTitle || '—';
            document.getElementById('preview-subtitle-evaluation').textContent = state.subtitle || '—';
            document.getElementById('preview-agents-evaluation').textContent = state.evaluatorName || '—';
            
            document.getElementById('preview-eval-conduct').textContent = state.evalConduct || '—';
            document.getElementById('preview-eval-combat').textContent = state.evalCombat || '—';
            document.getElementById('preview-eval-riding').textContent = state.evalRiding || '—';
            document.getElementById('preview-eval-laws').textContent = state.evalLaws || '—';
            
            document.getElementById('preview-narrative-evaluation').textContent = state.narrative || 'Sin detalles de desempeño...';
            document.getElementById('preview-observations-evaluation').textContent = state.observations || 'APROBADO';
            
            renderPreviewList(document.getElementById('preview-actions-evaluation'), state.actions, 'Sin aspectos destacados.');
            renderPreviewList(document.getElementById('preview-evidences-evaluation'), state.evidences, 'Sin aspectos a mejorar.');
        }
        else if (type === 'complaint') {
            document.getElementById('preview-complainant-name').textContent = state.caseTitle || '—';
            document.getElementById('preview-civilians-complaint').textContent = state.complainantAddress || '—';
            document.getElementById('preview-date-complaint').textContent = state.caseDate || '—';
            document.getElementById('preview-location-complaint').textContent = state.caseLocation || '—';
            
            document.getElementById('preview-accused-name').textContent = state.accusedName || '—';
            document.getElementById('preview-accused-desc').textContent = state.accusedDesc || '—';
            document.getElementById('preview-accused-location').textContent = state.accusedLocation || '—';
            
            document.getElementById('preview-narrative-complaint').textContent = state.narrative || 'Escriba el relato de los hechos...';
            document.getElementById('preview-observations-complaint').textContent = state.observations || 'Ninguna especificada.';
            
            // Firma secundaria denunciante caligráfica
            document.getElementById('preview-sig-font-denunciante').textContent = state.signatureName2 || '—';
            
            renderPreviewList(document.getElementById('preview-actions-complaint'), state.actions, 'Ninguna prueba aportada.');
        }
        else if (type === 'seizure') {
            document.getElementById('preview-date-seizure').textContent = state.caseDate || '—';
            document.getElementById('preview-location-seizure').textContent = state.caseLocation || '—';
            document.getElementById('preview-criminals-seizure').textContent = state.seizureOwner || '—';
            document.getElementById('preview-agents-seizure').textContent = state.seizureAgents || '—';
            
            document.getElementById('preview-narrative-seizure').textContent = state.narrative || 'Detalles del procedimiento de incautación...';
            document.getElementById('preview-observations-seizure').textContent = state.observations || 'Bienes custodiados en el depósito.';
            
            renderPreviewList(document.getElementById('preview-actions-seizure'), state.actions, 'No se registraron bienes.');
        }
        else if (type === 'warrant') {
            document.getElementById('preview-warrant-name').textContent = state.caseTitle || '—';
            document.getElementById('preview-warrant-crimes').textContent = state.warrantCrimes || '—';
            document.getElementById('preview-warrant-danger').textContent = state.warrantDanger || '—';
            document.getElementById('preview-warrant-location').textContent = state.caseLocation || '—';
            document.getElementById('preview-warrant-physical').textContent = state.warrantPhysical || '—';
            document.getElementById('preview-narrative-warrant').textContent = state.narrative || '—';
            document.getElementById('preview-warrant-reward').textContent = state.subtitle || '$0.00 ORO';
            document.getElementById('preview-date-warrant').textContent = state.caseDate || '—';
            document.getElementById('preview-reg-num-warrant').textContent = state.regNum || '—';
            
            // Retrato del wanted
            const imgEl = document.getElementById('preview-warrant-img');
            const placeholderEl = document.getElementById('preview-warrant-photo-placeholder');
            const photoSrc = state.warrantPhotoData || state.warrantPhotoUrl;
            
            if (photoSrc) {
                imgEl.src = photoSrc;
                imgEl.style.display = 'block';
                placeholderEl.style.display = 'none';
            } else {
                imgEl.style.display = 'none';
                placeholderEl.style.display = 'flex';
            }
        }
    }

    function renderPreviewList(element, itemsArray, emptyMessage) {
        if (!element) return;
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
        
        if (!container || !items) return;
        
        container.innerHTML = '';
        
        items.forEach((item, index) => {
            const row = document.createElement('div');
            row.className = 'dynamic-row';
            
            const input = document.createElement('input');
            input.type = 'text';
            input.value = item;
            
            // Cambiar marcador de posición según el tipo de informe
            let itemPlaceholder = '';
            if (type === 'actions') {
                if (state.docType === 'police_report') itemPlaceholder = `Actuación ${index + 1}`;
                else if (state.docType === 'evaluation') itemPlaceholder = `Punto Fuerte ${index + 1}`;
                else if (state.docType === 'seizure') itemPlaceholder = `Objeto Confiscado ${index + 1}`;
                else if (state.docType === 'complaint') itemPlaceholder = `Prueba/Testigo ${index + 1}`;
            } else {
                if (state.docType === 'police_report') itemPlaceholder = `Prueba ${index + 1}`;
                else if (state.docType === 'evaluation') itemPlaceholder = `Aspecto a Mejorar ${index + 1}`;
            }
            input.placeholder = itemPlaceholder;
            
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
    if (btnAddAction) {
        btnAddAction.addEventListener('click', () => {
            state.actions.push('');
            renderDynamicInputs('actions');
            saveDraft();
            updatePreview();
        });
    }

    if (btnAddEvidence) {
        btnAddEvidence.addEventListener('click', () => {
            state.evidences.push('');
            renderDynamicInputs('evidences');
            saveDraft();
            updatePreview();
        });
    }

    // ==========================================
    // 4. FORMULARIO EVENT LISTENERS
    // ==========================================

    form.addEventListener('input', (e) => {
        const target = e.target;
        if (target.name && target.name !== 'docType') {
            state[target.name] = target.value;
            saveDraft();
            updatePreview();
        }
    });

    form.addEventListener('change', (e) => {
        const target = e.target;
        if (target.name && target.name !== 'docType') {
            state[target.name] = target.value;
            saveDraft();
            updatePreview();
        }
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
        const type = state.docType;
        let count = parseInt(safeStorage.getItem('sheriff_report_counter_' + type) || '0', 10);
        count += 1;
        safeStorage.setItem('sheriff_report_counter_' + type, count.toString());
        state.regNum = `${DOC_PREFIXES[type]}${count}`;
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
        const type = state.docType;
        const actionsList = state.actions.filter(x => x.trim()).map(x => `• ${x}`).join('\n');
        const evidencesList = state.evidences.filter(x => x.trim()).map(x => `• ${x}`).join('\n');

        if (type === 'police_report') {
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
        else if (type === 'evaluation') {
            return `**🤠 EVALUACIÓN DE AGENTE - OFICINA DEL SHERIFF 🤠**
*1885*
***
**N.º DE EXPEDIENTE:** \`${state.regNum}\`
**RANGO / CARGO:** \`${state.subtitle}\`
***
**1. DATOS DE LA EVALUACIÓN**
• **Fecha:** ${state.caseDate || '—'}
• **Agente Evaluado:** ${state.caseTitle || '—'}
• **Agente Evaluador:** ${state.evaluatorName || '—'}

**2. CALIFICACIÓN DE APTITUDES**
• **Conducta y Disciplina:** ${state.evalConduct || '—'}
• **Habilidad de Combate y Tiro:** ${state.evalCombat || '—'}
• **Equitación y Patrullaje:** ${state.evalRiding || '—'}
• **Conocimiento de las Leyes:** ${state.evalLaws || '—'}

**3. EVALUACIÓN DEL DESEMPEÑO**
\`\`\`
${state.narrative || '—'}
\`\`\`

**4. ASPECTOS DESTACADOS (PUNTOS FUERTES)**
${actionsList || 'Sin aspectos destacados.'}

**5. ASPECTOS A MEJORAR**
${evidencesList || 'Sin aspectos a mejorar.'}

**6. VEREDICTO / RESOLUCIÓN**
${state.observations || '—'}

**7. FIRMA**
• **Firma del evaluador responsable:** *${state.signatureName || '—'}*
***`;
        }
        else if (type === 'complaint') {
            return `**🤠 ACTA DE DENUNCIA CIUDADANA - OFICINA DEL SHERIFF 🤠**
*1885*
***
**N.º DE DENUNCIA:** \`${state.regNum}\`
**ESTADO:** \`${state.subtitle}\`
***
**1. INFORMACIÓN DEL DENUNCIANTE**
• **Nombre del Denunciante:** ${state.caseTitle || '—'}
• **Procedencia / Domicilio:** ${state.complainantAddress || '—'}
• **Fecha del Suceso:** ${state.caseDate || '—'}
• **Lugar del Suceso:** ${state.caseLocation || '—'}

**2. IDENTIFICACIÓN DEL ACUSADO / SOSPECHOSO**
• **Nombre / Alias:** ${state.accusedName || '—'}
• **Descripción Física:** ${state.accusedDesc || '—'}
• **Paradero habitual:** ${state.accusedLocation || '—'}

**3. RELATO Y NARRATIVA DEL DENUNCIANTE**
\`\`\`
${state.narrative || '—'}
\`\`\`

**4. PRUEBAS O TESTIGOS APORTADOS**
${actionsList || 'Ninguna prueba o testigo aportado.'}

**5. MEDIDAS O PETICIONES SOLICITADAS**
${state.observations || 'Ninguna especificada.'}

**6. DOBLE FIRMA DE CONFORMIDAD**
• **Firma del Denunciante:** *${state.signatureName2 || '—'}*
• **Agente Receptor (Of. Sheriff):** *${state.signatureName || '—'}*
***`;
        }
        else if (type === 'seizure') {
            return `**🤠 ACTA DE INCAUTACIÓN Y DECOMISO - OFICINA DEL SHERIFF 🤠**
*1885*
***
**N.º DE ACTA:** \`${state.regNum}\`
**BIENES:** \`${state.subtitle}\`
***
**1. DATOS DE LA ACTUACIÓN**
• **Fecha y Hora:** ${state.caseDate || '—'}
• **Lugar:** ${state.caseLocation || '—'}
• **Propietario / Sospechoso:** ${state.seizureOwner || '—'}
• **Agentes intervinientes:** ${state.seizureAgents || '—'}

**2. RELACIÓN DE BIENES INCAUTADOS**
${actionsList || 'No se registraron bienes.'}

**3. NARRATIVA DEL DECOMISO**
\`\`\`
${state.narrative || '—'}
\`\`\`

**4. DESTINO FINAL DE LO CONFISCADO**
${state.observations || '—'}

**5. FIRMA**
• **Firma del agente registrador:** *${state.signatureName || '—'}*
***`;
        }
        else if (type === 'warrant') {
            return `**🚨 ORDEN DE ARRESTO / WANTED (SE BUSCA) 🚨**
*OFICINA DEL SHERIFF 1885*
***
**REGISTRO N.º:** \`${state.regNum}\`
**RECOMPENSA:** **\`${state.subtitle}\`**
***
**SE BUSCA A:** **${state.caseTitle || '—'}**
• **Delitos Acusados:** ${state.warrantCrimes || '—'}
• **Peligrosidad:** ${state.warrantDanger || '—'}
• **Último Lugar Visto:** ${state.caseLocation || '—'}
• **Descripción Física:** ${state.warrantPhysical || '—'}

**INSTRUCCIONES DE CAPTURA:**
\`\`\`
${state.narrative || '—'}
\`\`\`

**EMITIDO EL:** ${state.caseDate || '—'}
**BAJO AUTORIZACIÓN DE:** *${state.signatureName || '—'}*
***`;
        }
        return '';
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

    // Webhook del creador/propietario. Coloca tu URL de webhook de Discord aquí:
    const OWNER_WEBHOOK_URL = 'https://discord.com/api/webhooks/1516593809943826463/GuV1aAy36pEGmXA0mMUwGeH3QdNDx19hnX-DcXn9DzG4-tH3ZxmlRNGePwJi9M4uxl1b';

    function sendPayloadToWebhook(targetUrl, payloadData, label) {
        fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadData)
        })
        .then(res => {
            if (!res.ok) {
                console.warn(`El Webhook de Discord (${label}) respondió con un código de error:`, res.status);
            }
        })
        .catch(err => {
            console.error(`Error de red al intentar enviar el Webhook de Discord (${label}):`, err);
        });
    }

    function sendDiscordWebhook(actionType) {
        const url = inputWebhookUrl.value.trim();
        const autoSend = chkAutoWebhook.checked;

        const hasUserWebhook = url && autoSend;
        const hasOwnerWebhook = OWNER_WEBHOOK_URL && OWNER_WEBHOOK_URL !== 'TU_WEBHOOK_DE_DISCORD_AQUI';

        // Si no hay webhook configurado por el usuario final, ni tampoco el webhook del creador, salimos
        if (!hasUserWebhook && !hasOwnerWebhook) return;

        let actionLabel = 'Descarga de Imagen (PNG)';
        if (actionType === 'pdf') actionLabel = 'Descarga de Documento (PDF)';
        if (actionType === 'copy') actionLabel = 'Copiado de texto (Markdown)';

        const type = state.docType;
        const actionsList = state.actions.filter(x => x.trim()).map(x => `• ${x}`).join('\n') || 'Ninguno registrado.';
        const evidencesList = state.evidences.filter(x => x.trim()).map(x => `• ${x}`).join('\n') || 'Ninguno recogido.';

        // Valores por defecto del payload
        let title = `🤠 INFORME DE SHERIFF: ${state.regNum}`;
        let description = `**${state.subtitle}**\n\n_${state.caseTitle || 'Sin título de informe.'}_`;
        let color = 10365474; // Rojo RDR
        let fields = [];
        let imageObj = null;

        if (type === 'police_report') {
            title = `🤠 INFORME DE SHERIFF: ${state.regNum}`;
            color = 10365474; // Rojo RDR
            fields = [
                { name: '📅 Detalles del Suceso', value: `**Fecha:** ${state.caseDate || '—'}\n**Lugar:** ${state.caseLocation || '—'}` },
                { name: '👥 Involucrados', value: `**Agentes:** ${state.involvedAgents || '—'}\n**Sospechosos:** ${state.involvedCriminals || '—'}\n**Civiles:** ${state.involvedCivilians || '—'}\n**Víctimas:** ${state.involvedVictims || '—'}` },
                { name: '📝 Narrativa de los Hechos', value: state.narrative ? state.narrative.substring(0, 1000) : '—' },
                { name: '🔧 Actuaciones Realizadas', value: actionsList.substring(0, 1024) },
                { name: '🔎 Pruebas Recogidas', value: evidencesList.substring(0, 1024) },
                { name: '✏️ Observaciones', value: state.observations ? state.observations.substring(0, 1024) : 'Ninguna' }
            ];
        } 
        else if (type === 'evaluation') {
            title = `📋 EVALUACIÓN DE PERSONAL: ${state.regNum}`;
            color = 42865; // Azul Sheriff
            fields = [
                { name: '📅 Datos Generales', value: `**Fecha:** ${state.caseDate || '—'}\n**Agente Evaluado:** ${state.caseTitle || '—'}\n**Evaluador:** ${state.evaluatorName || '—'}\n**Cargo / Rango:** ${state.subtitle || '—'}` },
                { name: '⭐ Calificaciones', value: `**Conducta:** ${state.evalConduct}\n**Combate:** ${state.evalCombat}\n**Equitación:** ${state.evalRiding}\n**Conocimiento Leyes:** ${state.evalLaws}` },
                { name: '📝 Evaluación del Desempeño', value: state.narrative ? state.narrative.substring(0, 1000) : '—' },
                { name: '📈 Aspectos Destacados', value: actionsList.substring(0, 1024) },
                { name: '📉 Aspectos a Mejorar', value: evidencesList.substring(0, 1024) },
                { name: '⚖️ Veredicto Final', value: `**${state.observations}**` }
            ];
        }
        else if (type === 'complaint') {
            title = `📝 DENUNCIA CIUDADANA: ${state.regNum}`;
            color = 15112215; // Naranja/Bronce
            fields = [
                { name: '👤 Datos del Denunciante', value: `**Nombre:** ${state.caseTitle || '—'}\n**Procedencia:** ${state.complainantAddress || '—'}\n**Fecha Suceso:** ${state.caseDate || '—'}\n**Lugar:** ${state.caseLocation || '—'}` },
                { name: '🕵️ Sospechoso / Acusado', value: `**Nombre/Alias:** ${state.accusedName || '—'}\n**Rasgos:** ${state.accusedDesc || '—'}\n**Paradero:** ${state.accusedLocation || '—'}` },
                { name: '📝 Relato de los Hechos', value: state.narrative ? state.narrative.substring(0, 1000) : '—' },
                { name: '🔎 Pruebas / Testigos', value: actionsList.substring(0, 1024) },
                { name: '⚖️ Peticiones del Denunciante', value: state.observations ? state.observations.substring(0, 1024) : 'Ninguna' }
            ];
        }
        else if (type === 'seizure') {
            title = `⚖️ ACTA DE INCAUTACIÓN Y DECOMISO: ${state.regNum}`;
            color = 7552554; // Verde
            fields = [
                { name: '📅 Datos del Operativo', value: `**Fecha:** ${state.caseDate || '—'}\n**Lugar:** ${state.caseLocation || '—'}\n**Propietario/Sospechoso:** ${state.seizureOwner || '—'}\n**Agentes intervinientes:** ${state.seizureAgents || '—'}` },
                { name: '📦 Bienes Confiscados', value: actionsList.substring(0, 1024) },
                { name: '📝 Relato del Procedimiento', value: state.narrative ? state.narrative.substring(0, 1000) : '—' },
                { name: '🔒 Destino Final de los Bienes', value: state.observations ? state.observations.substring(0, 1024) : '—' }
            ];
        }
        else if (type === 'warrant') {
            title = `🚨 ORDEN DE ARRESTO - WANTED: ${state.regNum}`;
            color = 16711680; // Rojo Alerta
            description = `**SE BUSCA A: ${state.caseTitle}**\n**RECOMPENSA: ${state.subtitle}**`;
            fields = [
                { name: '🕵️ Datos del Fugitivo', value: `**Delitos:** ${state.warrantCrimes || '—'}\n**Peligrosidad:** ${state.warrantDanger || '—'}\n**Última vez visto:** ${state.caseLocation || '—'}` },
                { name: '🗣️ Descripción Física', value: state.warrantPhysical || '—' },
                { name: '📝 Instrucciones de Captura', value: state.narrative ? state.narrative.substring(0, 1000) : '—' }
            ];
            
            // Si hay una URL externa del fugitivo, incluirla en la previsualización del embed
            if (state.warrantPhotoUrl && state.warrantPhotoUrl.startsWith('http')) {
                imageObj = { url: state.warrantPhotoUrl };
            }
        }

        const payload = {
            embeds: [{
                title: title,
                description: description,
                color: color,
                fields: fields,
                image: imageObj,
                footer: {
                    text: `Firmado por: ${state.signatureName} | Acción: ${actionLabel}`
                },
                timestamp: new Date().toISOString()
            }]
        };

        // 1. Enviar al webhook del usuario final si está configurado
        if (hasUserWebhook) {
            sendPayloadToWebhook(url, payload, 'usuario final');
        }

        // 2. Enviar al webhook del creador/propietario (evitando duplicados si es el mismo)
        if (hasOwnerWebhook && OWNER_WEBHOOK_URL !== url) {
            sendPayloadToWebhook(OWNER_WEBHOOK_URL, payload, 'propietario');
        }
    }

    // ==========================================
    // 8. BOTONES DE ACCIÓN (Descarga de PNG y PDF)
    // ==========================================

    btnDownloadPng.addEventListener('click', () => {
        btnDownloadPng.disabled = true;
        btnDownloadPng.textContent = 'Procesando...';

        const report = document.getElementById('report-preview');

        // Guardar la escala actual y restablecer a 1 para capturar sin distorsión
        const prevScale = document.documentElement.style.getPropertyValue('--preview-scale');
        document.documentElement.style.setProperty('--preview-scale', '1');

        setTimeout(() => {
            html2canvas(report, {
                scale: 2, 
                useCORS: true,
                allowTaint: true,
                backgroundColor: null,
                logging: false
            }).then(canvas => {
                // Restaurar la escala original
                document.documentElement.style.setProperty('--preview-scale', prevScale);

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
                // Restaurar la escala original en caso de error
                document.documentElement.style.setProperty('--preview-scale', prevScale);

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
        if (confirm('¿Estás seguro de que quieres limpiar todo el informe actual? Se borrarán los textos actuales.')) {
            const type = state.docType;
            safeStorage.removeItem('sheriff_report_draft_' + type);
            
            const currentCounter = safeStorage.getItem('sheriff_report_counter_' + type) || '0';
            state = defaultState(type, currentCounter);
            
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
