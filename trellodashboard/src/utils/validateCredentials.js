/**
 * Validate Trello credentials format and test them individually
 */

export const validateCredentials = () => {
  const apiKey = import.meta.env.VITE_TRELLO_API_KEY;
  const token = import.meta.env.VITE_TRELLO_TOKEN;
  const boardId = import.meta.env.VITE_TRELLO_BOARD_ID;

  console.log('🔍 VALIDAÇÃO DE CREDENCIAIS:');
  console.log('=====================================');
  
  // Check if variables exist
  console.log('1. Variáveis carregadas?');
  console.log('   API_KEY:', apiKey ? '✅ Sim' : '❌ NÃO');
  console.log('   TOKEN:', token ? '✅ Sim' : '❌ NÃO');
  console.log('   BOARD_ID:', boardId ? '✅ Sim' : '❌ NÃO');
  
  // Check for common issues
  console.log('\n2. Validação de formato:');
  
  if (apiKey) {
    console.log(`   API_KEY comprimento: ${apiKey.length} caracteres`);
    console.log(`   API_KEY tem espaços? ${apiKey.includes(' ') ? '❌ SIM (REMOVA!)' : '✅ Não'}`);
    console.log(`   API_KEY começa com aspas? ${(apiKey.startsWith('"') || apiKey.startsWith("'")) ? '❌ SIM (REMOVA!)' : '✅ Não'}`);
    console.log(`   API_KEY valor: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);
  }
  
  if (token) {
    console.log(`   TOKEN comprimento: ${token.length} caracteres`);
    console.log(`   TOKEN tem espaços? ${token.includes(' ') ? '❌ SIM (REMOVA!)' : '✅ Não'}`);
    console.log(`   TOKEN começa com aspas? ${(token.startsWith('"') || token.startsWith("'")) ? '❌ SIM (REMOVA!)' : '✅ Não'}`);
    console.log(`   TOKEN valor: ${token.substring(0, 8)}...${token.substring(token.length - 4)}`);
  }
  
  if (boardId) {
    console.log(`   BOARD_ID: ${boardId}`);
    console.log(`   BOARD_ID comprimento: ${boardId.length} caracteres`);
    console.log(`   BOARD_ID tem espaços? ${boardId.includes(' ') ? '❌ SIM (REMOVA!)' : '✅ Não'}`);
  }
  
  console.log('=====================================');
  
  return { apiKey, token, boardId };
};

/**
 * Test API Key alone (without token)
 */
export const testApiKey = async (apiKey) => {
  console.log('\n🔑 Testando API Key...');
  
  try {
    const url = `https://api.trello.com/1/members/me?key=${apiKey}`;
    const response = await fetch(url);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Key válida!');
      console.log('   Usuário:', data.fullName);
      return { valid: true, user: data };
    } else {
      console.error('❌ API Key inválida!');
      console.error('   Status:', response.status);
      const text = await response.text();
      console.error('   Resposta:', text);
      return { valid: false, error: text };
    }
  } catch (error) {
    console.error('❌ Erro ao testar API Key:', error);
    return { valid: false, error: error.message };
  }
};

/**
 * Test Token with API Key
 */
export const testToken = async (apiKey, token) => {
  console.log('\n🎫 Testando Token...');
  
  try {
    const url = `https://api.trello.com/1/members/me?key=${apiKey}&token=${token}`;
    const response = await fetch(url);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Token válido!');
      console.log('   Usuário:', data.fullName);
      return { valid: true, user: data };
    } else {
      console.error('❌ Token inválido!');
      console.error('   Status:', response.status);
      const text = await response.text();
      console.error('   Resposta:', text);
      return { valid: false, error: text };
    }
  } catch (error) {
    console.error('❌ Erro ao testar Token:', error);
    return { valid: false, error: error.message };
  }
};

/**
 * Test Board ID access
 */
export const testBoardAccess = async (apiKey, token, boardId) => {
  console.log('\n📋 Testando acesso ao Board...');
  
  try {
    const url = `https://api.trello.com/1/boards/${boardId}?key=${apiKey}&token=${token}&fields=name,id`;
    const response = await fetch(url);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Board acessível!');
      console.log('   Nome:', data.name);
      console.log('   ID:', data.id);
      return { valid: true, board: data };
    } else {
      console.error('❌ Não foi possível acessar o Board!');
      console.error('   Status:', response.status);
      const text = await response.text();
      console.error('   Resposta:', text);
      return { valid: false, error: text };
    }
  } catch (error) {
    console.error('❌ Erro ao acessar Board:', error);
    return { valid: false, error: error.message };
  }
};

/**
 * Run all validation tests
 */
export const runFullValidation = async () => {
  console.log('\n🚀 INICIANDO VALIDAÇÃO COMPLETA...\n');
  
  const { apiKey, token, boardId } = validateCredentials();
  
  if (!apiKey || !token || !boardId) {
    console.error('\n❌ Faltam credenciais! Verifique o arquivo .env');
    return { success: false, error: 'Missing credentials' };
  }
  
  // Test API Key
  const apiKeyResult = await testApiKey(apiKey);
  if (!apiKeyResult.valid) {
    console.error('\n❌ API KEY INVÁLIDA! Obtenha uma nova em: https://trello.com/app-key');
    return { success: false, error: 'Invalid API Key', details: apiKeyResult };
  }
  
  // Test Token
  const tokenResult = await testToken(apiKey, token);
  if (!tokenResult.valid) {
    console.error('\n❌ TOKEN INVÁLIDO! Gere um novo em: https://trello.com/app-key (clique em Token)');
    return { success: false, error: 'Invalid Token', details: tokenResult };
  }
  
  // Test Board Access
  const boardResult = await testBoardAccess(apiKey, token, boardId);
  if (!boardResult.valid) {
    console.error('\n❌ BOARD_ID INVÁLIDO ou você não tem acesso!');
    console.error('Verifique o ID na URL do quadro: trello.com/b/BOARD_ID/nome');
    return { success: false, error: 'Invalid Board ID', details: boardResult };
  }
  
  console.log('\n🎉 TODAS AS CREDENCIAIS VÁLIDAS!\n');
  return { 
    success: true, 
    apiKey: apiKeyResult, 
    token: tokenResult, 
    board: boardResult 
  };
};
