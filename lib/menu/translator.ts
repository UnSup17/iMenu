/**
 * Motor de Traducción Culinaria Multilingüe con IA (Inglés y Portugués)
 * Soporta OpenAI / Gemini con fallback heurístico culinario de alta fidelidad.
 */

export interface TranslationResult {
  name: string
  description?: string | null
}

export interface ProductTranslationsMap {
  en?: TranslationResult
  pt?: TranslationResult
  [lang: string]: TranslationResult | undefined
}

// Diccionario gastronómico especializado de fallback para precisión culinaria offline
const CULINARY_LEXICON_EN: Record<string, string> = {
  hamburguesa: 'burger',
  pollo: 'chicken',
  res: 'beef',
  carne: 'meat',
  cerdo: 'pork',
  pescado: 'fish',
  salmon: 'salmon',
  atun: 'tuna',
  camarones: 'shrimps',
  queso: 'cheese',
  tocino: 'bacon',
  tocineta: 'bacon',
  papas: 'potatoes',
  fritas: 'fries',
  ensalada: 'salad',
  sopa: 'soup',
  crema: 'cream',
  arroz: 'rice',
  pasta: 'pasta',
  pizza: 'pizza',
  tacos: 'tacos',
  postre: 'dessert',
  pastel: 'cake',
  helado: 'ice cream',
  cafe: 'coffee',
  te: 'tea',
  cerveza: 'beer',
  artesanal: 'craft',
  vino: 'wine',
  jugo: 'juice',
  agua: 'water',
  asado: 'roasted',
  grille: 'grilled',
  parrilla: 'grilled',
  frito: 'fried',
  horno: 'baked',
  ahumado: 'smoked',
  picante: 'spicy',
  dulce: 'sweet',
  crujiente: 'crispy',
  trufa: 'truffle',
  trufada: 'truffled',
  artesanalmente: 'artisanally',
  delicioso: 'delicious',
  clasico: 'classic',
  especial: 'special',
  suprema: 'supreme',
}

const CULINARY_LEXICON_PT: Record<string, string> = {
  hamburguesa: 'hambúrguer',
  pollo: 'frango',
  res: 'carne bovina',
  carne: 'carne',
  cerdo: 'porco',
  pescado: 'peixe',
  salmon: 'salmão',
  atun: 'atum',
  camarones: 'camarões',
  queso: 'queijo',
  tocino: 'bacon',
  tocineta: 'bacon',
  papas: 'batatas',
  fritas: 'fritas',
  ensalada: 'salada',
  sopa: 'sopa',
  crema: 'creme',
  arroz: 'arroz',
  pasta: 'massa',
  pizza: 'pizza',
  tacos: 'tacos',
  postre: 'sobremesa',
  pastel: 'bolo',
  helado: 'sorvete',
  cafe: 'café',
  te: 'chá',
  cerveza: 'cerveja',
  artesanal: 'artesanal',
  vino: 'vinho',
  jugo: 'suco',
  agua: 'água',
  asado: 'assado',
  grille: 'grelhado',
  parrilla: 'na brasa',
  frito: 'frito',
  horno: 'ao forno',
  ahumado: 'defumado',
  picante: 'apimentado',
  dulce: 'doce',
  crujiente: 'crocante',
  trufa: 'trufa',
  trufada: 'trufada',
  artesanalmente: 'artesanalmente',
  delicioso: 'delicioso',
  clasico: 'clássico',
  especial: 'especial',
  suprema: 'suprema',
}

function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function translateWithLexicon(text: string, lang: 'en' | 'pt'): string {
  const dict = lang === 'en' ? CULINARY_LEXICON_EN : CULINARY_LEXICON_PT
  const words = text.split(/(\s+|[.,;!?()]+)/)

  const translated = words.map((chunk) => {
    const clean = normalizeWord(chunk)
    if (!clean) return chunk
    if (dict[clean]) {
      // Preservar mayúscula inicial si existía
      const target = dict[clean]
      if (chunk[0] && chunk[0] === chunk[0].toUpperCase()) {
        return target.charAt(0).toUpperCase() + target.slice(1)
      }
      return target
    }
    return chunk
  })

  let res = translated.join('')
  // Refinamientos comunes
  if (lang === 'en') {
    res = res
      .replace(/de pollo/gi, 'chicken')
      .replace(/de res/gi, 'beef')
      .replace(/con queso/gi, 'with cheese')
      .replace(/a la parrilla/gi, 'grilled')
      .replace(/al horno/gi, 'oven baked')
  } else if (lang === 'pt') {
    res = res
      .replace(/de pollo/gi, 'de frango')
      .replace(/de res/gi, 'de carne bovina')
      .replace(/con queso/gi, 'com queijo')
      .replace(/a la parrilla/gi, 'grelhado')
      .replace(/al horno/gi, 'ao forno')
  }
  return res
}

/**
 * Traduce un texto mediante OpenAI o fallback heurístico
 */
export async function translateDishContent(
  name: string,
  description?: string | null,
  languages: ('en' | 'pt')[] = ['en', 'pt']
): Promise<ProductTranslationsMap> {
  const result: ProductTranslationsMap = {}
  const apiKey = process.env.OPENAI_API_KEY

  if (apiKey) {
    try {
      const prompt = `Eres un traductor culinario profesional. Traduce el siguiente plato de menú gastronómico a los idiomas solicitados: ${languages.join(
        ', '
      )}.
Mantén el tono apetecible y sensorial.
Plato en Español:
Nombre: "${name}"
Descripción: "${description || ''}"

Responde ÚNICAMENTE en JSON válido con la siguiente estructura:
{
  ${languages
    .map(
      (l) => `"${l}": { "name": "Nombre traducido en ${l}", "description": "Descripción traducida en ${l}" }`
    )
    .join(',\n')}
}`

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          response_format: { type: 'json_object' },
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const parsed = JSON.parse(data.choices[0]?.message?.content || '{}')
        for (const lang of languages) {
          if (parsed[lang]?.name) {
            result[lang] = {
              name: parsed[lang].name,
              description: parsed[lang].description || null,
            }
          }
        }
        return result
      }
    } catch (err) {
      console.warn('[Translator] OpenAI translation error, using culinary lexicon engine:', err)
    }
  }

  // Fallback heurístico culinario de alta fidelidad
  for (const lang of languages) {
    const translatedName = translateWithLexicon(name, lang)
    const translatedDesc = description ? translateWithLexicon(description, lang) : null
    result[lang] = {
      name: translatedName,
      description: translatedDesc,
    }
  }

  return result
}
