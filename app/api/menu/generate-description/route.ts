import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

const ADMIN_ROLES = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER']

interface CulinaryStyle {
  lead: string
  verb: string
  accent: string
}

function generateChefDescriptions(
  dishName: string,
  category: string,
  ingredients: string
): string[] {
  const cleanName = dishName.trim()
  const cleanIng = ingredients.trim()
  const hasIng = cleanIng.length > 0
  const ingClause = hasIng ? ` preparado con ${cleanIng}` : ''

  // Opciones generativas con lenguaje sensorial gastronómico de alto impacto
  return [
    `Exquisito ${cleanName}${ingClause}, elaborado con técnicas de autor y cocción precisa para resaltar cada matiz de sabor. Acompañado de delicados toques frescos que armonizan texturas y aromas en una experiencia inolvidable.`,
    `Nuestra interpretación especial de ${cleanName}: una combinación irresistible de ingredientes seleccionados${hasIng ? ` (${cleanIng})` : ''}, equilibrando notas crocantes y suaves con una presentación gourmet pensada para deleitar tu paladar.`,
    `Auténtico ${cleanName} de la casa${hasIng ? `, fusionando ${cleanIng}` : ''} bajo una receta artesanal única, coronado con una sutil reducción aromática que eleva sus sabores tradicionales a otro nivel.`,
  ]
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = session.user as { id: string; role: string }
    if (!ADMIN_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await req.json()
    const { name, categoryName = '', ingredients = '', tone = 'gourmet' } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'El nombre del plato es obligatorio' }, { status: 400 })
    }

    // Si existe clave de OpenAI, invocar ChatGPT
    const apiKey = process.env.OPENAI_API_KEY
    if (apiKey) {
      try {
        const prompt = `Eres un chef consultor y redactor de menús para restaurantes de alta calidad.
Escribe 3 opciones de descripciones gastronómicas atractivas, sensoriales y comerciales (máximo 35 palabras cada una) en español para el siguiente plato de menú:
Nombre: "${name}"
Categoría: "${categoryName}"
Ingredientes o notas clave: "${ingredients}"
Tono: ${tone}

Responde ÚNICAMENTE en formato JSON con la siguiente estructura:
{
  "descriptions": [
    "Descripción 1...",
    "Descripción 2...",
    "Descripción 3..."
  ]
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
            temperature: 0.7,
            response_format: { type: 'json_object' },
          }),
        })

        if (res.ok) {
          const completion = await res.json()
          const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}')
          if (Array.isArray(parsed.descriptions) && parsed.descriptions.length > 0) {
            return NextResponse.json({
              success: true,
              source: 'openai',
              descriptions: parsed.descriptions,
            })
          }
        }
      } catch (err) {
        console.warn('[AI Description] OpenAI error, falling back to Chef Engine:', err)
      }
    }

    // Motor heurístico culinario de iMenu (Smart Culinary Engine)
    const fallbackDescriptions = generateChefDescriptions(name, categoryName, ingredients)

    return NextResponse.json({
      success: true,
      source: 'culinary_engine',
      descriptions: fallbackDescriptions,
    })
  } catch (error) {
    console.error('[POST /api/menu/generate-description]', error)
    return NextResponse.json(
      { error: 'Error al generar la descripción del plato' },
      { status: 500 }
    )
  }
}
