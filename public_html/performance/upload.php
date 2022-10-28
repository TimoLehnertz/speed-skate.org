<?php
$noHeaderSearchBar = true;
include_once "../api/index.php";
include_once "../includes/error.php";

if(!isLoggedIn()) {
    throwError($ERROR_LOGIN_MISSING, "/performance");
}

$error = false;
if(isset($_POST["submit"])) { // submit
    print_r($_POST);
    if(validateObjectProperties($_POST, [
        [
            "property" => "forWho",
            "type" => "string",
        ],[
            "property" => "idPerformanceCategory",
            "type" => "number",
        ],[
            "property" => "date",
            "type" => "string",
        ],[
            "property" => "value",
            "type" => "number",
        ],[
            "property" => "comments",
            "type" => "string",
            "maxLength" => 2000
        ],
    ], true)) {
        $user = $_POST["user"];
        if($_POST["forWho"] == "forMe") {
            $user = $_SESSION["iduser"];
        }
        $succsess = uploadPerformanceRecord($_POST["idPerformanceCategory"], $user, $_POST["value"], $_POST["comments"], $_POST["date"]);
        if($succsess) {
            if(isset($_GET["gop"]) && isset($_GET["pid"])) {
                header("location: /performance/performance.php?id=".$_GET["pid"]."&uploadSuccsess=1");
            } else {
                header("location: /performance?uploadSuccsess=1");
            }
        } else {
            $error = true;
        }
    }
}

$user = getUser($_SESSION["iduser"]);

$jsUser = [
    "id" => $user["iduser"],
    "image" => $user["image"],
    "name" => "You"
];
include_once "../header.php";
?>
<script>const user = <?=json_encode($jsUser)?>;</script>
<main class="performance">
    <h1 class="align center margin left right double">Upload performance</h1>
    <?php if($error) {
        echo "<p class='font color red'>We are sorry an error occoured :( please try again</p>";
    } ?>
    <form action="#" method="POST" id="myForm" onsubmit="return validateForm()" class="form-performance">
        <div class="flex align-stretch gap margin bottom">
            <input type="radio" name="forWho" id="forMe" value="forMe" checked>
            <label for="forMe">For me</label>
            <input type="radio" name="forWho" id="forOthers" value="forOthers">
            <label for="forOthers">For others</label>
        </div>
        <div class="athlete-select">
            <input type="text" name="user" id="user" value="" hidden>
            <div class="athlete-search"></div>
            <div class="athlete-wrapper margin top"></div>
        </div>
        <br>
        <label>Choose your category</label>
        <div class="category-wrapper flex gap">
            <div class="flex column gap">
                <?php
                $categories = getPerformanceCategories();
                $idPerformanceCategory = "-";
                // move pid to frist
                if(isset($_GET["pid"])) {
                    foreach ($categories as $category) {
                        if($category["idPerformanceCategory"] == $_GET["pid"]) {
                            echoPerformanceCategory($category);
                            $idPerformanceCategory = $category["idPerformanceCategory"];
                            break;
                        }
                    }
                }
                foreach ($categories as $category) {
                    if($idPerformanceCategory == "-") $idPerformanceCategory = $category["idPerformanceCategory"];
                    if(!isset($_GET["pid"]) || $category["idPerformanceCategory"] != $_GET["pid"]) {
                        echoPerformanceCategory($category);
                    }
                }
                ?>
            </div>
            <a href="/performance/create.php?upl=1" class="btn plus gray no-underline"><img src="/img/plus.svg" alt="+"></a>
            <input type="number" name="idPerformanceCategory" id="idPerformanceCategory" value="<?=$idPerformanceCategory ?>" hidden>
        </div>
        <br>
        <br>
        <label for="date">Date</label>
        <input type="date" id="date" name="date" required>
        <br>
        <br>
        <label for="value" class="value-label">Time</label>
        <input type="number" step="0.0001" name="value" id="value" required>
        <br>
        <br>
        <label for="comments">Comments</label>
        <textarea type="text" name="comments" id="comments" maxlength="2000" placeholder="What did you do?"></textarea>
        <br><br>
        <div class="flex">
            <a href="/performance" class="btn create gray no-underline">Back</a>
            <input class="btn create" type="submit" name="submit" value="Upload">
        </div>
    </form>
</main>
<script>
    document.getElementById('date').valueAsDate = new Date();

    const athleteSearchBar = new SearchBarSmall("User", false, searchCallback);
    $(".athlete-search").append(athleteSearchBar.elem);
    document.getElementById("myForm").onkeypress = function(e) {
        let key = e.charCode || e.keyCode || 0;     
        if (key == 13) {
            e.preventDefault();
        }
    }

    let forMe = true;
    let userSelected = false;

    $(".athlete-select").hide();
    $('input[type=radio][name=forWho]').change(function() {
        if (this.value == 'forMe') {
            $(".athlete-select").hide();
            forMe = true;
        }
        else if (this.value == 'forOthers') {
            $(".athlete-select").show();
            forMe = false;
        }
    });

    function searchCallback(athlete) {
        const elem = $(`<div class="athlete"><img class="profile-img" src="${athlete.image}"><span class="name">${athlete.name}</span></div>`);
        $(".athlete-wrapper").empty();
        $(".athlete-wrapper").append(elem);
        $("#user").val(athlete.id);
        userSelected = true;
    }

    function validateForm() {
        let succsess = true;
        if(!forMe && !userSelected) {
            $(".athlete-select").addClass("highlight")
            succsess =  false;
        }
        if($("#idPerformanceCategory").val() == "-") {
            succsess =  false;
            $(".category-wrapper").addClass("highlight")
        }
        return succsess;
    }

    let categoriesOpen = false;

    $(".performance-category:not(:first)").hide();
    $(".performance-category:first").addClass("active");
    $(".performance-category").click(function() {
        if(!categoriesOpen) {
            $(".performance-category").show();
            $(".category-wrapper").addClass("column");
            categoriesOpen = true;
        } else {
            $(".performance-category").removeClass("active");
            $(this).addClass("active");
            $(".performance-category").not(this).hide();
            $(".category-wrapper").removeClass("column");
            $(".value-label").text($(this).attr("long"));
            $("#idPerformanceCategory").val($(this).attr("id"));
            categoriesOpen = false;
        }
    });
</script>
<?php
    include_once "../footer.php";
?>