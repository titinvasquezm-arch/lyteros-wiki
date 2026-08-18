// Lyteros Anvil - Utilidades y Parser de Markdown / Enlaces Bidireccionales

// Genera un ID legible y único (slug)
export function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')           // Reemplaza espacios con guiones
        .replace(/[^\w\-]+/g, '')       // Elimina caracteres no alfanuméricos
        .replace(/\-\-+/g, '-')         // Contrae guiones múltiples
        .replace(/^-+/, '')             // Recorta guiones del inicio
        .replace(/-+$/, '');            // Recorta guiones del final
}

// Extrae todos los nombres de enlaces [[Artículo]] de un texto
export function extractLinks(text) {
    if (!text) return [];
    const regex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    const links = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
        links.push(match[1].trim());
    }
    return [...new Set(links)]; // Valores únicos
}

// Analiza los enlaces [[Artículo]] y los convierte en enlaces HTML dinámicos
export function parseBidirectionalLinks(markdown, articles) {
    if (!markdown) return '';
    
    // Crear un mapa de títulos para búsqueda rápida (insensible a mayúsculas/minúsculas)
    const titleMap = {};
    const idMap = {};
    articles.forEach(art => {
        titleMap[art.title.toLowerCase().trim()] = art.id;
        idMap[art.id] = art.id;
    });

    const regex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

    return markdown.replace(regex, (match, targetTitle, customLabel) => {
        const titleClean = targetTitle.trim();
        const titleLower = titleClean.toLowerCase();
        const label = (customLabel ? customLabel.trim() : titleClean);

        // Comprobar si existe por título o por ID directo
        if (titleMap[titleLower]) {
            const targetId = titleMap[titleLower];
            return `<a href="#wiki" class="wiki-link" data-article-id="${targetId}">${label}</a>`;
        } else if (idMap[slugify(titleClean)]) {
            const targetId = idMap[slugify(titleClean)];
            return `<a href="#wiki" class="wiki-link" data-article-id="${targetId}">${label}</a>`;
        } else {
            // Enlace roto: se pinta diferente y permite crear el artículo al hacer clic
            return `<a href="#wiki" class="wiki-link broken-link" data-target-title="${titleClean}" title="El artículo aún no existe. Haz clic para crearlo.">${label}</a>`;
        }
    });
}

// Renderiza Markdown usando Marked y aplica el parseador de enlaces bidireccionales
export function renderMarkdown(markdown, articles) {
    if (!markdown) return '';
    
    try {
        // Configuramos marked si está cargado globalmente
        if (typeof marked !== 'undefined') {
            // Render de Markdown plano
            const rawHtml = marked.parse(markdown);
            // Parsear nuestros [[enlaces]] sobre el HTML resultante
            return parseBidirectionalLinks(rawHtml, articles);
        } else {
            // Fallback simple si no hay internet/marked
            const simpleHtml = markdown
                .replace(/\n/g, '<br>')
                .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                .replace(/\*([^*]+)\*/g, '<em>$1</em>');
            return parseBidirectionalLinks(simpleHtml, articles);
        }
    } catch (e) {
        console.error("Error rendering markdown:", e);
        return parseBidirectionalLinks(markdown, articles);
    }
}

// Convierte un archivo de imagen en una URL base64
export function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Sanitiza cadenas para evitar inyecciones XSS básicas al inyectar metadatos en formularios
export function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
