/**
 * logging script to see traffic
 */

const uidSessionName = "uId";
const lastPageSessionName = "lastPage";

let uId = window.sessionStorage.getItem(uidSessionName);
if(!uId) {
    makeNew();
}
if(getLastPage() !== getCurrentPage()) {
    postLog();
    window.sessionStorage.setItem(lastPageSessionName, getCurrentPage());
}

function makeNew() {
    uId = phpUId;
    window.sessionStorage.setItem(uidSessionName, uId);
    window.sessionStorage.removeItem(lastPageSessionName);
}


function getLastPage() {
    return window.sessionStorage.getItem(lastPageSessionName);
}

function getCurrentPage() {
    return window.location.href;
}

function postLog() {
    // console.log(uId)
    const lastPage = getLastPage();
    let lastPageQuery = "";
    if(lastPage) {
        lastPageQuery = "&lastPage=" + lastPage;
    }
    $.ajax(`/api/log.php?uId=${uId}${lastPageQuery}&currentPage=${getCurrentPage()}`, {
        method: "GET",
        // data: data,
        // data: JSON.stringify(data),
        success: (response) => {
            // console.log(response);
        },
        error: function(xhr, ajaxOptions, thrownError) {
            console.log("log failed");
        },
      });
}