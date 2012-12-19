<?php
//// тело запроса в key
//$key = @$_GET['name'];
//// создадим массив
//$arr = array();
//// просканим папки сервера на key
//$imgs = scandir($key);
//// пробежимся по внутренностям папки
//foreach ($imgs as $item) {
//    // найдем все gif-картинки
//    if (strpos(strtolower($item), ".gif")) {
//        // положим в массив
//        array_push($arr, $key . '/' . $item);
//    }
//}
//// вернем массив в JSON
//echo json_encode($arr);
//?>

<?php
if (isset($_GET['name']))
    echo json_encode(glob(basename($_GET['name']) . "/*.gif"));
?>

