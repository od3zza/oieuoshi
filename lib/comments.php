<?php
// comments.php - API para gerenciar comentários (versão corrigida)

// Configurações de segurança e CORS mais robustas
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept, Origin, X-Requested-With');
header('Access-Control-Max-Age: 3600');

// Lidar com requisições OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// Configurações
$commentsFile = 'comments.json';
$maxCommentLength = 1000;
$maxNameLength = 100;

// Função para log de erros (opcional)
function logError($message) {
    error_log(date('[Y-m-d H:i:s] ') . $message . PHP_EOL, 3, 'comments_errors.log');
}

// Função para carregar comentários do arquivo JSON
function loadComments() {
    global $commentsFile;
    
    try {
        if (!file_exists($commentsFile)) {
            // Criar arquivo vazio se não existir
            file_put_contents($commentsFile, '{}');
            return [];
        }
        
        $content = file_get_contents($commentsFile);
        if ($content === false) {
            logError("Erro ao ler arquivo: $commentsFile");
            return [];
        }
        
        $decoded = json_decode($content, true);
        if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
            logError("Erro JSON ao decodificar: " . json_last_error_msg());
            return [];
        }
        
        return $decoded ?: [];
        
    } catch (Exception $e) {
        logError("Exceção ao carregar comentários: " . $e->getMessage());
        return [];
    }
}

// Função para salvar comentários no arquivo JSON
function saveComments($comments) {
    global $commentsFile;
    
    try {
        // Criar backup antes de salvar
        if (file_exists($commentsFile)) {
            copy($commentsFile, $commentsFile . '.backup');
        }
        
        $json = json_encode($comments, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        if ($json === false) {
            logError("Erro ao codificar JSON: " . json_last_error_msg());
            return false;
        }
        
        $result = file_put_contents($commentsFile, $json, LOCK_EX);
        if ($result === false) {
            logError("Erro ao escrever arquivo: $commentsFile");
            return false;
        }
        
        return true;
        
    } catch (Exception $e) {
        logError("Exceção ao salvar comentários: " . $e->getMessage());
        return false;
    }
}

// Função para sanitizar input de forma mais robusta
function sanitizeInput($input) {
    if (!is_string($input)) {
        return '';
    }
    
    // Remover tags HTML e caracteres especiais
    $input = strip_tags($input);
    $input = htmlspecialchars($input, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $input = trim($input);
    
    return $input;
}

// Função para validar URL de forma mais permissiva
function isValidUrl($url) {
    if (empty($url)) {
        return true; // URL vazia é válida (opcional)
    }
    
    // Adicionar http:// se não tiver protocolo
    if (!preg_match('/^https?:\/\//', $url)) {
        $url = 'http://' . $url;
    }
    
    return filter_var($url, FILTER_VALIDATE_URL) !== false;
}

// Função para gerar chave única para a postagem
function generatePostKey($categoria, $titulo) {
    return $categoria . '/' . $titulo;
}

// Função para validar rate limiting simples
function checkRateLimit($ip) {
    $rateLimitFile = 'rate_limit.json';
    $maxRequests = 10; // máximo 10 comentários por hora por IP
    $timeWindow = 3600; // 1 hora
    
    $rateLimits = [];
    if (file_exists($rateLimitFile)) {
        $content = file_get_contents($rateLimitFile);
        $rateLimits = json_decode($content, true) ?: [];
    }
    
    $now = time();
    $userLimits = $rateLimits[$ip] ?? [];
    
    // Remover entradas antigas
    $userLimits = array_filter($userLimits, function($timestamp) use ($now, $timeWindow) {
        return ($now - $timestamp) < $timeWindow;
    });
    
    if (count($userLimits) >= $maxRequests) {
        return false;
    }
    
    // Adicionar nova entrada
    $userLimits[] = $now;
    $rateLimits[$ip] = $userLimits;
    
    // Salvar rate limits
    file_put_contents($rateLimitFile, json_encode($rateLimits));
    
    return true;
}

// Obter IP do usuário
function getUserIP() {
    if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        return $_SERVER['HTTP_CLIENT_IP'];
    } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        return $_SERVER['HTTP_X_FORWARDED_FOR'];
    } else {
        return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    }
}

// Função para resposta JSON
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// Main logic
try {
    $method = $_SERVER['REQUEST_METHOD'];
    
    if ($method === 'GET') {
        // Buscar comentários de uma postagem específica
        $categoria = sanitizeInput($_GET['categoria'] ?? '');
        $titulo = sanitizeInput($_GET['titulo'] ?? '');
        
        if (empty($categoria) || empty($titulo)) {
            jsonResponse(['error' => 'Categoria e título são obrigatórios'], 400);
        }
        
        $comments = loadComments();
        $postKey = generatePostKey($categoria, $titulo);
        $postComments = $comments[$postKey] ?? [];
        
        jsonResponse([
            'success' => true,
            'comments' => $postComments,
            'total' => count($postComments)
        ]);
        
    } elseif ($method === 'POST') {
        // Verificar rate limiting
        $userIP = getUserIP();
        if (!checkRateLimit($userIP)) {
            jsonResponse(['error' => 'Muitos comentários enviados. Tente novamente em 1 hora.'], 429);
        }
        
        // Obter dados do POST
        $rawInput = file_get_contents('php://input');
        if (empty($rawInput)) {
            jsonResponse(['error' => 'Dados não enviados'], 400);
        }
        
        $input = json_decode($rawInput, true);
        if ($input === null) {
            jsonResponse(['error' => 'JSON inválido'], 400);
        }
        
        // Sanitizar dados
        $categoria = sanitizeInput($input['categoria'] ?? '');
        $titulo = sanitizeInput($input['titulo'] ?? '');
        $nome = sanitizeInput($input['nome'] ?? '');
        $link = sanitizeInput($input['link'] ?? '');
        $comentario = sanitizeInput($input['comentario'] ?? '');
        
        // Validações
        if (empty($categoria) || empty($titulo)) {
            jsonResponse(['error' => 'Categoria e título são obrigatórios'], 400);
        }
        
        if (empty($nome) || empty($comentario)) {
            jsonResponse(['error' => 'Nome e comentário são obrigatórios'], 400);
        }
        
        if (strlen($nome) > $maxNameLength) {
            jsonResponse(['error' => "Nome muito longo (máximo $maxNameLength caracteres)"], 400);
        }
        
        if (strlen($comentario) > $maxCommentLength) {
            jsonResponse(['error' => "Comentário muito longo (máximo $maxCommentLength caracteres)"], 400);
        }
        
        if (!empty($link) && !isValidUrl($link)) {
            jsonResponse(['error' => 'URL inválida'], 400);
        }
        
        // Ajustar URL se necessário
        if (!empty($link) && !preg_match('/^https?:\/\//', $link)) {
            $link = 'http://' . $link;
        }
        
        // Carregar comentários existentes
        $comments = loadComments();
        $postKey = generatePostKey($categoria, $titulo);
        
        // Criar novo comentário
        $newComment = [
            'id' => uniqid('comment_', true),
            'nome' => $nome,
            'link' => $link,
            'comentario' => $comentario,
            'data' => date('Y-m-d H:i:s'),
            'timestamp' => time(),
            'ip_hash' => hash('sha256', $userIP . 'salt_secreto') // Para moderação, sem expor IP real
        ];
        
        // Adicionar à lista de comentários da postagem
        if (!isset($comments[$postKey])) {
            $comments[$postKey] = [];
        }
        
        $comments[$postKey][] = $newComment;
        
        // Salvar no arquivo
        if (saveComments($comments)) {
            // Remover informações sensíveis antes de retornar
            unset($newComment['ip_hash']);
            
            jsonResponse([
                'success' => true,
                'message' => 'Comentário adicionado com sucesso',
                'comment' => $newComment
            ]);
        } else {
            jsonResponse(['error' => 'Erro ao salvar comentário'], 500);
        }
        
    } else {
        jsonResponse(['error' => 'Método não permitido'], 405);
    }
    
} catch (Exception $e) {
    logError("Exceção geral: " . $e->getMessage());
    jsonResponse(['error' => 'Erro interno do servidor'], 500);
}
?>
