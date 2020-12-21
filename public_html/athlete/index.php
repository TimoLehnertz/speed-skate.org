<?php
include_once "../includes/error.php";
/**
 * Setup
 */
if(!isset($_GET["id"])){
    throwError($ERROR_NO_ID);
}
include_once "../api/index.php";

$person = getPerson($_GET["id"]);
if(!$person){
    throwError($ERROR_INVALID_ID);
}

include_once "../header.php";

echo "<script>const person = [". json_encode($person) ."];</script>";

?>
<main class="main">
    <h2>Athlete <?php echo $person["firstName"]." ".$person["sureName"]?></h2>
    <div class="person-table"></div>
    <script>
        const table = new Table($(".person-table"), person);
    </script>
</main>
<?php
include_once "../footer.php";
?>