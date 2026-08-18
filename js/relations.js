// Lyteros Anvil - Módulo del Diagrama y Red de Relaciones Sociales
import { db } from './db.js';

class SocialRelations {
    constructor() {
        this.relations = [];
        this.characters = [];

        // DOM
        this.form = document.getElementById('relation-creator-form');
        this.sourceSelect = document.getElementById('relation-source');
        this.targetSelect = document.getElementById('relation-target');
        this.labelInput = document.getElementById('relation-label');
        this.colorSelect = document.getElementById('relation-color');
        
        this.listView = document.getElementById('relations-list-view');
        this.btnAddRelation = document.getElementById('add-relationship-btn');
    }

    init(onNavigateToArticleCallback) {
        this.onNavigateToArticle = onNavigateToArticleCallback || (() => {});
        this.registerEvents();
    }

    registerEvents() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        this.btnAddRelation.addEventListener('click', () => {
            // Focusear el select principal
            this.sourceSelect.focus();
        });
    }

    async loadRelationsData() {
        this.relations = await db.getRelations();
        
        // Obtener todos los personajes para los selectores
        const articles = await db.getAllArticles();
        this.characters = articles.filter(art => art.type === 'character' || art.type === 'faction');

        this.populateSelects();
        this.renderRelations();
    }

    populateSelects() {
        // Cargar personajes en los selectores de origen/destino
        this.sourceSelect.innerHTML = '<option value="">Selecciona personaje/facción...</option>';
        this.targetSelect.innerHTML = '<option value="">Selecciona personaje/facción...</option>';

        this.characters.sort((a,b)=>a.title.localeCompare(b.title)).forEach(char => {
            const typeLabel = char.type === 'character' ? 'P' : 'F';
            const optHtml = `<option value="${char.id}">${char.title} [${typeLabel}]</option>`;
            this.sourceSelect.innerHTML += optHtml;
            this.targetSelect.innerHTML += optHtml;
        });
    }

    async renderRelations() {
        this.listView.innerHTML = '';

        if (this.relations.length === 0) {
            this.listView.innerHTML = '<p class="empty-state col-span-3">No hay relaciones registradas entre los personajes de tu elenco.</p>';
            return;
        }

        const articles = await db.getAllArticles();

        this.relations.forEach(rel => {
            const sourceChar = articles.find(art => art.id === rel.sourceId);
            const targetChar = articles.find(art => art.id === rel.targetId);

            if (!sourceChar || !targetChar) {
                // Borrar relación huérfana de la DB
                db.deleteRelation(rel.id);
                return;
            }

            const card = document.createElement('div');
            card.className = 'relation-card';
            card.style.borderLeftColor = rel.color || '#66fcf1';

            card.innerHTML = `
                <div class="relation-card-header">
                    <span class="relation-source-node" data-id="${sourceChar.id}">${escapeHtml(sourceChar.title)}</span>
                    <button class="delete-relation-btn" data-id="${rel.id}"><i data-lucide="trash-2" style="width: 14px; height: 14px;"></i></button>
                </div>
                <div class="relation-type-label" style="background-color: ${rel.color}15; color: ${rel.color}">${escapeHtml(rel.label)}</div>
                <div class="relation-target-node" data-id="${targetChar.id}">${escapeHtml(targetChar.title)}</div>
            `;

            // Enlazar clics de navegación
            card.querySelector('.relation-source-node').addEventListener('click', () => {
                this.onNavigateToArticle(sourceChar.id);
            });
            card.querySelector('.relation-target-node').addEventListener('click', () => {
                this.onNavigateToArticle(targetChar.id);
            });

            // Enlazar borrado
            card.querySelector('.delete-relation-btn').addEventListener('click', async (e) => {
                e.preventDefault();
                if (confirm(`¿Deseas eliminar la relación de "${sourceChar.title}" como "${rel.label}" "${targetChar.title}"?`)) {
                    await db.deleteRelation(rel.id);
                    this.loadRelationsData();
                }
            });

            this.listView.appendChild(card);
        });

        lucide.createIcons();
    }

    async handleSubmit(e) {
        e.preventDefault();

        const sourceId = this.sourceSelect.value;
        const targetId = this.targetSelect.value;
        const label = this.labelInput.value.trim();
        const color = this.colorSelect.value;

        if (!sourceId || !targetId || !label) return;
        if (sourceId === targetId) {
            alert("Un personaje no puede tener una relación consigo mismo.");
            return;
        }

        const newRelation = { sourceId, targetId, label, color };
        await db.saveRelation(newRelation);

        this.labelInput.value = '';
        this.sourceSelect.value = '';
        this.targetSelect.value = '';
        
        this.loadRelationsData();
    }
}

// Sanitizado rápido
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export const relationsWorkspace = new SocialRelations();
