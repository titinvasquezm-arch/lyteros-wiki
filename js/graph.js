// Lyteros Anvil - Módulo del Grafo de Conexiones usando D3.js
import { db } from './db.js';
import { extractLinks, slugify } from './utils.js';

class LoreGraph {
    constructor() {
        this.svg = null;
        this.simulation = null;
        this.container = document.getElementById('graph-canvas-container');
        this.btnRestart = document.getElementById('graph-restart-simulation');
        this.toggleLabels = document.getElementById('graph-toggle-labels');
        this.showLabels = true;
    }

    init(onNodeClickCallback) {
        this.onNodeClick = onNodeClickCallback || (() => {});
        this.registerEvents();
    }

    registerEvents() {
        this.btnRestart.addEventListener('click', () => this.drawGraph());
        this.toggleLabels.addEventListener('change', () => {
            this.showLabels = this.toggleLabels.checked;
            this.updateLabelsVisibility();
        });
        
        window.addEventListener('resize', () => {
            // Solo redibujar si estamos en la vista de grafo activa
            const graphPanel = document.getElementById('view-graph');
            if (graphPanel && graphPanel.classList.contains('active')) {
                this.drawGraph();
            }
        });
    }

    updateLabelsVisibility() {
        if (!this.svg) return;
        this.svg.selectAll('.graph-label')
            .style('display', this.showLabels ? 'block' : 'none');
    }

    async drawGraph() {
        // Limpiar contenedor
        this.container.innerHTML = '';
        
        const articles = await db.getAllArticles();
        if (articles.length === 0) {
            this.container.innerHTML = '<p class="empty-state">No hay suficientes artículos para generar un grafo.</p>';
            return;
        }

        // Obtener dimensiones del contenedor
        const width = this.container.clientWidth || 800;
        const height = this.container.clientHeight || 500;

        // Construir Nodos
        const nodes = articles.map(art => ({
            id: art.id,
            title: art.title,
            type: art.type
        }));

        // Construir Enlaces (Edges)
        const links = [];
        
        // Mapear títulos a IDs para búsqueda
        const titleToIdMap = {};
        articles.forEach(art => {
            titleToIdMap[art.title.toLowerCase().trim()] = art.id;
        });

        articles.forEach(art => {
            const targets = extractLinks(art.content);
            targets.forEach(targetTitle => {
                const targetLower = targetTitle.toLowerCase().trim();
                let targetId = titleToIdMap[targetLower];
                
                // Fallback por slug directo
                if (!targetId) {
                    const slug = slugify(targetTitle);
                    if (articles.some(a => a.id === slug)) {
                        targetId = slug;
                    }
                }

                if (targetId && targetId !== art.id) {
                    // Evitar duplicados simples (enlaces bidireccionales dobles en la gráfica)
                    const exists = links.some(l => 
                        (l.source === art.id && l.target === targetId) || 
                        (l.source === targetId && l.target === art.id)
                    );
                    if (!exists) {
                        links.push({
                            source: art.id,
                            target: targetId
                        });
                    }
                }
            });
        });

        // Crear elemento SVG
        const svgElement = d3.create("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("class", "graph-svg")
            .attr("viewBox", [0, 0, width, height]);

        // Grupo principal que contendrá los elementos zoomados
        const g = svgElement.append("g");

        this.svg = svgElement;

        // Añadir Zoom Behavior
        svgElement.call(d3.zoom()
            .extent([[0, 0], [width, height]])
            .scaleExtent([0.1, 4])
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
            }));

        // Simulación Física de Fuerzas
        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(100))
            .force("charge", d3.forceManyBody().strength(-300))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius(25));

        this.simulation = simulation;

        // Dibujar Enlaces (Líneas)
        const link = g.append("g")
            .attr("stroke", "var(--border-color)")
            .selectAll("line")
            .data(links)
            .join("line")
            .attr("class", "graph-link");

        // Dibujar Nodos (Círculos)
        const node = g.append("g")
            .selectAll("g")
            .data(nodes)
            .join("g")
            .attr("class", "graph-node-group")
            .call(this.drag(simulation));

        // Círculo visual del nodo
        node.append("circle")
            .attr("r", d => d.id === 'el-reino-de-lyteros' ? 12 : 8) // Central más grande
            .attr("fill", d => this.getNodeColor(d.type))
            .attr("stroke", "var(--bg-surface)")
            .attr("stroke-width", 1.5)
            .attr("class", "graph-node")
            .on("click", (event, d) => {
                this.onNodeClick(d.id);
            });

        // Títulos de los nodos
        node.append("text")
            .attr("x", 12)
            .attr("y", 4)
            .text(d => d.title)
            .attr("class", "graph-label")
            .style("display", this.showLabels ? "block" : "none")
            .style("fill", "var(--text-secondary)")
            .style("font-size", "11px");

        // Tooltip básico al pasar el cursor
        node.append("title")
            .text(d => `${d.title} (${d.type.toUpperCase()})`);

        // Actualizar posiciones en cada tick de la simulación física
        simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node
                .attr("transform", d => `translate(${d.x},${d.y})`);
        });

        // Adjuntar al contenedor del DOM
        this.container.appendChild(svgElement.node());
    }

    getNodeColor(type) {
        switch (type) {
            case 'character': return 'var(--color-character)';
            case 'location': return 'var(--color-location)';
            case 'faction': return 'var(--color-faction)';
            case 'item': return 'var(--color-item)';
            case 'event': return 'var(--color-event)';
            default: return 'var(--accent-cyan)';
        }
    }

    // Funciones drag and drop para nodos interactivos
    drag(simulation) {
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        return d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
    }
}

export const graphWorkspace = new LoreGraph();
