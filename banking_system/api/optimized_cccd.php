<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include_once '../includes/ultra_optimized_handlers.php';

$method = $_SERVER['REQUEST_METHOD'];
$handler = new UltraOptimizedCCCDHandler();
$start_time = microtime(true);

switch($method) {
    case 'GET':
        try {
            $action = $_GET['action'] ?? 'list';
            
            switch($action) {
                case 'search':
                    $searchTerm = $_GET['q'] ?? '';
                    if(strlen($searchTerm) < 2) {
                        throw new Exception('Search term must be at least 2 characters');
                    }
                    $data = $handler->searchCCCD($searchTerm);
                    break;
                    
                default:
                    $data = $handler->getAllCCCD();
                    break;
            }
            
            $execution_time = round((microtime(true) - $start_time) * 1000, 2);
            
            echo json_encode([
                'success' => true,
                'data' => $data,
                'meta' => [
                    'total_records' => count($data),
                    'execution_time_ms' => $execution_time,
                    'action' => $action,
                    'timestamp' => date('Y-m-d H:i:s')
                ]
            ], JSON_UNESCAPED_UNICODE);
            
        } catch(Exception $e) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => $e->getMessage(),
                'execution_time_ms' => round((microtime(true) - $start_time) * 1000, 2)
            ], JSON_UNESCAPED_UNICODE);
        }
        break;
        
    default:
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'error' => 'Method not allowed'
        ], JSON_UNESCAPED_UNICODE);
        break;
}
?>