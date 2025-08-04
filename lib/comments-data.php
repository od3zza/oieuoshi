<?php
// /lib/comments-data.php - Sistema PHP para pasta /lib

// Configuração especial para Vercel e hospedagens restritivas
header('Content-Type: application/json; charset=utf-8');

// Headers CORS mais permissivos
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS, HEAD');
header('Access-Control-Allow-Headers: Origin, Content-Type, Accept, Authorization, X-Request-With');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Max-Age: 86400');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// Função para resposta JSON consistente
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// Função para logging de erros (opcional)
function logError($message) {
    $logFile = __DIR__ . '/comments-errors.log';
    $timestamp = date('[Y-m-d H:i:s]');
    error_log("$timestamp $message" . PHP_EOL, 3, $logFile);
}

try {
    // Configurações
    $dataFile = __DIR__ . '/comments-data.json';
    $maxNameLength = 100;
    $maxCommentLength = 1000;
    
    // Função para carregar dados
    function loadData($file) {
        if (!file_exists($file)) {
            return [];
        }
        
        $content = file_get_contents($file);
        if ($content === false) {
            throw new Exception("Erro ao ler arquivo de dados");
        }
        
        $data = json_decode($content, true);
        if ($data === null && json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception("Erro JSON: " . json_last_error_msg());
        }
        
        return $data ?: [];
    }
    
    // Função para salvar dados
    function saveData($file, $data) {
        // Criar backup se arquivo existir
        if (file_exists($file)) {
            copy($file, $file . '.backup');
        }
        
        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        if ($json === false) {
            throw new Exception("Erro ao codificar JSON");
        }
        
        $result = file_put_contents($file, $json, LOCK_EX);
        if ($result === false) {
            throw new Exception("Erro ao escrever arquivo");
        }
        
        return true;
    }
    
    // Função para sanitizar entrada
    function sanitizeInput($input) {
        if (!is_string($input)) {
            return '';
        }
        return htmlspecialchars(trim(strip_tags($input)), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }
    
    // Função para validar URL
    function validateUrl($url) {
        if (empty($url)) {
            return true;
        }
        
        if (!preg_match('/^https?:\/\//', $url)) {
            $url = 'http://' . $url;
        }
        
        return filter_var($url, FILTER_VALIDATE_URL) !== false;
    }
    
    // Rate limiting simples
    function checkRateLimit($ip) {
        $rateLimitFile = __DIR__ . '/rate-limits.json';
        $maxRequests = 5; // 5 comentários por hora
        $timeWindow = 3600; // 1 hora
        
        $limits = [];
        if (file_exists($rateLimitFile)) {
            $content = file_get_contents($rateLimitFile);
            $limits = json_decode($content, true) ?: [];
        }
        
        $now = time();
        $userLimits = $limits[$ip] ?? [];
        
        // Remover entradas antigas
        $userLimits = array_filter($userLimits, function($timestamp) use ($now, $timeWindow) {
            return ($now - $timestamp) < $timeWindow;
        });
        
        if (count($userLimits) >= $maxRequests) {
            return false;
        }
        
        // Adicionar nova entrada
        $userLimits[] = $now;
        $limits[$ip] = $userLimits;
        
        // Salvar (ignorar erros de rate limit)
        @file_put_contents($rateLimitFile, json_encode($limits));
        
        return true;
    }
    
    // Obter IP do usuário
    function getUserIP() {
        $headers = ['HTTP_CLIENT_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_FORWARDED', 'HTTP_FORWARDED_FOR', 'HTTP_FORWARDED', 'REMOTE_ADDR'];
        
        foreach ($headers as $header) {
            if (!empty($_SERVER[$header])) {
                $ips = explode(',', $_SERVER[$header]);
                return trim($ips[0]);
            }
        }
        
        return 'unknown';
    }
    
    // Processar requisição
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    
    if ($method === 'GET') {
        // Buscar comentários
        $categoria = sanitizeInput($_GET['categoria'] ?? '');
        $titulo = sanitizeInput($_GET['titulo'] ?? '');
        
        if (empty($categoria) || empty($titulo)) {
            jsonResponse(['error' => 'Categoria e título são obrigatórios'], 400);
        }
        
        $data = loadData($dataFile);
        $postKey = $categoria . '/' . $titulo;
        $comments = $data[$postKey] ?? [];
        
        jsonResponse([
            'success' => true,
            'comments' => $comments,
            'total' => count($comments),
            'postKey' => $postKey
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
            jsonResponse(['error' => 'Nenhum dado enviado'], 400);
        }
        
        $input = json_decode($rawInput, true);
        if ($input === null) {
            jsonResponse(['error' => 'JSON inválido'], 400);
        }
        
        // Extrair e sanitizar dados
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
        
        if (!empty($link) && !validateUrl($link)) {
            jsonResponse(['error' => 'URL inválida'], 400);
        }
        
        // Ajustar URL se necessário
        if (!empty($link) && !preg_match('/^https?:\/\//', $link)) {
            $link = 'http://' . $link;
        }
        
        // Carregar dados existentes
        $data = loadData($dataFile);
        $postKey = $categoria . '/' . $titulo;
        
        // Criar novo comentário
        $newComment = [
            'id' => uniqid('comment_', true),
            'nome' => $nome,
            'link' => $link,
            'comentario' => $comentario,
            'data' => date('d/m/Y H:i:s'),
            'timestamp' => time(),
            'ip_hash' => hash('sha256', $userIP . 'salt_' . date('Y-m-d')) // Hash do IP para moderação
        ];
        
        // Adicionar à lista
        if (!isset($data[$postKey])) {
            $data[$postKey] = [];
        }
        
        $data[$postKey][] = $newComment;
        
        // Limitar número de comentários por post (opcional)
        if (count($data[$postKey]) > 100) {
            $data[$postKey] = array_slice($data[$postKey], -100);
        }
        
        // Salvar dados
        if (saveData($dataFile, $data)) {
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
        
    } elseif ($method === 'DELETE') {
        // Deletar comentário (para moderação)
        $rawInput = file_get_contents('php://input');
        $input = json_decode($rawInput, true);
        
        $categoria = sanitizeInput($input['categoria'] ?? '');
        $titulo = sanitizeInput($input['titulo'] ?? '');
        $commentId = sanitizeInput($input['commentId'] ?? '');
        
        if (empty($categoria) || empty($titulo) || empty($commentId)) {
            jsonResponse(['error' => 'Parâmetros obrigatórios faltando'], 400);
        }
        
        $data = loadData($dataFile);
        $postKey = $categoria . '/' . $titulo;
        
        if (isset($data[$postKey])) {
            $originalCount = count($data[$postKey]);
            $data[$postKey] = array_filter($data[$postKey], function($comment) use ($commentId) {
                return $comment['id'] !== $commentId;
            });
            
            // Reindexar array
            $data[$postKey] = array_values($data[$postKey]);
            
            if (count($data[$postKey]) < $originalCount) {
                if (saveData($dataFile, $data)) {
                    jsonResponse([
                        'success' => true,
                        'message' => 'Comentário removido com sucesso'
                    ]);
                } else {
                    jsonResponse(['error' => 'Erro ao salvar alterações'], 500);
                }
            } else {
                jsonResponse(['error' => 'Comentário não encontrado'], 404);
            }
        } else {
            jsonResponse(['error' => 'Post não encontrado'], 404);
        }
        
    } else {
        jsonResponse(['error' => 'Método não permitido'], 405);
    }
    
} catch (Exception $e) {
    logError("Erro geral: " . $e->getMessage());
    jsonResponse(['error' => 'Erro interno do servidor: ' . $e->getMessage()], 500);
} catch (Error $e) {
    logError("Erro fatal: " . $e->getMessage());
    jsonResponse(['error' => 'Erro fatal do servidor'], 500);
}
?>
