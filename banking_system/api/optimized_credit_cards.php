<?php
// Set headers
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include_once '../includes/ultra_optimized_handlers.php';

$method = $_SERVER['REQUEST_METHOD'];
$handler = new UltraOptimizedCreditCardHandler();

// Bắt đầu đo performance
$start_time = microtime(true);

switch($method) {
    case 'GET':
        try {
            // Kiểm tra query parameters
            $action = $_GET['action'] ?? 'list';
            
            switch($action) {
                case 'search':
                    $searchTerm = $_GET['q'] ?? '';
                    if(strlen($searchTerm) < 2) {
                        throw new Exception('Search term must be at least 2 characters');
                    }
                    $data = $handler->searchCards($searchTerm);
                    break;
                    
                case 'stats':
                    $data = $handler->getQuickStats();
                    break;
                    
                case 'details':
                    $cardId = $_GET['id'] ?? 0;
                    $userId = $_GET['user_id'] ?? 0;
                    if(!$cardId || !$userId) {
                        throw new Exception('Missing required parameters');
                    }
                    $data = $handler->getFullCardDetails($cardId, $userId);
                    break;
                    
                default: // list
                    $data = $handler->getAllCreditCards();
                    break;
            }
            
            $execution_time = round((microtime(true) - $start_time) * 1000, 2);
            
            // Response với performance metrics
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
        
    case 'POST':
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if(!$input) {
                throw new Exception('Invalid JSON data');
            }
            
            // Validate required fields
            $required = ['user_id', 'card_number', 'cvv', 'pin_code', 'card_holder_name', 'expiry_date', 'card_type', 'bank_name'];
            foreach($required as $field) {
                if(empty($input[$field])) {
                    throw new Exception("Missing required field: {$field}");
                }
            }
            
            $result = $handler->addCreditCard($input);
            
            if($result) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Credit card added successfully',
                    'execution_time_ms' => round((microtime(true) - $start_time) * 1000, 2)
                ], JSON_UNESCAPED_UNICODE);
            } else {
                throw new Exception('Failed to add credit card');
            }
            
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