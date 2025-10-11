// Прямой сервис для работы с Monday.com API без Supabase
import { NeonDesign } from '../types/configurator';

interface MondayItem {
  id: string;
  name: string;
  column_values: Array<{
    id: string;
    text?: string;
    value?: string;
  }>;
  subitems?: Array<{
    id: string;
    name: string;
    column_values: Array<{
      id: string;
      text?: string;
      value?: string;
    }>;
  }>;
}

interface MondayBoard {
  items_page: {
    items: MondayItem[];
  };
}

interface MondayResponse {
  data?: {
    boards?: MondayBoard[];
  };
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
  }>;
}

class MondayDirectService {
  private apiToken: string;
  private apiUrl = 'https://api.monday.com/v2';
  private mainBoardId: string;
  private subtableBoardId = '1923902475';

  constructor() {
    this.apiToken = import.meta.env.VITE_MONDAY_API_TOKEN || '';
    // Используем board для клиентов (основной board из старого кода)
    this.mainBoardId = '1923600883'; // Основной board с клиентами
    
    if (!this.apiToken) {
      console.error('❌ Monday.com API token not found in environment variables');
    } else {
      console.log('✅ Monday.com API token loaded');
    }
    
    console.log(`📋 Using main board ID (clients): ${this.mainBoardId}`);
    console.log(`📋 Using subtable board ID (mockups): ${this.subtableBoardId}`);
  }

  // Получить все проекты с Monday.com
  async getAllProjects(): Promise<NeonDesign[]> {
    try {
      console.log('🔄 Fetching all projects from Monday.com...');
      
      const query = `
        query {
          boards(ids: [${this.mainBoardId}]) {
            items_page(limit: 100) {
              items {
                id
                name
                column_values {
                  id
                  text
                  value
                }
                subitems {
                  id
                  name
                  column_values {
                    id
                    text
                    value
                  }
                }
              }
            }
          }
        }
      `;

      console.log('📤 Sending GraphQL query:', query);

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.apiToken,
        },
        body: JSON.stringify({ query }),
      });

      console.log('📥 Monday API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Monday API HTTP error: ${response.status} - ${response.statusText}`);
        console.error('Error details:', errorText);
        throw new Error(`Monday API HTTP error: ${response.statusText} (${response.status})`);
      }

      const data: MondayResponse = await response.json();
      
      // Отладка структуры ответа
      console.log('📋 Monday API Full Response:', JSON.stringify(data, null, 2));
      
      // Проверяем на ошибки GraphQL
      if (data.errors && data.errors.length > 0) {
        console.error('❌ Monday GraphQL errors:', data.errors);
        throw new Error(`Monday GraphQL error: ${data.errors[0].message}`);
      }
      
      if (!data || !data.data) {
        console.error('❌ Invalid Monday response structure - no data field');
        return [];
      }
      
      if (!data.data.boards) {
        console.error('❌ Invalid Monday response structure - no boards field');
        return [];
      }
      
      if (data.data.boards.length === 0) {
        console.warn('⚠️ No boards found in Monday response');
        return [];
      }
      
      const items = data.data.boards[0]?.items_page?.items || [];
      console.log(`✅ Found ${items.length} items in Monday board ${this.mainBoardId}`);
      
      const converted = this.convertMondayItemsToNeonDesigns(items);
      console.log(`✅ Converted ${converted.length} items to NeonDesign objects`);
      
      return converted;
    } catch (error) {
      console.error('❌ Error fetching projects from Monday:', error);
      return [];
    }
  }

  // Получить конкретный проект по ID
  async getProjectById(projectId: string): Promise<NeonDesign | null> {
    try {
      console.log(`🔄 Fetching project ${projectId} from Monday.com...`);
      
      const query = `
        query {
          boards(ids: [${this.mainBoardId}]) {
            items_page(limit: 100) {
              items {
                id
                name
                column_values {
                  id
                  text
                  value
                }
                subitems {
                  id
                  name
                  column_values {
                    id
                    text
                    value
                  }
                }
              }
            }
          }
        }
      `;

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.apiToken,
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Monday API HTTP error: ${response.status} - ${response.statusText}`);
        console.error('Error details:', errorText);
        throw new Error(`Monday API HTTP error: ${response.statusText} (${response.status})`);
      }

      const data: MondayResponse = await response.json();
      
      // Отладка структуры ответа
      console.log('📋 Monday API Response for project:', JSON.stringify(data, null, 2));
      
      // Проверяем на ошибки GraphQL
      if (data.errors && data.errors.length > 0) {
        console.error('❌ Monday GraphQL errors:', data.errors);
        throw new Error(`Monday GraphQL error: ${data.errors[0].message}`);
      }
      
      if (!data || !data.data || !data.data.boards || data.data.boards.length === 0) {
        console.error('❌ Invalid Monday response structure or no boards found');
        return null;
      }
      
      const items = data.data.boards[0]?.items_page?.items || [];
      console.log(`📊 Total items in board: ${items.length}`);
      console.log(`🔍 Looking for project ID: ${projectId}`);
      console.log(`📝 Available item IDs:`, items.map(item => item.id));
      
      // Фильтруем по ID проекта
      const filteredItems = items.filter(item => item.id === projectId);
      console.log(`🎯 Filtered items found: ${filteredItems.length}`);
      
      if (filteredItems.length === 0) {
        console.warn(`⚠️ No items found for exact project ID: ${projectId}`);
        console.warn('Available IDs in board:', items.map(item => `${item.id} (${item.name})`));
        
        // Попробуем найти по частичному совпадению имени или другим полям
        const fallbackItems = items.filter(item => 
          item.name.includes(projectId) || 
          item.id.includes(projectId)
        );
        
        if (fallbackItems.length > 0) {
          console.log(`🔄 Found ${fallbackItems.length} items by fallback search`);
          const converted = this.convertMondayItemsToNeonDesigns(fallbackItems);
          return converted[0] || null;
        }
        
        return null;
      }

      const converted = this.convertMondayItemsToNeonDesigns(filteredItems);
      const project = converted[0] || null;
      
      // Если MockUp не найден в основной доске, попробуем загрузить из subtable
      if (project && !project.mockupUrl) {
        console.log(`🔍 No MockUp in main board, checking subtable for project ${projectId}...`);
        try {
          const subtableMockup = await this.getMockupForProject(projectId);
          if (subtableMockup) {
            project.mockupUrl = subtableMockup;
            console.log(`✅ Found MockUp in subtable: ${subtableMockup}`);
          }
        } catch (e) {
          console.warn('⚠️ Error checking subtable for MockUp:', e);
        }
      }
      
      // Если SVG не найден в основной доске, попробуем загрузить из subtable
      if (project && !(project as any).svgUrl) {
        console.log(`🔍 No SVG in main board, checking subtable for project ${projectId}...`);
        try {
          const subtableSvg = await this.getSvgForProject(projectId);
          if (subtableSvg) {
            (project as any).svgUrl = subtableSvg;
            console.log(`✅ Found SVG in subtable: ${subtableSvg}`);
          }
        } catch (e) {
          console.warn('⚠️ Error checking subtable for SVG:', e);
        }
      }

      // Всегда проверяем реальные размеры в subtable
      if (project) {
        console.log(`📐 Checking for real dimensions in subtable for project ${projectId}...`);
        try {
          const subtableDimensions = await this.getDimensionsFromSubtable(projectId);
          if (subtableDimensions) {
            console.log(`✅ Found real dimensions in subtable - updating project`);
            project.originalWidth = subtableDimensions.width;
            project.originalHeight = subtableDimensions.height;
            project.ledLength = subtableDimensions.ledLength;
            console.log(`📐 Updated dimensions: ${subtableDimensions.width}x${subtableDimensions.height}cm, LED: ${subtableDimensions.ledLength}m`);
          } else {
            console.log(`⚠️ No real dimensions found in subtable, using calculated values`);
          }
        } catch (e) {
          console.warn('⚠️ Error checking subtable for dimensions:', e);
        }

        // Всегда проверяем реальные настройки UV/водонепроницаемость в subtable
        console.log(`⚙️ Checking for real settings (UV/waterproof) in subtable for project ${projectId}...`);
        try {
          const subtableSettings = await this.getSettingsFromSubtable(projectId);
          if (subtableSettings) {
            console.log(`✅ Found real settings in subtable - updating project`);
            project.hasUvPrint = subtableSettings.hasUvPrint;
            project.isWaterproof = subtableSettings.isWaterproof;
            console.log(`⚙️ Updated settings: UV Print=${subtableSettings.hasUvPrint}, Waterproof=${subtableSettings.isWaterproof}`);
          } else {
            console.log(`⚠️ No real settings found in subtable, using parsed values from main board`);
          }
        } catch (e) {
          console.warn('⚠️ Error checking subtable for settings:', e);
        }
      }
      
      return project;
    } catch (error) {
      console.error('❌ Error fetching project from Monday:', error);
      return null;
    }
  }

  // Получить размеры из subtable для конкретного проекта
  async getDimensionsFromSubtable(projectId: string): Promise<{width: number, height: number, ledLength: number} | null> {
    try {
      console.log(`📐 Fetching dimensions for project ${projectId} from subtable...`);
      
      const query = `
        query {
          boards(ids: [${this.subtableBoardId}]) {
            items_page(limit: 100) {
              items {
                id
                name
                column_values {
                  id
                  text
                  value
                }
              }
            }
          }
        }
      `;

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.apiToken
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        console.error(`❌ Monday API HTTP error: ${response.status} - ${response.statusText}`);
        return null;
      }

      const data: MondayResponse = await response.json();

      if (!data?.data?.boards?.[0]?.items_page?.items) {
        console.warn(`⚠️ No subtable data found for dimensions search`);
        return null;
      }

      const items = data.data.boards[0].items_page.items;
      console.log(`🔍 Subtable items found for dimensions: ${items.length}`);
      console.log(`📝 All subtable items for dimensions:`, items.map((item: any) => `${item.id}: ${item.name}`));
      console.log(`🎯 Looking for project ID: ${projectId}`);

      // Попробуем найти элемент по нескольким стратегиям
      let relatedItem = null;
      
      // Стратегия 1: Точное совпадение ID
      relatedItem = items.find((item: any) => item.id === projectId);
      if (relatedItem) {
        console.log(`✅ Dimensions: Found exact ID match: ${relatedItem.id}: ${relatedItem.name}`);
      }
      
      // Стратегия 2: Поиск в названии
      if (!relatedItem) {
        relatedItem = items.find((item: any) => item.name.includes(projectId));
        if (relatedItem) {
          console.log(`✅ Dimensions: Found name match: ${relatedItem.id}: ${relatedItem.name}`);
        }
      }
      
      // Стратегия 3: Поиск по полям (может быть есть поле-связка)
      if (!relatedItem) {
        relatedItem = items.find((item: any) => 
          item.column_values.some((col: any) => 
            col.text?.includes(projectId) || 
            (col.value && col.value.includes(projectId))
          )
        );
        if (relatedItem) {
          console.log(`✅ Dimensions: Found field match: ${relatedItem.id}: ${relatedItem.name}`);
        }
      }
      
      // Стратегия 4: Частичное совпадение ID (8 символов)
      if (!relatedItem && projectId.length >= 8) {
        const partialId = projectId.substring(0, 8);
        console.log(`🔍 Dimensions: Trying partial ID match: ${partialId}`);
        relatedItem = items.find((item: any) => item.id.startsWith(partialId));
        if (relatedItem) {
          console.log(`✅ Dimensions: Found partial match: ${relatedItem.id}: ${relatedItem.name}`);
        }
      }
      
      // Стратегия 5: Короткое совпадение ID (6 символов)
      if (!relatedItem && projectId.length >= 6) {
        const shortId = projectId.substring(0, 6);
        console.log(`🔍 Dimensions: Trying short ID match: ${shortId}`);
        relatedItem = items.find((item: any) => item.id.startsWith(shortId));
        if (relatedItem) {
          console.log(`✅ Dimensions: Found short match: ${relatedItem.id}: ${relatedItem.name}`);
        }
      }
      
      // Стратегия 6: Берем последний добавленный элемент (fallback для тестирования)
      if (!relatedItem && items.length > 1) {
        // Исключаем первый элемент "Subitem", берем последний реальный
        const realItems = items.filter((item: any) => !item.name.includes('Subitem'));
        if (realItems.length > 0) {
          relatedItem = realItems[realItems.length - 1]; // Последний добавленный
          console.log(`🔄 Dimensions: Using fallback (last item): ${relatedItem.id}: ${relatedItem.name}`);
        }
      }

      if (!relatedItem) {
        console.warn(`⚠️ No related subtable item found for dimensions in project ${projectId}`);
        return null;
      }

      console.log(`📊 Found dimensions item: ${relatedItem.id}: ${relatedItem.name}`);
      console.log(`📋 Available dimension fields:`, relatedItem.column_values.map((col: any) => ({
        id: col.id,
        text: col.text,
        value: col.value
      })));

      // Ищем поля размеров (ориентируемся на тест и возможные ID)
      const widthField = relatedItem.column_values.find((col: any) => 
        col.text === 'Width' || col.id.includes('width') || col.id === 'numeric_mkq7ejqj'
      );
      
      const heightField = relatedItem.column_values.find((col: any) => 
        col.text === 'Height' || col.id.includes('height') || col.id === 'numeric_mkq7nqpc'
      );
      
      const ledField = relatedItem.column_values.find((col: any) => 
        col.text === 'LED(m)' || col.id.includes('led') || col.id === 'numeric_mkqq3jcd'
      );

      console.log(`🔍 Dimension fields found:`, {
        width: widthField ? { id: widthField.id, text: widthField.text, value: widthField.value } : null,
        height: heightField ? { id: heightField.id, text: heightField.text, value: heightField.value } : null,
        led: ledField ? { id: ledField.id, text: ledField.text, value: ledField.value } : null
      });

      // Извлекаем значения
      let width = 100; // fallback
      let height = 30; // fallback  
      let ledLength = 2.6; // fallback

      if (widthField?.value) {
        try {
          const widthValue = JSON.parse(widthField.value);
          width = parseFloat(widthValue) || parseFloat(widthField.text || '0') || 100;
        } catch {
          width = parseFloat(widthField.text || '0') || 100;
        }
      }

      if (heightField?.value) {
        try {
          const heightValue = JSON.parse(heightField.value);
          height = parseFloat(heightValue) || parseFloat(heightField.text || '0') || 30;
        } catch {
          height = parseFloat(heightField.text || '0') || 30;
        }
      }

      if (ledField?.value) {
        try {
          const ledValue = JSON.parse(ledField.value);
          ledLength = parseFloat(ledValue) || parseFloat(ledField.text || '0') || 2.6;
        } catch {
          ledLength = parseFloat(ledField.text || '0') || 2.6;
        }
      }

      console.log(`✅ Extracted dimensions from subtable: Width=${width}cm, Height=${height}cm, LED=${ledLength}m`);
      
      return {
        width: Math.round(width),
        height: Math.round(height),
        ledLength: ledLength
      };

    } catch (error) {
      console.error('❌ Error fetching dimensions from subtable:', error);
      return null;
    }
  }

  // Получить настройки UV и водонепроницаемости из subtable для конкретного проекта
  async getSettingsFromSubtable(projectId: string): Promise<{hasUvPrint: boolean, isWaterproof: boolean} | null> {
    try {
      console.log(`⚙️ Fetching UV/waterproof settings for project ${projectId} from subtable...`);
      
      const query = `
        query {
          boards(ids: [${this.subtableBoardId}]) {
            items_page(limit: 100) {
              items {
                id
                name
                column_values {
                  id
                  text
                  value
                }
              }
            }
          }
        }
      `;

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.apiToken
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        console.error(`❌ Monday API HTTP error: ${response.status} - ${response.statusText}`);
        return null;
      }

      const data: MondayResponse = await response.json();

      if (!data?.data?.boards?.[0]?.items_page?.items) {
        console.warn(`⚠️ No subtable data found for settings search`);
        return null;
      }

      const items = data.data.boards[0].items_page.items;
      console.log(`🔍 Subtable items found for settings: ${items.length}`);
      console.log(`📝 All subtable items for settings:`, items.map((item: any) => `${item.id}: ${item.name}`));
      console.log(`🎯 Looking for project ID: ${projectId}`);

      // Сначала найдем все элементы, которые могут быть связаны с проектом
      let candidateItems = [];
      
      // Стратегия 1: Точное совпадение ID
      let exactMatch = items.find((item: any) => item.id === projectId);
      if (exactMatch) {
        candidateItems.push(exactMatch);
        console.log(`✅ Settings: Found exact ID match: ${exactMatch.id}: ${exactMatch.name}`);
      }
      
      // Стратегия 2: Поиск в названии
      let nameMatches = items.filter((item: any) => item.name.includes(projectId));
      candidateItems.push(...nameMatches);
      if (nameMatches.length > 0) {
        console.log(`✅ Settings: Found ${nameMatches.length} name matches:`, nameMatches.map(item => `${item.id}: ${item.name}`));
      }
      
      // Стратегия 3: Поиск по полям (может быть есть поле-связка)
      let fieldMatches = items.filter((item: any) => 
        item.column_values.some((col: any) => 
          col.text?.includes(projectId) || 
          (col.value && col.value.includes(projectId))
        )
      );
      candidateItems.push(...fieldMatches);
      if (fieldMatches.length > 0) {
        console.log(`✅ Settings: Found ${fieldMatches.length} field matches:`, fieldMatches.map(item => `${item.id}: ${item.name}`));
      }
      
      // Убираем дубликаты
      candidateItems = candidateItems.filter((item, index, self) => 
        self.findIndex(i => i.id === item.id) === index
      );
      
      console.log(`🔍 Total candidate items for settings: ${candidateItems.length}`);
      
      // Теперь из всех кандидатов найдем тот, который содержит поля UV/влагозащиты с актуальными данными
      let relatedItem = null;
      
      for (const candidate of candidateItems) {
        console.log(`🔍 Checking candidate ${candidate.id}: ${candidate.name} for UV/waterproof fields...`);
        
        // Проверяем, есть ли в этом элементе поля UV или влагозащиты с реальными данными
        let hasUvField = false;
        let hasWaterproofField = false;
        
        for (const col of candidate.column_values) {
          const fieldName = (col.text || '').toLowerCase();
          
          // Проверяем наличие полей UV
          if ((fieldName.includes('uv') || fieldName.includes('druck') || fieldName.includes('print')) && 
              (col.text === 'Yes' || col.text === 'Ja' || col.text === 'Empfohlen')) {
            hasUvField = true;
            console.log(`✅ Found UV field in ${candidate.id}: ${col.id} = ${col.text}`);
          }
          
          // Проверяем наличие полей влагозащиты
          if ((fieldName.includes('wasserdicht') || fieldName.includes('waterproof') || fieldName.includes('outdoor')) && 
              (col.text === 'Yes' || col.text === 'Ja' || col.text?.includes('25%'))) {
            hasWaterproofField = true;
            console.log(`✅ Found Waterproof field in ${candidate.id}: ${col.id} = ${col.text}`);
          }
        }
        
        // Если этот элемент содержит поля настроек, используем его
        if (hasUvField || hasWaterproofField) {
          relatedItem = candidate;
          console.log(`✅ Selected item with settings fields: ${candidate.id}: ${candidate.name}`);
          break;
        }
      }
      
      // Если не нашли элемент с настройками, берем первый попавшийся кандидат
      if (!relatedItem && candidateItems.length > 0) {
        relatedItem = candidateItems[0];
        console.log(`⚠️ No item with settings fields found, using first candidate: ${relatedItem.id}: ${relatedItem.name}`);
      }
      
      // Стратегия 4: Частичное совпадение ID (8 символов)
      if (!relatedItem && projectId.length >= 8) {
        const partialId = projectId.substring(0, 8);
        console.log(`🔍 Settings: Trying partial ID match: ${partialId}`);
        relatedItem = items.find((item: any) => item.id.startsWith(partialId));
        if (relatedItem) {
          console.log(`✅ Settings: Found partial match: ${relatedItem.id}: ${relatedItem.name}`);
        }
      }
      
      // Стратегия 5: Короткое совпадение ID (6 символов)
      if (!relatedItem && projectId.length >= 6) {
        const shortId = projectId.substring(0, 6);
        console.log(`🔍 Settings: Trying short ID match: ${shortId}`);
        relatedItem = items.find((item: any) => item.id.startsWith(shortId));
        if (relatedItem) {
          console.log(`✅ Settings: Found short match: ${relatedItem.id}: ${relatedItem.name}`);
        }
      }
      
      // Стратегия 6: Берем последний добавленный элемент (fallback для тестирования)
      if (!relatedItem && items.length > 1) {
        // Исключаем первый элемент "Subitem", берем последний реальный
        const realItems = items.filter((item: any) => !item.name.includes('Subitem'));
        if (realItems.length > 0) {
          relatedItem = realItems[realItems.length - 1]; // Последний добавленный
          console.log(`🔄 Settings: Using fallback (last item): ${relatedItem.id}: ${relatedItem.name}`);
        }
      }

      if (!relatedItem) {
        console.warn(`⚠️ No related subtable item found for settings in project ${projectId}`);
        return null;
      }

      console.log(`📊 Found settings item: ${relatedItem.id}: ${relatedItem.name}`);
      console.log(`📋 Available settings fields:`, relatedItem.column_values.map((col: any) => ({
        id: col.id,
        text: col.text,
        value: col.value
      })));

      // Ищем поля настроек - UV и водонепроницаемость
      // Ориентируемся на возможные названия полей и их значения
      let hasUvPrint = false;
      let isWaterproof = false;

      console.log(`🔍 Analyzing all fields for UV/waterproof settings...`);

      // Проверяем все поля на наличие UV и waterproof настроек
      for (const col of relatedItem.column_values) {
        const fieldText = (col.text || '').trim();
        const fieldName = fieldText.toLowerCase();
        
        console.log(`🔍 Field ${col.id}: text="${fieldText}", value="${col.value}"`);
        
        // Проверяем UV-печать - ищем поле с текстом "Yes", "Ja", "Empfohlen" в контексте UV
        if (fieldText === 'Yes' || fieldText === 'Ja' || fieldText === 'Empfohlen') {
          // Это положительное значение, проверяем контекст поля
          // Если ID поля содержит UV-связанные термины или это поле в области UV настроек
          if (col.id.includes('uv') || col.id.includes('druck') || col.id.includes('print') ||
              fieldName.includes('uv') || fieldName.includes('druck') || fieldName.includes('print')) {
            hasUvPrint = true;
            console.log(`✅ UV Print ENABLED via field ${col.id}: "${fieldText}"`);
          }
          // Если это просто "Yes"/"Ja" без контекста, но может быть UV поле - проверим позицию
          else {
            // Попробуем определить по позиции - обычно UV идет после размеров
            const fieldIndex = relatedItem.column_values.indexOf(col);
            console.log(`🔍 Field position ${fieldIndex} has value "${fieldText}" - checking if it's UV field...`);
            
            // Если это одно из полей в конце списка (обычно там настройки)
            if (fieldIndex >= 10) { // Примерная позиция полей настроек
              hasUvPrint = true;
              console.log(`✅ UV Print ENABLED via positional field ${col.id} at position ${fieldIndex}: "${fieldText}"`);
            }
          }
        }
        
        // Проверяем водонепроницаемость
        if (fieldText === 'Yes' || fieldText === 'Ja' || fieldText.includes('25%')) {
          // Это положительное значение, проверяем контекст поля
          if (col.id.includes('wasserdicht') || col.id.includes('waterproof') || col.id.includes('outdoor') ||
              fieldName.includes('wasserdicht') || fieldName.includes('waterproof') || fieldName.includes('outdoor')) {
            isWaterproof = true;
            console.log(`✅ Waterproof ENABLED via field ${col.id}: "${fieldText}"`);
          }
          // Если это просто "Yes"/"Ja" без контекста - проверим позицию
          else if (fieldText === 'Yes' || fieldText === 'Ja') {
            const fieldIndex = relatedItem.column_values.indexOf(col);
            // Если это поле после UV поля (водонепроницаемость обычно идет после UV)
            if (fieldIndex >= 11) { // Позиция после UV поля
              isWaterproof = true;
              console.log(`✅ Waterproof ENABLED via positional field ${col.id} at position ${fieldIndex}: "${fieldText}"`);
            }
          }
        }
      }

      // Также проверяем название проекта и другие текстовые поля на ключевые слова
      const itemName = relatedItem.name.toLowerCase();
      if (itemName.includes('uv') || itemName.includes('druck')) {
        hasUvPrint = true;
        console.log(`✅ UV Print detected in item name: ${relatedItem.name}`);
      }
      if (itemName.includes('wasserdicht') || itemName.includes('outdoor')) {
        isWaterproof = true;
        console.log(`✅ Waterproof detected in item name: ${relatedItem.name}`);
      }

      console.log(`✅ Extracted settings from subtable: UV Print=${hasUvPrint}, Waterproof=${isWaterproof}`);
      
      return {
        hasUvPrint,
        isWaterproof
      };

    } catch (error) {
      console.error('❌ Error fetching settings from subtable:', error);
      return null;
    }
  }

  // Получить MockUp из subtable для конкретного проекта
  async getMockupForProject(projectId: string): Promise<string | null> {
    try {
      console.log(`🔄 Fetching mockup for project ${projectId} from subtable...`);
      
      const query = `
        query {
          boards(ids: [${this.subtableBoardId}]) {
            items_page(limit: 100) {
              items {
                id
                name
                column_values {
                  id
                  text
                  value
                }
              }
            }
          }
        }
      `;

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.apiToken,
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        console.error(`❌ Monday API HTTP error: ${response.status} - ${response.statusText}`);
        return null;
      }

      const data: MondayResponse = await response.json();
      
      console.log(`📋 Subtable API Response:`, {
        boardId: this.subtableBoardId,
        hasData: !!data?.data,
        boardsCount: data?.data?.boards?.length || 0,
        itemsCount: data?.data?.boards?.[0]?.items_page?.items?.length || 0,
        firstItemName: data?.data?.boards?.[0]?.items_page?.items?.[0]?.name || 'none'
      });
      
      // Проверяем на ошибки GraphQL
      if (data.errors && data.errors.length > 0) {
        console.error('❌ Monday GraphQL errors:', data.errors);
        return null;
      }
      
      if (!data || !data.data || !data.data.boards || data.data.boards.length === 0) {
        console.warn('⚠️ No subtable boards found');
        return null;
      }
      
      const items = data.data.boards[0]?.items_page?.items || [];
      
      // Ищем item связанный с нашим проектом - более точный поиск
      console.log(`🔍 Subtable items found: ${items.length}`);
      console.log(`📝 Subtable item names:`, items.map(item => `${item.id}: ${item.name}`));
      
      // Сначала ищем точное совпадение по ID
      let relatedItem = items.find((item: MondayItem) => item.id === projectId);
      
      // Если не найдено, ищем в названии
      if (!relatedItem) {
        relatedItem = items.find((item: MondayItem) => item.name.includes(projectId));
      }
      
      // Если не найдено, ищем в полях
      if (!relatedItem) {
        relatedItem = items.find((item: MondayItem) => 
          item.column_values.some((col: any) => col.text?.includes(projectId))
        );
      }

      // Если не найдено, пробуем частичный ID (8 символов)
      if (!relatedItem && projectId.length >= 8) {
        const partialId = projectId.substring(0, 8);
        console.log(`🔍 Mockup: Trying partial ID match: ${partialId}`);
        relatedItem = items.find((item: any) => item.id.startsWith(partialId));
      }

      // Если не найдено, пробуем короткий ID (6 символов)
      if (!relatedItem && projectId.length >= 6) {
        const shortId = projectId.substring(0, 6);
        console.log(`🔍 Mockup: Trying short ID match: ${shortId}`);
        relatedItem = items.find((item: any) => item.id.startsWith(shortId));
      }

      // Если не найдено, пробуем частичный/короткий матч по ID (как в SVG/размерах)
      if (!relatedItem && projectId.length >= 8) {
        const partialId = projectId.substring(0, 8);
        console.log(`🔍 Mockup: Trying partial ID match: ${partialId}`);
        relatedItem = items.find((item: any) => item.id.startsWith(partialId));
        if (relatedItem) {
          console.log(`✅ Mockup: Found partial match: ${relatedItem.id}: ${relatedItem.name}`);
        }
      }
      if (!relatedItem && projectId.length >= 6) {
        const shortId = projectId.substring(0, 6);
        console.log(`🔍 Mockup: Trying short ID match: ${shortId}`);
        relatedItem = items.find((item: any) => item.id.startsWith(shortId));
        if (relatedItem) {
          console.log(`✅ Mockup: Found short match: ${relatedItem.id}: ${relatedItem.name}`);
        }
      }

      console.log(`🎯 Related item found:`, relatedItem ? `${relatedItem.id}: ${relatedItem.name}` : 'None');
      console.log(`🔍 Search details:`, {
        exactIdMatch: items.some(item => item.id === projectId),
        nameMatch: items.some(item => item.name.includes(projectId)),
        projectIdToFind: projectId
      });

      // Если не найдено по связи, НЕ используем fallback из другого проекта
      if (!relatedItem) {
        console.warn(`⚠️ No direct relationship found for project ${projectId} in subtable`);
        console.log(`🔍 Search details:`, {
          exactIdMatch: items.some(item => item.id === projectId),
          nameMatch: items.some(item => item.name.includes(projectId)),
          projectIdToFind: projectId
        });
        
        // НЕ используем fallback - возвращаем null если нет прямой связи
        return null;
      }

      // Показываем все поля для диагностики
      console.log(`📊 Subtable item fields:`, relatedItem.column_values.map(col => ({
        id: col.id,
        text: col.text,
        hasValue: !!col.value,
        valuePreview: col.value ? (col.value.length > 100 ? col.value.substring(0, 100) + '...' : col.value) : null
      })));
      
      // Ищем родительскую связь или другие поля, которые могут связывать с основным проектом
      const parentFields = relatedItem.column_values.filter(col => 
        col.id.includes('parent') || 
        col.id.includes('connect') || 
        col.id.includes('link') || 
        col.text?.includes(projectId)
      );
      console.log(`🔗 Potential parent/connection fields:`, parentFields);

      // Ищем поле MockUp - проверяем разные возможные ID
      const possibleMockupFields = ['file_mkq71vjr', 'file_mkq6eahq', 'file_mkq6q0v2', 'mockup', 'file'];
      let mockupField = null;
      
      for (const fieldId of possibleMockupFields) {
        mockupField = relatedItem.column_values.find((col: any) => col.id === fieldId);
        if (mockupField?.value) {
          console.log(`✅ Found MockUp field with ID: ${fieldId}`);
          break;
        }
      }
      
      // Если не найдено, ищем любое file поле с данными
      if (!mockupField?.value) {
        mockupField = relatedItem.column_values.find((col: any) => 
          col.id.includes('file') && col.value
        );
        if (mockupField) {
          console.log(`🔧 Found alternative file field: ${mockupField.id}`);
        }
      }
      
      if (!mockupField?.value) {
        console.warn(`⚠️ No MockUp field value found for project ${projectId}`);
        console.log(`📋 MockUp field info:`, {
          id: mockupField?.id,
          text: mockupField?.text,
          hasValue: !!mockupField?.value
        });
        return null;
      }

      console.log(`📄 Raw MockUp field value:`, mockupField.value);

      try {
        const fileData = JSON.parse(mockupField.value);
        console.log(`📊 Parsed file data:`, fileData);
        
        if (fileData.files && fileData.files.length > 0) {
          const file = fileData.files[0];
          
          // Monday.com использует assetId - получаем публичный URL напрямую
          if (file.assetId) {
            console.log(`🔍 Getting public URL for assetId: ${file.assetId}`);
            const publicUrl = await this.getPublicAssetUrl(file.assetId);
            
            if (publicUrl) {
              console.log(`✅ Got public MockUp URL: ${publicUrl}`);
              return publicUrl;
            } else {
              console.warn(`⚠️ Could not get public URL for assetId: ${file.assetId}`);
              // Fallback: используем прокси
              const mondayFileUrl = `https://files.monday.com/files/${file.assetId}`;
              return this.createProxyUrl(mondayFileUrl);
            }
          } else if (file.url) {
            // Fallback: если есть прямой URL
            console.log(`✅ Found direct MockUp URL: ${file.url}`);
            return file.url;
          } else {
            console.warn(`⚠️ No URL or assetId found in file data:`, file);
          }
        } else {
          console.warn(`⚠️ No files found in MockUp field data:`, fileData);
        }
      } catch (e) {
        console.error('❌ Error parsing MockUp field:', e);
        console.log(`❌ Failed to parse value:`, mockupField.value);
      }

      return null;
    } catch (error) {
      console.error('❌ Error fetching mockup from Monday:', error);
      return null;
    }
  }

  // Получить список MockUp изображений (все баннеры) из subtable
  async getMockupListForProject(projectId: string): Promise<string[]> {
    try {
      console.log(`🔄 Fetching mockup LIST for project ${projectId} from subtable...`);

      const query = `
        query {
          boards(ids: [${this.subtableBoardId}]) {
            items_page(limit: 200) {
              items {
                id
                name
                column_values {
                  id
                  text
                  value
                }
              }
            }
          }
        }
      `;

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': this.apiToken },
        body: JSON.stringify({ query })
      });
      if (!response.ok) return [];
      const data: MondayResponse = await response.json();
      const items = data?.data?.boards?.[0]?.items_page?.items || [];

      console.log(`🧮 Subtable items for mockup list: ${items.length}`);
      // Собираем кандидатов: точный ID, частичный/короткий ID, по имени/полям
      const partial = projectId.slice(0, 8);
      const short = projectId.slice(0, 6);
      const candidates = items.filter((it: any) =>
        it.id === projectId ||
        it.id?.startsWith(partial) || it.id?.startsWith(short) ||
        it.name?.includes(projectId) || it.name?.includes(partial) || it.name?.includes(short) ||
        it.column_values?.some((cv: any) => (cv.text && (cv.text.includes(projectId) || cv.text.includes(partial) || cv.text.includes(short))) || (cv.value && cv.value.includes(projectId)))
      );

      console.log(`🧲 Mockup list candidates: ${candidates.length}`, candidates.map((c:any)=>`${c.id}: ${c.name}`));
      if (candidates.length === 0) {
        console.log('⚠️ No subtable candidates for mockup list');
        return [];
      }

      const possibleFileFields = ['file_mkq71vjr', 'file_mkq6eahq', 'file_mkq6q0v2', 'file', 'mockup'];
      const urls: string[] = [];

      for (const item of candidates) {
        for (const col of item.column_values) {
          const isFile = col.id.includes('file') || possibleFileFields.includes(col.id);
          if (!isFile || !col.value) continue;
          try {
            const fileData = JSON.parse(col.value);
            if (fileData?.files?.length) {
              for (const f of fileData.files) {
                if (f.assetId) {
                  const publicUrl = await this.getPublicAssetUrl(f.assetId);
                  if (publicUrl) urls.push(publicUrl);
                } else if (f.url) {
                  urls.push(f.url);
                }
              }
            }
          } catch {}
        }
      }

      // Уникализируем и вернем максимум 5 для UI
      const unique = Array.from(new Set(urls));
      console.log(`✅ Found ${unique.length} mockup images for project`);
      return unique.slice(0, 10);
    } catch (e) {
      console.error('❌ Error fetching mockup list:', e);
      return [];
    }
  }

  // Получить публичный URL файла через Monday.com GraphQL API
  private async getPublicAssetUrl(assetId: string): Promise<string | null> {
    try {
      const graphqlQuery = {
        query: `
          query {
            assets(ids: [${assetId}]) {
              id
              url
              public_url
            }
          }
        `
      };

      console.log(`🔍 Выполняем GraphQL запрос для получения URL ресурса: ${assetId}`);

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.apiToken
        },
        body: JSON.stringify(graphqlQuery)
      });

      if (!response.ok) {
        console.log(`❌ GraphQL API ответил с ошибкой: ${response.status}`);
        return null;
      }

      const data = await response.json();
      
      if (data.errors) {
        console.log('❌ GraphQL вернул ошибки:', data.errors);
        return null;
      }
      
      if (data.data?.assets?.length > 0) {
        const asset = data.data.assets[0];
        console.log('✅ Получены данные о ресурсе:', asset);
        
        // Сначала пробуем получить public_url, затем обычный url
        return asset.public_url || asset.url || null;
      } else {
        console.log('❌ Ресурс не найден в ответе API');
        return null;
      }
    } catch (error: any) {
      console.log(`❌ Ошибка при получении публичного URL: ${error.message}`);
      return null;
    }
  }

  // Создать прокси URL для защищенных файлов Monday.com (fallback)
  private createProxyUrl(mondayUrl: string): string {
    // Используем наш image-proxy для доступа к защищенным файлам
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    // Извлекаем assetId из URL для передачи в прокси
    let assetId = '';
    if (mondayUrl.includes('/files/')) {
      const match = mondayUrl.match(/\/files\/(\d+)/);
      if (match && match[1]) {
        assetId = match[1];
      }
    }
    
    const proxyUrl = `${supabaseUrl}/functions/v1/image-proxy?url=${encodeURIComponent(mondayUrl)}&id=${assetId}`;
    console.log(`🔗 Created proxy URL: ${proxyUrl}`);
    return proxyUrl;
  }

  // Получить SVG из subtable для конкретного проекта
  async getSvgForProject(projectId: string): Promise<string | null> {
    try {
      console.log(`🔄 Fetching SVG for project ${projectId} from subtable...`);
      
      const query = `
        query {
          boards(ids: [${this.subtableBoardId}]) {
            items_page(limit: 100) {
              items {
                id
                name
                column_values {
                  id
                  text
                  value
                }
              }
            }
          }
        }
      `;

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.apiToken
        },
        body: JSON.stringify({ query })
      });

      const result = await response.json();
      console.log('📋 SVG API Response for project:', JSON.stringify(result, null, 2));

      if (!result?.data?.boards?.[0]?.items_page?.items) {
        console.warn(`⚠️ No subtable data found for SVG search`);
        return null;
      }

      const items = result.data.boards[0].items_page.items;
      console.log(`🔍 Subtable items found: ${items.length}`);

      // Ищем элемент, связанный с проектом
      let relatedItem = items.find((item: any) => item.id === projectId);
      
      // Если не найдено, ищем в названии
      if (!relatedItem) {
        relatedItem = items.find((item: any) => item.name.includes(projectId));
      }
      
      // Если не найдено, ищем в полях
      if (!relatedItem) {
        relatedItem = items.find((item: any) => 
          item.column_values.some((col: any) => col.text?.includes(projectId))
        );
      }
      
      // Если не найдено, ищем по частичному совпадению ID (первые 8 цифр)
      if (!relatedItem && projectId.length >= 8) {
        const partialId = projectId.substring(0, 8);
        console.log(`🔍 SVG: Trying partial ID match: ${partialId}`);
        relatedItem = items.find((item: any) => item.id.startsWith(partialId));
        if (relatedItem) {
          console.log(`✅ SVG: Found partial match: ${relatedItem.id}: ${relatedItem.name}`);
        }
      }
      
      // Если все еще не найдено, ищем по более короткому совпадению (первые 6 цифр)
      if (!relatedItem && projectId.length >= 6) {
        const shortId = projectId.substring(0, 6);
        console.log(`🔍 SVG: Trying short ID match: ${shortId}`);
        relatedItem = items.find((item: any) => item.id.startsWith(shortId));
        if (relatedItem) {
          console.log(`✅ SVG: Found short match: ${relatedItem.id}: ${relatedItem.name}`);
        }
      }
      
      // Если не найдено, ищем по частичному совпадению ID (первые 8 цифр)
      if (!relatedItem && projectId.length >= 8) {
        const partialId = projectId.substring(0, 8);
        console.log(`🔍 Trying partial ID match: ${partialId}`);
        relatedItem = items.find((item: any) => item.id.startsWith(partialId));
        if (relatedItem) {
          console.log(`✅ Found partial match: ${relatedItem.id}: ${relatedItem.name}`);
        }
      }
      
      // Если все еще не найдено, ищем по более короткому совпадению (первые 6 цифр)
      if (!relatedItem && projectId.length >= 6) {
        const shortId = projectId.substring(0, 6);
        console.log(`🔍 Trying short ID match: ${shortId}`);
        relatedItem = items.find((item: any) => item.id.startsWith(shortId));
        if (relatedItem) {
          console.log(`✅ Found short match: ${relatedItem.id}: ${relatedItem.name}`);
        }
      }

      if (!relatedItem) {
        console.warn(`⚠️ No related subtable item found for SVG in project ${projectId}`);
        return null;
      }

      // Ищем SVG поля
      const svgField = relatedItem.column_values.find((col: any) => 
        col.id.includes('file') && col.value && col.text?.toLowerCase().includes('.svg')
      );

      if (!svgField?.value) {
        console.log(`🔍 No SVG field found in subtable for project ${projectId}`);
        return null;
      }

      console.log(`📄 Raw SVG field value:`, svgField.value);

      try {
        const fileData = JSON.parse(svgField.value);
        
        if (fileData.files && fileData.files.length > 0) {
          const file = fileData.files[0];
          
          // Проверяем, что это SVG файл
          if (file.name && file.name.toLowerCase().endsWith('.svg')) {
            if (file.assetId) {
              console.log(`🔍 Getting public URL for SVG assetId: ${file.assetId}`);
              const publicUrl = await this.getPublicAssetUrl(file.assetId);
              
              if (publicUrl) {
                console.log(`✅ Got public SVG URL: ${publicUrl}`);
                return publicUrl;
              } else {
                console.warn(`⚠️ Could not get public URL for SVG assetId: ${file.assetId}`);
                const mondayFileUrl = `https://files.monday.com/files/${file.assetId}`;
                return this.createProxyUrl(mondayFileUrl);
              }
            } else if (file.url) {
              console.log(`✅ Found direct SVG URL: ${file.url}`);
              return file.url;
            }
          } else {
            console.log(`⚠️ File found but not SVG: ${file.name}`);
          }
        }
      } catch (e) {
        console.error('❌ Error parsing SVG field:', e);
      }

      return null;
    } catch (error) {
      console.error('❌ Error fetching SVG from Monday:', error);
      return null;
    }
  }

  // Прямой доступ к файлу Monday.com с API токеном
  async fetchMondayFile(fileUrl: string): Promise<Blob | null> {
    try {
      const response = await fetch(fileUrl, {
        headers: {
          'Authorization': this.apiToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('❌ Error fetching Monday file:', error);
      return null;
    }
  }

  // Конвертация Monday.com items в NeonDesign
  private convertMondayItemsToNeonDesigns(items: MondayItem[]): NeonDesign[] {
    console.log(`🔄 Converting ${items.length} Monday items to NeonDesign objects...`);
    
    return items.map(item => {
      console.log(`📝 Processing item: ${item.name} (ID: ${item.id})`);
      console.log(`📊 Column values: (${item.column_values.length})`, item.column_values.map(col => ({
        id: col.id,
        text: col.text,
        hasValue: !!col.value
      })));
      
      // Извлекаем данные из колонок по известным ID
      const clientEmail = this.getColumnValue(item, 'email_mkq7rms') || 
                         this.getColumnValue(item, 'email') || 
                         this.getColumnValue(item, 'person') || 
                         this.getColumnValue(item, 'dup__of_email') ||
                         'no-email@example.com';
      
      const clientPhone = this.getColumnValue(item, 'phone_mkq6twmv') ||
                         this.getColumnValue(item, 'phone') || 
                         this.getColumnValue(item, 'telefon') || 
                         this.getColumnValue(item, 'dup__of_telefon') ||
                         null;
      
      const clientName = this.getColumnValue(item, 'person') || 
                        this.getColumnValue(item, 'name') || 
                        this.getColumnValue(item, 'dup__of_name') ||
                        item.name || 
                        'Unknown Client';
      
      const designName = item.name || 'Untitled Design';
      
      const notes = this.getColumnValue(item, 'long_text') || 
                   this.getColumnValue(item, 'text') || 
                   this.getColumnValue(item, 'notes') ||
                   '';
      
      const status = this.getColumnValue(item, 'status') || 
                    this.getColumnValue(item, 'status4') ||
                    'draft';

      console.log(`📊 Extracted data - Email: ${clientEmail}, Name: ${clientName}, Phone: ${clientPhone}, Status: ${status}`);

      // Извлекаем размеры и конфигурацию из полей Monday.com
      const widthValue = this.getColumnValue(item, 'numeric_mkq65yv') || // Размер в см
                        this.getColumnValue(item, 'width') ||
                        this.getColumnValue(item, 'breite') ||
                        '100';
      
      const configText = this.getColumnValue(item, 'long_text_mkqvt793') || // Текст конфигурации
                        this.getColumnValue(item, 'configuration') ||
                        '';
      
      // Парсим размер
      const parsedWidth = parseInt(widthValue) || 100;
      
      // Парсим конфигурацию из текста
      const isWaterproof = configText.toLowerCase().includes('wasserdicht') || 
                          configText.toLowerCase().includes('outdoor') ||
                          configText.toLowerCase().includes('waterproof');
      
      const hasUvPrint = configText.toLowerCase().includes('uv') ||
                        configText.toLowerCase().includes('druck') ||
                        configText.toLowerCase().includes('print');
      
      // Вычисляем высоту (пропорционально)
      const calculatedHeight = Math.round(parsedWidth * 0.3); // 30% от ширины
      
      // Вычисляем длину LED (периметр прямоугольника в метрах)
      const ledLength = (2 * (parsedWidth + calculatedHeight)) / 100; // в метрах
      
      console.log(`📐 Parsed dimensions: ${parsedWidth}x${calculatedHeight}cm, LED: ${ledLength}m`);
      console.log(`⚙️ Configuration: waterproof=${isWaterproof}, uvPrint=${hasUvPrint}`);

      // Базовая конфигурация неона
      const neonDesign: NeonDesign = {
        id: item.id, // Используем оригинальный Monday ID без префикса
        name: designName,
        originalWidth: parsedWidth, // Реальная ширина из Monday.com
        originalHeight: calculatedHeight, // Вычисленная высота
        elements: 1,
        ledLength: ledLength, // Вычисленная длина LED
        mockupUrl: '', // Будет проверено в основной доске и subtable
        mockupUrls: [],
        description: notes || `Neon design for ${clientName}`,
        svgContent: '', // Будет заполнено позже если нужно
        hasCustomSvg: false,
        createdAt: new Date().toISOString(),
        // Добавляем конфигурацию
        isWaterproof: isWaterproof,
        hasUvPrint: hasUvPrint,
        configText: configText,
        // Добавляем клиентские данные
        clientEmail: clientEmail,
        clientName: clientName,
        clientPhone: clientPhone || undefined
      };

      // Проверяем файлы MockUp в основной доске
      const mainMockupField1 = this.getColumnValue(item, 'file_mkq6eahq'); // Поле 1
      const mainMockupField2 = this.getColumnValue(item, 'file_mkq6q0v2'); // Поле 2
      
      console.log(`📁 Checking main board files for ${item.id}:`);
      console.log(`📁 file_mkq6eahq: ${mainMockupField1}`);
      console.log(`📁 file_mkq6q0v2: ${mainMockupField2}`);
      
      // Проверяем ВСЕ файловые поля для отладки
      const allFileFields = item.column_values.filter(col => col.id.startsWith('file_'));
      console.log(`📁 All file fields for ${item.id}:`, allFileFields.map(f => ({
        id: f.id,
        text: f.text,
        hasValue: !!f.value
      })));
      
      // Пытаемся извлечь URL файла из основной доски
      if (mainMockupField1) {
        try {
          const fileData = JSON.parse(mainMockupField1);
          if (fileData.files && fileData.files.length > 0) {
            const urls = fileData.files.map((f: any) => this.createProxyUrl(f.url));
            neonDesign.mockupUrl = neonDesign.mockupUrl || urls[0];
            neonDesign.mockupUrls?.push(...urls);
            console.log(`✅ Found MockUp in main board (field 1): ${fileData.files[0].url}`);
          }
        } catch (e) {
          console.warn('⚠️ Could not parse file_mkq6eahq:', e);
        }
      }
      
      if (mainMockupField2) {
        try {
          const fileData = JSON.parse(mainMockupField2);
          if (fileData.files && fileData.files.length > 0) {
            const urls = fileData.files.map((f: any) => this.createProxyUrl(f.url));
            neonDesign.mockupUrl = neonDesign.mockupUrl || urls[0];
            neonDesign.mockupUrls?.push(...urls);
            console.log(`✅ Found MockUp in main board (field 2): ${fileData.files[0].url}`);
          }
        } catch (e) {
          console.warn('⚠️ Could not parse file_mkq6q0v2:', e);
        }
      }
      
      // Если все еще нет MockUp, проверяем ВСЕ файловые поля
      if (!neonDesign.mockupUrl) {
        for (const fileField of allFileFields) {
          if (fileField.value) {
            try {
              const fileData = JSON.parse(fileField.value);
              if (fileData.files && fileData.files.length > 0) {
                const urls = fileData.files.map((f: any) => this.createProxyUrl(f.url));
                neonDesign.mockupUrl = neonDesign.mockupUrl || urls[0];
                neonDesign.mockupUrls?.push(...urls);
                console.log(`✅ Found MockUp in field ${fileField.id}: ${fileData.files[0].url}`);
                break;
              }
            } catch (e) {
              console.warn(`⚠️ Could not parse ${fileField.id}:`, e);
            }
          }
        }
      }
      
      // Если MockUp не найден в основной доске, проверим subtable позже
      if (!neonDesign.mockupUrl) {
        console.log(`🔍 No MockUp found in main board for ${item.id}, will check subtable separately`);
      }

      // Поиск SVG файлов в основной доске
      console.log(`🔍 Searching for SVG files in main board for ${item.id}...`);
      for (const fileField of allFileFields) {
        if (fileField.value && !neonDesign.svgUrl) {
          console.log(`📄 Checking file field ${fileField.id}:`, fileField.text);
          try {
            const fileData = JSON.parse(fileField.value);
            console.log(`📊 Parsed file data for ${fileField.id}:`, fileData);
            if (fileData.files && fileData.files.length > 0) {
              // Проверяем ВСЕ файлы в поле, не только первый
              for (const file of fileData.files) {
                console.log(`📄 Checking file: ${file.name}`);
                if (file.name && file.name.toLowerCase().endsWith('.svg')) {
                  (neonDesign as any).svgUrl = this.createProxyUrl(file.url || `https://files.monday.com/files/${file.assetId}`);
                  console.log(`✅ Found SVG in field ${fileField.id}: ${file.name} -> ${(neonDesign as any).svgUrl}`);
                  break;
                }
              }
            }
          } catch (e) {
            console.warn(`⚠️ Could not parse SVG from ${fileField.id}:`, e);
          }
        }
      }
      
      if (!(neonDesign as any).svgUrl) {
        console.log(`🔍 No SVG found in main board for ${item.id}`);
      }

      // Добавляем метаданные клиента как дополнительные свойства
      (neonDesign as any).clientEmail = clientEmail;
      (neonDesign as any).clientName = clientName;
      (neonDesign as any).status = status;
      (neonDesign as any).mondayId = item.id;

      return neonDesign;
    });
  }

  // Получить значение колонки по id
  private getColumnValue(item: MondayItem, searchKey: string): string | null {
    const column = item.column_values.find(col => col.id === searchKey);
    
    // Для файловых полей всегда используем value, для текстовых - text
    if (searchKey.startsWith('file_')) {
      return column?.value || null;
    }
    
    return column?.text || column?.value || null;
  }

  // Проверить соединение с Monday.com
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔄 Testing Monday.com connection...');
      
      const query = `
        query {
          me {
            id
            name
            email
          }
        }
      `;

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.apiToken,
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        console.error(`❌ Monday API connection failed: ${response.status}`);
        return false;
      }

      const data = await response.json();
      
      if (data.errors && data.errors.length > 0) {
        console.error('❌ Monday GraphQL errors:', data.errors);
        return false;
      }

      console.log('✅ Monday.com connection successful');
      return true;
    } catch (error) {
      console.error('❌ Error testing Monday connection:', error);
      return false;
    }
  }
}

export const mondayDirectService = new MondayDirectService();
export default mondayDirectService;
