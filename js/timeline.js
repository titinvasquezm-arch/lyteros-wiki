// Lyteros Anvil - Módulo de la Línea de Tiempo de Eventos Históricos
import { db } from './db.js';

class HistoricTimeline {
    constructor() {
        this.events = [];
        this.eras = [];
        this.editingEventId = null;
        
        // DOM placeholders
        this.container = null;
        this.searchField = null;
        this.eraFilter = null;
        this.btnAdd = null;
        this.modal = null;
        this.form = null;
        this.closeBtn = null;
        this.cancelBtn = null;
        this.inputYear = null;
        this.inputTitle = null;
        this.inputEra = null;
        this.inputDesc = null;
        this.inputLink = null;
        this.btnManageEras = null;
        this.modalEras = null;
        this.closeErasBtn = null;
        this.doneErasBtn = null;
        this.newEraForm = null;
        this.newEraNameInput = null;
        this.newEraAbbrevInput = null;
        this.erasListContainer = null;
        this.trackWrapper = null;
    }

    init(onNavigateToArticleCallback) {
        this.onNavigateToArticle = onNavigateToArticleCallback || (() => {});
        
        // Inicializar elementos DOM aquí, asegurando que están disponibles tras DOMContentLoaded
        this.container = document.getElementById('timeline-events-container');
        this.searchField = document.getElementById('timeline-search');
        this.eraFilter = document.getElementById('timeline-era-filter');
        this.btnAdd = document.getElementById('new-timeline-event-btn');
        
        // Modales y Formulario de Evento
        this.modal = document.getElementById('modal-timeline-event');
        this.form = document.getElementById('timeline-event-form');
        this.closeBtn = document.getElementById('modal-timeline-close');
        this.cancelBtn = document.getElementById('modal-timeline-cancel');
        
        // Form inputs de Evento
        this.inputYear = document.getElementById('event-year');
        this.inputTitle = document.getElementById('event-title');
        this.inputEra = document.getElementById('event-era');
        this.inputDesc = document.getElementById('event-desc');
        this.inputLink = document.getElementById('event-article-link');

        // DOM del Gestor de Eras
        this.btnManageEras = document.getElementById('manage-eras-btn');
        this.modalEras = document.getElementById('modal-manage-eras');
        this.closeErasBtn = document.getElementById('modal-eras-close');
        this.doneErasBtn = document.getElementById('modal-eras-done');
        this.newEraForm = document.getElementById('new-era-form');
        this.newEraNameInput = document.getElementById('new-era-name');
        this.newEraAbbrevInput = document.getElementById('new-era-abbrev');
        this.erasListContainer = document.getElementById('eras-list-container');
        this.trackWrapper = document.getElementById('timeline-track-wrapper');

        console.log("HistoricTimeline initialized with elements:", {
            btnManageEras: this.btnManageEras,
            modalEras: this.modalEras,
            btnAdd: this.btnAdd,
            trackWrapper: this.trackWrapper
        });

        this.registerEvents();
    }

    registerEvents() {
        // Filtrado y búsqueda
        if (this.searchField) this.searchField.addEventListener('input', () => this.renderTimeline());
        if (this.eraFilter) this.eraFilter.addEventListener('change', () => this.renderTimeline());
        
        // Modales de eventos
        if (this.btnAdd) this.btnAdd.addEventListener('click', () => this.openAddModal());
        if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.closeModal());
        if (this.cancelBtn) this.cancelBtn.addEventListener('click', () => this.closeModal());
        if (this.form) this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Modales de eras
        if (this.btnManageEras) this.btnManageEras.addEventListener('click', () => this.openErasModal());
        if (this.closeErasBtn) this.closeErasBtn.addEventListener('click', () => this.closeErasModal());
        if (this.doneErasBtn) this.doneErasBtn.addEventListener('click', () => this.closeErasModal());
        if (this.newEraForm) this.newEraForm.addEventListener('submit', (e) => this.handleAddEra(e));

        // Horizontal scroll via vertical mouse wheel
        if (this.trackWrapper) {
            this.trackWrapper.addEventListener('wheel', (e) => {
                if (e.deltaY !== 0) {
                    e.preventDefault();
                    this.trackWrapper.scrollLeft += e.deltaY;
                }
            });
        }
    }

    async loadTimelineData() {
        this.events = await db.getTimeline();
        this.eras = await db.getEras();

        // --- AUTO MIGRACIÓN / SELF-HEALING ---
        let needsSave = false;
        if (this.eras.length === 0) {
            const uniqueEraNames = [...new Set(this.events.map(e => e.era).filter(Boolean))];
            if (uniqueEraNames.length > 0) {
                console.log("Migrando eras existentes de formato texto a estructurado:", uniqueEraNames);
                for (let i = 0; i < uniqueEraNames.length; i++) {
                    const newEra = await db.saveEra({ name: uniqueEraNames[i], order: i + 1 });
                    this.eras.push(newEra);
                }
                needsSave = true;
            }
        }

        // Mapear eventos antiguos que tengan era textual pero no eraId
        for (let ev of this.events) {
            if (!ev.eraId && ev.era) {
                const matchingEra = this.eras.find(e => e.name === ev.era);
                if (matchingEra) {
                    ev.eraId = matchingEra.id;
                    await db.saveTimelineEvent(ev);
                }
            }
        }

        if (needsSave) {
            this.events = await db.getTimeline();
            this.eras = await db.getEras();
        }

        // --- ORDENAMIENTO COHERENTE POR ORDEN DE ERA + AÑO ---
        const eraOrderMap = {};
        this.eras.forEach(era => {
            eraOrderMap[era.id] = era.order;
        });

        this.events.sort((a, b) => {
            const orderA = a.eraId ? (eraOrderMap[a.eraId] || 0) : 0;
            const orderB = b.eraId ? (eraOrderMap[b.eraId] || 0) : 0;

            if (orderA !== orderB) {
                return orderA - orderB;
            }
            return parseInt(a.year) - parseInt(b.year);
        });
        
        this.populateEraFilter();
        this.renderTimeline();
    }

    populateEraFilter() {
        const selected = this.eraFilter.value;
        this.eraFilter.innerHTML = '<option value="">Todas las Eras / Edades</option>';
        
        this.eras.forEach(era => {
            this.eraFilter.innerHTML += `<option value="${era.id}" ${selected === String(era.id) ? 'selected' : ''}>${era.name}</option>`;
        });
    }

    async renderTimeline() {
        this.container.innerHTML = '';
        
        const query = this.searchField.value.toLowerCase().trim();
        const selectedEra = this.eraFilter.value;
        const articles = await db.getAllArticles();

        const filtered = this.events.filter(ev => {
            const matchesQuery = ev.title.toLowerCase().includes(query) || ev.desc.toLowerCase().includes(query);
            const matchesEra = selectedEra ? String(ev.eraId) === selectedEra : true;
            return matchesQuery && matchesEra;
        });

        if (filtered.length === 0) {
            this.container.innerHTML = '<p class="empty-state">No se registraron eventos históricos que coincidan.</p>';
            return;
        }

        filtered.forEach(ev => {
            const card = document.createElement('div');
            card.className = 'timeline-event-card';

            const linkedArticle = articles.find(art => art.id === ev.linkId);
            
            // Buscar nombre y abreviatura de era
            const eraObj = this.eras.find(e => e.id === ev.eraId);
            const eraName = eraObj ? eraObj.name : '';
            const abbrev = (eraObj && eraObj.abbreviation) ? eraObj.abbreviation : 'd.F.';

            // Determinar etiqueta de año bonita
            const yearVal = parseInt(ev.year);
            const yearDisplay = yearVal < 0 ? `${Math.abs(yearVal)} A.C.` : `${yearVal} ${abbrev}`;

            card.innerHTML = `
                <div class="timeline-node"></div>
                <div class="timeline-card-content">
                    <div class="timeline-header">
                        <span class="timeline-year">${yearDisplay}</span>
                        ${eraName ? `<span class="timeline-era-tag">${eraName}</span>` : ''}
                    </div>
                    <div class="timeline-title">${ev.title}</div>
                    <div class="timeline-desc">${ev.desc}</div>
                    <div class="timeline-link-row">
                        ${linkedArticle 
                            ? `<a href="#" class="timeline-link-btn" data-link="${linkedArticle.id}"><i data-lucide="book-open" style="width: 12px; height: 12px; vertical-align: middle; margin-right: 4px;"></i>Ver: ${linkedArticle.title}</a>` 
                            : '<span></span>'}
                        <div style="display: flex; gap: 8px;">
                            <button class="btn-edit-event" data-id="${ev.id}" style="
                                background: transparent;
                                border: none;
                                color: #626778;
                                cursor: pointer;
                                transition: color 0.2s;
                            " title="Editar Evento"><i data-lucide="edit-3" style="width: 14px; height: 14px;"></i></button>
                            <button class="btn-delete-event" data-id="${ev.id}" style="
                                background: transparent;
                                border: none;
                                color: #626778;
                                cursor: pointer;
                                transition: color 0.2s;
                            " title="Eliminar Evento"><i data-lucide="trash-2" style="width: 14px; height: 14px;"></i></button>
                        </div>
                    </div>
                </div>
            `;

            // Enlazar clic del artículo vinculado
            const linkBtn = card.querySelector('.timeline-link-btn');
            if (linkBtn) {
                linkBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.onNavigateToArticle(linkedArticle.id);
                });
            }

            // Enlazar clic de edición
            card.querySelector('.btn-edit-event').addEventListener('click', (e) => {
                e.preventDefault();
                this.openEventModal(ev);
            });

            // Enlazar clic de borrado
            card.querySelector('.btn-delete-event').addEventListener('click', async (e) => {
                e.preventDefault();
                if (confirm(`¿Deseas eliminar el evento "${ev.title}" de los registros cronológicos?`)) {
                    await db.deleteTimelineEvent(ev.id);
                    this.loadTimelineData();
                }
            });

            this.container.appendChild(card);
        });

        lucide.createIcons();
    }

    openAddModal() {
        this.openEventModal();
    }

    async openEventModal(event = null) {
        this.editingEventId = event ? event.id : null;
        
        // Actualizar título de modal según sea creación o edición
        const modalHeaderTitle = this.modal.querySelector('.modal-header h3');
        if (modalHeaderTitle) {
            modalHeaderTitle.textContent = event ? 'Editar Evento Histórico' : 'Registrar Evento Histórico';
        }

        this.inputYear.value = event ? event.year : '';
        this.inputTitle.value = event ? event.title : '';
        this.inputDesc.value = event ? event.desc : '';
        
        // Cargar eras en dropdown
        this.eras = await db.getEras();
        this.inputEra.innerHTML = '<option value="">Sin Era / Era General</option>';
        this.eras.forEach(era => {
            this.inputEra.innerHTML += `<option value="${era.id}" ${event && event.eraId === era.id ? 'selected' : ''}>${era.name}</option>`;
        });

        // Cargar artículos en dropdown
        const articles = await db.getAllArticles();
        this.inputLink.innerHTML = '<option value="">No vincular a ningún artículo</option>';
        articles.sort((a,b)=>a.title.localeCompare(b.title)).forEach(art => {
            this.inputLink.innerHTML += `<option value="${art.id}" ${event && event.linkId === art.id ? 'selected' : ''}>${art.title}</option>`;
        });

        // Actualizar texto del botón de submit
        const submitBtn = this.form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = event ? 'Guardar Cambios' : 'Registrar Evento';
        }

        this.modal.classList.remove('hidden');
    }

    closeModal() {
        this.modal.classList.add('hidden');
        this.editingEventId = null;
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const year = parseInt(this.inputYear.value);
        const title = this.inputTitle.value.trim();
        const eraId = this.inputEra.value ? parseInt(this.inputEra.value) : null;
        const desc = this.inputDesc.value.trim();
        const linkId = this.inputLink.value;

        if (isNaN(year) || !title || !desc) return;

        const eventData = { year, title, eraId, desc, linkId };
        if (this.editingEventId) {
            eventData.id = this.editingEventId;
        }

        // Mantener propiedad era textual para compatibilidad e interoperabilidad
        if (eraId) {
            const eraObj = this.eras.find(e => e.id === eraId);
            if (eraObj) {
                eventData.era = eraObj.name;
            }
        } else {
            eventData.era = '';
        }

        await db.saveTimelineEvent(eventData);

        this.closeModal();
        this.loadTimelineData();
    }

    // --- LÓGICA DEL GESTOR DE ERAS ---
    async openErasModal() {
        this.modalEras.classList.remove('hidden');
        this.newEraNameInput.value = '';
        await this.renderErasList();
    }

    closeErasModal() {
        this.modalEras.classList.add('hidden');
    }

    async renderErasList() {
        this.erasListContainer.innerHTML = '';
        this.eras = await db.getEras();

        if (this.eras.length === 0) {
            this.erasListContainer.innerHTML = '<p class="empty-state" style="padding: 16px; font-size: 13px; text-align: center; color: var(--text-muted);">No hay eras creadas. Añade una para empezar.</p>';
            return;
        }

        this.eras.forEach((era, idx) => {
            const li = document.createElement('li');
            li.className = 'era-item';

            const abbrevDisplay = era.abbreviation ? ` <span style="font-size: 12px; color: var(--text-secondary); margin-left: 6px;">(${era.abbreviation})</span>` : '';
            li.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span class="era-badge">#${idx + 1}</span>
                    <span class="era-name" style="font-weight: 500; color: var(--text-primary);">${era.name}${abbrevDisplay}</span>
                </div>
                <div style="display: flex; gap: 4px;">
                    <button class="btn-era-action move-up" title="Subir" data-id="${era.id}"><i data-lucide="chevron-up" style="width: 14px; height: 14px;"></i></button>
                    <button class="btn-era-action move-down" title="Bajar" data-id="${era.id}"><i data-lucide="chevron-down" style="width: 14px; height: 14px;"></i></button>
                    <button class="btn-era-action rename" title="Renombrar" data-id="${era.id}"><i data-lucide="edit-2" style="width: 12px; height: 12px;"></i></button>
                    <button class="btn-era-action delete" title="Eliminar" data-id="${era.id}"><i data-lucide="trash-2" style="width: 12px; height: 12px;"></i></button>
                </div>
            `;

            // Estilos para deshabilitar flechas en los límites de ordenamiento
            if (idx === 0) {
                const upBtn = li.querySelector('.move-up');
                upBtn.style.opacity = '0.3';
                upBtn.style.pointerEvents = 'none';
            }
            if (idx === this.eras.length - 1) {
                const downBtn = li.querySelector('.move-down');
                downBtn.style.opacity = '0.3';
                downBtn.style.pointerEvents = 'none';
            }

            // Escuchar eventos
            li.querySelector('.move-up').addEventListener('click', () => this.moveEra(era.id, -1));
            li.querySelector('.move-down').addEventListener('click', () => this.moveEra(era.id, 1));
            li.querySelector('.rename').addEventListener('click', () => this.renameEra(era.id));
            li.querySelector('.delete').addEventListener('click', () => this.deleteEra(era.id));

            this.erasListContainer.appendChild(li);
        });

        lucide.createIcons();
    }

    async handleAddEra(e) {
        e.preventDefault();
        const name = this.newEraNameInput.value.trim();
        const abbreviation = this.newEraAbbrevInput ? this.newEraAbbrevInput.value.trim() : '';
        if (!name) return;

        const maxOrder = this.eras.reduce((max, era) => era.order > max ? era.order : max, 0);
        
        await db.saveEra({ name, abbreviation, order: maxOrder + 1 });
        this.newEraNameInput.value = '';
        if (this.newEraAbbrevInput) this.newEraAbbrevInput.value = '';
        
        await this.loadTimelineData();
        await this.renderErasList();
    }

    async moveEra(eraId, direction) {
        const index = this.eras.findIndex(e => e.id === eraId);
        if (index === -1) return;

        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= this.eras.length) return;

        const tempOrder = this.eras[index].order;
        this.eras[index].order = this.eras[targetIndex].order;
        this.eras[targetIndex].order = tempOrder;

        await db.saveEra(this.eras[index]);
        await db.saveEra(this.eras[targetIndex]);

        await this.loadTimelineData();
        await this.renderErasList();
    }

    async renameEra(eraId) {
        const era = this.eras.find(e => e.id === eraId);
        if (!era) return;

        const newName = prompt(`Ingresa el nuevo nombre para la era "${era.name}":`, era.name);
        if (newName === null) return;
        if (newName.trim()) {
            era.name = newName.trim();
        }

        const newAbbrev = prompt(`Ingresa la abreviatura para la era "${era.name}" (ej. P.E.):`, era.abbreviation || '');
        if (newAbbrev !== null) {
            era.abbreviation = newAbbrev.trim();
        }

        await db.saveEra(era);

        const events = await db.getTimeline();
        for (let ev of events) {
            if (ev.eraId === eraId) {
                ev.era = era.name;
                await db.saveTimelineEvent(ev);
            }
        }

        await this.loadTimelineData();
        await this.renderErasList();
    }

    async deleteEra(eraId) {
        const era = this.eras.find(e => e.id === eraId);
        if (!era) return;

        if (confirm(`¿Estás seguro de que deseas eliminar la era "${era.name}"? Los sucesos vinculados a esta era NO serán eliminados, pero dejarán de pertenecer a ella.`)) {
            await db.deleteEra(eraId);

            const events = await db.getTimeline();
            for (let ev of events) {
                if (ev.eraId === eraId) {
                    ev.eraId = null;
                    ev.era = '';
                    await db.saveTimelineEvent(ev);
                }
            }

            const remainingEras = await db.getEras();
            for (let i = 0; i < remainingEras.length; i++) {
                remainingEras[i].order = i + 1;
                await db.saveEra(remainingEras[i]);
            }

            await this.loadTimelineData();
            await this.renderErasList();
        }
    }
}

export const timelineWorkspace = new HistoricTimeline();
