// Edge Function для получения структуры доски Monday.com
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const MONDAY_API_URL = 'https://api.monday.com/v2'
    const API_TOKEN = Deno.env.get('MONDAY_API_TOKEN')
    const BOARD_ID = '1923600883' // Ваша клиентская доска

    if (!API_TOKEN) {
      throw new Error('Monday.com API token not configured')
    }

    console.log('🔍 Analyzing Monday.com board structure...')

    // GraphQL query to get board structure
    const query = `
      query {
        boards(ids: [${BOARD_ID}]) {
          name
          columns {
            id
            title
            type
          }
          items_page(limit: 5) {
            items {
              id
              name
              column_values {
                id
                text
                value
                type
              }
            }
          }
        }
      }
    `

    const response = await fetch(MONDAY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': API_TOKEN,
      },
      body: JSON.stringify({ query })
    })

    if (!response.ok) {
      throw new Error(`Monday.com API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.errors) {
      throw new Error(`Monday.com GraphQL errors: ${JSON.stringify(data.errors)}`)
    }

    const board = data.data.boards[0]
    
    console.log('📋 Board Analysis Complete')
    console.log('Board Name:', board.name)
    console.log('Columns:', board.columns.length)
    console.log('Sample Items:', board.items_page.items.length)

    // Create column mapping
    const columnMap = new Map()
    board.columns.forEach(col => {
      columnMap.set(col.id, { title: col.title, type: col.type })
    })

    // Структурируем результат для анализа
    const analysis = {
      boardInfo: {
        name: board.name,
        description: board.description || 'No description',
        totalColumns: board.columns.length
      },
      columns: board.columns.map(col => ({
        id: col.id,
        title: col.title,
        type: col.type
      })),
      sampleItems: board.items_page.items.map(item => ({
        id: item.id,
        name: item.name,
        columnValues: item.column_values.map(cv => ({
          columnId: cv.id,
          columnTitle: columnMap.get(cv.id)?.title || 'Unknown Column',
          type: cv.type,
          text: cv.text,
          value: cv.value
        }))
      }))
    }

    return new Response(
      JSON.stringify(analysis, null, 2),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Analysis error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
