// Client Sync Edge Function for Supabase
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Deno types declaration
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MondayColumn {
  id: string;
  text: string;
  value: string;
  title?: string;
}

interface MondayItem {
  id: string;
  name: string;
  column_values: MondayColumn[];
  subitems?: MondayItem[];
}

interface ClientUpdate {
  project_id: string;
  client_email: string;
  client_name: string;
  design_name: string;
  svg_content?: string;
  svg_url?: string;
  mockup_url?: string;
  mockup_content?: string;
  notes?: string;
  status: string;
  updated_at: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Monday.com API configuration
    const MONDAY_API_URL = 'https://api.monday.com/v2'
    const API_TOKEN = Deno.env.get('MONDAY_API_TOKEN')
    const CLIENTS_BOARD_ID = '1923600883' // CRM доска 🔥WorkSpace
    const SUBITEMS_BOARD_ID = '1923902475' // Подтаблица с MockUp полями

    if (!API_TOKEN) {
      throw new Error('Monday.com API token not configured')
    }

        console.log('🔄 Starting client sync from Monday.com...')
    
    // Проверяем/создаем bucket для MockUp файлов
    console.log('📦 Checking storage bucket...')
    try {
      const { data: buckets, error: bucketsError } = await supabaseClient.storage.listBuckets()
      
      if (!bucketsError) {
        const mockupBucket = buckets.find(b => b.name === 'mockups')
        if (!mockupBucket) {
          console.log('📦 Creating mockups bucket...')
          const { error: createBucketError } = await supabaseClient.storage.createBucket('mockups', {
            public: true,
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'],
            fileSizeLimit: 10485760 // 10MB
          })
          
          if (createBucketError) {
            console.error('⚠️ Could not create bucket:', createBucketError)
          } else {
            console.log('✅ Mockups bucket created')
          }
        } else {
          console.log('✅ Mockups bucket exists')
        }
      }
    } catch (error) {
      console.log('⚠️ Storage check failed, continuing anyway:', error)
    }

    // Расширенный запрос для детального анализа полей

    // Расширенный запрос для детального анализа полей
    const query = `
      query {
        boards(ids: [${CLIENTS_BOARD_ID}, ${SUBITEMS_BOARD_ID}]) {
          id
          name
          columns {
            id
            title
            type
            settings_str
          }
          items_page(limit: 10) {
            items {
              id
              name
              column_values {
                id
                text
                value
                type
              }
              subitems {
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
      const errorText = await response.text()
      console.log(`❌ Monday.com API error details:`, errorText)
      throw new Error(`Monday.com API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log(`📊 Raw Monday.com response:`, JSON.stringify(data, null, 2))

    if (data.errors) {
      console.log(`❌ Monday.com GraphQL errors:`, data.errors)
      throw new Error(`Monday.com GraphQL errors: ${JSON.stringify(data.errors)}`)
    }

        // Process Monday.com data
    const boards = data.data.boards
    if (!boards || boards.length === 0) {
      throw new Error('No boards found')
    }

    console.log(`📋 Found ${boards.length} boards`)
    
    // Анализируем каждую доску
    boards.forEach((board: any, boardIndex: number) => {
      console.log(`\n🔍 === АНАЛИЗ ДОСКИ ${boardIndex + 1} ===`)
      console.log(`📋 Board ID: ${board.id}`)
      console.log(`📋 Board Name: ${board.name}`)
      console.log(`📊 Total columns: ${board.columns.length}`)
      console.log(`📊 Total items: ${board.items_page?.items?.length || 0}`)
      
      // Анализ колонок каждой доски
      board.columns.forEach((col: any, colIndex: number) => {
        console.log(`\n📋 Board ${board.id} - Column ${colIndex + 1}:`)
        console.log(`  - ID: ${col.id}`)
        console.log(`  - Title: "${col.title}"`)
        console.log(`  - Type: ${col.type}`)
        console.log(`  - Settings: ${col.settings_str || 'none'}`)
        
        // Проверяем возможные названия для MockUp
        const title = col.title.toLowerCase()
        const isLikelyMockup = title.includes('mockup') || 
                              title.includes('mock up') || 
                              title.includes('mock-up') ||
                              title === 'mockup' ||
                              title.includes('image') ||
                              title.includes('picture') ||
                              title.includes('файл') ||
                              title.includes('изображение') ||
                              title.includes('file') ||
                              title.includes('svg') ||
                              title.includes('design')
        
        if (isLikelyMockup) {
          console.log(`  🎯 *** POTENTIAL MOCKUP FIELD ***`)
        }
        
        if (col.type === 'file') {
          console.log(`  📁 *** FILE FIELD ***`)
        }
        
        // Специально ищем поле MockUp
        if (col.title === 'MockUp' || col.title === 'mockup' || col.title === 'MOCKUP') {
          console.log(`  🔥 *** FOUND EXACT MOCKUP FIELD *** ID: ${col.id}`)
        }
      })
      
      // Анализ элементов каждой доски
      const items = board.items_page?.items || []
      items.forEach((item: any, itemIndex: number) => {
        console.log(`\n📊 Board ${board.id} - Item ${itemIndex + 1}:`)
        console.log(`  - ID: ${item.id}`)
        console.log(`  - Name: "${item.name}"`)
        
        // Анализ значений колонок для каждого элемента
        item.column_values?.forEach((colValue: any) => {
          const column = board.columns.find((col: any) => col.id === colValue.id)
          const columnTitle = column?.title || 'Unknown'
          
          if (colValue.value && colValue.value !== '{}' && colValue.value !== 'null' && colValue.value !== '') {
            console.log(`    📋 ${columnTitle} (${colValue.id}): ${colValue.text || colValue.value}`)
            
            // Особое внимание к файловым полям
            if (column?.type === 'file' && colValue.value) {
              console.log(`    📁 *** FILE FIELD DATA *** ${colValue.value}`)
            }
            
            // Особое внимание к MockUp полям
            if (columnTitle.toLowerCase().includes('mockup')) {
              console.log(`    🔥 *** MOCKUP FIELD DATA *** ${colValue.value}`)
            }
          }
        })
        
        // Анализ подэлементов
        if (item.subitems && item.subitems.length > 0) {
          console.log(`    📋 Subitems: ${item.subitems.length}`)
          item.subitems.forEach((subitem: any, subIndex: number) => {
            console.log(`      📋 Subitem ${subIndex + 1}: ${subitem.name}`)
            
            subitem.column_values?.forEach((subColValue: any) => {
              if (subColValue.value && subColValue.value !== '{}' && subColValue.value !== 'null' && subColValue.value !== '') {
                console.log(`        📋 ${subColValue.id}: ${subColValue.text || subColValue.value}`)
                
                // Ищем файловые поля в подэлементах
                if (subColValue.type === 'file' && subColValue.value) {
                  console.log(`        📁 *** SUBITEM FILE FIELD *** ${subColValue.value}`)
                }
              }
            })
          })
        }
      })
    })

    // Используем первую доску для основной обработки
    const mainBoard = boards[0]
    const { items_page, columns } = mainBoard
    const items: MondayItem[] = items_page?.items || []

    // АНАЛИЗ ДАННЫХ В ПЕРВЫХ ЭЛЕМЕНТАХ
    console.log(`\n🔍 === АНАЛИЗ ДАННЫХ В ЭЛЕМЕНТАХ ===`)
    
    for (let i = 0; i < Math.min(items.length, 3); i++) {
      const item = items[i]
      console.log(`\n📋 Item ${i + 1}: "${item.name}"`)
      
      // Анализ основных колонок
      item.column_values.forEach((colValue: any) => {
        const column = columns.find((c: any) => c.id === colValue.id)
        const columnTitle = column?.title || 'Unknown'
        const columnType = column?.type || 'unknown'
        
        console.log(`\n  📋 Column: "${columnTitle}" (${columnType})`)
        console.log(`    - ID: ${colValue.id}`)
        console.log(`    - Text: "${colValue.text || 'empty'}"`)
        console.log(`    - Type: ${colValue.type || 'none'}`)
        
        if (colValue.value) {
          try {
            const parsedValue = JSON.parse(colValue.value)
            console.log(`    - Value (parsed):`, parsedValue)
            
            // Специальная проверка для файловых полей
            if (parsedValue.files && Array.isArray(parsedValue.files)) {
              console.log(`    🎯 *** FOUND FILES IN MAIN ITEM ***`)
              parsedValue.files.forEach((file: any, fileIndex: number) => {
                console.log(`      File ${fileIndex + 1}:`)
                console.log(`        - Name: ${file.name}`)
                console.log(`        - URL: ${file.url}`)
                console.log(`        - Public URL: ${file.public_url}`)
                console.log(`        - Extension: ${file.file_extension}`)
                
                // Проверяем, есть ли "mockup" в названии файла
                if (file.name.toLowerCase().includes('mockup')) {
                  console.log(`        🔥 *** FOUND MOCKUP FILE: ${file.name} ***`)
                }
              })
            }
          } catch (e) {
            console.log(`    - Value (raw): "${colValue.value.substring(0, 100)}${colValue.value.length > 100 ? '...' : ''}"`)
          }
        } else {
          console.log(`    - Value: empty`)
        }
        
        // Выделяем потенциальные MockUp поля
        const title = columnTitle.toLowerCase()
        if (title.includes('mockup') || title.includes('mock up') || columnType === 'file') {
          console.log(`    🎯 *** POTENTIAL MOCKUP DATA ***`)
        }
      })
      
      // АНАЛИЗ ПОДЭЛЕМЕНТОВ (SUBITEMS)
      if (item.subitems && item.subitems.length > 0) {
        console.log(`\n  📋 === SUBITEMS ANALYSIS (${item.subitems.length} суб-элементов) ===`)
        
        item.subitems.forEach((subitem: any, subIndex: number) => {
          console.log(`\n    🔹 Subitem ${subIndex + 1}: "${subitem.name}"`)
          
          subitem.column_values?.forEach((subColValue: any) => {
            console.log(`      📋 Subitem Column ID: ${subColValue.id}`)
            console.log(`        - Text: "${subColValue.text || 'empty'}"`)
            console.log(`        - Type: ${subColValue.type || 'none'}`)
            
            if (subColValue.value) {
              try {
                const parsedValue = JSON.parse(subColValue.value)
                console.log(`        - Value (parsed):`, parsedValue)
                
                // Проверка файлов в подэлементах
                if (parsedValue.files && Array.isArray(parsedValue.files)) {
                  console.log(`        🎯 *** FOUND FILES IN SUBITEM ***`)
                  parsedValue.files.forEach((file: any, fileIndex: number) => {
                    console.log(`          File ${fileIndex + 1}:`)
                    console.log(`            - Name: ${file.name}`)
                    console.log(`            - URL: ${file.url}`)
                    console.log(`            - Public URL: ${file.public_url}`)
                    console.log(`            - Extension: ${file.file_extension}`)
                    
                    // Проверяем MockUp в названии файла
                    if (file.name.toLowerCase().includes('mockup')) {
                      console.log(`            🔥🔥🔥 *** FOUND MOCKUP FILE IN SUBITEM: ${file.name} *** 🔥🔥🔥`)
                    }
                  })
                }
              } catch (e) {
                console.log(`        - Value (raw): "${subColValue.value.substring(0, 100)}${subColValue.value.length > 100 ? '...' : ''}"`)
              }
            } else {
              console.log(`        - Value: empty`)
            }
          })
        })
      } else {
        console.log(`\n  📋 No subitems found for this item`)
      }
    }

    // Create column mapping
    const columnMap = new Map()
    console.log(`\n📋 === MAPPING COLUMNS ===`)
    columns.forEach((col: any) => {
      columnMap.set(col.id, { title: col.title, type: col.type })
      console.log(`  - ID: ${col.id}, Title: "${col.title}", Type: ${col.type}`)
    })

    console.log(`📊 Processing ${items.length} items from Monday.com`)

    const clientUpdates: ClientUpdate[] = []

    for (const item of items) {
      console.log(`\n🔍 Processing item: "${item.name}" (ID: ${item.id})`)
      
      // Пропускаем только элементы без имени или системные элементы
      if (!item.name || item.name.trim() === '' || item.name === 'Subitem') {
        console.log(`⏭️ Skipping item without proper name: "${item.name}"`)
        continue
      }
      
      // Ищем колонки для клиентских данных с расширенным поиском
      const emailColumn = item.column_values.find(col => {
        const columnInfo = columnMap.get(col.id)
        const title = columnInfo?.title?.toLowerCase() || ''
        const hasEmailInTitle = title.includes('mail') || title.includes('email') || title.includes('e-mail')
        const hasEmailInValue = col.text && col.text.includes('@')
        
        if (hasEmailInTitle || hasEmailInValue) {
          console.log(`📧 Found potential email column: "${columnInfo?.title}" = "${col.text}"`)
        }
        
        return hasEmailInTitle || hasEmailInValue
      })
      
      // Создаем проект для ВСЕХ элементов с именем
      console.log(`💾 Creating/updating project for: ${item.name}`)
      
      const statusColumn = item.column_values.find(col => 
        columnMap.get(col.id)?.title?.toLowerCase().includes('lead status') ||
        columnMap.get(col.id)?.title?.toLowerCase().includes('design status')
      )

      const notesColumn = item.column_values.find(col => 
        columnMap.get(col.id)?.title?.toLowerCase().includes('read me') ||
        columnMap.get(col.id)?.title?.toLowerCase().includes('request')
      )

      // Сначала ищем конкретные файловые поля по ID
      let mockupColumn = item.column_values.find(col => col.id === 'file_mkq6q0v2') // Angebot field
      
      if (!mockupColumn) {
        // Если нет поля Angebot, ищем поле Rechnung
        mockupColumn = item.column_values.find(col => col.id === 'file_mkq6eahq') // Rechnung field
      }
      
      if (!mockupColumn) {
        // Ищем любые файловые поля
        const fileColumns = item.column_values.filter(col => {
          const columnInfo = columnMap.get(col.id)
          const type = columnInfo?.type?.toLowerCase() || ''
          return type === 'file'
        })
        
        console.log(`📁 Found ${fileColumns.length} file columns for ${item.name}`)
        fileColumns.forEach(col => {
          const columnInfo = columnMap.get(col.id)
          console.log(`  - File column: ID ${col.id}, Title: "${columnInfo?.title}", Type: ${columnInfo?.type}`)
        })

        if (fileColumns.length > 0) {
          mockupColumn = fileColumns[0]
          const columnInfo = columnMap.get(mockupColumn.id)
          console.log(`📁 Using first file column as MockUp: "${columnInfo?.title}"`)
        }
      }

      // Если не найдено MockUp поле, ищем в подтаблице
      if (!mockupColumn && item.subitems && item.subitems.length > 0) {
        console.log(`🔍 Searching for MockUp field in subtable (Board ID: 1923902475)`)
        
        for (const subItem of item.subitems) {
          // Ищем поле MockUp с ID file_mkq71vjr в подтаблице
          const subtableMockupColumn = subItem.column_values.find(col => col.id === 'file_mkq71vjr')
          
          if (subtableMockupColumn) {
            mockupColumn = subtableMockupColumn
            console.log(`🎯 Found MockUp field in subtable: ${subtableMockupColumn.id}`)
            console.log(`📁 MockUp value from subtable:`, JSON.stringify(subtableMockupColumn, null, 2))
            break
          }
        }
      }
      
      if (mockupColumn) {
        const columnInfo = columnMap.get(mockupColumn.id)
        console.log(`🎯 Using MockUp field: "${columnInfo?.title}" (${mockupColumn.id})`)
      }

      // Создаем проект для этого элемента (используем email если есть, иначе генерируем)
      const projectId = `CRM-MONDAY-${item.id}`
      const clientEmail = emailColumn?.text?.trim() || `monday-${item.id}@generated.local`
      const clientName = item.name || 'Monday.com Item'
      const designName = `Design for ${clientName}`
      const status = statusColumn?.text?.toLowerCase() || 'draft'
      const notes = notesColumn?.text || `Imported from Monday.com item ${item.id}`
      
      console.log(`💾 Creating project for: ${clientName} (${clientEmail})`)
      
      // Обрабатываем поле MockUp
      let svgContent: string | undefined = undefined
      let svgUrl: string | undefined = undefined
      let mockupUrl: string | undefined = undefined
      let mockupContent: string | undefined = undefined
        
        if (mockupColumn) {
          console.log(`🖼️ Processing MockUp field for ${clientName}:`, JSON.stringify(mockupColumn, null, 2))
          
          // Проверяем различные форматы данных файлового поля
          if (mockupColumn.text) {
            // Если это SVG контент (начинается с <svg)
            if (mockupColumn.text.trim().startsWith('<svg')) {
              svgContent = mockupColumn.text
              console.log(`📄 Found SVG content for ${clientName}`)
            } 
            // Если это URL изображения
            else if (mockupColumn.text.includes('http') || mockupColumn.text.includes('.png') || mockupColumn.text.includes('.jpg') || mockupColumn.text.includes('.jpeg') || mockupColumn.text.includes('.gif')) {
              mockupUrl = mockupColumn.text
              console.log(`🔗 Found MockUp URL for ${clientName}: ${mockupUrl}`)
            }
            // Если это base64 или другой контент
            else if (mockupColumn.text.length > 100) {
              mockupContent = mockupColumn.text
              console.log(`📋 Found MockUp content for ${clientName}`)
            }
          }
          
          // Проверяем поле value для файловых данных Monday.com
          if (mockupColumn.value && typeof mockupColumn.value === 'string' && mockupColumn.value !== 'null') {
            try {
              const valueData = JSON.parse(mockupColumn.value)
              console.log(`📁 Parsed MockUp value data:`, valueData)
              
              // Файловые поля Monday.com имеют структуру с массивом files
              if (valueData.files && Array.isArray(valueData.files) && valueData.files.length > 0) {
                const file = valueData.files[0] // Берем первый файл
                if (file.url || file.public_url) {
                  const originalUrl = file.public_url || file.url
                  console.log(`🔗 Found file URL from Monday.com: ${originalUrl}`)
                  console.log(`📋 File name: ${file.name}`)
                  console.log(`📋 File extension: ${file.file_extension}`)
                  
                  // Получаем публичную ссылку через Monday.com API
                  try {
                    console.log(`� Getting public URL for file...`)
                    
                    // Используем GraphQL API для получения публичной ссылки файла
                    const publicUrlQuery = `
                      query {
                        assets(ids: ["${file.asset_id || ''}"]) {
                          id
                          name
                          url
                          public_url
                          file_extension
                        }
                      }
                    `
                    
                    const publicUrlResponse = await fetch(MONDAY_API_URL, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': API_TOKEN,
                      },
                      body: JSON.stringify({ query: publicUrlQuery })
                    })
                    
                    if (publicUrlResponse.ok) {
                      const publicUrlData = await publicUrlResponse.json()
                      console.log(`📁 Public URL data from GraphQL:`, JSON.stringify(publicUrlData, null, 2))
                      
                      if (publicUrlData.data?.assets?.[0]?.public_url) {
                        mockupUrl = publicUrlData.data.assets[0].public_url
                        console.log(`✅ Got public URL: ${mockupUrl}`)
                      } else if (publicUrlData.data?.assets?.[0]?.url) {
                        mockupUrl = publicUrlData.data.assets[0].url
                        console.log(`✅ Got asset URL: ${mockupUrl}`)
                      } else {
                        console.log(`⚠️ No public URL available, creating proxied URL`)
                        // Создаем прокси-ссылку через нашу Edge Function
                        mockupUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/monday-file-proxy?url=${encodeURIComponent(originalUrl)}`
                      }
                    } else {
                      console.log(`⚠️ Public URL query failed (${publicUrlResponse.status})`)
                      // Создаем прокси-ссылку через нашу Edge Function
                      mockupUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/monday-file-proxy?url=${encodeURIComponent(originalUrl)}`
                    }
                  } catch (error) {
                    console.error(`❌ Error getting public URL:`, error)
                    // Создаем прокси-ссылку через нашу Edge Function
                    mockupUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/monday-file-proxy?url=${encodeURIComponent(originalUrl)}`
                  }
                }
              }
            } catch (error) {
              console.log(`⚠️ Could not parse MockUp value as JSON:`, error)
              // Возможно, это прямая строка URL
              if (mockupColumn.value.includes('http')) {
                mockupUrl = mockupColumn.value
                console.log(`🔗 Using MockUp value as direct URL: ${mockupUrl}`)
              }
            }
          }
        } else {
          console.log(`❌ No MockUp field found for ${clientName}`)
        }

        clientUpdates.push({
          project_id: projectId,
          client_email: clientEmail,
          client_name: clientName,
          design_name: designName,
          svg_content: svgContent,
          svg_url: svgUrl,
          mockup_url: mockupUrl,
          mockup_content: mockupContent,
          notes: notes,
          status: mapMondayStatus(status),
          updated_at: new Date().toISOString()
        })
    }

    console.log(`📝 Found ${clientUpdates.length} client projects to sync`)

    if (clientUpdates.length > 0) {
      // Update clients in Supabase
      const { error: upsertError } = await supabaseClient
        .from('crm_projects')
        .upsert(clientUpdates, { onConflict: 'project_id' })

      if (upsertError) {
        throw new Error(`Failed to update clients: ${upsertError.message}`)
      }
    }

    console.log('✅ Client sync completed successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        clientsUpdated: clientUpdates.length,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Client sync error:', error)
    
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

// Helper function to map Monday.com status to CRM status
function mapMondayStatus(mondayStatus: string): string {
  const status = mondayStatus.toLowerCase()
  
  if (status.includes('done') || status.includes('completed') || status.includes('готово')) {
    return 'completed'
  } else if (status.includes('approved') || status.includes('одобрено')) {
    return 'approved'
  } else if (status.includes('sent') || status.includes('отправлено')) {
    return 'sent'
  } else if (status.includes('viewed') || status.includes('просмотрено')) {
    return 'viewed'
  } else {
    return 'draft'
  }
}
