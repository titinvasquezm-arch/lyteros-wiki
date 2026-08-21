// Lyteros Anvil - Plantillas Estructuradas de World Anvil

export const TEMPLATES = {
    general: {
        key: 'general',
        label: 'General / Nota Libre',
        icon: 'book',
        fields: []
    },
    character: {
        key: 'character',
        label: 'Personaje',
        icon: 'user',
        fields: [
            { key: 'race', label: 'Raza / Especie', type: 'text', placeholder: 'Ej. Humano, Elfo, Autómata' },
            { key: 'age', label: 'Edad / Ciclo de vida', type: 'text', placeholder: 'Ej. 34 años, Inmortal' },
            { key: 'alignment', label: 'Alineamiento', type: 'select', options: ['Neutral', 'Legal Bueno', 'Legal Neutral', 'Legal Malvado', 'Neutral Bueno', 'Caótico Bueno', 'Neutral Malvado', 'Caótico Neutral', 'Caótico Malvado'] },
            { key: 'profession', label: 'Ocupación / Clase', type: 'text', placeholder: 'Ej. Gran Mago, Mercenario' },
            { key: 'faction', label: 'Filiación / Organización', type: 'text', placeholder: 'Ej. Orden del Alba, Gremio de Ladrones' },
            { key: 'status', label: 'Estado', type: 'select', options: ['Vivo', 'Fallecido', 'Desaparecido', 'Renacido', 'Desconocido'] }
        ]
    },
    location: {
        key: 'location',
        label: 'Ubicación / Geografía',
        icon: 'map-pin',
        fields: [
            { key: 'type', label: 'Tipo de Lugar', type: 'text', placeholder: 'Ej. Ciudad, Cordillera, Ruina, Bosque' },
            { key: 'ruler', label: 'Gobernante / Líder', type: 'text', placeholder: 'Ej. Emperador Valerius, Clan del Acantilado' },
            { key: 'population', label: 'Población estimada', type: 'text', placeholder: 'Ej. 50,000 habitantes, Abandonado' },
            { key: 'climate', label: 'Clima / Entorno', type: 'text', placeholder: 'Ej. Ártico, Selva Húmeda, Desértico' },
            { key: 'danger_level', label: 'Nivel de Peligro', type: 'select', options: ['Seguro', 'Bajo', 'Moderado', 'Peligroso', 'Extremo', 'Mortal'] }
        ]
    },
    faction: {
        key: 'faction',
        label: 'Facción / Organización',
        icon: 'users',
        fields: [
            { key: 'leader', label: 'Líder / Fundador', type: 'text', placeholder: 'Ej. Gran Canciller' },
            { key: 'hq', label: 'Sede Principal', type: 'text', placeholder: 'Ej. Torre del Alba, Eldoria' },
            { key: 'members_title', label: 'Denominación de Miembros', type: 'text', placeholder: 'Ej. Paladines, Caballeros, Acólitos' },
            { key: 'goals', label: 'Objetivo Principal', type: 'text', placeholder: 'Ej. Preservar la magia arcana' },
            { key: 'influence', label: 'Área de Influencia', type: 'text', placeholder: 'Ej. Continental, Global, Subterráneo' }
        ]
    },
    item: {
        key: 'item',
        label: 'Objeto / Reliquia',
        icon: 'gem',
        fields: [
            { key: 'item_type', label: 'Tipo de Objeto', type: 'text', placeholder: 'Ej. Arma mágica, Amuleto, Pergamino, Materia' },
            { key: 'creator', label: 'Creador / Origen', type: 'text', placeholder: 'Ej. Forjadores de Runas Ancestrales' },
            { key: 'rarity', label: 'Rareza', type: 'select', options: ['Común', 'Poco Común', 'Raro', 'Épico', 'Legendario', 'Artefacto Único'] },
            { key: 'magic_properties', label: 'Propiedades Mágicas', type: 'text', placeholder: 'Ej. Canalización de fuego astral' },
            { key: 'location', label: 'Paradero Actual', type: 'text', placeholder: 'Ej. Perdido, Custodiado en el Templo' }
        ]
    },
    event: {
        key: 'event',
        label: 'Evento Histórico',
        icon: 'calendar',
        fields: [
            { key: 'date', label: 'Fecha / Año', type: 'text', placeholder: 'Ej. 450 d.F., Era del Fuego' },
            { key: 'location', label: 'Ubicación', type: 'text', placeholder: 'Ej. Llanuras del Destino' },
            { key: 'participants', label: 'Participantes Clave', type: 'text', placeholder: 'Ej. Rey Valerius, Lord Malakor' },
            { key: 'outcome', label: 'Resultado', type: 'text', placeholder: 'Ej. Victoria del Imperio del Sol, Tratado de Paz' }
        ]
    },
    race: {
        key: 'race',
        label: 'Raza / Especie',
        icon: 'dna',
        fields: [
            { key: 'average_lifespan', label: 'Esperanza de Vida', type: 'text', placeholder: 'Ej. 80 años, Inmortales' },
            { key: 'homeland', label: 'Territorio / Origen', type: 'text', placeholder: 'Ej. Gran Bosque, Planos Astrales' },
            { key: 'languages', label: 'Idiomas Comunes', type: 'text', placeholder: 'Ej. Común, Élfico, Rúnico' },
            { key: 'ancestry_traits', label: 'Rasgos Raciales', type: 'text', placeholder: 'Ej. Visión nocturna, Resistencia al fuego' },
            { key: 'distinguishing_features', label: 'Rasgos Físicos', type: 'text', placeholder: 'Ej. Orejas puntiagudas, Piel pálida' }
        ]
    }
};

export function getTemplateIcon(type) {
    return TEMPLATES[type]?.icon || 'book-open';
}
