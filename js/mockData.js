// Lyteros Anvil - Datos de Muestra ("El Reino de Lyteros")

export const MOCK_WORLD_META = {
    key: 'main',
    name: 'El Reino de Lyteros',
    desc: 'Un mundo de fantasía donde la magia cristalina alimenta imperios flotantes y despierta antiguos misterios. Tras la Guerra de la Fractura, las facciones luchan por el control de las minas de Cristal Astral.'
};

export const MOCK_ARTICLES = [
    {
        id: 'el-reino-de-lyteros',
        title: 'El Reino de Lyteros',
        type: 'general',
        content: `# El Reino de Lyteros

Bienvenido a la enciclopedia oficial de **Lyteros**, un imperio forjado a partir de las ruinas de una civilización olvidada.

## Geografía y Puntos de Interés
El corazón del reino es la majestuosa [[Ciudadela de Cristal]], erigida sobre un cañón flotante sostenido por la energía del [[Cristal Astral]]. Hacia el norte se encuentran las tierras baldías, donde yacen los remanentes de la [[Guerra de la Fractura]].

## Facciones de Poder
*   **La [[Orden del Alba]]:** Protectores del cristal y del Rey.
*   **Los Proscritos de Malakor:** Rebeldes que buscan liberar el poder latente de los cristales para consumo individual.

## Personajes Clave
*   El [[Rey Valerius el Audaz]]: Soberano de Lyteros y fundador de la Orden.
*   [[Lord Malakor]]: Archienemigo de la corona y antiguo general.`,
        metadata: {},
        tags: ['introducción', 'lore-principal']
    },
    {
        id: 'valerius-el-audaz',
        title: 'Rey Valerius el Audaz',
        type: 'character',
        content: `# Rey Valerius el Audaz

Valerius es el tercer monarca de la dinastía solar. Ascendió al trono a los 19 años, en medio de las revueltas causadas por la escasez de cristales.

## Biografía
Valerius demostró ser un hábil estratega durante la [[Guerra de la Fractura]], donde lideró a la caballería real en la batalla por las minas de [[Cristal Astral]]. Tras consolidar su poder, refundó la [[Orden del Alba]] para patrullar las fronteras y proteger a los recolectores de cristal.

## Atributos Físicos y Personalidad
Valerius destaca por su armadura de placas doradas y su determinación inquebrantable. Aunque es respetado por su pueblo, algunos nobles lo consideran demasiado severo debido a sus estrictas leyes contra el contrabando de magia.`,
        metadata: {
            race: 'Humano',
            age: '42 años',
            alignment: 'Legal Bueno',
            profession: 'Monarca / Paladín',
            faction: 'Orden del Alba',
            status: 'Vivo'
        },
        tags: ['personaje', 'nobleza', 'héroe']
    },
    {
        id: 'ciudadela-de-cristal',
        title: 'Ciudadela de Cristal',
        type: 'location',
        content: `# Ciudadela de Cristal

La capital del reino y el centro neurálgico del comercio y la política en [[El Reino de Lyteros]].

## Estructura
La ciudadela está construida sobre gigantescas placas de granito suspendidas en el aire. La flotabilidad se logra mediante enormes núcleos de [[Cristal Astral]] refinados y custodiados bajo el palacio real.

## Distritos Principales
1.  **El Ojo Solar:** La zona noble donde residen el [[Rey Valerius el Audaz]] y la alta corte.
2.  **El Puerto de Viento:** Muelle para barcazas voladoras que transportan mercancías.
3.  **Los Fundos:** La zona obrera, donde se procesan los cristales antes de ser distribuidos.`,
        metadata: {
            type: 'Ciudad Capital Flotante',
            ruler: 'Rey Valerius el Audaz',
            population: '120,000 habitantes',
            climate: 'Templado, vientos constantes',
            danger_level: 'Seguro'
        },
        tags: ['geografía', 'capital', 'flotante']
    },
    {
        id: 'orden-del-alba',
        title: 'Orden del Alba',
        type: 'faction',
        content: `# Orden del Alba

Una orden militar y religiosa dedicada al resguardo del equilibrio mágico y a la protección del trono en [[El Reino de Lyteros]].

## Doctrina y Creencias
Los Caballeros del Alba creen que el [[Cristal Astral]] es un regalo sagrado de los antiguos dioses del cielo. Su principal deber es evitar el uso egoísta de la magia cristalina, confiscando reliquias inestables y castigando a los hechiceros oscuros.

## Rangos
*   **Gran Maestro:** Posición ocupada actualmente por el [[Rey Valerius el Audaz]].
*   **Paladín de la Luz:** Oficiales que dirigen regimientos y guarniciones.
*   **Templario del Cristal:** Protectores estacionados en las minas y en la [[Ciudadela de Cristal]].`,
        metadata: {
            leader: 'Rey Valerius el Audaz',
            hq: 'Fortaleza del Alba, Ciudadela de Cristal',
            members_title: 'Caballeros del Alba',
            goals: 'Custodiar la magia del Cristal Astral y proteger el reino',
            influence: 'Continental'
        },
        tags: ['organización', 'milicia', 'orden']
    },
    {
        id: 'cristal-astral',
        title: 'Cristal Astral',
        type: 'item',
        content: `# Cristal Astral

Una sustancia mineral cristalina translúcida que emite un suave brillo cian. Es la fuente de energía más codiciada en [[El Reino de Lyteros]].

## Propiedades
Los cristales contienen energía mágica comprimida. Al ser refinados, pueden liberar un calor constante, generar empuje antigravitatorio o proyectar campos de fuerza. Sin embargo, su sobreexplotación desató catástrofes como la [[Guerra de la Fractura]].

## Origen
Se rumorea que cayeron del cielo hace miles de años como una lluvia de estrellas, quedando enterrados en las profundidades de la tierra.`,
        metadata: {
            item_type: 'Reliquia / Recurso Mágico',
            creator: 'Origen Desconocido (Fallen Stars)',
            rarity: 'Legendario',
            magic_properties: 'Generación de energía limpia y campos de antigravedad',
            location: 'Yacimientos de Lyteros y el Palacio Real'
        },
        tags: ['reliquia', 'magia', 'recurso']
    },
    {
        id: 'guerra-de-la-fractura',
        title: 'Guerra de la Fractura',
        type: 'event',
        content: `# Guerra de la Fractura

Un conflicto devastador que duró siete años y redefinió las fronteras de [[El Reino de Lyteros]].

## Antecedentes
La guerra estalló cuando los barones del norte, liderados por el ambicioso [[Lord Malakor]], intentaron monopolizar la mina más grande de [[Cristal Astral]], el Gran Cráter.

## Consecuencias
El conflicto concluyó cuando el [[Rey Valerius el Audaz]] derrotó a Malakor en combate singular. Sin embargo, la sobrecarga de energía durante la batalla fracturó la tierra, creando el cañón que hoy separa las provincias y dejando cicatrices mágicas permanentes en la población.`,
        metadata: {
            date: 'Año 412 d.F. (Duración: 7 años)',
            location: 'El Gran Cráter y Llanuras del Norte',
            participants: 'Rey Valerius, Lord Malakor, Fuerzas de la Corona',
            outcome: 'Victoria real, destierro de Malakor y fractura geográfica'
        },
        tags: ['historia', 'conflicto', 'guerra']
    },
    {
        id: 'lord-malakor',
        title: 'Lord Malakor',
        type: 'character',
        content: `# Lord Malakor

Antiguo señor de las marcas del norte y una vez general de confianza de la corona. Actualmente es el líder de los Proscritos en el exilio.

## La Caída
Malakor creía que restringir el uso del [[Cristal Astral]] frenaba el progreso humano. Durante la [[Guerra de la Fractura]], intentó fusionar su cuerpo con un fragmento corrupto del cristal, lo que le dio inmenso poder pero deformó su mente y su físico.

## Paradero
Tras su derrota a manos de [[Rey Valerius el Audaz]], huyó a las Tierras Sombrías del norte. Desde allí planea su venganza y el derrocamiento de la [[Ciudadela de Cristal]].`,
        metadata: {
            race: 'Humano (Corrupto)',
            age: '50 años',
            alignment: 'Caótico Malvado',
            profession: 'Señor de la Guerra / Brujo del Cristal',
            faction: 'Los Proscritos',
            status: 'Vivo (Exiliado)'
        },
        tags: ['personaje', 'rival', 'villano']
    }
];

export const MOCK_PINS = [
    {
        lat: 380,
        lng: 490,
        title: 'Ciudadela de Cristal',
        linkId: 'ciudadela-de-cristal',
        color: 'gold'
    },
    {
        lat: 610,
        lng: 390,
        title: 'El Gran Cráter (Campo de la Fractura)',
        linkId: 'guerra-de-la-fractura',
        color: 'purple'
    },
    {
        lat: 220,
        lng: 680,
        title: 'Monasterio de la Orden',
        linkId: 'orden-del-alba',
        color: 'blue'
    }
];

export const MOCK_RELATIONS = [
    {
        sourceId: 'valerius-el-audaz',
        targetId: 'orden-del-alba',
        label: 'Gran Maestro de',
        color: '#5352ed'
    },
    {
        sourceId: 'lord-malakor',
        targetId: 'valerius-el-audaz',
        label: 'Enemigo jurado de',
        color: '#ff4757'
    },
    {
        sourceId: 'valerius-el-audaz',
        targetId: 'ciudadela-de-cristal',
        label: 'Gobierna desde',
        color: '#2ed573'
    }
];

export const MOCK_TIMELINE = [
    {
        year: 230,
        title: 'Descubrimiento del Cristal Astral',
        era: 'Primera Edad',
        desc: 'Los primeros exploradores descubren gemas cian brillantes flotando en cuevas profundas, marcando el inicio de la era mágica.',
        linkId: 'cristal-astral'
    },
    {
        year: 412,
        title: 'Estallido de la Guerra de la Fractura',
        era: 'Segunda Edad',
        desc: 'Los barones del norte se levantan en armas para reclamar los yacimientos del Gran Cráter.',
        linkId: 'guerra-de-la-fractura'
    },
    {
        year: 419,
        title: 'La Batalla Final y Destierro',
        era: 'Segunda Edad',
        desc: 'Valerius derrota a Malakor. El Gran Cráter se fractura físicamente debido a una explosión de energía cristalina.',
        linkId: 'lord-malakor'
    },
    {
        year: 420,
        title: 'Refundación de la Orden del Alba',
        era: 'Tercera Edad',
        desc: 'Valerius es coronado rey absoluto y funda la Orden militar para resguardar la paz y los cristales.',
        linkId: 'orden-del-alba'
    }
];
