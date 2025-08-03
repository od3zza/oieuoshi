<?php
// comments.php - API para gerenciar comentários

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Arquivo JSON para armazenar comentários
$commentsFile = 'comments.json';

// Função para carregar comentários do arquivo JSON
function loadComments() {
    global $commentsFile;
    if (!file_exists($commentsFile)) {
        return [];
    }
    $content = file_get_contents($commentsFile);
    return json_decode($content, true) ?: [];
}

// Função para salvar comentários no arquivo JSON
function saveComments($comments) {
    global $commentsFile;
    return file_put_contents($commentsFile, json_encode($comments, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

// Função para sanitizar input
function sanitizeInput($input) {
    return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
}

// Função para validar URL
function isValidUrl($url) {
    return filter_var($url, FILTER_VALIDATE_URL) !== false;
}

// Função para gerar chave única para a postagem
function generatePostKey($categoria, $titulo) {
    return $categoria . '/' . $titulo;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'OPTIONS') {
    exit(0);
}

if ($method === 'GET') {
    // Buscar comentários de uma postagem específica
    $categoria = $_GET['categoria'] ?? '';
    $titulo = $_GET['titulo'] ?? '';
    
    if (empty($categoria) || empty($titulo)) {
        http_response_code(400);
        echo json_encode(['error' => 'Categoria e título são obrigatórios']);
        exit;
    }
    
    $comments = loadComments();
    $postKey = generatePostKey($categoria, $titulo);
    $postComments = $comments[$postKey] ?? [];
    
    echo json_encode([
        'success' => true,
        'comments' => $postComments,
        'total' => count($postComments)
    ]);
    
} elseif ($method === 'POST') {
    // Adicionar novo comentário
    $input = json_decode(file_get_contents('php://input'), true);
    
    $categoria = sanitizeInput($input['categoria'] ?? '');
    $titulo = sanitizeInput($input['titulo'] ?? '');
    $nome = sanitizeInput($input['nome'] ?? '');
    $link = sanitizeInput($input['link'] ?? '');
    $comentario = sanitizeInput($input['comentario'] ?? '');
    
    // Validações
    if (empty($categoria) || empty($titulo)) {
        http_response_code(400);
        echo json_encode(['error' => 'Categoria e título são obrigatórios']);
        exit;
    }
    
    if (empty($nome) || empty($comentario)) {
        http_response_code(400);
        echo json_encode(['error' => 'Nome e comentário são obrigatórios']);
        exit;
    }
    
    if (strlen($nome) > 100) {
        http_response_code(400);
        echo json_encode(['error' => 'Nome muito longo (máximo 100 caracteres)']);
        exit;
    }
    
    if (strlen($comentario) > 1000) {
        http_response_code(400);
        echo json_encode(['error' => 'Comentário muito longo (máximo 1000 caracteres)']);
        exit;
    }
    
    if (!empty($link) && !isValidUrl($link)) {
        http_response_code(400);
        echo json_encode(['error' => 'URL inválida']);
        exit;
    }
    
    // Carregar comentários existentes
    $comments = loadComments();
    $postKey = generatePostKey($categoria, $titulo);
    
    // Criar novo comentário
    $newComment = [
        'id' => uniqid(),
        'nome' => $nome,
        'link' => $link,
        'comentario' => $comentario,
        'data' => date('Y-m-d H:i:s'),
        'timestamp' => time()
    ];
    
    // Adicionar à lista de comentários da postagem
    if (!isset($comments[$postKey])) {
        $comments[$postKey] = [];
    }
    
    $comments[$postKey][] = $newComment;
    
    // Salvar no arquivo
    if (saveComments($comments)) {
        echo json_encode([
            'success' => true,
            'message' => 'Comentário adicionado com sucesso',
            'comment' => $newComment
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Erro ao salvar comentário']);
    }
    
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Método não permitido']);
}
?>