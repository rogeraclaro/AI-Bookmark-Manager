# AI Bookmark Manager - Documentació Tècnica

**Data:** 4 de Desembre de 2025
**Versió:** 1.0
**Autor:** Roger Masellas

---

## 📋 Índex

1. [Descripció del Projecte](#descripció-del-projecte)
2. [Arquitectura General](#arquitectura-general)
3. [Estructura del Projecte](#estructura-del-projecte)
4. [Components Principals](#components-principals)
5. [Flux de Dades](#flux-de-dades)
6. [Sistema de Categorització amb IA](#sistema-de-categorització-amb-ia)
7. [Gestió de Duplicats](#gestió-de-duplicats)
8. [Sistema de Tracking d'Eliminacions](#sistema-de-tracking-deliminacions)
9. [Emmagatzematge i Sincronització](#emmagatzematge-i-sincronització)
10. [Configuració del Servidor VPS](#configuració-del-servidor-vps)
11. [Estructures de Dades](#estructures-de-dades)
12. [Característiques Especials](#característiques-especials)
13. [Build i Deployment](#build-i-deployment)

---

## Descripció del Projecte

AI Bookmark Manager és una aplicació web desenvolupada inicialment amb Google AI Studio que permet gestionar i organitzar els bookmarks/preferits exportats des de Twitter (X). L'aplicació utilitza Intel·ligència Artificial (Google Gemini) per analitzar, categoritzar i titular automàticament els tweets relacionats amb IA.

### Objectiu Principal

Facilitar l'organització de bookmarks de Twitter relacionats amb Intel·ligència Artificial mitjançant:
- Categorització automàtica per temàtiques
- Generació de títols descriptius en català
- Filtrat de contingut no relacionat amb IA
- Eliminació de duplicats
- Sincronització multi-dispositiu

### Funcionalitats Clau

1. **Import de JSON:** Lectura de fitxers JSON exportats des de Twitter
2. **Processament amb IA:** Anàlisi automàtic amb Google Gemini per:
   - Determinar si el tweet és relacionat amb IA
   - Generar un títol descriptiu en català
   - Assignar una categoria apropiada
   - Extreure enllaços externs rellevants
3. **Filtrat Intel·ligent:**
   - Descarta tweets no relacionats amb IA
   - Crea un fitxer descarregable amb tweets rebutjats
4. **Gestió de Duplicats:**
   - Detecta i evita la importació de tweets duplicats
   - Manté un registre de tweets eliminats per evitar reimportacions
5. **Sincronització VPS:**
   - Emmagatzema dades en un servidor VPS
   - Permet accés des de múltiples dispositius
   - Sincronització automàtica mitjançant API REST
6. **Sistema de Backup:**
   - Exportació de totes les dades
   - Importació per restaurar o fusionar dades

---

## Arquitectura General

### Stack Tecnològic

#### Frontend
- **Framework:** React 19.2.0
- **Llenguatge:** TypeScript (~5.9.3)
- **Build Tool:** Vite 7.2.4
- **Estils:** Tailwind CSS
- **Icones:** Lucide React
- **IA:** Google Generative AI SDK (@google/genai 1.30.0)

#### Backend (VPS)
- **Runtime:** Node.js
- **Framework:** Express 4.18.2
- **CORS:** cors 2.8.5
- **Storage:** Sistema de fitxers (db.json)

### Patró d'Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   App.tsx    │  │ UI Components│  │  Services    │  │
│  │  (Control)   │→ │  (Brutalist) │  │  - Gemini    │  │
│  │              │  │              │  │  - Storage   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                            ↕
                    (API REST / localStorage)
                            ↕
┌─────────────────────────────────────────────────────────┐
│                  Backend VPS (Express)                   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  server.js (Port 3002)                           │   │
│  │  - Auth Middleware (x-api-secret)                │   │
│  │  - CRUD Endpoints                                │   │
│  │  - db.json (File Storage)                        │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Principis de Disseny

1. **Component-Based:** Arquitectura modular amb components reutilitzables
2. **Separation of Concerns:** Separació clara entre UI, lògica de negoci i serveis
3. **Functional Programming:** Ús extensiu de React Hooks i programació funcional
4. **Type Safety:** TypeScript per prevenir errors en temps de desenvolupament
5. **Storage Agnostic:** Abstracció del sistema d'emmagatzematge (local/remot)

---

## Estructura del Projecte

### Arbre de Directoris

```
ai-bookmarks/
├── public/              # Assets públics
├── src/
│   ├── components/
│   │   └── UI.tsx      # Components UI reutilitzables (brutalista)
│   ├── services/
│   │   ├── geminiService.ts   # Integració amb Gemini AI
│   │   └── storage.ts         # Capa d'abstracció d'emmagatzematge
│   ├── App.tsx         # Component principal (890 línies)
│   ├── main.tsx        # Punt d'entrada React
│   ├── types.ts        # Definicions TypeScript
│   ├── translations.ts # Strings UI i prompts IA (català)
│   ├── index.css       # Tailwind + CSS custom
│   └── vite-env.d.ts   # Types variables d'entorn
├── .env                # Configuració (API keys, VPS URL)
├── index.html          # HTML d'entrada
├── package.json        # Dependencies i scripts
├── vite.config.ts      # Configuració Vite
├── tsconfig.json       # Configuració TypeScript
└── eslint.config.js    # Configuració ESLint
```

### Fitxers de Configuració

#### .env
```env
VITE_API_KEY=
VITE_STORAGE_API_URL=
VITE_STORAGE_SECRET=
```

#### vite.config.ts
- Servidor dev: port 3000, host 0.0.0.0
- Plugin React amb Fast Refresh
- Càrrega de variables d'entorn

#### package.json - Scripts
```json
{
  "dev": "vite",          // Inicia servidor desenvolupament
  "build": "tsc && vite build",  // Compila TypeScript + build
  "lint": "eslint .",     // Verifica codi
  "preview": "vite preview"  // Preview build producció
}
```

---

## Components Principals

### 1. App.tsx - Component Principal (890 línies)

**Responsabilitats:**
- Gestió centralitzada d'estat
- Orquestració de la UI (layout, modals, navegació)
- Lògica d'import/export de dades
- Processament de tweets amb Gemini
- Sistema de logging i progrés

**Estat Principal:**
```typescript
// Dades
bookmarks: Bookmark[]           // Tots els bookmarks processats
categories: Category[]          // Llista de categories
deletedIds: string[]           // Blacklist d'IDs eliminats

// UI State
isLoading: boolean             // Indica processament actiu
selectedCategory: string       // Categoria filtrada visualment
showMobileMenu: boolean        // Control menú mòbil
showLogs: boolean             // Mostra consola de logs

// Processament
progress: { current: number, total: number }  // Progrés IA
logs: LogEntry[]              // Registre del procés d'import
rejectedTweets: TweetRaw[]    // Tweets no-IA per exportar

// Modals
editModalState: { bookmark, show }   // Edició bookmark
deleteModalState: { id, originalId, show }  // Confirmació eliminació
resultsModalState: { added, skipped, rejected, show }  // Resum import
```

**Funcions Clau:**

1. **handleFileUpload()**
   - Llegeix fitxer JSON pujat per l'usuari
   - Detecta tipus: backup propi o export de Twitter
   - Crida processTweetsData() o mergeix backup

2. **processTweetsData()**
   - Extreu tweets del JSON de Twitter
   - Deduplica contra bookmarks existents i deletedIds
   - Crida processBookmarksWithGemini()

3. **processBookmarksWithGemini()**
   - Processa tweets amb Gemini (1 a 1)
   - Gestiona rate limiting (4s entre requests)
   - Retry amb exponential backoff en errors 429
   - Separa tweets IA vs no-IA
   - Actualitza progress i logs en temps real

4. **confirmDelete()**
   - Elimina bookmark de l'estat
   - Afegeix ID a deletedIds (blacklist)
   - Persisteix canvis a storage

5. **exportBackupJSON()**
   - Genera JSON amb bookmarks, categories, deletedIds
   - Inclou metadata (versió, timestamp)
   - Descarrega com a fitxer

### 2. geminiService.ts - Integració IA

**Configuració:**
```typescript
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: ProcessedTweetResultSchema,
    maxOutputTokens: 500  // Prevenir loops infinits
  }
})
```

**Funcions:**

1. **processBookmarksWithGemini(tweets, onProgress, onLog)**
   - Batch processing: itera tweets 1 a 1
   - Trunca text a 1000 chars per request
   - Crida generateContent() amb system instruction
   - Retry logic amb exponential backoff
   - Retorna arrays separats: AI tweets i rejected tweets

2. **handleRateLimitWithRetry()**
   - Detecta errors 429 (rate limit)
   - Exponential backoff: 10s → 15s → 22.5s → ... → 60s max
   - Màxim 10 intents
   - Logs detallats de cada retry

**Schema de Resposta:**
```typescript
{
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      originalId: STRING,
      isAI: BOOLEAN,
      title: STRING,        // Català
      description: STRING,  // No utilitzat
      category: STRING,     // De llista predefinida
      externalLinks: ARRAY<STRING>
    }
  }
}
```

### 3. storage.ts - Abstracció d'Emmagatzematge

**Estratègia Dual:**
```typescript
const USE_API = !!import.meta.env.VITE_STORAGE_SECRET

// Si existeix VITE_STORAGE_SECRET → API
// Altrament → localStorage
```

**API Wrapper:**
```typescript
async function apiRequest<T>(endpoint, method, data?) {
  const response = await fetch(`${API_URL}/${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-api-secret': API_SECRET  // Autenticació
    },
    body: data ? JSON.stringify(data) : undefined
  })

  if (!response.ok) throw new Error(`API error: ${response.status}`)
  const result = await response.json()
  return result.data  // Desembolicar { data: [...] }
}
```

**Funcions CRUD:**
- `loadBookmarks()` / `saveBookmarks(data)`
- `loadCategories()` / `saveCategories(data)`
- `loadDeletedIds()` / `saveDeletedIds(data)`
- `resetStorage()` - Esborra tot

**LocalStorage Keys:**
- `ai-bookmarks-data`
- `ai-bookmarks-categories`
- `ai-bookmarks-deleted-ids`

### 4. UI.tsx - Sistema de Disseny Brutalista

**Components Disponibles:**

1. **Button**
   - Variants: primary, secondary, danger, ghost
   - Estats: hover, active (translate + shadow)
   - Suport per icons (Lucide)

2. **Card**
   - Border gruixut negre (border-2)
   - Shadow hard: shadow-[4px_4px_0px_0px_#000]
   - Hover effect: translate + augment shadow

3. **Input / TextArea**
   - Border gruixut amb focus state
   - Padding generós
   - Tipografia bold

4. **Select**
   - Estilitzat custom (brutalist)
   - Dropdown consistent amb disseny

5. **Badge**
   - Etiquetes de categoria
   - Colors d'accent (groc #ffc107)
   - Text bold

6. **Modal**
   - Overlay amb backdrop blur
   - Animacions slide-in
   - Sistema de close button
   - Scroll independent del body

**Estètica Brutalista:**
```css
/* Característiques clau */
border: 2px solid black
box-shadow: 4px 4px 0px 0px #000
font-weight: 800 (font-black)
colors: #000 (black), #fff (white), #ffc107 (yellow)

/* Efectes interactius */
hover: translate(-2px, -2px) + shadow-[6px_6px_0px_0px_#000]
active: translate(0, 0) + shadow-[0px_0px_0px_0px_#000]
```

---

## Flux de Dades

### 1. Flux d'Importació Complert

```
┌───────────────────────────────────────────────────────────┐
│ 1. USER UPLOAD JSON                                       │
│    - Twitter export o backup propi                        │
└────────────────────┬──────────────────────────────────────┘
                     ↓
┌───────────────────────────────────────────────────────────┐
│ 2. handleFileUpload()                                     │
│    - Detecta tipus de fitxer                              │
│    - Valida estructura JSON                               │
└────────────────────┬──────────────────────────────────────┘
                     ↓
         ┌───────────┴───────────┐
         │                       │
    [Backup]               [Twitter Export]
         │                       │
         ↓                       ↓
┌────────────────┐    ┌──────────────────────┐
│ Merge Backup   │    │ processTweetsData()  │
│ - Categories   │    │ - Extreu tweets      │
│ - Bookmarks    │    │ - Parse entities     │
│ - DeletedIds   │    └──────────┬───────────┘
└────────────────┘               ↓
                     ┌──────────────────────────────┐
                     │ 3. DEDUPLICACIÓ              │
                     │ - Filter IDs existents       │
                     │ - Filter deletedIds          │
                     │ - Count skipped              │
                     └──────────┬───────────────────┘
                                ↓
                     ┌──────────────────────────────┐
                     │ 4. processBookmarksWithGemini│
                     │ FOR EACH tweet:              │
                     │   - Truncate 1000 chars      │
                     │   - Call Gemini API          │
                     │   - Wait 4s (rate limit)     │
                     │   - Retry if 429 error       │
                     │   - Parse JSON response      │
                     │   - Update progress          │
                     └──────────┬───────────────────┘
                                ↓
                     ┌──────────────────────────────┐
                     │ 5. SEPARACIÓ AI vs NO-AI     │
                     │ IF isAI = true:              │
                     │   → Create Bookmark          │
                     │ IF isAI = false:             │
                     │   → Add to rejectedTweets    │
                     └──────────┬───────────────────┘
                                ↓
                     ┌──────────────────────────────┐
                     │ 6. CREATE BOOKMARK OBJECTS   │
                     │ - Generate unique ID         │
                     │ - Truncate desc (280 chars)  │
                     │ - Extract metadata           │
                     │ - Assign category            │
                     └──────────┬───────────────────┘
                                ↓
                     ┌──────────────────────────────┐
                     │ 7. UPDATE STATE & STORAGE    │
                     │ - setBookmarks([...new])     │
                     │ - setCategories([...union])  │
                     │ - saveBookmarks()            │
                     │ - saveCategories()           │
                     └──────────┬───────────────────┘
                                ↓
                     ┌──────────────────────────────┐
                     │ 8. SHOW RESULTS              │
                     │ - Modal amb estadístiques    │
                     │ - Opció download rejected    │
                     └──────────────────────────────┘
```

### 2. Flux de Visualització

```
STATE (bookmarks, categories, selectedCategory)
              ↓
        useMemo() Filtra per categoria
              ↓
        Grid Layout (responsive)
              ↓
    BookmarkCard per cada bookmark
              ↓
    Render: Badge + Title + Description + Links + Actions
```

### 3. Flux d'Eliminació

```
Click Delete Button
        ↓
Show Delete Modal (warning)
        ↓
User Confirms
        ↓
confirmDelete()
  - Remove from bookmarks array
  - Add originalId to deletedIds
  - saveBookmarks()
  - saveDeletedIds()
        ↓
Re-render UI (card desapareix)
```

---

## Sistema de Categorització amb IA

### Prompt del Sistema (translations.ts:89-104)

```
Ets un assistent que analitza tweets i determina si estan
relacionats amb Intel·ligència Artificial.

REGLES ESTRICTES:
1. Si el tweet NO tracta sobre IA/ML/LLM/Data Science:
   - Posa isAI: false
   - Deixa title, description, category, externalLinks buits

2. Si el tweet SÍ tracta sobre IA:
   - Posa isAI: true
   - Genera un TÍTOL CURT I DESCRIPTIU en CATALÀ
   - NO generar description (s'usarà el text original)
   - Assigna UNA categoria de la llista
   - Extreu enllaços externs (NO twitter.com/x.com)

CATEGORIES DISPONIBLES:
- Divulgació: Contingut educatiu, explicacions, guies
- Agents: Sistemes d'agents autònoms, multi-agent
- Skills: Capacitats, funcions, eines específiques
- RAG: Retrieval Augmented Generation, embeddings
- Cursos: Formació, tutorials estructurats
- Notícies: Actualitat, anuncis, releases
- Eines: Software, APIs, frameworks, aplicacions
- Altres: Altres temes relacionats amb IA

MOLT IMPORTANT:
- El títol ha de ser FINAL, sense explicacions ni raonament
- Sigues estricte: només marca isAI=true si és clarament IA
- NO inventar informació que no estigui al tweet
```

### Model i Configuració

**Model:** Gemini 2.0 Flash Experimental
- Ràpid i econòmic (ideal per batch processing)
- Suporta JSON schema enforced
- 15 RPM en tier gratuït

**GenerationConfig:**
```typescript
{
  responseMimeType: "application/json",
  responseSchema: ProcessedTweetResultSchema,
  maxOutputTokens: 500  // Prevenir loops infinits
}
```

### Esquema de Validació

```typescript
const ProcessedTweetResultSchema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      originalId: {
        type: SchemaType.STRING,
        description: "ID original del tweet"
      },
      isAI: {
        type: SchemaType.BOOLEAN,
        description: "true si relacionat amb IA, false si no"
      },
      title: {
        type: SchemaType.STRING,
        description: "Títol curt en CATALÀ (buit si isAI=false)"
      },
      description: {
        type: SchemaType.STRING,
        description: "NO GENERAR, deixar buit sempre"
      },
      category: {
        type: SchemaType.STRING,
        description: "Categoria assignada (buit si isAI=false)",
        enum: [
          "Divulgació", "Agents", "Skills", "RAG",
          "Cursos", "Notícies", "Eines", "Altres"
        ]
      },
      externalLinks: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: "URLs externs mencionats"
      }
    },
    required: ["originalId", "isAI", "title", "category", "externalLinks"]
  }
}
```

### Categories Predefinides

| Categoria   | Descripció                                    | Exemples                          |
|-------------|-----------------------------------------------|-----------------------------------|
| Divulgació  | Contingut educatiu i explicatiu               | Articles, threads explicatius     |
| Agents      | Sistemes d'agents autònoms                    | AutoGPT, BabyAGI, multi-agents    |
| Skills      | Capacitats i funcions específiques            | Function calling, tool use        |
| RAG         | Retrieval Augmented Generation                | Vector DBs, embeddings, context   |
| Cursos      | Formació estructurada                         | MOOCs, tutorials, workshops       |
| Notícies    | Actualitat i anuncis                          | Product launches, research papers |
| Eines       | Software i frameworks                         | LangChain, LlamaIndex, APIs       |
| Altres      | Altres temes d'IA                             | Fallback per contingut ambigu     |

### Exemples de Categorització

**Exemple 1 - Tweet sobre IA (isAI: true):**
```
Input: "New paper from OpenAI on improving RAG with
        hierarchical indexing https://arxiv.org/..."

Output:
{
  originalId: "1234567890",
  isAI: true,
  title: "Nou paper d'OpenAI sobre millora de RAG amb indexació jeràrquica",
  description: "",
  category: "RAG",
  externalLinks: ["https://arxiv.org/..."]
}
```

**Exemple 2 - Tweet NO IA (isAI: false):**
```
Input: "Just had the best pizza in Naples! 🍕"

Output:
{
  originalId: "0987654321",
  isAI: false,
  title: "",
  description: "",
  category: "",
  externalLinks: []
}
```

---

## Gestió de Duplicats

### Estratègia de Deduplicació

**Objectiu:** Evitar processar tweets ja existents o eliminats prèviament

**Implementació (App.tsx:246-259):**

```typescript
function processTweetsData(tweetsData: TweetRaw[]) {
  // 1. Extreure IDs de bookmarks existents
  const existingIds = new Set(
    bookmarks.map(b => {
      const parts = b.originalLink.split('/')
      return parts[parts.length - 1]  // Últim segment = tweet ID
    })
  )

  // 2. Crear Set amb IDs eliminats (blacklist)
  const blacklistIds = new Set(deletedIds)

  // 3. Filtrar tweets duplicats o eliminats
  const uniqueTweets = tweetsData.filter(t => {
    const tweetId = t.id_str || t.id
    return !existingIds.has(tweetId) &&
           !blacklistIds.has(tweetId)
  })

  // 4. Comptar skipped per logging
  const skippedCount = tweetsData.length - uniqueTweets.length

  addLog('info', `${uniqueTweets.length} tweets nous (${skippedCount} duplicats ignorats)`)

  // 5. Processar només tweets únics
  await processBookmarksWithGemini(uniqueTweets, ...)
}
```

### Flux de Deduplicació

```
IMPORT JSON (1000 tweets)
        ↓
Extract tweet IDs → [id1, id2, id3, ...]
        ↓
Check against existing bookmarks (50 matches)
        ↓
Check against deletedIds blacklist (10 matches)
        ↓
RESULT: 940 tweets únics a processar
        ↓
Log: "940 tweets nous (60 duplicats ignorats)"
```

### Format d'IDs

**Twitter/X Tweet ID:**
- Format: String numèric de 19 dígits
- Exemple: "1862103456789012345"
- Origen: `tweet.id_str` o `tweet.id`
- URL: `https://twitter.com/i/web/status/1862103456789012345`

**Bookmark ID (intern):**
- Format: `{tweetId}-{randomString}`
- Exemple: "1862103456789012345-a7b3c9"
- Generació: `${originalId}-${Math.random().toString(36).substr(2, 6)}`
- Propòsit: Clau única per React keys i edició

### Casos Especials

1. **Mateix tweet en múltiples imports:**
   - Primera vegada: Processat i guardat
   - Següents vegades: Detectat com duplicat, ignorat

2. **Tweet eliminat i tornat a importar:**
   - Estat: `deletedIds.includes(tweetId) === true`
   - Acció: Ignorat automàticament
   - Logging: Comptat com "duplicat ignorat"

3. **Backup merge:**
   - Els IDs del backup també es comproven
   - Només s'afegeixen bookmarks nous
   - Categories es fusionen (unió de sets)

---

## Sistema de Tracking d'Eliminacions

### Objectiu

Crear una "blacklist" persistent d'IDs de tweets eliminats per l'usuari, evitant que es tornin a importar en futurs uploads de JSON que continguin aquests tweets.

### Implementació

**Estructura de Dades:**
```typescript
deletedIds: string[]  // Array d'IDs de tweets eliminats

// Exemple:
[
  "1862103456789012345",
  "1862104567890123456",
  "1862105678901234567"
]
```

**Flux d'Eliminació (App.tsx:447-453):**

```typescript
const confirmDelete = async () => {
  const { id, originalId } = deleteModalState

  // 1. Eliminar bookmark de l'array
  setBookmarks(prev => prev.filter(b => b.id !== id))

  // 2. Afegir originalId a blacklist
  if (originalId) {
    setDeletedIds(prev => [...prev, originalId])
  }

  // 3. Tancar modal
  setDeleteModalState({ id: '', originalId: '', show: false })
}
```

**Efecte de Persistència:**
```typescript
useEffect(() => {
  if (deletedIds.length > 0) {
    saveDeletedIds(deletedIds)  // Guarda a storage (API o localStorage)
  }
}, [deletedIds])
```

### Modal d'Advertència

Quan l'usuari clica el botó de delete, apareix un modal amb:

```
ATENCIÓ: Aquesta acció és permanent

Si elimines aquest bookmark:
- Desapareixerà de la teva llista
- NO es tornarà a importar en futurs uploads
- L'ID quedarà a la blacklist per sempre

Estàs segur que vols eliminar-lo?

[Cancel·lar]  [Eliminar]
```

### Sincronització Multi-Dispositiu

**Escenari:** Usuari amb 2 dispositius (ordinador + mòbil)

1. **Dispositiu A:** Elimina tweet X
   - `deletedIds` s'actualitza localment
   - POST `/deleted` → VPS guarda blacklist actualitzada

2. **Dispositiu B:** Carrega app
   - GET `/deleted` → Descarrega blacklist del VPS
   - Té la blacklist sincronitzada amb dispositiu A

3. **Dispositiu B:** Import JSON amb tweet X
   - Deduplicació detecta X a `deletedIds`
   - Tweet X no es processa ni es mostra

### Persistència

**LocalStorage:**
```javascript
Key: "ai-bookmarks-deleted-ids"
Value: ["1862103456789012345", "1862104567890123456", ...]
```

**VPS (db.json):**
```json
{
  "bookmarks": [...],
  "categories": [...],
  "deletedIds": [
    "1862103456789012345",
    "1862104567890123456"
  ]
}
```

**Backup Export:**
```json
{
  "backupVersion": 1,
  "timestamp": 1733328000000,
  "bookmarks": [...],
  "categories": [...],
  "deletedIds": [
    "1862103456789012345",
    "1862104567890123456"
  ]
}
```

### Limitacions i Consideracions

1. **No hi ha "undo":**
   - Un cop eliminat, no es pot recuperar des de la UI
   - Solució: Restaurar des d'un backup anterior

2. **Creixement de blacklist:**
   - La llista pot créixer indefinidament
   - Possible millora futura: System de garbage collection

3. **Reset manual:**
   - Endpoint `/reset` esborra tot (incloent deletedIds)
   - Usar amb precaució

---

## Emmagatzematge i Sincronització

### Arquitectura d'Emmagatzematge

```
┌────────────────────────────────────────────┐
│         storage.ts (Abstraction Layer)     │
│                                            │
│  const USE_API = !!VITE_STORAGE_SECRET     │
│            ↓                     ↓         │
│      [API Mode]           [Local Mode]     │
└────────────────────────────────────────────┘
         ↓                         ↓
    ┌────────┐              ┌──────────────┐
    │  VPS   │              │ localStorage │
    │  API   │              │  (Browser)   │
    └────────┘              └──────────────┘
```

### Mode Local (localStorage)

**Quan s'activa:**
- `VITE_STORAGE_SECRET` no està definit al .env
- Navegador suporta localStorage

**Implementació:**
```typescript
function saveBookmarks(data: Bookmark[]) {
  localStorage.setItem(
    'ai-bookmarks-data',
    JSON.stringify(data)
  )
}

function loadBookmarks(): Bookmark[] {
  const stored = localStorage.getItem('ai-bookmarks-data')
  return stored ? JSON.parse(stored) : []
}
```

**Avantatges:**
- Funciona offline
- Sense latència
- Sense cost servidor

**Desavantatges:**
- Només accessible des del mateix navegador
- Límit de ~10MB
- Pot ser esborrat per l'usuari

### Mode API (VPS)

**Quan s'activa:**
- `VITE_STORAGE_SECRET` està definit al .env

**Configuració:**
```typescript
const API_URL = import.meta.env.VITE_STORAGE_API_URL
const API_SECRET = import.meta.env.VITE_STORAGE_SECRET

```

**Endpoints:**

| Endpoint        | Mètode | Descripció                         | Auth |
|-----------------|--------|------------------------------------|------|
| `/bookmarks`    | GET    | Obté tots els bookmarks            | ✓    |
| `/bookmarks`    | POST   | Guarda array de bookmarks          | ✓    |
| `/categories`   | GET    | Obté llista de categories          | ✓    |
| `/categories`   | POST   | Guarda array de categories         | ✓    |
| `/deleted`      | GET    | Obté IDs eliminats                 | ✓    |
| `/deleted`      | POST   | Guarda array d'IDs eliminats       | ✓    |
| `/reset`        | POST   | Esborra totes les dades            | ✓    |

**Format Request:**
```http
POST /bookmarks HTTP/1.1
Host: xxx.xxx.xxx.xxx:xxxx
Content-Type: application/json
x-api-secret: XXXXXXXXXXXXXX

{
  "data": [
    { "id": "...", "title": "...", ... },
    { "id": "...", "title": "...", ... }
  ]
}
```

**Format Response:**
```json
{
  "data": [
    { "id": "...", "title": "...", ... },
    { "id": "...", "title": "...", ... }
  ]
}
```

**Gestió d'Errors:**
```typescript
async function apiRequest<T>(endpoint, method, data?) {
  try {
    const response = await fetch(...)

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const result = await response.json()
    return result.data

  } catch (error) {
    console.error(`Failed to ${method} ${endpoint}:`, error)
    throw error
  }
}
```

**Avantatges:**
- Sincronització multi-dispositiu
- Backup automàtic al servidor
- No depèn del navegador

**Desavantatges:**
- Requereix connexió a internet
- Latència de xarxa
- Cost de servidor VPS

### Sistema d'Autenticació

**Mètode:** Custom secret header

```http
x-api-secret: xxxx
```

**Validació (server.js):**
```javascript
const checkAuth = (req, res, next) => {
  const secret = req.headers['x-api-secret']
  if (secret !== API_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' })
  }
  next()
}

app.use(checkAuth)  // Aplicat a tots els endpoints
```

**Seguretat:**
- ⚠️ Secret compartit simple (no JWT)
- ⚠️ HTTP sense HTTPS (dades en clar)
- ✅ Suficient per ús personal
- ❌ NO adequat per producció pública

**Millores Recomanades (futur):**
- Migrar a HTTPS
- Implementar JWT amb refresh tokens
- Rate limiting per IP
- Hashing de secrets

### Race Conditions

**Problema Potencial:**
Dos dispositius actualitzen simultàniament:

```
Temps    | Dispositiu A          | Dispositiu B
---------|----------------------|----------------------
T0       | GET /bookmarks       | GET /bookmarks
         | → [b1, b2, b3]       | → [b1, b2, b3]
T1       | Afegir b4            | Afegir b5
T2       | POST [b1,b2,b3,b4]   | POST [b1,b2,b3,b5]
T3       | ✅ Guardat           | ✅ Guardat (SOBREESCRIU)
Result   | b4 ES PERD!          | Només b5 queda
```

**Solució Actual:**
- Última escriptura guanya (last-write-wins)
- Acceptable per ús personal amb 1 usuari

**Millores Futures:**
- Timestamps per detectar conflictes
- Merge automàtic basat en IDs únics
- Versionat optimista (etags)
- WebSockets per sync en temps real

---

## Configuració del Servidor VPS

### Fitxers del Servidor

**Ubicació:** `/root/ai-bookmarks-backend/` (o similar al VPS)

**1. server.js**
```javascript
const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')

const app = express()
const PORT = 3002
const DB_FILE = path.join(__dirname, 'db.json')
const API_SECRET = 'xxxx'

// Middleware
app.use(cors())  // Permet requests des de qualsevol origen
app.use(express.json({ limit: '50mb' }))  // Parse JSON + límit gran

// Auth Middleware
const checkAuth = (req, res, next) => {
  const secret = req.headers['x-api-secret']
  if (secret !== API_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' })
  }
  next()
}

app.use(checkAuth)

// Helper functions
const readDB = () => {
  if (!fs.existsSync(DB_FILE)) {
    return { bookmarks: [], categories: [], deletedIds: [] }
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
}

const writeDB = (data) => {
  const current = readDB()
  const newData = { ...current, ...data }
  fs.writeFileSync(DB_FILE, JSON.stringify(newData, null, 2))
}

// Endpoints
app.get('/bookmarks', (req, res) => {
  const db = readDB()
  res.json({ data: db.bookmarks || [] })
})

app.post('/bookmarks', (req, res) => {
  const { data } = req.body
  writeDB({ bookmarks: data })
  res.json({ success: true })
})

app.get('/categories', (req, res) => {
  const db = readDB()
  res.json({ data: db.categories || [] })
})

app.post('/categories', (req, res) => {
  const { data } = req.body
  writeDB({ categories: data })
  res.json({ success: true })
})

app.get('/deleted', (req, res) => {
  const db = readDB()
  res.json({ data: db.deletedIds || [] })
})

app.post('/deleted', (req, res) => {
  const { data } = req.body
  writeDB({ deletedIds: data })
  res.json({ success: true })
})

app.post('/reset', (req, res) => {
  fs.writeFileSync(
    DB_FILE,
    JSON.stringify({
      bookmarks: [],
      categories: [],
      deletedIds: []
    })
  )
  res.json({ success: true })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
```

**2. package.json**
```json
{
  "name": "ai-bookmarks-backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.18.2"
  }
}
```

**3. db.json** (generat automàticament)
```json
{
  "bookmarks": [
    {
      "id": "1862103456789012345-a7b3c9",
      "title": "Guia completa sobre RAG amb LlamaIndex",
      "description": "Aprèn a implementar...",
      "author": "@username",
      "originalLink": "https://twitter.com/i/web/status/1862103456789012345",
      "externalLinks": ["https://llamaindex.ai/..."],
      "category": "RAG",
      "createdAt": 1733328000000
    }
  ],
  "categories": [
    "Divulgació",
    "Agents",
    "Skills",
    "RAG",
    "Cursos",
    "Notícies",
    "Eines",
    "Altres"
  ],
  "deletedIds": [
    "1862104567890123456"
  ]
}
```

### Instal·lació i Deploy

**1. Instal·lar Node.js al VPS:**
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar
node --version  # v20.x.x
npm --version   # 10.x.x
```

**2. Crear directori i pujar fitxers:**
```bash
mkdir -p /root/ai-bookmarks-backend
cd /root/ai-bookmarks-backend

# Pujar server.js i package.json via SCP/FTP
# O crear manualment amb nano/vim
```

**3. Instal·lar dependències:**
```bash
npm install
```

**4. Executar servidor:**
```bash
# Directe (per testing)
npm start

# Amb PM2 (recomanat per producció)
npm install -g pm2
pm2 start server.js --name ai-bookmarks
pm2 save
pm2 startup  # Configura autostart
```

**5. Configurar firewall:**
```bash
# UFW (Ubuntu)
sudo ufw allow 3002/tcp
sudo ufw reload

# iptables
sudo iptables -A INPUT -p tcp --dport 3002 -j ACCEPT
```

**6. (Opcional) Nginx reverse proxy:**
```nginx
# /etc/nginx/sites-available/ai-bookmarks
server {
    listen 80;
    server_name bookmarks.example.com;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Gestió del Servidor

**Comandes PM2:**
```bash
pm2 status              # Veure estat
pm2 logs ai-bookmarks   # Veure logs
pm2 restart ai-bookmarks  # Reiniciar
pm2 stop ai-bookmarks   # Aturar
pm2 delete ai-bookmarks # Eliminar
```

**Backup de db.json:**
```bash
# Backup manual
cp db.json db.json.backup

# Backup automàtic diari
crontab -e
# Afegir: 0 2 * * * cp /root/ai-bookmarks-backend/db.json /root/backups/db-$(date +\%Y\%m\%d).json
```

**Monitorització:**
```bash
# Logs en temps real
pm2 logs ai-bookmarks --lines 100

# Mètrics
pm2 monit
```

### Detalls de Xarxa

**IP Servidor:** 62.169.25.188
**Port:** 3002
**Protocol:** HTTP (no HTTPS)
**CORS:** Obert a tots els orígens (*)

**URL Completa:** `http://62.169.25.188:3002`

**Testing endpoint:**
```bash
# GET bookmarks
curl -H "x-api-secret: aAgYYud97Kp29Lif9u0i" \
     http://62.169.25.188:3002/bookmarks

# POST bookmark
curl -X POST \
     -H "Content-Type: application/json" \
     -H "x-api-secret: xxxxx" \
     -d '{"data":[{"id":"test","title":"Test"}]}' \
     http://xxx.xxx.xxx.xxx:xxxx/bookmarks
```

---

## Estructures de Dades

### TypeScript Types (types.ts)

**1. TweetRaw - Format Twitter Export**
```typescript
interface TweetRaw {
  full_text?: string        // Text complet del tweet
  text?: string             // Camp alternatiu per text
  id_str?: string           // ID del tweet (string)
  id?: string               // ID alternatiu
  created_at?: string       // Data creació format Twitter
  user?: {
    name?: string           // Nom display de l'usuari
    screen_name?: string    // @handle
  }
  entities?: {
    urls?: Array<{
      expanded_url: string  // URLs expandides
    }>
  }
}
```

**Exemple Real:**
```json
{
  "full_text": "Just released a new tutorial on RAG...",
  "id_str": "1862103456789012345",
  "created_at": "Wed Dec 04 10:30:00 +0000 2024",
  "user": {
    "name": "AI Researcher",
    "screen_name": "ai_researcher"
  },
  "entities": {
    "urls": [
      { "expanded_url": "https://example.com/tutorial" }
    ]
  }
}
```

**2. Bookmark - Format Intern Aplicació**
```typescript
interface Bookmark {
  id: string                // ID únic: {tweetId}-{random}
  title: string             // Títol generat per Gemini (català)
  description: string       // Text original (max 280 chars)
  author: string            // @username o nom display
  originalLink: string      // URL tweet: twitter.com/i/web/status/{id}
  externalLinks: string[]   // URLs extrets per Gemini
  category: string          // Categoria assignada
  createdAt: number         // Timestamp Unix (ms)
}
```

**Exemple:**
```json
{
  "id": "1862103456789012345-a7b3c9",
  "title": "Tutorial complet sobre implementació de RAG",
  "description": "Just released a new tutorial on RAG...",
  "author": "@ai_researcher",
  "originalLink": "https://twitter.com/i/web/status/1862103456789012345",
  "externalLinks": ["https://example.com/tutorial"],
  "category": "RAG",
  "createdAt": 1733313000000
}
```

**3. ProcessedTweetResult - Resposta Gemini**
```typescript
interface ProcessedTweetResult {
  originalId: string        // ID del tweet processat
  isAI: boolean             // true si relacionat amb IA
  title: string             // Títol generat (buit si isAI=false)
  description: string       // NO USAT (sempre buit)
  category: string          // Categoria (buit si isAI=false)
  externalLinks: string[]   // URLs extrets ([] si isAI=false)
}
```

**4. Category - Alias**
```typescript
type Category = string

// Valors permesos:
const DEFAULT_CATEGORIES = [
  "Divulgació",
  "Agents",
  "Skills",
  "RAG",
  "Cursos",
  "Notícies",
  "Eines",
  "Altres"
]
```

**5. LogEntry - Sistema de Logs**
```typescript
interface LogEntry {
  timestamp: Date           // Moment del log
  type: 'info' | 'success' | 'warning' | 'error'
  message: string           // Text del missatge
}
```

**Exemple:**
```json
{
  "timestamp": "2024-12-04T10:30:00.000Z",
  "type": "success",
  "message": "Processat tweet 15/20"
}
```

**6. BackupFormat - Fitxer d'Exportació**
```typescript
interface BackupFormat {
  backupVersion: number     // Versió del format (actualment 1)
  timestamp: number         // Unix timestamp de l'export
  categories: Category[]    // Llista de categories
  bookmarks: Bookmark[]     // Array de bookmarks
  deletedIds: string[]      // IDs eliminats (blacklist)
}
```

**Exemple:**
```json
{
  "backupVersion": 1,
  "timestamp": 1733313000000,
  "categories": ["Divulgació", "Agents", "RAG"],
  "bookmarks": [
    { "id": "...", "title": "...", ... }
  ],
  "deletedIds": ["1862104567890123456"]
}
```

### Transformacions de Dades

**TweetRaw → Bookmark:**
```typescript
function createBookmark(tweet: TweetRaw, aiResult: ProcessedTweetResult): Bookmark {
  // 1. Extreure text
  const fullText = tweet.full_text || tweet.text || ''
  const truncated = fullText.length > 280
    ? fullText.substring(0, 280) + '[...]'
    : fullText

  // 2. Extreure autor
  const author = tweet.user?.screen_name
    ? `@${tweet.user.screen_name}`
    : (tweet.user?.name || 'Unknown')

  // 3. Crear link original
  const tweetId = tweet.id_str || tweet.id
  const originalLink = `https://twitter.com/i/web/status/${tweetId}`

  // 4. Generar ID únic
  const id = `${tweetId}-${Math.random().toString(36).substr(2, 6)}`

  // 5. Timestamp
  const createdAt = tweet.created_at
    ? new Date(tweet.created_at).getTime()
    : Date.now()

  return {
    id,
    title: aiResult.title,
    description: truncated,
    author,
    originalLink,
    externalLinks: aiResult.externalLinks,
    category: aiResult.category,
    createdAt
  }
}
```

---

## Característiques Especials

### 1. Disseny Brutalista

**Filosofia:**
- Minimalista i funcional
- Tipografia bold i gran
- Borders gruixuts negres
- Shadows dures (no difuminades)
- Colors limitats: blanc, negre, groc
- Sense gradients ni transparències

**Implementació CSS:**
```css
/* Base components */
.button {
  border: 2px solid #000;
  box-shadow: 4px 4px 0px 0px #000;
  font-weight: 800;
  transition: all 0.15s ease;
}

.button:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0px 0px #000;
}

.button:active {
  transform: translate(0, 0);
  box-shadow: 0px 0px 0px 0px #000;
}

/* Card */
.card {
  border: 2px solid #000;
  box-shadow: 4px 4px 0px 0px #000;
  background: white;
}

/* Badge */
.badge {
  border: 2px solid #000;
  background: #ffc107;
  font-weight: 700;
  padding: 4px 12px;
}
```

**Exemples Visuals:**
```
┌─────────────────────────────────┐
│  [Divulgació]                   │ ← Badge groc
│                                 │
│  Guia completa sobre RAG        │ ← Title (bold)
│                                 │
│  Aprèn a implementar...         │ ← Description
│                                 │
│  @username • 04/12/2024         │ ← Metadata
│                                 │
│  🔗 example.com                 │ ← External links
│                                 │
│  [✏️ Editar] [🗑️ Eliminar]      │ ← Actions
└─────────────────────────────────┘
    └─────┘ ← Hard shadow
```

### 2. Sistema de Logs en Temps Real

**Interfície de Consola:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Registre d'Importació
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[10:30:15] ℹ️  Iniciant procés d'importació...
[10:30:16] ℹ️  Detectat arxiu: twitter-bookmarks.json
[10:30:16] ℹ️  150 tweets trobats al fitxer
[10:30:17] ℹ️  120 tweets nous (30 duplicats ignorats)
[10:30:18] ⏳ Processant tweet 1/120...
[10:30:22] ✅ Tweet 1/120: Guia sobre RAG
[10:30:26] ✅ Tweet 2/120: Nou model d'OpenAI
...
[10:35:40] ⚠️  Rate limit detectat, esperant 10s...
[10:35:50] ⏳ Reintentant tweet 45/120...
[10:35:54] ✅ Tweet 45/120: Tutorial LangChain
...
[10:45:20] ✅ Procés finalitzat!
[10:45:20] ℹ️  95 tweets d'IA importats
[10:45:20] ℹ️  25 tweets rebutjats (no IA)
[10:45:20] ℹ️  30 duplicats ignorats

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Colors per Tipus:**
- 🔵 **Info:** Text blanc/gris
- 🟢 **Success:** Text verd
- 🟡 **Warning:** Text groc/taronja
- 🔴 **Error:** Text vermell

**Features:**
- Auto-scroll a últim log
- Timestamp per cada entrada
- Comptador de progrés (X/Y)
- Botó "Aturar" per cancel·lar procés

### 3. Responsive Design Mòbil

**Breakpoints:**
```css
/* Mobile */
@media (max-width: 768px) {
  /* 1 columna */
  .grid { grid-template-columns: 1fr; }

  /* Menu hamburguesa */
  .desktop-sidebar { display: none; }
  .mobile-menu-button { display: block; }
}

/* Tablet */
@media (min-width: 769px) and (max-width: 1024px) {
  /* 2 columnes */
  .grid { grid-template-columns: repeat(2, 1fr); }
}

/* Desktop */
@media (min-width: 1025px) {
  /* 3-4 columnes */
  .grid { grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); }
}
```

**Adaptacions Mòbil:**
1. **Header:**
   - Logo + Hamburger button
   - Category button fix al centre top

2. **Sidebar:**
   - Modal overlay en pantalla completa
   - Llista vertical de categories
   - Botó tancar (X) dalt a la dreta

3. **Cards:**
   - Full width (1 columna)
   - Touch targets més grans (48x48px min)
   - Padding augmentat

4. **Modals:**
   - Full screen en mòbil
   - Padding reduït
   - Font size ajustat

### 4. Rate Limiting Intel·ligent

**Problema:** Gemini Free Tier = 15 RPM (requests per minute)

**Solució Implementada:**

```typescript
// 1. Delay base entre requests
const BASE_DELAY = 4000  // 4 segons = ~15 RPM

async function processBookmarksWithGemini(tweets) {
  for (let i = 0; i < tweets.length; i++) {
    try {
      // Process tweet
      const result = await generateContent(tweet)

      // Wait abans del següent
      if (i < tweets.length - 1) {
        await sleep(BASE_DELAY)
      }

    } catch (error) {
      // Handle 429 error
      if (is429Error(error)) {
        await handleRateLimitWithRetry(tweet, i)
      }
    }
  }
}

// 2. Exponential backoff
async function handleRateLimitWithRetry(tweet, attempt) {
  const delays = [10, 15, 22.5, 33.75, 50.625, 60, 60, 60, 60, 60]
  const maxRetries = 10

  if (attempt >= maxRetries) {
    throw new Error('Max retries exceeded')
  }

  const waitTime = delays[attempt] * 1000
  addLog('warning', `Rate limit! Esperant ${delays[attempt]}s...`)

  await sleep(waitTime)

  // Retry
  return await generateContent(tweet)
}
```

**Timeline Exemple:**
```
T+0s:   Request 1 → Success
T+4s:   Request 2 → Success
T+8s:   Request 3 → Success
...
T+56s:  Request 15 → Success
T+60s:  Request 16 → 429 ERROR!
T+60s:  Wait 10s...
T+70s:  Retry request 16 → Success
T+74s:  Request 17 → Success
```

**Detecció de 429:**
```typescript
function is429Error(error: any): boolean {
  // 1. Check error message
  if (error.message?.includes('429')) return true

  // 2. Check status property
  if (error.status === 429) return true

  // 3. Check response text
  if (error.toString().includes('RESOURCE_EXHAUSTED')) return true

  return false
}
```

### 5. Sistema de Backup/Restore

**Format de Backup:**
```json
{
  "backupVersion": 1,
  "timestamp": 1733313000000,
  "categories": [...],
  "bookmarks": [...],
  "deletedIds": [...]
}
```

**Export:**
```typescript
function exportBackupJSON() {
  const backup = {
    backupVersion: 1,
    timestamp: Date.now(),
    categories,
    bookmarks,
    deletedIds
  }

  const blob = new Blob(
    [JSON.stringify(backup, null, 2)],
    { type: 'application/json' }
  )

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ai-bookmarks-backup-${Date.now()}.json`
  a.click()
}
```

**Import/Merge:**
```typescript
function mergeBackup(backup: BackupFormat) {
  // 1. Merge categories (unió de sets)
  const newCategories = [
    ...new Set([...categories, ...backup.categories])
  ]

  // 2. Merge bookmarks (deduplica per ID)
  const existingIds = new Set(bookmarks.map(b => b.id))
  const newBookmarks = backup.bookmarks.filter(
    b => !existingIds.has(b.id)
  )

  // 3. Merge deletedIds (unió de sets)
  const newDeletedIds = [
    ...new Set([...deletedIds, ...backup.deletedIds])
  ]

  // 4. Update state
  setCategories(newCategories)
  setBookmarks([...bookmarks, ...newBookmarks])
  setDeletedIds(newDeletedIds)
}
```

### 6. Sistema de Cerca i Filtratge

**Filtratge per Categoria:**
```typescript
const filteredBookmarks = useMemo(() => {
  if (selectedCategory === 'Tots') {
    return bookmarks
  }
  return bookmarks.filter(b => b.category === selectedCategory)
}, [bookmarks, selectedCategory])
```

**UI de Categories:**
```
┌──────────────────────────────┐
│  [Tots (150)]                │ ← Totes les categories
│  [Divulgació (45)]           │
│  [Agents (23)]               │
│  [Skills (18)]               │
│  [RAG (32)]                  │
│  [Cursos (12)]               │
│  [Notícies (8)]              │
│  [Eines (10)]                │
│  [Altres (2)]                │
└──────────────────────────────┘
```

**Comptadors Dinàmics:**
```typescript
const categoryCounts = useMemo(() => {
  const counts: Record<string, number> = {}

  bookmarks.forEach(b => {
    counts[b.category] = (counts[b.category] || 0) + 1
  })

  return counts
}, [bookmarks])

// Render: {category} ({categoryCounts[category] || 0})
```

---

## Build i Deployment

### Desenvolupament Local

**1. Instal·lació:**
```bash
cd ai-bookmarks
npm install
```

**2. Configuració .env:**
```env
VITE_API_KEY=<gemini-api-key>
VITE_STORAGE_API_URL=http://xxx.xxx.xxx.xxx:xxxx
VITE_STORAGE_SECRET=xxxx
```

**3. Executar dev server:**
```bash
npm run dev
```
→ Servidor disponible a: `http://localhost:3000`

**4. Verificar:**
- Frontend carrega correctament
- Pot importar JSON de Twitter
- Gemini processa tweets (API key vàlida)
- Storage funciona (local o API segons .env)

### Build de Producció

**1. Compilar TypeScript + Build Vite:**
```bash
npm run build
```

**Sortida:**
```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── [altres assets]
└── vite.svg
```

**2. Preview build local:**
```bash
npm run preview
```
→ Servidor disponible a: `http://localhost:4173`

**3. Optimitzacions aplicades:**
- Code splitting automàtic
- Minificació JS/CSS
- Tree shaking (elimina codi no usat)
- Asset hashing per cache busting
- Compression (gzip)

### Deployment Frontend

**Opció 1: Vercel (Recomanat)**
```bash
# Instal·lar Vercel CLI
npm i -g vercel

# Deploy
cd ai-bookmarks
vercel

# Configurar variables d'entorn a Vercel dashboard:
# VITE_API_KEY
# VITE_STORAGE_API_URL
# VITE_STORAGE_SECRET
```

**Opció 2: Netlify**
```bash
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

# Deploy
netlify deploy --prod
```

**Opció 3: VPS (mateix servidor que API)**
```bash
# 1. Build local
npm run build

# 2. Pujar dist/ al VPS
scp -r dist/* root@62.169.25.188:/var/www/ai-bookmarks/

# 3. Configurar Nginx
# /etc/nginx/sites-available/ai-bookmarks-frontend
server {
    listen 80;
    server_name ai-bookmarks.example.com;
    root /var/www/ai-bookmarks;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

# 4. Activar site
sudo ln -s /etc/nginx/sites-available/ai-bookmarks-frontend \
            /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**Opció 4: GitHub Pages**
```bash
# package.json
{
  "scripts": {
    "deploy": "vite build && gh-pages -d dist"
  },
  "devDependencies": {
    "gh-pages": "^6.0.0"
  }
}

# vite.config.ts
export default {
  base: '/ai-bookmarks/',  // Nom del repo
  ...
}

# Deploy
npm run deploy
```

### Deployment Backend

**Ja cobert a secció "Configuració del Servidor VPS"**

Resum:
1. VPS amb Node.js instal·lat
2. Pujar server.js, package.json
3. `npm install`
4. `pm2 start server.js --name ai-bookmarks`
5. Configurar firewall (port 3002)
6. (Opcional) Nginx reverse proxy

### Variables d'Entorn per Producció

**Frontend (.env.production):**
```env
VITE_API_KEY=<production-gemini-key>
VITE_STORAGE_API_URL=https://api.bookmarks.example.com
VITE_STORAGE_SECRET=<strong-random-secret>
```

**Backend (server.js):**
```javascript
const API_SECRET = process.env.API_SECRET || 'default-secret'
const PORT = process.env.PORT || 3002
```

**Recomanacions:**
- ✅ Usar HTTPS en producció
- ✅ Secrets forts (min 32 chars random)
- ✅ API keys diferents per dev/prod
- ✅ Rate limiting al servidor
- ✅ Backups automàtics de db.json

### CI/CD (Opcional)

**GitHub Actions (.github/workflows/deploy.yml):**
```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build
        env:
          VITE_API_KEY: ${{ secrets.VITE_API_KEY }}
          VITE_STORAGE_API_URL: ${{ secrets.VITE_STORAGE_API_URL }}
          VITE_STORAGE_SECRET: ${{ secrets.VITE_STORAGE_SECRET }}
        run: npm run build

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

---

## Conclusions i Recomanacions

### Punts Forts del Projecte

1. **Arquitectura Modular:**
   - Separació clara entre UI, serveis i lògica de negoci
   - Components reutilitzables ben dissenyats
   - Fàcil d'estendre i mantenir

2. **Integració IA Robusta:**
   - Rate limiting intel·ligent preveu errors
   - Retry amb exponential backoff
   - Logging detallat per debugging

3. **Storage Flexible:**
   - Funciona offline (localStorage)
   - Sincronització multi-dispositiu (API)
   - Canvi transparent segons configuració

4. **Experiència d'Usuari:**
   - Disseny brutalista distintiu i modern
   - Progress tracking en temps real
   - Responsive design mòbil-friendly
   - Sistema de backup/restore complet

5. **Integritat de Dades:**
   - Deduplicació automàtica
   - Blacklist d'eliminats prevé reimportacions
   - Validació TypeScript prevé errors

### Possibles Millores Futures

#### Curts Termini

1. **Seguretat:**
   - Migrar a HTTPS
   - Implementar autenticació JWT
   - Rate limiting per IP al backend
   - Sanitització d'inputs

2. **UX:**
   - Cerca per text (títol/descripció)
   - Ordenació (data, autor, categoria)
   - Vista compacta/expandida
   - Dark mode

3. **Rendiment:**
   - Lazy loading d'imatges
   - Virtualització per llistes llargues (>1000 items)
   - Service Worker per cache offline
   - Compressió d'imatges

4. **Funcionalitats:**
   - Edició inline de títols
   - Assignació manual de categoria
   - Tags personalitzats
   - Notes privades per bookmark

#### Llarg Termini

1. **Escalabilitat:**
   - Migrar a base de dades real (PostgreSQL, MongoDB)
   - Pagination/infinite scroll
   - Full-text search (Elasticsearch)
   - CDN per assets

2. **Col·laboració:**
   - Compartició de col·leccions
   - Bookmarks públics/privats
   - Sistema de "m'agrada" o favorits

3. **Analytics:**
   - Dashboard d'estadístiques
   - Tendències de categories
   - Timeline d'imports

4. **Integracions:**
   - Sync automàtic amb Twitter API
   - Export a Notion, Obsidian, etc.
   - Chrome extension per afegir bookmarks
   - Mobile app (React Native)

5. **IA Avançada:**
   - Resums automàtics de threads
   - Recomanacions personalitzades
   - Clustering automàtic de temes
   - Extracció d'entitats (persones, empreses, conceptes)

### Limitacions Actuals

1. **Seguretat Bàsica:**
   - HTTP en lloc de HTTPS
   - Secret compartit simple
   - Sense gestió d'usuaris

2. **Race Conditions:**
   - Last-write-wins en updates simultanis
   - No hi ha versionat o merge automàtic

3. **Limits de Gemini:**
   - 15 RPM en free tier (lent per imports grans)
   - Pot requerir API key de pagament per ús intens

4. **Storage Limitat:**
   - LocalStorage: ~10MB max
   - db.json pot créixer indefinidament
   - No hi ha garbage collection de deletedIds

5. **Offline Support:**
   - Mode API requereix internet sempre
   - No hi ha sync automàtic quan torna connexió

### Recomanacions d'Ús

1. **Imports Grans:**
   - Dividir fitxers JSON en batches de <100 tweets
   - Executar imports fora d'hores punta (Gemini rate limits)

2. **Backups:**
   - Exportar backup setmanalment
   - Guardar backups en múltiples llocs (Drive, Dropbox)
   - Verificar integritat després d'imports grans

3. **Manteniment VPS:**
   - Backups diaris de db.json (cron job)
   - Monitoritzar ús de disc
   - Revisar logs de PM2 regularment

4. **Optimització:**
   - Eliminar tweets obsolets ocasionalment
   - Consolidar categories similars
   - Revisar i actualitzar títols generats per IA

---

## Contacte i Suport

**Autor:** Roger Masellas
**Projecte:** AI Bookmark Manager
**Repositori:** https://github.com/rogeraclaro/AI-Bookmark-Manager
**Data Documentació:** 4 de Desembre de 2025

---

## Llicència

Aquest projecte és d'ús personal. Tots els drets reservats.

---

## Apèndix

### A. Glossari de Termes

- **Bookmark:** Preferit o marcador de Twitter guardat per l'usuari
- **RAG:** Retrieval Augmented Generation, tècnica d'IA per millorar respostes amb context extern
- **Brutalisme:** Estil de disseny minimalista amb elements visuals crus i funcionals
- **Rate Limiting:** Limitació de peticions per unitat de temps
- **Exponential Backoff:** Estratègia de retry amb esperes progressivament més llargues
- **Blacklist:** Llista d'elements prohibits o exclosos
- **VPS:** Virtual Private Server, servidor virtual privat
- **CORS:** Cross-Origin Resource Sharing, mecanisme de seguretat per requests entre dominis
- **JWT:** JSON Web Token, estàndard d'autenticació
- **ETL:** Extract, Transform, Load, procés de transformació de dades

### B. Comandes Ràpides

```bash
# Frontend
npm install          # Instal·lar dependències
npm run dev          # Dev server (localhost:3000)
npm run build        # Build producció → dist/
npm run preview      # Preview build local
npm run lint         # Verificar codi

# Backend (VPS)
pm2 start server.js --name ai-bookmarks  # Iniciar servidor
pm2 logs ai-bookmarks                    # Veure logs
pm2 restart ai-bookmarks                 # Reiniciar
pm2 stop ai-bookmarks                    # Aturar

# Backup (VPS)
cp db.json db.json.backup-$(date +%Y%m%d)  # Backup manual
```

### C. Endpoints API Reference

| Endpoint      | Mètode | Body                | Response             | Auth |
|---------------|--------|---------------------|----------------------|------|
| `/bookmarks`  | GET    | -                   | `{data: Bookmark[]}` | ✓    |
| `/bookmarks`  | POST   | `{data: Bookmark[]}` | `{success: true}`   | ✓    |
| `/categories` | GET    | -                   | `{data: string[]}`   | ✓    |
| `/categories` | POST   | `{data: string[]}`  | `{success: true}`   | ✓    |
| `/deleted`    | GET    | -                   | `{data: string[]}`   | ✓    |
| `/deleted`    | POST   | `{data: string[]}`  | `{success: true}`   | ✓    |
| `/reset`      | POST   | -                   | `{success: true}`   | ✓    |

**Auth Header Required:**
```
x-api-secret: xxxxx
```

### D. Troubleshooting Comú

**1. Error "Failed to fetch" al carregar:**
- Verificar que el servidor VPS està actiu: `pm2 status`
- Verificar firewall permet port 3002: `sudo ufw status`
- Comprovar VITE_STORAGE_API_URL al .env

**2. Gemini API error 429:**
- Esperar uns minuts (rate limit temporal)
- Reduir velocitat d'imports (augmentar BASE_DELAY)
- Considerar upgrade a tier de pagament

**3. LocalStorage quota exceeded:**
- Exportar backup i eliminar bookmarks antics
- Activar mode API per storage il·limitat
- Netejar dades del navegador i reimportar backup

**4. Tweets duplicats després d'eliminar:**
- Verificar que deletedIds es guarda correctament
- Comprovar que l'ID del tweet és correcte
- Revisar logs del procés d'import

**5. Servidor VPS no respon:**
- SSH al VPS i verificar `pm2 status`
- Revisar logs: `pm2 logs ai-bookmarks --lines 50`
- Reiniciar si cal: `pm2 restart ai-bookmarks`
- Verificar espai en disc: `df -h`

---

**Fi de la Documentació**

Aquesta documentació cobreix tots els aspectes tècnics i funcionals de l'AI Bookmark Manager. Per qualsevol dubte o millora, consultar el repositori de GitHub o contactar amb l'autor.
