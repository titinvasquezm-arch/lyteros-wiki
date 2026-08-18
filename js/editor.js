// Lyteros Anvil - Módulo del Editor Wiki y Vista Previa
import { db } from './db.js';
import { TEMPLATES, getTemplateIcon } from './templates.js';
import { slugify, renderMarkdown, extractLinks, escapeHtml, fileToBase64 } from './utils.js';

class WikiEditor {
    constructor() {
        this.activeArticle = null;
        this.articles = [];
        this.editMode = true; // true = Edit, false = Preview

        // DOM elements
        this.treeContainer = document.getElementById('articles-tree-view');
        this.searchField = document.getElementById('explorer-search');
        this.filterDropdown = document.getElementById('explorer-template-filter');
        
        this.workspacePanel = document.getElementById('wiki-workspace-panel');
        this.emptyState = document.getElementById('wiki-empty-state');
        this.activeEditor = document.getElementById('wiki-active-editor');
        
        this.titleInput = document.getElementById('article-title-input');
        this.templateBadge = document.getElementById('article-template-badge');
        this.editedLabel = document.getElementById('article-edited-label');
        
        this.btnEdit = document.getElementById('btn-edit-mode');
        this.btnPreview = document.getElementById('btn-preview-mode');
        this.btnSave = document.getElementById('save-article-btn');
        this.btnDelete = document.getElementById('delete-article-btn');
        this.btnNew = document.getElementById('new-article-btn');
        
        this.paneEdit = document.getElementById('pane-edit');
        this.panePreview = document.getElementById('pane-preview');
        this.propertiesForm = document.getElementById('article-properties-form');
        this.propertiesPreview = document.getElementById('article-properties-preview');
        this.textarea = document.getElementById('article-content-textarea');
        this.markdownRendered = document.getElementById('markdown-rendered-content');
        this.backlinksContainer = document.getElementById('article-backlinks-list');
        
        this.autocompleteBox = document.getElementById('autocomplete-box');
        this.propertiesToggle = document.getElementById('properties-toggle');
        this.imageUploadInput = document.getElementById('editor-image-upload-input');

        this.selectedAutocompleteIndex = 0;
        this.autocompleteQuery = '';
        this.autocompleteStartIdx = -1;
    }

    init(onArticleChangedCallback) {
        this.onArticleChanged = onArticleChangedCallback || (() => {});
        this.registerEvents();
        this.loadArticlesList();
    }

    registerEvents() {
        // Search & Filter sidebar
        this.searchField.addEventListener('input', () => this.renderSidebarTree());
        this.filterDropdown.addEventListener('change', () => this.renderSidebarTree());

        // Buttons
        this.btnNew.addEventListener('click', () => this.createNewArticlePrompt());
        this.btnSave.addEventListener('click', () => this.saveCurrentArticle());
        this.btnDelete.addEventListener('click', () => this.deleteCurrentArticle());
        
        this.btnEdit.addEventListener('click', () => this.setMode(true));
        this.btnPreview.addEventListener('click', () => this.setMode(false));
        
        // Properties toggle collapse
        this.propertiesToggle.addEventListener('click', () => {
            this.propertiesForm.classList.toggle('collapsed');
            const icon = this.propertiesToggle.querySelector('i');
            if (this.propertiesForm.classList.contains('collapsed')) {
                icon.setAttribute('data-lucide', 'chevron-right');
            } else {
                icon.setAttribute('data-lucide', 'chevron-down');
            }
            lucide.createIcons();
        });

        // Editor inputs auto-save on blur for convenience
        this.titleInput.addEventListener('blur', () => {
            if (this.activeArticle && this.titleInput.value.trim() !== this.activeArticle.title) {
                // Actualizar título local temporalmente
                this.activeArticle.title = this.titleInput.value.trim();
            }
        });

        // Autocomplete & Link typing detector
        this.textarea.addEventListener('input', (e) => this.handleTextareaInput(e));
        this.textarea.addEventListener('keydown', (e) => this.handleTextareaKeydown(e));

        // Global preview links click catcher
        this.markdownRendered.addEventListener('click', (e) => this.handlePreviewClicks(e));
        this.backlinksContainer.addEventListener('click', (e) => this.handlePreviewClicks(e));

        // Botones de la barra de formato rápido
        const toolbarButtons = document.querySelectorAll('#editor-format-toolbar .toolbar-btn');
        toolbarButtons.forEach(btn => {
            // Evitar que el botón robe el foco y deseleccione el texto en el textarea
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
            });

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const format = btn.getAttribute('data-format');
                this.insertFormat(format);
            });
        });

        if (this.imageUploadInput) {
            this.imageUploadInput.addEventListener('change', (e) => this.handleImageUpload(e));
        }

        const mobileBackBtn = document.getElementById('wiki-mobile-back-btn');
        if (mobileBackBtn) {
            mobileBackBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.activeArticle = null;
                this.activeEditor.classList.add('hidden');
                this.emptyState.classList.remove('hidden');
            });
        }
    }

    async loadArticlesList(selectArticleId = null) {
        this.articles = await db.getAllArticles();
        this.renderSidebarTree();
        this.onArticleChanged(); // Notificar cambio para actualizar grafos y mapas

        if (selectArticleId) {
            this.loadArticle(selectArticleId);
        } else if (this.activeArticle) {
            // Recargar el actual si estaba abierto
            this.loadArticle(this.activeArticle.id);
        }
    }

    renderSidebarTree() {
        const query = this.searchField.value.toLowerCase().trim();
        const typeFilter = this.filterDropdown.value;

        // Filtrar artículos
        const filtered = this.articles.filter(art => {
            const matchesQuery = art.title.toLowerCase().includes(query) || art.content.toLowerCase().includes(query);
            const matchesFilter = typeFilter ? art.type === typeFilter : true;
            return matchesQuery && matchesFilter;
        });

        // Agrupar por tipo (como carpetas)
        const groups = {
            general: [],
            character: [],
            location: [],
            faction: [],
            item: [],
            event: []
        };

        filtered.forEach(art => {
            if (groups[art.type]) {
                groups[art.type].push(art);
            } else {
                groups.general.push(art);
            }
        });

        this.treeContainer.innerHTML = '';

        Object.keys(groups).forEach(type => {
            const items = groups[type];
            if (items.length === 0) return;

            const folder = document.createElement('div');
            folder.className = 'explorer-folder';

            const templateMeta = TEMPLATES[type] || TEMPLATES.general;
            folder.innerHTML = `
                <div class="folder-title">
                    <i data-lucide="${templateMeta.icon}"></i>
                    <span>${templateMeta.label}s</span>
                </div>
                <div class="folder-items"></div>
            `;

            const itemsContainer = folder.querySelector('.folder-items');
            items.sort((a, b) => a.title.localeCompare(b.title)).forEach(art => {
                const itemDiv = document.createElement('div');
                itemDiv.className = `article-list-item ${this.activeArticle && this.activeArticle.id === art.id ? 'active' : ''}`;
                itemDiv.setAttribute('data-id', art.id);
                itemDiv.innerHTML = `
                    <i data-lucide="file-text"></i>
                    <span>${escapeHtml(art.title)}</span>
                `;
                itemDiv.addEventListener('click', () => this.loadArticle(art.id));
                itemsContainer.appendChild(itemDiv);
            });

            this.treeContainer.appendChild(folder);
        });

        if (this.treeContainer.children.length === 0) {
            this.treeContainer.innerHTML = '<p class="empty-state">No se encontraron artículos.</p>';
        }

        lucide.createIcons();
    }

    async loadArticle(id) {
        const article = await db.getArticle(id);
        if (!article) {
            console.error("Artículo no encontrado:", id);
            return;
        }

        this.activeArticle = article;
        
        // UI updates
        this.emptyState.classList.add('hidden');
        this.activeEditor.classList.remove('hidden');

        this.titleInput.value = article.title;
        const template = TEMPLATES[article.type] || TEMPLATES.general;
        this.templateBadge.textContent = `Plantilla: ${template.label}`;
        
        const dateStr = new Date(article.updatedAt || Date.now()).toLocaleDateString() + ' ' + new Date(article.updatedAt || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        this.editedLabel.textContent = `Última edición: ${dateStr}`;

        this.textarea.value = article.content || '';

        // Inject template specific form
        this.renderPropertiesForm(article);

        // Render preview mode standard
        this.setMode(false); // Default to view/read mode for premium wiki experience

        // Highlight active sidebar item
        document.querySelectorAll('.article-list-item').forEach(el => {
            el.classList.toggle('active', el.getAttribute('data-id') === id);
        });
    }

    renderPropertiesForm(article) {
        const template = TEMPLATES[article.type] || TEMPLATES.general;
        this.propertiesForm.innerHTML = '';
        
        if (template.fields.length === 0) {
            this.propertiesForm.innerHTML = '<p class="help-text col-span-3">Esta plantilla no requiere atributos específicos.</p>';
            return;
        }

        template.fields.forEach(field => {
            const wrapper = document.createElement('div');
            wrapper.className = 'property-input-wrapper';
            wrapper.innerHTML = `<label for="prop-${field.key}">${field.label}</label>`;

            const val = article.metadata[field.key] || '';

            if (field.type === 'select') {
                const select = document.createElement('select');
                select.id = `prop-${field.key}`;
                select.className = 'property-field';
                select.innerHTML = `<option value="">-- Sin Definir --</option>`;
                field.options.forEach(opt => {
                    select.innerHTML += `<option value="${opt}" ${val === opt ? 'selected' : ''}>${opt}</option>`;
                });
                wrapper.appendChild(select);
            } else {
                const input = document.createElement('input');
                input.type = 'text';
                input.id = `prop-${field.key}`;
                input.className = 'property-field';
                input.value = val;
                input.placeholder = field.placeholder || '';
                wrapper.appendChild(input);
            }

            this.propertiesForm.appendChild(wrapper);
        });
    }

    setMode(editMode) {
        // Forzar siempre modo de vista (lectura) en esta copia del proyecto
        this.editMode = false;
        if (this.btnEdit) this.btnEdit.classList.toggle('active', false);
        if (this.btnPreview) this.btnPreview.classList.toggle('active', true);
        if (this.paneEdit) this.paneEdit.classList.toggle('active', false);
        if (this.panePreview) this.panePreview.classList.toggle('active', true);

        this.renderPreview();
    }

    renderPreview() {
        if (!this.activeArticle) return;

        // Render properties row
        const template = TEMPLATES[this.activeArticle.type] || TEMPLATES.general;
        this.propertiesPreview.innerHTML = '';
        let hasProps = false;

        template.fields.forEach(field => {
            const val = this.activeArticle.metadata[field.key];
            if (val) {
                hasProps = true;
                this.propertiesPreview.innerHTML += `
                    <div class="preview-prop-item">
                        <span class="preview-prop-label">${field.label}</span>
                        <span class="preview-prop-value">${escapeHtml(val)}</span>
                    </div>
                `;
            }
        });

        if (!hasProps) {
            this.propertiesPreview.innerHTML = '<span class="empty-state-text">Sin atributos definidos. Edita para añadirlos.</span>';
        }

        // Render Markdown content
        this.markdownRendered.innerHTML = renderMarkdown(this.textarea.value, this.articles);

        // Cargar imágenes incrustadas de IndexedDB de forma asíncrona
        this.loadEmbeddedImages();

        // Render Backlinks
        this.renderBacklinks();
    }

    renderBacklinks() {
        this.backlinksContainer.innerHTML = '';
        
        // Encontrar artículos que enlazan a este
        const currentTitle = this.activeArticle.title.toLowerCase().trim();
        const currentId = this.activeArticle.id;

        const linksToMe = this.articles.filter(art => {
            if (art.id === currentId) return false;
            const extracted = extractLinks(art.content).map(l => l.toLowerCase());
            return extracted.includes(currentTitle) || extracted.includes(currentId);
        });

        if (linksToMe.length === 0) {
            this.backlinksContainer.innerHTML = '<p class="empty-state-text">Ningún otro artículo enlaza a este todavía.</p>';
            return;
        }

        linksToMe.forEach(art => {
            const card = document.createElement('div');
            card.className = 'backlink-card';
            card.setAttribute('data-article-id', art.id);
            
            // Buscar un snippet
            let snippet = 'Ver referencias...';
            const index = art.content.toLowerCase().indexOf(currentTitle);
            if (index !== -1) {
                const start = Math.max(0, index - 30);
                const end = Math.min(art.content.length, index + currentTitle.length + 40);
                snippet = '...' + art.content.slice(start, end).replace(/\n/g, ' ') + '...';
            }

            card.innerHTML = `
                <div class="backlink-title" data-article-id="${art.id}">${escapeHtml(art.title)}</div>
                <div class="backlink-snippet" data-article-id="${art.id}">${escapeHtml(snippet)}</div>
            `;
            this.backlinksContainer.appendChild(card);
        });
    }

    async saveCurrentArticle() {
        if (!this.activeArticle) return;

        const newTitle = this.titleInput.value.trim();
        if (!newTitle) {
            alert("El artículo debe tener un título.");
            return;
        }

        // Si cambia el título, comprobar colisiones
        if (newTitle !== this.activeArticle.title) {
            const idMatch = this.articles.some(art => art.title.toLowerCase() === newTitle.toLowerCase() && art.id !== this.activeArticle.id);
            if (idMatch) {
                alert("Ya existe un artículo con este título.");
                return;
            }
        }

        this.activeArticle.title = newTitle;
        this.activeArticle.content = this.textarea.value;

        // Leer propiedades de metadatos del formulario
        const template = TEMPLATES[this.activeArticle.type] || TEMPLATES.general;
        this.activeArticle.metadata = {};
        template.fields.forEach(field => {
            const input = document.getElementById(`prop-${field.key}`);
            if (input) {
                this.activeArticle.metadata[field.key] = input.value;
            }
        });

        // Guardar en la base de datos
        await db.saveArticle(this.activeArticle);
        
        // Recargar listas
        await this.loadArticlesList(this.activeArticle.id);
    }

    async deleteCurrentArticle() {
        if (!this.activeArticle) return;

        if (confirm(`¿Estás seguro de que deseas eliminar el artículo "${this.activeArticle.title}"?`)) {
            await db.deleteArticle(this.activeArticle.id);
            
            // Remover pines vinculados a este artículo
            const pins = await db.getPins();
            const matchingPins = pins.filter(p => p.linkId === this.activeArticle.id);
            for (let pin of matchingPins) {
                await db.deletePin(pin.id);
            }

            // Remover eventos vinculados
            const events = await db.getTimeline();
            const matchingEvents = events.filter(e => e.linkId === this.activeArticle.id);
            for (let ev of matchingEvents) {
                ev.linkId = '';
                await db.saveTimelineEvent(ev);
            }

            this.activeArticle = null;
            this.activeEditor.classList.add('hidden');
            this.emptyState.classList.remove('hidden');
            
            await this.loadArticlesList();
        }
    }

    createNewArticlePrompt(prefilledTitle = '', forcedType = null) {
        const title = prefilledTitle || prompt("Ingresa el título del nuevo artículo:");
        if (!title || !title.trim()) return;

        const id = slugify(title);
        // Comprobar si ya existe
        const existing = this.articles.find(art => art.id === id);
        if (existing) {
            this.loadArticle(existing.id);
            return;
        }

        let type = forcedType;
        if (!type) {
            // Preguntar tipo
            const choices = Object.keys(TEMPLATES).map(k => `${k} (${TEMPLATES[k].label})`).join(', ');
            const typeInput = prompt(`Selecciona el tipo de plantilla (${choices}):`, 'general');
            if (typeInput === null) return; // cancelado
            type = typeInput.toLowerCase().trim();
            if (!TEMPLATES[type]) type = 'general';
        }

        const newArt = {
            id,
            title: title.trim(),
            type,
            content: `# ${title.trim()}\n\nComienza a escribir aquí...`,
            metadata: {},
            tags: [],
            updatedAt: Date.now()
        };

        db.saveArticle(newArt).then(() => {
            this.loadArticlesList(id);
        });
    }

    // Manejador de clics en la Vista Previa (Redirección de enlaces bidireccionales)
    handlePreviewClicks(e) {
        const wikiLink = e.target.closest('.wiki-link');
        const backlinkCard = e.target.closest('.backlink-card');
        
        if (wikiLink) {
            e.preventDefault();
            const articleId = wikiLink.getAttribute('data-article-id');
            const targetTitle = wikiLink.getAttribute('data-target-title');

            if (articleId) {
                this.loadArticle(articleId);
            } else if (targetTitle) {
                // Es un enlace roto, preguntar si se desea crear
                if (confirm(`El artículo "${targetTitle}" no existe. ¿Deseas crearlo ahora?`)) {
                    // Si el nombre sugiere un lugar, por defecto forzar tipo location
                    const typeHint = prompt("Selecciona el tipo de plantilla (character, location, faction, item, event, general):", "general");
                    const validatedType = TEMPLATES[typeHint] ? typeHint : "general";
                    this.createNewArticlePrompt(targetTitle, validatedType);
                }
            }
        } else if (backlinkCard) {
            const articleId = backlinkCard.getAttribute('data-article-id');
            if (articleId) {
                this.loadArticle(articleId);
            }
        }
    }

    // --- AUTOCOMPLETE [[ LINK LOGIC ---
    handleTextareaInput(e) {
        const text = this.textarea.value;
        const cursorIdx = this.textarea.selectionStart;
        const textBeforeCursor = text.substring(0, cursorIdx);
        
        // Detectar si el usuario está escribiendo un enlace bidireccional [[
        const openLinkIdx = textBeforeCursor.lastIndexOf('[[');
        const closeLinkIdx = textBeforeCursor.lastIndexOf(']]');

        if (openLinkIdx !== -1 && openLinkIdx > closeLinkIdx) {
            // El cursor está dentro de un [[ enlace activo
            this.autocompleteStartIdx = openLinkIdx + 2;
            this.autocompleteQuery = textBeforeCursor.substring(this.autocompleteStartIdx).toLowerCase();
            this.showAutocompleteBox();
        } else {
            this.hideAutocompleteBox();
        }
    }

    showAutocompleteBox() {
        const query = this.autocompleteQuery;
        
        // Filtrar artículos que coincidan con la búsqueda
        const matches = this.articles.filter(art => 
            art.title.toLowerCase().includes(query) && 
            (this.activeArticle ? art.id !== this.activeArticle.id : true)
        ).slice(0, 5); // Limitar a 5 resultados

        if (matches.length === 0) {
            this.hideAutocompleteBox();
            return;
        }

        this.autocompleteBox.innerHTML = '';
        this.selectedAutocompleteIndex = 0;

        matches.forEach((art, index) => {
            const div = document.createElement('div');
            div.className = `autocomplete-item ${index === 0 ? 'selected' : ''}`;
            div.textContent = art.title;
            div.addEventListener('click', () => this.applyAutocomplete(art.title));
            this.autocompleteBox.appendChild(div);
        });

        // Posicionar el modal flotante
        // En una SPA Vanilla, posicionamos el autocomplete relativo a la posición general del textarea
        this.autocompleteBox.classList.remove('hidden');
        
        // Posicionado simple bajo el cursor (aproximado en la caja)
        const textareaCoords = this.textarea.getBoundingClientRect();
        this.autocompleteBox.style.top = `${this.textarea.offsetTop + 140}px`;
        this.autocompleteBox.style.left = `${this.textarea.offsetLeft + 40}px`;
    }

    hideAutocompleteBox() {
        this.autocompleteBox.classList.add('hidden');
        this.autocompleteStartIdx = -1;
    }

    applyAutocomplete(title) {
        const text = this.textarea.value;
        const cursorIdx = this.textarea.selectionStart;
        const beforeLink = text.substring(0, this.autocompleteStartIdx);
        const afterCursor = text.substring(cursorIdx);

        // Reemplazar la query escrita con el enlace completo
        this.textarea.value = beforeLink + title + ']]' + afterCursor;
        this.textarea.focus();
        
        // Reposicionar cursor
        const newCursorPos = this.autocompleteStartIdx + title.length + 2;
        this.textarea.setSelectionRange(newCursorPos, newCursorPos);

        this.hideAutocompleteBox();
    }

    handleTextareaKeydown(e) {
        // Atajos de teclado (Ctrl + B = Negrita, Ctrl + I = Cursiva, Ctrl + Shift + L = Enlace)
        if (e.ctrlKey || e.metaKey) {
            const keyCode = e.keyCode || e.which;
            if (keyCode === 66) { // B
                e.preventDefault();
                this.insertFormat('bold');
                return;
            }
            if (keyCode === 73) { // I
                e.preventDefault();
                this.insertFormat('italic');
                return;
            }
            if (e.shiftKey && keyCode === 76) { // Shift + L
                e.preventDefault();
                this.insertFormat('link');
                return;
            }
        }

        if (this.autocompleteBox.classList.contains('hidden')) return;

        const items = this.autocompleteBox.querySelectorAll('.autocomplete-item');
        if (items.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            items[this.selectedAutocompleteIndex].classList.remove('selected');
            this.selectedAutocompleteIndex = (this.selectedAutocompleteIndex + 1) % items.length;
            items[this.selectedAutocompleteIndex].classList.add('selected');
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            items[this.selectedAutocompleteIndex].classList.remove('selected');
            this.selectedAutocompleteIndex = (this.selectedAutocompleteIndex - 1 + items.length) % items.length;
            items[this.selectedAutocompleteIndex].classList.add('selected');
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const selectedText = items[this.selectedAutocompleteIndex].textContent;
            this.applyAutocomplete(selectedText);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            this.hideAutocompleteBox();
        }
    }

    insertFormat(formatType) {
        const startIdx = this.textarea.selectionStart;
        const endIdx = this.textarea.selectionEnd;
        const text = this.textarea.value;
        const selectedText = text.substring(startIdx, endIdx);

        let replacement = '';
        let cursorOffsetStart = 0;
        let cursorOffsetEnd = 0;

        switch (formatType) {
            case 'bold':
                replacement = `**${selectedText || 'texto'}**`;
                cursorOffsetStart = selectedText ? replacement.length : 2;
                cursorOffsetEnd = selectedText ? replacement.length : 7;
                break;
            case 'italic':
                replacement = `*${selectedText || 'texto'}*`;
                cursorOffsetStart = selectedText ? replacement.length : 1;
                cursorOffsetEnd = selectedText ? replacement.length : 6;
                break;
            case 'h1':
                replacement = `\n# ${selectedText || 'Título 1'}\n`;
                cursorOffsetStart = selectedText ? replacement.length : 3;
                cursorOffsetEnd = selectedText ? replacement.length : 11;
                break;
            case 'h2':
                replacement = `\n## ${selectedText || 'Título 2'}\n`;
                cursorOffsetStart = selectedText ? replacement.length : 4;
                cursorOffsetEnd = selectedText ? replacement.length : 12;
                break;
            case 'h3':
                replacement = `\n### ${selectedText || 'Título 3'}\n`;
                cursorOffsetStart = selectedText ? replacement.length : 5;
                cursorOffsetEnd = selectedText ? replacement.length : 13;
                break;
            case 'ul':
                replacement = `\n- ${selectedText || 'Elemento'}\n`;
                cursorOffsetStart = selectedText ? replacement.length : 3;
                cursorOffsetEnd = selectedText ? replacement.length : 11;
                break;
            case 'ol':
                replacement = `\n1. ${selectedText || 'Elemento'}\n`;
                cursorOffsetStart = selectedText ? replacement.length : 4;
                cursorOffsetEnd = selectedText ? replacement.length : 12;
                break;
            case 'quote':
                replacement = `\n> ${selectedText || 'Cita'}\n`;
                cursorOffsetStart = selectedText ? replacement.length : 3;
                cursorOffsetEnd = selectedText ? replacement.length : 7;
                break;
            case 'table':
                replacement = `\n| Columna 1 | Columna 2 |\n| --------- | --------- |\n| Celda 1   | Celda 2   |\n`;
                cursorOffsetStart = replacement.length;
                cursorOffsetEnd = replacement.length;
                break;
            case 'link':
                replacement = `[[${selectedText || 'Artículo'}]]`;
                cursorOffsetStart = selectedText ? replacement.length : 2;
                cursorOffsetEnd = selectedText ? replacement.length : 10;
                break;
            case 'image':
                if (this.imageUploadInput) {
                    this.imageUploadInput.click();
                }
                return; // Detiene la ejecución aquí, la inserción se maneja en handleImageUpload
        }

        this.textarea.value = text.substring(0, startIdx) + replacement + text.substring(endIdx);
        this.textarea.focus();

        if (selectedText) {
            const newCursorPos = startIdx + replacement.length;
            this.textarea.setSelectionRange(newCursorPos, newCursorPos);
        } else {
            this.textarea.setSelectionRange(startIdx + cursorOffsetStart, startIdx + cursorOffsetEnd);
        }

        this.hideAutocompleteBox();
    }

    async handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file || !this.activeArticle) return;

        try {
            const base64Data = await fileToBase64(file);
            const imgId = 'img-' + Date.now();

            // Guardar imagen en IndexedDB
            await db.saveImage({
                id: imgId,
                name: file.name,
                data: base64Data
            });

            // Insertar el marcado de la imagen en la posición del cursor
            const startIdx = this.textarea.selectionStart;
            const endIdx = this.textarea.selectionEnd;
            const text = this.textarea.value;
            const replacement = `![${file.name}](${imgId})`;

            this.textarea.value = text.substring(0, startIdx) + replacement + text.substring(endIdx);
            this.textarea.focus();
            
            const newPos = startIdx + replacement.length;
            this.textarea.setSelectionRange(newPos, newPos);

            // Limpiar input de archivos
            this.imageUploadInput.value = '';
            
            // Forzar actualización visual si se está editando
            this.activeArticle.content = this.textarea.value;
        } catch (err) {
            console.error("Error al subir imagen:", err);
            alert("No se pudo cargar la imagen.");
        }
    }

    async loadEmbeddedImages() {
        const images = this.markdownRendered.querySelectorAll('img');
        for (let img of images) {
            const src = img.getAttribute('src');
            if (src && src.startsWith('img-')) {
                const imageData = await db.getImage(src);
                if (imageData) {
                    img.src = imageData.data;
                    img.style.opacity = 1;
                } else {
                    img.style.border = '1px dashed var(--color-danger)';
                    img.style.padding = '8px';
                    img.style.display = 'block';
                    img.alt = `[Imagen no encontrada: ${src}]`;
                }
            }
        }
    }
}

export const editor = new WikiEditor();
