// Lyteros Anvil - Módulo del Mapa Interactivo con Leaflet.js
import { db } from './db.js';
import { slugify } from './utils.js';

class WikiMap {
    constructor() {
        this.map = null;
        this.imageOverlay = null;
        this.markers = [];
        
        this.currentTool = 'view'; // 'view' o 'pin'
        this.mapImagePath = 'Mapa.jpg'; // Imagen por defecto
        
        this.currentMapId = 'main';
        this.mapHistory = [];

        // DOM
        this.mapContainer = document.getElementById('leaflet-map');
        this.btnToolView = document.getElementById('map-tool-view');
        this.btnToolPin = document.getElementById('map-tool-pin');
        this.mapSelector = document.getElementById('map-selector');
        this.btnOpenUploadMap = document.getElementById('btn-open-upload-map');
        this.btnBack = document.getElementById('map-back-btn');
        this.btnFit = document.getElementById('map-btn-fit');
        this.activeMapLabel = document.getElementById('active-map-label');
        this.currentMapBounds = null;
        
        // Modales y Formulario de Pines
        this.modalPin = document.getElementById('modal-map-pin');
        this.formPin = document.getElementById('map-pin-form');
        this.pinLatInput = document.getElementById('pin-coord-lat');
        this.pinLngInput = document.getElementById('pin-coord-lng');
        this.pinTitleInput = document.getElementById('pin-title');
        this.pinLinkSelect = document.getElementById('pin-link-select');
        this.pinLinkMapSelect = document.getElementById('pin-link-map-select');
        this.pinColorSelect = document.getElementById('pin-color');
        
        this.modalClose = document.getElementById('modal-map-pin-close');
        this.modalCancel = document.getElementById('modal-map-pin-cancel');

        // Modal de Cargar Mapa
        this.modalUploadMap = document.getElementById('modal-upload-map');
        this.formUploadMap = document.getElementById('upload-map-form');
        this.uploadMapNameInput = document.getElementById('upload-map-name');
        this.uploadMapParentSelect = document.getElementById('upload-map-parent');
        this.uploadMapFileInput = document.getElementById('upload-map-file');
        this.modalUploadClose = document.getElementById('modal-upload-map-close');
        this.modalUploadCancel = document.getElementById('modal-upload-map-cancel');
    }

    init(onNavigateToArticleCallback) {
        this.onNavigateToArticle = onNavigateToArticleCallback || (() => {});
        this.registerEvents();
        this.setupMap();
    }

    registerEvents() {
        // Herramientas
        this.btnToolView.addEventListener('click', () => this.setTool('view'));
        this.btnToolPin.addEventListener('click', () => this.setTool('pin'));
        
        // Selector de mapa y navegación
        this.mapSelector.addEventListener('change', (e) => this.switchMap(e.target.value));
        this.btnOpenUploadMap.addEventListener('click', () => this.openUploadMapModal());
        this.btnBack.addEventListener('click', () => this.handleBackClick());

        // Eventos del Modal de Pines
        this.modalClose.addEventListener('click', () => this.closeModal());
        this.modalCancel.addEventListener('click', () => this.closeModal());
        this.formPin.addEventListener('submit', (e) => this.handlePinSubmit(e));

        // Eventos del Modal de Cargar Mapa
        this.modalUploadClose.addEventListener('click', () => this.closeUploadMapModal());
        this.modalUploadCancel.addEventListener('click', () => this.closeUploadMapModal());
        this.formUploadMap.addEventListener('submit', (e) => this.handleMapSubmit(e));

        // Ajustar mapa
        this.btnFit.addEventListener('click', () => this.fitMapToScreen());
    }

    setTool(tool) {
        this.currentTool = tool;
        this.btnToolView.classList.toggle('active', tool === 'view');
        this.btnToolPin.classList.toggle('active', tool === 'pin');

        if (tool === 'pin') {
            this.mapContainer.style.cursor = 'crosshair';
        } else {
            this.mapContainer.style.cursor = '';
        }
    }

    async setupMap() {
        // Cargar mapa desde IndexedDB
        let mapData = await db.getMap(this.currentMapId);
        if (!mapData) {
            // Fallback a main
            mapData = await db.getMap('main');
            this.currentMapId = 'main';
        }
        
        const mapSrc = mapData ? mapData.image : this.mapImagePath;
        const mapName = mapData ? mapData.name : 'Mapa Continental';
        
        // Actualizar etiqueta
        this.activeMapLabel.textContent = `Mapa Activo: ${mapName}`;
        
        const img = new Image();
        img.src = mapSrc;
        
        img.onload = () => {
            const w = img.width || 1200;
            const h = img.height || 800;
            const bounds = [[0, 0], [h, w]];
            this.currentMapBounds = bounds;

            if (this.map) {
                this.map.remove();
                this.markers = [];
            }

            this.map = L.map('leaflet-map', {
                crs: L.CRS.Simple,
                minZoom: -2,
                maxZoom: 2,
                zoomSnap: 0,
                zoomDelta: 0.25,
                wheelPxPerZoomLevel: 60,
                attributionControl: false
            });

            this.imageOverlay = L.imageOverlay(mapSrc, bounds).addTo(this.map);
            this.map.fitBounds(bounds);
            this.map.on('click', (e) => this.handleMapClick(e));

            // Cargar selectores
            this.updateMapSelectorOptions();
            this.updateBackButtonVisibility();

            // Cargar pines
            this.loadPins();
        };

        img.onerror = () => {
            console.error("No se pudo cargar la imagen de mapa:", mapSrc);
            this.renderEmptyMapFallback();
        };
    }

    renderEmptyMapFallback() {
        const bounds = [[0, 0], [800, 1200]];
        this.currentMapBounds = bounds;
        if (this.map) this.map.remove();

        this.map = L.map('leaflet-map', {
            crs: L.CRS.Simple,
            minZoom: -1,
            maxZoom: 2,
            zoomSnap: 0,
            zoomDelta: 0.25,
            wheelPxPerZoomLevel: 60,
            attributionControl: false
        });

        const themeColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-surface').trim() || '#1e222b';
        L.rectangle(bounds, {color: themeColor, weight: 1, fillOpacity: 0.8}).addTo(this.map);
        this.map.fitBounds(bounds);
        this.map.on('click', (e) => this.handleMapClick(e));
        
        this.updateMapSelectorOptions();
        this.updateBackButtonVisibility();
        this.loadPins();
    }

    async loadPins() {
        // Limpiar marcadores existentes
        this.markers.forEach(m => this.map.removeLayer(m));
        this.markers = [];

        const pins = await db.getPins();
        const articles = await db.getAllArticles();

        // Filtrar pines por el mapa actual
        const filteredPins = pins.filter(pin => {
            const pinMapId = pin.mapId || 'main';
            return pinMapId === this.currentMapId;
        });

        filteredPins.forEach(pin => {
            const article = articles.find(art => art.id === pin.linkId);
            const markerColor = this.getPinHexColor(pin.color);

            // Icono SVG personalizado
            const customIcon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="
                    background-color: ${markerColor};
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    border: 2px solid #ffffff;
                    box-shadow: 0 0 8px ${markerColor};
                    transform: translate(-3px, -3px);
                "></div>`,
                iconSize: [14, 14],
                iconAnchor: [7, 7]
            });

            const marker = L.marker([pin.lat, pin.lng], { icon: customIcon }).addTo(this.map);

            // Popup HTML
            const descSnippet = article 
                ? (article.content.substring(0, 100).replace(/[#*`_\[\]]/g, '') + '...') 
                : 'Sin artículo asociado.';

            const popupContent = document.createElement('div');
            popupContent.className = 'map-popup-card';
            
            let linksHtml = '';
            if (pin.linkId) {
                linksHtml += `<a href="#" class="popup-link article-link" data-id="${pin.linkId}">Ver Artículo <i data-lucide="arrow-right" style="width: 12px; height: 12px; vertical-align: middle;"></i></a>`;
            }
            if (pin.linkMapId) {
                linksHtml += `<a href="#" class="popup-link map-link" data-map-id="${pin.linkMapId}">Explorar Mapa <i data-lucide="map" style="width: 12px; height: 12px; vertical-align: middle;"></i></a>`;
            }

            popupContent.innerHTML = `
                <div class="popup-title">${pin.title}</div>
                <div class="popup-desc">${descSnippet}</div>
                <div class="popup-links-container">
                    ${linksHtml}
                </div>
                <button class="btn-delete-pin" style="
                    background: transparent;
                    border: none;
                    color: #ff4757;
                    font-size: 10px;
                    cursor: pointer;
                    margin-top: 6px;
                    align-self: flex-start;
                    padding: 0;
                ">Eliminar Pin</button>
            `;

            if (pin.linkId) {
                popupContent.querySelector('.article-link').addEventListener('click', (e) => {
                    e.preventDefault();
                    this.onNavigateToArticle(pin.linkId);
                });
            }

            if (pin.linkMapId) {
                popupContent.querySelector('.map-link').addEventListener('click', (e) => {
                    e.preventDefault();
                    this.navigateToMap(pin.linkMapId);
                });
            }

            popupContent.querySelector('.btn-delete-pin').addEventListener('click', async (e) => {
                e.preventDefault();
                if (confirm(`¿Deseas eliminar el marcador "${pin.title}"?`)) {
                    await db.deletePin(pin.id);
                    this.loadPins();
                }
            });

            marker.bindPopup(popupContent);
            
            marker.on('popupopen', () => {
                lucide.createIcons();
            });

            this.markers.push(marker);
        });
    }

    getPinHexColor(color) {
        switch (color) {
            case 'red': return '#ff4757';
            case 'blue': return '#2f3542';
            case 'green': return '#2ed573';
            case 'orange': return '#ffa502';
            case 'purple': return '#9b59b6';
            case 'gold': return '#c5a059';
            default: return '#66fcf1';
        }
    }

    handleMapClick(e) {
        if (this.currentTool !== 'pin') return;

        // Abrir modal de nuevo pin
        this.pinLatInput.value = e.latlng.lat;
        this.pinLngInput.value = e.latlng.lng;
        this.pinTitleInput.value = '';
        this.pinLinkMapSelect.value = '';
        
        this.populateArticlesSelect();
        this.updateMapSelectorOptions();

        this.modalPin.classList.remove('hidden');
    }

    async populateArticlesSelect() {
        const articles = await db.getAllArticles();
        this.pinLinkSelect.innerHTML = `<option value="">-- Crear Nuevo Artículo para este Pin --</option>`;
        articles.sort((a,b) => a.title.localeCompare(b.title)).forEach(art => {
            this.pinLinkSelect.innerHTML += `<option value="${art.id}">${art.title}</option>`;
        });
    }

    closeModal() {
        this.modalPin.classList.add('hidden');
        this.setTool('view');
    }

    async handlePinSubmit(e) {
        e.preventDefault();
        
        const title = this.pinTitleInput.value.trim();
        const lat = parseFloat(this.pinLatInput.value);
        const lng = parseFloat(this.pinLngInput.value);
        let linkId = this.pinLinkSelect.value;
        const color = this.pinColorSelect.value;
        const linkMapId = this.pinLinkMapSelect.value;

        if (!title) return;

        if (!linkId) {
            linkId = slugify(title);
            const newArt = {
                id: linkId,
                title: title,
                type: 'location',
                content: `# ${title}\n\nEste lugar fue marcado en el mapa.\n\n## Descripción\nEscribe el lore de este sitio aquí...`,
                metadata: {
                    type: 'Punto de Interés',
                    danger_level: 'Moderado'
                },
                tags: ['geografía', 'punto-de-interes'],
                updatedAt: Date.now()
            };
            await db.saveArticle(newArt);
        }

        const newPin = { 
            lat, 
            lng, 
            title, 
            linkId, 
            color,
            linkMapId: linkMapId || null,
            mapId: this.currentMapId
        };
        await db.savePin(newPin);

        this.closeModal();
        this.loadPins();
        
        this.onNavigateToArticle(null); 
    }

    // Navegación jerárquica
    navigateToMap(mapId) {
        if (mapId === this.currentMapId) return;
        this.mapHistory.push(this.currentMapId);
        this.currentMapId = mapId;
        this.setupMap();
    }

    switchMap(mapId) {
        if (mapId === this.currentMapId) return;
        if (mapId === 'main') {
            this.mapHistory = [];
        } else {
            if (!this.mapHistory.includes(this.currentMapId)) {
                this.mapHistory.push(this.currentMapId);
            }
        }
        this.currentMapId = mapId;
        this.setupMap();
    }

    async handleBackClick() {
        if (this.mapHistory.length > 0) {
            this.currentMapId = this.mapHistory.pop();
            this.setupMap();
        } else {
            const mapData = await db.getMap(this.currentMapId);
            if (mapData && mapData.parentMapId) {
                this.currentMapId = mapData.parentMapId;
                this.setupMap();
            }
        }
    }

    async updateBackButtonVisibility() {
        const mapData = await db.getMap(this.currentMapId);
        const hasParent = mapData && mapData.parentMapId;
        
        if (this.mapHistory.length > 0 || hasParent) {
            this.btnBack.classList.remove('hidden');
            const btnSpan = this.btnBack.querySelector('span');
            if (btnSpan) {
                if (this.mapHistory.length > 0) {
                    btnSpan.textContent = 'Volver';
                } else {
                    const parentMap = await db.getMap(mapData.parentMapId);
                    btnSpan.textContent = parentMap ? `Volver a ${parentMap.name}` : 'Subir de Nivel';
                }
            }
        } else {
            this.btnBack.classList.add('hidden');
        }
    }

    async updateMapSelectorOptions() {
        const maps = await db.getAllMaps();
        
        this.mapSelector.innerHTML = '';
        maps.forEach(m => {
            const option = document.createElement('option');
            option.value = m.id;
            option.textContent = m.name;
            option.selected = (m.id === this.currentMapId);
            this.mapSelector.appendChild(option);
        });

        this.uploadMapParentSelect.innerHTML = '<option value="">-- Ninguno (Mapa Principal) --</option>';
        maps.forEach(m => {
            const option = document.createElement('option');
            option.value = m.id;
            option.textContent = m.name;
            this.uploadMapParentSelect.appendChild(option);
        });

        this.pinLinkMapSelect.innerHTML = '<option value="">-- No enlazar a mapa --</option>';
        maps.forEach(m => {
            if (m.id !== this.currentMapId) {
                const option = document.createElement('option');
                option.value = m.id;
                option.textContent = m.name;
                this.pinLinkMapSelect.appendChild(option);
            }
        });
    }

    openUploadMapModal() {
        this.uploadMapNameInput.value = '';
        this.uploadMapFileInput.value = '';
        this.updateMapSelectorOptions();
        this.modalUploadMap.classList.remove('hidden');
    }

    closeUploadMapModal() {
        this.modalUploadMap.classList.add('hidden');
    }

    async handleMapSubmit(e) {
        e.preventDefault();
        
        const name = this.uploadMapNameInput.value.trim();
        const parentId = this.uploadMapParentSelect.value;
        const file = this.uploadMapFileInput.files[0];

        if (!name || !file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64Src = event.target.result;
            const mapId = slugify(name) + '-' + Date.now();
            
            const newMap = {
                id: mapId,
                name: name,
                image: base64Src,
                parentMapId: parentId || null
            };

            await db.saveMap(newMap);
            this.closeUploadMapModal();
            this.navigateToMap(mapId);
        };
        reader.readAsDataURL(file);
    }

    fitMapToScreen() {
        if (this.map && this.currentMapBounds) {
            this.map.fitBounds(this.currentMapBounds);
        }
    }
}

export const mapWorkspace = new WikiMap();
