// Lyteros Anvil - Controlador Principal de la Aplicación (Orquestador)
import { db } from './js/db.js';
import { slugify } from './js/utils.js';
import { editor } from './js/editor.js';
import { mapWorkspace } from './js/map.js';
import { graphWorkspace } from './js/graph.js';
import { timelineWorkspace } from './js/timeline.js';
import { relationsWorkspace } from './js/relations.js';
import { 
    MOCK_WORLD_META, 
    MOCK_ARTICLES, 
    MOCK_PINS, 
    MOCK_RELATIONS, 
    MOCK_TIMELINE 
} from './js/mockData.js';

class AppController {
    constructor() {
        this.activeView = 'dashboard';
        
        // Cargar tema e inicializar fuentes inmediatamente para evitar saltos visuales
        this.currentTheme = localStorage.getItem('lyteros_theme') || 'cosmic-dark';
        document.documentElement.setAttribute('data-theme', this.currentTheme);

        this.generalFontSize = localStorage.getItem('lyteros_fontsize_general') || '15';
        this.wikiFontSize = localStorage.getItem('lyteros_fontsize_wiki') || '18';
        document.documentElement.style.setProperty('--font-size-general', this.generalFontSize + 'px');
        document.documentElement.style.setProperty('--font-size-wiki', this.wikiFontSize + 'px');
        
        // DOM
        this.navLinks = document.querySelectorAll('.sidebar-nav .nav-item');
        this.viewPanels = document.querySelectorAll('.view-panel');
        this.activeWorldNameEl = document.getElementById('active-world-name');
        
        // Dashboard Stats
        this.statArticles = document.getElementById('stat-articles');
        this.statPins = document.getElementById('stat-pins');
        this.statEvents = document.getElementById('stat-events');
        this.statRelations = document.getElementById('stat-relations');
        this.recentList = document.getElementById('recent-articles-list');
        
        // World Meta inputs
        this.worldTitleInput = document.getElementById('world-title-input');
        this.worldDescInput = document.getElementById('world-desc-input');
        this.btnSaveWorldMeta = document.getElementById('save-world-meta');
        
        // Quick Action Buttons
        this.btnQuickCreate = document.getElementById('quick-create-article');
        this.btnQuickMap = document.getElementById('quick-view-map');
        this.btnQuickAddEvent = document.getElementById('quick-add-event');
        
        // Modales y Búsqueda
        this.searchBtn = document.getElementById('global-search-btn');
        this.searchModal = document.getElementById('modal-search');
        this.searchInput = document.getElementById('modal-search-input');
        this.searchResultsList = document.getElementById('modal-search-results-list');
        
        // Settings Buttons
        this.btnExport = document.getElementById('settings-export-btn');
        this.importInput = document.getElementById('settings-import-input');
        this.btnResetMock = document.getElementById('settings-reset-mock-btn');
        this.btnClear = document.getElementById('settings-clear-btn');
        this.themeBtns = document.querySelectorAll('.theme-btn');
    }

    async init() {
        // 1. Inicializar Base de Datos (cargar data.json)
        await db.init();

        // 2. Marcar como inicializado (no necesitamos cargar datos de muestra en IndexedDB)
        localStorage.setItem('lyteros_anvil_initialized', 'true');

        // 3. Registrar eventos globales de navegación y atajos
        this.registerNavigationEvents();
        this.registerGlobalEvents();

        // 4. Inicializar componentes hijos con callbacks
        editor.init(() => this.onArticlesDataChanged());
        mapWorkspace.init((articleId) => {
            if (articleId) {
                this.navigateToArticle(articleId);
            } else {
                // Notificación simple de recarga
                editor.loadArticlesList();
            }
        });
        graphWorkspace.init((articleId) => this.navigateToArticle(articleId));
        timelineWorkspace.init((articleId) => this.navigateToArticle(articleId));
        relationsWorkspace.init((articleId) => this.navigateToArticle(articleId));

        // 5. Cargar panel inicial y metadatos del mundo
        await this.loadWorldMetaDisplay();
        this.switchView('dashboard');
        
        // Sincronizar el estado del selector de temas en la UI
        this.themeBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-theme') === this.currentTheme);
        });
        
        // Cargar iconos iniciales Lucide
        lucide.createIcons();
    }

    registerNavigationEvents() {
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = link.getAttribute('data-view');
                this.switchView(view);
            });
        });
    }

    registerGlobalEvents() {
        // Atajo teclado Ctrl + K para buscador
        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                this.openSearchModal();
            }
            if (e.key === 'Escape') {
                this.closeSearchModal();
            }
        });

        // Buscador Clics
        this.searchBtn.addEventListener('click', () => this.openSearchModal());
        this.searchModal.addEventListener('click', (e) => {
            if (e.target === this.searchModal) {
                this.closeSearchModal();
            }
        });
        this.searchInput.addEventListener('input', () => this.handleGlobalSearch());

        // Guardar metadatos del mundo
        this.btnSaveWorldMeta.addEventListener('click', () => this.saveWorldMeta());

        // Acciones rápidas del Dashboard
        this.btnQuickCreate.addEventListener('click', () => {
            this.switchView('wiki');
            editor.createNewArticlePrompt();
        });
        this.btnQuickMap.addEventListener('click', () => this.switchView('map'));
        this.btnQuickAddEvent.addEventListener('click', () => {
            this.switchView('timeline');
            timelineWorkspace.openAddModal();
        });

        // Settings backups
        this.btnExport.addEventListener('click', () => this.exportBackup());
        this.importInput.addEventListener('change', (e) => this.importBackup(e));
        this.btnResetMock.addEventListener('click', () => this.resetSampleWorldPrompt());
        this.btnClear.addEventListener('click', () => this.clearWorldDataPrompt());

        // Eventos de selección de temas
        this.themeBtns = document.querySelectorAll('.theme-btn');
        console.log("Inicializando botones de temas. Cantidad encontrada:", this.themeBtns.length);
        this.themeBtns.forEach(btn => {
            console.log("Registrando tema:", btn.getAttribute('data-theme'));
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const selectedTheme = btn.getAttribute('data-theme');
                console.log("Botón de tema clickeado:", selectedTheme);
                this.setTheme(selectedTheme);
            });
        });

        // Inicializar controles de tamaño de fuente
        this.initFontSizeControls();
    }

    setTheme(themeName) {
        console.log("setTheme ejecutado para:", themeName);
        this.currentTheme = themeName;
        localStorage.setItem('lyteros_theme', themeName);
        document.documentElement.setAttribute('data-theme', themeName);
        
        // Asegurar que obtenemos los botones para sincronización visual
        this.themeBtns = document.querySelectorAll('.theme-btn');
        this.themeBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-theme') === themeName);
        });

        // Adaptar color de fondo del mapa (si no hay imagen renderiza el fallback correcto)
        try {
            if (mapWorkspace && typeof mapWorkspace.setupMap === 'function') {
                mapWorkspace.setupMap();
            }
        } catch (err) {
            console.error("Error al actualizar mapa en cambio de tema:", err);
        }

        // Forzar redibujado del grafo si está visible para que adapte sus colores D3 a las variables CSS
        try {
            if (graphWorkspace && typeof graphWorkspace.drawGraph === 'function') {
                const graphPanel = document.getElementById('view-graph');
                if (graphPanel && graphPanel.classList.contains('active')) {
                    graphWorkspace.drawGraph();
                }
            }
        } catch (err) {
            console.error("Error al actualizar grafo en cambio de tema:", err);
        }
    }

    initFontSizeControls() {
        const generalInput = document.getElementById('font-size-general-input');
        const generalVal = document.getElementById('font-size-general-val');
        const wikiInput = document.getElementById('font-size-wiki-input');
        const wikiVal = document.getElementById('font-size-wiki-val');

        if (generalInput) {
            generalInput.value = this.generalFontSize;
            generalVal.textContent = this.generalFontSize + 'px';
            generalInput.addEventListener('input', (e) => {
                const val = e.target.value;
                generalVal.textContent = val + 'px';
                this.generalFontSize = val;
                document.documentElement.style.setProperty('--font-size-general', val + 'px');
                localStorage.setItem('lyteros_fontsize_general', val);
            });
        }

        if (wikiInput) {
            wikiInput.value = this.wikiFontSize;
            wikiVal.textContent = this.wikiFontSize + 'px';
            wikiInput.addEventListener('input', (e) => {
                const val = e.target.value;
                wikiVal.textContent = val + 'px';
                this.wikiFontSize = val;
                document.documentElement.style.setProperty('--font-size-wiki', val + 'px');
                localStorage.setItem('lyteros_fontsize_wiki', val);
            });
        }
    }

    async switchView(viewName) {
        this.activeView = viewName;

        // Actualizar nav visual
        this.navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('data-view') === viewName);
        });

        // Cambiar visibilidad de paneles
        this.viewPanels.forEach(panel => {
            panel.classList.toggle('active', panel.id === `view-${viewName}`);
        });

        // Cargas específicas por panel al activarse
        if (viewName === 'dashboard') {
            await this.loadDashboardStats();
        } else if (viewName === 'map') {
            // Leaflet requiere re-calcular el tamaño cuando pasa de oculto a visible
            setTimeout(() => {
                if (mapWorkspace.map) {
                    mapWorkspace.map.invalidateSize();
                    mapWorkspace.updateMapSelectorOptions();
                } else {
                    mapWorkspace.setupMap();
                }
            }, 100);
        } else if (viewName === 'graph') {
            // Redibujar el grafo D3.js dinámicamente con física fresca
            setTimeout(() => graphWorkspace.drawGraph(), 50);
        } else if (viewName === 'timeline') {
            await timelineWorkspace.loadTimelineData();
        } else if (viewName === 'relations') {
            await relationsWorkspace.loadRelationsData();
        }

        lucide.createIcons();
    }

    // Navegar y enfocar un artículo específico desde un mapa/timeline/relaciones
    navigateToArticle(articleId) {
        this.switchView('wiki');
        editor.loadArticle(articleId);
    }

    // Callback llamado cuando los artículos cambian (guardado/borrado/creado)
    async onArticlesDataChanged() {
        // Si estamos en el panel de control, actualizar números
        if (this.activeView === 'dashboard') {
            await this.loadDashboardStats();
        }
    }

    // --- COPO DE DATOS MOCK INITIALIZER ---
    async loadSampleWorld() {
        console.log("Inicializando base de datos con el mundo de muestra: El Reino de Lyteros...");
        
        // Guardar Meta
        await db.saveWorldMeta(MOCK_WORLD_META.name, MOCK_WORLD_META.desc);

        // Guardar Artículos
        for (let art of MOCK_ARTICLES) {
            await db.saveArticle(art);
        }

        // Guardar Pines
        for (let pin of MOCK_PINS) {
            await db.savePin(pin);
        }

        // Guardar Relaciones
        for (let rel of MOCK_RELATIONS) {
            await db.saveRelation(rel);
        }

        // Guardar Eras por defecto
        const defaultEras = [
            { name: 'Primera Edad', order: 1, abbreviation: 'P.E.' },
            { name: 'Segunda Edad', order: 2, abbreviation: 'S.E.' },
            { name: 'Tercera Edad', order: 3, abbreviation: 'T.E.' }
        ];
        
        const createdEras = [];
        for (let era of defaultEras) {
            const saved = await db.saveEra(era);
            createdEras.push(saved);
        }

        // Guardar Eventos de Timeline mapeados a las eras creadas
        for (let ev of MOCK_TIMELINE) {
            const matchingEra = createdEras.find(e => e.name === ev.era);
            if (matchingEra) {
                ev.eraId = matchingEra.id;
            }
            await db.saveTimelineEvent(ev);
        }
    }

    async loadWorldMetaDisplay() {
        const meta = await db.getWorldMeta();
        this.activeWorldNameEl.textContent = meta.name;
        this.worldTitleInput.value = meta.name;
        this.worldDescInput.value = meta.desc;

        // Visualización de solo lectura para el panel de control
        const titleEl = document.getElementById('world-title-display');
        const descEl = document.getElementById('world-desc-display');
        if (titleEl) titleEl.textContent = meta.name;
        if (descEl) descEl.textContent = meta.desc;
    }

    async saveWorldMeta() {
        const name = this.worldTitleInput.value.trim();
        const desc = this.worldDescInput.value.trim();
        
        if (!name) return;
        
        await db.saveWorldMeta(name, desc);
        await this.loadWorldMetaDisplay();
        alert("Metadatos del universo actualizados.");
    }

    // --- DASHBOARD LOGIC ---
    async loadDashboardStats() {
        const articles = await db.getAllArticles();
        const pins = await db.getPins();
        const events = await db.getTimeline();
        const relations = await db.getRelations();

        this.statArticles.textContent = articles.length;
        this.statPins.textContent = pins.length;
        this.statEvents.textContent = events.length;
        this.statRelations.textContent = relations.length;

        // Renderizar edits recientes (últimos 5)
        this.recentList.innerHTML = '';
        const recent = [...articles]
            .sort((a,b) => (b.updatedAt || 0) - (a.updatedAt || 0))
            .slice(0, 5);

        if (recent.length === 0) {
            this.recentList.innerHTML = '<p class="empty-state">No hay artículos recientes.</p>';
            return;
        }

        recent.forEach(art => {
            const item = document.createElement('div');
            item.className = 'recent-item';
            
            const elapsedMs = Date.now() - (art.updatedAt || Date.now());
            const elapsedMins = Math.floor(elapsedMs / 60000);
            let timeStr = 'hace un momento';
            if (elapsedMins > 0 && elapsedMins < 60) timeStr = `hace ${elapsedMins} min`;
            else if (elapsedMins >= 60 && elapsedMins < 1440) timeStr = `hace ${Math.floor(elapsedMins/60)} horas`;
            else if (elapsedMins >= 1440) timeStr = `hace ${Math.floor(elapsedMins/1440)} días`;

            item.innerHTML = `
                <div class="recent-title-row">
                    <span class="recent-name">${this.escapeHtml(art.title)}</span>
                    <span class="recent-type">${art.type}</span>
                </div>
                <span class="recent-time">${timeStr}</span>
            `;
            item.addEventListener('click', () => this.navigateToArticle(art.id));
            this.recentList.appendChild(item);
        });
    }

    // --- QUICK SEARCH MODAL (Ctrl + K) ---
    openSearchModal() {
        this.searchModal.classList.remove('hidden');
        this.searchInput.value = '';
        this.searchInput.focus();
        this.handleGlobalSearch(); // Llenar lista inicial
    }

    closeSearchModal() {
        this.searchModal.classList.add('hidden');
    }

    async handleGlobalSearch() {
        const query = this.searchInput.value.toLowerCase().trim();
        const articles = await db.getAllArticles();
        this.searchResultsList.innerHTML = '';

        const matches = articles.filter(art => 
            art.title.toLowerCase().includes(query) || 
            art.content.toLowerCase().includes(query)
        ).slice(0, 8); // Top 8 coincidencias

        if (matches.length === 0) {
            this.searchResultsList.innerHTML = '<p class="empty-state">No se encontraron coincidencias.</p>';
            return;
        }

        matches.forEach((art, index) => {
            const item = document.createElement('div');
            item.className = `search-result-item ${index === 0 ? 'selected' : ''}`;
            item.setAttribute('data-id', art.id);

            // Obtener snippet
            let snippet = '';
            const idx = art.content.toLowerCase().indexOf(query);
            if (idx !== -1 && query.length > 0) {
                const start = Math.max(0, idx - 20);
                const end = Math.min(art.content.length, idx + query.length + 30);
                snippet = '...' + art.content.slice(start, end).replace(/\n/g, ' ') + '...';
            } else {
                snippet = art.content.substring(0, 50).replace(/[#*`\[\]]/g, '') + '...';
            }

            item.innerHTML = `
                <div class="result-main">
                    <i data-lucide="file-text" class="result-icon"></i>
                    <div class="result-info">
                        <span class="result-title">${this.escapeHtml(art.title)}</span>
                        <span class="result-snippet">${this.escapeHtml(snippet)}</span>
                    </div>
                </div>
                <span class="result-badge" style="background-color: var(--bg-surface-elevated); color: var(--accent-gold); border: 1px solid var(--border-color);">${art.type}</span>
            `;

            item.addEventListener('click', () => {
                this.closeSearchModal();
                this.navigateToArticle(art.id);
            });

            this.searchResultsList.appendChild(item);
        });

        lucide.createIcons();
    }

    // --- BACKUP ACTIONS ---
    async exportBackup() {
        try {
            const dataStr = await db.exportAllData();
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const meta = await db.getWorldMeta();
            const filename = `lyteros-anvil-${slugify(meta.name)}.json`;
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            alert("No se pudo exportar la base de datos.");
        }
    }

    async importBackup(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                await db.importAllData(event.target.result);
                alert("Backup importado con éxito. El navegador se recargará.");
                window.location.reload();
            } catch (err) {
                console.error(err);
                alert("Error al importar backup. Asegúrate de usar un archivo JSON válido.");
            }
        };
        reader.readAsText(file);
    }

    async resetSampleWorldPrompt() {
        if (confirm("¿Estás seguro de que deseas reestablecer el Reino de Lyteros? Esto reemplazará todo tu lore actual.")) {
            await db.clearAllData();
            await this.loadSampleWorld();
            alert("Mundo de muestra restaurado.");
            window.location.reload();
        }
    }

    async clearWorldDataPrompt() {
        if (confirm("ALERTA: Vas a borrar permanentemente todo el lore de tu universo (artículos, mapas, pines, relaciones, línea de tiempo). ¿Deseas continuar?")) {
            await db.clearAllData();
            alert("Base de datos vaciada.");
            window.location.reload();
        }
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Iniciar aplicación al cargar de forma segura
const initApp = () => {
    const controller = new AppController();
    controller.init();
};

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
export const app = AppController;
export { db };
