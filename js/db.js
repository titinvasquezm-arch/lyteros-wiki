// Lyteros Anvil - Capa de Base de Datos Estática (Solo Lectura) para GitHub Pages

class WikiDB {
    constructor() {
        this.data = {
            meta: { key: 'main', name: 'Lyteros Anvil', desc: '' },
            articles: [],
            pins: [],
            relations: [],
            timeline: [],
            maps: [],
            images: [],
            eras: []
        };
    }

    async init() {
        try {
            console.log("Cargando datos desde data.json...");
            const response = await fetch('data.json');
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            this.data = await response.json();
            console.log("Datos cargados exitosamente:", this.data);
        } catch (err) {
            console.error("No se pudo cargar data.json de manera estática. Usando datos vacíos de respaldo.", err);
        }

        // Asegurarse de que exista el mapa principal
        if (!this.data.maps) this.data.maps = [];
        if (!this.data.maps.find(m => m.id === 'main')) {
            const mapImage = (this.data.meta && this.data.meta.mapImage) ? this.data.meta.mapImage : 'Mapa.jpg';
            this.data.maps.push({
                id: 'main',
                name: 'Mapa Continental',
                image: mapImage,
                parentMapId: null
            });
        }
    }

    // --- WORLD META ---
    getWorldMeta() {
        return Promise.resolve(this.data.meta || { key: 'main', name: 'Nuevo Universo', desc: '' });
    }

    saveWorldMeta(name, desc) {
        console.warn("La base de datos es de solo lectura. No se puede guardar el meta.");
        return Promise.resolve();
    }

    // --- ARTICLES CRUD ---
    getAllArticles() {
        return Promise.resolve(this.data.articles || []);
    }

    getArticle(id) {
        const article = (this.data.articles || []).find(a => a.id === id);
        return Promise.resolve(article);
    }

    saveArticle(article) {
        console.warn("La base de datos es de solo lectura. No se puede guardar el artículo.");
        return Promise.resolve(article);
    }

    deleteArticle(id) {
        console.warn("La base de datos es de solo lectura. No se puede eliminar el artículo.");
        return Promise.resolve();
    }

    // --- MAP PINS CRUD ---
    getPins() {
        return Promise.resolve(this.data.pins || []);
    }

    savePin(pin) {
        console.warn("La base de datos es de solo lectura. No se puede guardar el pin.");
        return Promise.resolve(pin);
    }

    deletePin(id) {
        console.warn("La base de datos es de solo lectura. No se puede eliminar el pin.");
        return Promise.resolve();
    }

    // --- MAPS CRUD ---
    getAllMaps() {
        return Promise.resolve(this.data.maps || []);
    }

    getMap(id) {
        const map = (this.data.maps || []).find(m => m.id === id);
        return Promise.resolve(map);
    }

    saveMap(map) {
        console.warn("La base de datos es de solo lectura. No se puede guardar el mapa.");
        return Promise.resolve(map);
    }

    deleteMap(id) {
        console.warn("La base de datos es de solo lectura. No se puede eliminar el mapa.");
        return Promise.resolve();
    }

    // --- IMAGES CRUD (WIKI EMBEDDED IMAGES) ---
    getAllImages() {
        return Promise.resolve(this.data.images || []);
    }

    getImage(id) {
        const image = (this.data.images || []).find(img => img.id === id);
        return Promise.resolve(image);
    }

    saveImage(image) {
        console.warn("La base de datos es de solo lectura. No se puede guardar la imagen.");
        return Promise.resolve(image);
    }

    deleteImage(id) {
        console.warn("La base de datos es de solo lectura. No se puede eliminar la imagen.");
        return Promise.resolve();
    }

    // --- RELATIONS CRUD ---
    getRelations() {
        return Promise.resolve(this.data.relations || []);
    }

    saveRelation(relation) {
        console.warn("La base de datos es de solo lectura. No se puede guardar la relación.");
        return Promise.resolve(relation);
    }

    deleteRelation(id) {
        console.warn("La base de datos es de solo lectura. No se puede eliminar la relación.");
        return Promise.resolve();
    }

    // --- TIMELINE CRUD ---
    getTimeline() {
        return Promise.resolve(this.data.timeline || []);
    }

    saveTimelineEvent(event) {
        console.warn("La base de datos es de solo lectura. No se puede guardar el evento.");
        return Promise.resolve(event);
    }

    deleteTimelineEvent(id) {
        console.warn("La base de datos es de solo lectura. No se puede eliminar el evento.");
        return Promise.resolve();
    }

    // --- ERAS CRUD ---
    getEras() {
        const eras = this.data.eras || [];
        const sorted = [...eras].sort((a, b) => (a.order || 0) - (b.order || 0));
        return Promise.resolve(sorted);
    }

    saveEra(era) {
        console.warn("La base de datos es de solo lectura. No se puede guardar la era.");
        return Promise.resolve(era);
    }

    deleteEra(id) {
        console.warn("La base de datos es de solo lectura. No se puede eliminar la era.");
        return Promise.resolve();
    }

    // --- SYSTEM UTILS (Backups & Clears) ---
    exportAllData() {
        return Promise.resolve(JSON.stringify(this.data, null, 2));
    }

    importAllData(jsonString) {
        console.warn("La base de datos es de solo lectura. No se puede importar datos.");
        return Promise.resolve();
    }

    clearAllData() {
        console.warn("La base de datos es de solo lectura. No se puede borrar datos.");
        return Promise.resolve();
    }
}

export const db = new WikiDB();
